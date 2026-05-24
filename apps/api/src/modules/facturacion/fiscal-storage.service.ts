import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';
import { Client as MinioClient, type ClientOptions } from 'minio';
import { Readable } from 'stream';
import { AmbienteSunat } from '@erp/shared';

type FiscalStorageProvider = 'LOCAL' | 'MINIO';
type ComprobanteArtifact = 'xml' | 'cdr' | 'pdf';
type BajaArtifact = 'xml' | 'cdr';

interface ComprobanteStorageInput {
  emisorRuc?: string | null;
  ambiente?: AmbienteSunat | string | null;
  fechaEmision?: Date | string | null;
  tipo: unknown;
  serie: string;
  correlativo: number;
}

interface BajaStorageInput {
  identificadorBaja: string;
  ambiente?: AmbienteSunat | string | null;
  fechaGeneracion?: Date | string | null;
  comprobante?: { emisorRuc?: string | null } | null;
}

interface StorageLocation {
  bucket: string;
  objectName: string;
}

/**
 * Doc 09 — almacenamiento documental fiscal.
 *
 * Las claves persistidas incluyen el bucket como primer segmento:
 * `cpe-produccion/20123456789/PRODUCCION/2026/05/factura/...xml`.
 * Esto permite resolver descargas y URLs firmadas sin depender de estado
 * externo ni mezclar BETA/PRODUCCION.
 */
@Injectable()
export class FiscalStorageService {
  private readonly logger = new Logger(FiscalStorageService.name);
  private readonly provider: FiscalStorageProvider;
  private readonly localRoot: string;
  private readonly minio?: MinioClient;
  private readonly defaultBucket: string;
  private readonly buckets: Record<string, string>;
  private readonly knownBuckets: Set<string>;
  private readonly readyBuckets = new Set<string>();

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('FISCAL_STORAGE_PROVIDER', 'LOCAL');
    this.provider = raw === 'MINIO' ? 'MINIO' : 'LOCAL';
    this.localRoot =
      this.config.get<string>('FISCAL_PRIVATE_STORAGE_DIR') ??
      resolve(process.cwd(), 'private-fiscal-storage');

    this.buckets = {
      cpeBeta: this.config.get<string>('MINIO_BUCKET_CPE_BETA', 'cpe-beta'),
      cpeProduccion: this.config.get<string>(
        'MINIO_BUCKET_CPE_PRODUCCION',
        'cpe-produccion',
      ),
      bajasBeta: this.config.get<string>(
        'MINIO_BUCKET_BAJAS_BETA',
        'bajas-beta',
      ),
      bajasProduccion: this.config.get<string>(
        'MINIO_BUCKET_BAJAS_PRODUCCION',
        'bajas-produccion',
      ),
      tempUploads: this.config.get<string>(
        'MINIO_BUCKET_TEMP_UPLOADS',
        'temp-uploads',
      ),
    };
    this.defaultBucket = this.config.get<string>(
      'FISCAL_STORAGE_BUCKET',
      this.buckets.cpeBeta,
    );
    this.knownBuckets = new Set([
      ...Object.values(this.buckets),
      this.defaultBucket,
    ]);

