/**
 * Estado COMERCIAL de la venta. No conoce nada de SUNAT.
 * El estado fiscal vive en `EstadoFacturacionVenta` (campo separado).
 *
 * Ver `comprobantes sunat/01-arquitectura.md` §3.1 y decisión D7.
 */
export enum EstadoVenta {
  COTIZACION = 'COTIZACION',
  RESERVADA = 'RESERVADA',
  ORDEN_CONFIRMADA = 'ORDEN_CONFIRMADA',
  ENTREGADA = 'ENTREGADA',
  CANCELADA = 'CANCELADA',
}
