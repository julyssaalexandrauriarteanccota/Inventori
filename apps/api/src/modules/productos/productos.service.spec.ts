import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RolUsuario, TipoProducto } from '@erp/shared';
import { ProductosService } from './productos.service';
import { PrismaService } from '../../database/prisma.service';
import { InventarioService } from '../inventario/inventario.service';

const mockPrismaService = {
  producto: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  categoria: {
    findUnique: jest.fn(),
  },
  marca: {
    findUnique: jest.fn(),
  },
  modeloCatalogo: {
    findFirst: jest.fn(),
  },
  unidadMedida: {
    findUnique: jest.fn(),
  },
  proveedor: {
    findFirst: jest.fn(),
  },
  productoProveedor: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  compatibilidad: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

const mockInventarioService = {
  createMovimiento: jest.fn(),
};

describe('ProductosService', () => {
  let service: ProductosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductosService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: InventarioService, useValue: mockInventarioService },
      ],
    }).compile();

    service = module.get<ProductosService>(ProductosService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      sku: 'KM-BZ-001',
      nombre: 'Bizhub C258',
      categoriaId: 'cat-1',
      unidadMedidaId: 'unidad-1',
      precioCompra: 5000,
      precioVenta: 8000,
      precioMinimo: 7000,
    };

    it('should create a product', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'cat-1',
        deletedAt: null,
        tipo: TipoProducto.REPUESTO,
      });
      mockPrismaService.unidadMedida.findUnique.mockResolvedValue({
        id: 'unidad-1',
        deletedAt: null,
        activo: true,
      });
      mockPrismaService.producto.create.mockResolvedValue({
        id: 'uuid-1',
        ...createDto,
      });

      const result = await service.create(createDto);
      expect(result.sku).toBe('KM-BZ-001');
    });

    it('should throw ConflictException for duplicate SKU', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'existing',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException for invalid category', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);
      mockPrismaService.categoria.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject serial products marked as consumible', async () => {
      await expect(
        service.create({
          ...createDto,
          tieneNumeroSerie: true,
          esConsumible: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject repuestos without inventory tracking', async () => {
      await expect(
        service.create({
          ...createDto,
          tipo: TipoProducto.REPUESTO,
          manejaInventario: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should normalize servicios as non-stock products', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'cat-servicio',
        deletedAt: null,
        tipo: TipoProducto.SERVICIO,
      });
      mockPrismaService.unidadMedida.findUnique.mockResolvedValue({
        id: 'unidad-servicio',
        deletedAt: null,
        activo: true,
      });
      mockPrismaService.producto.create.mockResolvedValue({
        id: 'serv-1',
        sku: 'SER-MAN-0001',
        nombre: 'Mantenimiento preventivo',
        tipo: TipoProducto.SERVICIO,
        stockMinimo: 0,
        manejaInventario: false,
        tieneNumeroSerie: false,
        esConsumible: false,
      });

      await service.create({
        tipo: TipoProducto.SERVICIO,
        nombre: 'Mantenimiento preventivo',
        categoriaId: 'cat-servicio',
        unidadMedidaId: 'unidad-servicio',
        precioCompra: 0,
        precioVenta: 150,
        precioMinimo: 150,
        stockMinimo: 7,
      });

      expect(mockPrismaService.producto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stockMinimo: 0,
            manejaInventario: false,
            tieneNumeroSerie: false,
            esConsumible: false,
          }),
        }),
      );
    });

    it('should reject soft-deleted category on create', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'cat-1',
        deletedAt: new Date(),
        tipo: TipoProducto.REPUESTO,
      });

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject soft-deleted marca on create', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'cat-1',
        deletedAt: null,
        tipo: TipoProducto.REPUESTO,
      });
      mockPrismaService.marca.findUnique.mockResolvedValue({
        id: 'marca-1',
        deletedAt: new Date(),
        tipos: [TipoProducto.REPUESTO],
      });

      await expect(
        service.create({ ...createDto, marcaId: 'marca-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject marca from another tipo on create', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'cat-1',
        deletedAt: null,
        tipo: TipoProducto.REPUESTO,
      });
      mockPrismaService.marca.findUnique.mockResolvedValue({
        id: 'marca-1',
        deletedAt: null,
        tipos: [TipoProducto.EQUIPO],
      });

      await expect(
        service.create({ ...createDto, marcaId: 'marca-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid unidad de medida on create', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'cat-1',
        deletedAt: null,
        tipo: TipoProducto.REPUESTO,
      });
      mockPrismaService.unidadMedida.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if precioMinimo > precioVenta', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'cat-1',
        deletedAt: null,
        tipo: TipoProducto.REPUESTO,
      });
      mockPrismaService.unidadMedida.findUnique.mockResolvedValue({
        id: 'unidad-1',
        deletedAt: null,
        activo: true,
      });

      const dto = { ...createDto, precioMinimo: 9000 };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated products with relations', async () => {
      mockPrismaService.producto.findMany.mockResolvedValue([]);
      mockPrismaService.producto.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by categoriaId', async () => {
      mockPrismaService.producto.findMany.mockResolvedValue([]);
      mockPrismaService.producto.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, categoriaId: 'cat-1' });

      const call = mockPrismaService.producto.findMany.mock.calls[0][0];
      expect(call.where.categoriaId).toBe('cat-1');
    });

    it('should hide service precioCompra for non-admin roles', async () => {
      mockPrismaService.producto.findMany.mockResolvedValue([
        {
          id: 'serv-1',
          tipo: TipoProducto.SERVICIO,
          precioCompra: 80,
          precioVenta: 150,
          modeloCatalogoId: null,
          almacenStocks: [],
        },
        {
          id: 'rep-1',
          tipo: TipoProducto.REPUESTO,
          precioCompra: 40,
          precioVenta: 70,
          modeloCatalogoId: null,
          almacenStocks: [],
        },
      ]);
      mockPrismaService.producto.count.mockResolvedValue(2);

      const result = await service.findAll(
        { page: 1, limit: 20 },
        RolUsuario.TECNICO,
      );

      expect(result.data[0]).not.toHaveProperty('precioCompra');
      expect(result.data[1]).toHaveProperty('precioCompra', 40);
    });
  });

  describe('findOne', () => {
    it('should return a product with relations', async () => {
      const producto = {
        id: 'uuid-1',
        sku: 'KM-001',
        nombre: 'Test',
        categoria: {},
        marca: {},
        productoProveedores: [],
        compatibilidadesComoRepuesto: [],
      };
      mockPrismaService.producto.findFirst.mockResolvedValue(producto);

      const result = await service.findOne('uuid-1');
      expect(result.sku).toBe('KM-001');
    });

    it('should hide service precioCompra in detail for non-admin roles', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'serv-1',
        tipo: TipoProducto.SERVICIO,
        precioCompra: 80,
        precioVenta: 150,
        modeloCatalogoId: null,
        almacenStocks: [],
      });

      const result = await service.findOne('serv-1', RolUsuario.ENCARGADO);

      expect(result).not.toHaveProperty('precioCompra');
    });

    it('should keep service precioCompra in detail for admin role', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'serv-1',
        tipo: TipoProducto.SERVICIO,
        precioCompra: 80,
        precioVenta: 150,
        modeloCatalogoId: null,
        almacenStocks: [],
      });

      const result = await service.findOne('serv-1', RolUsuario.ADMIN);

      expect(result).toHaveProperty('precioCompra', 80);
    });

    it('should throw NotFoundException', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const currentProduct = {
      id: 'uuid-1',
      sku: 'KM-001',
      nombre: 'Test',
      tipo: TipoProducto.REPUESTO,
      codigoQr: 'PRD:KM-001',
      modeloCatalogoId: null,
      tieneNumeroSerie: false,
      esConsumible: false,
      precioVenta: 8000,
      precioMinimo: 7000,
      categoria: {},
      marca: {},
      productoProveedores: [],
      compatibilidadesComoRepuesto: [],
    };

    it('should update a product with valid references', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(currentProduct);
      mockPrismaService.categoria.findUnique.mockResolvedValue({
        id: 'cat-2',
        deletedAt: null,
        tipo: TipoProducto.REPUESTO,
      });
      mockPrismaService.marca.findUnique.mockResolvedValue({
        id: 'marca-2',
        deletedAt: null,
        tipos: [TipoProducto.REPUESTO],
      });
      mockPrismaService.unidadMedida.findUnique.mockResolvedValue({
        id: 'unidad-2',
        deletedAt: null,
        activo: true,
      });
      mockPrismaService.producto.update.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Updated',
      });

      const result = await service.update('uuid-1', {
        nombre: 'Updated',
        categoriaId: 'cat-2',
        marcaId: 'marca-2',
        unidadMedidaId: 'unidad-2',
      });

      expect(result.nombre).toBe('Updated');
    });

    it('should throw BadRequestException when precioMinimo exceeds current precioVenta', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(currentProduct);

      await expect(
        service.update('uuid-1', { precioMinimo: 9000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when precioVenta drops below current precioMinimo', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(currentProduct);

      await expect(
        service.update('uuid-1', { precioVenta: 6000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for invalid categoria on update', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(currentProduct);
      mockPrismaService.categoria.findUnique.mockResolvedValue(null);

      await expect(
        service.update('uuid-1', { categoriaId: 'cat-missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for invalid marca on update', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(currentProduct);
      mockPrismaService.marca.findUnique.mockResolvedValue(null);

      await expect(
        service.update('uuid-1', { marcaId: 'marca-missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject marca from another tipo on update', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(currentProduct);
      mockPrismaService.marca.findUnique.mockResolvedValue({
        id: 'marca-2',
        deletedAt: null,
        tipos: [TipoProducto.EQUIPO],
      });

      await expect(
        service.update('uuid-1', { marcaId: 'marca-2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject serial product flagged as consumible on update', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(currentProduct);

      await expect(
        service.update('uuid-1', {
          tieneNumeroSerie: true,
          esConsumible: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for invalid unidad de medida on update', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(currentProduct);
      mockPrismaService.unidadMedida.findUnique.mockResolvedValue(null);

      await expect(
        service.update('uuid-1', { unidadMedidaId: 'unidad-missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addProveedor', () => {
    it('should associate a proveedor', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'prod-1',
        nombre: 'Test',
      });
      mockPrismaService.proveedor.findFirst.mockResolvedValue({ id: 'prov-1' });
      mockPrismaService.productoProveedor.findUnique.mockResolvedValue(null);
      mockPrismaService.productoProveedor.create.mockResolvedValue({
        id: 'pp-1',
        productoId: 'prod-1',
        proveedorId: 'prov-1',
      });

      const result = await service.addProveedor('prod-1', {
        proveedorId: 'prov-1',
      });
      expect(result.productoId).toBe('prod-1');
    });

    it('should throw ConflictException for existing relation', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'prod-1',
        nombre: 'Test',
      });
      mockPrismaService.proveedor.findFirst.mockResolvedValue({ id: 'prov-1' });
      mockPrismaService.productoProveedor.findUnique.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.addProveedor('prod-1', { proveedorId: 'prov-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('addCompatibilidad', () => {
    it('should add compatibility for a non-serial product', async () => {
      mockPrismaService.producto.findFirst
        .mockResolvedValueOnce({ id: 'rep-1', tieneNumeroSerie: false }) // repuesto
        .mockResolvedValueOnce({ id: 'mod-1' }); // modelo
      mockPrismaService.compatibilidad.findUnique.mockResolvedValue(null);
      mockPrismaService.compatibilidad.create.mockResolvedValue({
        id: 'comp-1',
        repuestoId: 'rep-1',
        modeloId: 'mod-1',
      });

      const result = await service.addCompatibilidad('rep-1', {
        modeloId: 'mod-1',
      });
      expect(result.repuestoId).toBe('rep-1');
    });

    it('should throw BadRequestException for serial product', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'eq-1',
        tieneNumeroSerie: true,
      });

      await expect(
        service.addCompatibilidad('eq-1', { modeloId: 'mod-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({ id: 'uuid-1' });
      mockPrismaService.producto.update.mockResolvedValue({});

      await service.remove('uuid-1');

      expect(mockPrismaService.producto.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          activo: false,
        }),
      });
    });
  });
});
