import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  EstadoTicket,
  RolUsuario,
  TipoMovimiento,
  SocketEvents,
  TicketEventPayload,
  PrioridadTicket,
  TipoServicio,
  EstadoGarantia,
  TipoProducto,
} from '@erp/shared';
import type {
  TicketUpdateInput,
  TicketWhereInput,
} from '../../../generated/prisma/models/Ticket';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from '../../websockets/events.service';
import { InventarioService } from '../inventario/inventario.service';
import { WhatsappService } from '../notifications/whatsapp.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  UpdateDetalleTicketDto,
  QueryTicketDto,
  AddDetalleTicketDto,
  AddRepuestoDto,
  CerrarTicketDto,
} from './dto';

type TicketSearchWhere = Omit<TicketWhereInput, 'createdAt'> & {
  createdAt?: {
    gte?: Date;
    lt?: Date;
  };
};

type TicketTrackedField = 'estado' | 'prioridad' | 'tecnicoId' | 'tipoServicio';

type TicketTrackedValues = Partial<Record<TicketTrackedField, string | null>>;

type ReversibleDetalleTicket = {
  productoId: string | null;
  cantidad: number;
  producto?: { tipo?: string | null } | null;
};

type SoporteStockTx = {
  movimientoStock: Pick<
    PrismaService['movimientoStock'],
    'findMany' | 'create'
  >;
  almacenStock: Pick<PrismaService['almacenStock'], 'update' | 'findUnique'>;
};

type SoporteEstadoTx = {
  ticket: Pick<PrismaService['ticket'], 'update'>;
  historialTicket: Pick<PrismaService['historialTicket'], 'create'>;
};

