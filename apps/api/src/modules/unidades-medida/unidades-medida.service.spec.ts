import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnidadesMedidaService } from './unidades-medida.service';

const mockPrismaService = {
  unidadMedida: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  producto: {
    count: jest.fn(),
  },
};

describe('UnidadesMedidaService', () => {
  let service: UnidadesMedidaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnidadesMedidaService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UnidadesMedidaService>(UnidadesMedidaService);
    jest.clearAllMocks();
  });

  it('crea una unidad de medida válida', async () => {
    mockPrismaService.unidadMedida.findFirst.mockResolvedValue(null);
    mockPrismaService.unidadMedida.create.mockResolvedValue({
      id: 'unidad-1',
      codigo: 'NIU',
      nombre: 'Unidad',
    });

    const result = await service.create({ codigo: 'NIU', nombre: 'Unidad' });

    expect(result.codigo).toBe('NIU');
  });

  it('rechaza códigos duplicados', async () => {
    mockPrismaService.unidadMedida.findFirst.mockResolvedValue({
      id: 'unidad-1',
      codigo: 'NIU',
      nombre: 'Unidad',
    });

    await expect(
      service.create({ codigo: 'NIU', nombre: 'Unidad nueva' }),
    ).rejects.toThrow(ConflictException);
  });

  it('lista unidades activas', async () => {
    mockPrismaService.unidadMedida.findMany.mockResolvedValue([
      { id: 'unidad-1', codigo: 'NIU', nombre: 'Unidad' },
    ]);

    const result = await service.findAll();

    expect(result).toHaveLength(1);
  });

  it('lanza not found al buscar una unidad inexistente', async () => {
    mockPrismaService.unidadMedida.findFirst.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('elimina por soft delete cuando no tiene productos asociados', async () => {
    mockPrismaService.unidadMedida.findFirst.mockResolvedValue({
      id: 'unidad-1',
      codigo: 'NIU',
      nombre: 'Unidad',
      productos: [],
    });
    mockPrismaService.producto.count.mockResolvedValue(0);
    mockPrismaService.unidadMedida.update.mockResolvedValue({});

    await service.remove('unidad-1');

    expect(mockPrismaService.unidadMedida.update).toHaveBeenCalledWith({
      where: { id: 'unidad-1' },
      data: { deletedAt: expect.any(Date), activo: false },
    });
  });
});
