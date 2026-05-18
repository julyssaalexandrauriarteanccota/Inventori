import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  EstadoComercialEquipo,
  TipoMovimiento,
  TipoProducto,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateEquipoDto,
  UpdateEquipoDto,
  QueryEquipoDto,
  AsignarClienteDto,
  CreateLecturaSNMPDto,
  QueryLecturaSNMPDto,
} from './dto';
import { SnmpService } from './snmp.service';

const PRODUCTO_EQUIPO_SELECT = {
  id: true,
  sku: true,
  nombre: true,
  modelo: true,
  tipo: true,
  imagen: true,
  imagenes: true,
  codigoBarras: true,
  condicion: true,
  manejaInventario: true,
  mesesGarantia: true,
  garantiaMaxCopias: true,
  categoria: { select: { id: true, nombre: true } },
  marca: { select: { id: true, nombre: true } },
  unidadMedida: { select: { id: true, codigo: true, nombre: true } },
} as const;

type InventorySyncTarget = {
  productoId: string;
  almacenId?: string | null;
  estadoComercial?: string | null;
  manejaInventario: boolean;
};

type StockDeltaResult = {
  before: number;
  after: number;
};

@Injectable()
export class EquiposService {
  private readonly logger = new Logger(EquiposService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snmpService: SnmpService,
  ) {}

  private isAsignadoFueraDeAlmacen(estadoComercial?: string | null) {
    return (
      estadoComercial === EstadoComercialEquipo.VENDIDO ||
      estadoComercial === EstadoComercialEquipo.ALQUILADO
    );
  }

  private isFueraDeStock(estadoComercial?: string | null) {
    return (
      this.isAsignadoFueraDeAlmacen(estadoComercial) ||
      estadoComercial === EstadoComercialEquipo.BAJA
    );
  }

  private cuentaEnInventario(target: InventorySyncTarget | null | undefined) {
    if (!target) return false;

    return Boolean(
      target.manejaInventario &&
      target.almacenId &&
      !this.isFueraDeStock(target.estadoComercial),
    );
  }

  private async applyStockDelta(
    tx: PrismaService,
    productoId: string,
    almacenId: string | null | undefined,
    delta: number,
  ): Promise<StockDeltaResult | null> {
    if (!almacenId || delta === 0) return null;

    const current = await tx.almacenStock.findUnique({
      where: {
        almacenId_productoId: {
          almacenId,
          productoId,
        },
      },
    });

    const nextCantidad = (current?.cantidad ?? 0) + delta;
    if (nextCantidad < 0) {
      throw new BadRequestException(
        `Stock inconsistente para el producto ${productoId} en almacén ${almacenId}`,
      );
    }

    await tx.almacenStock.upsert({
      where: {
        almacenId_productoId: {
          almacenId,
          productoId,
        },
      },
      update: {
        cantidad: nextCantidad,
      },
      create: {
        almacenId,
        productoId,
        cantidad: nextCantidad,
      },
    });

    return {
      before: current?.cantidad ?? 0,
      after: nextCantidad,
    };
  }

  private async createAutomaticStockMovement(
    tx: PrismaService,
    params: {
      tipo: TipoMovimiento;
      productoId: string;
      almacenOrigenId?: string | null;
      almacenDestinoId?: string | null;
      cantidad: number;
      cantidadAnterior: number;
      cantidadPosterior: number;
      justificacion: string;
      referenciaId: string;
      userId: string;
    },
  ) {
    await tx.movimientoStock.create({
      data: {
        tipo: params.tipo,
        productoId: params.productoId,
        almacenOrigenId: params.almacenOrigenId ?? null,
        almacenDestinoId: params.almacenDestinoId ?? null,
        cantidad: params.cantidad,
        cantidadAnterior: params.cantidadAnterior,
        cantidadPosterior: params.cantidadPosterior,
        referenciaId: params.referenciaId,
        referenciaTipo: 'EQUIPO',
        justificacion: params.justificacion,
        usuarioId: params.userId,
      },
    });
  }

