'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  OrdenesCompraPaginatedResponse,
  QueryOrdenCompraFilters,
  OrdenCompraFormPayload,
  RecepcionCompraFormPayload,
  CompraDirectaFormPayload,
} from '@erp/shared'

import { api } from '@/lib/api'

const COMPRAS_KEY = 'compras'

function buildParams(filters: QueryOrdenCompraFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.proveedorId) params.set('proveedorId', filters.proveedorId)
  return params.toString()
}

export function useOrdenesCompra(filters: QueryOrdenCompraFilters = {}) {
  return useQuery({
    queryKey: [COMPRAS_KEY, filters],
    queryFn: () => {
      const qs = buildParams(filters)
      return api.get<OrdenesCompraPaginatedResponse>(`/compras${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useOrdenCompra(id: string | undefined) {
  return useQuery({
    queryKey: [COMPRAS_KEY, id],
    queryFn: () =>
      api.get<{ data: Record<string, unknown>; meta: { timestamp: string } }>(
        `/compras/${id}`,
      ),
    enabled: !!id,
  })
}

export function useCreateOrdenCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OrdenCompraFormPayload) => api.post('/compras', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMPRAS_KEY] })
    },
  })
}

export function useCreateCompraDirecta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CompraDirectaFormPayload) =>
      api.post('/compras/directa', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMPRAS_KEY] })
      qc.invalidateQueries({ queryKey: ['inventario'] })
    },
  })
}

export function useCancelarOrdenCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/compras/${id}/cancelar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMPRAS_KEY] })
    },
  })
}

export function useAprobarOrdenCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/compras/${id}/aprobar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMPRAS_KEY] })
    },
  })
}

export function useDeleteOrdenCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/compras/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMPRAS_KEY] })
    },
  })
}

export function useCreateRecepcion(ordenId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RecepcionCompraFormPayload) =>
      api.post(`/compras/${ordenId}/recepciones`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMPRAS_KEY] })
      qc.invalidateQueries({ queryKey: ['inventario'] })
    },
  })
}
