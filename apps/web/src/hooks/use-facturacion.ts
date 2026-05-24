"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AmbienteSunat,
  CertificadoDigitalPayload,
  ClienteValidacionSunatPayload,
  ComprobantesPaginatedResponse,
  ConfigEmpresaFiscalPayload,
  EmpresaSedeFiscalPayload,
  EmitirComprobantePayload,
  EstadoVenta,
  EstadoComprobante,
  EstadoValidacionSunat,
  FormatoImpresionDocumento,
  PaginatedResponse,
  QueryComprobanteFilters,
  ResultadoValidacion,
  SerieDocumentoPayload,
  TipoDocumento,
  VentasPendientesFacturacionPaginatedResponse,
} from "@erp/shared";

import { api } from "@/lib/api";

const FACTURACION_KEY = "facturacion";

interface ApiEnvelope<T> {
  data: T;
  meta: { timestamp: string };
}

type QueryParamValue = string | number | boolean | null | undefined;

function buildParams(filters: Record<string, QueryParamValue>) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  return params.toString();
}

function toMoneyNumber(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeComprobantesResponse(
  response: ComprobantesPaginatedResponse,
): ComprobantesPaginatedResponse {
  return {
    ...response,
    data: response.data.map((item) => ({
      ...item,
      subtotal: toMoneyNumber(item.subtotal),
      igv: toMoneyNumber(item.igv),
      total: toMoneyNumber(item.total),
    })),
  };
}

function normalizeVentasPendientesResponse(
  response: VentasPendientesFacturacionPaginatedResponse,
): VentasPendientesFacturacionPaginatedResponse {
  return {
    ...response,
    data: response.data.map((item) => ({
      ...item,
      subtotal: toMoneyNumber(item.subtotal),
      igv: toMoneyNumber(item.igv),
      total: toMoneyNumber(item.total),
    })),
  };
}

export interface ConfigEmpresaFiscalItem extends ConfigEmpresaFiscalPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdateConfigEmpresaFiscalPayload = Partial<{
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  ubigeoFiscal: string;
  departamentoFiscal: string;
  provinciaFiscal: string;
  distritoFiscal: string;
  codigoEstablecimiento: string;
  correoSee: string;
  regimenTributario: string;
  formatoImpresionDefault: FormatoImpresionDocumento;
  pieImpresion: string;
  ambienteDefault: AmbienteSunat;
  // Doc 10 §6 — overrides parciales de reglas configurables
  reglasValidacion: Record<string, "BLOQUEANTE" | "ADVERTENCIA"> | null;
}>;

export interface EmpresaSedeFiscalItem extends EmpresaSedeFiscalPayload {
  id: string;
  configEmpresaFiscalId: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type CreateEmpresaSedeFiscalPayload = Omit<
  EmpresaSedeFiscalPayload,
  "id" | "configEmpresaFiscalId"
>;

export type UpdateEmpresaSedeFiscalPayload =
  Partial<CreateEmpresaSedeFiscalPayload>;

export interface QueryEmpresaSedeFiscalFilters {
  page?: number;
  limit?: number;
  activo?: boolean;
  search?: string;
}

export interface SerieDocumentoItem extends Omit<
  SerieDocumentoPayload,
  "id" | "descripcion"
> {
  id: string;
  correlativoActual: number;
  codigoEstablecimiento: string;
  ambiente: AmbienteSunat;
  activo: boolean;
  descripcion?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type CreateSerieDocumentoPayload = Omit<SerieDocumentoPayload, "id">;

export type UpdateSerieDocumentoPayload = Partial<CreateSerieDocumentoPayload>;

export interface QuerySerieDocumentoFilters {
  page?: number;
  limit?: number;
  tipo?: TipoDocumento;
  activo?: boolean;
  ambiente?: AmbienteSunat;
  sedeFiscalId?: string;
  search?: string;
}

export interface SyncLegacySeriesResponse {
  created: number;
  restored: number;
  skipped: number;
}

export interface CertificadoDigitalItem extends Omit<
  CertificadoDigitalPayload,
  | "fingerprintSha256"
  | "serialNumber"
  | "subject"
  | "issuer"
  | "validoDesde"
  | "validoHasta"
  | "revokedAt"
> {
  id: string;
  configEmpresaFiscalId: string;
  fingerprintSha256?: string | null;
  serialNumber?: string | null;
  subject?: string | null;
  issuer?: string | null;
  validoDesde?: string | null;
  validoHasta?: string | null;
  activo: boolean;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SunatCredentialsStatus {
  configured: boolean;
  source: "FISCAL_SECRET" | "ENV" | "NONE";
  usernameConfigured: boolean;
  passwordConfigured: boolean;
  usernameMode: "FULL_USERNAME" | "RUC_PLUS_SOL_USER" | null;
  usernamePreview: string | null;
}

export interface SunatDirectStatus {
  ambienteDefault: AmbienteSunat;
  tieneCertificadoActivo: boolean;
  certificadoActivo?: CertificadoDigitalItem | null;
  sedesActivas: number;
  seriesActivas: number;
  credencialesSunat?: SunatCredentialsStatus;
}

export interface QueryCertificadoDigitalFilters {
  page?: number;
  limit?: number;
  activo?: boolean;
}

export interface UploadCertificadoDigitalPayload {
  file: File;
  nombre: string;
  password: string;
}

export interface UpdateSunatCredentialsPayload {
  solUsername?: string;
  solUser?: string;
  password: string;
}

export interface SunatDirectTestConnectionResult {
  ok: boolean;
  endpoint: string;
  ambiente: AmbienteSunat;
  usernameConfigured: boolean;
  passwordConfigured: boolean;
  credentialsSource?: "FISCAL_SECRET" | "ENV";
  usernameMode?: "FULL_USERNAME" | "RUC_PLUS_SOL_USER";
  certificadoActivo?: CertificadoDigitalItem | null;
}

export interface ClienteValidacionSunatItem extends Omit<
  ClienteValidacionSunatPayload,
  | "clienteId"
  | "proveedor"
  | "nombreNormalizado"
  | "direccionFiscal"
  | "ubigeo"
  | "departamento"
  | "provincia"
  | "distrito"
  | "condicionDomicilio"
  | "ultimaValidacionAt"
> {
  id: string;
  clienteId?: string | null;
  proveedor?: ClienteValidacionSunatPayload["proveedor"] | null;
  nombreNormalizado?: string | null;
  direccionFiscal?: string | null;
  ubigeo?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  condicionDomicilio?: string | null;
  ultimaValidacionAt?: string | null;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    id: string;
    nombre?: string | null;
    apellido?: string | null;
    razonSocial?: string | null;
    dni?: string | null;
    ruc?: string | null;
  } | null;
}

export type CreateClienteValidacionSunatPayload = Omit<
  ClienteValidacionSunatPayload,
  "ultimaValidacionAt"
>;

export type UpdateClienteValidacionSunatPayload =
  Partial<CreateClienteValidacionSunatPayload>;

export interface QueryClienteValidacionSunatFilters {
  page?: number;
  limit?: number;
  clienteId?: string;
  estado?: EstadoValidacionSunat;
  search?: string;
}

export interface ImportPadronSunatRucResult {
  status:
    | "IDLE"
    | "RUNNING"
    | "CANCEL_REQUESTED"
    | "CANCELLED"
    | "SUCCESS"
    | "ERROR";
  stage:
    | "IDLE"
    | "DOWNLOADING"
    | "DECOMPRESSING"
    | "CLEANING"
    | "IMPORTING"
    | "PUBLISHING"
    | "COMPLETED"
    | "CANCELLED"
    | "ERROR";
  sourceUrl: string | null;
  message: string;
  processed: number;
  inserted: number;
  discarded: number;
  totalLines: number | null;
  currentRecords: number;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  importedAt: string | null;
  error: string | null;
}

export interface FeriadoNacionalItem {
  id: string;
  fecha: string;
  nombre: string;
  anio: number;
  esNoLaborable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeriadoNacionalPayload {
  fecha: string;
  nombre: string;
  esNoLaborable?: boolean;
}

export type UpdateFeriadoNacionalPayload =
  Partial<CreateFeriadoNacionalPayload>;

interface ConsultarSunatComprobanteResult {
  comprobante: Record<string, unknown>;
  consulta: {
    accepted: boolean;
    codigoRespuesta: string;
    mensaje: string;
    requestPayload: Record<string, unknown>;
    responsePayload: Record<string, unknown>;
    cdrContent?: string | null;
  };
}

export interface ComprobanteEnvioLogItem {
  id: string;
  comprobanteId: string;
  proveedor?: string | null;
  tipoEvento: string;
  estado: string;
  intento: number;
  requestPayload?: unknown | null;
  responsePayload?: unknown | null;
  codigoRespuesta?: string | null;
  mensaje?: string | null;
  createdAt: string;
  updatedAt: string;
  comprobante?: {
    id: string;
    numero: string;
    tipo: TipoDocumento;
    estado: EstadoComprobante;
  } | null;
}

export interface QueryComprobanteEnvioLogFilters {
  page?: number;
  limit?: number;
  comprobanteId?: string;
  estado?: string;
  tipoEvento?: string;
}

export function useComprobantes(filters: QueryComprobanteFilters = {}) {
  return useQuery({
    queryKey: [FACTURACION_KEY, filters],
    queryFn: async () => {
      const qs = buildParams(filters as Record<string, QueryParamValue>);
      const response = await api.get<ComprobantesPaginatedResponse>(
        `/facturacion/comprobantes${qs ? `?${qs}` : ""}`,
      );
      return normalizeComprobantesResponse(response);
    },
  });
}

export interface QueryVentasPendientesFacturacionFilters {
  page?: number;
  limit?: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  totalMin?: number | string;
  totalMax?: number | string;
  estadoComercial?: EstadoVenta;
  vendedor?: string;
}

export function useVentasPendientesFacturacion(
  filters: QueryVentasPendientesFacturacionFilters = {},
) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "ventas-pendientes", filters],
    queryFn: async () => {
      const qs = buildParams(filters as Record<string, QueryParamValue>);
      const response =
        await api.get<VentasPendientesFacturacionPaginatedResponse>(
          `/facturacion/ventas-pendientes${qs ? `?${qs}` : ""}`,
        );
      return normalizeVentasPendientesResponse(response);
    },
  });
}

