import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EstadoOrdenCompra, TipoMovimiento } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateOrdenCompraDto,
  UpdateOrdenCompraDto,
  QueryOrdenCompraDto,
  CreateRecepcionDto,
  CreateCompraDirectaDto,
} from './dto';

@Injectable()
export class ComprasService {
  private readonly logger = new Logger(ComprasService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async validateOrdenDetalles(
    detalles: CreateOrdenCompraDto['detalles'],
  ) {
    const productoIds = detalles.map((detalle) => detalle.productoId);
    const uniqueProductoIds = new Set(productoIds);

    if (uniqueProductoIds.size !== productoIds.length) {
      throw new BadRequestException(
        'Una orden de compra no puede repetir el mismo producto en múltiples detalles',
      );
    }

    const productos = await this.prisma.producto.findMany({
      where: { id: { in: productoIds }, deletedAt: null },
    });

    if (productos.length !== productoIds.length) {
      const encontrados = new Set(productos.map((producto) => producto.id));
      const faltantes = productoIds.filter((id) => !encontrados.has(id));
      throw new NotFoundException(
        `Productos no encontrados: ${faltantes.join(', ')}`,
      );
    }
  }

  private buildTotales(detalles: CreateOrdenCompraDto['detalles']) {
    const detallesConSubtotal = detalles.map((detalle) => ({
      productoId: detalle.productoId,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precioUnitario,
      subtotal: +(detalle.precioUnitario * detalle.cantidad).toFixed(2),
    }));

    const subtotal = +detallesConSubtotal
      .reduce((acc, detalle) => acc + detalle.subtotal, 0)
      .toFixed(2);
    const igv = +(subtotal * 0.18).toFixed(2);
    const total = +(subtotal + igv).toFixed(2);

    return { detallesConSubtotal, subtotal, igv, total };
  }

  // ═══════════════════════════════════════════
  //  ÓRDENES DE COMPRA
  // ═══════════════════════════════════════════

  async create(dto: CreateOrdenCompraDto, userId: string) {
    // Validar proveedor
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id: dto.proveedorId, deletedAt: null },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor ${dto.proveedorId} no encontrado`);
    }

    await this.validateOrdenDetalles(dto.detalles);

    const { detallesConSubtotal, subtotal, igv, total } = this.buildTotales(
      dto.detalles,
    );

    // Generar número de OC
    const numero = await this.generateNumeroOC();

    const orden = await this.prisma.ordenCompra.create({
      data: {
        numero,
        proveedorId: dto.proveedorId,
        usuarioId: userId,
        subtotal,
        igv,
        total,
        notas: dto.notas,
        fechaEsperada: dto.fechaEsperada ? new Date(dto.fechaEsperada) : null,
        detalles: {
          create: detallesConSubtotal.map((d) => ({
            productoId: d.productoId,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            subtotal: d.subtotal,
          })),
        },
      },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, sku: true, nombre: true } },
          },
        },
        proveedor: { select: { id: true, razonSocial: true, ruc: true } },
      },
    });

    this.logger.log(`Orden de compra creada: ${orden.numero}`);
    return orden;
  }

  async findAll(query: QueryOrdenCompraDto) {
    const { page = 1, limit = 20, estado, proveedorId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (proveedorId) where.proveedorId = proveedorId;

    const [data, total] = await Promise.all([
      this.prisma.ordenCompra.findMany({
        where,
        include: {
          proveedor: { select: { id: true, razonSocial: true, ruc: true } },
          usuario: { select: { id: true, nombre: true, apellido: true } },
          _count: { select: { detalles: true, recepciones: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ordenCompra.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findOne(id: string) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        proveedor: { select: { id: true, razonSocial: true, ruc: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
        detalles: {
          include: {
            producto: { select: { id: true, sku: true, nombre: true } },
          },
        },
        recepciones: {
          include: {
            detalles: {
              include: {
                producto: { select: { id: true, sku: true, nombre: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    }

    return orden;
  }

  async update(id: string, dto: UpdateOrdenCompraDto) {
    const orden = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) {
      throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    }
    if ((orden.estado as EstadoOrdenCompra) !== EstadoOrdenCompra.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden editar órdenes en estado BORRADOR',
      );
    }

    if (dto.proveedorId) {
      const proveedor = await this.prisma.proveedor.findFirst({
        where: { id: dto.proveedorId, deletedAt: null },
      });
      if (!proveedor) {
        throw new NotFoundException(
          `Proveedor ${dto.proveedorId} no encontrado`,
        );
      }
    }

    let detallesData:
      | {
          deleteMany: Record<string, never>;
          create: Array<{
            productoId: string;
            cantidad: number;
            precioUnitario: number;
            subtotal: number;
          }>;
        }
      | undefined;
    let totalsData: { subtotal?: number; igv?: number; total?: number } = {};

    if (dto.detalles) {
      await this.validateOrdenDetalles(dto.detalles);
      const { detallesConSubtotal, subtotal, igv, total } = this.buildTotales(
        dto.detalles,
      );

      detallesData = {
        deleteMany: {},
        create: detallesConSubtotal,
      };

      totalsData = { subtotal, igv, total };
    }

    const updated = await this.prisma.ordenCompra.update({
      where: { id },
      data: {
        ...dto,
        fechaEsperada: dto.fechaEsperada
          ? new Date(dto.fechaEsperada)
          : undefined,
        ...totalsData,
        detalles: detallesData,
      },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, sku: true, nombre: true } },
          },
        },
      },
    });

    this.logger.log(`Orden de compra actualizada: ${updated.numero}`);
    return updated;
  }

  // ═══════════════════════════════════════════
  //  APROBACIÓN
  // ═══════════════════════════════════════════

  async aprobar(id: string) {
    const orden = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) {
      throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    }
    if ((orden.estado as EstadoOrdenCompra) !== EstadoOrdenCompra.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden aprobar órdenes en estado BORRADOR',
      );
    }

    const updated = await this.prisma.ordenCompra.update({
      where: { id },
      data: { estado: EstadoOrdenCompra.APROBADA },
    });

    this.logger.log(`Orden de compra aprobada: ${updated.numero}`);
    return updated;
  }

  // ═══════════════════════════════════════════
  //  RECEPCIONES
  // ═══════════════════════════════════════════

  async createRecepcion(
    ordenId: string,
    dto: CreateRecepcionDto,
    userId: string,
  ) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id: ordenId },
      include: { detalles: true },
    });
    if (!orden) {
      throw new NotFoundException(`Orden de compra ${ordenId} no encontrada`);
    }

    // Solo se recibe si está APROBADA, ENVIADA_PROVEEDOR o RECIBIDA_PARCIAL
    const estadosPermitidos = [
      EstadoOrdenCompra.APROBADA,
      EstadoOrdenCompra.ENVIADA_PROVEEDOR,
      EstadoOrdenCompra.RECIBIDA_PARCIAL,
    ];
    if (!estadosPermitidos.includes(orden.estado as EstadoOrdenCompra)) {
      throw new BadRequestException(
        `No se puede recibir mercadería en estado ${orden.estado}. Permitidos: ${estadosPermitidos.join(', ')}`,
      );
    }

    // Validar almacén destino
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: dto.almacenDestinoId, deletedAt: null, activo: true },
    });
    if (!almacen) {
      throw new NotFoundException(
        `Almacén ${dto.almacenDestinoId} no encontrado o inactivo`,
      );
    }

    // Validar que cada producto recibido pertenece a la OC y no excede lo pendiente
    for (const detRec of dto.detalles) {
      const detalleOC = orden.detalles.find(
        (d) => d.productoId === detRec.productoId,
      );
      if (!detalleOC) {
        throw new BadRequestException(
          `Producto ${detRec.productoId} no pertenece a esta orden de compra`,
        );
      }
      const pendiente = detalleOC.cantidad - detalleOC.cantidadRecibida;
      if (detRec.cantidadRecibida > pendiente) {
        throw new BadRequestException(
          `Producto ${detRec.productoId}: cantidad recibida (${detRec.cantidadRecibida}) excede lo pendiente (${pendiente})`,
        );
      }
    }

    // Ejecutar en transacción
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear recepción con detalles
      const recepcion = await tx.recepcionCompra.create({
        data: {
          ordenCompraId: ordenId,
          notas: dto.notas,
          detalles: {
            create: dto.detalles.map((d) => ({
              productoId: d.productoId,
              cantidadRecibida: d.cantidadRecibida,
            })),
          },
        },
        include: {
          detalles: {
            include: {
              producto: { select: { id: true, sku: true, nombre: true } },
            },
          },
        },
      });

      // 2. Actualizar cantidadRecibida en detalles de la OC
      for (const detRec of dto.detalles) {
        const detalleOC = orden.detalles.find(
          (d) => d.productoId === detRec.productoId,
        )!;
        await tx.detalleOrdenCompra.update({
          where: { id: detalleOC.id },
          data: {
            cantidadRecibida:
              detalleOC.cantidadRecibida + detRec.cantidadRecibida,
          },
        });
      }

      // 3. Crear MovimientoStock tipo COMPRA_RECIBIDA por cada producto
      for (const detRec of dto.detalles) {
        // Obtener stock actual para cantidadAnterior
        const stockActual = await tx.almacenStock.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: dto.almacenDestinoId,
              productoId: detRec.productoId,
            },
          },
        });
        const cantidadAnterior = stockActual?.cantidad ?? 0;
        const cantidadPosterior = cantidadAnterior + detRec.cantidadRecibida;

        // Incrementar stock
        await tx.almacenStock.upsert({
          where: {
            almacenId_productoId: {
              almacenId: dto.almacenDestinoId,
              productoId: detRec.productoId,
            },
          },
          update: { cantidad: cantidadPosterior },
          create: {
            almacenId: dto.almacenDestinoId,
            productoId: detRec.productoId,
            cantidad: cantidadPosterior,
          },
        });

        // Registrar movimiento
        await tx.movimientoStock.create({
          data: {
            tipo: TipoMovimiento.COMPRA_RECIBIDA,
            productoId: detRec.productoId,
            almacenDestinoId: dto.almacenDestinoId,
            cantidad: detRec.cantidadRecibida,
            cantidadAnterior,
            cantidadPosterior,
            referenciaId: recepcion.id,
            referenciaTipo: 'RECEPCION_COMPRA',
            usuarioId: userId,
          },
        });
      }

      // 4. Determinar nuevo estado de la OC
      const detallesActualizados = await tx.detalleOrdenCompra.findMany({
        where: { ordenCompraId: ordenId },
      });

      const todoRecibido = detallesActualizados.every(
        (d) => d.cantidadRecibida >= d.cantidad,
      );
      const nuevoEstado = todoRecibido
        ? EstadoOrdenCompra.RECIBIDA_TOTAL
        : EstadoOrdenCompra.RECIBIDA_PARCIAL;

      await tx.ordenCompra.update({
        where: { id: ordenId },
        data: { estado: nuevoEstado },
      });

      this.logger.log(
        `Recepción ${recepcion.id} registrada para OC ${orden.numero} — Estado: ${nuevoEstado}`,
      );

      return { ...recepcion, nuevoEstadoOC: nuevoEstado };
    });
  }

  // ═══════════════════════════════════════════
  //  CANCELAR OC
  // ═══════════════════════════════════════════

  async cancelar(id: string, userId?: string) {
    const orden = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) {
      throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    }

    const estadosNoCancelables = [
      EstadoOrdenCompra.RECIBIDA_TOTAL,
      EstadoOrdenCompra.CANCELADA,
    ];
    if (estadosNoCancelables.includes(orden.estado as EstadoOrdenCompra)) {
      throw new BadRequestException(
        `No se puede cancelar una orden en estado ${orden.estado}`,
      );
    }

    if (
      (orden.estado as EstadoOrdenCompra) === EstadoOrdenCompra.RECIBIDA_PARCIAL
    ) {
      return this.prisma.$transaction(async (tx) => {
        const recepciones = await tx.recepcionCompra.findMany({
          where: { ordenCompraId: id },
          select: { id: true },
        });
        const recepcionIds = recepciones.map((recepcion) => recepcion.id);

        if (recepcionIds.length > 0) {
          const movimientosRecepcion = await tx.movimientoStock.findMany({
            where: {
              tipo: TipoMovimiento.COMPRA_RECIBIDA,
              referenciaTipo: 'RECEPCION_COMPRA',
              referenciaId: { in: recepcionIds },
            },
            select: {
              productoId: true,
              almacenDestinoId: true,
              cantidad: true,
              costoUnitario: true,
            },
          });

          const usuarioId = userId ?? orden.usuarioId;
          for (const movimiento of movimientosRecepcion) {
            if (!movimiento.almacenDestinoId) {
              throw new BadRequestException(
                'No se puede revertir una recepción sin almacén destino',
              );
            }

            const stockActual = await tx.almacenStock.findUnique({
              where: {
                almacenId_productoId: {
                  almacenId: movimiento.almacenDestinoId,
                  productoId: movimiento.productoId,
                },
              },
            });
            const cantidadAnterior = stockActual?.cantidad ?? 0;
            if (cantidadAnterior < movimiento.cantidad) {
              throw new BadRequestException(
                'Stock insuficiente para revertir la recepción parcial de compra',
              );
            }
            const cantidadPosterior = cantidadAnterior - movimiento.cantidad;

            const decrementResult = await tx.almacenStock.updateMany({
              where: {
                almacenId: movimiento.almacenDestinoId,
                productoId: movimiento.productoId,
                cantidad: { gte: movimiento.cantidad },
              },
              data: { cantidad: { decrement: movimiento.cantidad } },
            });
            if (decrementResult.count === 0) {
              throw new BadRequestException(
                'Stock insuficiente para revertir la recepción parcial de compra',
              );
            }

            await tx.movimientoStock.create({
              data: {
                tipo: TipoMovimiento.DEVOLUCION_PROVEEDOR,
                productoId: movimiento.productoId,
                almacenOrigenId: movimiento.almacenDestinoId,
                cantidad: movimiento.cantidad,
                cantidadAnterior,
                cantidadPosterior,
                costoUnitario: movimiento.costoUnitario,
                referenciaId: id,
                referenciaTipo: 'ORDEN_COMPRA_CANCELADA',
                justificacion:
                  'Reverso por cancelación de orden parcialmente recibida',
                usuarioId,
              },
            });
          }
        }

        const updated = await tx.ordenCompra.update({
          where: { id },
          data: { estado: EstadoOrdenCompra.CANCELADA },
        });

        this.logger.log(
          `Orden de compra parcialmente recibida cancelada con reverso: ${updated.numero}`,
        );
        return updated;
      });
    }

    const updated = await this.prisma.ordenCompra.update({
      where: { id },
      data: { estado: EstadoOrdenCompra.CANCELADA },
    });

    this.logger.log(`Orden de compra cancelada: ${updated.numero}`);
    return updated;
  }

  // ═══════════════════════════════════════════
  //  ELIMINAR OC
  // ═══════════════════════════════════════════

  async remove(id: string) {
    const orden = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) {
      throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    }

    const estadosEliminables = [
      EstadoOrdenCompra.BORRADOR,
      EstadoOrdenCompra.CANCELADA,
    ];
    if (!estadosEliminables.includes(orden.estado as EstadoOrdenCompra)) {
      throw new BadRequestException(
        `Solo se pueden eliminar órdenes en estado BORRADOR o CANCELADA. Estado actual: ${orden.estado}`,
      );
    }

    await this.prisma.ordenCompra.delete({ where: { id } });
    this.logger.log(`Orden de compra eliminada: ${orden.numero}`);
    return { id, numero: orden.numero };
  }

  // ═══════════════════════════════════════════
  //  COMPRA DIRECTA (orden + recepción en un solo paso)
  // ═══════════════════════════════════════════

  async createDirecta(dto: CreateCompraDirectaDto, userId: string) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id: dto.proveedorId, deletedAt: null },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor ${dto.proveedorId} no encontrado`);
    }

    const almacen = await this.prisma.almacen.findFirst({
      where: { id: dto.almacenDestinoId, deletedAt: null, activo: true },
    });
    if (!almacen) {
      throw new NotFoundException(
        `Almacén ${dto.almacenDestinoId} no encontrado o inactivo`,
      );
    }

    await this.validateOrdenDetalles(dto.detalles);

    const { detallesConSubtotal, subtotal, igv, total } = this.buildTotales(
      dto.detalles,
    );

    const numero = await this.generateNumeroOC();

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear orden directamente como RECIBIDA_TOTAL
      const orden = await tx.ordenCompra.create({
        data: {
          numero,
          proveedorId: dto.proveedorId,
          usuarioId: userId,
          estado: EstadoOrdenCompra.RECIBIDA_TOTAL,
          subtotal,
          igv,
          total,
          notas: dto.notas,
          detalles: {
            create: detallesConSubtotal.map((d) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
              cantidadRecibida: d.cantidad,
            })),
          },
        },
        include: { detalles: true },
      });

      // 2. Crear recepción única con cantidades = ordenadas
      const recepcion = await tx.recepcionCompra.create({
        data: {
          ordenCompraId: orden.id,
          notas: dto.notas,
          detalles: {
            create: detallesConSubtotal.map((d) => ({
              productoId: d.productoId,
              cantidadRecibida: d.cantidad,
            })),
          },
        },
      });

      // 3. Movimientos + stock por cada producto
      for (const d of detallesConSubtotal) {
        const stockActual = await tx.almacenStock.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: dto.almacenDestinoId,
              productoId: d.productoId,
            },
          },
        });
        const cantidadAnterior = stockActual?.cantidad ?? 0;
        const cantidadPosterior = cantidadAnterior + d.cantidad;

        await tx.almacenStock.upsert({
          where: {
            almacenId_productoId: {
              almacenId: dto.almacenDestinoId,
              productoId: d.productoId,
            },
          },
          update: { cantidad: cantidadPosterior },
          create: {
            almacenId: dto.almacenDestinoId,
            productoId: d.productoId,
            cantidad: cantidadPosterior,
          },
        });

        await tx.movimientoStock.create({
          data: {
            tipo: TipoMovimiento.COMPRA_RECIBIDA,
            productoId: d.productoId,
            almacenDestinoId: dto.almacenDestinoId,
            cantidad: d.cantidad,
            cantidadAnterior,
            cantidadPosterior,
            referenciaId: recepcion.id,
            referenciaTipo: 'RECEPCION_COMPRA',
            usuarioId: userId,
          },
        });
      }

      this.logger.log(
        `Compra directa registrada: ${orden.numero} (almacén ${almacen.nombre})`,
      );
      return orden;
    });
  }

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════

  private async generateNumeroOC(): Promise<string> {
    const last = await this.prisma.ordenCompra.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numero: true },
    });

    if (!last) return 'OC-0001';

    const lastNum = parseInt(last.numero.replace('OC-', ''), 10);
    return `OC-${String(lastNum + 1).padStart(4, '0')}`;
  }
}
