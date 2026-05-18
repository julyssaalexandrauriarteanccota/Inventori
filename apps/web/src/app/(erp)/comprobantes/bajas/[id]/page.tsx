"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EstadoComunicacionBaja, TipoEnvio } from "@erp/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useComprobanteEnvios,
  useComunicacionBaja,
  useConsultarEstadoBaja,
  type ComprobanteEnvioLogItem,
} from "@/hooks/use-facturacion";

const ESTADO_TONE: Record<string, string> = {
  [EstadoComunicacionBaja.PENDIENTE]:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  [EstadoComunicacionBaja.EN_PROCESO]: "bg-primary/10 text-primary",
  [EstadoComunicacionBaja.ACEPTADA]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  [EstadoComunicacionBaja.RECHAZADA]:
    "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

function formatFechaLarga(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function formatFechaCorta(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ComunicacionBajaDetallePage({ params }: PageProps) {
  const { id } = use(params);
  const detalleQuery = useComunicacionBaja(id);
  const consultar = useConsultarEstadoBaja();

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const baja = detalleQuery.data?.data;
  const comprobanteId = baja?.comprobanteId;
  const enviosQuery = useComprobanteEnvios(comprobanteId);

  const logsBaja = useMemo<ComprobanteEnvioLogItem[]>(() => {
    const all = enviosQuery.data?.data ?? [];
    // Filtrar logs relacionados al flujo de baja: COMUNICACION_BAJA + CONSULTA_TICKET.
    return all
      .filter((l) => {
        const tipo = (l as ComprobanteEnvioLogItem & { tipo?: string }).tipo;
        return (
          tipo === TipoEnvio.COMUNICACION_BAJA ||
          tipo === TipoEnvio.CONSULTA_TICKET ||
          /BAJA|TICKET/i.test(l.tipoEvento ?? "")
        );
      })
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [enviosQuery.data]);

  if (detalleQuery.isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (detalleQuery.isError || !baja) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">
          No se pudo cargar la comunicación de baja.
        </p>
        <Button variant="outline" asChild>
          <Link href="/comprobantes/bajas">
            <ArrowLeft className="mr-2 size-4" /> Volver al listado
          </Link>
        </Button>
      </div>
    );
  }

  const estadoTone = ESTADO_TONE[baja.estado] ?? "";
  const aceptada = baja.estado === EstadoComunicacionBaja.ACEPTADA;
  const rechazada = baja.estado === EstadoComunicacionBaja.RECHAZADA;
  const enProceso =
    baja.estado === EstadoComunicacionBaja.PENDIENTE ||
    baja.estado === EstadoComunicacionBaja.EN_PROCESO;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/comprobantes/bajas">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Baja {baja.identificadorBaja}
            </h1>
            <p className="text-sm text-muted-foreground">
              Comunicación de baja (RA) ante SUNAT
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`border-0 ${estadoTone}`}>
            {baja.estado}
          </Badge>
          {enProceso && baja.ticketSunat ? (
            <Button
              variant="outline"
              size="sm"
              disabled={consultar.isPending}
              onClick={() => {
                consultar.mutate(baja.id, {
                  onSuccess: () => toast.success("Consulta a SUNAT enviada"),
                  onError: (e) =>
                    toast.error(
                      e instanceof Error ? e.message : "Error al consultar",
                    ),
                });
              }}
            >
              {consultar.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Consultar estado
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Datos de la baja */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de la baja</CardTitle>
            <CardDescription>
              Información declarada en el resumen RA enviado a SUNAT.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Identificador" value={baja.identificadorBaja} mono />
            <Field
              label="Comprobante anulado"
              value={
                baja.comprobante ? (
                  <Link
                    href={`/comprobantes/${baja.comprobante.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {baja.comprobante.numero} ({baja.comprobante.tipo})
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Field
              label="Cliente"
              value={
                baja.comprobante?.clienteNombre ? (
                  <span>
                    {baja.comprobante.clienteNombre}
                    {baja.comprobante.clienteDocNum ? (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {baja.comprobante.clienteDocNum}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <Field
              label="Fecha del comprobante"
              value={formatFechaCorta(baja.comprobante?.fechaEmision)}
            />
            <Field
              label="Fecha de baja (creación)"
              value={formatFechaLarga(baja.createdAt)}
            />
            <Field label="Plazo límite" value={formatFechaCorta(baja.deadline)} />
            <Field label="Iniciada por" value={baja.iniciadoPor ?? "—"} />
            <Field label="Ambiente" value={baja.ambiente ?? "—"} />
            <div>
              <p className="text-xs text-muted-foreground">Motivo declarado</p>
              <p className="mt-1 whitespace-pre-line rounded-md border bg-muted/40 p-3 text-sm">
                {baja.motivo ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SUNAT y descargas */}
        <Card>
          <CardHeader>
            <CardTitle>SUNAT y descargas</CardTitle>
            <CardDescription>
              Ticket, CDR y archivos firmados de esta comunicación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field
              label="Ticket SUNAT"
              value={
                baja.ticketSunat ? (
                  <span className="font-mono text-xs">{baja.ticketSunat}</span>
                ) : (
                  "—"
                )
              }
            />
            <Field
              label="CDR recibido"
              value={formatFechaLarga(baja.cdrRecibidaAt)}
            />
            <Field
              label="Código respuesta"
              value={baja.cdrCodigo ?? "—"}
              mono
            />
            <Field label="Mensaje SUNAT" value={baja.cdrMensaje ?? "—"} />
            {rechazada && baja.errorMessage ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <p className="mb-1 font-medium">Motivo del rechazo</p>
                {baja.errorMessage}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`${apiBase}/facturacion/comunicaciones-baja/${baja.id}/xml`}
                >
                  <Download className="mr-2 size-4" /> Descargar XML
                </a>
              </Button>
              {aceptada ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`${apiBase}/facturacion/comunicaciones-baja/${baja.id}/cdr`}
                  >
                    <Download className="mr-2 size-4" /> Descargar CDR
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos SUNAT</CardTitle>
          <CardDescription>
            Trazabilidad cronológica del envío y polling de la comunicación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enviosQuery.isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : logsBaja.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay eventos registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Intento</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Mensaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsBaja.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("es-PE")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.tipoEvento}
                      </TableCell>
                      <TableCell className="text-xs">{log.intento}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.codigoRespuesta ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[420px] truncate text-xs">
                        {log.mensaje ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`col-span-2 text-sm ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
