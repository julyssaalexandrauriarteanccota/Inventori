import { BadRequestException } from '@nestjs/common';
import { ConfiguracionFiscalService } from './configuracion-fiscal.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = {
  $transaction: jest.fn((cb) => cb(mockPrisma)),
  configEmpresaFiscal: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  serieDocumento: {
    updateMany: jest.fn(),
  },
  configEmpresa: {
    findFirst: jest.fn(),
  },
} as unknown as PrismaService;

describe('ConfiguracionFiscalService', () => {
  let service: ConfiguracionFiscalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConfiguracionFiscalService(mockPrisma);
  });

  it('retorna la configuración fiscal existente', async () => {
    const config = { id: 'fiscal-1', ruc: '20123456789' };
    (mockPrisma.configEmpresaFiscal.findFirst as jest.Mock).mockResolvedValue(
      config,
    );

    await expect(service.getConfigFiscal()).resolves.toBe(config);
    expect(mockPrisma.configEmpresaFiscal.findFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: 'asc' },
    });
  });

  it('actualiza la configuración fiscal existente', async () => {
    (mockPrisma.configEmpresaFiscal.findFirst as jest.Mock).mockResolvedValue({
      id: 'fiscal-1',
      ruc: '20600055519',
    });
    (mockPrisma.configEmpresaFiscal.update as jest.Mock).mockResolvedValue({
      id: 'fiscal-1',
      razonSocial: 'Nueva Fiscal SAC',
    });

    const result = await service.upsertConfigFiscal({
      razonSocial: 'Nueva Fiscal SAC',
      correoSee: '',
    });

    expect(result.razonSocial).toBe('Nueva Fiscal SAC');
    expect(mockPrisma.configEmpresaFiscal.update).toHaveBeenCalledWith({
      where: { id: 'fiscal-1' },
      data: expect.objectContaining({
        razonSocial: 'Nueva Fiscal SAC',
        correoSee: undefined,
      }),
    });
  });

  it('invalida series existentes cuando cambia el RUC fiscal', async () => {
    (mockPrisma.configEmpresaFiscal.findFirst as jest.Mock).mockResolvedValue({
      id: 'fiscal-1',
      ruc: '20600055519',
    });
    (mockPrisma.configEmpresaFiscal.update as jest.Mock).mockResolvedValue({
      id: 'fiscal-1',
      ruc: '20552103816',
    });

    await service.upsertConfigFiscal({ ruc: '20552103816' });

    expect(mockPrisma.serieDocumento.updateMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      data: expect.objectContaining({
        activo: false,
        descripcion: 'Invalidada automáticamente por cambio de RUC fiscal',
      }),
    });
  });

  it('crea configuración fiscal usando fallback de ConfigEmpresa', async () => {
    (mockPrisma.configEmpresaFiscal.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
    (mockPrisma.configEmpresa.findFirst as jest.Mock).mockResolvedValue({
      ruc: '20123456789',
      razonSocial: 'Empresa Demo SAC',
      nombreComercial: 'Empresa Demo',
      direccion: 'Av. Demo 123',
    });
    (mockPrisma.configEmpresaFiscal.create as jest.Mock).mockResolvedValue({
      id: 'fiscal-1',
      ruc: '20123456789',
    });

    await service.upsertConfigFiscal({ codigoEstablecimiento: '0000' });

    expect(mockPrisma.configEmpresaFiscal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ruc: '20123456789',
        razonSocial: 'Empresa Demo SAC',
        nombreComercial: 'Empresa Demo',
        direccionFiscal: 'Av. Demo 123',
        codigoEstablecimiento: '0000',
      }),
    });
  });

  it('rechaza creación si faltan datos fiscales mínimos', async () => {
    (mockPrisma.configEmpresaFiscal.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
    (mockPrisma.configEmpresa.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.upsertConfigFiscal({})).rejects.toThrow(
      BadRequestException,
    );
  });
});
