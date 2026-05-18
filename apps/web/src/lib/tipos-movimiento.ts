import {
  BASE_TIPOS_MOVIMIENTO,
  BASE_TIPOS_MOVIMIENTO_BY_CODE,
  MovimientoComportamiento,
  TipoMovimiento,
  type TipoMovimientoConfigListItem,
} from '@erp/shared'

const TIPOS_MOVIMIENTO_AUTOMATICOS = new Set<string>([
  TipoMovimiento.COMPRA_RECIBIDA,
  TipoMovimiento.VENTA,
  TipoMovimiento.CONSUMO_SOPORTE,
  TipoMovimiento.DEVOLUCION_CLIENTE,
  TipoMovimiento.DEVOLUCION_PROVEEDOR,
])

function humanizeCode(code: string) {
  return code
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getFallbackConfig(): TipoMovimientoConfigListItem[] {
  return BASE_TIPOS_MOVIMIENTO.map((item, index) => ({
    id: item.codigo,
    codigo: item.codigo,
    nombre: item.nombre,
    activo: true,
    orden: index + 1,
    comportamiento: item.comportamiento,
    requiereJustificacion: item.requiereJustificacion,
    requiereEvidencia: item.requiereEvidencia,
    disponibleTecnico: item.disponibleTecnico,
  }))
}

function getBaseTipoMovimiento(code: string) {
  return BASE_TIPOS_MOVIMIENTO_BY_CODE[code as TipoMovimiento]
}

function normalizeTipoMovimientoConfigItem(
  item: TipoMovimientoConfigListItem,
  index: number,
): TipoMovimientoConfigListItem {
  const baseItem = getBaseTipoMovimiento(item.codigo)
  const nombre = typeof item.nombre === 'string' ? item.nombre.trim() : ''
  const orden = typeof item.orden === 'number' && Number.isFinite(item.orden)
    ? item.orden
    : index + 1

  return {
    id: item.id || item.codigo,
    codigo: item.codigo,
    nombre: nombre || baseItem?.nombre || humanizeCode(item.codigo),
    activo: item.activo ?? true,
    orden,
    comportamiento: item.comportamiento ?? baseItem?.comportamiento ?? MovimientoComportamiento.SALIDA,
    requiereJustificacion: item.requiereJustificacion ?? baseItem?.requiereJustificacion ?? false,
    requiereEvidencia: item.requiereEvidencia ?? baseItem?.requiereEvidencia ?? false,
    disponibleTecnico: item.disponibleTecnico ?? baseItem?.disponibleTecnico ?? false,
  }
}

export function getTiposMovimientoConfig(
  items?: TipoMovimientoConfigListItem[],
): TipoMovimientoConfigListItem[] {
  const source = items && items.length > 0
    ? items.map((item, index) => normalizeTipoMovimientoConfigItem(item, index))
    : getFallbackConfig()

  return [...source].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
}

export function getTiposMovimientoLabelMap(
  items?: TipoMovimientoConfigListItem[],
): Record<string, string> {
  const labels: Record<string, string> = {}

  for (const item of BASE_TIPOS_MOVIMIENTO) {
    labels[item.codigo] = item.nombre
  }

  for (const item of getTiposMovimientoConfig(items)) {
    labels[item.codigo] = item.nombre
  }

  return labels
}

export function getTipoMovimientoLabel(
  code: string,
  labels?: Record<string, string>,
) {
  if (labels?.[code]) {
    return labels[code]
  }

  return BASE_TIPOS_MOVIMIENTO_BY_CODE[code as keyof typeof BASE_TIPOS_MOVIMIENTO_BY_CODE]?.nombre
    ?? humanizeCode(code)
}

export function getSelectableTiposMovimiento(
  allowedCodes?: readonly string[],
  items?: TipoMovimientoConfigListItem[],
  options?: {
    includeInactive?: boolean
    allowTecnico?: boolean
  },
): TipoMovimientoConfigListItem[] {
  const includeInactive = options?.includeInactive ?? false
  const allowTecnico = options?.allowTecnico ?? false
  const allowedCodeSet = allowedCodes && allowedCodes.length > 0 ? new Set(allowedCodes) : null

  return getTiposMovimientoConfig(items).filter((item) => {
    if (allowedCodeSet && !allowedCodeSet.has(item.codigo)) {
      return false
    }

    if (!includeInactive && !item.activo) {
      return false
    }

    if (allowTecnico && !item.disponibleTecnico) {
      return false
    }

    return true
  })
}

export function isTipoMovimientoManual(code: string) {
  return !TIPOS_MOVIMIENTO_AUTOMATICOS.has(code)
}

export function getSelectableManualTiposMovimiento(
  allowedCodes?: readonly string[],
  items?: TipoMovimientoConfigListItem[],
  options?: {
    includeInactive?: boolean
    allowTecnico?: boolean
  },
): TipoMovimientoConfigListItem[] {
  return getSelectableTiposMovimiento(allowedCodes, items, options)
    .filter((item) => isTipoMovimientoManual(item.codigo))
}

export function getTipoMovimientoComportamiento(
  code: string,
  items?: TipoMovimientoConfigListItem[],
) {
  const match = getTiposMovimientoConfig(items).find((item) => item.codigo === code)
  if (match) {
    return match.comportamiento
  }

  return BASE_TIPOS_MOVIMIENTO_BY_CODE[code as keyof typeof BASE_TIPOS_MOVIMIENTO_BY_CODE]?.comportamiento
    ?? MovimientoComportamiento.SALIDA
}
