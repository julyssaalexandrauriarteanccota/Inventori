"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Download,
  FileMinus,
  FilePlus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { EstadoComprobante, TipoDocumento } from "@erp/shared";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAnularComprobante,
  useComprobante,
  useComprobanteEnvios,
  useConsultarSunatComprobante,
  useReintentarComprobante,
  useSaldoNoAcreditado,
} from "@/hooks/use-facturacion";

interface ComprobanteDetalleData {
  id: string;
  numero: string;
  serie?: string;
  correlativo?: string | number;
  tipo: TipoDocumento;
  estado: EstadoComprobante;
  fechaEmision: string;
  cdrRecibidaAt?: string | null;
  ambiente?: string;
  total: number;
  subtotal: number;
  igv: number;
  moneda?: string;
  clienteNombre?: string;
  clienteDocNum?: string;
  clienteTipoDoc?: string;
  clienteDireccion?: string | null;
  hashSunat?: string | null;
  xmlUrl?: string | null;
  cdrUrl?: string | null;
  pdfUrl?: string | null;
  motivoBaja?: string | null;
  detallesFiscales?: Array<{
    item: number;
    codigo?: string | null;
    codigoInterno?: string | null;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    igvMonto?: number;
    importeTotal?: number;
    igv?: number;
    total?: number;
  }>;
  notasCredito?: Array<{
    id: string;
    numero: string;
    motivo?: string | null;
    motivoCodigo?: string | null;
    estado: EstadoComprobante;
    monto?: number;
    total?: number;
    tipo?: string | null;
  }>;
  notasDebito?: Array<{
    id: string;
    numero: string;
    motivo?: string | null;
    motivoCodigo?: string | null;
    estado: EstadoComprobante;
    total: number;
  }>;
  snapshotEmisorJson?: unknown;
  snapshotClienteJson?: unknown;
  snapshotItemsJson?: unknown;
  ventaId?: string | null;
  venta?: { id: string; numero: string } | null;
  comprobanteOrigen?: {
    id: string;
    numero: string;
    tipo: TipoDocumento;
    estado: EstadoComprobante;
    total: number;
  } | null;
}

const ESTADO_TONE: Record<string, string> = {
  [EstadoComprobante.PENDIENTE_ENVIO]:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  [EstadoComprobante.EN_PROCESO_SUNAT]: "bg-primary/10 text-primary",
  [EstadoComprobante.ACEPTADO]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  [EstadoComprobante.ACEPTADO_CON_OBSERVACIONES]:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  [EstadoComprobante.RECHAZADO]:
    "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  [EstadoComprobante.BAJA_PENDIENTE]:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  [EstadoComprobante.ANULADO]:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400",
};

