import { EstadoTicket } from '../enums/ticket-estado.enum'
import { PrioridadTicket } from '../enums/prioridad-ticket.enum'
import { TipoServicio } from '../enums/tipo-servicio.enum'
import { EstadoGarantia } from '../enums/estado-garantia.enum'
import { PaginatedResponse, QueryParams } from './pagination.type'

export interface TicketDetallePayload {
  productoId: string
  cantidad: number
  precioUnitario?: number
  almacenId?: string
  cubiertoGarantia?: boolean
  notas?: string
}

export interface TicketFormPayload {
  clienteId: string
  equipoId?: string | null
  clienteEquipoId?: string | null
  tecnicoId?: string
  titulo: string
  descripcion: string
  fallaReportada?: string
  prioridad?: PrioridadTicket
  tipoServicio?: TipoServicio
  fechaPromesa?: string
  notas?: string
  montoManoObra?: number
  detalles?: TicketDetallePayload[]
}

export interface TicketUpdatePayload extends Partial<TicketFormPayload> {
  estado?: EstadoTicket
  diagnostico?: string
  solucion?: string
}

export type TicketRepuestoPayload = TicketDetallePayload

export interface UpdateDetalleTicketPayload {
  cantidad?: number
  precioUnitario?: number
  cubiertoGarantia?: boolean
  notas?: string
}

export interface CerrarTicketPayload {
  solucion?: string
  montoManoObra?: number
  montoRepuestos?: number
  montoTotal?: number
  firmaCliente?: string
  firmaGeoLat?: number
  firmaGeoLng?: number
  notas?: string
}

export interface QueryTicketFilters extends QueryParams {
  estado?: EstadoTicket
  prioridad?: PrioridadTicket
  tipoServicio?: TipoServicio
  tecnicoId?: string
  clienteId?: string
  fechaDesde?: string
  fechaHasta?: string
}

export interface TicketListItem {
  id: string
  codigo: string
  titulo: string
  estado: EstadoTicket
  prioridad: PrioridadTicket
  tipoServicio: TipoServicio
  cliente?: {
    id: string
    nombre: string | null
    apellido?: string | null
    razonSocial?: string | null
  } | null
  tecnico?: { id: string; nombre: string } | null
  equipo?: { id: string; numeroSerie: string } | null
  clienteEquipo?: {
    id: string
    numeroSerie: string
    nombre: string | null
    marca: string | null
    modelo: string | null
  } | null
  createdAt?: string
}

export interface TicketPublicTrackingResponse {
  codigo: string
  titulo: string
  estado: EstadoTicket
  prioridad: PrioridadTicket
  tipoServicio: TipoServicio
  fechaRecepcion: string
  fechaPromesa: string | null
  fechaCierre: string | null
}

export type TicketsPaginatedResponse = PaginatedResponse<TicketListItem>

export interface TicketHistorialEntry {
  id: string
  campo: string
  valorAnterior: string | null
  valorNuevo: string | null
  creadoEn: string
  notas?: string | null
  usuario?: { nombre: string } | null
}

export interface TicketDetalleEntry {
  id: string
  cantidad: number
  precioUnitario: number
  cubiertoGarantia?: boolean
  notas: string | null
  producto: {
    id: string
    nombre: string
    codigo?: string
    sku?: string
    tipo?: string
    requiereRepuestos?: boolean
    precioVenta?: number
  }
}

export type TicketRepuestoEntry = TicketDetalleEntry

export interface TicketCasoGarantia {
  id: string
  aceptada: boolean | null
  motivo: string | null
  descripcion: string
  garantia?: {
    id: string
    codigoQR: string
    fechaInicio: string
    fechaFin: string
    cobertura: string
    estado: string
  }
}

export interface TicketGarantiaActual {
  id: string
  codigoQR: string
  fechaInicio: string
  fechaFin: string
  cobertura: string
  exclusiones?: string | null
  estado: EstadoGarantia
  vigente?: boolean
}

export interface TicketAdjuntoEntry {
  id: string
  url: string
  nombre: string
  tipo: string
  tamano?: number | null
  createdAt: string
}

export interface TicketDetalle {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  fallaReportada: string | null
  diagnostico: string | null
  solucion: string | null
  estado: EstadoTicket
  prioridad: PrioridadTicket
  tipoServicio: TipoServicio
  fechaRecepcion: string
  fechaPromesa: string | null
  fechaCierre: string | null
  notas: string | null
  montoManoObra: number | null
  montoRepuestos?: number | null
  montoTotal?: number | null
  cliente: {
    id: string
    nombre: string | null
    apellido?: string | null
    razonSocial?: string | null
  } | null
  equipo: {
    id: string
    numeroSerie: string
    modelo?: string | null
    producto?: {
      id: string
      nombre: string
      modelo: string | null
      modeloCatalogoId?: string | null
      modeloCatalogo?: {
        id: string
        nombre: string
      } | null
    } | null
  } | null
  clienteEquipo?: {
    id: string
    numeroSerie: string
    nombre: string | null
    marca: string | null
    modelo: string | null
  } | null
  tecnico: { id: string; nombre: string } | null
  historial: TicketHistorialEntry[]
  /** @deprecated usar `detalles`. Se mantiene por compatibilidad. */
  repuestos: TicketRepuestoEntry[]
  detalles?: TicketRepuestoEntry[]
  casos?: TicketCasoGarantia[]
  garantiaActual?: TicketGarantiaActual | null
  adjuntos?: TicketAdjuntoEntry[]
  creadoEn: string
  actualizadoEn: string
}
