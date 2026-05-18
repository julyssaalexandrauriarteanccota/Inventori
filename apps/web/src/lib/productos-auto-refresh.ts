const PRODUCTOS_AUTO_REFRESH_KEY = 'erp:productos:auto-refresh'

export const DEFAULT_PRODUCTOS_AUTO_REFRESH_INTERVAL = 60_000

interface ProductosAutoRefreshPreference {
  enabled: boolean
  interval: number
}

function getDefaultPreference(): ProductosAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_PRODUCTOS_AUTO_REFRESH_INTERVAL,
  }
}

export function readStoredProductosAutoRefreshPreference(): ProductosAutoRefreshPreference {
  if (typeof window === 'undefined') {
    return getDefaultPreference()
  }

  const rawValue = localStorage.getItem(PRODUCTOS_AUTO_REFRESH_KEY)

  if (!rawValue) {
    return getDefaultPreference()
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<ProductosAutoRefreshPreference>

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === 'number' && Number.isFinite(parsedValue.interval) && parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_PRODUCTOS_AUTO_REFRESH_INTERVAL,
    }
  } catch {
    return getDefaultPreference()
  }
}

export function writeStoredProductosAutoRefreshPreference(
  preference: ProductosAutoRefreshPreference,
): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PRODUCTOS_AUTO_REFRESH_KEY, JSON.stringify(preference))
}
