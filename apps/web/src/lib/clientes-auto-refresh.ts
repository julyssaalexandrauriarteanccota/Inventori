const CLIENTES_AUTO_REFRESH_KEY = 'erp:clientes:auto-refresh'

export const DEFAULT_CLIENTES_AUTO_REFRESH_INTERVAL = 60_000

interface ClientesAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): ClientesAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_CLIENTES_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredClientesAutoRefreshPreference(): ClientesAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(CLIENTES_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<ClientesAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_CLIENTES_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredClientesAutoRefreshPreference(preference: ClientesAutoRefreshPreference) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(CLIENTES_AUTO_REFRESH_KEY, JSON.stringify(preference))
}

export function clearStoredClientesAutoRefreshPreference() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(CLIENTES_AUTO_REFRESH_KEY)
}