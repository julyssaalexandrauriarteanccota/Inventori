import type { NavBadgeValue } from "@/components/nav-badges"
import type { NavItem, NavSection } from "@/components/nav-main.types"

const SECTION_BY_URL: Record<string, string> = {
  "/dashboard": "Principal",
  "/clientes": "Comercial",
  "/productos": "Comercial",
  "/servicios": "Comercial",
  "/ventas": "Comercial",
  "/comprobantes": "Comercial",
  "/compras": "Comercial",
  "/inventario": "Operacion",
  "/equipos": "Operacion",
  "/soporte": "Operacion",
  "/soporte/equipos-externos": "Operacion",
  "/garantias": "Operacion",
  "/reportes": "Analisis",
  "/auditoria": "Administracion",
  "/configuracion": "Administracion",
}

const SECTION_ORDER = [
  "Principal",
  "Comercial",
  "Operacion",
  "Analisis",
  "Administracion",
]

export function groupNavItems(items: NavItem[]): NavSection[] {
  const buckets = new Map<string, NavItem[]>()

  for (const item of items) {
    const section = SECTION_BY_URL[item.url] ?? "Otros"
    const list = buckets.get(section) ?? []
    list.push(item)
    buckets.set(section, list)
  }

  const ordered: NavSection[] = []

  for (const label of SECTION_ORDER) {
    const list = buckets.get(label)
    if (list && list.length > 0) {
      ordered.push({ label, items: list })
      buckets.delete(label)
    }
  }

  for (const [label, list] of buckets) {
    ordered.push({ label, items: list })
  }

  return ordered
}

export function resolveBadgeValue(
  url: string,
  badges: Record<string, NavBadgeValue>,
  fallback?: NavBadgeValue,
): NavBadgeValue | undefined {
  const dynamic = badges[url]

  if (dynamic != null && dynamic !== "" && dynamic !== 0 && dynamic !== "0") {
    return dynamic
  }

  return fallback
}
