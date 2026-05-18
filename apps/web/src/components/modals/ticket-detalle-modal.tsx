"use client";

import {
  AlertTriangle,
  Calendar,
  Clock,
  Pencil,
  ShieldCheck,
  ShieldOff,
  User,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { EstadoTicket, PrioridadTicket, TipoServicio } from "@erp/shared";

import { useTicket } from "@/hooks/use-soporte";
import { useActualizarCasoGarantia } from "@/hooks/use-garantias";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CierreTicketPanel } from "@/components/modals/cierre-ticket-panel";

/* ── Label maps ─────────────────────────────────────── */

const ESTADO_LABELS: Record<EstadoTicket, string> = {
  [EstadoTicket.ABIERTO]: "Abierto",
  [EstadoTicket.EN_PROCESO]: "En proceso",
  [EstadoTicket.EN_ESPERA]: "En espera",
  [EstadoTicket.CERRADO]: "Cerrado",
  [EstadoTicket.CANCELADO]: "Cancelado",
};

const ESTADO_VARIANT: Record<EstadoTicket, string> = {
  [EstadoTicket.ABIERTO]:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  [EstadoTicket.EN_PROCESO]:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  [EstadoTicket.EN_ESPERA]:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  [EstadoTicket.CERRADO]:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  [EstadoTicket.CANCELADO]:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const PRIORIDAD_LABELS: Record<PrioridadTicket, string> = {
  [PrioridadTicket.BAJA]: "Baja",
  [PrioridadTicket.MEDIA]: "Media",
  [PrioridadTicket.ALTA]: "Alta",
  [PrioridadTicket.CRITICA]: "Crítica",
};

const PRIORIDAD_VARIANT: Record<PrioridadTicket, string> = {
  [PrioridadTicket.BAJA]:
    "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
  [PrioridadTicket.MEDIA]:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  [PrioridadTicket.ALTA]:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  [PrioridadTicket.CRITICA]:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const TIPO_LABELS: Record<TipoServicio, string> = {
  [TipoServicio.TALLER]: "Taller",
  [TipoServicio.VISITA]: "Visita",
  [TipoServicio.REMOTO]: "Remoto",
};

/* ── Helpers ─────────────────────────────────────────── */

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── InfoItem ────────────────────────────────────────── */

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-2 text-sm text-foreground">
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        {value || "—"}
      </span>
    </div>
  );
}

