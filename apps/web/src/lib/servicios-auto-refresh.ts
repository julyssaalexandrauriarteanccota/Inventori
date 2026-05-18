const SERVICIOS_AUTO_REFRESH_KEY = "erp:servicios:auto-refresh";

export const DEFAULT_SERVICIOS_AUTO_REFRESH_INTERVAL = 60_000;

interface ServiciosAutoRefreshPreference {
  enabled: boolean;
  interval: number;
}

function getDefaultPreference(): ServiciosAutoRefreshPreference {
  return {
    enabled: false,
    interval: DEFAULT_SERVICIOS_AUTO_REFRESH_INTERVAL,
  };
}

export function readStoredServiciosAutoRefreshPreference(): ServiciosAutoRefreshPreference {
  if (typeof window === "undefined") {
    return getDefaultPreference();
  }

  const rawValue = localStorage.getItem(SERVICIOS_AUTO_REFRESH_KEY);

  if (!rawValue) {
    return getDefaultPreference();
  }

  try {
    const parsedValue = JSON.parse(
      rawValue,
    ) as Partial<ServiciosAutoRefreshPreference>;

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === "number" &&
        Number.isFinite(parsedValue.interval) &&
        parsedValue.interval > 0
          ? parsedValue.interval
          : DEFAULT_SERVICIOS_AUTO_REFRESH_INTERVAL,
    };
  } catch {
    return getDefaultPreference();
  }
}

export function writeStoredServiciosAutoRefreshPreference(
  preference: ServiciosAutoRefreshPreference,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SERVICIOS_AUTO_REFRESH_KEY, JSON.stringify(preference));
}
