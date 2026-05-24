import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ClienteValidacionSunatService } from './cliente-validacion-sunat.service';

const mockPrisma = {
  clienteValidacionSunat: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  cliente: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaService;

describe('ClienteValidacionSunatService', () => {
  let service: ClienteValidacionSunatService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClienteValidacionSunatService(mockPrisma);
  });

  it('lista validaciones paginadas', async () => {
    (mockPrisma.clienteValidacionSunat.findMany as jest.Mock).mockResolvedValue(
      [{ id: 'val-1' }],
    );
    (mockPrisma.clienteValidacionSunat.count as jest.Mock).mockResolvedValue(1);

    const result = await service.findAll({ estado: 'VALIDO', search: '201' });

    expect(result.meta.total).toBe(1);
    expect(mockPrisma.clienteValidacionSunat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: 'VALIDO' }),
      }),
    );
  });

  it('crea validación si no existe', async () => {
    (
      mockPrisma.clienteValidacionSunat.findFirst as jest.Mock
    ).mockResolvedValue(null);
    (mockPrisma.clienteValidacionSunat.create as jest.Mock).mockResolvedValue({
      id: 'val-1',
      estado: 'VALIDO',
    });

    const result = await service.upsert({
      tipoDocumentoSunat: '6',
      numeroDocumento: '20123456789',
      estado: 'VALIDO',
    });

    expect(result.estado).toBe('VALIDO');
    expect(mockPrisma.clienteValidacionSunat.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipoDocumentoSunat: '6',
        numeroDocumento: '20123456789',
        estado: 'VALIDO',
        ultimaValidacionAt: expect.any(Date),
      }),
    });
  });

  it('crea validación sin documento para público general', async () => {
    (
      mockPrisma.clienteValidacionSunat.findFirst as jest.Mock
    ).mockResolvedValue(null);
    (mockPrisma.clienteValidacionSunat.create as jest.Mock).mockResolvedValue({
      id: 'val-publico',
      estado: 'PENDIENTE',
    });

    await service.upsert({
      tipoDocumentoSunat: '0',
      numeroDocumento: '00000000',
      estado: 'PENDIENTE',
      condicionDomicilio: 'HABIDO',
    });

    expect(mockPrisma.clienteValidacionSunat.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipoDocumentoSunat: '0',
        numeroDocumento: '00000000',
        condicionDomicilio: null,
      }),
    });
  });

  it('crea validación DNI sin condición de domicilio', async () => {
    (
      mockPrisma.clienteValidacionSunat.findFirst as jest.Mock
    ).mockResolvedValue(null);
    (mockPrisma.clienteValidacionSunat.create as jest.Mock).mockResolvedValue({
      id: 'val-dni',
      estado: 'VALIDO',
    });

    await service.upsert({
      tipoDocumentoSunat: '1',
      numeroDocumento: '12345678',
      estado: 'VALIDO',
      condicionDomicilio: 'HABIDO',
    });

    expect(mockPrisma.clienteValidacionSunat.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipoDocumentoSunat: '1',
        numeroDocumento: '12345678',
        condicionDomicilio: null,
      }),
    });
  });

  it('rechaza documentos SUNAT no soportados para clientes', async () => {
    await expect(
      service.upsert({
        tipoDocumentoSunat: '4' as never,
        numeroDocumento: 'ABC123',
        estado: 'VALIDO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza número incompatible con el tipo de documento', async () => {
    await expect(
      service.upsert({
        tipoDocumentoSunat: '1',
        numeroDocumento: '1234',
        estado: 'VALIDO',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.upsert({
        tipoDocumentoSunat: '6',
        numeroDocumento: '30123456789',
        estado: 'VALIDO',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.upsert({
        tipoDocumentoSunat: '0',
        numeroDocumento: '12345678',
        estado: 'VALIDO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('actualiza validación existente en upsert', async () => {
    (
      mockPrisma.clienteValidacionSunat.findFirst as jest.Mock
    ).mockResolvedValue({
      id: 'val-1',
    });
    (mockPrisma.clienteValidacionSunat.update as jest.Mock).mockResolvedValue({
      id: 'val-1',
      estado: 'INVALIDO',
    });

    await service.upsert({
      tipoDocumentoSunat: '6',
      numeroDocumento: '20123456789',
      estado: 'INVALIDO',
    });

    expect(mockPrisma.clienteValidacionSunat.update).toHaveBeenCalledWith({
      where: { id: 'val-1' },
      data: expect.objectContaining({ estado: 'INVALIDO' }),
    });
  });

  it('rechaza cliente inexistente', async () => {
    (mockPrisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.upsert({
        clienteId: 'cliente-1',
        tipoDocumentoSunat: '6',
        numeroDocumento: '20123456789',
        estado: 'VALIDO',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza vincular un cliente RUC con validación DNI', async () => {
    (mockPrisma.cliente.findUnique as jest.Mock).mockResolvedValue({
      id: 'cliente-1',
      tipo: 'EMPRESA',
      dni: null,
      ruc: '20123456789',
      esGenerico: false,
    });

    await expect(
      service.upsert({
        clienteId: 'cliente-1',
        tipoDocumentoSunat: '1',
        numeroDocumento: '12345678',
        estado: 'VALIDO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza update duplicado', async () => {
    (
      mockPrisma.clienteValidacionSunat.findUnique as jest.Mock
    ).mockResolvedValue({
      id: 'val-1',
      clienteId: null,
      tipoDocumentoSunat: '6',
      numeroDocumento: '20123456789',
      nombreNormalizado: null,
      direccionFiscal: null,
      estado: 'VALIDO',
      condicionDomicilio: null,
    });
    (
      mockPrisma.clienteValidacionSunat.findFirst as jest.Mock
    ).mockResolvedValue({
      id: 'val-2',
    });

    await expect(
      service.update('val-1', { numeroDocumento: '20999999999' }),
    ).rejects.toThrow(BadRequestException);
  });
});
