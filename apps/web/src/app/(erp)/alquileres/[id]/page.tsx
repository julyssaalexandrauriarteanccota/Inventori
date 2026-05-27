"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileImage,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  CondicionInspeccionAlquiler,
  EstadoContratoAlquiler,
  EstadoPeriodoAlquiler,
  type ContratoAlquilerDetalle,
  type PeriodoAlquilerItem,
} from "@erp/shared";

import {
  useActivarAlquiler,
  useAnularAlquiler,
  useAlquiler,
  useCobrarBasePeriodoAlquiler,
  useCerrarPeriodoAlquiler,
  useCobrarPeriodoAlquiler,
  useDeleteAlquiler,
  useFinalizarAlquiler,
  useUpdateAlquiler,
} from "@/hooks/use-alquileres";
import { useMetodosPago } from "@/hooks/use-configuracion";
import { useAlmacenes } from "@/hooks/use-inventario";
import {
  getUploadAcceptAttr,
  revokeObjectPreviewUrl,
  uploadSelectedFiles,
  type NormalizedUploadedFile,
} from "@/lib/file-uploads";
import { getApiAssetUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const CONTRATO_LABELS: Record<EstadoContratoAlquiler, string> = {
  [EstadoContratoAlquiler.BORRADOR]: "Borrador",
  [EstadoContratoAlquiler.RESERVADO]: "Reservado",
  [EstadoContratoAlquiler.PENDIENTE_ENTREGA]: "Pendiente entrega",
  [EstadoContratoAlquiler.ACTIVO]: "Activo",
  [EstadoContratoAlquiler.EN_RETORNO]: "En retorno",
  [EstadoContratoAlquiler.CERRADO]: "Cerrado",
  [EstadoContratoAlquiler.FINALIZADO]: "Finalizado",
  [EstadoContratoAlquiler.CANCELADO]: "Cancelado",
};

const PERIODO_LABELS: Record<EstadoPeriodoAlquiler, string> = {
  [EstadoPeriodoAlquiler.PENDIENTE_BASE]: "Pendiente base",
  [EstadoPeriodoAlquiler.ACTIVO]: "Activo",
  [EstadoPeriodoAlquiler.PENDIENTE_CIERRE]: "Pendiente excedente",
  [EstadoPeriodoAlquiler.CERRADO]: "Cerrado",
  [EstadoPeriodoAlquiler.CANCELADO]: "Cancelado",
};

const CONDICION_RETORNO_LABELS: Record<CondicionInspeccionAlquiler, string> = {
  [CondicionInspeccionAlquiler.BUENO]: "Bueno",
  [CondicionInspeccionAlquiler.REGULAR]: "Regular",
  [CondicionInspeccionAlquiler.DANADO]: "Dañado",
};

const DIGITAL_PROOF_METHOD_CODES = new Set(["YAPE_PLIN", "YAPE", "PLIN", "TRANSFERENCIA"]);
const CASH_METHOD_CODE = "EFECTIVO";

type MetodoPagoOption = {
  id: string;
  codigo: string;
  nombre: string;
  activo?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(value ?? 0));
}

function clienteLabel(cliente: ContratoAlquilerDetalle["cliente"]) {
  if (!cliente) return "—";
  return (
    cliente.razonSocial ||
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
    "—"
  );
}

function apiErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operación";
}

function requiresPaymentEvidence(metodo?: MetodoPagoOption | null) {
  return Boolean(metodo && DIGITAL_PROOF_METHOD_CODES.has(metodo.codigo));
}

function showPaymentReference(metodo?: MetodoPagoOption | null) {
  return Boolean(metodo && metodo.codigo !== CASH_METHOD_CODE);
}

