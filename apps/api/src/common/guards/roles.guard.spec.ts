import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@erp/shared';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: {
    sub: string;
    email: string;
    rol: RolUsuario;
  }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn() as any,
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({}) as any,
      switchToWs: () => ({}) as any,
      getType: () => 'http',
    }) as unknown as ExecutionContext;

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow ADMIN access to ADMIN-only endpoint', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolUsuario.ADMIN]);
    const context = createMockContext({
      sub: 'uuid-1',
      email: 'admin@erp.local',
      rol: RolUsuario.ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny TECNICO access to ADMIN-only endpoint', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolUsuario.ADMIN]);
    const context = createMockContext({
      sub: 'uuid-2',
      email: 'tech@erp.local',
      rol: RolUsuario.TECNICO,
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow ENCARGADO access to multi-role endpoint', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolUsuario.ADMIN, RolUsuario.ENCARGADO]);
    const context = createMockContext({
      sub: 'uuid-3',
      email: 'enc@erp.local',
      rol: RolUsuario.ENCARGADO,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny when no user on request', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolUsuario.ADMIN]);
    const context = createMockContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });
});
