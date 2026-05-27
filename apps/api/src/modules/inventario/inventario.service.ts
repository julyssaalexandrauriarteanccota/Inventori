import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as path from 'path';
import {
  RolUsuario,
  SocketEvents,
  StockAlertaPayload,
  TipoMovimiento,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from '../../websockets/events.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateAlmacenDto,
  UpdateAlmacenDto,
  CreateMovimientoDto,
  QueryMovimientoDto,
  QueryStockDto,
} from './dto';

const TIPOS_MOVIMIENTO_AUTOMATICOS = new Set<string>([
  TipoMovimiento.COMPRA_RECIBIDA,
  TipoMovimiento.VENTA,
  TipoMovimiento.CONSUMO_SOPORTE,
  TipoMovimiento.DEVOLUCION_CLIENTE,
  TipoMovimiento.DEVOLUCION_PROVEEDOR,
]);

const TIPOS_MOVIMIENTO_AUTOMATICOS_HINTS: Record<string, string> = {
  [TipoMovimiento.COMPRA_RECIBIDA]:
    'Las entradas por compra se generan automáticamente al recibir una orden de compra.',
  [TipoMovimiento.VENTA]:
    'Las salidas por venta se generan automáticamente al confirmar una venta.',
  [TipoMovimiento.CONSUMO_SOPORTE]:
    'El consumo de repuestos se registra desde el módulo de Soporte al cerrar el ticket.',
  [TipoMovimiento.DEVOLUCION_CLIENTE]:
    'Las devoluciones de cliente se generan automáticamente al anular una venta.',
  [TipoMovimiento.DEVOLUCION_PROVEEDOR]:
    'Las devoluciones a proveedor se generan automáticamente al anular una compra.',
};

type StockForAlerta = {
  cantidad: number;
  producto?: {
    nombre: string;
    sku: string;
  } | null;
  almacen?: {
    nombre: string;
  } | null;
};

type StockConMinimo = {
  cantidad: number;
  producto: {
    stockMinimo: number;
  };
};

type AlmacenPrincipal = {
  id: string;
  nombre: string;
  esPrincipal: boolean;
  activo: boolean;
  deletedAt: Date | null;
};

type AlertaForPayload = {
  id: string;
};