@Injectable()
export class SoporteService {
  private readonly logger = new Logger(SoporteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly inventarioService: InventarioService,
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envía una notificación WhatsApp al cliente del ticket si:
   *   - Evolution API está configurada
   *   - El cliente tiene `celular` o `telefono`
   * Errores no propagan: el ticket se persiste igual aunque WhatsApp falle.
   */
  private async notifyClienteWhatsapp(args: {
    cliente: { celular?: string | null; telefono?: string | null } | null;
    codigo: string;
    titulo: string;
    estado: EstadoTicket;
    extra?: string;
  }): Promise<void> {
    if (!this.whatsappService.isConfigured()) return;
    const phone = args.cliente?.celular ?? args.cliente?.telefono ?? null;
    if (!phone) return;

    const baseUrl = this.configService.get<string>(
      'PUBLIC_WEB_URL',
      this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    );
    const consultaUrl = `${baseUrl.replace(/\/$/, '')}/ticket?codigo=${encodeURIComponent(args.codigo)}`;
    const lines = [
      `Ticket ${args.codigo}: ${args.titulo}`,
      `Estado: ${args.estado}`,
    ];
    if (args.extra) lines.push(args.extra);
    lines.push(`Consulta: ${consultaUrl}`);

    try {
      const result = await this.whatsappService.sendText({
        to: phone,
        text: lines.join('\n'),
      });
      if (!result.delivered) {
        this.logger.warn(
          `WhatsApp ticket ${args.codigo} omitido (${
            result.reason ?? 'unknown'
          }): ${result.errorMessage ?? ''}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Error enviando WhatsApp del ticket ${args.codigo}: ${(error as Error).message}`,
      );
    }
  }

  private async validateEquipoPropioAsignadoCliente(
    equipoId: string,
    clienteId: string,
  ) {
    const equipo = await this.prisma.equipo.findFirst({
      where: {
        id: equipoId,
        deletedAt: null,
        equipoClientes: {
          some: {
            clienteId,
            fechaFin: null,
          },
        },
      },
      select: { id: true },
    });

    if (!equipo) {
      throw new NotFoundException(
        `Equipo ${equipoId} no encontrado o no está asignado al cliente ${clienteId}`,
      );
    }
  }

  // ═══════════════════════════════════════════
  //  CREAR TICKET
  // ═══════════════════════════════════════════

  async create(dto: CreateTicketDto, userId: string, userRol: RolUsuario) {
    // Validar cliente existe
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, deletedAt: null },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado`);
    }

    if (dto.equipoId && dto.clienteEquipoId) {
      throw new BadRequestException(
        'Selecciona un equipo propio o un equipo del cliente, no ambos',
      );
    }

    // Validar equipo si se proporciona
    if (dto.equipoId) {
      await this.validateEquipoPropioAsignadoCliente(
        dto.equipoId,
        dto.clienteId,
      );
    }

    if (dto.clienteEquipoId) {
      const equipoCliente = await this.prisma.equipoClienteActivo.findFirst({
        where: {
          id: dto.clienteEquipoId,
          clienteId: dto.clienteId,
          deletedAt: null,
        },
      });
      if (!equipoCliente) {
        throw new NotFoundException(
          `Equipo de cliente ${dto.clienteEquipoId} no encontrado para este cliente`,
        );
      }
    }

    // Auto-asignación según rol del creador:
    //  - TECNICO: siempre se autoasigna (ignora dto.tecnicoId)
    //  - ADMIN / ENCARGADO: respeta dto.tecnicoId (puede dejarlo vacío)
    let tecnicoIdFinal: string | undefined;
    if (userRol === RolUsuario.TECNICO) {
      tecnicoIdFinal = userId;
    } else {
      tecnicoIdFinal = dto.tecnicoId;
    }

    // Validar técnico final si existe
    if (tecnicoIdFinal) {
      const tecnico = await this.prisma.usuario.findFirst({
        where: {
          id: tecnicoIdFinal,
          deletedAt: null,
          rol: RolUsuario.TECNICO,
        },
      });
      if (!tecnico) {
        throw new NotFoundException(
          `Técnico ${tecnicoIdFinal} no encontrado o no tiene rol TECNICO`,
        );
      }
    }

    // Generar código TKT-YYYY-XXXX
    const codigo = await this.generarCodigo();

    const {
      fechaPromesa,
      tecnicoId: _ignoreTecnicoId,
      detalles,
      ...rest
    } = dto;
    void _ignoreTecnicoId;

    const ticket = await this.prisma.ticket.create({
      data: {
        ...rest,
        tecnicoId: tecnicoIdFinal,
        codigo,
        creadoPorId: userId,
        fechaPromesa: fechaPromesa ? new Date(fechaPromesa) : undefined,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            razonSocial: true,
            dni: true,
            ruc: true,
            celular: true,
            telefono: true,
          },
        },
        equipo: { select: { id: true, numeroSerie: true, productoId: true } },
        clienteEquipo: {
          select: {
            id: true,
            numeroSerie: true,
            nombre: true,
            marca: true,
            modelo: true,
          },
        },
        tecnico: { select: { id: true, nombre: true, email: true } },
      },
    });

    // Crear historial inicial
    await this.prisma.historialTicket.create({
      data: {
        ticketId: ticket.id,
        usuarioId: userId,
        campo: 'estado',
        valorAntes: null,
        valorDespues: EstadoTicket.ABIERTO,
        notas: 'Ticket creado',
      },
    });

    // Auto-aplicar garantía vigente: si el ticket tiene equipo y existe una
    // garantía ACTIVA y no vencida para ese equipo, abrimos automáticamente
    // un caso de garantía con aceptada=true. El técnico podrá rechazarlo
    // luego (PATCH al caso) si determina uso indebido u otro motivo.
    let garantiaAplicada: { id: string; codigoQR: string } | null = null;
    if (ticket.equipoId) {
      const garantia = await this.prisma.garantia.findFirst({
        where: {
          equipoId: ticket.equipoId,
          estado: EstadoGarantia.ACTIVA,
          fechaFin: { gte: new Date() },
        },
        orderBy: { fechaFin: 'desc' },
        select: { id: true, codigoQR: true },
      });

      if (garantia) {
        await this.prisma.casoGarantia.create({
          data: {
            garantiaId: garantia.id,
            ticketId: ticket.id,
            descripcion: `Auto-creado al abrir ticket ${ticket.codigo}: ${ticket.titulo}`,
            aceptada: true,
          },
        });

        await this.prisma.historialTicket.create({
          data: {
            ticketId: ticket.id,
            usuarioId: userId,
            campo: 'garantia',
            valorAntes: null,
            valorDespues: garantia.codigoQR,
            notas: 'Garantía vigente detectada y aplicada automáticamente',
          },
        });

        garantiaAplicada = garantia;
        this.logger.log(
          `Garantía ${garantia.codigoQR} aplicada automáticamente al ticket ${ticket.codigo}`,
        );
      }
    }

    for (const detalle of detalles ?? []) {
      await this.addDetalle(ticket.id, detalle, userId, userRol);
    }

    this.logger.log(`Ticket ${codigo} creado por usuario ${userId}`);

    // Emit real-time event
    const payload: TicketEventPayload = {
      ticketId: ticket.id,
      codigo: ticket.codigo,
      titulo: ticket.titulo,
      estado: ticket.estado as EstadoTicket,
      prioridad: ticket.prioridad as PrioridadTicket,
      tipoServicio: ticket.tipoServicio as TipoServicio,
      tecnicoId: ticket.tecnicoId,
      tecnicoNombre: ticket.tecnico?.nombre,
      clienteNombre: ticket.cliente?.nombre,
    };
    this.events.emitToRoles(
      [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
      SocketEvents.TICKET_CREATED,
      payload,
    );
    if (ticket.tecnicoId) {
      this.events.emitToUser(
        ticket.tecnicoId,
        SocketEvents.TICKET_CREATED,
        payload,
      );
    }

    await this.notifyClienteWhatsapp({
      cliente: ticket.cliente,
      codigo: ticket.codigo,
      titulo: ticket.titulo,
      estado: ticket.estado as EstadoTicket,
      extra: 'Te notificaremos cuando avance el estado.',
    });

    return {
      data: { ...ticket, garantiaAplicada },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  // ═══════════════════════════════════════════
  //  LISTAR TICKETS
  // ═══════════════════════════════════════════

  async findAll(query: QueryTicketDto, userId: string, userRol: RolUsuario) {
    const {
      page = 1,
      limit = 20,
      estado,
      prioridad,
      tipoServicio,
      search,
      tecnicoId,
      clienteId,
      fechaDesde,
      fechaHasta,
    } = query;
    const skip = (page - 1) * limit;

    const where: TicketSearchWhere = { deletedAt: null };

    // TECNICO solo ve sus tickets asignados
    if (userRol === RolUsuario.TECNICO) {
      where.tecnicoId = userId;
    }

    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;
    if (tipoServicio) where.tipoServicio = tipoServicio;
    if (tecnicoId && userRol !== RolUsuario.TECNICO)
      where.tecnicoId = tecnicoId;
    if (clienteId) where.clienteId = clienteId;

    if (fechaDesde || fechaHasta) {
      const createdAt: { gte?: Date; lt?: Date } = {};

      if (fechaDesde) {
        createdAt.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      }

      if (fechaHasta) {
        const nextDay = new Date(`${fechaHasta}T00:00:00.000Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        createdAt.lt = nextDay;
      }

      where.createdAt = createdAt;
    }

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { titulo: { contains: search, mode: 'insensitive' } },
        { cliente: { nombre: { contains: search, mode: 'insensitive' } } },
        { cliente: { apellido: { contains: search, mode: 'insensitive' } } },
        { cliente: { razonSocial: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              razonSocial: true,
            },
          },
          tecnico: { select: { id: true, nombre: true } },
          equipo: { select: { id: true, numeroSerie: true } },
          clienteEquipo: {
            select: {
              id: true,
              numeroSerie: true,
              nombre: true,
              marca: true,
              modelo: true,
            },
          },
          _count: { select: { detalles: true, adjuntos: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  // ═══════════════════════════════════════════
  //  OBTENER TICKET POR ID
  // ═══════════════════════════════════════════

  async findOne(id: string, userId: string, userRol: RolUsuario) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            razonSocial: true,
            dni: true,
            ruc: true,
            telefono: true,
            email: true,
          },
        },
        equipo: {
          select: {
            id: true,
            numeroSerie: true,
            producto: {
              select: {
                id: true,
                nombre: true,
                modelo: true,
                modeloCatalogoId: true,
                modeloCatalogo: { select: { id: true, nombre: true } },
              },
            },
          },
        },
        clienteEquipo: {
          select: {
            id: true,
            numeroSerie: true,
            nombre: true,
            marca: true,
            modelo: true,
          },
        },
        tecnico: { select: { id: true, nombre: true, email: true } },
        creadoPor: { select: { id: true, nombre: true } },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                tipo: true,
                requiereRepuestos: true,
                precioVenta: true,
              },
            },
          },
        },
        adjuntos: true,
        casosGarantia: {
          orderBy: { createdAt: 'desc' },
          include: {
            garantia: {
              select: {
                id: true,
                codigoQR: true,
                fechaInicio: true,
                fechaFin: true,
                cobertura: true,
                estado: true,
              },
            },
          },
        },
        historial: {
          orderBy: { createdAt: 'desc' },
          include: {
            usuario: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} no encontrado`);
    }

    // TECNICO solo puede ver sus tickets
    if (userRol === RolUsuario.TECNICO && ticket.tecnicoId !== userId) {
      throw new ForbiddenException('No tiene permiso para ver este ticket');
    }

    const garantiasActuales = ticket.equipoId
      ? await this.prisma.garantia.findMany({
          where: {
            equipoId: ticket.equipoId,
            estado: {
              in: [EstadoGarantia.ACTIVA, EstadoGarantia.PENDIENTE_COMPLETAR],
            },
          },
          orderBy: { fechaFin: 'desc' },
          select: {
            id: true,
            codigoQR: true,
            fechaInicio: true,
            fechaFin: true,
            cobertura: true,
            exclusiones: true,
            estado: true,
          },
        })
      : [];
    const now = new Date();
    const garantiaActual =
      garantiasActuales.find(
        (garantia) =>
          garantia.estado === EstadoGarantia.ACTIVA && garantia.fechaFin >= now,
      ) ??
      garantiasActuales.find(
        (garantia) => garantia.estado === EstadoGarantia.ACTIVA,
      ) ??
      garantiasActuales[0] ??
      null;
    const garantiaActualConVigencia = garantiaActual
      ? {
          ...garantiaActual,
          vigente:
            garantiaActual.estado === EstadoGarantia.ACTIVA &&
            garantiaActual.fechaFin >= now,
        }
      : null;

    // Renombrar relación Prisma `casosGarantia` -> `casos` para el contrato API
    const { casosGarantia, ...rest } = ticket;
    return {
      data: {
        ...rest,
        casos: casosGarantia,
        garantiaActual: garantiaActualConVigencia,
      },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  // ═══════════════════════════════════════════
  //  ACTUALIZAR TICKET
  // ═══════════════════════════════════════════

  async update(
    id: string,
    dto: UpdateTicketDto,
    userId: string,
    userRol: RolUsuario,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, tipo: true } },
          },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} no encontrado`);
    }

    const ticketEstado = ticket.estado as EstadoTicket;
    if (
      ticketEstado === EstadoTicket.CERRADO ||
      ticketEstado === EstadoTicket.CANCELADO
    ) {
      throw new BadRequestException(
        'No se puede modificar un ticket cerrado o cancelado',
      );
    }

    // TECNICO solo puede actualizar sus tickets
    if (userRol === RolUsuario.TECNICO && ticket.tecnicoId !== userId) {
      throw new ForbiddenException(
        'No tiene permiso para modificar este ticket',
      );
    }

    const nextClienteId = dto.clienteId ?? ticket.clienteId;
    const nextEquipoId =
      dto.equipoId !== undefined ? dto.equipoId : ticket.equipoId;
    const nextClienteEquipoId =
      dto.clienteEquipoId !== undefined
        ? dto.clienteEquipoId
        : ticket.clienteEquipoId;

    if (nextEquipoId && nextClienteEquipoId) {
      throw new BadRequestException(
        'Selecciona un equipo propio o un equipo del cliente, no ambos',
      );
    }

    if (dto.clienteId) {
      const cliente = await this.prisma.cliente.findFirst({
        where: { id: dto.clienteId, deletedAt: null },
        select: { id: true },
      });
      if (!cliente) {
        throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado`);
      }
    }

    if (nextEquipoId) {
      await this.validateEquipoPropioAsignadoCliente(
        nextEquipoId,
        nextClienteId,
      );
    }

    if (nextClienteEquipoId) {
      const equipoCliente = await this.prisma.equipoClienteActivo.findFirst({
        where: {
          id: nextClienteEquipoId,
          clienteId: nextClienteId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!equipoCliente) {
        throw new NotFoundException(
          `Equipo de cliente ${nextClienteEquipoId} no encontrado para este cliente`,
        );
      }
    }

    // Registrar cambios en historial
    const camposTracked: TicketTrackedField[] = [
      'estado',
      'prioridad',
      'tecnicoId',
      'tipoServicio',
    ];
    const historialEntries: Array<{
      ticketId: string;
      usuarioId: string;
      campo: string;
      valorAntes: string | null;
      valorDespues: string | null;
    }> = [];

    const ticketValues = ticket as TicketTrackedValues;
    const dtoValues = dto as TicketTrackedValues;

    for (const campo of camposTracked) {
      const nextValue = dtoValues[campo];
      if (nextValue !== undefined && nextValue !== ticketValues[campo]) {
        historialEntries.push({
          ticketId: id,
          usuarioId: userId,
          campo,
          valorAntes: ticketValues[campo]?.toString() ?? null,
          valorDespues: nextValue?.toString() ?? null,
        });
      }
    }

    const { fechaPromesa, detalles: _ignoreDetalles, ...rest } = dto;
    void _ignoreDetalles;
    const updateData: TicketUpdateInput = { ...rest };
    if (fechaPromesa !== undefined) {
      updateData.fechaPromesa = fechaPromesa ? new Date(fechaPromesa) : null;
    }
    const debeRevertirStock = dto.estado === EstadoTicket.CANCELADO;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.ticket.update({
        where: { id },
        data: updateData,
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              razonSocial: true,
              celular: true,
              telefono: true,
            },
          },
          tecnico: { select: { id: true, nombre: true } },
          equipo: { select: { id: true, numeroSerie: true } },
          clienteEquipo: {
            select: {
              id: true,
              numeroSerie: true,
              nombre: true,
              marca: true,
              modelo: true,
            },
          },
        },
      });

      if (debeRevertirStock) {
        await this.revertirConsumosTicket(
          tx,
          ticket,
          ticket.detalles,
          userId,
          `Anulación ticket ${ticket.codigo}`,
        );
      }

      if (historialEntries.length > 0) {
        await tx.historialTicket.createMany({ data: historialEntries });
      }

      return result;
    });

    this.logger.log(
      `Ticket ${ticket.codigo} actualizado por usuario ${userId}`,
    );

    // Emit real-time event
    const payload: TicketEventPayload = {
      ticketId: updated.id,
      codigo: ticket.codigo,
      titulo: updated.titulo,
      estado: updated.estado as EstadoTicket,
      prioridad: updated.prioridad as PrioridadTicket,
      tipoServicio: updated.tipoServicio as TipoServicio,
      tecnicoId: updated.tecnicoId,
      tecnicoNombre: updated.tecnico?.nombre,
      clienteNombre: updated.cliente?.nombre,
    };
    this.events.emitToRoles(
      [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
      SocketEvents.TICKET_UPDATED,
      payload,
    );
    if (updated.tecnicoId) {
      this.events.emitToUser(
        updated.tecnicoId,
        SocketEvents.TICKET_UPDATED,
        payload,
      );
    }

    return { data: updated, meta: { timestamp: new Date().toISOString() } };
  }

  // ═══════════════════════════════════════════
  //  AGREGAR DETALLE (SERVICIO O REPUESTO)
  // ═══════════════════════════════════════════

  async addDetalle(
    ticketId: string,
    dto: AddDetalleTicketDto,
    userId: string,
    userRol: RolUsuario,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
      include: {
        equipo: {
          select: {
            productoId: true,
            producto: { select: { modeloCatalogoId: true } },
          },
        },
        clienteEquipo: {
          select: {
            productoId: true,
            producto: { select: { modeloCatalogoId: true } },
          },
        },
        casosGarantia: {
          where: { aceptada: true },
          select: { id: true },
          take: 1,
        },
        detalles: {
          include: {
            producto: { select: { tipo: true, requiereRepuestos: true } },
          },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }
    const ticketEstado = ticket.estado as EstadoTicket;
    if (
      ticketEstado === EstadoTicket.CERRADO ||
      ticketEstado === EstadoTicket.CANCELADO
    ) {
      throw new BadRequestException(
        'No se pueden agregar lineas a un ticket cerrado o cancelado',
      );
    }
    if (userRol === RolUsuario.TECNICO && ticket.tecnicoId !== userId) {
      throw new ForbiddenException(
        'No tiene permiso para modificar este ticket',
      );
    }

    // Validar que el producto existe
    const producto = await this.prisma.producto.findFirst({
      where: { id: dto.productoId, deletedAt: null, activo: true },
      include: {
        modelosCompatibles: { select: { modeloCatalogoId: true } },
      },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${dto.productoId} no encontrado`);
    }

    // Solo los items marcados explicitamente como SERVICIO saltan stock.
    const esServicio = producto.tipo === 'SERVICIO';

    if (!esServicio) {
      const permiteRepuestos = ticket.detalles.some(
        (detalle) =>
          detalle.producto?.tipo === 'SERVICIO' &&
          detalle.producto.requiereRepuestos,
      );
      if (!permiteRepuestos) {
        throw new BadRequestException(
          'No se pueden agregar repuestos: el ticket no tiene un servicio que requiera repuestos',
        );
      }
    }

    // Validar compatibilidad si el ticket tiene equipo (solo para repuestos físicos)
    const equipoModeloCatalogoId =
      ticket.equipo?.producto?.modeloCatalogoId ??
      ticket.clienteEquipo?.producto?.modeloCatalogoId ??
      null;
    const productoEquipoId =
      ticket.equipo?.productoId ?? ticket.clienteEquipo?.productoId ?? null;
    if (!esServicio && equipoModeloCatalogoId) {
      const compatible = producto.modelosCompatibles.some(
        (item) => item.modeloCatalogoId === equipoModeloCatalogoId,
      );
      if (!compatible) {
        throw new BadRequestException(
          'El repuesto no es compatible con el modelo del equipo asociado al ticket',
        );
      }
    } else if (!esServicio && productoEquipoId) {
      const compatibleLegacy = await this.prisma.compatibilidad.findUnique({
        where: {
          repuestoId_modeloId: {
            repuestoId: dto.productoId,
            modeloId: productoEquipoId,
          },
        },
      });
      if (!compatibleLegacy) {
        throw new BadRequestException(
          'El repuesto no es compatible con el modelo del equipo asociado al ticket',
        );
      }
    }

    const precioUnitario = dto.precioUnitario ?? +(producto.precioVenta ?? 0);
    const cubiertoGarantia =
      dto.cubiertoGarantia ?? (ticket.casosGarantia?.length ?? 0) > 0;

    // Branch SERVICIO: no toca stock, solo crea detalle e historial
    if (esServicio) {
      const detalle = await this.prisma.$transaction(async (tx) => {
        const created = await tx.detalleTicket.create({
          data: {
            ticketId,
            productoId: dto.productoId,
            cantidad: dto.cantidad,
            precioUnitario,
            cubiertoGarantia,
            notas: dto.notas,
          },
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                tipo: true,
                requiereRepuestos: true,
                precioVenta: true,
              },
            },
          },
        });

        await tx.historialTicket.create({
          data: {
            ticketId,
            usuarioId: userId,
            campo: 'servicio',
            valorAntes: null,
            valorDespues: `${dto.cantidad}x ${created.producto.nombre}`,
            notas: dto.notas ?? null,
          },
        });

        await this.marcarTicketEnProcesoPorActividad(
          tx,
          ticket,
          userId,
          `Ticket marcado en proceso por registro de servicio`,
        );

        return created;
      });

      this.logger.log(
        `Servicio agregado al ticket ${ticket.codigo} por usuario ${userId}`,
      );
      return { data: detalle, meta: { timestamp: new Date().toISOString() } };
    }

    // Determinar almacén: usar el proporcionado o el principal
    let almacenId = dto.almacenId;
    if (!almacenId) {
      const almacenPrincipal =
        await this.inventarioService.ensurePrincipalAlmacen();
      almacenId = almacenPrincipal.id;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const decrementResult = await tx.almacenStock.updateMany({
        where: {
          almacenId,
          productoId: dto.productoId,
          cantidad: { gte: dto.cantidad },
        },
        data: { cantidad: { decrement: dto.cantidad } },
      });

      if (decrementResult.count !== 1) {
        const stockDisponible = await tx.almacenStock.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: almacenId,
              productoId: dto.productoId,
            },
          },
          select: { cantidad: true },
        });
        const disponible = stockDisponible?.cantidad ?? 0;
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${disponible}, solicitado: ${dto.cantidad}`,
        );
      }

      const stockActualizado = await tx.almacenStock.findUnique({
        where: {
          almacenId_productoId: {
            almacenId: almacenId,
            productoId: dto.productoId,
          },
        },
        select: { cantidad: true },
      });
      const cantidadPosterior = stockActualizado?.cantidad ?? 0;
      const cantidadAnterior = cantidadPosterior + dto.cantidad;

      const detalle = await tx.detalleTicket.create({
        data: {
          ticketId,
          productoId: dto.productoId,
          cantidad: dto.cantidad,
          precioUnitario,
          cubiertoGarantia,
          notas: dto.notas,
        },
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              sku: true,
              tipo: true,
              requiereRepuestos: true,
              precioVenta: true,
            },
          },
        },
      });

      // Crear movimiento de stock tipo CONSUMO_SOPORTE
      await tx.movimientoStock.create({
        data: {
          tipo: TipoMovimiento.CONSUMO_SOPORTE,
          productoId: dto.productoId,
          almacenOrigenId: almacenId,
          cantidad: dto.cantidad,
          cantidadAnterior,
          cantidadPosterior,
          costoUnitario: precioUnitario,
          referenciaId: ticketId,
          referenciaTipo: 'TICKET',
          usuarioId: userId,
          justificacion: `Consumo soporte ${ticket.codigo}: ${dto.cantidad}x ${detalle.producto.nombre}`,
        },
      });

      // Historial
      await tx.historialTicket.create({
        data: {
          ticketId,
          usuarioId: userId,
          campo: 'repuesto',
          valorAntes: null,
          valorDespues: `${dto.cantidad}x ${detalle.producto.nombre}`,
          notas: dto.notas ?? null,
        },
      });

      await this.marcarTicketEnProcesoPorActividad(
        tx,
        ticket,
        userId,
        `Ticket marcado en proceso por consumo de repuesto`,
      );

      return detalle;
    });

    this.logger.log(
      `Repuesto agregado al ticket ${ticket.codigo} por usuario ${userId}`,
    );
    return { data: result, meta: { timestamp: new Date().toISOString() } };
  }

  async addRepuesto(ticketId: string, dto: AddRepuestoDto, userId: string) {
    return this.addDetalle(ticketId, dto, userId, RolUsuario.ADMIN);
  }

  // ═══════════════════════════════════════════
  //  ADJUNTOS
  // ═══════════════════════════════════════════

  async addAdjunto(
    ticketId: string,
    file: { url: string; nombre: string; tipo: string; tamano?: number },
    userId: string,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }

    if (ticket.tecnicoId !== userId) {
      throw new ForbiddenException(
        'Solo el técnico asignado al ticket puede subir adjuntos',
      );
    }

    const adjunto = await this.prisma.adjuntoTicket.create({
      data: {
        ticketId,
        url: file.url,
        nombre: file.nombre,
        tipo: file.tipo,
        tamano: file.tamano,
      },
    });

    await this.prisma.historialTicket.create({
      data: {
        ticketId,
        usuarioId: userId,
        campo: 'adjunto',
        valorAntes: null,
        valorDespues: file.nombre,
        notas: 'Archivo adjuntado',
      },
    });

    this.logger.log(
      `Adjunto "${file.nombre}" agregado al ticket ${ticket.codigo}`,
    );
    return { data: adjunto, meta: { timestamp: new Date().toISOString() } };
  }

  async removeAdjunto(ticketId: string, adjuntoId: string, userId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }
    if (ticket.tecnicoId !== userId) {
      throw new ForbiddenException(
        'Solo el técnico asignado al ticket puede eliminar adjuntos',
      );
    }

    const adjunto = await this.prisma.adjuntoTicket.findFirst({
      where: { id: adjuntoId, ticketId },
    });
    if (!adjunto) {
      throw new NotFoundException(`Adjunto ${adjuntoId} no encontrado`);
    }

    await this.prisma.adjuntoTicket.delete({ where: { id: adjuntoId } });

    await this.prisma.historialTicket.create({
      data: {
        ticketId,
        usuarioId: userId,
        campo: 'adjunto',
        valorAntes: adjunto.nombre,
        valorDespues: null,
        notas: 'Archivo eliminado',
      },
    });

    this.logger.log(
      `Adjunto "${adjunto.nombre}" eliminado del ticket ${ticket.codigo}`,
    );
    return {
      data: { id: adjuntoId, deleted: true },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  // ═══════════════════════════════════════════
  //  ACTUALIZAR DETALLE (toggle garantía / precio / notas)
  // ═══════════════════════════════════════════

  async updateDetalle(
    ticketId: string,
    detalleId: string,
    dto: UpdateDetalleTicketDto,
    userId: string,
    userRol: RolUsuario,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }
    const ticketEstado = ticket.estado as EstadoTicket;
    if (
      ticketEstado === EstadoTicket.CERRADO ||
      ticketEstado === EstadoTicket.CANCELADO
    ) {
      throw new BadRequestException(
        'No se pueden modificar detalles de un ticket cerrado o cancelado',
      );
    }
    if (userRol === RolUsuario.TECNICO && ticket.tecnicoId !== userId) {
      throw new ForbiddenException(
        'No tiene permiso para modificar este ticket',
      );
    }

    const detalle = await this.prisma.detalleTicket.findFirst({
      where: { id: detalleId, ticketId },
      include: {
        producto: { select: { id: true, tipo: true } },
      },
    });
    if (!detalle) {
      throw new NotFoundException(`Detalle ${detalleId} no encontrado`);
    }

    if (
      dto.cantidad !== undefined &&
      dto.cantidad !== detalle.cantidad &&
      detalle.producto?.tipo !== TipoProducto.SERVICIO
    ) {
      throw new BadRequestException(
        'Para cambiar la cantidad de un repuesto, elimina la línea y agrégala nuevamente para recalcular inventario',
      );
    }

    const updated = await this.prisma.detalleTicket.update({
      where: { id: detalleId },
      data: {
        cantidad: dto.cantidad,
        precioUnitario: dto.precioUnitario,
        cubiertoGarantia: dto.cubiertoGarantia,
        notas: dto.notas,
      },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            sku: true,
            tipo: true,
            requiereRepuestos: true,
            precioVenta: true,
          },
        },
      },
    });

    return { data: updated, meta: { timestamp: new Date().toISOString() } };
  }

  // ═══════════════════════════════════════════
  //  ELIMINAR DETALLE (revierte stock si era repuesto físico)
  // ═══════════════════════════════════════════

  async removeDetalle(
    ticketId: string,
    detalleId: string,
    userId: string,
    userRol: RolUsuario,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }
    const ticketEstado = ticket.estado as EstadoTicket;
    if (
      ticketEstado === EstadoTicket.CERRADO ||
      ticketEstado === EstadoTicket.CANCELADO
    ) {
      throw new BadRequestException(
        'No se pueden eliminar detalles de un ticket cerrado o cancelado',
      );
    }
    if (userRol === RolUsuario.TECNICO && ticket.tecnicoId !== userId) {
      throw new ForbiddenException(
        'No tiene permiso para modificar este ticket',
      );
    }

    const detalle = await this.prisma.detalleTicket.findFirst({
      where: { id: detalleId, ticketId },
      include: {
        producto: { select: { id: true, tipo: true, manejaInventario: true } },
      },
    });
    if (!detalle) {
      throw new NotFoundException(`Detalle ${detalleId} no encontrado`);
    }

    const esServicio = detalle.producto?.tipo === 'SERVICIO';

    await this.prisma.$transaction(async (tx) => {
      if (!esServicio) {
        await this.revertirConsumosTicket(
          tx,
          ticket,
          [detalle],
          userId,
          `Reverso por eliminación de línea en ticket ${ticket.codigo}`,
        );
      }

      await tx.detalleTicket.delete({ where: { id: detalleId } });

      await tx.historialTicket.create({
        data: {
          ticketId,
          usuarioId: userId,
          campo: esServicio ? 'servicio' : 'repuesto',
          valorAntes: `${detalle.cantidad}`,
          valorDespues: null,
          notas: 'Línea eliminada',
        },
      });
    });

    return {
      data: { id: detalleId, message: 'Detalle eliminado' },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  // ═══════════════════════════════════════════
  //  CERRAR TICKET
  // ═══════════════════════════════════════════
  async cerrar(
    id: string,
    dto: CerrarTicketDto,
    userId: string,
    userRol: RolUsuario,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, tipo: true } },
          },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} no encontrado`);
    }

    const ticketEstado = ticket.estado as EstadoTicket;
    if (ticketEstado === EstadoTicket.CERRADO) {
      throw new BadRequestException('El ticket ya está cerrado');
    }
    if (ticketEstado === EstadoTicket.CANCELADO) {
      throw new BadRequestException('No se puede cerrar un ticket cancelado');
    }

    // TECNICO solo puede cerrar sus tickets
    if (userRol === RolUsuario.TECNICO && ticket.tecnicoId !== userId) {
      throw new ForbiddenException('No tiene permiso para cerrar este ticket');
    }

    // Auto-cálculo desde los detalles (servicios vs repuestos físicos):
    //   - SERVICIO  -> suma a mano de obra
    //   - resto     -> suma a repuestos
    //   - cubiertoGarantia=true -> NO suma (lo absorbe la garantía)
    let autoServicios = 0;
    let autoRepuestos = 0;
    for (const d of ticket.detalles) {
      if (d.cubiertoGarantia) continue;
      const sub = +d.precioUnitario * d.cantidad;
      if (d.producto?.tipo === 'SERVICIO') {
        autoServicios += sub;
      } else {
        autoRepuestos += sub;
      }
    }

    // Override manual del DTO; si no se envía, usamos el cálculo automático.
    const montoManoObra = dto.montoManoObra ?? +autoServicios.toFixed(2);
    const montoRepuestos = dto.montoRepuestos ?? +autoRepuestos.toFixed(2);
    const montoTotal =
      dto.montoTotal ?? +(montoManoObra + montoRepuestos).toFixed(2);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.ticket.update({
        where: { id },
        data: {
          estado: EstadoTicket.CERRADO,
          solucion: dto.solucion ?? ticket.solucion,
          montoManoObra,
          montoRepuestos,
          montoTotal,
          fechaCierre: new Date(),
          firmaCliente: dto.firmaCliente,
          firmaFecha: dto.firmaCliente ? new Date() : undefined,
          firmaGeoLat: dto.firmaGeoLat,
          firmaGeoLng: dto.firmaGeoLng,
          notas: dto.notas ?? ticket.notas,
        },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              celular: true,
              telefono: true,
            },
          },
          tecnico: { select: { id: true, nombre: true } },
        },
      });

      await tx.historialTicket.create({
        data: {
          ticketId: id,
          usuarioId: userId,
          campo: 'estado',
          valorAntes: ticket.estado,
          valorDespues: EstadoTicket.CERRADO,
          notas: `Ticket cerrado. Monto total: S/ ${montoTotal}`,
        },
      });

      return result;
    });

    this.logger.log(
      `Ticket ${ticket.codigo} cerrado por usuario ${userId}. Total: S/ ${montoTotal}`,
    );

    // Emit real-time event
    const payload: TicketEventPayload = {
      ticketId: updated.id,
      codigo: ticket.codigo,
      titulo: ticket.titulo,
      estado: EstadoTicket.CERRADO,
      prioridad: ticket.prioridad as PrioridadTicket,
      tipoServicio: ticket.tipoServicio as TipoServicio,
      tecnicoId: ticket.tecnicoId,
      tecnicoNombre: updated.tecnico?.nombre,
      clienteNombre: updated.cliente?.nombre,
    };
    this.events.emitToRoles(
      [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
      SocketEvents.TICKET_CLOSED,
      payload,
    );
    if (ticket.tecnicoId) {
      this.events.emitToUser(
        ticket.tecnicoId,
        SocketEvents.TICKET_CLOSED,
        payload,
      );
    }

    await this.notifyClienteWhatsapp({
      cliente: updated.cliente,
      codigo: ticket.codigo,
      titulo: ticket.titulo,
      estado: EstadoTicket.CERRADO,
      extra: `Total: S/ ${montoTotal}. Gracias por confiar en nosotros.`,
    });

    return { data: updated, meta: { timestamp: new Date().toISOString() } };
  }

  // ═══════════════════════════════════════════
  //  CONSULTA PÚBLICA POR CÓDIGO
  // ═══════════════════════════════════════════

  async findByCodigo(codigo: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { codigo, deletedAt: null },
      select: {
        codigo: true,
        titulo: true,
        estado: true,
        prioridad: true,
        tipoServicio: true,
        fechaRecepcion: true,
        fechaPromesa: true,
        fechaCierre: true,
        historial: {
          select: {
            campo: true,
            valorAntes: true,
            valorDespues: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket con código ${codigo} no encontrado`);
    }

    return { data: ticket, meta: { timestamp: new Date().toISOString() } };
  }

  // ═══════════════════════════════════════════
  //  ELIMINAR TICKET
  // ═══════════════════════════════════════════

  async remove(id: string, userId: string, userRol: RolUsuario) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, tipo: true } },
          },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} no encontrado`);
    }

    if (userRol === RolUsuario.TECNICO && ticket.tecnicoId !== userId) {
      throw new ForbiddenException(
        'No tiene permiso para eliminar este ticket',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.adjuntoTicket.deleteMany({ where: { ticketId: id } });
      await tx.casoGarantia.deleteMany({ where: { ticketId: id } });
      await tx.historialTicket.deleteMany({ where: { ticketId: id } });
      await tx.detalleTicket.deleteMany({ where: { ticketId: id } });
      await tx.ticket.delete({ where: { id } });
    });

    return {
      data: { message: `Ticket ${ticket.codigo} eliminado definitivamente` },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  // ═══════════════════════════════════════════
  //  HELPERS PRIVADOS
  // ═══════════════════════════════════════════

  private async marcarTicketEnProcesoPorActividad(
    tx: SoporteEstadoTx,
    ticket: { id: string; estado: string | null },
    userId: string,
    notas: string,
  ) {
    if (ticket.estado === EstadoTicket.EN_PROCESO) return;

    await tx.ticket.update({
      where: { id: ticket.id },
      data: { estado: EstadoTicket.EN_PROCESO },
    });

    await tx.historialTicket.create({
      data: {
        ticketId: ticket.id,
        usuarioId: userId,
        campo: 'estado',
        valorAntes: ticket.estado,
        valorDespues: EstadoTicket.EN_PROCESO,
        notas,
      },
    });
  }

  private async revertirConsumosTicket(
    tx: SoporteStockTx,
    ticket: { id: string; codigo: string },
    detalles: ReversibleDetalleTicket[],
    userId: string,
    justificacion: string,
  ) {
    const cantidadesPorProducto = new Map<string, number>();

    for (const detalle of detalles) {
      if (
        !detalle.productoId ||
        detalle.producto?.tipo === TipoProducto.SERVICIO
      ) {
        continue;
      }

      const cantidad = Number(detalle.cantidad);
      if (cantidad <= 0) continue;

      cantidadesPorProducto.set(
        detalle.productoId,
        (cantidadesPorProducto.get(detalle.productoId) ?? 0) + cantidad,
      );
    }

    for (const [productoId, cantidadTotal] of cantidadesPorProducto) {
      let cantidadPendiente = cantidadTotal;
      const movimientosConsumo = await tx.movimientoStock.findMany({
        where: {
          referenciaId: ticket.id,
          referenciaTipo: 'TICKET',
          productoId,
          tipo: TipoMovimiento.CONSUMO_SOPORTE,
          almacenOrigenId: { not: null },
        },
        orderBy: { createdAt: 'asc' },
      });
      const movimientosReverso = await tx.movimientoStock.findMany({
        where: {
          referenciaId: ticket.id,
          referenciaTipo: 'TICKET',
          productoId,
          tipo: TipoMovimiento.AJUSTE_POSITIVO,
          almacenDestinoId: { not: null },
        },
        orderBy: { createdAt: 'asc' },
      });
      const reversadoPorAlmacen = new Map<string, number>();

      for (const movimiento of movimientosReverso) {
        if (!movimiento.almacenDestinoId) continue;
        const key = `${productoId}:${movimiento.almacenDestinoId}`;
        reversadoPorAlmacen.set(
          key,
          (reversadoPorAlmacen.get(key) ?? 0) + Number(movimiento.cantidad),
        );
      }

      for (const movimiento of movimientosConsumo) {
        if (cantidadPendiente <= 0) break;
        if (!movimiento.almacenOrigenId) continue;

        const cantidadMovimiento = Number(movimiento.cantidad);
        const key = `${productoId}:${movimiento.almacenOrigenId}`;
        const cantidadYaReversada = reversadoPorAlmacen.get(key) ?? 0;
        const cantidadDisponibleMovimiento = Math.max(
          0,
          cantidadMovimiento - cantidadYaReversada,
        );
        reversadoPorAlmacen.set(
          key,
          Math.max(0, cantidadYaReversada - cantidadMovimiento),
        );

        const cantidadReversa = Math.min(
          cantidadPendiente,
          cantidadDisponibleMovimiento,
        );
        if (cantidadReversa <= 0) continue;

        await tx.almacenStock.update({
          where: {
            almacenId_productoId: {
              almacenId: movimiento.almacenOrigenId,
              productoId,
            },
          },
          data: { cantidad: { increment: cantidadReversa } },
        });

        const stockActualizado = await tx.almacenStock.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: movimiento.almacenOrigenId,
              productoId,
            },
          },
          select: { cantidad: true },
        });
        const cantidadPosterior = stockActualizado?.cantidad ?? 0;
        const cantidadAnterior = cantidadPosterior - cantidadReversa;

        await tx.movimientoStock.create({
          data: {
            tipo: TipoMovimiento.AJUSTE_POSITIVO,
            productoId,
            almacenDestinoId: movimiento.almacenOrigenId,
            cantidad: cantidadReversa,
            cantidadAnterior,
            cantidadPosterior,
            costoUnitario: movimiento.costoUnitario,
            referenciaId: ticket.id,
            referenciaTipo: 'TICKET',
            usuarioId: userId,
            justificacion,
          },
        });

        cantidadPendiente -= cantidadReversa;
      }

      if (cantidadPendiente > 0) {
        this.logger.warn(
          `No se pudo revertir todo el consumo de ${productoId} en ticket ${ticket.codigo}. Pendiente: ${cantidadPendiente}`,
        );
      }
    }
  }

  private async generarCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;

    const lastTicket = await this.prisma.ticket.findFirst({
      where: { codigo: { startsWith: prefix } },
      orderBy: { codigo: 'desc' },
      select: { codigo: true },
    });

    let nextNum = 1;
    if (lastTicket) {
      const lastNum = parseInt(lastTicket.codigo.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }

    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  }
}