    if (this.provider === 'MINIO') {
      const opts: ClientOptions = {
        endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
        port: Number(this.config.get<string>('MINIO_PORT', '9000')),
        useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
        accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
        secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
      };
      this.minio = new MinioClient(opts);
      this.logger.log(
        `FiscalStorage usando MinIO ${opts.endPoint}:${opts.port}`,
      );
    } else {
      this.logger.log(
        `FiscalStorage usando filesystem local: ${this.localRoot}`,
      );
    }
  }

  buildComprobanteStorageKey(
    comprobante: ComprobanteStorageInput,
    artifact: ComprobanteArtifact,
  ): string {
    const ambiente = normalizeAmbiente(comprobante.ambiente);
    const bucket = this.cpeBucket(ambiente);
    const fecha = normalizeDate(comprobante.fechaEmision);
    const ruc = clean(comprobante.emisorRuc) || 'sin-ruc';
    const tipoCodigo = this.documentCodeForTipo(comprobante.tipo);
    const tipoFolder = this.documentFolderForTipo(comprobante.tipo);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const correlativo = String(comprobante.correlativo).padStart(8, '0');
    const ext = artifact === 'cdr' ? 'cdr.zip' : artifact;
    const filename = `${ruc}-${tipoCodigo}-${comprobante.serie}-${correlativo}.${ext}`;

    return [bucket, ruc, ambiente, anio, mes, tipoFolder, filename].join('/');
  }

  buildBajaStorageKey(baja: BajaStorageInput, artifact: BajaArtifact): string {
    const ambiente = normalizeAmbiente(baja.ambiente);
    const bucket = this.bajaBucket(ambiente);
    const fecha = normalizeDate(baja.fechaGeneracion);
    const ruc = clean(baja.comprobante?.emisorRuc) || 'sin-ruc';
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const ext = artifact === 'cdr' ? 'cdr.zip' : 'xml';

    return [
      bucket,
      ruc,
      ambiente,
      anio,
      mes,
      `${baja.identificadorBaja}.${ext}`,
    ].join('/');
  }

  async putXml(
    comprobante: ComprobanteStorageInput,
    xmlContent: Buffer | string,
  ): Promise<string> {
    const storageKey = this.buildComprobanteStorageKey(comprobante, 'xml');
    await this.writeObject(storageKey, xmlContent, 'application/xml');
    return storageKey;
  }

  async putCdrZip(
    comprobante: ComprobanteStorageInput,
    cdrZip: Buffer,
  ): Promise<string> {
    const storageKey = this.buildComprobanteStorageKey(comprobante, 'cdr');
    await this.writeObject(storageKey, cdrZip, 'application/zip');
    return storageKey;
  }

  async putPdf(
    comprobante: ComprobanteStorageInput,
    pdfContent: Buffer,
  ): Promise<string> {
    const storageKey = this.buildComprobanteStorageKey(comprobante, 'pdf');
    await this.writeObject(storageKey, pdfContent, 'application/pdf');
    return storageKey;
  }

  async putBajaXml(
    baja: BajaStorageInput,
    xmlContent: Buffer | string,
  ): Promise<string> {
    const storageKey = this.buildBajaStorageKey(baja, 'xml');
    await this.writeObject(storageKey, xmlContent, 'application/xml');
    return storageKey;
  }

  async putBajaCdr(baja: BajaStorageInput, cdrZip: Buffer): Promise<string> {
    const storageKey = this.buildBajaStorageKey(baja, 'cdr');
    await this.writeObject(storageKey, cdrZip, 'application/zip');
    return storageKey;
  }

  async getXml(storageKey: string): Promise<Buffer | null> {
    return this.readObjectBuffer(storageKey);
  }

  async getCdrZip(storageKey: string): Promise<Buffer | null> {
    return this.readObjectBuffer(storageKey);
  }

  async getPdf(storageKey: string): Promise<Buffer | null> {
    return this.readObjectBuffer(storageKey);
  }

  async getSignedUrl(
    storageKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    if (this.provider !== 'MINIO' || !this.minio) {
      return `local://${encodeURIComponent(storageKey)}`;
    }

    const location = this.resolveLocation(storageKey);
    await this.ensureBucket(location.bucket);
    return this.minio.presignedGetObject(
      location.bucket,
      location.objectName,
      expiresInSeconds,
    );
  }

  async exists(storageKey: string): Promise<boolean> {
    const location = this.resolveLocation(storageKey);

    if (this.provider === 'MINIO' && this.minio) {
      await this.ensureBucket(location.bucket);
      try {
        await this.minio.statObject(location.bucket, location.objectName);
        return true;
      } catch (error) {
        if (isNotFound(error)) return false;
        throw error;
      }
    }

    try {
      await fs.access(this.localPath(location));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async writeObject(
    storageKey: string,
    content: Buffer | string,
    contentType?: string,
  ): Promise<void> {
    const location = this.resolveLocation(storageKey);

    if (this.provider === 'MINIO' && this.minio) {
      await this.ensureBucket(location.bucket);
      const buf = typeof content === 'string' ? Buffer.from(content) : content;
      await this.minio.putObject(
        location.bucket,
        location.objectName,
        buf,
        buf.length,
        contentType ? { 'Content-Type': contentType } : undefined,
      );
      return;
    }

    const filePath = this.localPath(location);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }

  async readObjectText(
    storageKey: string,
    encoding: BufferEncoding = 'utf8',
  ): Promise<string | null> {
    const buf = await this.readObjectBuffer(storageKey);
    return buf?.toString(encoding) ?? null;
  }

  async readObjectBuffer(storageKey: string): Promise<Buffer | null> {
    const location = this.resolveLocation(storageKey);

    if (this.provider === 'MINIO' && this.minio) {
      await this.ensureBucket(location.bucket);
      try {
        const stream = await this.minio.getObject(
          location.bucket,
          location.objectName,
        );
        return await streamToBuffer(stream);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    }

    try {
      return await fs.readFile(this.localPath(location));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  private cpeBucket(ambiente: AmbienteSunat): string {
    return ambiente === AmbienteSunat.PRODUCCION
      ? this.buckets.cpeProduccion
      : this.buckets.cpeBeta;
  }

  private bajaBucket(ambiente: AmbienteSunat): string {
    return ambiente === AmbienteSunat.PRODUCCION
      ? this.buckets.bajasProduccion
      : this.buckets.bajasBeta;
  }

  private resolveLocation(storageKey: string): StorageLocation {
    const [first, ...rest] = storageKey.split('/');
    if (first && rest.length > 0 && this.knownBuckets.has(first)) {
      return { bucket: first, objectName: rest.join('/') };
    }

    return { bucket: this.defaultBucket, objectName: storageKey };
  }

  private localPath(location: StorageLocation): string {
    return join(this.localRoot, location.bucket, location.objectName);
  }

  private async ensureBucket(bucket: string): Promise<void> {
    if (
      this.provider !== 'MINIO' ||
      !this.minio ||
      this.readyBuckets.has(bucket)
    )
      return;

    const exists = await this.minio.bucketExists(bucket);
    if (!exists) {
      await this.minio.makeBucket(bucket, '');
      this.logger.log(`Bucket MinIO ${bucket} creado`);
    }
    this.readyBuckets.add(bucket);
  }

  private documentCodeForTipo(tipo: unknown): string {
    const map: Record<string, string> = {
      FACTURA: '01',
      BOLETA: '03',
      NOTA_CREDITO: '07',
      NOTA_DEBITO: '08',
    };
    return map[String(tipo)] ?? '00';
  }

  private documentFolderForTipo(tipo: unknown): string {
    const map: Record<string, string> = {
      FACTURA: 'factura',
      BOLETA: 'boleta',
      NOTA_CREDITO: 'nota_credito',
      NOTA_DEBITO: 'nota_debito',
    };
    return map[String(tipo)] ?? 'otros';
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolveCb, rejectCb) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer | string) =>
      chunks.push(typeof c === 'string' ? Buffer.from(c) : c),
    );
    stream.on('end', () => resolveCb(Buffer.concat(chunks)));
    stream.on('error', rejectCb);
  });
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAmbiente(value: unknown): AmbienteSunat {
  return value === AmbienteSunat.PRODUCCION || value === 'PRODUCCION'
    ? AmbienteSunat.PRODUCCION
    : AmbienteSunat.BETA;
}

function normalizeDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function isNotFound(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === 'NotFound' || code === 'NoSuchKey' || code === 'ENOENT';
}
