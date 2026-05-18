'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  CatalogoPaginatedResponse,
  CatalogoProductoDetalle,
  GarantiaPublicResponse,
  TicketPublicTrackingResponse,
  EmpresaPublica,
} from '@erp/shared'

import { api } from '@/lib/api'

const skipAuth = true

// ── Catálogo ──

interface CatalogoFilters {
  page?: number
  limit?: number
  search?: string
  categoriaId?: string
  marcaId?: string
}

function buildCatalogoParams(filters: CatalogoFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.categoriaId) params.set('categoriaId', filters.categoriaId)
  if (filters.marcaId) params.set('marcaId', filters.marcaId)
  return params.toString()
}

export function useCatalogoPublico(filters: CatalogoFilters = {}) {
  return useQuery({
    queryKey: ['catalogo-publico', filters],
    queryFn: () => {
      const qs = buildCatalogoParams(filters)
      return api.get<CatalogoPaginatedResponse>(
        `/productos/catalogo${qs ? `?${qs}` : ''}`,
        { skipAuth },
      )
    },
  })
}

export function useCatalogoDetalle(sku: string) {
  return useQuery({
    queryKey: ['catalogo-publico', 'detalle', sku],
    queryFn: () =>
      api.get<{ data: CatalogoProductoDetalle; meta: { timestamp: string } }>(
        `/productos/catalogo/${sku}`,
        { skipAuth },
      ),
    enabled: !!sku,
  })
}

// ── Categorías y Marcas públicas ──

interface CategoriaPublica {
  id: string
  nombre: string
  descripcion: string | null
  parentId: string | null
  children?: CategoriaPublica[]
}

interface MarcaPublica {
  id: string
  nombre: string
  descripcion: string | null
}

export function useCategoriasPublicas() {
  return useQuery({
    queryKey: ['categorias-publicas'],
    queryFn: () =>
      api.get<{ data: CategoriaPublica[]; meta: { timestamp: string } }>(
        '/categorias/publico',
        { skipAuth },
      ),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMarcasPublicas() {
  return useQuery({
    queryKey: ['marcas-publicas'],
    queryFn: () =>
      api.get<{ data: MarcaPublica[]; meta: { timestamp: string } }>(
        '/marcas/publico',
        { skipAuth },
      ),
    staleTime: 5 * 60 * 1000,
  })
}

// ── Garantía pública ──

export function useGarantiaPublica(codigoQR: string) {
  return useQuery({
    queryKey: ['garantia-publica', codigoQR],
    queryFn: () =>
      api.get<{ data: GarantiaPublicResponse; meta: { timestamp: string } }>(
        `/garantias/verificar/${encodeURIComponent(codigoQR)}`,
        { skipAuth },
      ),
    enabled: !!codigoQR,
  })
}

// ── Comprobante público (portal cliente) ──

export interface ComprobantePublicoLookup {
  id: string
  tokenConsulta: string
  numero: string
  tipo: string
  serie: string
  correlativo: number
  estado: string
  fechaEmision: string
  cdrRecibidaAt: string | null
  total: number | string
  emisorRuc: string | null
  emisorRazonSocial: string | null
  emisorDireccionFiscal?: string | null
  clienteNombre: string
  clienteDocTipo: string
  clienteDocNum: string
  clienteDireccion?: string | null
  subtotal?: number | string
  igv?: number | string
  hashCpe?: string | null
  codigoSunat?: string | null
  mensajeSunat?: string | null
  hasXml?: boolean
  hasCdr?: boolean
  hasPdf?: boolean
  detalles?: Array<{
    item: number
    descripcion: string
    cantidad: number | string
    precioUnitario: number | string
    total: number | string
  }>
}

export function useComprobantePublico(params: {
  rucEmisor: string
  tipo: string
  serie: string
  correlativo: string
  clienteDocTipo: string
  clienteDocNum: string
} | null) {
  return useQuery({
    queryKey: ['comprobante-publico', params],
    queryFn: () => {
      if (!params) return null
      return api.post<{ data: ComprobantePublicoLookup; meta: { timestamp: string } }>(
        '/portal-cliente/buscar',
        params,
        { skipAuth },
      )
    },
    enabled: !!params,
  })
}

export function useComprobantePublicoPorToken(tokenConsulta: string | null) {
  return useQuery({
    queryKey: ['comprobante-publico-token', tokenConsulta],
    queryFn: () => {
      if (!tokenConsulta) return null
      return api.get<{ data: ComprobantePublicoLookup; meta: { timestamp: string } }>(
        `/portal-cliente/c/${encodeURIComponent(tokenConsulta)}`,
        { skipAuth },
      )
    },
    enabled: !!tokenConsulta,
  })
}

// ── Ticket público ──

export function useTicketPublico(codigo: string) {
  return useQuery({
    queryKey: ['ticket-publico', codigo],
    queryFn: () =>
      api.get<{ data: TicketPublicTrackingResponse; meta: { timestamp: string } }>(
        `/soporte/tickets/${encodeURIComponent(codigo)}/publico`,
        { skipAuth },
      ),
    enabled: !!codigo,
  })
}

// ── Empresa pública ──

export function useEmpresaPublica() {
  return useQuery({
    queryKey: ['empresa-publica'],
    queryFn: () =>
      api.get<{ data: EmpresaPublica; meta: { timestamp: string } }>(
        '/config/empresa/publica',
        { skipAuth },
      ),
    staleTime: 10 * 60 * 1000,
  })
}
