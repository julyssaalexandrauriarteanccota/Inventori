import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EstadoComprobante,
  EventoEnvioComprobante,
  RolUsuario,
  SocketEvents,
  TipoEnvio,
  type ComprobanteAlertaPayload,
  type CertificadoAlertaPayload,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from '../../websockets/events.service';

/**
 * Doc 06 §1, §5 — lógica de los workers de monitoreo.
 *
 *   monitor.plazos       (cada 15 min) — comprobantes con plazo legal a punto
 *                                       de vencer (< 30 min).
 *   monitor.certificado  (diario)      — certificados próximos a expirar.
 *
 * Las invocaciones recurrentes las dispara `SunatMonitorProcessor` desde
 * `cola-monitor` (jobs repetibles BullMQ). Este service contiene la lógica
 * y queda agnóstico del scheduler.
 *
 * Para re-encolar comprobantes pendientes inyecta `cola-envio-cpe`; para
 * forzar consultas de estado, `cola-consulta-ticket`.
 */
@Injectable()
export class SunatMonitorService {
  private readonly logger = new Logger(SunatMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    @InjectQueue('cola-envio-cpe') private readonly envioQueue: Queue,
    @InjectQueue('cola-consulta-ticket') private readonly consultaQueue: Queue,
  ) {}

  /**
   * Doc 06 §5 — cada 15 min, busca comprobantes con `fechaVencimientoPlazo`
   * dentro de los próximos 30 min y aún sin respuesta favorable.
   */
  async checkPlazosVencimiento() {
    const inThirtyMinutes = new Date(Date.now() + 30 * 60 * 1000);
    const transitorios: EstadoComprobante[] = [
      EstadoComprobante.PENDIENTE_ENVIO,
      EstadoComprobante.EN_PROCESO_SUNAT,
      EstadoComprobante.RECHAZADO,
      EstadoComprobante.REQUIERE_REVISION,
    ];

    const candidatos = await this.prisma.comprobante.findMany({
      where: {
        estado: { in: transitorios },
        fechaVencimientoPlazo: { lte: inThirtyMinutes, not: null },
      },
      select: {
        id: true,
        numero: true,
        tipo: true,
        estado: true,
        fechaVencimientoPlazo: true,
      },
    });

    if (!candidatos.length) {
      this.logger.debug('monitor.plazos: 0 comprobantes próximos a vencer');
      return;
    }

    this.logger.warn(
      `monitor.plazos: ${candidatos.length} comprobantes con plazo SUNAT < 30 min`,
    );

    for (const c of candidatos) {
      const deadlineIso = c.fechaVencimientoPlazo?.toISOString();
      // Doc 06 §5 — la acción depende del estado actual:
      //  PENDIENTE_ENVIO       → re-encolar con prioridad alta.
      //  EN_PROCESO_SUNAT      → forzar consulta de estado (puede haber CDR
      //                          tardío que el worker original no recibió).
      //  RECHAZADO / REQUIERE_REVISION → no se reencola; alerta crítica.
      if (c.estado === EstadoComprobante.PENDIENTE_ENVIO) {
        await this.envioQueue.add(
          'enviar-comprobante',
          { comprobanteId: c.id, deadline: deadlineIso },
          {
            attempts: 4,
            backoff: { type: 'exponential', delay: 3 * 60 * 1000 },
            removeOnComplete: false,
            removeOnFail: false,
            priority: 1,
            jobId: `${c.id}-monitor-${Date.now()}`,
          },
        );
        await this.prisma.comprobanteEnvioLog.create({
          data: {
            comprobanteId: c.id,
            tipo: TipoEnvio.REINTENTO,
            proveedor: 'MONITOR',
            tipoEvento: EventoEnvioComprobante.REINTENTO,
            estado: c.estado,
            intento: 1,
            mensaje:
              'Re-encolado por monitor.plazos (plazo SUNAT próximo a vencer)',
          },
        });
      } else if (c.estado === EstadoComprobante.EN_PROCESO_SUNAT) {
        // Encolar consulta forzada en cola-consulta-ticket — el processor
        // implementa como fallback cuando un sendBill quedó sin CDR confirmado.
        await this.consultaQueue.add(
          'consultar-estado-comprobante',
          { comprobanteId: c.id, deadline: deadlineIso, forzado: true },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 60 * 1000 },
            removeOnComplete: false,
            removeOnFail: false,
            priority: 1,
            jobId: `${c.id}-monitor-consulta-${Date.now()}`,
          },
        );
        await this.prisma.comprobanteEnvioLog.create({
          data: {
            comprobanteId: c.id,
            tipo: TipoEnvio.CONSULTA_TICKET,
            proveedor: 'MONITOR',
            tipoEvento: EventoEnvioComprobante.REINTENTO,
            estado: c.estado,
            intento: 1,
            mensaje:
              'Consulta forzada por monitor.plazos (estado dudoso EN_PROCESO_SUNAT)',
          },
        });
      } else {
        // RECHAZADO o REQUIERE_REVISION — no auto-acción, sólo alerta crítica.
        await this.prisma.comprobanteEnvioLog.create({
          data: {
            comprobanteId: c.id,
            tipo: TipoEnvio.ENVIO_INICIAL,
            proveedor: 'MONITOR',
            tipoEvento: EventoEnvioComprobante.REQUIERE_REVISION,
            estado: c.estado,
            intento: 1,
            mensaje:
              'Plazo SUNAT por vencer y comprobante en estado bloqueante — requiere acción del facturador',
          },
        });
      }