export function useComprobante(id: string | undefined) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "detalle", id],
    queryFn: () =>
      api.get<{ data: Record<string, unknown>; meta: { timestamp: string } }>(
        `/facturacion/comprobantes/${id}`,
      ),
    enabled: !!id,
  });
}

export function useEmitirComprobante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmitirComprobantePayload) =>
      api.post("/facturacion/emitir", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY] });
      qc.invalidateQueries({ queryKey: ["ventas"] });
    },
  });
}

// Doc 10 §7 — preview de bloqueantes/advertencias antes de emitir.
export function useValidarPreEmision(
  ventaId: string | undefined,
  tipo: TipoDocumento,
  enabled = true,
) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "validar-pre-emision", ventaId, tipo],
    queryFn: () =>
      api.get<ApiEnvelope<ResultadoValidacion>>(
        `/facturacion/validar-pre-emision/${ventaId}?tipo=${tipo}`,
      ),
    enabled: enabled && !!ventaId,
    staleTime: 30_000,
  });
}

export function useAnularComprobante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      api.post(`/facturacion/comprobantes/${id}/anular`, { motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY] });
    },
  });
}

export interface NotaCreditoItem {
  id: string;
  comprobanteOrigenId: string;
  tipo: string;
  motivo: string;
  monto: number;
  serie: string;
  correlativo: number;
  numero: string;
  estado: EstadoComprobante;
  createdAt: string;
  updatedAt: string;
}