/* ── DetailSkeleton ──────────────────────────────────── */

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((s) => (
        <div key={s} className="rounded-2xl border border-border/40 p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Section ─────────────────────────────────────────── */

function Section({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {numero}
        </span>
        <h3 className="text-sm font-medium tracking-tight text-foreground/90">
          {titulo}
        </h3>
      </div>
      {children}
    </div>
  );
}

/* ── Props ───────────────────────────────────────────── */

interface TicketDetalleModalProps {
  id: string | null;
  onClose: () => void;
  onEdit?: (ticket: Record<string, unknown>) => void;
  canEdit?: boolean;
}

/* ── Component ───────────────────────────────────────── */

export function TicketDetalleModal({
  id,
  onClose,
  onEdit,
  canEdit,
}: TicketDetalleModalProps) {
  const { data: ticketRes, isLoading, isError } = useTicket(id || undefined);
  const [casoRechazoSeleccionado, setCasoRechazoSeleccionado] =
    useState<Caso | null>(null);
  const [rechazoMotivo, setRechazoMotivo] = useState("");

  const ticket = ticketRes?.data;

  if (!id) return null;

  const estado = ticket?.estado;
  const prioridad = ticket?.prioridad;
  const tipoServicio = ticket?.tipoServicio;

  /* cliente nested object */
  const clienteNombre = ticket?.cliente ? ticket.cliente.nombre : undefined;

  /* equipo nested */
  const equipoDesc = ticket?.equipo
    ? `${ticket.equipo.modelo ?? ""} · Serie: ${ticket.equipo.numeroSerie ?? ""}`.trim()
    : undefined;

  /* tecnico nested */
  const tecnicoNombre = ticket?.tecnico ? ticket.tecnico.nombre : null;

  /* historial */
  const historial = ticket?.historial ?? [];

  /* detalles del ticket: split en servicios vs repuestos por tipo de producto */
  type Detalle = {
    cantidad: number;
    precioUnitario: number;
    producto?: { id: string; nombre: string; sku?: string; tipo?: string };
  };
  const detalles: Detalle[] = (ticket?.detalles ??
    ticket?.repuestos ??
    []) as Detalle[];
  const servicios = detalles.filter((d) => d.producto?.tipo === "SERVICIO");
  const repuestos = detalles.filter((d) => d.producto?.tipo !== "SERVICIO");

  /* casos de garantía */
  type Caso = {
    id: string;
    aceptada: boolean | null;
    motivo: string | null;
    descripcion: string;
    garantia?: {
      id: string;
      codigoQR: string;
      fechaFin: string;
      cobertura: string;
    };
  };
  const casos: Caso[] = (ticket?.casos ?? []) as Caso[];
  const casoActivo = casos.find((c) => c.aceptada === true);
  const casoRechazado = casos.find((c) => c.aceptada === false);
  const garantiaCubre = !!casoActivo;

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 h-[85vh] flex flex-col">
        <DialogHeader className="p-3 sm:p-6 pb-2 shrink-0 border-b border-border/40">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl sm:text-2xl flex flex-wrap items-center gap-2">
                {ticket ? (
                  ticket.titulo
                ) : isLoading ? (
                  <Skeleton className="h-7 w-64" />
                ) : (
                  "Ticket"
                )}
                {estado && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${ESTADO_VARIANT[estado]}`}
                  >
                    {ESTADO_LABELS[estado]}
                  </Badge>
                )}
                {prioridad && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${PRIORIDAD_VARIANT[prioridad]}`}
                  >
                    {PRIORIDAD_LABELS[prioridad]}
                  </Badge>
                )}
                {garantiaCubre && (
                  <Badge
                    variant="outline"
                    className="text-xs border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400 gap-1"
                  >
                    <ShieldCheck className="size-3" />
                    Cubierto por garantía
                  </Badge>
                )}
                {casoRechazado && (
                  <Badge
                    variant="outline"
                    className="text-xs border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400 gap-1"
                  >
                    <ShieldOff className="size-3" />
                    Cobertura rechazada
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs sm:text-sm">
                {ticket ? ticket.codigo : "Buscando..."}
                {tipoServicio && ` · ${TIPO_LABELS[tipoServicio]}`}
              </DialogDescription>
            </div>
            {canEdit && ticket && estado !== EstadoTicket.CERRADO && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0 mr-6 sm:mr-10"
                onClick={() =>
                  onEdit?.(
                    ticket as unknown as Record<
                      string,
                      unknown
                    > as unknown as Record<string, unknown>,
                  )
                }
              >
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-4 sm:pb-6">
          {isLoading ? (
            <div className="pt-4">
              <DetailSkeleton />
            </div>
          ) : isError || !ticket ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              No se pudo cargar la información del ticket.
            </div>
          ) : (
            <Tabs defaultValue="detalle" className="flex flex-col h-full">
              <TabsList className="mt-3 mb-2 sm:mb-4 w-full">
                <TabsTrigger value="detalle" className="flex-1">
                  Detalle
                </TabsTrigger>
                <TabsTrigger value="diagnostico" className="flex-1">
                  Diagnóstico
                </TabsTrigger>
                {canEdit &&
                  estado !== EstadoTicket.CERRADO &&
                  estado !== EstadoTicket.CANCELADO && (
                    <TabsTrigger value="cierre" className="flex-1">
                      Cierre
                    </TabsTrigger>
                  )}
                {historial.length > 0 && (
                  <TabsTrigger value="historial" className="flex-1">
                    Historial
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      {historial.length}
                    </span>
                  </TabsTrigger>
                )}
                {servicios.length > 0 && (
                  <TabsTrigger value="servicios" className="flex-1">
                    Servicios
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      {servicios.length}
                    </span>
                  </TabsTrigger>
                )}
                {repuestos.length > 0 && (
                  <TabsTrigger value="repuestos" className="flex-1">
                    Repuestos
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      {repuestos.length}
                    </span>
                  </TabsTrigger>
                )}
                {casos.length > 0 && (
                  <TabsTrigger value="garantia" className="flex-1">
                    Garantía
                  </TabsTrigger>
                )}
              </TabsList>

              {/* TAB: Detalle */}
              <TabsContent value="detalle" className="mt-0">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Section numero={1} titulo="Identificación">
                    <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem label="Código" value={ticket.codigo} />
                      <InfoItem
                        label="Estado"
                        value={estado ? ESTADO_LABELS[estado] : undefined}
                      />
                      <InfoItem
                        label="Prioridad"
                        value={
                          prioridad ? PRIORIDAD_LABELS[prioridad] : undefined
                        }
                        icon={AlertTriangle}
                      />
                      <InfoItem
                        label="Tipo de servicio"
                        value={
                          tipoServicio ? TIPO_LABELS[tipoServicio] : undefined
                        }
                        icon={Wrench}
                      />
                      <InfoItem
                        label="Fecha recepción"
                        value={formatDateTime(ticket.fechaRecepcion)}
                        icon={Calendar}
                      />
                      <InfoItem
                        label="Fecha promesa"
                        value={formatDate(ticket.fechaPromesa)}
                        icon={Clock}
                      />
                      {ticket.fechaCierre != null && (
                        <InfoItem
                          label="Fecha cierre"
                          value={formatDateTime(ticket.fechaCierre)}
                          icon={Clock}
                        />
                      )}
                    </div>
                  </Section>

                  <Section numero={2} titulo="Asignaciones">
                    <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem
                        label="Cliente"
                        value={clienteNombre}
                        icon={User}
                      />
                      <InfoItem
                        label="Equipo"
                        value={equipoDesc}
                        icon={Wrench}
                      />
                      <InfoItem
                        label="Técnico asignado"
                        value={tecnicoNombre ?? "Sin asignar"}
                        icon={User}
                      />
                    </div>
                  </Section>

                  <Section numero={3} titulo="Descripción del problema">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Título
                        </span>
                        <p className="text-sm text-foreground">
                          {ticket.titulo}
                        </p>
                      </div>
                      {ticket.descripcion && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Descripción
                          </span>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {ticket.descripcion}
                          </p>
                        </div>
                      )}
                      {ticket.fallaReportada && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Falla reportada
                          </span>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {ticket.fallaReportada}
                          </p>
                        </div>
                      )}
                      {ticket.notas && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Notas internas
                          </span>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {ticket.notas}
                          </p>
                        </div>
                      )}
                    </div>
                  </Section>
                </div>
              </TabsContent>

              {/* TAB: Diagnóstico */}
              <TabsContent value="diagnostico" className="mt-0">
                <div className="flex flex-col gap-3 sm:gap-4">
                  {ticket.diagnostico || ticket.solucion ? (
                    <Section numero={1} titulo="Diagnóstico y solución">
                      <div className="flex flex-col gap-4">
                        {ticket.diagnostico && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Diagnóstico
                            </span>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {ticket.diagnostico}
                            </p>
                          </div>
                        )}
                        {ticket.solucion && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Solución aplicada
                            </span>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {ticket.solucion}
                            </p>
                          </div>
                        )}
                        {ticket.montoManoObra != null && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Mano de obra
                            </span>
                            <p className="text-sm text-foreground font-medium">
                              S/ {Number(ticket.montoManoObra).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </Section>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-16 rounded-2xl border border-dashed border-border text-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                        <Wrench className="size-6 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">
                          Sin diagnóstico
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          El técnico no ha registrado diagnóstico aún
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB: Historial */}
              {historial.length > 0 && (
                <TabsContent value="historial" className="mt-0">
                  <div className="flex flex-col gap-2">
                    {historial.map((entry, i) => (
                      <div
                        key={i}
                        className="flex gap-3 rounded-xl border border-border/40 bg-card/50 p-4"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                          <Clock className="size-3.5" />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <p className="text-sm text-foreground">
                            {entry.campo}: {entry.valorAnterior ?? "—"} →{" "}
                            {entry.valorNuevo ?? "—"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(entry.creadoEn)}
                            {entry.usuario &&
                              ` · ${(entry.usuario as Record<string, unknown>).nombre}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {/* TAB: Servicios (productos tipo SERVICIO) */}
              {servicios.length > 0 && (
                <TabsContent value="servicios" className="mt-0">
                  <DetalleTable rows={servicios} headerLabel="Servicio" />
                </TabsContent>
              )}

              {/* TAB: Repuestos (productos físicos) */}
              {repuestos.length > 0 && (
                <TabsContent value="repuestos" className="mt-0">
                  <DetalleTable rows={repuestos} headerLabel="Repuesto" />
                </TabsContent>
              )}

              {/* TAB: Garantía */}
              {casos.length > 0 && (
                <TabsContent value="garantia" className="mt-0">
                  <GarantiaCasosPanel
                    casos={casos}
                    canEdit={!!canEdit}
                    onRechazar={(caso) => {
                      setRechazoMotivo("");
                      setCasoRechazoSeleccionado(caso);
                    }}
                  />
                </TabsContent>
              )}

              {/* TAB: Cierre (servicios + repuestos editables + cerrar) */}
              {canEdit &&
                estado !== EstadoTicket.CERRADO &&
                estado !== EstadoTicket.CANCELADO && (
                  <TabsContent value="cierre" className="mt-0">
                    <CierreTicketPanel ticket={ticket} onClose={onClose} />
                  </TabsContent>
                )}
            </Tabs>
          )}
        </div>
      </DialogContent>

      {/* Diálogo: rechazar cobertura de garantía */}
      <RechazarCoberturaDialog
        caso={casoRechazoSeleccionado}
        onClose={() => setCasoRechazoSeleccionado(null)}
        motivo={rechazoMotivo}
        setMotivo={setRechazoMotivo}
      />
    </Dialog>
  );
}

/* ── Helpers internos ────────────────────────────────── */

type DetalleRow = {
  cantidad: number;
  precioUnitario: number;
  producto?: { id: string; nombre: string; sku?: string; tipo?: string };
};

function DetalleTable({
  rows,
  headerLabel,
}: {
  rows: DetalleRow[];
  headerLabel: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              {headerLabel}
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Cant.
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Precio unit.
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((rep, i) => (
            <tr
              key={i}
              className="border-b border-border/20 last:border-0"
            >
              <td className="px-4 py-3 font-medium truncate max-w-50">
                {rep.producto?.nombre ?? "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {rep.cantidad}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                S/ {Number(rep.precioUnitario).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                S/ {(rep.cantidad * Number(rep.precioUnitario)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Caso = {
  id: string;
  aceptada: boolean | null;
  motivo: string | null;
  descripcion: string;
  garantia?: {
    id: string;
    codigoQR: string;
    fechaFin: string;
    cobertura: string;
  };
};

function GarantiaCasosPanel({
  casos,
  canEdit,
  onRechazar,
}: {
  casos: Caso[];
  canEdit: boolean;
  onRechazar: (caso: Caso) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {casos.map((caso) => {
        const fechaFin = caso.garantia?.fechaFin
          ? new Date(caso.garantia.fechaFin).toLocaleDateString("es-PE")
          : "—";
        return (
          <div
            key={caso.id}
            className="rounded-2xl border border-border/40 bg-card/50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {caso.aceptada === false ? (
                    <Badge
                      variant="outline"
                      className="text-xs border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400 gap-1"
                    >
                      <ShieldOff className="size-3" />
                      Rechazada
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400 gap-1"
                    >
                      <ShieldCheck className="size-3" />
                      Aceptada
                    </Badge>
                  )}
                  {caso.garantia?.codigoQR && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {caso.garantia.codigoQR.slice(0, 8)}…
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Vence: {fechaFin}
                  </span>
                </div>
                <p className="text-sm">{caso.descripcion}</p>
                {caso.motivo && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium">Motivo rechazo:</span>{" "}
                    {caso.motivo}
                  </p>
                )}
              </div>
              {canEdit && caso.aceptada !== false && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                  onClick={() => onRechazar(caso)}
                >
                  <ShieldOff className="size-4" />
                  Rechazar
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RechazarCoberturaDialog({
  caso,
  onClose,
  motivo,
  setMotivo,
}: {
  caso: Caso | null;
  onClose: () => void;
  motivo: string;
  setMotivo: (v: string) => void;
}) {
  const garantiaId = caso?.garantia?.id ?? "";
  const casoId = caso?.id ?? "";
  const mutation = useActualizarCasoGarantia(garantiaId, casoId);

  const handleSubmit = async () => {
    if (!motivo.trim() || !garantiaId || !casoId) return;
    await mutation.mutateAsync({ aceptada: false, motivo: motivo.trim() });
    onClose();
  };

  return (
    <Dialog open={!!caso} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rechazar cobertura de garantía</DialogTitle>
          <DialogDescription>
            Indica el motivo por el cual no se cubre este caso. Esta acción
            queda registrada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="motivo-rechazo">Motivo</Label>
          <Textarea
            id="motivo-rechazo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: uso fuera de condiciones del fabricante…"
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!motivo.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Guardando…" : "Confirmar rechazo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
