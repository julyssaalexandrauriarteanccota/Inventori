import { z } from 'zod'

import { EstadoFacturacionVenta } from '../enums/estado-facturacion-venta.enum'
import { EstadoVenta } from '../enums/estado-venta.enum'
import { apiMetaSchema } from './auth.schema'

const paginatedMetaSchema = apiMetaSchema.extend({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
})

export const ventaDetalleSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().min(1),
  precioUnitario: z.number().min(0),
  descuento: z.number().min(0).optional(),
  equipoSerie: z.string().optional(),
})

export const ventaFormSchema = z.object({
  clienteId: z.string().uuid(),
  notas: z.string().optional(),
  validoHasta: z.string().trim().optional(),
  detalles: z.array(ventaDetalleSchema).min(1),
})

export const confirmarVentaSchema = z.object({
  metodoPagoId: z.string().uuid(),
  referenciaPago: z.string().optional(),
  evidenciaPagoFilename: z.string().optional(),
  almacenId: z.string().uuid(),
  ventaInterna: z.boolean().optional(),
})

export const queryVentaFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  estado: z.nativeEnum(EstadoVenta).optional(),
  clienteId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
})

export const ventaListItemSchema = z.object({
  id: z.string().uuid(),
  numero: z.string(),
  estado: z.nativeEnum(EstadoVenta),
  estadoFacturacion: z.nativeEnum(EstadoFacturacionVenta),
  subtotal: z.number(),
  descuento: z.number(),
  igv: z.number(),
  total: z.number(),
  cliente: z.object({
    id: z.string().uuid(),
    nombre: z.string().nullable().optional(),
    apellido: z.string().nullable().optional(),
    razonSocial: z.string().nullable().optional(),
    ruc: z.string().nullable().optional(),
    dni: z.string().nullable().optional(),
  }),
})

export const ventasPaginatedResponseSchema = z.object({
  data: z.array(ventaListItemSchema),
  meta: paginatedMetaSchema,
})
