import type { ThermalReceiptData } from "@/components/pos/thermal-receipt";
import type { ConfigEmpresaFiscalItem } from "@/hooks/use-facturacion";
import type { EmpresaPublica } from "@erp/shared";
import { getApiAssetUrl } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types mirroring the comprobante detail shape used in [id]/page.tsx
// ---------------------------------------------------------------------------

interface ComprobanteForPrint {
  id: string;
  numero: string;
  serie?: string;
  correlativo?: string | number;
  tipo: string; // TipoDocumento — "BOLETA" | "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO"
  estado: string;
  fechaEmision: string;
  total: number;
  subtotal: number;
  igv: number;
  moneda?: string;
  clienteNombre?: string;
  clienteDocNum?: string;
  clienteTipoDoc?: string;
  clienteDireccion?: string | null;
  hashSunat?: string | null;
  ventaId?: string | null;
  venta?: { id: string; numero: string } | null;
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
    unidadMedida?: string | null;
  }>;
  snapshotEmisorJson?: unknown;
  snapshotClienteJson?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function toMoneyNumber(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

// ---------------------------------------------------------------------------
// SUNAT QR payload
// ---------------------------------------------------------------------------

function sunatDocTipoFromCliente(docTipo?: string): string {
  if (docTipo === "RUC" || docTipo === "6") return "6";
  if (docTipo === "DNI" || docTipo === "1") return "1";
  return "0";
}

function sunatTipoComprobante(tipo?: string): string {
  const t = String(tipo ?? "").toUpperCase();
  if (t === "FACTURA") return "01";
  if (t === "BOLETA") return "03";
  if (t === "NOTA_CREDITO") return "07";
  if (t === "NOTA_DEBITO") return "08";
  return "00";
}

function formatFechaSunat(iso: string): string {
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
}): string | undefined {
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

// ---------------------------------------------------------------------------
// Build empresa data from config fiscal + public branding + emisor snapshot
// ---------------------------------------------------------------------------

export function buildEmpresaPrintData(
  configFiscal: ConfigEmpresaFiscalItem | null | undefined,
  empresaPublica?: Partial<EmpresaPublica> | null,
  snapshotEmisor?: unknown,
): ThermalReceiptData["empresa"] {
  const snap = asRecord(snapshotEmisor);
  const logo = cleanText(empresaPublica?.logo);

  return {
    nombre:
      firstText(
        configFiscal?.razonSocial,
        snap?.razonSocial,
        empresaPublica?.razonSocial,
      ) ?? "Empresa sin razón social",
    nombreComercial: firstText(
      configFiscal?.nombreComercial,
      snap?.nombreComercial,
      empresaPublica?.nombreComercial,
    ),
    ruc: firstText(configFiscal?.ruc, snap?.ruc, empresaPublica?.ruc),
    direccion: firstText(
      configFiscal?.direccionFiscal,
      snap?.direccionFiscal,
      empresaPublica?.direccion,
    ),
    departamento: firstText(
      configFiscal?.departamentoFiscal,
      snap?.departamento,
    ),
    provincia: firstText(configFiscal?.provinciaFiscal, snap?.provincia),
    distrito: firstText(configFiscal?.distritoFiscal, snap?.distrito),
    ubigeo: firstText(configFiscal?.ubigeoFiscal, snap?.ubigeo),
    codigoEstablecimiento: firstText(
      configFiscal?.codigoEstablecimiento,
      snap?.codigoEstablecimiento,
    ),
    regimenTributario: firstText(
      configFiscal?.regimenTributario,
      snap?.regimenTributario,
    ),
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

// ---------------------------------------------------------------------------
// Main converter: ComprobanteDetalle → ThermalReceiptData
// ---------------------------------------------------------------------------

export function comprobanteToPrintData(
  comprobante: ComprobanteForPrint,
  empresa: ThermalReceiptData["empresa"],
  pieImpresion?: string,
): ThermalReceiptData {
  const items: ThermalReceiptData["items"] =
    comprobante.detallesFiscales?.map((d) => ({
      sku: d.codigoInterno ?? d.codigo ?? undefined,
      nombre: d.descripcion,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      total: toMoneyNumber(d.importeTotal ?? d.total),
      unidad: d.unidadMedida ?? "NIU",
    })) ?? [];

  const hashFirma = cleanText(comprobante.hashSunat);
  const qrPayload = buildSunatQrPayload({
    ruc: empresa.ruc,
    tipo: comprobante.tipo,
    numero: comprobante.numero,
    igv: toMoneyNumber(comprobante.igv),
    total: toMoneyNumber(comprobante.total),
    fecha: comprobante.fechaEmision,
    docTipo: comprobante.clienteTipoDoc,
    docNumero: comprobante.clienteDocNum,
    hashFirma,
  });

  return {
    empresa,
    comprobante: {
      tipo: comprobante.tipo,
      serie: comprobante.serie,
      numero: comprobante.numero,
      fecha: comprobante.fechaEmision,
      esComprobanteElectronico: true,
    },
    cliente: {
      nombre: comprobante.clienteNombre ?? "—",
      docTipo: comprobante.clienteTipoDoc,
      docNumero: comprobante.clienteDocNum,
      direccion: comprobante.clienteDireccion ?? undefined,
    },
    items,
    totales: {
      subtotal: toMoneyNumber(comprobante.subtotal),
      igv: toMoneyNumber(comprobante.igv),
      total: toMoneyNumber(comprobante.total),
      moneda: comprobante.moneda ?? "PEN",
    },
    pago: {
      formaPago: "CONTADO",
    },
    ventaNumero: comprobante.venta?.numero,
    pieImpresion,
    qrPayload,
    hashFirma,
  };
}
