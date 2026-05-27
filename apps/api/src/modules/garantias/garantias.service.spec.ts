import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoComercialEquipo, EstadoGarantia } from '@erp/shared';
import { GarantiasService } from './garantias.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  equipo: { findUnique: jest.fn() },
  equipoCliente: { findFirst: jest.fn() },
  venta: { findFirst: jest.fn() },
  garantia: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  casoGarantia: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('GarantiasService', () => {
  let service: GarantiasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GarantiasService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GarantiasService>(GarantiasService);
    jest.resetAllMocks();
  });

  // ═══════════════════════════════════════════
  //  GARANTÍAS
  // ═══════════════════════════════════════════

  describe('create', () => {
    const baseDto = {
      equipoId: 'eq-1',
      fechaInicio: '2026-01-01',
      fechaFin: '2027-01-01',
      cobertura: 'Cobertura total',
    };

    const buildSoldEquipo = (overrides = {}) => ({
      id: 'eq-1',
      numeroSerie: 'SN-001',
      estadoComercial: EstadoComercialEquipo.VENDIDO,
      contadorInicial: 100,
      contadorActual: 1234,
      producto: {
        id: 'prod-1',
        mesesGarantia: 12,
        garantiaMaxCopias: 50000,
      },
      equipoClientes: [
        {
          clienteId: 'cli-1',
          ventaId: 'venta-1',
          cliente: {
            id: 'cli-1',
            nombre: 'Juan',
            apellido: 'Pérez',
            razonSocial: null,
            ruc: null,
            dni: '12345678',
          },
        },
      ],
      ...overrides,
    });

    it('should create a garantia with auto QR code', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(buildSoldEquipo());
      mockPrismaService.garantia.create.mockResolvedValue({
        id: 'gar-1',
        codigoQR: 'some-uuid',
        estado: EstadoGarantia.ACTIVA,
      });

      const result = await service.create(baseDto);
      expect(result.estado).toBe(EstadoGarantia.ACTIVA);
      expect(mockPrismaService.garantia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            codigoQR: expect.any(String),
            clienteIdOriginal: 'cli-1',
            ventaId: 'venta-1',
            contadorInicio: 100,
            contadorMaxCopias: 50000,
          }),
        }),
      );
    });

    it('should use contadorActual when explicitly requested', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(buildSoldEquipo());
      mockPrismaService.garantia.create.mockResolvedValue({
        id: 'gar-actual',
        estado: EstadoGarantia.ACTIVA,
      });

      await service.create({ ...baseDto, usarContadorActual: true });

      expect(mockPrismaService.garantia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contadorInicio: 1234,
          }),
        }),
      );
    });

    it('should reject when equipo already has a garantia', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(buildSoldEquipo());
      mockPrismaService.garantia.findFirst.mockResolvedValue({ id: 'gar-1' });

      await expect(service.create(baseDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.garantia.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing equipo', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(null);

      await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if fechaFin <= fechaInicio', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(buildSoldEquipo());

      await expect(
        service.create({ ...baseDto, fechaFin: '2025-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject garantia for equipo that is not sold', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(
        buildSoldEquipo({
          estadoComercial: EstadoComercialEquipo.DISPONIBLE,
        }),
      );

      await expect(service.create(baseDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.garantia.create).not.toHaveBeenCalled();
    });

    it('should reject sold equipo without current customer assignment', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(
        buildSoldEquipo({ equipoClientes: [] }),
      );

      await expect(service.create(baseDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.garantia.create).not.toHaveBeenCalled();
    });

    it('should auto-fill client data from current assignment', async () => {
      mockPrismaService.equipo.findUnique.mockResolvedValue(buildSoldEquipo());
      mockPrismaService.garantia.create.mockResolvedValue({
        id: 'gar-2',
        clienteDocNumero: '12345678',
      });

      await service.create(baseDto);

      expect(mockPrismaService.garantia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clienteDocTipo: 'DNI',
            clienteDocNumero: '12345678',
            clienteNombre: 'Juan Pérez',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return garantia with casos', async () => {
      mockPrismaService.garantia.findUnique.mockResolvedValue({
        id: 'gar-1',
        casos: [],
      });

      const result = await service.findOne('gar-1');
      expect(result.id).toBe('gar-1');
    });

    it('should throw NotFoundException', async () => {
      mockPrismaService.garantia.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  CONSULTA PÚBLICA
  // ═══════════════════════════════════════════

  describe('verificarPorCodigoQR', () => {
    it('should return garantia with vigente=true when active and not expired', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      mockPrismaService.garantia.findUnique.mockResolvedValue({
        id: 'gar-1',
        estado: EstadoGarantia.ACTIVA,
        fechaFin: futureDate,
        fechaInicio: new Date('2025-01-01'),
        cobertura: 'Total',
        codigoQR: 'abc-123',
        equipo: { numeroSerie: 'SN-001' },
      });

      const result = await service.verificarPorCodigoQR('abc-123');
      expect(result.vigente).toBe(true);
    });

    it('should return vigente=false when expired', async () => {
      mockPrismaService.garantia.findUnique.mockResolvedValue({
        id: 'gar-2',
        estado: EstadoGarantia.ACTIVA,
        fechaFin: new Date('2020-01-01'),
        fechaInicio: new Date('2019-01-01'),
        cobertura: 'Total',
        codigoQR: 'expired',
        equipo: { numeroSerie: 'SN-002' },
      });

      const result = await service.verificarPorCodigoQR('expired');
      expect(result.vigente).toBe(false);
    });

    it('should throw NotFoundException for invalid QR', async () => {
      mockPrismaService.garantia.findUnique.mockResolvedValue(null);

      await expect(service.verificarPorCodigoQR('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  CASOS DE GARANTÍA
  // ═══════════════════════════════════════════

  describe('createCaso', () => {
    it('should create a caso for active garantia', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      mockPrismaService.garantia.findUnique.mockResolvedValue({
        id: 'gar-1',
        estado: EstadoGarantia.ACTIVA,
        fechaFin: futureDate,
      });
      mockPrismaService.casoGarantia.create.mockResolvedValue({
        id: 'caso-1',
        descripcion: 'Falla fusor',
        aceptada: null,
      });

      const result = await service.createCaso('gar-1', {
        descripcion: 'Falla fusor',
      });
      expect(result.descripcion).toBe('Falla fusor');
      expect(mockPrismaService.casoGarantia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ aceptada: null }),
        }),
      );
    });

    it('should reject caso for non-active garantia', async () => {
      mockPrismaService.garantia.findUnique.mockResolvedValue({
        id: 'gar-1',
        estado: EstadoGarantia.ANULADA,
        fechaFin: new Date('2027-01-01'),
      });

      await expect(
        service.createCaso('gar-1', { descripcion: 'Falla' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject caso for expired garantia', async () => {
      mockPrismaService.garantia.findUnique.mockResolvedValue({
        id: 'gar-1',
        estado: EstadoGarantia.ACTIVA,
        fechaFin: new Date('2020-01-01'),
      });

      await expect(
        service.createCaso('gar-1', { descripcion: 'Falla' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing garantia', async () => {
      mockPrismaService.garantia.findUnique.mockResolvedValue(null);

      await expect(
        service.createCaso('missing', { descripcion: 'Falla' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCaso', () => {
    it('should update a caso (accept)', async () => {
      mockPrismaService.casoGarantia.findUnique.mockResolvedValue({
        id: 'caso-1',
        garantiaId: 'gar-1',
      });
      mockPrismaService.casoGarantia.update.mockResolvedValue({
        id: 'caso-1',
        aceptada: true,
        resolucion: 'Cambio de pieza',
      });

      const result = await service.updateCaso('gar-1', 'caso-1', {
        aceptada: true,
        resolucion: 'Cambio de pieza',
      });
      expect(result.aceptada).toBe(true);
    });

    it('should require motivo when rejecting', async () => {
      mockPrismaService.casoGarantia.findUnique.mockResolvedValue({
        id: 'caso-1',
        garantiaId: 'gar-1',
      });

      await expect(
        service.updateCaso('gar-1', 'caso-1', { aceptada: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow rejecting with motivo', async () => {
      mockPrismaService.casoGarantia.findUnique.mockResolvedValue({
        id: 'caso-1',
        garantiaId: 'gar-1',
      });
      mockPrismaService.casoGarantia.update.mockResolvedValue({
        id: 'caso-1',
        aceptada: false,
        motivo: 'Uso indebido',
      });

      const result = await service.updateCaso('gar-1', 'caso-1', {
        aceptada: false,
        motivo: 'Uso indebido',
      });
      expect(result.aceptada).toBe(false);
    });

    it('should throw NotFoundException for missing caso', async () => {
      mockPrismaService.casoGarantia.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCaso('gar-1', 'missing', { aceptada: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if caso does not belong to garantia', async () => {
      mockPrismaService.casoGarantia.findUnique.mockResolvedValue({
        id: 'caso-1',
        garantiaId: 'gar-OTHER',
      });

      await expect(
        service.updateCaso('gar-1', 'caso-1', { aceptada: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCaso', () => {
    it('should delete a caso belonging to garantia', async () => {
      mockPrismaService.casoGarantia.findUnique.mockResolvedValue({
        id: 'caso-1',
        garantiaId: 'gar-1',
      });
      mockPrismaService.casoGarantia.delete.mockResolvedValue({
        id: 'caso-1',
      });

      const result = await service.deleteCaso('gar-1', 'caso-1');

      expect(result.id).toBe('caso-1');
      expect(mockPrismaService.casoGarantia.delete).toHaveBeenCalledWith({
        where: { id: 'caso-1' },
      });
    });

    it('should throw NotFoundException for missing caso', async () => {
      mockPrismaService.casoGarantia.findUnique.mockResolvedValue(null);

      await expect(service.deleteCaso('gar-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if caso does not belong to garantia', async () => {
      mockPrismaService.casoGarantia.findUnique.mockResolvedValue({
        id: 'caso-1',
        garantiaId: 'gar-OTHER',
      });

      await expect(service.deleteCaso('gar-1', 'caso-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
