import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AdmZip = require('adm-zip');
import { StringDecoder } from 'node:string_decoder';
import { RolUsuario, SocketEvents } from '@erp/shared';
import type { PadronSunatRucImportStagePayload } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from '../../websockets/events.service';

const DEFAULT_PADRON_URL =
  'https://www.sunat.gob.pe/descargaPRR/padron_reducido_ruc.zip';
const DEFAULT_BATCH_SIZE = 5000;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 120_000;
const DEFAULT_TEXT_CHUNK_SIZE = 1024 * 1024;

type PadronImportStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED'
  | 'SUCCESS'
  | 'ERROR';
type PadronImportStage =
  | 'IDLE'
  | 'DOWNLOADING'
  | 'DECOMPRESSING'
  | 'CLEANING'
  | 'IMPORTING'
  | 'PUBLISHING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ERROR';

type PadronRow = {
  ruc: string;
  razonSocial: string;
  estado: string;
  condicionDomicilio: string | null;
  ubigeo: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  direccionFiscal: string | null;
};

type ImportJob = {
  id: string;
  status: string;
  stage: string;
  sourceUrl: string | null;
  message: string;
  processed: number;
  inserted: number;
  discarded: number;
  totalLines: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
  importedAt: Date | null;
  error: string | null;
};

export type PadronSunatRucImportStatus = {
  status: PadronImportStatus;
  stage: PadronImportStage;
  sourceUrl: string | null;
  message: string;
  processed: number;
  inserted: number;
  discarded: number;
  totalLines: number | null;
  currentRecords: number;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  importedAt: string | null;
  error: string | null;
};

class PadronImportCancelledError extends Error {
  constructor() {
    super('Sincronización del padrón SUNAT cancelada');
  }
}

