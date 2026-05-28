import { Test, TestingModule } from '@nestjs/testing';
import { ReportesService } from './reportes.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ReportesService', () => {
  let service: ReportesService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      venta: {
        aggregate: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      ticket: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      alertaStock: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      cliente: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      almacenStock: {
        findMany: jest.fn(),
      },
      equipo: {
        findUnique: jest.fn(),
      },
      lecturaSNMP: {
        findMany: jest.fn(),
      },
      usuario: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
  });

  // ═══════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════

  describe('getDashboard', () => {
    it('debe retornar KPIs del mes actual', async () => {
      mockPrisma.venta.aggregate.mockResolvedValue({ _sum: { total: 15000 } });
      mockPrisma.venta.count.mockResolvedValue(8);
      mockPrisma.ticket.count
        .mockResolvedValueOnce(3) // abiertos
        .mockResolvedValueOnce(12); // cerrados mes
      mockPrisma.alertaStock.count.mockResolvedValue(2);
      mockPrisma.cliente.count.mockResolvedValue(5);

      const result = await service.getDashboard();

      expect(result.ventasMes.totalMonto).toBe(15000);
      expect(result.ventasMes.cantidad).toBe(8);
      expect(result.tickets.abiertos).toBe(3);
      expect(result.tickets.cerradosMes).toBe(12);
      expect(result.alertasStockPendientes).toBe(2);
      expect(result.clientesNuevosMes).toBe(5);
    });

    it('debe manejar valores null en aggregate', async () => {
      mockPrisma.venta.aggregate.mockResolvedValue({ _sum: { total: null } });
      mockPrisma.venta.count.mockResolvedValue(0);
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.alertaStock.count.mockResolvedValue(0);
      mockPrisma.cliente.count.mockResolvedValue(0);

      const result = await service.getDashboard();
      expect(result.ventasMes.totalMonto).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  //  REPORTE VENTAS
  // ═══════════════════════════════════════════

  describe('getReporteVentas', () => {
    it('debe retornar resumen de ventas', async () => {
      mockPrisma.venta.aggregate.mockResolvedValue({
        _sum: { total: 50000, igv: 9000, subtotal: 41000, descuento: 0 },
        _count: 25,
      });
      mockPrisma.venta.groupBy.mockResolvedValue([
        { estado: 'ORDEN_CONFIRMADA', _count: 15, _sum: { total: 30000 } },
        { estado: 'ENTREGADA', _count: 10, _sum: { total: 20000 } },
      ]);
      mockPrisma.venta.findMany.mockResolvedValue([]);

      const result = await service.getReporteVentas({});

      expect(result.resumen.totalVentas).toBe(25);
      expect(result.resumen.total).toBe(50000);
      expect(result.porEstado).toHaveLength(2);
    });

    it('debe filtrar por estado', async () => {
      mockPrisma.venta.aggregate.mockResolvedValue({
        _sum: { total: null, igv: null, subtotal: null, descuento: null },
        _count: 0,
      });
      mockPrisma.venta.groupBy.mockResolvedValue([]);
      mockPrisma.venta.findMany.mockResolvedValue([]);

      await service.getReporteVentas({ estado: 'ENTREGADA' });

      const call = mockPrisma.venta.aggregate.mock.calls[0][0];
      expect(call.where.estado).toBe('ENTREGADA');
    });

    it('debe filtrar por rango de fechas', async () => {
      mockPrisma.venta.aggregate.mockResolvedValue({
        _sum: { total: null, igv: null, subtotal: null, descuento: null },
        _count: 0,
      });
      mockPrisma.venta.groupBy.mockResolvedValue([]);
      mockPrisma.venta.findMany.mockResolvedValue([]);

      await service.getReporteVentas({
        fechaDesde: '2026-01-01',
        fechaHasta: '2026-06-30',
      });

      const call = mockPrisma.venta.aggregate.mock.calls[0][0];
      expect(call.where.createdAt.gte).toEqual(new Date('2026-01-01'));
      expect(call.where.createdAt.lte).toEqual(new Date('2026-06-30'));
    });
  });

  // ═══════════════════════════════════════════
  //  REPORTE STOCK
  // ═══════════════════════════════════════════

  describe('getReporteStock', () => {
    it('debe retornar alertas de stock', async () => {
      const alertas = [
        {
          id: 'a-1',
          productoId: 'p-1',
          almacenId: 'alm-1',
          stockActual: 2,
          stockMinimo: 10,
          resuelta: false,
          producto: { id: 'p-1', nombre: 'Toner', sku: 'TON-001' },
          almacen: { id: 'alm-1', nombre: 'Principal' },
        },
      ];
      mockPrisma.alertaStock.findMany.mockResolvedValue(alertas);

      const result = await service.getReporteStock({});

      expect(result.totalAlertas).toBe(1);
      expect(result.alertas).toHaveLength(1);
    });

    it('debe incluir stock bajo cuando se solicita', async () => {
      // El filtro stockBajo ahora se ejecuta en SQL (compara cantidad vs stockMinimo
      // en la misma query) y devuelve directamente las filas que están bajo el mínimo.
      mockPrisma.alertaStock.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 's-1',
          cantidad: 3,
          productoId: 'p-1',
          almacenId: 'alm-1',
          productoNombre: 'Toner',
          productoSku: 'TON-001',
          productoStockMinimo: 10,
          almacenNombre: 'Principal',
        },
      ]);

      const result = await service.getReporteStock({ stockBajo: true });

      expect(result.stockBajo).toHaveLength(1); // solo el toner está bajo
      expect(result.stockBajo?.[0].producto.sku).toBe('TON-001');
    });
  });

  // ═══════════════════════════════════════════
  //  REPORTE TICKETS
  // ═══════════════════════════════════════════

  describe('getReporteTickets', () => {
    it('debe retornar resumen de tickets agrupados', async () => {
      mockPrisma.ticket.groupBy
        .mockResolvedValueOnce([
          { estado: 'ABIERTO', _count: 5 },
          { estado: 'CERRADO', _count: 20 },
        ])
        .mockResolvedValueOnce([
          { prioridad: 'ALTA', _count: 3 },
          { prioridad: 'MEDIA', _count: 15 },
        ])
        .mockResolvedValueOnce([{ tecnicoId: 'tec-1', _count: 10 }]);
      mockPrisma.ticket.count.mockResolvedValue(25);
      mockPrisma.usuario.findMany.mockResolvedValue([
        { id: 'tec-1', nombre: 'Juan Técnico' },
      ]);

      const result = await service.getReporteTickets({});

      expect(result.total).toBe(25);
      expect(result.porEstado).toHaveLength(2);
      expect(result.porPrioridad).toHaveLength(2);
      expect(result.porTecnico).toHaveLength(1);
      expect(result.porTecnico[0].nombre).toBe('Juan Técnico');
    });

    it('debe filtrar por estado y técnico', async () => {
      mockPrisma.ticket.groupBy.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.usuario.findMany.mockResolvedValue([]);

      await service.getReporteTickets({
        estado: 'ABIERTO',
        tecnicoId: 'tec-1',
      });

      const call = mockPrisma.ticket.groupBy.mock.calls[0][0];
      expect(call.where.estado).toBe('ABIERTO');
      expect(call.where.tecnicoId).toBe('tec-1');
    });
  });

  // ═══════════════════════════════════════════
  //  REPORTE CLIENTES
  // ═══════════════════════════════════════════

  describe('getReporteClientes', () => {
    it('debe retornar clientes con totales paginados', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([
        {
          id: 'cli-1',
          razonSocial: 'Empresa A',
          dni: null,
          ruc: '20123456789',
          ventas: [{ total: 5000 }, { total: 3000 }],
          tickets: [{ id: 't-1' }],
        },
        {
          id: 'cli-2',
          razonSocial: 'Persona B',
          dni: '12345678',
          ruc: null,
          ventas: [{ total: 1000 }],
          tickets: [],
        },
      ]);
      mockPrisma.cliente.count.mockResolvedValue(2);

      const result = await service.getReporteClientes({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].totalComprado).toBe(8000); // sorted desc
      expect(result.data[0].cantidadVentas).toBe(2);
      expect(result.data[0].cantidadTickets).toBe(1);
      expect(result.meta.total).toBe(2);
    });
  });

  // ═══════════════════════════════════════════
  //  TELEMETRÍA SNMP
  // ═══════════════════════════════════════════

  describe('getTelemetria', () => {
    it('debe retornar telemetría de un equipo', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'A1234567',
        producto: { modelo: 'Bizhub C258' },
      });
      const lecturas = [
        {
          id: 'lec-1',
          equipoId: 'eq-1',
          timestamp: new Date(),
          nivelTonerNegro: 80,
          paginasTotales: 15000,
        },
      ];
      mockPrisma.lecturaSNMP.findMany.mockResolvedValue(lecturas);

      const result = await service.getTelemetria('A1234567', {});

      expect(result.equipo.serie).toBe('A1234567');
      expect(result.ultimaLectura).toEqual(lecturas[0]);
      expect(result.historial).toHaveLength(1);
    });

    it('debe lanzar NotFoundException si equipo no existe', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      await expect(service.getTelemetria('NOEXISTE', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe filtrar por rango de fechas', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        id: 'eq-1',
        numeroSerie: 'A1234567',
        producto: { modelo: 'Bizhub C258' },
      });
      mockPrisma.lecturaSNMP.findMany.mockResolvedValue([]);

      await service.getTelemetria('A1234567', {
        fechaDesde: '2026-01-01',
        fechaHasta: '2026-06-30',
      });

      const call = mockPrisma.lecturaSNMP.findMany.mock.calls[0][0];
      expect(call.where.timestamp.gte).toEqual(new Date('2026-01-01'));
      expect(call.where.timestamp.lte).toEqual(new Date('2026-06-30'));
    });
  });
});
