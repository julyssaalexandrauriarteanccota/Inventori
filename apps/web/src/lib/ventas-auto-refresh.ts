const VENTAS_AUTO_REFRESH_KEY = 'erp:ventas:auto-refresh'

export const DEFAULT_VENTAS_AUTO_REFRESH_INTERVAL = 60_000

interface VentasAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): VentasAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_VENTAS_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredVentasAutoRefreshPreference(): VentasAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(VENTAS_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<VentasAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_VENTAS_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredVentasAutoRefreshPreference(preference: VentasAutoRefreshPreference) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(VENTAS_AUTO_REFRESH_KEY, JSON.stringify(preference))
}
