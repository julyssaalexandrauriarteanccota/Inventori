import { PrioridadTicket } from '../enums/prioridad-ticket.enum'
import { TipoServicio } from '../enums/tipo-servicio.enum'


// ── OCR Serial ──────────────────────────────────────────────────

export interface OcrSerialResult {
  numerosDetectados: string[]
  confianza: number
}

// ── Ticket Classification ───────────────────────────────────────

export interface TicketClassificationResult {
  prioridadSugerida: PrioridadTicket
  tipoServicioSugerido: TipoServicio
  categoriaFalla: string
  confianza: number
  razonamiento: string
}