export interface NotaCreditoLinea {
  item: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface CreateNotaCreditoPayload {
  comprobanteOrigenId: string;
  motivoCodigo: string;
  motivoDescripcion: string;
  monto: number;
  esExcepcional?: boolean;
  anulaTotalmente?: boolean;
  lineas?: NotaCreditoLinea[];
  /** @deprecated alias legacy aceptado por compatibilidad. */
  tipo?: string;
  /** @deprecated alias legacy aceptado por compatibilidad. */
  motivo?: string;
}

export interface CreateNotaDebitoPayload {
  comprobanteOrigenId: string;
  motivoCodigo: string;
  motivoDescripcion: string;
  monto: number;
  lineas?: NotaCreditoLinea[];
}

export interface SaldoNoAcreditado {
  comprobanteOrigenId: string;
  tipoOrigen: TipoDocumento;
  estadoOrigen: EstadoComprobante;
  fechaEmision: string;
  totalOrigen: number;
  saldoNoAcreditado: number;
  acreditado: number;
  ncExcepcionalPlazoVencido: boolean;
  bloqueoPorNcEnProceso: {
    id: string;
    numero: string;
    estado: EstadoComprobante;
  } | null;
  puedeEmitirNc: boolean;
}

export function useSaldoNoAcreditado(comprobanteId: string | undefined) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "saldo-nc", comprobanteId],
    queryFn: () =>
      api.get<ApiEnvelope<SaldoNoAcreditado>>(
        `/facturacion/comprobantes/${comprobanteId}/saldo-nc`,
      ),
    enabled: !!comprobanteId,
  });
}

