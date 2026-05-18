'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  StockPaginatedResponse,
  MovimientoPaginatedResponse,
  StockFilters,
  MovimientoFilters,
  StockListItem,
  AlmacenFormPayload,
  MovimientoFormPayload,
  AlertaStockItem,
} from '@erp/shared'

import { api } from '@/lib/api'

const INVENTARIO_KEY = 'inventario'
const STOCK_KEY = 'stock'
const MOVIMIENTOS_KEY = 'movimientos'
const ALERTAS_KEY = 'alertas-stock'
const ALMACENES_KEY = 'almacenes'

function buildStockParams(filters: StockFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.almacenId) params.set('almacenId', filters.almacenId)
  if (filters.productoId) params.set('productoId', filters.productoId)
  if (filters.stockBajo !== undefined) params.set('stockBajo', String(filters.stockBajo))
  return params.toString()
}

function buildMovParams(filters: MovimientoFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.tipo) params.set('tipo', filters.tipo)
  if (filters.productoId) params.set('productoId', filters.productoId)
  if (filters.almacenId) params.set('almacenId', filters.almacenId)
  return params.toString()
}

export function useStock(filters: StockFilters = {}) {
  return useQuery({
    queryKey: [INVENTARIO_KEY, STOCK_KEY, filters],
    queryFn: () => {
      const qs = buildStockParams(filters)
      return api.get<StockPaginatedResponse>(`/inventario/stock${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useStockByProducto(productoId?: string) {
  return useQuery({
    queryKey: [INVENTARIO_KEY, STOCK_KEY, 'producto', productoId],
    enabled: Boolean(productoId),
    queryFn: () => api.get<{ data: StockListItem[]; meta: { timestamp: string } }>(`/inventario/stock/${productoId}`),
  })
}

export function useMovimientos(filters: MovimientoFilters = {}) {
  return useQuery({
    queryKey: [INVENTARIO_KEY, MOVIMIENTOS_KEY, filters],
    queryFn: () => {
      const qs = buildMovParams(filters)
      return api.get<MovimientoPaginatedResponse>(`/inventario/movimientos${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useAlertasStock() {
  return useQuery({
    queryKey: [INVENTARIO_KEY, ALERTAS_KEY],
    queryFn: () => api.get<{ data: AlertaStockItem[]; meta: { timestamp: string } }>('/inventario/alertas'),
  })
}

export function useAlmacenes() {
  return useQuery({
    queryKey: [INVENTARIO_KEY, ALMACENES_KEY],
    queryFn: () => api.get<{ data: { id: string; nombre: string; descripcion: string | null; esPrincipal: boolean; activo: boolean }[]; meta: { timestamp: string } }>('/inventario/almacenes'),
  })
}

export function useCreateAlmacen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AlmacenFormPayload) => api.post('/inventario/almacenes', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INVENTARIO_KEY, ALMACENES_KEY] }) },
  })
}

export function useUpdateAlmacen(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<AlmacenFormPayload>) => api.patch(`/inventario/almacenes/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INVENTARIO_KEY, ALMACENES_KEY] }) },
  })
}

export function useDeleteAlmacen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/inventario/almacenes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INVENTARIO_KEY, ALMACENES_KEY] }) },
  })
}

export function useCreateMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MovimientoFormPayload) => api.post('/inventario/movimientos', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] })
    },
  })
}

export function useResolverAlerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/inventario/alertas/${id}/resolver`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INVENTARIO_KEY, ALERTAS_KEY] }) },
  })
}