  private buildAutomaticMovementJustification(
    referenceId: string,
    action: 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA',
  ) {
    if (action === 'TRANSFERENCIA') {
      return `Transferencia automática por cambio de almacén del equipo ${referenceId}`;
    }

    if (action === 'ENTRADA') {
      return `Ingreso automático al inventario por sincronización del equipo ${referenceId}`;
    }

    return `Salida automática del inventario por sincronización del equipo ${referenceId}`;
  }

  private async syncInventoryForEquipoChange(
    tx: PrismaService,
    previous: InventorySyncTarget | null,
    next: InventorySyncTarget | null,
    userId: string,
    referenceId: string,
  ) {
    const previousCounts = this.cuentaEnInventario(previous);
    const nextCounts = this.cuentaEnInventario(next);

    if (
      previousCounts &&
      nextCounts &&
      previous &&
      next &&
      previous.productoId === next.productoId &&
      previous.almacenId === next.almacenId
    ) {
      return;
    }

    if (
      previousCounts &&
      nextCounts &&
      previous &&
      next &&
      previous.productoId === next.productoId &&
      previous.almacenId &&
      next.almacenId &&
      previous.almacenId !== next.almacenId
    ) {
      const salida = await this.applyStockDelta(
        tx,
        previous.productoId,
        previous.almacenId,
        -1,
      );
      await this.applyStockDelta(tx, next.productoId, next.almacenId, 1);

      if (salida) {
        await this.createAutomaticStockMovement(tx, {
          tipo: TipoMovimiento.TRANSFERENCIA,
          productoId: previous.productoId,
          almacenOrigenId: previous.almacenId,
          almacenDestinoId: next.almacenId,
          cantidad: 1,
          cantidadAnterior: salida.before,
          cantidadPosterior: salida.after,
          justificacion: this.buildAutomaticMovementJustification(
            referenceId,
            'TRANSFERENCIA',
          ),
          referenciaId: referenceId,
          userId,
        });
      }
      return;
    }

    if (previousCounts && previous) {
      const salida = await this.applyStockDelta(
        tx,
        previous.productoId,
        previous.almacenId,
        -1,
      );
      if (salida) {
        await this.createAutomaticStockMovement(tx, {
          tipo: TipoMovimiento.AJUSTE_NEGATIVO,
          productoId: previous.productoId,
          almacenOrigenId: previous.almacenId,
          cantidad: 1,
          cantidadAnterior: salida.before,
          cantidadPosterior: salida.after,
          justificacion: this.buildAutomaticMovementJustification(
            referenceId,
            'SALIDA',
          ),
          referenciaId: referenceId,
          userId,
        });
      }
    }

    if (nextCounts && next) {
      const entrada = await this.applyStockDelta(
        tx,
        next.productoId,
        next.almacenId,
        1,
      );
      if (entrada) {
        await this.createAutomaticStockMovement(tx, {
          tipo: TipoMovimiento.AJUSTE_POSITIVO,
          productoId: next.productoId,
          almacenDestinoId: next.almacenId,
          cantidad: 1,
          cantidadAnterior: entrada.before,
          cantidadPosterior: entrada.after,
          justificacion: this.buildAutomaticMovementJustification(
            referenceId,
            'ENTRADA',
          ),
          referenciaId: referenceId,
          userId,
        });
      }
    }
  }

  private async validateAlmacen(almacenId?: string | null) {
    if (!almacenId) return;

    const almacen = await this.prisma.almacen.findFirst({
      where: { id: almacenId, deletedAt: null, activo: true },
      select: { id: true },
    });
    if (!almacen) {
      throw new NotFoundException(
        `Almacén ${almacenId} no encontrado o inactivo`,
      );
    }
  }

  // ═══════════════════════════════════════════
  //  CRUD EQUIPOS
  // ═══════════════════════════════════════════

