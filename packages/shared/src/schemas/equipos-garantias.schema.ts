import { z } from 'zod'

import { CondicionProducto } from '../enums/condicion-producto.enum'
import { EstadoComercialEquipo } from '../enums/estado-comercial-equipo.enum'
import { EstadoEquipo } from '../enums/estado-equipo.enum'
import { EstadoGarantia } from '../enums/estado-garantia.enum'
import { apiMetaSchema } from './auth.schema'

const paginatedMetaSchema = apiMetaSchema.extend({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
})

const dateInputStringSchema = z.string().refine((value) => {
  if (!value) return false

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (dateOnlyMatch) {
    const [, yearText, monthText, dayText] = dateOnlyMatch
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)
    const date = new Date(Date.UTC(year, month - 1, day))

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
  }

  return !Number.isNaN(Date.parse(value))
}, 'Fecha inválida')

const optionalDateInputStringSchema = dateInputStringSchema
  .optional()
  .or(z.literal('').transform(() => undefined))

const optionalUbigeoSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/u, 'El ubigeo debe tener 6 dígitos')
  .optional()
  .or(z.literal('').transform(() => undefined))

export const equipoFormSchema = z.object({
  numeroSerie: z.string().trim().min(1),
  productoId: z.string().uuid(),
  almacenId: z.string().uuid().nullable().optional(),
  estado: z.nativeEnum(EstadoEquipo).optional(),
  estadoComercial: z.nativeEnum(EstadoComercialEquipo).optional(),
  condicion: z.nativeEnum(CondicionProducto).optional(),
  procedencia: z.string().optional(),
  contadorInicial: z.number().int().min(0).optional(),
  contadorActual: z.number().int().min(0).optional(),
  fechaIngreso: z.string().datetime().optional(),
  observacionEstado: z.string().optional(),
  codigoQr: z.string().optional(),
  ubicacion: z.string().optional(),
  firmware: z.string().optional(),
  notas: z.string().optional(),
  ipAddress: z
    .string()
    .trim()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/u, 'IP inválida (ej. 192.168.1.50)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  snmpCommunity: z.string().trim().optional(),
  snmpPort: z.number().int().min(1).max(65535).optional(),
})

export const asignarEquipoClienteSchema = z.object({
  clienteId: z.string().uuid(),
  ventaId: z.string().uuid().optional(),
  notas: z.string().optional(),
})

export const clienteEquipoFormSchema = z.object({
  clienteId: z.string().uuid(),
  productoId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  numeroSerie: z
    .string()
    .trim()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  nombre: z.string().trim().min(1, 'El nombre del equipo es obligatorio'),
  marca: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  estado: z.nativeEnum(EstadoEquipo).optional(),
  codigoQr: z.string().trim().optional(),
  ubicacion: z.string().trim().optional(),
  notas: z.string().optional(),
})

export const queryClienteEquipoFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  clienteId: z.string().uuid().optional(),
  productoId: z.string().uuid().optional(),
  estado: z.nativeEnum(EstadoEquipo).optional(),
})

export const lecturaSNMPSchema = z.object({
  nivelTonerNegro: z.number().int().min(0).optional(),
  nivelTonerCian: z.number().int().min(0).optional(),
  nivelTonerMagenta: z.number().int().min(0).optional(),
  nivelTonerAmarillo: z.number().int().min(0).optional(),
  paginasTotales: z.number().int().min(0).optional(),
  erroresActivos: z.array(z.string()).optional(),
  estadoFusor: z.string().optional(),
  rawData: z.unknown().optional(),
})

export const queryEquipoFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  estado: z.nativeEnum(EstadoEquipo).optional(),
  estadoComercial: z.nativeEnum(EstadoComercialEquipo).optional(),
  productoId: z.string().uuid().optional(),
  almacenId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  sinGarantia: z.boolean().optional(),
})

export const queryLecturaSNMPFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
})

