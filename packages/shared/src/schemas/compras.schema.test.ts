import { describe, expect, it } from 'vitest'

import { EstadoOrdenCompra } from '../enums/estado-orden-compra.enum'
import {
  ordenCompraFormSchema,
  ordenesCompraPaginatedResponseSchema,
  recepcionCompraFormSchema,
} from './compras.schema'

describe('compras schemas', () => {
  it('valida payload de orden de compra', () => {
    const parsed = ordenCompraFormSchema.parse({
      proveedorId: '11111111-1111-1111-1111-111111111111',
      detalles: [
        {
          productoId: '22222222-2222-2222-2222-222222222222',
          cantidad: 10,
          precioUnitario: 100,
        },
      ],
    })

    expect(parsed.detalles).toHaveLength(1)
  })

  it('valida payload de recepcion', () => {
    const parsed = recepcionCompraFormSchema.parse({
      almacenDestinoId: '33333333-3333-4333-8333-000000000001',
      detalles: [
        {
          productoId: '22222222-2222-2222-2222-222222222222',
          cantidadRecibida: 5,
        },
      ],
    })

    expect(parsed.detalles[0].cantidadRecibida).toBe(5)
  })

  it('valida respuesta paginada de compras', () => {
    const parsed = ordenesCompraPaginatedResponseSchema.parse({
      data: [
        {
          id: '44444444-4444-4444-8444-000000000001',
          numero: 'OC-0001',
          estado: EstadoOrdenCompra.APROBADA,
          subtotal: 1000,
          igv: 180,
          total: 1180,
          fechaEsperada: null,
          proveedor: {
            id: '11111111-1111-1111-1111-111111111111',
            razonSocial: 'Proveedor SAC',
            ruc: '20123456789',
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

    expect(parsed.data[0].estado).toBe(EstadoOrdenCompra.APROBADA)
  })
})
