"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  FileText,
  Loader2,
  Pencil,
  ShieldCheck,
  ShieldOff,
  User,
  Wrench,
} from "lucide-react";
import {
  EstadoGarantia,
  EstadoTicket,
  PrioridadTicket,
  RolUsuario,
  TipoServicio,
  type TicketDetalleEntry,
  type TicketHistorialEntry,
  type TicketCasoGarantia,
  type TicketGarantiaActual,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { downloadTicketSoportePdf, generateTicketSoporteBlobUrl } from "@/lib/ticket-soporte-pdf";
import { useAuth } from "@/hooks/use-auth";
import { useConfigEmpresa } from "@/hooks/use-configuracion";
import { useTicket } from "@/hooks/use-soporte";
import { CierreTicketPanel } from "@/components/modals/cierre-ticket-panel";
import { TicketStatusAction } from "@/components/soporte/ticket-status-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ESTADO_LABELS: Record<EstadoTicket, string> = {
  [EstadoTicket.ABIERTO]: "Abierto",
  [EstadoTicket.EN_PROCESO]: "En proceso",
  [EstadoTicket.EN_ESPERA]: "En espera",
  [EstadoTicket.CERRADO]: "Cerrado",
  [EstadoTicket.CANCELADO]: "Cancelado",
};

const PRIORIDAD_LABELS: Record<PrioridadTicket, string> = {
  [PrioridadTicket.BAJA]: "Baja",
  [PrioridadTicket.MEDIA]: "Media",
  [PrioridadTicket.ALTA]: "Alta",
  [PrioridadTicket.CRITICA]: "Crítica",
};

