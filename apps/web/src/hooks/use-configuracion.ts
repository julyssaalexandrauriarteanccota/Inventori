"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ConfigEmpresaPayload,
  SeriesDocumentosPayload,
  CreateTipoMovimientoConfigPayload,
  MetodoPagoPayload,
  MetodoPagoListItem,
  TipoMovimientoConfigListItem,
  UpdateTipoMovimientoConfigPayload,
  DashboardKpisResponse,
  AuditoriaPaginatedResponse,
  RolUsuario,
} from "@erp/shared";

import { api } from "@/lib/api";

const CONFIG_KEY = "configuracion";
const USUARIOS_KEY = "usuarios";

/* ── Usuario types ─────────────────────────────────── */

export interface UsuarioItem {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  mustChangePassword: boolean;
  ultimoAcceso: string | null;
  telefono?: string | null;
  celular?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  cargo?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  fotoPerfilUrl?: string | null;
  fotoPerfil?: string | null;
  imagen?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUsuarioPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: RolUsuario;
  activo?: boolean;
}

export interface UpdateUsuarioPayload {
  nombre?: string;
  apellido?: string;
  email?: string;
  rol?: RolUsuario;
  activo?: boolean;
}

export interface ChangeUsuarioPasswordPayload {
  password: string;
}

interface UsuariosPaginatedResponse {
  data: UsuarioItem[];
  meta: { total: number; page: number; limit: number; timestamp: string };
}

/* ── Usuario hooks ─────────────────────────────────── */

export function useUsuarios(page = 1, search?: string, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);
  return useQuery({
    queryKey: [USUARIOS_KEY, page, limit, search ?? ""],
    queryFn: () => api.get<UsuariosPaginatedResponse>(`/usuarios?${params}`),
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUsuarioPayload) => api.post("/usuarios", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USUARIOS_KEY] });
    },
  });
}

export function useUpdateUsuario(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUsuarioPayload) =>
      api.patch(`/usuarios/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USUARIOS_KEY] });
    },
  });
}

export function useChangeUsuarioPassword(id: string) {
  return useMutation({
    mutationFn: (data: ChangeUsuarioPasswordPayload) =>
      api.patch(`/usuarios/${id}/password`, data),
  });
}

export function useDeleteUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/usuarios/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USUARIOS_KEY] });
    },
  });
}

export function useActivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ id: string; message: string }>(`/usuarios/${id}/activar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USUARIOS_KEY] });
    },
  });
}

export function useDesactivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ id: string; message: string }>(`/usuarios/${id}/desactivar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USUARIOS_KEY] });
    },
  });
}

export function useConfigEmpresa() {
  return useQuery({
    queryKey: [CONFIG_KEY, "empresa"],
    queryFn: () =>
      api.get<{ data: ConfigEmpresaPayload; meta: { timestamp: string } }>(
        "/config/empresa",
      ),
    // Configuración rara vez cambia; las mutaciones invalidan la cache
    staleTime: 30 * 60 * 1000,
  });
}

export function useUpdateConfigEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfigEmpresaPayload) =>
      api.patch("/config/empresa", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY, "empresa"] });
      qc.invalidateQueries({ queryKey: ["empresa-publica"] });
    },
  });
}

export function useSeriesDocumentos() {
  return useQuery({
    queryKey: [CONFIG_KEY, "series"],
    queryFn: () =>
      api.get<{ data: SeriesDocumentosPayload; meta: { timestamp: string } }>(
        "/config/series",
      ),
    staleTime: 30 * 60 * 1000,
  });
}

export function useUpdateSeriesDocumentos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SeriesDocumentosPayload) =>
      api.patch("/config/series", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY, "series"] });
    },
  });
}

export function useMetodosPago() {
  return useQuery({
    queryKey: [CONFIG_KEY, "metodos-pago"],
    queryFn: () =>
      api.get<{ data: MetodoPagoListItem[]; meta: { timestamp: string } }>(
        "/config/metodos-pago",
      ),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCreateMetodoPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MetodoPagoPayload) =>
      api.post("/config/metodos-pago", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY, "metodos-pago"] });
    },
  });
}

export function useUpdateMetodoPago(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MetodoPagoPayload>) =>
      api.patch(`/config/metodos-pago/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY, "metodos-pago"] });
    },
  });
}

export function useDeleteMetodoPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/config/metodos-pago/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY, "metodos-pago"] });
    },
  });
}

export function useTiposMovimientoConfig() {
  return useQuery({
    queryKey: [CONFIG_KEY, "tipos-movimiento"],
    queryFn: () =>
      api.get<{
        data: TipoMovimientoConfigListItem[];
        meta: { timestamp: string };
      }>("/config/tipos-movimiento"),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCreateTipoMovimientoConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTipoMovimientoConfigPayload) =>
      api.post("/config/tipos-movimiento", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY, "tipos-movimiento"] });
    },
  });
}

