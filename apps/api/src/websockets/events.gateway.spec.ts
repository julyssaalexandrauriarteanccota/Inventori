import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { RolUsuario } from '@erp/shared';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let mockJwtService: { verify: jest.Mock };

  beforeEach(() => {
    mockJwtService = { verify: jest.fn() };
    const mockConfig = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    gateway = new EventsGateway(
      mockJwtService as unknown as JwtService,
      mockConfig,
    );
  });

  it('authenticates client with valid token and joins rooms', async () => {
    const mockJoin = jest.fn();
    const mockDisconnect = jest.fn();
    const client = {
      id: 'socket-1',
      handshake: { auth: { token: 'valid-jwt' }, headers: {} },
      data: {},
      join: mockJoin,
      disconnect: mockDisconnect,
    } as any;

    mockJwtService.verify.mockReturnValue({
      sub: 'user-abc',
      email: 'test@mail.com',
      rol: RolUsuario.ADMIN,
    });

    await gateway.handleConnection(client);

    expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt', {
      secret: 'test-secret',
    });
    expect(client.data.userId).toBe('user-abc');
    expect(client.data.rol).toBe(RolUsuario.ADMIN);
    expect(mockJoin).toHaveBeenCalledWith('user:user-abc');
    expect(mockJoin).toHaveBeenCalledWith(`role:${RolUsuario.ADMIN}`);
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('disconnects client with no token', async () => {
    const mockDisconnect = jest.fn();
    const client = {
      id: 'socket-2',
      handshake: { auth: {}, headers: {} },
      data: {},
      disconnect: mockDisconnect,
    } as any;

    await gateway.handleConnection(client);

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('disconnects client with invalid token', async () => {
    const mockDisconnect = jest.fn();
    const client = {
      id: 'socket-3',
      handshake: { auth: { token: 'bad-token' }, headers: {} },
      data: {},
      disconnect: mockDisconnect,
    } as any;

    mockJwtService.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    await gateway.handleConnection(client);

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('reads token from Authorization header if not in auth', async () => {
    const mockJoin = jest.fn();
    const client = {
      id: 'socket-4',
      handshake: {
        auth: {},
        headers: { authorization: 'Bearer header-token' },
      },
      data: {},
      join: mockJoin,
      disconnect: jest.fn(),
    } as any;

    mockJwtService.verify.mockReturnValue({
      sub: 'user-xyz',
      email: 'user@mail.com',
      rol: RolUsuario.TECNICO,
    });

    await gateway.handleConnection(client);

    expect(mockJwtService.verify).toHaveBeenCalledWith('header-token', {
      secret: 'test-secret',
    });
    expect(mockJoin).toHaveBeenCalledWith('user:user-xyz');
  });
});
