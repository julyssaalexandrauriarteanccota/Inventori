import { RolUsuario } from '@erp/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  rol: RolUsuario;
  sv: number;
  iat: number;
  exp: number;
}
