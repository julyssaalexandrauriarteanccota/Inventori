import { EstadoComprobante } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from '../../websockets/events.service';
import { SunatMonitorService } from './sunat-monitor.service';

const mockPrisma = {
  comprobante: { findMany: jest.fn() },
  comprobanteEnvioLog: { create: jest.fn() },
  certificadoDigital: { findMany: jest.fn() },
} as unknown as PrismaService;

const mockEvents = {
  emitToRoles: jest.fn(),
} as unknown as EventsService;

const mockQueue = {
  add: jest.fn(),
} as unknown as import('bullmq').Queue;

const mockConsultaQueue = {
  add: jest.fn(),
} as unknown as import('bullmq').Queue;

describe('SunatMonitorService', () => {
  let service: SunatMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SunatMonitorService(
      mockPrisma,
      mockEvents,
      mockQueue,
      mockConsultaQueue,
    );
  });

  describe('checkPlazosVencimiento', () => {
    it('re-encola PENDIENTE_ENVIO con prioridad alta', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      (mockPrisma.comprobante.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'cp-1',
          numero: 'F001-1',
          tipo: 'FACTURA',
          estado: EstadoComprobante.PENDIENTE_ENVIO,
          fechaVencimientoPlazo: future,
        },
      ]);

      await service.checkPlazosVencimiento();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'enviar-comprobante',
        expect.objectContaining({ comprobanteId: 'cp-1' }),
        expect.objectContaining({ priority: 1, attempts: 4 }),
      );
      expect(mockPrisma.comprobanteEnvioLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipoEvento: 'REINTENTO',
            proveedor: 'MONITOR',
          }),
        }),
      );
    });

    it('fuerza consulta de estado para EN_PROCESO_SUNAT en cola-consulta-ticket', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      (mockPrisma.comprobante.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'cp-2',
          numero: 'F001-2',
          tipo: 'FACTURA',
          estado: EstadoComprobante.EN_PROCESO_SUNAT,
          fechaVencimientoPlazo: future,
        },
      ]);

      await service.checkPlazosVencimiento();

      // La consulta forzada va a cola-consulta-ticket, no a cola-envio-cpe.
      expect(mockConsultaQueue.add).toHaveBeenCalledWith(
        'consultar-estado-comprobante',
        expect.objectContaining({ comprobanteId: 'cp-2', forzado: true }),
        expect.objectContaining({ priority: 1 }),
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('para REQUIERE_REVISION solo loggea + alerta, no re-encola', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      (mockPrisma.comprobante.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'cp-3',
          numero: 'F001-3',
          tipo: 'FACTURA',
          estado: EstadoComprobante.REQUIERE_REVISION,
          fechaVencimientoPlazo: future,
        },
      ]);

      await service.checkPlazosVencimiento();

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockPrisma.comprobanteEnvioLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipoEvento: 'REQUIERE_REVISION',
            proveedor: 'MONITOR',
          }),
        }),
      );
      expect(mockEvents.emitToRoles).toHaveBeenCalled();
    });

    it('no hace nada si la lista está vacía', async () => {
      (mockPrisma.comprobante.findMany as jest.Mock).mockResolvedValue([]);
      await service.checkPlazosVencimiento();
      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockPrisma.comprobanteEnvioLog.create).not.toHaveBeenCalled();
    });
  });

  describe('checkCertificadosVencimiento', () => {
    it('alerta certificados próximos a vencer', async () => {
      const en15Dias = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      (mockPrisma.certificadoDigital.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'cert-1',
          nombre: 'Cert SUNAT 2026',
          validoHasta: en15Dias,
          configEmpresaFiscalId: 'cfg-1',
        },
      ]);

      await service.checkCertificadosVencimiento();

      expect(mockEvents.emitToRoles).toHaveBeenCalled();
    });
  });
});
