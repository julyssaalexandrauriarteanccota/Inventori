import { Test, TestingModule } from '@nestjs/testing';
import { ComprasService } from './compras.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockTx = {
  recepcionCompra: { create: jest.fn(), findMany: jest.fn() },
  detalleOrdenCompra: { update: jest.fn(), findMany: jest.fn() },
  almacenStock: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  movimientoStock: { create: jest.fn(), findMany: jest.fn() },
  ordenCompra: { update: jest.fn() },
};

const mockPrisma = {
  proveedor: { findFirst: jest.fn() },
  producto: { findMany: jest.fn() },
  ordenCompra: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  detalleOrdenCompra: {
    update: jest.fn(),
    findMany: jest.fn(),
  },
  almacen: { findFirst: jest.fn() },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
    fn(mockTx),
  ),
};

describe('ComprasService', () => {
  let service: ComprasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComprasService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ComprasService>(ComprasService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );
  });

  // ═══════════════════════════════════════════
  //  CREATE OC
  // ═══════════════════════════════════════════

  describe('create', () => {
    const dto = {
      proveedorId: 'prov-1',
      detalles: [
        { productoId: 'prod-1', cantidad: 10, precioUnitario: 100 },
        { productoId: 'prod-2', cantidad: 5, precioUnitario: 200 },
      ],
    };

    it('should create an orden de compra with calculated totals', async () => {
      mockPrisma.proveedor.findFirst.mockResolvedValue({ id: 'prov-1' });
      mockPrisma.producto.findMany.mockResolvedValue([
        { id: 'prod-1' },
        { id: 'prod-2' },
      ]);
      mockPrisma.ordenCompra.findFirst.mockResolvedValue(null);
      mockPrisma.ordenCompra.create.mockResolvedValue({
        id: 'oc-1',
        numero: 'OC-0001',
        subtotal: 2000,
        igv: 360,
        total: 2360,
        estado: 'BORRADOR',
      });

      const result = await service.create(dto, 'user-1');
      expect(result.numero).toBe('OC-0001');
      expect(mockPrisma.ordenCompra.create).toHaveBeenCalled();
      const createCall = mockPrisma.ordenCompra.create.mock.calls[0][0];
      expect(createCall.data.detalles.create).toHaveLength(2);
    });

    it('should throw NotFoundException for missing proveedor', async () => {
      mockPrisma.proveedor.findFirst.mockResolvedValue(null);
      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for missing productos', async () => {
      mockPrisma.proveedor.findFirst.mockResolvedValue({ id: 'prov-1' });
      mockPrisma.producto.findMany.mockResolvedValue([{ id: 'prod-1' }]);
      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate incrementing OC numbers', async () => {
      mockPrisma.proveedor.findFirst.mockResolvedValue({ id: 'prov-1' });
      mockPrisma.producto.findMany.mockResolvedValue([
        { id: 'prod-1' },
        { id: 'prod-2' },
      ]);
      mockPrisma.ordenCompra.findFirst.mockResolvedValue({ numero: 'OC-0042' });
      mockPrisma.ordenCompra.create.mockImplementation((args: any) => {
        return Promise.resolve({ ...args.data, id: 'oc-new' });
      });

      await service.create(dto, 'user-1');
      const createCall = mockPrisma.ordenCompra.create.mock.calls[0][0];
      expect(createCall.data.numero).toBe('OC-0043');
    });

    it('should reject duplicated productos in detalles', async () => {
      mockPrisma.proveedor.findFirst.mockResolvedValue({ id: 'prov-1' });

      await expect(
        service.create(
          {
            proveedorId: 'prov-1',
            detalles: [
              { productoId: 'prod-1', cantidad: 1, precioUnitario: 100 },
              { productoId: 'prod-1', cantidad: 2, precioUnitario: 200 },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════
  //  FIND ALL
  // ═══════════════════════════════════════════

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockPrisma.ordenCompra.findMany.mockResolvedValue([{ id: 'oc-1' }]);
      mockPrisma.ordenCompra.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by estado', async () => {
      mockPrisma.ordenCompra.findMany.mockResolvedValue([]);
      mockPrisma.ordenCompra.count.mockResolvedValue(0);

      await service.findAll({ estado: 'APROBADA' as any });
      const call = mockPrisma.ordenCompra.findMany.mock.calls[0][0];
      expect(call.where.estado).toBe('APROBADA');
    });
  });

  // ═══════════════════════════════════════════
  //  FIND ONE
  // ═══════════════════════════════════════════

  describe('findOne', () => {
    it('should return OC with detalles and recepciones', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        id: 'oc-1',
        detalles: [],
        recepciones: [],
      });
      const result = await service.findOne('oc-1');
      expect(result.id).toBe('oc-1');
    });

    it('should throw NotFoundException for missing OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════

  describe('update', () => {
    it('should update OC in BORRADOR state', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        id: 'oc-1',
        estado: 'BORRADOR',
      });
      mockPrisma.ordenCompra.update.mockResolvedValue({
        id: 'oc-1',
        numero: 'OC-0001',
        notas: 'updated',
      });

      const result = await service.update('oc-1', { notas: 'updated' });
      expect(result.notas).toBe('updated');
    });

    it('should reject update for non-BORRADOR OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        id: 'oc-1',
        estado: 'APROBADA',
      });
      await expect(service.update('oc-1', { notas: 'x' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should replace detalles and recalculate totals when detalles are updated', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        id: 'oc-1',
        estado: 'BORRADOR',
      });
      mockPrisma.producto.findMany.mockResolvedValue([{ id: 'prod-1' }]);
      mockPrisma.ordenCompra.update.mockResolvedValue({
        id: 'oc-1',
        subtotal: 1000,
        igv: 180,
        total: 1180,
        detalles: [],
      });

      await service.update('oc-1', {
        detalles: [{ productoId: 'prod-1', cantidad: 10, precioUnitario: 100 }],
      });

      expect(mockPrisma.ordenCompra.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 1000,
            igv: 180,
            total: 1180,
            detalles: expect.objectContaining({
              deleteMany: {},
              create: [
                expect.objectContaining({
                  productoId: 'prod-1',
                  cantidad: 10,
                  precioUnitario: 100,
                  subtotal: 1000,
                }),
              ],
            }),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════
  //  APROBAR
  // ═══════════════════════════════════════════

  describe('aprobar', () => {
    it('should approve a BORRADOR OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        id: 'oc-1',
        estado: 'BORRADOR',
      });
      mockPrisma.ordenCompra.update.mockResolvedValue({
        id: 'oc-1',
        estado: 'APROBADA',
        numero: 'OC-0001',
      });

      const result = await service.aprobar('oc-1');
      expect(result.estado).toBe('APROBADA');
    });

    it('should reject approving non-BORRADOR OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        id: 'oc-1',
        estado: 'RECIBIDA_TOTAL',
      });
      await expect(service.aprobar('oc-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for missing OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue(null);
      await expect(service.aprobar('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════
  //  RECEPCIÓN
  // ═══════════════════════════════════════════

  describe('createRecepcion', () => {
    const recepcionDto = {
      almacenDestinoId: 'alm-1',
      detalles: [{ productoId: 'prod-1', cantidadRecibida: 5 }],
    };

    const mockOrden = {
      id: 'oc-1',
      numero: 'OC-0001',
      estado: 'APROBADA',
      detalles: [
        {
          id: 'det-1',
          productoId: 'prod-1',
          cantidad: 10,
          cantidadRecibida: 0,
        },
      ],
    };

    it('should create recepcion and update stock (partial)', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue(mockOrden);
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockTx.recepcionCompra.create.mockResolvedValue({
        id: 'rec-1',
        ordenCompraId: 'oc-1',
        detalles: [{ productoId: 'prod-1', cantidadRecibida: 5 }],
      });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 20 });
      mockTx.detalleOrdenCompra.findMany.mockResolvedValue([
        { productoId: 'prod-1', cantidad: 10, cantidadRecibida: 5 },
      ]);
      mockTx.ordenCompra.update.mockResolvedValue({
        estado: 'RECIBIDA_PARCIAL',
      });

      const result = await service.createRecepcion(
        'oc-1',
        recepcionDto,
        'user-1',
      );
      expect(result.nuevoEstadoOC).toBe('RECIBIDA_PARCIAL');
      expect(mockTx.movimientoStock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: 'COMPRA_RECIBIDA',
            cantidad: 5,
            cantidadAnterior: 20,
            cantidadPosterior: 25,
          }),
        }),
      );
    });

    it('should set RECIBIDA_TOTAL when all items fully received', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue(mockOrden);
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockTx.recepcionCompra.create.mockResolvedValue({
        id: 'rec-1',
        detalles: [{ productoId: 'prod-1', cantidadRecibida: 10 }],
      });
      mockTx.almacenStock.findUnique.mockResolvedValue(null);
      mockTx.detalleOrdenCompra.findMany.mockResolvedValue([
        { productoId: 'prod-1', cantidad: 10, cantidadRecibida: 10 },
      ]);
      mockTx.ordenCompra.update.mockResolvedValue({ estado: 'RECIBIDA_TOTAL' });

      const result = await service.createRecepcion(
        'oc-1',
        {
          ...recepcionDto,
          detalles: [{ productoId: 'prod-1', cantidadRecibida: 10 }],
        },
        'user-1',
      );
      expect(result.nuevoEstadoOC).toBe('RECIBIDA_TOTAL');
    });

    it('should reject if OC is in invalid state', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        ...mockOrden,
        estado: 'BORRADOR',
      });
      await expect(
        service.createRecepcion('oc-1', recepcionDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if product not in OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue(mockOrden);
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });

      await expect(
        service.createRecepcion(
          'oc-1',
          {
            almacenDestinoId: 'alm-1',
            detalles: [{ productoId: 'unknown', cantidadRecibida: 1 }],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if quantity exceeds pending', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        ...mockOrden,
        detalles: [
          {
            id: 'det-1',
            productoId: 'prod-1',
            cantidad: 10,
            cantidadRecibida: 8,
          },
        ],
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });

      await expect(
        service.createRecepcion(
          'oc-1',
          {
            almacenDestinoId: 'alm-1',
            detalles: [{ productoId: 'prod-1', cantidadRecibida: 5 }],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if almacen not found', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue(mockOrden);
      mockPrisma.almacen.findFirst.mockResolvedValue(null);

      await expect(
        service.createRecepcion('oc-1', recepcionDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for missing OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue(null);
      await expect(
        service.createRecepcion('bad', recepcionDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════
  //  CANCELAR
  // ═══════════════════════════════════════════

  describe('cancelar', () => {
    it('should cancel a BORRADOR OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        id: 'oc-1',
        estado: 'BORRADOR',
      });
      mockPrisma.ordenCompra.update.mockResolvedValue({
        id: 'oc-1',
        estado: 'CANCELADA',
        numero: 'OC-0001',
      });

      const result = await service.cancelar('oc-1', 'user-1');
      expect(result.estado).toBe('CANCELADA');
    });

    it('should reverse stock when cancelling RECIBIDA_PARCIAL OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        id: 'oc-1',
        estado: 'RECIBIDA_PARCIAL',
        numero: 'OC-0001',
        usuarioId: 'user-oc',
      });
      mockTx.recepcionCompra.findMany.mockResolvedValue([{ id: 'rec-1' }]);
      mockTx.movimientoStock.findMany.mockResolvedValue([
        {
          productoId: 'prod-1',
          almacenDestinoId: 'alm-1',
          cantidad: 3,
          costoUnitario: 25,
        },
      ]);
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 5 });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.ordenCompra.update.mockResolvedValue({
        id: 'oc-1',
        estado: 'CANCELADA',
        numero: 'OC-0001',
      });

      const result = await service.cancelar('oc-1', 'user-1');

      expect(result.estado).toBe('CANCELADA');
      expect(mockTx.almacenStock.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { cantidad: { decrement: 3 } },
        }),
      );
      expect(mockTx.movimientoStock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: 'DEVOLUCION_PROVEEDOR',
            productoId: 'prod-1',
            almacenOrigenId: 'alm-1',
            cantidad: 3,
            cantidadAnterior: 5,
            cantidadPosterior: 2,
            referenciaId: 'oc-1',
            referenciaTipo: 'ORDEN_COMPRA_CANCELADA',
            usuarioId: 'user-1',
          }),
        }),
      );
    });

    it('should reject cancelling RECIBIDA_TOTAL OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue({
        id: 'oc-1',
        estado: 'RECIBIDA_TOTAL',
      });
      await expect(service.cancelar('oc-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for missing OC', async () => {
      mockPrisma.ordenCompra.findUnique.mockResolvedValue(null);
      await expect(service.cancelar('bad', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
