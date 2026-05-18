const FACTURACION_AUTO_REFRESH_KEY = 'erp:facturacion:auto-refresh'

export const DEFAULT_FACTURACION_AUTO_REFRESH_INTERVAL = 60_000

interface FacturacionAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): FacturacionAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_FACTURACION_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredFacturacionAutoRefreshPreference(): FacturacionAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(FACTURACION_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<FacturacionAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_FACTURACION_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredFacturacionAutoRefreshPreference(preference: FacturacionAutoRefreshPreference) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(FACTURACION_AUTO_REFRESH_KEY, JSON.stringify(preference))
}
