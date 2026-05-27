"use client";

import * as React from "react";
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
  type ClienteListItem,
  type ClienteEquipoListItem,
  type EquipoListItem,
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { useClienteEquipos, useEquipos } from "@/hooks/use-equipos";
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

const TIPO_SERVICIO_DESCRIPTIONS: Record<TipoServicio, string> = {
  [TipoServicio.TALLER]: "El equipo se atiende en taller.",
  [TipoServicio.VISITA]: "El técnico atiende en la ubicación del cliente.",
  [TipoServicio.REMOTO]: "Atención sin traslado físico.",
};

function toDatetimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

interface TicketFormProps {
  defaultValues?: Partial<TicketFormPayload>;
  initialSelections?: TicketFormInitialSelections;
  onSubmit: (data: TicketFormPayload) => void;
  isLoading?: boolean;
  mode: "create" | "edit";
  formId?: string;
  hideBottomActions?: boolean;
  /**
   * Rol del usuario que está usando el formulario.
   * - TECNICO: oculta selector de técnico (auto-asignación en backend).
   * - ADMIN/ENCARGADO: muestra selector para asignar técnico.
   */
  userRol?: RolUsuario;
}

type EquipoOrigen = "propio" | "externo";

type TicketFormInitialSelections = {
  cliente?: {
    id: string;
    nombre: string | null;
    apellido?: string | null;
    razonSocial?: string | null;
    ruc?: string | null;
    dni?: string | null;
  } | null;
  equipo?: {
    id: string;
    numeroSerie: string;
    producto?: { nombre?: string | null } | null;
  } | null;
  clienteEquipo?: {
    id: string;
    numeroSerie: string;
    nombre?: string | null;
    marca?: string | null;
    modelo?: string | null;
    producto?: { nombre?: string | null } | null;
  } | null;
};

