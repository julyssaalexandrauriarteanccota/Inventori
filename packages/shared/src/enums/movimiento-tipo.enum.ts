import { MovimientoComportamiento } from './movimiento-comportamiento.enum'

export enum TipoMovimiento {
  COMPRA_RECIBIDA      = 'COMPRA_RECIBIDA',
  VENTA                = 'VENTA',
  CONSUMO_SOPORTE      = 'CONSUMO_SOPORTE',
  DEVOLUCION_CLIENTE   = 'DEVOLUCION_CLIENTE',
  DEVOLUCION_PROVEEDOR = 'DEVOLUCION_PROVEEDOR',
  AJUSTE_POSITIVO      = 'AJUSTE_POSITIVO',
  AJUSTE_NEGATIVO      = 'AJUSTE_NEGATIVO',
  TRANSFERENCIA        = 'TRANSFERENCIA',
  BAJA_DANO            = 'BAJA_DANO',
}

export interface BaseTipoMovimientoDefinition {
  codigo: TipoMovimiento
  nombre: string
  nombreCorto: string
  comportamiento: MovimientoComportamiento
  requiereJustificacion: boolean
  requiereEvidencia: boolean
  disponibleTecnico: boolean
}

export const BASE_TIPOS_MOVIMIENTO: BaseTipoMovimientoDefinition[] = [
  {
    codigo: TipoMovimiento.COMPRA_RECIBIDA,
    nombre: 'Compra recibida',
    nombreCorto: 'Compra recibida',
    comportamiento: MovimientoComportamiento.ENTRADA,
    requiereJustificacion: false,
    requiereEvidencia: false,
    disponibleTecnico: false,
  },
  {
    codigo: TipoMovimiento.VENTA,
    nombre: 'Venta',
    nombreCorto: 'Venta',
    comportamiento: MovimientoComportamiento.SALIDA,
    requiereJustificacion: false,
    requiereEvidencia: false,
    disponibleTecnico: false,
  },
  {
    codigo: TipoMovimiento.CONSUMO_SOPORTE,
    nombre: 'Consumo soporte',
    nombreCorto: 'Consumo soporte',
    comportamiento: MovimientoComportamiento.SALIDA,
    requiereJustificacion: false,
    requiereEvidencia: false,
    disponibleTecnico: true,
  },
  {
    codigo: TipoMovimiento.DEVOLUCION_CLIENTE,
    nombre: 'Devolución cliente',
    nombreCorto: 'Dev. cliente',
    comportamiento: MovimientoComportamiento.ENTRADA,
    requiereJustificacion: false,
    requiereEvidencia: false,
    disponibleTecnico: false,
  },
  {
    codigo: TipoMovimiento.DEVOLUCION_PROVEEDOR,
    nombre: 'Devolución proveedor',
    nombreCorto: 'Dev. proveedor',
    comportamiento: MovimientoComportamiento.SALIDA,
    requiereJustificacion: false,
    requiereEvidencia: false,
    disponibleTecnico: false,
  },
  {
    codigo: TipoMovimiento.AJUSTE_POSITIVO,
    nombre: 'Ajuste positivo',
    nombreCorto: 'Ajuste (+)',
    comportamiento: MovimientoComportamiento.ENTRADA,
    requiereJustificacion: true,
    requiereEvidencia: false,
    disponibleTecnico: false,
  },
  {
    codigo: TipoMovimiento.AJUSTE_NEGATIVO,
    nombre: 'Ajuste negativo',
    nombreCorto: 'Ajuste (-)',
    comportamiento: MovimientoComportamiento.SALIDA,
    requiereJustificacion: true,
    requiereEvidencia: false,
    disponibleTecnico: false,
  },
  {
    codigo: TipoMovimiento.TRANSFERENCIA,
    nombre: 'Transferencia',
    nombreCorto: 'Transferencia',
    comportamiento: MovimientoComportamiento.TRANSFERENCIA,
    requiereJustificacion: false,
    requiereEvidencia: false,
    disponibleTecnico: false,
  },
  {
    codigo: TipoMovimiento.BAJA_DANO,
    nombre: 'Baja por daño',
    nombreCorto: 'Baja daño',
    comportamiento: MovimientoComportamiento.SALIDA,
    requiereJustificacion: true,
    requiereEvidencia: true,
    disponibleTecnico: false,
  },
]

export const BASE_TIPOS_MOVIMIENTO_BY_CODE = Object.fromEntries(
  BASE_TIPOS_MOVIMIENTO.map((item) => [item.codigo, item]),
) as Record<TipoMovimiento, BaseTipoMovimientoDefinition>

export const TIPO_MOVIMIENTO_ORDER: TipoMovimiento[] = [
  ...BASE_TIPOS_MOVIMIENTO.map((item) => item.codigo),
]

export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimiento, string> = {
  [TipoMovimiento.COMPRA_RECIBIDA]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.COMPRA_RECIBIDA].nombre,
  [TipoMovimiento.VENTA]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.VENTA].nombre,
  [TipoMovimiento.CONSUMO_SOPORTE]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.CONSUMO_SOPORTE].nombre,
  [TipoMovimiento.DEVOLUCION_CLIENTE]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.DEVOLUCION_CLIENTE].nombre,
  [TipoMovimiento.DEVOLUCION_PROVEEDOR]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.DEVOLUCION_PROVEEDOR].nombre,
  [TipoMovimiento.AJUSTE_POSITIVO]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.AJUSTE_POSITIVO].nombre,
  [TipoMovimiento.AJUSTE_NEGATIVO]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.AJUSTE_NEGATIVO].nombre,
  [TipoMovimiento.TRANSFERENCIA]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.TRANSFERENCIA].nombre,
  [TipoMovimiento.BAJA_DANO]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.BAJA_DANO].nombre,
}

export const TIPO_MOVIMIENTO_SHORT_LABELS: Record<TipoMovimiento, string> = {
  [TipoMovimiento.COMPRA_RECIBIDA]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.COMPRA_RECIBIDA].nombreCorto,
  [TipoMovimiento.VENTA]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.VENTA].nombreCorto,
  [TipoMovimiento.CONSUMO_SOPORTE]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.CONSUMO_SOPORTE].nombreCorto,
  [TipoMovimiento.DEVOLUCION_CLIENTE]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.DEVOLUCION_CLIENTE].nombreCorto,
  [TipoMovimiento.DEVOLUCION_PROVEEDOR]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.DEVOLUCION_PROVEEDOR].nombreCorto,
  [TipoMovimiento.AJUSTE_POSITIVO]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.AJUSTE_POSITIVO].nombreCorto,
  [TipoMovimiento.AJUSTE_NEGATIVO]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.AJUSTE_NEGATIVO].nombreCorto,
  [TipoMovimiento.TRANSFERENCIA]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.TRANSFERENCIA].nombreCorto,
  [TipoMovimiento.BAJA_DANO]: BASE_TIPOS_MOVIMIENTO_BY_CODE[TipoMovimiento.BAJA_DANO].nombreCorto,
}
