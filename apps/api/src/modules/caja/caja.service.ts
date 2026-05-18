import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  AbrirCajaDto,
  CerrarCajaDto,
  CreateArqueoCajaDto,
  CreateCajaDto,
  CreateMovimientoCajaDto,
  TipoMovimientoCajaDto,
  UpdateCajaDto,
} from './dto';

export type CajaTx = Prisma.TransactionClient;

const TIPOS_INGRESO = new Set<TipoMovimientoCajaDto>([
  TipoMovimientoCajaDto.INGRESO,
  TipoMovimientoCajaDto.VENTA,
  TipoMovimientoCajaDto.DEPOSITO,
]);

const TIPOS_EGRESO = new Set<TipoMovimientoCajaDto>([
  TipoMovimientoCajaDto.EGRESO,
  TipoMovimientoCajaDto.RETIRO,
  TipoMovimientoCajaDto.DEVOLUCION,
]);

@Injectable()
export class CajaService {
  private readonly logger = new Logger(CajaService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Cajas (definición) ──

  async createCaja(dto: CreateCajaDto) {
    const exists = await this.prisma.caja.findUnique({
      where: { nombre: dto.nombre },
    });
    if (exists) {
      throw new ConflictException(
        `Ya existe una caja con el nombre "${dto.nombre}"`,
      );
    }
    return this.prisma.caja.create({ data: dto });
  }

  findAllCajas() {
    return this.prisma.caja.findMany({
      orderBy: [{ activa: 'desc' }, { nombre: 'asc' }],
    });
  }

  async findOneCaja(id: string) {
    const caja = await this.prisma.caja.findUnique({ where: { id } });
    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }
    return caja;
  }

