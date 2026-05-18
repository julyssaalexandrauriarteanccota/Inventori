'use client'

import { useMutation } from '@tanstack/react-query'
import type { LocationSearchResult } from '@erp/shared'

import { api } from '@/lib/api'

type ApiMeta = {
  timestamp: string
}

type SearchLocationsResponse = {
  data: LocationSearchResult[]
  meta: ApiMeta
}

type ReverseLocationResponse = {
  data: LocationSearchResult
  meta: ApiMeta
}

type BuscarUbicacionesParams = {
  q: string
  limit?: number
}

type ReverseUbicacionParams = {
  latitud: number
  longitud: number
}

function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams(params)
  return query.toString()
}

export function useBuscarUbicaciones() {
  return useMutation({
    mutationFn: ({ q, limit = 5 }: BuscarUbicacionesParams) => {
      const query = buildQuery({
        q,
        limit: String(limit),
      })

      return api.get<SearchLocationsResponse>(`/ubicaciones/buscar?${query}`)
    },
  })
}

export function useUbicacionReversa() {
  return useMutation({
    mutationFn: ({ latitud, longitud }: ReverseUbicacionParams) => {
      const query = buildQuery({
        latitud: String(latitud),
        longitud: String(longitud),
      })

      return api.get<ReverseLocationResponse>(`/ubicaciones/reversa?${query}`)
    },
  })
}
