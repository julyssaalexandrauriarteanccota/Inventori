"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Settings2,
  Tag,
  UserCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  ticketFormSchema,
  PrioridadTicket,
  RolUsuario,
  TipoServicio,
  TipoProducto,
  type TicketFormPayload,
  type TicketClassificationResult,
} from "@erp/shared";

import { cn } from "@/lib/utils";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useClientes } from "@/hooks/use-clientes";
import { useEquipos } from "@/hooks/use-equipos";
import { useProductos } from "@/hooks/use-productos";
import { useUsuarios } from "@/hooks/use-configuracion";
import { ClasificarTicketButton } from "@/components/clasificar-ticket-button";
import { EquipoQuickCreateModal } from "@/components/modals/equipo-quick-create-modal";
import { ClienteQuickCreateModal } from "@/components/modals/cliente-quick-create-modal";
import { Plus } from "lucide-react";

const PRIORIDAD_LABELS: Record<PrioridadTicket, string> = {
  [PrioridadTicket.BAJA]: "Baja",
  [PrioridadTicket.MEDIA]: "Media",
  [PrioridadTicket.ALTA]: "Alta",
  [PrioridadTicket.CRITICA]: "Crítica",
};

const TIPO_SERVICIO_LABELS: Record<TipoServicio, string> = {
  [TipoServicio.TALLER]: "Taller",
  [TipoServicio.VISITA]: "Visita",
  [TipoServicio.REMOTO]: "Remoto",
};

interface TicketFormProps {
  defaultValues?: Partial<TicketFormPayload>;
  onSubmit: (data: TicketFormPayload) => void;
  isLoading?: boolean;
  mode: "create" | "edit";
  /**
   * Rol del usuario que está usando el formulario.
   * - TECNICO: oculta selector de técnico (auto-asignación en backend).
   * - ADMIN/ENCARGADO: muestra selector para asignar técnico.
   */
  userRol?: RolUsuario;
}

