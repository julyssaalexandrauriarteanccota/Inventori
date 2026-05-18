import { PaginatedResponse, QueryParams } from './pagination.type'

export interface AlmacenFormPayload {
  nombre: string
  descripcion?: string
  direccion?: string
  esPrincipal?: boolean
  activo?: boolean
}

export interface MovimientoFormPayload {
  tipo: string
  productoId: string
  almacenOrigenId?: string
  almacenDestinoId?: string
  cantidad: number
  referenciaId?: string
  referenciaTipo?: string
  justificacion?: string
  evidenciaFilename?: string
}

export interface StockFilters extends QueryParams {
  almacenId?: string
  productoId?: string
  stockBajo?: boolean
}

export interface MovimientoFilters extends QueryParams {
  tipo?: string
  productoId?: string
  almacenId?: string
}

export interface StockListItem {
  id: string
  cantidad: number
  ubicacion: string | null
  producto: {
    id: string
    sku: string
    nombre: string
    stockMinimo: number
    unidadMedida: {
      id: string
      codigo: string
      nombre: string
    } | null
  }
  almacen: {
    id: string
    nombre: string
  }
}

export interface MovimientoListItem {
  id: string
  tipo: string
  cantidad: number
  cantidadAnterior: number
  cantidadPosterior: number
  referenciaId: string | null
  referenciaTipo: string | null
  justificacion: string | null
  createdAt?: string
  producto?: {
    id: string
    sku: string
    nombre: string
  } | null
  almacenOrigen?: {
    id: string
    nombre: string
  } | null
  almacenDestino?: {
    id: string
    nombre: string
  } | null
  usuario?: {
    id: string
    nombre: string
    apellido: string | null
  } | null
}

export interface AlertaStockItem {
  id: string
  stockActual: number
  stockMinimo: number
  resuelta: boolean
  producto: {
    id: string
    sku: string
    nombre: string
  }
  almacen: {
    id: string
    nombre: string
  }
}

export type StockPaginatedResponse = PaginatedResponse<StockListItem>
export type MovimientoPaginatedResponse = PaginatedResponse<MovimientoListItem>
