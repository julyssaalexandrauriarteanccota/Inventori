const COMPRAS_AUTO_REFRESH_KEY = 'erp:compras:auto-refresh'

export const DEFAULT_COMPRAS_AUTO_REFRESH_INTERVAL = 60_000

interface ComprasAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): ComprasAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_COMPRAS_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredComprasAutoRefreshPreference(): ComprasAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(COMPRAS_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<ComprasAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_COMPRAS_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredComprasAutoRefreshPreference(preference: ComprasAutoRefreshPreference) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(COMPRAS_AUTO_REFRESH_KEY, JSON.stringify(preference))
}
