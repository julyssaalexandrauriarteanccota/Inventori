import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
}))

vi.mock('./auth', () => authMocks)

import { api, getApiAssetUrl } from './api'

describe('api refresh flow', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('reintenta la solicitud cuando refresh devuelve nuevos tokens', async () => {
    authMocks.getToken.mockReturnValueOnce('expired-token').mockReturnValue('new-token')
    authMocks.getRefreshToken.mockReturnValue('refresh-token')

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { accessToken: 'new-token', refreshToken: 'new-refresh-token' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: '1' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    const response = await api.get<{ data: Array<{ id: string }> }>('/clientes')

    expect(response).toEqual({ data: [{ id: '1' }] })
    expect(authMocks.setTokens).toHaveBeenCalledWith('new-token', 'new-refresh-token')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('limpia sesion y emite evento cuando refresh falla', async () => {
    authMocks.getToken.mockReturnValue('expired-token')
    authMocks.getRefreshToken.mockReturnValue('refresh-token')

    const expiredHandler = vi.fn()
    window.addEventListener('auth:expired', expiredHandler)

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Refresh failed' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    await expect(api.get('/clientes')).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
      statusCode: 401,
    })

    expect(authMocks.clearTokens).toHaveBeenCalledTimes(1)
    expect(expiredHandler).toHaveBeenCalledTimes(1)

    window.removeEventListener('auth:expired', expiredHandler)
  })

  it('reporta caida de conexion sin limpiar sesion', async () => {
    authMocks.getToken.mockReturnValue('token-vigente')
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

    await expect(api.get('/auth/me')).rejects.toMatchObject({
      code: 'API_CONNECTION_ERROR',
      statusCode: 0,
    })

    expect(authMocks.clearTokens).not.toHaveBeenCalled()
  })
})

describe('getApiAssetUrl', () => {
  it('normaliza rutas publicas sin slash inicial', () => {
    expect(getApiAssetUrl('uploads/public/foto.jpg')).toBe(
      'http://localhost:4000/api/v1/uploads/public/foto.jpg',
    )
  })

  it('reconvierte rutas privadas antiguas de imagen a publicas', () => {
    expect(getApiAssetUrl('/uploads/foto.jpg')).toBe(
      'http://localhost:4000/api/v1/uploads/public/foto.jpg',
    )
  })

  it('mantiene enlaces absolutos externos', () => {
    expect(getApiAssetUrl('https://cdn.example.com/productos/foto.jpg')).toBe(
      'https://cdn.example.com/productos/foto.jpg',
    )
  })

  it('mantiene endpoints api no relacionados a uploads', () => {
    expect(getApiAssetUrl('/facturacion/comprobantes/abc/pdf')).toBe(
      'http://localhost:4000/api/v1/facturacion/comprobantes/abc/pdf',
    )
  })
})
