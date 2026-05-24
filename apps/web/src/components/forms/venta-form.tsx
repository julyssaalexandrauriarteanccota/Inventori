"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Loader2, ShoppingCart } from "lucide-react";
import {
  EstadoComercialEquipo,
  ventaFormSchema,
  type VentaFormPayload,
} from "@erp/shared";

import { useClientes } from "@/hooks/use-clientes";
import { useEquipos } from "@/hooks/use-equipos";
import { useProductos } from "@/hooks/use-productos";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

interface VentaFormProps {
  defaultValues?: Partial<VentaFormPayload>;
  onSubmit: (data: VentaFormPayload) => void;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export function VentaForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  mode,
}: VentaFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    clearErrors,
    formState: { errors },
  } = useForm<VentaFormPayload>({
    resolver: zodResolver(ventaFormSchema),
    defaultValues: {
      detalles: [{ productoId: "", cantidad: 1, precioUnitario: 0 }],
      ...defaultValues,
    },
  });

  const clienteId = useWatch({ control, name: "clienteId" });
  const productoId = useWatch({ control, name: "detalles.0.productoId" });
  const equipoSerie = useWatch({ control, name: "detalles.0.equipoSerie" });
  const precioUnitario = useWatch({
    control,
    name: "detalles.0.precioUnitario",
  });

  const { data: clientesRes, isLoading: isLoadingClientes } = useClientes({
    page: 1,
    limit: 100,
    activo: true,
  });
  const { data: productosRes, isLoading: isLoadingProductos } = useProductos({
    page: 1,
    limit: 100,
    activo: true,
  });

  const clientes = useMemo(() => clientesRes?.data ?? [], [clientesRes?.data]);
  const productos = useMemo(
    () => productosRes?.data ?? [],
    [productosRes?.data],
  );
  const selectedProducto = productos.find(
    (producto) => producto.id === productoId,
  );
  const requiereSerie = selectedProducto?.tieneNumeroSerie ?? false;

  const { data: equiposRes, isLoading: isLoadingEquipos } = useEquipos(
    {
      page: 1,
      limit: 100,
      productoId: productoId || undefined,
      estadoComercial: EstadoComercialEquipo.DISPONIBLE,
    },
    { enabled: Boolean(productoId && requiereSerie) },
  );

  const clienteOptions = useMemo<SearchableSelectOption[]>(
    () =>
      clientes.map((cliente) => {
        const nombre =
          cliente.razonSocial ??
          ([cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
            "Cliente sin nombre");
        const documento = cliente.ruc ?? cliente.dni;

        return {
          value: cliente.id,
          label: documento ? `${nombre} - ${documento}` : nombre,
        };
      }),
    [clientes],
  );

  const productoOptions = useMemo<SearchableSelectOption[]>(
    () =>
      productos.map((producto) => ({
        value: producto.id,
        label: `${producto.sku} - ${producto.nombre}`,
      })),
    [productos],
  );

  const equipoOptions = useMemo<SearchableSelectOption[]>(
    () =>
      (equiposRes?.data ?? []).map((equipo) => ({
        value: equipo.numeroSerie,
        label: equipo.almacen
          ? `${equipo.numeroSerie} - ${equipo.almacen.nombre}`
          : equipo.numeroSerie,
      })),
    [equiposRes],
  );

  useEffect(() => {
    if (!selectedProducto) return;

    if (!precioUnitario || precioUnitario <= 0) {
      setValue("detalles.0.precioUnitario", selectedProducto.precioVenta, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [precioUnitario, selectedProducto, setValue]);

  useEffect(() => {
    if (!requiereSerie && equipoSerie) {
      setValue("detalles.0.equipoSerie", undefined, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [equipoSerie, requiereSerie, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3 sm:gap-7">
        {/* === SECCIÓN 1: CLIENTE === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 dark:border-l-blue-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30">
              1
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Calendar className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Cliente y validez
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.clienteId ? true : undefined}>
              <FieldLabel>Cliente *</FieldLabel>
              <SearchableSelect
                value={clienteId ?? ""}
                onChange={(value) => {
                  setValue("clienteId", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  clearErrors("clienteId");
                }}
                options={clienteOptions}
                placeholder={
                  isLoadingClientes
                    ? "Cargando clientes..."
                    : "Seleccionar cliente"
                }
                searchPlaceholder="Buscar por nombre, DNI o RUC"
                emptyLabel="No hay clientes activos"
                ariaLabel="Seleccionar cliente"
                invalid={!!errors.clienteId}
                disabled={isLoadingClientes}
              />
              <FieldError>{errors.clienteId?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.validoHasta ? true : undefined}>
              <FieldLabel>Válido hasta</FieldLabel>
              <Input
                {...register("validoHasta")}
                type="date"
                aria-invalid={!!errors.validoHasta}
              />
              <FieldError>{errors.validoHasta?.message}</FieldError>
            </Field>

            <Field
              data-invalid={errors.notas ? true : undefined}
              className="md:col-span-2"
            >
              <FieldLabel>Notas</FieldLabel>
              <Textarea
                {...register("notas")}
                placeholder="Condiciones, observaciones, etc."
                rows={3}
                aria-invalid={!!errors.notas}
              />
              <FieldError>{errors.notas?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 2: ÍTEM PRINCIPAL === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 dark:border-l-green-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-100 dark:ring-green-900/30">
              2
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
              <ShoppingCart className="size-3.5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Ítem principal
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            <Field
              data-invalid={errors.detalles?.[0]?.productoId ? true : undefined}
              className="md:col-span-3"
            >
              <FieldLabel>Producto o servicio *</FieldLabel>
              <SearchableSelect
                value={productoId ?? ""}
                onChange={(value) => {
                  setValue("detalles.0.productoId", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("detalles.0.equipoSerie", undefined, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  clearErrors("detalles.0.productoId");
                }}
                options={productoOptions}
                placeholder={
                  isLoadingProductos
                    ? "Cargando productos..."
                    : "Seleccionar producto o servicio"
                }
                searchPlaceholder="Buscar por SKU o nombre"
                emptyLabel="No hay productos activos"
                ariaLabel="Seleccionar producto o servicio"
                invalid={!!errors.detalles?.[0]?.productoId}
                disabled={isLoadingProductos}
              />
              <FieldError>
                {errors.detalles?.[0]?.productoId?.message}
              </FieldError>
            </Field>

            {requiereSerie ? (
              <Field
                data-invalid={
                  errors.detalles?.[0]?.equipoSerie ? true : undefined
                }
                className="md:col-span-3"
              >
                <FieldLabel>Serie disponible *</FieldLabel>
                <SearchableSelect
                  value={equipoSerie ?? ""}
                  onChange={(value) => {
                    setValue("detalles.0.equipoSerie", value || undefined, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    clearErrors("detalles.0.equipoSerie");
                  }}
                  options={equipoOptions}
                  placeholder={
                    isLoadingEquipos
                      ? "Cargando series..."
                      : "Seleccionar equipo físico"
                  }
                  searchPlaceholder="Buscar por número de serie"
                  emptyLabel="No hay equipos disponibles para este producto"
                  ariaLabel="Seleccionar serie de equipo"
                  invalid={!!errors.detalles?.[0]?.equipoSerie}
                  disabled={isLoadingEquipos || !productoId}
                />
                <FieldError>
                  {errors.detalles?.[0]?.equipoSerie?.message}
                </FieldError>
              </Field>
            ) : null}

            <Field
              data-invalid={errors.detalles?.[0]?.cantidad ? true : undefined}
            >
              <FieldLabel>Cantidad *</FieldLabel>
              <Input
                {...register("detalles.0.cantidad", { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="1"
                aria-invalid={!!errors.detalles?.[0]?.cantidad}
              />
              <FieldError>{errors.detalles?.[0]?.cantidad?.message}</FieldError>
            </Field>

            <Field
              data-invalid={
                errors.detalles?.[0]?.precioUnitario ? true : undefined
              }
            >
              <FieldLabel>Precio unitario inc. IGV *</FieldLabel>
              <Input
                {...register("detalles.0.precioUnitario", {
                  valueAsNumber: true,
                })}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                aria-invalid={!!errors.detalles?.[0]?.precioUnitario}
              />
              <FieldError>
                {errors.detalles?.[0]?.precioUnitario?.message}
              </FieldError>
            </Field>

            <Field
              data-invalid={errors.detalles?.[0]?.descuento ? true : undefined}
            >
              <FieldLabel>Descuento inc. IGV</FieldLabel>
              <Input
                {...register("detalles.0.descuento", { valueAsNumber: true })}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                aria-invalid={!!errors.detalles?.[0]?.descuento}
              />
              <FieldError>
                {errors.detalles?.[0]?.descuento?.message}
              </FieldError>
            </Field>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isLoading} className="min-w-36 gap-2">
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {mode === "create" ? "Creando..." : "Guardando..."}
              </>
            ) : mode === "create" ? (
              "Crear operación"
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
