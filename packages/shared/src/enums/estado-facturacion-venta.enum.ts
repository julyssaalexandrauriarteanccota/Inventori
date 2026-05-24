/**
 * Estado fiscal de la Venta. Es un eje SEPARADO del `estado` comercial
 * (`EstadoVenta`). Solo lo modifica el dominio Comprobantes vía eventos.
 *
 * Ver `comprobantes sunat/01-arquitectura.md` §1.4 y §3.2.
 */
export enum EstadoFacturacionVenta {
  /** Venta sin comprobante asociado todavía. */
  SIN_COMPROBANTE = "SIN_COMPROBANTE",
  /** Venta menor de S/ 5 para cliente genérico, cerrada como ticket interno. */
  VENTA_INTERNA = "VENTA_INTERNA",
  /** Comprobante creado, en cola o esperando CDR. */
  EN_EMISION = "EN_EMISION",
  /** CDR aceptado por SUNAT. */
  EMITIDA = "EMITIDA",
  /** CDR aceptado con observaciones. Válido fiscalmente. */
  EMITIDA_CON_OBS = "EMITIDA_CON_OBS",
  /** CDR rechazado, requiere acción del usuario. */
  RECHAZADA = "RECHAZADA",
  /** Comunicación de baja aceptada por SUNAT. */
  ANULADA_FISCAL = "ANULADA_FISCAL",
}
