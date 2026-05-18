import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FeriadosNacionalesService } from './feriados-nacionales.service';

const mockPrisma = {
  feriadoNacional: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaService;

describe('FeriadosNacionalesService', () => {
  let service: FeriadosNacionalesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FeriadosNacionalesService(mockPrisma);
  });

  it('lista feriados por año ordenados por fecha', async () => {
    (mockPrisma.feriadoNacional.findMany as jest.Mock).mockResolvedValue([]);

    await service.findAll({ anio: 2026 });

    expect(mockPrisma.feriadoNacional.findMany).toHaveBeenCalledWith({
      where: { anio: 2026 },
      orderBy: { fecha: 'asc' },
    });
  });

  it('crea feriado calculando año desde la fecha', async () => {
    (mockPrisma.feriadoNacional.findUnique as jest.Mock).mockResolvedValue(
      null,
    );
    (mockPrisma.feriadoNacional.create as jest.Mock).mockResolvedValue({
      id: 'feriado-1',
    });

    await service.create({
      fecha: '2026-07-28',
      nombre: 'Fiestas Patrias',
    });

    expect(mockPrisma.feriadoNacional.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fecha: new Date('2026-07-28T00:00:00.000Z'),
        nombre: 'Fiestas Patrias',
        anio: 2026,
        esNoLaborable: false,
      }),
    });
  });

  it('rechaza fecha duplicada', async () => {
    (mockPrisma.feriadoNacional.findUnique as jest.Mock).mockResolvedValue({
      id: 'feriado-1',
    });

    await expect(
      service.create({ fecha: '2026-07-28', nombre: 'Fiestas Patrias' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rechaza actualizar feriado inexistente', async () => {
    (mockPrisma.feriadoNacional.findUnique as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      service.update('feriado-1', { nombre: 'Nuevo nombre' }),
    ).rejects.toThrow(NotFoundException);
  });
});
