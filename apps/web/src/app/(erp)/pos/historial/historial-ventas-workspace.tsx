"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import {
  CalendarClock,
  CheckCircle2,
  CircleCheckBig,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Hash,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  Percent,
  Printer,
  Receipt,
  RefreshCcw,
  ShoppingCart,
  Tag,
  Trash2,
  UserRound,
  XCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VentaCard } from "./venta-card";
import { FloatingSelectionBar } from "./floating-selection-bar";
import {
  EstadoFacturacionVenta,
  EstadoVenta,
  type EmpresaPublica,
  type FormatoImpresionDocumento,
  type VentaDetail,
  type VentaDetailItem,
  type VentaListItem,
} from "@erp/shared";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { StatCard } from "@/components/layout/stat-card";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useConfigFiscal,
  type ConfigEmpresaFiscalItem,
} from "@/hooks/use-facturacion";

import { usePublicBranding } from "@/hooks/use-public-branding";
import {
  useCancelarVenta,
  useDeleteVenta,
  useVenta,
  useVentas,
} from "@/hooks/use-ventas";
import { getApiAssetUrl } from "@/lib/api";

import { EmitirComprobanteModal } from "@/app/(erp)/comprobantes/_components/emitir-comprobante-modal";
import {
  ThermalReceiptDialog,
  type ThermalReceiptData,
} from "@/components/pos/thermal-receipt";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ESTADO_LABELS: Record<EstadoVenta, string> = {
  [EstadoVenta.COTIZACION]: "Cotización",
  [EstadoVenta.RESERVADA]: "Reservada",
  [EstadoVenta.ORDEN_CONFIRMADA]: "Confirmada",
  [EstadoVenta.ENTREGADA]: "Entregada",
  [EstadoVenta.CANCELADA]: "Cancelada",
};

function clienteNombre(venta: VentaListItem) {
  return (
    venta.cliente.razonSocial ||
    [venta.cliente.nombre, venta.cliente.apellido]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "—"
  );
}

type MoneyValue = number | string | null | undefined;

function toMoneyNumber(amount: MoneyValue) {
  const value =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? Number(amount)
        : 0;

  return Number.isFinite(value) ? value : 0;
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function buildEmpresaPrintData(
  configFiscal: ConfigEmpresaFiscalItem | null | undefined,
  empresaPublica?: Partial<EmpresaPublica> | null,
): ThermalReceiptData["empresa"] {
  const logo = cleanText(empresaPublica?.logo);

  return {
    nombre:
      firstText(configFiscal?.razonSocial, empresaPublica?.razonSocial) ??
      "Empresa sin razón social",
    nombreComercial: firstText(
      configFiscal?.nombreComercial,
      empresaPublica?.nombreComercial,
    ),
    ruc: firstText(configFiscal?.ruc, empresaPublica?.ruc),
    direccion: firstText(configFiscal?.direccionFiscal, empresaPublica?.direccion),
    departamento: firstText(configFiscal?.departamentoFiscal),
    provincia: firstText(configFiscal?.provinciaFiscal),
    distrito: firstText(configFiscal?.distritoFiscal),
    ubigeo: firstText(configFiscal?.ubigeoFiscal),
    codigoEstablecimiento: firstText(configFiscal?.codigoEstablecimiento),
    regimenTributario: firstText(configFiscal?.regimenTributario),
    telefono: firstText(
      empresaPublica?.telefonoVentas,
      empresaPublica?.whatsapp,
      empresaPublica?.telefono,
    ),
    email: firstText(empresaPublica?.emailVentas, empresaPublica?.email),
    web: firstText(empresaPublica?.website),
    logoUrl: logo ? getApiAssetUrl(logo) : undefined,
  };
}

function formatCurrency(amount: MoneyValue) {
  return `S/ ${toMoneyNumber(amount).toFixed(2)}`;
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  timeZone: "America/Lima",
});

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value?: string | null) {
  const date = parseDate(value);
  return date ? DATE_TIME_FORMAT.format(date) : "Sin fecha registrada";
}

function formatWeekday(value?: string | null) {
  const date = parseDate(value);
  return date ? WEEKDAY_FORMAT.format(date) : "—";
}

function vendedorNombre(usuario?: VentaDetail["usuario"] | null) {
  if (!usuario) return "Sin vendedor registrado";
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ").trim();
}

function productoDescripcion(item: VentaDetailItem) {
  const meta = [
    item.producto?.sku,
    item.producto?.marca?.nombre,
    item.producto?.modeloCatalogo?.nombre,
    item.equipoSerie ? `Serie ${item.equipoSerie}` : null,
  ].filter(Boolean);
  return meta.length ? meta.join(" · ") : "Sin SKU";
}

function detalleTotal(item: VentaDetailItem) {
  const cantidad = Number(item.cantidad) || 0;
  const precio = toMoneyNumber(item.precioUnitario);
  const descuento = toMoneyNumber(item.descuento);
  return Math.max(0, cantidad * precio - descuento);
}

function tipoDocumentoLabel(tipo?: string | null) {
  if (tipo === "FACTURA") return "Factura";
  if (tipo === "BOLETA") return "Boleta";
  return "Comprobante";
}

function sunatDocTipoFromCliente(docTipo?: string) {
  if (docTipo === "RUC") return "6";
  if (docTipo === "DNI") return "1";
  return "0";
}

function sunatTipoComprobante(tipo?: string) {
  if (tipo === "FACTURA") return "01";
  if (tipo === "BOLETA") return "03";
  return "00";
}