@Injectable()
export class PadronSunatRucService {
  private readonly logger = new Logger(PadronSunatRucService.name);
  private runningImport: Promise<void> | null = null;
  private abortController: AbortController | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventsService,
  ) {}

  private emitStage(
    status: PadronSunatRucImportStagePayload['status'],
    stage: PadronSunatRucImportStagePayload['stage'],
    message: string,
  ) {
    this.events.emitToRoles(
      [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
      SocketEvents.PADRON_SUNAT_RUC_IMPORT_STAGE,
      { status, stage, message } satisfies PadronSunatRucImportStagePayload,
    );
  }

  async findByRuc(ruc: string) {
    return this.prisma.padronSunatRuc.findUnique({ where: { ruc } });
  }

  async getImportStatus() {
    const [latestJob, currentRecords] = await Promise.all([
      this.prisma.padronSunatRucImportJob.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.padronSunatRuc.count(),
    ]);

    if (!latestJob) {
      return this.idleStatus(currentRecords);
    }

    return this.toStatus(latestJob, currentRecords);
  }

  async startImportFromSunatUrl() {
    await this.recoverInterruptedRunningJob();

    if (this.runningImport) {
      throw new ConflictException('Ya hay una sincronización del padrón en curso');
    }

    const activeJob = await this.prisma.padronSunatRucImportJob.findFirst({
      where: { status: { in: ['RUNNING', 'CANCEL_REQUESTED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (activeJob) {
      throw new ConflictException('Ya hay una sincronización del padrón en curso');
    }

    const sourceUrl = this.config.get<string>(
      'SUNAT_PADRON_RUC_URL',
      DEFAULT_PADRON_URL,
    );
    const startedAt = new Date();
    const job = await this.prisma.padronSunatRucImportJob.create({
      data: {
        status: 'RUNNING',
        stage: 'DOWNLOADING',
        sourceUrl,
        message: 'Descargando ZIP del padrón reducido RUC desde SUNAT.',
        startedAt,
      },
    });

    this.emitStage('RUNNING', 'DOWNLOADING', 'Descargando ZIP del padrón reducido RUC desde SUNAT.');

    this.abortController = new AbortController();
    this.runningImport = this.importFromSunatUrl(
      job.id,
      sourceUrl,
      startedAt,
      this.abortController.signal,
    )
      .catch(async (error: unknown) => {
        await this.handleImportFailure(job.id, startedAt, error);
      })
      .finally(() => {
        this.abortController = null;
        this.runningImport = null;
      });

    return this.getImportStatus();
  }

  async cancelImport() {
    const activeJob = await this.prisma.padronSunatRucImportJob.findFirst({
      where: { status: { in: ['RUNNING', 'CANCEL_REQUESTED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeJob) {
      return this.getImportStatus();
    }

    await this.prisma.padronSunatRucImportJob.update({
      where: { id: activeJob.id },
      data: {
        status: 'CANCEL_REQUESTED',
        message: 'Cancelación solicitada. Se conservará el padrón publicado.',
      },
    });
    this.abortController?.abort();
    this.emitStage(
      'CANCEL_REQUESTED',
      this.asStage(activeJob.stage) as PadronSunatRucImportStagePayload['stage'],
      'Cancelación solicitada. Se conservará el padrón publicado.',
    );

    return this.getImportStatus();
  }

  private async importFromSunatUrl(
    jobId: string,
    sourceUrl: string,
    startedAt: Date,
    signal: AbortSignal,
  ) {
    await this.updateJob(jobId, {
      stage: 'DOWNLOADING',
      sourceUrl,
      message: 'Descargando ZIP del padrón reducido RUC desde SUNAT.',
    });

    const response = await this.fetchWithTimeout(sourceUrl, signal);

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `No se pudo descargar padrón SUNAT (${response.status})`,
      );
    }

    const zipBuffer = Buffer.from(await response.arrayBuffer());
    await this.importFromZip(zipBuffer, {
      jobId,
      sourceUrl,
      startedAt,
    });
  }

  async importFromZip(
    zipBuffer: Buffer,
    options?: { jobId?: string; sourceUrl?: string; startedAt?: Date },
  ) {
    const startedAt = options?.startedAt ?? new Date();
    const jobId =
      options?.jobId ??
      (
        await this.prisma.padronSunatRucImportJob.create({
          data: {
            status: 'RUNNING',
            stage: 'DECOMPRESSING',
            sourceUrl: options?.sourceUrl ?? null,
            message: 'Procesando ZIP de padrón SUNAT.',
            startedAt,
          },
        })
      ).id;

    await this.updateJob(jobId, {
      stage: 'DECOMPRESSING',
      message: 'Descomprimiendo archivo del padrón SUNAT.',
    });
    this.emitStage('RUNNING', 'DECOMPRESSING', 'Descomprimiendo archivo del padrón SUNAT.');
    await this.ensureNotCancelled(jobId);

    const zip = new AdmZip(zipBuffer);
    const entry =
      zip
        .getEntries()
        .find((item) => item.entryName.toLowerCase().endsWith('.txt')) ??
      zip.getEntries()[0];

    if (!entry) {
      throw new ServiceUnavailableException('ZIP de padrón SUNAT sin TXT');
    }

    const importedAt = new Date();
    let processed = 0;
    let discarded = 0;
    let inserted = 0;
    let batch: PadronRow[] = [];
    const entryBuffer = entry.getData();

    await this.prisma.padronSunatRucStaging.deleteMany({ where: { jobId } });
    await this.updateJob(jobId, {
      stage: 'CLEANING',
      message: 'Preparando staging para validar el padrón actualizado.',
      totalLines: null,
      importedAt,
    });
    this.emitStage('RUNNING', 'CLEANING', 'Preparando staging para validar el padrón actualizado.');

    await this.updateJob(jobId, {
      stage: 'IMPORTING',
      message: 'Insertando contribuyentes en staging.',
      processed,
      inserted,
      discarded,
      totalLines: null,
      importedAt,
    });
    this.emitStage('RUNNING', 'IMPORTING', 'Insertando contribuyentes en staging.');

    const flushLine = async (line: string) => {
      await this.ensureNotCancelled(jobId);
      const row = this.parseLine(line);
      if (!row) {
        if (line.trim()) discarded += 1;
        return;
      }

      processed += 1;
      batch.push(row);

      if (batch.length >= DEFAULT_BATCH_SIZE) {
        inserted += await this.insertStagingBatch(jobId, batch, importedAt);
        batch = [];
        await this.updateJob(jobId, {
          processed,
          inserted,
          discarded,
          message: `Validando padrón SUNAT: ${inserted} registros preparados.`,
        });
      }
    };

    await this.processTextBufferByLine(entryBuffer, flushLine);

    if (batch.length > 0) {
      inserted += await this.insertStagingBatch(jobId, batch, importedAt);
      await this.updateJob(jobId, {
        processed,
        inserted,
        discarded,
        message: `Validando padrón SUNAT: ${inserted} registros preparados.`,
      });
    }

    if (inserted === 0) {
      throw new ServiceUnavailableException(
        'El archivo del padrón SUNAT no contiene RUC válidos. Se conserva el padrón anterior.',
      );
    }

    await this.ensureNotCancelled(jobId);
    await this.publishStaging(jobId);

    const durationMs = Date.now() - startedAt.getTime();
    const completedMessage = `Padrón SUNAT RUC publicado: ${inserted} registros.`;
    await this.updateJob(jobId, {
      status: 'SUCCESS',
      stage: 'COMPLETED',
      message: completedMessage,
      processed,
      inserted,
      discarded,
      finishedAt: new Date(),
      durationMs,
      importedAt,
      error: null,
    });
    this.emitStage('SUCCESS', 'COMPLETED', completedMessage);
    await this.prisma.padronSunatRucStaging.deleteMany({ where: { jobId } });
    this.logger.log(
      `Padrón SUNAT RUC publicado: ${inserted}/${processed} válidos, ${discarded} descartados en ${durationMs}ms`,
    );

    return {
      processed,
      inserted,
      discarded,
      durationMs,
      importedAt: importedAt.toISOString(),
    };
  }

  private async publishStaging(jobId: string) {
    await this.updateJob(jobId, {
      stage: 'PUBLISHING',
      message: 'Publicando padrón validado. El padrón anterior sigue activo hasta terminar.',
    });
    this.emitStage('RUNNING', 'PUBLISHING', 'Publicando padrón validado. El padrón anterior sigue activo hasta terminar.');

    await this.prisma.$transaction(async (tx) => {
      await tx.padronSunatRuc.deleteMany({});
      await tx.$executeRaw`
        INSERT INTO "padron_sunat_ruc" (
          "id",
          "ruc",
          "razonSocial",
          "estado",
          "condicionDomicilio",
          "ubigeo",
          "departamento",
          "provincia",
          "distrito",
          "direccionFiscal",
          "sourceUpdatedAt",
          "importedAt",
          "createdAt",
          "updatedAt"
        )
        SELECT
          "ruc",
          "ruc",
          "razonSocial",
          "estado",
          "condicionDomicilio",
          "ubigeo",
          "departamento",
          "provincia",
          "distrito",
          "direccionFiscal",
          "sourceUpdatedAt",
          "importedAt",
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM "padron_sunat_ruc_staging"
        WHERE "jobId" = ${jobId}
      `;
    });
  }

  private parseLine(line: string): PadronRow | null {
    const trimmed = line.trim();
    if (!trimmed || !/^\d{11}\|/.test(trimmed)) return null;

    const parts = trimmed.split('|').map((part) => part.trim());
    const [ruc, razonSocial, estado, condicionDomicilio, ubigeo] = parts;

    if (!/^\d{11}$/.test(ruc) || !razonSocial || !estado) return null;

    return {
      ruc,
      razonSocial,
      estado,
      condicionDomicilio: condicionDomicilio || null,
      ubigeo: /^\d{6}$/.test(ubigeo ?? '') ? ubigeo : null,
      departamento: parts[5] || null,
      provincia: parts[6] || null,
      distrito: parts[7] || null,
      direccionFiscal: parts[8] || null,
    };
  }

  private async processTextBufferByLine(
    buffer: Buffer,
    onLine: (line: string) => Promise<void>,
  ) {
    const decoder = new StringDecoder('latin1');
    let pendingLine = '';

    for (let offset = 0; offset < buffer.length; offset += DEFAULT_TEXT_CHUNK_SIZE) {
      const chunk = buffer.subarray(
        offset,
        Math.min(offset + DEFAULT_TEXT_CHUNK_SIZE, buffer.length),
      );
      pendingLine += decoder.write(chunk);
      const lines = pendingLine.split(/\r?\n/);
      pendingLine = lines.pop() ?? '';

      for (const line of lines) {
        await onLine(line);
      }
    }

    pendingLine += decoder.end();
    if (pendingLine.length > 0) {
      await onLine(pendingLine);
    }
  }

  private async insertStagingBatch(
    jobId: string,
    rows: PadronRow[],
    importedAt: Date,
  ) {
    if (rows.length === 0) return 0;

    const result = await this.prisma.padronSunatRucStaging.createMany({
      data: rows.map((row) => ({
        ...row,
        jobId,
        importedAt,
        sourceUpdatedAt: importedAt,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  private async fetchWithTimeout(sourceUrl: string, signal: AbortSignal) {
    const timeoutMs = Number(
      this.config.get<string>(
        'SUNAT_PADRON_RUC_TIMEOUT_MS',
        String(DEFAULT_DOWNLOAD_TIMEOUT_MS),
      ),
    );
    const timeoutController = new AbortController();
    let timedOut = false;
    let cancelled = false;
    const timeout = setTimeout(
      () => {
        timedOut = true;
        timeoutController.abort();
      },
      Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_DOWNLOAD_TIMEOUT_MS,
    );

    const onAbort = () => {
      cancelled = true;
      timeoutController.abort();
    };
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      return await fetch(sourceUrl, { signal: timeoutController.signal });
    } catch (error) {
      if (cancelled || signal.aborted) {
        throw new PadronImportCancelledError();
      }
      if (timedOut) {
        throw new ServiceUnavailableException(
          `Tiempo agotado descargando padrón SUNAT desde ${sourceUrl}`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
    }
  }

  private async ensureNotCancelled(jobId: string) {
    const job = await this.prisma.padronSunatRucImportJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    if (job?.status === 'CANCEL_REQUESTED') {
      throw new PadronImportCancelledError();
    }
  }

  private async handleImportFailure(
    jobId: string,
    startedAt: Date,
    error: unknown,
  ) {
    const isCancelled = error instanceof PadronImportCancelledError;
    const message = isCancelled
      ? 'Sincronización del padrón SUNAT cancelada. Se conservó el padrón publicado.'
      : error instanceof Error
        ? error.message
        : 'No se pudo importar el padrón SUNAT';

    await this.updateJob(jobId, {
      status: isCancelled ? 'CANCELLED' : 'ERROR',
      stage: isCancelled ? 'CANCELLED' : 'ERROR',
      message,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      error: isCancelled ? null : message,
    });
    this.emitStage(
      isCancelled ? 'CANCELLED' : 'ERROR',
      isCancelled ? 'CANCELLED' : 'ERROR',
      message,
    );
    await this.prisma.padronSunatRucStaging.deleteMany({ where: { jobId } });

    if (!isCancelled) {
      this.logger.error(message, error instanceof Error ? error.stack : undefined);
    }
  }

  private async recoverInterruptedRunningJob() {
    if (this.runningImport) return;

    const activeJob = await this.prisma.padronSunatRucImportJob.findFirst({
      where: { status: { in: ['RUNNING', 'CANCEL_REQUESTED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeJob) return;

    await this.updateJob(activeJob.id, {
      status: 'ERROR',
      stage: 'ERROR',
      message:
        'La sincronización anterior quedó interrumpida al reiniciar el servicio. Se conservó el padrón publicado.',
      finishedAt: new Date(),
      error: 'Proceso interrumpido antes de publicar.',
    });
    await this.prisma.padronSunatRucStaging.deleteMany({
      where: { jobId: activeJob.id },
    });
  }

  private updateJob(
    jobId: string,
    data: Partial<Omit<ImportJob, 'id'>>,
  ) {
    return this.prisma.padronSunatRucImportJob.update({
      where: { id: jobId },
      data,
    });
  }

  private idleStatus(currentRecords: number): PadronSunatRucImportStatus {
    return {
      status: 'IDLE',
      stage: 'IDLE',
      sourceUrl: this.config.get<string>(
        'SUNAT_PADRON_RUC_URL',
        DEFAULT_PADRON_URL,
      ),
      message: 'Sin sincronización en curso.',
      processed: 0,
      inserted: 0,
      discarded: 0,
      totalLines: null,
      currentRecords,
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      importedAt: null,
      error: null,
    };
  }

  private toStatus(
    job: ImportJob,
    currentRecords: number,
  ): PadronSunatRucImportStatus {
    return {
      status: this.asStatus(job.status),
      stage: this.asStage(job.stage),
      sourceUrl: job.sourceUrl,
      message: job.message,
      processed: job.processed,
      inserted: job.inserted,
      discarded: job.discarded,
      totalLines: job.totalLines,
      currentRecords,
      startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null,
      durationMs: job.durationMs,
      importedAt: job.importedAt?.toISOString() ?? null,
      error: job.error,
    };
  }

  private asStatus(status: string): PadronImportStatus {
    if (
      [
        'IDLE',
        'RUNNING',
        'CANCEL_REQUESTED',
        'CANCELLED',
        'SUCCESS',
        'ERROR',
      ].includes(status)
    ) {
      return status as PadronImportStatus;
    }

    return 'ERROR';
  }

  private asStage(stage: string): PadronImportStage {
    if (
      [
        'IDLE',
        'DOWNLOADING',
        'DECOMPRESSING',
        'CLEANING',
        'IMPORTING',
        'PUBLISHING',
        'COMPLETED',
        'CANCELLED',
        'ERROR',
      ].includes(stage)
    ) {
      return stage as PadronImportStage;
    }

    return 'ERROR';
  }
}
