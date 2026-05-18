import { EstadoVenta } from '../enums/estado-venta.enum'
import { PaginatedResponse, QueryParams } from './pagination.type'

export interface VentaDetallePayload {
  productoId: string
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
}

export interface QueryVentaFilters extends QueryParams {
  estado?: EstadoVenta
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

export type VentasPaginatedResponse = PaginatedResponse<VentaListItem>