export function useUpdateTipoMovimientoConfig(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTipoMovimientoConfigPayload) =>
      api.patch(`/config/tipos-movimiento/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY, "tipos-movimiento"] });
    },
  });
}

export function useDeleteTipoMovimientoConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/config/tipos-movimiento/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY, "tipos-movimiento"] });
    },
  });
}

/* ── Report hooks ──────────────────────────────────── */

const REPORTES_KEY = "reportes";

export interface ReporteVentasFilters {
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ReporteVentasData {
  resumen: {
    totalVentas: number;
    subtotal: number;
    descuento: number;
    igv: number;
    total: number;
  };
  porEstado: { estado: string; cantidad: number; total: number }[];
  ultimasVentas: {
    id: string;
    numero: string;
    estado: string;
    total: number;
    createdAt: string;
    cliente: { id: string; nombre?: string; razonSocial?: string };
    usuario: { id: string; nombre: string };
  }[];
}

export function useReporteVentas(filters: ReporteVentasFilters = {}) {
  const params = new URLSearchParams();
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.fechaDesde) params.set("fechaDesde", filters.fechaDesde);
  if (filters.fechaHasta) params.set("fechaHasta", filters.fechaHasta);
  const qs = params.toString();
  return useQuery({
    queryKey: [REPORTES_KEY, "ventas", filters],
    queryFn: () =>
      api.get<{ data: ReporteVentasData; meta: { timestamp: string } }>(
        `/reportes/ventas${qs ? `?${qs}` : ""}`,
      ),
  });
}

export interface ReporteStockFilters {
  almacenId?: string;
  stockBajo?: boolean;
}

export interface ReporteStockData {
  totalAlertas: number;
  alertas: {
    resuelta: boolean;
    producto: { id: string; nombre: string; sku: string };
    almacen: { id: string; nombre: string };
  }[];
  stockBajo?: {
    cantidad: number;
    producto: { id: string; nombre: string; sku: string };
    almacen: { id: string; nombre: string };
  }[];
}

export function useReporteStock(filters: ReporteStockFilters = {}) {
  const params = new URLSearchParams();
  if (filters.almacenId) params.set("almacenId", filters.almacenId);
  if (filters.stockBajo) params.set("stockBajo", "true");
  const qs = params.toString();
  return useQuery({
    queryKey: [REPORTES_KEY, "stock", filters],
    queryFn: () =>
      api.get<{ data: ReporteStockData; meta: { timestamp: string } }>(
        `/reportes/stock${qs ? `?${qs}` : ""}`,
      ),
  });
}

export interface ReporteTicketsFilters {
  estado?: string;
  tecnicoId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ReporteTicketsData {
  total: number;
  porEstado: { estado: string; cantidad: number }[];
  porPrioridad: { prioridad: string; cantidad: number }[];
  porTecnico: { tecnicoId: string; nombre: string; cantidad: number }[];
}

export function useReporteTickets(filters: ReporteTicketsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.tecnicoId) params.set("tecnicoId", filters.tecnicoId);
  if (filters.fechaDesde) params.set("fechaDesde", filters.fechaDesde);
  if (filters.fechaHasta) params.set("fechaHasta", filters.fechaHasta);
  const qs = params.toString();
  return useQuery({
    queryKey: [REPORTES_KEY, "tickets", filters],
    queryFn: () =>
      api.get<{ data: ReporteTicketsData; meta: { timestamp: string } }>(
        `/reportes/tickets${qs ? `?${qs}` : ""}`,
      ),
  });
}

export interface QueryAuditoriaFilters {
  page?: number;
  limit?: number;
  usuarioId?: string;
  modelo?: string;
  accion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}

function buildAuditoriaParams(filters: QueryAuditoriaFilters) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.usuarioId) params.set("usuarioId", filters.usuarioId);
  if (filters.modelo) params.set("modelo", filters.modelo);
  if (filters.accion) params.set("accion", filters.accion);
  if (filters.fechaDesde) params.set("fechaDesde", filters.fechaDesde);
  if (filters.fechaHasta) params.set("fechaHasta", filters.fechaHasta);
  if (filters.search) params.set("search", filters.search);
  return params.toString();
}

export function useAuditoria(filters: QueryAuditoriaFilters = {}) {
  return useQuery({
    queryKey: [CONFIG_KEY, "auditoria", filters],
    queryFn: () => {
      const qs = buildAuditoriaParams(filters);
      return api.get<AuditoriaPaginatedResponse>(
        `/config/auditoria${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: () =>
      api.get<{ data: DashboardKpisResponse; meta: { timestamp: string } }>(
        "/reportes/dashboard",
      ),
    staleTime: 5 * 60 * 1000,
  });
}
