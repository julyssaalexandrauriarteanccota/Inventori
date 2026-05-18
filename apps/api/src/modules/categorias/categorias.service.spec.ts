import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  categoria: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('CategoriasService', () => {
  let service: CategoriasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoriasService>(CategoriasService);
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('should create a categoria', async () => {
      mockPrismaService.categoria.findFirst.mockResolvedValue(null);
      mockPrismaService.categoria.create.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Impresoras',
      });

      const result = await service.create({ nombre: 'Impresoras' });
      expect(result.nombre).toBe('Impresoras');
    });

    it('should throw ConflictException for duplicate name', async () => {
      mockPrismaService.categoria.findFirst.mockResolvedValue({
        id: 'existing',
      });

      await expect(service.create({ nombre: 'Existing' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should restore a soft-deleted categoria with same name and type', async () => {
      mockPrismaService.categoria.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'deleted-1' });
      mockPrismaService.categoria.update.mockResolvedValue({
        id: 'deleted-1',
        nombre: 'Impresoras',
      });

      const result = await service.create({ nombre: 'Impresoras' });

      expect(result.nombre).toBe('Impresoras');
      expect(mockPrismaService.categoria.update).toHaveBeenCalledWith({
        where: { id: 'deleted-1' },
        data: expect.objectContaining({
          nombre: 'Impresoras',
          deletedAt: null,
        }),
      });
    });

    it('should throw NotFoundException for non-existent padre', async () => {
      mockPrismaService.categoria.findFirst
        .mockResolvedValueOnce(null) // nombre check
        .mockResolvedValueOnce(null); // padre check

      await expect(
        service.create({ nombre: 'Sub', padreId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return category tree', async () => {
      mockPrismaService.categoria.findMany.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Impresoras', hijos: [] },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should throw BadRequestException for self-referencing padre', async () => {
      mockPrismaService.categoria.findFirst.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Test',
        hijos: [],
        padre: null,
        productos: [],
      });

      await expect(
        service.update('uuid-1', { padreId: 'uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a category without children', async () => {
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Test',
        hijos: [],
        padre: null,
        productos: [],
      });
      mockPrismaService.categoria.update.mockResolvedValue({});

      await service.remove('uuid-1');
      expect(mockPrismaService.categoria.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw BadRequestException for category with children', async () => {
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Test',
        hijos: [{ id: 'child-1' }],
        padre: null,
        productos: [],
      });

      await expect(service.remove('uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
