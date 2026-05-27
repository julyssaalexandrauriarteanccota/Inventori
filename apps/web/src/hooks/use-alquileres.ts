"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ActivarContratoAlquilerPayload,
  AlquileresPaginatedResponse,
  CancelarContratoAlquilerPayload,
  CerrarPeriodoAlquilerPayload,
  CobrarPeriodoAlquilerPayload,
  ContratoAlquilerDetalle,
  ContratoAlquilerFormPayload,
  FinalizarContratoAlquilerPayload,
  QueryAlquilerFilters,
  RegistrarLecturaAlquilerPayload,
} from "@erp/shared";

import { api } from "@/lib/api";

const ALQUILERES_KEY = "alquileres";
const EQUIPOS_KEY = "equipos";
const INVENTARIO_KEY = "inventario";
const CAJA_KEY = "caja";

function buildParams(filters: QueryAlquilerFilters) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.search) params.set("search", filters.search);
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.clienteId) params.set("clienteId", filters.clienteId);
  if (filters.equipoId) params.set("equipoId", filters.equipoId);
  return params.toString();
}

function invalidateAlquileres(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [ALQUILERES_KEY] });
  qc.invalidateQueries({ queryKey: [EQUIPOS_KEY] });
  qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
  qc.invalidateQueries({ queryKey: [CAJA_KEY] });
}

export function useAlquileres(filters: QueryAlquilerFilters = {}) {
  return useQuery({
    queryKey: [ALQUILERES_KEY, filters],
    queryFn: () => {
      const qs = buildParams(filters);
      return api.get<AlquileresPaginatedResponse>(
        `/alquileres${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function useAlquiler(id: string | undefined) {
  return useQuery({
    queryKey: [ALQUILERES_KEY, id],
    queryFn: () =>
      api.get<{ data: ContratoAlquilerDetalle; meta: { timestamp: string } }>(
        `/alquileres/${id}`,
      ),
    enabled: Boolean(id),
  });
}

export function useCreateAlquiler() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContratoAlquilerFormPayload) =>
      api.post<{ data: ContratoAlquilerDetalle; meta: { timestamp: string } }>(
        "/alquileres",
        data,
      ),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useUpdateAlquiler(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContratoAlquilerFormPayload>) =>
      api.patch(`/alquileres/${id}`, data),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useActivarAlquiler(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ActivarContratoAlquilerPayload) =>
      api.post(`/alquileres/${id}/activar`, data),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useRegistrarLecturaAlquiler(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RegistrarLecturaAlquilerPayload) =>
      api.post(`/alquileres/${id}/lecturas`, data),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useCerrarPeriodoAlquiler(id: string, periodoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CerrarPeriodoAlquilerPayload) =>
      api.post(`/alquileres/${id}/periodos/${periodoId}/cerrar`, data),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useCobrarPeriodoAlquiler(id: string, periodoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CobrarPeriodoAlquilerPayload) =>
      api.post(`/alquileres/${id}/periodos/${periodoId}/cobrar-cierre`, data),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useCobrarBasePeriodoAlquiler(id: string, periodoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CobrarPeriodoAlquilerPayload) =>
      api.post(`/alquileres/${id}/periodos/${periodoId}/cobrar-base`, data),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useFinalizarAlquiler(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FinalizarContratoAlquilerPayload) =>
      api.post(`/alquileres/${id}/finalizar`, data),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useCancelarAlquiler(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CancelarContratoAlquilerPayload) =>
      api.post(`/alquileres/${id}/cancelar`, data),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useAnularAlquiler(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CancelarContratoAlquilerPayload) =>
      api.post(`/alquileres/${id}/anular`, data),
    onSuccess: () => invalidateAlquileres(qc),
  });
}

export function useDeleteAlquiler(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/alquileres/${id}`),
    onSuccess: () => invalidateAlquileres(qc),
  });
}
