import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  EstadoTicket as PrismaEstadoTicket,
  EstadoVenta as PrismaEstadoVenta,
} from '../../../generated/prisma/client';
import type { AlmacenStockWhereInput } from '../../../generated/prisma/models/AlmacenStock';
import type { AlertaStockWhereInput } from '../../../generated/prisma/models/AlertaStock';
import type { LecturaSNMPWhereInput } from '../../../generated/prisma/models/LecturaSNMP';
import type { TicketWhereInput } from '../../../generated/prisma/models/Ticket';
import type { VentaWhereInput } from '../../../generated/prisma/models/Venta';
import { PrismaService } from '../../database/prisma.service';
import {
  QueryReporteVentasDto,
  QueryReporteTicketsDto,
  QueryReporteStockDto,
  QueryReporteClientesDto,
  QueryTelemetriaDto,
} from './dto';

type DateRangeWhere = {
  gte?: Date;
  lte?: Date;
};

type DateRangeQuery = {
  fechaDesde?: string;
  fechaHasta?: string;
};

type ReporteVentasWhere = Omit<VentaWhereInput, 'createdAt' | 'estado'> & {
  createdAt?: DateRangeWhere;
  estado?: PrismaEstadoVenta;
};

type ReporteTicketsWhere = Omit<
  TicketWhereInput,
  'createdAt' | 'estado' | 'tecnicoId'
> & {
  createdAt?: DateRangeWhere;
  estado?: PrismaEstadoTicket;
  tecnicoId?: string | { not: null };
};

type ReporteStockWhere = AlertaStockWhereInput & AlmacenStockWhereInput;

type ReporteTelemetriaWhere = Omit<LecturaSNMPWhereInput, 'timestamp'> & {
  timestamp?: DateRangeWhere;
};

type TecnicoResumen = {
  id: string;
  nombre: string | null;
};

const applyDateRange = <T extends { createdAt?: DateRangeWhere }>(
  where: T,
  query: DateRangeQuery,
): void => {
  if (!query.fechaDesde && !query.fechaHasta) {
    return;
  }

  where.createdAt = {};
  if (query.fechaDesde) {
    where.createdAt.gte = new Date(query.fechaDesde);
  }
  if (query.fechaHasta) {
    where.createdAt.lte = new Date(query.fechaHasta);
  }
};

