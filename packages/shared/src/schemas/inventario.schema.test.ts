import { describe, expect, it } from 'vitest'

import { TipoMovimiento } from '../enums/movimiento-tipo.enum'
import {
  alertasStockResponseSchema,
  movimientoFormSchema,
  stockFiltersSchema,
  stockPaginatedResponseSchema,
} from './inventario.schema'

describe('inventario schemas', () => {
  it('valida payload de movimiento', () => {
    const parsed = movimientoFormSchema.parse({
      tipo: TipoMovimiento.COMPRA_RECIBIDA,
      productoId: '11111111-1111-1111-1111-111111111111',
      almacenDestinoId: '22222222-2222-2222-2222-222222222222',
      cantidad: 10,
    })

    expect(parsed.tipo).toBe(TipoMovimiento.COMPRA_RECIBIDA)
  })

  it('valida filtros de stock con booleano real', () => {
    const parsed = stockFiltersSchema.parse({
      stockBajo: false,
      page: 1,
      limit: 20,
    })

    expect(parsed.stockBajo).toBe(false)
  })

  it('valida respuesta paginada de stock', () => {
    const parsed = stockPaginatedResponseSchema.parse({
      data: [
        {
          id: '33333333-3333-4333-8333-000000000001',
          cantidad: 2,
          ubicacion: null,
          producto: {
            id: '11111111-1111-1111-1111-111111111111',
            sku: 'SKU-1',
            nombre: 'Producto 1',
            stockMinimo: 5,
            unidadMedida: {
              id: '55555555-5555-4555-8555-555555555555',
              codigo: 'UND',
              nombre: 'Unidad',
            },
          },
          almacen: {
            id: '22222222-2222-2222-2222-222222222222',
            nombre: 'Principal',
          },
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data[0].cantidad).toBe(2)
  })

  it('valida respuesta de alertas de stock', () => {
    const parsed = alertasStockResponseSchema.parse({
      data: [
        {
          id: '44444444-4444-4444-8444-000000000001',
          stockActual: 2,
          stockMinimo: 5,
          resuelta: false,
          producto: {
            id: '11111111-1111-1111-1111-111111111111',
            sku: 'SKU-1',
            nombre: 'Producto 1',
          },
          almacen: {
            id: '22222222-2222-2222-2222-222222222222',
            nombre: 'Principal',
          },
        },
      ],
      meta: {
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data[0].resuelta).toBe(false)
  })
})
