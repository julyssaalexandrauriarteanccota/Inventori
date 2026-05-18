import { RolUsuario } from "../enums/roles.enum";

export interface JwtPayload {
  sub: string;
  email: string;
  rol: RolUsuario;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
  mustChangePassword: boolean;
  telefono?: string | null;
  celular?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  cargo?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  password: string;
  confirmPassword: string;
}

export interface AuthMessageResponse {
  message: string;
  resetUrl?: string;
}

export interface CurrentUserProfile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  mustChangePassword: boolean;
  ultimoAcceso: string | null;
  telefono?: string | null;
  celular?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  cargo?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateOwnProfilePayload {
  telefono?: string;
  celular?: string;
  whatsapp?: string;
  direccion?: string;
  cargo?: string;
  bio?: string;
  avatarUrl?: string;
}
