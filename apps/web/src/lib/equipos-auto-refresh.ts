const EQUIPOS_AUTO_REFRESH_KEY = 'erp:equipos:auto-refresh'

export const DEFAULT_EQUIPOS_AUTO_REFRESH_INTERVAL = 60_000

interface EquiposAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): EquiposAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_EQUIPOS_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredEquiposAutoRefreshPreference(): EquiposAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(EQUIPOS_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<EquiposAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_EQUIPOS_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredEquiposAutoRefreshPreference(preference: EquiposAutoRefreshPreference) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(EQUIPOS_AUTO_REFRESH_KEY, JSON.stringify(preference))
}
