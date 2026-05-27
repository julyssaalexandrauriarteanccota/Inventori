import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue, type JobsOptions } from 'bullmq';
import { createHash } from 'crypto';
import type { Prisma } from '../../../generated/prisma/client';
import {
  AmbienteSunat,
  EstadoComunicacionBaja,
  EstadoComprobante,
  EstadoFacturacionVenta,
  EventoEnvioComprobante,
  RolUsuario,
  SocketEvents,
  ComprobanteEventPayload,
  TipoEnvio,
  TipoDocumento,
  calcularDeadlineEnvio as calcularDeadlineEnvioShared,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from '../../websockets/events.service';
import { VentaReversoFiscalService } from '../ventas/venta-reverso-fiscal.service';
import { FiscalStorageService } from './fiscal-storage.service';
import { ComprobantePdfService } from './comprobante-pdf.service';
import { ComprobanteEmailService } from './comprobante-email.service';
import { SunatDirectGateway } from './sunat-direct.gateway';
import type {
  SunatSendBillResult,
  SunatSendSummaryResult,
  SunatStatusResult,
} from './sunat-direct.gateway';
import { GreenterGateway } from './greenter.gateway';
import { SunatPayloadBuilder } from './sunat-payload.builder';
import { SunatXmlSigner } from './sunat-xml.signer';
import { classifySunatError } from './sunat-error-classifier';

interface EnviarComprobantePayload {
  comprobanteId: string;
  deadline?: string;
}

// Doc 01 §arch + Doc 08 §1 — legacy: jobs encolados antes de la unificación
// usaban `notaCreditoId` / `notaDebitoId`. Tras unificar NC/ND a Comprobante,
// el id es el mismo UUID; la migración 20260506200000 preserva los ids.
interface LegacyEnviarNotaPayload {
  notaCreditoId?: string;
  notaDebitoId?: string;
  deadline?: string;
}

export interface ComunicarBajaPayload {
  comunicacionBajaId: string;
  deadline?: string;
}

export interface ConsultarTicketBajaPayload {
  comunicacionBajaId: string;
  deadline?: string;
  intento?: number;
}

export interface ConsultarEstadoComprobantePayload {
  comprobanteId: string;
  deadline?: string;
  forzado?: boolean;
}

/**
 * Doc 06 §1 — Worker `sunat.processor` que consume `cola-envio-cpe`. Sólo
 * maneja envíos de CPE primarios (factura, boleta, NC, ND). Las comunicaciones
 * de baja y polls de ticket viven en sus propias clases/colas.
 *
 * Los métodos delegables (comunicarBaja, consultarTicketBaja,
 * consultarEstadoComprobante) son `public` para que los thin processors
 * dedicados a `cola-baja` y `cola-consulta-ticket` puedan llamarlos sin
 * duplicar la lógica fiscal.
 */
@Processor('cola-envio-cpe')
export class SunatProcessor extends WorkerHost {
  private readonly logger = new Logger(SunatProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly events: EventsService,
    _ventaReversoFiscal: VentaReversoFiscalService,
    private readonly storage: FiscalStorageService,
    private readonly pdfService: ComprobantePdfService,
    private readonly emailService: ComprobanteEmailService,
    @InjectQueue('cola-consulta-ticket')
    private readonly consultaQueue: Queue,
    private readonly payloadBuilder?: SunatPayloadBuilder,
    private readonly xmlSigner?: SunatXmlSigner,
    private readonly sunatGateway?: SunatDirectGateway,
    private readonly greenterGateway?: GreenterGateway,
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'enviar-comprobante':
        return this.enviarComprobante(
          job.data as EnviarComprobantePayload,
          job,
        );
      // Compatibilidad con jobs legacy: el id sigue siendo el mismo Comprobante.id.
      case 'enviar-nota-credito':
      case 'enviar-nota-debito': {
        const data = job.data as LegacyEnviarNotaPayload;
        const comprobanteId = data.notaCreditoId ?? data.notaDebitoId;
        if (!comprobanteId) {
          this.logger.error(
            `${job.name}: payload legacy sin id de nota; descartando job`,
          );
          return;
        }
        return this.enviarComprobante(
          { comprobanteId, deadline: data.deadline },
          job,
        );
      }
      default:
        this.logger.warn(
          `cola-envio-cpe recibió job no soportado: ${job.name}`,
        );
    }
  }

  /**
   * Doc 06 §3 — un job está en su último intento cuando `attemptsMade + 1 >=
   * job.opts.attempts`. Si el handler corre fuera de BullMQ (tests, llamadas
   * internas), retornamos false para que la decisión escalar/reintentar quede
   * en el caller (vía throw).
   */
  private isLastAttempt(job?: Job): boolean {
    if (!job?.opts?.attempts) return false;
    const attempts = Number(job.opts.attempts);
    const attemptsMade = Number(job.attemptsMade ?? 0);
    if (!Number.isFinite(attempts) || attempts <= 0) return false;
    return attemptsMade + 1 >= attempts;
  }

  // ── enviar-comprobante ────────────────────────────────────────────────

  private async enviarComprobante(
    payload: EnviarComprobantePayload,
    job?: Job,
  ) {
    const { comprobanteId } = payload;

    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id: comprobanteId },
      include: {
        detallesFiscales: { orderBy: { item: 'asc' } },
        venta: {
          include: {
            detalles: { include: { producto: true } },
            cliente: true,
          },
        },
        // Doc 08 §1 — NC/ND requieren comprobanteOrigen para que el
        // payloadBuilder genere el BillingReference UBL.
        comprobanteOrigen: {
          include: { detallesFiscales: { orderBy: { item: 'asc' } } },
        },
      },
    });

    if (!comprobante) {
      this.logger.error(`Comprobante ${comprobanteId} no encontrado en worker`);
      return;
    }

    const tipoCpe = comprobante.tipo as TipoDocumento;
    const esNota =
      tipoCpe === TipoDocumento.NOTA_CREDITO ||
      tipoCpe === TipoDocumento.NOTA_DEBITO;

    // Doc 06 §4 — idempotencia: si el comprobante ya está en estado terminal
    // exitoso, no reenviar. SUNAT rechazaría por duplicado y bloquearíamos el
    // correlativo.
    const estadoActual = comprobante.estado as EstadoComprobante;
    if (
      estadoActual === EstadoComprobante.ACEPTADO ||
      estadoActual === EstadoComprobante.ACEPTADO_CON_OBSERVACIONES ||
      estadoActual === EstadoComprobante.ANULADO
    ) {
      this.logger.log(
        `Comprobante ${comprobante.numero} ya está ${estadoActual}, omitiendo reenvío (idempotencia).`,
      );
      return;
    }

    const deadline =
      payload.deadline ??
      this.calcularDeadlineEnvio(
        comprobante.tipo as TipoDocumento,
        comprobante.fechaEmision,
      );
    if (
      await this.markExpiredComprobanteIfNeeded(
        comprobante,
        deadline,
        'ENVIO_DEADLINE_VENCIDO',
      )
    ) {
      return;
    }

    const intento = Number(comprobante.intentosEnvio ?? 0) + 1;
    const startedAt = Date.now();
    const lastAttempt = this.isLastAttempt(job);

    // Doc 06 §4 — chequeo de "estado dudoso": último log fue ENVIO_INICIADO
    // sin CDR_RECIBIDO posterior. Si tenemos `payloadHash` persistido, el XML
    // ya cruzó hacia SUNAT en el intento anterior; reenviar el mismo bytestream.
    const lastLog = await this.prisma.comprobanteEnvioLog.findFirst({
      where: { comprobanteId },
      orderBy: { fecha: 'desc' },
    });
    const sospechaDuplicado =
      lastLog?.tipoEvento === EventoEnvioComprobante.ENVIO_INICIADO &&
      !!comprobante.payloadHash;

    await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        estado: EstadoComprobante.EN_PROCESO_SUNAT,
        fechaEnvio: new Date(),
        intentosEnvio: { increment: 1 },
      },
    });

    await this.prisma.comprobanteEnvioLog.create({
      data: {
        comprobanteId,
        tipo: TipoEnvio.ENVIO_INICIAL,
        proveedor: 'SUNAT_DIRECT',
        tipoEvento: EventoEnvioComprobante.ENVIO_INICIADO,
        estado: EstadoComprobante.EN_PROCESO_SUNAT,
        intento,
        responseDescription: sospechaDuplicado
          ? 'Reenvío con payload idempotente (estado dudoso del intento anterior)'
          : null,
      },
    });
    await this.updateVentaEstadoFacturacion(
      comprobante.ventaId,
      EstadoFacturacionVenta.EN_EMISION,
    );

    try {
      let result: SunatSendBillResult;

      if (this.useGreenterEngine()) {
        if (!this.greenterGateway) {
          throw new Error('GreenterGateway no inyectado');
        }

        const ambiente = await this.resolveAmbiente();
        const greenter = await this.greenterGateway.sendComprobante(
          comprobante as Record<string, unknown>,
          ambiente,
        );
        const xmlStorageKey = this.buildStorageKey(comprobante as never, 'xml');
        const signedXmlBuffer = this.xmlBuffer(greenter.signedXml);
        const payloadHash = this.sha256(signedXmlBuffer);
        await this.storage.writeObject(
          xmlStorageKey,
          signedXmlBuffer,
          `application/xml; charset=${this.xmlCharset(greenter.signedXml)}`,
        );
        await this.prisma.comprobante.update({
          where: { id: comprobanteId },
          data: {
            payloadHash,
            xmlStorageKey,
            hashCpe: payloadHash,
          },
        });
        result = greenter.result;
      } else {
        if (!this.payloadBuilder || !this.xmlSigner || !this.sunatGateway) {
          throw new Error('Servicios SUNAT directo no inyectados');
        }

        // Doc 08 §1 — el builder se elige por tipo. NC/ND requieren el origen
        // para emitir el BillingReference UBL.
        const built = esNota
          ? tipoCpe === TipoDocumento.NOTA_CREDITO
            ? this.payloadBuilder.buildCreditNote(
                comprobante as Record<string, unknown>,
              )
            : this.payloadBuilder.buildDebitNote(
                comprobante as Record<string, unknown>,
              )
          : this.payloadBuilder.buildInvoice(comprobante);
        const xmlStorageKey = this.buildStorageKey(comprobante as never, 'xml');

        let signedXml: string;
        let payloadHash: string;
        let certificateFingerprintSha256: string | null = null;

        const cachedXml = await this.storage.readObjectText(xmlStorageKey);
        const debeRegenerarXmlFirmado =
          estadoActual === EstadoComprobante.RECHAZADO ||
          estadoActual === EstadoComprobante.REQUIERE_REVISION;
        if (cachedXml && comprobante.payloadHash && !debeRegenerarXmlFirmado) {
          signedXml = cachedXml;
          payloadHash = comprobante.payloadHash;
          this.logger.log(
            `Reutilizando XML firmado previo de ${comprobante.numero} (payloadHash ${payloadHash.slice(0, 12)}...)`,
          );
        } else {
          const signed = await this.xmlSigner.sign(built.xml);
          signedXml = signed.signedXml;
          certificateFingerprintSha256 = signed.certificateFingerprintSha256;
          const signedXmlBuffer = this.xmlBuffer(signedXml);
          payloadHash = this.sha256(signedXmlBuffer);
          await this.storage.writeObject(
            xmlStorageKey,
            signedXmlBuffer,
            `application/xml; charset=${this.xmlCharset(signedXml)}`,
          );
          await this.prisma.comprobante.update({
            where: { id: comprobanteId },
            data: {
              payloadHash,
              xmlStorageKey,
              hashCpe: payloadHash,
              ...(certificateFingerprintSha256
                ? { hashSunat: certificateFingerprintSha256 }
                : {}),
            },
          });
        }

        const ambiente = await this.resolveAmbiente();
        result = await this.sunatGateway.sendBill({
          ruc: this.text((comprobante as Record<string, unknown>).emisorRuc),
          fileName: built.fileName,
          xmlFileName: built.xmlFileName,
          signedXml,
          ambiente,
        });
      }

      if (result.accepted) {
        const cdrStorageKey = result.cdrContent
          ? this.buildStorageKey(comprobante, 'cdr')
          : null;
        if (cdrStorageKey && result.cdrContent) {
          await this.storage.writeObject(
            cdrStorageKey,
            Buffer.from(result.cdrContent, 'base64'),
            'application/zip',
          );
        }
        const estadoAceptado = this.hasSunatObservaciones(result)
          ? EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
          : EstadoComprobante.ACEPTADO;

        // Doc 06 §2 paso 13 — generar y persistir PDF realmente. Sólo seteamos
        // pdfStorageKey si el archivo efectivamente fue producido y subido,
        // para que la UI no exponga descargas de PDFs inexistentes.
        const pdfStorageKey = await this.renderAndStorePdf(
          comprobante,
          estadoAceptado,
          result.codigoRespuesta,
          result.mensaje,
        );

        await this.prisma.comprobante.update({
          where: { id: comprobanteId },
          data: {
            estado: estadoAceptado,
            codigoSunat: result.codigoRespuesta,
            mensajeSunat: result.mensaje,
            cdrStorageKey,
            pdfStorageKey,
            xmlContent: null,
            cdrContent: null,
            cdrRecibidaAt: new Date(),
          },
        });
        await this.updateVentaEstadoFacturacion(
          comprobante.ventaId,
          estadoAceptado === EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
            ? EstadoFacturacionVenta.EMITIDA_CON_OBS
            : EstadoFacturacionVenta.EMITIDA,
        );
        // Doc 08 §3 — NC anulación total (motivo 01) sobre BOLETA marca la
        // venta del origen como ANULADA_FISCAL.
        if (tipoCpe === TipoDocumento.NOTA_CREDITO) {
          await this.markVentaAnuladaFiscalFromNotaCredito(
            comprobante as Record<string, unknown>,
          );
        }
        await this.prisma.comprobanteEnvioLog.create({
          data: {
            comprobanteId,
            tipo: TipoEnvio.ENVIO_INICIAL,
            proveedor: 'SUNAT_DIRECT',
            tipoEvento: EventoEnvioComprobante.CDR_RECIBIDO,
            estado: estadoAceptado,
            intento,
            requestPayload: result.requestPayload as Prisma.InputJsonValue,
            responsePayload: result.responsePayload as Prisma.InputJsonValue,
            responseCode: result.codigoRespuesta,
            responseDescription: result.mensaje,
            cdrStorageKey,
            durationMs: Date.now() - startedAt,
            codigoRespuesta: result.codigoRespuesta,
            mensaje: result.mensaje,
          },
        });
        this.logger.log(
          `Comprobante ${comprobante.numero} ${estadoAceptado} por SUNAT`,
        );
        await this.emailService.enviarComprobanteAceptado(comprobanteId);
        this.emitComprobanteEvent(
          comprobante,
          SocketEvents.COMPROBANTE_ACEPTADO,
          result.mensaje,
        );
      } else {
        // Doc 06 §3 — CDR de rechazo es funcional. Correlativo quemado;
        // el facturador decide si emite uno nuevo o reintenta corregido.
        await this.prisma.comprobante.update({
          where: { id: comprobanteId },
          data: {
            estado: EstadoComprobante.RECHAZADO,
            codigoSunat: result.codigoRespuesta,
            mensajeSunat: result.mensaje,
            xmlContent: null,
            cdrContent: null,
          },
        });
        await this.updateVentaEstadoFacturacion(
          comprobante.ventaId,
          EstadoFacturacionVenta.RECHAZADA,
        );
        await this.prisma.comprobanteEnvioLog.create({
          data: {
            comprobanteId,
            tipo: TipoEnvio.ENVIO_INICIAL,
            proveedor: 'SUNAT_DIRECT',
            tipoEvento: EventoEnvioComprobante.CDR_RECIBIDO,
            estado: EstadoComprobante.RECHAZADO,
            intento,
            requestPayload: result.requestPayload as Prisma.InputJsonValue,
            responsePayload: result.responsePayload as Prisma.InputJsonValue,
            responseCode: result.codigoRespuesta,
            responseDescription: result.mensaje,
            durationMs: Date.now() - startedAt,
            codigoRespuesta: result.codigoRespuesta,
            mensaje: result.mensaje,
          },
        });
        this.logger.warn(
          `Comprobante ${comprobante.numero} RECHAZADO: ${result.mensaje}`,
        );
        this.emitComprobanteEvent(
          comprobante,
          SocketEvents.COMPROBANTE_RECHAZADO,
          result.mensaje,
        );
      }
    } catch (error) {
      if (await this.isDevelopmentConfigurationError(error)) {
        return this.acceptDevLocal(
          comprobante,
          intento,
          (error as Error).message,
        );
      }

      // Doc 06 §3 — clasificación de errores:
      //   NO_RECUPERABLE → REQUIERE_REVISION inmediato, sin reintento.
      //   RECUPERABLE en último intento → REQUIERE_REVISION.
      //   RECUPERABLE no último → log ENVIO_ERROR + throw para que BullMQ
      //   reintente con backoff exponencial.
      //
      // En REQUIERE_REVISION la venta queda EN_EMISION (NO RECHAZADA): SUNAT
      // no rechazó, sólo no logramos enviar. RECHAZADA es exclusivo del path
      // funcional (CDR de rechazo).
      const classified = classifySunatError(error);
      const debeEscalar = classified.clase === 'NO_RECUPERABLE' || lastAttempt;
      const estadoFinal = debeEscalar
        ? EstadoComprobante.REQUIERE_REVISION
        : EstadoComprobante.PENDIENTE_ENVIO;
      const eventoFinal = debeEscalar
        ? EventoEnvioComprobante.REQUIERE_REVISION
        : EventoEnvioComprobante.ENVIO_ERROR;

      this.logger.error(
        `Error enviando comprobante ${comprobanteId} [${classified.clase}, intento=${intento}, last=${lastAttempt}]: ${(error as Error).message}`,
      );

      await this.prisma.comprobante.update({
        where: { id: comprobanteId },
        data: {
          estado: estadoFinal,
          mensajeSunat: `Error SUNAT directo: ${(error as Error).message}`,
        },
      });
      await this.updateVentaEstadoFacturacion(
        comprobante.ventaId,
        EstadoFacturacionVenta.EN_EMISION,
      );
      await this.prisma.comprobanteEnvioLog.create({
        data: {
          comprobanteId,
          tipo: debeEscalar ? TipoEnvio.ENVIO_INICIAL : TipoEnvio.REINTENTO,
          proveedor: 'SUNAT_DIRECT',
          tipoEvento: eventoFinal,
          estado: estadoFinal,
          intento,
          mensaje: `Error SUNAT directo [${classified.clase}/${classified.razon}]: ${(error as Error).message}`,
          errorMessage: (error as Error).message,
          durationMs: Date.now() - startedAt,
        },
      });

      if (debeEscalar) {
        this.emitComprobanteEvent(
          comprobante,
          SocketEvents.COMPROBANTE_REQUIERE_REVISION,
          `Error SUNAT directo [${classified.clase}/${classified.razon}]: ${(error as Error).message}`,
        );
        // No relanzamos: ya marcamos REQUIERE_REVISION; reintentar más sería
        // ruido. El facturador hace el reintento manual desde la UI.
        return;
      }

      throw error;
    }
  }

  // ── consultar-estado-comprobante (delegado por cola-consulta-ticket) ──

  /**
   * Doc 06 §5 — handler invocado por monitor.plazos cuando un comprobante
   * lleva mucho tiempo en EN_PROCESO_SUNAT. Llama a `getStatusCdr` para
   * obtener el estado real y reconciliar la BD.
   */
  async consultarEstadoComprobante(payload: ConsultarEstadoComprobantePayload) {
    const { comprobanteId } = payload;
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id: comprobanteId },
      include: {
        detallesFiscales: { orderBy: { item: 'asc' } },
        venta: { include: { cliente: true } },
      },
    });
    if (!comprobante) {
      this.logger.warn(
        `consultar-estado-comprobante: ${comprobanteId} no encontrado`,
      );
      return;
    }
    if (comprobante.estado !== EstadoComprobante.EN_PROCESO_SUNAT) {
      this.logger.log(
        `consultar-estado-comprobante: ${comprobante.numero} ya está ${comprobante.estado}, omitiendo`,
      );
      return;
    }
    if (!this.sunatGateway) {
      throw new Error('Servicios SUNAT directo no inyectados');
    }

    const startedAt = Date.now();
    const result = await this.sunatGateway.getStatusCdr({
      ruc: this.text((comprobante as Record<string, unknown>).emisorRuc, ''),
      tipoComprobante: this.documentCodeForTipo(comprobante.tipo),
      serie: comprobante.serie,
      correlativo: comprobante.correlativo,
      ambiente: await this.resolveAmbiente(),
    });

    if (result.accepted && result.codigoRespuesta === '0') {
      // Doc 06 §5 — al reconciliar EN_PROCESO_SUNAT debemos persistir el CDR y
      // generar PDF, igual que en el envío normal. De lo contrario el
      // comprobante quedaría ACEPTADO pero sin soporte documental.
      const cdrStorageKey = result.cdrContent
        ? this.buildStorageKey(comprobante as never, 'cdr')
        : null;
      if (cdrStorageKey && result.cdrContent) {
        await this.storage.writeObject(
          cdrStorageKey,
          Buffer.from(result.cdrContent, 'base64'),
          'application/zip',
        );
      }
      const pdfStorageKey = await this.renderAndStorePdf(
        comprobante as Record<string, unknown>,
        EstadoComprobante.ACEPTADO,
        result.codigoRespuesta,
        result.mensaje,
      );
      await this.prisma.comprobante.update({
        where: { id: comprobanteId },
        data: {
          estado: EstadoComprobante.ACEPTADO,
          codigoSunat: result.codigoRespuesta,
          mensajeSunat: result.mensaje,
          cdrRecibidaAt: new Date(),
          ...(cdrStorageKey ? { cdrStorageKey } : {}),
          ...(pdfStorageKey ? { pdfStorageKey } : {}),
        },
      });
      await this.updateVentaEstadoFacturacion(
        comprobante.ventaId,
        EstadoFacturacionVenta.EMITIDA,
      );
      await this.prisma.comprobanteEnvioLog.create({
        data: {
          comprobanteId,
          tipo: TipoEnvio.CONSULTA_TICKET,
          proveedor: 'SUNAT_DIRECT',
          tipoEvento: EventoEnvioComprobante.CDR_RECIBIDO,
          estado: EstadoComprobante.ACEPTADO,
          intento: 1,
          requestPayload: result.requestPayload as Prisma.InputJsonValue,
          responsePayload: result.responsePayload as Prisma.InputJsonValue,
          responseCode: result.codigoRespuesta,
          responseDescription: result.mensaje,
          cdrStorageKey,
          durationMs: Date.now() - startedAt,
          codigoRespuesta: result.codigoRespuesta,
          mensaje: `Reconciliado vía consultar-estado: ${result.mensaje}`,
        },
      });
      await this.emailService.enviarComprobanteAceptado(comprobanteId);
      this.emitComprobanteEvent(
        comprobante as Record<string, unknown>,
        SocketEvents.COMPROBANTE_ACEPTADO,
        result.mensaje,
      );
    } else {
      await this.prisma.comprobante.update({
        where: { id: comprobanteId },
        data: {
          estado: EstadoComprobante.REQUIERE_REVISION,
          mensajeSunat: `Estado dudoso tras consulta forzada: ${result.mensaje}`,
        },
      });
      await this.prisma.comprobanteEnvioLog.create({
        data: {
          comprobanteId,
          tipo: TipoEnvio.CONSULTA_TICKET,
          proveedor: 'SUNAT_DIRECT',
          tipoEvento: EventoEnvioComprobante.REQUIERE_REVISION,
          estado: EstadoComprobante.REQUIERE_REVISION,
          intento: 1,
          requestPayload: result.requestPayload as Prisma.InputJsonValue,
          responsePayload: result.responsePayload as Prisma.InputJsonValue,
          responseCode: result.codigoRespuesta,
          responseDescription: result.mensaje,
          durationMs: Date.now() - startedAt,
        },
      });
      this.emitComprobanteEvent(
        comprobante as Record<string, unknown>,
        SocketEvents.COMPROBANTE_REQUIERE_REVISION,
        `Estado dudoso tras consulta forzada: ${result.mensaje}`,
      );
    }
  }

  // ── comunicar-baja (delegado por cola-baja) ───────────────────────────

  /**
   * Doc 06 §6 — envía RA via sendSummary, recibe ticket, encola primer poll
   * en `cola-consulta-ticket`. Public porque SunatBajaProcessor delega aquí.
   */
  async comunicarBaja(payload: ComunicarBajaPayload) {
    const comunicacion = await this.prisma.comunicacionBaja.findUnique({
      where: { id: payload.comunicacionBajaId },
      include: { comprobante: true },
    });
    if (!comunicacion) {
      this.logger.error(
        `Comunicación de baja ${payload.comunicacionBajaId} no encontrada`,
      );
      return;
    }

    // Doc 07 §7 — el usuario pudo haber cancelado la baja después de encolar
    // el job. BullMQ no puede borrar el job desde una transacción de Prisma,
    // así que el processor revalida estado antes de tocar SUNAT.
    if (comunicacion.estado !== EstadoComunicacionBaja.PENDIENTE) {
      this.logger.warn(
        `Baja ${comunicacion.identificadorBaja} ya está en estado ${comunicacion.estado}; omitiendo envío a SUNAT (probablemente cancelada).`,
      );
      return;
    }

    const comprobante = comunicacion.comprobante as Record<string, unknown>;
    const comprobanteId = comprobante.id as string;
    const startedAt = Date.now();
    const provider = this.useGreenterEngine() ? 'GREENTER' : 'SUNAT_DIRECT';
    if (
      await this.markExpiredComunicacionBajaIfNeeded(
        comunicacion as Record<string, unknown>,
        payload.deadline,
      )
    ) {
      return;
    }

    await this.prisma.comunicacionBaja.update({
      where: { id: comunicacion.id },
      data: { estado: EstadoComunicacionBaja.EN_PROCESO },
    });

    await this.prisma.comprobanteEnvioLog.create({
      data: {
        comprobanteId,
        tipo: TipoEnvio.COMUNICACION_BAJA,
        proveedor: provider,
        tipoEvento: 'COMUNICACION_BAJA_ENVIO_INICIADO',
        estado: EstadoComprobante.BAJA_PENDIENTE,
        intento: 1,
        mensaje: `Comunicación de baja ${comunicacion.identificadorBaja} en proceso`,
        responseDescription: `Comunicación de baja ${comunicacion.identificadorBaja} en proceso`,
      },
    });

    try {
      const xmlStorageKey = this.buildBajaStorageKey(comunicacion, 'xml');
      const ambiente = await this.resolveAmbiente();
      let result: SunatSendSummaryResult;

      if (this.useGreenterEngine()) {
        if (!this.greenterGateway) {
          throw new Error('GreenterGateway no inyectado');
        }
        const greenter = await this.greenterGateway.sendBaja(
          comunicacion as unknown as Record<string, unknown>,
          ambiente,
        );
        await this.storage.writeObject(
          xmlStorageKey,
          this.xmlBuffer(greenter.signedXml),
          `application/xml; charset=${this.xmlCharset(greenter.signedXml)}`,
        );
        result = greenter.result;
      } else {
        if (!this.payloadBuilder || !this.xmlSigner || !this.sunatGateway) {
          throw new Error('Servicios SUNAT directo no inyectados');
        }

        const built = this.payloadBuilder.buildVoidedNote({
          identificadorBaja: comunicacion.identificadorBaja,
          fechaGeneracion: comunicacion.createdAt,
          motivo: comunicacion.motivo,
          comprobante: {
            tipo: comprobante.tipo as TipoDocumento,
            serie: comprobante.serie as string,
            correlativo: comprobante.correlativo as number,
            fechaEmision: comprobante.fechaEmision as Date,
            emisorRuc: this.text(comprobante.emisorRuc),
            emisorRazonSocial: this.text(comprobante.emisorRazonSocial),
          },
        });
        const signed = await this.xmlSigner.sign(built.xml);
        await this.storage.writeObject(
          xmlStorageKey,
          this.xmlBuffer(signed.signedXml),
          `application/xml; charset=${this.xmlCharset(signed.signedXml)}`,
        );

        result = await this.sunatGateway.sendSummary({
          ruc: this.text(comprobante.emisorRuc),
          fileName: built.fileName,
          xmlFileName: built.xmlFileName,
          signedXml: signed.signedXml,
          ambiente,
        });
      }

      if (!result.accepted || !result.ticket) {
        const message = result.mensaje || 'SUNAT rechazó la comunicación';
        await this.prisma.comunicacionBaja.update({
          where: { id: comunicacion.id },
          data: {
            estado: EstadoComunicacionBaja.RECHAZADA,
            errorMessage: message,
            xmlStorageKey,
          },
        });
        await this.prisma.comprobante.update({
          where: { id: comprobanteId },
          data: { estado: EstadoComprobante.ACEPTADO },
        });
        await this.prisma.comprobanteEnvioLog.create({
          data: {
            comprobanteId,
            tipo: TipoEnvio.COMUNICACION_BAJA,
            proveedor: provider,
            tipoEvento: 'COMUNICACION_BAJA_RECHAZADA_ENVIO',
            estado: EstadoComprobante.ACEPTADO,
            intento: 1,
            requestPayload: result.requestPayload as Prisma.InputJsonValue,
            responsePayload: result.responsePayload as Prisma.InputJsonValue,
            responseCode: result.codigoRespuesta,
            responseDescription: message,
            durationMs: Date.now() - startedAt,
            codigoRespuesta: result.codigoRespuesta,
            mensaje: message,
            errorMessage: message,
          },
        });
        this.emitComunicacionBajaEvent(
          comunicacion as Record<string, unknown>,
          SocketEvents.COMUNICACION_BAJA_RECHAZADA,
          message,
        );
        return;
      }

      await this.prisma.comunicacionBaja.update({
        where: { id: comunicacion.id },
        data: { ticketSunat: result.ticket, xmlStorageKey },
      });
      await this.prisma.comprobanteEnvioLog.create({
        data: {
          comprobanteId,
          tipo: TipoEnvio.COMUNICACION_BAJA,
          proveedor: provider,
          tipoEvento: EventoEnvioComprobante.BAJA_INICIADA,
          estado: EstadoComprobante.BAJA_PENDIENTE,
          intento: 1,
          requestPayload: result.requestPayload as Prisma.InputJsonValue,
          responsePayload: result.responsePayload as Prisma.InputJsonValue,
          responseCode: result.codigoRespuesta,
          responseDescription: `Ticket SUNAT ${result.ticket}`,
          durationMs: Date.now() - startedAt,
          codigoRespuesta: result.codigoRespuesta,
          mensaje: `Ticket SUNAT ${result.ticket}`,
        },
      });
      this.logger.log(
        `Baja ${comunicacion.identificadorBaja} encolada con ticket ${result.ticket}`,
      );
      // Encolar primer poll a 30s en cola-consulta-ticket.
      await this.consultaQueue.add(
        'consultar-ticket-baja',
        {
          comunicacionBajaId: comunicacion.id,
          deadline: payload.deadline,
          intento: 1,
        },
        this.bajaPollJobOptions(30_000, comunicacion.id, 1),
      );
    } catch (error) {
      if (await this.isDevelopmentConfigurationError(error)) {
        return this.acceptBajaDevLocal(
          comunicacion as Record<string, unknown>,
          startedAt,
          (error as Error).message,
        );
      }

      const message = `Error enviando comunicación de baja: ${(error as Error).message}`;
      this.logger.error(message);
      await this.prisma.comunicacionBaja.update({
        where: { id: comunicacion.id },
        data: {
          estado: EstadoComunicacionBaja.RECHAZADA,
          errorMessage: message,
        },
      });
      await this.prisma.comprobante.update({
        where: { id: comprobanteId },
        data: { estado: EstadoComprobante.ACEPTADO },
      });
      await this.prisma.comprobanteEnvioLog.create({
        data: {
          comprobanteId,
          tipo: TipoEnvio.COMUNICACION_BAJA,
          proveedor: 'SUNAT_DIRECT',
          tipoEvento: 'COMUNICACION_BAJA_ERROR',
          estado: EstadoComprobante.ACEPTADO,
          intento: 1,
          mensaje: message,
          errorMessage: message,
          durationMs: Date.now() - startedAt,
        },
      });
      this.emitComunicacionBajaEvent(
        comunicacion as Record<string, unknown>,
        SocketEvents.COMUNICACION_BAJA_RECHAZADA,
        message,
      );
      throw error;
    }
  }

  // ── consultar-ticket-baja (delegado por cola-consulta-ticket) ─────────

  /**
   * Doc 06 §7 — polling del ticket de baja con backoff exponencial. Tras 24h
   * sin resolución, marca REQUIERE_REVISION. Public porque SunatConsultaProcessor
   * delega aquí.
   */
  async consultarTicketBaja(payload: ConsultarTicketBajaPayload) {
    const comunicacion = await this.prisma.comunicacionBaja.findUnique({
      where: { id: payload.comunicacionBajaId },
      include: { comprobante: true },
    });
    if (!comunicacion) {
      this.logger.error(
        `Comunicación de baja ${payload.comunicacionBajaId} no encontrada (consultar ticket)`,
      );
      return;
    }
    const comprobante = comunicacion.comprobante as Record<string, unknown>;
    const comprobanteId = comprobante.id as string;
    const intento = payload.intento ?? 1;

    if (
      comunicacion.estado === EstadoComunicacionBaja.ACEPTADA ||
      comunicacion.estado === EstadoComunicacionBaja.RECHAZADA
    ) {
      this.logger.log(
        `Baja ${comunicacion.identificadorBaja} ya en estado final ${comunicacion.estado}, omitiendo poll`,
      );
      return;
    }
    if (!comunicacion.ticketSunat) {
      this.logger.warn(
        `Baja ${comunicacion.identificadorBaja} sin ticket; abortando poll`,
      );
      return;
    }

    const startedAt = Date.now();
    const provider = this.useGreenterEngine() ? 'GREENTER' : 'SUNAT_DIRECT';
    try {
      const ambiente = await this.resolveAmbiente();
      let result: SunatStatusResult;
      if (this.useGreenterEngine()) {
        if (!this.greenterGateway) {
          throw new Error('GreenterGateway no inyectado');
        }
        result = await this.greenterGateway.consultarTicketBaja(
          comunicacion as unknown as Record<string, unknown>,
          ambiente,
        );
      } else {
        if (!this.sunatGateway) {
          throw new Error('SunatDirectGateway no inyectado');
        }
        result = await this.sunatGateway.getStatus({
          ruc: this.text(comprobante.emisorRuc),
          ticket: comunicacion.ticketSunat,
          ambiente,
        });
      }

      const stillProcessing =
        result.codigoRespuesta === '98' ||
        (!result.accepted && !result.cdrContent);

      if (stillProcessing && !result.accepted) {
        // Doc 06 §7 — > 24h polling sin resolución → REQUIERE_REVISION.
        if (this.bajaPollExceededLimit(comunicacion)) {
          await this.prisma.comunicacionBaja.update({
            where: { id: comunicacion.id },
            data: {
              estado: EstadoComunicacionBaja.RECHAZADA,
              errorMessage:
                'Sin respuesta de SUNAT tras 24h de polling — requiere revisión manual',
            },
          });
          await this.prisma.comprobante.update({
            where: { id: comprobanteId },
            data: { estado: EstadoComprobante.REQUIERE_REVISION },
          });
          await this.prisma.comprobanteEnvioLog.create({
            data: {
              comprobanteId,
              tipo: TipoEnvio.CONSULTA_TICKET,
              proveedor: provider,
              tipoEvento: EventoEnvioComprobante.REQUIERE_REVISION,
              estado: EstadoComprobante.REQUIERE_REVISION,
              intento,
              mensaje: 'Polling de ticket de baja excedió 24h sin resolución',
              errorMessage: 'BAJA_POLL_TIMEOUT_24H',
              durationMs: Date.now() - startedAt,
            },
          });
          this.logger.warn(
            `Baja ${comunicacion.identificadorBaja} marcada REQUIERE_REVISION tras 24h de polling`,
          );
          return;
        }

        await this.prisma.comprobanteEnvioLog.create({
          data: {
            comprobanteId,
            tipo: TipoEnvio.CONSULTA_TICKET,
            proveedor: provider,
            tipoEvento: EventoEnvioComprobante.BAJA_TICKET_RECIBIDO,
            estado: EstadoComprobante.BAJA_PENDIENTE,
            intento,
            requestPayload: result.requestPayload as Prisma.InputJsonValue,
            responsePayload: result.responsePayload as Prisma.InputJsonValue,
            responseCode: result.codigoRespuesta,
            responseDescription: result.mensaje,
            durationMs: Date.now() - startedAt,
            codigoRespuesta: result.codigoRespuesta,
            mensaje: result.mensaje,
          },
        });
        const nextDelay = this.nextBajaPollDelay(intento);
        await this.consultaQueue.add(
          'consultar-ticket-baja',
          {
            comunicacionBajaId: comunicacion.id,
            deadline: payload.deadline,
            intento: intento + 1,
          },
          this.bajaPollJobOptions(nextDelay, comunicacion.id, intento + 1),
        );
        return;
      }

      if (result.accepted) {
        const cdrStorageKey = this.buildBajaStorageKey(comunicacion, 'cdr');
        if (result.cdrContent) {
          await this.storage.writeObject(
            cdrStorageKey,
            Buffer.from(result.cdrContent, 'base64'),
            'application/zip',
          );
        }
        const ahora = new Date();
        await this.prisma.comunicacionBaja.update({
          where: { id: comunicacion.id },
          data: {
            estado: EstadoComunicacionBaja.ACEPTADA,
            cdrStorageKey,
            cdrRecibidaAt: ahora,
            cdrCodigo: result.codigoRespuesta,
            cdrMensaje: result.mensaje,
          },
        });
        await this.prisma.comprobante.update({
          where: { id: comprobanteId },
          data: {
            estado: EstadoComprobante.ANULADO,
            cdrStorageKey,
            cdrRecibidaAt: ahora,
          },
        });
        const ventaId = comprobante.ventaId as string | null;
        await this.updateVentaEstadoFacturacion(
          ventaId,
          EstadoFacturacionVenta.ANULADA_FISCAL,
        );
        await this.prisma.comprobanteEnvioLog.create({
          data: {
            comprobanteId,
            tipo: TipoEnvio.COMUNICACION_BAJA,
            proveedor: provider,
            tipoEvento: EventoEnvioComprobante.BAJA_RESUELTA,
            estado: EstadoComprobante.ANULADO,
            intento,
            requestPayload: result.requestPayload as Prisma.InputJsonValue,
            responsePayload: result.responsePayload as Prisma.InputJsonValue,
            responseCode: result.codigoRespuesta,
            responseDescription: result.mensaje,
            cdrStorageKey,
            durationMs: Date.now() - startedAt,
            codigoRespuesta: result.codigoRespuesta,
            mensaje: result.mensaje,
          },
        });
        this.logger.log(
          `Baja ${comunicacion.identificadorBaja} ACEPTADA por SUNAT`,
        );
        this.emitComunicacionBajaEvent(
          comunicacion as Record<string, unknown>,
          SocketEvents.COMUNICACION_BAJA_ACEPTADA,
        );
      } else {
        const message = result.mensaje || 'SUNAT rechazó la baja';
        await this.prisma.comunicacionBaja.update({
          where: { id: comunicacion.id },
          data: {
            estado: EstadoComunicacionBaja.RECHAZADA,
            errorMessage: message,
            cdrCodigo: result.codigoRespuesta,
            cdrMensaje: message,
          },
        });
        await this.prisma.comprobante.update({
          where: { id: comprobanteId },
          data: { estado: EstadoComprobante.ACEPTADO },
        });
        await this.prisma.comprobanteEnvioLog.create({
          data: {
            comprobanteId,
            tipo: TipoEnvio.COMUNICACION_BAJA,
            proveedor: provider,
            tipoEvento: EventoEnvioComprobante.BAJA_RESUELTA,
            estado: EstadoComprobante.ACEPTADO,
            intento,
            requestPayload: result.requestPayload as Prisma.InputJsonValue,
            responsePayload: result.responsePayload as Prisma.InputJsonValue,
            responseCode: result.codigoRespuesta,
            responseDescription: message,
            durationMs: Date.now() - startedAt,
            codigoRespuesta: result.codigoRespuesta,
            mensaje: message,
            errorMessage: message,
          },
        });
        this.logger.warn(
          `Baja ${comunicacion.identificadorBaja} RECHAZADA: ${message}`,
        );
        this.emitComunicacionBajaEvent(
          comunicacion as Record<string, unknown>,
          SocketEvents.COMUNICACION_BAJA_RECHAZADA,
          message,
        );
      }
    } catch (error) {
      const message = `Error consultando ticket baja ${comunicacion.identificadorBaja}: ${(error as Error).message}`;
      this.logger.error(message);
      await this.prisma.comprobanteEnvioLog.create({
        data: {
          comprobanteId,
          tipo: TipoEnvio.CONSULTA_TICKET,
          proveedor: 'SUNAT_DIRECT',
          tipoEvento: 'CONSULTA_TICKET_BAJA_ERROR',
          estado: EstadoComprobante.BAJA_PENDIENTE,
          intento,
          mensaje: message,
          errorMessage: (error as Error).message,
          durationMs: Date.now() - startedAt,
        },
      });
      throw error;
    }
  }

  // ── Helpers compartidos ───────────────────────────────────────────────

  private async acceptDevLocal(
    comprobante: Record<string, unknown>,
    intento: number,
    reason: string,
  ) {
    const comprobanteId = comprobante.id as string;
    this.logger.warn(
      `SUNAT directo en modo desarrollo — marcando ${this.text(comprobante.numero)} como ACEPTADO: ${reason}`,
    );
    await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        estado: EstadoComprobante.ACEPTADO,
        codigoSunat: '0',
        mensajeSunat: 'Aceptado (modo desarrollo SUNAT directo)',
        hashCpe: `DEV-CPE-${Date.now()}`,
        hashSunat: `DEV-SUNAT-${Date.now()}`,
      },
    });
    await this.updateVentaEstadoFacturacion(
      comprobante.ventaId as string,
      EstadoFacturacionVenta.EMITIDA,
    );
    await this.prisma.comprobanteEnvioLog.create({
      data: {
        comprobanteId,
        tipo: TipoEnvio.ENVIO_INICIAL,
        proveedor: 'DEV_LOCAL',
        tipoEvento: 'RESPUESTA_DEV',
        estado: EstadoComprobante.ACEPTADO,
        intento,
        codigoRespuesta: '0',
        mensaje: 'Aceptado (modo desarrollo SUNAT directo)',
        responseCode: '0',
        responseDescription: 'Aceptado (modo desarrollo SUNAT directo)',
        responsePayload: { modo: 'desarrollo', reason },
      },
    });
    this.emitComprobanteEvent(comprobante, SocketEvents.COMPROBANTE_ACEPTADO);
  }

  private async acceptBajaDevLocal(
    comunicacion: Record<string, unknown>,
    startedAt: number,
    reason: string,
  ) {
    const comprobante = comunicacion.comprobante as Record<string, unknown>;
    const comprobanteId = comprobante.id as string;
    this.logger.warn(
      `Baja ${this.text(comunicacion.identificadorBaja)} ACEPTADA en modo desarrollo: ${reason}`,
    );
    const cdrStorageKey = this.buildBajaStorageKey(
      comunicacion as { identificadorBaja: string },
      'cdr',
    );
    const ahora = new Date();
    await this.prisma.comunicacionBaja.update({
      where: { id: comunicacion.id as string },
      data: {
        estado: EstadoComunicacionBaja.ACEPTADA,
        ticketSunat: `DEV-RA-${Date.now()}`,
        cdrStorageKey,
        cdrRecibidaAt: ahora,
        cdrCodigo: '0',
        cdrMensaje: 'Aceptado en modo desarrollo',
      },
    });
    await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        estado: EstadoComprobante.ANULADO,
        cdrStorageKey,
        cdrRecibidaAt: ahora,
      },
    });
    const ventaId = comprobante.ventaId as string | null;
    await this.updateVentaEstadoFacturacion(
      ventaId,
      EstadoFacturacionVenta.ANULADA_FISCAL,
    );
    await this.prisma.comprobanteEnvioLog.create({
      data: {
        comprobanteId,
        tipo: TipoEnvio.COMUNICACION_BAJA,
        proveedor: 'DEV_LOCAL',
        tipoEvento: 'COMUNICACION_BAJA_ACEPTADA_DEV',
        estado: EstadoComprobante.ANULADO,
        intento: 1,
        responseCode: '0',
        responseDescription: 'Baja aceptada en modo desarrollo',
        cdrStorageKey,
        durationMs: Date.now() - startedAt,
        codigoRespuesta: '0',
        mensaje: 'Baja aceptada en modo desarrollo',
        responsePayload: {
          modo: 'desarrollo',
          identificadorBaja: this.text(comunicacion.identificadorBaja),
          reason,
        },
      },
    });
    this.emitComunicacionBajaEvent(
      comunicacion,
      SocketEvents.COMUNICACION_BAJA_ACEPTADA,
    );
  }

  private async isDevelopmentConfigurationError(error: unknown) {
    const devMode =
      this.configService.get<string>('SUNAT_DIRECT_DEV_MODE', 'true') !==
        'false' && process.env.NODE_ENV !== 'production';
    if (!devMode) return false;

    const ambiente = await this.resolveAmbiente();
    if (ambiente === AmbienteSunat.PRODUCCION) return false;

    const message = (error as Error).message ?? '';
    return [
      'No existe certificado digital activo',
      'Credenciales SUNAT no configuradas',
      'FISCAL_MASTER_KEY_BASE64 no está configurado',
      'Servicios SUNAT directo no inyectados',
    ].some((text) => message.includes(text));
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

    return configFiscal?.ambienteDefault === AmbienteSunat.PRODUCCION
      ? AmbienteSunat.PRODUCCION
      : AmbienteSunat.BETA;
  }

  private useGreenterEngine() {
    return (
      (this.configService.get<string>('SUNAT_ENGINE', 'DIRECT') ?? 'DIRECT')
        .toUpperCase()
        .trim() === 'GREENTER'
    );
  }

  private text(value: unknown, fallback = ''): string {
    if (typeof value === 'string') return value;
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }
    if (value instanceof Date) return value.toISOString();
    return fallback;
  }

  private async updateVentaEstadoFacturacion(
    ventaId: unknown,
    estadoFacturacion: EstadoFacturacionVenta,
  ) {
    if (typeof ventaId !== 'string' || !ventaId) return;
    await this.prisma.venta.update({
      where: { id: ventaId },
      data: { estadoFacturacion },
    });
  }

  private async markVentaAnuladaFiscalFromNotaCredito(
    nota: Record<string, unknown>,
  ) {
    const origen = nota.comprobanteOrigen as
      | Record<string, unknown>
      | undefined;
    if (!origen) return;

    // Doc 08 \u00a72/\u00a74 \u2014 la venta queda ANULADA_FISCAL en dos casos:
    //   (a) NC con motivo 01 (anulaci\u00f3n) cuyo monto cubre el total origen, o
    //   (b) Suma acumulada de NCs aceptadas sobre el origen \u2265 total origen,
    //       sin importar el motivo individual (parcial+parcial=anulaci\u00f3n).
    // Aplica tanto a factura como a boleta; SUNAT mantiene el origen aceptado,
    // pero la venta queda fiscalmente anulada para habilitar cierre comercial.
    const motivoRaw = this.text(nota.motivoNota ?? nota.tipo)
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const esAnulacionExplicita =
      motivoRaw === '01' || motivoRaw.includes('ANULACION');
    const totalOrigen = Number(origen.total ?? 0);
    if (!Number.isFinite(totalOrigen) || totalOrigen <= 0) return;

    let acreditado = Number(nota.total ?? nota.monto ?? 0);
    if (!esAnulacionExplicita) {
      // Caso (b) \u2014 sumar todas las NCs aceptadas (incluida \u00e9sta).
      const agg = await this.prisma.comprobante.aggregate({
        where: {
          tipo: TipoDocumento.NOTA_CREDITO,
          comprobanteOrigenId: origen.id as string,
          estado: {
            in: [
              EstadoComprobante.ACEPTADO,
              EstadoComprobante.ACEPTADO_CON_OBSERVACIONES,
            ],
          },
        },
        _sum: { total: true },
      });
      acreditado = Number(agg._sum.total ?? 0);
    }

    if (!Number.isFinite(acreditado) || acreditado + 0.005 < totalOrigen) {
      return;
    }

    await this.updateVentaEstadoFacturacion(
      origen.ventaId,
      EstadoFacturacionVenta.ANULADA_FISCAL,
    );
  }

  /**
   * Doc 06 §5 — plazo legal vencido sin envío. El correlativo queda quemado;
   * marcamos REQUIERE_REVISION (operativo, no funcional) y la venta sigue
   * EN_EMISION administrativamente hasta resolución manual.
   */
  private async markExpiredComprobanteIfNeeded(
    comprobante: Record<string, unknown>,
    deadline: string,
    tipoEvento: string,
  ) {
    if (!this.isExpired(deadline)) return false;

    const comprobanteId = comprobante.id as string;
    const message = `Plazo SUNAT vencido sin envío: ${deadline}`;
    await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        estado: EstadoComprobante.REQUIERE_REVISION,
        mensajeSunat: message,
      },
    });
    await this.prisma.comprobanteEnvioLog.create({
      data: {
        comprobanteId,
        tipo: TipoEnvio.ENVIO_INICIAL,
        proveedor: 'SUNAT_DIRECT',
        tipoEvento: EventoEnvioComprobante.REQUIERE_REVISION,
        estado: EstadoComprobante.REQUIERE_REVISION,
        intento: Number(comprobante.intentosEnvio ?? 0) + 1,
        mensaje: message,
        errorMessage: `${tipoEvento}: ${message}`,
      },
    });
    this.logger.warn(
      `Comprobante ${this.text(comprobante.numero)} marcado REQUIERE_REVISION: ${message}`,
    );
    return true;
  }

  private async markExpiredComunicacionBajaIfNeeded(
    comunicacion: Record<string, unknown>,
    deadline?: string,
  ) {
    if (!deadline || !this.isExpired(deadline)) return false;

    const comprobante = comunicacion.comprobante as
      | Record<string, unknown>
      | undefined;
    const comprobanteId = this.text(comprobante?.id);
    const message = `Deadline SUNAT baja vencido: ${deadline}`;
    await this.prisma.comunicacionBaja.update({
      where: { id: comunicacion.id as string },
      data: {
        estado: EstadoComunicacionBaja.RECHAZADA,
        errorMessage: message,
      },
    });
    if (comprobanteId) {
      await this.prisma.comprobante.update({
        where: { id: comprobanteId },
        data: { estado: EstadoComprobante.ACEPTADO },
      });
      await this.prisma.comprobanteEnvioLog.create({
        data: {
          comprobanteId,
          tipo: TipoEnvio.COMUNICACION_BAJA,
          proveedor: 'SUNAT_DIRECT',
          tipoEvento: 'DEADLINE_BAJA_VENCIDO',
          estado: EstadoComprobante.BAJA_PENDIENTE,
          intento: 1,
          mensaje: message,
          errorMessage: message,
        },
      });
    }
    return true;
  }

  private calcularDeadlineEnvio(tipo: TipoDocumento, fechaEmision: Date) {
    return calcularDeadlineEnvioShared(
      tipo,
      fechaEmision,
    ).deadline.toISOString();
  }

  private isExpired(deadline: string) {
    const time = new Date(deadline).getTime();
    return Number.isFinite(time) && time < Date.now();
  }

  private hasSunatObservaciones(result: { responsePayload?: unknown }) {
    const payload = result.responsePayload as
      | { cdrNotas?: unknown; cdr?: { notes?: unknown } }
      | undefined;
    return (
      (Array.isArray(payload?.cdrNotas) && payload.cdrNotas.length > 0) ||
      (Array.isArray(payload?.cdr?.notes) && payload.cdr.notes.length > 0)
    );
  }

  /**
   * Doc 06 §7 — backoff exponencial del polling de ticket de baja.
   *   1→30s, 2→1min, 3→5min, 4→15min, 5→1h, 6+→1h (con cap diario).
   */
  private nextBajaPollDelay(intento: number) {
    const ladder = [30_000, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
    return ladder[intento - 1] ?? 60 * 60_000;
  }

  private bajaPollExceededLimit(comunicacion: { updatedAt?: Date | null }) {
    if (
      !(comunicacion.updatedAt instanceof Date) ||
      Number.isNaN(comunicacion.updatedAt.getTime())
    ) {
      return false;
    }
    const limite = 24 * 60 * 60 * 1000;
    return Date.now() - comunicacion.updatedAt.getTime() > limite;
  }

  private bajaPollJobOptions(
    delayMs: number,
    comunicacionBajaId?: string,
    intento = 1,
  ): JobsOptions {
    return {
      delay: delayMs,
      attempts: 4,
      backoff: { type: 'exponential', delay: 3 * 60 * 1000 },
      removeOnComplete: false,
      removeOnFail: false,
      ...(comunicacionBajaId
        ? { jobId: `baja-poll-${comunicacionBajaId}-${intento}` }
        : {}),
    };
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

  private buildBajaStorageKey(
    comunicacion: {
      identificadorBaja: string;
      createdAt?: Date | string | null;
      comprobante?: {
        emisorRuc?: string | null;
        ambiente?: string | null;
      } | null;
    },
    extension: 'xml' | 'cdr',
  ) {
    return this.storage.buildBajaStorageKey(
      {
        identificadorBaja: comunicacion.identificadorBaja,
        ambiente: comunicacion.comprobante?.ambiente,
        fechaGeneracion: comunicacion.createdAt,
        comprobante: comunicacion.comprobante,
      },
      extension,
    );
  }

  private documentCodeForTipo(tipo: unknown) {
    const map: Record<string, string> = {
      FACTURA: '01',
      BOLETA: '03',
      NOTA_CREDITO: '07',
      NOTA_DEBITO: '08',
    };
    return map[this.text(tipo)] ?? '00';
  }

  private sha256(value: string | Buffer) {
    return createHash('sha256').update(value).digest('hex');
  }

  private xmlBuffer(xml: string) {
    return Buffer.from(xml, this.xmlEncoding(xml));
  }

  private xmlEncoding(xml: string): BufferEncoding {
    return this.xmlCharset(xml) === 'UTF-8' ? 'utf8' : 'latin1';
  }

  private xmlCharset(xml: string) {
    const declared =
      xml.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i)?.[1]?.toUpperCase() ??
      '';
    return declared === 'UTF-8' || declared === 'UTF8' ? 'UTF-8' : 'ISO-8859-1';
  }

  private emitComprobanteEvent(
    comprobante: Record<string, unknown>,
    event:
      | typeof SocketEvents.COMPROBANTE_ACEPTADO
      | typeof SocketEvents.COMPROBANTE_RECHAZADO
      | typeof SocketEvents.COMPROBANTE_REQUIERE_REVISION,
    motivo?: string,
  ) {
    if (event === SocketEvents.COMPROBANTE_REQUIERE_REVISION) {
      this.events.emitToRoles(
        [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
        SocketEvents.COMPROBANTE_REQUIERE_REVISION,
        {
          comprobanteId: comprobante.id as string,
          numero: comprobante.numero as string,
          tipo: comprobante.tipo as never,
          estado: EstadoComprobante.REQUIERE_REVISION,
          mensaje:
            motivo ??
            (comprobante.mensajeSunat as string | null) ??
            'Comprobante requiere revisión humana',
          fechaVencimientoPlazo:
            comprobante.fechaVencimientoPlazo instanceof Date
              ? comprobante.fechaVencimientoPlazo.toISOString()
              : null,
        },
      );
      return;
    }
    const venta = comprobante.venta as Record<string, unknown> | undefined;
    const cliente = venta?.cliente as Record<string, unknown> | undefined;
    const estado =
      event === SocketEvents.COMPROBANTE_ACEPTADO
        ? EstadoComprobante.ACEPTADO
        : EstadoComprobante.RECHAZADO;
    const payload: ComprobanteEventPayload = {
      comprobanteId: comprobante.id as string,
      numero: comprobante.numero as string,
      tipo: comprobante.tipo as ComprobanteEventPayload['tipo'],
      estado,
      clienteNombre: (cliente?.nombre as string) ?? 'Desconocido',
      total: Number(comprobante.total),
      motivo: motivo ?? (comprobante.mensajeSunat as string | null) ?? null,
    };
    this.events.emitToRoles(
      [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
      event,
      payload,
    );
  }

  private emitComunicacionBajaEvent(
    comunicacion: Record<string, unknown>,
    event:
      | typeof SocketEvents.COMUNICACION_BAJA_ACEPTADA
      | typeof SocketEvents.COMUNICACION_BAJA_RECHAZADA,
    motivo?: string,
  ) {
    const comprobante = comunicacion.comprobante as
      | Record<string, unknown>
      | undefined;
    const payload = {
      comunicacionBajaId: comunicacion.id as string,
      identificadorBaja: comunicacion.identificadorBaja as string,
      comprobanteId: (comprobante?.id as string) ?? '',
      comprobanteNumero: (comprobante?.numero as string) ?? '',
      ticket: (comunicacion.ticketSunat as string | null) ?? null,
      motivo: motivo ?? (comunicacion.motivo as string | null) ?? null,
    };
    this.events.emitToRoles(
      [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
      event,
      payload,
    );
  }

  /**
   * Doc 06 §2 paso 13 — produce el PDF a partir del comprobante y lo sube al
   * storage. Devuelve `null` si el render falla, así el caller NO setea
   * pdfStorageKey (regla "no mentir al UI").
   */
  private async renderAndStorePdf(
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
        descripcion: this.text(d.descripcion, '—'),
        cantidad: Number(d.cantidad ?? 0),
        precioUnitario: Number(d.precioUnitario ?? 0),
        total: Number(d.total ?? 0),
      }));
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
        numero: this.text(comprobante.numero),
        tipo: this.text(comprobante.tipo),
        serie: this.text(comprobante.serie),
        correlativo: Number(comprobante.correlativo ?? 0),
        fechaEmision:
          comprobante.fechaEmision instanceof Date
            ? comprobante.fechaEmision
            : new Date(this.text(comprobante.fechaEmision)),
        emisorRuc: this.text(comprobante.emisorRuc),
        emisorRazonSocial: this.text(comprobante.emisorRazonSocial),
        emisorNombreComercial:
          this.text(comprobante.emisorNombreComercial) || null,
        emisorDireccion: this.text(comprobante.emisorDireccionFiscal) || null,
        emisorUbigeo: this.text(comprobante.emisorUbigeoFiscal) || null,
        emisorCodigoEstablecimiento:
          this.text(comprobante.emisorCodigoEstablecimiento) || null,
        emisorRegimenTributario:
          this.text(configFiscal?.regimenTributario) || null,
        emisorLogoPath: this.text(empresaPublica?.logo) || null,
        emisorDepartamentoFiscal:
          this.text(comprobante.emisorDepartamentoFiscal) || null,
        emisorProvinciaFiscal:
          this.text(comprobante.emisorProvinciaFiscal) || null,
        emisorDistritoFiscal:
          this.text(comprobante.emisorDistritoFiscal) || null,
        clienteDocTipo: this.text(comprobante.clienteDocTipo),
        clienteDocNum: this.text(comprobante.clienteDocNum),
        clienteNombre: this.text(comprobante.clienteNombre),
        clienteDireccion: this.text(comprobante.clienteDireccion) || null,
        subtotal: Number(comprobante.subtotal ?? 0),
        igv: Number(comprobante.igv ?? 0),
        total: Number(comprobante.total ?? 0),
        estado,
        cdrCodigo: cdrCodigo ?? null,
        cdrMensaje: cdrMensaje ?? null,
        formaPago: 'CONTADO',
        pieImpresion: this.text(configFiscal?.pieImpresion) || null,
        // Doc 09 §6 — digestValue del XML firmado va al QR y al pie del PDF.
        hashFirma: this.text(comprobante.hashCpe) || null,
        detalles,
      });
      const storageKey = this.buildStorageKey(comprobante as never, 'pdf');
      await this.storage.writeObject(storageKey, buffer, 'application/pdf');
      return storageKey;
    } catch (error) {
      this.logger.error(
        `No se pudo renderizar/subir PDF para ${this.text(comprobante.numero)}: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
