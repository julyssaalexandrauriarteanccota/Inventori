/**
 * Doc 08 §3 + Anexo Cat 09 SUNAT — Catálogo de motivos de Nota de Crédito.
 *
 * El Cat 09 mezcla motivos "regulares" y "excepcionales". El mismo código (01,
 * 02) puede aplicarse en ambos contextos, lo que se discrimina con la bandera
 * `esExcepcional` en la NC. La fuente de verdad para "qué se considera
 * excepcional" es el conjunto MOTIVOS_NC_EXCEPCIONALES; el resto son regulares.
 */

export const MotivoNC = {
  ANULACION_OPERACION: '01',
  ANULACION_ERROR_RUC: '02',
  CORRECCION_DESCRIPCION: '03',
  DESCUENTO_GLOBAL: '04',
  DESCUENTO_POR_ITEM: '05',
  DEVOLUCION_TOTAL: '06',
  DEVOLUCION_POR_ITEM: '07',
  BONIFICACION: '08',
  DISMINUCION_VALOR: '09',
  OTROS_CONCEPTOS: '10',
  AJUSTES_PAGO: '13',
} as const

export type MotivoNCCodigo = (typeof MotivoNC)[keyof typeof MotivoNC]

/**
 * Motivos válidos en contexto excepcional (Doc 08 §3). Tienen plazo de 10
 * días hábiles desde la fecha de emisión del comprobante origen, en vez del
 * plazo del propio origen.
 */
export const MOTIVOS_NC_EXCEPCIONALES: MotivoNCCodigo[] = [
  MotivoNC.ANULACION_OPERACION,
  MotivoNC.ANULACION_ERROR_RUC,
]

export interface MotivoNCDescriptor {
  codigo: MotivoNCCodigo
  label: string
  descripcionLarga: string
  /** Si true, sólo permitido sobre facturas (no boletas a consumidor final). */
  soloFactura?: boolean
}

/**
 * Motivos disponibles en flujo regular. Plazo = igual al del comprobante
 * origen (factura: mismo día; boleta individual: 5 días calendario).
 */
export const MOTIVOS_NC_REGULAR: MotivoNCDescriptor[] = [
  {
    codigo: MotivoNC.CORRECCION_DESCRIPCION,
    label: 'Corrección por error en la descripción',
    descripcionLarga:
      'La descripción del bien o servicio no coincide con lo realmente vendido.',
  },
  {
    codigo: MotivoNC.DESCUENTO_GLOBAL,
    label: 'Descuento global',
    descripcionLarga:
      'Descuento aplicado sobre el monto total. Sólo válido sobre factura.',
    soloFactura: true,
  },
  {
    codigo: MotivoNC.DESCUENTO_POR_ITEM,
    label: 'Descuento por ítem',
    descripcionLarga: 'Descuento aplicado a líneas específicas.',
  },
  {
    codigo: MotivoNC.DEVOLUCION_TOTAL,
    label: 'Devolución total',
    descripcionLarga: 'Devolución completa de los bienes vendidos.',
  },
  {
    codigo: MotivoNC.DEVOLUCION_POR_ITEM,
    label: 'Devolución por ítem',
    descripcionLarga: 'Devolución parcial: ítems específicos.',
  },
  {
    codigo: MotivoNC.BONIFICACION,
    label: 'Bonificación',
    descripcionLarga: 'Bonificación posterior al cliente.',
  },
  {
    codigo: MotivoNC.DISMINUCION_VALOR,
    label: 'Disminución en el valor',
    descripcionLarga: 'Reducción del precio unitario pactado a posteriori.',
  },
  {
    codigo: MotivoNC.OTROS_CONCEPTOS,
    label: 'Otros conceptos',
    descripcionLarga: 'Casos no contemplados en otros códigos.',
  },
  {
    codigo: MotivoNC.AJUSTES_PAGO,
    label: 'Ajustes - montos y/o fechas de pago',
    descripcionLarga: 'Ajustes en montos o fechas de pago.',
  },
]

/**
 * Motivos disponibles solamente bajo flujo excepcional (Doc 08 §3). Plazo
 * estricto de 10 días hábiles desde la fecha del comprobante origen.
 */
export const MOTIVOS_NC_EXCEPCIONAL: MotivoNCDescriptor[] = [
  {
    codigo: MotivoNC.ANULACION_OPERACION,
    label: 'Anulación de la operación',
    descripcionLarga:
      'El comprobante se emitió a un sujeto distinto (RUC/DNI errado).',
  },
  {
    codigo: MotivoNC.ANULACION_ERROR_RUC,
    label: 'Anulación por error en el RUC',
    descripcionLarga: 'Cliente correcto pero el RUC capturado fue erróneo.',
  },
]

/**
 * Lista plana de todos los códigos válidos (para validar input del backend).
 */
export const MOTIVOS_NC_TODOS: MotivoNCCodigo[] = Object.values(MotivoNC)

/**
 * Plazo en días hábiles (calendario laboral peruano) para emisión de NC
 * excepcional, contado desde la fecha de emisión del comprobante origen.
 * Doc 08 §3.
 */
export const PLAZO_NC_EXCEPCIONAL_DIAS_HABILES = 10

export function esMotivoNcExcepcional(codigo: string): boolean {
  return (MOTIVOS_NC_EXCEPCIONALES as readonly string[]).includes(codigo)
}

export function esMotivoNcSoloFactura(codigo: string): boolean {
  return MOTIVOS_NC_REGULAR.some((m) => m.codigo === codigo && m.soloFactura)
}