export const garantiaFormSchema = z
  .object({
    equipoId: z.string().uuid(),
    ventaId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    clienteDocTipo: z.string().optional(),
    clienteDocNumero: z.string().optional(),
    clienteNombre: z.string().optional(),
    fechaInicio: dateInputStringSchema,
    fechaFin: dateInputStringSchema,
    cobertura: z.string().trim().min(1),
    exclusiones: z.string().optional(),
    fechaInstalacion: optionalDateInputStringSchema,
    direccionInstalacion: z.string().trim().optional(),
    ubigeoInstalacion: optionalUbigeoSchema,
    departamentoInstalacion: z.string().trim().optional(),
    provinciaInstalacion: z.string().trim().optional(),
    distritoInstalacion: z.string().trim().optional(),
    latitudInstalacion: z.number().min(-90).max(90).nullable().optional(),
    longitudInstalacion: z.number().min(-180).max(180).nullable().optional(),
    contactoInstalacion: z.string().trim().optional(),
    telefonoInstalacion: z.string().trim().optional(),
    notasInstalacion: z.string().optional(),
    estado: z.nativeEnum(EstadoGarantia).optional(),
    usarContadorActual: z.boolean().optional(),
    contadorMaxCopias: z.number().int().min(0).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.estado !== EstadoGarantia.ACTIVA) return

    if (!value.fechaInstalacion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fechaInstalacion'],
        message: 'La fecha de instalación es obligatoria para activar',
      })
    }

    if (!value.direccionInstalacion?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['direccionInstalacion'],
        message: 'El lugar de instalación es obligatorio para activar',
      })
    }

    if (!value.departamentoInstalacion?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['departamentoInstalacion'],
        message: 'El departamento de instalación es obligatorio para activar',
      })
    }

    if (!value.provinciaInstalacion?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['provinciaInstalacion'],
        message: 'La provincia de instalación es obligatoria para activar',
      })
    }

    if (!value.distritoInstalacion?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['distritoInstalacion'],
        message: 'El distrito de instalación es obligatorio para activar',
      })
    }

    if (!value.ubigeoInstalacion?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ubigeoInstalacion'],
        message: 'El ubigeo de instalación es obligatorio para activar',
      })
    }

    if (
      value.latitudInstalacion == null ||
      value.longitudInstalacion == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latitudInstalacion'],
        message: 'Selecciona el punto de instalación en el mapa',
      })
    }
  })

export const queryGarantiaFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  estado: z.nativeEnum(EstadoGarantia).optional(),
  equipoId: z.string().uuid().optional(),
  soloOperativas: z.boolean().optional(),
})

export const crearCasoGarantiaSchema = z.object({
  ticketId: z.string().uuid().optional(),
  descripcion: z.string().trim().min(1),
  aceptada: z.boolean().optional(),
  motivo: z.string().optional(),
})

export const actualizarCasoGarantiaSchema = z.object({
  resolucion: z.string().optional(),
  aceptada: z.boolean().optional(),
  motivo: z.string().optional(),
})

export const garantiaPublicQuerySchema = z.object({
  codigoQR: z.string().uuid(),
})

