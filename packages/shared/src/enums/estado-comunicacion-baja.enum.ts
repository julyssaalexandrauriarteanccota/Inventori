/**
 * Estado de una Comunicación de Baja (RA-yyyymmdd-NNNN) ante SUNAT.
 *
 * Ver `comprobantes sunat/01-arquitectura.md` §2.4 y `04-comunicacion-baja.md`.
 */
export enum EstadoComunicacionBaja {
  PENDIENTE = "PENDIENTE",
  EN_PROCESO = "EN_PROCESO",
  ACEPTADA = "ACEPTADA",
  RECHAZADA = "RECHAZADA",
}