const TIPO_LABELS: Record<TipoServicio, string> = {
  [TipoServicio.TALLER]: "Taller",
  [TipoServicio.VISITA]: "Visita",
  [TipoServicio.REMOTO]: "Remoto",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCliente(
  cliente:
    | {
        nombre: string | null;
        apellido?: string | null;
        razonSocial?: string | null;
      }
    | null
    | undefined,
) {
  if (!cliente) return "—";
  return (
    cliente.razonSocial ||
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim() ||
    cliente.nombre ||
    "—"
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
        {label}
      </span>
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
        <span className="truncate">{value || "—"}</span>
      </span>
    </div>
  );
}

function DetailTable({
  rows,
  label,
}: {
  rows: TicketDetalleEntry[];
  label: string;
}) {
  const mergedRows = rows.reduce<TicketDetalleEntry[]>((acc, row) => {
    const key = `${row.producto?.id ?? row.id}:${row.cubiertoGarantia ? "garantia" : "cobro"}`;
    const existing = acc.find(
      (item) =>
        `${item.producto?.id ?? item.id}:${item.cubiertoGarantia ? "garantia" : "cobro"}` ===
        key,
    );
    if (!existing) {
      acc.push({ ...row });
      return acc;
    }

    const currentTotal =
      Number(existing.cantidad) * Number(existing.precioUnitario);
    const nextTotal = Number(row.cantidad) * Number(row.precioUnitario);
    const nextCantidad = Number(existing.cantidad) + Number(row.cantidad);
    existing.cantidad = nextCantidad;
    existing.precioUnitario = nextCantidad > 0 ? (currentTotal + nextTotal) / nextCantidad : 0;
    return acc;
  }, []);

  if (!mergedRows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Sin {label.toLowerCase()} registrados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-muted/40">
            <th className="px-4 py-3 text-left font-medium">{label}</th>
            <th className="px-4 py-3 text-right font-medium">Cant.</th>
            <th className="px-4 py-3 text-right font-medium">Precio</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {mergedRows.map((row) => (
            <tr key={row.id} className="border-b border-border/20 last:border-0">
              <td className="px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">
                    {row.producto?.nombre ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.producto?.sku ?? ""}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {row.cantidad}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                S/ {Number(row.precioUnitario).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                S/ {(row.cantidad * Number(row.precioUnitario)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GarantiaPanel({
  casos,
  garantiaActual,
  esEquipoExterno,
}: {
  casos: TicketCasoGarantia[];
  garantiaActual?: TicketGarantiaActual | null;
  esEquipoExterno: boolean;
}) {
  if (!casos.length && !garantiaActual) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {esEquipoExterno
          ? "Este ticket usa un equipo externo del cliente. No se vincula automáticamente a garantías del inventario interno."
          : "Este ticket no tiene casos de garantía vinculados."}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {garantiaActual ? (
        <div className="rounded-xl border border-border/50 bg-card/70 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Garantía del equipo</p>
              <p className="truncate text-xs text-muted-foreground">
                {garantiaActual.codigoQR}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                garantiaActual.estado === EstadoGarantia.ACTIVA
                  ? "border-green-500/40 bg-green-500/10 text-green-700"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700",
              )}
            >
              {garantiaActual.estado === EstadoGarantia.ACTIVA
                ? "Activa"
                : "Pendiente de completar"}
            </Badge>
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <InfoItem label="Inicio" value={formatDate(garantiaActual.fechaInicio)} />
            <InfoItem label="Vence" value={formatDate(garantiaActual.fechaFin)} />
            <InfoItem
              label="Vigencia"
              value={garantiaActual.vigente ? "Vigente" : "No operativa"}
            />
          </div>
          <div className="mt-3 rounded-lg border border-border/30 bg-background/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
              Cobertura
            </p>
            <p className="mt-1 text-sm">{garantiaActual.cobertura}</p>
            {garantiaActual.exclusiones ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Exclusiones: {garantiaActual.exclusiones}
              </p>
            ) : null}
          </div>
          {garantiaActual.estado === EstadoGarantia.PENDIENTE_COMPLETAR ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Esta garantía ya existe por la venta, pero falta completarla y
              activarla para usarla como cobertura automática en soporte.
            </p>
          ) : null}
        </div>
      ) : null}
      {casos.map((caso) => (
        <div key={caso.id} className="rounded-xl border border-border/50 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                caso.aceptada === false
                  ? "border-red-500/40 bg-red-500/10 text-red-700"
                  : "border-green-500/40 bg-green-500/10 text-green-700",
              )}
            >
              {caso.aceptada === false ? (
                <ShieldOff className="size-3" />
              ) : (
                <ShieldCheck className="size-3" />
              )}
              {caso.aceptada === false ? "Rechazada" : "Aceptada"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {caso.garantia?.codigoQR ?? "Garantía"}
            </span>
          </div>
          <p className="text-sm">{caso.descripcion}</p>
          {caso.motivo ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Motivo: {caso.motivo}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const HISTORIAL_FIELD_LABELS: Record<string, string> = {
  estado: "Estado",
  prioridad: "Prioridad",
  tecnicoId: "Técnico",
  tipoServicio: "Tipo de servicio",
  garantia: "Garantía",
  servicio: "Servicio",
  repuesto: "Repuesto",
  adjunto: "Adjunto",
};

function formatHistorialValue(campo: string, value: string | null | undefined) {
  if (!value) return "—";
  if (campo === "estado" && value in ESTADO_LABELS) {
    return ESTADO_LABELS[value as EstadoTicket];
  }
  if (campo === "prioridad" && value in PRIORIDAD_LABELS) {
    return PRIORIDAD_LABELS[value as PrioridadTicket];
  }
  if (campo === "tipoServicio" && value in TIPO_LABELS) {
    return TIPO_LABELS[value as TipoServicio];
  }
  return value;
}

function getHistorialTitle(entry: TicketHistorialEntry) {
  if (entry.campo === "estado" && entry.valorNuevo === EstadoTicket.CERRADO) {
    return "Ticket cerrado";
  }
  if (entry.campo === "estado" && !entry.valorAnterior) {
    return "Ticket creado";
  }
  if (entry.campo === "estado") {
    return "Estado actualizado";
  }
  if (entry.campo === "servicio") return "Servicio agregado";
  if (entry.campo === "repuesto") {
    return entry.valorNuevo ? "Repuesto agregado" : "Repuesto eliminado";
  }
  if (entry.campo === "adjunto") {
    return entry.valorNuevo ? "Archivo adjuntado" : "Archivo eliminado";
  }
  if (entry.campo === "garantia") return "Garantía vinculada";
  return `${HISTORIAL_FIELD_LABELS[entry.campo] ?? entry.campo} actualizado`;
}

function HistorialEntryCard({ entry }: { entry: TicketHistorialEntry }) {
  const label = HISTORIAL_FIELD_LABELS[entry.campo] ?? entry.campo;
  const before = formatHistorialValue(entry.campo, entry.valorAnterior);
  const after = formatHistorialValue(entry.campo, entry.valorNuevo);
  const showTransition = entry.valorAnterior || entry.valorNuevo;

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{getHistorialTitle(entry)}</p>
          {showTransition ? (
            <p className="mt-1 text-muted-foreground">
              <span className="font-medium text-foreground/80">{label}:</span>{" "}
              {before} → {after}
            </p>
          ) : null}
          {entry.notas ? (
            <p className="mt-1 text-xs text-muted-foreground">{entry.notas}</p>
          ) : null}
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {label}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {formatDateTime(entry.creadoEn)}
        {entry.usuario?.nombre ? ` · ${entry.usuario.nombre}` : ""}
      </p>
    </div>
  );
}

export default function TicketDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const id = params?.id;
  const { data, isLoading, isError, refetch } = useTicket(id);
  const { data: empresaRes } = useConfigEmpresa();
  const ticket = data?.data;
  const canEdit = hasRole(
    RolUsuario.ADMIN,
    RolUsuario.ENCARGADO,
    RolUsuario.TECNICO,
  );

  const detalles = ticket?.detalles ?? ticket?.repuestos ?? [];
  const servicios = detalles.filter((row) => row.producto?.tipo === "SERVICIO");
  const repuestos = detalles.filter((row) => row.producto?.tipo !== "SERVICIO");
  const casos = ticket?.casos ?? [];
  const seguimientoEstados =
    ticket?.historial.filter((entry) => entry.campo === "estado") ?? [];
  const resumen = detalles.reduce(
    (acc, row) => {
      const subtotal = Number(row.cantidad) * Number(row.precioUnitario);
      const cubierto = row.cubiertoGarantia ? subtotal : 0;

      if (row.producto?.tipo === "SERVICIO") {
        acc.servicios += 1;
        acc.manoObra += row.cubiertoGarantia ? 0 : subtotal;
      } else {
        acc.repuestos += 1;
        acc.repuestosTotal += row.cubiertoGarantia ? 0 : subtotal;
      }

      acc.garantia += cubierto;
      acc.total += row.cubiertoGarantia ? 0 : subtotal;
      return acc;
    },
    {
      servicios: 0,
      repuestos: 0,
      manoObra: 0,
      repuestosTotal: 0,
      garantia: 0,
      total: 0,
    },
  );
  const equipoLabel = ticket?.equipo
    ? `${ticket.equipo.numeroSerie} · ${ticket.equipo.modelo ?? ""}`.trim()
    : ticket?.clienteEquipo
      ? [
          ticket.clienteEquipo.nombre,
          ticket.clienteEquipo.marca,
          ticket.clienteEquipo.modelo,
          ticket.clienteEquipo.numeroSerie,
        ]
          .filter(Boolean)
          .join(" · ")
      : "Sin equipo asociado";

  const handlePdfPreview = async () => {
    if (!ticket) return;
    setIsDownloadingPdf(true);
    try {
      const url = await generateTicketSoporteBlobUrl(ticket, empresaRes?.data);
      setPreviewUrl(url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo generar la vista previa del PDF",
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5 p-0 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 px-4 sm:px-0 mt-3 sm:mt-0">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/soporte")}
            className="h-9 w-9 rounded-xl"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-foreground">
                {ticket?.codigo ?? "Ticket"}
              </h1>
              {ticket ? (
                <>
                  <Badge variant="outline">{ESTADO_LABELS[ticket.estado]}</Badge>
                  <Badge variant="secondary">
                    {PRIORIDAD_LABELS[ticket.prioridad]}
                  </Badge>
                </>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {ticket?.titulo ?? "Cargando información del ticket"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ticket ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl h-9 text-xs"
              onClick={() => void handlePdfPreview()}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </Button>
          ) : null}
          {ticket &&
          canEdit &&
          ticket.estado !== EstadoTicket.CERRADO &&
          ticket.estado !== EstadoTicket.CANCELADO ? (
            <TicketStatusAction ticketId={ticket.id} estado={ticket.estado} />
          ) : null}
          {ticket &&
          canEdit &&
          ticket.estado !== EstadoTicket.CERRADO &&
          ticket.estado !== EstadoTicket.CANCELADO ? (
            <Button asChild variant="outline" className="gap-2 rounded-xl h-9 text-xs px-3">
              <Link href={`/soporte/${ticket.id}/editar`}>
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Editar</span>
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 px-4 sm:px-0">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : isError || !ticket ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground mx-4 sm:mx-0">
          No se pudo cargar el ticket.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 px-4 sm:px-0 animate-fade-up">
            <InfoItem label="Cliente" value={formatCliente(ticket.cliente)} icon={User} />
            <InfoItem
              label={ticket.equipo ? "Equipo propio" : "Equipo externo"}
              value={equipoLabel}
              icon={Wrench}
            />
            <InfoItem
              label="Tipo"
              value={TIPO_LABELS[ticket.tipoServicio]}
              icon={AlertTriangle}
            />
            <InfoItem
              label="Recepción"
              value={formatDateTime(ticket.fechaRecepcion)}
              icon={Calendar}
            />
          </div>

          <Tabs defaultValue="detalle" className="min-w-0 px-4 sm:px-0">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="detalle">Detalle</TabsTrigger>
              <TabsTrigger value="servicios">Servicios</TabsTrigger>
              <TabsTrigger value="repuestos">Repuestos</TabsTrigger>
              <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              {canEdit &&
              ticket.estado !== EstadoTicket.CERRADO &&
              ticket.estado !== EstadoTicket.CANCELADO ? (
                <TabsTrigger value="cierre">Cierre</TabsTrigger>
              ) : null}
              <TabsTrigger value="garantia">Garantía</TabsTrigger>
            </TabsList>

            <TabsContent value="detalle" className="mt-4 space-y-4">
              <section className="rounded-xl border border-border/50 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <InfoItem
                    label="Servicios"
                    value={`${resumen.servicios}`}
                    icon={Wrench}
                  />
                  <InfoItem
                    label="Repuestos"
                    value={`${resumen.repuestos}`}
                    icon={Wrench}
                  />
                  <InfoItem
                    label="Cubierto garantía"
                    value={`S/ ${resumen.garantia.toFixed(2)}`}
                    icon={ShieldCheck}
                  />
                  <InfoItem
                    label="Total a cobrar"
                    value={`S/ ${resumen.total.toFixed(2)}`}
                    icon={Clock}
                  />
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-lg border border-border/30 bg-background/50 px-3 py-2">
                    <span className="text-muted-foreground">Mano de obra</span>
                    <p className="font-semibold tabular-nums">
                      S/ {resumen.manoObra.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/50 px-3 py-2">
                    <span className="text-muted-foreground">Repuestos</span>
                    <p className="font-semibold tabular-nums">
                      S/ {resumen.repuestosTotal.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/50 px-3 py-2">
                    <span className="text-muted-foreground">
                      Total registrado
                    </span>
                    <p className="font-semibold tabular-nums">
                      S/ {(resumen.total + resumen.garantia).toFixed(2)}
                    </p>
                  </div>
                </div>
              </section>
              <section className="rounded-xl border border-border/50 p-4">
                <h2 className="mb-3 text-sm font-semibold">Problema reportado</h2>
                <p className="text-sm font-medium">{ticket.titulo}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {ticket.descripcion}
                </p>
                {ticket.fallaReportada ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm">
                    {ticket.fallaReportada}
                  </p>
                ) : null}
              </section>
              <section className="grid gap-3 md:grid-cols-3">
                <InfoItem
                  label="Técnico"
                  value={ticket.tecnico?.nombre ?? "Sin asignar"}
                  icon={User}
                />
                <InfoItem
                  label="Fecha promesa"
                  value={formatDateTime(ticket.fechaPromesa)}
                  icon={Clock}
                />
                <InfoItem
                  label="Fecha cierre"
                  value={formatDateTime(ticket.fechaCierre)}
                  icon={Clock}
                />
              </section>
            </TabsContent>

            <TabsContent value="servicios" className="mt-4">
              <DetailTable rows={servicios} label="Servicio" />
            </TabsContent>

            <TabsContent value="repuestos" className="mt-4">
              <DetailTable rows={repuestos} label="Repuesto" />
            </TabsContent>

            <TabsContent value="seguimiento" className="mt-4">
              <div className="grid gap-2">
                {seguimientoEstados.length ? (
                  seguimientoEstados.map((entry) => (
                    <HistorialEntryCard key={entry.id} entry={entry} />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Sin seguimiento registrado.
                  </div>
                )}
              </div>
            </TabsContent>

            {canEdit &&
            ticket.estado !== EstadoTicket.CERRADO &&
            ticket.estado !== EstadoTicket.CANCELADO ? (
              <TabsContent value="cierre" className="mt-4">
                <CierreTicketPanel
                  ticket={ticket}
                  onClose={async () => {
                    toast.success("Ticket cerrado. Generando documento...");
                    const refetched = await refetch();
                    const closedTicket = refetched.data?.data;
                    if (closedTicket) {
                      try {
                        const url = await generateTicketSoporteBlobUrl(closedTicket, empresaRes?.data);
                        setPreviewUrl(url);
                      } catch (e) {
                        toast.error("No se pudo generar la vista previa del PDF.");
                      }
                    }
                  }}
                />
              </TabsContent>
            ) : null}

            <TabsContent value="garantia" className="mt-4">
              <GarantiaPanel
                casos={casos}
                garantiaActual={ticket.garantiaActual}
                esEquipoExterno={Boolean(ticket.clienteEquipo && !ticket.equipo)}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Dialog: Vista previa PDF */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(o) => {
          if (!o) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="flex h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl rounded-2xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between w-full">
              <div className="min-w-0 text-left">
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  Vista Previa - Orden de Servicio
                </DialogTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ticket ? `${ticket.codigo} — ${formatCliente(ticket.cliente)}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-3 text-xs"
                onClick={() => {
                  if (previewUrl && ticket) {
                    const a = document.createElement("a");
                    a.href = previewUrl;
                    a.download = `ticket-${ticket.codigo}.pdf`;
                    a.click();
                  }
                }}
              >
                <Download className="size-3.5" />
                Descargar
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-zinc-900 dark:bg-zinc-950 p-0 flex items-center justify-center">
            {previewUrl ? (
              <iframe
                src={`${previewUrl}#view=FitH`}
                className="w-full h-full border-0"
                title="Vista previa del PDF de soporte"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm">Cargando visor...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
