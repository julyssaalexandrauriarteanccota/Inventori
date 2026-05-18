'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  GarantiasPaginatedResponse,
  QueryGarantiaFilters,
  GarantiaFormPayload,
  CrearCasoGarantiaPayload,
  ActualizarCasoGarantiaPayload,
} from '@erp/shared'

import { api } from '@/lib/api'

const GARANTIAS_KEY = 'garantias'

function buildParams(filters: QueryGarantiaFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.equipoId) params.set('equipoId', filters.equipoId)
  return params.toString()
}

export function useGarantias(filters: QueryGarantiaFilters = {}) {
  return useQuery({
    queryKey: [GARANTIAS_KEY, filters],
    queryFn: () => {
      const qs = buildParams(filters)
      return api.get<GarantiasPaginatedResponse>(
        `/garantias${qs ? `?${qs}` : ''}`,
      )
    },
  })
}

export function useGarantia(id: string | undefined) {
  return useQuery({
    queryKey: [GARANTIAS_KEY, id],
    queryFn: () =>
      api.get<{ data: Record<string, unknown>; meta: { timestamp: string } }>(
        `/garantias/${id}`,
      ),
    enabled: !!id,
  })
}

export function useCreateGarantia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GarantiaFormPayload) => api.post('/garantias', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GARANTIAS_KEY] })
    },
  })
}

export function useUpdateGarantia(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<GarantiaFormPayload>) =>
      api.patch(`/garantias/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GARANTIAS_KEY] })
    },
  })
}

export function useDeleteGarantia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/garantias/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GARANTIAS_KEY] })
    },
  })
}

export function useCrearCasoGarantia(garantiaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CrearCasoGarantiaPayload) =>
      api.post(`/garantias/${garantiaId}/casos`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GARANTIAS_KEY] })
    },
  })
}

export function useActualizarCasoGarantia(garantiaId: string, casoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ActualizarCasoGarantiaPayload) =>
      api.patch(`/garantias/${garantiaId}/casos/${casoId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GARANTIAS_KEY] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