function PaymentProofField({
  proof,
  isUploading,
  required,
  onSelect,
  onClear,
}: {
  proof: NormalizedUploadedFile | null;
  isUploading: boolean;
  required: boolean;
  onSelect: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <Field>
      <FieldLabel>
        Evidencia del pago digital{required ? " *" : ""}
      </FieldLabel>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background px-4 py-4 text-center text-xs transition hover:bg-muted/40">
        <input
          type="file"
          className="sr-only"
          accept={getUploadAcceptAttr("mixed")}
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            onSelect(file);
            event.currentTarget.value = "";
          }}
        />
        {isUploading ? (
          <>
            <Loader2 data-icon="start" className="animate-spin" />
            <span className="font-medium">Subiendo...</span>
          </>
        ) : (
          <>
            <Upload data-icon="start" />
            <span className="font-medium">Adjuntar captura o PDF</span>
            <span className="text-xs text-muted-foreground">
              JPG, PNG, WEBP o PDF hasta 5 MB.
            </span>
          </>
        )}
      </label>
      {proof ? (
        <div className="flex items-start gap-2 rounded-lg border bg-muted/35 px-3 py-2">
          {proof.isImage ? <FileImage /> : <FileText />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{proof.originalName}</p>
            <p className="text-xs text-muted-foreground">
              {(proof.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Quitar
          </Button>
        </div>
      ) : null}
    </Field>
  );
}

function statusBadge(estado: EstadoContratoAlquiler | EstadoPeriodoAlquiler) {
  const label =
    estado in CONTRATO_LABELS
      ? CONTRATO_LABELS[estado as EstadoContratoAlquiler]
      : PERIODO_LABELS[estado as EstadoPeriodoAlquiler];
  return <Badge variant="outline">{label}</Badge>;
}

export default function AlquilerDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const alquiler = useAlquiler(id);
  const contrato = alquiler.data?.data;

  if (alquiler.isLoading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[520px] w-full" />
      </main>
    );
  }

  if (!contrato) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Button asChild variant="outline" className="w-fit">
          <Link href="/alquileres">
            <ArrowLeft data-icon="start" />
            Volver
          </Link>
        </Button>
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Contrato no encontrado.
        </div>
      </main>
    );
  }

  const periodoActual =
    contrato.periodos.find((p) => p.estado === EstadoPeriodoAlquiler.ACTIVO) ??
    contrato.periodos.find((p) => p.estado === EstadoPeriodoAlquiler.PENDIENTE_BASE) ??
    contrato.periodos.find((p) => p.estado === EstadoPeriodoAlquiler.PENDIENTE_CIERRE) ??
    contrato.periodos.at(-1);
  const contadorActual =
    contrato.equipo?.contadorActual ?? contrato.contadorActual ?? contrato.contadorInicio;
  const lecturaInicial = periodoActual?.lecturaInicial ?? contrato.contadorInicio;
  const copiasEstimadas = Math.max(0, contadorActual - lecturaInicial);
  const excedenteEstimado = Math.max(0, copiasEstimadas - contrato.copiasIncluidasMes);

  return (
    <main className="flex w-full min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
          >
            <Link href="/alquileres">
              <ArrowLeft />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-foreground">
                {contrato.numero}
              </h1>
              {statusBadge(contrato.estado)}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {clienteLabel(contrato.cliente)} · {contrato.equipo?.producto?.nombre ?? "Equipo"} · {contrato.equipo?.numeroSerie}
            </p>
          </div>
        </div>
        <ContratoActions contrato={contrato} onDone={() => router.refresh()} />
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Banknote} label="Mensualidad" value={money(contrato.precioMensual)} />
        <Metric icon={ClipboardList} label="Depósito garantía" value={money(contrato.depositoGarantia)} />
        <Metric icon={Printer} label="Contador actual" value={contadorActual.toLocaleString("es-PE")} />
        <Metric icon={CalendarClock} label="Excedente estimado" value={excedenteEstimado.toLocaleString("es-PE")} />
      </section>

      <Tabs defaultValue="resumen" className="flex min-w-0 flex-col gap-4">
        <TabsList className="h-10 w-full justify-start overflow-x-auto rounded-lg border border-border/60 bg-muted/50 p-1">
          <TabsTrigger value="resumen" className="shrink-0">Resumen</TabsTrigger>
          <TabsTrigger value="periodos" className="shrink-0">Periodos</TabsTrigger>
          <TabsTrigger value="lecturas" className="shrink-0">Lecturas y cargos</TabsTrigger>
          <TabsTrigger value="seguimiento" className="shrink-0">Seguimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-0">
          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Contrato</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Inicio" value={formatDate(contrato.fechaInicio)} />
                <Info label="Fin previsto" value={formatDate(contrato.fechaFinPrevista)} />
                <Info label="Plazo" value={`${contrato.mesesPlazo} meses`} />
                <Info
                  label="Depósito"
                  value={`${money(contrato.depositoGarantia)}${contrato.depositoCobradoAt ? " cobrado" : " pendiente"}`}
                />
                <Info label="Precio excedente" value={money(contrato.precioCopiaExcedente)} />
                <Info label="Contador inicial" value={contrato.contadorInicio.toLocaleString("es-PE")} />
                <Info label="Próxima lectura" value={formatDate(periodoActual?.fechaFin)} />
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Saldo del contrato</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info
                  label="Cuotas cobradas"
                  value={`${money(contrato.resumenFinanciero?.cuotasBaseCobradas)} / ${money(contrato.resumenFinanciero?.cuotasBaseTotal)}`}
                />
                <Info
                  label="Excedentes cobrados"
                  value={`${money(contrato.resumenFinanciero?.cierresCobrados)} / ${money(contrato.resumenFinanciero?.cierresTotal)}`}
                />
                <Info
                  label="Depósito aplicado"
                  value={money(contrato.resumenFinanciero?.depositoAplicado)}
                />
                <Info
                  label="Saldo pendiente"
                  value={money(contrato.resumenFinanciero?.saldoPendiente)}
                />
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Tickets fuera de garantía pendientes</h2>
              <div className="mt-4 flex flex-col gap-2">
                {(contrato.ticketsCobrables ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay tickets cerrados cobrables pendientes.
                  </p>
                ) : (
                  contrato.ticketsCobrables?.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                      <span>{ticket.codigo} · {ticket.titulo}</span>
                      <span className="font-medium">{money(ticket.montoTotal)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="periodos" className="mt-0">
          <PeriodosTable contrato={contrato} />
        </TabsContent>

        <TabsContent value="lecturas" className="mt-0">
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Lecturas manuales</h2>
              <div className="mt-4 overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Contador</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(contrato.lecturas ?? []).map((lectura) => (
                      <TableRow key={lectura.id}>
                        <TableCell>{formatDateTime(lectura.fechaLectura)}</TableCell>
                        <TableCell>{lectura.contador.toLocaleString("es-PE")}</TableCell>
                        <TableCell>{lectura.notas ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Excedentes calculados</h2>
              <div className="mt-4 flex flex-col gap-2">
                {contrato.periodos.flatMap((p) => p.cargos ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin excedentes calculados.</p>
                ) : (
                  contrato.periodos.flatMap((p) =>
                    (p.cargos ?? []).map((cargo) => (
                      <div key={cargo.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                        <span>{cargo.descripcion}</span>
                        <span className="font-medium">{money(cargo.monto)}</span>
                      </div>
                    )),
                  )
                )}
              </div>
            </div>
            <PagosAlquiler contrato={contrato} />
          </section>
        </TabsContent>

        <TabsContent value="seguimiento" className="mt-0">
          <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <SeguimientoAlquiler contrato={contrato} />
            <InspeccionesAlquiler contrato={contrato} />
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <Icon />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function SeguimientoAlquiler({
  contrato,
}: {
  contrato: ContratoAlquilerDetalle;
}) {
  const eventos = [
    {
      id: "creado",
      titulo: "Contrato creado",
      detalle: "Registro inicial del alquiler en borrador.",
      fecha: contrato.createdAt,
      estado: "Contrato",
    },
    ...contrato.periodos.flatMap((periodo) => {
      const items = [];
      if (periodo.baseCobradoAt) {
        items.push({
          id: `base-${periodo.id}`,
          titulo: `Cuota base periodo ${periodo.numeroPeriodo}`,
          detalle: `Cobro base ${money(periodo.montoBase)}.`,
          fecha: periodo.baseCobradoAt,
          estado: "Caja",
        });
      }
      if (periodo.cierreCalculadoAt) {
        items.push({
          id: `cierre-${periodo.id}`,
          titulo: `Lectura cerrada periodo ${periodo.numeroPeriodo}`,
          detalle: `${(periodo.copiasExcedentes ?? 0).toLocaleString("es-PE")} copias excedentes.`,
          fecha: periodo.cierreCalculadoAt,
          estado: "Periodo",
        });
      }
      if (periodo.cierreCobradoAt && Number(periodo.totalCierre ?? 0) > 0) {
        items.push({
          id: `cobro-${periodo.id}`,
          titulo: `Excedente cobrado periodo ${periodo.numeroPeriodo}`,
          detalle: `Total excedente ${money(periodo.totalCierre)}.`,
          fecha: periodo.cierreCobradoAt,
          estado: "Caja",
        });
      }
      return items;
    }),
    ...(contrato.lecturas ?? []).map((lectura) => ({
      id: `lectura-${lectura.id}`,
      titulo: "Lectura manual registrada",
      detalle: `Contador ${lectura.contador.toLocaleString("es-PE")}${lectura.notas ? ` · ${lectura.notas}` : ""}`,
      fecha: lectura.fechaLectura,
      estado: "Lectura",
    })),
  ]
    .filter((evento) => Boolean(evento.fecha))
    .sort(
      (a, b) =>
        new Date(b.fecha ?? 0).getTime() - new Date(a.fecha ?? 0).getTime(),
    );

  if (!eventos.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Sin seguimiento registrado.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {eventos.map((evento) => (
        <div key={evento.id} className="rounded-xl border bg-card/50 p-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{evento.titulo}</p>
              <p className="mt-1 text-muted-foreground">{evento.detalle}</p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {evento.estado}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatDateTime(evento.fecha)}
          </p>
        </div>
      ))}
    </div>
  );
}

function InspeccionesAlquiler({
  contrato,
}: {
  contrato: ContratoAlquilerDetalle;
}) {
  const inspecciones = contrato.inspecciones ?? [];

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Inspecciones</h2>
      <div className="mt-4 flex flex-col gap-2">
        {inspecciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay inspecciones de entrega o retorno.
          </p>
        ) : (
          inspecciones.map((inspeccion) => (
            <div key={inspeccion.id} className="rounded-lg border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {inspeccion.tipo === "RETORNO" ? "Retorno" : "Entrega"} ·{" "}
                  {inspeccion.condicion}
                </p>
                <Badge variant="outline">{formatDateTime(inspeccion.createdAt)}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">
                Contador:{" "}
                {inspeccion.contador != null
                  ? inspeccion.contador.toLocaleString("es-PE")
                  : "—"}
              </p>
              {inspeccion.notas ? (
                <p className="mt-1 text-muted-foreground">{inspeccion.notas}</p>
              ) : null}
              {inspeccion.evidenciaFilename ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Evidencia: {inspeccion.evidenciaFilename}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PagosAlquiler({ contrato }: { contrato: ContratoAlquilerDetalle }) {
  const pagos = contrato.pagos ?? [];

  return (
    <div className="rounded-lg border bg-card p-4 lg:col-span-2">
      <h2 className="font-semibold">Pagos y evidencias</h2>
      <div className="mt-4 flex flex-col gap-2">
        {pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin pagos registrados para este contrato.
          </p>
        ) : (
          pagos.map((pago) => (
            <div key={pago.id} className="rounded-lg border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{pago.concepto}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pago.metodoPago ?? "Sin método"} · {formatDateTime(pago.createdAt)}
                  </p>
                </div>
                <span className="font-semibold">{money(pago.monto)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {pago.evidencias.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Sin evidencia adjunta.
                  </span>
                ) : (
                  pago.evidencias.map((evidencia) => (
                    <Button
                      key={evidencia.id}
                      asChild
                      size="sm"
                      variant="outline"
                    >
                      <a
                        href={getApiAssetUrl(evidencia.url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {evidencia.tipo.toLowerCase().includes("pdf") ? (
                          <FileText data-icon="start" />
                        ) : (
                          <FileImage data-icon="start" />
                        )}
                        Ver evidencia
                      </a>
                    </Button>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ContratoActions({
  contrato,
}: {
  contrato: ContratoAlquilerDetalle;
  onDone: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [anularOpen, setAnularOpen] = useState(false);
  const [activarOpen, setActivarOpen] = useState(false);
  const activar = useActivarAlquiler(contrato.id);
  const requiereDeposito =
    Number(contrato.depositoGarantia ?? 0) > 0 && !contrato.depositoCobradoAt;
  const canDelete = [
    EstadoContratoAlquiler.BORRADOR,
    EstadoContratoAlquiler.CERRADO,
    EstadoContratoAlquiler.FINALIZADO,
    EstadoContratoAlquiler.CANCELADO,
  ].includes(contrato.estado);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {contrato.estado === EstadoContratoAlquiler.BORRADOR ? (
        <Button
          disabled={activar.isPending}
          onClick={async () => {
            if (requiereDeposito) {
              setActivarOpen(true);
              return;
            }
            try {
              await activar.mutateAsync({});
              toast.success("Contrato activado. Cobra la mensualidad #1 en Periodos.");
            } catch (error) {
              toast.error(apiErrorMessage(error));
            }
          }}
        >
          {activar.isPending ? (
            <Loader2 data-icon="start" className="animate-spin" />
          ) : (
            <CheckCircle2 data-icon="start" />
          )}
          Activar contrato
        </Button>
      ) : null}

      {contrato.estado === EstadoContratoAlquiler.ACTIVO ? (
        <>
          <Button
            variant="outline"
            onClick={() => setFinalizarOpen(true)}
          >
            <RotateCcw data-icon="start" />
            Finalizar
          </Button>
          <Button
            variant="outline"
            onClick={() => setAnularOpen(true)}
          >
            <XCircle data-icon="start" />
            Anular
          </Button>
        </>
      ) : null}

      {contrato.estado === EstadoContratoAlquiler.BORRADOR || canDelete ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1.5">
              Acciones
              <MoreHorizontal data-icon="end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              {contrato.estado === EstadoContratoAlquiler.BORRADOR ? (
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Editar contrato
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  Eliminar registro
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <ActivarContratoDialog
        contrato={contrato}
        open={activarOpen}
        onOpenChange={setActivarOpen}
      />
      <EditarContratoDialog
        contrato={contrato}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <EliminarRegistroSheet
        contrato={contrato}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <RetornoEquipoDialog
        contrato={contrato}
        mode="finalizar"
        open={finalizarOpen}
        onOpenChange={setFinalizarOpen}
      />
      <RetornoEquipoDialog
        contrato={contrato}
        mode="anular"
        open={anularOpen}
        onOpenChange={setAnularOpen}
      />
    </div>
  );
}

function ActivarContratoDialog({
  contrato,
  open,
  onOpenChange,
}: {
  contrato: ContratoAlquilerDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const activar = useActivarAlquiler(contrato.id);
  const metodos = useMetodosPago();
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [paymentProof, setPaymentProof] = useState<NormalizedUploadedFile | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const metodoOptions = (metodos.data?.data.filter((m) => m.activo) ?? []) as MetodoPagoOption[];
  const selectedMetodo = metodoOptions.find((metodo) => metodo.id === metodoPagoId) ?? null;
  const needsProof = requiresPaymentEvidence(selectedMetodo);
  const showReference = showPaymentReference(selectedMetodo);
  const deposito = Number(contrato.depositoGarantia ?? 0);

  useEffect(() => {
    return () => revokeObjectPreviewUrl(paymentProof?.previewUrl);
  }, [paymentProof]);

  async function handlePaymentProofSelected(file: File | null) {
    if (!file) return;
    setIsUploadingProof(true);
    try {
      const [uploadedFile] = await uploadSelectedFiles([file], {
        preset: "mixed",
        maxFiles: 1,
      });
      revokeObjectPreviewUrl(paymentProof?.previewUrl);
      setPaymentProof(uploadedFile);
      toast.success("Comprobante de depósito adjuntado");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setIsUploadingProof(false);
    }
  }

  function clearPaymentProof() {
    revokeObjectPreviewUrl(paymentProof?.previewUrl);
    setPaymentProof(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!metodoPagoId) {
      toast.error("Selecciona un método de pago para el depósito");
      return;
    }
    if (needsProof && !paymentProof?.filename) {
      toast.error("Adjunta el comprobante del depósito");
      return;
    }

    try {
      await activar.mutateAsync({
        metodoPagoId,
        referenciaPago: referenciaPago || undefined,
        evidenciaPagoFilename: paymentProof?.filename,
      });
      toast.success("Depósito cobrado y contrato activado");
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Activar contrato</DialogTitle>
          <DialogDescription>
            Cobra el depósito de garantía antes de entregar el equipo y activar el alquiler.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{contrato.numero}</p>
            <p className="mt-1 text-muted-foreground">
              Depósito a cobrar: {money(deposito)}
            </p>
          </div>
          <FieldGroup>
            <Field>
              <FieldLabel>Método de pago</FieldLabel>
              <Select value={metodoPagoId} onValueChange={setMetodoPagoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona método" />
                </SelectTrigger>
                <SelectContent>
                  {metodoOptions.map((metodo) => (
                    <SelectItem key={metodo.id} value={metodo.id}>
                      {metodo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {showReference ? (
              <Field>
                <FieldLabel>N° operación / voucher</FieldLabel>
                <Input
                  value={referenciaPago}
                  onChange={(event) => setReferenciaPago(event.target.value)}
                  placeholder="Código de operación o transferencia"
                />
              </Field>
            ) : null}
            {needsProof ? (
              <PaymentProofField
                proof={paymentProof}
                isUploading={isUploadingProof}
                required
                onSelect={(file) => void handlePaymentProofSelected(file)}
                onClear={clearPaymentProof}
              />
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={activar.isPending || isUploadingProof}>
              {activar.isPending ? (
                <Loader2 data-icon="start" className="animate-spin" />
              ) : (
                <CheckCircle2 data-icon="start" />
              )}
              Cobrar y activar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EliminarRegistroSheet({
  contrato,
  open,
  onOpenChange,
}: {
  contrato: ContratoAlquilerDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const remove = useDeleteAlquiler(contrato.id);

  async function handleDelete() {
    try {
      await remove.mutateAsync();
      toast.success("Borrador eliminado");
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>Eliminar registro</SheetTitle>
          <SheetDescription>
            Elimina el contrato de alquiler de la base de datos. No revierte stock, caja ni movimientos ya registrados.
          </SheetDescription>
        </SheetHeader>
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">{contrato.numero}</p>
          <p className="text-muted-foreground">
            {clienteLabel(contrato.cliente)} · {contrato.equipo?.numeroSerie}
          </p>
        </div>
        <SheetFooter className="border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={handleDelete}
          >
            {remove.isPending ? <Loader2 data-icon="start" className="animate-spin" /> : <Trash2 data-icon="start" />}
            Eliminar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RetornoEquipoDialog({
  contrato,
  mode,
  open,
  onOpenChange,
}: {
  contrato: ContratoAlquilerDetalle;
  mode: "finalizar" | "anular";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const almacenes = useAlmacenes();
  const metodos = useMetodosPago();
  const finalizar = useFinalizarAlquiler(contrato.id);
  const anular = useAnularAlquiler(contrato.id);
  const [almacenId, setAlmacenId] = useState("");
  const [notas, setNotas] = useState("");
  const [contadorRetorno, setContadorRetorno] = useState("");
  const [condicionRetorno, setCondicionRetorno] = useState<CondicionInspeccionAlquiler>(
    CondicionInspeccionAlquiler.BUENO,
  );
  const [cargoDanos, setCargoDanos] = useState("0");
  const [cargoTransporte, setCargoTransporte] = useState("0");
  const [cargoMora, setCargoMora] = useState("0");
  const [depositoAplicado, setDepositoAplicado] = useState("0");
  const [depositoDevuelto, setDepositoDevuelto] = useState("0");
  const [metodoPagoDevolucionId, setMetodoPagoDevolucionId] = useState("");
  const [referenciaDevolucion, setReferenciaDevolucion] = useState("");
  const [retornoProof, setRetornoProof] = useState<NormalizedUploadedFile | null>(null);
  const [isUploadingRetornoProof, setIsUploadingRetornoProof] = useState(false);
  const almacenesActivos = almacenes.data?.data.filter((almacen) => almacen.activo) ?? [];
  const defaultAlmacen = almacenesActivos.find((almacen) => almacen.esPrincipal) ?? almacenesActivos[0];
  const hasSingleAlmacen = almacenesActivos.length === 1;
  const isFinalizar = mode === "finalizar";
  const metodoOptions = (metodos.data?.data.filter((m) => m.activo) ?? []) as MetodoPagoOption[];
  const selectedMetodoDevolucion =
    metodoOptions.find((metodo) => metodo.id === metodoPagoDevolucionId) ?? null;
  const needsRefundProof = requiresPaymentEvidence(selectedMetodoDevolucion);
  const showRefundReference = showPaymentReference(selectedMetodoDevolucion);
  const periodoActivo = contrato.periodos.find(
    (periodo) => periodo.estado === EstadoPeriodoAlquiler.ACTIVO,
  );
  const ultimoPeriodoConLectura = [...contrato.periodos]
    .reverse()
    .find((periodo) => periodo.lecturaFinal != null);
  const contadorRetornoBase =
    contrato.contadorActual ??
    ultimoPeriodoConLectura?.lecturaFinal ??
    contrato.contadorInicio;
  const cuotasCobradas = Number(contrato.resumenFinanciero?.cuotasBaseCobradas ?? 0);
  const excedentesCobrados = Number(contrato.resumenFinanciero?.cierresCobrados ?? 0);
  const saldoPendiente = Number(contrato.resumenFinanciero?.saldoPendiente ?? 0);
  const depositoGarantia = Number(contrato.depositoGarantia ?? 0);
  const depositoYaAplicado = Number(contrato.depositoAplicado ?? 0);
  const depositoDisponible = Math.max(0, depositoGarantia - depositoYaAplicado);
  const cargosFinales =
    Number(cargoDanos || 0) + Number(cargoTransporte || 0) + Number(cargoMora || 0);
  const depositoAplicadoNumber = Number(depositoAplicado || 0);
  const depositoDevueltoNumber = Number(depositoDevuelto || 0);
  const excedenteActivoPendiente =
    periodoActivo?.lecturaInicial != null
      ? Math.max(
          0,
          (contrato.contadorActual ?? contrato.contadorInicio) -
            periodoActivo.lecturaInicial -
            periodoActivo.copiasIncluidas,
        )
      : 0;
  const bloqueoFinalizacion = isFinalizar && (saldoPendiente > 0 || excedenteActivoPendiente > 0);

  useEffect(() => {
    if (open && !almacenId && defaultAlmacen) {
      setAlmacenId(defaultAlmacen.id);
    }
  }, [defaultAlmacen, almacenId, open]);

  useEffect(() => {
    if (open && isFinalizar && !contadorRetorno) {
      setContadorRetorno(String(contadorRetornoBase));
    }
  }, [contadorRetorno, contadorRetornoBase, isFinalizar, open]);

  useEffect(() => {
    return () => revokeObjectPreviewUrl(retornoProof?.previewUrl);
  }, [retornoProof]);

  async function handleRetornoProofSelected(file: File | null) {
    if (!file) return;
    setIsUploadingRetornoProof(true);
    try {
      const [uploadedFile] = await uploadSelectedFiles([file], {
        preset: "mixed",
        maxFiles: 1,
      });
      revokeObjectPreviewUrl(retornoProof?.previewUrl);
      setRetornoProof(uploadedFile);
      toast.success("Evidencia de retorno adjuntada");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setIsUploadingRetornoProof(false);
    }
  }

  function clearRetornoProof() {
    revokeObjectPreviewUrl(retornoProof?.previewUrl);
    setRetornoProof(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!almacenId) {
      toast.error("Selecciona el almacén de retorno");
      return;
    }

    try {
      if (isFinalizar) {
        if (bloqueoFinalizacion) {
          toast.error("Hay excedentes o saldo pendiente. Cierra y cobra antes de finalizar.");
          return;
        }
        if (depositoAplicadoNumber + depositoDevueltoNumber > depositoDisponible) {
          toast.error("El depósito aplicado y devuelto no puede superar el depósito disponible.");
          return;
        }
        if (depositoAplicadoNumber > cargosFinales) {
          toast.error("El depósito aplicado no puede superar los cargos finales.");
          return;
        }
        if (depositoDevueltoNumber > 0 && !metodoPagoDevolucionId) {
          toast.error("Selecciona el método para devolver el depósito.");
          return;
        }
        if (depositoDevueltoNumber > 0 && needsRefundProof && !retornoProof?.filename) {
          toast.error("Adjunta la evidencia de devolución del depósito.");
          return;
        }
        await finalizar.mutateAsync({
          almacenId,
          contadorRetorno: Number(contadorRetorno || contadorRetornoBase),
          condicionRetorno,
          cargoDanos: Number(cargoDanos || 0),
          cargoTransporte: Number(cargoTransporte || 0),
          cargoMora: Number(cargoMora || 0),
          depositoAplicado: depositoAplicadoNumber,
          depositoDevuelto: depositoDevueltoNumber,
          metodoPagoDevolucionId: metodoPagoDevolucionId || undefined,
          referenciaDevolucion: referenciaDevolucion || undefined,
          evidenciaRetornoFilename: retornoProof?.filename,
          notasInspeccion: notas || undefined,
          notas: notas || undefined,
        });
      } else {
        await anular.mutateAsync({ almacenId, notas: notas || undefined });
      }
      toast.success(isFinalizar ? "Contrato finalizado" : "Contrato anulado");
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-4">
          <DialogTitle>{isFinalizar ? "Finalizar alquiler" : "Anular alquiler"}</DialogTitle>
          <DialogDescription>
            {isFinalizar
              ? "Finaliza el contrato si no quedan excedentes ni saldos pendientes. El equipo vuelve al almacén seleccionado."
              : "Anulación operativa. El equipo vuelve al almacén seleccionado, se cancelan los periodos abiertos o futuros y se anula la garantía. Los pagos ya registrados quedan como historial de caja."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="flex max-h-[calc(100dvh-13rem)] flex-col gap-4 overflow-y-auto p-4">
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{contrato.numero}</p>
            <p className="text-muted-foreground">
              {contrato.equipo?.numeroSerie} · {contrato.equipo?.producto?.nombre ?? "Equipo"}
            </p>
          </div>
          {isFinalizar ? (
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Validación de cierre</p>
              <div className="mt-2 grid gap-2 text-muted-foreground sm:grid-cols-2">
                <span>Mensualidades cobradas: {money(cuotasCobradas)}</span>
                <span>Excedentes cobrados: {money(excedentesCobrados)}</span>
                <span>Saldo pendiente: {money(saldoPendiente)}</span>
                <span>Excedente activo: {excedenteActivoPendiente.toLocaleString("es-PE")} copias</span>
                <span>Contador final: {contadorRetornoBase.toLocaleString("es-PE")}</span>
              </div>
              {bloqueoFinalizacion ? (
                <p className="mt-3 text-xs font-medium text-destructive">
                  Hay excedentes o saldo pendiente. Cierra y cobra antes de finalizar.
                </p>
              ) : null}
            </div>
          ) : null}
          <FieldGroup className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel>Almacén de retorno</FieldLabel>
              <Select
                value={almacenId}
                onValueChange={setAlmacenId}
                disabled={almacenesActivos.length <= 1}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona almacén" />
                </SelectTrigger>
                <SelectContent>
                  {almacenesActivos.map((almacen) => (
                    <SelectItem key={almacen.id} value={almacen.id}>
                      {almacen.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {almacenesActivos.length === 0
                  ? "No hay almacenes activos disponibles."
                  : hasSingleAlmacen
                    ? "Se usará el único almacén activo disponible."
                    : defaultAlmacen?.id === almacenId
                      ? "Se seleccionó el almacén principal por defecto."
                      : "Puedes cambiar el almacén de retorno."}
              </p>
            </Field>
            {!isFinalizar ? (
              <Field>
                <FieldLabel>Notas</FieldLabel>
                <Textarea
                  value={notas}
                  onChange={(event) => setNotas(event.target.value)}
                  placeholder="Motivo de anulación"
                />
              </Field>
            ) : null}
          </FieldGroup>
          {isFinalizar ? (
            <>
              <FieldGroup className="grid gap-3 md:grid-cols-3">
                <Field>
                  <FieldLabel>Contador retorno</FieldLabel>
                  <Input
                    type="number"
                    min={contadorRetornoBase}
                    value={contadorRetorno}
                    onChange={(event) => setContadorRetorno(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Condición retorno</FieldLabel>
                  <Select
                    value={condicionRetorno}
                    onValueChange={(value) =>
                      setCondicionRetorno(value as CondicionInspeccionAlquiler)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(CondicionInspeccionAlquiler).map((item) => (
                        <SelectItem key={item} value={item}>
                          {CONDICION_RETORNO_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Depósito disponible</FieldLabel>
                  <Input value={money(depositoDisponible)} readOnly />
                </Field>
              </FieldGroup>
              <FieldGroup className="grid gap-3 md:grid-cols-3">
                <Field>
                  <FieldLabel>Cargo daños</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cargoDanos}
                    onChange={(event) => setCargoDanos(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Cargo transporte</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cargoTransporte}
                    onChange={(event) => setCargoTransporte(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Cargo mora</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cargoMora}
                    onChange={(event) => setCargoMora(event.target.value)}
                  />
                </Field>
              </FieldGroup>
              <FieldGroup className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel>Depósito aplicado</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={depositoDisponible}
                    step="0.01"
                    value={depositoAplicado}
                    onChange={(event) => setDepositoAplicado(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Aplica depósito contra cargos finales. Cargos finales: {money(cargosFinales)}.
                  </p>
                </Field>
                <Field>
                  <FieldLabel>Depósito devuelto</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={depositoDisponible}
                    step="0.01"
                    value={depositoDevuelto}
                    onChange={(event) => setDepositoDevuelto(event.target.value)}
                    disabled={!contrato.depositoCobradoAt}
                  />
                </Field>
              </FieldGroup>
              {depositoDevueltoNumber > 0 ? (
                <FieldGroup className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Método devolución</FieldLabel>
                    <Select
                      value={metodoPagoDevolucionId}
                      onValueChange={setMetodoPagoDevolucionId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona método" />
                      </SelectTrigger>
                      <SelectContent>
                        {metodoOptions.map((metodo) => (
                          <SelectItem key={metodo.id} value={metodo.id}>
                            {metodo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {showRefundReference ? (
                    <Field>
                      <FieldLabel>N° operación / voucher</FieldLabel>
                      <Input
                        value={referenciaDevolucion}
                        onChange={(event) => setReferenciaDevolucion(event.target.value)}
                        placeholder="Código de operación o transferencia"
                      />
                    </Field>
                  ) : null}
                </FieldGroup>
              ) : null}
              <PaymentProofField
                proof={retornoProof}
                isUploading={isUploadingRetornoProof}
                required={depositoDevueltoNumber > 0 && needsRefundProof}
                onSelect={(file) => void handleRetornoProofSelected(file)}
                onClear={clearRetornoProof}
              />
              <Field>
                <FieldLabel>Notas de inspección</FieldLabel>
                <Textarea
                  value={notas}
                  onChange={(event) => setNotas(event.target.value)}
                  placeholder="Observaciones de retorno, daños o devolución"
                />
              </Field>
            </>
          ) : null}
          </div>
          <DialogFooter className="border-t p-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={isFinalizar ? "default" : "destructive"}
              disabled={
                finalizar.isPending ||
                anular.isPending ||
                isUploadingRetornoProof ||
                almacenesActivos.length === 0 ||
                bloqueoFinalizacion
              }
            >
              {finalizar.isPending || anular.isPending ? (
                <Loader2 data-icon="start" className="animate-spin" />
              ) : isFinalizar ? (
                <RotateCcw data-icon="start" />
              ) : (
                <XCircle data-icon="start" />
              )}
              {isFinalizar ? "Finalizar y devolver" : "Anular y devolver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditarContratoDialog({
  contrato,
  open,
  onOpenChange,
}: {
  contrato: ContratoAlquilerDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateAlquiler(contrato.id);
  const [form, setForm] = useState({
    fechaInicio: contrato.fechaInicio.slice(0, 10),
    mesesPlazo: String(contrato.mesesPlazo),
    copiasIncluidasMes: String(contrato.copiasIncluidasMes),
    precioMensual: String(contrato.precioMensual),
    precioCopiaExcedente: String(contrato.precioCopiaExcedente),
    depositoGarantia: String(contrato.depositoGarantia ?? 0),
    notas: contrato.notas ?? "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await update.mutateAsync({
        fechaInicio: form.fechaInicio,
        mesesPlazo: Number(form.mesesPlazo),
        copiasIncluidasMes: Number(form.copiasIncluidasMes),
        precioMensual: Number(form.precioMensual),
        precioCopiaExcedente: Number(form.precioCopiaExcedente),
        depositoGarantia: Number(form.depositoGarantia || 0),
        notas: form.notas || undefined,
      });
      toast.success("Contrato actualizado");
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-b">
          <SheetTitle>Editar borrador</SheetTitle>
          <SheetDescription>
            El equipo, cliente y contador inicial no se cambian aquí para no romper trazabilidad.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 px-4">
            <FieldGroup className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel>Fecha inicio</FieldLabel>
              <Input
                type="date"
                value={form.fechaInicio}
                onChange={(event) => setForm((current) => ({ ...current, fechaInicio: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Plazo en meses</FieldLabel>
              <Input
                type="number"
                min={1}
                max={36}
                value={form.mesesPlazo}
                onChange={(event) => setForm((current) => ({ ...current, mesesPlazo: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Copias incluidas</FieldLabel>
              <Input
                type="number"
                min={0}
                value={form.copiasIncluidasMes}
                onChange={(event) => setForm((current) => ({ ...current, copiasIncluidasMes: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Precio mensual</FieldLabel>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={form.precioMensual}
                onChange={(event) => setForm((current) => ({ ...current, precioMensual: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Precio por excedente</FieldLabel>
              <Input
                type="number"
                min={0}
                step="0.0001"
                value={form.precioCopiaExcedente}
                onChange={(event) => setForm((current) => ({ ...current, precioCopiaExcedente: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Depósito de garantía</FieldLabel>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.depositoGarantia}
                onChange={(event) => setForm((current) => ({ ...current, depositoGarantia: event.target.value }))}
              />
            </Field>
            </FieldGroup>
            <Field>
              <FieldLabel>Notas</FieldLabel>
              <Textarea
                value={form.notas}
                onChange={(event) => setForm((current) => ({ ...current, notas: event.target.value }))}
              />
            </Field>
          </div>
          <SheetFooter className="border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 data-icon="start" className="animate-spin" /> : <Pencil data-icon="start" />}
              Guardar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function PeriodosTable({ contrato }: { contrato: ContratoAlquilerDetalle }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table className="min-w-[1180px]">
        <TableHeader>
          <TableRow>
            <TableHead>Periodo</TableHead>
            <TableHead>Fechas</TableHead>
            <TableHead>Lecturas</TableHead>
            <TableHead>Copias</TableHead>
            <TableHead className="text-right">Excedente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[430px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contrato.periodos.map((periodo) => {
            const lecturaBase = periodo.lecturaInicial;
            const lecturaReferencia =
              periodo.lecturaFinal ??
              (periodo.estado === EstadoPeriodoAlquiler.ACTIVO
                ? contrato.contadorActual ?? contrato.contadorInicio
                : null);
            const copiasUsadas =
              lecturaBase != null && lecturaReferencia != null
                ? Math.max(0, lecturaReferencia - lecturaBase)
                : null;
            const copiasExcedentes =
              copiasUsadas != null
                ? Math.max(0, copiasUsadas - periodo.copiasIncluidas)
                : null;

            return (
              <TableRow key={periodo.id}>
                <TableCell className="font-medium">#{periodo.numeroPeriodo}</TableCell>
                <TableCell>
                  {formatDate(periodo.fechaInicio)} - {formatDate(periodo.fechaFin)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>
                      {lecturaBase?.toLocaleString("es-PE") ?? "Pendiente"} →{" "}
                      {periodo.lecturaFinal?.toLocaleString("es-PE") ?? "—"}
                    </span>
                    {periodo.estado === EstadoPeriodoAlquiler.ACTIVO ? (
                      <span className="text-xs text-muted-foreground">
                        No puede bajar de {(
                          lecturaBase ?? contrato.contadorActual ?? contrato.contadorInicio
                        ).toLocaleString("es-PE")}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {lecturaBase == null ? (
                    <span className="text-muted-foreground">
                      Incluye {periodo.copiasIncluidas.toLocaleString("es-PE")} al activarse
                    </span>
                  ) : (
                    <div className="flex flex-col">
                      <span>
                        {(copiasUsadas ?? periodo.copiasUsadas ?? 0).toLocaleString("es-PE")} usadas ·{" "}
                        {periodo.copiasIncluidas.toLocaleString("es-PE")} incluidas
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(copiasExcedentes ?? periodo.copiasExcedentes ?? 0).toLocaleString("es-PE")} excedentes
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">{renderCierrePeriodo(periodo)}</TableCell>
                <TableCell>{statusBadge(periodo.estado)}</TableCell>
                <TableCell className="text-right">
                  <PeriodoActions contrato={contrato} periodo={periodo} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function renderCierrePeriodo(periodo: PeriodoAlquilerItem) {
  if (!periodo.cierreCalculadoAt && periodo.estado === EstadoPeriodoAlquiler.ACTIVO) {
    return (
      <div className="flex flex-col">
        <span>Lectura pendiente</span>
        <span className="text-xs text-muted-foreground">calcula excedente</span>
      </div>
    );
  }
  if (!periodo.cierreCalculadoAt && periodo.estado === EstadoPeriodoAlquiler.PENDIENTE_BASE) {
    return (
      <div className="flex flex-col">
        <span>Pendiente</span>
        <span className="text-xs text-muted-foreground">mes futuro</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <span>
        {Number(periodo.totalCierre ?? 0) > 0 ? money(periodo.totalCierre) : "Sin excedente"}
      </span>
      <span className="text-xs text-muted-foreground">
        Excedente {money(periodo.montoExcedente)}
      </span>
    </div>
  );
}

function PeriodoActions({
  contrato,
  periodo,
}: {
  contrato: ContratoAlquilerDetalle;
  periodo: PeriodoAlquilerItem;
}) {
  const metodos = useMetodosPago();
  const cerrar = useCerrarPeriodoAlquiler(contrato.id, periodo.id);
  const cobrar = useCobrarPeriodoAlquiler(contrato.id, periodo.id);
  const cobrarBase = useCobrarBasePeriodoAlquiler(contrato.id, periodo.id);
  const [lecturaFinal, setLecturaFinal] = useState("");
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [paymentProof, setPaymentProof] = useState<NormalizedUploadedFile | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [cobroOpen, setCobroOpen] = useState(false);
  const metodoOptions = (metodos.data?.data.filter((m) => m.activo) ?? []) as MetodoPagoOption[];
  const selectedMetodo = metodoOptions.find((metodo) => metodo.id === metodoPagoId) ?? null;
  const needsProof = requiresPaymentEvidence(selectedMetodo);
  const showReference = showPaymentReference(selectedMetodo);
  const cierrePendiente = Number(periodo.totalCierre ?? 0);
  const mensualidadPendiente = Number(periodo.montoBase ?? 0);
  const totalBaseCobro = mensualidadPendiente;
  const lecturaMinima =
    periodo.lecturaInicial ?? contrato.contadorActual ?? contrato.contadorInicio;
  const lecturaFinalNumber = Number(lecturaFinal || lecturaMinima);
  const copiasPreview = Math.max(0, lecturaFinalNumber - lecturaMinima);
  const excedentePreview = Math.max(0, copiasPreview - periodo.copiasIncluidas);
  const cierrePreview = excedentePreview * Number(contrato.precioCopiaExcedente);
  const canCobrarBase =
    periodo.estado === EstadoPeriodoAlquiler.PENDIENTE_BASE &&
    (periodo.numeroPeriodo === 1 ||
      contrato.periodos.some(
        (item) =>
          item.numeroPeriodo === periodo.numeroPeriodo - 1 &&
          item.estado === EstadoPeriodoAlquiler.CERRADO,
      ));

  useEffect(() => {
    return () => revokeObjectPreviewUrl(paymentProof?.previewUrl);
  }, [paymentProof]);

  useEffect(() => {
    if (periodo.estado === EstadoPeriodoAlquiler.ACTIVO) {
      setLecturaFinal(String(lecturaMinima));
    }
  }, [lecturaMinima, periodo.id, periodo.estado]);

  async function handlePaymentProofSelected(file: File | null) {
    if (!file) return;
    setIsUploadingProof(true);
    try {
      const [uploadedFile] = await uploadSelectedFiles([file], {
        preset: "mixed",
        maxFiles: 1,
      });
      revokeObjectPreviewUrl(paymentProof?.previewUrl);
      setPaymentProof(uploadedFile);
      toast.success("Comprobante de pago adjuntado");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setIsUploadingProof(false);
    }
  }

  function clearPaymentProof() {
    revokeObjectPreviewUrl(paymentProof?.previewUrl);
    setPaymentProof(null);
  }

  async function run(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      toast.success(label);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  if (periodo.estado === EstadoPeriodoAlquiler.ACTIVO) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <Input
            className="w-40"
            type="number"
            min={lecturaMinima}
            placeholder="Lectura final"
            value={lecturaFinal}
            onChange={(event) => setLecturaFinal(event.target.value)}
          />
          <Button
            size="sm"
            className="shrink-0"
            disabled={cerrar.isPending || !lecturaFinal}
            onClick={() => {
              const lectura = Number(lecturaFinal);
              if (lectura < lecturaMinima) {
                toast.error(
                  `La lectura final no puede ser menor a ${lecturaMinima.toLocaleString("es-PE")}`,
                );
                return;
              }
              void run("Cierre de lectura registrado", () =>
                cerrar.mutateAsync({ lecturaFinal: lectura }),
              );
            }}
          >
            {cerrar.isPending ? <Loader2 data-icon="start" className="animate-spin" /> : <ClipboardList data-icon="start" />}
            Cerrar lectura
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {copiasPreview.toLocaleString("es-PE")} usadas · {excedentePreview.toLocaleString("es-PE")} excedentes · {money(cierrePreview)}
        </span>
      </div>
    );
  }

  if (periodo.estado === EstadoPeriodoAlquiler.PENDIENTE_BASE) {
    if (!canCobrarBase) {
      return (
        <span className="text-sm text-muted-foreground">
          Espera cierre del periodo anterior
        </span>
      );
    }

    return (
      <>
        <Button
          size="sm"
          disabled={cobrarBase.isPending}
          onClick={() => setCobroOpen(true)}
        >
          {cobrarBase.isPending ? (
            <Loader2 data-icon="start" className="animate-spin" />
          ) : (
            <Banknote data-icon="start" />
          )}
          Cobrar mensualidad #{periodo.numeroPeriodo}
        </Button>
        <Dialog open={cobroOpen} onOpenChange={setCobroOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Cobrar mensualidad #{periodo.numeroPeriodo}</DialogTitle>
              <DialogDescription>
                Esta acción cobra solo la base mensual de este periodo y lo activa.
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!metodoPagoId) {
                  toast.error("Selecciona un método de pago");
                  return;
                }
                if (needsProof && !paymentProof?.filename) {
                  toast.error("Adjunta el comprobante del pago digital");
                  return;
                }
                void run("Mensualidad cobrada", () =>
                  cobrarBase
                    .mutateAsync({
                      metodoPagoId,
                      referenciaPago: referenciaPago || undefined,
                      evidenciaPagoFilename: paymentProof?.filename,
                    })
                    .then((result) => {
                      setCobroOpen(false);
                      return result;
                    }),
                );
              }}
            >
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Detalle del cobro</p>
                <p className="mt-1 text-muted-foreground">
                  Mensualidad periodo #{periodo.numeroPeriodo}:{" "}
                  {money(mensualidadPendiente)}
                </p>
                <p className="mt-2 font-medium">
                  Total: {money(totalBaseCobro)}
                </p>
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel>Método de pago</FieldLabel>
                  <Select value={metodoPagoId} onValueChange={setMetodoPagoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona método" />
                    </SelectTrigger>
                    <SelectContent>
                      {metodoOptions.map((metodo) => (
                        <SelectItem key={metodo.id} value={metodo.id}>
                          {metodo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {showReference ? (
                  <Field>
                    <FieldLabel>N° operación / voucher</FieldLabel>
                    <Input
                      value={referenciaPago}
                      onChange={(event) => setReferenciaPago(event.target.value)}
                      placeholder="Código de operación o transferencia"
                    />
                  </Field>
                ) : null}
                {needsProof ? (
                  <PaymentProofField
                    proof={paymentProof}
                    isUploading={isUploadingProof}
                    required
                    onSelect={(file) => void handlePaymentProofSelected(file)}
                    onClear={clearPaymentProof}
                  />
                ) : null}
              </FieldGroup>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCobroOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={cobrarBase.isPending}>
                  {cobrarBase.isPending ? (
                    <Loader2 data-icon="start" className="animate-spin" />
                  ) : (
                    <Banknote data-icon="start" />
                  )}
                  Cobrar {money(totalBaseCobro)}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (periodo.estado === EstadoPeriodoAlquiler.PENDIENTE_CIERRE) {
    if (cierrePendiente <= 0) {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={cobrar.isPending}
          onClick={() =>
            void run("Periodo cerrado sin excedente", () => cobrar.mutateAsync({}))
          }
        >
          {cobrar.isPending ? (
            <Loader2 data-icon="start" className="animate-spin" />
          ) : (
            <CheckCircle2 data-icon="start" />
          )}
          Cerrar sin excedente
        </Button>
      );
    }

    return (
      <>
        <Button size="sm" disabled={cobrar.isPending} onClick={() => setCobroOpen(true)}>
          {cobrar.isPending ? (
            <Loader2 data-icon="start" className="animate-spin" />
          ) : (
            <Banknote data-icon="start" />
          )}
          Cobrar excedente
        </Button>
        <Dialog open={cobroOpen} onOpenChange={setCobroOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Cobrar excedente del periodo #{periodo.numeroPeriodo}</DialogTitle>
              <DialogDescription>
                Cobra solo las copias excedentes calculadas con la lectura final. Soporte se gestiona desde su propio módulo.
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!metodoPagoId) {
                  toast.error("Selecciona un método de pago");
                  return;
                }
                if (needsProof && !paymentProof?.filename) {
                  toast.error("Adjunta el comprobante del pago digital");
                  return;
                }
                void run("Cobro registrado", () =>
                  cobrar
                    .mutateAsync({
                      metodoPagoId,
                      referenciaPago: referenciaPago || undefined,
                      evidenciaPagoFilename: paymentProof?.filename,
                    })
                    .then((result) => {
                      setCobroOpen(false);
                      return result;
                    }),
                );
              }}
            >
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Detalle del cobro</p>
                <p className="mt-1 text-muted-foreground">
                  Excedente periodo #{periodo.numeroPeriodo}: {money(cierrePendiente)}
                </p>
                <p className="mt-2 font-medium">Total: {money(cierrePendiente)}</p>
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel>Método de pago</FieldLabel>
                  <Select value={metodoPagoId} onValueChange={setMetodoPagoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona método" />
                    </SelectTrigger>
                    <SelectContent>
                      {metodoOptions.map((metodo) => (
                        <SelectItem key={metodo.id} value={metodo.id}>
                          {metodo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {showReference ? (
                  <Field>
                    <FieldLabel>N° operación / voucher</FieldLabel>
                    <Input
                      value={referenciaPago}
                      onChange={(event) => setReferenciaPago(event.target.value)}
                      placeholder="Código de operación o transferencia"
                    />
                  </Field>
                ) : null}
                {needsProof ? (
                  <PaymentProofField
                    proof={paymentProof}
                    isUploading={isUploadingProof}
                    required
                    onSelect={(file) => void handlePaymentProofSelected(file)}
                    onClear={clearPaymentProof}
                  />
                ) : null}
              </FieldGroup>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCobroOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={cobrar.isPending}>
                  {cobrar.isPending ? (
                    <Loader2 data-icon="start" className="animate-spin" />
                  ) : (
                    <Banknote data-icon="start" />
                  )}
                  Cobrar excedente {money(cierrePendiente)}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <span className="text-sm text-muted-foreground">—</span>;
}
