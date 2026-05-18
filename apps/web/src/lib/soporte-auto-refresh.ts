const SOPORTE_AUTO_REFRESH_KEY = 'erp:soporte:auto-refresh'

export const DEFAULT_SOPORTE_AUTO_REFRESH_INTERVAL = 60_000

interface SoporteAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): SoporteAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_SOPORTE_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredSoporteAutoRefreshPreference(): SoporteAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(SOPORTE_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<SoporteAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_SOPORTE_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredSoporteAutoRefreshPreference(preference: SoporteAutoRefreshPreference) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(SOPORTE_AUTO_REFRESH_KEY, JSON.stringify(preference))
}