      const event =
        c.estado === EstadoComprobante.REQUIERE_REVISION ||
        c.estado === EstadoComprobante.RECHAZADO
          ? SocketEvents.COMPROBANTE_REQUIERE_REVISION
          : SocketEvents.COMPROBANTE_PLAZO_PROXIMO;
      const alerta: ComprobanteAlertaPayload = {
        comprobanteId: c.id,
        numero: c.numero,
        tipo: c.tipo as never,
        estado: c.estado as never,
        mensaje:
          event === SocketEvents.COMPROBANTE_PLAZO_PROXIMO
            ? 'Plazo SUNAT a punto de vencer'
            : 'Comprobante en estado bloqueante con plazo próximo',
        fechaVencimientoPlazo: deadlineIso ?? null,
      };
      this.events.emitToRoles(
        [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
        event,
        alerta,
      );
    }
  }

  /**
   * Doc 06 §1 — chequeo diario de certificados digitales próximos a vencer.
   *
   * Umbrales:
   *   - < 30 días: warning, log y notificación in-app diaria.
   *   - < 7 días: warning crítico (cuando se haya integrado email).
   *   - vencido: bloquea emisión nueva (validación en runtime, aquí solo log).
   */
  async checkCertificadosVencimiento() {
    const ahora = new Date();
    const en30Dias = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);

    const certs = await this.prisma.certificadoDigital.findMany({
      where: {
        activo: true,
        deletedAt: null,
        revokedAt: null,
        validoHasta: { not: null, lte: en30Dias },
      },
      select: {
        id: true,
        nombre: true,
        validoHasta: true,
        configEmpresaFiscalId: true,
      },
    });

    if (!certs.length) {
      this.logger.debug(
        'monitor.certificado: 0 certificados próximos a vencer',
      );
      return;
    }

    for (const cert of certs) {
      const diasRestantes = cert.validoHasta
        ? Math.floor(
            (cert.validoHasta.getTime() - ahora.getTime()) /
              (24 * 60 * 60 * 1000),
          )
        : -1;
      this.logger.warn(
        `monitor.certificado: certificado "${cert.nombre}" vence en ${diasRestantes} días`,
      );

      const event =
        diasRestantes < 0
          ? SocketEvents.CERTIFICADO_VENCIDO
          : SocketEvents.CERTIFICADO_PROXIMO_VENCER;
      const alerta: CertificadoAlertaPayload = {
        certificadoId: cert.id,
        nombre: cert.nombre,
        validoHasta: cert.validoHasta?.toISOString() ?? null,
        diasRestantes,
      };
      this.events.emitToRoles([RolUsuario.ADMIN], event, alerta);
    }
  }
}
