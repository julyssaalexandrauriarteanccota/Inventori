"use client";

import type {
  ProductoFilters,
  ProductoFormPayload,
  ProductoListItem,
} from "@erp/shared";
import { TipoProducto } from "@erp/shared";

import {
  useCategorias,
  useCreateProducto,
  useDeleteProducto,
  useNextProductoSku,
  useProducto,
  useProductos,
  useUnidadesMedida,
  useUpdateProducto,
} from "@/hooks/use-productos";

export type ServicioListItem = ProductoListItem;
export type ServicioFormPayload = ProductoFormPayload;

export type ServicioFilters = Omit<ProductoFilters, "tipo" | "excluirTipos">;
export const SERVICIO_RECORD_TYPE = TipoProducto.SERVICIO;

export function useServicios(filters: ServicioFilters = {}) {
  return useProductos({
    ...filters,
    tipo: SERVICIO_RECORD_TYPE,
  });
}

export function useServicio(id: string | undefined) {
  return useProducto(id);
}

export function useCreateServicio() {
  return useCreateProducto();
}

export function useUpdateServicio(id: string) {
  return useUpdateProducto(id);
}

export function useDeleteServicio() {
  return useDeleteProducto();
}

export function useCategoriasServicio() {
  return useCategorias(SERVICIO_RECORD_TYPE);
}

export function useNextServicioSku(
  categoriaId: string | undefined,
  enabled = true,
) {
  return useNextProductoSku(SERVICIO_RECORD_TYPE, categoriaId, enabled);
}

export function useUnidadesServicio() {
  return useUnidadesMedida();
}
