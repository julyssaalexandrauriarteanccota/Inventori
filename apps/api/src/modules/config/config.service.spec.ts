import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { PrismaService } from '../../database/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('ConfigService', () => {
  let service: ConfigService;
  let mockPrisma: any;

  const mockConfig = {
    id: 'cfg-1',
    razonSocial: 'Empresa SAC',
    ruc: '20123456789',
    direccion: 'Av. Test 123',
    telefono: '999888777',
    email: 'info@empresa.com',
    logo: null,
    nombreComercial: 'Inventori Demo',
    slogan: 'Gestión integral para empresas técnicas',
    descripcionCorta: 'ERP configurable para operaciones comerciales',
    descripcionSeo: 'ERP configurable para ventas, inventario y soporte',
    rubro: 'servicios técnicos',
    website: 'https://inventori.test',
    telefonoVentas: '+51 999 888 777',
    telefonoSoporte: '+51 999 111 222',
    whatsapp: '+51 999 888 777',
    emailVentas: 'ventas@empresa.com',
    emailSoporte: 'soporte@empresa.com',
    logoDark: null,
    favicon: '/favicon.ico',
    colorPrimario: '#0f172a',
    colorSecundario: '#f97316',
    heroTitulo: 'Controla tu operación desde un solo lugar',
    heroSubtitulo: 'Inventario, ventas y soporte en tiempo real',
    catalogoDescripcion: 'Explora productos y servicios disponibles',
    contactoDescripcion: 'Comunícate con nuestro equipo comercial',
    garantiaDescripcion: 'Consulta el estado de tus garantías',
    ticketDescripcion: 'Haz seguimiento a tus solicitudes de soporte',
    pwaDescripcion: 'ERP configurable con catálogo, ventas y soporte',
    monedaDefault: 'PEN',
    zonaHoraria: 'America/Lima',
    pais: 'PE',
    idioma: 'es',
    serieFactura: 'F001',
    serieBoleta: 'B001',
    serieNotaCredito: 'FC01',
    serieNotaDebito: 'FD01',
    correlativoFactura: 5,
    correlativoBoleta: 10,
    correlativoNotaCredito: 0,
    correlativoNotaDebito: 0,
    porcentajeIGV: 18.0,
    updatedAt: new Date(),
  };

  const mockMetodoPago = {
    id: 'mp-1',
    codigo: 'EFECTIVO',
    nombre: 'Efectivo',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuditoria = {
    id: 'aud-1',
    usuarioId: 'usr-1',
    accion: 'CREAR',
    modelo: 'clientes',
    modeloId: 'cli-1',
    datosAntes: null,
    datosDespues: { nombre: 'Test' },
    ip: '127.0.0.1',
    userAgent: 'Jest',
    createdAt: new Date(),
    usuario: { id: 'usr-1', nombre: 'Admin', email: 'admin@test.com' },
  };

  beforeEach(async () => {
    mockPrisma = {
      configEmpresa: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      metodoPago: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      venta: {
        count: jest.fn(),
      },
      movimientoCaja: {
        count: jest.fn(),
      },
      tipoMovimientoConfig: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      auditoria: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  // ═══════════════════════════════════════════
  //  EMPRESA
  // ═══════════════════════════════════════════

  describe('getEmpresa', () => {
    it('debe retornar configuración de empresa', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getEmpresa();
      expect(result).toEqual(mockConfig);
    });

    it('debe lanzar NotFoundException si no existe config', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(null);

      await expect(service.getEmpresa()).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEmpresaPublica', () => {
    it('debe retornar datos públicos y branding de empresa', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getEmpresaPublica();

      expect(result.data.nombreComercial).toBe('Inventori Demo');
      expect(result.data.heroTitulo).toBe(
        'Controla tu operación desde un solo lugar',
      );
      expect(result.meta.timestamp).toEqual(expect.any(String));
      expect(mockPrisma.configEmpresa.findFirst).toHaveBeenCalledWith({
        select: expect.objectContaining({
          razonSocial: true,
          logo: true,
          nombreComercial: true,
          heroTitulo: true,
          pwaDescripcion: true,
        }),
      });
    });

    it('debe lanzar NotFoundException si no existe config pública', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(null);

      await expect(service.getEmpresaPublica()).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateEmpresa', () => {
    it('debe actualizar configuración de empresa', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      const updated = {
        ...mockConfig,
        razonSocial: 'Nueva Razón',
        nombreComercial: 'Nueva Marca',
      };
      mockPrisma.configEmpresa.update.mockResolvedValue(updated);

      const result = await service.updateEmpresa({
        razonSocial: 'Nueva Razón',
        nombreComercial: 'Nueva Marca',
        heroTitulo: 'Nuevo hero',
      });
      expect(result.razonSocial).toBe('Nueva Razón');
      expect(result.nombreComercial).toBe('Nueva Marca');
      expect(mockPrisma.configEmpresa.update).toHaveBeenCalledWith({
        where: { id: 'cfg-1' },
        data: expect.objectContaining({
          razonSocial: 'Nueva Razón',
          nombreComercial: 'Nueva Marca',
          heroTitulo: 'Nuevo hero',
        }),
      });
    });

    it('debe lanzar NotFoundException si no existe config', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(null);

      await expect(
        service.updateEmpresa({ razonSocial: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════
  //  SERIES
  // ═══════════════════════════════════════════

  describe('getSeries', () => {
    it('debe retornar series de documentos', async () => {
      const series = {
        id: 'cfg-1',
        serieFactura: 'F001',
        serieBoleta: 'B001',
        serieNotaCredito: 'FC01',
        serieNotaDebito: 'FD01',
        correlativoFactura: 5,
        correlativoBoleta: 10,
        correlativoNotaCredito: 0,
        correlativoNotaDebito: 0,
      };
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(series);

      const result = await service.getSeries();
      expect(result.serieFactura).toBe('F001');
    });

    it('debe lanzar NotFoundException si no existe config', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(null);

      await expect(service.getSeries()).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSeries', () => {
    it('debe actualizar series', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      const updated = { ...mockConfig, serieFactura: 'F002' };
      mockPrisma.configEmpresa.update.mockResolvedValue(updated);

      const result = await service.updateSeries({ serieFactura: 'F002' });
      expect(result.serieFactura).toBe('F002');
    });

    it('debe lanzar NotFoundException si no existe config', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSeries({ serieFactura: 'F002' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════
  //  MÉTODOS DE PAGO
  // ═══════════════════════════════════════════

  describe('findAllMetodosPago', () => {
    it('debe listar métodos de pago ordenados', async () => {
      mockPrisma.metodoPago.findMany.mockResolvedValue([mockMetodoPago]);

      const result = await service.findAllMetodosPago();
      expect(result).toHaveLength(1);
      expect(mockPrisma.metodoPago.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('createMetodoPago', () => {
    it('debe crear método de pago', async () => {
      mockPrisma.metodoPago.findUnique.mockResolvedValue(null);
      mockPrisma.metodoPago.create.mockResolvedValue(mockMetodoPago);

      const result = await service.createMetodoPago({
        codigo: 'EFECTIVO',
        nombre: 'Efectivo',
      });
      expect(result.codigo).toBe('EFECTIVO');
    });

    it('debe rechazar código duplicado', async () => {
      mockPrisma.metodoPago.findUnique.mockResolvedValue(mockMetodoPago);

      await expect(
        service.createMetodoPago({ codigo: 'EFECTIVO', nombre: 'Efectivo' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateMetodoPago', () => {
    it('debe actualizar método de pago', async () => {
      mockPrisma.metodoPago.findUnique.mockResolvedValue(mockMetodoPago);
      const updated = { ...mockMetodoPago, nombre: 'Cash' };
      mockPrisma.metodoPago.update.mockResolvedValue(updated);

      const result = await service.updateMetodoPago('mp-1', { nombre: 'Cash' });
      expect(result.nombre).toBe('Cash');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockPrisma.metodoPago.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMetodoPago('mp-x', { nombre: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar cambio de código a uno existente', async () => {
      mockPrisma.metodoPago.findUnique
        .mockResolvedValueOnce(mockMetodoPago) // find by id
        .mockResolvedValueOnce({ id: 'mp-2', codigo: 'TARJETA' }); // find by codigo

      await expect(
        service.updateMetodoPago('mp-1', { codigo: 'TARJETA' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteMetodoPago', () => {
    it('debe eliminar método de pago sin uso', async () => {
      mockPrisma.metodoPago.findUnique.mockResolvedValue(mockMetodoPago);
      mockPrisma.venta.count.mockResolvedValue(0);
      mockPrisma.movimientoCaja.count.mockResolvedValue(0);
      mockPrisma.metodoPago.delete.mockResolvedValue(mockMetodoPago);

      const result = await service.deleteMetodoPago('mp-1');

      expect(mockPrisma.metodoPago.delete).toHaveBeenCalledWith({
        where: { id: 'mp-1' },
      });
      expect(result).toEqual(mockMetodoPago);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockPrisma.metodoPago.findUnique.mockResolvedValue(null);

      await expect(service.deleteMetodoPago('mp-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe rechazar eliminación si el método ya fue usado en ventas', async () => {
      mockPrisma.metodoPago.findUnique.mockResolvedValue(mockMetodoPago);
      mockPrisma.venta.count.mockResolvedValue(2);
      mockPrisma.movimientoCaja.count.mockResolvedValue(0);

      await expect(service.deleteMetodoPago('mp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe rechazar eliminación si el método ya fue usado en caja', async () => {
      mockPrisma.metodoPago.findUnique.mockResolvedValue(mockMetodoPago);
      mockPrisma.venta.count.mockResolvedValue(0);
      mockPrisma.movimientoCaja.count.mockResolvedValue(1);

      await expect(service.deleteMetodoPago('mp-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  TIPOS DE MOVIMIENTO
  // ═══════════════════════════════════════════

  describe('findAllTiposMovimiento', () => {
    it('debe sembrar faltantes y listar tipos ordenados', async () => {
      mockPrisma.tipoMovimientoConfig.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'tm-1',
            codigo: 'COMPRA_RECIBIDA',
            nombre: 'Compra recibida',
            activo: true,
            orden: 1,
          },
        ]);

      const result = await service.findAllTiposMovimiento();

      expect(mockPrisma.tipoMovimientoConfig.createMany).toHaveBeenCalled();
      expect(mockPrisma.tipoMovimientoConfig.findMany).toHaveBeenLastCalledWith(
        {
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('createTipoMovimiento', () => {
    it('debe crear un tipo personalizado con codigo generado', async () => {
      mockPrisma.tipoMovimientoConfig.findMany.mockResolvedValue([]);
      mockPrisma.tipoMovimientoConfig.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tipoMovimientoConfig.count.mockResolvedValue(9);
      mockPrisma.tipoMovimientoConfig.create.mockResolvedValue({
        id: 'tm-custom',
        codigo: 'REUBICACION_INTERNA',
        nombre: 'Reubicación interna',
        activo: true,
        orden: 10,
        comportamiento: 'SALIDA',
        requiereJustificacion: true,
        requiereEvidencia: false,
        disponibleTecnico: false,
      });

      const result = await service.createTipoMovimiento({
        nombre: 'Reubicación interna',
        comportamiento: 'SALIDA' as any,
        requiereJustificacion: true,
      });

      expect(mockPrisma.tipoMovimientoConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          codigo: 'REUBICACION_INTERNA',
          nombre: 'Reubicación interna',
          orden: 10,
        }),
      });
      expect(result.codigo).toBe('REUBICACION_INTERNA');
    });

    it('debe rechazar evidencia en tipos que no son salida', async () => {
      mockPrisma.tipoMovimientoConfig.findMany.mockResolvedValue([]);

      await expect(
        service.createTipoMovimiento({
          nombre: 'Entrada con foto',
          comportamiento: 'ENTRADA' as any,
          requiereEvidencia: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTipoMovimiento', () => {
    it('debe actualizar un tipo de movimiento', async () => {
      mockPrisma.tipoMovimientoConfig.findMany.mockResolvedValue([]);
      mockPrisma.tipoMovimientoConfig.findUnique.mockResolvedValue({
        id: 'tm-1',
        codigo: 'COMPRA_RECIBIDA',
        nombre: 'Compra recibida',
        activo: true,
        orden: 1,
        comportamiento: 'ENTRADA',
        requiereJustificacion: false,
        requiereEvidencia: false,
        disponibleTecnico: false,
      });
      mockPrisma.tipoMovimientoConfig.update.mockResolvedValue({
        id: 'tm-1',
        codigo: 'COMPRA_RECIBIDA',
        nombre: 'Compra técnica',
        activo: true,
        orden: 1,
        comportamiento: 'ENTRADA',
        requiereJustificacion: false,
        requiereEvidencia: false,
        disponibleTecnico: false,
      });

      const result = await service.updateTipoMovimiento('tm-1', {
        nombre: 'Compra técnica',
      });

      expect(mockPrisma.tipoMovimientoConfig.update).toHaveBeenCalledWith({
        where: { id: 'tm-1' },
        data: { nombre: 'Compra técnica' },
      });
      expect(result.nombre).toBe('Compra técnica');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockPrisma.tipoMovimientoConfig.findMany.mockResolvedValue([]);
      mockPrisma.tipoMovimientoConfig.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTipoMovimiento('tm-x', { activo: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar evidencia si el comportamiento final no es salida', async () => {
      mockPrisma.tipoMovimientoConfig.findMany.mockResolvedValue([]);
      mockPrisma.tipoMovimientoConfig.findUnique.mockResolvedValue({
        id: 'tm-1',
        codigo: 'CUSTOM',
        nombre: 'Custom',
        activo: true,
        orden: 1,
        comportamiento: 'ENTRADA',
        requiereJustificacion: false,
        requiereEvidencia: false,
        disponibleTecnico: false,
      });

      await expect(
        service.updateTipoMovimiento('tm-1', { requiereEvidencia: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTipoMovimiento', () => {
    it('debe eliminar un tipo personalizado', async () => {
      mockPrisma.tipoMovimientoConfig.findMany.mockResolvedValue([]);
      mockPrisma.tipoMovimientoConfig.findUnique.mockResolvedValue({
        id: 'tm-9',
        codigo: 'REUBICACION_INTERNA',
        nombre: 'Reubicación interna',
      });

      await service.deleteTipoMovimiento('tm-9');

      expect(mockPrisma.tipoMovimientoConfig.delete).toHaveBeenCalledWith({
        where: { id: 'tm-9' },
      });
    });

    it('debe impedir eliminar tipos base', async () => {
      mockPrisma.tipoMovimientoConfig.findMany.mockResolvedValue([]);
      mockPrisma.tipoMovimientoConfig.findUnique.mockResolvedValue({
        id: 'tm-1',
        codigo: 'VENTA',
        nombre: 'Venta',
      });

      await expect(service.deleteTipoMovimiento('tm-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  AUDITORÍA
  // ═══════════════════════════════════════════

  describe('findAllAuditoria', () => {
    it('debe listar registros paginados', async () => {
      mockPrisma.auditoria.findMany.mockResolvedValue([mockAuditoria]);
      mockPrisma.auditoria.count.mockResolvedValue(1);

      const result = await service.findAllAuditoria({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('debe filtrar por modelo y accion', async () => {
      mockPrisma.auditoria.findMany.mockResolvedValue([]);
      mockPrisma.auditoria.count.mockResolvedValue(0);

      await service.findAllAuditoria({
        page: 1,
        limit: 20,
        modelo: 'clientes',
        accion: 'CREAR',
      });

      const call = mockPrisma.auditoria.findMany.mock.calls[0][0];
      expect(call.where.modelo).toBe('clientes');
      expect(call.where.accion).toBe('CREAR');
    });

    it('debe filtrar por rango de fechas', async () => {
      mockPrisma.auditoria.findMany.mockResolvedValue([]);
      mockPrisma.auditoria.count.mockResolvedValue(0);

      await service.findAllAuditoria({
        page: 1,
        limit: 20,
        fechaDesde: '2026-01-01',
        fechaHasta: '2026-12-31',
      });

      const call = mockPrisma.auditoria.findMany.mock.calls[0][0];
      expect(call.where.createdAt.gte).toEqual(new Date('2026-01-01'));
      expect(call.where.createdAt.lt).toEqual(new Date('2027-01-01'));
    });

    it('debe aplicar búsqueda textual en auditoría', async () => {
      mockPrisma.auditoria.findMany.mockResolvedValue([]);
      mockPrisma.auditoria.count.mockResolvedValue(0);

      await service.findAllAuditoria({
        page: 1,
        limit: 20,
        search: 'cliente',
      });

      const call = mockPrisma.auditoria.findMany.mock.calls[0][0];
      expect(call.where.OR).toHaveLength(5);
      expect(call.where.OR[0].modelo.contains).toBe('cliente');
      expect(call.where.OR[3].usuario.is.nombre.contains).toBe('cliente');
    });
  });

  describe('findOneAuditoria', () => {
    it('debe retornar registro de auditoría', async () => {
      mockPrisma.auditoria.findUnique.mockResolvedValue(mockAuditoria);

      const result = await service.findOneAuditoria('aud-1');
      expect(result.accion).toBe('CREAR');
    });
    it('debe lanzar NotFoundException si no existe', async () => {
      mockPrisma.auditoria.findUnique.mockResolvedValue(null);
      await expect(service.findOneAuditoria('aud-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
