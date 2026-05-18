import { describe, expect, it } from 'vitest'
import {
  BASE_TIPOS_MOVIMIENTO_BY_CODE,
  TipoMovimiento,
  type TipoMovimientoConfigListItem,
} from '@erp/shared'

import {
  getSelectableManualTiposMovimiento,
  getSelectableTiposMovimiento,
  getTiposMovimientoConfig,
} from './tipos-movimiento'

function createConfigItem(
  codigo: TipoMovimiento,
  overrides: Partial<TipoMovimientoConfigListItem> = {},
): TipoMovimientoConfigListItem {
  const base = BASE_TIPOS_MOVIMIENTO_BY_CODE[codigo]

  return {
    id: codigo,
    codigo,
    nombre: base.nombre,
    activo: true,
    orden: 1,
    comportamiento: base.comportamiento,
    requiereJustificacion: base.requiereJustificacion,
    requiereEvidencia: base.requiereEvidencia,
    disponibleTecnico: base.disponibleTecnico,
    ...overrides,
  }
}

describe('tipos-movimiento', () => {
  it('filtra tipos seleccionables por codigos permitidos', () => {
    const config = [
      createConfigItem(TipoMovimiento.VENTA, { orden: 2 }),
      createConfigItem(TipoMovimiento.CONSUMO_SOPORTE, { orden: 1 }),
    ]

    const result = getSelectableTiposMovimiento(
      [TipoMovimiento.CONSUMO_SOPORTE],
      config,
    )

    expect(result.map((item) => item.codigo)).toEqual([TipoMovimiento.CONSUMO_SOPORTE])
  })

  it('normaliza nombres vacios y ordenes invalidos usando la definicion base', () => {
    const result = getTiposMovimientoConfig([
      createConfigItem(TipoMovimiento.VENTA, {
        nombre: '   ',
        orden: Number.NaN,
      }),
      createConfigItem(TipoMovimiento.COMPRA_RECIBIDA, { orden: 5 }),
    ])

    expect(result[0]).toEqual(
      expect.objectContaining({
        codigo: TipoMovimiento.VENTA,
        nombre: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.VENTA].nombre,
        orden: 1,
      }),
    )
  })

  it('excluye movimientos automaticos del selector manual', () => {
    const config = [
      createConfigItem(TipoMovimiento.COMPRA_RECIBIDA, { orden: 1 }),
      createConfigItem(TipoMovimiento.VENTA, { orden: 2 }),
      createConfigItem(TipoMovimiento.AJUSTE_POSITIVO, { orden: 3 }),
      createConfigItem(TipoMovimiento.TRANSFERENCIA, { orden: 4 }),
    ]

    const result = getSelectableManualTiposMovimiento(undefined, config)

    expect(result.map((item) => item.codigo)).toEqual([
      TipoMovimiento.AJUSTE_POSITIVO,
      TipoMovimiento.TRANSFERENCIA,
    ])
  })
})
