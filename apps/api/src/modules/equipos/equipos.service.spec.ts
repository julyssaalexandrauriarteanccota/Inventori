import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EquiposService } from './equipos.service';
import { SnmpService } from './snmp.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  $transaction: jest.fn(),
  almacen: { findFirst: jest.fn() },
  almacenStock: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  movimientoStock: { create: jest.fn() },
  producto: { findFirst: jest.fn() },
  equipo: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  equipoCliente: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  garantia: { findMany: jest.fn() },
  cliente: { findFirst: jest.fn() },
  lecturaSNMP: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockSnmpService = {
  fetchReading: jest.fn(),
};

describe('EquiposService', () => {
  let service: EquiposService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquiposService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SnmpService, useValue: mockSnmpService },
      ],
    }).compile();

    service = module.get<EquiposService>(EquiposService);
    jest.resetAllMocks();
    mockPrismaService.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrismaService) => unknown) =>
        callback(mockPrismaService),
    );
  });

  // ═══════════════════════════════════════════
  //  CRUD EQUIPOS
  // ═══════════════════════════════════════════

  describe('create', () => {
    it('should create an equipo', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'prod-1',
        tipo: 'EQUIPO',
        tieneNumeroSerie: true,
        manejaInventario: true,
      });
      mockPrismaService.equipo.findUnique.mockResolvedValue(null);
      mockPrismaService.equipo.create.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-001',
        productoId: 'prod-1',
        almacenId: null,
        estadoComercial: 'DISPONIBLE',
      });

      const result = await service.create(
        {
          numeroSerie: 'SN-001',
          productoId: 'prod-1',
        },
        'user-1',
      );
      expect(result.numeroSerie).toBe('SN-001');
    });

    it('should throw ConflictException for duplicate serie', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'prod-1',
        tipo: 'EQUIPO',
        tieneNumeroSerie: true,
        manejaInventario: true,
      });
      mockPrismaService.equipo.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(
          { numeroSerie: 'SN-DUP', productoId: 'prod-1' },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for non-serial product', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'prod-2',
        tipo: 'REPUESTO',
        tieneNumeroSerie: false,
        manejaInventario: true,
      });

      await expect(
        service.create(
          { numeroSerie: 'SN-002', productoId: 'prod-2' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing product', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { numeroSerie: 'SN-003', productoId: 'missing' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should register a movement when an equipo enters inventory', async () => {
      mockPrismaService.producto.findFirst.mockResolvedValue({
        id: 'prod-1',
        tipo: 'EQUIPO',
        tieneNumeroSerie: true,
        manejaInventario: true,
      });
      mockPrismaService.equipo.findUnique.mockResolvedValue(null);
      mockPrismaService.almacen.findFirst.mockResolvedValue({ id: 'alm-1' });
      mockPrismaService.equipo.create.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-001',
        productoId: 'prod-1',
        almacenId: 'alm-1',
        estadoComercial: 'DISPONIBLE',
      });
      mockPrismaService.almacenStock.findUnique.mockResolvedValue(null);

      await service.create(
        { numeroSerie: 'SN-001', productoId: 'prod-1', almacenId: 'alm-1' },
        'user-1',
      );

      expect(mockPrismaService.movimientoStock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: 'AJUSTE_POSITIVO',
            productoId: 'prod-1',
            almacenDestinoId: 'alm-1',
            cantidadAnterior: 0,
            cantidadPosterior: 1,
            usuarioId: 'user-1',
          }),
        }),
      );
    });
  });

  describe('findBySerie', () => {
    it('should return equipo with relations', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-001',
        equipoClientes: [],
        garantias: [],
      });

      const result = await service.findBySerie('SN-001');
      expect(result.numeroSerie).toBe('SN-001');
    });

    it('should throw NotFoundException for missing serie', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(null);

      await expect(service.findBySerie('NOPE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an equipo', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-001',
        productoId: 'prod-1',
        almacenId: null,
        estadoComercial: 'DISPONIBLE',
        producto: {
          id: 'prod-1',
          manejaInventario: true,
        },
      });
      mockPrismaService.equipo.update.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-001',
        productoId: 'prod-1',
        almacenId: null,
        estadoComercial: 'DISPONIBLE',
        ubicacion: 'Oficina A',
      });

      const result = await service.update(
        'SN-001',
        { ubicacion: 'Oficina A' },
        'user-1',
      );
      expect(result.ubicacion).toBe('Oficina A');
    });

    it('should throw ConflictException when changing to existing serie', async () => {
      // findBySerie check
      mockPrismaService.equipo.findUnique
        .mockResolvedValueOnce({
          id: 'eq-1',
          numeroSerie: 'SN-001',
          productoId: 'prod-1',
          almacenId: null,
          estadoComercial: 'DISPONIBLE',
          producto: {
            id: 'prod-1',
            manejaInventario: true,
          },
        })
        // duplicate check
        .mockResolvedValueOnce({ id: 'eq-2' });

      await expect(
        service.update('SN-001', { numeroSerie: 'SN-EXISTING' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════
  //  ASIGNACIÓN EQUIPO ↔ CLIENTE
  // ═══════════════════════════════════════════

  describe('asignarCliente', () => {
    it('should assign a client to equipo', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-001',
        productoId: 'prod-1',
        almacenId: null,
        estadoComercial: 'DISPONIBLE',
        producto: {
          id: 'prod-1',
          manejaInventario: true,
        },
      });
      mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 'cli-1' });
      mockPrismaService.equipoCliente.findFirst.mockResolvedValue(null);
      mockPrismaService.equipoCliente.create.mockResolvedValue({
        id: 'ec-1',
        equipoId: 'eq-1',
        clienteId: 'cli-1',
      });

      const result = await service.asignarCliente(
        'SN-001',
        { clienteId: 'cli-1' },
        'user-1',
      );
      expect(result.clienteId).toBe('cli-1');
    });

    it('should close previous assignment', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        productoId: 'prod-1',
        almacenId: null,
        estadoComercial: 'DISPONIBLE',
        producto: {
          id: 'prod-1',
          manejaInventario: true,
        },
      });
      mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 'cli-2' });
      mockPrismaService.equipoCliente.findFirst.mockResolvedValue({
        id: 'ec-old',
      });
      mockPrismaService.equipoCliente.update.mockResolvedValue({});
      mockPrismaService.equipoCliente.create.mockResolvedValue({
        id: 'ec-new',
        equipoId: 'eq-1',
        clienteId: 'cli-2',
      });

      await service.asignarCliente('SN-001', { clienteId: 'cli-2' }, 'user-1');

      expect(mockPrismaService.equipoCliente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ec-old' },
          data: expect.objectContaining({ fechaFin: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException for missing equipo', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(null);

      await expect(
        service.asignarCliente('NOPE', { clienteId: 'cli-1' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for missing cliente', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        productoId: 'prod-1',
        almacenId: null,
        estadoComercial: 'DISPONIBLE',
        producto: {
          id: 'prod-1',
          manejaInventario: true,
        },
      });
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(
        service.asignarCliente('SN-001', { clienteId: 'missing' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findHistorial', () => {
    it('should return assignment history', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'SN-001',
        createdAt: new Date('2026-01-01'),
      });
      mockPrismaService.equipoCliente.findMany.mockResolvedValue([
        {
          id: 'ec-1',
          clienteId: 'cli-1',
          fechaInicio: new Date('2026-01-02'),
        },
      ]);
      mockPrismaService.lecturaSNMP.findMany.mockResolvedValue([]);
      mockPrismaService.garantia.findMany.mockResolvedValue([]);

      const result = await service.findHistorial('SN-001');
      expect(result).toHaveLength(2);
      expect(result.map((event) => event.tipo)).toEqual([
        'ASIGNACION_INICIO',
        'CREACION',
      ]);
    });
  });

  // ═══════════════════════════════════════════
  //  LECTURAS SNMP
  // ═══════════════════════════════════════════

  describe('createLecturaSNMP', () => {
    it('should create a SNMP reading', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue({ id: 'eq-1' });
      mockPrismaService.lecturaSNMP.create.mockResolvedValue({
        id: 'lect-1',
        paginasTotales: 5000,
      });

      const result = await service.createLecturaSNMP('SN-001', {
        paginasTotales: 5000,
        nivelTonerNegro: 80,
      });
      expect(result.paginasTotales).toBe(5000);
    });

    it('should throw NotFoundException for missing equipo', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(null);

      await expect(
        service.createLecturaSNMP('NOPE', { paginasTotales: 100 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLecturasSNMP', () => {
    it('should return paginated readings', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue({ id: 'eq-1' });
      mockPrismaService.lecturaSNMP.findMany.mockResolvedValue([]);
      mockPrismaService.lecturaSNMP.count.mockResolvedValue(0);

      const result = await service.findLecturasSNMP('SN-001', {
        page: 1,
        limit: 20,
      });
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by date range', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue({ id: 'eq-1' });
      mockPrismaService.lecturaSNMP.findMany.mockResolvedValue([]);
      mockPrismaService.lecturaSNMP.count.mockResolvedValue(0);

      await service.findLecturasSNMP('SN-001', {
        page: 1,
        limit: 20,
        desde: '2026-01-01',
        hasta: '2026-12-31',
      });

      expect(mockPrismaService.lecturaSNMP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });
});
