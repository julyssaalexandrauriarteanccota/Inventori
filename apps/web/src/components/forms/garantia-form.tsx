"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  FileText,
  Gauge,
  Loader2,
  Monitor,
} from "lucide-react";
import {
  garantiaFormSchema,
  EstadoGarantia,
  EstadoComercialEquipo,
  type GarantiaFormPayload,
  type EquipoListItem,
} from "@erp/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/searchable-select";
import { useEquipos } from "@/hooks/use-equipos";
import { useDebounce } from "@/hooks/use-debounce";

function addMonthsISO(dateStr: string, meses: number): string {
  if (!dateStr || !Number.isFinite(meses)) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

function describeCliente(cliente?: {
  nombre?: string | null;
  apellido?: string | null;
  razonSocial?: string | null;
} | null): string | null {
  if (!cliente) return null;
  if (cliente.razonSocial) return cliente.razonSocial;
  const full = [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim();
  return full || null;
}

function describeEquipoLabel(equipo: EquipoListItem): string {
  const partes = [equipo.numeroSerie];
  if (equipo.producto?.nombre) partes.push(equipo.producto.nombre);
  if (equipo.producto?.modelo) partes.push(equipo.producto.modelo);
  return partes.filter(Boolean).join(" · ");
}

interface GarantiaFormProps {
  defaultValues?: Partial<GarantiaFormPayload>;
  onSubmit: (data: GarantiaFormPayload) => void;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export function GarantiaForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  mode,
}: GarantiaFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<GarantiaFormPayload>({
    resolver: zodResolver(garantiaFormSchema),
    defaultValues: {
      estado: EstadoGarantia.ACTIVA,
      usarContadorActual: false,
      contadorMaxCopias: null,
      ...defaultValues,
    },
  });

  const estado = useWatch({ control, name: "estado" }) ?? EstadoGarantia.ACTIVA;
  const fechaInicioStr = useWatch({ control, name: "fechaInicio" });
  const fechaFinStr = useWatch({ control, name: "fechaFin" });
  const equipoId = useWatch({ control, name: "equipoId" });
  const usarContadorActual =
    useWatch({ control, name: "usarContadorActual" }) ?? false;

  // === Búsqueda de equipos ===
  const [equipoSearch, setEquipoSearch] = useState("");
  const debouncedEquipoSearch = useDebounce(equipoSearch, 250);
  const { data: equiposRes, isFetching: isFetchingEquipos } = useEquipos({
    search: debouncedEquipoSearch || undefined,
    estadoComercial: EstadoComercialEquipo.VENDIDO,
    sinGarantia: mode === "create" ? true : undefined,
    limit: 20,
  });
  const equipos = useMemo(
    () =>
      (equiposRes?.data ?? []).filter(
        (equipo) =>
          equipo.estadoComercial === EstadoComercialEquipo.VENDIDO &&
          !!equipo.clienteActual?.id,
      ),
    [equiposRes?.data],
  );

  const equipoSeleccionado = useMemo(
    () => equipos.find((e) => e.id === equipoId) ?? null,
    [equipos, equipoId],
  );

  // Cargar etiqueta del equipo si viene desde defaultValues y aún no está en la página actual
  const { data: equipoEditRes } = useEquipos(
    { search: defaultValues?.equipoId ? "" : undefined, limit: 1 },
    { enabled: false },
  );
  void equipoEditRes;

  const equipoOptions = useMemo(() => {
    const opts = equipos.map((eq) => ({
      value: eq.id,
      label: describeEquipoLabel(eq),
    }));
    if (
      equipoId &&
      !opts.some((o) => o.value === equipoId) &&
      defaultValues?.equipoId === equipoId
    ) {
      opts.unshift({ value: equipoId, label: `Equipo ${equipoId.slice(0, 8)}…` });
    }
    return opts;
  }, [equipos, equipoId, defaultValues?.equipoId]);

  // Cliente derivado del equipo seleccionado (último EquipoCliente activo)
  const clienteNombreDerivado = describeCliente(
    equipoSeleccionado?.clienteActual ?? null,
  );
  const contadorBaseGarantia = usarContadorActual
    ? (equipoSeleccionado?.contadorActual ?? null)
    : (equipoSeleccionado?.contadorInicial ?? null);
  const ventaOrigen = equipoSeleccionado?.clienteActual?.venta ?? null;
  const ventaOrigenLabel = ventaOrigen
    ? `${ventaOrigen.numero} · ${ventaOrigen.estado}`
    : "Sin venta registrada en la asignación actual";
  const equipoElegible =
    !equipoSeleccionado ||
    (equipoSeleccionado.estadoComercial === EstadoComercialEquipo.VENDIDO &&
      !!equipoSeleccionado.clienteActual?.id);

  // === Autofill al seleccionar equipo ===
  const [lastAutoEquipo, setLastAutoEquipo] = useState<string | null>(null);
  useEffect(() => {
    if (!equipoSeleccionado) return;
    if (lastAutoEquipo === equipoSeleccionado.id) return;
    if (mode === "edit" && lastAutoEquipo === null) {
      // En edición, primer render: no sobrescribir valores existentes
      setLastAutoEquipo(equipoSeleccionado.id);
      return;
    }
    setLastAutoEquipo(equipoSeleccionado.id);

    const meses = equipoSeleccionado.producto?.mesesGarantia ?? 12;
    const today = new Date().toISOString().slice(0, 10);
    const inicio = fechaInicioStr || today;
    if (!fechaInicioStr) {
      setValue("fechaInicio", inicio, { shouldDirty: true, shouldValidate: true });
    }
    setValue("fechaFin", addMonthsISO(inicio, meses), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(
      "contadorMaxCopias",
      equipoSeleccionado.producto?.garantiaMaxCopias ?? null,
      { shouldDirty: true },
    );
    setValue("ventaId", equipoSeleccionado.clienteActual?.ventaId ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [equipoSeleccionado, mode, lastAutoEquipo, fechaInicioStr, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input type="hidden" {...register("ventaId")} />
      <FieldGroup className="gap-3 sm:gap-7">
        {/* === SECCIÓN 1: EQUIPO Y VENTA === */}
        <div className="rounded-xl border border-border/40 border-l-[3px] border-l-blue-400 bg-card/50 p-4 shadow-sm dark:border-l-blue-800 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-border/40 pb-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 ring-2 ring-blue-100 dark:bg-blue-900/40 dark:text-blue-400 dark:ring-blue-900/30">
              1
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Monitor className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Equipo y venta
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.equipoId ? true : undefined}>
              <FieldLabel>Equipo *</FieldLabel>
              <SearchableSelect
                value={equipoId || undefined}
                onChange={(value) =>
                  setValue("equipoId", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                options={equipoOptions}
                placeholder={
                  isFetchingEquipos ? "Buscando..." : "Buscar por serie o nombre"
                }
                searchPlaceholder="Escribe número de serie, modelo o producto"
                onSearchChange={setEquipoSearch}
                emptyLabel={
                  debouncedEquipoSearch
                    ? "Sin coincidencias"
                    : "Escribe para buscar equipos vendidos sin garantía"
                }
                ariaLabel="Equipo asociado a la garantía"
                invalid={!!errors.equipoId}
                onCreateOption={undefined}
              />
              <FieldDescription>
                {equipoSeleccionado ? (
                  <>
                    Cliente actual:{" "}
                    <strong>{clienteNombreDerivado ?? "Sin asignar"}</strong>
                    {equipoSeleccionado.estadoComercial !==
                      EstadoComercialEquipo.VENDIDO && (
                      <>
                        {" · "}
                        <span className="text-amber-600 dark:text-amber-400">
                          Estado: {equipoSeleccionado.estadoComercial}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  "Sólo se puede crear una garantía manual para equipos vendidos, asignados a un cliente y sin garantía registrada."
                )}
              </FieldDescription>
              {!equipoElegible ? (
                <FieldError>
                  El equipo debe estar vendido y asignado a un cliente para
                  crear una garantía.
                </FieldError>
              ) : null}
              <FieldError>{errors.equipoId?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.ventaId ? true : undefined}>
              <FieldLabel>Venta de origen</FieldLabel>
              <Input
                value={equipoSeleccionado ? ventaOrigenLabel : ""}
                placeholder="Se derivará del equipo vendido"
                readOnly
                disabled
                aria-invalid={!!errors.ventaId}
              />
              <FieldDescription>
                Se toma de la asignación vigente del equipo. La garantía sigue
                siendo por equipo, aunque el cliente tenga varias ventas.
              </FieldDescription>
              <FieldError>{errors.ventaId?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 2: VIGENCIA === */}
        <div className="rounded-xl border border-border/40 border-l-[3px] border-l-emerald-400 bg-card/50 p-4 shadow-sm dark:border-l-emerald-800 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-border/40 pb-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-600 ring-2 ring-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 dark:ring-emerald-900/30">
              2
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Calendar className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Vigencia</h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.fechaInicio ? true : undefined}>
              <FieldLabel>Fecha inicio *</FieldLabel>
              <DatePicker
                value={fechaInicioStr}
                onChange={(v) =>
                  setValue("fechaInicio", v ?? "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                placeholder="Seleccionar fecha inicio"
                aria-invalid={!!errors.fechaInicio}
              />
              <FieldError>{errors.fechaInicio?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.fechaFin ? true : undefined}>
              <FieldLabel>Fecha fin *</FieldLabel>
              <DatePicker
                value={fechaFinStr}
                onChange={(v) =>
                  setValue("fechaFin", v ?? "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                placeholder="Seleccionar fecha fin"
                aria-invalid={!!errors.fechaFin}
              />
              <FieldError>{errors.fechaFin?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.estado ? true : undefined}>
              <FieldLabel>Estado</FieldLabel>
              <Select
                value={estado}
                onValueChange={(v) =>
                  setValue("estado", v as EstadoGarantia, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger aria-invalid={!!errors.estado}>
                  <SelectValue placeholder="Estado de garantía" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EstadoGarantia.ACTIVA}>Activa</SelectItem>
                  <SelectItem value={EstadoGarantia.VENCIDA}>
                    Vencida
                  </SelectItem>
                  <SelectItem value={EstadoGarantia.ANULADA}>
                    Anulada
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldError>{errors.estado?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 3: COBERTURA POR COPIAS === */}
        <div className="rounded-xl border border-border/40 border-l-[3px] border-l-amber-400 bg-card/50 p-4 shadow-sm dark:border-l-amber-800 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-border/40 pb-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-600 ring-2 ring-amber-100 dark:bg-amber-900/40 dark:text-amber-400 dark:ring-amber-900/30">
              3
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <Gauge className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Cobertura por copias (opcional)
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-disabled>
              <FieldLabel>Contador base de garantía</FieldLabel>
              <Input
                type="number"
                value={contadorBaseGarantia ?? ""}
                placeholder="Se tomará del equipo seleccionado"
                readOnly
                disabled
              />
              <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background px-3 py-2">
                <span className="text-sm text-foreground">
                  Usar contador actual del equipo
                </span>
                <Switch
                  checked={!!usarContadorActual}
                  onCheckedChange={(checked) =>
                    setValue("usarContadorActual", Boolean(checked), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  aria-label="Usar contador actual del equipo"
                />
              </div>
              <FieldDescription>
                Apagado usa el contador inicial del equipo; encendido usa el
                contador actual.
              </FieldDescription>
            </Field>

            <Field data-invalid={errors.contadorMaxCopias ? true : undefined}>
              <FieldLabel>Máximo de copias cubiertas</FieldLabel>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="Sin límite"
                {...register("contadorMaxCopias", {
                  setValueAs: (value) => {
                    if (value === "" || value === null || value === undefined) {
                      return null;
                    }
                    const num = Number(value);
                    return Number.isFinite(num) ? num : null;
                  },
                })}
                aria-invalid={!!errors.contadorMaxCopias}
              />
              <FieldDescription>
                Si se alcanza este número de copias antes de la fecha fin, la
                garantía se considera consumida.
              </FieldDescription>
              <FieldError>{errors.contadorMaxCopias?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 4: COBERTURA === */}
        <div className="rounded-xl border border-border/40 border-l-[3px] border-l-orange-400 bg-card/50 p-4 shadow-sm dark:border-l-orange-800 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-border/40 pb-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600 ring-2 ring-orange-100 dark:bg-orange-900/40 dark:text-orange-400 dark:ring-orange-900/30">
              4
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
              <FileText className="size-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Cobertura</h3>
          </div>
          <div className="grid gap-4 sm:gap-6">
            <Field data-invalid={errors.cobertura ? true : undefined}>
              <FieldLabel>Cobertura *</FieldLabel>
              <Textarea
                {...register("cobertura")}
                placeholder="Describe qué cubre la garantía"
                rows={3}
                aria-invalid={!!errors.cobertura}
              />
              <FieldError>{errors.cobertura?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.exclusiones ? true : undefined}>
              <FieldLabel>Exclusiones</FieldLabel>
              <Textarea
                {...register("exclusiones")}
                placeholder="Qué NO cubre la garantía (daños físicos, mal uso, etc.)"
                rows={2}
                aria-invalid={!!errors.exclusiones}
              />
              <FieldError>{errors.exclusiones?.message}</FieldError>
            </Field>
          </div>
        </div>
      </FieldGroup>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="submit"
          disabled={isLoading || !equipoElegible}
          className="min-w-36 gap-2"
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Crear garantía" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
