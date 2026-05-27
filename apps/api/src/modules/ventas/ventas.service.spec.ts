import { Test, TestingModule } from '@nestjs/testing';
import { VentasService } from './ventas.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CajaService } from '../caja/caja.service';
import {
  EstadoComercialEquipo,
  EstadoFacturacionVenta,
  EstadoGarantia,
  ModalidadEnvioBoletas,
  TipoDocumento,
} from '@erp/shared';
import { FacturacionService } from '../facturacion/facturacion.service';

const mockTx = {
  almacenStock: { findUnique: jest.fn(), updateMany: jest.fn() },
  movimientoStock: { create: jest.fn() },
  equipoCliente: { updateMany: jest.fn(), create: jest.fn() },
  equipo: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  garantia: { create: jest.fn() },
  cliente: { findUnique: jest.fn() },
  adjunto: { create: jest.fn() },
  venta: { create: jest.fn(), update: jest.fn() },
};

const mockCajaService = {
  getMiAperturaActiva: jest.fn().mockResolvedValue({ id: 'apertura-1' }),
  registrarIngresoVenta: jest.fn().mockResolvedValue({ id: 'mov-caja-1' }),
  registrarReversoVenta: jest.fn().mockResolvedValue({ id: 'mov-caja-2' }),
};

const mockFacturacionService = {
  crearComprobantePendienteEnTx: jest.fn(),
  encolarComprobanteSunat: jest.fn(),
};

const mockPrisma = {
  cliente: { findFirst: jest.fn(), findUnique: jest.fn() },
  producto: { findMany: jest.fn() },
  equipo: { findUnique: jest.fn() },
  metodoPago: { findUnique: jest.fn() },
  adjunto: { findMany: jest.fn() },
  almacen: { findFirst: jest.fn() },
  almacenStock: { findUnique: jest.fn() },
  detalleVenta: { findFirst: jest.fn() },
  configEmpresaFiscal: { findFirst: jest.fn() },
  certificadoDigital: { findFirst: jest.fn() },
  fiscalSecret: { findMany: jest.fn() },
  venta: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
    fn(mockTx),
  ),
};

