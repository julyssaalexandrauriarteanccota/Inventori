export interface LocationPayload {
  direccion?: string
  distrito?: string
  provincia?: string
  departamento?: string
  referencia?: string
  latitud?: number | null
  longitud?: number | null
}

export interface LocationSearchResult {
  direccion: string
  latitud: number
  longitud: number
  distrito?: string | null
  provincia?: string | null
  departamento?: string | null
}
