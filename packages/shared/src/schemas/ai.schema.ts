import { z } from 'zod'
import { PrioridadTicket } from '../enums/prioridad-ticket.enum'
import { TipoServicio } from '../enums/tipo-servicio.enum'


export const ocrSerialResultSchema = z.object({
  numerosDetectados: z.array(z.string()),
  confianza: z.number().min(0).max(100),
})

export const ticketClassificationResultSchema = z.object({
  prioridadSugerida: z.nativeEnum(PrioridadTicket),
  tipoServicioSugerido: z.nativeEnum(TipoServicio),
  categoriaFalla: z.string(),
  confianza: z.number().min(0).max(100),
  razonamiento: z.string(),
})
