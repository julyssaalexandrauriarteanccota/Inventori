const TOKEN_KEY = 'erp_token'
const REFRESH_KEY = 'erp_refresh_token'
const AUTH_COOKIE = 'erp_authenticated'

import { clearStoredClientesAutoRefreshPreference } from '@/lib/clientes-auto-refresh'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setTokens(token: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  clearStoredClientesAutoRefreshPreference()
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}