  async create(dto: CreateEquipoDto, userId: string) {
    const producto = await this.prisma.producto.findFirst({
      where: { id: dto.productoId, deletedAt: null },
      select: {
        id: true,
        tipo: true,
        tieneNumeroSerie: true,
        manejaInventario: true,
      },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${dto.productoId} no encontrado`);
    }
    if (
      !producto.tieneNumeroSerie &&
      (producto.tipo as TipoProducto) !== TipoProducto.EQUIPO
    ) {
      throw new BadRequestException(
        'Solo productos tipo equipo o con número de serie pueden registrarse como equipos',
      );
    }

    const existing = await this.prisma.equipo.findUnique({
      where: { numeroSerie: dto.numeroSerie },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un equipo con serie ${dto.numeroSerie}`,
      );
    }

    await this.validateAlmacen(dto.almacenId);

    const nextAlmacenId = this.isAsignadoFueraDeAlmacen(dto.estadoComercial)
      ? null
      : (dto.almacenId ?? null);

    const equipo = await this.prisma.$transaction(async (tx) => {
      const created = await tx.equipo.create({
        data: {
          ...dto,
          numeroSerie: dto.numeroSerie.trim(),
          codigoQr: dto.codigoQr?.trim() || `EQP:${dto.numeroSerie.trim()}`,
          almacenId: nextAlmacenId,
        },
        include: {
          producto: {
            select: PRODUCTO_EQUIPO_SELECT,
          },
          almacen: { select: { id: true, nombre: true } },
        },
      });

      await this.syncInventoryForEquipoChange(
        tx as unknown as PrismaService,
        null,
        {
          productoId: created.productoId,
          almacenId: created.almacenId,
          estadoComercial: created.estadoComercial,
          manejaInventario: producto.manejaInventario,
        },
        userId,
        created.numeroSerie,
      );

      return created;
    });

    this.logger.log(
      `Equipo creado: ${equipo.id} — Serie: ${equipo.numeroSerie}`,
    );
    return equipo;
  }

