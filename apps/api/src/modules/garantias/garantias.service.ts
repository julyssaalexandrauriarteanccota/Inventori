import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EstadoComercialEquipo, EstadoGarantia } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateGarantiaDto,
  UpdateGarantiaDto,
  CreateCasoGarantiaDto,
  UpdateCasoGarantiaDto,
  QueryGarantiaDto,
} from './dto';

@Injectable()
export class GarantiasService {
  private readonly logger = new Logger(GarantiasService.name);

  constructor(private readonly prisma: PrismaService) {}

  private assertGarantiaActivaCompleta(input: {
    estado?: EstadoGarantia | string | null;
    fechaInstalacion?: Date | string | null;
    direccionInstalacion?: string | null;
    ubigeoInstalacion?: string | null;
    departamentoInstalacion?: string | null;
    provinciaInstalacion?: string | null;
    distritoInstalacion?: string | null;
    latitudInstalacion?: number | null;
    longitudInstalacion?: number | null;
  }) {
    if (input.estado !== EstadoGarantia.ACTIVA) return;

    if (
      !input.fechaInstalacion ||
      !input.direccionInstalacion?.trim() ||
      !input.ubigeoInstalacion?.trim() ||
      !input.departamentoInstalacion?.trim() ||
      !input.provinciaInstalacion?.trim() ||
      !input.distritoInstalacion?.trim() ||
      input.latitudInstalacion == null ||
      input.longitudInstalacion == null
    ) {
      throw new BadRequestException(
        'Para activar la garantía completa fecha, dirección, ubigeo y punto de instalación',
      );
    }
  }

  private optionalText(value?: string | null) {
    return value?.trim() || null;
  }

  private enrichGarantia(garantia: any) {
    if (!garantia) return garantia;

    const ahora = new Date();
    const vigentePorFecha =
      garantia.estado === EstadoGarantia.ACTIVA &&
      new Date(garantia.fechaFin) > ahora;

    let vigentePorCopias = true;
    let copiasUsadas: number | null = null;
    if (
      garantia.contadorMaxCopias != null &&
      garantia.contadorInicio != null &&
      garantia.equipo?.contadorActual != null
    ) {
      copiasUsadas = Math.max(
        garantia.equipo.contadorActual - garantia.contadorInicio,
        0,
      );
      vigentePorCopias = copiasUsadas < garantia.contadorMaxCopias;
    }

    const vigente = vigentePorFecha && vigentePorCopias;

    return {
      ...garantia,
      vigente,
      vigentePorFecha,
      vigentePorCopias,
      copiasUsadas,
    };
  }

  // ═══════════════════════════════════════════
  //  GARANTÍAS
  // ═══════════════════════════════════════════

