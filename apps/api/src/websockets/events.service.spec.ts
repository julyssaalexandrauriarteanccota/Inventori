import { EventsService } from './events.service';
import { EventsGateway } from './events.gateway';
import { RolUsuario, SocketEvents } from '@erp/shared';

describe('EventsService', () => {
  let service: EventsService;
  let mockServer: { to: jest.Mock; emit: jest.Mock };

  beforeEach(() => {
    const mockEmit = jest.fn();
    mockServer = {
      to: jest.fn().mockReturnValue({ emit: mockEmit }),
      emit: jest.fn(),
    };

    const mockGateway = { server: mockServer } as unknown as EventsGateway;
    service = new EventsService(mockGateway);
  });

  it('emitToUser sends to correct room', () => {
    const payload = {
      ticketId: '1',
      codigo: 'T-001',
      titulo: 'Test',
      estado: 'ABIERTO',
    };
    service.emitToUser('user-123', SocketEvents.TICKET_CREATED, payload);

    expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
    expect(mockServer.to('user:user-123').emit).toHaveBeenCalledWith(
      SocketEvents.TICKET_CREATED,
      payload,
    );
  });

  it('emitToRole sends to correct room', () => {
    const payload = {
      alertaId: '1',
      productoId: 'p1',
      productoNombre: 'Toner',
      productoSku: 'SKU-1',
      almacenId: 'a1',
      almacenNombre: 'Principal',
      stockActual: 2,
      stockMinimo: 5,
    };
    service.emitToRole(RolUsuario.ADMIN, SocketEvents.STOCK_ALERTA, payload);

    expect(mockServer.to).toHaveBeenCalledWith(`role:${RolUsuario.ADMIN}`);
  });

  it('emitToRoles sends to multiple roles', () => {
    const payload = {
      comprobanteId: 'c1',
      numero: 'F001-1',
      tipo: 'FACTURA',
      estado: 'ACEPTADO',
      clienteNombre: 'Test',
      total: 100,
    };
    service.emitToRoles(
      [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
      SocketEvents.COMPROBANTE_ACEPTADO,
      payload,
    );

    expect(mockServer.to).toHaveBeenCalledWith(`role:${RolUsuario.ADMIN}`);
    expect(mockServer.to).toHaveBeenCalledWith(`role:${RolUsuario.ENCARGADO}`);
  });

  it('emitToAll broadcasts to all clients', () => {
    const payload = {
      ticketId: '1',
      codigo: 'T-001',
      titulo: 'Test',
      estado: 'CERRADO',
    };
    service.emitToAll(SocketEvents.TICKET_CLOSED, payload);

    expect(mockServer.emit).toHaveBeenCalledWith(
      SocketEvents.TICKET_CLOSED,
      payload,
    );
  });

  it('does not throw when server is undefined', () => {
    const mockGateway = { server: undefined } as unknown as EventsGateway;
    const safeService = new EventsService(mockGateway);

    expect(() =>
      safeService.emitToUser('user-1', SocketEvents.TICKET_CREATED, {}),
    ).not.toThrow();
  });
});