export function TicketForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  mode,
  formId,
  hideBottomActions = false,
  userRol,
  initialSelections,
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
  const clienteEquipoId = useWatch({ control, name: "clienteEquipoId" });
  const tecnicoId = useWatch({ control, name: "tecnicoId" });
  const titulo = useWatch({ control, name: "titulo" });
  const descripcion = useWatch({ control, name: "descripcion" });
  const fechaPromesa = useWatch({ control, name: "fechaPromesa" });
  const detallesIniciales = useWatch({ control, name: "detalles" });
  const allowQuickCreate = mode === "create";

  const [aiSuggestion, setAiSuggestion] =
    useState<TicketClassificationResult | null>(null);

  const handleAiResult = (result: TicketClassificationResult) => {
    setAiSuggestion(result);
    setValue("prioridad", result.prioridadSugerida as PrioridadTicket);
    if (
      Object.values(TipoServicio).includes(
        result.tipoServicioSugerido as TipoServicio,
      )
    ) {
      setValue("tipoServicio", result.tipoServicioSugerido as TipoServicio);
    }
  };

  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const { data: clientesData } = useClientes({
    search: clienteSearch,
    limit: 20,
  });
  const clientes = clientesData?.data ?? [];
  const clientesForSelect = React.useMemo(() => {
    const initialCliente = initialSelections?.cliente;
    if (!initialCliente || clientes.some((c) => c.id === initialCliente.id)) {
      return clientes;
    }
    return [initialCliente as ClienteListItem, ...clientes];
  }, [clientes, initialSelections?.cliente]);

  const [equipoPropioOpen, setEquipoPropioOpen] = useState(false);
  const [equipoPropioSearch, setEquipoPropioSearch] = useState("");
  const [clienteEquipoOpen, setClienteEquipoOpen] = useState(false);
  const [clienteEquipoSearch, setClienteEquipoSearch] = useState("");
  const [equipoQuickCreateOpen, setEquipoQuickCreateOpen] = useState(false);
  const [clienteQuickCreateOpen, setClienteQuickCreateOpen] = useState(false);
  const [equipoOrigen, setEquipoOrigen] = useState<EquipoOrigen>(
    defaultValues?.equipoId ? "propio" : "externo",
  );
  const [ultimoEquipoPropioId, setUltimoEquipoPropioId] = useState(
    defaultValues?.equipoId ?? "",
  );
  const [ultimoClienteEquipoId, setUltimoClienteEquipoId] = useState(
    defaultValues?.clienteEquipoId ?? "",
  );
  const { data: equiposPropiosData } = useEquipos(
    { search: equipoPropioSearch, clienteId, limit: 20 },
    { enabled: !!clienteId },
  );
  const equiposPropios = equiposPropiosData?.data ?? [];
  const equiposPropiosForSelect = React.useMemo(() => {
    const initialEquipo = initialSelections?.equipo;
    if (!initialEquipo || equiposPropios.some((e) => e.id === initialEquipo.id)) {
      return equiposPropios;
    }
    return [initialEquipo as EquipoListItem, ...equiposPropios];
  }, [equiposPropios, initialSelections?.equipo]);
  const { data: clienteEquiposData } = useClienteEquipos(
    { search: clienteEquipoSearch, clienteId, limit: 20 },
    { enabled: !!clienteId },
  );
  const clienteEquipos = clienteEquiposData?.data ?? [];
  const clienteEquiposForSelect = React.useMemo(() => {
    const initialClienteEquipo = initialSelections?.clienteEquipo;
    if (
      !initialClienteEquipo ||
      clienteEquipos.some((e) => e.id === initialClienteEquipo.id)
    ) {
      return clienteEquipos;
    }
    return [initialClienteEquipo as ClienteEquipoListItem, ...clienteEquipos];
  }, [clienteEquipos, initialSelections?.clienteEquipo]);

  // Cuando cambia el cliente, limpiar equipo seleccionado.
  // Saltamos el primer render para no pisar defaultValues (modo edit).
  const skipFirstClienteChange = useRef(true);
  useEffect(() => {
    if (skipFirstClienteChange.current) {
      skipFirstClienteChange.current = false;
      return;
    }
    setValue("equipoId", undefined);
    setValue("clienteEquipoId", undefined);
    setUltimoEquipoPropioId("");
    setUltimoClienteEquipoId("");
  }, [clienteId, setValue]);

  useEffect(() => {
    if (mode !== "edit") return;

    if (initialSelections?.equipo?.id) {
      setEquipoOrigen("propio");
      setUltimoEquipoPropioId(initialSelections.equipo.id);
      setValue("equipoId", initialSelections.equipo.id, {
        shouldValidate: false,
      });
      setValue("clienteEquipoId", undefined, { shouldValidate: false });
      return;
    }

    if (initialSelections?.clienteEquipo?.id) {
      setEquipoOrigen("externo");
      setUltimoClienteEquipoId(initialSelections.clienteEquipo.id);
      setValue("clienteEquipoId", initialSelections.clienteEquipo.id, {
        shouldValidate: false,
      });
      setValue("equipoId", undefined, { shouldValidate: false });
    }
  }, [
    initialSelections?.clienteEquipo?.id,
    initialSelections?.equipo?.id,
    mode,
    setValue,
  ]);

  useEffect(() => {
    if (equipoId) {
      setUltimoEquipoPropioId(equipoId);
    }
  }, [equipoId]);

  useEffect(() => {
    if (clienteEquipoId) {
      setUltimoClienteEquipoId(clienteEquipoId);
    }
  }, [clienteEquipoId]);

  const handleEquipoOrigenChange = (value: string) => {
    if (value !== "propio" && value !== "externo") return;

    const nextOrigen = value as EquipoOrigen;
    setEquipoOrigen(nextOrigen);
    if (nextOrigen === "propio") {
      setValue("clienteEquipoId", undefined, { shouldValidate: true });
      setValue("equipoId", ultimoEquipoPropioId || undefined, {
        shouldValidate: true,
      });
    } else {
      setValue("equipoId", undefined, { shouldValidate: true });
      setValue("clienteEquipoId", ultimoClienteEquipoId || undefined, {
        shouldValidate: true,
      });
    }
  };

  // Lista de técnicos sólo para ADMIN/ENCARGADO
  const showTecnicoSelector = userRol && userRol !== RolUsuario.TECNICO;
  const { data: tecnicosData } = useUsuarios(1, undefined, 100);
  const tecnicos = (tecnicosData?.data ?? []).filter(
    (u) => u.rol === RolUsuario.TECNICO && u.activo !== false,
  );

  const selectedCliente = clientesForSelect.find((c) => c.id === clienteId);
  const selectedEquipoPropio = equiposPropiosForSelect.find(
    (e) => e.id === equipoId,
  );
  const selectedClienteEquipo = clienteEquiposForSelect.find(
    (e) => e.id === clienteEquipoId,
  );
  const selectedClienteEquipoDescription =
    selectedClienteEquipo?.producto?.nombre ??
    selectedClienteEquipo?.nombre ??
    [selectedClienteEquipo?.marca, selectedClienteEquipo?.modelo]
      .filter(Boolean)
      .join(" ");
  const selectedClienteEquipoLabel = selectedClienteEquipo
    ? selectedClienteEquipoDescription
      ? `${selectedClienteEquipoDescription} — ${selectedClienteEquipo.numeroSerie}`
      : selectedClienteEquipo.numeroSerie
    : "";

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
  const serviciosSeleccionados = detallesIniciales ?? [];

  const addServicioInicial = (servicioId: string) => {
    const existing = serviciosSeleccionados.find(
      (detalle) => detalle.productoId === servicioId,
    );
    if (existing) {
      setValue(
        "detalles",
        serviciosSeleccionados.map((detalle) =>
          detalle.productoId === servicioId
            ? { ...detalle, cantidad: detalle.cantidad + 1 }
            : detalle,
        ),
      );
      setServicioOpen(false);
      return;
    }
    if (!servicioId) {
      return;
    }
    const servicio = servicios.find((s) => s.id === servicioId);
    setValue(
      "detalles",
      [
        ...serviciosSeleccionados,
        {
          productoId: servicioId,
          cantidad: 1,
          precioUnitario: Number(servicio?.precioVenta ?? 0),
          cubiertoGarantia: false,
          notas: "Servicio solicitado al crear el ticket",
        },
      ],
    );
  };

  const removeServicioInicial = (servicioId: string) => {
    const next = serviciosSeleccionados.filter(
      (detalle) => detalle.productoId !== servicioId,
    );
    setValue("detalles", next.length ? next : undefined);
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <FieldGroup className="gap-0 overflow-hidden sm:rounded-xl sm:border sm:border-border/60 sm:bg-card/70 bg-transparent border-none sm:shadow-sm shadow-none">
        {/* === SECCIÓN 1: CLIENTE Y EQUIPO === */}
        <div className="border-l-[3px] border-l-blue-400 p-4 dark:border-l-blue-800 sm:p-5">
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
                {allowQuickCreate ? (
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
                ) : null}
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
                        {clientesForSelect.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            onSelect={(v) => {
                              setValue("clienteId", v);
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

            <Field className="md:col-span-2">
              <FieldLabel>Equipo del ticket</FieldLabel>
              <ToggleGroup
                type="single"
                value={equipoOrigen}
                onValueChange={handleEquipoOrigenChange}
                variant="outline"
                className="grid w-full grid-cols-1 sm:grid-cols-2"
              >
                <ToggleGroupItem
                  value="propio"
                  className="h-auto justify-start rounded-lg px-3 py-2 text-left"
                  disabled={!clienteId}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      Vendido o alquilado
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Salio del inventario y puede tener garantia nuestra.
                    </span>
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="externo"
                  className="h-auto justify-start rounded-lg px-3 py-2 text-left"
                  disabled={!clienteId}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      Externo del cliente
                    </span>
                    <span className="text-xs text-muted-foreground">
                      No afecta stock ni almacen interno.
                    </span>
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>
                El ticket puede quedar sin equipo, pero si lo asocias debe ser
                uno de estos dos origenes.
              </FieldDescription>
            </Field>

            {equipoOrigen === "propio" ? (
              <Field
                className="md:col-span-2"
                data-invalid={errors.equipoId ? true : undefined}
              >
              <FieldLabel>Equipo vendido o alquilado</FieldLabel>
              <Popover
                open={equipoPropioOpen}
                onOpenChange={setEquipoPropioOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={equipoPropioOpen}
                    disabled={!clienteId}
                    className={cn(
                      "w-full justify-between font-normal",
                      !equipoId && "text-muted-foreground",
                    )}
                  >
                    {selectedEquipoPropio
                      ? `${selectedEquipoPropio.numeroSerie} — ${selectedEquipoPropio.producto?.nombre ?? "Equipo propio"}`
                      : equipoId
                        ? equipoId.slice(0, 8) + "..."
                        : clienteId
                          ? "Buscar equipo entregado..."
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
                      placeholder="Buscar por serie o producto..."
                      value={equipoPropioSearch}
                      onValueChange={setEquipoPropioSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {clienteId
                          ? "Este cliente no tiene equipos vendidos o alquilados."
                          : "Selecciona un cliente primero."}
                      </CommandEmpty>
                      <CommandGroup>
                        {equiposPropiosForSelect.map((e) => (
                          <CommandItem
                            key={e.id}
                            value={e.id}
                            onSelect={(v) => {
                              setEquipoOrigen("propio");
                              setUltimoEquipoPropioId(v);
                              setValue("equipoId", v);
                              setValue("clienteEquipoId", undefined);
                              setEquipoPropioOpen(false);
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
                                {e.producto?.nombre ?? "Equipo propio"}
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
            ) : null}

            {equipoOrigen === "externo" ? (
              <Field
                className="md:col-span-2"
                data-invalid={errors.clienteEquipoId ? true : undefined}
              >
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>Equipo externo del cliente</FieldLabel>
                {allowQuickCreate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                    disabled={!clienteId}
                    onClick={() => setEquipoQuickCreateOpen(true)}
                    title={
                      clienteId
                        ? "Registrar equipo externo para soporte"
                        : "Selecciona un cliente primero"
                    }
                  >
                    <Plus className="size-3.5" /> Registrar externo
                  </Button>
                ) : null}
              </div>
              <Popover
                open={clienteEquipoOpen}
                onOpenChange={setClienteEquipoOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clienteEquipoOpen}
                    disabled={!clienteId}
                    className={cn(
                      "w-full justify-between font-normal",
                      !clienteEquipoId && "text-muted-foreground",
                    )}
                  >
                    {selectedClienteEquipo
                      ? selectedClienteEquipoLabel
                      : clienteEquipoId
                        ? clienteEquipoId.slice(0, 8) + "..."
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
                      value={clienteEquipoSearch}
                      onValueChange={setClienteEquipoSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {clienteId
                          ? "Este cliente no tiene equipos asignados."
                          : "Selecciona un cliente primero."}
                      </CommandEmpty>
                      <CommandGroup>
                        {clienteEquiposForSelect.map((e) => (
                          <CommandItem
                            key={e.id}
                            value={e.id}
                            onSelect={(v) => {
                              setEquipoOrigen("externo");
                              setUltimoClienteEquipoId(v);
                              setValue("clienteEquipoId", v);
                              setValue("equipoId", undefined);
                              setClienteEquipoOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                clienteEquipoId === e.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {e.producto?.nombre ||
                                  e.nombre ||
                                  [e.marca, e.modelo]
                                    .filter(Boolean)
                                    .join(" ") ||
                                  "Equipo externo"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Serie/código: {e.numeroSerie}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FieldError>{errors.clienteEquipoId?.message}</FieldError>
              </Field>
            ) : null}
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
        <div className="border-t border-border/60 border-l-[3px] border-l-green-400 p-4 dark:border-l-green-800 sm:p-5">
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

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              <Field data-invalid={errors.fechaPromesa ? true : undefined}>
                <FieldLabel>Fecha promesa</FieldLabel>
                <Input
                  type="datetime-local"
                  value={toDatetimeLocalValue(fechaPromesa)}
                  onChange={(event) =>
                    setValue(
                      "fechaPromesa",
                      fromDatetimeLocalValue(event.target.value),
                      { shouldValidate: true },
                    )
                  }
                  aria-invalid={!!errors.fechaPromesa}
                />
                <FieldDescription>
                  Opcional; úsala si ya hay compromiso de atención o entrega.
                </FieldDescription>
                <FieldError>{errors.fechaPromesa?.message}</FieldError>
              </Field>
            </div>

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
                          !serviciosSeleccionados.length &&
                            "text-muted-foreground",
                        )}
                      >
                        <span className="truncate">
                          {serviciosSeleccionados.length
                            ? `${serviciosSeleccionados.length} servicio(s) seleccionado(s)`
                            : "Opcional: agregar servicios del catálogo"}
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
                                  addServicioInicial(v);
                                  setServicioOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 size-4",
                                    serviciosSeleccionados.some(
                                      (detalle) => detalle.productoId === s.id,
                                    )
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
                </div>
                {serviciosSeleccionados.length ? (
                  <div className="grid gap-2">
                    {serviciosSeleccionados.map((detalle) => {
                      const servicio = servicios.find(
                        (item) => item.id === detalle.productoId,
                      );
                      return (
                        <div
                          key={detalle.productoId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {servicio?.nombre ??
                                detalle.productoId.slice(0, 8) + "..."}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cant. {detalle.cantidad} · S/{" "}
                              {Number(detalle.precioUnitario ?? 0).toFixed(2)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => removeServicioInicial(detalle.productoId)}
                            title="Quitar servicio"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <FieldError>{errors.detalles?.message}</FieldError>
              </Field>
            )}
          </div>
        </div>

        {/* === SECCIÓN 3: CLASIFICACIÓN === */}
        <div className="border-t border-border/60 border-l-[3px] border-l-orange-400 p-4 dark:border-l-orange-800 sm:p-5">
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
                  setValue("prioridad", v as PrioridadTicket)
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
                  setValue("tipoServicio", v as TipoServicio)
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
              {tipoServicio ? (
                <FieldDescription>
                  {TIPO_SERVICIO_DESCRIPTIONS[tipoServicio]}
                </FieldDescription>
              ) : null}
              <FieldError>{errors.tipoServicio?.message}</FieldError>
            </Field>

          </div>
        </div>

        {!hideBottomActions && (
          <div className="flex justify-end border-t border-border/60 bg-muted/20 p-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-36 gap-2"
            >
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
        )}
      </FieldGroup>

      {/* Quick create equipo modal */}
      {allowQuickCreate && clienteId && (
        <EquipoQuickCreateModal
          open={equipoQuickCreateOpen}
          onClose={() => setEquipoQuickCreateOpen(false)}
          clienteId={clienteId}
          onCreated={(equipo) => {
            setEquipoOrigen("externo");
            setUltimoClienteEquipoId(equipo.id);
            setValue("clienteEquipoId", equipo.id);
            setValue("equipoId", undefined);
            setClienteEquipoSearch(equipo.nombre ?? equipo.numeroSerie);
          }}
        />
      )}

      {/* Quick create cliente modal */}
      {allowQuickCreate ? (
        <ClienteQuickCreateModal
          open={clienteQuickCreateOpen}
          onClose={() => setClienteQuickCreateOpen(false)}
          onCreated={(cliente) => {
            setValue("clienteId", cliente.id);
            const display =
              cliente.razonSocial ??
              [cliente.nombre, cliente.apellido]
                .filter(Boolean)
                .join(" ")
                .trim();
            if (display) setClienteSearch(display);
          }}
        />
      ) : null}
    </form>
  );
}
