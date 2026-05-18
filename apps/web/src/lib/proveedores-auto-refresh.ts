const PROVEEDORES_AUTO_REFRESH_KEY = 'erp:proveedores:auto-refresh'

export const DEFAULT_PROVEEDORES_AUTO_REFRESH_INTERVAL = 60_000

interface ProveedoresAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): ProveedoresAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_PROVEEDORES_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredProveedoresAutoRefreshPreference(): ProveedoresAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(PROVEEDORES_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<ProveedoresAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_PROVEEDORES_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredProveedoresAutoRefreshPreference(preference: ProveedoresAutoRefreshPreference) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(PROVEEDORES_AUTO_REFRESH_KEY, JSON.stringify(preference))
}