describe('VentasService', () => {
  let service: VentasService;

  const mockProducto = {
    id: 'prod-1',
    sku: 'PROD-001',
    nombre: 'Toner',
    precioMinimo: 50,
    tieneNumeroSerie: false,
    manejaInventario: true,
  };

  const mockProductoSerie = {
    id: 'prod-2',
    sku: 'BIZ-001',
    nombre: 'Bizhub C250i',
    precioMinimo: 5000,
    tieneNumeroSerie: true,
    manejaInventario: true,
    mesesGarantia: 24,
    garantiaMaxCopias: 50000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CajaService, useValue: mockCajaService },
        { provide: FacturacionService, useValue: mockFacturacionService },
      ],
    }).compile();

    service = module.get<VentasService>(VentasService);
    jest.clearAllMocks();
    mockCajaService.getMiAperturaActiva.mockResolvedValue({ id: 'apertura-1' });
    mockCajaService.registrarIngresoVenta.mockResolvedValue({
      id: 'mov-caja-1',
    });
    mockCajaService.registrarReversoVenta.mockResolvedValue({
      id: 'mov-caja-2',
    });
    mockFacturacionService.crearComprobantePendienteEnTx.mockResolvedValue({
      id: 'cmp-1',
      numero: 'B001-00000001',
      tipo: TipoDocumento.BOLETA,
      fechaEmision: new Date('2026-05-06T10:00:00.000Z'),
      fechaVencimientoPlazo: new Date('2026-05-07T10:00:00.000Z'),
    });
    mockFacturacionService.encolarComprobanteSunat.mockResolvedValue(undefined);
    mockPrisma.adjunto.findMany.mockResolvedValue([]);
    mockPrisma.configEmpresaFiscal.findFirst.mockResolvedValue({
      modalidadEnvioBoletas: ModalidadEnvioBoletas.INDIVIDUAL,
    });
    mockPrisma.certificadoDigital.findFirst.mockResolvedValue({
      id: 'cert-1',
      validoHasta: new Date('2099-01-01T00:00:00.000Z'),
    });
    mockPrisma.fiscalSecret.findMany.mockResolvedValue([
      { name: 'sol-username' },
      { name: 'sol-password' },
    ]);
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );
    mockTx.venta.create.mockImplementation((args) =>
      mockPrisma.venta.create(args),
    );
    mockTx.venta.update.mockImplementation((args) =>
      mockPrisma.venta.update(args),
    );
    mockPrisma.detalleVenta.findFirst.mockResolvedValue(null);
  });

  // ═══════════════════════════════════════════
  //  CREAR COTIZACIÓN
  // ═══════════════════════════════════════════

  describe('create', () => {
    const dto = {
      clienteId: 'cli-1',
      detalles: [{ productoId: 'prod-1', cantidad: 2, precioUnitario: 100 }],
    };

    it('should create a cotización with calculated totals', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'cli-1' });
      mockPrisma.producto.findMany.mockResolvedValue([mockProducto]);
      mockPrisma.venta.findFirst.mockResolvedValue(null);
      mockPrisma.venta.create.mockResolvedValue({
        id: 'vta-1',
        numero: 'VTA-0001',
        estado: 'COTIZACION',
        subtotal: 169.49,
        igv: 30.51,
        total: 200,
      });

      const result = await service.create(dto, 'user-1');
      expect(result.numero).toBe('VTA-0001');
      expect(mockPrisma.venta.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing cliente', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue(null);
      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for missing producto', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'cli-1' });
      mockPrisma.producto.findMany.mockResolvedValue([]);
      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if precio < precioMinimo', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'cli-1' });
      mockPrisma.producto.findMany.mockResolvedValue([mockProducto]);

      await expect(
        service.create(
          {
            clienteId: 'cli-1',
            detalles: [
              { productoId: 'prod-1', cantidad: 1, precioUnitario: 10 },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow cotizar productos con serie sin seleccionar equipo físico', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'cli-1' });
      mockPrisma.producto.findMany.mockResolvedValue([mockProductoSerie]);
      mockPrisma.venta.findFirst.mockResolvedValue(null);
      mockPrisma.venta.create.mockResolvedValue({
        id: 'vta-1',
        numero: 'VTA-0001',
        estado: 'COTIZACION',
        subtotal: 5084.75,
        igv: 915.25,
        total: 6000,
      });

      const result = await service.create(
        {
          clienteId: 'cli-1',
          detalles: [
            { productoId: 'prod-2', cantidad: 1, precioUnitario: 6000 },
          ],
        },
        'user-1',
      );

      expect(result.numero).toBe('VTA-0001');
      expect(mockPrisma.equipo.findUnique).not.toHaveBeenCalled();
    });

    it('should reject quantity greater than 1 for serialized equipo lines', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'cli-1' });
      mockPrisma.producto.findMany.mockResolvedValue([mockProductoSerie]);

      await expect(
        service.create(
          {
            clienteId: 'cli-1',
            detalles: [
              {
                productoId: 'prod-2',
                cantidad: 2,
                precioUnitario: 6000,
                equipoSerie: 'SN-123',
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.equipo.findUnique).not.toHaveBeenCalled();
    });

    it('should validate equipo exists and matches producto', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'cli-1' });
      mockPrisma.producto.findMany.mockResolvedValue([mockProductoSerie]);
      mockPrisma.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        productoId: 'prod-999', // mismatch
      });

      await expect(
        service.create(
          {
            clienteId: 'cli-1',
            detalles: [
              {
                productoId: 'prod-2',
                cantidad: 1,
                precioUnitario: 6000,
                equipoSerie: 'SN-123',
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicated productos in detalles', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'cli-1' });

      await expect(
        service.create(
          {
            clienteId: 'cli-1',
            detalles: [
              { productoId: 'prod-1', cantidad: 1, precioUnitario: 100 },
              { productoId: 'prod-1', cantidad: 2, precioUnitario: 120 },
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
      mockPrisma.venta.findMany.mockResolvedValue([{ id: 'vta-1' }]);
      mockPrisma.venta.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  // ═══════════════════════════════════════════
  //  FIND ONE
  // ═══════════════════════════════════════════

  describe('findOne', () => {
    it('should return venta with details', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        detalles: [],
        garantias: [],
      });
      const result = await service.findOne('vta-1');
      expect(result.id).toBe('vta-1');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a cancelled venta', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        numero: 'VTA-0001',
        estado: 'CANCELADA',
      });
      mockPrisma.venta.update.mockResolvedValue({
        id: 'vta-1',
        deletedAt: new Date('2026-05-21T12:00:00.000Z'),
      });

      await service.remove('vta-1');

      expect(mockPrisma.venta.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vta-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should reject delete before cancelling', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        numero: 'VTA-0001',
        estado: 'ORDEN_CONFIRMADA',
      });

      await expect(service.remove('vta-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  UPDATE (solo COTIZACIÓN)
  // ═══════════════════════════════════════════

  describe('update', () => {
    it('should update a COTIZACION venta', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'COTIZACION',
        detalles: [],
      });
      mockPrisma.venta.update.mockResolvedValue({
        id: 'vta-1',
        notas: 'updated',
        numero: 'VTA-0001',
      });

      const result = await service.update('vta-1', { notas: 'updated' });
      expect(result.notas).toBe('updated');
    });

    it('should reject update for non-COTIZACION venta', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'ORDEN_CONFIRMADA',
      });
      await expect(service.update('vta-1', { notas: 'x' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should replace detalles and recalculate totals when detalles are updated', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'COTIZACION',
        detalles: [],
      });
      mockPrisma.producto.findMany.mockResolvedValue([mockProducto]);
      mockPrisma.venta.update.mockResolvedValue({
        id: 'vta-1',
        subtotal: 169.49,
        descuento: 0,
        igv: 30.51,
        total: 200,
      });

      await service.update('vta-1', {
        detalles: [{ productoId: 'prod-1', cantidad: 2, precioUnitario: 100 }],
      });

      expect(mockPrisma.venta.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 169.49,
            igv: 30.51,
            total: 200,
            detalles: expect.objectContaining({
              deleteMany: {},
              create: [
                expect.objectContaining({
                  productoId: 'prod-1',
                  cantidad: 2,
                  precioUnitario: 100,
                }),
              ],
            }),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════
  //  CONFIRMAR (la más compleja)
  // ═══════════════════════════════════════════

  describe('confirmar', () => {
    const confirmarDto = {
      metodoPagoId: 'mp-1',
      almacenId: 'alm-1',
    };

    const mockVenta = {
      id: 'vta-1',
      numero: 'VTA-0001',
      estado: 'COTIZACION',
      clienteId: 'cli-1',
      total: 200,
      cliente: { id: 'cli-1', esGenerico: false, dni: '12345678', ruc: null },
      detalles: [
        {
          id: 'det-1',
          productoId: 'prod-1',
          cantidad: 2,
          equipoSerie: null,
          producto: mockProducto,
        },
      ],
    };

    it('should confirm venta, deduct stock and create movimiento', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue(mockVenta);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 48 });
      mockTx.venta.update.mockResolvedValue({
        ...mockVenta,
        estado: 'ORDEN_CONFIRMADA',
        metodoPagoId: 'mp-1',
      });

      const result = await service.confirmar('vta-1', confirmarDto, 'user-1');
      expect(result.estado).toBe('ORDEN_CONFIRMADA');
      expect(mockTx.almacenStock.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { cantidad: { decrement: 2 } },
          where: expect.objectContaining({
            almacenId: 'alm-1',
            productoId: 'prod-1',
            cantidad: { gte: 2 },
          }),
        }),
      );
      expect(mockTx.movimientoStock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: 'VENTA',
            cantidad: 2,
            cantidadAnterior: 50,
            cantidadPosterior: 48,
          }),
        }),
      );
    });

    it('should require equipoSerie before confirming serialized product sales', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        ...mockVenta,
        detalles: [
          {
            id: 'det-2',
            productoId: 'prod-2',
            cantidad: 1,
            equipoSerie: null,
            producto: mockProductoSerie,
          },
        ],
      });
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });

      await expect(
        service.confirmar('vta-1', confirmarDto, 'user-1'),
      ).rejects.toThrow('seleccione una serie');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should assign equipo and create garantia for serialized products', async () => {
      const ventaConSerie = {
        ...mockVenta,
        estado: 'RESERVADA',
        detalles: [
          {
            id: 'det-2',
            productoId: 'prod-2',
            cantidad: 1,
            equipoSerie: 'SN-123',
            producto: mockProductoSerie,
          },
        ],
      };
      mockPrisma.venta.findFirst.mockResolvedValue(ventaConSerie);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 4 });
      mockTx.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-123',
        estadoComercial: EstadoComercialEquipo.RESERVADO,
        almacenId: 'alm-1',
        contadorActual: 1234,
      });
      mockPrisma.detalleVenta.findFirst.mockResolvedValue({
        ventaId: 'vta-1',
        venta: { numero: 'VTA-0001' },
      });
      mockTx.cliente.findUnique.mockResolvedValue({
        id: 'cli-1',
        nombre: 'Juan',
        apellido: 'Pérez',
        razonSocial: null,
        ruc: null,
        dni: '12345678',
      });
      mockTx.venta.update.mockResolvedValue({
        ...ventaConSerie,
        estado: 'ORDEN_CONFIRMADA',
      });

      const result = await service.confirmar('vta-1', confirmarDto, 'user-1');
      expect(result.estado).toBe('ORDEN_CONFIRMADA');
      expect(mockTx.equipoCliente.updateMany).toHaveBeenCalled(); // close prev
      expect(mockTx.equipoCliente.create).toHaveBeenCalled(); // new assignment
      expect(mockTx.equipo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eq-1' },
          data: expect.objectContaining({
            estadoComercial: 'VENDIDO',
            almacenId: null,
          }),
        }),
      );
      expect(mockTx.garantia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipoId: 'eq-1',
            ventaId: 'vta-1',
            clienteDocTipo: 'DNI',
            clienteDocNumero: '12345678',
            contadorInicio: 1234,
            contadorMaxCopias: 50000,
            estado: EstadoGarantia.PENDIENTE_COMPLETAR,
            cobertura: expect.stringContaining('24 meses'),
          }),
        }),
      );
    });

    it('should confirm a direct POS sale with an available serialized equipo without reservation', async () => {
      const ventaConSerie = {
        ...mockVenta,
        estado: 'COTIZACION',
        detalles: [
          {
            id: 'det-2',
            productoId: 'prod-2',
            cantidad: 1,
            equipoSerie: 'SN-123',
            producto: mockProductoSerie,
          },
        ],
      };
      mockPrisma.venta.findFirst.mockResolvedValue(ventaConSerie);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 4 });
      mockTx.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-123',
        estadoComercial: EstadoComercialEquipo.DISPONIBLE,
        almacenId: 'alm-1',
        contadorActual: 1234,
      });
      mockTx.cliente.findUnique.mockResolvedValue({
        id: 'cli-1',
        nombre: 'Juan',
        apellido: 'Pérez',
        razonSocial: null,
        ruc: null,
        dni: '12345678',
      });
      mockTx.venta.update.mockResolvedValue({
        ...ventaConSerie,
        estado: 'ORDEN_CONFIRMADA',
      });

      const result = await service.confirmar('vta-1', confirmarDto, 'user-1');

      expect(result.estado).toBe('ORDEN_CONFIRMADA');
      expect(mockPrisma.detalleVenta.findFirst).not.toHaveBeenCalled();
      expect(mockTx.equipo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eq-1' },
          data: expect.objectContaining({
            estadoComercial: 'VENDIDO',
            almacenId: null,
          }),
        }),
      );
      expect(mockTx.garantia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipoId: 'eq-1',
            ventaId: 'vta-1',
            estado: EstadoGarantia.PENDIENTE_COMPLETAR,
          }),
        }),
      );
    });

    it('should reject a direct POS sale when the serialized equipo is reserved by another quote', async () => {
      const ventaConSerie = {
        ...mockVenta,
        estado: 'COTIZACION',
        detalles: [
          {
            id: 'det-2',
            productoId: 'prod-2',
            cantidad: 1,
            equipoSerie: 'SN-123',
            producto: mockProductoSerie,
          },
        ],
      };
      mockPrisma.venta.findFirst.mockResolvedValue(ventaConSerie);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 4 });
      mockTx.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-123',
        estadoComercial: EstadoComercialEquipo.RESERVADO,
        almacenId: 'alm-1',
      });

      await expect(
        service.confirmar('vta-1', confirmarDto, 'user-1'),
      ).rejects.toThrow('no está disponible para confirmar venta');
    });

    it('should close generic sales up to S/ 5 as internal', async () => {
      const ventaInterna = {
        ...mockVenta,
        total: 5,
        cliente: { id: 'cli-1', esGenerico: true, dni: '00000000', ruc: null },
      };
      mockPrisma.venta.findFirst.mockResolvedValue(ventaInterna);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 48 });
      mockTx.venta.update.mockResolvedValue({
        ...ventaInterna,
        estado: 'ORDEN_CONFIRMADA',
        estadoFacturacion: EstadoFacturacionVenta.VENTA_INTERNA,
      });

      await service.confirmar(
        'vta-1',
        { ...confirmarDto, ventaInterna: true },
        'user-1',
      );

      expect(mockTx.venta.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estadoFacturacion: EstadoFacturacionVenta.VENTA_INTERNA,
          }),
        }),
      );
    });

    it('should reject internal sales over the legal limit', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        ...mockVenta,
        total: 5.01,
        cliente: { id: 'cli-1', esGenerico: true, dni: '00000000', ruc: null },
      });
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });

      await expect(
        service.confirmar(
          'vta-1',
          { ...confirmarDto, ventaInterna: true },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject internal sales for identified clients', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        ...mockVenta,
        total: 5,
        cliente: { id: 'cli-1', esGenerico: false, dni: '12345678', ruc: null },
      });
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });

      await expect(
        service.confirmar(
          'vta-1',
          { ...confirmarDto, ventaInterna: true },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if venta is not COTIZACION', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        ...mockVenta,
        estado: 'ENTREGADA',
      });
      await expect(
        service.confirmar('vta-1', confirmarDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if metodo de pago inactive', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue(mockVenta);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: false,
      });
      await expect(
        service.confirmar('vta-1', confirmarDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if stock insuficiente', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue(mockVenta);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 0 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 1 }); // only 1, need 2

      await expect(
        service.confirmar('vta-1', confirmarDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing venta', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue(null);
      await expect(
        service.confirmar('bad', confirmarDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cobrarEmitirPos', () => {
    const dto = {
      clienteId: 'cli-1',
      metodoPagoId: 'mp-1',
      almacenId: 'alm-1',
      detalles: [{ productoId: 'prod-1', cantidad: 1, precioUnitario: 100 }],
    };

    const ventaCreada = {
      id: 'vta-pos-1',
      numero: 'VTA-0001',
      estado: 'COTIZACION',
      clienteId: 'cli-1',
      subtotal: 84.75,
      descuento: 0,
      igv: 15.25,
      total: 100,
      cliente: { id: 'cli-1', nombre: 'Cliente', dni: '12345678' },
      detalles: [
        {
          productoId: 'prod-1',
          cantidad: 1,
          precioUnitario: 100,
          descuento: 0,
          subtotal: 84.75,
          equipoSerie: null,
          producto: {
            ...mockProducto,
            descripcion: null,
            tipo: 'REPUESTO',
            unidadMedida: { codigo: 'NIU' },
          },
        },
      ],
    };

    it('should create, charge and create pending boleta in one transaction', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({
        id: 'cli-1',
        dni: '12345678',
      });
      mockPrisma.producto.findMany.mockResolvedValue([mockProducto]);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockPrisma.venta.findFirst.mockResolvedValue(null);
      mockTx.venta.create.mockResolvedValue(ventaCreada);
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 9 });
      mockTx.venta.update.mockResolvedValue({
        ...ventaCreada,
        estado: 'ENTREGADA',
        metodoPagoId: 'mp-1',
      });

      const result = await service.cobrarEmitirPos(dto, 'user-1');

      expect(result.venta.estado).toBe('ENTREGADA');
      expect(result.comprobante.numero).toBe('B001-00000001');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.venta.create).toHaveBeenCalled();
      expect(mockTx.almacenStock.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            almacenId: 'alm-1',
            productoId: 'prod-1',
            cantidad: { gte: 1 },
          }),
        }),
      );
      expect(mockCajaService.registrarIngresoVenta).toHaveBeenCalledWith(
        expect.objectContaining({
          ventaId: 'vta-pos-1',
          monto: 100,
        }),
        mockTx,
      );
      expect(
        mockFacturacionService.crearComprobantePendienteEnTx,
      ).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ id: 'vta-pos-1', estado: 'ENTREGADA' }),
        { ventaId: 'vta-pos-1', tipo: TipoDocumento.BOLETA },
        'user-1',
      );
      expect(mockFacturacionService.encolarComprobanteSunat).toHaveBeenCalled();
    });

    it('should reject generic public client for boleta totals from S/ 700', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({
        id: 'cli-publico',
        dni: '00000000',
        esGenerico: true,
      });
      mockPrisma.producto.findMany.mockResolvedValue([mockProducto]);

      await expect(
        service.cobrarEmitirPos(
          {
            ...dto,
            clienteId: 'cli-publico',
            detalles: [
              { productoId: 'prod-1', cantidad: 1, precioUnitario: 700 },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(
        mockFacturacionService.crearComprobantePendienteEnTx,
      ).not.toHaveBeenCalled();
    });

    it('should reject POS boleta when there is no active digital certificate', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({
        id: 'cli-1',
        dni: '12345678',
      });
      mockPrisma.producto.findMany.mockResolvedValue([mockProducto]);
      mockPrisma.certificadoDigital.findFirst.mockResolvedValue(null);

      await expect(service.cobrarEmitirPos(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject and skip enqueue when comprobante creation fails', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({
        id: 'cli-1',
        dni: '12345678',
      });
      mockPrisma.producto.findMany.mockResolvedValue([mockProducto]);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockPrisma.venta.findFirst.mockResolvedValue(null);
      mockTx.venta.create.mockResolvedValue(ventaCreada);
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 9 });
      mockTx.venta.update.mockResolvedValue({
        ...ventaCreada,
        estado: 'ENTREGADA',
        metodoPagoId: 'mp-1',
      });
      mockFacturacionService.crearComprobantePendienteEnTx.mockRejectedValue(
        new BadRequestException('serie no configurada'),
      );

      await expect(service.cobrarEmitirPos(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(
        mockFacturacionService.encolarComprobanteSunat,
      ).not.toHaveBeenCalled();
    });

    it('should keep sale committed when enqueue fails after transaction', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({
        id: 'cli-1',
        dni: '12345678',
      });
      mockPrisma.producto.findMany.mockResolvedValue([mockProducto]);
      mockPrisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        activo: true,
      });
      mockPrisma.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockPrisma.venta.findFirst.mockResolvedValue(null);
      mockTx.venta.create.mockResolvedValue(ventaCreada);
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 9 });
      mockTx.venta.update.mockResolvedValue({
        ...ventaCreada,
        estado: 'ENTREGADA',
        metodoPagoId: 'mp-1',
      });
      mockFacturacionService.encolarComprobanteSunat.mockRejectedValue(
        new Error('redis down'),
      );

      const result = await service.cobrarEmitirPos(dto, 'user-1');

      expect(result.comprobante.numero).toBe('B001-00000001');
      expect(mockFacturacionService.encolarComprobanteSunat).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════
  //  ENTREGAR
  // ═══════════════════════════════════════════

  describe('entregar', () => {
    it('should mark ORDEN_CONFIRMADA as ENTREGADA', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'ORDEN_CONFIRMADA',
      });
      mockPrisma.venta.update.mockResolvedValue({
        id: 'vta-1',
        estado: 'ENTREGADA',
        numero: 'VTA-0001',
      });

      const result = await service.entregar('vta-1');
      expect(result.estado).toBe('ENTREGADA');
    });

    it('should reject entrega for COTIZACION', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'COTIZACION',
      });
      await expect(service.entregar('vta-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  CANCELAR
  // ═══════════════════════════════════════════

  describe('cancelar', () => {
    it('should cancel a COTIZACION venta', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'COTIZACION',
      });
      mockPrisma.venta.update.mockResolvedValue({
        id: 'vta-1',
        estado: 'CANCELADA',
        numero: 'VTA-0001',
      });

      const result = await service.cancelar('vta-1', 'user-1');
      expect(result.estado).toBe('CANCELADA');
    });

    it('should reject cancelling already CANCELADA', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'CANCELADA',
      });
      await expect(service.cancelar('vta-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject cancelling when comprobante esta EN_EMISION', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'ORDEN_CONFIRMADA',
        estadoFacturacion: 'EN_EMISION',
      });
      await expect(service.cancelar('vta-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject cancelling when comprobante esta EMITIDA', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'ENTREGADA',
        estadoFacturacion: 'EMITIDA',
      });
      await expect(service.cancelar('vta-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  ENVIAR COTIZACIÓN
  // ═══════════════════════════════════════════

  describe('prepararEnvioCotizacion', () => {
    it('should return payload for PDF generation', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        numero: 'VTA-0001',
        estado: 'COTIZACION',
        subtotal: 200,
        igv: 36,
        total: 236,
        validoHasta: null,
        notas: null,
        cliente: { id: 'cli-1', nombre: 'Juan' },
        usuario: { id: 'user-1', nombre: 'Admin' },
        detalles: [],
      });

      const result = await service.prepararEnvioCotizacion('vta-1');
      expect(result.estado).toBe('ENVIO_PREPARADO');
      expect(result.ventaId).toBe('vta-1');
    });

    it('should reject if not COTIZACION', async () => {
      mockPrisma.venta.findFirst.mockResolvedValue({
        id: 'vta-1',
        estado: 'ORDEN_CONFIRMADA',
      });
      await expect(service.prepararEnvioCotizacion('vta-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