const applyTimestampRange = (
  where: ReporteTelemetriaWhere,
  query: DateRangeQuery,
): void => {
  if (!query.fechaDesde && !query.fechaHasta) {
    return;
  }

  where.timestamp = {};
  if (query.fechaDesde) {
    where.timestamp.gte = new Date(query.fechaDesde);
  }
  if (query.fechaHasta) {
    where.timestamp.lte = new Date(query.fechaHasta);
  }
};

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════
  //  DASHBOARD KPIs
  // ═══════════════════════════════════════════

  async getDashboard() {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalVentasMes,
      ventasConfirmadas,
      ticketsAbiertos,
      ticketsCerradosMes,
      alertasStock,
      clientesNuevosMes,
    ] = await Promise.all([
      // Total vendido este mes (entregadas)
      this.prisma.venta.aggregate({
        _sum: { total: true },
        where: {
          estado: 'ENTREGADA',
          createdAt: { gte: inicioMes },
          deletedAt: null,
        },
      }),
      // Cantidad ventas confirmadas este mes
      this.prisma.venta.count({
        where: {
          estado: { in: ['ORDEN_CONFIRMADA', 'ENTREGADA'] },
          createdAt: { gte: inicioMes },
          deletedAt: null,
        },
      }),
      // Tickets abiertos actualmente
      this.prisma.ticket.count({
        where: {
          estado: { in: ['ABIERTO', 'EN_PROCESO', 'EN_ESPERA'] },
          deletedAt: null,
        },
      }),
      // Tickets cerrados este mes
      this.prisma.ticket.count({
        where: {
          estado: 'CERRADO',
          fechaCierre: { gte: inicioMes },
          deletedAt: null,
        },
      }),
      // Alertas de stock sin resolver
      this.prisma.alertaStock.count({
        where: { resuelta: false },
      }),
      // Clientes nuevos este mes
      this.prisma.cliente.count({
        where: {
          createdAt: { gte: inicioMes },
          deletedAt: null,
        },
      }),
    ]);

    return {
      ventasMes: {
        totalMonto: +(totalVentasMes._sum.total ?? 0),
        cantidad: ventasConfirmadas,
      },
      tickets: {
        abiertos: ticketsAbiertos,
        cerradosMes: ticketsCerradosMes,
      },
      alertasStockPendientes: alertasStock,
      clientesNuevosMes,
    };
  }

  // ═══════════════════════════════════════════
  //  DASHBOARD — VENTAS SEMANA (últimos 7 días)
  // ═══════════════════════════════════════════

  async getVentasSemana() {
    const now = new Date();
    const hace7Dias = new Date(now);
    hace7Dias.setDate(hace7Dias.getDate() - 6);
    hace7Dias.setHours(0, 0, 0, 0);

    // Ventas por día (últimos 7 días) — solo confirmadas/entregadas
    const ventasPorDia = await this.prisma.$queryRaw<
      { dia: Date; total: string; cantidad: string }[]
    >`
      SELECT
        date_trunc('day', "createdAt") AS dia,
        COALESCE(SUM(total), 0)::text  AS total,
        COUNT(*)::text                 AS cantidad
      FROM ventas
      WHERE "createdAt" >= ${hace7Dias}
        AND "deletedAt" IS NULL
        AND estado IN ('ORDEN_CONFIRMADA', 'ENTREGADA')
      GROUP BY dia
      ORDER BY dia
    `;

    // Movimientos de stock por día (últimos 7 días)
    const movimientosPorDia = await this.prisma.$queryRaw<
      { dia: Date; cantidad: string }[]
    >`
      SELECT
        date_trunc('day', "createdAt") AS dia,
        COUNT(*)::text                 AS cantidad
      FROM movimientos_stock
      WHERE "createdAt" >= ${hace7Dias}
      GROUP BY dia
      ORDER BY dia
    `;

    // Build 7-day array with labels
    const dias: string[] = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const result: {
      dia: string;
      fecha: string;
      ventas: number;
      stock: number;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(hace7Dias);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD

      const ventaDia = ventasPorDia.find(
        (v) => new Date(v.dia).toISOString().slice(0, 10) === key,
      );
      const movDia = movimientosPorDia.find(
        (m) => new Date(m.dia).toISOString().slice(0, 10) === key,
      );

      result.push({
        dia: dias[d.getDay()],
        fecha: key,
        ventas: ventaDia ? +ventaDia.total : 0,
        stock: movDia ? +movDia.cantidad : 0,
      });
    }

    return result;
  }

  // ═══════════════════════════════════════════
  //  REPORTE DE VENTAS
  // ═══════════════════════════════════════════

  async getReporteVentas(query: QueryReporteVentasDto) {
    const where: ReporteVentasWhere = { deletedAt: null };

    if (query.estado) where.estado = query.estado as PrismaEstadoVenta;
    applyDateRange(where, query);

    const [resumen, porEstado, ventas] = await Promise.all([
      this.prisma.venta.aggregate({
        _sum: { total: true, igv: true, subtotal: true, descuento: true },
        _count: true,
        where,
      }),
      this.prisma.venta.groupBy({
        by: ['estado'],
        _count: true,
        _sum: { total: true },
        where,
      }),
      this.prisma.venta.findMany({
        where,
        select: {
          id: true,
          numero: true,
          estado: true,
          total: true,
          createdAt: true,
          cliente: {
            select: { id: true, razonSocial: true, dni: true, ruc: true },
          },
          usuario: { select: { id: true, nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      resumen: {
        totalVentas: resumen._count,
        subtotal: +(resumen._sum?.subtotal ?? 0),
        descuento: +(resumen._sum?.descuento ?? 0),
        igv: +(resumen._sum?.igv ?? 0),
        total: +(resumen._sum?.total ?? 0),
      },
      porEstado: porEstado.map((e) => ({
        estado: e.estado,
        cantidad: e._count,
        total: +(e._sum?.total ?? 0),
      })),
      ultimasVentas: ventas,
    };
  }

  // ═══════════════════════════════════════════
  //  REPORTE DE STOCK
  // ═══════════════════════════════════════════

  async getReporteStock(query: QueryReporteStockDto) {
    const where: ReporteStockWhere = {};
    if (query.almacenId) where.almacenId = query.almacenId;

    // Alertas de stock activas
    const alertas = await this.prisma.alertaStock.findMany({
      where: { resuelta: false, ...where },
      include: {
        producto: { select: { id: true, nombre: true, sku: true } },
        almacen: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Total de alertas activas
    const totalAlertas = alertas.length;

    // Productos con stock bajo mínimo: la comparación columna-vs-columna se hace
    // en SQL para no traer toda la tabla a memoria y filtrarla luego en JS.
    type StockBajoRow = {
      id: string;
      cantidad: number;
      productoId: string;
      almacenId: string;
      productoNombre: string;
      productoSku: string;
      productoStockMinimo: number;
      almacenNombre: string;
    };

    let stockBajoRows: StockBajoRow[] = [];
    if (query.stockBajo) {
      stockBajoRows = query.almacenId
        ? await this.prisma.$queryRaw<StockBajoRow[]>`
            SELECT
              s.id,
              s.cantidad,
              s."productoId",
              s."almacenId",
              p.nombre AS "productoNombre",
              p.sku AS "productoSku",
              p."stockMinimo" AS "productoStockMinimo",
              a.nombre AS "almacenNombre"
            FROM almacen_stocks s
            INNER JOIN productos p ON p.id = s."productoId"
            INNER JOIN almacenes a ON a.id = s."almacenId"
            WHERE s.cantidad <= p."stockMinimo"
              AND s."almacenId" = ${query.almacenId}
          `
        : await this.prisma.$queryRaw<StockBajoRow[]>`
            SELECT
              s.id,
              s.cantidad,
              s."productoId",
              s."almacenId",
              p.nombre AS "productoNombre",
              p.sku AS "productoSku",
              p."stockMinimo" AS "productoStockMinimo",
              a.nombre AS "almacenNombre"
            FROM almacen_stocks s
            INNER JOIN productos p ON p.id = s."productoId"
            INNER JOIN almacenes a ON a.id = s."almacenId"
            WHERE s.cantidad <= p."stockMinimo"
          `;
    }

    const stockBajo = stockBajoRows.map((row) => ({
      id: row.id,
      cantidad: row.cantidad,
      productoId: row.productoId,
      almacenId: row.almacenId,
      producto: {
        id: row.productoId,
        nombre: row.productoNombre,
        sku: row.productoSku,
        stockMinimo: row.productoStockMinimo,
      },
      almacen: { id: row.almacenId, nombre: row.almacenNombre },
    }));

    return {
      totalAlertas,
      alertas,
      ...(query.stockBajo ? { stockBajo } : {}),
    };
  }

  // ═══════════════════════════════════════════
  //  REPORTE DE TICKETS
  // ═══════════════════════════════════════════

  async getReporteTickets(query: QueryReporteTicketsDto) {
    const where: ReporteTicketsWhere = { deletedAt: null };

    if (query.estado) where.estado = query.estado as PrismaEstadoTicket;
    if (query.tecnicoId) where.tecnicoId = query.tecnicoId;
    applyDateRange(where, query);

    const [porEstado, porPrioridad, porTecnico, total] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['estado'],
        _count: true,
        where,
      }),
      this.prisma.ticket.groupBy({
        by: ['prioridad'],
        _count: true,
        where,
      }),
      this.prisma.ticket.groupBy({
        by: ['tecnicoId'],
        _count: true,
        where: { ...where, tecnicoId: { not: null } },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    // Enrich tecnico names
    const tecnicoIds = porTecnico
      .map((t) => t.tecnicoId)
      .filter((id): id is string => id !== null);

    let tecnicos: TecnicoResumen[] = [];
    if (tecnicoIds.length > 0) {
      tecnicos = await this.prisma.usuario.findMany({
        where: { id: { in: tecnicoIds } },
        select: { id: true, nombre: true },
      });
    }

    const tecnicoMap = new Map(
      tecnicos.map((tecnico) => [tecnico.id, tecnico.nombre]),
    );

    return {
      total,
      porEstado: porEstado.map((e) => ({
        estado: e.estado,
        cantidad: e._count,
      })),
      porPrioridad: porPrioridad.map((p) => ({
        prioridad: p.prioridad,
        cantidad: p._count,
      })),
      porTecnico: porTecnico.map((t) => ({
        tecnicoId: t.tecnicoId,
        nombre: tecnicoMap.get(t.tecnicoId!) ?? 'Sin nombre',
        cantidad: t._count,
      })),
    };
  }

  // ═══════════════════════════════════════════
  //  REPORTE DE CLIENTES
  // ═══════════════════════════════════════════

  async getReporteClientes(query: QueryReporteClientesDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Top clientes por total comprado
    const topClientes = await this.prisma.cliente.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        razonSocial: true,
        dni: true,
        ruc: true,
        ventas: {
          where: {
            estado: 'ENTREGADA',
            deletedAt: null,
          },
          select: { total: true },
        },
        tickets: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
      skip,
      take: limit,
    });

    const totalClientes = await this.prisma.cliente.count({
      where: { deletedAt: null },
    });

    const clientesConTotales = topClientes
      .map((c) => ({
        id: c.id,
        razonSocial: c.razonSocial,
        dni: c.dni,
        ruc: c.ruc,
        totalComprado: c.ventas.reduce((sum, v) => sum + +(v.total ?? 0), 0),
        cantidadVentas: c.ventas.length,
        cantidadTickets: c.tickets.length,
      }))
      .sort((a, b) => b.totalComprado - a.totalComprado);

    return {
      data: clientesConTotales,
      meta: { total: totalClientes, page, limit },
    };
  }

  // ═══════════════════════════════════════════
  //  TELEMETRÍA SNMP
  // ═══════════════════════════════════════════

  async getTelemetria(equipoSerie: string, query: QueryTelemetriaDto) {
    // Buscar equipo por serie
    const equipo = await this.prisma.equipo.findUnique({
      where: { numeroSerie: equipoSerie },
      select: {
        id: true,
        numeroSerie: true,
        producto: { select: { modelo: true } },
      },
    });
    if (!equipo) {
      throw new NotFoundException(
        `Equipo con serie '${equipoSerie}' no encontrado`,
      );
    }

    const where: ReporteTelemetriaWhere = { equipoId: equipo.id };
    applyTimestampRange(where, query);

    const lecturas = await this.prisma.lecturaSNMP.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Último reading para estado actual
    const ultimaLectura = lecturas[0] ?? null;

    return {
      equipo: {
        id: equipo.id,
        serie: equipo.numeroSerie,
        modelo: equipo.producto.modelo,
      },
      ultimaLectura,
      historial: lecturas,
      totalLecturas: lecturas.length,
    };
  }
}