  async updateCaja(id: string, dto: UpdateCajaDto) {
    await this.findOneCaja(id);
    if (dto.nombre) {
      const conflict = await this.prisma.caja.findFirst({
        where: { nombre: dto.nombre, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException('Ya existe otra caja con ese nombre');
      }
    }
    return this.prisma.caja.update({ where: { id }, data: dto });
  }

  // ── Apertura / Cierre ──

  async getAperturaActiva(cajaId: string) {
    return this.prisma.aperturaCaja.findFirst({
      where: { cajaId, estado: 'ABIERTA' },
      include: {
        caja: true,
        usuarioApertura: { select: { id: true, nombre: true, apellido: true } },
      },
    });
  }

  async getMiAperturaActiva(usuarioId: string, tx?: CajaTx) {
    const client = tx ?? this.prisma;
    return client.aperturaCaja.findFirst({
      where: { usuarioAperturaId: usuarioId, estado: 'ABIERTA' },
      include: {
        caja: true,
        usuarioApertura: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { abiertaEn: 'desc' },
    });
  }

  async abrir(usuarioId: string, dto: AbrirCajaDto) {
    await this.findOneCaja(dto.cajaId);
    const activa = await this.prisma.aperturaCaja.findFirst({
      where: { cajaId: dto.cajaId, estado: 'ABIERTA' },
    });
    if (activa) {
      throw new ConflictException('La caja ya tiene una apertura activa');
    }
    const apertura = await this.prisma.aperturaCaja.create({
      data: {
        cajaId: dto.cajaId,
        usuarioAperturaId: usuarioId,
        montoInicial: dto.montoInicial,
        montoEsperado: dto.montoInicial,
        notasApertura: dto.notasApertura,
      },
      include: {
        caja: true,
        usuarioApertura: { select: { id: true, nombre: true, apellido: true } },
      },
    });
    this.logger.log(`Caja ${dto.cajaId} abierta por usuario ${usuarioId}`);
    return apertura;
  }

  async cerrar(aperturaId: string, usuarioId: string, dto: CerrarCajaDto) {
    const apertura = await this.prisma.aperturaCaja.findUnique({
      where: { id: aperturaId },
    });
    if (!apertura) {
      throw new NotFoundException('Apertura no encontrada');
    }
    if (apertura.estado !== 'ABIERTA') {
      throw new BadRequestException('La apertura ya fue cerrada');
    }
    const esperado = await this.calcularMontoEsperado(
      aperturaId,
      apertura.montoInicial,
    );
    const diferencia = Number(dto.montoContado) - Number(esperado);
    const cerrada = await this.prisma.aperturaCaja.update({
      where: { id: aperturaId },
      data: {
        estado: 'CERRADA',
        usuarioCierreId: usuarioId,
        montoContado: dto.montoContado,
        montoEsperado: esperado,
        diferencia,
        notasCierre: dto.notasCierre,
        cerradaEn: new Date(),
      },
      include: {
        caja: true,
        usuarioApertura: { select: { id: true, nombre: true, apellido: true } },
        usuarioCierre: { select: { id: true, nombre: true, apellido: true } },
      },
    });
    this.logger.log(
      `Caja ${apertura.cajaId} cerrada (apertura ${aperturaId}) — diferencia ${diferencia}`,
    );
    return cerrada;
  }

  private async calcularMontoEsperado(
    aperturaId: string,
    montoInicial: unknown,
  ) {
    const movs = await this.prisma.movimientoCaja.findMany({
      where: { aperturaId },
      select: { tipo: true, monto: true },
    });
    let total = Number(montoInicial);
    for (const m of movs) {
      const tipo = m.tipo as unknown as TipoMovimientoCajaDto;
      const valor = Number(m.monto);
      if (TIPOS_INGRESO.has(tipo)) total += valor;
      else if (TIPOS_EGRESO.has(tipo)) total -= valor;
    }
    return Math.round(total * 100) / 100;
  }

  // ── Movimientos ──

  async registrarMovimiento(
    aperturaId: string,
    usuarioId: string,
    dto: CreateMovimientoCajaDto,
    tx?: CajaTx,
  ) {
    const client = tx ?? this.prisma;
    const apertura = await client.aperturaCaja.findUnique({
      where: { id: aperturaId },
    });
    if (!apertura) {
      throw new NotFoundException('Apertura no encontrada');
    }
    if (apertura.estado !== 'ABIERTA') {
      throw new BadRequestException('La caja está cerrada');
    }
    if (dto.metodoPagoId) {
      const metodo = await client.metodoPago.findUnique({
        where: { id: dto.metodoPagoId },
      });
      if (!metodo) {
        throw new NotFoundException('Método de pago no encontrado');
      }
    }
    const movimiento = await client.movimientoCaja.create({
      data: {
        aperturaId,
        usuarioId,
        tipo: dto.tipo,
        monto: dto.monto,
        concepto: dto.concepto,
        metodoPagoId: dto.metodoPagoId,
        referenciaTipo: dto.referenciaTipo,
        referenciaId: dto.referenciaId,
      },
      include: {
        metodoPago: true,
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    });
    return movimiento;
  }

  async listarMovimientos(aperturaId: string) {
    return this.prisma.movimientoCaja.findMany({
      where: { aperturaId },
      include: {
        metodoPago: true,
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Arqueos intermedios ──

  async registrarArqueo(
    aperturaId: string,
    usuarioId: string,
    dto: CreateArqueoCajaDto,
  ) {
    const apertura = await this.prisma.aperturaCaja.findUnique({
      where: { id: aperturaId },
    });
    if (!apertura) {
      throw new NotFoundException('Apertura no encontrada');
    }
    if (apertura.estado !== 'ABIERTA') {
      throw new BadRequestException('La caja está cerrada');
    }
    const esperado = await this.calcularMontoEsperado(
      aperturaId,
      apertura.montoInicial,
    );
    const diferencia = Number(dto.montoContado) - Number(esperado);
    return this.prisma.arqueoCaja.create({
      data: {
        aperturaId,
        usuarioId,
        montoEsperado: esperado,
        montoContado: dto.montoContado,
        diferencia,
        notas: dto.notas,
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    });
  }

  // ── Resumen / detalle ──

  async getResumenApertura(aperturaId: string) {
    const apertura = await this.prisma.aperturaCaja.findUnique({
      where: { id: aperturaId },
      include: {
        caja: true,
        usuarioApertura: { select: { id: true, nombre: true, apellido: true } },
        usuarioCierre: { select: { id: true, nombre: true, apellido: true } },
      },
    });
    if (!apertura) {
      throw new NotFoundException('Apertura no encontrada');
    }
    const movs = await this.prisma.movimientoCaja.findMany({
      where: { aperturaId },
      select: { tipo: true, monto: true },
    });
    const totales = {
      ingresos: 0,
      egresos: 0,
      ventas: 0,
      otros: 0,
    };
    for (const m of movs) {
      const tipo = m.tipo as unknown as TipoMovimientoCajaDto;
      const valor = Number(m.monto);
      if (tipo === TipoMovimientoCajaDto.VENTA) totales.ventas += valor;
      else if (TIPOS_INGRESO.has(tipo)) totales.ingresos += valor;
      else if (TIPOS_EGRESO.has(tipo)) totales.egresos += valor;
      else totales.otros += valor;
    }
    const esperado = await this.calcularMontoEsperado(
      aperturaId,
      apertura.montoInicial,
    );
    return { apertura, totales, montoEsperado: esperado };
  }

  // Helper público para que otros módulos (ventas) registren ingresos en caja.
  // tx OBLIGATORIO desde ventas.confirmar() para garantizar atomicidad.
  async registrarIngresoVenta(
    params: {
      usuarioId: string;
      monto: number;
      metodoPagoId?: string | null;
      ventaId: string;
      concepto?: string;
    },
    tx?: CajaTx,
  ) {
    const apertura = await this.getMiAperturaActiva(params.usuarioId, tx);
    if (!apertura) return null;
    return this.registrarMovimiento(
      apertura.id,
      params.usuarioId,
      {
        tipo: TipoMovimientoCajaDto.VENTA,
        monto: params.monto,
        concepto: params.concepto ?? `Venta ${params.ventaId}`,
        metodoPagoId: params.metodoPagoId ?? undefined,
        referenciaTipo: 'VENTA',
        referenciaId: params.ventaId,
      },
      tx,
    );
  }

  // Reverso por anulación de venta: movimiento DEVOLUCION (egresa caja).
  async registrarReversoVenta(
    params: {
      usuarioId: string;
      monto: number;
      metodoPagoId?: string | null;
      ventaId: string;
      concepto?: string;
    },
    tx?: CajaTx,
  ) {
    const apertura = await this.getMiAperturaActiva(params.usuarioId, tx);
    if (!apertura) return null;
    return this.registrarMovimiento(
      apertura.id,
      params.usuarioId,
      {
        tipo: TipoMovimientoCajaDto.DEVOLUCION,
        monto: params.monto,
        concepto: params.concepto ?? `Anulación venta ${params.ventaId}`,
        metodoPagoId: params.metodoPagoId ?? undefined,
        referenciaTipo: 'VENTA_ANULADA',
        referenciaId: params.ventaId,
      },
      tx,
    );
  }
}
