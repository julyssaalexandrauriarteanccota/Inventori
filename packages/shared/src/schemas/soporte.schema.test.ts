import { describe, expect, it } from 'vitest'

import { EstadoTicket } from '../enums/ticket-estado.enum'
import { PrioridadTicket } from '../enums/prioridad-ticket.enum'
import { TipoServicio } from '../enums/tipo-servicio.enum'
import {
  ticketFormSchema,
  ticketPublicResponseSchema,
  ticketsPaginatedResponseSchema,
} from './soporte.schema'

describe('soporte schemas', () => {
  it('valida payload de ticket', () => {
    const parsed = ticketFormSchema.parse({
      clienteId: '11111111-1111-4111-8111-000000000001',
      titulo: 'Impresora no enciende',
      descripcion: 'No responde al botón de encendido',
      prioridad: PrioridadTicket.MEDIA,
      tipoServicio: TipoServicio.TALLER,
    })

    expect(parsed.titulo).toBe('Impresora no enciende')
  })

  it('valida respuesta paginada de tickets', () => {
    const parsed = ticketsPaginatedResponseSchema.parse({
      data: [
        {
          id: '22222222-2222-4222-8222-000000000001',
          codigo: 'TKT-2026-0001',
          titulo: 'Falla de impresión',
          estado: EstadoTicket.ABIERTO,
          prioridad: PrioridadTicket.ALTA,
          tipoServicio: TipoServicio.TALLER,
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data[0].estado).toBe(EstadoTicket.ABIERTO)
  })

  it('valida respuesta pública de tracking', () => {
    const parsed = ticketPublicResponseSchema.parse({
      data: {
        codigo: 'TKT-2026-0001',
        titulo: 'Falla de impresión',
        estado: EstadoTicket.EN_PROCESO,
        prioridad: PrioridadTicket.MEDIA,
        tipoServicio: TipoServicio.TALLER,
        fechaRecepcion: '2026-04-06T00:00:00.000Z',
        fechaPromesa: null,
        fechaCierre: null,
        historial: [],
      },
      meta: {
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data.codigo).toBe('TKT-2026-0001')
  })
})
