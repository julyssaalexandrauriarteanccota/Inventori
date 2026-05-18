import type { EstadoSolicitud } from '../enums/estado-solicitud.enum'
import type { NecesidadSolicitud } from '../enums/necesidad-solicitud.enum'

export interface SolicitudPublica {
  id: string
  empresa: string
  contacto: string
  necesidad: NecesidadSolicitud
  detalle: string | null
  origen: string
  estado: EstadoSolicitud
  asignadoAId: string | null
  asignadoA: {
    id: string
    nombre: string
    email: string
  } | null
  notasInternas: string | null
  createdAt: string
  updatedAt: string
  atendidaAt: string | null
}

export interface SolicitudPublicaListItem {
  id: string
  empresa: string
  contacto: string
  necesidad: NecesidadSolicitud
  estado: EstadoSolicitud
  asignadoA: { id: string; nombre: string } | null
  createdAt: string
}

export interface SolicitudPublicaEventPayload {
  id: string
  empresa: string
  necesidad: NecesidadSolicitud
  createdAt: string
}
