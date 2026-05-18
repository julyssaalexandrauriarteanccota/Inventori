import { z } from 'zod'

import { EstadoTicket } from '../enums/ticket-estado.enum'
import { PrioridadTicket } from '../enums/prioridad-ticket.enum'
import { TipoServicio } from '../enums/tipo-servicio.enum'
import { apiMetaSchema } from './auth.schema'

const paginatedMetaSchema = apiMetaSchema.extend({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
})

export const ticketDetalleSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().min(1),
  precioUnitario: z.number().min(0).optional(),
  almacenId: z.string().uuid().optional(),
  cubiertoGarantia: z.boolean().optional(),
  notas: z.string().optional(),
})

export const ticketFormSchema = z.object({
  clienteId: z.string().uuid(),
  equipoId: z.string().uuid().optional(),
  tecnicoId: z.string().uuid().optional(),
  titulo: z.string().trim().min(1).max(200),
  descripcion: z.string().trim().min(1),
  fallaReportada: z.string().optional(),
  prioridad: z.nativeEnum(PrioridadTicket).optional(),
  tipoServicio: z.nativeEnum(TipoServicio).optional(),
  fechaPromesa: z.string().datetime().optional(),
  notas: z.string().optional(),
  montoManoObra: z.number().min(0).optional(),
  detalles: z.array(ticketDetalleSchema).optional(),
})

export const ticketUpdateSchema = ticketFormSchema.partial().extend({
  estado: z.nativeEnum(EstadoTicket).optional(),
  diagnostico: z.string().optional(),
  solucion: z.string().optional(),
})

export const ticketRepuestoSchema = ticketDetalleSchema

export const updateDetalleTicketSchema = z.object({
  cantidad: z.number().int().min(1).optional(),
  precioUnitario: z.number().min(0).optional(),
  cubiertoGarantia: z.boolean().optional(),
  notas: z.string().optional(),
})

export const cerrarTicketSchema = z.object({
  solucion: z.string().optional(),
  montoManoObra: z.number().min(0).optional(),
  montoRepuestos: z.number().min(0).optional(),
  montoTotal: z.number().min(0).optional(),
  firmaCliente: z.string().optional(),
  firmaGeoLat: z.number().optional(),
  firmaGeoLng: z.number().optional(),
  notas: z.string().optional(),
})

export const queryTicketFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  estado: z.nativeEnum(EstadoTicket).optional(),
  prioridad: z.nativeEnum(PrioridadTicket).optional(),
  tipoServicio: z.nativeEnum(TipoServicio).optional(),
  tecnicoId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
})

export const ticketListItemSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string(),
  titulo: z.string(),
  estado: z.nativeEnum(EstadoTicket),
  prioridad: z.nativeEnum(PrioridadTicket),
  tipoServicio: z.nativeEnum(TipoServicio),
})

export const ticketsPaginatedResponseSchema = z.object({
  data: z.array(ticketListItemSchema),
  meta: paginatedMetaSchema,
})

export const ticketPublicResponseSchema = z.object({
  data: z.object({
    codigo: z.string(),
    titulo: z.string(),
    estado: z.nativeEnum(EstadoTicket),
    prioridad: z.nativeEnum(PrioridadTicket),
    tipoServicio: z.nativeEnum(TipoServicio),
    fechaRecepcion: z.string().datetime(),
    fechaPromesa: z.string().datetime().nullable(),
    fechaCierre: z.string().datetime().nullable(),
    historial: z.array(
      z.object({
        campo: z.string(),
        valorAntes: z.string().nullable(),
        valorDespues: z.string().nullable(),
        createdAt: z.string().datetime(),
      }),
    ),
  }),
  meta: apiMetaSchema,
})
