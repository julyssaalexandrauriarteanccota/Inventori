import { z } from 'zod'

import { EstadoOrdenCompra } from '../enums/estado-orden-compra.enum'
import { apiMetaSchema } from './auth.schema'

const paginatedMetaSchema = apiMetaSchema.extend({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
})

export const ordenCompraDetalleSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().min(1),
  precioUnitario: z.number().min(0),
})

export const ordenCompraFormSchema = z.object({
  proveedorId: z.string().uuid(),
  notas: z.string().optional(),
  fechaEsperada: z.string().datetime().optional(),
  detalles: z.array(ordenCompraDetalleSchema).min(1),
})

export const recepcionCompraDetalleSchema = z.object({
  productoId: z.string().uuid(),
  cantidadRecibida: z.number().int().min(1),
})

export const recepcionCompraFormSchema = z.object({
  almacenDestinoId: z.string().uuid(),
  notas: z.string().optional(),
  detalles: z.array(recepcionCompraDetalleSchema).min(1),
})

export const compraDirectaFormSchema = z.object({
  proveedorId: z.string().uuid(),
  almacenDestinoId: z.string().uuid(),
  notas: z.string().optional(),
  detalles: z.array(ordenCompraDetalleSchema).min(1),
})

export const queryOrdenCompraFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  estado: z.nativeEnum(EstadoOrdenCompra).optional(),
  proveedorId: z.string().uuid().optional(),
})

export const ordenCompraListItemSchema = z.object({
  id: z.string().uuid(),
  numero: z.string(),
  estado: z.nativeEnum(EstadoOrdenCompra),
  subtotal: z.number(),
  igv: z.number(),
  total: z.number(),
  fechaEsperada: z.string().datetime().nullable(),
  proveedor: z.object({
    id: z.string().uuid(),
    razonSocial: z.string(),
    ruc: z.string(),
  }),
})

export const ordenesCompraPaginatedResponseSchema = z.object({
  data: z.array(ordenCompraListItemSchema),
  meta: paginatedMetaSchema,
})
