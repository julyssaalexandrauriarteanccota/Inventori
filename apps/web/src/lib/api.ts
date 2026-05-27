import { getRefreshToken, getToken, setTokens, clearTokens } from './auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

interface FetchOptions extends Omit<RequestInit, 'body'> {
  token?: string
  body?: unknown
  skipAuth?: boolean
}

interface ApiErrorPayload {
  code?: string
  message?: string
  statusCode?: number
  [key: string]: unknown
}

interface ApiErrorResponse {
  error?: ApiErrorPayload
}

export class ApiError extends Error {
  code: string
  statusCode: number
  details?: ApiErrorPayload

  constructor(message: string, statusCode: number, code?: string, details?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code || 'UNKNOWN_ERROR'
    this.details = details
  }
}

export function isApiConnectionError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.code === 'API_CONNECTION_ERROR' || error.statusCode === 0)
  )
}

function toConnectionError(error: unknown) {
  if (error instanceof ApiError) return error

  return new ApiError(
    'No se pudo conectar con el servidor API. Revisa que el backend este levantado.',
    0,
    'API_CONNECTION_ERROR',
    { cause: error instanceof Error ? error.message : String(error) },
  )
}

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function parseResponseJson<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  const raw = await response.text()
  if (!raw.trim()) {
    return undefined as T
  }

  return JSON.parse(raw) as T
}

function filenameFromContentDisposition(value: string | null) {
  if (!value) return null
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
  const asciiMatch = value.match(/filename="?([^";]+)"?/i)
  return asciiMatch?.[1] ?? null
}

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) return false

    const json = await res.json()
    const data = json.data ?? json

    if (data.accessToken && data.refreshToken) {
      setTokens(data.accessToken, data.refreshToken)
      return true
    }
    return false
  } catch (error) {
    throw toConnectionError(error)
  }
}

async function handleRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = attemptRefresh().finally(() => {
    isRefreshing = false
    refreshPromise = null
  })

  return refreshPromise
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, body, skipAuth, ...rest } = options

  const authToken = token || (!skipAuth ? getToken() : null)

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(headers as Record<string, string>),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...rest,
    })
  } catch (error) {
    throw toConnectionError(error)
  }

  if (res.status === 401 && !skipAuth && !endpoint.includes('/auth/')) {
    const refreshed = await handleRefresh()

    if (refreshed) {
      const newToken = getToken()
      let retryRes: Response
      try {
        retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
            ...(headers as Record<string, string>),
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
          ...rest,
        })
      } catch (error) {
        throw toConnectionError(error)
      }

      if (!retryRes.ok) {
        const errorData: ApiErrorResponse = await retryRes.json().catch(() => ({}))
        throw new ApiError(
          errorData.error?.message || retryRes.statusText,
          retryRes.status,
          errorData.error?.code,
          errorData.error,
        )
      }

      return parseResponseJson<T>(retryRes)
    }

    clearTokens()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    throw new ApiError('Sesion expirada', 401, 'SESSION_EXPIRED')
  }

  if (!res.ok) {
    const errorData: ApiErrorResponse = await res.json().catch(() => ({}))
    throw new ApiError(
      errorData.error?.message || res.statusText,
      res.status,
      errorData.error?.code,
      errorData.error,
    )
  }

  return parseResponseJson<T>(res)
}

async function fetchApiBlob(endpoint: string, options: FetchOptions = {}) {
  const { token, headers, body: _body, skipAuth, ...rest } = options
  const authToken = token || (!skipAuth ? getToken() : null)

  const request = async (currentToken: string | null) => {
    try {
      return await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          ...(headers as Record<string, string>),
        },
        ...rest,
      })
    } catch (error) {
      throw toConnectionError(error)
    }
  }

  let res = await request(authToken)

  if (res.status === 401 && !skipAuth && !endpoint.includes('/auth/')) {
    const refreshed = await handleRefresh()
    if (refreshed) {
      res = await request(getToken())
    } else {
      clearTokens()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
      throw new ApiError('Sesion expirada', 401, 'SESSION_EXPIRED')
    }
  }

  if (!res.ok) {
    const errorData: ApiErrorResponse = await res.json().catch(() => ({}))
    throw new ApiError(
      errorData.error?.message || res.statusText,
      res.status,
      errorData.error?.code,
      errorData.error,
    )
  }

  return {
    blob: await res.blob(),
    filename: filenameFromContentDisposition(res.headers.get('content-disposition')),
    contentType: res.headers.get('content-type'),
  }
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { ...options, method: 'POST', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),

  download: (endpoint: string, options?: FetchOptions) =>
    fetchApiBlob(endpoint, { ...options, method: 'GET' }),

  upload: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const token = getToken()
    let res: Response
    try {
      res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
    } catch (error) {
      throw toConnectionError(error)
    }
    if (!res.ok) {
      const errorData: ApiErrorResponse = await res.json().catch(() => ({}))
      throw new ApiError(
        errorData.error?.message || res.statusText,
        res.status,
        errorData.error?.code,
        errorData.error,
      )
    }
    return parseResponseJson<T>(res)
  },
}