function formatFechaSunat(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function splitSerieNumero(numero?: string | null) {
  const match = numero?.match(/^([A-Z0-9]+)-(\d+)$/i);
  if (!match) return { serie: undefined, correlativo: undefined };
  return { serie: match[1]?.toUpperCase(), correlativo: match[2] };
}

function buildSunatQrPayload({
  ruc,
  tipo,
  numero,
  igv,
  total,
  fecha,
  docTipo,
  docNumero,
  hashFirma,
}: {
  ruc?: string;
  tipo?: string;
  numero?: string | null;
  igv: number;
  total: number;
  fecha: string;
  docTipo?: string;
  docNumero?: string;
  hashFirma?: string;
}) {
  const { serie, correlativo } = splitSerieNumero(numero);
  if (!ruc || !serie || !correlativo) return undefined;

  return [
    ruc,
    sunatTipoComprobante(tipo),
    serie,
    correlativo.padStart(8, "0"),
    igv.toFixed(2),
    total.toFixed(2),
    formatFechaSunat(fecha),
    sunatDocTipoFromCliente(docTipo),
    docNumero ?? "00000000",
    hashFirma ?? "",
  ].join("|");
}

function ventaToPrintData(
  venta: VentaDetail,
  empresa: ThermalReceiptData["empresa"],
  pieImpresion?: string,
): ThermalReceiptData {
  const clienteDocNumero = venta.cliente.ruc ?? venta.cliente.dni ?? undefined;
  const clienteDocTipo = venta.cliente.ruc
    ? "RUC"
    : venta.cliente.dni
      ? "DNI"
      : undefined;

  const hasComprobante = Boolean(venta.comprobante?.numero);
  const hashFirma = firstText(
    venta.comprobante?.hashCpe,
    venta.comprobante?.hashSunat,
  );
  const fechaComprobante =
    venta.comprobante?.fechaEmision ?? venta.createdAt ?? new Date().toISOString();

  const qrPayload = hasComprobante
    ? buildSunatQrPayload({
        ruc: empresa.ruc,
        tipo: venta.comprobante?.tipo,
        numero: venta.comprobante?.numero,
        igv: toMoneyNumber(venta.igv),
        total: toMoneyNumber(venta.total),
        fecha: fechaComprobante,
        docTipo: clienteDocTipo,
        docNumero: clienteDocNumero,
        hashFirma,
      })
    : undefined;

  return {
    empresa,
    comprobante: {
      tipo: hasComprobante
        ? (venta.comprobante?.tipo ?? "BOLETA")
        : "VENTA",
      numero: venta.comprobante?.numero,
      fecha: fechaComprobante,
      estado: hasComprobante ? undefined : "PENDIENTE DE EMISION",
      esComprobanteElectronico: hasComprobante,
      leyendaTipo: hasComprobante
        ? undefined
        : "VENTA PENDIENTE DE COMPROBANTE",
    },
    cliente: {
      nombre: clienteNombre(venta),
      docTipo: clienteDocTipo,
      docNumero: clienteDocNumero,
    },
    items: venta.detalles.map((item) => ({
      sku: item.producto?.sku ?? undefined,
      nombre: item.producto?.nombre ?? "Producto sin nombre",
      cantidad: Number(item.cantidad) || 0,
      precioUnitario: toMoneyNumber(item.precioUnitario),
      total: detalleTotal(item),
    })),
    totales: {
      subtotal: toMoneyNumber(venta.subtotal),
      igv: toMoneyNumber(venta.igv),
      total: toMoneyNumber(venta.total),
    },
    pago: {
      metodo: venta.metodoPago?.nombre,
      referencia: venta.referenciaPago ?? undefined,
    },
    ventaNumero: venta.numero,
    pieImpresion,
    qrPayload,
    hashFirma,
  };
}

function estadoBadgeClass(estado: EstadoVenta) {
  return cn("gap-1.5 text-[11px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-md border", {
    "bg-[oklch(0.96_0.005_0)] text-[oklch(0.40_0.005_0)] border-[oklch(0.86_0.005_0)] dark:bg-[oklch(0.16_0.005_0)] dark:text-[oklch(0.70_0.005_0)] dark:border-[oklch(0.24_0.005_0)]":
      estado === EstadoVenta.COTIZACION,
    "bg-[oklch(0.96_0.035_175)] text-[oklch(0.34_0.09_175)] border-[oklch(0.84_0.045_175)] dark:bg-[oklch(0.15_0.035_175)] dark:text-[oklch(0.72_0.055_175)] dark:border-[oklch(0.24_0.035_175)]":
      estado === EstadoVenta.RESERVADA,
    "bg-[oklch(0.95_0.04_250)] text-[oklch(0.35_0.08_250)] border-[oklch(0.85_0.05_250)] dark:bg-[oklch(0.16_0.04_250)] dark:text-[oklch(0.75_0.06_250)] dark:border-[oklch(0.24_0.04_250)]":
      estado === EstadoVenta.ORDEN_CONFIRMADA,
    "bg-[oklch(0.96_0.04_150)] text-[oklch(0.35_0.10_150)] border-[oklch(0.85_0.05_150)] dark:bg-[oklch(0.16_0.04_150)] dark:text-[oklch(0.72_0.06_150)] dark:border-[oklch(0.24_0.04_150)]":
      estado === EstadoVenta.ENTREGADA,
    "bg-[oklch(0.96_0.04_25)] text-[oklch(0.35_0.10_25)] border-[oklch(0.85_0.05_25)] dark:bg-[oklch(0.16_0.04_25)] dark:text-[oklch(0.72_0.06_25)] dark:border-[oklch(0.24_0.04_25)]":
      estado === EstadoVenta.CANCELADA,
  });
}

const FACTURACION_LABELS: Record<EstadoFacturacionVenta, string> = {
  [EstadoFacturacionVenta.SIN_COMPROBANTE]: "Sin comprobante",
  [EstadoFacturacionVenta.VENTA_INTERNA]: "Venta interna",
  [EstadoFacturacionVenta.EN_EMISION]: "En emisión",
  [EstadoFacturacionVenta.EMITIDA]: "Emitida",
  [EstadoFacturacionVenta.EMITIDA_CON_OBS]: "Emitida c/ obs.",
  [EstadoFacturacionVenta.RECHAZADA]: "Rechazada",
  [EstadoFacturacionVenta.ANULADA_FISCAL]: "Anulada fiscal",
};

function facturacionBadgeClass(estado: EstadoFacturacionVenta) {
  return cn("gap-1.5 text-[11px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-md border", {
    "bg-[oklch(0.96_0.005_0)] text-[oklch(0.40_0.005_0)] border-[oklch(0.86_0.005_0)] dark:bg-[oklch(0.16_0.005_0)] dark:text-[oklch(0.70_0.005_0)] dark:border-[oklch(0.24_0.005_0)]":
      estado === EstadoFacturacionVenta.SIN_COMPROBANTE,
    "bg-[oklch(0.95_0.03_180)] text-[oklch(0.34_0.08_180)] border-[oklch(0.84_0.04_180)] dark:bg-[oklch(0.15_0.03_180)] dark:text-[oklch(0.72_0.06_180)] dark:border-[oklch(0.24_0.03_180)]":
      estado === EstadoFacturacionVenta.VENTA_INTERNA,
    "bg-[oklch(0.95_0.04_220)] text-[oklch(0.35_0.08_220)] border-[oklch(0.85_0.05_220)] dark:bg-[oklch(0.16_0.04_220)] dark:text-[oklch(0.72_0.06_220)] dark:border-[oklch(0.24_0.04_220)]":
      estado === EstadoFacturacionVenta.EN_EMISION,
    "bg-[oklch(0.96_0.04_150)] text-[oklch(0.35_0.10_150)] border-[oklch(0.85_0.05_150)] dark:bg-[oklch(0.16_0.04_150)] dark:text-[oklch(0.72_0.06_150)] dark:border-[oklch(0.24_0.04_150)]":
      estado === EstadoFacturacionVenta.EMITIDA,
    "bg-[oklch(0.96_0.04_75)] text-[oklch(0.35_0.09_75)] border-[oklch(0.85_0.05_75)] dark:bg-[oklch(0.16_0.04_75)] dark:text-[oklch(0.75_0.06_75)] dark:border-[oklch(0.24_0.04_75)]":
      estado === EstadoFacturacionVenta.EMITIDA_CON_OBS,
    "bg-[oklch(0.96_0.04_25)] text-[oklch(0.35_0.10_25)] border-[oklch(0.85_0.05_25)] dark:bg-[oklch(0.16_0.04_25)] dark:text-[oklch(0.72_0.06_25)] dark:border-[oklch(0.24_0.04_25)]":
      estado === EstadoFacturacionVenta.RECHAZADA,
    "bg-[oklch(0.94_0.002_0)] text-[oklch(0.38_0.002_0)] border-[oklch(0.82_0.002_0)] dark:bg-[oklch(0.14_0.002_0)] dark:text-[oklch(0.68_0.002_0)] dark:border-[oklch(0.22_0.002_0)]":
      estado === EstadoFacturacionVenta.ANULADA_FISCAL,
  });
}

function toEmitVentaInput(v: VentaListItem) {
  return {
    id: v.id,
    numero: v.numero,
    estado: v.estado,
    estadoFacturacion: v.estadoFacturacion,
    subtotal: toMoneyNumber(v.subtotal),
    igv: toMoneyNumber(v.igv),
    total: toMoneyNumber(v.total),
    cliente: {
      id: v.cliente.id,
      nombre: v.cliente.nombre ?? null,
      apellido: v.cliente.apellido ?? null,
      razonSocial: v.cliente.razonSocial ?? null,
      ruc: v.cliente.ruc ?? null,
      dni: v.cliente.dni ?? null,
    },
  };
}

function estadoDotClass(estado: EstadoVenta) {
  return cn("size-1.5 rounded-full inline-block shrink-0", {
    "bg-[oklch(0.45_0.005_0)] dark:bg-[oklch(0.65_0.005_0)]": estado === EstadoVenta.COTIZACION,
    "bg-[oklch(0.43_0.09_175)] dark:bg-[oklch(0.68_0.055_175)]": estado === EstadoVenta.RESERVADA,
    "bg-[oklch(0.45_0.08_250)] dark:bg-[oklch(0.70_0.06_250)]": estado === EstadoVenta.ORDEN_CONFIRMADA,
    "bg-[oklch(0.45_0.10_150)] dark:bg-[oklch(0.68_0.06_150)]": estado === EstadoVenta.ENTREGADA,
    "bg-[oklch(0.45_0.10_25)] dark:bg-[oklch(0.68_0.06_25)]": estado === EstadoVenta.CANCELADA,
  });
}

function facturacionDotClass(estado: EstadoFacturacionVenta) {
  return cn("size-1.5 rounded-full inline-block shrink-0", {
    "bg-[oklch(0.45_0.005_0)] dark:bg-[oklch(0.65_0.005_0)]": estado === EstadoFacturacionVenta.SIN_COMPROBANTE,
    "bg-[oklch(0.43_0.08_180)] dark:bg-[oklch(0.68_0.06_180)]": estado === EstadoFacturacionVenta.VENTA_INTERNA,
    "bg-[oklch(0.45_0.08_220)] dark:bg-[oklch(0.68_0.06_220)] animate-pulse": estado === EstadoFacturacionVenta.EN_EMISION,
    "bg-[oklch(0.45_0.10_150)] dark:bg-[oklch(0.68_0.06_150)]": estado === EstadoFacturacionVenta.EMITIDA,
    "bg-[oklch(0.45_0.09_75)] dark:bg-[oklch(0.68_0.06_75)]": estado === EstadoFacturacionVenta.EMITIDA_CON_OBS,
    "bg-[oklch(0.45_0.10_25)] dark:bg-[oklch(0.68_0.06_25)]": estado === EstadoFacturacionVenta.RECHAZADA,
    "bg-[oklch(0.45_0.002_0)] dark:bg-[oklch(0.68_0.002_0)]": estado === EstadoFacturacionVenta.ANULADA_FISCAL,
  });
}

function VentaDetailSheet({
  venta,
  open,
  onOpenChange,
}: {
  venta: VentaListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [printOpen, setPrintOpen] = useState(false);
  const [printFormat, setPrintFormat] =
    useState<FormatoImpresionDocumento>("TICKET");
  const {
    data: detailResponse,
    isLoading,
    isError,
    refetch,
  } = useVenta(open ? venta?.id : undefined);
  const detail = detailResponse?.data;
  const display = detail ?? venta;
  const hasDiscount = toMoneyNumber(display?.descuento) > 0;
  const weekday = formatWeekday(detail?.createdAt);
  const configFiscalQ = useConfigFiscal();
  const publicBrandingQ = usePublicBranding();
  const configFiscal = configFiscalQ.data?.data ?? null;
  const empresaPublica = publicBrandingQ.data?.data ?? null;
  const empresaPrint = useMemo(
    () => buildEmpresaPrintData(configFiscal, empresaPublica),
    [configFiscal, empresaPublica],
  );
  const printData = detail
    ? ventaToPrintData(
        detail,
        empresaPrint,
        configFiscal?.pieImpresion ?? undefined,
      )
    : null;

  const openPrintPreview = (format: FormatoImpresionDocumento) => {
    setPrintFormat(format);
    setPrintOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="flex w-full flex-col p-0 sm:max-w-2xl lg:max-w-3xl"
          side="right"
        >
        <SheetHeader className="border-b border-border/70 px-6 py-5">
          <SheetTitle>Detalle de venta</SheetTitle>
          <SheetDescription>
            Productos, pago, fecha, descuentos y totales de la operación.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 px-6 py-5">
            {!display ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Selecciona una venta para revisar su detalle.
              </div>
            ) : (
              <>
                <section className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold">
                        {display.numero}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {clienteNombre(display)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={estadoBadgeClass(display.estado)}
                      >
                        <span className={estadoDotClass(display.estado)} />
                        {ESTADO_LABELS[display.estado]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={facturacionBadgeClass(
                          display.estadoFacturacion,
                        )}
                      >
                        <span className={facturacionDotClass(display.estadoFacturacion)} />
                        {FACTURACION_LABELS[display.estadoFacturacion]}
                      </Badge>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        Fecha
                      </div>
                      <p className="mt-1 font-medium">
                        {formatDateTime(detail?.createdAt)}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {weekday}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <UserRound className="size-3.5" />
                        Vendedor
                      </div>
                      <p className="mt-1 font-medium">
                        {vendedorNombre(detail?.usuario)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <CreditCard className="size-3.5" />
                        Pago
                      </div>
                      <p className="mt-1 font-medium">
                        {detail?.metodoPago?.nombre ?? "Pendiente"}
                      </p>
                      {detail?.referenciaPago ? (
                        <p className="text-xs text-muted-foreground">
                          Ref. {detail.referenciaPago}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Percent className="size-3.5" />
                        Descuento
                      </div>
                      <p className="mt-1 font-medium">
                        {hasDiscount
                          ? formatCurrency(display.descuento)
                          : "Sin descuento"}
                      </p>
                    </div>
                  </div>
                </section>

                {isLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Cargando productos y pago...
                  </div>
                ) : null}

                {isError ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    <div>
                      <p className="font-medium text-destructive">
                        No se pudo cargar el detalle completo.
                      </p>
                      <p className="text-muted-foreground">
                        Se muestra el resumen disponible de la tabla.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit rounded-lg"
                      onClick={() => void refetch()}
                    >
                      <RefreshCcw className="size-3.5" />
                      Reintentar
                    </Button>
                  </div>
                ) : null}

                <section className="rounded-xl border bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                    <div>
                      <p className="font-medium">Productos vendidos</p>
                      <p className="text-xs text-muted-foreground">
                        Qué se vendió, cantidad, serie y descuento por item.
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {detail?.detalles?.length ?? 0} items
                    </Badge>
                  </div>

                  {detail?.detalles?.length ? (
                    <div className="divide-y divide-border/70">
                      {detail.detalles.map((item) => {
                        const descuento = toMoneyNumber(item.descuento);
                        return (
                          <div
                            key={item.id}
                            className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[minmax(0,1fr)_auto]"
                          >
                            <div className="min-w-0">
                              <p className="font-medium">
                                {item.producto?.nombre ??
                                  "Producto sin nombre"}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {productoDescripcion(item)}
                              </p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[26rem]">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Cant.
                                </p>
                                <p className="font-medium tabular-nums">
                                  {item.cantidad}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  P. unit.
                                </p>
                                <p className="tabular-nums">
                                  {formatCurrency(item.precioUnitario)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Desc.
                                </p>
                                <p className="tabular-nums">
                                  {descuento > 0
                                    ? formatCurrency(descuento)
                                    : "S/ 0.00"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Total
                                </p>
                                <p className="font-semibold tabular-nums">
                                  {formatCurrency(detalleTotal(item))}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
                      <Tag className="size-4" />
                      Sin productos cargados en el detalle.
                    </div>
                  )}
                </section>

                <section className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Receipt className="size-3.5" />
                        Documento generado
                      </div>
                      {detail?.comprobante ? (
                        <>
                          <p className="mt-2 font-medium">
                            {tipoDocumentoLabel(detail.comprobante.tipo)}{" "}
                            {detail.comprobante.numero}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Estado: {detail.comprobante.estado} ·{" "}
                            {formatDateTime(detail.comprobante.fechaEmision)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mt-2 font-medium">
                            Sin boleta/factura fiscal vinculada
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Puedes reimprimir el comprobante interno de venta en
                            A4 o ticket.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {detail?.comprobante ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                        >
                          <Link href={`/comprobantes/${detail.comprobante.id}`}>
                            <ExternalLink className="size-3.5" />
                            Ver comprobante
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                        disabled={!detail}
                        onClick={() => openPrintPreview("A4")}
                      >
                        <Printer className="size-3.5" />
                        A4
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                        disabled={!detail}
                        onClick={() => openPrintPreview("TICKET")}
                      >
                        <Printer className="size-3.5" />
                        Ticket
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Hash className="size-3.5" />
                        Cliente
                      </div>
                      <p className="mt-2 font-medium">
                        {clienteNombre(display)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {detail?.cliente.ruc ||
                          detail?.cliente.dni ||
                          display.cliente.ruc ||
                          display.cliente.dni ||
                          "Sin documento"}
                      </p>
                      {detail?.cliente.celular || detail?.cliente.telefono ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {detail.cliente.celular ?? detail.cliente.telefono}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <FileText className="size-3.5" />
                        Observaciones
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {detail?.notas?.trim() ||
                          "Sin observaciones registradas."}
                      </p>
                      {detail?.evidenciasPago?.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Evidencias de pago: {detail.evidenciasPago.length}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">
                        {formatCurrency(display.subtotal)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Descuento</span>
                      <span className="tabular-nums">
                        {formatCurrency(display.descuento)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">IGV</span>
                      <span className="tabular-nums">
                        {formatCurrency(display.igv)}
                      </span>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between gap-4 font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums text-primary">
                        {formatCurrency(display.total)}
                      </span>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
        </SheetContent>
      </Sheet>
      <ThermalReceiptDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        data={printData}
        format={printFormat}
      />
    </>
  );
}

const VIEW_MODE_STORAGE_KEY = "erp:ventas:view-mode";
function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

export function HistorialVentasWorkspace({
  showCreateButton = true,
}: {
  showCreateButton?: boolean;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [selectedVenta, setSelectedVenta] = useState<VentaListItem | null>(
    null,
  );
  const [emitVenta, setEmitVenta] = useState<VentaListItem | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const handleSelectionModeToggle = useCallback(() => {
    if (selectionMode) {
      setSelectedCards(new Set());
    }
    setSelectionMode((prev) => !prev);
  }, [selectionMode]);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debounced || undefined,
      estado:
        estadoFilter !== "all" ? (estadoFilter as EstadoVenta) : undefined,
      estados:
        estadoFilter === "all"
          ? [
              EstadoVenta.RESERVADA,
              EstadoVenta.ORDEN_CONFIRMADA,
              EstadoVenta.ENTREGADA,
              EstadoVenta.CANCELADA,
            ]
          : undefined,
    }),
    [debounced, estadoFilter, limit, page],
  );

  const { data, isLoading, isError, refetch } = useVentas(filters);

  const total = data?.meta?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  const paginationItems = useMemo<(number | "ellipsis")[]>(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    const items: (number | "ellipsis")[] = [1];
    const windowStart = Math.max(2, page - 1);
    const windowEnd = Math.min(pageCount - 1, page + 1);

    if (windowStart > 2) {
      items.push("ellipsis");
    }

    for (
      let currentPage = windowStart;
      currentPage <= windowEnd;
      currentPage += 1
    ) {
      items.push(currentPage);
    }

    if (windowEnd < pageCount - 1) {
      items.push("ellipsis");
    }

    items.push(pageCount);
    return items;
  }, [page, pageCount]);
  const { data: statsTotal } = useVentas({
    page: 1,
    limit: 1,
    estados: [
      EstadoVenta.RESERVADA,
      EstadoVenta.ORDEN_CONFIRMADA,
      EstadoVenta.ENTREGADA,
      EstadoVenta.CANCELADA,
    ],
  });
  const { data: statsReservadas } = useVentas({
    page: 1,
    limit: 1,
    estado: EstadoVenta.RESERVADA,
  });
  const { data: statsConfirmadas } = useVentas({
    page: 1,
    limit: 1,
    estado: EstadoVenta.ORDEN_CONFIRMADA,
  });
  const { data: statsEntregadas } = useVentas({
    page: 1,
    limit: 1,
    estado: EstadoVenta.ENTREGADA,
  });

  const cancelar = useCancelarVenta();
  const eliminar = useDeleteVenta();



  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleEstadoChange = useCallback((value: string) => {
    setEstadoFilter(value);
    setPage(1);
    setSelectedCards(new Set());
  }, []);

  const handleLimitChange = useCallback((value: number) => {
    setLimit(value);
    setPage(1);
    setSelectedCards(new Set());
  }, []);

  const handleAnular = useCallback(() => {
    if (!cancelId) return;
    cancelar.mutate(
      { id: cancelId, motivo: motivo.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Venta anulada y stock revertido");
          setCancelId(null);
          setMotivo("");
        },
        onError: (err: Error) =>
          toast.error(err.message || "No se pudo anular la venta"),
      },
    );
  }, [cancelId, cancelar, motivo]);

  const handleEliminar = useCallback(() => {
    if (!deleteId) return;
    eliminar.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Venta cancelada eliminada del historial");
        setDeleteId(null);
        void refetch();
      },
      onError: (err: Error) =>
        toast.error(err.message || "No se pudo eliminar la venta"),
    });
  }, [deleteId, eliminar, refetch]);

  const exportVentasToCSV = useCallback((rows: VentaListItem[], filename: string) => {
    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "Numero",
      "Cliente",
      "Estado",
      "Subtotal",
      "Descuento",
      "IGV",
      "Total",
    ];
    const lines = rows.map((venta) =>
      [
        venta.numero,
        clienteNombre(venta),
        ESTADO_LABELS[venta.estado],
        venta.subtotal,
        venta.descuento,
        venta.igv,
        venta.total,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado correctamente");
  }, []);

  const handleExportCSV = useCallback(() => {
    exportVentasToCSV(data?.data ?? [], "ventas.csv");
  }, [data?.data, exportVentasToCSV]);

  const handleExportCSVForRows = useCallback((rows: VentaListItem[]) => {
    exportVentasToCSV(rows, "ventas_seleccionadas.csv");
  }, [exportVentasToCSV]);

  const columns = useMemo<ColumnDef<VentaListItem>[]>(
    () => [
      {
        accessorKey: "numero",
        header: "Número",
        size: 130,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[13px] font-semibold text-foreground tracking-tight">
            {row.original.numero}
          </span>
        ),
      },
      {
        id: "cliente",
        header: "Cliente",
        size: 260,
        cell: ({ row }) => (
          <div className="flex flex-col max-w-64">
            <span
              className="font-medium text-foreground truncate text-[13px] hover:text-[var(--accent)] transition-colors"
              title={clienteNombre(row.original)}
            >
              {clienteNombre(row.original)}
            </span>
            {row.original.cliente.ruc || row.original.cliente.dni ? (
              <span className="text-[10px] text-muted-foreground font-mono mt-1 bg-muted/50 dark:bg-muted/20 px-1.5 py-0.5 rounded-md w-fit border border-border/50">
                {row.original.cliente.ruc ? `RUC ${row.original.cliente.ruc}` : `DNI ${row.original.cliente.dni}`}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        size: 140,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={estadoBadgeClass(row.original.estado)}
          >
            <span className={estadoDotClass(row.original.estado)} />
            {ESTADO_LABELS[row.original.estado]}
          </Badge>
        ),
      },
      {
        accessorKey: "estadoFacturacion",
        header: "Facturación",
        size: 165,
        cell: ({ row }) => {
          const ef = row.original.estadoFacturacion;
          if (!ef)
            return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <Badge variant="outline" className={facturacionBadgeClass(ef)}>
              <span className={facturacionDotClass(ef)} />
              {FACTURACION_LABELS[ef]}
            </Badge>
          );
        },
      },
      {
        accessorKey: "subtotal",
        header: () => <div className="text-right">Subtotal</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {formatCurrency(row.original.subtotal)}
            </span>
          </div>
        ),
        meta: { defaultHidden: true },
      },
      {
        accessorKey: "igv",
        header: () => <div className="text-right">IGV</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {formatCurrency(row.original.igv)}
            </span>
          </div>
        ),
        meta: { defaultHidden: true },
      },
      {
        accessorKey: "total",
        header: () => <div className="text-right">Total</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right">
            <span className="whitespace-nowrap font-bold font-display text-[14px] text-primary tabular-nums">
              {formatCurrency(row.original.total)}
            </span>
          </div>
        ),
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        size: 160,
        cell: ({ row }) => {
          const venta = row.original;
          const puedeAnular =
            venta.estado === EstadoVenta.ORDEN_CONFIRMADA ||
            venta.estado === EstadoVenta.ENTREGADA;
          const puedeEliminar = venta.estado === EstadoVenta.CANCELADA;
          const puedeEmitir =
            (venta.estadoFacturacion ===
              EstadoFacturacionVenta.SIN_COMPROBANTE ||
              venta.estadoFacturacion === EstadoFacturacionVenta.RECHAZADA) &&
            (venta.estado === EstadoVenta.ORDEN_CONFIRMADA ||
              venta.estado === EstadoVenta.ENTREGADA);

          return (
            <div className="flex items-center justify-end gap-1.5">
              {puedeEmitir ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl px-2.5 text-xs border border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-500 dark:hover:text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                  onClick={() => setEmitVenta(venta)}
                >
                  <Receipt className="size-3.5" />
                  Emitir
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl px-2.5 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150 hover:bg-muted"
                onClick={() => setSelectedVenta(venta)}
              >
                <Eye className="size-3.5" />
                Ver
              </Button>
              {puedeAnular || puedeEliminar ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted rounded-xl transition-all duration-150 active:scale-95"
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-45 rounded-2xl p-1 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        className={puedeAnular ? undefined : "hidden"}
                        variant="destructive"
                        onClick={() => setCancelId(venta.id)}
                      >
                        <XCircle className="size-4" />
                        Anular
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={puedeEliminar ? undefined : "hidden"}
                        variant="destructive"
                        onClick={() => setDeleteId(venta.id)}
                      >
                        <Trash2 className="size-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5">
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total ventas"
          value={statsTotal?.meta?.total}
          icon={ShoppingCart}
          theme="sky"
          subtitle="Histórico"
          index={0}
        />
        <StatCard
          label="Reservadas"
          value={statsReservadas?.meta?.total}
          icon={CalendarClock}
          theme="amber"
          subtitle="Pendientes de confirmar"
          index={1}
        />
        <StatCard
          label="Confirmadas"
          value={statsConfirmadas?.meta?.total}
          icon={CircleCheckBig}
          theme="indigo"
          subtitle="Listas para entregar"
          index={2}
        />
        <StatCard
          label="Entregadas"
          value={statsEntregadas?.meta?.total}
          icon={PackageCheck}
          theme="emerald"
          subtitle="Cerradas"
          index={3}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por número o cliente..."
            className="sm:w-80 lg:w-96"
            inputClassName="border-border bg-background hover:border-sky-400/60 dark:hover:border-sky-500/60 focus-visible:border-sky-500 dark:focus-visible:border-sky-400 focus-visible:ring-sky-400/25 dark:focus-visible:ring-sky-500/25 shadow-sm"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Tabs value={estadoFilter} onValueChange={handleEstadoChange}>
              <TabsList className="h-9 max-w-[calc(100vw-2rem)] flex-nowrap gap-0.5 overflow-x-auto rounded-lg border border-border/70 bg-muted/70 p-0.5 sm:max-w-none">
                <TabsTrigger
                  value="all"
                  className="h-8 gap-1.5 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 dark:data-[state=active]:bg-sky-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <ShoppingCart className="size-3.5" />
                  Todos
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoVenta.RESERVADA}
                  className="h-8 gap-1.5 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <CalendarClock className="size-3.5" />
                  Reservada
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoVenta.ORDEN_CONFIRMADA}
                  className="h-8 gap-1.5 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <CircleCheckBig className="size-3.5" />
                  Confirmada
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoVenta.ENTREGADA}
                  className="h-8 gap-1.5 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <PackageCheck className="size-3.5" />
                  Entregada
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoVenta.CANCELADA}
                  className="h-8 gap-1.5 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-red-500/30 dark:data-[state=active]:bg-red-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <XCircle className="size-3.5" />
                  Cancelada
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant={selectionMode ? "secondary" : "outline"}
              size="sm"
              className="h-9 gap-1.5 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={handleSelectionModeToggle}
            >
              <CheckCircle2 className="size-3.5" />
              {selectionMode ? "Cancelar" : "Seleccionar"}
            </Button>

            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value !== "list" && value !== "grid") return;
                setViewMode(value);
                setSelectedCards(new Set());
                window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
              }}
              variant="outline"
              size="sm"
              className="gap-0 rounded-lg border border-border/60 bg-background/40 p-0.5 shrink-0"
            >
              <ToggleGroupItem
                value="list"
                className="h-8 rounded-md px-2.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
                aria-label="Vista tabla"
                title="Vista tabla"
              >
                <List className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="grid"
                className="h-8 rounded-md px-2.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
                aria-label="Vista tarjetas"
                title="Vista tarjetas"
              >
                <LayoutGrid className="size-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>

            <PageActionsMenu
              items={[
                {
                  label: "Actualizar lista",
                  icon: RefreshCcw,
                  onSelect: () => void refetch(),
                },
                {
                  label: "Exportar CSV",
                  icon: Download,
                  onSelect: handleExportCSV,
                },
                {
                  label: "Nueva venta",
                  icon: Receipt,
                  onSelect: () => {
                    window.location.href = "/pos";
                  },
                  hidden: !showCreateButton,
                },
              ]}
            />
            {showCreateButton ? (
              <Button asChild size="sm" className="rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150">
                <Link href="/pos">
                  <Receipt className="size-4" />
                  Nueva venta
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <ServerDataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.meta?.total ?? 0}
          page={page}
          limit={limit}
          isLoading={isLoading}
          isError={isError}
          errorMessage="No se pudo cargar el historial de ventas."
          onRetry={() => void refetch()}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          emptyMessage="Sin ventas"
          emptyDescription="No hay ventas que coincidan con el filtro."
          enableColumnVisibility
          columnVisibilityStorageKey="erp:historial-ventas:table-columns"
          enableRowSelection={selectionMode}
          bulkActionsBar={(selectedRows) => (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={() => handleExportCSVForRows(selectedRows)}
            >
              <Download className="size-3.5" /> Exportar CSV
            </Button>
          )}
        />
      ) : (
        <>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex h-40 items-center justify-center text-sm text-destructive font-medium">
              No se pudo cargar el historial de ventas.
            </div>
          ) : (data?.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-2xl text-center">
              <p className="text-sm font-semibold">Sin ventas</p>
              <p className="text-xs text-muted-foreground mt-1">No hay ventas que coincidan con el filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(data?.data ?? []).map((venta) => (
                <VentaCard
                  key={venta.id}
                  venta={venta}
                  search={search}
                  isSelected={selectedCards.has(venta.id)}
                  onToggleSelect={
                    selectionMode
                      ? () => {
                          const next = new Set(selectedCards);
                          if (next.has(venta.id)) next.delete(venta.id);
                          else next.add(venta.id);
                          setSelectedCards(next);
                        }
                      : undefined
                  }
                  onView={() => setSelectedVenta(venta)}
                  onEmit={() => setEmitVenta(venta)}
                  onAnular={() => setCancelId(venta.id)}
                  onDelete={() => setDeleteId(venta.id)}
                  canAnular={
                    venta.estado === EstadoVenta.ORDEN_CONFIRMADA ||
                    venta.estado === EstadoVenta.ENTREGADA
                  }
                  canDelete={venta.estado === EstadoVenta.CANCELADA}
                  canEmit={
                    (venta.estadoFacturacion === EstadoFacturacionVenta.SIN_COMPROBANTE ||
                      venta.estadoFacturacion === EstadoFacturacionVenta.RECHAZADA) &&
                    (venta.estado === EstadoVenta.ORDEN_CONFIRMADA || venta.estado === EstadoVenta.ENTREGADA)
                  }
                  ESTADO_LABELS={ESTADO_LABELS}
                  FACTURACION_LABELS={FACTURACION_LABELS}
                  estadoBadgeClass={estadoBadgeClass}
                  estadoDotClass={estadoDotClass}
                  facturacionBadgeClass={facturacionBadgeClass}
                  facturacionDotClass={facturacionDotClass}
                />
              ))}
            </div>
          )}

          {/* Pagination for cards view (matching ServerDataTable layout) */}
          {(total > 0) && (
            <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-[0_12px_24px_-34px_rgba(15,23,42,0.38)] sm:flex-row sm:items-center sm:justify-between mt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    Filas por página
                  </span>
                  <Select
                    value={String(limit)}
                    onValueChange={(value) => handleLimitChange(Number(value))}
                  >
                    <SelectTrigger className="h-8 min-w-22 rounded-md border-border/80 bg-muted/55 text-xs shadow-none hover:bg-muted/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground">
                  {rangeStart}-{rangeEnd} de {total} registro{total !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {pageCount > 1 ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page <= 1}
                      className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95"
                      title="Primera página"
                    >
                      <ChevronsLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95"
                    >
                      <ChevronLeft className="size-3.5" />
                      Anterior
                    </Button>
                    {paginationItems.map((item, index) =>
                      item === "ellipsis" ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                        >
                          ...
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(item)}
                          className={cn(
                            "h-8 w-8 rounded-md border-border/80 px-0 text-xs shadow-none transition-all duration-150 active:scale-95",
                            item === page
                              ? "border-primary/20 bg-primary/10 text-foreground pointer-events-none"
                              : "bg-muted/55 hover:bg-muted/80"
                          )}
                        >
                          {item}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pageCount}
                      className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95"
                    >
                      Siguiente
                      <ChevronRight className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(pageCount)}
                      disabled={page >= pageCount}
                      className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95"
                      title="Última página"
                    >
                      <ChevronsRight className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {selectionMode && selectedCards.size > 0 && (
        <FloatingSelectionBar
          count={selectedCards.size}
          onClear={() => setSelectedCards(new Set())}
          onExport={() => {
            const rows = (data?.data ?? []).filter((v) => selectedCards.has(v.id));
            handleExportCSVForRows(rows);
            setSelectedCards(new Set());
          }}
        />
      )}

      <VentaDetailSheet
        venta={selectedVenta}
        open={!!selectedVenta}
        onOpenChange={(open) => {
          if (!open) setSelectedVenta(null);
        }}
      />

      <EmitirComprobanteModal
        venta={emitVenta ? toEmitVentaInput(emitVenta) : null}
        onClose={() => setEmitVenta(null)}
        onSuccess={() => {
          void refetch();
        }}
      />

      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent className="w-full rounded-2xl p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="size-5 text-destructive" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <DialogTitle>Eliminar venta cancelada</DialogTitle>
                <DialogDescription>
                  Se quitará del historial visible. Solo se permite después de
                  cancelar para asegurar que stock, caja y garantías ya fueron
                  revertidos.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="border-t border-border/60 px-5 py-4">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={eliminar.isPending}
              className="rounded-xl"
            >
              Cerrar
            </Button>
            <Button
              variant="destructive"
              onClick={handleEliminar}
              disabled={eliminar.isPending}
              className="rounded-xl"
            >
              {eliminar.isPending ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelId(null);
            setMotivo("");
          }
        }}
      >
        <DialogContent className="w-full rounded-2xl p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="size-5 text-destructive" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <DialogTitle>Anular venta</DialogTitle>
                <DialogDescription>
                  Se revertirá el stock y se registrará la salida en caja como
                  devolución.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-2 px-5 py-4">
            <Label htmlFor="motivo-anulacion">Motivo (opcional)</Label>
            <Textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ej: Cliente desistió, error de cobro..."
              rows={3}
            />
          </div>
          <DialogFooter className="border-t border-border/60 px-5 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setCancelId(null);
                setMotivo("");
              }}
              disabled={cancelar.isPending}
              className="rounded-xl"
            >
              Cerrar
            </Button>
            <Button
              variant="destructive"
              onClick={handleAnular}
              disabled={cancelar.isPending}
              className="rounded-xl"
            >
              {cancelar.isPending ? "Anulando..." : "Sí, anular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HistorialPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ventas");
  }, [router]);

  return null;
}
