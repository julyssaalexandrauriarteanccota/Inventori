import { useQuery } from '@tanstack/react-query'
import { EstadoTicket, EstadoEquipo } from '@erp/shared'
import type { AuditoriaPaginatedResponse } from '@erp/shared'

import { api } from '@/lib/api'

/* ─────────────────────────── types ──────────────────────────────────── */

export interface VentaSemanaItem {
  dia: string
  fecha: string
  ventas: number
  stock: number
}

/* ─────────────────────────── API queries ────────────────────────────── */

export function useDashboardStats() {
  const ticketsQ = useQuery({
    queryKey: ['dashboard', 'tickets-abiertos'],
    queryFn: () =>
      api.get<{ meta: { total: number } }>(
        `/soporte/tickets?estado=${EstadoTicket.ABIERTO}&limit=1`,
      ),
  })

  const alertasQ = useQuery({
    queryKey: ['dashboard', 'alertas-stock'],
    queryFn: () =>
      api.get<{ meta: { total: number } }>(`/inventario/alertas?limit=1`),
  })

  const equiposQ = useQuery({
    queryKey: ['dashboard', 'equipos-activos'],
    queryFn: () =>
      api.get<{ meta: { total: number } }>(
        `/equipos?estado=${EstadoEquipo.ACTIVO}&limit=1`,
      ),
  })

  return { ticketsQ, alertasQ, equiposQ }
}

export function useDashboardVentasSemana() {
  return useQuery({
    queryKey: ['dashboard', 'ventas-semana'],
    queryFn: () =>
      api.get<{ data: VentaSemanaItem[] }>(
        '/reportes/dashboard/ventas-semana',
      ),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecentAuditoria() {
  return useQuery({
    queryKey: ['dashboard', 'recent-auditoria'],
    queryFn: () =>
      api.get<AuditoriaPaginatedResponse>(
        '/config/auditoria?limit=5',
      ),
    staleTime: 2 * 60 * 1000,
  })
}
