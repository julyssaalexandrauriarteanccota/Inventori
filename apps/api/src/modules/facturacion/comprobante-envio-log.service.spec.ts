import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ComprobanteEnvioLogService } from './comprobante-envio-log.service';

const mockPrisma = {
  comprobanteEnvioLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  comprobante: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaService;

describe('ComprobanteEnvioLogService', () => {
  let service: ComprobanteEnvioLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ComprobanteEnvioLogService(mockPrisma);
  });

  it('lista logs paginados con filtros', async () => {
    (mockPrisma.comprobanteEnvioLog.findMany as jest.Mock).mockResolvedValue([
      { id: 'log-1' },
    ]);
    (mockPrisma.comprobanteEnvioLog.count as jest.Mock).mockResolvedValue(1);

    const result = await service.findAll({
      comprobanteId: '11111111-1111-4111-8111-000000000001',
      estado: 'ACEPTADO',
      tipoEvento: 'RESPUESTA_PROVEEDOR',
    });

    expect(result.meta.total).toBe(1);
    expect(mockPrisma.comprobanteEnvioLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: 'ACEPTADO',
          tipoEvento: 'RESPUESTA_PROVEEDOR',
        }),
      }),
    );
  });

  it('lista logs por comprobante existente', async () => {
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue({
      id: 'comp-1',
    });
    (mockPrisma.comprobanteEnvioLog.findMany as jest.Mock).mockResolvedValue([
      { id: 'log-1' },
    ]);

    const result = await service.findByComprobante('comp-1');

    expect(result).toHaveLength(1);
  });

  it('rechaza comprobante inexistente', async () => {
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findByComprobante('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
