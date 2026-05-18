'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CajaDef {
  id: string
  nombre: string
  descripcion?: string | null
  activa: boolean
  createdAt: string
  updatedAt: string
}

export interface AperturaCaja {
  id: string
  cajaId: string
  caja?: CajaDef
  estado: 'ABIERTA' | 'CERRADA'
  montoInicial: string | number
  montoEsperado?: string | number | null
  montoContado?: string | number | null
  diferencia?: string | number | null
  notasApertura?: string | null
  notasCierre?: string | null
  abiertaEn: string
  cerradaEn?: string | null
  usuarioApertura?: { id: string; nombre: string; apellido: string }
  usuarioCierre?: { id: string; nombre: string; apellido: string }
}

export interface MovimientoCaja {
  id: string
  aperturaId: string
  tipo: string
  monto: string | number
  concepto: string
  metodoPagoId?: string | null
  metodoPago?: { id: string; nombre: string }
  referenciaTipo?: string | null
  referenciaId?: string | null
  usuarioId: string
  usuario?: { id: string; nombre: string; apellido: string }
  createdAt: string
}

export interface ResumenApertura {
  apertura: AperturaCaja
  totales: { ingresos: number; egresos: number; ventas: number; otros: number }
  montoEsperado: number
}

const KEY = 'caja'

export function useCajas() {
  return useQuery({
    queryKey: [KEY, 'cajas'],
    queryFn: () => api.get<{ data: CajaDef[] }>('/caja/cajas'),
  })
}

export function useMiAperturaActiva() {
  return useQuery({
    queryKey: [KEY, 'aperturas', 'mia'],
    queryFn: () => api.get<{ data: AperturaCaja | null }>('/caja/aperturas/mia'),
  })
}

export function useResumenApertura(aperturaId: string | undefined | null) {
  return useQuery({
    queryKey: [KEY, 'aperturas', aperturaId, 'resumen'],
    queryFn: () =>
      api.get<{ data: ResumenApertura }>(`/caja/aperturas/${aperturaId}`),
    enabled: !!aperturaId,
    refetchInterval: 15000,
  })
}

export function useMovimientosApertura(aperturaId: string | undefined | null) {
  return useQuery({
    queryKey: [KEY, 'aperturas', aperturaId, 'movimientos'],
    queryFn: () =>
      api.get<{ data: MovimientoCaja[] }>(
        `/caja/aperturas/${aperturaId}/movimientos`,
      ),
    enabled: !!aperturaId,
    refetchInterval: 15000,
  })
}

export interface AbrirCajaPayload {
  cajaId: string
  montoInicial: number
  notasApertura?: string
}

export function useAbrirCaja() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AbrirCajaPayload) =>
      api.post<{ data: AperturaCaja }>('/caja/aperturas', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export interface CerrarCajaPayload {
  montoContado: number
  notasCierre?: string
}

export function useCerrarCaja(aperturaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CerrarCajaPayload) =>
      api.patch<{ data: AperturaCaja }>(
        `/caja/aperturas/${aperturaId}/cerrar`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export interface MovimientoCajaPayload {
  tipo:
    | 'INGRESO'
    | 'EGRESO'
    | 'VENTA'
    | 'DEVOLUCION'
    | 'RETIRO'
    | 'DEPOSITO'
    | 'AJUSTE'
  monto: number
  concepto: string
  metodoPagoId?: string
  referenciaTipo?: string
  referenciaId?: string
}

export function useRegistrarMovimiento(aperturaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MovimientoCajaPayload) =>
      api.post<{ data: MovimientoCaja }>(
        `/caja/aperturas/${aperturaId}/movimientos`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export interface CreateCajaPayload {
  nombre: string
  descripcion?: string
}

export function useCreateCaja() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCajaPayload) =>
      api.post<{ data: CajaDef }>('/caja/cajas', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, 'cajas'] })
    },
  })
}

export interface UpdateCajaPayload {
  nombre?: string
  descripcion?: string | null
  activa?: boolean
}

export function useUpdateCaja(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateCajaPayload) =>
      api.patch<{ data: CajaDef }>(`/caja/cajas/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, 'cajas'] })
    },
  })
}
