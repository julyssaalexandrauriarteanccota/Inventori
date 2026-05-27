import { EstadoVenta } from '../enums/estado-venta.enum'
import { EstadoComprobante } from '../enums/estado-comprobante.enum'
import { TipoDocumento } from '../enums/documento-tipo.enum'
import { PaginatedResponse, QueryParams } from './pagination.type'

export interface VentaDetallePayload {
  productoId: string
  /** Debe ser 1 cuando `equipoSerie` está presente. */
  cantidad: number
  precioUnitario: number
  descuento?: number
  equipoSerie?: string
}

export interface VentaFormPayload {
  clienteId: string
  notas?: string
  validoHasta?: string
  detalles: VentaDetallePayload[]
}

export interface ConfirmarVentaPayload {
  metodoPagoId: string
  referenciaPago?: string
  evidenciaPagoFilename?: string
  almacenId: string
  ventaInterna?: boolean
}

export interface QueryVentaFilters extends QueryParams {
  estado?: EstadoVenta
  estados?: EstadoVenta[]
  clienteId?: string
}

export interface VentaListItem {
  id: string
  numero: string
  estado: EstadoVenta
  estadoFacturacion: import('../enums/estado-facturacion-venta.enum').EstadoFacturacionVenta
  subtotal: number
  descuento: number
  igv: number
  total: number
  cliente: {
    id: string
    nombre?: string | null
    apellido?: string | null
    razonSocial?: string | null
    ruc?: string | null
    dni?: string | null
  }
}

export interface VentaDetailItem {
  id: string
  cantidad: number
  precioUnitario: number
  descuento: number
  subtotal: number
  equipoSerie?: string | null
  producto?: {
    id: string
    sku: string
    nombre: string
    descripcion?: string | null
    imagen?: string | null
    tieneNumeroSerie?: boolean
    mesesGarantia?: number | null
    garantiaMaxCopias?: number | null
    marca?: { nombre: string } | null
    modeloCatalogo?: { nombre: string } | null
  } | null
}

export interface VentaDetail extends VentaListItem {
  createdAt?: string | null
  updatedAt?: string | null
  notas?: string | null
  validoHasta?: string | null
  referenciaPago?: string | null
  metodoPago?: {
    id: string
    codigo: string
    nombre: string
  } | null
  comprobante?: {
    id: string
    numero: string
    tipo: TipoDocumento
    estado: EstadoComprobante
    fechaEmision: string
    pdfStorageKey?: string | null
    xmlStorageKey?: string | null
    cdrStorageKey?: string | null
    hashCpe?: string | null
    hashSunat?: string | null
  } | null
  usuario?: {
    id: string
    nombre: string
    apellido?: string | null
    email?: string | null
  } | null
  cliente: VentaListItem['cliente'] & {
    email?: string | null
    telefono?: string | null
    celular?: string | null
    direccion?: string | null
    distrito?: string | null
    provincia?: string | null
    departamento?: string | null
  }
  detalles: VentaDetailItem[]
  evidenciasPago?: Array<{
    id: string
    filename?: string | null
    originalName?: string | null
    mimeType?: string | null
    createdAt?: string | null
  }>
  garantias?: Array<{
    id: string
    codigoQR: string
    fechaInicio: string
    fechaFin: string
    estado: string
  }>
}

export type VentasPaginatedResponse = PaginatedResponse<VentaListItem>
export interface VentaDetailResponse {
  data: VentaDetail
  meta: { timestamp: string }
}
