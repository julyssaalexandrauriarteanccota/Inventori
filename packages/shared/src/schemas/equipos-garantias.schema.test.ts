import { describe, expect, it } from 'vitest'

import { EstadoEquipo } from '../enums/estado-equipo.enum'
import { EstadoGarantia } from '../enums/estado-garantia.enum'
import {
  equipoFormSchema,
  garantiaFormSchema,
  garantiaPublicResponseSchema,
} from './equipos-garantias.schema'

describe('equipos y garantias schemas', () => {
  it('valida payload de equipo serializado', () => {
    const parsed = equipoFormSchema.parse({
      numeroSerie: 'KM-SN-001',
      productoId: '11111111-1111-1111-1111-111111111111',
      estado: EstadoEquipo.ACTIVO,
    })

    expect(parsed.numeroSerie).toBe('KM-SN-001')
  })

  it('valida payload de garantia', () => {
    const parsed = garantiaFormSchema.parse({
      equipoId: '11111111-1111-1111-1111-111111111111',
      fechaInicio: '2026-01-01T00:00:00.000Z',
      fechaFin: '2027-01-01T00:00:00.000Z',
      cobertura: 'Cobertura total',
      estado: EstadoGarantia.ACTIVA,
    })

    expect(parsed.estado).toBe(EstadoGarantia.ACTIVA)
  })

  it('valida respuesta publica de garantia', () => {
    const parsed = garantiaPublicResponseSchema.parse({
      data: {
        id: '22222222-2222-4222-8222-000000000001',
        estado: EstadoGarantia.ACTIVA,
        fechaInicio: '2026-01-01T00:00:00.000Z',
        fechaFin: '2027-01-01T00:00:00.000Z',
        cobertura: 'Cobertura total',
        exclusiones: null,
        clienteNombre: 'Cliente Demo',
        codigoQR: '33333333-3333-4333-8333-000000000001',
        vigente: true,
        equipo: {
          numeroSerie: 'KM-SN-001',
          producto: {
            nombre: 'Bizhub C258',
            modelo: 'C258',
            marca: { nombre: 'Konica Minolta' },
          },
        },
      },
      meta: {
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data.vigente).toBe(true)
  })
})
