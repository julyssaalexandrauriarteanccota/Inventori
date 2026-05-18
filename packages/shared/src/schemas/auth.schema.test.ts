import { describe, expect, it } from 'vitest'

import { RolUsuario } from '../enums/roles.enum'
import {
  authResponseEnvelopeSchema,
  currentUserProfileEnvelopeSchema,
  loginRequestSchema,
  registerRequestSchema,
} from './auth.schema'

describe('auth schemas', () => {
  it('valida el payload de login', () => {
    const parsed = loginRequestSchema.parse({
      email: 'admin@erp.local',
      password: 'Admin123!',
    })

    expect(parsed.email).toBe('admin@erp.local')
  })

  it('rechaza emails invalidos en login', () => {
    expect(() =>
      loginRequestSchema.parse({
        email: 'correo-invalido',
        password: 'Admin123!',
      }),
    ).toThrow()
  })

  it('exige contrasena segura al registrarse', () => {
    expect(() =>
      registerRequestSchema.parse({
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@erp.local',
        password: 'password',
        confirmPassword: 'password',
      }),
    ).toThrow()

    const parsed = registerRequestSchema.parse({
      nombre: 'Admin',
      apellido: 'Sistema',
      email: 'admin@erp.local',
      password: 'Admin123!',
      confirmPassword: 'Admin123!',
    })

    expect(parsed.password).toBe('Admin123!')
  })

  it('valida la respuesta de login envuelta', () => {
    const parsed = authResponseEnvelopeSchema.parse({
      data: {
        accessToken: 'jwt',
        refreshToken: 'refresh',
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          nombre: 'Administrador',
          apellido: 'Sistema',
          email: 'admin@erp.local',
          rol: RolUsuario.ADMIN,
          mustChangePassword: true,
        },
      },
      meta: {
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data.user.rol).toBe(RolUsuario.ADMIN)
  })

  it('valida el perfil actual envuelto', () => {
    const parsed = currentUserProfileEnvelopeSchema.parse({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        nombre: 'Administrador',
        apellido: 'Sistema',
        email: 'admin@erp.local',
        rol: RolUsuario.ADMIN,
        activo: true,
        mustChangePassword: true,
        ultimoAcceso: null,
        createdAt: '2026-04-06T00:00:00.000Z',
      },
      meta: {
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data.activo).toBe(true)
  })
})
