import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  EstadoContratoAlquiler,
  EstadoPeriodoAlquiler,
  TipoMovimiento,
} from '@erp/shared';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CajaService } from '../caja/caja.service';
import { TipoMovimientoCajaDto } from '../caja/dto';
import {
  ActivarContratoAlquilerDto,
  CancelarContratoAlquilerDto,
  CerrarPeriodoAlquilerDto,
  CobrarPeriodoAlquilerDto,
  CreateContratoAlquilerDto,
  FinalizarContratoAlquilerDto,
  QueryAlquilerDto,
  RegistrarLecturaAlquilerDto,
  UpdateContratoAlquilerDto,
} from './dto';

type DbClient = PrismaService | Prisma.TransactionClient;

const ALQUILER_PERIODO_REF = 'ALQUILER_PERIODO';
const ALQUILER_DEPOSITO_REF = 'ALQUILER_DEPOSITO';
const ALQUILER_DEVOLUCION_DEPOSITO_REF = 'ALQUILER_DEVOLUCION_DEPOSITO';

@Injectable()
export class AlquileresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cajaService: CajaService,
  ) {}

  async create(dto: CreateContratoAlquilerDto, userId: string) {
    const [cliente, equipo] = await Promise.all([
      this.prisma.cliente.findFirst({
        where: { id: dto.clienteId, deletedAt: null, activo: true },
      }),
      this.prisma.equipo.findFirst({
        where: { id: dto.equipoId, deletedAt: null },
        include: { producto: true },
      }),
    ]);

    if (!cliente)
      throw new NotFoundException('Cliente no encontrado o inactivo');
    if (!equipo) throw new NotFoundException('Equipo no encontrado');
    this.assertEquipoDisponible(equipo);

    const contratoActivo = await this.prisma.contratoAlquiler.findFirst({
      where: {
        equipoId: equipo.id,
        deletedAt: null,
        estado: { in: ['BORRADOR', 'ACTIVO'] },
      },
      select: { id: true, numero: true },
    });
    if (contratoActivo) {
      throw new ConflictException(
        `El equipo ya tiene un alquiler abierto (${contratoActivo.numero})`,
      );
    }

    const contadorInicio = dto.contadorInicio ?? equipo.contadorActual;
    if (contadorInicio == null) {
      throw new BadRequestException(
        'El equipo no tiene contador actual. Ingresa una lectura inicial.',
      );
    }

    const fechaInicio = this.parseDate(dto.fechaInicio);
    const mesesPlazo = dto.mesesPlazo ?? 6;
    const fechaFinPrevista = this.addMonths(fechaInicio, mesesPlazo);
    const numero = await this.nextNumero();

    return this.prisma.contratoAlquiler.create({
      data: {
        numero,
        clienteId: dto.clienteId,
        equipoId: dto.equipoId,
        creadoPorId: userId,
        fechaInicio,
        fechaFinPrevista,
        mesesPlazo,
        copiasIncluidasMes: dto.copiasIncluidasMes,
        precioMensual: dto.precioMensual,
        precioCopiaExcedente: dto.precioCopiaExcedente,
        depositoGarantia: dto.depositoGarantia ?? 0,
        contadorInicio,
        contadorActual: contadorInicio,
        notas: dto.notas,
      },
      include: this.contratoInclude(),
    });
  }

  async findAll(query: QueryAlquilerDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ContratoAlquilerWhereInput = {
      deletedAt: null,
      ...(query.estado ? { estado: query.estado as any } : {}),
      ...(query.clienteId ? { clienteId: query.clienteId } : {}),
      ...(query.equipoId ? { equipoId: query.equipoId } : {}),
      ...(query.search
        ? {
            OR: [
              { numero: { contains: query.search, mode: 'insensitive' } },
              {
                cliente: {
                  OR: [
                    { nombre: { contains: query.search, mode: 'insensitive' } },
                    {
                      apellido: { contains: query.search, mode: 'insensitive' },
                    },
                    {
                      razonSocial: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
              {
                equipo: {
                  numeroSerie: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.contratoAlquiler.findMany({
        where,
        include: this.contratoListInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contratoAlquiler.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({
      where: { id, deletedAt: null },
      include: this.contratoInclude(),
    });
    if (!contrato)
      throw new NotFoundException('Contrato de alquiler no encontrado');

    const ticketsCobrables = await this.findTicketsCobrables(
      this.prisma,
      contrato.id,
      contrato.clienteId,
      contrato.equipoId,
      contrato.fechaInicio,
      new Date(),
    );
    const pagos = await this.findPagosContrato(contrato);

    return {
      ...contrato,
      resumenFinanciero: this.buildResumenFinanciero(contrato),
      ticketsCobrables,
      pagos,
    };
  }

  async update(id: string, dto: UpdateContratoAlquilerDto) {
    const contrato = await this.getContrato(id);
    if (contrato.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se puede editar un contrato en borrador',
      );
    }

    if (dto.equipoId && dto.equipoId !== contrato.equipoId) {
      const equipo = await this.prisma.equipo.findFirst({
        where: { id: dto.equipoId, deletedAt: null },
        include: { producto: true },
      });
      if (!equipo) throw new NotFoundException('Equipo no encontrado');
      this.assertEquipoDisponible(equipo);
    }

    const fechaInicio = dto.fechaInicio
      ? this.parseDate(dto.fechaInicio)
      : contrato.fechaInicio;
    const mesesPlazo = dto.mesesPlazo ?? contrato.mesesPlazo;

    return this.prisma.contratoAlquiler.update({
      where: { id },
      data: {
        ...(dto.clienteId ? { clienteId: dto.clienteId } : {}),
        ...(dto.equipoId ? { equipoId: dto.equipoId } : {}),
        ...(dto.fechaInicio || dto.mesesPlazo
          ? {
              fechaInicio,
              mesesPlazo,
              fechaFinPrevista: this.addMonths(fechaInicio, mesesPlazo),
            }
          : {}),
        ...(dto.copiasIncluidasMes != null
          ? { copiasIncluidasMes: dto.copiasIncluidasMes }
          : {}),
        ...(dto.precioMensual != null
          ? { precioMensual: dto.precioMensual }
          : {}),
        ...(dto.precioCopiaExcedente != null
          ? { precioCopiaExcedente: dto.precioCopiaExcedente }
          : {}),
        ...(dto.depositoGarantia != null
          ? { depositoGarantia: dto.depositoGarantia }
          : {}),
        ...(dto.contadorInicio != null
          ? {
              contadorInicio: dto.contadorInicio,
              contadorActual: dto.contadorInicio,
            }
          : {}),
        ...(dto.notas !== undefined ? { notas: dto.notas } : {}),
      },
      include: this.contratoInclude(),
    });
  }

  async activar(id: string, dto: ActivarContratoAlquilerDto, userId: string) {
    const contrato = await this.getContrato(id);
    if (contrato.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se puede activar un contrato en borrador',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const equipo = await tx.equipo.findFirst({
        where: { id: contrato.equipoId, deletedAt: null },
        include: { producto: true },
      });
      if (!equipo) throw new NotFoundException('Equipo no encontrado');
      this.assertEquipoDisponible(equipo);
      if (!equipo.almacenId) {
        throw new BadRequestException(
          'El equipo debe estar en un almacén para salir a alquiler',
        );
      }

      const contadorInicial =
        dto.contadorInicial ?? contrato.contadorActual ?? equipo.contadorActual;
      if (contadorInicial == null) {
        throw new BadRequestException(
          'Ingresa el contador inicial para activar el alquiler',
        );
      }
      if (
        equipo.contadorActual != null &&
        contadorInicial < equipo.contadorActual
      ) {
        throw new BadRequestException(
          'El contador inicial no puede ser menor al contador actual',
        );
      }

      await this.applyStockDelta(tx, {
        productoId: equipo.productoId,
        almacenId: equipo.almacenId,
        delta: -1,
        tipo: TipoMovimiento.AJUSTE_NEGATIVO,
        referenciaId: contrato.id,
        justificacion: `Salida por activación de alquiler ${contrato.numero}`,
        userId,
      });

      const periodo = await tx.periodoAlquiler.create({
        data: {
          contratoId: contrato.id,
          numeroPeriodo: 1,
          fechaInicio: contrato.fechaInicio,
          fechaFin: this.addMonths(contrato.fechaInicio, 1),
          lecturaInicial: contadorInicial,
          copiasIncluidas: contrato.copiasIncluidasMes,
          montoBase: contrato.precioMensual,
          estado: 'PENDIENTE_BASE',
        },
      });
      for (
        let numeroPeriodo = 2;
        numeroPeriodo <= contrato.mesesPlazo;
        numeroPeriodo += 1
      ) {
        await tx.periodoAlquiler.create({
          data: {
            contratoId: contrato.id,
            numeroPeriodo,
            fechaInicio: this.addMonths(
              contrato.fechaInicio,
              numeroPeriodo - 1,
            ),
            fechaFin: this.addMonths(contrato.fechaInicio, numeroPeriodo),
            lecturaInicial: null,
            copiasIncluidas: contrato.copiasIncluidasMes,
            montoBase: contrato.precioMensual,
            estado: 'PENDIENTE_BASE',
          },
        });
      }

      if (
        Number(contrato.depositoGarantia ?? 0) > 0 &&
        !contrato.depositoCobradoAt
      ) {
        if (!dto.metodoPagoId) {
          throw new BadRequestException(
            'Selecciona un método de pago para cobrar el depósito',
          );
        }
        const apertura = await this.cajaService.getMiAperturaActiva(userId, tx);
        if (!apertura) {
          throw new BadRequestException(
            'Debes tener una caja abierta para cobrar el depósito',
          );
        }
        await this.registrarIngresoAlquiler(tx, {
          aperturaId: apertura.id,
          userId,
          monto: Number(contrato.depositoGarantia),
          metodoPagoId: dto.metodoPagoId,
          referenciaId: contrato.id,
          referenciaTipo: ALQUILER_DEPOSITO_REF,
          tipoMovimiento: TipoMovimientoCajaDto.DEPOSITO,
          referenciaPago: dto.referenciaPago,
          evidenciaPagoFilename: dto.evidenciaPagoFilename,
          concepto: `Alquiler ${contrato.numero} - depósito de garantía`,
        });
      }

      await tx.equipoCliente.updateMany({
        where: { equipoId: contrato.equipoId, fechaFin: null },
        data: { fechaFin: contrato.fechaInicio },
      });
      await tx.equipoCliente.create({
        data: {
          equipoId: contrato.equipoId,
          clienteId: contrato.clienteId,
          fechaInicio: contrato.fechaInicio,
          notas: `Asignación por alquiler ${contrato.numero}`,
        },
      });

      await tx.garantia.create({
        data: {
          equipoId: contrato.equipoId,
          contratoAlquilerId: contrato.id,
          clienteIdOriginal: contrato.clienteId,
          clienteDocTipo: this.getClienteDocTipo(contrato.cliente),
          clienteDocNumero: contrato.cliente.ruc ?? contrato.cliente.dni,
          clienteNombre: this.getClienteNombre(contrato.cliente),
          fechaInicio: contrato.fechaInicio,
          fechaFin: contrato.fechaFinPrevista,
          cobertura: 'Garantía operativa durante contrato de alquiler',
          exclusiones:
            'Copias excedentes se cobran al cierre del periodo. Soporte se gestiona desde su módulo.',
          contadorInicio: contadorInicial,
          estado: 'ACTIVA',
          codigoQR: randomUUID(),
        },
      });

      await tx.lecturaAlquiler.create({
        data: {
          contratoId: contrato.id,
          periodoId: periodo.id,
          equipoId: contrato.equipoId,
          usuarioId: userId,
          contador: contadorInicial,
          fechaLectura: contrato.fechaInicio,
          notas: dto.notas ?? 'Lectura inicial de activación',
        },
      });

      await tx.inspeccionAlquiler.create({
        data: {
          contratoId: contrato.id,
          equipoId: contrato.equipoId,
          usuarioId: userId,
          tipo: 'ENTREGA',
          condicion: 'BUENO',
          contador: contadorInicial,
          notas: dto.notas ?? 'Inspección de entrega al activar alquiler',
        },
      });

      await tx.equipo.update({
        where: { id: contrato.equipoId },
        data: {
          estadoComercial: 'ALQUILADO',
          almacenId: null,
          contadorActual: contadorInicial,
        },
      });

      await tx.contratoAlquiler.update({
        where: { id: contrato.id },
        data: {
          estado: 'ACTIVO',
          contadorInicio: contadorInicial,
          contadorActual: contadorInicial,
          ...(Number(contrato.depositoGarantia ?? 0) > 0 &&
          !contrato.depositoCobradoAt
            ? { depositoCobradoAt: new Date() }
            : {}),
        },
      });

      return tx.contratoAlquiler.findUnique({
        where: { id: contrato.id },
        include: this.contratoInclude(),
      });
    });
  }

  async registrarLectura(
    id: string,
    dto: RegistrarLecturaAlquilerDto,
    userId: string,
  ) {
    const contrato = await this.getContrato(id);
    if (contrato.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se registran lecturas en contratos activos',
      );
    }

    const periodo = await this.resolvePeriodoLectura(
      contrato.id,
      dto.periodoId,
    );
    const ultimoContador = contrato.contadorActual ?? contrato.contadorInicio;
    if (dto.contador < ultimoContador) {
      throw new BadRequestException(
        'La lectura no puede ser menor al contador actual',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const lectura = await tx.lecturaAlquiler.create({
        data: {
          contratoId: contrato.id,
          periodoId: periodo?.id,
          equipoId: contrato.equipoId,
          usuarioId: userId,
          contador: dto.contador,
          fechaLectura: dto.fechaLectura
            ? new Date(dto.fechaLectura)
            : new Date(),
          notas: dto.notas,
        },
      });
      await tx.contratoAlquiler.update({
        where: { id: contrato.id },
        data: { contadorActual: dto.contador },
      });
      await tx.equipo.update({
        where: { id: contrato.equipoId },
        data: { contadorActual: dto.contador },
      });
      return lectura;
    });
  }

  async cerrarPeriodo(
    id: string,
    periodoId: string,
    dto: CerrarPeriodoAlquilerDto,
    userId: string,
  ) {
    const contrato = await this.getContrato(id);
    if (contrato.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se cierran periodos de contratos activos',
      );
    }

    const periodo = await this.prisma.periodoAlquiler.findFirst({
      where: { id: periodoId, contratoId: contrato.id },
      include: { cargos: true },
    });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');
    if (periodo.estado !== 'ACTIVO') {
      throw new BadRequestException('Solo se puede cerrar un periodo activo');
    }
    if (periodo.lecturaInicial == null) {
      throw new BadRequestException('El periodo aún no tiene contador inicial');
    }
    if (dto.lecturaFinal < periodo.lecturaInicial) {
      throw new BadRequestException(
        'La lectura final no puede ser menor a la inicial',
      );
    }

    const copiasUsadas = dto.lecturaFinal - periodo.lecturaInicial;
    const copiasExcedentes = Math.max(
      0,
      copiasUsadas - periodo.copiasIncluidas,
    );
    const montoExcedente = this.roundMoney(
      copiasExcedentes * Number(contrato.precioCopiaExcedente),
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.cargoPeriodoAlquiler.deleteMany({
        where: { periodoId: periodo.id, tipo: 'EXCEDENTE_COPIAS' },
      });
      if (montoExcedente > 0) {
        await tx.cargoPeriodoAlquiler.create({
          data: {
            periodoId: periodo.id,
            tipo: 'EXCEDENTE_COPIAS',
            descripcion: `${copiasExcedentes} copias excedentes`,
            monto: montoExcedente,
          },
        });
      }

      const totalCierre = montoExcedente;
      const nextEstado = totalCierre > 0 ? 'PENDIENTE_CIERRE' : 'CERRADO';

      await tx.lecturaAlquiler.create({
        data: {
          contratoId: contrato.id,
          periodoId: periodo.id,
          equipoId: contrato.equipoId,
          usuarioId: userId,
          contador: dto.lecturaFinal,
          notas: dto.notas ?? `Lectura final periodo ${periodo.numeroPeriodo}`,
        },
      });

      await tx.periodoAlquiler.update({
        where: { id: periodo.id },
        data: {
          lecturaFinal: dto.lecturaFinal,
          copiasUsadas,
          copiasExcedentes,
          montoExcedente,
          montoSoporte: 0,
          totalCierre,
          cierreCalculadoAt: new Date(),
          ...(totalCierre === 0 ? { cierreCobradoAt: new Date() } : {}),
          estado: nextEstado,
        },
      });
      await tx.contratoAlquiler.update({
        where: { id: contrato.id },
        data: { contadorActual: dto.lecturaFinal },
      });
      await tx.equipo.update({
        where: { id: contrato.equipoId },
        data: { contadorActual: dto.lecturaFinal },
      });

      await this.ensureNextPeriodo(
        tx,
        contrato,
        periodo.numeroPeriodo,
        dto.lecturaFinal,
      );

      return tx.contratoAlquiler.findUnique({
        where: { id: contrato.id },
        include: this.contratoInclude(),
      });
    });
  }

  async cobrarCierre(
    id: string,
    periodoId: string,
    dto: CobrarPeriodoAlquilerDto,
    userId: string,
  ) {
    const contrato = await this.getContrato(id);
    const periodo = await this.prisma.periodoAlquiler.findFirst({
      where: { id: periodoId, contratoId: contrato.id },
    });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');
    if (periodo.estado !== 'PENDIENTE_CIERRE') {
      throw new BadRequestException(
        'Primero calcula un excedente pendiente del periodo',
      );
    }
    if (periodo.cierreCobradoAt) {
      throw new BadRequestException('El cierre de este periodo ya fue cobrado');
    }

    const totalCierre = Number(periodo.totalCierre);
    const apertura =
      totalCierre > 0
        ? await this.cajaService.getMiAperturaActiva(userId)
        : null;
    if (totalCierre > 0 && !apertura) {
      throw new BadRequestException(
        'Debes tener una caja abierta para cobrar el excedente',
      );
    }
    if (totalCierre > 0 && !dto.metodoPagoId) {
      throw new BadRequestException('Selecciona un método de pago');
    }

    return this.prisma.$transaction(async (tx) => {
      if (totalCierre > 0 && apertura) {
        await this.registrarIngresoAlquiler(tx, {
          aperturaId: apertura.id,
          userId,
          monto: totalCierre,
          metodoPagoId: dto.metodoPagoId,
          referenciaId: periodo.id,
          referenciaPago: dto.referenciaPago,
          evidenciaPagoFilename: dto.evidenciaPagoFilename,
          concepto: `Alquiler ${contrato.numero} - excedente periodo ${periodo.numeroPeriodo}`,
        });
      }

      await tx.periodoAlquiler.update({
        where: { id: periodo.id },
        data: { estado: 'CERRADO', cierreCobradoAt: new Date() },
      });

      if (contrato.estado === 'EN_RETORNO') {
        const pendiente = await tx.periodoAlquiler.findFirst({
          where: {
            contratoId: contrato.id,
            estado: { in: ['PENDIENTE_BASE', 'ACTIVO', 'PENDIENTE_CIERRE'] },
          },
          select: { id: true },
        });
        if (!pendiente) {
          await tx.contratoAlquiler.update({
            where: { id: contrato.id },
            data: { estado: 'FINALIZADO' },
          });
        }
      }

      return tx.contratoAlquiler.findUnique({
        where: { id: contrato.id },
        include: this.contratoInclude(),
      });
    });
  }

  async cobrarBase(
    id: string,
    periodoId: string,
    dto: CobrarPeriodoAlquilerDto,
    userId: string,
  ) {
    const contrato = await this.getContrato(id);
    if (contrato.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se cobran periodos de contratos activos',
      );
    }

    const periodo = await this.prisma.periodoAlquiler.findFirst({
      where: { id: periodoId, contratoId: contrato.id },
    });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');
    if (periodo.estado !== 'PENDIENTE_BASE') {
      throw new BadRequestException(
        'Solo se cobra la base de periodos pendientes',
      );
    }
    if (periodo.baseCobradoAt) {
      throw new BadRequestException(
        'La mensualidad de este periodo ya fue cobrada',
      );
    }
    if (!dto.metodoPagoId) {
      throw new BadRequestException('Selecciona un método de pago');
    }

    if (periodo.numeroPeriodo > 1) {
      const anterior = await this.prisma.periodoAlquiler.findFirst({
        where: {
          contratoId: contrato.id,
          numeroPeriodo: periodo.numeroPeriodo - 1,
        },
        select: { estado: true },
      });
      if (anterior?.estado !== 'CERRADO') {
        throw new BadRequestException(
          'Primero cierra el periodo anterior antes de cobrar esta mensualidad',
        );
      }
    }

    const apertura = await this.cajaService.getMiAperturaActiva(userId);
    if (!apertura) {
      throw new BadRequestException(
        'Debes tener una caja abierta para cobrar la mensualidad',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const periodoAnterior = await tx.periodoAlquiler.findFirst({
        where: {
          contratoId: contrato.id,
          numeroPeriodo: periodo.numeroPeriodo - 1,
        },
        select: { lecturaFinal: true },
      });
      const lecturaInicial =
        periodo.lecturaInicial ??
        periodoAnterior?.lecturaFinal ??
        contrato.contadorActual;

      await this.registrarIngresoAlquiler(tx, {
        aperturaId: apertura.id,
        userId,
        monto: Number(periodo.montoBase),
        metodoPagoId: dto.metodoPagoId,
        referenciaId: periodo.id,
        referenciaPago: dto.referenciaPago,
        evidenciaPagoFilename: dto.evidenciaPagoFilename,
        concepto: `Alquiler ${contrato.numero} - mensualidad periodo ${periodo.numeroPeriodo}`,
      });

      await tx.periodoAlquiler.update({
        where: { id: periodo.id },
        data: {
          estado: 'ACTIVO',
          baseCobradoAt: new Date(),
          ...(lecturaInicial != null ? { lecturaInicial } : {}),
        },
      });

      return tx.contratoAlquiler.findUnique({
        where: { id: contrato.id },
        include: this.contratoInclude(),
      });
    });
  }

  async finalizar(
    id: string,
    dto: FinalizarContratoAlquilerDto,
    userId: string,
  ) {
    const contrato = await this.getContrato(id);
    if (contrato.estado !== 'ACTIVO') {
      throw new BadRequestException('Solo se finalizan contratos activos');
    }
    await this.assertAlmacenActivo(dto.almacenId);
    await this.assertSinCierresPendientes(contrato.id);
    await this.assertSinBasesPendientes(contrato.id);

    const contadorRetorno =
      dto.contadorRetorno ?? contrato.contadorActual ?? contrato.contadorInicio;
    const ultimoContador = contrato.contadorActual ?? contrato.contadorInicio;
    if (contadorRetorno < ultimoContador) {
      throw new BadRequestException(
        'El contador de retorno no puede ser menor al contador actual',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const periodoFinal = await tx.periodoAlquiler.findFirst({
        where: {
          contratoId: contrato.id,
          estado: { in: ['ACTIVO', 'CERRADO'] },
        },
        orderBy: { numeroPeriodo: 'desc' },
        include: { cargos: true },
      });
      let saldoFinalPendiente = 0;
      let totalOperativoPeriodo = 0;
      const cargoDanos = this.roundMoney(dto.cargoDanos ?? 0);
      const cargoTransporte = this.roundMoney(dto.cargoTransporte ?? 0);
      const cargoMora = this.roundMoney(dto.cargoMora ?? 0);
      const totalCargosFinales = this.roundMoney(
        cargoDanos + cargoTransporte + cargoMora,
      );
      const depositoGarantia = this.roundMoney(
        Number(contrato.depositoGarantia ?? 0),
      );
      const depositoAplicadoPrevio = this.roundMoney(
        Number(contrato.depositoAplicado ?? 0),
      );
      const depositoAplicado = this.roundMoney(dto.depositoAplicado ?? 0);
      const depositoAplicadoTotal = this.roundMoney(
        depositoAplicadoPrevio + depositoAplicado,
      );
      const depositoDevuelto = this.roundMoney(dto.depositoDevuelto ?? 0);

      if (depositoAplicadoTotal + depositoDevuelto > depositoGarantia) {
        throw new BadRequestException(
          'El depósito aplicado y devuelto no puede superar el depósito de garantía',
        );
      }
      if (
        (depositoAplicado > 0 || depositoDevuelto > 0) &&
        !contrato.depositoCobradoAt
      ) {
        throw new BadRequestException(
          'No se puede aplicar o devolver un depósito que no fue cobrado',
        );
      }
      if (depositoAplicado > totalCargosFinales) {
        throw new BadRequestException(
          'El depósito aplicado no puede superar los cargos finales',
        );
      }
      if (depositoDevuelto > 0 && !dto.metodoPagoDevolucionId) {
        throw new BadRequestException(
          'Selecciona un método de pago para devolver el depósito',
        );
      }

      if (periodoFinal?.estado === 'ACTIVO') {
        if (periodoFinal.lecturaInicial == null) {
          throw new BadRequestException(
            'El periodo activo no tiene contador inicial',
          );
        }
        if (contadorRetorno < periodoFinal.lecturaInicial) {
          throw new BadRequestException(
            'El contador de retorno no puede ser menor al inicio del periodo',
          );
        }

        const copiasUsadas = contadorRetorno - periodoFinal.lecturaInicial;
        const copiasExcedentes = Math.max(
          0,
          copiasUsadas - periodoFinal.copiasIncluidas,
        );
        const montoExcedente = this.roundMoney(
          copiasExcedentes * Number(contrato.precioCopiaExcedente),
        );
        if (montoExcedente > 0) {
          throw new BadRequestException(
            'Hay excedente pendiente. Cierra y cobra el periodo antes de finalizar.',
          );
        }

        await tx.cargoPeriodoAlquiler.deleteMany({
          where: { periodoId: periodoFinal.id, tipo: 'EXCEDENTE_COPIAS' },
        });

        totalOperativoPeriodo = montoExcedente;

        await tx.lecturaAlquiler.create({
          data: {
            contratoId: contrato.id,
            periodoId: periodoFinal.id,
            equipoId: contrato.equipoId,
            usuarioId: userId,
            contador: contadorRetorno,
            notas: `Lectura de retorno periodo ${periodoFinal.numeroPeriodo}`,
          },
        });
        await tx.periodoAlquiler.update({
          where: { id: periodoFinal.id },
          data: {
            lecturaFinal: contadorRetorno,
            copiasUsadas,
            copiasExcedentes,
            montoExcedente,
            montoSoporte: 0,
          },
        });
      }

      if (periodoFinal && periodoFinal.estado === 'ACTIVO') {
        saldoFinalPendiente = this.roundMoney(
          Math.max(0, totalOperativoPeriodo),
        );
        await tx.periodoAlquiler.update({
          where: { id: periodoFinal.id },
          data: {
            totalCierre: saldoFinalPendiente,
            cierreCalculadoAt: new Date(),
            ...(saldoFinalPendiente > 0
              ? { estado: 'PENDIENTE_CIERRE' }
              : { estado: 'CERRADO', cierreCobradoAt: new Date() }),
          },
        });
      }

      if (totalCargosFinales > 0) {
        if (!periodoFinal) {
          throw new BadRequestException(
            'No hay un periodo donde registrar cargos finales',
          );
        }
        await this.createCargoFinal(
          tx,
          periodoFinal.id,
          'DANO',
          cargoDanos,
          'Daños detectados en retorno',
        );
        await this.createCargoFinal(
          tx,
          periodoFinal.id,
          'TRANSPORTE',
          cargoTransporte,
          'Recojo o transporte de retorno',
        );
        await this.createCargoFinal(
          tx,
          periodoFinal.id,
          'MORA',
          cargoMora,
          'Mora al cierre del alquiler',
        );

        const totalCierreFinal = this.roundMoney(
          Number(periodoFinal.totalCierre ?? 0) + totalCargosFinales,
        );
        saldoFinalPendiente = this.roundMoney(
          Math.max(saldoFinalPendiente, totalCargosFinales - depositoAplicado),
        );
        await tx.periodoAlquiler.update({
          where: { id: periodoFinal.id },
          data: {
            totalCierre: totalCierreFinal,
            cierreCalculadoAt: new Date(),
            ...(saldoFinalPendiente > 0
              ? { estado: 'PENDIENTE_CIERRE', cierreCobradoAt: null }
              : { estado: 'CERRADO', cierreCobradoAt: new Date() }),
          },
        });
      }

      if (depositoDevuelto > 0) {
        const apertura = await this.cajaService.getMiAperturaActiva(userId, tx);
        if (!apertura) {
          throw new BadRequestException(
            'Debes tener una caja abierta para devolver el depósito',
          );
        }
        await this.registrarIngresoAlquiler(tx, {
          aperturaId: apertura.id,
          userId,
          monto: depositoDevuelto,
          metodoPagoId: dto.metodoPagoDevolucionId,
          referenciaId: contrato.id,
          referenciaTipo: ALQUILER_DEVOLUCION_DEPOSITO_REF,
          tipoMovimiento: TipoMovimientoCajaDto.DEVOLUCION,
          referenciaPago: dto.referenciaDevolucion,
          evidenciaPagoFilename: dto.evidenciaRetornoFilename,
          concepto: `Alquiler ${contrato.numero} - devolución de depósito`,
        });
      }

      if (periodoFinal) {
        await tx.periodoAlquiler.updateMany({
          where: {
            contratoId: contrato.id,
            id: { not: periodoFinal.id },
            estado: { in: ['PENDIENTE_BASE', 'ACTIVO'] },
          },
          data: { estado: 'CANCELADO' },
        });
      }

      await tx.inspeccionAlquiler.create({
        data: {
          contratoId: contrato.id,
          equipoId: contrato.equipoId,
          usuarioId: userId,
          tipo: 'RETORNO',
          condicion: dto.condicionRetorno ?? 'BUENO',
          contador: contadorRetorno,
          evidenciaFilename: dto.evidenciaRetornoFilename,
          notas: dto.notasInspeccion,
        },
      });

      await this.devolverEquipo(
        tx,
        contrato,
        dto.almacenId,
        userId,
        'Finalización de alquiler',
      );
      await tx.contratoAlquiler.update({
        where: { id: contrato.id },
        data: {
          estado: saldoFinalPendiente > 0 ? 'EN_RETORNO' : 'CERRADO',
          contadorActual: contadorRetorno,
          depositoAplicado: depositoAplicadoTotal,
          ...(depositoDevuelto > 0 ? { depositoDevueltoAt: new Date() } : {}),
          notas: dto.notas ?? contrato.notas,
        },
      });
      await tx.garantia.updateMany({
        where: { contratoAlquilerId: contrato.id, estado: 'ACTIVA' },
        data: { estado: 'VENCIDA', fechaFin: new Date() },
      });
      return tx.contratoAlquiler.findUnique({
        where: { id: contrato.id },
        include: this.contratoInclude(),
      });
    });
  }

  async cancelar(id: string, dto: CancelarContratoAlquilerDto, userId: string) {
    const contrato = await this.getContrato(id);
    if (contrato.estado === 'CANCELADO') return contrato;
    if (['FINALIZADO', 'CERRADO'].includes(contrato.estado)) {
      throw new BadRequestException(
        'No se puede anular un contrato ya finalizado',
      );
    }

    if (contrato.estado === 'BORRADOR') {
      return this.prisma.contratoAlquiler.update({
        where: { id },
        data: { estado: 'CANCELADO', notas: dto.notas ?? contrato.notas },
        include: this.contratoInclude(),
      });
    }

    if (!dto.almacenId) {
      throw new BadRequestException(
        'Selecciona un almacén para devolver el equipo',
      );
    }
    await this.assertAlmacenActivo(dto.almacenId);
    await this.assertSinCierresPendientes(contrato.id);

    return this.prisma.$transaction(async (tx) => {
      await this.devolverEquipo(
        tx,
        contrato,
        dto.almacenId!,
        userId,
        'Cancelación de alquiler',
      );
      await tx.periodoAlquiler.updateMany({
        where: {
          contratoId: contrato.id,
          estado: { in: ['PENDIENTE_BASE', 'ACTIVO'] },
        },
        data: { estado: 'CANCELADO' },
      });
      await tx.garantia.updateMany({
        where: { contratoAlquilerId: contrato.id },
        data: { estado: 'ANULADA', fechaFin: new Date() },
      });
      await tx.contratoAlquiler.update({
        where: { id: contrato.id },
        data: { estado: 'CANCELADO', notas: dto.notas ?? contrato.notas },
      });
      return tx.contratoAlquiler.findUnique({
        where: { id: contrato.id },
        include: this.contratoInclude(),
      });
    });
  }

  async removeRecord(id: string) {
    const contrato = await this.getContrato(id);
    if (contrato.estado === 'ACTIVO') {
      throw new BadRequestException(
        'No se puede eliminar un alquiler activo. Primero anúlalo o finalízalo para devolver el equipo.',
      );
    }

    await this.prisma.contratoAlquiler.delete({ where: { id: contrato.id } });

    return { id: contrato.id, deleted: true };
  }

  private async getContrato(id: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({
      where: { id, deletedAt: null },
      include: {
        cliente: true,
        equipo: { include: { producto: true } },
      },
    });
    if (!contrato)
      throw new NotFoundException('Contrato de alquiler no encontrado');
    return contrato;
  }

  private contratoListInclude() {
    return {
      cliente: {
        select: { id: true, nombre: true, apellido: true, razonSocial: true },
      },
      equipo: {
        select: {
          id: true,
          numeroSerie: true,
          contadorActual: true,
          producto: {
            select: {
              id: true,
              nombre: true,
              sku: true,
              modelo: true,
              marca: { select: { nombre: true } },
            },
          },
        },
      },
    } satisfies Prisma.ContratoAlquilerInclude;
  }

  private contratoInclude() {
    return {
      ...this.contratoListInclude(),
      periodos: {
        include: { cargos: { orderBy: { createdAt: 'asc' } } },
        orderBy: { numeroPeriodo: 'asc' },
      },
      lecturas: { orderBy: { fechaLectura: 'desc' }, take: 20 },
      inspecciones: { orderBy: { createdAt: 'desc' } },
      garantia: true,
    } satisfies Prisma.ContratoAlquilerInclude;
  }

  private assertEquipoDisponible(equipo: {
    estado: string;
    estadoComercial: string;
    almacenId?: string | null;
  }) {
    if (equipo.estado !== 'ACTIVO') {
      throw new BadRequestException('Solo se pueden alquilar equipos activos');
    }
    if (equipo.estadoComercial !== 'DISPONIBLE') {
      throw new BadRequestException(
        'Solo se pueden alquilar equipos disponibles',
      );
    }
  }

  private async assertAlmacenActivo(almacenId: string) {
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: almacenId, activo: true, deletedAt: null },
      select: { id: true },
    });
    if (!almacen)
      throw new NotFoundException('Almacén no encontrado o inactivo');
  }

  private async assertSinCierresPendientes(contratoId: string) {
    const pendiente = await this.prisma.periodoAlquiler.findFirst({
      where: { contratoId, estado: 'PENDIENTE_CIERRE' },
      select: { numeroPeriodo: true },
    });
    if (pendiente) {
      throw new BadRequestException(
        `Cobra o revisa el cierre pendiente del periodo ${pendiente.numeroPeriodo}`,
      );
    }
  }

  private async assertSinBasesPendientes(contratoId: string) {
    const pendiente = await this.prisma.periodoAlquiler.findFirst({
      where: {
        contratoId,
        estado: 'PENDIENTE_BASE',
        baseCobradoAt: null,
      },
      select: { numeroPeriodo: true },
    });
    if (pendiente) {
      throw new BadRequestException(
        `Cobra la mensualidad base pendiente del periodo ${pendiente.numeroPeriodo} antes de finalizar`,
      );
    }
  }

  private async resolvePeriodoLectura(contratoId: string, periodoId?: string) {
    if (periodoId) {
      const periodo = await this.prisma.periodoAlquiler.findFirst({
        where: { id: periodoId, contratoId },
      });
      if (!periodo) throw new NotFoundException('Periodo no encontrado');
      return periodo;
    }

    return this.prisma.periodoAlquiler.findFirst({
      where: { contratoId, estado: { in: ['ACTIVO', 'PENDIENTE_BASE'] } },
      orderBy: { numeroPeriodo: 'desc' },
    });
  }

  private async nextNumero() {
    const count = await this.prisma.contratoAlquiler.count();
    return `ALQ-${String(count + 1).padStart(6, '0')}`;
  }

  private parseDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('Fecha inválida');
    return date;
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private getClienteNombre(cliente: {
    nombre?: string | null;
    apellido?: string | null;
    razonSocial?: string | null;
  }) {
    return (
      cliente.razonSocial ??
      [cliente.nombre, cliente.apellido].filter(Boolean).join(' ') ??
      'Cliente'
    );
  }

  private getClienteDocTipo(cliente: {
    ruc?: string | null;
    dni?: string | null;
  }) {
    if (cliente.ruc) return 'RUC';
    if (cliente.dni) return 'DNI';
    return null;
  }

  private async registrarIngresoAlquiler(
    tx: Prisma.TransactionClient,
    params: {
      aperturaId: string;
      userId: string;
      monto: number;
      metodoPagoId?: string | null;
      referenciaId: string;
      referenciaTipo?: string;
      tipoMovimiento?: TipoMovimientoCajaDto;
      referenciaPago?: string | null;
      evidenciaPagoFilename?: string | null;
      concepto: string;
    },
  ) {
    const movimiento = await this.cajaService.registrarMovimiento(
      params.aperturaId,
      params.userId,
      {
        tipo: params.tipoMovimiento ?? TipoMovimientoCajaDto.INGRESO,
        monto: this.roundMoney(params.monto),
        concepto: params.referenciaPago
          ? `${params.concepto} · Ref. ${params.referenciaPago}`
          : params.concepto,
        metodoPagoId: params.metodoPagoId ?? undefined,
        referenciaTipo: params.referenciaTipo ?? ALQUILER_PERIODO_REF,
        referenciaId: params.referenciaId,
      },
      tx,
    );

    if (params.evidenciaPagoFilename) {
      await tx.adjunto.create({
        data: {
          entidad: 'ALQUILER_PAGO',
          entidadId: movimiento.id,
          url: `uploads/${params.evidenciaPagoFilename}`,
          nombre: params.evidenciaPagoFilename,
          tipo: 'ALQUILER_PAGO_EVIDENCIA',
        },
      });
    }

    return movimiento;
  }

  private async applyStockDelta(
    tx: Prisma.TransactionClient,
    params: {
      productoId: string;
      almacenId: string;
      delta: 1 | -1;
      tipo: TipoMovimiento;
      referenciaId: string;
      justificacion: string;
      userId: string;
    },
  ) {
    const stock = await tx.almacenStock.findUnique({
      where: {
        almacenId_productoId: {
          almacenId: params.almacenId,
          productoId: params.productoId,
        },
      },
    });
    const before = stock?.cantidad ?? 0;
    const after = before + params.delta;
    if (after < 0)
      throw new BadRequestException('Stock insuficiente en almacén');

    await tx.almacenStock.upsert({
      where: {
        almacenId_productoId: {
          almacenId: params.almacenId,
          productoId: params.productoId,
        },
      },
      update: { cantidad: after },
      create: {
        almacenId: params.almacenId,
        productoId: params.productoId,
        cantidad: after,
      },
    });
    await tx.movimientoStock.create({
      data: {
        tipo: params.tipo,
        productoId: params.productoId,
        almacenOrigenId: params.delta < 0 ? params.almacenId : null,
        almacenDestinoId: params.delta > 0 ? params.almacenId : null,
        cantidad: 1,
        cantidadAnterior: before,
        cantidadPosterior: after,
        referenciaId: params.referenciaId,
        referenciaTipo: 'ALQUILER',
        justificacion: params.justificacion,
        usuarioId: params.userId,
      },
    });
  }

  private async findTicketsCobrables(
    client: DbClient,
    contratoId: string,
    clienteId: string,
    equipoId: string,
    desde: Date,
    hasta: Date,
  ) {
    const cobrados = await client.cargoPeriodoAlquiler.findMany({
      where: {
        ticketId: { not: null },
        periodo: { contratoId },
      },
      select: { ticketId: true },
    });
    const cobradosIds = cobrados
      .map((item) => item.ticketId)
      .filter((value): value is string => Boolean(value));

    return client.ticket.findMany({
      where: {
        clienteId,
        equipoId,
        estado: 'CERRADO',
        deletedAt: null,
        fechaCierre: { gte: desde, lte: hasta },
        montoTotal: { gt: 0 },
        ...(cobradosIds.length ? { id: { notIn: cobradosIds } } : {}),
      },
      select: {
        id: true,
        codigo: true,
        titulo: true,
        montoTotal: true,
        fechaCierre: true,
      },
      orderBy: { fechaCierre: 'asc' },
    });
  }

  private async findPagosContrato(contrato: {
    id: string;
    periodos?: Array<{ id: string }>;
  }) {
    const periodoIds = (contrato.periodos ?? []).map((periodo) => periodo.id);
    const movimientos = await this.prisma.movimientoCaja.findMany({
      where: {
        OR: [
          ...(periodoIds.length
            ? [
                {
                  referenciaTipo: ALQUILER_PERIODO_REF,
                  referenciaId: { in: periodoIds },
                },
              ]
            : []),
          { referenciaTipo: ALQUILER_DEPOSITO_REF, referenciaId: contrato.id },
          {
            referenciaTipo: ALQUILER_DEVOLUCION_DEPOSITO_REF,
            referenciaId: contrato.id,
          },
        ],
      },
      include: {
        metodoPago: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const movimientoIds = movimientos.map((movimiento) => movimiento.id);
    const adjuntos = movimientoIds.length
      ? await this.prisma.adjunto.findMany({
          where: {
            entidad: 'ALQUILER_PAGO',
            entidadId: { in: movimientoIds },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const adjuntosByMovimiento = new Map<string, typeof adjuntos>();
    for (const adjunto of adjuntos) {
      const current = adjuntosByMovimiento.get(adjunto.entidadId) ?? [];
      current.push(adjunto);
      adjuntosByMovimiento.set(adjunto.entidadId, current);
    }

    return movimientos.map((movimiento) => ({
      id: movimiento.id,
      tipo: movimiento.referenciaTipo,
      referenciaId: movimiento.referenciaId,
      concepto: movimiento.concepto,
      monto: Number(movimiento.monto),
      metodoPago: movimiento.metodoPago?.nombre ?? null,
      createdAt: movimiento.createdAt,
      evidencias: (adjuntosByMovimiento.get(movimiento.id) ?? []).map(
        (adjunto) => ({
          id: adjunto.id,
          nombre: adjunto.nombre,
          url: adjunto.url,
          tipo: adjunto.tipo,
          createdAt: adjunto.createdAt,
        }),
      ),
    }));
  }

  private buildResumenFinanciero(contrato: {
    depositoGarantia: unknown;
    depositoAplicado?: unknown;
    depositoDevueltoAt?: Date | null;
    periodos?: Array<{
      montoBase: unknown;
      baseCobradoAt?: Date | null;
      totalCierre: unknown;
      cierreCobradoAt?: Date | null;
    }>;
  }) {
    const periodos = contrato.periodos ?? [];
    const cuotasBaseTotal = this.roundMoney(
      periodos.reduce(
        (total, periodo) => total + Number(periodo.montoBase ?? 0),
        0,
      ),
    );
    const cuotasBaseCobradas = this.roundMoney(
      periodos.reduce(
        (total, periodo) =>
          total + (periodo.baseCobradoAt ? Number(periodo.montoBase ?? 0) : 0),
        0,
      ),
    );
    const cierresTotal = this.roundMoney(
      periodos.reduce(
        (total, periodo) => total + Number(periodo.totalCierre ?? 0),
        0,
      ),
    );
    const cierresCobrados = this.roundMoney(
      periodos.reduce(
        (total, periodo) =>
          total +
          (periodo.cierreCobradoAt ? Number(periodo.totalCierre ?? 0) : 0),
        0,
      ),
    );
    const depositoGarantia = this.roundMoney(
      Number(contrato.depositoGarantia ?? 0),
    );
    const depositoAplicado = this.roundMoney(
      Number(contrato.depositoAplicado ?? 0),
    );
    const depositoDevuelto = contrato.depositoDevueltoAt
      ? this.roundMoney(Math.max(0, depositoGarantia - depositoAplicado))
      : 0;
    const saldoPendiente = this.roundMoney(
      Math.max(
        0,
        cuotasBaseTotal -
          cuotasBaseCobradas +
          cierresTotal -
          cierresCobrados -
          depositoAplicado,
      ),
    );

    return {
      cuotasBaseTotal,
      cuotasBaseCobradas,
      cierresTotal,
      cierresCobrados,
      depositoGarantia,
      depositoAplicado,
      depositoDevuelto,
      saldoPendiente,
    };
  }

  private async createCargoFinal(
    tx: Prisma.TransactionClient,
    periodoId: string,
    tipo: 'DANO' | 'TRANSPORTE' | 'MORA',
    monto: number,
    descripcion: string,
  ) {
    if (monto <= 0) return null;
    return tx.cargoPeriodoAlquiler.create({
      data: {
        periodoId,
        tipo,
        descripcion,
        monto,
      },
    });
  }

  private async ensureNextPeriodo(
    tx: Prisma.TransactionClient,
    contrato: Awaited<ReturnType<AlquileresService['getContrato']>>,
    periodoCerradoNumero: number,
    lecturaInicial: number,
  ) {
    if (periodoCerradoNumero >= contrato.mesesPlazo) return;

    const numeroPeriodo = periodoCerradoNumero + 1;
    const exists = await tx.periodoAlquiler.findFirst({
      where: { contratoId: contrato.id, numeroPeriodo },
      select: { id: true, lecturaInicial: true },
    });
    if (exists) {
      if (exists.lecturaInicial == null) {
        await tx.periodoAlquiler.update({
          where: { id: exists.id },
          data: { lecturaInicial },
        });
      }
      return;
    }

    await tx.periodoAlquiler.create({
      data: {
        contratoId: contrato.id,
        numeroPeriodo,
        fechaInicio: this.addMonths(contrato.fechaInicio, periodoCerradoNumero),
        fechaFin: this.addMonths(contrato.fechaInicio, numeroPeriodo),
        lecturaInicial,
        copiasIncluidas: contrato.copiasIncluidasMes,
        montoBase: contrato.precioMensual,
        estado: 'PENDIENTE_BASE',
      },
    });
  }

  private async devolverEquipo(
    tx: Prisma.TransactionClient,
    contrato: Awaited<ReturnType<AlquileresService['getContrato']>>,
    almacenId: string,
    userId: string,
    motivo: string,
  ) {
    await this.applyStockDelta(tx, {
      productoId: contrato.equipo.productoId,
      almacenId,
      delta: 1,
      tipo: TipoMovimiento.AJUSTE_POSITIVO,
      referenciaId: contrato.id,
      justificacion: `${motivo} ${contrato.numero}`,
      userId,
    });
    await tx.equipo.update({
      where: { id: contrato.equipoId },
      data: { estadoComercial: 'DISPONIBLE', almacenId },
    });
    await tx.equipoCliente.updateMany({
      where: {
        equipoId: contrato.equipoId,
        clienteId: contrato.clienteId,
        fechaFin: null,
      },
      data: { fechaFin: new Date() },
    });
  }
}