export const garantiaPublicResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    estado: z.nativeEnum(EstadoGarantia),
    fechaInicio: z.string().datetime(),
    fechaFin: z.string().datetime(),
    cobertura: z.string(),
    exclusiones: z.string().nullable(),
    fechaInstalacion: z.string().datetime().nullable().optional(),
    direccionInstalacion: z.string().nullable().optional(),
    ubigeoInstalacion: z.string().nullable().optional(),
    departamentoInstalacion: z.string().nullable().optional(),
    provinciaInstalacion: z.string().nullable().optional(),
    distritoInstalacion: z.string().nullable().optional(),
    latitudInstalacion: z.number().nullable().optional(),
    longitudInstalacion: z.number().nullable().optional(),
    contactoInstalacion: z.string().nullable().optional(),
    telefonoInstalacion: z.string().nullable().optional(),
    notasInstalacion: z.string().nullable().optional(),
    clienteNombre: z.string().nullable(),
    codigoQR: z.string().uuid(),
    vigente: z.boolean(),
    vigentePorFecha: z.boolean().optional(),
    vigentePorCopias: z.boolean().optional(),
    copiasUsadas: z.number().int().min(0).nullable().optional(),
    contadorInicio: z.number().int().min(0).nullable().optional(),
    contadorMaxCopias: z.number().int().min(0).nullable().optional(),
    equipo: z.object({
      numeroSerie: z.string(),
      producto: z.object({
        nombre: z.string(),
        modelo: z.string().nullable(),
        marca: z
          .object({
            nombre: z.string(),
          })
          .nullable()
          .optional(),
      }),
    }),
  }),
  meta: apiMetaSchema,
})

export const equiposPaginatedResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      numeroSerie: z.string(),
      estado: z.nativeEnum(EstadoEquipo),
      estadoComercial: z.nativeEnum(EstadoComercialEquipo),
      condicion: z.nativeEnum(CondicionProducto).nullable(),
      procedencia: z.string().nullable(),
      contadorInicial: z.number().int().nullable(),
      contadorActual: z.number().int().nullable(),
      fechaIngreso: z.string().nullable(),
      observacionEstado: z.string().nullable(),
      codigoQr: z.string().nullable(),
      ubicacion: z.string().nullable(),
      firmware: z.string().nullable(),
      notas: z.string().nullable(),
      producto: z.object({
        id: z.string().uuid(),
        sku: z.string(),
        nombre: z.string(),
        modelo: z.string().nullable(),
        mesesGarantia: z.number().int().min(0).optional(),
        garantiaMaxCopias: z.number().int().min(0).nullable().optional(),
        imagen: z.string().nullable(),
        imagenes: z
          .array(
            z.object({
              id: z.string().uuid(),
              url: z.string(),
              nombre: z.string().nullable(),
              tipo: z.string().nullable(),
              tamano: z.number().int().nullable(),
              esPrincipal: z.boolean(),
              orden: z.number().int(),
            }),
          )
          .optional(),
        categoria: z
          .object({
            id: z.string().uuid(),
            nombre: z.string(),
          })
          .nullable()
          .optional(),
        marca: z
          .object({
            nombre: z.string(),
          })
          .nullable()
          .optional(),
      }),
      almacen: z
        .object({
          id: z.string().uuid(),
          nombre: z.string(),
        })
        .nullable()
        .optional(),
      clienteActual: z
        .object({
          id: z.string().uuid(),
          nombre: z.string().nullable(),
          apellido: z.string().nullable(),
          razonSocial: z.string().nullable(),
          ventaId: z.string().uuid().nullable().optional(),
          venta: z
            .object({
              id: z.string().uuid(),
              numero: z.string(),
              estado: z.string(),
            })
            .nullable()
            .optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
  meta: paginatedMetaSchema,
})

export const clienteEquiposPaginatedResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      clienteId: z.string().uuid(),
      productoId: z.string().uuid().nullable(),
      numeroSerie: z.string(),
      nombre: z.string().nullable(),
      marca: z.string().nullable(),
      modelo: z.string().nullable(),
      estado: z.nativeEnum(EstadoEquipo),
      codigoQr: z.string().nullable(),
      ubicacion: z.string().nullable(),
      notas: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      cliente: z
        .object({
          id: z.string().uuid(),
          nombre: z.string().nullable(),
          apellido: z.string().nullable(),
          razonSocial: z.string().nullable(),
        })
        .optional(),
      producto: z
        .object({
          id: z.string().uuid(),
          sku: z.string(),
          nombre: z.string(),
          modelo: z.string().nullable(),
          marca: z
            .object({
              nombre: z.string(),
            })
            .nullable()
            .optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
  meta: paginatedMetaSchema,
})
