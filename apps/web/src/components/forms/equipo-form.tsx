"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  Barcode,
  Cpu,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  Hash,
  ImageOff,
  Info,
  Loader2,
  MapPin,
  Package,
  QrCode,
  RefreshCcw,
  Tag,
  Warehouse,
  Wrench,
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

const ESTADOS_COMERCIALES_MANUALES: EstadoComercialEquipo[] = [
  EstadoComercialEquipo.DISPONIBLE,
  EstadoComercialEquipo.USO_INTERNO,
];

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
  const estadoComercialOptions = useMemo(() => {
    if (
      estadoComercial &&
      !ESTADOS_COMERCIALES_MANUALES.includes(estadoComercial)
    ) {
      return [estadoComercial, ...ESTADOS_COMERCIALES_MANUALES];
    }

    return ESTADOS_COMERCIALES_MANUALES;
  }, [estadoComercial]);
  const estadoComercialGestionadoPorAccion = Boolean(
    estadoComercial &&
      !ESTADOS_COMERCIALES_MANUALES.includes(estadoComercial),
  );
  const bloqueadoPorAsignacionCliente = mode === "edit" && fueraDeAlmacen;
  const [contadorActualEditado, setContadorActualEditado] = useState(
    mode === "edit" && defaultValues?.contadorActual != null,
  );
  const [qrManuallyEdited, setQrManuallyEdited] = useState(false);

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

  function handleGenerateQr() {
    setQrManuallyEdited(true);
    const cleanSerie = (numeroSerie ?? "").trim().toUpperCase();
    const nextQr = cleanSerie ? `EQP:${cleanSerie}` : "";
    setValue("codigoQr", nextQr, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    toast.success("Código QR generado: " + (nextQr || "Vacío"));
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

  // ── Auto-generador de QR Físico reactivo
  const numeroSerie = useWatch({ control, name: "numeroSerie" });

  useEffect(() => {
    if (mode !== "create" || qrManuallyEdited) return;
    const cleanSerie = (numeroSerie ?? "").trim().toUpperCase();
    if (cleanSerie) {
      setValue("codigoQr", `EQP:${cleanSerie}`, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      setValue("codigoQr", "", {
        shouldDirty: true,
      });
    }
  }, [numeroSerie, mode, qrManuallyEdited, setValue]);

  const fechaIngresoStr = useWatch({ control, name: "fechaIngreso" });
  const contadorInicialField = register("contadorInicial", {
    valueAsNumber: true,
  });
  const contadorActualField = register("contadorActual", {
    valueAsNumber: true,
  });

  function handleValidSubmit(data: EquipoFormPayload) {
    const payload: EquipoFormPayload = { ...data };

    if (mode === "create") {
      if (!payload.almacenId) {
        toast.error("Selecciona un almacén interno para ingresar el equipo.");
        return;
      }

      payload.estado = EstadoEquipo.ACTIVO;
      payload.estadoComercial =
        payload.estadoComercial ?? EstadoComercialEquipo.DISPONIBLE;
      payload.fechaIngreso = undefined;
    }

    if (mode === "edit" && estadoComercialGestionadoPorAccion) {
      delete payload.estado;
      delete payload.estadoComercial;
    }

    if (mode === "edit" && bloqueadoPorAsignacionCliente) {
      delete payload.almacenId;
      delete payload.ubicacion;
    }

    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} noValidate>
      <FieldGroup className="gap-4 sm:gap-8">
        {/* Banner: explicar la relación catálogo ↔ instancia */}
        <div className="flex gap-3.5 rounded-xl border border-blue-500/15 bg-blue-500/[0.03] dark:border-blue-400/10 dark:bg-blue-400/[0.03] p-4 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400">
            <Info className="size-4 shrink-0" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-blue-950/90 dark:text-blue-200/90">
              Un equipo es la unidad física de un producto del catálogo.
            </p>
            <p className="text-blue-800/80 dark:text-blue-300/70 leading-normal">
              Marca, modelo, categoría, imágenes y condición se heredan del{" "}
              <strong className="text-blue-950 dark:text-blue-200 font-medium">producto seleccionado</strong>. Aquí solo registras los
              datos propios de la unidad física: serie, QR impreso, almacén,
              dirección de instalación, contadores de uso y observaciones operativas.
            </p>
          </div>
        </div>

        {/* === SECCIÓN 1: PRODUCTO DEL CATÁLOGO === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-violet-500/50 dark:border-l-violet-400/35 bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 hover:border-l-violet-500/70 dark:hover:border-l-violet-400/50">
          <div className="mb-5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[11px] font-bold text-violet-600 dark:bg-violet-400/15 dark:text-violet-300 ring-1 ring-violet-500/25 dark:ring-violet-400/20 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
                1
              </span>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 dark:bg-violet-400/15">
                <Package className="size-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground truncate tracking-tight">
                Producto del catálogo
              </h3>
            </div>
            {producto ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                asChild
                className="h-7 gap-1.5 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:text-violet-300 dark:hover:bg-violet-950/40"
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
            className="mb-5"
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
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 py-8 text-center transition-all duration-300">
              <Package className="size-7 text-muted-foreground/45" />
              <p className="text-xs text-muted-foreground/80">
                Selecciona un producto para heredar marca, modelo, categoría e imágenes.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-[180px_1fr] rounded-xl border border-border/40 dark:border-border/20 bg-muted/10 dark:bg-zinc-900/10 p-4">
              {/* Galería heredada */}
              <div className="space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-border/50 bg-zinc-50 dark:bg-zinc-900/30 shadow-sm flex items-center justify-center">
                  {productoImages.length > 0 ? (
                    <img
                      src={getApiAssetUrl(productoImages[0].url)}
                      alt={producto.nombre}
                      className="h-full w-full bg-white/50 dark:bg-zinc-950/20 object-contain transition-transform duration-300 hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <ImageOff className="size-8 animate-pulse" />
                    </div>
                  )}
                </div>
                {productoImages.length > 1 ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {productoImages.slice(1, 5).map((img) => (
                      <div
                        key={img.url}
                        className="relative aspect-square overflow-hidden rounded-md border border-border/40 bg-zinc-50 dark:bg-zinc-900/20 shadow-sm"
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
              <div className="flex min-w-0 flex-col gap-3.5">
                <div>
                  <p className="text-base font-semibold leading-snug text-foreground tracking-tight">
                    {producto.nombre}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-wider font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded border border-violet-100 dark:border-violet-900/30">
                      SKU · {producto.sku}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {producto.marca?.nombre ? (
                    <Badge variant="outline" className="gap-1 text-[11px] bg-violet-500/[0.03] text-violet-700 border-violet-500/20 dark:bg-violet-400/[0.04] dark:text-violet-300 dark:border-violet-400/20 font-medium">
                      <Tag className="size-2.5" /> {producto.marca.nombre}
                    </Badge>
                  ) : null}
                  {producto.modelo ? (
                    <Badge variant="outline" className="text-[11px] bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-200 dark:border-zinc-700/60">
                      {producto.modelo}
                    </Badge>
                  ) : null}
                  {producto.categoria?.nombre ? (
                    <Badge variant="secondary" className="text-[11px] bg-purple-100 text-purple-800 border border-purple-200/50 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/20">
                      {producto.categoria.nombre}
                    </Badge>
                  ) : null}
                  {producto.condicion ? (
                    <Badge variant="outline" className="text-[11px] bg-blue-500/[0.03] text-blue-700 border-blue-500/20 dark:bg-blue-400/[0.04] dark:text-blue-300 dark:border-blue-400/20 font-medium">
                      Condición: {CONDICION_LABELS[producto.condicion]}
                    </Badge>
                  ) : null}
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-border/40 pt-3.5">
                  {producto.codigoBarras ? (
                    <div className="flex items-center justify-between border-b border-border/5 dark:border-border/10 pb-1.5">
                      <dt className="text-muted-foreground font-medium">Cód. barras:</dt>
                      <dd className="font-mono text-foreground font-semibold bg-muted/40 dark:bg-muted/20 px-1.5 py-0.5 rounded border border-border/30 text-[10px] tracking-wide">
                        {producto.codigoBarras}
                      </dd>
                    </div>
                  ) : null}
                  {producto.unidadMedida ? (
                    <div className="flex items-center justify-between border-b border-border/5 dark:border-border/10 pb-1.5">
                      <dt className="text-muted-foreground font-medium">Unidad:</dt>
                      <dd className="text-foreground font-semibold">
                        {producto.unidadMedida.codigo}
                      </dd>
                    </div>
                  ) : null}
                  {formatPrice(producto.precioVenta) ? (
                    <div className="flex items-center justify-between border-b border-border/5 dark:border-border/10 pb-1.5">
                      <dt className="text-muted-foreground font-medium">Precio venta:</dt>
                      <dd className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {formatPrice(producto.precioVenta)}
                      </dd>
                    </div>
                  ) : null}
                  {formatPrice(producto.precioCompra) ? (
                    <div className="flex items-center justify-between border-b border-border/5 dark:border-border/10 pb-1.5">
                      <dt className="text-muted-foreground font-medium">Precio compra:</dt>
                      <dd className="text-foreground font-semibold">
                        {formatPrice(producto.precioCompra)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {producto.descripcion ? (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                    {producto.descripcion}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* === SECCIÓN 2: IDENTIFICACIÓN FÍSICA === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-sky-500/50 dark:border-l-sky-400/35 bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 hover:border-l-sky-500/70 dark:hover:border-l-sky-400/50">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-[11px] font-bold text-sky-600 dark:bg-sky-400/15 dark:text-sky-300 ring-1 ring-sky-500/25 dark:ring-sky-400/20 shadow-[0_0_10px_rgba(14,165,233,0.1)]">
              2
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 dark:bg-sky-400/15">
              <Hash className="size-3.5 text-sky-600 dark:text-sky-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Identificación de la unidad
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.numeroSerie ? true : undefined}>
              <FieldLabel>Número de serie *</FieldLabel>
              <Input
                {...register("numeroSerie", {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    if (mode === "create" && !qrManuallyEdited) {
                      const val = e.target.value.trim().toUpperCase();
                      setValue("codigoQr", val ? `EQP:${val}` : "", {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }
                  }
                })}
                placeholder="ABC123456"
                readOnly={mode === "edit"}
                startIcon={Barcode}
                aria-invalid={!!errors.numeroSerie}
                className={cn(
                  "font-mono uppercase tracking-wider placeholder:font-sans placeholder:tracking-normal",
                  mode === "edit" ? "bg-muted/40 dark:bg-muted/10 text-muted-foreground border-border/60" : "bg-background"
                )}
              />
              <FieldError>{errors.numeroSerie?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.codigoQr ? true : undefined}>
              <FieldLabel>QR físico de la unidad</FieldLabel>
              <div className="relative">
                <Input
                  {...register("codigoQr", {
                    onChange: () => setQrManuallyEdited(true),
                  })}
                  placeholder="Se genera como EQP:SERIE si se omite"
                  startIcon={QrCode}
                  aria-invalid={!!errors.codigoQr}
                  className="font-mono uppercase tracking-wider placeholder:font-sans placeholder:tracking-normal pr-10"
                />
                {mode === "create" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Autogenerar QR"
                    onClick={handleGenerateQr}
                  >
                    <RefreshCcw className="size-4" />
                  </Button>
                )}
              </div>
              <FieldError>{errors.codigoQr?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.firmware ? true : undefined}>
              <FieldLabel>Firmware (opcional)</FieldLabel>
              <Input
                {...register("firmware")}
                placeholder="Versión actual del firmware"
                startIcon={Cpu}
                aria-invalid={!!errors.firmware}
                className="font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal"
              />
              <FieldError>{errors.firmware?.message}</FieldError>
            </Field>

            {mode === "edit" ? (
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
            ) : (
              <Field>
                <FieldLabel>Fecha de ingreso</FieldLabel>
                <Input value="Automática al guardar" disabled />
              </Field>
            )}

            <Field
              data-invalid={errors.procedencia ? true : undefined}
              className="md:col-span-2"
            >
              <FieldLabel>Procedencia</FieldLabel>
              <Input
                {...register("procedencia")}
                placeholder="Ej: Importación directa, distribuidor X, recompra cliente Y"
                startIcon={Globe}
                aria-invalid={!!errors.procedencia}
              />
              <FieldError>{errors.procedencia?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 3: ESTADO Y CONTADORES === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-emerald-500/50 dark:border-l-emerald-400/35 bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 hover:border-l-emerald-500/70 dark:hover:border-l-emerald-400/50">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-bold text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300 ring-1 ring-emerald-500/25 dark:ring-emerald-400/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              3
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-400/15">
              <Activity className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
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
                disabled={
                  mode === "create" ||
                  estadoComercialGestionadoPorAccion ||
                  isLoading
                }
              >
                <SelectTrigger aria-invalid={!!errors.estado}>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(mode === "create"
                      ? [EstadoEquipo.ACTIVO]
                      : Object.values(EstadoEquipo)
                    ).map((est) => (
                      <SelectItem key={est} value={est}>
                        {ESTADO_LABELS[est]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {mode === "create" ? (
                <FieldDescription>
                  El alta inicia como activo. Reparación y baja se gestionan
                  después desde soporte o acciones del equipo.
                </FieldDescription>
              ) : estadoComercialGestionadoPorAccion ? (
                <FieldDescription>
                  Este estado se gestiona desde soporte o desde el flujo
                  comercial, no desde edición manual.
                </FieldDescription>
              ) : null}
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
                disabled={estadoComercialGestionadoPorAccion || isLoading}
              >
                <SelectTrigger aria-invalid={!!errors.estadoComercial}>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {estadoComercialOptions.map((est) => (
                      <SelectItem key={est} value={est}>
                        {ESTADO_COMERCIAL_LABELS[est]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {estadoComercialGestionadoPorAccion ? (
                <FieldDescription>
                  Este estado se cambia desde las acciones del equipo, no desde
                  edición manual.
                </FieldDescription>
              ) : (
                <FieldDescription>
                  Venta, alquiler, reserva y baja se gestionan con acciones del
                  equipo.
                </FieldDescription>
              )}
              <FieldError>{errors.estadoComercial?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.contadorInicial ? true : undefined}>
              <FieldLabel>Contador inicial</FieldLabel>
              <Input
                type="number"
                min={0}
                step={1}
                startIcon={Gauge}
                className="font-mono font-medium tracking-wide"
                {...contadorInicialField}
                placeholder="0"
                aria-invalid={!!errors.contadorInicial}
              />
              <FieldDescription>
                Lectura con la que ingresó físicamente el equipo.
              </FieldDescription>
              <FieldError>{errors.contadorInicial?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.contadorActual ? true : undefined}>
              <FieldLabel>Contador actual</FieldLabel>
              <Input
                type="number"
                min={0}
                step={1}
                startIcon={Gauge}
                className="font-mono font-medium tracking-wide"
                {...contadorActualField}
                onChange={(event) => {
                  setContadorActualEditado(true);
                  void contadorActualField.onChange(event);
                }}
                placeholder="0"
                aria-invalid={!!errors.contadorActual}
              />
              <FieldDescription>
                Se usa como base si luego se vende y se genera garantía.
              </FieldDescription>
              <FieldError>{errors.contadorActual?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 4: UBICACIÓN === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-amber-500/50 dark:border-l-amber-400/35 bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 hover:border-l-amber-500/70 dark:hover:border-l-amber-400/50">
          <div className="mb-5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[11px] font-bold text-amber-600 dark:bg-amber-400/15 dark:text-amber-300 ring-1 ring-amber-500/25 dark:ring-amber-400/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                4
              </span>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-400/15">
                <MapPin className="size-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground truncate tracking-tight">
                {fueraDeAlmacen
                  ? "Instalación en cliente"
                  : "Ubicación interna"}
              </h3>
            </div>
            {fueraDeAlmacen && !bloqueadoPorAsignacionCliente ? (
              <div className="flex flex-wrap items-center gap-2">
              {locationPickerValue.latitud != null &&
              locationPickerValue.longitud != null ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/[0.05] dark:border-amber-400/15 dark:bg-amber-400/[0.05] px-2.5 py-0.5 font-mono text-[10px] font-medium text-amber-700 dark:text-amber-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  {locationPickerValue.latitud.toFixed(5)},{" "}
                  {locationPickerValue.longitud.toFixed(5)}
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium border-border/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-foreground transition-all duration-200 shadow-sm"
                onClick={() => setShowLocationTools((c) => !c)}
              >
                <MapPin className="size-3.5" />
                {showLocationTools ? "Ocultar mapa" : "Mapa y coordenadas"}
              </Button>
            </div>
            ) : null}
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
                        : "Seleccionar almacén interno"}
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
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground/80 mt-0.5">
                  <Warehouse className="size-3.5 text-muted-foreground/60" />
                  Los equipos vendidos o alquilados quedan fuera del almacén
                  interno de forma automática.
                </p>
              ) : null}
            </Field>

            <Field data-invalid={errors.ubicacion ? true : undefined}>
              <FieldLabel>
                {fueraDeAlmacen
                  ? "Dirección de instalación del cliente"
                  : "Referencia interna opcional"}
              </FieldLabel>
              <Input
                {...register("ubicacion")}
                placeholder={
                  fueraDeAlmacen
                    ? "Ej: Oficina Lima, Piso 3"
                    : "Ej: Pasillo A, rack 2, sala técnica"
                }
                startIcon={MapPin}
                disabled={bloqueadoPorAsignacionCliente || isLoading}
                aria-invalid={!!errors.ubicacion}
              />
              {bloqueadoPorAsignacionCliente ? (
                <FieldDescription>
                  La instalación de un equipo vendido o alquilado se modifica
                  desde su venta, alquiler o ticket de soporte.
                </FieldDescription>
              ) : null}
              <FieldError>{errors.ubicacion?.message}</FieldError>
            </Field>

            {fueraDeAlmacen &&
            !bloqueadoPorAsignacionCliente &&
            showLocationTools ? (
              <div className="rounded-xl border border-border/40 dark:border-border/20 p-1.5 bg-muted/10">
                <LocationPicker
                  value={locationPickerValue}
                  onChange={handleLocationChange}
                  disabled={isLoading}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* === SECCIÓN 5: NOTAS === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-amber-500/50 dark:border-l-amber-400/35 bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 hover:border-l-amber-500/70 dark:hover:border-l-amber-400/50">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[11px] font-bold text-amber-600 dark:bg-amber-400/15 dark:text-amber-300 ring-1 ring-amber-500/25 dark:ring-amber-400/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
              5
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-400/15">
              <FileText className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Notas y observaciones
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6">
            <Field data-invalid={errors.observacionEstado ? true : undefined}>
              <FieldLabel>Observación de estado</FieldLabel>
              <Input
                {...register("observacionEstado")}
                placeholder="Ej: requiere mantenimiento preventivo"
                startIcon={Wrench}
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
