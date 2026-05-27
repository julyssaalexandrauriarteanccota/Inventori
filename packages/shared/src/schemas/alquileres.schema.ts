import { z } from 'zod'

import { EstadoContratoAlquiler } from '../enums/estado-contrato-alquiler.enum'
import { CondicionInspeccionAlquiler } from '../enums/condicion-inspeccion-alquiler.enum'

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

export const contratoAlquilerFormSchema = z.object({
  clienteId: z.string().uuid(),
  equipoId: z.string().uuid(),
  fechaInicio: dateInputStringSchema,
  mesesPlazo: z.number().int().min(1).max(36).default(6).optional(),
  copiasIncluidasMes: z.number().int().min(1),
  precioMensual: z.number().min(0.01),
  precioCopiaExcedente: z.number().min(0),
  depositoGarantia: z.number().min(0).default(0).optional(),
  contadorInicio: z.number().int().min(0).optional(),
  notas: z.string().trim().optional(),
})

export const activarContratoAlquilerSchema = z.object({
  metodoPagoId: z.string().uuid().optional(),
  contadorInicial: z.number().int().min(0).optional(),
  referenciaPago: z.string().trim().optional(),
  evidenciaPagoFilename: z.string().trim().optional(),
  notas: z.string().trim().optional(),
})

export const registrarLecturaAlquilerSchema = z.object({
  periodoId: z.string().uuid().optional(),
  contador: z.number().int().min(0),
  fechaLectura: z.string().datetime().optional(),
  notas: z.string().trim().optional(),
})

export const cerrarPeriodoAlquilerSchema = z.object({
  lecturaFinal: z.number().int().min(0),
  notas: z.string().trim().optional(),
})

export const cobrarPeriodoAlquilerSchema = z.object({
  metodoPagoId: z.string().uuid().optional(),
  referenciaPago: z.string().trim().optional(),
  evidenciaPagoFilename: z.string().trim().optional(),
  notas: z.string().trim().optional(),
})

export const finalizarContratoAlquilerSchema = z.object({
  almacenId: z.string().uuid(),
  contadorRetorno: z.number().int().min(0).optional(),
  condicionRetorno: z.nativeEnum(CondicionInspeccionAlquiler).optional(),
  cargoDanos: z.number().min(0).default(0).optional(),
  cargoTransporte: z.number().min(0).default(0).optional(),
  cargoMora: z.number().min(0).default(0).optional(),
  depositoAplicado: z.number().min(0).default(0).optional(),
  depositoDevuelto: z.number().min(0).default(0).optional(),
  metodoPagoDevolucionId: z.string().uuid().optional(),
  referenciaDevolucion: z.string().trim().optional(),
  evidenciaRetornoFilename: z.string().trim().optional(),
  notasInspeccion: z.string().trim().optional(),
  notas: z.string().trim().optional(),
})

export const cancelarContratoAlquilerSchema = z.object({
  almacenId: z.string().uuid().optional(),
  notas: z.string().trim().optional(),
})

export const queryAlquilerFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  estado: z.nativeEnum(EstadoContratoAlquiler).optional(),
  clienteId: z.string().uuid().optional(),
  equipoId: z.string().uuid().optional(),
})
