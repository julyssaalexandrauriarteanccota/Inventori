import { EstadoOrdenCompra } from '../enums/estado-orden-compra.enum'
import { PaginatedResponse, QueryParams } from './pagination.type'

export interface OrdenCompraDetallePayload {
  productoId: string
  cantidad: number
  precioUnitario: number
}

export interface OrdenCompraFormPayload {
  proveedorId: string
  notas?: string
  fechaEsperada?: string
  detalles: OrdenCompraDetallePayload[]
}

export interface RecepcionDetallePayload {
  productoId: string
  cantidadRecibida: number
}

export interface RecepcionCompraFormPayload {
  almacenDestinoId: string
  notas?: string
  detalles: RecepcionDetallePayload[]
}

export interface CompraDirectaFormPayload {
  proveedorId: string
  almacenDestinoId: string
  notas?: string
  detalles: OrdenCompraDetallePayload[]
}

export interface QueryOrdenCompraFilters extends QueryParams {
  estado?: EstadoOrdenCompra
  proveedorId?: string
}

export interface OrdenCompraListItem {
  id: string
  numero: string
  estado: EstadoOrdenCompra
  subtotal: number
  igv: number
  total: number
  fechaEsperada: string | null
  proveedor: {
    id: string
    razonSocial: string
    ruc: string
  }
}

export type OrdenesCompraPaginatedResponse = PaginatedResponse<OrdenCompraListItem>
