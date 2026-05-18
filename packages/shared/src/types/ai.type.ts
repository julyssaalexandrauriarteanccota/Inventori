import { PrioridadTicket } from '../enums/prioridad-ticket.enum'
import { TipoServicio } from '../enums/tipo-servicio.enum'

// ── OCR Invoice ─────────────────────────────────────────────────

export interface OcrInvoiceItem {
  descripcion: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface OcrInvoiceResult {
  proveedorNombre: string
  proveedorRuc: string
  numeroFactura: string
  fechaEmision: string
  subtotal: number
  igv: number
  total: number
  moneda: string
  items: OcrInvoiceItem[]
  confianza: number // 0-100
  textoOriginal?: string
}

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
