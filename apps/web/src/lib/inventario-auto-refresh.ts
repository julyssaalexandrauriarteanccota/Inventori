const INVENTARIO_AUTO_REFRESH_KEY = 'erp:inventario:auto-refresh'

export const DEFAULT_INVENTARIO_AUTO_REFRESH_INTERVAL = 60_000

interface InventarioAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): InventarioAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_INVENTARIO_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredInventarioAutoRefreshPreference(): InventarioAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(INVENTARIO_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<InventarioAutoRefreshPreference>

    if (typeof parsedValue !== 'object' || parsedValue === null) {
      return getDefaultPreference()
    }

    return {
      enabled: typeof parsedValue.enabled === 'boolean' ? parsedValue.enabled : false,
      interval: typeof parsedValue.interval === 'number' && parsedValue.interval > 0
        ? parsedValue.interval
        : DEFAULT_INVENTARIO_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredInventarioAutoRefreshPreference(
  preference: InventarioAutoRefreshPreference,
): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(INVENTARIO_AUTO_REFRESH_KEY, JSON.stringify(preference))
}
