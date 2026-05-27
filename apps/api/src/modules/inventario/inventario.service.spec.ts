import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  BASE_TIPOS_MOVIMIENTO_BY_CODE,
  TipoMovimiento,
  TipoProducto,
  RolUsuario,
} from '@erp/shared';
import { InventarioService } from './inventario.service';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from '../../websockets/events.service';
import { UploadsService } from '../uploads/uploads.service';

const mockTx = {
  almacenStock: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  movimientoStock: {
    create: jest.fn(),
  },
  alertaStock: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  adjunto: {
    create: jest.fn(),
  },
};

const mockPrismaService = {
  almacen: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  almacenStock: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  movimientoStock: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  alertaStock: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  producto: {
    findFirst: jest.fn(),
  },
  tipoMovimientoConfig: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
    fn(mockTx),
  ),
};

const mockUploadsService = {
  getFilePath: jest.fn(),
};

function productoInventariable(stockMinimo = 5) {
  return {
    id: 'prod-1',
    stockMinimo,
    tipo: TipoProducto.REPUESTO,
    manejaInventario: true,
    tieneNumeroSerie: false,
  };
}

describe('InventarioService', () => {
  let service: InventarioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UploadsService, useValue: mockUploadsService },
        {
          provide: EventsService,
          useValue: {
            emitToUser: jest.fn(),
            emitToRole: jest.fn(),
            emitToRoles: jest.fn(),
            emitToAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventarioService>(InventarioService);
    jest.resetAllMocks();
    // Re-setup $transaction after reset
    mockPrismaService.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );
    mockPrismaService.almacen.count.mockResolvedValue(2);
    mockPrismaService.tipoMovimientoConfig.findFirst.mockImplementation(
      ({ where }: { where: { codigo: string; activo: boolean } }) => {
        const base =
          BASE_TIPOS_MOVIMIENTO_BY_CODE[
            where.codigo as keyof typeof BASE_TIPOS_MOVIMIENTO_BY_CODE
          ];
        if (!base) {
          return Promise.resolve(null);
        }

        return Promise.resolve({
          id: `cfg-${where.codigo}`,
          codigo: where.codigo,
          nombre: base.nombre,
          activo: true,
          orden: 1,
          comportamiento: base.comportamiento,
          requiereJustificacion: base.requiereJustificacion,
          requiereEvidencia: base.requiereEvidencia,
          disponibleTecnico: base.disponibleTecnico,
        });
      },
    );
    mockUploadsService.getFilePath.mockReturnValue(
      'C:/Inventori/uploads/test.jpg',
    );
  });

  // ═══════════════════════════════════════════
  //  ALMACENES
  // ═══════════════════════════════════════════

  describe('createAlmacen', () => {
    it('should create an almacen', async () => {
      mockPrismaService.almacen.findFirst.mockResolvedValue(null);
      mockPrismaService.almacen.create.mockResolvedValue({
        id: 'alm-1',
        nombre: 'Principal',
        esPrincipal: true,
      });

      const result = await service.createAlmacen({
        nombre: 'Principal',
        esPrincipal: true,
      });

      expect(result.id).toBe('alm-1');
    });

    it('should mark the first almacen as principal automatically', async () => {
      mockPrismaService.almacen.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.almacen.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.almacen.create.mockResolvedValue({
        id: 'alm-1',
        nombre: 'Almacén Inicial',
        esPrincipal: true,
        activo: true,
      });

      await service.createAlmacen({ nombre: 'Almacén Inicial' });

      expect(mockPrismaService.almacen.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          esPrincipal: true,
          activo: true,
        }),
      });
    });

    it('should throw ConflictException for duplicate name', async () => {
      mockPrismaService.almacen.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createAlmacen({ nombre: 'Duplicado' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should unmark previous principal when creating new principal', async () => {
      mockPrismaService.almacen.findFirst.mockResolvedValue(null);
      mockPrismaService.almacen.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.almacen.create.mockResolvedValue({
        id: 'alm-2',
        nombre: 'Nuevo Principal',
        esPrincipal: true,
      });

      await service.createAlmacen({
        nombre: 'Nuevo Principal',
        esPrincipal: true,
      });

      expect(mockPrismaService.almacen.updateMany).toHaveBeenCalledWith({
        where: { esPrincipal: true, deletedAt: null },
        data: { esPrincipal: false },
      });
    });
  });

  describe('ensurePrincipalAlmacen', () => {
    it('should return the active principal when it exists', async () => {
      mockPrismaService.almacen.findFirst.mockResolvedValueOnce({
        id: 'alm-principal',
        nombre: 'Principal',
        esPrincipal: true,
        activo: true,
        deletedAt: null,
      });

      const result = await service.ensurePrincipalAlmacen();

      expect(result.id).toBe('alm-principal');
      expect(mockPrismaService.almacen.update).not.toHaveBeenCalled();
      expect(mockPrismaService.almacen.create).not.toHaveBeenCalled();
    });

    it('should promote the first active almacen when no principal exists', async () => {
      mockPrismaService.almacen.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'alm-1',
          nombre: 'Almacén existente',
          esPrincipal: false,
          activo: true,
          deletedAt: null,
        });
      mockPrismaService.almacen.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.almacen.update.mockResolvedValue({
        id: 'alm-1',
        nombre: 'Almacén existente',
        esPrincipal: true,
        activo: true,
        deletedAt: null,
      });

      const result = await service.ensurePrincipalAlmacen();

      expect(result.esPrincipal).toBe(true);
      expect(mockPrismaService.almacen.update).toHaveBeenCalledWith({
        where: { id: 'alm-1' },
        data: { esPrincipal: true, activo: true },
      });
    });

    it('should create a default principal when there are no active almacenes', async () => {
      mockPrismaService.almacen.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.almacen.create.mockResolvedValue({
        id: 'alm-default',
        nombre: 'Almacén Principal',
        esPrincipal: true,
        activo: true,
        deletedAt: null,
      });

      const result = await service.ensurePrincipalAlmacen();

      expect(result.id).toBe('alm-default');
      expect(mockPrismaService.almacen.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nombre: 'Almacén Principal',
          esPrincipal: true,
          activo: true,
        }),
      });
    });
  });

  describe('removeAlmacen', () => {
    it('should soft delete an empty almacen', async () => {
      mockPrismaService.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockPrismaService.almacenStock.count.mockResolvedValue(0);
      mockPrismaService.almacen.update.mockResolvedValue({});

      await service.removeAlmacen('alm-1');
      expect(mockPrismaService.almacen.update).toHaveBeenCalledWith({
        where: { id: 'alm-1' },
        data: {
          deletedAt: expect.any(Date),
          activo: false,
          esPrincipal: false,
        },
      });
    });

    it('should throw BadRequestException for almacen with stock', async () => {
      mockPrismaService.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockPrismaService.almacenStock.count.mockResolvedValue(5);

      await expect(service.removeAlmacen('alm-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not delete the principal almacen', async () => {
      mockPrismaService.almacen.findFirst.mockResolvedValue({
        id: 'alm-1',
        esPrincipal: true,
      });

      await expect(service.removeAlmacen('alm-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.almacen.update).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════
  //  MOVIMIENTOS
  // ═══════════════════════════════════════════

  describe('createMovimiento', () => {
    const baseDto = {
      tipo: TipoMovimiento.AJUSTE_POSITIVO,
      productoId: 'prod-1',
      almacenDestinoId: 'alm-1',
      cantidad: 10,
      justificacion: 'Carga inicial validada',
    };

    it('should create an AJUSTE_POSITIVO movement', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(),
      );
      mockPrismaService.almacen.findFirst.mockResolvedValue({
        id: 'alm-1',
        deletedAt: null,
      });
      mockTx.almacenStock.findUnique.mockResolvedValue(null);
      mockTx.almacenStock.upsert.mockResolvedValue({ cantidad: 10 });
      mockTx.movimientoStock.create.mockResolvedValue({
        id: 'mov-1',
        tipo: TipoMovimiento.AJUSTE_POSITIVO,
        cantidad: 10,
        cantidadAnterior: 0,
        cantidadPosterior: 10,
      });
      mockTx.alertaStock.findFirst.mockResolvedValue(null);

      const result = await service.createMovimiento(
        baseDto,
        'user-1',
        RolUsuario.ENCARGADO,
      );

      expect(result.tipo).toBe(TipoMovimiento.AJUSTE_POSITIVO);
      expect(result.cantidad).toBe(10);
    });

    it('should reject automatic movement types in manual inventory flow', async () => {
      await expect(
        service.createMovimiento(
          {
            tipo: TipoMovimiento.VENTA,
            productoId: 'prod-1',
            almacenOrigenId: 'alm-1',
            cantidad: 1,
          },
          'user-1',
          RolUsuario.ENCARGADO,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createMovimiento(
          {
            tipo: TipoMovimiento.COMPRA_RECIBIDA,
            productoId: 'prod-1',
            almacenDestinoId: 'alm-1',
            cantidad: 1,
          },
          'user-1',
          RolUsuario.ENCARGADO,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject TECNICO for non-CONSUMO_SOPORTE movements', async () => {
      await expect(
        service.createMovimiento(baseDto, 'user-1', RolUsuario.TECNICO),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject CONSUMO_SOPORTE in manual flow (now generated from soporte)', async () => {
      const dto = {
        tipo: TipoMovimiento.CONSUMO_SOPORTE,
        productoId: 'prod-1',
        almacenOrigenId: 'alm-1',
        cantidad: 2,
      };

      await expect(
        service.createMovimiento(dto, 'user-1', RolUsuario.TECNICO),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject products that do not manage stock', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        ...productoInventariable(),
        manejaInventario: false,
      });

      await expect(
        service.createMovimiento(baseDto, 'user-1', RolUsuario.ENCARGADO),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject serialized or equipment products in manual inventory flow', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        ...productoInventariable(),
        tipo: TipoProducto.EQUIPO,
        tieneNumeroSerie: true,
      });

      await expect(
        service.createMovimiento(baseDto, 'user-1', RolUsuario.ENCARGADO),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require justificacion for AJUSTE_NEGATIVO', async () => {
      const dto = {
        tipo: TipoMovimiento.AJUSTE_NEGATIVO,
        productoId: 'prod-1',
        almacenOrigenId: 'alm-1',
        cantidad: 5,
        // sin justificacion
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(),
      );

      await expect(
        service.createMovimiento(dto, 'user-1', RolUsuario.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require justificacion for AJUSTE_POSITIVO', async () => {
      const dto = {
        tipo: TipoMovimiento.AJUSTE_POSITIVO,
        productoId: 'prod-1',
        almacenDestinoId: 'alm-1',
        cantidad: 5,
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(),
      );

      await expect(
        service.createMovimiento(dto, 'user-1', RolUsuario.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for insufficient stock on AJUSTE_NEGATIVO', async () => {
      const dto = {
        tipo: TipoMovimiento.AJUSTE_NEGATIVO,
        productoId: 'prod-1',
        almacenOrigenId: 'alm-1',
        cantidad: 100,
        justificacion: 'Conteo físico',
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(),
      );
      mockPrismaService.almacen.findFirst.mockResolvedValue({
        id: 'alm-1',
        deletedAt: null,
      });
      mockTx.almacenStock.findUnique.mockResolvedValue({
        cantidad: 5,
      });

      await expect(
        service.createMovimiento(dto, 'user-1', RolUsuario.ENCARGADO),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate TRANSFERENCIA requires both almacenes', async () => {
      const dto = {
        tipo: TipoMovimiento.TRANSFERENCIA,
        productoId: 'prod-1',
        almacenOrigenId: 'alm-1',
        // falta almacenDestinoId
        cantidad: 5,
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(),
      );

      await expect(
        service.createMovimiento(dto, 'user-1', RolUsuario.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject TRANSFERENCIA to same almacen', async () => {
      const dto = {
        tipo: TipoMovimiento.TRANSFERENCIA,
        productoId: 'prod-1',
        almacenOrigenId: 'alm-1',
        almacenDestinoId: 'alm-1',
        cantidad: 5,
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(),
      );

      await expect(
        service.createMovimiento(dto, 'user-1', RolUsuario.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create stock alert when stock drops below minimum', async () => {
      const dto = {
        tipo: TipoMovimiento.AJUSTE_NEGATIVO,
        productoId: 'prod-1',
        almacenOrigenId: 'alm-1',
        cantidad: 8,
        justificacion: 'Merma validada',
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(),
      );
      mockPrismaService.almacen.findFirst.mockResolvedValue({
        id: 'alm-1',
        deletedAt: null,
      });
      mockTx.almacenStock.findUnique
        .mockResolvedValueOnce({ cantidad: 10 }) // stock check in salida
        .mockResolvedValueOnce({ cantidad: 2 }); // alert check
      mockTx.almacenStock.upsert.mockResolvedValue({ cantidad: 2 });
      mockTx.movimientoStock.create.mockResolvedValue({
        id: 'mov-3',
        tipo: TipoMovimiento.AJUSTE_NEGATIVO,
        cantidad: 8,
        cantidadAnterior: 10,
        cantidadPosterior: 2,
      });
      mockTx.alertaStock.findFirst.mockResolvedValue(null);
      mockTx.alertaStock.create.mockResolvedValue({
        id: 'alert-1',
      });

      await service.createMovimiento(dto, 'user-1', RolUsuario.ENCARGADO);

      expect(mockTx.alertaStock.create).toHaveBeenCalled();
    });

    it('should create stock alert when an entry remains below minimum', async () => {
      const dto = {
        tipo: TipoMovimiento.AJUSTE_POSITIVO,
        productoId: 'prod-1',
        almacenDestinoId: 'alm-1',
        cantidad: 3,
        justificacion: 'Carga inicial parcial',
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(5),
      );
      mockPrismaService.almacen.findFirst.mockResolvedValue({
        id: 'alm-1',
        deletedAt: null,
      });
      mockTx.almacenStock.findUnique
        .mockResolvedValueOnce(null) // stock destino antes de entrada
        .mockResolvedValueOnce({ cantidad: 3 }); // alert check
      mockTx.almacenStock.upsert.mockResolvedValue({ cantidad: 3 });
      mockTx.movimientoStock.create.mockResolvedValue({
        id: 'mov-entry-1',
        tipo: TipoMovimiento.AJUSTE_POSITIVO,
        cantidad: 3,
        cantidadAnterior: 0,
        cantidadPosterior: 3,
      });
      mockTx.alertaStock.findFirst.mockResolvedValue(null);
      mockTx.alertaStock.create.mockResolvedValue({
        id: 'alert-entry-1',
      });

      await service.createMovimiento(dto, 'user-1', RolUsuario.ENCARGADO);

      expect(mockTx.alertaStock.create).toHaveBeenCalled();
    });

    it('should require evidence for BAJA_DANO', async () => {
      const dto = {
        tipo: TipoMovimiento.BAJA_DANO,
        productoId: 'prod-1',
        almacenOrigenId: 'alm-1',
        cantidad: 1,
        justificacion: 'Equipo dañado',
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(1),
      );

      await expect(
        service.createMovimiento(dto, 'user-1', RolUsuario.ENCARGADO),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-image evidence for BAJA_DANO', async () => {
      const dto = {
        tipo: TipoMovimiento.BAJA_DANO,
        productoId: 'prod-1',
        almacenOrigenId: 'alm-1',
        cantidad: 1,
        justificacion: 'Equipo dañado',
        evidenciaFilename: 'evidencia.pdf',
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(1),
      );

      await expect(
        service.createMovimiento(dto, 'user-1', RolUsuario.ENCARGADO),
      ).rejects.toThrow(BadRequestException);
    });

    it('should persist evidence attachment for BAJA_DANO', async () => {
      const dto = {
        tipo: TipoMovimiento.BAJA_DANO,
        productoId: 'prod-1',
        almacenOrigenId: 'alm-1',
        cantidad: 1,
        justificacion: 'Equipo dañado',
        evidenciaFilename: 'evidencia.jpg',
      };

      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(0),
      );
      mockPrismaService.almacen.findFirst.mockResolvedValue({
        id: 'alm-1',
        deletedAt: null,
      });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 2 });
      mockTx.almacenStock.upsert.mockResolvedValue({ cantidad: 1 });
      mockTx.movimientoStock.create.mockResolvedValue({
        id: 'mov-baja-1',
        tipo: TipoMovimiento.BAJA_DANO,
        cantidad: 1,
        cantidadAnterior: 2,
        cantidadPosterior: 1,
      });
      mockTx.alertaStock.findFirst.mockResolvedValue(null);
      mockTx.adjunto.create.mockResolvedValue({ id: 'adj-1' });

      await service.createMovimiento(dto, 'user-1', RolUsuario.ENCARGADO);

      expect(mockUploadsService.getFilePath).toHaveBeenCalledWith(
        'evidencia.jpg',
      );
      expect(mockTx.adjunto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entidad: 'MOVIMIENTO_STOCK',
          entidadId: 'mov-baja-1',
          url: 'uploads/evidencia.jpg',
          nombre: 'evidencia.jpg',
          tipo: 'MOVIMIENTO_STOCK_EVIDENCIA',
        }),
      });
    });
  });

  // ═══════════════════════════════════════════
  //  ALERTAS
  // ═══════════════════════════════════════════

  describe('resolveAlerta', () => {
    it('should resolve an active alert', async () => {
      mockPrismaService.alertaStock.findUnique.mockResolvedValue({
        id: 'alert-1',
        resuelta: false,
      });
      mockPrismaService.alertaStock.update.mockResolvedValue({
        id: 'alert-1',
        resuelta: true,
      });

      const result = await service.resolveAlerta('alert-1', 'user-1');
      expect(result.resuelta).toBe(true);
    });

    it('should throw for already resolved alert', async () => {
      mockPrismaService.alertaStock.findUnique.mockResolvedValue({
        id: 'alert-1',
        resuelta: true,
      });

      await expect(service.resolveAlerta('alert-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for missing alert', async () => {
      mockPrismaService.alertaStock.findUnique.mockResolvedValue(null);

      await expect(service.resolveAlerta('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  STOCK QUERIES
  // ═══════════════════════════════════════════

  describe('findStock', () => {
    it('should return paginated stock', async () => {
      mockPrismaService.almacenStock.findMany.mockResolvedValue([]);
      mockPrismaService.almacenStock.count.mockResolvedValue(0);

      const result = await service.findStock({ page: 1, limit: 20 });
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter stockBajo before pagination', async () => {
      mockPrismaService.almacenStock.findMany.mockResolvedValue([
        {
          id: 'stock-1',
          cantidad: 10,
          producto: { stockMinimo: 2, nombre: 'A' },
          almacen: { id: 'alm-1', nombre: 'Principal' },
        },
        {
          id: 'stock-2',
          cantidad: 2,
          producto: { stockMinimo: 5, nombre: 'B' },
          almacen: { id: 'alm-1', nombre: 'Principal' },
        },
      ]);

      const result = await service.findStock({
        page: 1,
        limit: 20,
        stockBajo: true,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].id).toBe('stock-2');
      expect(mockPrismaService.almacenStock.count).not.toHaveBeenCalled();
    });
  });

  describe('findStockByProducto', () => {
    it('should return stock for a valid product', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(
        productoInventariable(),
      );
      mockPrismaService.almacenStock.findMany.mockResolvedValue([
        { almacenId: 'alm-1', cantidad: 10 },
      ]);

      const result = await service.findStockByProducto('prod-1');
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException for missing product', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);

      await expect(service.findStockByProducto('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
