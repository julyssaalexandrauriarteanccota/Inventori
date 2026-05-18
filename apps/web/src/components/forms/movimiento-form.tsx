"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import {
  MovimientoComportamiento,
  TipoMovimiento,
  TipoProducto,
  movimientoFormSchema,
  type MovimientoFormPayload,
  type TipoMovimientoConfigListItem,
} from "@erp/shared";

import { uploadSelectedFiles } from "@/lib/file-uploads";
import { useProductos } from "@/hooks/use-productos";
import { useAlmacenes, useStockByProducto } from "@/hooks/use-inventario";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { getTiposMovimientoConfig } from "@/lib/tipos-movimiento";

interface MovimientoFormProps {
  onSubmit: (data: MovimientoFormPayload) => void;
  isLoading?: boolean;
  tipoOptions: TipoMovimientoConfigListItem[];
}

export function MovimientoForm({
  onSubmit,
  isLoading = false,
  tipoOptions,
}: MovimientoFormProps) {
  const { data: almacenesRes } = useAlmacenes();
  const { data: productosRes, isLoading: isLoadingProductos } = useProductos({
    page: 1,
    limit: 100,
    activo: true,
  });
  const almacenes = useMemo(
    () => almacenesRes?.data ?? [],
    [almacenesRes?.data],
  );
  const productos = useMemo(
    () => productosRes?.data ?? [],
    [productosRes?.data],
  );
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  const tipos = useMemo(
    () => getTiposMovimientoConfig(tipoOptions),
    [tipoOptions],
  );
  const productoOptions = useMemo<SearchableSelectOption[]>(
    () =>
      productos
        .filter(
          (producto) =>
            producto.manejaInventario &&
            producto.tipo !== TipoProducto.SERVICIO &&
            producto.tipo !== TipoProducto.EQUIPO &&
            !producto.tieneNumeroSerie,
        )
        .map((producto) => ({
          value: producto.id,
          label: `${producto.sku} - ${producto.nombre}`,
        })),
    [productos],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<MovimientoFormPayload>({
    resolver: zodResolver(movimientoFormSchema),
    defaultValues: {
      tipo: TipoMovimiento.AJUSTE_POSITIVO,
      cantidad: 1,
    },
  });

  const tipo = watch("tipo");
  const productoId = watch("productoId");
  const almacenOrigenId = watch("almacenOrigenId");
  const almacenDestinoId = watch("almacenDestinoId");
  const evidenciaFilename = watch("evidenciaFilename");
  const selectedTipo = tipos.find((item) => item.codigo === tipo);
  const comportamiento =
    selectedTipo?.comportamiento ?? MovimientoComportamiento.SALIDA;
  const requiresJustificacion = selectedTipo?.requiereJustificacion ?? false;
  const requiresEvidencia = selectedTipo?.requiereEvidencia ?? false;
  const showDestino = comportamiento === MovimientoComportamiento.TRANSFERENCIA;
  const showOrigen = comportamiento !== MovimientoComportamiento.ENTRADA;
  const showDestinoField =
    comportamiento === MovimientoComportamiento.ENTRADA || showDestino;
  const seccionDosTitulo =
    comportamiento === MovimientoComportamiento.ENTRADA
      ? "Almacén destino y cantidad"
      : comportamiento === MovimientoComportamiento.TRANSFERENCIA
        ? "Almacenes y cantidad"
        : "Almacén origen y cantidad";
  const { data: stockProductoRes, isLoading: isLoadingStockProducto } =
    useStockByProducto(productoId);
  const stockProducto = useMemo(
    () => stockProductoRes?.data ?? [],
    [stockProductoRes],
  );
  const stockTotal = useMemo(
    () => stockProducto.reduce((acc, item) => acc + item.cantidad, 0),
    [stockProducto],
  );
  const stockOrigen = useMemo(
    () =>
      stockProducto.find((item) => item.almacen.id === almacenOrigenId)
        ?.cantidad ?? 0,
    [almacenOrigenId, stockProducto],
  );
  const stockDestino = useMemo(
    () =>
      stockProducto.find((item) => item.almacen.id === almacenDestinoId)
        ?.cantidad ?? 0,
    [almacenDestinoId, stockProducto],
  );

  const movementHint = useMemo(() => {
    if (comportamiento === MovimientoComportamiento.ENTRADA) {
      return "Este movimiento suma stock en el almacén destino. Para ingreso manual usa Ajuste positivo.";
    }
    if (comportamiento === MovimientoComportamiento.TRANSFERENCIA) {
      return "Este movimiento descuenta 1 stock del origen y lo suma al destino.";
    }
    return "Este movimiento descuenta stock del almacén origen. No se permitirá bajar más de lo disponible.";
  }, [comportamiento]);

  useEffect(() => {
    const defaultTipo =
      tipos.find((item) => item.codigo === TipoMovimiento.AJUSTE_POSITIVO) ??
      tipos[0];

    if (tipo && tipos.some((item) => item.codigo === tipo)) {
      return;
    }

    if (defaultTipo) {
      setValue("tipo", defaultTipo.codigo, { shouldValidate: true });
      return;
    }

    setValue("tipo", "", { shouldValidate: true });
  }, [setValue, tipo, tipos]);

  useEffect(() => {
    if (!showOrigen) {
      setValue("almacenOrigenId", undefined);
    }
    if (!showDestinoField) {
      setValue("almacenDestinoId", undefined);
    }
  }, [setValue, showOrigen, showDestinoField]);

  const almacenesActivos = useMemo(
    () => almacenes.filter((a) => a.activo),
    [almacenes],
  );
  const almacenPrincipalId = useMemo(() => {
    const principal = almacenesActivos.find((a) => a.esPrincipal);
    if (principal) return principal.id;
    if (almacenesActivos.length === 1) return almacenesActivos[0].id;
    return undefined;
  }, [almacenesActivos]);

  useEffect(() => {
    if (!showOrigen) return;
    if (almacenOrigenId) return;
    if (!almacenPrincipalId) return;
    setValue("almacenOrigenId", almacenPrincipalId, {
      shouldValidate: true,
    });
  }, [almacenOrigenId, almacenPrincipalId, setValue, showOrigen]);

  useEffect(() => {
    if (!showDestinoField) return;
    if (almacenDestinoId) return;
    // Solo auto-rellenamos destino cuando es ENTRADA (transferencia requiere distinto al origen)
    if (comportamiento !== MovimientoComportamiento.ENTRADA) return;
    if (!almacenPrincipalId) return;
    setValue("almacenDestinoId", almacenPrincipalId, {
      shouldValidate: true,
    });
  }, [
    almacenDestinoId,
    almacenPrincipalId,
    comportamiento,
    setValue,
    showDestinoField,
  ]);

  const requiereStockOrigen =
    comportamiento === MovimientoComportamiento.SALIDA ||
    comportamiento === MovimientoComportamiento.TRANSFERENCIA;
  const productoSinStock =
    requiereStockOrigen &&
    !!productoId &&
    !isLoadingStockProducto &&
    stockTotal === 0;
  const origenSinStock =
    requiereStockOrigen &&
    !!productoId &&
    !!almacenOrigenId &&
    !isLoadingStockProducto &&
    stockOrigen === 0;
  const cantidadMaxima = requiereStockOrigen ? stockOrigen : undefined;

  const validateDynamicRules = useCallback(
    (data: MovimientoFormPayload) => {
      let valid = true;

      clearErrors([
        "almacenOrigenId",
        "almacenDestinoId",
        "justificacion",
        "evidenciaFilename",
        "cantidad",
      ]);

      if (
        (comportamiento === MovimientoComportamiento.SALIDA ||
          comportamiento === MovimientoComportamiento.TRANSFERENCIA) &&
        !data.almacenOrigenId
      ) {
        setError("almacenOrigenId", {
          type: "manual",
          message: "Selecciona un almacén de origen",
        });
        valid = false;
      }

      if (
        (comportamiento === MovimientoComportamiento.ENTRADA ||
          comportamiento === MovimientoComportamiento.TRANSFERENCIA) &&
        !data.almacenDestinoId
      ) {
        setError("almacenDestinoId", {
          type: "manual",
          message: "Selecciona un almacén de destino",
        });
        valid = false;
      }

      if (
        comportamiento === MovimientoComportamiento.TRANSFERENCIA &&
        data.almacenOrigenId &&
        data.almacenDestinoId &&
        data.almacenOrigenId === data.almacenDestinoId
      ) {
        setError("almacenDestinoId", {
          type: "manual",
          message: "El almacén destino debe ser distinto al origen",
        });
        valid = false;
      }

      if (requiresJustificacion && !data.justificacion?.trim()) {
        setError("justificacion", {
          type: "manual",
          message: "La justificación es obligatoria para este tipo",
        });
        valid = false;
      }

      if (requiresEvidencia && !data.evidenciaFilename) {
        setError("evidenciaFilename", {
          type: "manual",
          message: "Sube una evidencia para este movimiento",
        });
        valid = false;
      }

      if (
        valid &&
        (comportamiento === MovimientoComportamiento.SALIDA ||
          comportamiento === MovimientoComportamiento.TRANSFERENCIA) &&
        data.almacenOrigenId
      ) {
        const disponible =
          stockProducto.find((item) => item.almacen.id === data.almacenOrigenId)
            ?.cantidad ?? 0;
        if (disponible < data.cantidad) {
          setError("cantidad", {
            type: "manual",
            message: `Stock insuficiente en origen. Disponible: ${disponible}`,
          });
          valid = false;
        }
      }

      return valid;
    },
    [
      clearErrors,
      comportamiento,
      requiresEvidencia,
      requiresJustificacion,
      setError,
      stockProducto,
    ],
  );

  const handleEvidenceSelected = useCallback(
    async (file: File | null) => {
      if (!file) {
        setValue("evidenciaFilename", undefined, { shouldValidate: true });
        return;
      }

      setIsUploadingEvidence(true);

      try {
        const [response] = await uploadSelectedFiles([file], {
          preset: "image",
          maxFiles: 1,
        });
        setValue("evidenciaFilename", response.filename, {
          shouldValidate: true,
        });
        clearErrors("evidenciaFilename");
      } catch (error) {
        setError("evidenciaFilename", {
          type: "manual",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo subir la evidencia",
        });
      } finally {
        setIsUploadingEvidence(false);
      }
    },
    [clearErrors, setError, setValue],
  );

  return (
    <form
      onSubmit={handleSubmit((data) => {
        if (!validateDynamicRules(data)) {
          return;
        }

        onSubmit(data);
      })}
      noValidate
    >
      <FieldGroup className="gap-3 sm:gap-7">
        <div className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              1
            </span>
            <h3 className="text-sm font-medium tracking-tight text-foreground/90">
              Tipo y producto
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.tipo ? true : undefined}>
              <FieldLabel>Tipo de movimiento *</FieldLabel>
              <Select
                value={tipo}
                onValueChange={(value) =>
                  setValue("tipo", value, { shouldValidate: true })
                }
                disabled={tipos.length === 0}
              >
                <SelectTrigger aria-invalid={!!errors.tipo}>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((item) => (
                    <SelectItem key={item.id} value={item.codigo}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {tipos.length === 0
                  ? "No hay tipos manuales activos para registrar desde inventario."
                  : movementHint}
              </FieldDescription>
              <FieldError>{errors.tipo?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.productoId ? true : undefined}>
              <FieldLabel>Producto *</FieldLabel>
              <SearchableSelect
                value={productoId ?? ""}
                onChange={(value) => {
                  setValue("productoId", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  clearErrors("productoId");
                }}
                options={productoOptions}
                placeholder={
                  isLoadingProductos
                    ? "Cargando productos..."
                    : "Seleccionar producto"
                }
                searchPlaceholder="Buscar por SKU o nombre"
                emptyLabel="No hay repuestos, insumos o accesorios con inventario"
                ariaLabel="Seleccionar producto"
                invalid={!!errors.productoId}
                disabled={isLoadingProductos}
              />
              <FieldError>{errors.productoId?.message}</FieldError>
            </Field>
          </div>

          {productoId ? (
            <div className="mt-4 rounded-xl border border-blue-200/60 bg-blue-50/60 px-4 py-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-medium text-foreground">
                  {isLoadingStockProducto
                    ? "Cargando stock actual…"
                    : `Stock total actual: ${stockTotal}`}
                </span>
                <span className="text-muted-foreground">
                  Origen:{" "}
                  <span className="font-medium text-foreground">
                    {almacenOrigenId ? stockOrigen : "—"}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Destino:{" "}
                  <span className="font-medium text-foreground">
                    {almacenDestinoId ? stockDestino : "—"}
                  </span>
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                El stock se maneja por almacén. Si registras una salida o
                transferencia, se valida contra el almacén origen seleccionado.
              </p>
              {productoSinStock ? (
                <p className="mt-2 text-xs font-medium text-destructive">
                  Este producto no tiene stock en ningún almacén. No es
                  posible registrar{" "}
                  {comportamiento === MovimientoComportamiento.TRANSFERENCIA
                    ? "una transferencia"
                    : "una salida"}
                  .
                </p>
              ) : origenSinStock ? (
                <p className="mt-2 text-xs font-medium text-destructive">
                  El almacén origen seleccionado no tiene stock de este
                  producto.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              2
            </span>
            <h3 className="text-sm font-medium tracking-tight text-foreground/90">
              {seccionDosTitulo}
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {showOrigen ? (
              <Field data-invalid={errors.almacenOrigenId ? true : undefined}>
                <FieldLabel>Almacén origen *</FieldLabel>
                <Select
                  value={watch("almacenOrigenId") ?? ""}
                  onValueChange={(value) =>
                    setValue("almacenOrigenId", value || undefined, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger aria-invalid={!!errors.almacenOrigenId}>
                    <SelectValue placeholder="Seleccionar almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {almacenes.map((almacen) => (
                      <SelectItem key={almacen.id} value={almacen.id}>
                        {almacen.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.almacenOrigenId?.message}</FieldError>
              </Field>
            ) : null}

            {showDestinoField ? (
              <Field data-invalid={errors.almacenDestinoId ? true : undefined}>
                <FieldLabel>Almacén destino *</FieldLabel>
                <Select
                  value={watch("almacenDestinoId") ?? ""}
                  onValueChange={(value) =>
                    setValue("almacenDestinoId", value || undefined, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger aria-invalid={!!errors.almacenDestinoId}>
                    <SelectValue placeholder="Seleccionar almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {almacenes.map((almacen) => (
                      <SelectItem key={almacen.id} value={almacen.id}>
                        {almacen.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.almacenDestinoId?.message}</FieldError>
              </Field>
            ) : null}

            <Field data-invalid={errors.cantidad ? true : undefined}>
              <FieldLabel>Cantidad *</FieldLabel>
              <Input
                type="number"
                min={1}
                max={cantidadMaxima}
                {...register("cantidad", { valueAsNumber: true })}
                aria-invalid={!!errors.cantidad}
              />
              {requiereStockOrigen && almacenOrigenId ? (
                <FieldDescription>
                  Disponible en origen:{" "}
                  <span className="font-medium text-foreground">
                    {stockOrigen}
                  </span>
                </FieldDescription>
              ) : null}
              <FieldError>{errors.cantidad?.message}</FieldError>
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              3
            </span>
            <h3 className="text-sm font-medium tracking-tight text-foreground/90">
              Justificación y evidencia
            </h3>
          </div>

          <div className="grid gap-4 sm:gap-6">
            <Field data-invalid={errors.justificacion ? true : undefined}>
              <FieldLabel>
                Justificación{requiresJustificacion ? " *" : ""}
              </FieldLabel>
              <Textarea
                {...register("justificacion")}
                placeholder={
                  requiresJustificacion
                    ? "Explica por qué se registra este movimiento"
                    : "Motivo del movimiento (opcional)"
                }
                rows={3}
                aria-invalid={!!errors.justificacion}
              />
              <FieldError>{errors.justificacion?.message}</FieldError>
            </Field>

            {requiresEvidencia && (
              <Field data-invalid={errors.evidenciaFilename ? true : undefined}>
                <FieldLabel>Evidencia *</FieldLabel>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      void handleEvidenceSelected(file);
                    }}
                    aria-invalid={!!errors.evidenciaFilename}
                  />
                  <div className="text-xs text-muted-foreground">
                    {isUploadingEvidence ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin" />
                        Subiendo evidencia...
                      </span>
                    ) : evidenciaFilename ? (
                      <span className="inline-flex items-center gap-2">
                        <Upload className="size-3.5" />
                        {evidenciaFilename}
                      </span>
                    ) : (
                      "Acepta JPG, JPEG, PNG o WEBP."
                    )}
                  </div>
                </div>
                <FieldError>{errors.evidenciaFilename?.message}</FieldError>
              </Field>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              isLoading ||
              isUploadingEvidence ||
              tipos.length === 0 ||
              productoSinStock ||
              origenSinStock
            }
            className="rounded-xl"
          >
            {(isLoading || isUploadingEvidence) && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Registrar movimiento
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
