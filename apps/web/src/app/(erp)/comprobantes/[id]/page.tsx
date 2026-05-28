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
  Printer,
  RefreshCw,
} from "lucide-react";
import type { FormatoImpresionDocumento } from "@erp/shared";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmarBajaModal } from "@/components/modals/confirmar-baja-modal";
import {
  explainSunatRejectMessage,
  type SunatErrorExplanation,
} from "@/lib/sunat-errors";
import {
  ThermalReceiptDialog,
  type ThermalReceiptData,
} from "@/components/pos/thermal-receipt";
import {
  useComprobante,
  useComprobanteEnvios,
  useConfigFiscal,
  useConsultarSunatComprobante,
  useReintentarComprobante,
  useSaldoNoAcreditado,
} from "@/hooks/use-facturacion";
import { usePublicBranding } from "@/hooks/use-public-branding";
import { api } from "@/lib/api";
import {
  buildEmpresaPrintData,
  comprobanteToPrintData,
} from "@/app/(erp)/comprobantes/_components/comprobante-print-utils";

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

type MoneyValue = number | string | null | undefined;
type ArtifactKind = "pdf" | "xml" | "cdr";

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

function toMoneyNumber(value: MoneyValue) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function fmtMoney(n: MoneyValue, moneda = "PEN") {
  const symbol = moneda === "PEN" ? "S/" : moneda;
  return `${symbol} ${toMoneyNumber(n).toFixed(2)}`;
}

