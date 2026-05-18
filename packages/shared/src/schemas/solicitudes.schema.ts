import { z } from 'zod'

import { EstadoSolicitud } from '../enums/estado-solicitud.enum'
import { NecesidadSolicitud } from '../enums/necesidad-solicitud.enum'

// ── Public submission ─────────────────────────────────────────────────

export const createSolicitudPublicaSchema = z.object({
  empresa: z.string().trim().min(2).max(120),
  contacto: z.string().trim().min(5).max(160),
  necesidad: z.nativeEnum(NecesidadSolicitud),
  detalle: z.string().trim().max(2000).optional().nullable(),
  /** Honeypot — must be empty. Bots that auto-fill all fields will fail. */
  website: z.string().max(0).optional(),
})

export type CreateSolicitudPublicaInput = z.infer<
  typeof createSolicitudPublicaSchema
>

// ── Internal update ───────────────────────────────────────────────────

export const updateSolicitudSchema = z.object({
  estado: z.nativeEnum(EstadoSolicitud).optional(),
  asignadoAId: z.string().uuid().nullable().optional(),
  notasInternas: z.string().trim().max(2000).optional().nullable(),
})

export type UpdateSolicitudInput = z.infer<typeof updateSolicitudSchema>

// ── List query (internal) ─────────────────────────────────────────────

export const listSolicitudesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.nativeEnum(EstadoSolicitud).optional(),
  necesidad: z.nativeEnum(NecesidadSolicitud).optional(),
  asignadoAId: z.string().uuid().optional(),
  q: z.string().trim().max(120).optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
})

export type ListSolicitudesQuery = z.infer<typeof listSolicitudesQuerySchema>
