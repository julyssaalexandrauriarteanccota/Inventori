"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RefreshCcw } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import {
  SERVICIO_RECORD_TYPE,
  type ServicioFormPayload,
  useCategoriasServicio,
  useNextServicioSku,
  useUnidadesServicio,
} from "@/hooks/use-servicios";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const SERVICE_DEFAULT_UNIT_CODES = [
  "ZZ",
  "HUR",
  "DAY",
  "NIU",
];

const optionalNonNegativeInt = z.preprocess(
  (value) => {
    if (value === "" || value == null) return undefined;
    return Number(value);
  },
  z
    .number({ error: "Ingresa un tiempo valido" })
    .int("El tiempo debe ser un numero entero")
    .min(0, "El tiempo no puede ser negativo")
    .optional(),
);

const servicioSchema = z.object({
  sku: z.string().trim().optional(),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  categoriaId: z.string().uuid("Selecciona una categoria valida"),
  unidadMedidaId: z.string().uuid("Selecciona una unidad valida"),
  descripcion: z.string().trim().optional(),
  precioCompra: z.coerce
    .number({ error: "Ingresa un costo valido" })
    .min(0, "El costo no puede ser negativo"),
  precioVenta: z.coerce
    .number({ error: "Ingresa un precio valido" })
    .min(0, "El precio no puede ser negativo"),
  tiempoEstimadoMin: optionalNonNegativeInt,
  requiereRepuestos: z.boolean(),
  activo: z.boolean(),
});

type ServicioFormValues = z.infer<typeof servicioSchema>;

interface ServicioFormProps {
  defaultValues?: Partial<ServicioFormPayload>;
  mode: "create" | "edit";
  isLoading?: boolean;
  onCancel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  canViewInternalCosts?: boolean;
  onSubmit: (data: ServicioFormPayload) => void;
}

function getInitialValues(
  defaultValues?: Partial<ServicioFormPayload>,
): ServicioFormValues {
  return {
    sku: defaultValues?.sku ?? "",
    nombre: defaultValues?.nombre ?? "",
    categoriaId: defaultValues?.categoriaId ?? "",
    unidadMedidaId: defaultValues?.unidadMedidaId ?? "",
    descripcion: defaultValues?.descripcion ?? "",
    precioCompra: defaultValues?.precioCompra ?? 0,
    precioVenta: defaultValues?.precioVenta ?? 0,
    tiempoEstimadoMin: defaultValues?.tiempoEstimadoMin ?? undefined,
    requiereRepuestos: defaultValues?.requiereRepuestos ?? false,
    activo: defaultValues?.activo ?? true,
  };
}