export function useCrearNotaCredito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNotaCreditoPayload) =>
      api.post<ApiEnvelope<NotaCreditoItem>>("/facturacion/notas-credito", data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY] });
      qc.invalidateQueries({ queryKey: ["ventas"] });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "saldo-nc", variables.comprobanteOrigenId],
      });
    },
  });
}

export function useCrearNotaDebito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNotaDebitoPayload) =>
      api.post<ApiEnvelope<NotaCreditoItem>>("/facturacion/notas-debito", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY] });
      qc.invalidateQueries({ queryKey: ["ventas"] });
    },
  });
}

export function useConsultarEstadoBaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/facturacion/comunicaciones-baja/${id}/consultar-estado`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY] });
    },
  });
}

export interface ComunicacionBajaDetail {
  id: string;
  comprobanteId: string;
  identificadorBaja: string;
  ambiente?: AmbienteSunat | null;
  estado: string;
  ticketSunat?: string | null;
  xmlStorageKey?: string | null;
  cdrStorageKey?: string | null;
  cdrRecibidaAt?: string | null;
  cdrCodigo?: string | null;
  cdrMensaje?: string | null;
  motivo?: string | null;
  iniciadoPor?: string | null;
  errorMessage?: string | null;
  fechaReferencia?: string | null;
  deadline?: string | null;
  createdAt: string;
  updatedAt: string;
  comprobante?: {
    id: string;
    numero: string;
    tipo: TipoDocumento;
    serie: string;
    correlativo: number;
    total: number;
    estado: EstadoComprobante;
    clienteNombre?: string | null;
    clienteDocNum?: string | null;
    fechaEmision: string;
    cdrRecibidaAt?: string | null;
    emisorRuc?: string | null;
  } | null;
}

export function useComunicacionBaja(id: string | undefined) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "comunicaciones-baja", id],
    queryFn: () =>
      api.get<ApiEnvelope<ComunicacionBajaDetail>>(
        `/facturacion/comunicaciones-baja/${id}`,
      ),
    enabled: !!id,
  });
}

export interface ComunicacionBajaListItem {
  id: string;
  comprobanteId: string;
  identificadorBaja: string;
  ambiente?: AmbienteSunat | null;
  estado: string;
  ticketSunat?: string | null;
  xmlStorageKey?: string | null;
  cdrStorageKey?: string | null;
  cdrRecibidaAt?: string | null;
  cdrCodigo?: string | null;
  cdrMensaje?: string | null;
  motivo?: string | null;
  iniciadoPor?: string | null;
  deadline?: string | null;
  createdAt: string;
  comprobante?: {
    id: string;
    numero: string;
    tipo: TipoDocumento;
    total: number;
    clienteNombre?: string | null;
    clienteDocNum?: string | null;
    fechaEmision: string;
  } | null;
}

export interface QueryComunicacionesBajaFilters {
  page?: number;
  limit?: number;
  estado?: string;
  search?: string;
}

export function useComunicacionesBaja(
  filters: QueryComunicacionesBajaFilters = {},
) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "comunicaciones-baja", filters],
    queryFn: () => {
      const qs = buildParams(filters as Record<string, QueryParamValue>);
      return api.get<{
        data: ComunicacionBajaListItem[];
        meta: { total: number; page: number; limit: number; timestamp: string };
      }>(`/facturacion/comunicaciones-baja${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useReintentarComprobante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/facturacion/comprobantes/${id}/reintentar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY] });
    },
  });
}

export function useConsultarSunatComprobante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiEnvelope<ConsultarSunatComprobanteResult>>(
        `/facturacion/comprobantes/${id}/consultar-sunat`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY] });
    },
  });
}

export function useConfigFiscal() {
  return useQuery({
    queryKey: [FACTURACION_KEY, "config-fiscal"],
    queryFn: () =>
      api.get<ApiEnvelope<ConfigEmpresaFiscalItem | null>>(
        "/facturacion/config-fiscal",
      ),
  });
}

export function useUpdateConfigFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateConfigEmpresaFiscalPayload) =>
      api.patch<ApiEnvelope<ConfigEmpresaFiscalItem>>(
        "/facturacion/config-fiscal",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY, "config-fiscal"] });
    },
  });
}