function isComprobanteAceptadoSunat(estado?: EstadoComprobante) {
  return (
    estado === EstadoComprobante.ACEPTADO ||
    estado === EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
  );
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function getSunatDiagnostics(log: {
  requestPayload?: unknown | null;
  responsePayload?: unknown | null;
}) {
  const request = asRecord(log.requestPayload);
  const response = asRecord(log.responsePayload);
  const diagnostics = asRecord(request?.diagnostics);
  if (!diagnostics && !response?.responseSnippet) return null;

  return {
    fileName: request?.fileName,
    xmlFileName: request?.xmlFileName,
    zipSha256: request?.zipSha256,
    endpoint: request?.endpoint,
    credentialsSource: request?.credentialsSource,
    usernameMode: request?.usernameMode,
    diagnostics,
    responseSnippet: response?.responseSnippet,
  };
}

function DiagnosticValue({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="break-words font-mono text-[11px] text-foreground">
        {text}
      </p>
    </div>
  );
}

function SunatDiagnostics({
  log,
}: {
  log: { requestPayload?: unknown | null; responsePayload?: unknown | null };
}) {
  const data = getSunatDiagnostics(log);
  if (!data) return null;

  const diagnostics = data.diagnostics;
  return (
    <details className="mt-3 rounded-md border bg-muted/20 p-2">
      <summary className="cursor-pointer text-[11px] font-semibold">
        Diagnóstico técnico del envío
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DiagnosticValue label="Archivo ZIP" value={data.fileName} />
        <DiagnosticValue label="Archivo XML" value={data.xmlFileName} />
        <DiagnosticValue label="Endpoint" value={data.endpoint} />
        <DiagnosticValue
          label="Credenciales"
          value={data.credentialsSource}
        />
        <DiagnosticValue label="Modo usuario" value={data.usernameMode} />
        <DiagnosticValue label="UBL" value={diagnostics?.ublVersionId} />
        <DiagnosticValue
          label="Customization"
          value={diagnostics?.customizationId}
        />
        <DiagnosticValue label="Tipo CPE" value={diagnostics?.invoiceTypeCode} />
        <DiagnosticValue label="Encoding" value={diagnostics?.declaredEncoding} />
        <DiagnosticValue label="Raíz" value={diagnostics?.rootName} />
        <DiagnosticValue label="Fecha" value={diagnostics?.issueDate} />
        <DiagnosticValue label="Hora" value={diagnostics?.issueTime} />
        <DiagnosticValue label="Notas" value={diagnostics?.noteCount} />
        <DiagnosticValue
          label="ProfileID"
          value={diagnostics?.hasProfileId}
        />
        <DiagnosticValue
          label="Signature Id"
          value={diagnostics?.hasSignatureId}
        />
        <DiagnosticValue
          label="Reference URI"
          value={diagnostics?.signatureReferenceUri}
        />
        <DiagnosticValue label="URI cac" value={diagnostics?.cacSignatureUri} />
        <DiagnosticValue label="Bytes ZIP" value={diagnostics?.zipEntrySize} />
        <DiagnosticValue
          label="Primeros bytes"
          value={diagnostics?.zipFirstBytesHex}
        />
        <DiagnosticValue label="SHA XML" value={diagnostics?.xmlSha256} />
        <DiagnosticValue label="SHA ZIP" value={data.zipSha256} />
      </div>
      {data.responseSnippet ? (
        <pre className="mt-3 max-h-32 overflow-auto rounded border bg-background p-2 text-[10px] leading-relaxed">
          {String(data.responseSnippet)}
        </pre>
      ) : null}
    </details>
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
  const saldoQuery = useSaldoNoAcreditado(id);

  const [anularOpen, setAnularOpen] = useState(false);
  const [downloadingArtifact, setDownloadingArtifact] =
    useState<ArtifactKind | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printFormat, setPrintFormat] =
    useState<FormatoImpresionDocumento>("A4");

  // Company data for print preview
  const configFiscalQ = useConfigFiscal();
  const publicBrandingQ = usePublicBranding();

  const data = detalleQuery.data?.data as ComprobanteDetalleData | undefined;
  const estadoAceptadoSunat = isComprobanteAceptadoSunat(data?.estado);
  const saldoNoAcreditado = estadoAceptadoSunat
    ? saldoQuery.data?.data
    : undefined;
  const mostrarSaldoNoAcreditado = !!saldoNoAcreditado;

  const printData = useMemo<ThermalReceiptData | null>(() => {
    if (!data) return null;
    const configFiscal = configFiscalQ.data?.data ?? null;
    const empresaPublica = publicBrandingQ.data?.data ?? null;
    const empresa = buildEmpresaPrintData(
      configFiscal,
      empresaPublica,
      data.snapshotEmisorJson,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return comprobanteToPrintData(data as any, empresa, configFiscal?.pieImpresion ?? undefined);
  }, [data, configFiscalQ.data, publicBrandingQ.data]);

  const openPrintPreview = (format: FormatoImpresionDocumento) => {
    setPrintFormat(format);
    setPrintOpen(true);
  };

  const downloadArtifact = async (kind: ArtifactKind) => {
    setDownloadingArtifact(kind);
    try {
      const result = await api.download(
        `/facturacion/comprobantes/${id}/${kind}`,
      );
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        result.filename ??
        `${data?.numero ?? "comprobante"}.${kind === "cdr" ? "cdr.zip" : kind}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `No se pudo descargar ${kind.toUpperCase()}`,
      );
    } finally {
      setDownloadingArtifact(null);
    }
  };

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
        return (
          nota.estado === EstadoComprobante.ACEPTADO &&
          monto >= toMoneyNumber(data.total)
        );
      }) ?? null
    );
  }, [data]);

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
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            disabled={!data}
            onClick={() => openPrintPreview("A4")}
          >
            <Printer className="size-3.5" />
            A4
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            disabled={!data}
            onClick={() => openPrintPreview("TICKET")}
          >
            <Printer className="size-3.5" />
            Ticket
          </Button>
          {data.xmlUrl ? (
            <Button
              variant="outline"
              size="sm"
              disabled={downloadingArtifact === "xml"}
              onClick={() => downloadArtifact("xml")}
            >
              {downloadingArtifact === "xml" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              XML
            </Button>
          ) : null}
          {data.cdrUrl ? (
            <Button
              variant="outline"
              size="sm"
              disabled={downloadingArtifact === "cdr"}
              onClick={() => downloadArtifact("cdr")}
            >
              {downloadingArtifact === "cdr" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              CDR
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
          {data.estado === EstadoComprobante.RECHAZADO ? (
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
                disabled={!estadoAceptadoSunat || !saldoNoAcreditado?.puedeEmitirNc}
                title={
                  saldoNoAcreditado?.bloqueoPorNcEnProceso
                    ? `Bloqueado: NC ${saldoNoAcreditado.bloqueoPorNcEnProceso.numero} en estado ${saldoNoAcreditado.bloqueoPorNcEnProceso.estado}`
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
                disabled={!estadoAceptadoSunat}
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
                            {fmtMoney(d.igvMonto ?? d.igv, data.moneda)}
                          </td>
                          <td className="py-2 text-right font-medium tabular-nums">
                            {fmtMoney(
                              d.importeTotal ?? d.total,
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
                      <SunatExplanation message={log.mensaje} />
                      <SunatDiagnostics log={log} />
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
          {mostrarSaldoNoAcreditado ? (
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
                        saldoNoAcreditado.totalOrigen,
                        data.moneda,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Acreditado</p>
                    <p className="tabular-nums">
                      {fmtMoney(saldoNoAcreditado.acreditado, data.moneda)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Saldo no acreditado
                    </p>
                    <p
                      className={`font-semibold tabular-nums ${
                        toMoneyNumber(
                          saldoNoAcreditado.saldoNoAcreditado,
                        ) <= 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {fmtMoney(
                        saldoNoAcreditado.saldoNoAcreditado,
                        data.moneda,
                      )}
                    </p>
                  </div>
                </div>
                {saldoNoAcreditado.bloqueoPorNcEnProceso ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    NC{" "}
                    <span className="font-mono">
                      {saldoNoAcreditado.bloqueoPorNcEnProceso.numero}
                    </span>{" "}
                    en estado{" "}
                    {saldoNoAcreditado.bloqueoPorNcEnProceso.estado}{" "}
                    bloquea la emisión de otra NC.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : data.estado === EstadoComprobante.RECHAZADO ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sin saldo para NC</CardTitle>
                <CardDescription>
                  Este comprobante fue rechazado por SUNAT. No genera saldo no
                  acreditado ni permite notas hasta que exista un comprobante
                  aceptado.
                </CardDescription>
              </CardHeader>
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
                        {fmtMoney(n.monto ?? n.total, data.moneda)}
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

      <ConfirmarBajaModal
        open={anularOpen}
        onOpenChange={setAnularOpen}
        comprobanteId={id}
      />

      <ThermalReceiptDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        data={printData}
        format={printFormat}
      />
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

function SunatExplanation({ message }: { message?: string | null }) {
  const exp: SunatErrorExplanation | null = explainSunatRejectMessage(message);
  if (!exp) return null;
  const tone =
    exp.severidad === "config"
      ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
      : exp.severidad === "tecnico"
        ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200"
        : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200";
  return (
    <div className={`mt-2 rounded-md border p-2 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        Motivo
      </p>
      <p className="text-sm">{exp.motivo}</p>
      {exp.accion ? (
        <p className="mt-1 text-xs opacity-90">
          <strong>Sugerido:</strong> {exp.accion}
        </p>
      ) : null}
    </div>
  );
}