export function TicketForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  mode,
  userRol,
}: TicketFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<TicketFormPayload>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      prioridad: PrioridadTicket.MEDIA,
      tipoServicio: TipoServicio.TALLER,
      ...defaultValues,
    },
  });

  const prioridad = useWatch({ control, name: "prioridad" });
  const tipoServicio = useWatch({ control, name: "tipoServicio" });
  const clienteId = useWatch({ control, name: "clienteId" });
  const equipoId = useWatch({ control, name: "equipoId" });
  const tecnicoId = useWatch({ control, name: "tecnicoId" });
  const titulo = useWatch({ control, name: "titulo" });
  const descripcion = useWatch({ control, name: "descripcion" });
  const detallesIniciales = useWatch({ control, name: "detalles" });

  const [aiSuggestion, setAiSuggestion] =
    useState<TicketClassificationResult | null>(null);

  const handleAiResult = (result: TicketClassificationResult) => {
    setAiSuggestion(result);
    setValue("prioridad", result.prioridadSugerida as PrioridadTicket, {
      shouldValidate: true,
    });
    if (
      Object.values(TipoServicio).includes(
        result.tipoServicioSugerido as TipoServicio,
      )
    ) {
      setValue("tipoServicio", result.tipoServicioSugerido as TipoServicio, {
        shouldValidate: true,
      });
    }
  };

  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const { data: clientesData } = useClientes({
    search: clienteSearch,
    limit: 20,
  });
  const clientes = clientesData?.data ?? [];

  const [equipoOpen, setEquipoOpen] = useState(false);
  const [equipoSearch, setEquipoSearch] = useState("");
  const [equipoQuickCreateOpen, setEquipoQuickCreateOpen] = useState(false);
  const [clienteQuickCreateOpen, setClienteQuickCreateOpen] = useState(false);
  const { data: equiposData } = useEquipos(
    { search: equipoSearch, clienteId, limit: 20 },
    { enabled: !!clienteId },
  );
  const equipos = equiposData?.data ?? [];

  // Cuando cambia el cliente, limpiar equipo seleccionado.
  // Saltamos el primer render para no pisar defaultValues (modo edit).
  const skipFirstClienteChange = useRef(true);
  useEffect(() => {
    if (skipFirstClienteChange.current) {
      skipFirstClienteChange.current = false;
      return;
    }
    setValue("equipoId", undefined, { shouldValidate: true });
  }, [clienteId, setValue]);

  // Lista de técnicos sólo para ADMIN/ENCARGADO
  const showTecnicoSelector = userRol && userRol !== RolUsuario.TECNICO;
  const { data: tecnicosData } = useUsuarios(1, undefined, 100);
  const tecnicos = (tecnicosData?.data ?? []).filter(
    (u) => u.rol === RolUsuario.TECNICO && u.activo !== false,
  );

  const selectedCliente = clientes.find((c) => c.id === clienteId);
  const selectedEquipo = equipos.find((e) => e.id === equipoId);

  const [servicioOpen, setServicioOpen] = useState(false);
  const [servicioSearch, setServicioSearch] = useState("");
  const { data: serviciosData, isLoading: serviciosLoading } = useProductos(
    {
      search: servicioSearch,
      tipo: TipoProducto.SERVICIO,
      activo: true,
      limit: 20,
    },
  );
  const servicios = serviciosData?.data ?? [];
  const servicioInicialId = detallesIniciales?.[0]?.productoId;
  const selectedServicio = servicios.find((s) => s.id === servicioInicialId);

  const setServicioInicial = (servicioId: string | undefined) => {
    if (!servicioId) {
      setValue("detalles", undefined, { shouldValidate: true });
      return;
    }
    const servicio = servicios.find((s) => s.id === servicioId);
    setValue(
      "detalles",
      [
        {
          productoId: servicioId,
          cantidad: 1,
          precioUnitario: Number(servicio?.precioVenta ?? 0),
          cubiertoGarantia: false,
          notas: "Servicio solicitado al crear el ticket",
        },
      ],
      { shouldValidate: true },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3 sm:gap-7">
        {/* === SECCIÓN 1: CLIENTE Y EQUIPO === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 dark:border-l-blue-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30">
              1
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Users className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Cliente y equipo
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.clienteId ? true : undefined}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>Cliente *</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                  onClick={() => setClienteQuickCreateOpen(true)}
                  title="Registrar nuevo cliente"
                >
                  <Plus className="size-3.5" /> Nuevo cliente
                </Button>
              </div>
              <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clienteOpen}
                    className={cn(
                      "w-full justify-between font-normal",
                      !clienteId && "text-muted-foreground",
                    )}
                  >
                    {selectedCliente
                      ? `${selectedCliente.nombre ?? ""} ${selectedCliente.apellido ?? ""}`.trim() ||
                        selectedCliente.razonSocial ||
                        ""
                      : clienteId
                        ? clienteId.slice(0, 8) + "..."
                        : "Buscar cliente..."}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar por nombre, RUC o DNI..."
                      value={clienteSearch}
                      onValueChange={setClienteSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Sin resultados.</CommandEmpty>
                      <CommandGroup>
                        {clientes.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            onSelect={(v) => {
                              setValue("clienteId", v, {
                                shouldValidate: true,
                              });
                              setClienteOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                clienteId === c.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {c.nombre ?? ""} {c.apellido ?? ""}
                                {c.razonSocial ? ` — ${c.razonSocial}` : ""}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {c.ruc ?? c.dni ?? ""}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FieldError>{errors.clienteId?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.equipoId ? true : undefined}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>Equipo</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                  disabled={!clienteId}
                  onClick={() => setEquipoQuickCreateOpen(true)}
                  title={clienteId ? "Registrar nuevo equipo y asignarlo al cliente" : "Selecciona un cliente primero"}
                >
                  <Plus className="size-3.5" /> Nuevo equipo
                </Button>
              </div>
              <Popover open={equipoOpen} onOpenChange={setEquipoOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={equipoOpen}
                    disabled={!clienteId}
                    className={cn(
                      "w-full justify-between font-normal",
                      !equipoId && "text-muted-foreground",
                    )}
                  >
                    {selectedEquipo
                      ? `${selectedEquipo.numeroSerie} — ${selectedEquipo.producto?.nombre ?? ""}`
                      : equipoId
                        ? equipoId.slice(0, 8) + "..."
                        : clienteId
                          ? "Buscar equipo del cliente..."
                          : "Selecciona un cliente primero"}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar por serie o modelo..."
                      value={equipoSearch}
                      onValueChange={setEquipoSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {clienteId
                          ? "Este cliente no tiene equipos asignados."
                          : "Selecciona un cliente primero."}
                      </CommandEmpty>
                      <CommandGroup>
                        {equipos.map((e) => (
                          <CommandItem
                            key={e.id}
                            value={e.id}
                            onSelect={(v) => {
                              setValue("equipoId", v, { shouldValidate: true });
                              setEquipoOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                equipoId === e.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-mono">
                                {e.numeroSerie}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {e.producto?.nombre} {e.producto?.modelo ?? ""}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FieldError>{errors.equipoId?.message}</FieldError>
            </Field>
          </div>
          {showTecnicoSelector && (
            <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 md:grid-cols-2">
              <Field data-invalid={errors.tecnicoId ? true : undefined}>
                <FieldLabel className="flex items-center gap-2">
                  <UserCog className="size-3.5 text-muted-foreground" />
                  Técnico asignado
                </FieldLabel>
                <Select
                  value={tecnicoId ?? "__none__"}
                  onValueChange={(v) =>
                    setValue(
                      "tecnicoId",
                      v === "__none__" ? undefined : v,
                      { shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger aria-invalid={!!errors.tecnicoId}>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {tecnicos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nombre} {t.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.tecnicoId?.message}</FieldError>
              </Field>
            </div>
          )}
        </div>

        {/* === SECCIÓN 2: DETALLE DEL TICKET === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 dark:border-l-green-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-100 dark:ring-green-900/30">
              2
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
              <Tag className="size-3.5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Detalle del ticket
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6">
            <Field data-invalid={errors.titulo ? true : undefined}>
              <FieldLabel>Título *</FieldLabel>
              <Input
                {...register("titulo")}
                placeholder="Resumen del problema"
                aria-invalid={!!errors.titulo}
              />
              <FieldError>{errors.titulo?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.descripcion ? true : undefined}>
              <FieldLabel>Descripción *</FieldLabel>
              <Textarea
                {...register("descripcion")}
                placeholder="Describe el problema en detalle"
                rows={4}
                aria-invalid={!!errors.descripcion}
              />
              <FieldError>{errors.descripcion?.message}</FieldError>
            </Field>

            {mode === "create" && (
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Wrench className="size-3.5 text-muted-foreground" />
                  Servicio solicitado
                </FieldLabel>
                <div className="flex gap-2">
                  <Popover open={servicioOpen} onOpenChange={setServicioOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={servicioOpen}
                        className={cn(
                          "min-w-0 flex-1 justify-between font-normal",
                          !servicioInicialId && "text-muted-foreground",
                        )}
                      >
                        <span className="truncate">
                          {selectedServicio
                            ? `${selectedServicio.sku} · ${selectedServicio.nombre}`
                            : servicioInicialId
                              ? servicioInicialId.slice(0, 8) + "..."
                              : "Opcional: elegir servicio del catálogo"}
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar servicio por SKU o nombre..."
                          value={servicioSearch}
                          onValueChange={setServicioSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {serviciosLoading
                              ? "Cargando servicios..."
                              : "Sin servicios activos."}
                          </CommandEmpty>
                          <CommandGroup>
                            {servicios.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={s.id}
                                onSelect={(v) => {
                                  setServicioInicial(v);
                                  setServicioOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 size-4",
                                    servicioInicialId === s.id
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate text-sm">
                                    {s.nombre}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {s.sku} · S/ {Number(s.precioVenta ?? 0).toFixed(2)}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {servicioInicialId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setServicioInicial(undefined)}
                      title="Quitar servicio solicitado"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <FieldError>{errors.detalles?.message}</FieldError>
              </Field>
            )}
          </div>
        </div>

        {/* === SECCIÓN 3: CLASIFICACIÓN === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-orange-400 dark:border-l-orange-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 ring-2 ring-orange-100 dark:ring-orange-900/30">
                3
              </span>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                <Settings2 className="size-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Clasificación
              </h3>
            </div>
            <ClasificarTicketButton
              titulo={titulo ?? ""}
              descripcion={descripcion ?? ""}
              onResult={handleAiResult}
              disabled={isLoading}
            />
          </div>
          {aiSuggestion && (
            <p className="mb-3 text-xs text-muted-foreground">
              IA sugirió: <strong>{aiSuggestion.categoriaFalla}</strong> —
              confianza {aiSuggestion.confianza}%
            </p>
          )}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.prioridad ? true : undefined}>
              <FieldLabel>Prioridad</FieldLabel>
              <Select
                value={prioridad}
                onValueChange={(v) =>
                  setValue("prioridad", v as PrioridadTicket, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger aria-invalid={!!errors.prioridad}>
                  <SelectValue placeholder="Seleccionar prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PrioridadTicket).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORIDAD_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.prioridad?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.tipoServicio ? true : undefined}>
              <FieldLabel>Tipo de servicio</FieldLabel>
              <Select
                value={tipoServicio}
                onValueChange={(v) =>
                  setValue("tipoServicio", v as TipoServicio, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger aria-invalid={!!errors.tipoServicio}>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TipoServicio).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_SERVICIO_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.tipoServicio?.message}</FieldError>
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
              "Crear ticket"
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </FieldGroup>

      {/* Quick create equipo modal */}
      {clienteId && (
        <EquipoQuickCreateModal
          open={equipoQuickCreateOpen}
          onClose={() => setEquipoQuickCreateOpen(false)}
          clienteId={clienteId}
          onCreated={(equipo) => {
            setValue("equipoId", equipo.id, { shouldValidate: true });
            setEquipoSearch(equipo.numeroSerie);
          }}
        />
      )}

      {/* Quick create cliente modal */}
      <ClienteQuickCreateModal
        open={clienteQuickCreateOpen}
        onClose={() => setClienteQuickCreateOpen(false)}
        onCreated={(cliente) => {
          setValue("clienteId", cliente.id, { shouldValidate: true });
          const display =
            cliente.razonSocial ??
            [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim();
          if (display) setClienteSearch(display);
        }}
      />
    </form>
  );
}
