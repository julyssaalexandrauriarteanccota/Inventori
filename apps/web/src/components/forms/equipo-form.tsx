"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  ExternalLink,
  FileText,
  Gauge,
  Hash,
  ImageOff,
  Info,
  Loader2,
  MapPin,
  Package,
  RadioTower,
  Tag,
  Warehouse,
} from "lucide-react";
import {
  CondicionProducto,
  EstadoComercialEquipo,
  EstadoEquipo,
  TipoProducto,
  equipoFormSchema,
  type EquipoFormPayload,
  type LocationPayload,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { getApiAssetUrl } from "@/lib/api";
import { useAlmacenes } from "@/hooks/use-inventario";
import { useProductos, useProducto } from "@/hooks/use-productos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/searchable-select";
import { LocationPicker } from "@/components/location/location-picker";
import { DatePicker } from "@/components/ui/date-picker";

interface EquipoFormProps {
  defaultValues?: Partial<EquipoFormPayload>;
  onSubmit: (data: EquipoFormPayload) => void;
  isLoading?: boolean;
  mode: "create" | "edit";
}

const ESTADO_LABELS: Record<EstadoEquipo, string> = {
  [EstadoEquipo.ACTIVO]: "Activo",
  [EstadoEquipo.EN_REPARACION]: "En reparación",
  [EstadoEquipo.BAJA]: "Baja",
};

const ESTADO_COMERCIAL_LABELS: Record<EstadoComercialEquipo, string> = {
  [EstadoComercialEquipo.DISPONIBLE]: "Disponible",
  [EstadoComercialEquipo.VENDIDO]: "Vendido",
  [EstadoComercialEquipo.ALQUILADO]: "Alquilado",
  [EstadoComercialEquipo.RESERVADO]: "Reservado",
  [EstadoComercialEquipo.EN_REPARACION]: "En reparación",
  [EstadoComercialEquipo.USO_INTERNO]: "Uso interno",
  [EstadoComercialEquipo.BAJA]: "Baja",
};

const CONDICION_LABELS: Record<CondicionProducto, string> = {
  [CondicionProducto.NUEVO]: "Nuevo",
  [CondicionProducto.SEMINUEVO]: "Seminuevo",
  [CondicionProducto.USADO]: "Usado",
  [CondicionProducto.REACONDICIONADO]: "Reacondicionado",
  [CondicionProducto.RECUPERADO]: "Recuperado",
};

function toDateInput(value: string | undefined | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fromDateInput(value: string) {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function formatPrice(value: number | null | undefined) {
  if (value == null) return null;
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(value);
}

function isEquipoFueraDeAlmacen(
  estadoComercial: EstadoComercialEquipo | undefined,
) {
  return (
    estadoComercial === EstadoComercialEquipo.VENDIDO ||
    estadoComercial === EstadoComercialEquipo.ALQUILADO
  );
}

export function EquipoForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  mode,
}: EquipoFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<EquipoFormPayload>({
    resolver: zodResolver(equipoFormSchema),
    defaultValues: {
      estado: EstadoEquipo.ACTIVO,
      estadoComercial: EstadoComercialEquipo.DISPONIBLE,
      ...defaultValues,
    },
  });

  // ── Producto del catálogo (fuente de verdad para marca/modelo/imágenes/etc.)
  const productoId = useWatch({ control, name: "productoId" });
  const estado = useWatch({ control, name: "estado" });
  const estadoComercial = useWatch({ control, name: "estadoComercial" });
  const almacenId = useWatch({ control, name: "almacenId" });
  const contadorInicial = useWatch({ control, name: "contadorInicial" });
  const fueraDeAlmacen = isEquipoFueraDeAlmacen(estadoComercial);
  const [contadorActualEditado, setContadorActualEditado] = useState(
    mode === "edit" && defaultValues?.contadorActual != null,
  );

  const { data: productosData, isFetching: productosLoading } = useProductos({
    tipo: TipoProducto.EQUIPO,
    activo: true,
    limit: 100,
  });

  const { data: productoDetail } = useProducto(productoId);
  const producto = productoDetail?.data;
  const { data: almacenesData, isFetching: almacenesLoading } = useAlmacenes();

  const almacenesActivos = useMemo(
    () => (almacenesData?.data ?? []).filter((almacen) => almacen.activo),
    [almacenesData?.data],
  );

  const productoOptions = useMemo<SearchableSelectOption[]>(() => {
    const list = productosData?.data ?? [];
    return list.map((p) => ({
      value: p.id,
      label: `${p.sku} · ${p.nombre}${p.marca?.nombre ? ` (${p.marca.nombre})` : ""}`,
    }));
  }, [productosData?.data]);

  // En edición, asegurar que el producto seleccionado esté en las opciones
  const mergedProductoOptions = useMemo<SearchableSelectOption[]>(() => {
    if (!producto) return productoOptions;
    const exists = productoOptions.some((o) => o.value === producto.id);
    if (exists) return productoOptions;
    return [
      {
        value: producto.id,
        label: `${producto.sku} · ${producto.nombre}${producto.marca?.nombre ? ` (${producto.marca.nombre})` : ""}`,
      },
      ...productoOptions,
    ];
  }, [producto, productoOptions]);

  const productoImages = useMemo(() => {
    if (!producto)
      return [] as Array<{
        url: string;
        nombre: string | null;
        esPrincipal: boolean;
      }>;
    if (producto.imagenes?.length) {
      return producto.imagenes.map((img) => ({
        url: img.url,
        nombre: img.nombre,
        esPrincipal: img.esPrincipal,
      }));
    }
    if (producto.imagen) {
      return [
        { url: producto.imagen, nombre: "Imagen principal", esPrincipal: true },
      ];
    }
    return [];
  }, [producto]);

  // ── LocationPicker (UX) — `ubicacion` se queda como string plano
  const ubicacionValue = useWatch({ control, name: "ubicacion" }) ?? "";
  const [showLocationTools, setShowLocationTools] = useState(false);
  const [locationDraft, setLocationDraft] = useState<LocationPayload>(() => ({
    direccion: defaultValues?.ubicacion ?? "",
    referencia: "",
    departamento: "",
    provincia: "",
    distrito: "",
    latitud: null,
    longitud: null,
  }));

  function handleLocationChange(patch: Partial<LocationPayload>) {
    setLocationDraft((prev) => {
      const next = { ...prev, ...patch };
      if (patch.direccion !== undefined || patch.distrito !== undefined) {
        const direccion = (next.direccion ?? "").trim();
        const distrito = (next.distrito ?? "").trim();
        const merged = [direccion, distrito].filter(Boolean).join(", ");
        if (merged) {
          setValue("ubicacion", merged, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }
      return next;
    });
  }

  const locationPickerValue = useMemo<LocationPayload>(
    () =>
      locationDraft.direccion === ubicacionValue
        ? locationDraft
        : { ...locationDraft, direccion: ubicacionValue },
    [locationDraft, ubicacionValue],
  );

  useEffect(() => {
    if (fueraDeAlmacen && almacenId) {
      setValue("almacenId", null, { shouldDirty: true, shouldValidate: true });
    }
  }, [almacenId, fueraDeAlmacen, setValue]);

  useEffect(() => {
    if (mode !== "create" || contadorActualEditado) return;
    if (typeof contadorInicial !== "number" || !Number.isFinite(contadorInicial)) {
      return;
    }

    setValue("contadorActual", contadorInicial, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [contadorActualEditado, contadorInicial, mode, setValue]);

  const fechaIngresoStr = useWatch({ control, name: "fechaIngreso" });
  const contadorInicialField = register("contadorInicial", {
    valueAsNumber: true,
  });
  const contadorActualField = register("contadorActual", {
    valueAsNumber: true,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3 sm:gap-7">
        {/* Banner: explicar la relación catálogo ↔ instancia */}
        <div className="flex gap-3 rounded-xl border border-blue-200/60 bg-blue-50/60 p-3.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
          <Info className="size-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="font-medium">
              Un equipo es la unidad física de un producto del catálogo.
            </p>
            <p className="text-blue-800/80 dark:text-blue-200/80">
              Marca, modelo, categoría, imágenes y condición se heredan del{" "}
              <strong>producto seleccionado</strong>. Aquí solo registras los
              datos propios de la unidad: serie, QR físico, almacén o cliente,
              ubicación, contadores y estado.
            </p>
          </div>
        </div>

        {/* === SECCIÓN 1: PRODUCTO DEL CATÁLOGO === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-purple-400 dark:border-l-purple-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[11px] font-bold text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 ring-2 ring-purple-100 dark:ring-purple-900/30">
                1
              </span>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <Package className="size-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground truncate">
                Producto del catálogo
              </h3>
            </div>
            {producto ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                asChild
                className="h-7 gap-1.5 text-xs"
              >
                <Link
                  href={`/productos/${producto.id}`}
                  target="_blank"
                  rel="noopener"
                >
                  <ExternalLink className="size-3.5" /> Ver ficha
                </Link>
              </Button>
            ) : null}
          </div>

          <Field
            data-invalid={errors.productoId ? true : undefined}
            className="mb-4"
          >
            <FieldLabel>Producto *</FieldLabel>
            <SearchableSelect
              value={productoId ?? ""}
              onChange={(v) =>
                setValue("productoId", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              options={mergedProductoOptions}
              placeholder={
                productosLoading
                  ? "Cargando productos..."
                  : "Buscar producto tipo EQUIPO"
              }
              searchPlaceholder="Escribe SKU o nombre..."
              emptyLabel={
                productosLoading
                  ? "Buscando..."
                  : "Sin resultados. Solo se listan productos tipo EQUIPO activos."
              }
              ariaLabel="Producto"
              invalid={!!errors.productoId}
              clearable
              clearLabel="Limpiar producto"
              disabled={mode === "edit"}
            />
            <FieldError>{errors.productoId?.message}</FieldError>
          </Field>

          {!producto ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 py-8 text-center">
              <Package className="size-7 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">
                Selecciona un producto para heredar marca, modelo, categoría e
                imágenes.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              {/* Galería heredada */}
              <div className="space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted">
                  {productoImages.length > 0 ? (
                    <img
                      src={getApiAssetUrl(productoImages[0].url)}
                      alt={producto.nombre}
                      className="h-full w-full bg-white/70 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                      <ImageOff className="size-8" />
                    </div>
                  )}
                </div>
                {productoImages.length > 1 ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {productoImages.slice(1, 5).map((img) => (
                      <div
                        key={img.url}
                        className="relative aspect-square overflow-hidden rounded-md border border-border/40 bg-muted"
                      >
                        <img
                          src={getApiAssetUrl(img.url)}
                          alt={img.nombre ?? ""}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Datos heredados */}
              <div className="flex min-w-0 flex-col gap-3">
                <div>
                  <p className="text-base font-semibold leading-tight text-foreground">
                    {producto.nombre}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {producto.sku}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {producto.marca?.nombre ? (
                    <Badge variant="outline" className="gap-1">
                      <Tag className="size-3" /> {producto.marca.nombre}
                    </Badge>
                  ) : null}
                  {producto.modelo ? (
                    <Badge variant="outline">{producto.modelo}</Badge>
                  ) : null}
                  {producto.categoria?.nombre ? (
                    <Badge variant="secondary">
                      {producto.categoria.nombre}
                    </Badge>
                  ) : null}
                  {producto.condicion ? (
                    <Badge variant="outline">
                      Condición: {CONDICION_LABELS[producto.condicion]}
                    </Badge>
                  ) : null}
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {producto.codigoBarras ? (
                    <div className="flex items-center gap-1.5">
                      <dt className="text-muted-foreground">Cód. barras:</dt>
                      <dd className="font-mono text-foreground">
                        {producto.codigoBarras}
                      </dd>
                    </div>
                  ) : null}
                  {producto.unidadMedida ? (
                    <div className="flex items-center gap-1.5">
                      <dt className="text-muted-foreground">Unidad:</dt>
                      <dd className="text-foreground">
                        {producto.unidadMedida.codigo}
                      </dd>
                    </div>
                  ) : null}
                  {formatPrice(producto.precioVenta) ? (
                    <div className="flex items-center gap-1.5">
                      <dt className="text-muted-foreground">Precio venta:</dt>
                      <dd className="font-medium text-foreground">
                        {formatPrice(producto.precioVenta)}
                      </dd>
                    </div>
                  ) : null}
                  {formatPrice(producto.precioCompra) ? (
                    <div className="flex items-center gap-1.5">
                      <dt className="text-muted-foreground">Precio compra:</dt>
                      <dd className="text-foreground">
                        {formatPrice(producto.precioCompra)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {producto.descripcion ? (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {producto.descripcion}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* === SECCIÓN 2: IDENTIFICACIÓN FÍSICA === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 dark:border-l-blue-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30">
              2
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Hash className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Identificación de la unidad
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.numeroSerie ? true : undefined}>
              <FieldLabel>Número de serie *</FieldLabel>
              <Input
                {...register("numeroSerie")}
                placeholder="ABC123456"
                readOnly={mode === "edit"}
                aria-invalid={!!errors.numeroSerie}
                className={mode === "edit" ? "bg-muted" : undefined}
              />
              <FieldError>{errors.numeroSerie?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.codigoQr ? true : undefined}>
              <FieldLabel>QR físico de la unidad</FieldLabel>
              <Input
                {...register("codigoQr")}
                placeholder="Se genera como EQP:SERIE si se omite"
                aria-invalid={!!errors.codigoQr}
              />
              <FieldError>{errors.codigoQr?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.firmware ? true : undefined}>
              <FieldLabel>Firmware (opcional)</FieldLabel>
              <Input
                {...register("firmware")}
                placeholder="Versión actual del firmware"
                aria-invalid={!!errors.firmware}
              />
              <FieldError>{errors.firmware?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.fechaIngreso ? true : undefined}>
              <FieldLabel>Fecha de ingreso</FieldLabel>
              <DatePicker
                value={fechaIngresoStr}
                onChange={(v) =>
                  setValue("fechaIngreso", v, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                placeholder="Seleccionar fecha de ingreso"
                aria-invalid={!!errors.fechaIngreso}
              />
              <FieldError>{errors.fechaIngreso?.message}</FieldError>
            </Field>

            <Field
              data-invalid={errors.procedencia ? true : undefined}
              className="md:col-span-2"
            >
              <FieldLabel>Procedencia</FieldLabel>
              <Input
                {...register("procedencia")}
                placeholder="Ej: Importación directa, distribuidor X, recompra cliente Y"
                aria-invalid={!!errors.procedencia}
              />
              <FieldError>{errors.procedencia?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 3: ESTADO Y CONTADORES === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 dark:border-l-green-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-100 dark:ring-green-900/30">
              3
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
              <Activity className="size-3.5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Estado y contadores
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Field data-invalid={errors.estado ? true : undefined}>
              <FieldLabel>Estado operativo</FieldLabel>
              <Select
                value={estado ?? ""}
                onValueChange={(v) =>
                  setValue("estado", v as EstadoEquipo, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger aria-invalid={!!errors.estado}>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.values(EstadoEquipo).map((est) => (
                      <SelectItem key={est} value={est}>
                        {ESTADO_LABELS[est]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError>{errors.estado?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.estadoComercial ? true : undefined}>
              <FieldLabel>Estado comercial</FieldLabel>
              <Select
                value={estadoComercial ?? ""}
                onValueChange={(v) =>
                  setValue("estadoComercial", v as EstadoComercialEquipo, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger aria-invalid={!!errors.estadoComercial}>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.values(EstadoComercialEquipo).map((est) => (
                      <SelectItem key={est} value={est}>
                        {ESTADO_COMERCIAL_LABELS[est]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError>{errors.estadoComercial?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.contadorInicial ? true : undefined}>
              <FieldLabel>Contador inicial</FieldLabel>
              <div className="relative">
                <Gauge className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  className="pl-8"
                  {...contadorInicialField}
                  placeholder="0"
                  aria-invalid={!!errors.contadorInicial}
                />
              </div>
              <FieldDescription>
                Lectura con la que ingresó físicamente el equipo.
              </FieldDescription>
              <FieldError>{errors.contadorInicial?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.contadorActual ? true : undefined}>
              <FieldLabel>Contador actual</FieldLabel>
              <div className="relative">
                <Gauge className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  className="pl-8"
                  {...contadorActualField}
                  onChange={(event) => {
                    setContadorActualEditado(true);
                    void contadorActualField.onChange(event);
                  }}
                  placeholder="0"
                  aria-invalid={!!errors.contadorActual}
                />
              </div>
              <FieldDescription>
                Se usa como base si luego se vende y se genera garantía.
              </FieldDescription>
              <FieldError>{errors.contadorActual?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 4: UBICACIÓN === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-orange-400 dark:border-l-orange-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 ring-2 ring-orange-100 dark:ring-orange-900/30">
                4
              </span>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                <MapPin className="size-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground truncate">
                Ubicación física
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {locationPickerValue.latitud != null &&
              locationPickerValue.longitud != null ? (
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300">
                  {locationPickerValue.latitud.toFixed(5)},{" "}
                  {locationPickerValue.longitud.toFixed(5)}
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-2 text-xs"
                onClick={() => setShowLocationTools((c) => !c)}
              >
                <MapPin className="size-3.5" />
                {showLocationTools ? "Ocultar mapa" : "Mapa y coordenadas"}
              </Button>
            </div>
          </div>

          <div className={cn("grid gap-4 sm:gap-6")}>
            <Field data-invalid={errors.almacenId ? true : undefined}>
              <FieldLabel>Almacén interno actual</FieldLabel>
              <Select
                value={almacenId ?? "__none"}
                onValueChange={(value) =>
                  setValue("almacenId", value === "__none" ? null : value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                disabled={fueraDeAlmacen || isLoading}
              >
                <SelectTrigger aria-invalid={!!errors.almacenId}>
                  <SelectValue
                    placeholder={
                      almacenesLoading
                        ? "Cargando almacenes..."
                        : "Seleccionar almacén"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none">
                      {fueraDeAlmacen
                        ? "Fuera de almacén interno"
                        : "Sin almacén definido"}
                    </SelectItem>
                    {almacenesActivos.map((almacen) => (
                      <SelectItem key={almacen.id} value={almacen.id}>
                        {almacen.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError>{errors.almacenId?.message}</FieldError>
              {fueraDeAlmacen ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Warehouse className="size-3.5" />
                  Los equipos vendidos o alquilados quedan fuera del almacén
                  interno.
                </p>
              ) : null}
            </Field>

            <Field data-invalid={errors.ubicacion ? true : undefined}>
              <FieldLabel>Dirección / lugar de instalación</FieldLabel>
              <Input
                {...register("ubicacion")}
                placeholder="Ej: Oficina Lima, Piso 3"
                aria-invalid={!!errors.ubicacion}
              />
              <FieldError>{errors.ubicacion?.message}</FieldError>
            </Field>

            {showLocationTools ? (
              <LocationPicker
                value={locationPickerValue}
                onChange={handleLocationChange}
                disabled={isLoading}
              />
            ) : null}
          </div>
        </div>

        {/* === SECCIÓN 4.5: SNMP / RED === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-cyan-400 dark:border-l-cyan-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[11px] font-bold text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400 ring-2 ring-cyan-100 dark:ring-cyan-900/30">
              5
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/40">
              <RadioTower className="size-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Conectividad SNMP
            </h3>
            <span className="ml-auto text-[11px] text-muted-foreground">
              Lectura automática de contadores
            </span>
          </div>
          <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field data-invalid={errors.ipAddress ? true : undefined}>
              <FieldLabel>IP del equipo</FieldLabel>
              <Input
                {...register("ipAddress")}
                placeholder="192.168.1.50"
                aria-invalid={!!errors.ipAddress}
              />
              <FieldError>{errors.ipAddress?.message}</FieldError>
            </Field>
            <Field data-invalid={errors.snmpCommunity ? true : undefined}>
              <FieldLabel>Community</FieldLabel>
              <Input
                {...register("snmpCommunity", {
                  setValueAs: (value) => {
                    if (typeof value !== "string") return undefined;
                    const trimmed = value.trim();
                    return trimmed || undefined;
                  },
                })}
                placeholder="public"
                aria-invalid={!!errors.snmpCommunity}
              />
              <FieldError>{errors.snmpCommunity?.message}</FieldError>
            </Field>
            <Field data-invalid={errors.snmpPort ? true : undefined}>
              <FieldLabel>Puerto</FieldLabel>
              <Input
                type="number"
                min={1}
                max={65535}
                {...register("snmpPort", {
                  setValueAs: (value) => {
                    if (value === "" || value === null || value === undefined) {
                      return undefined;
                    }
                    const num = Number(value);
                    return Number.isFinite(num) ? num : undefined;
                  },
                })}
                placeholder="161"
                aria-invalid={!!errors.snmpPort}
              />
              <FieldError>{errors.snmpPort?.message}</FieldError>
            </Field>
          </FieldGroup>
        </div>

        {/* === SECCIÓN 6: NOTAS === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-amber-400 dark:border-l-amber-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/30">
              6
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <FileText className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Notas y observaciones
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6">
            <Field data-invalid={errors.observacionEstado ? true : undefined}>
              <FieldLabel>Observación de estado</FieldLabel>
              <Input
                {...register("observacionEstado")}
                placeholder="Ej: requiere mantenimiento preventivo"
                aria-invalid={!!errors.observacionEstado}
              />
              <FieldError>{errors.observacionEstado?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.notas ? true : undefined}>
              <FieldLabel>Notas internas</FieldLabel>
              <Textarea
                {...register("notas")}
                placeholder="Observaciones adicionales sobre esta unidad"
                rows={3}
                aria-invalid={!!errors.notas}
              />
              <FieldError>{errors.notas?.message}</FieldError>
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
              "Crear equipo"
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
