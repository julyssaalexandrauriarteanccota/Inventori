import { RolUsuario } from '@erp/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  rol: RolUsuario;
  iat: number;
  exp: number;
}
