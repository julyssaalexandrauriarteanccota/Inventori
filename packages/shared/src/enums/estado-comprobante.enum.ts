/**
 * Estado del Comprobante en el dominio fiscal.
 *
 * Ver `comprobantes sunat/01-arquitectura.md` §3.3.
 *
 * Estados transitorios (alertar si > 24h):
 *  - PENDIENTE_ENVIO, EN_PROCESO_SUNAT, BAJA_PENDIENTE
 *
 * Estados (pseudo-)terminales:
 *  - ACEPTADO, ACEPTADO_CON_OBSERVACIONES, ANULADO
 *  - RECHAZADO (recuperable: corregir y reenviar → vuelve a PENDIENTE_ENVIO)
 *  - REQUIERE_REVISION (no recuperable automático: agotó reintentos o error funcional bloqueante)
 */
export enum EstadoComprobante {
  /** Creado, en cola, aún no enviado. */
  PENDIENTE_ENVIO = 'PENDIENTE_ENVIO',
  /** Enviado a SUNAT, esperando CDR. */
  EN_PROCESO_SUNAT = 'EN_PROCESO_SUNAT',
  /** CDR aceptado. */
  ACEPTADO = 'ACEPTADO',
  /** CDR aceptado con observaciones (válido fiscalmente). */
  ACEPTADO_CON_OBSERVACIONES = 'ACEPTADO_CON_OBSERVACIONES',
  /** CDR rechazado. Requiere corrección y reenvío. */
  RECHAZADO = 'RECHAZADO',
  /**
   * Doc 06 §3 — Reintentos agotados o error funcional no recuperable.
   * El correlativo queda quemado hasta resolución manual.
   */
  REQUIERE_REVISION = 'REQUIERE_REVISION',
  /** Comunicación de baja iniciada, esperando CDR de baja. */
  BAJA_PENDIENTE = 'BAJA_PENDIENTE',
  /** Baja aceptada por SUNAT. */
  ANULADO = 'ANULADO',
}
