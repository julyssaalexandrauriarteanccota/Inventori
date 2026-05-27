'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ProveedoresPaginatedResponse,
  ProveedorFilters,
  ProveedorFormPayload,
  ConsultaDocumentoClientePayload,
  ConsultaDocumentoClienteResult,
} from '@erp/shared'

import { api } from '@/lib/api'

const PROVEEDORES_KEY = 'proveedores'

function buildParams(filters: ProveedorFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.activo !== undefined) params.set('activo', String(filters.activo))
  return params.toString()
}

export function useProveedores(filters: ProveedorFilters = {}) {
  return useQuery({
    queryKey: [PROVEEDORES_KEY, filters],
    queryFn: () => {
      const qs = buildParams(filters)
      return api.get<ProveedoresPaginatedResponse>(
        `/proveedores${qs ? `?${qs}` : ''}`,
      )
    },
  })
}

export function useProveedor(id: string | undefined) {
  return useQuery({
    queryKey: [PROVEEDORES_KEY, id],
    queryFn: () =>
      api.get<{ data: Record<string, unknown>; meta: { timestamp: string } }>(
        `/proveedores/${id}`,
      ),
    enabled: !!id,
  })
}

export function useCreateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProveedorFormPayload) => api.post('/proveedores', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_KEY] })
    },
  })
}

export function useUpdateProveedor(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ProveedorFormPayload>) =>
      api.patch(`/proveedores/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_KEY] })
    },
  })
}

export function useDeleteProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/proveedores/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_KEY] })
    },
  })
}

export function useConsultarDocumentoProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ConsultaDocumentoClientePayload) =>
      api.post<{
        data: ConsultaDocumentoClienteResult
        meta: { timestamp: string }
      }>('/proveedores/consulta-documento', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PROVEEDORES_KEY] }) },
  })
}
