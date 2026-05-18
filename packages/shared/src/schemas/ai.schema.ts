import { z } from 'zod'
import { PrioridadTicket } from '../enums/prioridad-ticket.enum'
import { TipoServicio } from '../enums/tipo-servicio.enum'

export const ocrInvoiceItemSchema = z.object({
  descripcion: z.string(),
  cantidad: z.number(),
  precioUnitario: z.number(),
  subtotal: z.number(),
})

export const ocrInvoiceResultSchema = z.object({
  proveedorNombre: z.string(),
  proveedorRuc: z.string(),
  numeroFactura: z.string(),
  fechaEmision: z.string(),
  subtotal: z.number(),
  igv: z.number(),
  total: z.number(),
  moneda: z.string().default('PEN'),
  items: z.array(ocrInvoiceItemSchema),
  confianza: z.number().min(0).max(100),
  textoOriginal: z.string().optional(),
})

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
