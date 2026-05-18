import { EstadoTicket } from '../enums/ticket-estado.enum'
import { PrioridadTicket } from '../enums/prioridad-ticket.enum'
import { TipoServicio } from '../enums/tipo-servicio.enum'
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
  equipoId?: string
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
  cliente?: { id: string; nombre: string } | null
  tecnico?: { id: string; nombre: string } | null
  equipo?: { id: string; numeroSerie: string } | null
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
  cliente: { id: string; nombre: string } | null
  equipo: { id: string; numeroSerie: string; modelo: string } | null
  tecnico: { id: string; nombre: string } | null
  historial: TicketHistorialEntry[]
  /** @deprecated usar `detalles`. Se mantiene por compatibilidad. */
  repuestos: TicketRepuestoEntry[]
  detalles?: TicketRepuestoEntry[]
  casos?: TicketCasoGarantia[]
  adjuntos?: TicketAdjuntoEntry[]
  creadoEn: string
  actualizadoEn: string
}
