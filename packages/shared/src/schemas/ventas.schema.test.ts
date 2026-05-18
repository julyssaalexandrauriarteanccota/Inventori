import { describe, expect, it } from 'vitest'

import { EstadoFacturacionVenta } from '../enums/estado-facturacion-venta.enum'
import { EstadoVenta } from '../enums/estado-venta.enum'
import {
  confirmarVentaSchema,
  ventaFormSchema,
  ventasPaginatedResponseSchema,
} from './ventas.schema'

describe('ventas schemas', () => {
  it('valida payload de venta', () => {
    const parsed = ventaFormSchema.parse({
      clienteId: '11111111-1111-1111-1111-111111111111',
      detalles: [
        {
          productoId: '22222222-2222-2222-2222-222222222222',
          cantidad: 1,
          precioUnitario: 100,
        },
      ],
    })

    expect(parsed.detalles).toHaveLength(1)
  })

  it('valida payload de confirmacion', () => {
    const parsed = confirmarVentaSchema.parse({
      metodoPagoId: '33333333-3333-4333-8333-000000000001',
      almacenId: '44444444-4444-4444-8444-000000000001',
    })

    expect(parsed.almacenId).toBe('44444444-4444-4444-8444-000000000001')
  })

  it('valida respuesta paginada de ventas', () => {
    const parsed = ventasPaginatedResponseSchema.parse({
      data: [
        {
          id: '55555555-5555-4555-8555-000000000001',
          numero: 'VTA-0001',
          estado: EstadoVenta.COTIZACION,
          estadoFacturacion: EstadoFacturacionVenta.SIN_COMPROBANTE,
          subtotal: 100,
          descuento: 0,
          igv: 18,
          total: 118,
          cliente: {
            id: '11111111-1111-1111-1111-111111111111',
            nombre: 'Juan',
            apellido: 'Perez',
            razonSocial: null,
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

    expect(parsed.data[0].estado).toBe(EstadoVenta.COTIZACION)
  })
})
