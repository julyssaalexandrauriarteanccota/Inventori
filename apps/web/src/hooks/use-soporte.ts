'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  TicketsPaginatedResponse,
  TicketDetalle,
  QueryTicketFilters,
  TicketFormPayload,
  TicketUpdatePayload,
  CerrarTicketPayload,
  TicketDetallePayload,
  TicketHistorialEntry,
  UpdateDetalleTicketPayload,
} from '@erp/shared'

import { api } from '@/lib/api'

const TICKETS_KEY = 'tickets'
const TICKETS_ENDPOINT = '/soporte/tickets'

type ApiTicketHistorialEntry = Partial<TicketHistorialEntry> & {
  id: string
  campo: string
  valorAntes?: string | null
  valorDespues?: string | null
  createdAt?: string
}

type ApiTicketDetalle = Omit<TicketDetalle, 'historial'> & {
  historial: ApiTicketHistorialEntry[]
}

function buildParams(filters: QueryTicketFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.prioridad) params.set('prioridad', filters.prioridad)
  if (filters.tipoServicio) params.set('tipoServicio', filters.tipoServicio)
  if (filters.tecnicoId) params.set('tecnicoId', filters.tecnicoId)
  if (filters.clienteId) params.set('clienteId', filters.clienteId)
  if (filters.fechaDesde) params.set('fechaDesde', filters.fechaDesde)
  if (filters.fechaHasta) params.set('fechaHasta', filters.fechaHasta)
  return params.toString()
}

export function useTickets(filters: QueryTicketFilters = {}) {
  return useQuery({
    queryKey: [TICKETS_KEY, filters],
    queryFn: () => {
      const qs = buildParams(filters)
      return api.get<TicketsPaginatedResponse>(`${TICKETS_ENDPOINT}${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: [TICKETS_KEY, id],
    queryFn: async () => {
      const response = await api.get<{ data: ApiTicketDetalle; meta: { timestamp: string } }>(
        `${TICKETS_ENDPOINT}/${id}`,
      )

      return {
        ...response,
        data: {
          ...response.data,
          historial: response.data.historial.map((entry) => ({
            ...entry,
            valorAnterior: entry.valorAnterior ?? entry.valorAntes ?? null,
            valorNuevo: entry.valorNuevo ?? entry.valorDespues ?? null,
            creadoEn: entry.creadoEn ?? entry.createdAt ?? '',
          })),
        } satisfies TicketDetalle,
      }
    },
    enabled: !!id,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TicketFormPayload) => api.post(TICKETS_ENDPOINT, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY] }) },
  })
}

export function useUpdateTicket(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TicketUpdatePayload) => api.patch(`${TICKETS_ENDPOINT}/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY] }) },
  })
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: TicketUpdatePayload['estado'] }) =>
      api.patch(`${TICKETS_ENDPOINT}/${id}`, { estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY] }) },
  })
}

export function useCerrarTicket(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CerrarTicketPayload) => api.patch(`${TICKETS_ENDPOINT}/${id}/cerrar`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY] }) },
  })
}

export function useAgregarDetalleTicket(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TicketDetallePayload) => api.post(`${TICKETS_ENDPOINT}/${ticketId}/detalles`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY, ticketId] }) },
  })
}

export function useAgregarRepuesto(ticketId: string) {
  return useAgregarDetalleTicket(ticketId)
}

export function useUpdateDetalleTicket(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ detalleId, data }: { detalleId: string; data: UpdateDetalleTicketPayload }) =>
      api.patch(`${TICKETS_ENDPOINT}/${ticketId}/detalles/${detalleId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY, ticketId] }) },
  })
}

export function useRemoveDetalleTicket(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (detalleId: string) =>
      api.delete(`${TICKETS_ENDPOINT}/${ticketId}/detalles/${detalleId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY, ticketId] }) },
  })
}

export function useDeleteTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`${TICKETS_ENDPOINT}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY] }) },
  })
}

export function useUploadTicketAdjunto(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.upload(`${TICKETS_ENDPOINT}/${ticketId}/adjuntos`, formData)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY, ticketId] }) },
  })
}

export function useDeleteTicketAdjunto(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (adjuntoId: string) =>
      api.delete(`${TICKETS_ENDPOINT}/${ticketId}/adjuntos/${adjuntoId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TICKETS_KEY, ticketId] }) },
  })
}
