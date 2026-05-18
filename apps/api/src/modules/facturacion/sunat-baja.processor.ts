import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SunatProcessor, type ComunicarBajaPayload } from './sunat.processor';

/**
 * Doc 06 §6 — worker `baja.processor` que consume `cola-baja`.
 *
 * Es un thin adapter que delega en `SunatProcessor.comunicarBaja()` para
 * reusar toda la lógica fiscal sin duplicarla. Lo único exclusivo de esta
 * clase es el binding de cola y la traducción de `job.name → método`.
 */
@Processor('cola-baja')
export class SunatBajaProcessor extends WorkerHost {
  private readonly logger = new Logger(SunatBajaProcessor.name);

  constructor(private readonly delegate: SunatProcessor) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'comunicar-baja':
        return this.delegate.comunicarBaja(job.data as ComunicarBajaPayload);
      default:
        this.logger.warn(`cola-baja recibió job no soportado: ${job.name}`);
    }
  }
}
