import { EstadoTicket } from '../enums/ticket-estado.enum'
import { PrioridadTicket } from '../enums/prioridad-ticket.enum'
import { TipoServicio } from '../enums/tipo-servicio.enum'
import { EstadoComprobante } from '../enums/estado-comprobante.enum'
import { TipoDocumento } from '../enums/documento-tipo.enum'
import type { SolicitudPublicaEventPayload } from './solicitudes.type'

// ── Socket event names ────────────────────────────────────────────────

export const SocketEvents = {
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_CLOSED: 'ticket.closed',
  STOCK_ALERTA: 'stock.alerta',
  COMPROBANTE_ACEPTADO: 'comprobante.aceptado',
  COMPROBANTE_RECHAZADO: 'comprobante.rechazado',
  /**
   * Doc 06 §3 — comprobante atascado por error operativo (no funcional).
   * Distinto de RECHAZADO: SUNAT no rechazó, simplemente no logramos enviarlo
   * o agotamos reintentos. La UI debe mostrarlo como bandeja de revisión.
   */
  COMPROBANTE_REQUIERE_REVISION: 'comprobante.requiere_revision',
  /**
   * Doc 06 §5 — alerta de plazo SUNAT a < 30 min de vencer. La UI debe
   * resaltarlo, no marcarlo como "rechazado".
   */
  COMPROBANTE_PLAZO_PROXIMO: 'comprobante.plazo_proximo',
  /**
   * Doc 06 §1 — certificado digital próximo a vencer (< 30 días) o vencido.
   * Sólo aplica a admin tributario. Bloquea emisiones nuevas si está vencido.
   */
  CERTIFICADO_PROXIMO_VENCER: 'certificado.proximo_vencer',
  CERTIFICADO_VENCIDO: 'certificado.vencido',
  COMUNICACION_BAJA_ACEPTADA: 'comunicacion-baja.aceptada',
  COMUNICACION_BAJA_RECHAZADA: 'comunicacion-baja.rechazada',
  /** Nueva solicitud pública desde el formulario de la landing. */
  SOLICITUD_NUEVA: 'solicitud.nueva',
} as const

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents]

// ── Event payloads ────────────────────────────────────────────────────

export interface TicketEventPayload {
  ticketId: string
  codigo: string
  titulo: string
  estado: EstadoTicket
  prioridad: PrioridadTicket
  tipoServicio: TipoServicio
  tecnicoId?: string | null
  tecnicoNombre?: string | null
  clienteNombre?: string | null
}

export interface StockAlertaPayload {
  alertaId: string
  productoId: string
  productoNombre: string
  productoSku: string
  almacenId: string
  almacenNombre: string
  stockActual: number
  stockMinimo: number
}

export interface ComprobanteEventPayload {
  comprobanteId: string
  numero: string
  tipo: TipoDocumento
  estado: EstadoComprobante
  clienteNombre: string
  total: number
  motivo?: string | null
}

export interface ComunicacionBajaEventPayload {
  comunicacionBajaId: string
  identificadorBaja: string
  comprobanteId: string
  comprobanteNumero: string
  ticket?: string | null
  motivo?: string | null
}

/**
 * Alerta operativa sobre un comprobante (plazo por vencer, requiere revisión).
 * Distinta del payload de aceptación/rechazo porque incluye un mensaje y un
 * deadline opcional para que la UI muestre cuenta regresiva.
 */
export interface ComprobanteAlertaPayload {
  comprobanteId: string
  numero: string
  tipo: TipoDocumento
  estado: EstadoComprobante
  mensaje: string
  fechaVencimientoPlazo?: string | null
}

export interface CertificadoAlertaPayload {
  certificadoId: string
  nombre: string
  validoHasta: string | null
  diasRestantes: number
}

// ── Union type for all payloads ───────────────────────────────────────

export interface SocketEventMap {
  [SocketEvents.TICKET_CREATED]: TicketEventPayload
  [SocketEvents.TICKET_UPDATED]: TicketEventPayload
  [SocketEvents.TICKET_CLOSED]: TicketEventPayload
  [SocketEvents.STOCK_ALERTA]: StockAlertaPayload
  [SocketEvents.COMPROBANTE_ACEPTADO]: ComprobanteEventPayload
  [SocketEvents.COMPROBANTE_RECHAZADO]: ComprobanteEventPayload
  [SocketEvents.COMPROBANTE_REQUIERE_REVISION]: ComprobanteAlertaPayload
  [SocketEvents.COMPROBANTE_PLAZO_PROXIMO]: ComprobanteAlertaPayload
  [SocketEvents.CERTIFICADO_PROXIMO_VENCER]: CertificadoAlertaPayload
  [SocketEvents.CERTIFICADO_VENCIDO]: CertificadoAlertaPayload
  [SocketEvents.COMUNICACION_BAJA_ACEPTADA]: ComunicacionBajaEventPayload
  [SocketEvents.COMUNICACION_BAJA_RECHAZADA]: ComunicacionBajaEventPayload
  [SocketEvents.SOLICITUD_NUEVA]: SolicitudPublicaEventPayload
}
