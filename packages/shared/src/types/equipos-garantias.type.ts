import { CondicionProducto } from '../enums/condicion-producto.enum'
import { EstadoComercialEquipo } from '../enums/estado-comercial-equipo.enum'
import { EstadoEquipo } from '../enums/estado-equipo.enum'
import { EstadoGarantia } from '../enums/estado-garantia.enum'
import { PaginatedResponse, QueryParams } from './pagination.type'

export interface EquipoFormPayload {
  numeroSerie: string
  productoId: string
  almacenId?: string | null
  estado?: EstadoEquipo
  estadoComercial?: EstadoComercialEquipo
  condicion?: CondicionProducto
  procedencia?: string
  contadorInicial?: number
  contadorActual?: number
  fechaIngreso?: string
  observacionEstado?: string
  codigoQr?: string
  ubicacion?: string
  firmware?: string
  notas?: string
  ipAddress?: string
  snmpCommunity?: string
  snmpPort?: number
}

export interface AsignarEquipoClientePayload {
  clienteId: string
  ventaId?: string
  notas?: string
}

export interface LecturaSNMPPayload {
  nivelTonerNegro?: number
  nivelTonerCian?: number
  nivelTonerMagenta?: number
  nivelTonerAmarillo?: number
  paginasTotales?: number
  erroresActivos?: string[]
  estadoFusor?: string
  rawData?: unknown
}

export interface QueryEquipoFilters extends QueryParams {
  estado?: EstadoEquipo
  estadoComercial?: EstadoComercialEquipo
  productoId?: string
  almacenId?: string
  clienteId?: string
  sinGarantia?: boolean
}

export interface QueryLecturaSNMPFilters extends QueryParams {
  desde?: string
  hasta?: string
}

export interface GarantiaFormPayload {
  equipoId: string
  ventaId?: string
  clienteDocTipo?: string
  clienteDocNumero?: string
  clienteNombre?: string
  fechaInicio: string
  fechaFin: string
  cobertura: string
  exclusiones?: string
  estado?: EstadoGarantia
  usarContadorActual?: boolean
  contadorMaxCopias?: number | null
}

export interface CrearCasoGarantiaPayload {
  ticketId?: string
  descripcion: string
  aceptada?: boolean
  motivo?: string
}

export interface ActualizarCasoGarantiaPayload {
  resolucion?: string
  aceptada?: boolean
  motivo?: string
}

export interface QueryGarantiaFilters extends QueryParams {
  estado?: EstadoGarantia
  equipoId?: string
}

export interface GarantiaPublicQueryPayload {
  codigoQR: string
}

export type EquipoHistorialEventoTipo =
  | 'CREACION'
  | 'ASIGNACION_INICIO'
  | 'ASIGNACION_FIN'
  | 'GARANTIA'
  | 'LECTURA_SNMP'

export interface EquipoHistorialEvento {
  id: string
  tipo: EquipoHistorialEventoTipo
  timestamp: string
  titulo: string
  descripcion?: string | null
  cliente?: {
    id: string
    nombre: string | null
    apellido: string | null
    razonSocial: string | null
    ruc: string | null
    dni: string | null
  } | null
  metadata?: Record<string, unknown> | null
}

export interface EquipoListItem {
  id: string
  numeroSerie: string
  estado: EstadoEquipo
  estadoComercial: EstadoComercialEquipo
  condicion: CondicionProducto | null
  procedencia: string | null
  contadorInicial: number | null
  contadorActual: number | null
  fechaIngreso: string | null
  observacionEstado: string | null
  codigoQr: string | null
  ubicacion: string | null
  firmware: string | null
  notas: string | null
  ipAddress: string | null
  snmpCommunity: string | null
  snmpPort: number | null
  producto: {
    id: string
    sku: string
    nombre: string
    modelo: string | null
    imagen: string | null
    mesesGarantia?: number
    garantiaMaxCopias?: number | null
    imagenes?: {
      id: string
      url: string
      nombre: string | null
      tipo: string | null
      tamano: number | null
      esPrincipal: boolean
      orden: number
    }[]
    categoria?: {
      id: string
      nombre: string
    } | null
    marca?: {
      nombre: string
    } | null
  }
  almacen?: {
    id: string
    nombre: string
  } | null
  clienteActual?: {
    id: string
    nombre: string | null
    apellido: string | null
    razonSocial: string | null
    ventaId?: string | null
    venta?: {
      id: string
      numero: string
      estado: string
    } | null
  } | null
}

export interface GarantiaPublicResponse {
  id: string
  estado: EstadoGarantia
  fechaInicio: string
  fechaFin: string
  cobertura: string
  exclusiones: string | null
  clienteNombre: string | null
  codigoQR: string
  vigente: boolean
  vigentePorFecha?: boolean
  vigentePorCopias?: boolean
  copiasUsadas?: number | null
  contadorInicio?: number | null
  contadorMaxCopias?: number | null
  equipo: {
    numeroSerie: string
    producto: {
      nombre: string
      modelo: string | null
      marca?: {
        nombre: string
      } | null
    }
  }
}

export interface GarantiaListItem {
  id: string
  estado: EstadoGarantia
  fechaInicio: string
  fechaFin: string
  vigente: boolean
  codigoQR: string
  clienteNombre: string | null
  contadorInicio?: number | null
  contadorMaxCopias?: number | null
  vigentePorFecha?: boolean
  vigentePorCopias?: boolean
  copiasUsadas?: number | null
  equipo: {
    id: string
    numeroSerie: string
    producto: {
      nombre: string
      modelo: string | null
    }
  }
}

export type EquiposPaginatedResponse = PaginatedResponse<EquipoListItem>
export type GarantiasPaginatedResponse = PaginatedResponse<GarantiaListItem>