export function useSedesFiscales(filters: QueryEmpresaSedeFiscalFilters = {}) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "sedes-fiscales", filters],
    queryFn: () => {
      const qs = buildParams(filters as Record<string, QueryParamValue>);
      return api.get<PaginatedResponse<EmpresaSedeFiscalItem>>(
        `/facturacion/sedes-fiscales${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function useCreateSedeFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmpresaSedeFiscalPayload) =>
      api.post<ApiEnvelope<EmpresaSedeFiscalItem>>(
        "/facturacion/sedes-fiscales",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY, "sedes-fiscales"] });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "sunat-direct-status"],
      });
    },
  });
}

export function useUpdateSedeFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmpresaSedeFiscalPayload;
    }) =>
      api.patch<ApiEnvelope<EmpresaSedeFiscalItem>>(
        `/facturacion/sedes-fiscales/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY, "sedes-fiscales"] });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "sunat-direct-status"],
      });
    },
  });
}

export function useDeleteSedeFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<ApiEnvelope<EmpresaSedeFiscalItem>>(
        `/facturacion/sedes-fiscales/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY, "sedes-fiscales"] });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "sunat-direct-status"],
      });
    },
  });
}

export function useSeriesDocumento(filters: QuerySerieDocumentoFilters = {}) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "series-documento", filters],
    queryFn: () => {
      const qs = buildParams(filters as Record<string, QueryParamValue>);
      return api.get<PaginatedResponse<SerieDocumentoItem>>(
        `/facturacion/series-documento${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function useCreateSerieDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSerieDocumentoPayload) =>
      api.post<ApiEnvelope<SerieDocumentoItem>>(
        "/facturacion/series-documento",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "series-documento"],
      });
    },
  });
}

export function useUpdateSerieDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSerieDocumentoPayload;
    }) =>
      api.patch<ApiEnvelope<SerieDocumentoItem>>(
        `/facturacion/series-documento/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "series-documento"],
      });
    },
  });
}

export function useDeleteSerieDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<ApiEnvelope<SerieDocumentoItem>>(
        `/facturacion/series-documento/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "series-documento"],
      });
    },
  });
}

export function useSyncLegacySeriesDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<ApiEnvelope<SyncLegacySeriesResponse>>(
        "/facturacion/series-documento/sync-legacy",
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "series-documento"],
      });
    },
  });
}

export function useSunatDirectStatus() {
  return useQuery({
    queryKey: [FACTURACION_KEY, "sunat-direct-status"],
    queryFn: () =>
      api.get<ApiEnvelope<SunatDirectStatus>>(
        "/facturacion/sunat-direct/status",
      ),
  });
}

export function useTestSunatDirectConnection() {
  return useMutation({
    mutationFn: () =>
      api.post<ApiEnvelope<SunatDirectTestConnectionResult>>(
        "/facturacion/sunat-direct/test-connection",
      ),
  });
}

export function useSunatCredentialsStatus() {
  return useQuery({
    queryKey: [FACTURACION_KEY, "sunat-direct", "credentials-status"],
    queryFn: () =>
      api.get<ApiEnvelope<SunatCredentialsStatus>>(
        "/facturacion/sunat-direct/credentials/status",
      ),
  });
}

export function useUpdateSunatCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSunatCredentialsPayload) =>
      api.patch<ApiEnvelope<SunatCredentialsStatus>>(
        "/facturacion/sunat-direct/credentials",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY, "sunat-direct"] });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "sunat-direct-status"],
      });
    },
  });
}

export function useCertificadosDigitales(
  filters: QueryCertificadoDigitalFilters = {},
) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "certificados-digitales", filters],
    queryFn: () => {
      const qs = buildParams(filters as Record<string, QueryParamValue>);
      return api.get<PaginatedResponse<CertificadoDigitalItem>>(
        `/facturacion/certificados-digitales${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function useUploadCertificadoDigital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      nombre,
      password,
    }: UploadCertificadoDigitalPayload) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("nombre", nombre);
      formData.append("password", password);
      return api.upload<ApiEnvelope<CertificadoDigitalItem>>(
        "/facturacion/certificados-digitales",
        formData,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "certificados-digitales"],
      });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "sunat-direct-status"],
      });
    },
  });
}

export function useActivateCertificadoDigital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiEnvelope<CertificadoDigitalItem>>(
        `/facturacion/certificados-digitales/${id}/activar`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "certificados-digitales"],
      });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "sunat-direct-status"],
      });
    },
  });
}

export function useRevokeCertificadoDigital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiEnvelope<CertificadoDigitalItem>>(
        `/facturacion/certificados-digitales/${id}/revocar`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "certificados-digitales"],
      });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "sunat-direct-status"],
      });
    },
  });
}

export function useDeleteCertificadoDigital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<ApiEnvelope<CertificadoDigitalItem>>(
        `/facturacion/certificados-digitales/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "certificados-digitales"],
      });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "sunat-direct-status"],
      });
    },
  });
}

