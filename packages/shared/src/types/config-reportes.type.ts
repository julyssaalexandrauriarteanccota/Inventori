import { MovimientoComportamiento } from '../enums/movimiento-comportamiento.enum'
import { PaginatedResponse } from './pagination.type'

export interface DashboardKpisResponse {
  ventasMes: {
    totalMonto: number
    cantidad: number
  }
  tickets: {
    abiertos: number
    cerradosMes: number
  }
  alertasStockPendientes: number
  clientesNuevosMes: number
}

export interface ConfigEmpresaPayload {
  razonSocial?: string
  ruc?: string
  direccion?: string
  telefono?: string
  email?: string
  logo?: string
  porcentajeIGV?: number
  nombreComercial?: string
  slogan?: string
  descripcionCorta?: string
  descripcionSeo?: string
  rubro?: string
  website?: string
  telefonoVentas?: string
  telefonoSoporte?: string
  whatsapp?: string
  emailVentas?: string
  emailSoporte?: string
  logoDark?: string
  favicon?: string
  colorPrimario?: string
  colorSecundario?: string
  heroTitulo?: string
  heroSubtitulo?: string
  catalogoDescripcion?: string
  contactoDescripcion?: string
  garantiaDescripcion?: string
  ticketDescripcion?: string
  pwaDescripcion?: string
}

export interface SeriesDocumentosPayload {
  serieFactura?: string
  serieBoleta?: string
  serieNotaCredito?: string
  serieNotaDebito?: string
}

export interface MetodoPagoPayload {
  codigo: string
  nombre: string
  activo?: boolean
}

export interface MetodoPagoListItem {
  id: string
  codigo: string
  nombre: string
  activo: boolean
}

export interface CreateTipoMovimientoConfigPayload {
  nombre: string
  comportamiento: MovimientoComportamiento
  orden?: number
  activo?: boolean
  requiereJustificacion?: boolean
  requiereEvidencia?: boolean
  disponibleTecnico?: boolean
}

export interface UpdateTipoMovimientoConfigPayload {
  nombre?: string
  comportamiento?: MovimientoComportamiento
  activo?: boolean
  orden?: number
  requiereJustificacion?: boolean
  requiereEvidencia?: boolean
  disponibleTecnico?: boolean
}

export interface TipoMovimientoConfigListItem {
  id: string
  codigo: string
  nombre: string
  activo: boolean
  orden: number
  comportamiento: MovimientoComportamiento
  requiereJustificacion: boolean
  requiereEvidencia: boolean
  disponibleTecnico: boolean
}

export interface AuditoriaListItem {
  id: string
  accion: string
  modelo: string
  modeloId: string | null
  createdAt: string
  usuario?: {
    id: string
    nombre: string
    email: string
  } | null
}

export type AuditoriaPaginatedResponse = PaginatedResponse<AuditoriaListItem>
