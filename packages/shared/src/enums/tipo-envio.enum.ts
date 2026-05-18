/**
 * Tipo de evento registrado en `ComprobanteEnvioLog`.
 *
 * Ver `comprobantes sunat/01-arquitectura.md` §2.3.
 */
export enum TipoEnvio {
  /** Primer envío del comprobante a SUNAT. */
  ENVIO_INICIAL = "ENVIO_INICIAL",
  /** Reintento por fallo técnico transitorio. */
  REINTENTO = "REINTENTO",
  /** Consulta de ticket asíncrono (resúmenes / bajas). */
  CONSULTA_TICKET = "CONSULTA_TICKET",
  /** Envío de Comunicación de Baja (RA). */
  COMUNICACION_BAJA = "COMUNICACION_BAJA",
}
