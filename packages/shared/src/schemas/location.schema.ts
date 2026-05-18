import { z } from 'zod'

export const locationPayloadSchema = z.object({
  direccion: z.string().optional(),
  distrito: z.string().optional(),
  provincia: z.string().optional(),
  departamento: z.string().optional(),
  referencia: z.string().optional(),
  latitud: z
    .number()
    .min(-90, 'La latitud debe estar entre -90 y 90')
    .max(90, 'La latitud debe estar entre -90 y 90')
    .nullable()
    .optional(),
  longitud: z
    .number()
    .min(-180, 'La longitud debe estar entre -180 y 180')
    .max(180, 'La longitud debe estar entre -180 y 180')
    .nullable()
    .optional(),
})

export const locationSearchResultSchema = z.object({
  direccion: z.string(),
  latitud: z.number(),
  longitud: z.number(),
  distrito: z.string().nullable().optional(),
  provincia: z.string().nullable().optional(),
  departamento: z.string().nullable().optional(),
})
