"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  Clock,
  Copy,
  FileText,
  Fingerprint,
  Info,
  Mail,
  MapPin,
  Monitor,
  Pencil,
  Phone,
  Plus,
  Ticket,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { TipoCliente, type EstadoValidacionSunat } from "@erp/shared";

import {
  useCliente,
  useClienteEquipos as useClienteEquiposPropios,
  useClienteTickets,
} from "@/hooks/use-clientes";
import { useClienteEquipos as useEquiposExternosCliente } from "@/hooks/use-equipos";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocationMap } from "@/components/location/location-map";
import { EquipoQuickCreateModal } from "@/components/modals/equipo-quick-create-modal";

function InfoItem({
  label,
  value,
  icon: Icon,
  copyable = false,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ElementType;
  copyable?: boolean;
}) {
  return (
    <div className="group flex flex-col gap-1 min-w-0 w-full">
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex items-start gap-1.5 min-w-0 w-full">
        {Icon && (
          <Icon className="size-3.5 shrink-0 text-muted-foreground/40 transition-colors mt-0.5" />
        )}
        <span className="text-sm font-medium text-foreground break-words whitespace-normal leading-normal flex-1 min-w-0">
          {value || (
            <span className="text-muted-foreground/40 font-normal italic text-xs">
              —
            </span>
          )}
        </span>
        {copyable && value && (
          <button
            onClick={() => {
              void navigator.clipboard.writeText(value);
              toast.success("Copiado al portapapeles", { duration: 1500 });
            }}
            title="Copiar"
            className="ml-auto shrink-0 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-colors duration-150 rounded p-1 hover:bg-muted focus:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label={`Copiar ${label}`}
          >
            <Copy className="size-3 text-muted-foreground/50" />
          </button>
        )}
      </div>
    </div>
  );
}

function getValidationMeta(estado?: EstadoValidacionSunat | string | null) {
  if (estado === "VALIDO" || estado === "ACTIVO") {
    return {
      label: estado === "ACTIVO" ? "Activo SUNAT" : "Validado",
      className:
        "border-[var(--semantic-success)]/30 bg-[var(--semantic-success-soft)] text-[var(--semantic-success)]",
    };
  }
  if (estado === "INVALIDO") {
    return {
      label: "Inválido",
      className: "border-[var(--semantic-danger)]/30 bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger)]",
    };
  }
  if (estado === "ERROR") {
    return {
      label: "Error",
      className: "border-[var(--semantic-danger)]/30 bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger)]",
    };
  }
  if (estado === "PENDIENTE") {
    return {
      label: "Pendiente",
      className:
        "border-[var(--semantic-warning)]/30 bg-[var(--semantic-warning-soft)] text-[var(--semantic-warning)]",
    };
  }
  return {
    label: "Sin validar",
    className: "border-border/60 bg-muted/30 text-muted-foreground",
  };
}

function documentoSunatLabel(tipo?: string | null) {
  if (tipo === "6") return "RUC";
  if (tipo === "1") return "DNI";
  if (tipo === "0") return "Sin documento";
  return "Documento";
}

function getEstadoTicketMeta(estado?: string | null) {
  const norm = String(estado).toUpperCase();
  if (norm === "ABIERTO") {
    return {
      label: "Abierto",
      classes: "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]",
      dotColor: "border-[var(--accent)] text-[var(--accent)]",
    };
  }
  if (norm === "EN_PROCESO") {
    return {
      label: "En proceso",
      classes: "border-blue-500/30 bg-blue-500/10 text-blue-500",
      dotColor: "border-blue-500 text-blue-500",
    };
  }
  if (norm === "EN_ESPERA") {
    return {
      label: "En espera",
      classes: "border-amber-500/30 bg-amber-500/10 text-amber-500",
      dotColor: "border-amber-500 text-amber-500",
    };
  }
  if (norm === "RESUELTO") {
    return {
      label: "Resuelto",
      classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
      dotColor: "border-emerald-500 text-emerald-500",
    };
  }
  if (norm === "CERRADO") {
    return {
      label: "Cerrado",
      classes: "border-emerald-600/30 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/30",
      dotColor: "border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400",
    };
  }
  if (norm === "CANCELADO") {
    return {
      label: "Cancelado",
      classes: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
      dotColor: "border-muted-foreground text-muted-foreground",
    };
  }
  return {
    label: estado || "Desconocido",
    classes: "border-border/60 bg-muted/30 text-muted-foreground",
    dotColor: "border-border text-muted-foreground/50",
  };
}

