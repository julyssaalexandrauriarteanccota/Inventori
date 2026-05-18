import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { execFile } from 'child_process';
import { createHash, randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as forge from 'node-forge';
import { AmbienteSunat } from '@erp/shared';
import { dirname, join, resolve } from 'path';
import { promisify } from 'util';
import { PrismaService } from '../../database/prisma.service';
import { QueryCertificadoDigitalDto, UploadCertificadoDigitalDto } from './dto';
import { SunatDirectGateway } from './sunat-direct.gateway';
import { SunatCredentialsService } from './sunat-credentials.service';
import {
  EncryptedPayload,
  FiscalSecretsService,
} from './fiscal-secrets.service';

const CERTIFICATE_SECRET_NAME = 'p12-password';
const CERTIFICATE_STORAGE_PREFIX = 'fiscal-certificates';
const MAX_CERTIFICATE_BYTES = 5 * 1024 * 1024;
const execFileAsync = promisify(execFile);

export interface CertificateKeyMaterial {
  p12Buffer: Buffer;
  password: string;
  privateKeyPem: string;
  certificatePem: string;
  certificate: {
    id: string;
    nombre: string;
    fingerprintSha256: string | null;
    validoDesde: Date | null;
    validoHasta: Date | null;
  };
}

@Injectable()
export class CertificadoDigitalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalSecrets: FiscalSecretsService,
    private readonly sunatGateway: SunatDirectGateway,
    private readonly sunatCredentials: SunatCredentialsService,
  ) {}

  async findAll(query: QueryCertificadoDigitalDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.activo !== undefined) where.activo = query.activo;

    const [data, total] = await Promise.all([
      this.prisma.certificadoDigital.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ activo: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.certificadoDigital.count({ where }),
    ]);

    return {
      data: data.map((item) => this.toSafeCertificate(item)),
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async getStatus() {
    const [config, certificadoActivo, sedesActivas, seriesActivas] =
      await Promise.all([
        this.prisma.configEmpresaFiscal.findFirst({
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.certificadoDigital.findFirst({
          where: { activo: true, revokedAt: null, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.empresaSedeFiscal.count({
          where: { activo: true, deletedAt: null },
        }),
        this.prisma.serieDocumento.count({
          where: { activo: true, deletedAt: null },
        }),
      ]);

    return {
      ambienteDefault: config?.ambienteDefault ?? 'BETA',
      tieneCertificadoActivo: !!certificadoActivo,
      certificadoActivo: certificadoActivo
        ? this.toSafeCertificate(certificadoActivo)
        : null,
      sedesActivas,
      seriesActivas,
      credencialesSunat: await this.sunatCredentials.getSafeStatus(config?.ruc),
    };
  }

  async testConnection() {
    const config = await this.prisma.configEmpresaFiscal.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!config) {
      throw new BadRequestException(
        'Debe configurar los datos fiscales primero',
      );
    }

    const certificate = await this.prisma.certificadoDigital.findFirst({
      where: { activo: true, revokedAt: null, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!certificate) {
      throw new BadRequestException(
        'Debe cargar y activar un certificado digital',
      );
    }

    const connection = await this.sunatGateway.testConnection(
      config.ambienteDefault as AmbienteSunat,
      config.ruc,
    );

    return {
      ok: true,
      ...connection,
      certificadoActivo: this.toSafeCertificate(certificate),
    };
  }

  async upload(
    file: Express.Multer.File | undefined,
    dto: UploadCertificadoDigitalDto,
  ) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo .p12');
    }
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('El certificado adjunto está vacío');
    }
    if (file.buffer.length > MAX_CERTIFICATE_BYTES) {
      throw new BadRequestException(
        'El certificado excede el tamaño máximo permitido',
      );
    }

    const originalName = file.originalname?.toLowerCase() ?? '';
    if (!originalName.endsWith('.p12') && !originalName.endsWith('.pfx')) {
      throw new BadRequestException('Solo se aceptan certificados .p12 o .pfx');
    }

    const certificateMetadata = await this.extractP12Metadata(
      file.buffer,
      dto.password,
    );

    const config = await this.prisma.configEmpresaFiscal.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!config) {
      throw new BadRequestException(
        'Debe configurar los datos fiscales antes de cargar el certificado',
      );
    }

    const id = randomUUID();
    const fingerprintSha256 = createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const encrypted = this.fiscalSecrets.encryptBuffer(file.buffer);
    const storageKey = `${CERTIFICATE_STORAGE_PREFIX}/${config.ruc}-${Date.now()}-${id}.p12.enc.json`;
    const absolutePath = this.resolvePrivateStoragePath(storageKey);

    await fs.mkdir(dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, JSON.stringify(encrypted), { flag: 'wx' });

    const passwordSecretRef = this.buildCertificateSecretScope(id);

    try {
      await this.fiscalSecrets.upsertSecret(
        passwordSecretRef,
        CERTIFICATE_SECRET_NAME,
        dto.password,
      );

      const created = await this.prisma.$transaction(async (tx) => {
        await tx.certificadoDigital.updateMany({
          where: {
            configEmpresaFiscalId: config.id,
            activo: true,
            deletedAt: null,
          },
          data: { activo: false },
        });

        return tx.certificadoDigital.create({
          data: {
            id,
            configEmpresaFiscalId: config.id,
            nombre: dto.nombre.trim(),
            storageProvider: 'LOCAL_PRIVATE',
            storageKey,
            passwordSecretRef,
            fingerprintSha256:
              certificateMetadata.fingerprintSha256 ?? fingerprintSha256,
            serialNumber: certificateMetadata.serialNumber,
            subject: certificateMetadata.subject,
            issuer: certificateMetadata.issuer,
            validoDesde: certificateMetadata.validoDesde,
            validoHasta: certificateMetadata.validoHasta,
            activo: true,
          },
        });
      });

      return this.toSafeCertificate(created);
    } catch (error) {
      await fs.rm(absolutePath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async getActiveKeyMaterial(): Promise<CertificateKeyMaterial> {
    const certificate = await this.prisma.certificadoDigital.findFirst({
      where: { activo: true, revokedAt: null, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!certificate) {
      throw new NotFoundException('No existe certificado digital activo');
    }
    if (!certificate.passwordSecretRef) {
      throw new BadRequestException(
        'El certificado activo no tiene referencia segura de contraseña',
      );
    }

    const encryptedRaw = await fs.readFile(
      this.resolvePrivateStoragePath(certificate.storageKey),
      'utf8',
    );
    const encrypted = JSON.parse(encryptedRaw) as EncryptedPayload;
    const p12Buffer = this.fiscalSecrets.decryptBuffer(encrypted);
    const password = await this.fiscalSecrets.revealSecret(
      certificate.passwordSecretRef,
      CERTIFICATE_SECRET_NAME,
    );
    const extracted = await this.extractP12KeyMaterial(p12Buffer, password);

    return {
      p12Buffer,
      password,
      privateKeyPem: extracted.privateKeyPem,
      certificatePem: extracted.certificatePem,
      certificate: {
        id: certificate.id,
        nombre: certificate.nombre,
        fingerprintSha256: certificate.fingerprintSha256,
        validoDesde: certificate.validoDesde,
        validoHasta: certificate.validoHasta,
      },
    };
  }

  async activate(id: string) {
    const current = await this.prisma.certificadoDigital.findFirst({
      where: { id, deletedAt: null, revokedAt: null },
    });
    if (!current) {
      throw new NotFoundException(`Certificado digital ${id} no encontrado`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.certificadoDigital.updateMany({
        where: {
          configEmpresaFiscalId: current.configEmpresaFiscalId,
          activo: true,
          deletedAt: null,
        },
        data: { activo: false },
      });

      return tx.certificadoDigital.update({
        where: { id },
        data: { activo: true },
      });
    });

    return this.toSafeCertificate(updated);
  }

  async revoke(id: string) {
    const current = await this.prisma.certificadoDigital.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException(`Certificado digital ${id} no encontrado`);
    }

    const updated = await this.prisma.certificadoDigital.update({
      where: { id },
      data: { activo: false, revokedAt: new Date() },
    });

    return this.toSafeCertificate(updated);
  }

  async remove(id: string) {
    const current = await this.prisma.certificadoDigital.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException(`Certificado digital ${id} no encontrado`);
    }

    const updated = await this.prisma.certificadoDigital.update({
      where: { id },
      data: { activo: false, deletedAt: new Date() },
    });

    if (current.passwordSecretRef) {
      await this.fiscalSecrets.deleteSecret(
        current.passwordSecretRef,
        CERTIFICATE_SECRET_NAME,
      );
    }
    await fs
      .rm(this.resolvePrivateStoragePath(current.storageKey), { force: true })
      .catch(() => undefined);

    return this.toSafeCertificate(updated);
  }

  private async extractP12Metadata(buffer: Buffer, password: string) {
    try {
      const { certificatePem } = await this.extractP12KeyMaterial(
        buffer,
        password,
      );
      const certificate = forge.pki.certificateFromPem(certificatePem);
      return {
        fingerprintSha256: createHash('sha256')
          .update(
            Buffer.from(
              forge.asn1
                .toDer(forge.pki.certificateToAsn1(certificate))
                .getBytes(),
              'binary',
            ),
          )
          .digest('hex'),
        serialNumber: certificate.serialNumber || null,
        subject: this.formatDistinguishedName(certificate.subject),
        issuer: this.formatDistinguishedName(certificate.issuer),
        validoDesde: certificate.validity.notBefore,
        validoHasta: certificate.validity.notAfter,
      };
    } catch {
      throw new BadRequestException(
        'No se pudo leer el certificado .p12/.pfx. Verifica que la contraseña sea la clave de exportación y que el archivo incluya la clave privada.',
      );
    }
  }

  private async extractP12KeyMaterial(buffer: Buffer, password: string) {
    try {
      const der = forge.util.createBuffer(buffer.toString('binary'));
      const asn1 = forge.asn1.fromDer(der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
      const keyBags = [
        ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
          forge.pki.oids.pkcs8ShroudedKeyBag
        ] ?? []),
        ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[
          forge.pki.oids.keyBag
        ] ?? []),
      ];
      const certBags =
        p12.getBags({ bagType: forge.pki.oids.certBag })[
          forge.pki.oids.certBag
        ] ?? [];
      const privateKey = keyBags[0]?.key;
      const certificate = certBags[0]?.cert;

      if (!privateKey || !certificate) {
        throw new Error('PKCS#12 sin clave privada o certificado');
      }

      return {
        privateKeyPem: forge.pki.privateKeyToPem(privateKey),
        certificatePem: forge.pki.certificateToPem(certificate),
      };
    } catch {
      return this.extractP12KeyMaterialWithOpenSsl(buffer, password);
    }
  }

  private extractP12KeyMaterialWithOpenSsl(buffer: Buffer, password: string) {
    const openssl = this.resolveOpenSslPath();
    if (!openssl) {
      throw new BadRequestException(
        'No se pudo leer el certificado PKCS#12 y OpenSSL no está disponible para convertirlo',
      );
    }

    return this.runOpenSslPkcs12Extraction(openssl, buffer, password);
  }

  private async runOpenSslPkcs12Extraction(
    openssl: string,
    buffer: Buffer,
    password: string,
  ) {
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'erp-p12-'));
    const p12Path = join(tempDir, 'certificate.p12');
    const keyPath = join(tempDir, 'private-key.pem');
    const certPath = join(tempDir, 'certificate.pem');

    try {
      await fs.writeFile(p12Path, buffer);
      const env = { ...process.env, P12_PASSWORD: password };
      const extractWithOpenSsl = async (legacy: boolean) => {
        const legacyArg = legacy ? ['-legacy'] : [];

        await execFileAsync(
          openssl,
          [
            'pkcs12',
            ...legacyArg,
            '-in',
            p12Path,
            '-passin',
            'env:P12_PASSWORD',
            '-nocerts',
            '-nodes',
            '-out',
            keyPath,
          ],
          { env },
        );

        await execFileAsync(
          openssl,
          [
            'pkcs12',
            ...legacyArg,
            '-in',
            p12Path,
            '-passin',
            'env:P12_PASSWORD',
            '-clcerts',
            '-nokeys',
            '-out',
            certPath,
          ],
          { env },
        );
      };

      try {
        await extractWithOpenSsl(false);
      } catch {
        await extractWithOpenSsl(true);
      }

      const [rawKey, rawCert] = await Promise.all([
        fs.readFile(keyPath, 'utf8'),
        fs.readFile(certPath, 'utf8'),
      ]);
      const privateKeyPem = this.extractPemBlock(rawKey, 'PRIVATE KEY');
      const certificatePem = this.extractPemBlock(rawCert, 'CERTIFICATE');

      if (!privateKeyPem || !certificatePem) {
        throw new Error('OpenSSL no devolvió llave privada y certificado');
      }

      return { privateKeyPem, certificatePem };
    } catch {
      throw new BadRequestException(
        'No se pudo abrir o convertir el certificado .p12/.pfx. Verifica que la contraseña sea la clave de exportación y que el archivo incluya la clave privada.',
      );
    } finally {
      await fs
        .rm(tempDir, { recursive: true, force: true })
        .catch(() => undefined);
    }
  }

  private extractPemBlock(content: string, labelSuffix: string) {
    const regex = new RegExp(
      `-----BEGIN [A-Z ]*${labelSuffix}-----[\\s\\S]+?-----END [A-Z ]*${labelSuffix}-----`,
    );
    return content.match(regex)?.[0] ?? null;
  }

  private resolveOpenSslPath() {
    const candidates = [
      process.env.OPENSSL_BIN,
      'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe',
      'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
      'openssl',
    ].filter(Boolean) as string[];

    return candidates.find((candidate) => {
      if (candidate === 'openssl') return true;
      return existsSync(candidate);
    });
  }

  private formatDistinguishedName(name: {
    attributes: forge.pki.CertificateField[];
  }) {
    return name.attributes
      .map((attr) => {
        const key = attr.shortName ?? attr.name ?? '';
        const value = Array.isArray(attr.value)
          ? attr.value.join(',')
          : (attr.value ?? '');

        return `${key}=${value}`;
      })
      .join(', ');
  }

  private resolvePrivateStoragePath(storageKey: string) {
    const privateRoot =
      process.env.FISCAL_PRIVATE_STORAGE_DIR ||
      resolve(process.cwd(), 'private-fiscal-storage');
    return join(privateRoot, storageKey);
  }

  private buildCertificateSecretScope(id: string) {
    return `certificado-digital:${id}`;
  }

  private toSafeCertificate(certificate: {
    id: string;
    configEmpresaFiscalId: string;
    nombre: string;
    storageProvider: string;
    storageKey: string;
    fingerprintSha256: string | null;
    serialNumber: string | null;
    subject: string | null;
    issuer: string | null;
    validoDesde: Date | null;
    validoHasta: Date | null;
    activo: boolean;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: certificate.id,
      configEmpresaFiscalId: certificate.configEmpresaFiscalId,
      nombre: certificate.nombre,
      storageProvider: certificate.storageProvider,
      storageKey: certificate.storageKey,
      fingerprintSha256: certificate.fingerprintSha256,
      serialNumber: certificate.serialNumber,
      subject: certificate.subject,
      issuer: certificate.issuer,
      validoDesde: certificate.validoDesde?.toISOString() ?? null,
      validoHasta: certificate.validoHasta?.toISOString() ?? null,
      activo: certificate.activo,
      revokedAt: certificate.revokedAt?.toISOString() ?? null,
      createdAt: certificate.createdAt.toISOString(),
      updatedAt: certificate.updatedAt.toISOString(),
    };
  }
}
