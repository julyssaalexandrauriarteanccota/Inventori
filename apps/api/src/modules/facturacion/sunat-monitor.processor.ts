import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { SunatMonitorService } from './sunat-monitor.service';

/**
 * Doc 06 §1 — worker `monitor` que consume `cola-monitor`.
 *
 * Reemplaza los `@Cron` directos del MonitorService: encolamos jobs
 * recurrentes (`monitor-plazos` cada 15 min, `monitor-certificado` diario)
 * de modo que la responsabilidad operativa pase por la cola y se beneficie
 * de visibilidad/pausa/replay como cualquier otro worker.
 */
@Processor('cola-monitor')
export class SunatMonitorProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SunatMonitorProcessor.name);

  constructor(
    @InjectQueue('cola-monitor') private readonly monitorQueue: Queue,
    private readonly monitor: SunatMonitorService,
  ) {
    super();
  }

  async onModuleInit() {
    // Doc 06 §5 — registrar repeatable jobs idempotentes. BullMQ deduplica
    // por (name, repeat-pattern, jobId) — re-llamadas no crean duplicados.
    await this.monitorQueue.add(
      'monitor-plazos',
      {},
      {
        repeat: { pattern: '0 */15 * * * *' }, // cada 15 min
        jobId: 'cron-monitor-plazos',
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
    await this.monitorQueue.add(
      'monitor-certificado',
      {},
      {
        repeat: { pattern: '0 0 8 * * *' }, // 8:00 AM diario
        jobId: 'cron-monitor-certificado',
        removeOnComplete: 30,
        removeOnFail: 30,
      },
    );
    this.logger.log(
      'Repeatable jobs registrados: monitor-plazos (15m), monitor-certificado (diario)',
    );
  }

  async process(job: Job) {
    switch (job.name) {
      case 'monitor-plazos':
        return this.monitor.checkPlazosVencimiento();
      case 'monitor-certificado':
        return this.monitor.checkCertificadosVencimiento();
      default:
        this.logger.warn(`cola-monitor recibió job no soportado: ${job.name}`);
    }
  }
}
