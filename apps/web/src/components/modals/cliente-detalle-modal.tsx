"use client";

import {
  Building2,
  Calendar,
  Clock,
  Copy,
  Info,
  Mail,
  MapPin,
  Monitor,
  Pencil,
  Phone,
  Ticket,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { TipoCliente, type EstadoValidacionSunat } from "@erp/shared";

import {
  useCliente,
  useClienteEquipos,
  useClienteTickets,
} from "@/hooks/use-clientes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="group flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        {Icon && (
          <Icon className="size-3.5 shrink-0 text-muted-foreground/50" />
        )}
        <span className="text-sm font-medium text-foreground truncate">
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
            className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-muted"
          >
            <Copy className="size-3 text-muted-foreground/50" />
          </button>
        )}
      </div>
    </div>
  );
}

function getValidationMeta(estado?: EstadoValidacionSunat | string | null) {
  if (estado === "VALIDO") {
    return {
      label: "Validado",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (estado === "INVALIDO") {
    return {
      label: "Inválido",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }
  if (estado === "ERROR") {
    return {
      label: "Error",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }
  if (estado === "PENDIENTE") {
    return {
      label: "Pendiente",
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
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
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
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
  const { data: equiposRes, isLoading: equiposLoading } = useClienteEquipos(
    id || undefined,
  );
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
      <DialogContent className="flex h-[88vh] w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background p-0 shadow-2xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
        {/* ── HEADER ── */}
        <DialogHeader className="shrink-0 border-b border-border/40 bg-background px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Avatar */}
            <div
              className={cn(
                "flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-2xl font-bold text-base sm:text-lg select-none shadow-md ring-2 ring-background dark:ring-border transition-all",
                isLoading
                  ? "bg-muted ring-0 shadow-none text-muted-foreground"
                  : tipo === TipoCliente.EMPRESA
                    ? "bg-linear-to-br from-blue-500 to-blue-700 dark:from-blue-700 dark:to-blue-900 text-white"
                    : "bg-linear-to-br from-violet-500 to-violet-700 dark:from-violet-700 dark:to-violet-900 text-white",
              )}
            >
              {initials}
            </div>

            {/* Title + badges */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-xl font-semibold leading-tight truncate">
                {isLoading ? (
                  <Skeleton className="h-5 w-48" />
                ) : (
                  displayName || "Cargando..."
                )}
              </DialogTitle>
              {cliente && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs h-5 gap-1 font-medium",
                      tipo === TipoCliente.EMPRESA
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                        : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
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
                  </Badge>
                  <Badge
                    variant={
                      (cliente.activo as boolean) ? "default" : "outline"
                    }
                    className={cn(
                      "text-xs h-5 gap-1.5",
                      (cliente.activo as boolean)
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                        : "text-muted-foreground",
                    )}
                  >
                    {(cliente.activo as boolean) ? (
                      <span className="relative flex size-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                      </span>
                    ) : (
                      <span className="size-1.5 rounded-full inline-block bg-muted-foreground/40" />
                    )}
                    {(cliente.activo as boolean) ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              )}
              <DialogDescription className="sr-only">
                Información detallada, equipos y tickets del cliente.
              </DialogDescription>
            </div>

            {/* Edit button */}
            {canEdit && cliente && !isGeneric && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0 mr-8 sm:mr-10 h-8"
                onClick={() => onEdit?.(id)}
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline text-xs">Editar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError || !cliente ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              No se pudo cargar la información del cliente.
            </div>
          ) : (
            <Tabs
              defaultValue="informacion"
              className="flex h-full flex-col gap-4"
            >
              <TabsList className="mb-4 h-10 w-full shrink-0">
                <TabsTrigger
                  value="informacion"
                  className="flex-1 gap-1.5 text-xs sm:text-sm"
                >
                  <Info className="size-3.5 shrink-0" />
                  Información
                </TabsTrigger>
                <TabsTrigger
                  value="equipos"
                  className="flex-1 gap-1.5 text-xs sm:text-sm"
                >
                  <Monitor className="size-3.5 shrink-0" />
                  Equipos
                  {(equiposRes?.data?.length ?? 0) > 0 && (
                    <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                      {equiposRes!.data.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="tickets"
                  className="flex-1 gap-1.5 text-xs sm:text-sm"
                >
                  <Ticket className="size-3.5 shrink-0" />
                  Tickets
                  {(ticketsRes?.data?.length ?? 0) > 0 && (
                    <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                      {ticketsRes!.data.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── TAB: INFORMACIÓN ── */}
              <TabsContent
                value="informacion"
                className="mt-0 data-[state=active]:animate-fade-up"
              >
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* 1 — Identidad */}
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 dark:border-l-blue-800 bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30">
                        1
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">
                        Identidad
                      </h3>
                    </div>
                    {isGeneric ? (
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
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
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-amber-400 dark:border-l-amber-800 bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/30">
                        2
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">
                        Documento fiscal
                      </h3>
                    </div>
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
                      <p className="mt-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        Este cliente todavía no tiene validación documental
                        registrada en Tributario. Para facturas se recomienda
                        validar el RUC antes de emitir.
                      </p>
                    ) : null}
                  </section>

                  {/* 3 — Contacto */}
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 dark:border-l-green-800 bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-100 dark:ring-green-900/30">
                        3
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">
                        Contacto
                      </h3>
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
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-orange-400 dark:border-l-orange-800 bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 ring-2 ring-orange-100 dark:ring-orange-900/30">
                        4
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">
                        Ubicación
                      </h3>
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
                    {latitud != null && longitud != null ? (
                      <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Mapa guardado
                        </p>
                        <LocationMap
                          marker={{ latitud, longitud }}
                          interactive={false}
                          className="h-65"
                        />
                      </div>
                    ) : null}
                    {(cliente.notas as string) && (
                      <div className="mt-4 border-t border-border/40 pt-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                          Notas
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">
                          {cliente.notas as string}
                        </p>
                      </div>
                    )}
                  </section>

                  {/* 5 — Auditoría */}
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-border bg-muted/20 p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground ring-2 ring-muted">
                        5
                      </span>
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Auditoría
                      </h3>
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
                className="mt-0 data-[state=active]:animate-fade-up"
              >
                <Card className="overflow-hidden rounded-xl border-border/40 shadow-sm">
                  {equiposLoading ? (
                    <div className="flex flex-col gap-3 p-5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (equiposRes?.data?.length ?? 0) > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/40">
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Serie
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Modelo
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {equiposRes!.data.map((equipo, i) => (
                            <tr
                              key={i}
                              className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                                {(equipo.numeroSerie as string) ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-foreground whitespace-nowrap">
                                {(equipo.modelo as string) ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary" className="text-xs">
                                  {(equipo.estado as string) ?? "—"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                      <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
                        <Monitor className="size-6 opacity-40" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          Sin equipos registrados
                        </p>
                        <p className="text-xs opacity-60 mt-0.5">
                          Este cliente no tiene equipos asociados
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ── TAB: TICKETS ── */}
              <TabsContent
                value="tickets"
                className="mt-0 data-[state=active]:animate-fade-up"
              >
                <Card className="overflow-hidden rounded-xl border-border/40 shadow-sm">
                  {ticketsLoading ? (
                    <div className="flex flex-col gap-3 p-5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (ticketsRes?.data?.length ?? 0) > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/40">
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Código
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Asunto
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Estado
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Fecha
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ticketsRes!.data.map((ticket, i) => (
                            <tr
                              key={i}
                              className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                                {(ticket.codigo as string) ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-foreground">
                                {(ticket.asunto as string) ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary" className="text-xs">
                                  {(ticket.estado as string) ?? "—"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                                {ticket.createdAt
                                  ? new Date(
                                      ticket.createdAt as string,
                                    ).toLocaleDateString("es-PE", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                      <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
                        <Ticket className="size-6 opacity-40" />
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
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
