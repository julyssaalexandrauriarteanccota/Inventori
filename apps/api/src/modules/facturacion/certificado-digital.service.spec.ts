import { BadRequestException, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as forge from 'node-forge';
import { CertificadoDigitalService } from './certificado-digital.service';
import { FiscalSecretsService } from './fiscal-secrets.service';
import { SunatCredentialsService } from './sunat-credentials.service';
import { SunatDirectGateway } from './sunat-direct.gateway';

const PASSWORD = 'clave-demo-p12';

function createP12Buffer(password: string) {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = keys.publicKey;
  certificate.serialNumber = '01';
  certificate.validity.notBefore = new Date('2026-01-01T00:00:00.000Z');
  certificate.validity.notAfter = new Date('2027-01-01T00:00:00.000Z');
  const attrs = [
    { name: 'countryName', value: 'PE' },
    { shortName: 'O', value: 'Empresa Demo SAC' },
    { name: 'commonName', value: 'Certificado Demo SUNAT' },
  ];
  certificate.setSubject(attrs);
  certificate.setIssuer(attrs);
  certificate.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    certificate,
    password,
    { algorithm: '3des' },
  );
  return Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary');
}

describe('CertificadoDigitalService', () => {
  let service: CertificadoDigitalService;
  let prisma: any;
  let fiscalSecrets: FiscalSecretsService;
  let sunatGateway: SunatDirectGateway;
  let sunatCredentials: SunatCredentialsService;
  let tx: {
    certificadoDigital: {
      updateMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let tempDir: string;
  let p12Buffer: Buffer;
  const originalStorageDir = process.env.FISCAL_PRIVATE_STORAGE_DIR;

  beforeAll(() => {
    p12Buffer = createP12Buffer(PASSWORD);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    tempDir = await fs.mkdtemp(join(tmpdir(), 'erp-fiscal-cert-'));
    process.env.FISCAL_PRIVATE_STORAGE_DIR = tempDir;

    tx = {
      certificadoDigital: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          ...data,
          revokedAt: null,
          createdAt: new Date('2026-05-02T00:00:00.000Z'),
          updatedAt: new Date('2026-05-02T00:00:00.000Z'),
        })),
        update: jest.fn(),
      },
    };

    prisma = {
      configEmpresaFiscal: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'fiscal-1',
          ruc: '20123456789',
          ambienteDefault: 'BETA',
        }),
      },
      certificadoDigital: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(
        async (callback: (txClient: typeof tx) => unknown) => callback(tx),
      ),
    };

    fiscalSecrets = {
      encryptBuffer: jest.fn().mockReturnValue({
        algorithm: 'AES-256-GCM',
        keyVersion: 'v-test',
        iv: 'iv-demo',
        authTag: 'tag-demo',
        encryptedValue: 'encrypted-p12-demo',
      }),
      decryptBuffer: jest.fn(),
      upsertSecret: jest.fn().mockResolvedValue({ id: 'secret-1' }),
      revealSecret: jest.fn(),
    } as unknown as FiscalSecretsService;

    sunatGateway = {
      testConnection: jest.fn().mockResolvedValue({
        endpoint: 'https://sunat-beta.example.test/billService',
        ambiente: 'BETA',
        usernameConfigured: true,
        passwordConfigured: true,
      }),
    } as unknown as SunatDirectGateway;
    sunatCredentials = {
      getSafeStatus: jest.fn().mockResolvedValue({
        configured: true,
        source: 'FISCAL_SECRET',
        usernameConfigured: true,
        passwordConfigured: true,
        usernameMode: 'RUC_PLUS_SOL_USER',
        usernamePreview: '20***OS',
      }),
    } as unknown as SunatCredentialsService;

    service = new CertificadoDigitalService(
      prisma,
      fiscalSecrets,
      sunatGateway,
      sunatCredentials,
    );
  });

  afterEach(async () => {
    if (originalStorageDir === undefined) {
      delete process.env.FISCAL_PRIVATE_STORAGE_DIR;
    } else {
      process.env.FISCAL_PRIVATE_STORAGE_DIR = originalStorageDir;
    }
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  function buildFile(
    originalname = 'certificado-demo.p12',
    buffer = p12Buffer,
  ) {
    return {
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype: 'application/x-pkcs12',
      size: buffer.length,
      buffer,
      stream: undefined as never,
      destination: '',
      filename: originalname,
      path: '',
    } as any;
  }

  it('valida, cifra y registra metadata segura de un .p12 de ejemplo', async () => {
    const result = await service.upload(buildFile(), {
      nombre: ' Certificado Demo ',
      password: PASSWORD,
    });

    expect(fiscalSecrets.encryptBuffer).toHaveBeenCalledWith(p12Buffer);
    expect(fiscalSecrets.upsertSecret).toHaveBeenCalledWith(
      expect.stringMatching(/^certificado-digital:/),
      'p12-password',
      PASSWORD,
    );
    expect(tx.certificadoDigital.updateMany).toHaveBeenCalledWith({
      where: {
        configEmpresaFiscalId: 'fiscal-1',
        activo: true,
        deletedAt: null,
      },
      data: { activo: false },
    });
    expect(tx.certificadoDigital.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        configEmpresaFiscalId: 'fiscal-1',
        nombre: 'Certificado Demo',
        storageProvider: 'LOCAL_PRIVATE',
        activo: true,
        serialNumber: '01',
        subject: expect.stringContaining('Empresa Demo SAC'),
        issuer: expect.stringContaining('Empresa Demo SAC'),
        fingerprintSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        validoDesde: new Date('2026-01-01T00:00:00.000Z'),
        validoHasta: new Date('2027-01-01T00:00:00.000Z'),
      }),
    });

    const createArg = tx.certificadoDigital.create.mock.calls[0][0];
    const written = JSON.parse(
      await fs.readFile(join(tempDir, createArg.data.storageKey), 'utf8'),
    );
    expect(written).toEqual(
      expect.objectContaining({ encryptedValue: 'encrypted-p12-demo' }),
    );
    expect(JSON.stringify(written)).not.toContain(PASSWORD);
    expect(result).toEqual(
      expect.objectContaining({
        nombre: 'Certificado Demo',
        storageProvider: 'LOCAL_PRIVATE',
        activo: true,
        serialNumber: '01',
        fingerprintSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(result).not.toHaveProperty('passwordSecretRef');
  });

  it('rechaza .p12 cuando la contraseña no abre el certificado', async () => {
    await expect(
      service.upload(buildFile(), {
        nombre: 'Certificado Demo',
        password: 'clave-incorrecta',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(fiscalSecrets.encryptBuffer).not.toHaveBeenCalled();
    expect(prisma.configEmpresaFiscal.findFirst).not.toHaveBeenCalled();
  });

  it('rechaza archivos que no sean .p12 o .pfx', async () => {
    await expect(
      service.upload(buildFile('certificado-demo.txt'), {
        nombre: 'Certificado Demo',
        password: PASSWORD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('recupera material de clave privada del certificado activo cifrado', async () => {
    const storageKey = 'fiscal-certificates/certificado-activo.p12.enc.json';
    await fs.mkdir(join(tempDir, 'fiscal-certificates'), { recursive: true });
    await fs.writeFile(
      join(tempDir, storageKey),
      JSON.stringify({
        algorithm: 'AES-256-GCM',
        keyVersion: 'v-test',
        iv: 'iv-demo',
        authTag: 'tag-demo',
        encryptedValue: 'encrypted-p12-demo',
      }),
    );
    (prisma.certificadoDigital.findFirst as jest.Mock).mockResolvedValue({
      id: 'cert-1',
      nombre: 'Certificado Activo',
      storageKey,
      passwordSecretRef: 'certificado-digital:cert-1',
      fingerprintSha256: 'fingerprint-demo',
      validoDesde: new Date('2026-01-01T00:00:00.000Z'),
      validoHasta: new Date('2027-01-01T00:00:00.000Z'),
    });
    (fiscalSecrets.decryptBuffer as jest.Mock).mockReturnValue(p12Buffer);
    (fiscalSecrets.revealSecret as jest.Mock).mockResolvedValue(PASSWORD);

    const material = await service.getActiveKeyMaterial();

    expect(material.certificate.id).toBe('cert-1');
    expect(material.password).toBe(PASSWORD);
    expect(material.p12Buffer).toBe(p12Buffer);
    expect(material.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
    expect(material.certificatePem).toContain('BEGIN CERTIFICATE');
    expect(fiscalSecrets.revealSecret).toHaveBeenCalledWith(
      'certificado-digital:cert-1',
      'p12-password',
    );
  });

  it('rechaza recuperar material si no hay certificado activo', async () => {
    (prisma.certificadoDigital.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.getActiveKeyMaterial()).rejects.toThrow(
      NotFoundException,
    );
  });
});
