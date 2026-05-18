/// <reference types="jest" />
import 'reflect-metadata';

import { RolUsuario } from '@erp/shared';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../common/decorators';
import { AuthController } from './auth.controller';

describe('AuthController metadata', () => {
  it('marca login y endpoints publicos de auth', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.login),
    ).toBe(true);
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.register),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.forgotPassword,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.resetPassword,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.validateResetPasswordToken,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.refresh),
    ).toBe(true);
  });

  it('declara roles en endpoints auth protegidos', () => {
    const expectedRoles = [
      RolUsuario.ADMIN,
      RolUsuario.ENCARGADO,
      RolUsuario.TECNICO,
    ];

    expect(
      Reflect.getMetadata(ROLES_KEY, AuthController.prototype.logout),
    ).toEqual(expectedRoles);
    expect(
      Reflect.getMetadata(ROLES_KEY, AuthController.prototype.logoutAll),
    ).toEqual(expectedRoles);
    expect(
      Reflect.getMetadata(ROLES_KEY, AuthController.prototype.getProfile),
    ).toEqual(expectedRoles);
  });
});