  async findAll(query: QueryEquipoDto) {
    const {
      page = 1,
      limit = 20,
      search,
      estado,
      estadoComercial,
      productoId,
      almacenId,
      clienteId,
      sinGarantia,
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (estado) where.estado = estado;
    if (estadoComercial) where.estadoComercial = estadoComercial;
    if (productoId) where.productoId = productoId;
    if (almacenId) where.almacenId = almacenId;
    if (clienteId) {
      where.equipoClientes = {
        some: { clienteId, fechaFin: null },
      };
    }
    if (sinGarantia) {
      where.garantias = { none: {} };
    }
    if (search) {
      where.OR = [
        { numeroSerie: { contains: search, mode: 'insensitive' } },
        { ubicacion: { contains: search, mode: 'insensitive' } },
        { producto: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [equipos, total] = await Promise.all([
      this.prisma.equipo.findMany({
        where,
        skip,
        take: limit,
        include: {
          producto: {
            select: PRODUCTO_EQUIPO_SELECT,
          },
          almacen: { select: { id: true, nombre: true } },
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
                },
              },
              venta: {
                select: {
                  id: true,
                  numero: true,
                  estado: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.equipo.count({ where }),
    ]);

    const data = equipos.map(({ equipoClientes, ...equipo }) => {
      const asignacionActual = equipoClientes[0];

      return {
        ...equipo,
        clienteActual: asignacionActual?.cliente
          ? {
              ...asignacionActual.cliente,
              ventaId: asignacionActual.ventaId,
              venta: asignacionActual.venta,
            }
          : null,
      };
    });

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findBySerie(numeroSerie: string) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { numeroSerie },
      include: {
        producto: {
          select: PRODUCTO_EQUIPO_SELECT,
        },
        almacen: { select: { id: true, nombre: true } },
        equipoClientes: {
          orderBy: { fechaInicio: 'desc' },
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
        garantias: {
          orderBy: { fechaInicio: 'desc' },
          select: {
            id: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            codigoQR: true,
          },
        },
      },
    });
    if (!equipo) {
      throw new NotFoundException(
        `Equipo con serie ${numeroSerie} no encontrado`,
      );
    }
    return equipo;
  }

  async update(numeroSerie: string, dto: UpdateEquipoDto, userId: string) {
    const current = await this.prisma.equipo.findUnique({
      where: { numeroSerie },
      include: {
        producto: {
          select: {
            id: true,
            manejaInventario: true,
          },
        },
      },
    });
    if (!current) {
      throw new NotFoundException(
        `Equipo con serie ${numeroSerie} no encontrado`,
      );
    }

    if (dto.numeroSerie && dto.numeroSerie !== numeroSerie) {
      const existing = await this.prisma.equipo.findUnique({
        where: { numeroSerie: dto.numeroSerie },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un equipo con serie ${dto.numeroSerie}`,
        );
      }
    }

    let nextProductoMeta = current.producto;
    if (dto.productoId) {
      const producto = await this.prisma.producto.findFirst({
        where: { id: dto.productoId, deletedAt: null },
        select: {
          id: true,
          tipo: true,
          tieneNumeroSerie: true,
          manejaInventario: true,
        },
      });
      if (!producto) {
        throw new NotFoundException(`Producto ${dto.productoId} no encontrado`);
      }
      if (
        !producto.tieneNumeroSerie &&
        (producto.tipo as TipoProducto) !== TipoProducto.EQUIPO
      ) {
        throw new BadRequestException(
          'Solo productos tipo equipo o con número de serie pueden asociarse a equipos',
        );
      }
      nextProductoMeta = producto;
    }

    await this.validateAlmacen(dto.almacenId);

    const { codigoQr, numeroSerie: nextNumeroSerie, almacenId, ...rest } = dto;
    const nextEstadoComercial = dto.estadoComercial ?? current.estadoComercial;
    const nextAlmacenId = this.isAsignadoFueraDeAlmacen(nextEstadoComercial)
      ? null
      : almacenId !== undefined
        ? (almacenId ?? null)
        : (current.almacenId ?? null);

    const data: Record<string, unknown> = {
      ...rest,
      ...(nextNumeroSerie !== undefined
        ? { numeroSerie: nextNumeroSerie.trim() }
        : {}),
      ...(codigoQr !== undefined ? { codigoQr: codigoQr?.trim() || null } : {}),
      ...(almacenId !== undefined || dto.estadoComercial !== undefined
        ? { almacenId: nextAlmacenId }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.equipo.update({
        where: { numeroSerie },
        data,
        include: {
          producto: {
            select: PRODUCTO_EQUIPO_SELECT,
          },
          almacen: { select: { id: true, nombre: true } },
        },
      });

      await this.syncInventoryForEquipoChange(
        tx as unknown as PrismaService,
        {
          productoId: current.productoId,
          almacenId: current.almacenId,
          estadoComercial: current.estadoComercial,
          manejaInventario: current.producto.manejaInventario,
        },
        {
          productoId: updated.productoId,
          almacenId: updated.almacenId,
          estadoComercial: updated.estadoComercial,
          manejaInventario: nextProductoMeta.manejaInventario,
        },
        userId,
        updated.numeroSerie,
      );

      return updated;
    });
  }

  // ═══════════════════════════════════════════
  //  ASIGNACIÓN EQUIPO ↔ CLIENTE
  // ═══════════════════════════════════════════

  async asignarCliente(
    numeroSerie: string,
    dto: AsignarClienteDto,
    userId: string,
  ) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { numeroSerie },
      include: {
        producto: {
          select: {
            id: true,
            manejaInventario: true,
          },
        },
      },
    });
    if (!equipo) {
      throw new NotFoundException(
        `Equipo con serie ${numeroSerie} no encontrado`,
      );
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, deletedAt: null },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado`);
    }

    const nuevaAsignacion = await this.prisma.$transaction(async (tx) => {
      const asignacionActual = await tx.equipoCliente.findFirst({
        where: { equipoId: equipo.id, fechaFin: null },
      });

      if (asignacionActual) {
        await tx.equipoCliente.update({
          where: { id: asignacionActual.id },
          data: { fechaFin: new Date() },
        });
      }

      const createdAsignacion = await tx.equipoCliente.create({
        data: {
          equipoId: equipo.id,
          clienteId: dto.clienteId,
          ventaId: dto.ventaId ?? null,
          notas: dto.notas ?? null,
        },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              razonSocial: true,
            },
          },
        },
      });

      const nextEstadoComercial = dto.ventaId
        ? EstadoComercialEquipo.VENDIDO
        : EstadoComercialEquipo.ALQUILADO;

      await tx.equipo.update({
        where: { id: equipo.id },
        data: {
          estadoComercial: nextEstadoComercial,
          almacenId: null,
        },
      });

      await this.syncInventoryForEquipoChange(
        tx as unknown as PrismaService,
        {
          productoId: equipo.productoId,
          almacenId: equipo.almacenId,
          estadoComercial: equipo.estadoComercial,
          manejaInventario: equipo.producto.manejaInventario,
        },
        {
          productoId: equipo.productoId,
          almacenId: null,
          estadoComercial: nextEstadoComercial,
          manejaInventario: equipo.producto.manejaInventario,
        },
        userId,
        numeroSerie,
      );

      return createdAsignacion;
    });

    this.logger.log(
      `Equipo ${numeroSerie} asignado a cliente ${dto.clienteId}`,
    );
    return nuevaAsignacion;
  }

  async findHistorial(numeroSerie: string) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { numeroSerie },
    });
    if (!equipo) {
      throw new NotFoundException(
        `Equipo con serie ${numeroSerie} no encontrado`,
      );
    }

    const [asignaciones, lecturas, garantias] = await Promise.all([
      this.prisma.equipoCliente.findMany({
        where: { equipoId: equipo.id },
        orderBy: { fechaInicio: 'desc' },
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
      }),
      this.prisma.lecturaSNMP.findMany({
        where: { equipoId: equipo.id },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
      this.prisma.garantia.findMany({
        where: { equipoId: equipo.id },
        orderBy: { fechaInicio: 'desc' },
        select: {
          id: true,
          estado: true,
          fechaInicio: true,
          fechaFin: true,
          cobertura: true,
        },
      }),
    ]);

    type Evento = {
      id: string;
      tipo:
        | 'CREACION'
        | 'ASIGNACION_INICIO'
        | 'ASIGNACION_FIN'
        | 'GARANTIA'
        | 'LECTURA_SNMP';
      timestamp: Date;
      titulo: string;
      descripcion?: string | null;
      cliente?: unknown;
      metadata?: Record<string, unknown> | null;
    };

    const eventos: Evento[] = [];

    eventos.push({
      id: `creacion-${equipo.id}`,
      tipo: 'CREACION',
      timestamp: equipo.createdAt,
      titulo: 'Equipo registrado',
      descripcion: `Serie ${equipo.numeroSerie} dado de alta en el sistema.`,
      metadata: {
        contadorInicial: equipo.contadorInicial,
        almacenId: equipo.almacenId,
      },
    });

    for (const a of asignaciones) {
      eventos.push({
        id: `asig-ini-${a.id}`,
        tipo: 'ASIGNACION_INICIO',
        timestamp: a.fechaInicio,
        titulo: 'Asignación a cliente',
        descripcion: a.notas ?? null,
        cliente: a.cliente,
        metadata: { ventaId: a.ventaId },
      });
      if (a.fechaFin) {
        eventos.push({
          id: `asig-fin-${a.id}`,
          tipo: 'ASIGNACION_FIN',
          timestamp: a.fechaFin,
          titulo: 'Fin de asignación',
          descripcion: null,
          cliente: a.cliente,
          metadata: null,
        });
      }
    }

    for (const g of garantias) {
      eventos.push({
        id: `gar-${g.id}`,
        tipo: 'GARANTIA',
        timestamp: g.fechaInicio,
        titulo: `Garantía ${g.estado}`,
        descripcion: g.cobertura,
        metadata: { fechaFin: g.fechaFin, estado: g.estado },
      });
    }

    for (const l of lecturas) {
      const partes: string[] = [];
      if (l.paginasTotales != null)
        partes.push(`${l.paginasTotales.toLocaleString()} págs`);
      if (l.nivelTonerNegro != null)
        partes.push(`Tóner K ${l.nivelTonerNegro}%`);
      if (l.estadoFusor) partes.push(`Fusor ${l.estadoFusor}`);
      if (l.erroresActivos.length > 0)
        partes.push(`${l.erroresActivos.length} errores`);
      eventos.push({
        id: `snmp-${l.id}`,
        tipo: 'LECTURA_SNMP',
        timestamp: l.timestamp,
        titulo: 'Lectura SNMP',
        descripcion: partes.join(' · ') || 'Lectura registrada',
        metadata: {
          paginasTotales: l.paginasTotales,
          nivelTonerNegro: l.nivelTonerNegro,
          nivelTonerCian: l.nivelTonerCian,
          nivelTonerMagenta: l.nivelTonerMagenta,
          nivelTonerAmarillo: l.nivelTonerAmarillo,
          estadoFusor: l.estadoFusor,
          erroresActivos: l.erroresActivos,
        },
      });
    }

    return eventos.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  // ═══════════════════════════════════════════
  //  LECTURAS SNMP
  // ═══════════════════════════════════════════

  async createLecturaSNMP(numeroSerie: string, dto: CreateLecturaSNMPDto) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { numeroSerie },
    });
    if (!equipo) {
      throw new NotFoundException(
        `Equipo con serie ${numeroSerie} no encontrado`,
      );
    }

    const lectura = await this.prisma.lecturaSNMP.create({
      data: {
        equipoId: equipo.id,
        ...dto,
      },
    });

    this.logger.log(
      `Lectura SNMP registrada para equipo ${numeroSerie}: ${lectura.id}`,
    );
    return lectura;
  }

  async findLecturasSNMP(numeroSerie: string, query: QueryLecturaSNMPDto) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { numeroSerie },
    });
    if (!equipo) {
      throw new NotFoundException(
        `Equipo con serie ${numeroSerie} no encontrado`,
      );
    }

    const { page = 1, limit = 20, desde, hasta } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { equipoId: equipo.id };

    if (desde || hasta) {
      const timestamp: Record<string, unknown> = {};
      if (desde) timestamp.gte = new Date(desde);
      if (hasta) timestamp.lte = new Date(hasta);
      where.timestamp = timestamp;
    }

    const [lecturas, total] = await Promise.all([
      this.prisma.lecturaSNMP.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.lecturaSNMP.count({ where }),
    ]);

    return {
      data: lecturas,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async syncLecturaSNMP(numeroSerie: string) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { numeroSerie },
    });
    if (!equipo) {
      throw new NotFoundException(
        `Equipo con serie ${numeroSerie} no encontrado`,
      );
    }
    if (!equipo.ipAddress) {
      throw new BadRequestException(
        'El equipo no tiene IP configurada para SNMP',
      );
    }

    const reading = await this.snmpService.fetchReading(
      equipo.ipAddress,
      equipo.snmpCommunity ?? 'public',
      equipo.snmpPort ?? 161,
    );

    const lectura = await this.prisma.lecturaSNMP.create({
      data: {
        equipoId: equipo.id,
        paginasTotales: reading.paginasTotales,
        nivelTonerNegro: reading.nivelTonerNegro,
        nivelTonerCian: reading.nivelTonerCian,
        nivelTonerMagenta: reading.nivelTonerMagenta,
        nivelTonerAmarillo: reading.nivelTonerAmarillo,
        estadoFusor: reading.estadoFusor,
        erroresActivos: reading.erroresActivos,
        rawData: reading.rawData as object,
      },
    });

    if (typeof reading.paginasTotales === 'number') {
      await this.prisma.equipo.update({
        where: { id: equipo.id },
        data: { contadorActual: reading.paginasTotales },
      });
    }

    this.logger.log(
      `Lectura SNMP automática para ${numeroSerie}: ${lectura.id}`,
    );
    return lectura;
  }
}
