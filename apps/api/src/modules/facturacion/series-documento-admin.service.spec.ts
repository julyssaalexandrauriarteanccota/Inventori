import { BadRequestException, ConflictException } from '@nestjs/common';
import { TipoDocumento } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { SeriesDocumentoAdminService } from './series-documento-admin.service';

const mockPrisma = {
  serieDocumento: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  configEmpresa: {
    findFirst: jest.fn(),
  },
} as unknown as PrismaService;

describe('SeriesDocumentoAdminService', () => {
  let service: SeriesDocumentoAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SeriesDocumentoAdminService(mockPrisma);
  });

  it('lista series documentales paginadas', async () => {
    (mockPrisma.serieDocumento.findMany as jest.Mock).mockResolvedValue([
      { id: 'serie-1', serie: 'F001' },
    ]);
    (mockPrisma.serieDocumento.count as jest.Mock).mockResolvedValue(1);

    const result = await service.findAll({
      page: 1,
      limit: 20,
      tipo: TipoDocumento.FACTURA,
      activo: true,
    });

    expect(result.meta.total).toBe(1);
    expect(mockPrisma.serieDocumento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tipo: TipoDocumento.FACTURA,
          activo: true,
          deletedAt: null,
        }),
      }),
    );
  });

  it('crea una serie nueva normalizando valores', async () => {
    (mockPrisma.serieDocumento.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.serieDocumento.create as jest.Mock).mockResolvedValue({
      id: 'serie-1',
      serie: 'F001',
    });

    await service.create({
      tipo: TipoDocumento.FACTURA,
      serie: 'f001',
    });

    expect(mockPrisma.serieDocumento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: TipoDocumento.FACTURA,
        serie: 'F001',
        correlativoActual: 0,
        codigoEstablecimiento: '0000',
        activo: true,
      }),
    });
  });

  it('rechaza duplicado activo', async () => {
    (mockPrisma.serieDocumento.findFirst as jest.Mock).mockResolvedValue({
      id: 'serie-1',
      deletedAt: null,
    });

    await expect(
      service.create({ tipo: TipoDocumento.FACTURA, serie: 'F001' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rechaza prefijos incompatibles con el tipo documental', async () => {
    await expect(
      service.create({ tipo: TipoDocumento.FACTURA, serie: 'B001' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create({ tipo: TipoDocumento.NOTA_CREDITO, serie: 'FD01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sincroniza series heredadas desde ConfigEmpresa', async () => {
    (mockPrisma.configEmpresa.findFirst as jest.Mock).mockResolvedValue({
      serieFactura: 'F001',
      serieBoleta: 'B001',
      serieNotaCredito: 'FC01',
      serieNotaDebito: 'FD01',
      correlativoFactura: 1,
      correlativoBoleta: 2,
      correlativoNotaCredito: 3,
      correlativoNotaDebito: 4,
    });
    (mockPrisma.serieDocumento.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.serieDocumento.create as jest.Mock).mockResolvedValue({});

    const result = await service.syncFromLegacyConfig();

    expect(result.created).toBe(4);
    expect(mockPrisma.serieDocumento.create).toHaveBeenCalledTimes(4);
  });

  it('rechaza sync si no existe ConfigEmpresa', async () => {
    (mockPrisma.configEmpresa.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.syncFromLegacyConfig()).rejects.toThrow(
      BadRequestException,
    );
  });
});
