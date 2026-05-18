import { z } from 'zod'

import { apiMetaSchema } from './auth.schema'

const paginatedMetaSchema = apiMetaSchema.extend({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
})

export const almacenFormSchema = z.object({
  nombre: z.string().trim().min(1),
  descripcion: z.string().optional(),
  direccion: z.string().optional(),
  esPrincipal: z.boolean().optional(),
  activo: z.boolean().optional(),
})

export const movimientoFormSchema = z.object({
  tipo: z.string().trim().min(1),
  productoId: z.string().uuid(),
  almacenOrigenId: z.string().uuid().optional(),
  almacenDestinoId: z.string().uuid().optional(),
  cantidad: z.number().int().min(1),
  referenciaId: z.string().optional(),
  referenciaTipo: z.string().optional(),
  justificacion: z.string().optional(),
  evidenciaFilename: z.string().optional(),
})

export const stockFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  almacenId: z.string().uuid().optional(),
  productoId: z.string().uuid().optional(),
  stockBajo: z.boolean().optional(),
})

export const movimientoFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  tipo: z.string().trim().min(1).optional(),
  productoId: z.string().uuid().optional(),
  almacenId: z.string().uuid().optional(),
})

export const stockItemSchema = z.object({
  id: z.string().uuid(),
  cantidad: z.number().int(),
  ubicacion: z.string().nullable(),
  producto: z.object({
    id: z.string().uuid(),
    sku: z.string(),
    nombre: z.string(),
    stockMinimo: z.number().int(),
    unidadMedida: z
      .object({
        id: z.string().uuid(),
        codigo: z.string(),
        nombre: z.string(),
      })
      .nullable(),
  }),
  almacen: z.object({
    id: z.string().uuid(),
    nombre: z.string(),
  }),
})

export const alertaStockItemSchema = z.object({
  id: z.string().uuid(),
  stockActual: z.number().int(),
  stockMinimo: z.number().int(),
  resuelta: z.boolean(),
  producto: z.object({
    id: z.string().uuid(),
    sku: z.string(),
    nombre: z.string(),
  }),
  almacen: z.object({
    id: z.string().uuid(),
    nombre: z.string(),
  }),
})

export const stockPaginatedResponseSchema = z.object({
  data: z.array(stockItemSchema),
  meta: paginatedMetaSchema,
})

export const movimientoPaginatedResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    tipo: z.string().min(1),
    cantidad: z.number().int(),
    cantidadAnterior: z.number().int(),
    cantidadPosterior: z.number().int(),
    referenciaId: z.string().nullable(),
    referenciaTipo: z.string().nullable(),
    justificacion: z.string().nullable(),
  })),
  meta: paginatedMetaSchema,
})

export const alertasStockResponseSchema = z.object({
  data: z.array(alertaStockItemSchema),
  meta: apiMetaSchema,
})
