import { z } from 'zod'

import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
  PASSWORD_REQUIREMENTS_TEXT,
} from '../constants/password-policy'
import { RolUsuario } from '../enums/roles.enum'

export const apiMetaSchema = z.object({
  timestamp: z.string().datetime(),
})

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const securePasswordSchema = z
  .string()
  .regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE)

export const registerRequestSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    apellido: z.string().min(1, 'El apellido es obligatorio'),
    email: z.string().email('Ingresa un correo valido'),
    password: securePasswordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contrasena'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  })

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
})

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Ingresa un correo valido'),
})

export const resetPasswordRequestSchema = z
  .object({
    token: z.string().min(1, 'Token requerido'),
    password: securePasswordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contrasena'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  })

export const changePasswordRequestSchema = z
  .object({
    password: securePasswordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contrasena'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  })

export const authUserSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email(),
  rol: z.nativeEnum(RolUsuario),
  mustChangePassword: z.boolean(),
})

export const authResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: authUserSchema,
})

export const currentUserProfileSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email(),
  rol: z.nativeEnum(RolUsuario),
  activo: z.boolean(),
  mustChangePassword: z.boolean(),
  ultimoAcceso: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})

export const authResponseEnvelopeSchema = z.object({
  data: authResponseSchema,
  meta: apiMetaSchema,
})

export const currentUserProfileEnvelopeSchema = z.object({
  data: currentUserProfileSchema,
  meta: apiMetaSchema,
})

export const logoutResponseEnvelopeSchema = z.object({
  data: z.null().optional(),
  meta: apiMetaSchema,
})

export const authMessageSchema = z.object({
  message: z.string().min(1),
  resetUrl: z.string().url().optional(),
})

export const authMessageEnvelopeSchema = z.object({
  data: authMessageSchema,
  meta: apiMetaSchema,
})

export const passwordRequirementsText = PASSWORD_REQUIREMENTS_TEXT

export type LoginRequestSchema = z.infer<typeof loginRequestSchema>
export type RegisterRequestSchema = z.infer<typeof registerRequestSchema>
export type RefreshRequestSchema = z.infer<typeof refreshRequestSchema>
export type ForgotPasswordRequestSchema = z.infer<typeof forgotPasswordRequestSchema>
export type ResetPasswordRequestSchema = z.infer<typeof resetPasswordRequestSchema>
export type ChangePasswordRequestSchema = z.infer<typeof changePasswordRequestSchema>
export type AuthUserSchema = z.infer<typeof authUserSchema>
export type AuthResponseSchema = z.infer<typeof authResponseSchema>
export type CurrentUserProfileSchema = z.infer<typeof currentUserProfileSchema>
export type AuthMessageSchema = z.infer<typeof authMessageSchema>
