import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TipoProducto } from '@erp/shared';
import { MarcasService } from './marcas.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  marca: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  producto: {
    count: jest.fn(),
  },
};

describe('MarcasService', () => {
  let service: MarcasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarcasService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MarcasService>(MarcasService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a marca', async () => {
      mockPrismaService.marca.findFirst.mockResolvedValue(null);
      mockPrismaService.marca.create.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Konica Minolta',
        tipos: [TipoProducto.EQUIPO],
      });

      const result = await service.create({ nombre: 'Konica Minolta' });
      expect(result.nombre).toBe('Konica Minolta');
      expect(mockPrismaService.marca.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Konica Minolta',
          tipos: [TipoProducto.EQUIPO],
        },
      });
    });

    it('should throw ConflictException for duplicate name', async () => {
      mockPrismaService.marca.findFirst.mockResolvedValue({
        id: 'existing',
        tipos: [TipoProducto.EQUIPO],
      });

      await expect(
        service.create({ nombre: 'Existing', tipos: [TipoProducto.EQUIPO] }),
      ).rejects.toThrow(ConflictException);
    });

    it('should attach a new tipo to an existing active marca', async () => {
      mockPrismaService.marca.findFirst.mockResolvedValue({
        id: 'existing',
        nombre: 'Canon',
        tipos: [TipoProducto.EQUIPO],
      });
      mockPrismaService.marca.update.mockResolvedValue({
        id: 'existing',
        nombre: 'Canon',
        tipos: [TipoProducto.EQUIPO, TipoProducto.REPUESTO],
      });

      const result = await service.create({
        nombre: 'Canon',
        tipos: [TipoProducto.REPUESTO],
      });

      expect(result.tipos).toContain(TipoProducto.REPUESTO);
      expect(mockPrismaService.marca.update).toHaveBeenCalledWith({
        where: { id: 'existing' },
        data: { tipos: [TipoProducto.EQUIPO, TipoProducto.REPUESTO] },
      });
    });

    it('should restore a soft-deleted marca with same name', async () => {
      mockPrismaService.marca.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'deleted-1' });
      mockPrismaService.marca.update.mockResolvedValue({
        id: 'deleted-1',
        nombre: 'Canon',
        tipos: [TipoProducto.EQUIPO],
      });

      const result = await service.create({ nombre: 'Canon' });

      expect(result.nombre).toBe('Canon');
      expect(mockPrismaService.marca.update).toHaveBeenCalledWith({
        where: { id: 'deleted-1' },
        data: expect.objectContaining({ deletedAt: null }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all marcas sorted by name', async () => {
      mockPrismaService.marca.findMany.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Canon', tipos: [TipoProducto.EQUIPO] },
        {
          id: 'uuid-2',
          nombre: 'Konica Minolta',
          tipos: [TipoProducto.REPUESTO],
        },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });

    it('should filter marcas by tipo', async () => {
      mockPrismaService.marca.findMany.mockResolvedValue([]);

      await service.findAll(TipoProducto.INSUMO);

      expect(mockPrismaService.marca.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          tipos: { has: TipoProducto.INSUMO },
        },
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a marca with productos', async () => {
      mockPrismaService.marca.findFirst.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Canon',
        tipos: [TipoProducto.EQUIPO],
        productos: [],
      });

      const result = await service.findOne('uuid-1');
      expect(result.nombre).toBe('Canon');
    });

    it('should throw NotFoundException', async () => {
      mockPrismaService.marca.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete marca without products', async () => {
      mockPrismaService.marca.findFirst.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Test',
        productos: [],
      });
      mockPrismaService.producto.count.mockResolvedValue(0);
      mockPrismaService.marca.update.mockResolvedValue({});

      await service.remove('uuid-1');
      expect(mockPrismaService.marca.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw ConflictException for marca with products', async () => {
      mockPrismaService.marca.findFirst.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Test',
        productos: [],
      });
      mockPrismaService.producto.count.mockResolvedValue(3);

      await expect(service.remove('uuid-1')).rejects.toThrow(ConflictException);
    });
  });
});
