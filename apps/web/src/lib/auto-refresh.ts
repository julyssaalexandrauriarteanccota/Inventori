export interface AutoRefreshPreference {
  enabled: boolean;
  interval: number;
}

export type AutoRefreshQueryKey = readonly unknown[];

export const DEFAULT_AUTO_REFRESH_INTERVAL = 60_000;

export const DEFAULT_AUTO_REFRESH_INTERVALS = [
  { label: "30 seg", value: 30_000 },
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
  { label: "15 min", value: 900_000 },
] as const;

const AUTO_REFRESH_QUERY_KEYS_BY_SCOPE: Record<
  string,
  readonly AutoRefreshQueryKey[]
> = {
  auditoria: [["configuracion", "auditoria"]],
  clientes: [["clientes"]],
  compras: [["compras"], ["inventario"]],
  equipos: [["equipos"]],
  garantias: [["garantias"], ["tickets"]],
  inventario: [["inventario"], ["reportes", "stock"]],
  productos: [
    ["productos"],
    ["categorias"],
    ["marcas"],
    ["modelos-catalogo"],
    ["unidades-medida"],
  ],
  proveedores: [["proveedores"]],
  "reporte-inventario": [["inventario"], ["reportes", "stock"]],
  "reporte-soporte": [["tickets"], ["reportes", "tickets"]],
  "reporte-ventas": [["ventas"], ["reportes", "ventas"]],
  servicios: [["productos"], ["categorias"], ["unidades-medida"]],
  soporte: [["tickets"], ["reportes", "tickets"]],
  ventas: [["ventas"], ["caja"]],
};

function getDefaultPreference(
  interval = DEFAULT_AUTO_REFRESH_INTERVAL,
): AutoRefreshPreference {
  return {
    enabled: false,
    interval,
  };
}

export function getAutoRefreshStorageKey(scope: string) {
  return `erp:${scope}:auto-refresh`;
}

export function getAutoRefreshQueryKeys(
  scope: string,
): readonly AutoRefreshQueryKey[] {
  return AUTO_REFRESH_QUERY_KEYS_BY_SCOPE[scope] ?? [[scope]];
}

export function readStoredAutoRefreshPreference(
  scope: string,
  defaultInterval = DEFAULT_AUTO_REFRESH_INTERVAL,
): AutoRefreshPreference {
  if (typeof window === "undefined") {
    return getDefaultPreference(defaultInterval);
  }

  const rawValue = localStorage.getItem(getAutoRefreshStorageKey(scope));

  if (!rawValue) {
    return getDefaultPreference(defaultInterval);
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<AutoRefreshPreference>;

    return {
      enabled: parsedValue.enabled === true,
      interval:
        typeof parsedValue.interval === "number" &&
        Number.isFinite(parsedValue.interval) &&
        parsedValue.interval > 0
          ? parsedValue.interval
          : defaultInterval,
    };
  } catch {
    return getDefaultPreference(defaultInterval);
  }
}

export function writeStoredAutoRefreshPreference(
  scope: string,
  preference: AutoRefreshPreference,
) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    getAutoRefreshStorageKey(scope),
    JSON.stringify(preference),
  );
}

export function clearStoredAutoRefreshPreference(scope: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(getAutoRefreshStorageKey(scope));
}

export function getAutoRefreshIntervalLabel(
  interval: number,
  intervals: readonly {
    label: string;
    value: number;
  }[] = DEFAULT_AUTO_REFRESH_INTERVALS,
) {
  return (
    intervals.find((option) => option.value === interval)?.label ??
    "intervalo actual"
  );
}
