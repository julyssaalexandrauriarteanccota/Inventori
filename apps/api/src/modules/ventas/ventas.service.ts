import {
  Inject,
  forwardRef,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma } from '../../../generated/prisma/client';
import {
  EstadoComercialEquipo,
  EstadoFacturacionVenta,
  EstadoGarantia,
  EstadoVenta,
  LIMITE_VENTA_INTERNA_LEGAL,
  ModalidadEnvioBoletas,
  TipoDocumento,
  TipoMovimiento,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { CajaService } from '../caja/caja.service';
import { FacturacionService } from '../facturacion/facturacion.service';
import {
  CobrarEmitirPosDto,
  CreateVentaDto,
  UpdateVentaDto,
  QueryVentaDto,
  ConfirmarVentaDto,
} from './dto';

@Injectable()
export class VentasService {
  private readonly logger = new Logger(VentasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cajaService: CajaService,
    @Inject(forwardRef(() => FacturacionService))
    private readonly facturacionService: FacturacionService,
  ) {}

  private async findReservaEquipo(equipoSerie: string) {
    return this.prisma.detalleVenta.findFirst({
      where: {
        equipoSerie,
        venta: {
          deletedAt: null,
          estado: EstadoVenta.RESERVADA,
        },
      },
      select: {
        ventaId: true,
        venta: { select: { numero: true } },
      },
    });
  }

  private async validateVentaDetalles(
    detalles: CreateVentaDto['detalles'],
    options: { ventaId?: string; requireEquipoSerie?: boolean } = {},
  ) {
    const productoIds = detalles.map((detalle) => detalle.productoId);
    const uniqueProductoIds = new Set(productoIds);

    if (uniqueProductoIds.size !== productoIds.length) {
      throw new BadRequestException(
        'Una venta no puede repetir el mismo producto en múltiples detalles',
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

    for (const detalle of detalles) {
      const producto = productos.find(
        (candidate) => candidate.id === detalle.productoId,
      )!;
      const precioMinimo = Number(producto.precioMinimo);
      if (detalle.precioUnitario < precioMinimo) {
        throw new BadRequestException(
          `Producto ${producto.sku}: precio ${detalle.precioUnitario} es menor al mínimo ${precioMinimo}`,
        );
      }

      if (
        options.requireEquipoSerie !== false &&
        producto.tieneNumeroSerie &&
        !detalle.equipoSerie
      ) {
        throw new BadRequestException(
          `Producto ${producto.sku} requiere número de serie`,
        );
      }

      if (detalle.equipoSerie) {
        if (detalle.cantidad !== 1) {
          throw new BadRequestException(
            `Equipo ${detalle.equipoSerie}: la cantidad debe ser 1 para productos serializados`,
          );
        }

        const equipo = await this.prisma.equipo.findUnique({
          where: { numeroSerie: detalle.equipoSerie },
        });
        if (!equipo || equipo.deletedAt) {
          throw new NotFoundException(
            `Equipo con serie ${detalle.equipoSerie} no encontrado`,
          );
        }
        if (equipo.productoId !== detalle.productoId) {
          throw new BadRequestException(
            `Equipo ${detalle.equipoSerie} no corresponde al producto ${producto.sku}`,
          );
        }
        const estadoComercial = equipo.estadoComercial as EstadoComercialEquipo;
        if (estadoComercial === EstadoComercialEquipo.RESERVADO) {
          const reserva = await this.findReservaEquipo(detalle.equipoSerie);
          if (!options.ventaId || reserva?.ventaId !== options.ventaId) {
            throw new BadRequestException(
              `Equipo ${detalle.equipoSerie} está reservado${reserva?.venta?.numero ? ` por cotización ${reserva.venta.numero}` : ''}`,
            );
          }
        } else if (estadoComercial !== EstadoComercialEquipo.DISPONIBLE) {
          throw new BadRequestException(
            `Equipo ${detalle.equipoSerie} no está disponible para venta`,
          );
        }
      }
    }

    return productos;
  }

  private buildTotales(detalles: CreateVentaDto['detalles']) {
    const detallesConTotales = detalles.map((detalle) => {
      const descuento = detalle.descuento ?? 0;
      const totalLinea = this.roundMoney(
        Math.max(0, detalle.precioUnitario * detalle.cantidad - descuento),
      );
      const subtotal = this.roundMoney(totalLinea / 1.18);
      const igv = this.roundMoney(totalLinea - subtotal);

      return {
        productoId: detalle.productoId,
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario,
        descuento,
        subtotal,
        igv,
        totalLinea,
        equipoSerie: detalle.equipoSerie ?? null,
      };
    });

    const detallesCalc = detallesConTotales.map((detalle) => ({
      productoId: detalle.productoId,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precioUnitario,
      descuento: detalle.descuento,
      subtotal: detalle.subtotal,
      equipoSerie: detalle.equipoSerie,
    }));
    const subtotal = this.roundMoney(
      detallesConTotales.reduce((acc, detalle) => acc + detalle.subtotal, 0),
    );
    const descuentoGlobal = this.roundMoney(
      detallesConTotales.reduce((acc, detalle) => acc + detalle.descuento, 0),
    );
    const igv = this.roundMoney(
      detallesConTotales.reduce((acc, detalle) => acc + detalle.igv, 0),
    );
    const total = this.roundMoney(
      detallesConTotales.reduce((acc, detalle) => acc + detalle.totalLinea, 0),
    );

    return { detallesCalc, subtotal, descuentoGlobal, igv, total };
  }

  private roundMoney(value: number) {
    return +value.toFixed(2);
  }

  private getDetalleSeries(detalles: Array<{ equipoSerie?: string | null }>) {
    return [
      ...new Set(
        detalles
          .map((detalle) => detalle.equipoSerie?.trim())
          .filter((serie): serie is string => Boolean(serie)),
      ),
    ];
  }

  private async reservarEquiposCotizacionEnTx(
    tx: Prisma.TransactionClient,
    detalles: Array<{ equipoSerie?: string | null }>,
  ) {
    const series = this.getDetalleSeries(detalles);
    if (series.length === 0) return;

    await tx.equipo.updateMany({
      where: {
        numeroSerie: { in: series },
        estadoComercial: EstadoComercialEquipo.DISPONIBLE,
        deletedAt: null,
      },
      data: { estadoComercial: EstadoComercialEquipo.RESERVADO },
    });
  }

  private async liberarReservasCotizacionEnTx(
    tx: Prisma.TransactionClient,
    detalles: Array<{ equipoSerie?: string | null }>,
  ) {
    const series = this.getDetalleSeries(detalles);
    if (series.length === 0) return;

    await tx.equipo.updateMany({
      where: {
        numeroSerie: { in: series },
        estadoComercial: EstadoComercialEquipo.RESERVADO,
        deletedAt: null,
      },
      data: { estadoComercial: EstadoComercialEquipo.DISPONIBLE },
    });
  }

  // ═══════════════════════════════════════════
  //  CREAR COTIZACIÓN
  // ═══════════════════════════════════════════

  async create(dto: CreateVentaDto, userId: string) {
    // Validar cliente
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, deletedAt: null },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado`);
    }

    await this.validateVentaDetalles(dto.detalles, {
      requireEquipoSerie: false,
    });

    const { detallesCalc, subtotal, descuentoGlobal, igv, total } =
      this.buildTotales(dto.detalles);

    const numero = await this.generateNumeroVenta();

    const venta = await this.prisma.$transaction(async (tx) => {
      const created = await tx.venta.create({
        data: {
          numero,
          clienteId: dto.clienteId,
          usuarioId: userId,
          subtotal,
          descuento: descuentoGlobal,
          igv,
          total,
          notas: dto.notas,
          validoHasta: dto.validoHasta ? new Date(dto.validoHasta) : null,
          detalles: {
            create: detallesCalc.map((d) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              descuento: d.descuento,
              subtotal: d.subtotal,
              equipoSerie: d.equipoSerie,
            })),
          },
        },
        include: {
          detalles: {
            include: {
              producto: { select: { id: true, sku: true, nombre: true } },
            },
          },
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

      return created;
    });

    this.logger.log(`Cotización creada: ${venta.numero}`);
    return venta;
  }

  // ═══════════════════════════════════════════
  //  LISTAR
  // ═══════════════════════════════════════════

  async findAll(query: QueryVentaDto) {
    const { page = 1, limit = 20, estado, estados, clienteId, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (estados?.length) where.estado = { in: estados };
    else if (estado) where.estado = estado;
    if (clienteId) where.clienteId = clienteId;
    if (search) {
      where.numero = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.venta.findMany({
        where,
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
          usuario: { select: { id: true, nombre: true, apellido: true } },
          _count: { select: { detalles: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.venta.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findOne(id: string) {
    const venta = await this.prisma.venta.findFirst({
      where: { id, deletedAt: null },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            razonSocial: true,
            ruc: true,
            dni: true,
            email: true,
            telefono: true,
            celular: true,
            direccion: true,
            distrito: true,
            provincia: true,
            departamento: true,
          },
        },
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        metodoPago: { select: { id: true, codigo: true, nombre: true } },
        comprobante: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            estado: true,
            fechaEmision: true,
            pdfStorageKey: true,
            xmlStorageKey: true,
            cdrStorageKey: true,
            hashCpe: true,
            hashSunat: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                sku: true,
                nombre: true,
                descripcion: true,
                imagen: true,
                tieneNumeroSerie: true,
                mesesGarantia: true,
                garantiaMaxCopias: true,
                marca: { select: { nombre: true } },
                modeloCatalogo: { select: { nombre: true } },
                atributos: true,
              },
            },
          },
        },
        garantias: {
          select: {
            id: true,
            codigoQR: true,
            fechaInicio: true,
            fechaFin: true,
            estado: true,
          },
        },
      },
    });

    if (!venta) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }

    const evidenciasPago = await this.prisma.adjunto.findMany({
      where: {
        entidad: 'VENTA_PAGO',
        entidadId: venta.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...venta,
      evidenciasPago,
    };
  }

  // ═══════════════════════════════════════════
  //  ACTUALIZAR (solo COTIZACIÓN)
  // ═══════════════════════════════════════════

  async update(id: string, dto: UpdateVentaDto) {
    const venta = await this.prisma.venta.findFirst({
      where: { id, deletedAt: null },
      include: { detalles: true },
    });
    if (!venta) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    const ventaEstado = venta.estado as EstadoVenta;
    if (ventaEstado !== EstadoVenta.COTIZACION) {
      throw new BadRequestException(
        'Solo se pueden editar ventas en estado COTIZACION',
      );
    }

    if (dto.clienteId) {
      const cliente = await this.prisma.cliente.findFirst({
        where: { id: dto.clienteId, deletedAt: null },
      });
      if (!cliente) {
        throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado`);
      }
    }

    let detallesData:
      | {
          deleteMany: Record<string, never>;
          create: Array<{
            productoId: string;
            cantidad: number;
            precioUnitario: number;
            descuento: number;
            subtotal: number;
            equipoSerie: string | null;
          }>;
        }
      | undefined;
    let totalsData: {
      subtotal?: number;
      descuento?: number;
      igv?: number;
      total?: number;
    } = {};

    if (dto.detalles) {
      await this.validateVentaDetalles(dto.detalles, {
        ventaId: id,
        requireEquipoSerie: false,
      });
      const { detallesCalc, subtotal, descuentoGlobal, igv, total } =
        this.buildTotales(dto.detalles);

      detallesData = {
        deleteMany: {},
        create: detallesCalc,
      };

      totalsData = {
        subtotal,
        descuento: descuentoGlobal,
        igv,
        total,
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.venta.update({
        where: { id },
        data: {
          ...dto,
          validoHasta: dto.validoHasta ? new Date(dto.validoHasta) : undefined,
          ...totalsData,
          detalles: detallesData,
        },
        include: { detalles: true },
      });

      return saved;
    });

    this.logger.log(`Venta actualizada: ${updated.numero}`);
    return updated;
  }

  async reservar(id: string) {
    const venta = await this.prisma.venta.findFirst({
      where: { id, deletedAt: null },
      include: { detalles: { include: { producto: true } } },
    });
    if (!venta) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }

    const ventaEstado = venta.estado as EstadoVenta;
    if (ventaEstado !== EstadoVenta.COTIZACION) {
      throw new BadRequestException(
        'Solo se pueden reservar cotizaciones en estado COTIZACION',
      );
    }

    const detallesConEquipo = venta.detalles.filter((detalle) =>
      Boolean(detalle.equipoSerie),
    );
    if (detallesConEquipo.length === 0) {
      throw new BadRequestException(
        'La cotización debe incluir al menos un equipo con número de serie para reservar',
      );
    }

    for (const detalle of detallesConEquipo) {
      const equipo = await this.prisma.equipo.findUnique({
        where: { numeroSerie: detalle.equipoSerie! },
      });
      if (!equipo || equipo.deletedAt) {
        throw new NotFoundException(
          `Equipo con serie ${detalle.equipoSerie} no encontrado`,
        );
      }
      if (equipo.productoId !== detalle.productoId) {
        throw new BadRequestException(
          `Equipo ${detalle.equipoSerie} no corresponde al producto ${detalle.producto.sku}`,
        );
      }
      if (
        (equipo.estadoComercial as EstadoComercialEquipo) !==
        EstadoComercialEquipo.DISPONIBLE
      ) {
        throw new BadRequestException(
          `Equipo ${detalle.equipoSerie} no está disponible para reservar`,
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.reservarEquiposCotizacionEnTx(tx, detallesConEquipo);
      return tx.venta.update({
        where: { id },
        data: { estado: EstadoVenta.RESERVADA },
        include: {
          detalles: {
            include: {
              producto: { select: { id: true, sku: true, nombre: true } },
            },
          },
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
    });

    this.logger.log(`Cotización reservada: ${updated.numero}`);
    return updated;
  }

  // ═══════════════════════════════════════════
  //  CONFIRMAR VENTA
  // ═══════════════════════════════════════════

  async confirmar(id: string, dto: ConfirmarVentaDto, userId: string) {
    const venta = await this.prisma.venta.findFirst({
      where: { id, deletedAt: null },
      include: {
        cliente: {
          select: { id: true, dni: true, ruc: true, esGenerico: true },
        },
        detalles: { include: { producto: true } },
      },
    });
    if (!venta) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    const ventaEstado = venta.estado as EstadoVenta;
    if (
      ventaEstado !== EstadoVenta.COTIZACION &&
      ventaEstado !== EstadoVenta.RESERVADA
    ) {
      throw new BadRequestException(
        'Solo se pueden confirmar cotizaciones o reservas',
      );
    }

    // Validar método de pago activo
    const metodoPago = await this.prisma.metodoPago.findUnique({
      where: { id: dto.metodoPagoId },
    });
    if (!metodoPago || !metodoPago.activo) {
      throw new BadRequestException('Método de pago no encontrado o inactivo');
    }

    // Validar almacén
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: dto.almacenId, deletedAt: null, activo: true },
    });
    if (!almacen) {
      throw new NotFoundException(
        `Almacén ${dto.almacenId} no encontrado o inactivo`,
      );
    }

    // Validar apertura de caja activa del usuario ANTES de la transacción
    const aperturaActiva = await this.cajaService.getMiAperturaActiva(userId);
    if (!aperturaActiva) {
      throw new BadRequestException(
        'No tienes una caja abierta. Debes abrir caja antes de confirmar ventas.',
      );
    }

    if (dto.ventaInterna) {
      this.assertVentaInternaPermitida({
        total: Number(venta.total),
        cliente: venta.cliente,
      });
    }

    for (const detalle of venta.detalles) {
      if (detalle.producto.tieneNumeroSerie && !detalle.equipoSerie) {
        throw new BadRequestException(
          `Producto ${detalle.producto.sku}: seleccione una serie antes de confirmar la venta`,
        );
      }
      if (detalle.equipoSerie && detalle.cantidad !== 1) {
        throw new BadRequestException(
          `Equipo ${detalle.equipoSerie}: la cantidad debe ser 1 para productos serializados`,
        );
      }
    }

    // === TRANSACCIÓN ===
    const ventaConfirmada = await this.prisma.$transaction(async (tx) => {
      // 1. Descontar stock y crear movimientos
      for (const detalle of venta.detalles) {
        if (detalle.producto.manejaInventario) {
          const decrementResult = await tx.almacenStock.updateMany({
            where: {
              almacenId: dto.almacenId,
              productoId: detalle.productoId,
              cantidad: { gte: detalle.cantidad },
            },
            data: { cantidad: { decrement: detalle.cantidad } },
          });

          if (decrementResult.count !== 1) {
            const stockDisponible = await tx.almacenStock.findUnique({
              where: {
                almacenId_productoId: {
                  almacenId: dto.almacenId,
                  productoId: detalle.productoId,
                },
              },
              select: { cantidad: true },
            });
            const disponible = stockDisponible?.cantidad ?? 0;
            throw new BadRequestException(
              `Stock insuficiente para ${detalle.producto.sku}. Disponible: ${disponible}, requerido: ${detalle.cantidad}`,
            );
          }

          const stockActualizado = await tx.almacenStock.findUnique({
            where: {
              almacenId_productoId: {
                almacenId: dto.almacenId,
                productoId: detalle.productoId,
              },
            },
            select: { cantidad: true },
          });
          const cantidadPosterior = stockActualizado?.cantidad ?? 0;
          const cantidadAnterior = cantidadPosterior + detalle.cantidad;

          await tx.movimientoStock.create({
            data: {
              tipo: TipoMovimiento.VENTA,
              productoId: detalle.productoId,
              almacenOrigenId: dto.almacenId,
              cantidad: detalle.cantidad,
              cantidadAnterior,
              cantidadPosterior,
              referenciaId: venta.id,
              referenciaTipo: 'VENTA',
              usuarioId: userId,
            },
          });
        }
      }

      // 2. Asignar equipos serializados al cliente
      for (const detalle of venta.detalles) {
        if (detalle.equipoSerie) {
          // Cerrar asignación anterior
          await tx.equipoCliente.updateMany({
            where: {
              equipo: { numeroSerie: detalle.equipoSerie },
              fechaFin: null,
            },
            data: { fechaFin: new Date() },
          });

          const equipo = await tx.equipo.findUnique({
            where: { numeroSerie: detalle.equipoSerie },
          });
          if (!equipo) {
            throw new NotFoundException(
              `Equipo con serie ${detalle.equipoSerie} no encontrado`,
            );
          }

          if (equipo?.almacenId && equipo.almacenId !== dto.almacenId) {
            throw new BadRequestException(
              `Equipo ${detalle.equipoSerie} pertenece a otro almacén`,
            );
          }

          const equipoEstadoComercial =
            equipo.estadoComercial as EstadoComercialEquipo;
          if (ventaEstado === EstadoVenta.RESERVADA) {
            if (equipoEstadoComercial !== EstadoComercialEquipo.RESERVADO) {
              throw new BadRequestException(
                `Equipo ${detalle.equipoSerie} debe estar reservado para vender`,
              );
            }
            const reserva = await this.findReservaEquipo(detalle.equipoSerie);
            if (reserva?.ventaId !== venta.id) {
              throw new BadRequestException(
                `Equipo ${detalle.equipoSerie} está reservado por otra cotización`,
              );
            }
          } else if (
            equipoEstadoComercial !== EstadoComercialEquipo.DISPONIBLE
          ) {
            throw new BadRequestException(
              `Equipo ${detalle.equipoSerie} no está disponible para confirmar venta`,
            );
          }

          // Nueva asignación
          await tx.equipoCliente.create({
            data: {
              equipoId: equipo.id,
              clienteId: venta.clienteId,
              ventaId: venta.id,
              fechaInicio: new Date(),
            },
          });
          await tx.equipo.update({
            where: { id: equipo.id },
            data: {
              estadoComercial: EstadoComercialEquipo.VENDIDO,
              almacenId: null,
            },
          });
        }
      }

      // 3. Crear garantías automáticas para equipos serializados
      for (const detalle of venta.detalles) {
        if (detalle.equipoSerie && detalle.producto.tieneNumeroSerie) {
          const equipo = await tx.equipo.findUnique({
            where: { numeroSerie: detalle.equipoSerie },
          });
          if (!equipo) {
            throw new NotFoundException(
              `Equipo con serie ${detalle.equipoSerie} no encontrado`,
            );
          }

          const meses = detalle.producto.mesesGarantia ?? 12;
          const fechaInicio = new Date();
          const fechaFin = new Date(fechaInicio);
          fechaFin.setMonth(fechaFin.getMonth() + meses);

          // Snapshot del cliente
          const clienteData = await tx.cliente.findUnique({
            where: { id: venta.clienteId },
            select: {
              id: true,
              nombre: true,
              apellido: true,
              razonSocial: true,
              ruc: true,
              dni: true,
            },
          });
          if (!clienteData) {
            throw new NotFoundException(
              `Cliente ${venta.clienteId} no encontrado`,
            );
          }

          const coberturaTexto =
            detalle.producto.garantiaMaxCopias != null
              ? `Garantía estándar de fábrica — ${meses} meses o ${detalle.producto.garantiaMaxCopias} copias (lo que ocurra primero)`
              : `Garantía estándar de fábrica — ${meses} meses`;

          await tx.garantia.create({
            data: {
              equipoId: equipo.id,
              ventaId: venta.id,
              clienteIdOriginal: clienteData.id,
              clienteDocTipo: clienteData.ruc
                ? 'RUC'
                : clienteData.dni
                  ? 'DNI'
                  : null,
              clienteDocNumero: clienteData.ruc ?? clienteData.dni ?? null,
              clienteNombre:
                clienteData.razonSocial ??
                ([clienteData.nombre, clienteData.apellido]
                  .filter(Boolean)
                  .join(' ') ||
                  null),
              fechaInicio,
              fechaFin,
              cobertura: coberturaTexto,
              codigoQR: randomUUID(),
              contadorInicio: equipo.contadorActual ?? null,
              contadorMaxCopias: detalle.producto.garantiaMaxCopias ?? null,
              estado: EstadoGarantia.PENDIENTE_COMPLETAR,
            },
          });
        }
      }

      // 4. Actualizar estado de la venta
      const ventaConfirmada = await tx.venta.update({
        where: { id },
        data: {
          estado: EstadoVenta.ORDEN_CONFIRMADA,
          ...(dto.ventaInterna
            ? { estadoFacturacion: EstadoFacturacionVenta.VENTA_INTERNA }
            : {}),
          metodoPagoId: dto.metodoPagoId,
          referenciaPago: dto.referenciaPago ?? null,
        },
        include: {
          detalles: {
            include: {
              producto: { select: { id: true, sku: true, nombre: true } },
            },
          },
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

      if (dto.evidenciaPagoFilename) {
        await tx.adjunto.create({
          data: {
            entidad: 'VENTA_PAGO',
            entidadId: venta.id,
            url: `uploads/${dto.evidenciaPagoFilename}`,
            nombre: dto.evidenciaPagoFilename,
            tipo: 'VENTA_PAGO_EVIDENCIA',
          },
        });
      }

      this.logger.log(`Venta confirmada: ${ventaConfirmada.numero}`);

      // 5. Registrar movimiento de caja DENTRO de la transacción.
      const movCaja = await this.cajaService.registrarIngresoVenta(
        {
          usuarioId: userId,
          monto: Number(ventaConfirmada.total),
          metodoPagoId: ventaConfirmada.metodoPagoId ?? undefined,
          ventaId: ventaConfirmada.id,
          concepto: `Venta ${ventaConfirmada.numero}`,
        },
        tx,
      );
      if (!movCaja) {
        // No debería ocurrir porque validamos antes, pero abortamos por integridad.
        throw new BadRequestException(
          'La caja se cerró mientras se confirmaba la venta. Reinténtalo.',
        );
      }

      return ventaConfirmada;
    });

    return ventaConfirmada;
  }

  async cobrarEmitirPos(dto: CobrarEmitirPosDto, userId: string) {
    if (dto.ventaInterna) {
      throw new BadRequestException(
        'ventaInterna no es compatible con cobrar-emitir; usa confirmar venta sin emitir comprobante.',
      );
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, deletedAt: null },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado`);
    }

    await this.validateVentaDetalles(dto.detalles);
    const { detallesCalc, subtotal, descuentoGlobal, igv, total } =
      this.buildTotales(dto.detalles);

    if (
      total >= 700 &&
      (cliente.esGenerico ||
        cliente.dni === '00000000' ||
        (!cliente.dni && !cliente.ruc))
    ) {
      throw new BadRequestException(
        'Boletas POS desde S/ 700 requieren cliente identificado con DNI, CE o RUC.',
      );
    }

    const configFiscal = await this.prisma.configEmpresaFiscal.findFirst({
      select: { modalidadEnvioBoletas: true },
      orderBy: { createdAt: 'asc' },
    });
    if (
      configFiscal?.modalidadEnvioBoletas !== ModalidadEnvioBoletas.INDIVIDUAL
    ) {
      throw new BadRequestException(
        'POS rápido solo puede emitir boletas si la modalidad de envío es INDIVIDUAL.',
      );
    }
    await this.validatePosFiscalReadiness();

    const metodoPago = await this.prisma.metodoPago.findUnique({
      where: { id: dto.metodoPagoId },
    });
    if (!metodoPago || !metodoPago.activo) {
      throw new BadRequestException('Método de pago no encontrado o inactivo');
    }

    const almacen = await this.prisma.almacen.findFirst({
      where: { id: dto.almacenId, deletedAt: null, activo: true },
    });
    if (!almacen) {
      throw new NotFoundException(
        `Almacén ${dto.almacenId} no encontrado o inactivo`,
      );
    }

    const aperturaActiva = await this.cajaService.getMiAperturaActiva(userId);
    if (!aperturaActiva) {
      throw new BadRequestException(
        'No tienes una caja abierta. Debes abrir caja antes de cobrar.',
      );
    }

    const numero = await this.generateNumeroVenta();

    const result = await this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          numero,
          clienteId: dto.clienteId,
          usuarioId: userId,
          subtotal,
          descuento: descuentoGlobal,
          igv,
          total,
          notas: dto.notas,
          detalles: {
            create: detallesCalc.map((detalle) => ({
              productoId: detalle.productoId,
              cantidad: detalle.cantidad,
              precioUnitario: detalle.precioUnitario,
              descuento: detalle.descuento,
              subtotal: detalle.subtotal,
              equipoSerie: detalle.equipoSerie,
            })),
          },
        },
        include: {
          cliente: true,
          detalles: {
            include: {
              producto: { include: { unidadMedida: true } },
            },
          },
        },
      });

      await this.aplicarConfirmacionComercialEnTx(tx, venta, dto, userId);

      const ventaEntregada = await tx.venta.update({
        where: { id: venta.id },
        data: {
          estado: EstadoVenta.ENTREGADA,
          metodoPagoId: dto.metodoPagoId,
          referenciaPago: dto.referenciaPago ?? null,
        },
        include: {
          cliente: true,
          detalles: {
            include: {
              producto: { include: { unidadMedida: true } },
            },
          },
        },
      });

      if (dto.evidenciaPagoFilename) {
        await tx.adjunto.create({
          data: {
            entidad: 'VENTA_PAGO',
            entidadId: venta.id,
            url: `uploads/${dto.evidenciaPagoFilename}`,
            nombre: dto.evidenciaPagoFilename,
            tipo: 'VENTA_PAGO_EVIDENCIA',
          },
        });
      }

      const movCaja = await this.cajaService.registrarIngresoVenta(
        {
          usuarioId: userId,
          monto: Number(ventaEntregada.total),
          metodoPagoId: ventaEntregada.metodoPagoId ?? undefined,
          ventaId: ventaEntregada.id,
          concepto: `Venta ${ventaEntregada.numero}`,
        },
        tx,
      );
      if (!movCaja) {
        throw new BadRequestException(
          'La caja se cerró mientras se cobraba la venta. Reinténtalo.',
        );
      }

      const comprobante =
        await this.facturacionService.crearComprobantePendienteEnTx(
          tx,
          ventaEntregada,
          {
            ventaId: ventaEntregada.id,
            tipo: TipoDocumento.BOLETA,
          },
          userId,
        );

      return { venta: ventaEntregada, comprobante };
    });

    try {
      await this.facturacionService.encolarComprobanteSunat(result.comprobante);
    } catch (err) {
      this.logger.error(
        `No se pudo encolar boleta POS ${result.comprobante.numero}; quedará para sweeper`,
        err instanceof Error ? err.stack : undefined,
      );
    }

    this.logger.log(
      `Venta POS ${result.venta.numero} cobrada y boleta ${result.comprobante.numero} creada atómicamente`,
    );

    return result;
  }

  private async validatePosFiscalReadiness() {
    const [certificadoActivo, credenciales] = await Promise.all([
      this.prisma.certificadoDigital.findFirst({
        where: { activo: true, revokedAt: null, deletedAt: null },
        select: { id: true, validoHasta: true },
      }),
      this.prisma.fiscalSecret.findMany({
        where: {
          scope: 'sunat-direct:sol-credentials',
          name: { in: ['sol-username', 'sol-user', 'sol-password'] },
          deletedAt: null,
        },
        select: { name: true },
      }),
    ]);

    if (
      !certificadoActivo ||
      !certificadoActivo.validoHasta ||
      certificadoActivo.validoHasta < new Date()
    ) {
      throw new BadRequestException(
        certificadoActivo
          ? 'El certificado digital activo está vencido'
          : 'La empresa no tiene certificado digital activo',
      );
    }

    const credentialNames = new Set(credenciales.map((item) => item.name));
    const hasDbCredentials =
      (credentialNames.has('sol-username') ||
        credentialNames.has('sol-user')) &&
      credentialNames.has('sol-password');

    const hasEnvCredentials =
      (!!process.env.SUNAT_SOL_USERNAME || !!process.env.SUNAT_SOL_USER) &&
      !!process.env.SUNAT_SOL_PASSWORD;

    if (!hasDbCredentials && !hasEnvCredentials) {
      throw new BadRequestException(
        'La empresa no tiene credenciales SOL configuradas',
      );
    }
  }

  private assertVentaInternaPermitida(input: {
    total: number;
    cliente: { esGenerico: boolean; dni?: string | null; ruc?: string | null };
  }) {
    const isClienteGenerico =
      input.cliente.esGenerico ||
      input.cliente.dni === '00000000' ||
      (!input.cliente.dni && !input.cliente.ruc);

    if (!isClienteGenerico) {
      throw new BadRequestException(
        'Solo las ventas a Público en general pueden cerrarse como venta interna.',
      );
    }

    if (input.total > LIMITE_VENTA_INTERNA_LEGAL) {
      throw new BadRequestException(
        `Solo las ventas hasta S/ ${LIMITE_VENTA_INTERNA_LEGAL.toFixed(2)} pueden cerrarse como internas.`,
      );
    }
  }

  private async aplicarConfirmacionComercialEnTx(
    tx: Prisma.TransactionClient,
    venta: {
      id: string;
      numero: string;
      clienteId: string;
      detalles: Array<{
        productoId: string;
        cantidad: number;
        equipoSerie?: string | null;
        producto: {
          sku: string;
          manejaInventario: boolean;
          tieneNumeroSerie: boolean;
          mesesGarantia?: number | null;
          garantiaMaxCopias?: number | null;
        };
      }>;
    },
    dto: ConfirmarVentaDto,
    userId: string,
  ) {
    for (const detalle of venta.detalles) {
      if (!detalle.producto.manejaInventario) {
        continue;
      }

      const decrementResult = await tx.almacenStock.updateMany({
        where: {
          almacenId: dto.almacenId,
          productoId: detalle.productoId,
          cantidad: { gte: detalle.cantidad },
        },
        data: { cantidad: { decrement: detalle.cantidad } },
      });

      if (decrementResult.count !== 1) {
        const stockDisponible = await tx.almacenStock.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: dto.almacenId,
              productoId: detalle.productoId,
            },
          },
          select: { cantidad: true },
        });
        const disponible = stockDisponible?.cantidad ?? 0;
        throw new BadRequestException(
          `Stock insuficiente para ${detalle.producto.sku}. Disponible: ${disponible}, requerido: ${detalle.cantidad}`,
        );
      }

      const stockActualizado = await tx.almacenStock.findUnique({
        where: {
          almacenId_productoId: {
            almacenId: dto.almacenId,
            productoId: detalle.productoId,
          },
        },
        select: { cantidad: true },
      });
      const cantidadPosterior = stockActualizado?.cantidad ?? 0;
      const cantidadAnterior = cantidadPosterior + detalle.cantidad;

      await tx.movimientoStock.create({
        data: {
          tipo: TipoMovimiento.VENTA,
          productoId: detalle.productoId,
          almacenOrigenId: dto.almacenId,
          cantidad: detalle.cantidad,
          cantidadAnterior,
          cantidadPosterior,
          referenciaId: venta.id,
          referenciaTipo: 'VENTA',
          usuarioId: userId,
        },
      });
    }

    for (const detalle of venta.detalles) {
      if (!detalle.equipoSerie) {
        continue;
      }

      await tx.equipoCliente.updateMany({
        where: {
          equipo: { numeroSerie: detalle.equipoSerie },
          fechaFin: null,
        },
        data: { fechaFin: new Date() },
      });

      const equipo = await tx.equipo.findUnique({
        where: { numeroSerie: detalle.equipoSerie },
      });

      if (!equipo) {
        throw new NotFoundException(
          `Equipo con serie ${detalle.equipoSerie} no encontrado`,
        );
      }

      if (equipo.almacenId && equipo.almacenId !== dto.almacenId) {
        throw new BadRequestException(
          `Equipo ${detalle.equipoSerie} pertenece a otro almacén`,
        );
      }

      const equipoEstadoComercial =
        equipo.estadoComercial as EstadoComercialEquipo;
      if (equipoEstadoComercial === EstadoComercialEquipo.RESERVADO) {
        const reserva = await this.findReservaEquipo(detalle.equipoSerie);
        if (reserva?.ventaId !== venta.id) {
          throw new BadRequestException(
            `Equipo ${detalle.equipoSerie} está reservado por otra cotización`,
          );
        }
      } else if (equipoEstadoComercial !== EstadoComercialEquipo.DISPONIBLE) {
        throw new BadRequestException(
          `Equipo ${detalle.equipoSerie} no está disponible para confirmar venta`,
        );
      }

      await tx.equipoCliente.create({
        data: {
          equipoId: equipo.id,
          clienteId: venta.clienteId,
          ventaId: venta.id,
          fechaInicio: new Date(),
        },
      });

      await tx.equipo.update({
        where: { id: equipo.id },
        data: {
          estadoComercial: EstadoComercialEquipo.VENDIDO,
          almacenId: null,
        },
      });
    }

    for (const detalle of venta.detalles) {
      if (!detalle.equipoSerie || !detalle.producto.tieneNumeroSerie) {
        continue;
      }

      const equipo = await tx.equipo.findUnique({
        where: { numeroSerie: detalle.equipoSerie },
      });
      if (!equipo) {
        throw new NotFoundException(
          `Equipo con serie ${detalle.equipoSerie} no encontrado`,
        );
      }

      const meses = detalle.producto.mesesGarantia ?? 12;
      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaFin.getMonth() + meses);

      const clienteData = await tx.cliente.findUnique({
        where: { id: venta.clienteId },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          razonSocial: true,
          ruc: true,
          dni: true,
        },
      });
      if (!clienteData) {
        throw new NotFoundException(`Cliente ${venta.clienteId} no encontrado`);
      }

      const coberturaTexto =
        detalle.producto.garantiaMaxCopias != null
          ? `Garantía estándar de fábrica — ${meses} meses o ${detalle.producto.garantiaMaxCopias} copias (lo que ocurra primero)`
          : `Garantía estándar de fábrica — ${meses} meses`;

      await tx.garantia.create({
        data: {
          equipoId: equipo.id,
          ventaId: venta.id,
          clienteIdOriginal: clienteData.id,
          clienteDocTipo: clienteData.ruc
            ? 'RUC'
            : clienteData.dni
              ? 'DNI'
              : null,
          clienteDocNumero: clienteData.ruc ?? clienteData.dni ?? null,
          clienteNombre:
            clienteData.razonSocial ??
            ([clienteData.nombre, clienteData.apellido]
              .filter(Boolean)
              .join(' ') ||
              null),
          fechaInicio,
          fechaFin,
          cobertura: coberturaTexto,
          codigoQR: randomUUID(),
          contadorInicio: equipo.contadorActual ?? null,
          contadorMaxCopias: detalle.producto.garantiaMaxCopias ?? null,
          estado: EstadoGarantia.PENDIENTE_COMPLETAR,
        },
      });
    }
  }

  // ═══════════════════════════════════════════
  //  ENTREGAR
  // ═══════════════════════════════════════════

  async entregar(id: string) {
    const venta = await this.prisma.venta.findFirst({
      where: { id, deletedAt: null },
    });
    if (!venta) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }

    const estadosEntregables = [EstadoVenta.ORDEN_CONFIRMADA];
    if (!estadosEntregables.includes(venta.estado as EstadoVenta)) {
      throw new BadRequestException(
        `No se puede entregar una venta en estado ${venta.estado}`,
      );
    }

    const updated = await this.prisma.venta.update({
      where: { id },
      data: { estado: EstadoVenta.ENTREGADA },
    });

    this.logger.log(`Venta entregada: ${updated.numero}`);
    return updated;
  }

  // ═══════════════════════════════════════════
  //  CANCELAR / ANULAR (con reverso completo)
  // ═══════════════════════════════════════════

  async cancelar(id: string, userId: string, motivo?: string) {
    const venta = await this.prisma.venta.findFirst({
      where: { id, deletedAt: null },
      include: {
        detalles: { include: { producto: true } },
        comprobante: true,
      },
    });
    if (!venta) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }

    const ventaEstado = venta.estado as EstadoVenta;
    if (ventaEstado === EstadoVenta.CANCELADA) {
      throw new BadRequestException('La venta ya fue cancelada');
    }

    // Doc 02 §9: la cancelación se valida contra el estadoFacturacion (fiscal),
    // que es independiente del estado comercial.
    const estadoFacturacion =
      (venta.estadoFacturacion as EstadoFacturacionVenta) ??
      EstadoFacturacionVenta.SIN_COMPROBANTE;
    if (estadoFacturacion === EstadoFacturacionVenta.EN_EMISION) {
      throw new BadRequestException(
        'La venta tiene un comprobante en emisión. Espera a que termine antes de cancelar.',
      );
    }
    if (
      estadoFacturacion === EstadoFacturacionVenta.EMITIDA ||
      estadoFacturacion === EstadoFacturacionVenta.EMITIDA_CON_OBS
    ) {
      throw new BadRequestException(
        'La venta tiene un comprobante aceptado por SUNAT. Genera una nota de crédito de anulación antes de cancelar.',
      );
    }

    // Cotización o reserva sin confirmar → liberar reservas y cancelar.
    if (
      ventaEstado === EstadoVenta.COTIZACION ||
      ventaEstado === EstadoVenta.RESERVADA
    ) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.liberarReservasCotizacionEnTx(tx, venta.detalles ?? []);
        return tx.venta.update({
          where: { id },
          data: { estado: EstadoVenta.CANCELADA, notas: motivo ?? venta.notas },
        });
      });
      this.logger.log(`Cotización cancelada: ${updated.numero}`);
      return updated;
    }

    // ORDEN_CONFIRMADA o ENTREGADA con backout completo (stock + caja + comprobante fiscal).
    // ENTREGADA solo llega aquí si no tiene un comprobante SUNAT aceptado o en emisión.
    const movimientoVenta = await this.prisma.movimientoStock.findFirst({
      where: { referenciaTipo: 'VENTA', referenciaId: venta.id },
      select: { almacenOrigenId: true },
    });
    const almacenId = movimientoVenta?.almacenOrigenId ?? null;

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Revertir stock con MovimientoStock tipo AJUSTE (entrada).
      if (almacenId) {
        for (const detalle of venta.detalles) {
          if (!detalle.producto.manejaInventario) continue;
          await tx.almacenStock.upsert({
            where: {
              almacenId_productoId: {
                almacenId,
                productoId: detalle.productoId,
              },
            },
            update: { cantidad: { increment: detalle.cantidad } },
            create: {
              almacenId,
              productoId: detalle.productoId,
              cantidad: detalle.cantidad,
            },
          });
          const stockActualizado = await tx.almacenStock.findUnique({
            where: {
              almacenId_productoId: {
                almacenId,
                productoId: detalle.productoId,
              },
            },
            select: { cantidad: true },
          });
          const cantidadPosterior = stockActualizado?.cantidad ?? 0;
          const cantidadAnterior = cantidadPosterior - detalle.cantidad;
          await tx.movimientoStock.create({
            data: {
              tipo: TipoMovimiento.DEVOLUCION_CLIENTE,
              productoId: detalle.productoId,
              almacenDestinoId: almacenId,
              cantidad: detalle.cantidad,
              cantidadAnterior,
              cantidadPosterior,
              referenciaId: venta.id,
              referenciaTipo: 'VENTA_ANULADA',
              justificacion: motivo ?? `Anulación venta ${venta.numero}`,
              usuarioId: userId,
            },
          });
        }
      }

      // 2. Liberar equipos serializados.
      for (const detalle of venta.detalles) {
        if (!detalle.equipoSerie) continue;
        const equipo = await tx.equipo.findUnique({
          where: { numeroSerie: detalle.equipoSerie },
        });
        if (!equipo) continue;
        await tx.equipoCliente.updateMany({
          where: { equipoId: equipo.id, ventaId: venta.id, fechaFin: null },
          data: { fechaFin: new Date() },
        });
        await tx.equipo.update({
          where: { id: equipo.id },
          data: {
            estadoComercial: EstadoComercialEquipo.DISPONIBLE,
            almacenId: almacenId ?? equipo.almacenId,
          },
        });
      }

      // 3. Anular garantías asociadas.
      await tx.garantia.updateMany({
        where: {
          ventaId: venta.id,
          estado: {
            in: [EstadoGarantia.ACTIVA, EstadoGarantia.PENDIENTE_COMPLETAR],
          },
        },
        data: { estado: EstadoGarantia.ANULADA },
      });

      // 4. Reverso de caja (DEVOLUCION).
      await this.cajaService.registrarReversoVenta(
        {
          usuarioId: userId,
          monto: Number(venta.total),
          metodoPagoId: venta.metodoPagoId ?? undefined,
          ventaId: venta.id,
          concepto: `Anulación venta ${venta.numero}${motivo ? ` — ${motivo}` : ''}`,
        },
        tx,
      );

      // 5. Cambiar estado de la venta.
      const ventaCancelada = await tx.venta.update({
        where: { id },
        data: {
          estado: EstadoVenta.CANCELADA,
          notas: motivo
            ? `${venta.notas ? venta.notas + '\n' : ''}Anulada: ${motivo}`
            : venta.notas,
        },
      });
      return ventaCancelada;
    });

    this.logger.log(
      `Venta ${updated.numero} anulada con reverso completo por usuario ${userId}`,
    );
    return updated;
  }

  async remove(id: string) {
    const venta = await this.prisma.venta.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, numero: true, estado: true },
    });
    if (!venta) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    const estado = venta.estado as EstadoVenta;
    if (estado !== EstadoVenta.CANCELADA && estado !== EstadoVenta.COTIZACION) {
      throw new BadRequestException(
        'Primero cancela la venta para revertir stock, garantías y caja antes de eliminarla.',
      );
    }

    const deleted = await this.prisma.venta.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Venta cancelada eliminada del historial: ${venta.numero}`);
    return deleted;
  }

  // ═══════════════════════════════════════════
  //  ENVIAR COTIZACIÓN (trigger)
  // ═══════════════════════════════════════════

  async prepararEnvioCotizacion(id: string) {
    const venta = await this.prisma.venta.findFirst({
      where: { id, deletedAt: null },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            razonSocial: true,
            email: true,
            ruc: true,
            dni: true,
          },
        },
        usuario: { select: { id: true, nombre: true, apellido: true } },
        detalles: {
          include: {
            producto: {
              select: { id: true, sku: true, nombre: true, descripcion: true },
            },
          },
        },
      },
    });

    if (!venta) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    const ventaEstado = venta.estado as EstadoVenta;
    if (ventaEstado !== EstadoVenta.COTIZACION) {
      throw new BadRequestException(
        'Solo se pueden enviar cotizaciones en estado COTIZACION',
      );
    }

    // Payload para Sprint 17 (PDF + email)
    return {
      ventaId: venta.id,
      numero: venta.numero,
      cliente: venta.cliente,
      vendedor: venta.usuario,
      detalles: venta.detalles,
      subtotal: venta.subtotal,
      igv: venta.igv,
      total: venta.total,
      validoHasta: venta.validoHasta,
      notas: venta.notas,
      estado: 'ENVIO_PREPARADO',
    };
  }

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════

  private async generateNumeroVenta(): Promise<string> {
    const last = await this.prisma.venta.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numero: true },
    });

    if (!last) return 'VTA-0001';

    const lastNum = parseInt(last.numero.replace('VTA-', ''), 10);
    return `VTA-${String(lastNum + 1).padStart(4, '0')}`;
  }
}
