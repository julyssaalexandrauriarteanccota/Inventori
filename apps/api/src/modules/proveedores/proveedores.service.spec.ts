import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  proveedor: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  productoProveedor: {
    findMany: jest.fn(),
  },
};

describe('ProveedoresService', () => {
  let service: ProveedoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProveedoresService>(ProveedoresService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      razonSocial: 'Proveedor SAC',
      ruc: '20123456789',
    };

    it('should create a proveedor', async () => {
      mockPrismaService.proveedor.findFirst.mockResolvedValue(null);
      mockPrismaService.proveedor.create.mockResolvedValue({
        id: 'uuid-1',
        ...createDto,
        activo: true,
      });

      const result = await service.create(createDto);
      expect(result.id).toBe('uuid-1');
      expect(result.razonSocial).toBe('Proveedor SAC');
    });

    it('should throw ConflictException for duplicate RUC', async () => {
      mockPrismaService.proveedor.findFirst.mockResolvedValue({
        id: 'existing',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated proveedores', async () => {
      mockPrismaService.proveedor.findMany.mockResolvedValue([]);
      mockPrismaService.proveedor.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by search', async () => {
      mockPrismaService.proveedor.findMany.mockResolvedValue([]);
      mockPrismaService.proveedor.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'test' });

      const call = mockPrismaService.proveedor.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a proveedor', async () => {
      mockPrismaService.proveedor.findFirst.mockResolvedValue({
        id: 'uuid-1',
        razonSocial: 'Test',
      });

      const result = await service.findOne('uuid-1');
      expect(result.id).toBe('uuid-1');
    });

    it('should throw NotFoundException', async () => {
      mockPrismaService.proveedor.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a proveedor', async () => {
      mockPrismaService.proveedor.findFirst.mockResolvedValueOnce({
        id: 'uuid-1',
      }); // findOne
      mockPrismaService.proveedor.update.mockResolvedValue({
        id: 'uuid-1',
        razonSocial: 'Updated',
      });

      const result = await service.update('uuid-1', { razonSocial: 'Updated' });
      expect(result.razonSocial).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should soft delete a proveedor', async () => {
      mockPrismaService.proveedor.findFirst.mockResolvedValue({ id: 'uuid-1' });
      mockPrismaService.proveedor.update.mockResolvedValue({});

      await service.remove('uuid-1');

      expect(mockPrismaService.proveedor.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          activo: false,
        }),
      });
    });
  });
});
