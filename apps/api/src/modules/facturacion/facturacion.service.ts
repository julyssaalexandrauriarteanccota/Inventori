import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue, type JobsOptions } from 'bullmq';
import { randomUUID } from 'crypto';
import type { Prisma } from '../../../generated/prisma/client';
import {
  AmbienteSunat,
  TipoDocumento,
  EstadoComprobante,
  EstadoVenta,
  EstadoFacturacionVenta,
  EstadoComunicacionBaja,
  EventoEnvioComprobante,
  TipoEnvio,
  TipoAfectacionIgv,
  TipoFiscalProducto,
  MOTIVOS_NC_TODOS,
  MOTIVOS_NC_REGULAR,
  MOTIVOS_NC_EXCEPCIONAL,
  type MotivoNCCodigo,
  esMotivoNcExcepcional,
  PLAZO_NC_EXCEPCIONAL_DIAS_HABILES,
  plazoDiasHabilesVencido,
  MOTIVOS_ND,
  MOTIVOS_ND_TODOS,
  type MotivoNDCodigo,
  calcularDeadlineComunicacionBaja,
  calcularDeadlineEnvio as calcularDeadlineEnvioShared,
  normalizeSunatUnidadMedidaCode,
  type ElegibilidadComprobante,
  type PropositoElegibilidadComprobante,
  type BloqueoElegibilidad,
  type MotivoAplicable,
  type OperacionEnProcesoElegibilidad,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { ComprobanteDetalleService } from './comprobante-detalle.service';
import { ComprobanteSnapshotService } from './comprobante-snapshot.service';
import { ComprobantePdfService } from './comprobante-pdf.service';
import { ComprobanteEmailService } from './comprobante-email.service';
import { FiscalStorageService } from './fiscal-storage.service';
import { SerieDocumentoService } from './serie-documento.service';
import { SunatDirectGateway } from './sunat-direct.gateway';
import { ValidacionFiscalService } from './validacion-fiscal.service';
import {
  EmitirComprobanteDto,
  CreateNotaCreditoDto,
  CreateNotaDebitoDto,
  QueryComprobanteDto,
  UpdateConfigEmpresaDto,
} from './dto';

@Injectable()
export class FacturacionService {
  private readonly logger = new Logger(FacturacionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('cola-envio-cpe') private readonly envioCpeQueue: Queue,
    @InjectQueue('cola-baja') private readonly bajaQueue: Queue,
    private readonly comprobanteDetalleService: ComprobanteDetalleService,
    private readonly snapshotService: ComprobanteSnapshotService,
    private readonly serieDocumentoService: SerieDocumentoService,
    private readonly configService: ConfigService,
    private readonly sunatGateway: SunatDirectGateway,
    private readonly storage: FiscalStorageService,
    private readonly pdfService: ComprobantePdfService,
    private readonly emailService: ComprobanteEmailService,
    private readonly validacionFiscalService: ValidacionFiscalService,
  ) {}

  /**
   * Doc 10 §7 — preview de validación pre-emisión. Permite a la UI mostrar
   * el modal de bloqueantes/advertencias antes de invocar `emitirComprobante`.
   */
  async validarPreEmision(ventaId: string, tipo: TipoDocumento) {
    return this.validacionFiscalService.validar({ ventaId, tipo });
  }

  // ── Emitir comprobante ──────────────────────────────────────────────

  async emitirComprobante(dto: EmitirComprobanteDto, emitidoPor = 'system') {
    this.assertTipoEmisionDirecta(dto.tipo);
    const venta = await this.prisma.venta.findUnique({
      where: { id: dto.ventaId },
      include: {
        detalles: {
          include: { producto: { include: { unidadMedida: true } } },
        },
        cliente: true,
      },
    });

    if (!venta) {
      throw new NotFoundException(`Venta ${dto.ventaId} no encontrada`);
    }

    const comprobanteExistente = await this.prisma.comprobante.findUnique({
      where: { ventaId: dto.ventaId },
    });

    if (comprobanteExistente) {
      throw new ConflictException(
        `La venta ${dto.ventaId} ya tiene comprobante ${comprobanteExistente.numero}`,
      );
    }

    // Doc 10 §7 — validar pre-emisión SIEMPRE antes de tomar correlativo.
    // Bloqueantes abortan; advertencias requieren confirmación explícita.
    const validacion = await this.validacionFiscalService.validar({
      ventaId: dto.ventaId,
      tipo: dto.tipo,
    });
    if (validacion.bloqueantes.length > 0) {
      throw new BadRequestException({
        code: 'VALIDACION_FISCAL_BLOQUEANTE',
        message: 'No se puede emitir: hay validaciones bloqueantes',
        bloqueantes: validacion.bloqueantes,
        advertencias: validacion.advertencias,
      });
    }
    if (validacion.advertencias.length > 0 && !dto.confirmarAdvertencias) {
      throw new BadRequestException({
        code: 'VALIDACION_FISCAL_ADVERTENCIA',
        message:
          'Hay advertencias pendientes de confirmación. Reenviar con confirmarAdvertencias=true.',
        bloqueantes: [],
        advertencias: validacion.advertencias,
      });
    }

    const comprobante = await this.prisma.$transaction((tx) =>
      this.crearComprobantePendienteEnTx(tx, venta, dto, emitidoPor),
    );
    await this.encolarComprobanteSunat(comprobante);

    this.logger.log(
      `Comprobante ${comprobante.numero} creado PENDIENTE y encolado para SUNAT`,
    );

    return comprobante;
  }

  async crearComprobantePendienteEnTx(
    tx: Prisma.TransactionClient,
    venta: {
      id: string;
      estado: unknown;
      subtotal: unknown;
      cliente: {
        ruc?: string | null;
        razonSocial?: string | null;
        nombre?: string | null;
        apellido?: string | null;
        dni?: string | null;
        direccion?: string | null;
      };
      detalles: Array<{
        productoId: string;
        cantidad: number;
        precioUnitario: unknown;
        descuento?: unknown;
        subtotal: unknown;
        producto: {
          id: string;
          sku: string;
          nombre: string;
          descripcion?: string | null;
          tipo: string;
          unidadMedida?: { codigo?: string | null } | null;
        };
      }>;
    },
    dto: EmitirComprobanteDto,
    emitidoPor = 'system',
  ) {
    this.assertTipoEmisionDirecta(dto.tipo);

    const estadosPermitidos = [
      EstadoVenta.ORDEN_CONFIRMADA,
      EstadoVenta.ENTREGADA,
    ];
    if (!estadosPermitidos.includes(venta.estado as EstadoVenta)) {
      throw new BadRequestException(
        `Venta en estado ${String(venta.estado)} no puede ser facturada. Estados permitidos: ${estadosPermitidos.join(', ')}`,
      );
    }

    this.validateClienteForComprobante(venta.cliente, dto.tipo);

    const config = await tx.configEmpresa.findFirst();
    if (!config) {
      throw new BadRequestException(
        'Configuración de empresa no encontrada. Configure la empresa primero.',
      );
    }

    const configFiscal = await tx.configEmpresaFiscal.findFirst();
    const ambiente = this.resolveAmbienteFromConfig(configFiscal);
    const serieInfo = await this.serieDocumentoService.next(
      tx,
      dto.tipo,
      config,
      ambiente,
      dto.serieDocumentoId,
    );

    const porcentajeIGV = Number(config.porcentajeIGV);
    // Doc 06 §4 — reconciliar totales del Comprobante con la suma de líneas
    // del ComprobanteDetalle. Si calculáramos `igv = subtotal * 0.18` global
    // y luego cada línea con `igv_linea = base_linea * 0.18` redondeado, la
    // suma de líneas puede diferir del global por centavos (caso clásico:
    // 5× S/ 0.85 → global=0.77 vs suma=0.75). SUNAT rechaza con código 2335
    // cuando `cbc:TaxAmount` global no coincide con Σ(cac:TaxTotal) por línea.
    const lineasSnapshot = this.snapshotService.buildDetalleSnapshots(
      venta,
      porcentajeIGV,
    );
    const subtotal = +lineasSnapshot
      .reduce((acc, l) => acc + Number(l.baseImponible), 0)
      .toFixed(2);
    const igv = +lineasSnapshot
      .reduce((acc, l) => acc + Number(l.igv), 0)
      .toFixed(2);
    const total = +(subtotal + igv).toFixed(2);
    const fechaEmision = new Date();

    const clienteSnapshot = this.snapshotService.buildClienteSnapshot(
      venta,
      dto.tipo,
    );
    const emisorSnapshot = this.snapshotService.buildEmisorSnapshot(
      config,
      configFiscal,
    );
    const snapshot = this.snapshotService.buildFiscalSnapshot({
      venta,
      tipoDocumento: dto.tipo,
      serie: serieInfo.serie,
      correlativo: serieInfo.correlativo,
      numero: serieInfo.numero,
      fechaEmision,
      subtotal,
      igv,
      total,
      porcentajeIGV,
      ambiente,
      config,
      configFiscal,
      observaciones: dto.observaciones,
    });

    const fechaVencimientoPlazo = calcularDeadlineEnvioShared(
      dto.tipo,
      fechaEmision,
    ).deadline;

    const nuevoComprobante = await tx.comprobante.create({
      data: {
        ventaId: venta.id,
        tipo: dto.tipo,
        serie: serieInfo.serie,
        correlativo: serieInfo.correlativo,
        numero: serieInfo.numero,
        ambiente,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        operationId: randomUUID(),
        tokenConsulta: randomUUID(),
        tokenConsultaCreatedAt: new Date(),
        ...clienteSnapshot,
        ...emisorSnapshot,
        subtotal,
        igv,
        total,
        estado: EstadoComprobante.PENDIENTE_ENVIO,
        fechaEmision,
        fechaVencimientoPlazo,
        emitidoPor,
        observaciones: this.normalizeOptionalText(dto.observaciones),
      },
    });

    await this.comprobanteDetalleService.createFromVenta(
      tx,
      nuevoComprobante.id,
      venta,
      porcentajeIGV,
    );

    await tx.venta.update({
      where: { id: venta.id },
      data: { estadoFacturacion: EstadoFacturacionVenta.EN_EMISION },
    });

    await tx.comprobanteEnvioLog.create({
      data: {
        comprobanteId: nuevoComprobante.id,
        tipo: TipoEnvio.ENVIO_INICIAL,
        tipoEvento: EventoEnvioComprobante.ENCOLADO,
        proveedor: 'SISTEMA',
        estado: EstadoComprobante.PENDIENTE_ENVIO,
        intento: 1,
        mensaje: `Comprobante ${nuevoComprobante.numero} encolado para SUNAT`,
        responseDescription: `Plazo legal hasta ${fechaVencimientoPlazo.toISOString()}`,
      },
    });

    return nuevoComprobante;
  }

  /**
   * Doc 05 §1 — Portal cliente: lookup público (sin auth) que sólo devuelve
   * metadatos no-sensibles. NO incluye snapshot ni detalles de productos.
   */
  async lookupPublicoComprobante(input: {
    rucEmisor: string;
    tipo: string;
    serie: string;
    correlativo: string;
  }) {
    const correlativoNum = Number(input.correlativo);
    if (!Number.isFinite(correlativoNum) || correlativoNum <= 0) {
      throw new BadRequestException('Correlativo inválido');
    }
    if (!input.rucEmisor || !/^\d{11}$/.test(input.rucEmisor)) {
      throw new BadRequestException('RUC emisor inválido');
    }
    if (!input.serie || !input.tipo) {
      throw new BadRequestException('Serie y tipo son obligatorios');
    }

    const comprobante = await this.prisma.comprobante.findFirst({
      where: {
        emisorRuc: input.rucEmisor,
        tipo: input.tipo as TipoDocumento,
        serie: input.serie,
        correlativo: correlativoNum,
      },
      select: {
        numero: true,
        tipo: true,
        serie: true,
        correlativo: true,
        estado: true,
        fechaEmision: true,
        cdrRecibidaAt: true,
        total: true,
        emisorRuc: true,
        emisorRazonSocial: true,
        clienteNombre: true,
        clienteDocTipo: true,
        clienteDocNum: true,
      },
    });

    if (!comprobante) {
      throw new NotFoundException('Comprobante no encontrado');
    }
    return comprobante;
  }

  async encolarComprobanteSunat(comprobante: {
    id: string;
    tipo: unknown;
    fechaEmision?: Date | null;
    fechaVencimientoPlazo?: Date | null;
  }) {
    const fechaEmision =
      comprobante.fechaEmision instanceof Date &&
      !Number.isNaN(comprobante.fechaEmision.getTime())
        ? comprobante.fechaEmision
        : new Date();
    const deadline = comprobante.fechaVencimientoPlazo
      ? comprobante.fechaVencimientoPlazo.toISOString()
      : this.calcularDeadlineEnvio(
          comprobante.tipo as TipoDocumento,
          fechaEmision,
        );
    await this.envioCpeQueue.add(
      'enviar-comprobante',
      {
        comprobanteId: comprobante.id,
        deadline,
      },
      this.sunatJobOptions(deadline, comprobante.id, 1),
    );
  }

  // ── Listar comprobantes ─────────────────────────────────────────────

  async findVentasPendientesEmision(query: {
    page?: number;
    limit?: number;
    search?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    totalMin?: number | string;
    totalMax?: number | string;
    estadoComercial?: EstadoVenta;
    vendedor?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;
    const where: Prisma.VentaWhereInput = {
      deletedAt: null,
      estado: { in: [EstadoVenta.ORDEN_CONFIRMADA, EstadoVenta.ENTREGADA] },
      estadoFacturacion: EstadoFacturacionVenta.SIN_COMPROBANTE,
      comprobante: null,
    };

    if (query.estadoComercial) {
      where.estado = query.estadoComercial;
    }

    const fechaDesde = this.parseDateStart(query.fechaDesde);
    const fechaHasta = this.parseDateEnd(query.fechaHasta);
    if (fechaDesde || fechaHasta) {
      where.createdAt = {
        ...(fechaDesde ? { gte: fechaDesde } : {}),
        ...(fechaHasta ? { lte: fechaHasta } : {}),
      };
    }

    const totalMin = this.parseMoneyFilter(query.totalMin);
    const totalMax = this.parseMoneyFilter(query.totalMax);
    if (totalMin !== undefined || totalMax !== undefined) {
      where.total = {
        ...(totalMin !== undefined ? { gte: totalMin } : {}),
        ...(totalMax !== undefined ? { lte: totalMax } : {}),
      };
    }

    if (query.vendedor) {
      where.usuario = {
        OR: [
          { nombre: { contains: query.vendedor, mode: 'insensitive' } },
          { apellido: { contains: query.vendedor, mode: 'insensitive' } },
          { email: { contains: query.vendedor, mode: 'insensitive' } },
        ],
      };
    }

    if (query.search) {
      where.OR = [
        { numero: { contains: query.search, mode: 'insensitive' } },
        {
          cliente: {
            OR: [
              {
                razonSocial: { contains: query.search, mode: 'insensitive' },
              },
              { nombre: { contains: query.search, mode: 'insensitive' } },
              { apellido: { contains: query.search, mode: 'insensitive' } },
              { ruc: { contains: query.search, mode: 'insensitive' } },
              { dni: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.venta.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          numero: true,
          createdAt: true,
          estado: true,
          estadoFacturacion: true,
          subtotal: true,
          igv: true,
          total: true,
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
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.venta.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findAll(query: QueryComprobanteDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.tipo) where.tipo = query.tipo;
    if (query.estado) where.estado = query.estado;

    if (query.search) {
      where.OR = [
        { numero: { contains: query.search, mode: 'insensitive' } },
        { serie: { contains: query.search, mode: 'insensitive' } },
        { clienteNombre: { contains: query.search, mode: 'insensitive' } },
        { clienteDocNum: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.comprobante.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { venta: { select: { id: true, numero: true } } },
      }),
      this.prisma.comprobante.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  // ── Obtener comprobante por ID ──────────────────────────────────────

  async findOne(id: string) {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id },
      include: {
        venta: {
          select: { id: true, numero: true, clienteId: true },
        },
        comprobanteOrigen: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            estado: true,
            total: true,
          },
        },
        detallesFiscales: { orderBy: { item: 'asc' } },
        // Doc 01 §arch — NC/ND son Comprobante con tipo discriminador,
        // recuperadas vía la self-rel `notas`. La UI espera dos arrays
        // separados por compatibilidad histórica.
        notas: {
          select: {
            id: true,
            tipo: true,
            numero: true,
            estado: true,
            total: true,
            motivoNota: true,
            motivoNotaDescripcion: true,
            fechaEmision: true,
          },
          orderBy: { fechaEmision: 'desc' },
        },
      },
    });

    if (!comprobante) {
      throw new NotFoundException(`Comprobante ${id} no encontrado`);
    }

    const notas = comprobante.notas ?? [];
    const notasCredito = notas
      .filter((n) => n.tipo === TipoDocumento.NOTA_CREDITO)
      .map((n) => ({
        id: n.id,
        numero: n.numero,
        estado: n.estado,
        total: Number(n.total),
        monto: Number(n.total),
        motivo: n.motivoNotaDescripcion ?? null,
        motivoCodigo: n.motivoNota ?? null,
        tipo: n.motivoNota ?? null,
      }));
    const notasDebito = notas
      .filter((n) => n.tipo === TipoDocumento.NOTA_DEBITO)
      .map((n) => ({
        id: n.id,
        numero: n.numero,
        estado: n.estado,
        total: Number(n.total),
        monto: Number(n.total),
        motivo: n.motivoNotaDescripcion ?? null,
        motivoCodigo: n.motivoNota ?? null,
      }));
    const detallesFiscales = (comprobante.detallesFiscales ?? []).map(
      (detalle) => ({
        ...detalle,
        descripcion: this.plainFiscalText(detalle.descripcion),
        cantidad: this.toNumber(detalle.cantidad),
        valorUnitario: this.toNumber(detalle.valorUnitario),
        precioUnitario: this.toNumber(detalle.precioUnitario),
        descuento: this.toNumber(detalle.descuento),
        baseImponible: this.toNumber(detalle.baseImponible),
        igv: this.toNumber(detalle.igv),
        igvMonto: this.toNumber(detalle.igv),
        total: this.toNumber(detalle.total),
        importeTotal: this.toNumber(detalle.total),
      }),
    );
    const snapshot = this.asRecord(comprobante.snapshot);
    const snapshotEmisorJson = this.asRecord(snapshot?.emisor) ?? {
      ruc: comprobante.emisorRuc,
      razonSocial: comprobante.emisorRazonSocial,
      nombreComercial: comprobante.emisorNombreComercial,
      direccionFiscal: {
        direccion: comprobante.emisorDireccionFiscal,
        ubigeo: comprobante.emisorUbigeoFiscal,
        codigoPais: 'PE',
      },
      codigoEstablecimiento: comprobante.emisorCodigoEstablecimiento ?? '0000',
      ambiente: comprobante.ambiente,
    };
    const snapshotClienteJson = this.asRecord(snapshot?.receptor) ?? {
      tipoDocumento: comprobante.clienteDocTipo,
      numeroDocumento: comprobante.clienteDocNum,
      razonSocial: comprobante.clienteNombre,
      direccion: comprobante.clienteDireccion,
    };
    const snapshotLineas = snapshot?.lineas;
    const snapshotItemsJson = Array.isArray(snapshotLineas)
      ? (snapshotLineas as unknown[]).map((linea): unknown => {
          if (typeof linea !== 'object' || linea === null) return linea;
          const item = linea as Record<string, unknown>;
          return {
            ...item,
            descripcion: this.plainFiscalText(item.descripcion),
          };
        })
      : detallesFiscales.map((detalle) => ({
          item: detalle.item,
          productoId: detalle.productoId,
          codigoInterno: detalle.codigoInterno,
          descripcion: detalle.descripcion,
          unidadSunat: detalle.unidadSunat,
          tipoFiscalProducto: detalle.tipoFiscalProducto,
          tipoAfectacionIgv: detalle.tipoAfectacionIgv,
          cantidad: detalle.cantidad,
          valorUnitario: detalle.valorUnitario,
          precioUnitario: detalle.precioUnitario,
          descuento: detalle.descuento,
          baseImponible: detalle.baseImponible,
          igv: detalle.igv,
          total: detalle.total,
          metadataFiscal: detalle.metadataFiscal,
        }));

    return {
      ...comprobante,
      clienteTipoDoc: comprobante.clienteDocTipo,
      subtotal: this.toNumber(comprobante.subtotal),
      igv: this.toNumber(comprobante.igv),
      total: this.toNumber(comprobante.total),
      detallesFiscales,
      snapshotEmisorJson,
      snapshotClienteJson,
      snapshotItemsJson,
      xmlUrl: comprobante.xmlStorageKey ?? null,
      cdrUrl: comprobante.cdrStorageKey ?? null,
      pdfUrl: comprobante.pdfStorageKey ?? null,
      notasCredito,
      notasDebito,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private toNumber(value: unknown) {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
  }

  private plainFiscalText(value: unknown) {
    if (typeof value !== 'string') return '';
    return value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getDocumentoSoporte(id: string) {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id },
      select: {
        id: true,
        numero: true,
        estado: true,
        hashSunat: true,
        hashCpe: true,
        xmlStorageKey: true,
        cdrStorageKey: true,
        pdfStorageKey: true,
      },
    });

    if (!comprobante) {
      throw new NotFoundException(`Comprobante ${id} no encontrado`);
    }

    return {
      id: comprobante.id,
      numero: comprobante.numero,
      estado: comprobante.estado,
      hashSunat: comprobante.hashSunat,
      hashCpe: comprobante.hashCpe ?? comprobante.hashSunat,
      xmlUrl: comprobante.xmlStorageKey,
      cdrUrl: comprobante.cdrStorageKey,
      pdfUrl: comprobante.pdfStorageKey,
      xmlStorageKey: comprobante.xmlStorageKey,
      cdrStorageKey: comprobante.cdrStorageKey,
      pdfStorageKey: comprobante.pdfStorageKey,
    };
  }

  async consultarEstadoSunat(id: string) {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id },
      include: {
        detallesFiscales: { orderBy: { item: 'asc' } },
      },
    });

    if (!comprobante) {
      throw new NotFoundException(`Comprobante ${id} no encontrado`);
    }

    const emisorRucValue = (comprobante as Record<string, unknown>).emisorRuc;
    const emisorRuc =
      typeof emisorRucValue === 'string' ? emisorRucValue.trim() : '';
    if (!emisorRuc) {
      throw new BadRequestException(
        'El comprobante no tiene RUC emisor congelado para consultar SUNAT',
      );
    }

    const result = await this.sunatGateway.getStatusCdr({
      ruc: emisorRuc,
      tipoComprobante: this.documentCodeForTipo(
        comprobante.tipo as TipoDocumento,
      ),
      serie: comprobante.serie,
      correlativo: comprobante.correlativo,
      ambiente: await this.resolveAmbiente(),
    });
    const estado = this.estadoFromSunatStatus(
      result.codigoRespuesta,
      result.accepted,
      comprobante.estado as EstadoComprobante,
    );
    const updateData: Record<string, unknown> = {
      codigoSunat: result.codigoRespuesta,
      mensajeSunat: result.mensaje,
      estado,
    };
    // Doc 06 §5 — si SUNAT devuelve CDR, persistirlo en storage. Sin esto el
    // comprobante apuntaría a un cdrStorageKey inexistente.
    const cdrStorageKey = result.cdrContent
      ? this.buildStorageKey(comprobante, 'cdr')
      : null;
    if (cdrStorageKey && result.cdrContent) {
      await this.storage.writeObject(
        cdrStorageKey,
        Buffer.from(result.cdrContent, 'base64'),
        'application/zip',
      );
      updateData.cdrStorageKey = cdrStorageKey;
    }
    // Si la consulta lo dejó ACEPTADO y no había PDF previo, generarlo ahora.
    if (
      (estado === EstadoComprobante.ACEPTADO ||
        estado === EstadoComprobante.ACEPTADO_CON_OBSERVACIONES) &&
      !comprobante.pdfStorageKey
    ) {
      const pdfStorageKey = await this.renderAndStoreComprobantePdf(
        comprobante as Record<string, unknown>,
        estado,
        result.codigoRespuesta,
        result.mensaje,
      );
      if (pdfStorageKey) updateData.pdfStorageKey = pdfStorageKey;
    }
    if (
      (estado === EstadoComprobante.ACEPTADO ||
        estado === EstadoComprobante.ACEPTADO_CON_OBSERVACIONES) &&
      !comprobante.cdrRecibidaAt
    ) {
      updateData.cdrRecibidaAt = new Date();
    }

    const updated = await this.prisma.comprobante.update({
      where: { id },
      data: updateData,
    });
    await this.updateVentaEstadoFacturacion(
      comprobante.ventaId,
      this.estadoFacturacionFromComprobante(estado),
    );

    await this.prisma.comprobanteEnvioLog.create({
      data: {
        comprobanteId: id,
        tipo: TipoEnvio.CONSULTA_TICKET,
        proveedor: 'SUNAT_DIRECT',
        tipoEvento: 'CONSULTA_CDR_SUNAT',
        estado,
        intento: Math.max(Number(comprobante.intentosEnvio ?? 0), 1),
        requestPayload: result.requestPayload as Prisma.InputJsonValue,
        responsePayload: result.responsePayload as Prisma.InputJsonValue,
        responseCode: result.codigoRespuesta,
        responseDescription: result.mensaje,
        cdrStorageKey,
        codigoRespuesta: result.codigoRespuesta,
        mensaje: result.mensaje,
      },
    });

    if (
      estado === EstadoComprobante.ACEPTADO ||
      estado === EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
    ) {
      await this.emailService.enviarComprobanteAceptado(id);
    }

    return { comprobante: updated, consulta: result };
  }

  // ── Listar comunicaciones de baja (Doc 05 §1) ────────────────────────

  async findComunicacionesBaja(query: {
    page?: number;
    limit?: number;
    estado?: EstadoComunicacionBaja;
    search?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.estado) where.estado = query.estado;
    if (query.search) {
      where.OR = [
        { identificadorBaja: { contains: query.search, mode: 'insensitive' } },
        {
          comprobante: {
            numero: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          comprobante: {
            clienteNombre: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.comunicacionBaja.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          comprobante: {
            select: {
              id: true,
              numero: true,
              tipo: true,
              total: true,
              clienteNombre: true,
              clienteDocNum: true,
              fechaEmision: true,
            },
          },
        },
      }),
      this.prisma.comunicacionBaja.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  // ── Detalle, consulta y descargas de comunicación de baja ───────────

  async findComunicacionBajaById(id: string) {
    const comunicacion = await this.prisma.comunicacionBaja.findUnique({
      where: { id },
      include: {
        comprobante: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            serie: true,
            correlativo: true,
            total: true,
            estado: true,
            clienteNombre: true,
            clienteDocNum: true,
            fechaEmision: true,
            cdrRecibidaAt: true,
            emisorRuc: true,
          },
        },
      },
    });
    if (!comunicacion) {
      throw new NotFoundException(`Comunicación de baja ${id} no encontrada`);
    }
    return comunicacion;
  }

  /**
   * Normaliza el campo `tipo` de NC al código Cat 09 SUNAT (01..13).
   * Acepta tanto el código directo ('01') como descripciones legacy
   * ('Anulación de la operación', 'ANULACION', etc.).
   */
  private normalizeMotivoNc(tipo: unknown): string {
    const raw = String(tipo ?? '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
    if (/^\d{2}$/.test(raw)) return raw;
    if (raw.includes('ANULACION')) return '01';
    return raw;
  }

  /**
   * Doc 07 §7 — Cancelar una comunicación de baja antes de que se envíe a
   * SUNAT. Solo válido si está en estado PENDIENTE (el worker aún no la tomó).
   * Revierte el comprobante a ACEPTADO y descarta la comunicación.
   *
   * Una vez en EN_PROCESO/ACEPTADA/RECHAZADA NO se puede cancelar — SUNAT ya
   * tiene constancia y la única vía es esperar el resultado o emitir una NC.
   */
  async cancelarBaja(id: string, canceladoPor = 'system') {
    const comunicacion = await this.prisma.comunicacionBaja.findUnique({
      where: { id },
      include: { comprobante: { select: { id: true, numero: true } } },
    });
    if (!comunicacion) {
      throw new NotFoundException(`Comunicación de baja ${id} no encontrada`);
    }
    if (comunicacion.estado !== EstadoComunicacionBaja.PENDIENTE) {
      throw new BadRequestException(
        `Solo se puede cancelar una baja en estado PENDIENTE. Estado actual: ${comunicacion.estado}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.comunicacionBaja.update({
        where: { id },
        data: {
          estado: EstadoComunicacionBaja.RECHAZADA,
          errorMessage: `Cancelada por ${canceladoPor} antes del envío`,
        },
      });
      await tx.comprobante.update({
        where: { id: comunicacion.comprobanteId },
        data: { estado: EstadoComprobante.ACEPTADO },
      });
      await tx.comprobanteEnvioLog.create({
        data: {
          comprobanteId: comunicacion.comprobanteId,
          tipo: TipoEnvio.COMUNICACION_BAJA,
          proveedor: 'SISTEMA',
          tipoEvento: 'COMUNICACION_BAJA_CANCELADA',
          estado: EstadoComprobante.ACEPTADO,
          intento: 1,
          mensaje: `Baja ${comunicacion.identificadorBaja} cancelada por ${canceladoPor}`,
        },
      });
    });

    this.logger.log(
      `Baja ${comunicacion.identificadorBaja} cancelada por ${canceladoPor}; comprobante ${comunicacion.comprobante?.numero} restaurado a ACEPTADO`,
    );
    return {
      canceled: true,
      identificadorBaja: comunicacion.identificadorBaja,
    };
  }

  async consultarEstadoBaja(id: string) {
    const comunicacion = await this.prisma.comunicacionBaja.findUnique({
      where: { id },
      include: { comprobante: true },
    });
    if (!comunicacion) {
      throw new NotFoundException(`Comunicación de baja ${id} no encontrada`);
    }
    if (!comunicacion.ticketSunat) {
      throw new BadRequestException(
        'La comunicación aún no tiene ticket SUNAT asignado.',
      );
    }
    if (
      comunicacion.estado === EstadoComunicacionBaja.ACEPTADA ||
      comunicacion.estado === EstadoComunicacionBaja.RECHAZADA
    ) {
      return {
        comunicacion,
        consulta: {
          codigoRespuesta: comunicacion.estado,
          mensaje: comunicacion.errorMessage ?? 'Estado final almacenado',
          accepted: comunicacion.estado === EstadoComunicacionBaja.ACEPTADA,
        },
      };
    }

    const comprobante = comunicacion.comprobante as {
      emisorRuc?: string | null;
    };
    const emisorRuc = this.cleanText(comprobante.emisorRuc);
    if (!emisorRuc) {
      throw new BadRequestException(
        'El comprobante asociado no tiene RUC emisor congelado.',
      );
    }

    const result = await this.sunatGateway.getStatus({
      ruc: emisorRuc,
      ticket: comunicacion.ticketSunat,
      ambiente: await this.resolveAmbiente(),
    });

    // Doc 07 §6 — la consulta manual debe reconciliar entidades igual que el
    // worker de polling: persistir CDR, actualizar ComunicacionBaja, Comprobante
    // y Venta. Antes solo creaba un log y dejaba los estados desincronizados.
    let comunicacionActualizada = comunicacion;
    if (result.accepted) {
      const cdrStorageKey = result.cdrContent
        ? `sunat/bajas/${comunicacion.identificadorBaja}.cdr`
        : null;
      if (cdrStorageKey && result.cdrContent) {
        await this.storage.writeObject(
          cdrStorageKey,
          Buffer.from(result.cdrContent, 'base64'),
          'application/zip',
        );
      }
      const ahora = new Date();
      comunicacionActualizada = await this.prisma.comunicacionBaja.update({
        where: { id: comunicacion.id },
        data: {
          estado: EstadoComunicacionBaja.ACEPTADA,
          ...(cdrStorageKey ? { cdrStorageKey } : {}),
          cdrRecibidaAt: ahora,
          cdrCodigo: result.codigoRespuesta,
          cdrMensaje: result.mensaje,
        },
        include: { comprobante: true },
      });
      await this.prisma.comprobante.update({
        where: { id: comunicacion.comprobanteId },
        data: {
          estado: EstadoComprobante.ANULADO,
          ...(cdrStorageKey ? { cdrStorageKey } : {}),
          cdrRecibidaAt: ahora,
        },
      });
      const ventaId = (
        comunicacion.comprobante as { ventaId?: string | null } | null
      )?.ventaId;
      if (ventaId) {
        await this.updateVentaEstadoFacturacion(
          ventaId,
          EstadoFacturacionVenta.ANULADA_FISCAL,
        );
      }
    } else if (result.codigoRespuesta && result.codigoRespuesta !== '98') {
      // SUNAT respondió con error funcional (no "aún en proceso"): rechazar.
      const message = result.mensaje || 'SUNAT rechazó la baja';
      const cdrStorageKey = result.cdrContent
        ? `sunat/bajas/${comunicacion.identificadorBaja}.cdr`
        : null;
      if (cdrStorageKey && result.cdrContent) {
        await this.storage.writeObject(
          cdrStorageKey,
          Buffer.from(result.cdrContent, 'base64'),
          'application/zip',
        );
      }
      const ahora = new Date();
      comunicacionActualizada = await this.prisma.comunicacionBaja.update({
        where: { id: comunicacion.id },
        data: {
          estado: EstadoComunicacionBaja.RECHAZADA,
          errorMessage: message,
          ...(cdrStorageKey ? { cdrStorageKey, cdrRecibidaAt: ahora } : {}),
          cdrCodigo: result.codigoRespuesta,
          cdrMensaje: message,
        },
        include: { comprobante: true },
      });
      await this.prisma.comprobante.update({
        where: { id: comunicacion.comprobanteId },
        data: { estado: EstadoComprobante.ACEPTADO },
      });
    }

    const estadoLog = result.accepted
      ? EstadoComprobante.ANULADO
      : result.codigoRespuesta && result.codigoRespuesta !== '98'
        ? EstadoComprobante.ACEPTADO
        : EstadoComprobante.BAJA_PENDIENTE;

    await this.prisma.comprobanteEnvioLog.create({
      data: {
        comprobanteId: comunicacion.comprobanteId,
        tipo: TipoEnvio.CONSULTA_TICKET,
        proveedor: 'SUNAT_DIRECT',
        tipoEvento: 'CONSULTA_TICKET_BAJA',
        estado: estadoLog,
        intento: 1,
        requestPayload: result.requestPayload as Prisma.InputJsonValue,
        responsePayload: result.responsePayload as Prisma.InputJsonValue,
        responseCode: result.codigoRespuesta,
        responseDescription: result.mensaje,
        codigoRespuesta: result.codigoRespuesta,
        mensaje: result.mensaje,
      },
    });

    return { comunicacion: comunicacionActualizada, consulta: result };
  }

  async getBajaXmlStream(id: string) {
    return this.readBajaArtifact(id, 'xml', 'application/xml');
  }

  async getBajaCdrStream(id: string) {
    return this.readBajaArtifact(id, 'cdr', 'application/zip');
  }

  /**
   * Doc 05 §2 — descargas reales de los artefactos SUNAT del CPE primario.
   * `xml`: archivo firmado XAdES-BES; `cdr`: ZIP devuelto por SUNAT;
   * `pdf`: representación impresa generada en el envío.
   */
  async getComprobanteArtifactStream(id: string, kind: 'xml' | 'cdr' | 'pdf') {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id },
      select: {
        id: true,
        numero: true,
        serie: true,
        correlativo: true,
        xmlStorageKey: true,
        cdrStorageKey: true,
        pdfStorageKey: true,
      },
    });
    if (!comprobante) {
      throw new NotFoundException(`Comprobante ${id} no encontrado`);
    }
    let storageKey =
      kind === 'xml'
        ? comprobante.xmlStorageKey
        : kind === 'cdr'
          ? comprobante.cdrStorageKey
          : comprobante.pdfStorageKey;
    if (kind === 'pdf') {
      const comprobanteParaPdf = await this.prisma.comprobante.findUnique({
        where: { id },
        include: {
          detallesFiscales: { orderBy: { item: 'asc' } },
        },
      });
      if (!comprobanteParaPdf) {
        throw new NotFoundException(`Comprobante ${id} no encontrado`);
      }

      const pdfActualizado = await this.renderAndStoreComprobantePdf(
        comprobanteParaPdf as unknown as Record<string, unknown>,
        comprobanteParaPdf.estado as EstadoComprobante,
        comprobanteParaPdf.codigoSunat,
        comprobanteParaPdf.mensajeSunat,
      );
      if (pdfActualizado) {
        storageKey = pdfActualizado;
        await this.prisma.comprobante.update({
          where: { id },
          data: { pdfStorageKey: pdfActualizado },
        });
      }
    }
    if (!storageKey) {
      throw new NotFoundException(
        `Archivo ${kind.toUpperCase()} no disponible para el comprobante ${comprobante.numero}.`,
      );
    }
    const contentType =
      kind === 'xml'
        ? 'application/xml'
        : kind === 'cdr'
          ? 'application/zip'
          : 'application/pdf';
    try {
      const content = await this.storage.readObjectBuffer(storageKey);
      if (!content) {
        throw new NotFoundException(
          `Archivo ${kind.toUpperCase()} no encontrado en storage para el comprobante ${comprobante.numero}.`,
        );
      }
      return {
        filename: `${comprobante.numero}.${kind === 'cdr' ? 'cdr.zip' : kind}`,
        contentType,
        content,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `No se pudo leer artefacto ${kind} para comprobante ${id}: ${(error as Error).message}`,
      );
      throw new NotFoundException(
        `No se pudo leer el archivo ${kind.toUpperCase()} del comprobante.`,
      );
    }
  }

  /**
   * Doc 06 §2 paso 13 — render diferido del PDF cuando el envío original no
   * lo produjo (consultas manuales, reconciliaciones). Mismo formato que el
   * worker para no duplicar la lógica de presentación.
   */
  private async renderAndStoreComprobantePdf(
    comprobante: Record<string, unknown>,
    estado: EstadoComprobante,
    cdrCodigo?: string | null,
    cdrMensaje?: string | null,
  ): Promise<string | null> {
    try {
      const detallesRaw =
        (comprobante.detallesFiscales as
          | Array<Record<string, unknown>>
          | undefined) ?? [];
      const detalles = detallesRaw.map((d) => ({
        item: Number(d.item ?? 0),
        descripcion: this.cleanText(d.descripcion) || '—',
        cantidad: Number(d.cantidad ?? 0),
        precioUnitario: Number(d.precioUnitario ?? 0),
        total: Number(d.total ?? 0),
      }));
      const fechaEmisionRaw = comprobante.fechaEmision;
      const fechaEmisionText =
        this.cleanText(fechaEmisionRaw) || new Date().toISOString();
      const [configFiscal, empresaPublica] = await Promise.all([
        this.prisma.configEmpresaFiscal.findFirst({
          select: { regimenTributario: true, pieImpresion: true },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.configEmpresa.findFirst({
          select: { logo: true },
        }),
      ]);
      const buffer = await this.pdfService.render({
        numero: this.cleanText(comprobante.numero),
        tipo: this.cleanText(comprobante.tipo),
        serie: this.cleanText(comprobante.serie),
        correlativo: Number(comprobante.correlativo ?? 0),
        fechaEmision:
          fechaEmisionRaw instanceof Date
            ? fechaEmisionRaw
            : new Date(fechaEmisionText),
        emisorRuc: this.cleanText(comprobante.emisorRuc),
        emisorRazonSocial: this.cleanText(comprobante.emisorRazonSocial),
        emisorNombreComercial:
          this.cleanText(comprobante.emisorNombreComercial) || null,
        emisorDireccion:
          this.cleanText(comprobante.emisorDireccionFiscal) || null,
        emisorUbigeo: this.cleanText(comprobante.emisorUbigeoFiscal) || null,
        emisorCodigoEstablecimiento:
          this.cleanText(comprobante.emisorCodigoEstablecimiento) || null,
        emisorRegimenTributario: configFiscal?.regimenTributario ?? null,
        emisorLogoPath: empresaPublica?.logo ?? null,
        emisorDepartamentoFiscal:
          this.cleanText(comprobante.emisorDepartamentoFiscal) || null,
        emisorProvinciaFiscal:
          this.cleanText(comprobante.emisorProvinciaFiscal) || null,
        emisorDistritoFiscal:
          this.cleanText(comprobante.emisorDistritoFiscal) || null,
        clienteDocTipo: this.cleanText(comprobante.clienteDocTipo),
        clienteDocNum: this.cleanText(comprobante.clienteDocNum),
        clienteNombre: this.cleanText(comprobante.clienteNombre),
        clienteDireccion: this.cleanText(comprobante.clienteDireccion) || null,
        subtotal: Number(comprobante.subtotal ?? 0),
        igv: Number(comprobante.igv ?? 0),
        total: Number(comprobante.total ?? 0),
        estado,
        cdrCodigo: cdrCodigo ?? null,
        cdrMensaje: cdrMensaje ?? null,
        formaPago: 'CONTADO',
        pieImpresion: configFiscal?.pieImpresion ?? null,
        hashFirma:
          this.cleanText(comprobante.hashCpe) ||
          this.cleanText(comprobante.hashSunat) ||
          null,
        detalles,
      });
      const storageKey = this.buildStorageKey(
        {
          emisorRuc:
            (comprobante.emisorRuc as string | null | undefined) ?? null,
          tipo: comprobante.tipo,
          serie: this.cleanText(comprobante.serie),
          correlativo: Number(comprobante.correlativo ?? 0),
        },
        'pdf',
      );
      await this.storage.writeObject(storageKey, buffer, 'application/pdf');
      return storageKey;
    } catch (error) {
      this.logger.error(
        `No se pudo renderizar PDF tras consulta manual de ${
          this.cleanText(comprobante.numero) ||
          this.cleanText(comprobante.id) ||
          'sin-id'
        }: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async readBajaArtifact(
    id: string,
    extension: 'xml' | 'cdr',
    contentType: string,
  ) {
    const comunicacion = await this.prisma.comunicacionBaja.findUnique({
      where: { id },
      select: {
        id: true,
        identificadorBaja: true,
        xmlStorageKey: true,
        cdrStorageKey: true,
      },
    });
    if (!comunicacion) {
      throw new NotFoundException(`Comunicación de baja ${id} no encontrada`);
    }
    const storageKey =
      extension === 'xml'
        ? comunicacion.xmlStorageKey
        : comunicacion.cdrStorageKey;
    if (!storageKey) {
      throw new NotFoundException(
        `Archivo ${extension.toUpperCase()} no disponible para la comunicación ${comunicacion.identificadorBaja}.`,
      );
    }
    try {
      const content = await this.storage.readObjectBuffer(storageKey);
      if (!content) {
        throw new NotFoundException(
          `Archivo ${extension.toUpperCase()} no encontrado en storage para la comunicación ${comunicacion.identificadorBaja}.`,
        );
      }
      return {
        filename: `${comunicacion.identificadorBaja}.${extension === 'cdr' ? 'cdr.zip' : extension}`,
        contentType,
        content,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `No se pudo leer artefacto ${extension} para baja ${id}: ${(error as Error).message}`,
      );
      throw new NotFoundException(
        `No se pudo leer el archivo ${extension.toUpperCase()} de la comunicación.`,
      );
    }
  }

  // ── Anular comprobante (solo ADMIN) ─────────────────────────────────

  async anularComprobante(id: string, iniciadoPor = 'system', motivo?: string) {
    const motivoFinal = motivo?.trim();
    if (!motivoFinal || motivoFinal.length < 10) {
      throw new BadRequestException(
        'El motivo de la baja es obligatorio (mínimo 10 caracteres).',
      );
    }

    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id },
    });

    if (!comprobante) {
      throw new NotFoundException(`Comprobante ${id} no encontrado`);
    }

    // Doc 04 §5.1 — solo se anula vía RA un CPE aceptado por SUNAT.
    const estadoComprobante = comprobante.estado as EstadoComprobante;
    if (
      estadoComprobante !== EstadoComprobante.ACEPTADO &&
      estadoComprobante !== EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
    ) {
      throw new BadRequestException(
        `Solo se pueden anular comprobantes ACEPTADOS por SUNAT. Estado actual: ${estadoComprobante}`,
      );
    }

    // Doc 04 §1 + §3 — boletas en modalidad individual NO usan RA;
    // se anulan emitiendo NC motivo 01.
    if (comprobante.tipo === TipoDocumento.BOLETA) {
      throw new BadRequestException(
        'Las boletas se anulan emitiendo una nota de crédito motivo 01 (anulación), no comunicación de baja.',
      );
    }

    // Doc 04 §5.2 — plazo de 7 días calendario desde la fecha de la CDR.
    // Si por algún motivo no tenemos `cdrRecibidaAt` (comprobantes legacy o
    // emitidos antes de Sprint 4), caemos a `fechaEmision` y dejamos un
    // warn para auditoría.
    const baseDeadline = comprobante.cdrRecibidaAt ?? comprobante.fechaEmision;
    if (!comprobante.cdrRecibidaAt) {
      this.logger.warn(
        `Comprobante ${comprobante.numero} sin cdrRecibidaAt; usando fechaEmision para plazo de baja.`,
      );
    }
    const deadlinePlazo = calcularDeadlineComunicacionBaja(
      new Date(baseDeadline),
    );
    if (deadlinePlazo.isVencido) {
      throw new BadRequestException(
        'El plazo para comunicar la baja venció (7 días calendario desde la CDR). Emite una nota de crédito.',
      );
    }

    // Doc 04 §5.3 — no permitir doble baja activa para el mismo comprobante.
    const bajaActiva = await this.prisma.comunicacionBaja.findFirst({
      where: {
        comprobanteId: id,
        estado: {
          in: [
            EstadoComunicacionBaja.PENDIENTE,
            EstadoComunicacionBaja.EN_PROCESO,
            EstadoComunicacionBaja.ACEPTADA,
          ],
        },
      },
      select: { id: true, estado: true, identificadorBaja: true },
    });
    if (bajaActiva) {
      throw new BadRequestException(
        `El comprobante ya tiene una comunicación de baja en estado ${bajaActiva.estado} (${bajaActiva.identificadorBaja}).`,
      );
    }

    // Doc 04 §4.1 — validar configuración fiscal completa antes de crear el RA.
    await this.assertFiscalConfigReadyForBaja(comprobante);

    const ambiente = await this.resolveAmbiente();

    const result = await this.prisma.$transaction(async (tx) => {
      const identificadorBaja = await this.generarIdentificadorBaja(
        tx,
        ambiente,
      );
      const comunicacionBaja = await tx.comunicacionBaja.create({
        data: {
          comprobanteId: id,
          identificadorBaja,
          motivo: motivoFinal,
          fechaReferencia: comprobante.fechaEmision,
          deadline: deadlinePlazo.deadline,
          estado: EstadoComunicacionBaja.PENDIENTE,
          iniciadoPor,
        },
      });

      const updated = await tx.comprobante.update({
        where: { id },
        data: { estado: EstadoComprobante.BAJA_PENDIENTE },
      });

      await tx.comprobanteEnvioLog.create({
        data: {
          comprobanteId: id,
          tipo: TipoEnvio.COMUNICACION_BAJA,
          proveedor: 'SUNAT_DIRECT',
          tipoEvento: 'COMUNICACION_BAJA_CREADA',
          estado: EstadoComprobante.BAJA_PENDIENTE,
          intento: Math.max(Number(comprobante.intentosEnvio ?? 0), 1),
          mensaje: `Comunicación de baja ${identificadorBaja} pendiente de envío a SUNAT`,
          responseDescription: `Comunicación de baja ${identificadorBaja} pendiente de envío a SUNAT`,
        },
      });

      return { updated, comunicacionBaja };
    });

    this.logger.log(
      `Comprobante ${comprobante.numero} marcado BAJA_PENDIENTE por ${iniciadoPor}`,
    );
    const deadline = deadlinePlazo.deadline.toISOString();
    await this.bajaQueue.add(
      'comunicar-baja',
      {
        comunicacionBajaId: result.comunicacionBaja.id,
        deadline,
      },
      this.sunatJobOptions(deadline, `baja-${result.comunicacionBaja.id}`, 1),
    );
    return result.updated;
  }

  // ── Notas de crédito ────────────────────────────────────────────────

  /**
   * Doc 08 §2-§4 — Emisión de NC con todas las validaciones SUNAT:
   *   1. Origen ACEPTADO o ACEPTADO_CON_OBSERVACIONES (no RECHAZADO/ANULADO).
   *   2. Motivo Cat 09 válido. Si esExcepcional, debe ser 01 o 02.
   *   3. Suma de NCs aceptadas + esta NC ≤ total origen (saldo no acreditado).
   *   4. Si anulaTotalmente, monto debe igualar saldo no acreditado exacto.
   *   5. No puede haber otra NC en estado no terminal sobre el mismo origen.
   *   6. Motivo 04 (descuento global) sólo válido sobre factura.
   *   7. Plazo: regular = igual al del origen; excepcional = 10 días hábiles.
   *   8. Origen puede ser tipo 01/03 (factura/boleta), 07 (NC) o 08 (ND) — §7.1.
   */
  async crearNotaCredito(dto: CreateNotaCreditoDto) {
    const motivoCodigo = this.resolverMotivoNcCodigo(dto);
    const motivoDescripcion =
      dto.motivoDescripcion?.trim() ?? dto.motivo?.trim() ?? '';
    if (motivoDescripcion.length < 10) {
      throw new BadRequestException(
        'La descripción del motivo es obligatoria (mínimo 10 caracteres).',
      );
    }
    const esExcepcional = !!dto.esExcepcional;

    // §3 — sólo motivos 01/02 son válidos en flujo excepcional.
    if (esExcepcional && !esMotivoNcExcepcional(motivoCodigo)) {
      throw new BadRequestException(
        `Motivo ${motivoCodigo} no es válido para NC excepcional. Sólo 01 (anulación) y 02 (error en RUC).`,
      );
    }

    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id: dto.comprobanteOrigenId },
      include: { detallesFiscales: { orderBy: { item: 'asc' } } },
    });
    if (!comprobante) {
      throw new NotFoundException(
        `Comprobante ${dto.comprobanteOrigenId} no encontrado`,
      );
    }

    // §7.3 — origen RECHAZADO no existe ante SUNAT; ANULADO ya fue dado de baja.
    const estadoOrigen = comprobante.estado as EstadoComprobante;
    if (
      estadoOrigen === EstadoComprobante.RECHAZADO ||
      estadoOrigen === EstadoComprobante.ANULADO
    ) {
      throw new BadRequestException(
        `No se puede emitir NC sobre comprobante en estado ${estadoOrigen}.`,
      );
    }
    if (
      estadoOrigen !== EstadoComprobante.ACEPTADO &&
      estadoOrigen !== EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
    ) {
      throw new BadRequestException(
        `Sólo se pueden emitir NCs sobre comprobantes ACEPTADOS por SUNAT (estado actual: ${estadoOrigen}).`,
      );
    }

    // §1 — motivo 04 (descuento global) sólo aplica a facturas.
    if (motivoCodigo === '04' && comprobante.tipo !== TipoDocumento.FACTURA) {
      throw new BadRequestException(
        'El descuento global (motivo 04) sólo aplica a facturas.',
      );
    }

    // §4 — bloquear si hay otra NC en proceso (no terminal) sobre el mismo origen.
    const ncEnProceso = await this.existeNcEnProceso(dto.comprobanteOrigenId);
    if (ncEnProceso) {
      throw new BadRequestException(
        `Ya hay una NC ${ncEnProceso.numero} en estado ${ncEnProceso.estado} sobre este comprobante. Resuélvela antes de emitir otra.`,
      );
    }

    // §4 — saldo no acreditado = total origen − suma NCs aceptadas previas.
    const saldoNoAcreditado = await this.calcularSaldoNoAcreditado(
      dto.comprobanteOrigenId,
    );
    if (saldoNoAcreditado <= 0) {
      throw new BadRequestException(
        'El comprobante origen ya fue acreditado en su totalidad.',
      );
    }
    if (dto.monto > saldoNoAcreditado + 0.005) {
      throw new BadRequestException(
        `Monto NC (S/ ${dto.monto.toFixed(2)}) excede el saldo no acreditado (S/ ${saldoNoAcreditado.toFixed(2)}).`,
      );
    }

    // §4 — NC con motivo 01 marcada como anulación total: monto exacto = saldo.
    const anulaTotalmente = !!dto.anulaTotalmente;
    if (anulaTotalmente) {
      if (motivoCodigo !== '01') {
        throw new BadRequestException(
          'Sólo motivo 01 (Anulación) admite la marca "anula totalmente".',
        );
      }
      if (Math.abs(dto.monto - saldoNoAcreditado) > 0.005) {
        throw new BadRequestException(
          `Anulación total exige monto exacto = saldo (S/ ${saldoNoAcreditado.toFixed(2)}). Recibido: S/ ${dto.monto.toFixed(2)}.`,
        );
      }
    }
    if (!anulaTotalmente && (!dto.lineas || dto.lineas.length === 0)) {
      throw new BadRequestException(
        'Para una NC parcial debes indicar al menos una línea a acreditar.',
      );
    }
    this.assertNotaLineasValidas(dto.lineas, dto.monto, 'NC');

    // §3 — plazo. Excepcional: 10 días hábiles. Regular: el plazo del origen.
    let feriadosNcExcepcional: Array<{ fecha: Date }> = [];
    if (esExcepcional) {
      feriadosNcExcepcional = await this.prisma.feriadoNacional.findMany({
        select: { fecha: true },
      });
      const vencido = plazoDiasHabilesVencido(
        comprobante.fechaEmision,
        PLAZO_NC_EXCEPCIONAL_DIAS_HABILES,
        feriadosNcExcepcional,
      );
      if (vencido) {
        throw new BadRequestException(
          `Plazo NC excepcional vencido (${PLAZO_NC_EXCEPCIONAL_DIAS_HABILES} días hábiles desde la emisión del origen).`,
        );
      }
    } else if (
      comprobante.tipo === TipoDocumento.BOLETA &&
      motivoCodigo === '01'
    ) {
      // Regular: BOLETA + motivo 01 = plazo 5 días calendario (Doc 07 §4-§5).
      const plazo = calcularDeadlineEnvioShared(
        TipoDocumento.BOLETA,
        comprobante.fechaEmision,
      );
      if (plazo.isVencido) {
        throw new BadRequestException(
          'Plazo de 5 días para anular boleta con NC vencido. Considera NC excepcional (motivos 01/02 dentro de 10 días hábiles).',
        );
      }
    }

    // Crear NC dentro de transacción para garantizar atomicidad de correlativo.
    const nota = await this.prisma.$transaction(async (tx) => {
      const configFiscal = await tx.configEmpresaFiscal.findFirst();
      const ambiente = this.resolveAmbienteFromConfig(configFiscal);
      const serieInfo = await this.serieDocumentoService.next(
        tx,
        TipoDocumento.NOTA_CREDITO,
        undefined,
        ambiente,
        undefined,
        this.seriePrefixForNotaOrigen(comprobante.tipo as TipoDocumento),
      );

      const fechaEmision = new Date();
      const fechaVencimientoPlazo = esExcepcional
        ? this.calcularDeadlineDiasHabiles(
            comprobante.fechaEmision,
            PLAZO_NC_EXCEPCIONAL_DIAS_HABILES,
            feriadosNcExcepcional,
          )
        : calcularDeadlineEnvioShared(
            comprobante.tipo as TipoDocumento,
            fechaEmision,
          ).deadline;
      const subtotal = +(dto.monto / 1.18).toFixed(2);
      const igv = +(dto.monto - subtotal).toFixed(2);

      const creada = await tx.comprobante.create({
        data: {
          ventaId: null,
          tipo: TipoDocumento.NOTA_CREDITO,
          serie: serieInfo.serie,
          correlativo: serieInfo.correlativo,
          numero: serieInfo.numero,
          ambiente,
          comprobanteOrigenId: dto.comprobanteOrigenId,
          motivoNota: motivoCodigo,
          motivoNotaDescripcion: motivoDescripcion,
          esNotaExcepcional: esExcepcional,
          clienteNombre: comprobante.clienteNombre,
          clienteDocTipo: comprobante.clienteDocTipo,
          clienteDocNum: comprobante.clienteDocNum,
          clienteDireccion: comprobante.clienteDireccion,
          emisorRuc: comprobante.emisorRuc,
          emisorRazonSocial: comprobante.emisorRazonSocial,
          emisorNombreComercial: comprobante.emisorNombreComercial,
          emisorDireccionFiscal: comprobante.emisorDireccionFiscal,
          emisorUbigeoFiscal: comprobante.emisorUbigeoFiscal,
          emisorCodigoEstablecimiento: comprobante.emisorCodigoEstablecimiento,
          subtotal,
          igv,
          total: dto.monto,
          estado: EstadoComprobante.PENDIENTE_ENVIO,
          fechaEmision,
          fechaVencimientoPlazo,
          operationId: randomUUID(),
          tokenConsulta: randomUUID(),
          tokenConsultaCreatedAt: new Date(),
        },
      });
      await this.createNotaDetallesEnTx(
        tx,
        creada.id,
        comprobante,
        dto.lineas,
        dto.monto,
        motivoDescripcion,
        anulaTotalmente,
      );
      return creada;
    });

    await this.encolarComprobanteSunat(nota);

    this.logger.log(
      `Nota de crédito ${nota.numero} (motivo ${motivoCodigo}${esExcepcional ? ' excepcional' : ''}) creada y encolada para SUNAT`,
    );
    return nota;
  }

  // ── Notas de débito ─────────────────────────────────────────────────

  /**
   * Doc 08 §6 — Emisión de ND con todas las validaciones SUNAT:
   *   1. Origen ACEPTADO o ACEPTADO_CON_OBSERVACIONES (no RECHAZADO/ANULADO).
   *   2. Origen puede ser FACTURA, BOLETA, NC o ND (Doc 08 §7.1).
   *   3. Motivo Cat 10 válido (01, 02, 03, 10, 11). Default: 03 (penalidades).
   *   4. motivoDescripcion obligatorio (≥10 chars).
   *   5. Sin tope respecto al origen — la ND agrega cargos, no descuenta.
   */
  async crearNotaDebito(dto: CreateNotaDebitoDto) {
    const motivoCodigo = this.resolverMotivoNdCodigo(dto);
    const motivoDescripcion =
      dto.motivoDescripcion?.trim() ?? dto.motivo?.trim() ?? '';
    if (motivoDescripcion.length < 10) {
      throw new BadRequestException(
        'La descripción del motivo es obligatoria (mínimo 10 caracteres).',
      );
    }

    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id: dto.comprobanteOrigenId },
      include: { detallesFiscales: { orderBy: { item: 'asc' } } },
    });

    if (!comprobante) {
      throw new NotFoundException(
        `Comprobante ${dto.comprobanteOrigenId} no encontrado`,
      );
    }

    // §7.1 — SUNAT permite notas sobre documentos relacionados 01/03/07/08.
    if (
      comprobante.tipo !== TipoDocumento.FACTURA &&
      comprobante.tipo !== TipoDocumento.BOLETA &&
      comprobante.tipo !== TipoDocumento.NOTA_CREDITO &&
      comprobante.tipo !== TipoDocumento.NOTA_DEBITO
    ) {
      throw new BadRequestException(
        `No se puede emitir ND sobre un comprobante tipo ${comprobante.tipo}. Sólo FACTURA, BOLETA, NC o ND.`,
      );
    }

    const estadoComprobante = comprobante.estado as EstadoComprobante;
    if (
      estadoComprobante === EstadoComprobante.RECHAZADO ||
      estadoComprobante === EstadoComprobante.ANULADO
    ) {
      throw new BadRequestException(
        `No se puede emitir ND sobre comprobante en estado ${estadoComprobante}.`,
      );
    }
    if (
      estadoComprobante !== EstadoComprobante.ACEPTADO &&
      estadoComprobante !== EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
    ) {
      throw new BadRequestException(
        `Sólo se pueden emitir NDs sobre comprobantes ACEPTADOS por SUNAT (estado actual: ${estadoComprobante}).`,
      );
    }
    this.assertNotaLineasValidas(dto.lineas, dto.monto, 'ND');

    // Doc 01 §arch + Doc 08 §1 — ND vive como Comprobante con tipo=NOTA_DEBITO
    // y comprobanteOrigenId apuntando al CPE primario.
    const nota = await this.prisma.$transaction(async (tx) => {
      const configFiscal = await tx.configEmpresaFiscal.findFirst();
      const ambiente = this.resolveAmbienteFromConfig(configFiscal);
      const serieInfo = await this.serieDocumentoService.next(
        tx,
        TipoDocumento.NOTA_DEBITO,
        undefined,
        ambiente,
        undefined,
        this.seriePrefixForNotaOrigen(comprobante.tipo as TipoDocumento),
      );

      const fechaEmision = new Date();
      const fechaVencimientoPlazo = calcularDeadlineEnvioShared(
        comprobante.tipo as TipoDocumento,
        fechaEmision,
      ).deadline;
      const subtotal = +(dto.monto / 1.18).toFixed(2);
      const igv = +(dto.monto - subtotal).toFixed(2);

      const creada = await tx.comprobante.create({
        data: {
          ventaId: null,
          tipo: TipoDocumento.NOTA_DEBITO,
          serie: serieInfo.serie,
          correlativo: serieInfo.correlativo,
          numero: serieInfo.numero,
          ambiente,
          comprobanteOrigenId: dto.comprobanteOrigenId,
          motivoNota: motivoCodigo,
          motivoNotaDescripcion: motivoDescripcion,
          esNotaExcepcional: false,
          clienteNombre: comprobante.clienteNombre,
          clienteDocTipo: comprobante.clienteDocTipo,
          clienteDocNum: comprobante.clienteDocNum,
          clienteDireccion: comprobante.clienteDireccion,
          emisorRuc: comprobante.emisorRuc,
          emisorRazonSocial: comprobante.emisorRazonSocial,
          emisorNombreComercial: comprobante.emisorNombreComercial,
          emisorDireccionFiscal: comprobante.emisorDireccionFiscal,
          emisorUbigeoFiscal: comprobante.emisorUbigeoFiscal,
          emisorCodigoEstablecimiento: comprobante.emisorCodigoEstablecimiento,
          subtotal,
          igv,
          total: dto.monto,
          estado: EstadoComprobante.PENDIENTE_ENVIO,
          fechaEmision,
          fechaVencimientoPlazo,
          operationId: randomUUID(),
          tokenConsulta: randomUUID(),
          tokenConsultaCreatedAt: new Date(),
        },
      });
      await this.createNotaDetallesEnTx(
        tx,
        creada.id,
        comprobante,
        dto.lineas,
        dto.monto,
        motivoDescripcion,
        false,
      );
      return creada;
    });

    await this.encolarComprobanteSunat(nota);

    this.logger.log(
      `Nota de débito ${nota.numero} (motivo ${motivoCodigo}) creada y encolada para SUNAT`,
    );
    return nota;
  }

  // ── Configuración de empresa ────────────────────────────────────────

  async getConfig() {
    const config = await this.prisma.configEmpresa.findFirst();
    if (!config) {
      throw new NotFoundException('Configuración de empresa no encontrada');
    }
    return config;
  }

  async updateConfig(dto: UpdateConfigEmpresaDto) {
    const config = await this.prisma.configEmpresa.findFirst();
    if (!config) {
      throw new NotFoundException('Configuración de empresa no encontrada');
    }

    return this.prisma.configEmpresa.update({
      where: { id: config.id },
      data: dto,
    });
  }

  private validateClienteForComprobante(
    cliente: {
      ruc?: string | null;
      razonSocial?: string | null;
      nombre?: string | null;
      apellido?: string | null;
    },
    tipo: TipoDocumento,
  ) {
    if (tipo !== TipoDocumento.FACTURA) return;

    const ruc = this.cleanText(cliente.ruc);
    if (!ruc) {
      throw new BadRequestException(
        'FACTURA requiere que el cliente tenga RUC',
      );
    }
    if (!this.isValidSunatRuc(ruc)) {
      throw new BadRequestException(
        'FACTURA requiere RUC SUNAT válido de 11 dígitos',
      );
    }

    const nombreFiscal = [cliente.razonSocial, cliente.nombre, cliente.apellido]
      .map((value) => this.cleanText(value))
      .filter(Boolean)
      .join(' ');
    if (!nombreFiscal) {
      throw new BadRequestException(
        'FACTURA requiere razón social o nombre fiscal del cliente',
      );
    }
  }

  private assertTipoEmisionDirecta(tipo: TipoDocumento) {
    if (tipo !== TipoDocumento.FACTURA && tipo !== TipoDocumento.BOLETA) {
      throw new BadRequestException(
        'Solo se pueden emitir FACTURA o BOLETA directamente',
      );
    }
  }

  private async resolveAmbiente() {
    const configured = this.configService.get<string>('SUNAT_ENVIRONMENT');
    if (configured === AmbienteSunat.PRODUCCION)
      return AmbienteSunat.PRODUCCION;
    if (configured === AmbienteSunat.BETA) return AmbienteSunat.BETA;

    const configFiscal = await this.prisma.configEmpresaFiscal.findFirst({
      select: { ambienteDefault: true },
      orderBy: { createdAt: 'asc' },
    });

    return this.resolveAmbienteFromConfig(configFiscal);
  }

  private resolveAmbienteFromConfig(
    configFiscal?: { ambienteDefault?: AmbienteSunat | string | null } | null,
  ) {
    const configured = this.configService.get<string>('SUNAT_ENVIRONMENT');
    if (configured === AmbienteSunat.PRODUCCION)
      return AmbienteSunat.PRODUCCION;
    if (configured === AmbienteSunat.BETA) return AmbienteSunat.BETA;

    return configFiscal?.ambienteDefault === AmbienteSunat.PRODUCCION
      ? AmbienteSunat.PRODUCCION
      : AmbienteSunat.BETA;
  }

  private normalizeOptionalText(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private parseMoneyFilter(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('Filtro de monto inválido');
    }
    return parsed;
  }

  private parseDateStart(value?: string) {
    if (!value) return undefined;
    const parsed = new Date(`${value}T00:00:00.000-05:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Fecha desde inválida');
    }
    return parsed;
  }

  private parseDateEnd(value?: string) {
    if (!value) return undefined;
    const parsed = new Date(`${value}T23:59:59.999-05:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Fecha hasta inválida');
    }
    return parsed;
  }

  private cleanText(value: unknown) {
    if (typeof value !== 'string') return '';
    return value.trim();
  }

  private async assertFiscalConfigReadyForBaja(comprobante: {
    emisorRuc?: string | null;
  }) {
    const emisorRuc = this.cleanText(comprobante.emisorRuc);
    if (!emisorRuc) {
      throw new BadRequestException(
        'El comprobante no tiene RUC emisor congelado; no se puede generar comunicación de baja.',
      );
    }

    const config = await this.prisma.configEmpresaFiscal.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true, ruc: true },
    });
    if (!config) {
      throw new BadRequestException(
        'No hay configuración fiscal de empresa. Configure ConfigEmpresaFiscal antes de comunicar bajas.',
      );
    }
    if (this.cleanText(config.ruc) !== emisorRuc) {
      throw new BadRequestException(
        'El RUC emisor del comprobante no coincide con la configuración fiscal vigente.',
      );
    }

    const certificadoActivo = await this.prisma.certificadoDigital.findFirst({
      where: {
        configEmpresaFiscalId: config.id,
        activo: true,
        revokedAt: null,
        deletedAt: null,
      },
      select: { id: true, validoHasta: true },
    });
    if (!certificadoActivo) {
      throw new BadRequestException(
        'No hay certificado digital activo. Sube y activa un certificado antes de comunicar bajas.',
      );
    }
    if (
      certificadoActivo.validoHasta &&
      certificadoActivo.validoHasta.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'El certificado digital activo está vencido. Renueva el certificado antes de comunicar bajas.',
      );
    }

    const password = this.configService.get<string>('SUNAT_SOL_PASSWORD');
    const fullUser = this.configService.get<string>('SUNAT_SOL_USERNAME');
    const solUser = this.configService.get<string>('SUNAT_SOL_USER');
    if (!password || (!fullUser && !solUser)) {
      throw new BadRequestException(
        'Credenciales SUNAT (SUNAT_SOL_USERNAME/SUNAT_SOL_PASSWORD) no configuradas en backend.',
      );
    }
  }

  private isValidSunatRuc(ruc: string) {
    if (!/^(10|15|17|20)\d{9}$/.test(ruc)) return false;

    const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const sum = factors.reduce(
      (total, factor, index) => total + Number(ruc[index]) * factor,
      0,
    );
    const remainder = sum % 11;
    const check = remainder < 2 ? remainder : 11 - remainder;
    return check === Number(ruc[10]);
  }

  /**
   * Doc 06 §5 — delegamos el cálculo al helper compartido (Lima TZ, sin DST).
   * Mantenemos el wrapper que devuelve string ISO para los callers existentes.
   */
  private calcularDeadlineEnvio(tipo: TipoDocumento, fechaEmision: Date) {
    return calcularDeadlineEnvioShared(
      tipo,
      fechaEmision,
    ).deadline.toISOString();
  }

  private calcularDeadlineDiasHabiles(
    desde: Date,
    limite: number,
    feriados: Array<{ fecha: Date }> = [],
  ) {
    const feriadosKeys = new Set(
      feriados.map((feriado) => this.dateKeyLima(feriado.fecha)),
    );
    const cursor = new Date(desde);
    let diasHabiles = 0;
    while (diasHabiles < limite) {
      cursor.setDate(cursor.getDate() + 1);
      const dia = cursor.getDay();
      if (
        dia !== 0 &&
        dia !== 6 &&
        !feriadosKeys.has(this.dateKeyLima(cursor))
      ) {
        diasHabiles += 1;
      }
    }
    return this.endOfDayLima(cursor);
  }

  private endOfDayLima(fecha: Date) {
    const offsetMs = -300 * 60 * 1000;
    const limaCalendar = new Date(fecha.getTime() + offsetMs);
    const year = limaCalendar.getUTCFullYear();
    const month = limaCalendar.getUTCMonth();
    const day = limaCalendar.getUTCDate();
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - offsetMs);
  }

  private dateKeyLima(fecha: Date) {
    const offsetMs = -300 * 60 * 1000;
    const limaCalendar = new Date(fecha.getTime() + offsetMs);
    return [
      limaCalendar.getUTCFullYear(),
      String(limaCalendar.getUTCMonth() + 1).padStart(2, '0'),
      String(limaCalendar.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  /**
   * Doc 06 §3 — política de reintentos:
   *   attempts=4, backoff exponencial inicio 3 min → 3, 9, 27, 81 min.
   *   removeOnComplete/Fail = false para preservar audit-trail.
   *
   * Doc 06 §11 — jobId determinístico = comprobanteId-{intento} para que
   * BullMQ deduplique re-encolados manuales sobre el mismo comprobante.
   */
  private sunatJobOptions(
    deadline: string,
    comprobanteId?: string,
    intento = 1,
  ): JobsOptions {
    const remainingMs = new Date(deadline).getTime() - Date.now();
    const urgent = remainingMs > 0 && remainingMs <= 6 * 60 * 60 * 1000;

    return {
      attempts: 4,
      backoff: { type: 'exponential', delay: 3 * 60 * 1000 },
      removeOnComplete: false,
      removeOnFail: false,
      ...(comprobanteId ? { jobId: `${comprobanteId}-${intento}` } : {}),
      ...(urgent ? { priority: 1 } : {}),
    };
  }

  private documentCodeForTipo(tipo: TipoDocumento) {
    const map: Record<TipoDocumento, string> = {
      [TipoDocumento.FACTURA]: '01',
      [TipoDocumento.BOLETA]: '03',
      [TipoDocumento.NOTA_CREDITO]: '07',
      [TipoDocumento.NOTA_DEBITO]: '08',
    };
    return map[tipo];
  }

  private seriePrefixForNotaOrigen(tipo: TipoDocumento) {
    return tipo === TipoDocumento.BOLETA ? 'B' : 'F';
  }

  private estadoFromSunatStatus(
    codigoRespuesta: string,
    accepted: boolean,
    estadoActual: EstadoComprobante,
  ) {
    if (accepted || codigoRespuesta === '0') return EstadoComprobante.ACEPTADO;
    if (codigoRespuesta === '98') return EstadoComprobante.EN_PROCESO_SUNAT;
    if (!codigoRespuesta || codigoRespuesta === 'UNKNOWN') return estadoActual;
    return EstadoComprobante.RECHAZADO;
  }

  private estadoFacturacionFromComprobante(estado: EstadoComprobante) {
    switch (estado) {
      case EstadoComprobante.ACEPTADO:
        return EstadoFacturacionVenta.EMITIDA;
      case EstadoComprobante.ACEPTADO_CON_OBSERVACIONES:
        return EstadoFacturacionVenta.EMITIDA_CON_OBS;
      case EstadoComprobante.RECHAZADO:
        return EstadoFacturacionVenta.RECHAZADA;
      case EstadoComprobante.ANULADO:
        return EstadoFacturacionVenta.ANULADA_FISCAL;
      case EstadoComprobante.PENDIENTE_ENVIO:
      case EstadoComprobante.EN_PROCESO_SUNAT:
      case EstadoComprobante.BAJA_PENDIENTE:
        return EstadoFacturacionVenta.EN_EMISION;
    }
  }

  private async updateVentaEstadoFacturacion(
    ventaId: string | null | undefined,
    estadoFacturacion?: EstadoFacturacionVenta,
  ) {
    // Tras la unificación, NC/ND tienen ventaId=null y no actualizan venta.
    if (!ventaId || !estadoFacturacion) return;

    await this.prisma.venta.update({
      where: { id: ventaId },
      data: { estadoFacturacion },
    });
  }

  private buildStorageKey(
    comprobante: {
      emisorRuc?: string | null;
      ambiente?: AmbienteSunat | string | null;
      fechaEmision?: Date | string | null;
      tipo: unknown;
      serie: string;
      correlativo: number;
    },
    extension: 'xml' | 'cdr' | 'pdf',
  ) {
    return this.storage.buildComprobanteStorageKey(comprobante, extension);
  }

  private async generarIdentificadorBaja(
    tx: Prisma.TransactionClient,
    ambiente: AmbienteSunat,
  ): Promise<string> {
    const now = new Date();
    const fecha = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    // Doc 04 §4.1 — un solo registro de configuración fiscal en V1.
    const config = await tx.configEmpresaFiscal.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!config) {
      throw new BadRequestException(
        'No hay ConfigEmpresaFiscal definida. Configura la empresa antes de comunicar bajas.',
      );
    }

    // Atómico: upsert + increment dentro de la transacción → correlativo único por día/ambiente.
    const serie = await tx.serieDocumentoBaja.upsert({
      where: {
        configEmpresaFiscalId_ambiente_fecha: {
          configEmpresaFiscalId: config.id,
          ambiente,
          fecha,
        },
      },
      update: { correlativoActual: { increment: 1 } },
      create: {
        configEmpresaFiscalId: config.id,
        ambiente,
        fecha,
        correlativoActual: 1,
      },
      select: { correlativoActual: true },
    });

    const suffix = String(serie.correlativoActual).padStart(3, '0');
    return `RA-${fecha}-${suffix}`;
  }

  // ── Reintentar envío de comprobante rechazado ───────────────────────

  async reintentarEnvio(id: string) {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id },
    });

    if (!comprobante) {
      throw new NotFoundException(`Comprobante ${id} no encontrado`);
    }

    const estadoComprobante = comprobante.estado as EstadoComprobante;
    // Doc 06 §3 — admitir reintento manual desde RECHAZADO o REQUIERE_REVISION
    // (este último es el estado tras agotar reintentos automáticos).
    if (
      estadoComprobante !== EstadoComprobante.RECHAZADO &&
      estadoComprobante !== EstadoComprobante.REQUIERE_REVISION
    ) {
      throw new BadRequestException(
        `Solo se pueden reintentar comprobantes en RECHAZADO o REQUIERE_REVISION. Estado actual: ${estadoComprobante}`,
      );
    }

    const intentoNumero = Number(comprobante.intentosEnvio ?? 0) + 1;
    await this.prisma.comprobante.update({
      where: { id },
      data: {
        estado: EstadoComprobante.PENDIENTE_ENVIO,
        payloadHash: null,
        hashCpe: null,
        xmlStorageKey: null,
      },
    });
    await this.updateVentaEstadoFacturacion(
      comprobante.ventaId,
      EstadoFacturacionVenta.EN_EMISION,
    );

    await this.prisma.comprobanteEnvioLog.create({
      data: {
        comprobanteId: id,
        tipo: TipoEnvio.REINTENTO,
        proveedor: 'SISTEMA',
        tipoEvento: EventoEnvioComprobante.REINTENTO,
        estado: EstadoComprobante.PENDIENTE_ENVIO,
        intento: intentoNumero,
        mensaje: `Reintento manual #${intentoNumero} desde estado ${estadoComprobante}`,
      },
    });

    const deadline = this.calcularDeadlineEnvio(
      comprobante.tipo as TipoDocumento,
      comprobante.fechaEmision,
    );
    await this.envioCpeQueue.add(
      'enviar-comprobante',
      {
        comprobanteId: id,
        deadline,
      },
      this.sunatJobOptions(deadline, id, intentoNumero),
    );

    this.logger.log(
      `Comprobante ${comprobante.numero} reencolado para reintento #${intentoNumero}`,
    );
    return {
      message: `Comprobante ${comprobante.numero} reencolado para reintento`,
    };
  }

  // ── Doc 08 helpers (NC/ND) ──────────────────────────────────────────

  /**
   * Doc 08 §2 — Resuelve el código Cat 09 priorizando el campo nuevo
   * (`motivoCodigo`). El campo legacy `tipo` (string libre) sólo se honra si
   * coincide exactamente con un código del catálogo; cualquier otra cosa se
   * rechaza para no convertir alias informales en motivos válidos.
   */
  private resolverMotivoNcCodigo(dto: CreateNotaCreditoDto): MotivoNCCodigo {
    const explicit = dto.motivoCodigo?.trim();
    if (explicit) {
      if (!(MOTIVOS_NC_TODOS as readonly string[]).includes(explicit)) {
        throw new BadRequestException(
          `Motivo Cat 09 inválido: "${explicit}". Valores permitidos: ${MOTIVOS_NC_TODOS.join(', ')}.`,
        );
      }
      return explicit as MotivoNCCodigo;
    }
    const legacy = dto.tipo?.trim();
    if (legacy && (MOTIVOS_NC_TODOS as readonly string[]).includes(legacy)) {
      return legacy as MotivoNCCodigo;
    }
    throw new BadRequestException(
      'Falta el motivo de la nota de crédito (motivoCodigo Cat 09).',
    );
  }

  /**
   * Doc 08 §6 — Resuelve código Cat 10 (ND). Sin alias legacy: la ND se
   * introdujo con el campo nuevo desde el inicio.
   */
  private resolverMotivoNdCodigo(dto: CreateNotaDebitoDto): MotivoNDCodigo {
    const explicit = dto.motivoCodigo?.trim();
    if (!explicit) {
      throw new BadRequestException(
        'Falta el motivo de la nota de débito (motivoCodigo Cat 10).',
      );
    }
    if (!(MOTIVOS_ND_TODOS as readonly string[]).includes(explicit)) {
      throw new BadRequestException(
        `Motivo Cat 10 inválido: "${explicit}". Valores permitidos: ${MOTIVOS_ND_TODOS.join(', ')}.`,
      );
    }
    return explicit as MotivoNDCodigo;
  }

  private assertNotaLineasValidas(
    lineas:
      | Array<{ item: number; cantidad: number; total: number }>
      | undefined,
    monto: number,
    tipo: 'NC' | 'ND',
  ) {
    if (!lineas || lineas.length === 0) return;
    const items = new Set<number>();
    let totalLineas = 0;
    for (const linea of lineas) {
      if (items.has(linea.item)) {
        throw new BadRequestException(
          `La ${tipo} tiene líneas duplicadas para el ítem ${linea.item}.`,
        );
      }
      items.add(linea.item);
      if (!Number.isFinite(linea.cantidad) || linea.cantidad <= 0) {
        throw new BadRequestException(
          `La cantidad del ítem ${linea.item} debe ser mayor a cero.`,
        );
      }
      if (!Number.isFinite(linea.total) || linea.total <= 0) {
        throw new BadRequestException(
          `El total del ítem ${linea.item} debe ser mayor a cero.`,
        );
      }
      totalLineas += Number(linea.total);
    }
    if (Math.abs(totalLineas - monto) > 0.01) {
      throw new BadRequestException(
        `La suma de líneas (S/ ${totalLineas.toFixed(2)}) debe coincidir con el monto de la ${tipo} (S/ ${monto.toFixed(2)}).`,
      );
    }
  }

  private async createNotaDetallesEnTx(
    tx: Prisma.TransactionClient,
    comprobanteId: string,
    origen: {
      total: unknown;
      igv: unknown;
      // Los enums vienen del cliente Prisma generado (`generated/prisma/enums`),
      // que es estructuralmente equivalente a `@erp/shared` pero nominalmente
      // distinto. Tipamos como `string` para no acoplar la firma a una de
      // las dos fuentes (mismo criterio que en portal-cliente.service.ts).
      detallesFiscales?: Array<{
        item: number;
        productoId?: string | null;
        codigoInterno?: string | null;
        descripcion: string;
        unidadSunat: string;
        tipoFiscalProducto: string;
        tipoAfectacionIgv: string;
        cantidad: unknown;
        valorUnitario: unknown;
        precioUnitario: unknown;
        descuento: unknown;
        baseImponible: unknown;
        igv: unknown;
        total: unknown;
      }>;
    },
    lineas:
      | Array<{
          item: number;
          descripcion: string;
          cantidad: number;
          precioUnitario: number;
          total: number;
        }>
      | undefined,
    monto: number,
    motivoDescripcion: string,
    anulaTotalmente: boolean,
  ) {
    const origenDetalles = origen.detallesFiscales ?? [];
    if (origenDetalles.length === 0) return;

    const sourceLineas =
      lineas && lineas.length > 0
        ? lineas
        : anulaTotalmente
          ? this.scaleOrigenDetallesToMonto(origenDetalles, monto)
          : [
              {
                item: origenDetalles[0].item,
                descripcion: motivoDescripcion,
                cantidad: 1,
                precioUnitario: monto,
                total: monto,
              },
            ];

    const originByItem = new Map(
      origenDetalles.map((detalle) => [detalle.item, detalle]),
    );
    if (lineas && lineas.length > 0) {
      const invalid = lineas.find((linea) => !originByItem.has(linea.item));
      if (invalid) {
        throw new BadRequestException(
          `El ítem ${invalid.item} no existe en el comprobante origen.`,
        );
      }
    }
    const originTotal = Number(origen.total ?? 0);
    const originIgv = Number(origen.igv ?? 0);
    const igvRatio = originTotal > 0 ? originIgv / originTotal : 18 / 118;

    await tx.comprobanteDetalle.createMany({
      data: sourceLineas.map((linea, index) => {
        const source = originByItem.get(linea.item) ?? origenDetalles[0];
        const total = +Number(linea.total).toFixed(2);
        const igv = +(total * igvRatio).toFixed(2);
        const baseImponible = +(total - igv).toFixed(2);
        const cantidad = Number(linea.cantidad);
        const valorUnitario =
          cantidad > 0 ? +(baseImponible / cantidad).toFixed(4) : 0;
        const precioUnitario =
          cantidad > 0 ? +(total / cantidad).toFixed(4) : total;
        const tipoFiscalProducto = (source.tipoFiscalProducto ??
          TipoFiscalProducto.SERVICIO) as Prisma.ComprobanteDetalleCreateManyInput['tipoFiscalProducto'];
        return {
          comprobanteId,
          productoId: source.productoId ?? null,
          item: index + 1,
          codigoInterno: source.codigoInterno ?? `AJUSTE-${linea.item}`,
          descripcion: linea.descripcion || source.descripcion,
          unidadSunat: normalizeSunatUnidadMedidaCode(
            source.unidadSunat,
            tipoFiscalProducto === TipoFiscalProducto.SERVICIO ? 'ZZ' : 'NIU',
          ),
          tipoFiscalProducto,
          tipoAfectacionIgv: (source.tipoAfectacionIgv ??
            TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA) as Prisma.ComprobanteDetalleCreateManyInput['tipoAfectacionIgv'],
          cantidad,
          valorUnitario,
          precioUnitario,
          descuento: 0,
          baseImponible,
          igv,
          total,
          metadataFiscal: {
            origenItem: linea.item,
            origenDescripcion: source.descripcion,
          } as Prisma.InputJsonValue,
        };
      }) as Prisma.ComprobanteDetalleCreateManyInput[],
    });
  }

  private scaleOrigenDetallesToMonto(
    detalles: Array<{
      item: number;
      descripcion: string;
      cantidad: unknown;
      precioUnitario: unknown;
      total: unknown;
    }>,
    monto: number,
  ) {
    const totalOrigen = detalles.reduce(
      (sum, detalle) => sum + Number(detalle.total ?? 0),
      0,
    );
    const ratio = totalOrigen > 0 ? monto / totalOrigen : 1;
    let acumulado = 0;
    return detalles.map((detalle, index) => {
      const isLast = index === detalles.length - 1;
      const total = isLast
        ? +(monto - acumulado).toFixed(2)
        : +(Number(detalle.total ?? 0) * ratio).toFixed(2);
      acumulado += total;
      return {
        item: detalle.item,
        descripcion: detalle.descripcion,
        cantidad: Number(detalle.cantidad),
        precioUnitario: Number(detalle.precioUnitario),
        total,
      };
    });
  }

  /**
   * Doc 08 §4 — Saldo no acreditado de un comprobante origen:
   *   total(origen) − Σ total(NCs aceptadas o aceptadas con observaciones)
   * Las NCs en RECHAZADO/PENDIENTE/EN_PROCESO no descuentan saldo: sólo SUNAT
   * efectiva descuenta. Esto evita que un envío fallido "queme" saldo.
   */
  private async calcularSaldoNoAcreditado(
    comprobanteOrigenId: string,
  ): Promise<number> {
    const origen = await this.prisma.comprobante.findUnique({
      where: { id: comprobanteOrigenId },
      select: { total: true },
    });
    if (!origen) return 0;
    const agg = await this.prisma.comprobante.aggregate({
      where: {
        tipo: TipoDocumento.NOTA_CREDITO,
        comprobanteOrigenId,
        estado: {
          in: [
            EstadoComprobante.ACEPTADO,
            EstadoComprobante.ACEPTADO_CON_OBSERVACIONES,
          ],
        },
      },
      _sum: { total: true },
    });
    const acreditado = Number(agg._sum.total ?? 0);
    const total = Number(origen.total);
    return +(total - acreditado).toFixed(2);
  }

  /**
   * Doc 08 §4 — ¿Hay otra NC sobre este origen que aún no ha terminado?
   * Una NC en estado no-terminal bloquea la emisión de otra NC sobre el mismo
   * origen (evita carreras y duplicación de saldo).
   */
  private async existeNcEnProceso(comprobanteOrigenId: string) {
    return this.prisma.comprobante.findFirst({
      where: {
        tipo: TipoDocumento.NOTA_CREDITO,
        comprobanteOrigenId,
        estado: {
          in: [
            EstadoComprobante.PENDIENTE_ENVIO,
            EstadoComprobante.EN_PROCESO_SUNAT,
            EstadoComprobante.RECHAZADO,
            EstadoComprobante.REQUIERE_REVISION,
          ],
        },
      },
      select: { id: true, numero: true, estado: true },
    });
  }

  /**
   * Endpoint público — devuelve saldo + bloqueos para que la UI deshabilite
   * el botón "Generar NC" con el motivo correcto. Una sola llamada en lugar
   * de tres permite al cliente decidir sin race conditions.
   */
  async getSaldoNoAcreditado(comprobanteOrigenId: string) {
    const origen = await this.prisma.comprobante.findUnique({
      where: { id: comprobanteOrigenId },
      select: {
        id: true,
        total: true,
        tipo: true,
        estado: true,
        fechaEmision: true,
      },
    });
    if (!origen) {
      throw new NotFoundException(
        `Comprobante ${comprobanteOrigenId} no encontrado`,
      );
    }
    const saldo = await this.calcularSaldoNoAcreditado(comprobanteOrigenId);
    const ncEnProceso = await this.existeNcEnProceso(comprobanteOrigenId);
    const feriados = await this.prisma.feriadoNacional.findMany({
      select: { fecha: true },
    });
    const ncExcepcionalPlazoVencido = plazoDiasHabilesVencido(
      origen.fechaEmision,
      PLAZO_NC_EXCEPCIONAL_DIAS_HABILES,
      feriados,
    );
    const totalOrigen = Number(origen.total);
    return {
      comprobanteOrigenId,
      tipoOrigen: origen.tipo,
      estadoOrigen: origen.estado,
      fechaEmision: origen.fechaEmision,
      totalOrigen,
      saldoNoAcreditado: saldo,
      acreditado: +(totalOrigen - saldo).toFixed(2),
      ncExcepcionalPlazoVencido,
      bloqueoPorNcEnProceso: ncEnProceso
        ? {
            id: ncEnProceso.id,
            numero: ncEnProceso.numero,
            estado: ncEnProceso.estado,
          }
        : null,
      puedeEmitirNc:
        saldo > 0 &&
        !ncEnProceso &&
        (origen.estado === EstadoComprobante.ACEPTADO ||
          origen.estado === EstadoComprobante.ACEPTADO_CON_OBSERVACIONES),
    };
  }

  // ── Elegibilidad para NC / ND / Baja ─────────────────────────────────

  /**
   * Doc 04 §5 / Doc 07 / Doc 08 §3 — Endpoint unificado de elegibilidad para
   * emitir una NC, ND o comunicación de baja sobre un comprobante origen.
   *
   * Centraliza saldo no acreditado, plazos (baja=7 días calendario, NC
   * excepcional=10 días hábiles), bloqueos por operaciones en proceso y
   * motivos aplicables. La UI debe consultar este endpoint **antes** de
   * abrir el formulario de NC/ND/Baja para mostrarle al operador, en un
   * solo lugar, todas las razones por las que la operación está permitida
   * o bloqueada.
   */
  async getElegibilidad(
    comprobanteId: string,
    proposito: PropositoElegibilidadComprobante,
  ): Promise<ElegibilidadComprobante> {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id: comprobanteId },
      select: {
        id: true,
        numero: true,
        tipo: true,
        estado: true,
        total: true,
        fechaEmision: true,
        cdrRecibidaAt: true,
      },
    });
    if (!comprobante) {
      throw new NotFoundException(`Comprobante ${comprobanteId} no encontrado`);
    }

    const tipoOrigen = comprobante.tipo as TipoDocumento;
    const estadoOrigen = comprobante.estado as EstadoComprobante;
    const totalOrigen = Number(comprobante.total);
    const fechaEmision = comprobante.fechaEmision;
    const cdrRecibidaAt = comprobante.cdrRecibidaAt ?? null;

    const bloqueos: BloqueoElegibilidad[] = [];
    let saldoNoAcreditado: number | undefined;
    let acreditado: number | undefined;
    let plazoVenceAt: string | null = null;
    let remainingMs: number | null = null;
    let plazoNcExcepcionalVenceAt: string | null = null;
    let plazoNcExcepcionalVencido: boolean | undefined;
    let bloqueoPorOperacionEnProceso: OperacionEnProcesoElegibilidad | null =
      null;
    let motivosAplicables: MotivoAplicable[] = [];

    const estadoAceptado =
      estadoOrigen === EstadoComprobante.ACEPTADO ||
      estadoOrigen === EstadoComprobante.ACEPTADO_CON_OBSERVACIONES;

    if (proposito === 'nc') {
      if (!estadoAceptado) {
        bloqueos.push({
          codigo: 'ESTADO_INVALIDO',
          mensaje: `Solo se pueden emitir NC sobre comprobantes ACEPTADOS por SUNAT. Estado actual: ${estadoOrigen}.`,
        });
      }

      const tipoSoportadoParaNc =
        tipoOrigen === TipoDocumento.FACTURA ||
        tipoOrigen === TipoDocumento.BOLETA ||
        tipoOrigen === TipoDocumento.NOTA_CREDITO ||
        tipoOrigen === TipoDocumento.NOTA_DEBITO;
      if (!tipoSoportadoParaNc) {
        bloqueos.push({
          codigo: 'TIPO_NO_PERMITIDO',
          mensaje: `Tipo de comprobante origen ${String(tipoOrigen)} no admite nota de crédito.`,
        });
      }

      if (estadoAceptado && tipoSoportadoParaNc) {
        const saldo = await this.calcularSaldoNoAcreditado(comprobanteId);
        saldoNoAcreditado = saldo;
        acreditado = +(totalOrigen - saldo).toFixed(2);
        if (saldo <= 0) {
          bloqueos.push({
            codigo: 'SALDO_AGOTADO',
            mensaje:
              'El comprobante ya fue acreditado en su totalidad mediante NCs previas.',
          });
        }
        const ncEnProceso = await this.existeNcEnProceso(comprobanteId);
        if (ncEnProceso) {
          bloqueoPorOperacionEnProceso = {
            id: ncEnProceso.id,
            numero: ncEnProceso.numero,
            estado: String(ncEnProceso.estado),
            tipo: 'NOTA_CREDITO',
          };
          bloqueos.push({
            codigo: 'NC_EN_PROCESO',
            mensaje: `Ya hay una NC ${ncEnProceso.numero} en estado ${ncEnProceso.estado} sobre este comprobante.`,
          });
        }
      }

      // Plazo NC excepcional (10 días hábiles desde emisión origen).
      const feriados = await this.prisma.feriadoNacional.findMany({
        select: { fecha: true },
      });
      plazoNcExcepcionalVencido = plazoDiasHabilesVencido(
        fechaEmision,
        PLAZO_NC_EXCEPCIONAL_DIAS_HABILES,
        feriados,
      );
      plazoNcExcepcionalVenceAt = this.calcularDeadlineDiasHabiles(
        fechaEmision,
        PLAZO_NC_EXCEPCIONAL_DIAS_HABILES,
        feriados,
      ).toISOString();

      // Motivos aplicables: regulares (filtrados por tipo origen) +
      // excepcionales (01/02) si el plazo aún no venció.
      const regulares: MotivoAplicable[] = MOTIVOS_NC_REGULAR.filter(
        (m) => !m.soloFactura || tipoOrigen === TipoDocumento.FACTURA,
      ).map((m) => ({
        codigo: m.codigo,
        label: m.label,
        soloFactura: m.soloFactura,
      }));
      // Motivo 01 (anulación) también aplica como regular en el catálogo
      // visible para boletas. Lo añadimos manualmente porque el descriptor
      // canónico vive en el catálogo excepcional.
      const anulacionRegular: MotivoAplicable = {
        codigo: '01',
        label: 'Anulación de la operación',
      };
      const excepcionales: MotivoAplicable[] = plazoNcExcepcionalVencido
        ? []
        : MOTIVOS_NC_EXCEPCIONAL.map((m) => ({
            codigo: m.codigo,
            label: m.label,
            esExcepcional: true,
          }));
      motivosAplicables = [anulacionRegular, ...regulares, ...excepcionales];
    } else if (proposito === 'nd') {
      if (!estadoAceptado) {
        bloqueos.push({
          codigo: 'ESTADO_INVALIDO',
          mensaje: `Solo se pueden emitir ND sobre comprobantes ACEPTADOS por SUNAT. Estado actual: ${estadoOrigen}.`,
        });
      }
      // Doc 08 §7.1 — origen permitido para ND: 01/03/07/08.
      const tipoSoportado =
        tipoOrigen === TipoDocumento.FACTURA ||
        tipoOrigen === TipoDocumento.BOLETA ||
        tipoOrigen === TipoDocumento.NOTA_CREDITO ||
        tipoOrigen === TipoDocumento.NOTA_DEBITO;
      if (!tipoSoportado) {
        bloqueos.push({
          codigo: 'TIPO_NO_PERMITIDO',
          mensaje: `Tipo de comprobante origen ${String(tipoOrigen)} no admite nota de débito.`,
        });
      }
      motivosAplicables = MOTIVOS_ND.map((m) => ({
        codigo: m.codigo,
        label: m.label,
      }));
    } else {
      // proposito === 'baja'
      // Doc 04 §1+§3 — boletas no se anulan vía RA, sino vía NC motivo 01.
      if (tipoOrigen === TipoDocumento.BOLETA) {
        bloqueos.push({
          codigo: 'BAJA_NO_APLICA_BOLETA',
          mensaje:
            'Las boletas se anulan emitiendo una nota de crédito motivo 01 (anulación), no comunicación de baja.',
        });
      }
      if (!estadoAceptado) {
        bloqueos.push({
          codigo: 'ESTADO_INVALIDO',
          mensaje: `Solo se pueden comunicar bajas de comprobantes ACEPTADOS por SUNAT. Estado actual: ${estadoOrigen}.`,
        });
      }

      // Plazo: 7 días calendario desde CDR (o fechaEmision como fallback).
      const baseDeadline = cdrRecibidaAt ?? fechaEmision;
      const deadline = calcularDeadlineComunicacionBaja(new Date(baseDeadline));
      plazoVenceAt = deadline.deadline.toISOString();
      remainingMs = deadline.remainingMs;
      if (deadline.isVencido) {
        bloqueos.push({
          codigo: 'PLAZO_BAJA_VENCIDO',
          mensaje:
            'El plazo para comunicar la baja venció (7 días calendario desde la CDR). Emite una nota de crédito motivo 01 en su lugar.',
        });
      }

      // Duplicidad: ya existe una baja PENDIENTE/EN_PROCESO/ACEPTADA.
      const bajaActiva = await this.prisma.comunicacionBaja.findFirst({
        where: {
          comprobanteId,
          estado: {
            in: [
              EstadoComunicacionBaja.PENDIENTE,
              EstadoComunicacionBaja.EN_PROCESO,
              EstadoComunicacionBaja.ACEPTADA,
            ],
          },
        },
        select: { id: true, estado: true, identificadorBaja: true },
      });
      if (bajaActiva) {
        bloqueoPorOperacionEnProceso = {
          id: bajaActiva.id,
          numero: bajaActiva.identificadorBaja,
          estado: String(bajaActiva.estado),
          tipo: 'COMUNICACION_BAJA',
        };
        bloqueos.push({
          codigo: 'BAJA_EN_PROCESO',
          mensaje: `Ya existe una comunicación de baja ${bajaActiva.identificadorBaja} en estado ${bajaActiva.estado} para este comprobante.`,
        });
      }
    }

    const result: ElegibilidadComprobante = {
      comprobanteId,
      proposito,
      puede: bloqueos.length === 0,
      bloqueos,
      numero: comprobante.numero,
      tipoOrigen: String(tipoOrigen),
      estadoOrigen: String(estadoOrigen),
      fechaEmision: fechaEmision.toISOString(),
      cdrRecibidaAt: cdrRecibidaAt ? cdrRecibidaAt.toISOString() : null,
      totalOrigen,
      // Doc 04 §2 — todos los CPE locales se emiten en PEN. Si en el
      // futuro se soporta exportación, leer la moneda del snapshot.
      moneda: 'PEN',
      bloqueoPorOperacionEnProceso,
      motivosAplicables,
    };
    if (proposito === 'nc') {
      result.saldoNoAcreditado = saldoNoAcreditado;
      result.acreditado = acreditado;
      result.plazoNcExcepcionalVenceAt = plazoNcExcepcionalVenceAt;
      result.plazoNcExcepcionalVencido = plazoNcExcepcionalVencido;
    }
    if (proposito === 'baja') {
      result.plazoVenceAt = plazoVenceAt;
      result.remainingMs = remainingMs;
    }
    return result;
  }
}
