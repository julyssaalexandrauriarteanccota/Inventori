import { z } from 'zod'

import { MovimientoComportamiento } from '../enums/movimiento-comportamiento.enum'
import { apiMetaSchema } from './auth.schema'

const paginatedMetaSchema = apiMetaSchema.extend({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
})

export const dashboardKpisSchema = z.object({
  ventasMes: z.object({
    totalMonto: z.number(),
    cantidad: z.number().int().min(0),
  }),
  tickets: z.object({
    abiertos: z.number().int().min(0),
    cerradosMes: z.number().int().min(0),
  }),
  alertasStockPendientes: z.number().int().min(0),
  clientesNuevosMes: z.number().int().min(0),
})

export const dashboardKpisResponseSchema = z.object({
  data: dashboardKpisSchema,
  meta: apiMetaSchema,
})

const optionalTextSchema = z.string().optional()
const nullableTextSchema = z.string().nullable()

export const configEmpresaBrandingSchema = z.object({
  nombreComercial: optionalTextSchema,
  slogan: optionalTextSchema,
  descripcionCorta: optionalTextSchema,
  descripcionSeo: optionalTextSchema,
  rubro: optionalTextSchema,
  website: optionalTextSchema,
  logoDark: optionalTextSchema,
  favicon: optionalTextSchema,
  colorPrimario: optionalTextSchema,
  colorSecundario: optionalTextSchema,
})

export const configEmpresaContactoPublicoSchema = z.object({
  telefonoVentas: optionalTextSchema,
  telefonoSoporte: optionalTextSchema,
  whatsapp: optionalTextSchema,
  emailVentas: optionalTextSchema,
  emailSoporte: optionalTextSchema,
})

export const configEmpresaContenidoPublicoSchema = z.object({
  heroTitulo: optionalTextSchema,
  heroSubtitulo: optionalTextSchema,
  catalogoDescripcion: optionalTextSchema,
  contactoDescripcion: optionalTextSchema,
  garantiaDescripcion: optionalTextSchema,
  ticketDescripcion: optionalTextSchema,
  pwaDescripcion: optionalTextSchema,
})

export const configEmpresaSchema = z
  .object({
    razonSocial: optionalTextSchema,
    ruc: optionalTextSchema,
    direccion: optionalTextSchema,
    telefono: optionalTextSchema,
    email: optionalTextSchema,
    logo: optionalTextSchema,
    porcentajeIGV: z.number().optional(),
  })
  .merge(configEmpresaBrandingSchema)
  .merge(configEmpresaContactoPublicoSchema)
  .merge(configEmpresaContenidoPublicoSchema)

export const empresaPublicaSchema = z.object({
  razonSocial: nullableTextSchema,
  ruc: nullableTextSchema,
  direccion: nullableTextSchema,
  telefono: nullableTextSchema,
  email: nullableTextSchema,
  logo: nullableTextSchema,
  nombreComercial: nullableTextSchema,
  slogan: nullableTextSchema,
  descripcionCorta: nullableTextSchema,
  descripcionSeo: nullableTextSchema,
  rubro: nullableTextSchema,
  website: nullableTextSchema,
  telefonoVentas: nullableTextSchema,
  telefonoSoporte: nullableTextSchema,
  whatsapp: nullableTextSchema,
  emailVentas: nullableTextSchema,
  emailSoporte: nullableTextSchema,
  logoDark: nullableTextSchema,
  favicon: nullableTextSchema,
  colorPrimario: nullableTextSchema,
  colorSecundario: nullableTextSchema,
  heroTitulo: nullableTextSchema,
  heroSubtitulo: nullableTextSchema,
  catalogoDescripcion: nullableTextSchema,
  contactoDescripcion: nullableTextSchema,
  garantiaDescripcion: nullableTextSchema,
  ticketDescripcion: nullableTextSchema,
  pwaDescripcion: nullableTextSchema,
})

export const empresaPublicaResponseSchema = z.object({
  data: empresaPublicaSchema,
  meta: apiMetaSchema,
})

export const seriesDocumentosSchema = z.object({
  serieFactura: z.string().optional(),
  serieBoleta: z.string().optional(),
  serieNotaCredito: z.string().optional(),
  serieNotaDebito: z.string().optional(),
})

export const metodoPagoSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  activo: z.boolean().optional(),
})

export const metodoPagoListItemSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  activo: z.boolean(),
})

export const createTipoMovimientoConfigSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  comportamiento: z.nativeEnum(MovimientoComportamiento),
  orden: z.number().int().min(1).max(999).optional(),
  activo: z.boolean().optional(),
  requiereJustificacion: z.boolean().optional(),
  requiereEvidencia: z.boolean().optional(),
  disponibleTecnico: z.boolean().optional(),
})

export const updateTipoMovimientoConfigSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  comportamiento: z.nativeEnum(MovimientoComportamiento).optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(1).max(999).optional(),
  requiereJustificacion: z.boolean().optional(),
  requiereEvidencia: z.boolean().optional(),
  disponibleTecnico: z.boolean().optional(),
})

export const tipoMovimientoConfigListItemSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  activo: z.boolean(),
  orden: z.number().int().min(1),
  comportamiento: z.nativeEnum(MovimientoComportamiento),
  requiereJustificacion: z.boolean(),
  requiereEvidencia: z.boolean(),
  disponibleTecnico: z.boolean(),
})

export const auditoriaListItemSchema = z.object({
  id: z.string().uuid(),
  accion: z.string(),
  modelo: z.string(),
  modeloId: z.string().nullable(),
  createdAt: z.string().datetime(),
  usuario: z
    .object({
      id: z.string().uuid(),
      nombre: z.string(),
      email: z.string().email(),
    })
    .nullable()
    .optional(),
})

export const auditoriaPaginatedResponseSchema = z.object({
  data: z.array(auditoriaListItemSchema),
  meta: paginatedMetaSchema,
})