export function ServicioForm({
  defaultValues,
  mode,
  isLoading = false,
  onCancel,
  onDirtyChange,
  canViewInternalCosts = true,
  onSubmit,
}: ServicioFormProps) {
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(mode === "edit");
  const form = useForm<ServicioFormValues>({
    resolver: zodResolver(servicioSchema) as Resolver<ServicioFormValues>,
    defaultValues: getInitialValues(defaultValues),
  });

  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = form;

  const categoriaId = watch("categoriaId");
  const unidadMedidaId = watch("unidadMedidaId");
  const sku = watch("sku");

  const { data: categoriasRes } = useCategoriasServicio();
  const categorias = useMemo(() => categoriasRes?.data ?? [], [categoriasRes]);
  const { data: unidadesRes } = useUnidadesServicio();
  const unidades = useMemo(
    () => (unidadesRes?.data ?? []).filter((unidad) => unidad.activo),
    [unidadesRes],
  );
  const {
    data: suggestedSkuRes,
    refetch: refetchSuggestedSku,
    isFetching: isFetchingSuggestedSku,
  } = useNextServicioSku(
    categoriaId || undefined,
    mode === "create" && !skuManuallyEdited,
  );

  useEffect(() => {
    reset(getInitialValues(defaultValues));
    setSkuManuallyEdited(mode === "edit");
  }, [defaultValues, mode, reset]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (unidadMedidaId || unidades.length === 0) return;

    const defaultUnidad =
      SERVICE_DEFAULT_UNIT_CODES.map((codigo) =>
        unidades.find((unidad) => unidad.codigo.toUpperCase() === codigo),
      ).find(Boolean) ?? unidades[0];

    if (!defaultUnidad) return;

    setValue("unidadMedidaId", defaultUnidad.id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [setValue, unidadMedidaId, unidades]);

  useEffect(() => {
    const nextSku = suggestedSkuRes?.data.sku;
    if (mode !== "create" || skuManuallyEdited || !nextSku) return;
    setValue("sku", nextSku, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [mode, setValue, skuManuallyEdited, suggestedSkuRes?.data.sku]);

  async function handleGenerateSku() {
    const result = await refetchSuggestedSku();
    const nextSku = result.data?.data.sku;

    if (!nextSku) {
      toast.error("No se pudo generar un SKU sugerido");
      return;
    }

    setSkuManuallyEdited(true);
    setValue("sku", nextSku, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function submit(values: ServicioFormValues) {
    onSubmit({
      sku: values.sku?.trim() || undefined,
      nombre: values.nombre.trim(),
      descripcion: values.descripcion?.trim() || undefined,
      tipo: SERVICIO_RECORD_TYPE,
      categoriaId: values.categoriaId,
      unidadMedidaId: values.unidadMedidaId,
      precioCompra: values.precioCompra,
      precioVenta: values.precioVenta,
      precioMinimo: values.precioVenta,
      stockMinimo: 0,
      manejaInventario: false,
      tieneNumeroSerie: false,
      esConsumible: false,
      requiereRepuestos: values.requiereRepuestos,
      tiempoEstimadoMin: values.tiempoEstimadoMin,
      activo: values.activo,
      marcaId: null,
      modeloId: null,
      imagen: undefined,
      imagenes: [],
      atributos: [],
      stockInicial: [],
    });
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(submit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={errors.nombre ? true : undefined}>
          <FieldLabel>Nombre *</FieldLabel>
          <Input
            placeholder="Servicio de mantenimiento preventivo"
            {...register("nombre")}
          />
          <FieldError>{errors.nombre?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.sku ? true : undefined}>
          <FieldLabel>SKU</FieldLabel>
          <div className="flex gap-2">
            <Input
              className="font-mono"
              placeholder="Se generara automaticamente"
              {...register("sku", {
                onChange: () => setSkuManuallyEdited(true),
              })}
            />
            {mode === "create" ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isFetchingSuggestedSku}
                title="Generar SKU sugerido"
                className="rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted active:scale-95 active:duration-150"
                onClick={() => void handleGenerateSku()}
              >
                <RefreshCcw
                  className={`size-4 ${
                    isFetchingSuggestedSku ? "animate-spin" : ""
                  }`}
                />
              </Button>
            ) : null}
          </div>
          <FieldDescription>
            {sku ? "Codigo interno del servicio." : "Puedes dejarlo vacio."}
          </FieldDescription>
          <FieldError>{errors.sku?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.categoriaId ? true : undefined}>
          <FieldLabel>Categoria *</FieldLabel>
          <Controller
            control={control}
            name="categoriaId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted/40">
                  <SelectValue placeholder="Selecciona categoria" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl border border-border/60 p-1 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
                  <SelectGroup>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError>{errors.categoriaId?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.unidadMedidaId ? true : undefined}>
          <FieldLabel>Unidad *</FieldLabel>
          <Controller
            control={control}
            name="unidadMedidaId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted/40">
                  <SelectValue placeholder="Selecciona unidad" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl border border-border/60 p-1 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
                  <SelectGroup>
                    {unidades.map((unidad) => (
                      <SelectItem key={unidad.id} value={unidad.id}>
                        {unidad.codigo} · {unidad.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>
            Para servicios usa códigos SUNAT/UBL como ZZ, HUR o DAY.
          </FieldDescription>
          <FieldError>{errors.unidadMedidaId?.message}</FieldError>
        </Field>
      </div>

      <div
        className={`grid gap-4 ${canViewInternalCosts ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        {canViewInternalCosts ? (
          <Field data-invalid={errors.precioCompra ? true : undefined}>
            <FieldLabel>Costo referencial (S/) *</FieldLabel>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("precioCompra")}
            />
            <FieldError>{errors.precioCompra?.message}</FieldError>
          </Field>
        ) : null}

        <Field data-invalid={errors.precioVenta ? true : undefined}>
          <FieldLabel>Precio base (S/) *</FieldLabel>
          <Input
            type="number"
            min="0"
            step="0.01"
            {...register("precioVenta")}
          />
          <FieldError>{errors.precioVenta?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.tiempoEstimadoMin ? true : undefined}>
          <FieldLabel>Tiempo estimado (min)</FieldLabel>
          <Input
            type="number"
            min="0"
            step="1"
            {...register("tiempoEstimadoMin")}
          />
          <FieldError>{errors.tiempoEstimadoMin?.message}</FieldError>
        </Field>
      </div>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="requiereRepuestos"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-3 bg-muted/5 transition-all duration-300 hover:border-border-strong/60">
              <div>
                <FieldLabel>Requiere repuestos</FieldLabel>
                <FieldDescription>
                  Marca si normalmente consume repuestos aparte.
                </FieldDescription>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />

        <Controller
          control={control}
          name="activo"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-3 bg-muted/5 transition-all duration-300 hover:border-border-strong/60">
              <div>
                <FieldLabel>Activo</FieldLabel>
                <FieldDescription>
                  Disponible para tickets, ventas y comprobantes.
                </FieldDescription>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />
      </FieldGroup>

      <Field data-invalid={errors.descripcion ? true : undefined}>
        <FieldLabel>Descripcion</FieldLabel>
        <Textarea
          className="min-h-24 resize-y"
          placeholder="Alcance, condiciones, compatibilidad u observaciones comerciales del servicio."
          {...register("descripcion")}
        />
        <FieldError>{errors.descripcion?.message}</FieldError>
      </Field>

      <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted active:scale-95 active:duration-150"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          {mode === "edit" ? "Guardar cambios" : "Crear servicio"}
        </Button>
      </div>
    </form>
  );
}