type InventarioAlertaTx = {
  almacenStock: {
    findUnique(args: unknown): Promise<StockForAlerta | null>;
  };
  alertaStock: {
    findFirst(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<AlertaForPayload>;
  };
};

@Injectable()
export class InventarioService {
  private readonly logger = new Logger(InventarioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly events: EventsService,
  ) {}

  // ═══════════════════════════════════════════
  //  ALMACENES
  // ═══════════════════════════════════════════

  async ensurePrincipalAlmacen(): Promise<AlmacenPrincipal> {
    const principal = await this.prisma.almacen.findFirst({
      where: { esPrincipal: true, activo: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (principal) return principal;

    const firstActive = await this.prisma.almacen.findFirst({
      where: { activo: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    if (firstActive) {
      await this.prisma.almacen.updateMany({
        where: { esPrincipal: true, deletedAt: null },
        data: { esPrincipal: false },
      });

      const promoted = await this.prisma.almacen.update({
        where: { id: firstActive.id },
        data: { esPrincipal: true, activo: true },
      });
      this.logger.warn(
        `Almacén ${promoted.id} promovido como principal automáticamente`,
      );
      return promoted;
    }

    const created = await this.prisma.almacen.create({
      data: {
        nombre: 'Almacén Principal',
        descripcion: 'Almacén principal del sistema',
        esPrincipal: true,
        activo: true,
      },
    });
    this.logger.warn(`Almacén principal creado automáticamente: ${created.id}`);
    return created;
  }

  async createAlmacen(dto: CreateAlmacenDto) {
    const existing = await this.prisma.almacen.findFirst({
      where: { nombre: dto.nombre, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Ya existe un almacén con este nombre');
    }

    const existingPrincipal = await this.prisma.almacen.findFirst({
      where: { esPrincipal: true, activo: true, deletedAt: null },
      select: { id: true },
    });
    const shouldBePrincipal = dto.esPrincipal === true || !existingPrincipal;

    // Si se marca como principal, desmarcar el anterior
    if (shouldBePrincipal) {
      await this.prisma.almacen.updateMany({
        where: { esPrincipal: true, deletedAt: null },
        data: { esPrincipal: false },
      });
    }

    const almacen = await this.prisma.almacen.create({
      data: {
        ...dto,
        esPrincipal: shouldBePrincipal,
        activo: shouldBePrincipal ? true : (dto.activo ?? true),
      },
    });
    this.logger.log(`Almacén creado: ${almacen.id}`);
    return almacen;
  }

  async findAllAlmacenes() {
    await this.ensurePrincipalAlmacen();
    return this.prisma.almacen.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOneAlmacen(id: string) {
    const almacen = await this.prisma.almacen.findFirst({
      where: { id, deletedAt: null },
    });
    if (!almacen) {
      throw new NotFoundException(`Almacén ${id} no encontrado`);
    }
    return almacen;
  }

  async updateAlmacen(id: string, dto: UpdateAlmacenDto) {
    const current = await this.findOneAlmacen(id);

    if (dto.nombre) {
      const existing = await this.prisma.almacen.findFirst({
        where: { nombre: dto.nombre, deletedAt: null, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un almacén con este nombre');
      }
    }

    if (current.esPrincipal && dto.esPrincipal === false) {
      throw new BadRequestException(
        'El almacén principal no puede desmarcarse directamente. Marca otro almacén como principal primero.',
      );
    }

    if (current.esPrincipal && dto.activo === false) {
      throw new BadRequestException(
        'El almacén principal debe permanecer activo. Marca otro almacén como principal antes de desactivarlo.',
      );
    }

    if (dto.esPrincipal) {
      await this.prisma.almacen.updateMany({
        where: { esPrincipal: true, deletedAt: null, id: { not: id } },
        data: { esPrincipal: false },
      });
    }

    const almacen = await this.prisma.almacen.update({
      where: { id },
      data: {
        ...dto,
        activo: dto.esPrincipal ? true : dto.activo,
      },
    });
    this.logger.log(`Almacén actualizado: ${id}`);
    return almacen;
  }

  async removeAlmacen(id: string) {
    const almacen = await this.findOneAlmacen(id);

    if (almacen.esPrincipal) {
      throw new BadRequestException(
        'No se puede eliminar el almacén principal. Marca otro almacén como principal antes de eliminar este.',
      );
    }

    const stockCount = await this.prisma.almacenStock.count({
      where: { almacenId: id, cantidad: { gt: 0 } },
    });
    if (stockCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar un almacén con stock. Transfiera los productos primero.',
      );
    }

    await this.prisma.almacen.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false, esPrincipal: false },
    });
    this.logger.log(`Almacén eliminado (soft delete): ${id}`);
  }

  // ═══════════════════════════════════════════
  //  STOCK
  // ═══════════════════════════════════════════

  async findStock(query: QueryStockDto) {
    const {
      page = 1,
      limit = 20,
      almacenId,
      productoId,
      search,
      stockBajo,
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (almacenId) where.almacenId = almacenId;
    if (productoId) where.productoId = productoId;
    const productoWhere: Record<string, unknown> = {
      deletedAt: null,
      manejaInventario: true,
    };
    where.almacen = { deletedAt: null };
    where.producto = productoWhere;

    if (search) {
      where.producto = {
        ...productoWhere,
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const baseQuery = {
      where,
      include: {
        producto: {
          select: {
            id: true,
            sku: true,
            nombre: true,
            stockMinimo: true,
            unidadMedida: { select: { id: true, codigo: true, nombre: true } },
          },
        },
        almacen: { select: { id: true, nombre: true } },
      },
      orderBy: { producto: { nombre: 'asc' as const } },
    };

    if (stockBajo) {
      const stocks = await this.prisma.almacenStock.findMany(baseQuery);
      const filtered = stocks.filter(
        (stock: StockConMinimo) => stock.cantidad <= stock.producto.stockMinimo,
      );

      return {
        data: filtered.slice(skip, skip + limit),
        meta: {
          total: filtered.length,
          page,
          limit,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const [stocks, total] = await Promise.all([
      this.prisma.almacenStock.findMany({
        ...baseQuery,
        skip,
        take: limit,
      }),
      this.prisma.almacenStock.count({ where }),
    ]);

    return {
      data: stocks,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findStockByProducto(productoId: string) {
    const producto = await this.prisma.producto.findFirst({
      where: { id: productoId, deletedAt: null },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${productoId} no encontrado`);
    }
    if (!producto.manejaInventario || String(producto.tipo) === 'SERVICIO') {
      throw new BadRequestException(
        'Este producto no maneja inventario de stock',
      );
    }

    return this.prisma.almacenStock.findMany({
      where: { productoId, almacen: { deletedAt: null } },
      include: {
        almacen: { select: { id: true, nombre: true } },
      },
    });
  }

  // ═══════════════════════════════════════════
  //  MOVIMIENTOS DE STOCK
  // ═══════════════════════════════════════════

  async createMovimiento(
    dto: CreateMovimientoDto,
    userId: string,
    userRol: RolUsuario,
  ) {
    const tipoConfig = await this.prisma.tipoMovimientoConfig.findFirst({
      where: { codigo: dto.tipo, activo: true },
    });

    if (!tipoConfig) {
      throw new NotFoundException(
        `Tipo de movimiento ${dto.tipo} no encontrado o inactivo`,
      );
    }

    if (TIPOS_MOVIMIENTO_AUTOMATICOS.has(dto.tipo)) {
      throw new BadRequestException(
        TIPOS_MOVIMIENTO_AUTOMATICOS_HINTS[dto.tipo] ??
          'Este tipo de movimiento se genera automáticamente desde su módulo correspondiente.',
      );
    }

    if (dto.tipo === 'TRANSFERENCIA') {
      const almacenesActivos = await this.prisma.almacen.count({
        where: { activo: true, deletedAt: null },
      });
      if (almacenesActivos < 2) {
        throw new BadRequestException(
          'Necesitas al menos 2 almacenes activos para registrar una transferencia.',
        );
      }
    }

    if (userRol === RolUsuario.TECNICO && !tipoConfig.disponibleTecnico) {
      throw new ForbiddenException(
        'Este tipo de movimiento no está disponible para técnicos',
      );
    }

    // Validar producto existe
    const producto = await this.prisma.producto.findFirst({
      where: { id: dto.productoId, deletedAt: null, activo: true },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${dto.productoId} no encontrado`);
    }
    const productoTipo = String(producto.tipo);
    if (!producto.manejaInventario || productoTipo === 'SERVICIO') {
      throw new BadRequestException(
        'Este producto no maneja inventario de stock',
      );
    }
    if (productoTipo === 'EQUIPO' || producto.tieneNumeroSerie) {
      throw new BadRequestException(
        'Los equipos y productos serializados se gestionan desde el módulo de Equipos',
      );
    }

    this.validateAlmacenesPorComportamiento(dto, tipoConfig.comportamiento);

    if (tipoConfig.requiereJustificacion && !dto.justificacion?.trim()) {
      throw new BadRequestException(
        'La justificación es obligatoria para este tipo de movimiento',
      );
    }

    if (tipoConfig.requiereEvidencia) {
      this.validateEvidence(dto.evidenciaFilename);
    }

    // Ejecutar movimiento en transacción
    return this.prisma.$transaction(async (tx) => {
      let cantidadAnterior = 0;
      let cantidadPosterior = 0;

      // Operaciones de SALIDA (decrementar stock en almacén origen)
      if (this.esMovimientoSalida(tipoConfig.comportamiento)) {
        if (!dto.almacenOrigenId) {
          throw new BadRequestException(
            'Almacén de origen requerido para este tipo de movimiento',
          );
        }

        await this.findOneAlmacen(dto.almacenOrigenId);

        const stockOrigen = await tx.almacenStock.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: dto.almacenOrigenId,
              productoId: dto.productoId,
            },
          },
        });

        cantidadAnterior = stockOrigen?.cantidad ?? 0;

        if (cantidadAnterior < dto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${cantidadAnterior}, solicitado: ${dto.cantidad}`,
          );
        }

        cantidadPosterior = cantidadAnterior - dto.cantidad;

        await tx.almacenStock.upsert({
          where: {
            almacenId_productoId: {
              almacenId: dto.almacenOrigenId,
              productoId: dto.productoId,
            },
          },
          update: { cantidad: cantidadPosterior },
          create: {
            almacenId: dto.almacenOrigenId,
            productoId: dto.productoId,
            cantidad: cantidadPosterior,
          },
        });
      }

      // Operaciones de ENTRADA (incrementar stock en almacén destino)
      if (this.esMovimientoEntrada(tipoConfig.comportamiento)) {
        if (!dto.almacenDestinoId) {
          throw new BadRequestException(
            'Almacén de destino requerido para este tipo de movimiento',
          );
        }

        await this.findOneAlmacen(dto.almacenDestinoId);

        const stockDestino = await tx.almacenStock.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: dto.almacenDestinoId,
              productoId: dto.productoId,
            },
          },
        });

        if (!this.esMovimientoSalida(tipoConfig.comportamiento)) {
          cantidadAnterior = stockDestino?.cantidad ?? 0;
        }

        const cantidadDestinoAnterior = stockDestino?.cantidad ?? 0;
        const cantidadDestinoNueva = cantidadDestinoAnterior + dto.cantidad;

        if (!this.esMovimientoSalida(tipoConfig.comportamiento)) {
          cantidadPosterior = cantidadDestinoNueva;
        }

        await tx.almacenStock.upsert({
          where: {
            almacenId_productoId: {
              almacenId: dto.almacenDestinoId,
              productoId: dto.productoId,
            },
          },
          update: { cantidad: cantidadDestinoNueva },
          create: {
            almacenId: dto.almacenDestinoId,
            productoId: dto.productoId,
            cantidad: cantidadDestinoNueva,
          },
        });
      }

      // Crear registro del movimiento
      const movimiento = await tx.movimientoStock.create({
        data: {
          tipo: dto.tipo,
          productoId: dto.productoId,
          almacenOrigenId: dto.almacenOrigenId ?? null,
          almacenDestinoId: dto.almacenDestinoId ?? null,
          cantidad: dto.cantidad,
          cantidadAnterior,
          cantidadPosterior,
          referenciaId: dto.referenciaId ?? null,
          referenciaTipo: dto.referenciaTipo ?? null,
          justificacion: dto.justificacion ?? null,
          usuarioId: userId,
        },
        include: {
          producto: {
            select: { id: true, sku: true, nombre: true, stockMinimo: true },
          },
        },
      });

      if (tipoConfig.requiereEvidencia && dto.evidenciaFilename) {
        await tx.adjunto.create({
          data: {
            entidad: 'MOVIMIENTO_STOCK',
            entidadId: movimiento.id,
            url: `uploads/${dto.evidenciaFilename}`,
            nombre: dto.evidenciaFilename,
            tipo: 'MOVIMIENTO_STOCK_EVIDENCIA',
          },
        });
      }

      // Verificar alertas de stock mínimo en los almacenes afectados.
      const almacenesAfectados = new Set<string>();
      if (this.esMovimientoSalida(tipoConfig.comportamiento)) {
        if (dto.almacenOrigenId) almacenesAfectados.add(dto.almacenOrigenId);
      }
      if (this.esMovimientoEntrada(tipoConfig.comportamiento)) {
        if (dto.almacenDestinoId) almacenesAfectados.add(dto.almacenDestinoId);
      }
      for (const almacenId of almacenesAfectados) {
        await this.checkAndCreateAlerta(
          tx,
          dto.productoId,
          almacenId,
          producto.stockMinimo,
        );
      }

      this.logger.log(
        `Movimiento ${dto.tipo} registrado: ${movimiento.id} — Producto: ${dto.productoId}, Cantidad: ${dto.cantidad}`,
      );

      return movimiento;
    });
  }

  async findMovimientos(query: QueryMovimientoDto) {
    const { page = 1, limit = 20, tipo, productoId, almacenId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (tipo) where.tipo = tipo;
    if (productoId) where.productoId = productoId;
    if (almacenId) {
      where.OR = [
        { almacenOrigenId: almacenId },
        { almacenDestinoId: almacenId },
      ];
    }

    const [movimientos, total] = await Promise.all([
      this.prisma.movimientoStock.findMany({
        where,
        skip,
        take: limit,
        include: {
          producto: { select: { id: true, sku: true, nombre: true } },
          almacenOrigen: { select: { id: true, nombre: true } },
          almacenDestino: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.movimientoStock.count({ where }),
    ]);

    return {
      data: movimientos,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  // ═══════════════════════════════════════════
  //  ALERTAS DE STOCK
  // ═══════════════════════════════════════════

  async findAlertas(resuelta?: boolean) {
    const where: Record<string, unknown> = {};
    if (resuelta !== undefined) {
      where.resuelta = resuelta;
    }

    return this.prisma.alertaStock.findMany({
      where,
      include: {
        producto: { select: { id: true, sku: true, nombre: true } },
        almacen: { select: { id: true, nombre: true } },
        resueltaPor: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveAlerta(alertaId: string, userId: string) {
    const alerta = await this.prisma.alertaStock.findUnique({
      where: { id: alertaId },
    });
    if (!alerta) {
      throw new NotFoundException(`Alerta ${alertaId} no encontrada`);
    }
    if (alerta.resuelta) {
      throw new BadRequestException('Esta alerta ya fue resuelta');
    }

    return this.prisma.alertaStock.update({
      where: { id: alertaId },
      data: {
        resuelta: true,
        resueltaPorId: userId,
        resolvedAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════
  //  HELPERS PRIVADOS
  // ═══════════════════════════════════════════

  private esMovimientoSalida(comportamiento: string): boolean {
    return ['SALIDA', 'TRANSFERENCIA'].includes(comportamiento);
  }

  private esMovimientoEntrada(comportamiento: string): boolean {
    return ['ENTRADA', 'TRANSFERENCIA'].includes(comportamiento);
  }

  private validateAlmacenesPorComportamiento(
    dto: CreateMovimientoDto,
    comportamiento: string,
  ) {
    if (comportamiento === 'TRANSFERENCIA') {
      if (!dto.almacenOrigenId || !dto.almacenDestinoId) {
        throw new BadRequestException(
          'Transferencia requiere almacén de origen y destino',
        );
      }
      if (dto.almacenOrigenId === dto.almacenDestinoId) {
        throw new BadRequestException(
          'El almacén de origen y destino no pueden ser el mismo',
        );
      }
    }

    if (
      this.esMovimientoSalida(comportamiento) &&
      comportamiento !== 'TRANSFERENCIA' &&
      !dto.almacenOrigenId
    ) {
      throw new BadRequestException(
        'Este movimiento requiere almacén de origen',
      );
    }

    if (
      this.esMovimientoEntrada(comportamiento) &&
      comportamiento !== 'TRANSFERENCIA' &&
      !dto.almacenDestinoId
    ) {
      throw new BadRequestException(
        'Este movimiento requiere almacén de destino',
      );
    }
  }

  private validateEvidence(filename?: string) {
    if (!filename?.trim()) {
      throw new BadRequestException(
        'Este movimiento requiere evidencia fotográfica subida previamente',
      );
    }

    const extension = path.extname(filename).toLowerCase();
    const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    if (!allowedImageExtensions.includes(extension)) {
      throw new BadRequestException(
        'La evidencia debe ser una imagen válida (jpg, jpeg, png o webp)',
      );
    }

    this.uploadsService.getFilePath(filename);
  }

  private async checkAndCreateAlerta(
    tx: InventarioAlertaTx,
    productoId: string,
    almacenId: string | undefined,
    stockMinimo: number,
  ) {
    if (!almacenId || stockMinimo <= 0) return;

    const stock = await tx.almacenStock.findUnique({
      where: {
        almacenId_productoId: { almacenId, productoId },
      },
      include: {
        producto: { select: { nombre: true, sku: true } },
        almacen: { select: { nombre: true } },
      },
    });

    if (stock && stock.cantidad <= stockMinimo) {
      const alertaExistente = await tx.alertaStock.findFirst({
        where: {
          productoId,
          almacenId,
          resuelta: false,
        },
      });

      if (!alertaExistente) {
        const alerta = await tx.alertaStock.create({
          data: {
            productoId,
            almacenId,
            stockActual: stock.cantidad,
            stockMinimo,
          },
        });

        this.logger.warn(
          `ALERTA: Stock bajo mínimo — Producto: ${productoId}, Almacén: ${almacenId}, Stock: ${stock.cantidad}/${stockMinimo}`,
        );

        // Emit real-time alert
        const payload: StockAlertaPayload = {
          alertaId: alerta.id,
          productoId,
          productoNombre: stock.producto?.nombre ?? productoId,
          productoSku: stock.producto?.sku ?? '',
          almacenId,
          almacenNombre: stock.almacen?.nombre ?? almacenId,
          stockActual: stock.cantidad,
          stockMinimo,
        };
        this.events.emitToRoles(
          [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
          SocketEvents.STOCK_ALERTA,
          payload,
        );
      }
    }
  }
}
