"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProductosPaginatedResponse,
  ProductoDetailItem,
  ProductoFilters,
  ProductoFormPayload,
  CategoriaListItem,
  ModeloCatalogoListItem,
  ModeloCatalogoPayload,
  TipoProducto,
  UnidadMedidaListItem,
  UnidadMedidaPayload,
} from "@erp/shared";

import { api } from "@/lib/api";

const PRODUCTOS_KEY = "productos";
const CATEGORIAS_KEY = "categorias";
const MARCAS_KEY = "marcas";
const MODELOS_KEY = "modelos-catalogo";
const UNIDADES_MEDIDA_KEY = "unidades-medida";

function buildParams(filters: ProductoFilters) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.search) params.set("search", filters.search);
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.excluirTipos && filters.excluirTipos.length > 0)
    params.set("excluirTipos", filters.excluirTipos.join(","));
  if (filters.categoriaId) params.set("categoriaId", filters.categoriaId);
  if (filters.marcaId) params.set("marcaId", filters.marcaId);
  if (filters.condicion) params.set("condicion", filters.condicion);
  if (filters.esConsumible !== undefined)
    params.set("esConsumible", String(filters.esConsumible));
  if (filters.tieneNumeroSerie !== undefined)
    params.set("tieneNumeroSerie", String(filters.tieneNumeroSerie));
  if (filters.activo !== undefined)
    params.set("activo", String(filters.activo));
  if (filters.conStock !== undefined)
    params.set("conStock", String(filters.conStock));
  return params.toString();
}

function buildModelosParams(filters: {
  tipo?: TipoProducto;
  marcaId?: string;
  activo?: boolean;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.marcaId) params.set("marcaId", filters.marcaId);
  if (filters.search) params.set("search", filters.search);
  if (filters.activo !== undefined)
    params.set("activo", String(filters.activo));
  return params.toString();
}

export function useProductos(filters: ProductoFilters = {}) {
  return useQuery({
    queryKey: [PRODUCTOS_KEY, filters],
    queryFn: () => {
      const qs = buildParams(filters);
      return api.get<ProductosPaginatedResponse>(
        `/productos${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function useProducto(id: string | undefined) {
  return useQuery({
    queryKey: [PRODUCTOS_KEY, id],
    queryFn: () =>
      api.get<{ data: ProductoDetailItem; meta: { timestamp: string } }>(
        `/productos/${id}`,
      ),
    enabled: !!id,
  });
}

export function useNextProductoSku(
  tipo: TipoProducto | undefined,
  categoriaId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [PRODUCTOS_KEY, "sku-sugerido", tipo, categoriaId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (tipo) params.set("tipo", tipo);
      if (categoriaId) params.set("categoriaId", categoriaId);
      return api.get<{ data: { sku: string }; meta: { timestamp: string } }>(
        `/productos/sku-sugerido?${params.toString()}`,
      );
    },
    enabled: enabled && !!tipo,
    staleTime: 0,
  });
}

export function useCreateProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductoFormPayload) =>
      api.post<{ data: ProductoDetailItem; meta: { timestamp: string } }>(
        "/productos",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTOS_KEY] });
    },
  });
}

export function useUpdateProducto(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProductoFormPayload>) =>
      api.patch(`/productos/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTOS_KEY] });
    },
  });
}

export function useDeleteProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/productos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTOS_KEY] });
    },
  });
}

// Categorías
export interface CategoriaItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: CategoriaListItem["tipo"];
  padreId: string | null;
  hijos?: CategoriaItem[];
}

export function useCategorias(tipo?: CategoriaListItem["tipo"]) {
  return useQuery({
    queryKey: [CATEGORIAS_KEY, tipo],
    queryFn: () =>
      api.get<{ data: CategoriaItem[]; meta: { timestamp: string } }>(
        `/categorias${tipo ? `?tipo=${tipo}` : ""}`,
      ),
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      nombre: string;
      descripcion?: string;
      tipo?: CategoriaItem["tipo"];
      padreId?: string;
    }) => api.post("/categorias", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] });
    },
  });
}

export function useUpdateCategoria(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      nombre?: string;
      descripcion?: string;
      tipo?: CategoriaItem["tipo"];
      padreId?: string | null;
    }) => api.patch(`/categorias/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] });
    },
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categorias/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] });
    },
  });
}

// Marcas
export interface MarcaItem {
  id: string;
  nombre: string;
  tipos: TipoProducto[];
}

export type ModeloCatalogoItem = ModeloCatalogoListItem;

export function useMarcas(tipo?: TipoProducto) {
  return useQuery({
    queryKey: [MARCAS_KEY, tipo],
    queryFn: () =>
      api.get<{ data: MarcaItem[]; meta: { timestamp: string } }>(
        `/marcas${tipo ? `?tipo=${tipo}` : ""}`,
      ),
  });
}

export function useCreateMarca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nombre: string; tipos: TipoProducto[] }) =>
      api.post("/marcas", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MARCAS_KEY] });
    },
  });
}

export function useUpdateMarca(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nombre?: string; tipos?: TipoProducto[] }) =>
      api.patch(`/marcas/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MARCAS_KEY] });
    },
  });
}

export function useDeleteMarca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/marcas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MARCAS_KEY] });
    },
  });
}

// Modelos de catálogo
export function useModelosCatalogo(
  filters: {
    tipo?: TipoProducto;
    marcaId?: string;
    activo?: boolean;
    search?: string;
  } = {},
) {
  return useQuery({
    queryKey: [MODELOS_KEY, filters],
    queryFn: () => {
      const qs = buildModelosParams(filters);
      return api.get<{
        data: ModeloCatalogoItem[];
        meta: { timestamp: string };
      }>(`/modelos${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useCreateModeloCatalogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ModeloCatalogoPayload) =>
      api.post<{ data: ModeloCatalogoItem; meta: { timestamp: string } }>(
        "/modelos",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MODELOS_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCTOS_KEY] });
    },
  });
}

export function useUpdateModeloCatalogo(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ModeloCatalogoPayload>) =>
      api.patch<{ data: ModeloCatalogoItem; meta: { timestamp: string } }>(
        `/modelos/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MODELOS_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCTOS_KEY] });
    },
  });
}

export function useDeleteModeloCatalogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/modelos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MODELOS_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCTOS_KEY] });
    },
  });
}

// Unidades de medida
export type UnidadMedidaItem = UnidadMedidaListItem;

export function useUnidadesMedida() {
  return useQuery({
    queryKey: [UNIDADES_MEDIDA_KEY],
    queryFn: () =>
      api.get<{ data: UnidadMedidaItem[]; meta: { timestamp: string } }>(
        "/unidades-medida",
      ),
  });
}

export function useCreateUnidadMedida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UnidadMedidaPayload) =>
      api.post("/unidades-medida", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [UNIDADES_MEDIDA_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCTOS_KEY] });
    },
  });
}

export function useUpdateUnidadMedida(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UnidadMedidaPayload>) =>
      api.patch(`/unidades-medida/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [UNIDADES_MEDIDA_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCTOS_KEY] });
    },
  });
}

export function useDeleteUnidadMedida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/unidades-medida/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [UNIDADES_MEDIDA_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCTOS_KEY] });
    },
  });
}
