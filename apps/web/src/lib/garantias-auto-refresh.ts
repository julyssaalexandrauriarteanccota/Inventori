const GARANTIAS_AUTO_REFRESH_KEY = 'erp:garantias:auto-refresh'

export const DEFAULT_GARANTIAS_AUTO_REFRESH_INTERVAL = 60_000

interface GarantiasAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): GarantiasAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_GARANTIAS_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredGarantiasAutoRefreshPreference(): GarantiasAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(GARANTIAS_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<GarantiasAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_GARANTIAS_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredGarantiasAutoRefreshPreference(preference: GarantiasAutoRefreshPreference) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(GARANTIAS_AUTO_REFRESH_KEY, JSON.stringify(preference))
}