export function useClienteValidacionesSunat(
  filters: QueryClienteValidacionSunatFilters = {},
) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "clientes-validaciones", filters],
    queryFn: () => {
      const qs = buildParams(filters as Record<string, QueryParamValue>);
      return api.get<PaginatedResponse<ClienteValidacionSunatItem>>(
        `/facturacion/clientes-validaciones${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function useClienteValidacionSunat(id: string | undefined) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "clientes-validaciones", "detalle", id],
    queryFn: () =>
      api.get<ApiEnvelope<ClienteValidacionSunatItem>>(
        `/facturacion/clientes-validaciones/${id}`,
      ),
    enabled: !!id,
  });
}

export function useCreateClienteValidacionSunat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClienteValidacionSunatPayload) =>
      api.post<ApiEnvelope<ClienteValidacionSunatItem>>(
        "/facturacion/clientes-validaciones",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "clientes-validaciones"],
      });
    },
  });
}

export function useUpdateClienteValidacionSunat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateClienteValidacionSunatPayload;
    }) =>
      api.patch<ApiEnvelope<ClienteValidacionSunatItem>>(
        `/facturacion/clientes-validaciones/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "clientes-validaciones"],
      });
    },
  });
}

export function useDeleteClienteValidacionSunat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<ApiEnvelope<ClienteValidacionSunatItem>>(
        `/facturacion/clientes-validaciones/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "clientes-validaciones"],
      });
    },
  });
}

export function useImportPadronSunatRuc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<ApiEnvelope<ImportPadronSunatRucResult>>(
        "/facturacion/padron-sunat-ruc/importar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "padron-sunat-ruc"],
      });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "clientes-validaciones"],
      });
    },
  });
}

export function useCancelPadronSunatRucImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<ApiEnvelope<ImportPadronSunatRucResult>>(
        "/facturacion/padron-sunat-ruc/importar/cancelar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "padron-sunat-ruc"],
      });
      qc.invalidateQueries({
        queryKey: [FACTURACION_KEY, "padron-sunat-ruc", "import-status"],
      });
    },
  });
}

export function usePadronSunatRucImportStatus() {
  return useQuery({
    queryKey: [FACTURACION_KEY, "padron-sunat-ruc", "import-status"],
    queryFn: () =>
      api.get<ApiEnvelope<ImportPadronSunatRucResult>>(
        "/facturacion/padron-sunat-ruc/importar/status",
      ),
    refetchInterval: (query) =>
      query.state.data?.data.status === "RUNNING" ||
      query.state.data?.data.status === "CANCEL_REQUESTED"
        ? 2000
        : false,
  });
}

export function useFeriadosNacionales(anio: number) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "feriados", anio],
    queryFn: () =>
      api.get<ApiEnvelope<FeriadoNacionalItem[]>>(
        `/facturacion/feriados?anio=${anio}`,
      ),
  });
}

export function useCreateFeriadoNacional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeriadoNacionalPayload) =>
      api.post<ApiEnvelope<FeriadoNacionalItem>>("/facturacion/feriados", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY, "feriados"] });
    },
  });
}

export function useUpdateFeriadoNacional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFeriadoNacionalPayload;
    }) =>
      api.patch<ApiEnvelope<FeriadoNacionalItem>>(
        `/facturacion/feriados/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY, "feriados"] });
    },
  });
}

export function useDeleteFeriadoNacional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<ApiEnvelope<FeriadoNacionalItem>>(
        `/facturacion/feriados/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FACTURACION_KEY, "feriados"] });
    },
  });
}

export function useComprobanteEnvioLogs(
  filters: QueryComprobanteEnvioLogFilters = {},
) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "envio-logs", filters],
    queryFn: () => {
      const qs = buildParams(filters as Record<string, QueryParamValue>);
      return api.get<PaginatedResponse<ComprobanteEnvioLogItem>>(
        `/facturacion/envio-logs${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function useComprobanteEnvios(comprobanteId: string | undefined) {
  return useQuery({
    queryKey: [FACTURACION_KEY, "comprobantes", comprobanteId, "envios"],
    queryFn: () =>
      api.get<ApiEnvelope<ComprobanteEnvioLogItem[]>>(
        `/facturacion/comprobantes/${comprobanteId}/envios`,
      ),
    enabled: !!comprobanteId,
  });
}
