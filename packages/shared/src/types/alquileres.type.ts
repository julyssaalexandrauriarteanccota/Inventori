import { EstadoContratoAlquiler } from '../enums/estado-contrato-alquiler.enum'
import { EstadoPeriodoAlquiler } from '../enums/estado-periodo-alquiler.enum'
import { TipoCargoAlquiler } from '../enums/tipo-cargo-alquiler.enum'
import { CondicionInspeccionAlquiler } from '../enums/condicion-inspeccion-alquiler.enum'
import { TipoInspeccionAlquiler } from '../enums/tipo-inspeccion-alquiler.enum'
import { PaginatedResponse, QueryParams } from './pagination.type'

export interface ContratoAlquilerFormPayload {
  clienteId: string
  equipoId: string
  fechaInicio: string
  mesesPlazo?: number
  copiasIncluidasMes: number
  precioMensual: number
  precioCopiaExcedente: number
  depositoGarantia?: number
  contadorInicio?: number
  notas?: string
}

export interface ActivarContratoAlquilerPayload {
  metodoPagoId?: string
  contadorInicial?: number
  referenciaPago?: string
  evidenciaPagoFilename?: string
  notas?: string
}

export interface RegistrarLecturaAlquilerPayload {
  periodoId?: string
  contador: number
  fechaLectura?: string
  notas?: string
}

export interface CerrarPeriodoAlquilerPayload {
  lecturaFinal: number
  notas?: string
}

export interface CobrarPeriodoAlquilerPayload {
  metodoPagoId?: string
  referenciaPago?: string
  evidenciaPagoFilename?: string
  notas?: string
}

export interface FinalizarContratoAlquilerPayload {
  almacenId: string
  contadorRetorno?: number
  condicionRetorno?: CondicionInspeccionAlquiler
  cargoDanos?: number
  cargoTransporte?: number
  cargoMora?: number
  depositoAplicado?: number
  depositoDevuelto?: number
  metodoPagoDevolucionId?: string
  referenciaDevolucion?: string
  evidenciaRetornoFilename?: string
  notasInspeccion?: string
  notas?: string
}

export interface CancelarContratoAlquilerPayload {
  almacenId?: string
  notas?: string
}

export interface QueryAlquilerFilters extends QueryParams {
  search?: string
  estado?: EstadoContratoAlquiler
  clienteId?: string
  equipoId?: string
}

export interface CargoPeriodoAlquilerItem {
  id: string
  tipo: TipoCargoAlquiler
  ticketId: string | null
  descripcion: string
  monto: number
  createdAt: string
}

export interface PagoAlquilerItem {
  id: string
  tipo: string | null
  referenciaId: string | null
  concepto: string
  monto: number
  metodoPago: string | null
  createdAt: string
  evidencias: {
    id: string
    nombre: string
    url: string
    tipo: string
    createdAt: string
  }[]
}

export interface PeriodoAlquilerItem {
  id: string
  numeroPeriodo: number
  fechaInicio: string
  fechaFin: string
  lecturaInicial: number | null
  lecturaFinal: number | null
  copiasUsadas: number | null
  copiasIncluidas: number
  copiasExcedentes: number | null
  montoBase: number
  montoExcedente: number
  montoSoporte: number
  totalCierre: number
  baseCobradoAt: string | null
  cierreCalculadoAt: string | null
  cierreCobradoAt: string | null
  estado: EstadoPeriodoAlquiler
  cargos?: CargoPeriodoAlquilerItem[]
}

export interface ContratoAlquilerListItem {
  id: string
  numero: string
  clienteId: string
  equipoId: string
  fechaInicio: string
  fechaFinPrevista: string
  mesesPlazo: number
  copiasIncluidasMes: number
  precioMensual: number
  precioCopiaExcedente: number
  depositoGarantia: number
  depositoCobradoAt: string | null
  depositoDevueltoAt: string | null
  depositoAplicado: number
  contadorInicio: number
  contadorActual: number | null
  estado: EstadoContratoAlquiler
  notas: string | null
  createdAt: string
  updatedAt: string
  cliente?: {
    id: string
    nombre: string | null
    apellido: string | null
    razonSocial: string | null
  }
  equipo?: {
    id: string
    numeroSerie: string
    contadorActual: number | null
    producto?: {
      id: string
      nombre: string
      sku: string
      modelo: string | null
      marca?: { nombre: string } | null
    }
  }
}

export interface ContratoAlquilerDetalle extends ContratoAlquilerListItem {
  periodos: PeriodoAlquilerItem[]
  pagos?: PagoAlquilerItem[]
  lecturas?: {
    id: string
    periodoId: string | null
    contador: number
    fechaLectura: string
    notas: string | null
  }[]
  inspecciones?: {
    id: string
    tipo: TipoInspeccionAlquiler
    condicion: CondicionInspeccionAlquiler
    contador: number | null
    evidenciaFilename: string | null
    notas: string | null
    createdAt: string
  }[]
  resumenFinanciero?: {
    cuotasBaseTotal: number
    cuotasBaseCobradas: number
    cierresTotal: number
    cierresCobrados: number
    depositoGarantia: number
    depositoAplicado: number
    depositoDevuelto: number
    saldoPendiente: number
  }
  ticketsCobrables?: {
    id: string
    codigo: string
    titulo: string
    montoTotal: number | null
    fechaCierre: string | null
  }[]
}

export type AlquileresPaginatedResponse = PaginatedResponse<ContratoAlquilerListItem>
