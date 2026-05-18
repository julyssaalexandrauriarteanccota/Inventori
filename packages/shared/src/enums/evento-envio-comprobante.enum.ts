/**
 * Eventos canónicos del audit-trail de envío SUNAT.
 *
 * Doc 06 §10 — cada paso significativo del worker debe registrar un
 * `ComprobanteEnvioLog.evento` con uno de estos valores. La columna
 * legacy `tipoEvento String?` se mantiene como espejo durante la
 * convivencia con código viejo.
 */
export enum EventoEnvioComprobante {
  /** Comprobante creado y job encolado en BullMQ (paso 9 de Doc 05 §3). */
  ENCOLADO = 'ENCOLADO',
  /** Worker tomó el job y va a llamar a SUNAT (Doc 06 §2 paso 5). */
  ENVIO_INICIADO = 'ENVIO_INICIADO',
  /** Error de red, timeout, 5xx — el job va a reintentar. */
  ENVIO_ERROR = 'ENVIO_ERROR',
  /** Worker recibió CDR (aceptado, con obs o rechazado). */
  CDR_RECIBIDO = 'CDR_RECIBIDO',
  /** Job fue re-encolado tras fallo recuperable. */
  REINTENTO = 'REINTENTO',
  /** Reintentos agotados o error no recuperable → estado bloqueado para revisión humana. */
  REQUIERE_REVISION = 'REQUIERE_REVISION',
  /** Comunicación de baja enviada (sendSummary), ticket recibido. */
  BAJA_INICIADA = 'BAJA_INICIADA',
  /** Cada poll del ticket de baja registra este evento. */
  BAJA_TICKET_RECIBIDO = 'BAJA_TICKET_RECIBIDO',
  /** Ticket de baja resuelto (ACEPTADO o RECHAZADO). */
  BAJA_RESUELTA = 'BAJA_RESUELTA',
}