  async create(dto: CreateGarantiaDto) {
    // Validar equipo vendido y capturar datos necesarios para snapshots
    const equipo = await this.prisma.equipo.findUnique({
      where: { id: dto.equipoId },
      include: {
        producto: {
          select: {
            id: true,
            mesesGarantia: true,
            garantiaMaxCopias: true,
          },
        },
        equipoClientes: {
          where: { fechaFin: null },
          take: 1,
          include: {
            cliente: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                razonSocial: true,
                ruc: true,
                dni: true,
              },
            },
          },
        },
      },
    });
    if (!equipo) {
      throw new NotFoundException(`Equipo ${dto.equipoId} no encontrado`);
    }

    if (
      (equipo.estadoComercial as EstadoComercialEquipo) !==
      EstadoComercialEquipo.VENDIDO
    ) {
      throw new BadRequestException(
        'Solo se pueden crear garantías para equipos vendidos',
      );
    }

    const asignacion = equipo.equipoClientes[0];
    if (!asignacion?.cliente) {
      throw new BadRequestException(
        'El equipo vendido debe tener un cliente actual para crear garantía',
      );
    }

    const existingGarantia = await this.prisma.garantia.findFirst({
      where: {
        equipoId: equipo.id,
        estado: { not: EstadoGarantia.ANULADA },
      },
      select: { id: true },
    });
    if (existingGarantia) {
      throw new BadRequestException(
        'El equipo ya tiene una garantía registrada. Modifica la garantía existente.',
      );
    }

    let ventaId = dto.ventaId ?? asignacion.ventaId ?? null;
    if (dto.ventaId) {
      if (asignacion.ventaId && dto.ventaId !== asignacion.ventaId) {
        throw new BadRequestException(
          'La venta seleccionada no corresponde a la asignación actual del equipo',
        );
      }

      if (!asignacion.ventaId) {
        const venta = await this.prisma.venta.findFirst({
          where: {
            id: dto.ventaId,
            deletedAt: null,
            clienteId: asignacion.clienteId,
            detalles: { some: { equipoSerie: equipo.numeroSerie } },
          },
          select: { id: true },
        });
        if (!venta) {
          throw new BadRequestException(
            'La venta seleccionada no corresponde al equipo vendido',
          );
        }
        ventaId = venta.id;
      }
    }

    // Validar fechas
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);
    if (fechaFin <= fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    const cliente = asignacion.cliente;
    const clienteDocTipo =
      dto.clienteDocTipo ?? (cliente.ruc ? 'RUC' : cliente.dni ? 'DNI' : null);
    const clienteDocNumero =
      dto.clienteDocNumero ?? cliente.ruc ?? cliente.dni ?? null;
    const clienteNombre =
      dto.clienteNombre ??
      cliente.razonSocial ??
      ([cliente.nombre, cliente.apellido].filter(Boolean).join(' ') || null);

    // Generar código QR único
    const codigoQR = randomUUID();

    // Snapshot del contador: por defecto usa contadorInicial; opcionalmente contadorActual.
    const contadorInicio = dto.usarContadorActual
      ? (equipo.contadorActual ?? equipo.contadorInicial ?? null)
      : (equipo.contadorInicial ?? equipo.contadorActual ?? null);
    const contadorMaxCopias =
      dto.contadorMaxCopias ?? equipo.producto?.garantiaMaxCopias ?? null;
    const estado = dto.estado ?? EstadoGarantia.PENDIENTE_COMPLETAR;
    const fechaInstalacion = dto.fechaInstalacion
      ? new Date(dto.fechaInstalacion)
      : null;
    this.assertGarantiaActivaCompleta({
      estado,
      fechaInstalacion,
      direccionInstalacion: dto.direccionInstalacion,
      ubigeoInstalacion: dto.ubigeoInstalacion,
      departamentoInstalacion: dto.departamentoInstalacion,
      provinciaInstalacion: dto.provinciaInstalacion,
      distritoInstalacion: dto.distritoInstalacion,
      latitudInstalacion: dto.latitudInstalacion ?? null,
      longitudInstalacion: dto.longitudInstalacion ?? null,
    });

    const garantia = await this.prisma.garantia.create({
      data: {
        equipoId: dto.equipoId,
        ventaId,
        clienteIdOriginal: cliente.id,
        clienteDocTipo,
        clienteDocNumero,
        clienteNombre,
        fechaInicio,
        fechaFin,
        cobertura: dto.cobertura,
        exclusiones: dto.exclusiones ?? null,
        fechaInstalacion,
        direccionInstalacion: this.optionalText(dto.direccionInstalacion),
        ubigeoInstalacion: this.optionalText(dto.ubigeoInstalacion),
        departamentoInstalacion: this.optionalText(dto.departamentoInstalacion),
        provinciaInstalacion: this.optionalText(dto.provinciaInstalacion),
        distritoInstalacion: this.optionalText(dto.distritoInstalacion),
        latitudInstalacion: dto.latitudInstalacion ?? null,
        longitudInstalacion: dto.longitudInstalacion ?? null,
        contactoInstalacion: this.optionalText(dto.contactoInstalacion),
        telefonoInstalacion: this.optionalText(dto.telefonoInstalacion),
        notasInstalacion: dto.notasInstalacion ?? null,
        estado,
        codigoQR,
        contadorInicio,
        contadorMaxCopias,
      },
      include: {
        equipo: {
          select: {
            id: true,
            numeroSerie: true,
            contadorActual: true,
            producto: { select: { nombre: true, modelo: true } },
          },
        },
      },
    });

    this.logger.log(
      `Garantía creada: ${garantia.id} — Equipo: ${equipo.numeroSerie} — QR: ${codigoQR}`,
    );
    return this.enrichGarantia(garantia);
  }

  async findAll(query: QueryGarantiaDto) {
    const {
      page = 1,
      limit = 20,
      estado,
      equipoId,
      search,
      soloOperativas,
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (estado) {
      where.estado = estado;
    } else if (soloOperativas) {
      where.estado = {
        in: [EstadoGarantia.PENDIENTE_COMPLETAR, EstadoGarantia.ACTIVA],
      };
    }
    if (equipoId) where.equipoId = equipoId;
    if (search) {
      where.OR = [
        { codigoQR: { contains: search, mode: 'insensitive' } },
        { clienteNombre: { contains: search, mode: 'insensitive' } },
        { equipo: { numeroSerie: { contains: search, mode: 'insensitive' } } },
        {
          equipo: {
            producto: { nombre: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          equipo: {
            producto: { modelo: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [garantias, total] = await Promise.all([
      this.prisma.garantia.findMany({
        where,
        skip,
        take: limit,
        include: {
          equipo: {
            select: {
              id: true,
              numeroSerie: true,
              contadorActual: true,
              producto: { select: { nombre: true, modelo: true } },
            },
          },
          _count: { select: { casos: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.garantia.count({ where }),
    ]);

    return {
      data: garantias.map((g) => this.enrichGarantia(g)),
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async update(id: string, dto: UpdateGarantiaDto) {
    const current = await this.prisma.garantia.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException(`Garantía ${id} no encontrada`);
    }

    const fechaInicio = dto.fechaInicio
      ? new Date(dto.fechaInicio)
      : current.fechaInicio;
    const fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : current.fechaFin;
    if (fechaFin <= fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    const estado = dto.estado ?? current.estado;
    const fechaInstalacion =
      dto.fechaInstalacion !== undefined
        ? dto.fechaInstalacion
          ? new Date(dto.fechaInstalacion)
          : null
        : current.fechaInstalacion;
    const direccionInstalacion =
      dto.direccionInstalacion !== undefined
        ? this.optionalText(dto.direccionInstalacion)
        : current.direccionInstalacion;
    const ubigeoInstalacion =
      dto.ubigeoInstalacion !== undefined
        ? this.optionalText(dto.ubigeoInstalacion)
        : current.ubigeoInstalacion;
    const departamentoInstalacion =
      dto.departamentoInstalacion !== undefined
        ? this.optionalText(dto.departamentoInstalacion)
        : current.departamentoInstalacion;
    const provinciaInstalacion =
      dto.provinciaInstalacion !== undefined
        ? this.optionalText(dto.provinciaInstalacion)
        : current.provinciaInstalacion;
    const distritoInstalacion =
      dto.distritoInstalacion !== undefined
        ? this.optionalText(dto.distritoInstalacion)
        : current.distritoInstalacion;
    const latitudInstalacion =
      dto.latitudInstalacion !== undefined
        ? dto.latitudInstalacion
        : current.latitudInstalacion;
    const longitudInstalacion =
      dto.longitudInstalacion !== undefined
        ? dto.longitudInstalacion
        : current.longitudInstalacion;

    this.assertGarantiaActivaCompleta({
      estado,
      fechaInstalacion,
      direccionInstalacion,
      ubigeoInstalacion,
      departamentoInstalacion,
      provinciaInstalacion,
      distritoInstalacion,
      latitudInstalacion,
      longitudInstalacion,
    });

    return this.prisma.garantia.update({
      where: { id },
      data: {
        ventaId: dto.ventaId !== undefined ? (dto.ventaId ?? null) : undefined,
        clienteDocTipo:
          dto.clienteDocTipo !== undefined
            ? dto.clienteDocTipo?.trim() || null
            : undefined,
        clienteDocNumero:
          dto.clienteDocNumero !== undefined
            ? dto.clienteDocNumero?.trim() || null
            : undefined,
        clienteNombre:
          dto.clienteNombre !== undefined
            ? dto.clienteNombre?.trim() || null
            : undefined,
        fechaInicio,
        fechaFin,
        cobertura: dto.cobertura?.trim(),
        exclusiones:
          dto.exclusiones !== undefined
            ? dto.exclusiones?.trim() || null
            : undefined,
        fechaInstalacion,
        direccionInstalacion,
        ubigeoInstalacion,
        departamentoInstalacion,
        provinciaInstalacion,
        distritoInstalacion,
        latitudInstalacion,
        longitudInstalacion,
        contactoInstalacion:
          dto.contactoInstalacion !== undefined
            ? this.optionalText(dto.contactoInstalacion)
            : undefined,
        telefonoInstalacion:
          dto.telefonoInstalacion !== undefined
            ? this.optionalText(dto.telefonoInstalacion)
            : undefined,
        notasInstalacion:
          dto.notasInstalacion !== undefined
            ? (dto.notasInstalacion ?? null)
            : undefined,
        estado,
        contadorMaxCopias:
          dto.contadorMaxCopias !== undefined
            ? dto.contadorMaxCopias
            : undefined,
      },
    });
  }

  async remove(id: string) {
    const current = await this.prisma.garantia.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!current) {
      throw new NotFoundException(`Garantía ${id} no encontrada`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.casoGarantia.deleteMany({ where: { garantiaId: id } });
      return tx.garantia.delete({ where: { id } });
    });
  }

  async findOne(id: string) {
    const garantia = await this.prisma.garantia.findUnique({
      where: { id },
      include: {
        equipo: {
          select: {
            id: true,
            numeroSerie: true,
            contadorActual: true,
            producto: {
              select: {
                nombre: true,
                modelo: true,
                marca: { select: { nombre: true } },
              },
            },
          },
        },
        casos: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!garantia) {
      throw new NotFoundException(`Garantía ${id} no encontrada`);
    }
    return this.enrichGarantia(garantia);
  }

  // ═══════════════════════════════════════════
  //  CONSULTA PÚBLICA POR CÓDIGO QR
  // ═══════════════════════════════════════════

  async verificarPorCodigoQR(codigoQR: string) {
    const garantia = await this.prisma.garantia.findUnique({
      where: { codigoQR },
      select: {
        id: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        cobertura: true,
        exclusiones: true,
        fechaInstalacion: true,
        direccionInstalacion: true,
        ubigeoInstalacion: true,
        departamentoInstalacion: true,
        provinciaInstalacion: true,
        distritoInstalacion: true,
        latitudInstalacion: true,
        longitudInstalacion: true,
        contactoInstalacion: true,
        telefonoInstalacion: true,
        notasInstalacion: true,
        clienteNombre: true,
        codigoQR: true,
        contadorInicio: true,
        contadorMaxCopias: true,
        equipo: {
          select: {
            numeroSerie: true,
            contadorActual: true,
            producto: {
              select: {
                nombre: true,
                modelo: true,
                marca: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });
    if (!garantia) {
      throw new NotFoundException('Garantía no encontrada');
    }

    return this.enrichGarantia(garantia);
  }

  // ═══════════════════════════════════════════
  //  CASOS DE GARANTÍA
  // ═══════════════════════════════════════════

  async createCaso(garantiaId: string, dto: CreateCasoGarantiaDto) {
    const garantia = await this.prisma.garantia.findUnique({
      where: { id: garantiaId },
    });
    if (!garantia) {
      throw new NotFoundException(`Garantía ${garantiaId} no encontrada`);
    }

    // Validar que la garantía esté activa
    if ((garantia.estado as EstadoGarantia) !== EstadoGarantia.ACTIVA) {
      throw new BadRequestException(
        'Solo se pueden abrir casos en garantías activas',
      );
    }

    // Verificar vigencia
    if (new Date(garantia.fechaFin) < new Date()) {
      throw new BadRequestException(
        'La garantía está vencida. No se pueden abrir casos nuevos',
      );
    }

    // Un caso manual nace pendiente si no se decide aceptarlo/rechazarlo.
    if (dto.aceptada === false && !dto.motivo?.trim()) {
      throw new BadRequestException(
        'Debe indicar el motivo cuando se rechaza la cobertura de garantía',
      );
    }

    const caso = await this.prisma.casoGarantia.create({
      data: {
        garantiaId,
        ticketId: dto.ticketId ?? null,
        descripcion: dto.descripcion,
        aceptada: dto.aceptada ?? null,
        motivo: dto.motivo ?? null,
      },
      include: {
        garantia: {
          select: {
            id: true,
            codigoQR: true,
            equipo: { select: { numeroSerie: true } },
          },
        },
      },
    });

    this.logger.log(
      `Caso de garantía creado: ${caso.id} — Garantía: ${garantiaId}`,
    );
    return caso;
  }

  async updateCaso(
    garantiaId: string,
    casoId: string,
    dto: UpdateCasoGarantiaDto,
  ) {
    // Verificar que el caso pertenece a la garantía
    const caso = await this.prisma.casoGarantia.findUnique({
      where: { id: casoId },
    });
    if (!caso) {
      throw new NotFoundException(`Caso ${casoId} no encontrado`);
    }
    if (caso.garantiaId !== garantiaId) {
      throw new BadRequestException(
        'El caso no pertenece a la garantía indicada',
      );
    }

    // Si se rechaza, el motivo es obligatorio
    if (dto.aceptada === false && !dto.motivo?.trim()) {
      throw new BadRequestException(
        'El motivo es obligatorio al rechazar un caso de garantía',
      );
    }

    return this.prisma.casoGarantia.update({
      where: { id: casoId },
      data: dto,
    });
  }

  async deleteCaso(garantiaId: string, casoId: string) {
    const caso = await this.prisma.casoGarantia.findUnique({
      where: { id: casoId },
    });

    if (!caso) {
      throw new NotFoundException(`Caso ${casoId} no encontrado`);
    }

    if (caso.garantiaId !== garantiaId) {
      throw new BadRequestException(
        'El caso no pertenece a la garantía indicada',
      );
    }

    return this.prisma.casoGarantia.delete({
      where: { id: casoId },
    });
  }
}
