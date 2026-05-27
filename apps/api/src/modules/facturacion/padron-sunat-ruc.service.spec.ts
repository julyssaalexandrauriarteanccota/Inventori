const AdmZip = require('adm-zip');

import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PadronSunatRucService } from './padron-sunat-ruc.service';

const mockTx = {
  padronSunatRuc: {
    deleteMany: jest.fn(),
  },
  $executeRaw: jest.fn(),
};

const mockPrisma = {
  padronSunatRuc: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  padronSunatRucImportJob: {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  padronSunatRucStaging: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockConfig = {
  get: jest.fn(),
};

const mockEvents = {
  emitToRoles: jest.fn(),
};

function zipWithText(text: string) {
  const zip = new AdmZip();
  zip.addFile('padron.txt', Buffer.from(text, 'latin1'));
  return zip.toBuffer();
}

describe('PadronSunatRucService', () => {
  let service: PadronSunatRucService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.padronSunatRucImportJob.create.mockResolvedValue({
      id: 'job-1',
    });
    mockPrisma.padronSunatRucImportJob.update.mockResolvedValue({});
    mockPrisma.padronSunatRucImportJob.findUnique.mockResolvedValue({
      status: 'RUNNING',
    });
    mockPrisma.padronSunatRucStaging.createMany.mockResolvedValue({
      count: 1,
    });
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
        callback(mockTx),
    );
    mockConfig.get.mockImplementation(
      (_key: string, fallback?: string) => fallback,
    );

    service = new PadronSunatRucService(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
      mockEvents as unknown as import('../../websockets/events.service').EventsService,
    );
  });

  it('carga en staging y recién luego publica el padrón', async () => {
    const result = await service.importFromZip(
      zipWithText(
        [
          '20123456789|EMPRESA DEMO SAC|ACTIVO|HABIDO|150131|LIMA|LIMA|SAN ISIDRO|AV DEMO 123',
          'fila inválida',
        ].join('\n'),
      ),
    );

    expect(result.inserted).toBe(1);
    expect(result.discarded).toBe(1);
    expect(mockPrisma.padronSunatRucStaging.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            jobId: 'job-1',
            ruc: '20123456789',
            ubigeo: '150131',
            distrito: 'SAN ISIDRO',
          }),
        ],
      }),
    );
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTx.padronSunatRuc.deleteMany).toHaveBeenCalledWith({});
    expect(mockPrisma.padronSunatRucImportJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: 'SUCCESS',
          stage: 'COMPLETED',
          inserted: 1,
          discarded: 1,
        }),
      }),
    );
  });

  it('no publica ni borra el padrón si el archivo no tiene RUC válidos', async () => {
    await expect(
      service.importFromZip(zipWithText('cabecera\nsolo texto inválido')),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockTx.padronSunatRuc.deleteMany).not.toHaveBeenCalled();
  });
});
