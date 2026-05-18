import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  SunatProcessor,
  type ConsultarTicketBajaPayload,
  type ConsultarEstadoComprobantePayload,
} from './sunat.processor';

/**
 * Doc 06 §1 — worker `consulta.processor` que consume `cola-consulta-ticket`.
 *
 * Maneja:
 *   - `consultar-ticket-baja` (poll del ticket de baja con backoff exponencial).
 *   - `consultar-estado-comprobante` (consulta forzada por monitor.plazos
 *     cuando un comprobante lleva mucho en EN_PROCESO_SUNAT).
 *
 * Toda la lógica vive en `SunatProcessor`; aquí sólo dispatcheamos.
 */
@Processor('cola-consulta-ticket')
export class SunatConsultaProcessor extends WorkerHost {
  private readonly logger = new Logger(SunatConsultaProcessor.name);

  constructor(private readonly delegate: SunatProcessor) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'consultar-ticket-baja':
        return this.delegate.consultarTicketBaja(
          job.data as ConsultarTicketBajaPayload,
        );
      case 'consultar-estado-comprobante':
        return this.delegate.consultarEstadoComprobante(
          job.data as ConsultarEstadoComprobantePayload,
        );
      default:
        this.logger.warn(
          `cola-consulta-ticket recibió job no soportado: ${job.name}`,
        );
    }
  }
}
