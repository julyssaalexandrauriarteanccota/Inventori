'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  VentasPaginatedResponse,
  VentaDetailResponse,
  QueryVentaFilters,
  VentaFormPayload,
  ConfirmarVentaPayload,
} from '@erp/shared'

import { api } from '@/lib/api'

const VENTAS_KEY = 'ventas'

function buildParams(filters: QueryVentaFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.estados?.length) params.set('estados', filters.estados.join(','))
  if (filters.clienteId) params.set('clienteId', filters.clienteId)
  return params.toString()
}

export function useVentas(filters: QueryVentaFilters = {}) {
  return useQuery({
    queryKey: [VENTAS_KEY, filters],
    queryFn: () => {
      const qs = buildParams(filters)
      return api.get<VentasPaginatedResponse>(`/ventas${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useVenta(id: string | undefined) {
  return useQuery({
    queryKey: [VENTAS_KEY, id],
    queryFn: () => api.get<VentaDetailResponse>(`/ventas/${id}`),
    enabled: !!id,
  })
}

export function useCreateVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: VentaFormPayload) => api.post('/ventas', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VENTAS_KEY] })
    },
  })
}

export function useConfirmarVenta(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ConfirmarVentaPayload) =>
      api.patch(`/ventas/${id}/confirmar`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VENTAS_KEY] })
    },
  })
}

export function useReservarVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/ventas/${id}/reservar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VENTAS_KEY] })
      qc.invalidateQueries({ queryKey: ['equipos'] })
    },
  })
}

export function useCancelarVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      api.patch(`/ventas/${id}/cancelar`, { motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VENTAS_KEY] })
    },
  })
}

export function useEntregarVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/ventas/${id}/entregar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VENTAS_KEY] })
    },
  })
}

export function useDeleteVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ventas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VENTAS_KEY] })
    },
  })
}
