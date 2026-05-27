'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  EquiposPaginatedResponse,
  QueryEquipoFilters,
  EquipoFormPayload,
  AsignarEquipoClientePayload,
  LecturaSNMPPayload,
  ClienteEquipoFormPayload,
  ClienteEquipoDetalle,
  ClienteEquiposPaginatedResponse,
  QueryClienteEquipoFilters,
} from '@erp/shared'

import { api } from '@/lib/api'

const EQUIPOS_KEY = 'equipos'
const CLIENTE_EQUIPOS_KEY = 'equipos-cliente'
const INVENTARIO_KEY = 'inventario'

function buildParams(filters: QueryEquipoFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.estadoComercial) params.set('estadoComercial', filters.estadoComercial)
  if (filters.productoId) params.set('productoId', filters.productoId)
  if (filters.almacenId) params.set('almacenId', filters.almacenId)
  if (filters.clienteId) params.set('clienteId', filters.clienteId)
  if (filters.sinGarantia) params.set('sinGarantia', 'true')
  return params.toString()
}

function buildClienteEquipoParams(filters: QueryClienteEquipoFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.clienteId) params.set('clienteId', filters.clienteId)
  if (filters.productoId) params.set('productoId', filters.productoId)
  if (filters.estado) params.set('estado', filters.estado)
  return params.toString()
}

export function useEquipos(
  filters: QueryEquipoFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [EQUIPOS_KEY, filters],
    queryFn: () => {
      const qs = buildParams(filters)
      return api.get<EquiposPaginatedResponse>(`/equipos${qs ? `?${qs}` : ''}`)
    },
    enabled: options?.enabled ?? true,
  })
}

export function useEquipo(serie: string | undefined) {
  return useQuery({
    queryKey: [EQUIPOS_KEY, serie],
    queryFn: () => api.get<{ data: Record<string, unknown>; meta: { timestamp: string } }>(`/equipos/${serie}`),
    enabled: !!serie,
  })
}

export function useClienteEquipos(
  filters: QueryClienteEquipoFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [CLIENTE_EQUIPOS_KEY, filters],
    queryFn: () => {
      const qs = buildClienteEquipoParams(filters)
      return api.get<ClienteEquiposPaginatedResponse>(
        `/equipos-cliente${qs ? `?${qs}` : ''}`,
      )
    },
    enabled: options?.enabled ?? true,
  })
}

export function useClienteEquipo(id: string | undefined) {
  return useQuery({
    queryKey: [CLIENTE_EQUIPOS_KEY, id],
    queryFn: () =>
      api.get<{ data: ClienteEquipoDetalle; meta: { timestamp: string } }>(
        `/equipos-cliente/${id}`,
      ),
    enabled: !!id,
  })
}

export function useCreateClienteEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClienteEquipoFormPayload) =>
      api.post('/equipos-cliente', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLIENTE_EQUIPOS_KEY] })
    },
  })
}

export function useEquipoHistorial(serie: string | undefined) {
  return useQuery({
    queryKey: [EQUIPOS_KEY, serie, 'historial'],
    queryFn: () => api.get<{ data: Record<string, unknown>[]; meta: { timestamp: string } }>(`/equipos/${serie}/historial`),
    enabled: !!serie,
  })
}

export function useEquipoLecturas(serie: string | undefined) {
  return useQuery({
    queryKey: [EQUIPOS_KEY, serie, 'lecturas'],
    queryFn: () => api.get<{ data: Record<string, unknown>[]; meta: { timestamp: string } }>(`/equipos/${serie}/lecturas-snmp`),
    enabled: !!serie,
  })
}

export function useCreateEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EquipoFormPayload) => api.post('/equipos', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY] })
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] })
    },
  })
}

export function useUpdateEquipo(serie: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<EquipoFormPayload>) => api.patch(`/equipos/${serie}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY] })
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] })
    },
  })
}

export function useAsignarEquipoCliente(serie: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AsignarEquipoClientePayload) => api.post(`/equipos/${serie}/asignar-cliente`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY] })
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] })
    },
  })
}

export function useEquipoFlujoActions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serie,
      action,
      almacenId,
    }: {
      serie: string
      action: 'reservar' | 'uso-interno' | 'liberar' | 'baja' | 'reactivar'
      almacenId?: string
    }) =>
      api.post(`/equipos/${encodeURIComponent(serie)}/${action}`, {
        ...(almacenId ? { almacenId } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY] })
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] })
    },
  })
}

export function useRegistrarLecturaSNMP(serie: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LecturaSNMPPayload) => api.post(`/equipos/${serie}/lecturas-snmp`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY, serie, 'lecturas'] })
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY, serie, 'historial'] })
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY, serie] })
    },
  })
}

export function useSyncLecturaSNMP(serie: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ data: Record<string, unknown>; meta: { timestamp: string } }>(
        `/equipos/${serie}/lecturas-snmp/sync`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY, serie, 'lecturas'] })
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY, serie, 'historial'] })
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY, serie] })
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY] })
    },
  })
}

export function useDeleteEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (serie: string) => api.delete(`/equipos/${serie}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EQUIPOS_KEY] })
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] })
    },
  })
}
