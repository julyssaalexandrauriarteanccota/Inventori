const AUDITORIA_AUTO_REFRESH_KEY = 'erp:auditoria:auto-refresh'

export const DEFAULT_AUDITORIA_AUTO_REFRESH_INTERVAL = 60_000

interface AuditoriaAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): AuditoriaAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_AUDITORIA_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredAuditoriaAutoRefreshPreference(): AuditoriaAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(AUDITORIA_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<AuditoriaAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_AUDITORIA_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredAuditoriaAutoRefreshPreference(
  preference: AuditoriaAutoRefreshPreference,
) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(AUDITORIA_AUTO_REFRESH_KEY, JSON.stringify(preference))
}