const IMAGE_ASSET_EXTENSION = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i

function normalizeAssetInput(path: string) {
  return path.trim().replace(/\\/g, '/')
}

function safeDecodeAssetPath(path: string) {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function looksLikeImageAsset(path: string) {
  return IMAGE_ASSET_EXTENSION.test(path)
}

function buildApiAssetBaseMeta() {
  const apiUrl = new URL(API_BASE_URL)
  return {
    origin: apiUrl.origin,
    apiPathname: apiUrl.pathname.replace(/\/+$/, ''),
  }
}

export function getApiAssetUrlCandidates(path: string) {
  const raw = normalizeAssetInput(path)
  if (!raw) {
    return []
  }

  const decoded = safeDecodeAssetPath(raw)
  if (/^(https?:|blob:|data:)/i.test(decoded)) {
    return [decoded]
  }

  const { origin, apiPathname } = buildApiAssetBaseMeta()
  const normalized = decoded.replace(/\/{2,}/g, '/')
  const normalizedWithoutLeadingSlash = normalized.replace(/^\/+/, '')
  const basename =
    normalizedWithoutLeadingSlash.split('/').filter(Boolean).at(-1) ??
    normalizedWithoutLeadingSlash
  const publicTail = normalizedWithoutLeadingSlash.replace(/^uploads\/(?:public\/)?/i, '')
  const isImageAsset = looksLikeImageAsset(normalized)
  const candidates = new Set<string>()

  const add = (candidate?: string | null) => {
    if (candidate) {
      candidates.add(candidate)
    }
  }

  if (/^https?:/i.test(normalized)) {
    add(normalized)
  }

  if (normalized.startsWith(`${origin}${apiPathname}/`)) {
    add(normalized)
  }

  if (/^\/api\/v\d+\//i.test(normalized)) {
    add(`${origin}${normalized}`)
  }

  if (/^api\/v\d+\//i.test(normalizedWithoutLeadingSlash)) {
    add(`${origin}/${normalizedWithoutLeadingSlash}`)
  }

  if (normalized.startsWith('/uploads/public/')) {
    add(`${API_BASE_URL}${normalized}`)
    add(`${origin}${normalized}`)
  }

  if (normalized.startsWith('/uploads/')) {
    if (isImageAsset) {
      add(`${API_BASE_URL}/uploads/public/${normalized.replace(/^\/uploads\/(?:public\/)?/i, '')}`)
      add(`${origin}/uploads/public/${normalized.replace(/^\/uploads\/(?:public\/)?/i, '')}`)
    }
    add(`${API_BASE_URL}${normalized}`)
    add(`${origin}${normalized}`)
  }

  if (normalizedWithoutLeadingSlash.startsWith('uploads/public/')) {
    add(`${API_BASE_URL}/${normalizedWithoutLeadingSlash}`)
    add(`${origin}/${normalizedWithoutLeadingSlash}`)
  }

  if (normalizedWithoutLeadingSlash.startsWith('uploads/')) {
    if (isImageAsset) {
      add(`${API_BASE_URL}/uploads/public/${publicTail}`)
      add(`${origin}/uploads/public/${publicTail}`)
    }
    add(`${API_BASE_URL}/${normalizedWithoutLeadingSlash}`)
    add(`${origin}/${normalizedWithoutLeadingSlash}`)
  }

  if (normalized.startsWith('/')) {
    add(`${API_BASE_URL}${normalized}`)
    add(`${origin}${normalized}`)
  }

  if (basename) {
    if (isImageAsset) {
      add(`${API_BASE_URL}/uploads/public/${basename}`)
      add(`${origin}/uploads/public/${basename}`)
    }
    add(`${API_BASE_URL}/uploads/${basename}`)
    add(`${origin}/uploads/${basename}`)
  }

  return Array.from(candidates)
}

export function getApiAssetUrl(path: string) {
  const candidates = getApiAssetUrlCandidates(path)
  if (candidates.length > 0) {
    return candidates[0]
  }

  return path
}
