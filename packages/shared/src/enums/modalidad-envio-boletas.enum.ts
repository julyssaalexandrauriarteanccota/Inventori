/**
 * Modalidad de envío de boletas a SUNAT.
 *
 * Doc 03 §3 — V1 implementa solo INDIVIDUAL. RESUMEN queda para fase futura
 * (>500 boletas/día) sin migrar BD.
 */
export enum ModalidadEnvioBoletas {
  INDIVIDUAL = 'INDIVIDUAL',
  RESUMEN = 'RESUMEN',
}