function fmtMoney(n: number, moneda = "PEN") {
  const symbol = moneda === "PEN" ? "S/" : moneda;
  return `${symbol} ${(n ?? 0).toFixed(2)}`;
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-muted-foreground">Sin datos.</p>;
  }
  return (
    <pre className="max-h-[600px] overflow-auto rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function ComprobanteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const detalleQuery = useComprobante(id);
  const enviosQuery = useComprobanteEnvios(id);
  const reintentar = useReintentarComprobante();
  const consultar = useConsultarSunatComprobante();
  const anular = useAnularComprobante();
  const saldoQuery = useSaldoNoAcreditado(id);

  const [anularOpen, setAnularOpen] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState("");

  const data = detalleQuery.data?.data as ComprobanteDetalleData | undefined;

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  const pdfHref = `${apiBase}/facturacion/comprobantes/${id}/pdf`;
  const xmlHref = `${apiBase}/facturacion/comprobantes/${id}/xml`;
  const cdrHref = `${apiBase}/facturacion/comprobantes/${id}/cdr`;

  const puedeAnular = useMemo(() => {
    if (!data) return false;
    if (
      data.estado !== EstadoComprobante.ACEPTADO &&
      data.estado !== EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
    )
      return false;
    if (data.tipo === TipoDocumento.BOLETA) return false; // boletas se anulan vía NC, no RA
    const fecha = new Date(data.cdrRecibidaAt ?? data.fechaEmision);
    const ahora = new Date();
    const dias = (ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24);
    return dias <= 7;
  }, [data]);

  const puedeAnularConNc = useMemo(() => {
    if (!data) return false;
    return (
      data.tipo === TipoDocumento.BOLETA &&
      data.estado === EstadoComprobante.ACEPTADO
    );
  }, [data]);

  const notaCreditoAnulacion = useMemo(() => {
    if (!data?.notasCredito?.length || data.tipo !== TipoDocumento.BOLETA) {
      return null;
    }
    return (
      data.notasCredito.find((nota) => {
        const monto = Number(nota.monto ?? nota.total ?? 0);
        return nota.estado === EstadoComprobante.ACEPTADO && monto >= data.total;
      }) ?? null
    );
  }, [data]);

  const motivoTrimmed = motivoBaja.trim();
  const motivoValido = motivoTrimmed.length >= 10 && motivoTrimmed.length <= 200;

  const handleAnular = () => {
    if (!motivoValido) {
      toast.error("El motivo debe tener entre 10 y 200 caracteres");
      return;
    }
    anular.mutate(
      { id, motivo: motivoTrimmed },
      {
        onSuccess: () => {
          toast.success("Comunicación de baja iniciada");
          setAnularOpen(false);
          setMotivoBaja("");
        },
        onError: (e) => {
          toast.error(e instanceof Error ? e.message : "Error al anular");
        },
      },
    );
  };

  if (detalleQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando comprobante…
      </div>
    );
  }

  if (detalleQuery.isError || !data) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-rose-600">
          No se pudo cargar el comprobante.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header con acciones */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => router.back()}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="font-mono text-2xl font-semibold tracking-tight">
              {data.numero}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className={`border-0 ${ESTADO_TONE[data.estado] ?? ""}`}
              >
                {data.estado}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(data.fechaEmision).toLocaleString("es-PE")}
              </span>
              {data.ambiente ? (
                <Badge variant="outline" className="text-[10px]">
                  {data.ambiente}
                </Badge>
              ) : null}
              {notaCreditoAnulacion ? (
                <Link href="#notas-credito-vinculadas">
                  <Badge
                    variant="outline"
                    className="border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-900 dark:bg-neutral-950 dark:text-neutral-300"
                  >
                    Anulada por NC {notaCreditoAnulacion.numero}
                  </Badge>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.venta ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/ventas/${data.venta.id}`}>Ver venta</Link>
            </Button>
          ) : null}
          {data.pdfUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={pdfHref} target="_blank" rel="noreferrer">
                <Download className="size-3.5" /> PDF
              </a>
            </Button>
          ) : null}
          {data.xmlUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={xmlHref} target="_blank" rel="noreferrer">
                <Download className="size-3.5" /> XML
              </a>
            </Button>
          ) : null}
          {data.cdrUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={cdrHref} target="_blank" rel="noreferrer">
                <Download className="size-3.5" /> CDR
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={consultar.isPending}
            onClick={() =>
              consultar.mutate(id, {
                onSuccess: () => toast.success("Consulta SUNAT realizada"),
                onError: (e) =>
                  toast.error(
                    e instanceof Error ? e.message : "Error al consultar",
                  ),
              })
            }
          >
            <RefreshCw
              className={`size-3.5 ${consultar.isPending ? "animate-spin" : ""}`}
            />
            Consultar SUNAT
          </Button>
          {data.estado === EstadoComprobante.RECHAZADO ||
          data.estado === EstadoComprobante.PENDIENTE_ENVIO ? (
            <Button
              size="sm"
              disabled={reintentar.isPending}
              onClick={() =>
                reintentar.mutate(id, {
                  onSuccess: () => toast.success("Reintento encolado"),
                  onError: (e) =>
                    toast.error(
                      e instanceof Error ? e.message : "Error al reintentar",
                    ),
                })
              }
            >
              {reintentar.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Reintentar envío
            </Button>
          ) : null}
          {puedeAnular ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setAnularOpen(true)}
            >
              <Ban className="size-3.5" /> Comunicar baja
            </Button>
          ) : null}
          {puedeAnularConNc ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                router.push(
                  `/comprobantes/nueva-nc?origen=${id}&motivo=01&anula=1`,
                )
              }
            >
              <Ban className="size-3.5" /> Anular con NC
            </Button>
          ) : null}
          {data.tipo === TipoDocumento.FACTURA ||
          data.tipo === TipoDocumento.BOLETA ||
          data.tipo === TipoDocumento.NOTA_CREDITO ||
          data.tipo === TipoDocumento.NOTA_DEBITO ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={!saldoQuery.data?.data.puedeEmitirNc}
                title={
                  saldoQuery.data?.data.bloqueoPorNcEnProceso
                    ? `Bloqueado: NC ${saldoQuery.data.data.bloqueoPorNcEnProceso.numero} en estado ${saldoQuery.data.data.bloqueoPorNcEnProceso.estado}`
                    : undefined
                }
                onClick={() =>
                  router.push(`/comprobantes/nueva-nc?origen=${id}&motivo=03`)
                }
              >
                <FileMinus className="size-3.5" /> Generar NC
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  data.estado !== EstadoComprobante.ACEPTADO &&
                  data.estado !==
                    EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
                }
                onClick={() =>
                  router.push(`/comprobantes/nueva-nd?origen=${id}&motivo=03`)
                }
              >
                <FilePlus className="size-3.5" /> Generar ND
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="detalle" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="snapshot">Snapshot fiscal</TabsTrigger>
          <TabsTrigger value="logs">Logs SUNAT</TabsTrigger>
          <TabsTrigger value="vinculadas">Vinculadas</TabsTrigger>
        </TabsList>

        {/* Tab Detalle */}
        <TabsContent value="detalle" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Datos del comprobante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Tipo" value={data.tipo} />
                {data.comprobanteOrigen ? (
                  <Row
                    label="Origen"
                    value={
                      <Link
                        href={`/comprobantes/${data.comprobanteOrigen.id}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {data.comprobanteOrigen.numero}
                      </Link>
                    }
                  />
                ) : null}
                <Row
                  label="Serie / correlativo"
                  value={`${data.serie ?? "—"} / ${data.correlativo ?? "—"}`}
                />
                <Row label="Moneda" value={data.moneda ?? "PEN"} />
                <Row label="Subtotal" value={fmtMoney(data.subtotal, data.moneda)} />
                <Row label="IGV" value={fmtMoney(data.igv, data.moneda)} />
                <Row
                  label="Total"
                  value={fmtMoney(data.total, data.moneda)}
                  emphasized
                />
                {data.hashSunat ? (
                  <Row
                    label="Hash SUNAT"
                    value={
                      <span className="font-mono text-[10px] break-all">
                        {data.hashSunat}
                      </span>
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Nombre" value={data.clienteNombre ?? "—"} />
                <Row
                  label="Documento"
                  value={
                    <span className="font-mono">
                      {data.clienteTipoDoc ?? ""} {data.clienteDocNum ?? "—"}
                    </span>
                  }
                />
                {data.clienteDireccion ? (
                  <Row label="Dirección" value={data.clienteDireccion} />
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ítems</CardTitle>
              <CardDescription>
                Detalles fiscales registrados en el comprobante.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.detallesFiscales && data.detallesFiscales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2">#</th>
                        <th className="py-2 pr-2">Código</th>
                        <th className="py-2 pr-2">Descripción</th>
                        <th className="py-2 pr-2 text-right">Cant.</th>
                        <th className="py-2 pr-2 text-right">P. unit.</th>
                        <th className="py-2 pr-2 text-right">IGV</th>
                        <th className="py-2 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.detallesFiscales.map((d) => (
                        <tr key={d.item} className="border-b last:border-0">
                          <td className="py-2 pr-2">{d.item}</td>
                          <td className="py-2 pr-2 font-mono text-xs">
                            {d.codigo ?? d.codigoInterno ?? "—"}
                          </td>
                          <td className="py-2 pr-2">{d.descripcion}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {d.cantidad}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {fmtMoney(d.precioUnitario, data.moneda)}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {fmtMoney(Number(d.igvMonto ?? d.igv ?? 0), data.moneda)}
                          </td>
                          <td className="py-2 text-right font-medium tabular-nums">
                            {fmtMoney(
                              Number(d.importeTotal ?? d.total ?? 0),
                              data.moneda,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin detalles fiscales registrados.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Snapshot */}
        <TabsContent value="snapshot" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Snapshot del emisor</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock value={data.snapshotEmisorJson} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Snapshot del cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock value={data.snapshotClienteJson} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Snapshot de ítems</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock value={data.snapshotItemsJson} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Logs SUNAT */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Logs de envío SUNAT</CardTitle>
              <CardDescription>
                Historial de eventos por intento de envío.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enviosQuery.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Cargando…
                </div>
              ) : enviosQuery.data?.data.length ? (
                <div className="space-y-2">
                  {enviosQuery.data.data.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-md border p-3 text-xs"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {log.tipoEvento}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {log.estado}
                        </Badge>
                        <span className="text-muted-foreground">
                          intento {log.intento}
                        </span>
                        <span className="ml-auto text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("es-PE")}
                        </span>
                      </div>
                      {log.codigoRespuesta ? (
                        <p className="font-mono text-[10px]">
                          Código: {log.codigoRespuesta}
                        </p>
                      ) : null}
                      {log.mensaje ? (
                        <p className="mt-1 text-muted-foreground">
                          {log.mensaje}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin envíos registrados.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Vinculadas */}
        <TabsContent value="vinculadas" className="space-y-4">
          {saldoQuery.data?.data ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Saldo no acreditado</CardTitle>
                <CardDescription>
                  Doc 08 §4 — total origen menos NCs aceptadas. El sistema
                  bloquea emitir NC si el saldo es 0 o hay otra NC en proceso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total origen</p>
                    <p className="font-semibold tabular-nums">
                      {fmtMoney(
                        saldoQuery.data.data.totalOrigen,
                        data.moneda,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Acreditado</p>
                    <p className="tabular-nums">
                      {fmtMoney(saldoQuery.data.data.acreditado, data.moneda)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Saldo no acreditado
                    </p>
                    <p
                      className={`font-semibold tabular-nums ${
                        saldoQuery.data.data.saldoNoAcreditado <= 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {fmtMoney(
                        saldoQuery.data.data.saldoNoAcreditado,
                        data.moneda,
                      )}
                    </p>
                  </div>
                </div>
                {saldoQuery.data.data.bloqueoPorNcEnProceso ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    NC{" "}
                    <span className="font-mono">
                      {saldoQuery.data.data.bloqueoPorNcEnProceso.numero}
                    </span>{" "}
                    en estado{" "}
                    {saldoQuery.data.data.bloqueoPorNcEnProceso.estado}{" "}
                    bloquea la emisión de otra NC.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card id="notas-credito-vinculadas">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notas de crédito</CardTitle>
            </CardHeader>
            <CardContent>
              {data.notasCredito && data.notasCredito.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {data.notasCredito.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <Link
                        href={`/comprobantes/${n.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {n.numero}
                      </Link>
                      <span className="flex-1 px-3 text-xs text-muted-foreground">
                        {n.tipo ? `${n.tipo} - ` : ""}
                        {n.motivo ?? "—"}
                      </span>
                      <Badge
                        variant="outline"
                        className={`border-0 ${ESTADO_TONE[n.estado] ?? ""}`}
                      >
                        {n.estado}
                      </Badge>
                      <span className="ml-3 font-medium tabular-nums">
                        {fmtMoney(Number(n.monto ?? n.total ?? 0), data.moneda)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin notas de crédito vinculadas.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notas de débito</CardTitle>
            </CardHeader>
            <CardContent>
              {data.notasDebito && data.notasDebito.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {data.notasDebito.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <Link
                        href={`/comprobantes/${n.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {n.numero}
                      </Link>
                      <span className="flex-1 px-3 text-xs text-muted-foreground">
                        {n.motivoCodigo ? `${n.motivoCodigo} - ` : ""}
                        {n.motivo ?? "—"}
                      </span>
                      <Badge
                        variant="outline"
                        className={`border-0 ${ESTADO_TONE[n.estado] ?? ""}`}
                      >
                        {n.estado}
                      </Badge>
                      <span className="ml-3 font-medium tabular-nums">
                        {fmtMoney(n.total, data.moneda)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin notas de débito vinculadas.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal anular */}
      <Dialog open={anularOpen} onOpenChange={setAnularOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comunicar baja a SUNAT</DialogTitle>
            <DialogDescription>
              Se generará un resumen RA. Esta acción no se puede revertir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="motivo"
              value={motivoBaja}
              onChange={(e) => setMotivoBaja(e.target.value)}
              placeholder="Ej. Error en datos del cliente"
              minLength={10}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              Entre 10 y 200 caracteres ({motivoTrimmed.length}/200).
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAnularOpen(false)}
              disabled={anular.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={anular.isPending || !motivoValido}
              onClick={handleAnular}
            >
              {anular.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Comunicar baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={
          emphasized ? "text-base font-semibold text-primary" : "text-right"
        }
      >
        {value}
      </span>
    </div>
  );
}