function getPrioridadTicketMeta(prioridad?: string | null) {
  const norm = String(prioridad).toUpperCase();
  if (norm === "BAJA") {
    return {
      label: "Baja",
      classes: "border-slate-500/30 bg-slate-500/10 text-slate-500 dark:text-slate-400",
    };
  }
  if (norm === "MEDIA") {
    return {
      label: "Media",
      classes: "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400",
    };
  }
  if (norm === "ALTA") {
    return {
      label: "Alta",
      classes: "border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400",
    };
  }
  if (norm === "CRITICA" || norm === "CRÍTICA") {
    return {
      label: "Crítica",
      classes: "border-red-700/40 bg-red-700/15 text-red-700 dark:text-red-400 dark:bg-red-950/40 dark:border-red-500/40 animate-pulse font-bold",
    };
  }
  return {
    label: prioridad || "Normal",
    classes: "border-border/60 bg-muted/30 text-muted-foreground",
  };
}

function AuditItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon: React.ElementType;
}) {
  const formatted = value
    ? new Date(value).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 ring-1 ring-border/50">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-medium tabular-nums">
          {formatted ?? "—"}
        </span>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, s) => (
        <div
          key={s}
          className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ClienteDetalleModalProps {
  id: string | null;
  onClose: () => void;
  onEdit?: (clienteId: string) => void;
  canEdit?: boolean;
}

export function ClienteDetalleModal({
  id,
  onClose,
  onEdit,
  canEdit,
}: ClienteDetalleModalProps) {
  const { data: clienteRes, isLoading, isError } = useCliente(id || undefined);
  const { data: equiposRes, isLoading: equiposLoading } =
    useClienteEquiposPropios(id || undefined);
  const { data: equiposExternosRes, isLoading: equiposExternosLoading } =
    useEquiposExternosCliente(
      { clienteId: id || undefined, limit: 50 },
      { enabled: !!id },
    );
  const [equipoExternoOpen, setEquipoExternoOpen] = useState(false);
  const { data: ticketsRes, isLoading: ticketsLoading } = useClienteTickets(
    id || undefined,
  );

  const cliente = clienteRes?.data as Record<string, unknown> | undefined;

  if (!id) return null;

  const tipo = cliente?.tipo as TipoCliente | undefined;
  const isGeneric = cliente?.esGenerico === true || cliente?.dni === "00000000";
  const latitud = typeof cliente?.latitud === "number" ? cliente.latitud : null;
  const longitud =
    typeof cliente?.longitud === "number" ? cliente.longitud : null;
  const validaciones = Array.isArray(cliente?.validacionesSunat)
    ? (cliente.validacionesSunat as Array<Record<string, unknown>>)
    : [];
  const validacionDocumento = validaciones[0];
  const validacionMeta = getValidationMeta(
    validacionDocumento?.estado as EstadoValidacionSunat | undefined,
  );
  const displayName = cliente
    ? isGeneric
      ? "Público en General"
      : tipo === TipoCliente.EMPRESA
        ? (cliente.razonSocial as string)
        : [cliente.nombre, cliente.apellido].filter(Boolean).join(" ")
    : "";
  const equiposPropios = equiposRes?.data ?? [];
  const equiposExternos = equiposExternosRes?.data ?? [];
  const tickets = ticketsRes?.data ?? [];
  const equiposTotal = equiposPropios.length + equiposExternos.length;

  const initials = displayName
    ? displayName
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[88vh] max-h-[calc(100dvh-1rem)] w-full max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background p-0 shadow-2xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
        {/* ── HEADER ── */}
        <DialogHeader className="shrink-0 border-b border-border/40 bg-background px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Avatar — solid type colour (indigo / amber) matching the table row avatar */}
            <div
              className={cn(
                "flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-2xl font-bold text-base sm:text-lg select-none text-white shadow-md ring-2 ring-background dark:ring-border transition-all",
                isLoading
                  ? "bg-muted ring-0 shadow-none text-muted-foreground"
                  : tipo === TipoCliente.EMPRESA
                    ? "bg-indigo-500 shadow-indigo-500/30"
                    : "bg-amber-500 shadow-amber-500/30",
              )}
            >
              {initials}
            </div>

            {/* Title + badges */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-xl font-semibold leading-tight font-display break-words pr-12 sm:pr-0">
                {isLoading ? (
                  <Skeleton className="h-5 w-48" />
                ) : (
                  displayName || "Cargando..."
                )}
              </DialogTitle>
              {cliente && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {/* Type pill — solid colour (matches the table) */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm whitespace-nowrap",
                      tipo === TipoCliente.EMPRESA
                        ? "bg-indigo-500 shadow-indigo-500/30"
                        : "bg-amber-500 shadow-amber-500/30",
                    )}
                  >
                    {tipo === TipoCliente.EMPRESA ? (
                      <>
                        <Building2 className="size-3" />
                        Empresa
                      </>
                    ) : (
                      <>
                        <User className="size-3" />
                        Natural
                      </>
                    )}
                  </span>
                  {/* Active state pill */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                      (cliente.activo as boolean)
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                        : "bg-muted text-muted-foreground border border-border/60",
                    )}
                  >
                    {(cliente.activo as boolean) ? (
                      <span className="relative flex size-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-white" />
                      </span>
                    ) : (
                      <span className="size-1.5 rounded-full inline-block bg-muted-foreground/40" />
                    )}
                    {(cliente.activo as boolean) ? "Activo" : "Inactivo"}
                  </span>
                </div>
              )}
              <DialogDescription className="sr-only">
                Información detallada, equipos y tickets del cliente.
              </DialogDescription>
            </div>

            {/* Edit button — solid primary CTA */}
            {canEdit && cliente && !isGeneric && (
              <Button
                size="sm"
                className="gap-1.5 shrink-0 mr-8 sm:mr-10 h-9 rounded-xl px-3.5 bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/30 dark:bg-sky-500 dark:hover:bg-sky-600 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-95"
                onClick={() => onEdit?.(id)}
                aria-label="Editar cliente"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline text-xs font-semibold">Editar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-5">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError || !cliente ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              No se pudo cargar la información del cliente.
            </div>
          ) : (
            <Tabs
              defaultValue="informacion"
              className="flex flex-col gap-4"
            >
              <TabsList className="mb-4 h-10 w-full shrink-0 gap-0.5 rounded-xl border border-border/70 bg-muted/70 p-0.5">
                <TabsTrigger
                  value="informacion"
                  className="flex-1 gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-sans rounded-lg data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 dark:data-[state=active]:bg-sky-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-200 ease-out"
                >
                  <Info className="size-3.5 shrink-0 hidden sm:inline" />
                  Información
                </TabsTrigger>
                <TabsTrigger
                  value="equipos"
                  className="flex-1 gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-sans rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-200 ease-out"
                >
                  <Monitor className="size-3.5 shrink-0 hidden sm:inline" />
                  Equipos
                  {equiposTotal > 0 && (
                    <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-white/25 text-[10px] font-semibold text-current">
                      {equiposTotal}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="tickets"
                  className="flex-1 gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-sans rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-200 ease-out"
                >
                  <Ticket className="size-3.5 shrink-0 hidden sm:inline" />
                  Tickets
                  {(ticketsRes?.data?.length ?? 0) > 0 && (
                    <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-white/25 text-[10px] font-semibold text-current">
                      {ticketsRes!.data.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── TAB: INFORMACIÓN ── */}
              <TabsContent
                value="informacion"
                className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-150"
              >
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* 1 — Identidad */}
                  <section className="rounded-2xl border border-border/60 border-l-4 border-l-sky-500 bg-card/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white shadow-sm shadow-sky-500/30">
                        1
                      </span>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-500/30">
                        <User className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground font-sans">Identidad</h3>
                        <p className="text-[11px] text-muted-foreground">Información personal y fiscal del cliente</p>
                      </div>
                    </div>
                    {isGeneric ? (
                      <div className="mb-4 rounded-lg border border-[var(--semantic-warning)]/30 bg-[var(--semantic-warning-soft)] px-3 py-2 text-xs text-[var(--semantic-warning)]">
                        Cliente genérico del sistema usado para POS, boletas y
                        ventas sin identificación. No se edita ni elimina desde
                        gestión de clientes.
                      </div>
                    ) : null}
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {tipo === TipoCliente.NATURAL ? (
                        <>
                          <InfoItem
                            label="Nombre"
                            value={cliente.nombre as string}
                            icon={User}
                          />
                          <InfoItem
                            label="Apellido"
                            value={cliente.apellido as string}
                            icon={User}
                          />
                          <InfoItem label="DNI" value={cliente.dni as string} />
                        </>
                      ) : (
                        <>
                          <InfoItem
                            label="Razón Social"
                            value={cliente.razonSocial as string}
                            icon={Building2}
                          />
                          <InfoItem label="RUC" value={cliente.ruc as string} />
                        </>
                      )}
                    </div>
                  </section>

                  {/* 2 — Documento fiscal */}
                  <section className="rounded-2xl border border-border/60 border-l-4 border-l-violet-500 bg-card/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white shadow-sm shadow-violet-500/30">
                        2
                      </span>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white shadow-sm shadow-violet-500/30">
                        <Fingerprint className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground font-sans">Documento fiscal</h3>
                        <p className="text-[11px] text-muted-foreground">Validación documental con SUNAT</p>
                      </div>
                    </div>
                    {latitud != null && longitud != null ? (
                      <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Mapa operativo
                          </p>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {latitud.toFixed(6)}, {longitud.toFixed(6)}
                          </span>
                        </div>
                        <LocationMap
                          marker={{ latitud, longitud }}
                          interactive={false}
                          className="h-72 rounded-xl border border-border/40"
                          zoom={16}
                        />
                      </div>
                    ) : null}
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          Estado de validación
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-fit text-xs",
                            validacionMeta.className,
                          )}
                        >
                          {isGeneric ? "Público general" : validacionMeta.label}
                        </Badge>
                      </div>
                      <InfoItem
                        label="Tipo documento"
                        value={
                          isGeneric
                            ? "Sin documento"
                            : documentoSunatLabel(
                                validacionDocumento?.tipoDocumentoSunat as
                                  | string
                                  | undefined,
                              )
                        }
                      />
                      <InfoItem
                        label="Número"
                        value={
                          isGeneric
                            ? "00000000"
                            : ((validacionDocumento?.numeroDocumento as
                                | string
                                | undefined) ??
                              ((cliente.ruc as string | undefined) ||
                                (cliente.dni as string | undefined)))
                        }
                      />
                      <InfoItem
                        label="Condición domicilio"
                        value={
                          validacionDocumento?.condicionDomicilio as
                            | string
                            | undefined
                        }
                      />
                      <InfoItem
                        label="Última validación"
                        value={
                          validacionDocumento?.ultimaValidacionAt
                            ? new Date(
                                validacionDocumento.ultimaValidacionAt as string,
                              ).toLocaleString("es-PE")
                            : null
                        }
                      />
                    </div>
                    {!isGeneric && !validacionDocumento ? (
                      <p className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        Este cliente todavía no tiene validación documental
                        registrada en Tributario. Para facturas se recomienda
                        validar el RUC antes de emitir.
                      </p>
                    ) : null}
                  </section>

                  {/* 3 — Contacto */}
                  <section className="rounded-2xl border border-border/60 border-l-4 border-l-emerald-500 bg-card/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-sm shadow-emerald-500/30">
                        3
                      </span>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                        <Mail className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground font-sans">Contacto</h3>
                        <p className="text-[11px] text-muted-foreground">Medios de comunicación registrados</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem
                        label="Email"
                        value={cliente.email as string}
                        icon={Mail}
                        copyable
                      />
                      <InfoItem
                        label="Celular"
                        value={cliente.celular as string}
                        icon={Phone}
                        copyable
                      />
                      <InfoItem
                        label="Teléfono fijo"
                        value={cliente.telefono as string}
                        icon={Phone}
                        copyable
                      />
                    </div>
                  </section>

                  {/* 4 — Ubicación */}
                  <section className="rounded-2xl border border-border/60 border-l-4 border-l-amber-500 bg-card/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-sm shadow-amber-500/30">
                        4
                      </span>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm shadow-amber-500/30">
                        <MapPin className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground font-sans">Ubicación</h3>
                        <p className="text-[11px] text-muted-foreground">Dirección para despachos y visitas</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem
                        label="Dirección"
                        value={cliente.direccion as string}
                        icon={MapPin}
                      />
                      <InfoItem
                        label="Distrito"
                        value={cliente.distrito as string}
                      />
                      <InfoItem
                        label="Provincia"
                        value={cliente.provincia as string}
                      />
                      <InfoItem
                        label="Departamento"
                        value={cliente.departamento as string}
                      />
                      <InfoItem
                        label="Referencia"
                        value={cliente.referencia as string}
                      />
                      <InfoItem
                        label="Coordenadas"
                        value={
                          latitud != null && longitud != null
                            ? `${latitud.toFixed(6)}, ${longitud.toFixed(6)}`
                            : null
                        }
                      />
                    </div>
                    {(cliente.notas as string) && (
                      <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-3.5">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <FileText className="size-3.5 text-muted-foreground/50" />
                          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Notas internas</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words min-w-0 text-sm leading-relaxed text-foreground/80">
                          {cliente.notas as string}
                        </p>
                      </div>
                    )}
                  </section>

                  {/* 5 — Auditoría */}
                  <section className="rounded-2xl border border-border/60 border-l-4 border-l-slate-500 bg-slate-100/60 dark:bg-slate-900/40 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-bold text-white shadow-sm shadow-slate-600/30 dark:bg-slate-500 dark:shadow-slate-500/30">
                        5
                      </span>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-600 text-white shadow-sm shadow-slate-600/30 dark:bg-slate-500 dark:shadow-slate-500/30">
                        <Clock className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground font-sans">Auditoría</h3>
                        <p className="text-[11px] text-muted-foreground">Registro de creación y modificación</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AuditItem
                        label="Registrado el"
                        value={cliente.createdAt as string}
                        icon={Calendar}
                      />
                      <AuditItem
                        label="Última actualización"
                        value={cliente.updatedAt as string}
                        icon={Clock}
                      />
                    </div>
                  </section>
                </div>
              </TabsContent>

              {/* ── TAB: EQUIPOS ── */}
              <TabsContent
                value="equipos"
                className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-150"
              >
                {equiposLoading || equiposExternosLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="size-8 rounded-xl" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-24 ml-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : equiposTotal > 0 ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 dark:border-sky-800/60 border-l-4 border-l-sky-500 bg-sky-50/70 dark:bg-sky-950/40 p-4">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Equipos del cliente
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Propios entregados y externos reutilizables para nuevos tickets.
                        </p>
                      </div>
                      {!isGeneric ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-xl gap-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/25 border-0"
                          onClick={() => setEquipoExternoOpen(true)}
                        >
                          <Plus className="size-3.5" />
                          Registrar externo
                        </Button>
                      ) : null}
                    </div>

                    {equiposExternos.length > 0 ? (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            Equipos externos del cliente
                          </h4>
                          <Badge variant="outline" className="text-[10px] border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300">
                            No afectan stock
                          </Badge>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {equiposExternos.map((equipo) => {
                            const relatedTickets = tickets.filter(
                              (ticket) =>
                                (ticket.clienteEquipoId as string | null) ===
                                equipo.id,
                            );
                            const latestTicket = relatedTickets[0];
                            const title =
                              equipo.producto?.nombre ??
                              equipo.nombre ??
                              ([equipo.marca, equipo.modelo]
                                .filter(Boolean)
                                .join(" ") ||
                                "Equipo externo");

                            return (
                              <div
                                key={equipo.id}
                                className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 shadow-xs transition-colors duration-150 hover:bg-muted/30 hover:border-border-strong/60"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-foreground break-words whitespace-normal leading-snug">
                                      {title}
                                    </h4>
                                    <p className="mt-1 text-xs text-muted-foreground break-words whitespace-normal leading-normal">
                                      {[equipo.marca, equipo.modelo]
                                        .filter(Boolean)
                                        .join(" — ") || "Sin marca/modelo"}
                                    </p>
                                  </div>
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-500 shadow-sm shadow-sky-500/25">
                                    <Monitor className="size-4 text-white" />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] uppercase"
                                  >
                                    Externo
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] uppercase">
                                    {equipo.estado}
                                  </Badge>
                                  <span
                                    className="ml-auto max-w-[140px] truncate rounded-md border border-border/30 bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                                    title={equipo.numeroSerie}
                                  >
                                    {equipo.numeroSerie}
                                  </span>
                                </div>

                                {(equipo.ubicacion || equipo.notas) && (
                                  <div className="space-y-1.5 border-t border-border/30 pt-2 text-xs text-muted-foreground">
                                    {equipo.ubicacion ? (
                                      <p className="flex items-center gap-1.5">
                                        <MapPin className="size-3" />
                                        {equipo.ubicacion}
                                      </p>
                                    ) : null}
                                    {equipo.notas ? (
                                      <p className="whitespace-pre-wrap rounded-lg border border-border/30 bg-muted/40 p-2 italic">
                                        {equipo.notas}
                                      </p>
                                    ) : null}
                                  </div>
                                )}

                                <div className="border-t border-border/30 pt-2 text-xs text-muted-foreground">
                                  {relatedTickets.length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Ticket className="size-3.5" />
                                      <span>
                                        {relatedTickets.length} ticket(s)
                                      </span>
                                      {latestTicket ? (
                                        <span className="truncate">
                                          Último: {latestTicket.codigo as string}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <span>Sin tickets registrados todavía.</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ) : null}

                    {equiposPropios.length > 0 ? (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            Equipos propios entregados
                          </h4>
                          <Badge variant="outline" className="text-[10px] border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                            Inventario empresa
                          </Badge>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                    {equiposPropios.map((equipo, i) => {
                      // Determine condition badge style
                      const cond = String(equipo.condicion).toUpperCase();
                      const condClass =
                        cond === "NUEVO"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : cond === "REACONDICIONADO"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-slate-500/10 text-slate-500 border-slate-500/20";

                      // Determine status badge style
                      const est = String(equipo.estado).toUpperCase();
                      const estClass =
                        est === "ACTIVO"
                          ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/20"
                          : est === "MANTENIMIENTO"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20";

                      return (
                        <div
                          key={i}
                          className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 shadow-xs transition-colors duration-150 hover:bg-muted/30 hover:border-border-strong/60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-foreground break-words whitespace-normal leading-snug font-sans">
                                {(equipo.productoNombre as string) ?? "Equipo"}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1 break-words whitespace-normal leading-normal font-sans">
                                {(equipo.marca as string) || "Genérica"} — {(equipo.modelo as string) || "—"}
                              </p>
                            </div>
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500 shadow-sm shadow-indigo-500/25">
                              <Monitor className="size-4 text-white" />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-auto">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] font-sans font-semibold rounded-md uppercase tracking-wider py-0.5 px-2", estClass)}
                            >
                              {(equipo.estado as string) ?? "—"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] font-sans font-medium rounded-md uppercase py-0.5 px-2", condClass)}
                            >
                              {(equipo.condicion as string) ?? "—"}
                            </Badge>
                            <span className="ml-auto font-mono text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/30 truncate max-w-[120px]" title={(equipo.numeroSerie as string) ?? "S/N"}>
                              {(equipo.numeroSerie as string) ?? "S/N"}
                            </span>
                          </div>

                          {(!!equipo.fechaInicio || !!equipo.notas) && (
                            <div className="mt-1 pt-2 border-t border-border/30 flex flex-col gap-1.5 text-[11px] font-sans">
                              {!!equipo.fechaInicio && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Calendar className="size-3 text-muted-foreground/50 shrink-0" />
                                  <span>
                                    Asignado el{" "}
                                    {new Date(equipo.fechaInicio as string).toLocaleDateString("es-PE", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              )}
                              {(equipo.notas as string) && (
                                <p className="text-muted-foreground italic leading-normal bg-muted/40 p-2 rounded-lg border border-border/30 whitespace-pre-wrap">
                                  {equipo.notas as string}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                        </div>
                      </section>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground bg-sky-50/40 dark:bg-sky-950/20 rounded-2xl border border-sky-200/60 dark:border-sky-800/40 shadow-xs">
                    <div className="flex size-14 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950/60 ring-2 ring-sky-200 dark:ring-sky-800">
                      <Monitor className="size-6 text-sky-400 dark:text-sky-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Sin equipos registrados
                      </p>
                      <p className="text-xs opacity-60 mt-0.5">
                        Este cliente no tiene equipos asociados
                      </p>
                    </div>
                    {!isGeneric ? (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2 rounded-xl gap-1.5 bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/25 border-0"
                        onClick={() => setEquipoExternoOpen(true)}
                      >
                        <Plus className="size-3.5" />
                        Registrar equipo externo
                      </Button>
                    ) : null}
                  </div>
                )}
              </TabsContent>

              {/* ── TAB: TICKETS ── */}
              <TabsContent
                value="tickets"
                className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-150"
              >
                <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 border-l-4 border-l-violet-500 bg-violet-50/30 dark:bg-violet-950/20 p-4 sm:p-6">
                  {ticketsLoading ? (
                    <div className="flex flex-col gap-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                      ))}
                    </div>
                  ) : (ticketsRes?.data?.length ?? 0) > 0 ? (
                    <div className="relative space-y-6 py-2 max-h-[48vh] overflow-y-auto pr-2 scrollbar-thin">
                      {/* Timeline line */}
                      <div className="absolute left-[15px] sm:left-[21px] top-0 bottom-0 w-px bg-border/60" />
                      
                      {ticketsRes!.data.map((ticket, i) => {
                        const estadoMeta = getEstadoTicketMeta(ticket.estado as string);
                        const prioridadMeta = getPrioridadTicketMeta(ticket.prioridad as string);
                        
                        return (
                          <div key={i} className="relative pl-8 sm:pl-10 group/timeline">
                            {/* Dot on the timeline */}
                            <div className={cn(
                              "absolute left-[7px] sm:left-[13px] top-1.5 flex size-4 items-center justify-center rounded-full bg-background border-2 shadow-sm z-10",
                              estadoMeta.dotColor
                            )}>
                              <span className="size-1.5 rounded-full bg-current" />
                            </div>
                            
                            {/* Card Content */}
                            <div className="group/item flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 shadow-xs transition-colors duration-150 hover:bg-muted/30 hover:border-border-strong/60">
                              {/* Header info */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold tracking-wider text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-0.5 rounded-lg border border-[var(--accent)]/10">
                                  {(ticket.codigo as string) ?? "—"}
                                </span>
                                
                                <span className="text-[10px] text-muted-foreground/60 font-sans font-medium flex items-center gap-1.5 ml-auto">
                                  <Calendar className="size-3 text-muted-foreground/40" />
                                  {ticket.createdAt
                                    ? new Date(ticket.createdAt as string).toLocaleDateString("es-PE", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })
                                    : "—"}
                                </span>
                              </div>
                              
                              {/* Title / Subject */}
                              <div>
                                <h4 className="text-sm font-semibold text-foreground leading-tight">
                                  {(ticket.titulo as string) ?? (ticket.asunto as string) ?? "Sin título"}
                                </h4>
                                {(ticket.descripcion as string) && (
                                  <p className="mt-1.5 text-xs text-muted-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                                    {ticket.descripcion as string}
                                  </p>
                                )}
                              </div>
                              
                              {/* Technical diagnosis & solution */}
                              {((ticket.diagnostico as string) || (ticket.solucion as string)) && (
                                <div className="mt-1 rounded-xl bg-muted/40 p-3 border border-border/40 text-xs flex flex-col gap-2">
                                  {(ticket.diagnostico as string) && (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Diagnóstico Técnico
                                      </span>
                                      <p className="text-foreground/85 leading-normal font-sans">
                                        {ticket.diagnostico as string}
                                      </p>
                                    </div>
                                  )}
                                  {(ticket.solucion as string) && (
                                    <div className="flex flex-col gap-0.5 border-t border-border/40 pt-1.5 mt-0.5">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                        Solución Aplicada
                                      </span>
                                      <p className="text-foreground/85 leading-normal font-sans">
                                        {ticket.solucion as string}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Footer badges */}
                              <div className="flex items-center gap-2 mt-1 border-t border-border/30 pt-2.5 flex-wrap">
                                <Badge variant="outline" className={cn("text-[10px] h-5 font-medium px-2 rounded-md", estadoMeta.classes)}>
                                  {estadoMeta.label}
                                </Badge>
                                
                                <Badge variant="outline" className={cn("text-[10px] h-5 font-medium px-2 rounded-md", prioridadMeta.classes)}>
                                  Prioridad: {prioridadMeta.label}
                                </Badge>
                                
                                {(ticket.tipoServicio as string) && (
                                  <Badge variant="outline" className="text-[10px] h-5 font-medium px-2 rounded-md bg-muted/40 text-muted-foreground border-border/60">
                                    {ticket.tipoServicio as string}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground bg-violet-50/40 dark:bg-violet-950/20 rounded-2xl border border-violet-200/60 dark:border-violet-800/40 shadow-xs">
                      <div className="flex size-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/60 ring-2 ring-violet-200 dark:ring-violet-800">
                        <Ticket className="size-6 text-violet-400 dark:text-violet-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          Sin tickets registrados
                        </p>
                        <p className="text-xs opacity-60 mt-0.5">
                          Este cliente no tiene tickets de soporte
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
        {id ? (
          <EquipoQuickCreateModal
            open={equipoExternoOpen}
            onClose={() => setEquipoExternoOpen(false)}
            clienteId={id}
            onCreated={() => setEquipoExternoOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
