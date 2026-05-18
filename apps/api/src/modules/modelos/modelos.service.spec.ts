import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TipoProducto } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { ModelosService } from './modelos.service';

const mockPrismaService = {
  modeloCatalogo: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  marca: {
    findFirst: jest.fn(),
  },
  producto: {
    count: jest.fn(),
  },
};

describe('ModelosService', () => {
  let service: ModelosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelosService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ModelosService>(ModelosService);
    jest.clearAllMocks();
  });

  it('crea un modelo nuevo', async () => {
    mockPrismaService.modeloCatalogo.findFirst.mockResolvedValueOnce(null);
    mockPrismaService.modeloCatalogo.create.mockResolvedValue({
      id: 'modelo-1',
      nombre: 'Bizhub 368',
      tipo: TipoProducto.EQUIPO,
      activo: true,
      marca: null,
    });

    const result = await service.create({
      nombre: 'Bizhub 368',
      tipo: TipoProducto.EQUIPO,
    });

    expect(result.nombre).toBe('Bizhub 368');
    expect(mockPrismaService.modeloCatalogo.create).toHaveBeenCalled();
  });

  it('rechaza duplicados por tipo y marca', async () => {
    mockPrismaService.modeloCatalogo.findFirst.mockResolvedValue({
      id: 'existing',
    });

    await expect(
      service.create({
        nombre: 'Bizhub 368',
        tipo: TipoProducto.EQUIPO,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('restaura un modelo eliminado si coincide nombre, tipo y marca', async () => {
    mockPrismaService.modeloCatalogo.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'deleted-1' });
    mockPrismaService.modeloCatalogo.update.mockResolvedValue({
      id: 'deleted-1',
      nombre: 'Bizhub 368',
      tipo: TipoProducto.EQUIPO,
      activo: true,
      marca: null,
    });

    const result = await service.create({
      nombre: 'Bizhub 368',
      tipo: TipoProducto.EQUIPO,
    });

    expect(result.id).toBe('deleted-1');
    expect(mockPrismaService.modeloCatalogo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'deleted-1' },
        data: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('valida que la marca pertenezca al tipo', async () => {
    mockPrismaService.marca.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        nombre: 'MP 301',
        tipo: TipoProducto.REPUESTO,
        marcaId: 'marca-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lista modelos filtrados', async () => {
    mockPrismaService.modeloCatalogo.findMany.mockResolvedValue([]);

    await service.findAll({ tipo: TipoProducto.EQUIPO, activo: true });

    expect(mockPrismaService.modeloCatalogo.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        tipo: TipoProducto.EQUIPO,
        activo: true,
      },
      include: {
        marca: { select: { id: true, nombre: true } },
      },
      orderBy: [{ nombre: 'asc' }],
    });
  });

  it('lanza error si no encuentra el modelo', async () => {
    mockPrismaService.modeloCatalogo.findFirst.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
