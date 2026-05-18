'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ClientesPaginatedResponse,
  ClienteFilters,
  ClienteFormPayload,
} from '@erp/shared'

import { api } from '@/lib/api'

const CLIENTES_KEY = 'clientes'

function buildParams(filters: ClienteFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.tipo) params.set('tipo', filters.tipo)
  if (filters.activo !== undefined) params.set('activo', String(filters.activo))
  if (filters.esGenerico !== undefined) {
    params.set('esGenerico', String(filters.esGenerico))
  }
  return params.toString()
}

export function useClientes(filters: ClienteFilters = {}) {
  return useQuery({
    queryKey: [CLIENTES_KEY, filters],
    queryFn: () => {
      const qs = buildParams(filters)
      return api.get<ClientesPaginatedResponse>(`/clientes${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: [CLIENTES_KEY, id],
    queryFn: () => api.get<{ data: Record<string, unknown>; meta: { timestamp: string } }>(`/clientes/${id}`),
    enabled: !!id,
  })
}

export function useClienteEquipos(id: string | undefined) {
  return useQuery({
    queryKey: [CLIENTES_KEY, id, 'equipos'],
    queryFn: () => api.get<{ data: Record<string, unknown>[]; meta: { timestamp: string } }>(`/clientes/${id}/equipos`),
    enabled: !!id,
  })
}

export function useClienteTickets(id: string | undefined) {
  return useQuery({
    queryKey: [CLIENTES_KEY, id, 'tickets'],
    queryFn: () => api.get<{ data: Record<string, unknown>[]; meta: { timestamp: string } }>(`/clientes/${id}/tickets`),
    enabled: !!id,
  })
}

export function useCreateCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClienteFormPayload) => api.post('/clientes', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CLIENTES_KEY] }) },
  })
}

export function useUpdateCliente(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ClienteFormPayload>) => api.patch(`/clientes/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CLIENTES_KEY] }) },
  })
}

export function useDeleteCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clientes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CLIENTES_KEY] }) },
  })
}
