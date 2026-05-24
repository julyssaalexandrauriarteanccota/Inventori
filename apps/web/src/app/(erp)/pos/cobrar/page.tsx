"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  CreditCard,
  FileImage,
  FileText,
  IdCard,
  Loader2,
  Printer,
  Receipt,
  Save,
  Smartphone,
  Sparkles,
  Upload,
  User,
  UserPlus,
  UserSearch,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  TipoCliente,
  TipoDocumento,
  LIMITE_VENTA_INTERNA_LEGAL,
  type ClienteListItem,
  type EmpresaPublica,
  type FormatoImpresionDocumento,
} from "@erp/shared";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// PageHeader is removed to maximize vertical space and match catalog design
import {
  ThermalReceiptDialog,
  type ThermalReceiptData,
} from "@/components/pos/thermal-receipt";
import { ClienteQuickCreateModal } from "@/components/modals/cliente-quick-create-modal";

import { useMiAperturaActiva } from "@/hooks/use-caja";
import { useClientes, useCreateCliente } from "@/hooks/use-clientes";
import { useMetodosPago } from "@/hooks/use-configuracion";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useConfigFiscal,
  type ConfigEmpresaFiscalItem,
} from "@/hooks/use-facturacion";
import { useAlmacenes } from "@/hooks/use-inventario";
import { usePublicBranding } from "@/hooks/use-public-branding";
import { useCreateVenta } from "@/hooks/use-ventas";
import { api, getApiAssetUrl } from "@/lib/api";
import {
  getUploadAcceptAttr,
  revokeObjectPreviewUrl,
  uploadSelectedFiles,
  type NormalizedUploadedFile,
} from "@/lib/file-uploads";
import { POS_GENERIC_CLIENT_NAME } from "@/lib/pos-navigation";
import { lineTotalInclIgv } from "@/lib/pos-pricing";
import {
  BOLETA_UMBRAL_IDENTIFICACION,
  isSunatRuc,
} from "@/lib/sunat-validators";
import { cn } from "@/lib/utils";

import { useCart } from "../_components/cart-context";

const CASH_METHOD_CODE = "EFECTIVO";
const DIGITAL_PROOF_METHOD_CODE = "YAPE_PLIN";
const FORMATO_IMPRESION_OPTIONS: Array<{
  value: FormatoImpresionDocumento;
  label: string;
  hint: string;
}> = [
  { value: "TICKET", label: "Ticket", hint: "Papel térmico" },
  { value: "A4", label: "A4", hint: "Hoja completa" },
  { value: "AMBOS", label: "A4 y ticket", hint: "Imprime ambos" },
];

type ModoCliente = "GENERICO" | "IDENTIFICADO";
type ClienteRaw = { id: string };
type VentaCreada = { id: string; numero?: string };
type ComprobanteCreado = {
  id?: string;
  numero?: string;
  serie?: string;
  correlativo?: number;
  fechaEmision?: string;
  hashCpe?: string | null;
  hashSunat?: string | null;
};

type ApiDataEnvelope<T> = T | { data?: T | { data?: T | null } | null };

function asNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function money(n: number) {
  return `S/ ${n.toFixed(2)}`;
}
function formatoLabel(value: FormatoImpresionDocumento) {
  return (
    FORMATO_IMPRESION_OPTIONS.find((option) => option.value === value)?.label ??
    "Ticket"
  );
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

function unwrapApiData<T>(value: ApiDataEnvelope<T> | null | undefined) {
  let current: unknown = value;
  for (let i = 0; i < 3; i += 1) {
    if (
      current &&
      typeof current === "object" &&
      "data" in current &&
      (current as { data?: unknown }).data !== undefined
    ) {
      current = (current as { data?: unknown }).data;
      continue;
    }
    break;
  }
  return (current ?? null) as T | null;
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

function sunatDocTipoFromCliente(docTipo?: string) {
  if (docTipo === "RUC") return "6";
  if (docTipo === "DNI") return "1";
  return "0";
}

function sunatTipoComprobante(tipo: TipoDocumento) {
  if (tipo === TipoDocumento.FACTURA) return "01";
  if (tipo === TipoDocumento.BOLETA) return "03";
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

function splitSerieNumero(comprobante?: ComprobanteCreado) {
  const serie = cleanText(comprobante?.serie);
  const correlativo = comprobante?.correlativo;
  if (serie && typeof correlativo === "number") {
    return { serie, correlativo: String(correlativo).padStart(8, "0") };
  }

  const numero = cleanText(comprobante?.numero);
  const match = numero?.match(/^([A-Z0-9]+)-(\d+)$/i);
  if (!match) return { serie: undefined, correlativo: undefined };
  return { serie: match[1]?.toUpperCase(), correlativo: match[2] };
}

function buildSunatQrPayload({
  ruc,
  tipo,
  comprobante,
  igv,
  total,
  fecha,
  docTipo,
  docNumero,
  hashFirma,
}: {
  ruc?: string;
  tipo: TipoDocumento;
  comprobante?: ComprobanteCreado;
  igv: number;
  total: number;
  fecha: string;
  docTipo?: string;
  docNumero?: string;
  hashFirma?: string;
}) {
  const { serie, correlativo } = splitSerieNumero(comprobante);
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

function clienteLabel(c: ClienteListItem) {
  if (c.razonSocial) return c.razonSocial;
  const parts = [c.nombre, c.apellido].filter(Boolean) as string[];
  return parts.join(" ").trim() || "Cliente";
}
function clienteDoc(c: ClienteListItem) {
  if (c.ruc) return `RUC ${c.ruc}`;
  if (c.dni) return `DNI ${c.dni}`;
  return null;
}

function metodoIcon(codigo: string | null | undefined): LucideIcon {
  if (!codigo) return Wallet;
  if (codigo === CASH_METHOD_CODE) return Wallet;
  if (codigo === DIGITAL_PROOF_METHOD_CODE) return Smartphone;
  if (codigo.includes("TARJETA") || codigo.includes("CARD")) return CreditCard;
  if (
    codigo.includes("YAPE") ||
    codigo.includes("PLIN") ||
    codigo.includes("QR")
  )
    return Smartphone;
  return Wallet;
}

export default function PosCobrarPage() {
  const router = useRouter();
  const cart = useCart();
  const aperturaQ = useMiAperturaActiva();
  const aperturaActiva = aperturaQ.data?.data ?? null;

  // ── Cliente ─────────────────────────────────────────────────────────
  const [modoCliente, setModoCliente] = useState<ModoCliente>("GENERICO");
  const [clienteSel, setClienteSel] = useState<ClienteListItem | null>(null);
  const [clienteSelectOpen, setClienteSelectOpen] = useState(false);
  const [clienteQuery, setClienteQuery] = useState("");
  const debouncedClienteQuery = useDebounce(clienteQuery, 250);
  const [createClienteOpen, setCreateClienteOpen] = useState(false);

  const clientesQ = useClientes({
    page: 1,
    limit: 10,
    activo: true,
    search: debouncedClienteQuery || undefined,
  });
  const clientesEncontrados = useMemo(
    () =>
      (clientesQ.data?.data ?? []).filter(
        (cliente) => !cliente.esGenerico && cliente.dni !== "00000000",
      ),
    [clientesQ.data?.data],
  );
  const createCliente = useCreateCliente();

  // ── Tipo de comprobante ─────────────────────────────────────────────
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>(TipoDocumento.BOLETA);
  const [formatoImpresion, setFormatoImpresion] =
    useState<FormatoImpresionDocumento>("TICKET");

  // ── Pago ────────────────────────────────────────────────────────────
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [paymentProof, setPaymentProof] =
    useState<NormalizedUploadedFile | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const { data: metodosRes, isLoading: loadingMetodos } = useMetodosPago();
  const metodos = useMemo(
    () => (metodosRes?.data ?? []).filter((m) => m.activo),
    [metodosRes],
  );
  const selectedMetodo = metodos.find((m) => m.id === metodoPagoId) ?? null;
  const isCashPayment =
    !selectedMetodo || selectedMetodo.codigo === CASH_METHOD_CODE;
  const requiresDigitalProof =
    selectedMetodo?.codigo === DIGITAL_PROOF_METHOD_CODE;

  useEffect(() => {
    if (metodoPagoId || metodos.length === 0) return;
    const preferred =
      metodos.find((m) => m.codigo === CASH_METHOD_CODE)?.id ??
      metodos[0]?.id ??
      "";
    if (preferred) setMetodoPagoId(preferred);
  }, [metodoPagoId, metodos]);

  // ── Almacén ─────────────────────────────────────────────────────────
  const { data: almacenesRes } = useAlmacenes();
  const almacenes = useMemo(
    () => (almacenesRes?.data ?? []).filter((a) => a.activo),
    [almacenesRes],
  );
  const [almacenId, setAlmacenId] = useState("");
  useEffect(() => {
    if (almacenId || almacenes.length === 0) return;
    const preferred =
      almacenes.find((a) => a.esPrincipal)?.id ?? almacenes[0]?.id ?? "";
    if (preferred) setAlmacenId(preferred);
  }, [almacenId, almacenes]);

  // ── Configuración SUNAT ─────────────────────────────────────────────
  const configFiscalQ = useConfigFiscal();
  const configFiscal = configFiscalQ.data?.data ?? null;
  const formatoDefault = configFiscal?.formatoImpresionDefault;
  const publicBrandingQ = usePublicBranding();
  const empresaPublica = publicBrandingQ.data?.data ?? null;

  useEffect(() => {
    if (formatoDefault) {
      setFormatoImpresion(formatoDefault);
    }
  }, [formatoDefault]);

  // ── Vuelto ──────────────────────────────────────────────────────────
  const recibido = asNumber(montoRecibido);
  const diferenciaPago = recibido > 0 ? recibido - cart.totals.total : 0;
  const vuelto = Math.max(0, diferenciaPago);
  const faltante = recibido > 0 ? Math.max(0, -diferenciaPago) : 0;

  // ── Lógica derivada ─────────────────────────────────────────────────
  const requiresIdentificacion = useMemo(() => {
    if (tipoDoc === TipoDocumento.FACTURA) return true;
    if (cart.totals.total >= BOLETA_UMBRAL_IDENTIFICACION) return true;
    return false;
  }, [tipoDoc, cart.totals.total]);
  const isVentaInternaLegal =
    modoCliente === "GENERICO" &&
    cart.totals.total <= LIMITE_VENTA_INTERNA_LEGAL;

  useEffect(() => {
    if (requiresIdentificacion && modoCliente === "GENERICO") {
      setModoCliente("IDENTIFICADO");
    }
  }, [requiresIdentificacion, modoCliente]);

  useEffect(() => {
    if (modoCliente === "GENERICO") {
      if (clienteSel) {
        setClienteSel(null);
        setClienteQuery("");
      }
      if (tipoDoc === TipoDocumento.FACTURA) {
        setTipoDoc(TipoDocumento.BOLETA);
      }
    }
  }, [modoCliente, clienteSel, tipoDoc]);

  // ── Validaciones espejo backend ─────────────────────────────────────
  const validacionFactura = useMemo<string | null>(() => {
    if (tipoDoc !== TipoDocumento.FACTURA) return null;
    if (!clienteSel)
      return "Selecciona un cliente identificado para emitir factura";
    if (!isSunatRuc(clienteSel.ruc))
      return "La factura requiere un RUC SUNAT válido (11 dígitos, mod 11)";
    if (!clienteSel.razonSocial?.trim())
      return "La factura requiere razón social en el cliente";
    if (!clienteSel.direccion?.trim())
      return "La factura requiere dirección fiscal en el cliente";
    return null;
  }, [tipoDoc, clienteSel]);

  const validacionBoleta700 = useMemo<string | null>(() => {
    if (tipoDoc !== TipoDocumento.BOLETA) return null;
    if (cart.totals.total < BOLETA_UMBRAL_IDENTIFICACION) return null;
    if (!clienteSel?.dni && !clienteSel?.ruc) {
      return `Boletas ≥ S/ ${BOLETA_UMBRAL_IDENTIFICACION} requieren DNI o RUC del cliente (obligación SUNAT)`;
    }
    return null;
  }, [tipoDoc, cart.totals.total, clienteSel]);

  // ── Submit ──────────────────────────────────────────────────────────
  const createVenta = useCreateVenta();
  const [submitting, setSubmitting] = useState<null | "cotizacion" | "cobrar">(
    null,
  );

  const upsertGenericClient = useCallback(async (): Promise<string> => {
    try {
      const res = await api.get<{ data: ClienteRaw[] }>(
        `/clientes?esGenerico=true&limit=1`,
      );
      const found = res.data?.[0];
      if (found?.id) return found.id;
    } catch {
      /* continuamos con create */
    }
    const createRes = (await createCliente.mutateAsync({
      tipo: TipoCliente.NATURAL,
      nombre: POS_GENERIC_CLIENT_NAME,
      apellido: "-",
      dni: "00000000",
      activo: true,
      esGenerico: true,
    })) as { data?: { id: string } };
    if (!createRes?.data?.id)
      throw new Error("No se pudo obtener el cliente genérico");
    return createRes.data.id;
  }, [createCliente]);

  // ── Limpieza file preview ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      revokeObjectPreviewUrl(paymentProof?.previewUrl);
    };
  }, [paymentProof]);

  const clearPaymentProof = useCallback(() => {
    revokeObjectPreviewUrl(paymentProof?.previewUrl);
    setPaymentProof(null);
  }, [paymentProof]);

  const handlePaymentProofSelected = useCallback(
    async (file: File | null) => {
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
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo adjuntar el comprobante de pago",
        );
      } finally {
        setIsUploadingProof(false);
      }
    },
    [paymentProof],
  );

  // ── Validación pre-submit ───────────────────────────────────────────
  const validarPreSubmit = useCallback(
    (modo: "cotizacion" | "cobrar"): string | null => {
      if (cart.lines.length === 0) return "El carrito está vacío";
      if (modo === "cotizacion") {
        if (modoCliente === "IDENTIFICADO" && !clienteSel)
          return "Selecciona un cliente o cambia a Público en General";
        if (validacionFactura) return validacionFactura;
        return null;
      }
      // Cobrar
      if (!aperturaActiva) return "Debes abrir tu caja antes de cobrar";
      if (!isVentaInternaLegal) {
        if (configFiscalQ.isLoading) {
          return "Cargando configuración tributaria de la empresa";
        }
        if (
          !configFiscal?.ruc ||
          !configFiscal?.razonSocial ||
          !configFiscal?.direccionFiscal
        ) {
          return "Completa Configuración > Tributario antes de enviar a comprobantes";
        }
      }
      if (!almacenId) return "Selecciona un almacén";
      if (!metodoPagoId) return "Selecciona un método de pago";
      if (requiresDigitalProof && !paymentProof?.filename)
        return "Adjunta el comprobante del pago digital";
      if (isCashPayment && recibido > 0 && recibido < cart.totals.total)
        return "El monto recibido es menor al total";
      if (modoCliente === "IDENTIFICADO" && !clienteSel)
        return "Selecciona un cliente identificado o cambia a Público en General";
      if (validacionBoleta700) return validacionBoleta700;
      if (validacionFactura) return validacionFactura;
      return null;
    },
    [
      cart.lines.length,
      cart.totals.total,
      modoCliente,
      clienteSel,
      validacionFactura,
      validacionBoleta700,
      aperturaActiva,
      configFiscalQ.isLoading,
      configFiscal?.ruc,
      configFiscal?.razonSocial,
      configFiscal?.direccionFiscal,
      isVentaInternaLegal,
      almacenId,
      metodoPagoId,
      requiresDigitalProof,
      paymentProof?.filename,
      isCashPayment,
      recibido,
    ],
  );

  // ── Confirmación / Ticket ───────────────────────────────────────────
  const [confirmacion, setConfirmacion] = useState<{
    venta: VentaCreada;
    comprobante?: ComprobanteCreado;
    total: number;
    ventaInterna: boolean;
  } | null>(null);
  const [printData, setPrintData] = useState<ThermalReceiptData | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  // ── Redirect a /pos si llegan al paso 2 sin carrito ────────────────
  useEffect(() => {
    if (cart.lines.length === 0 && !confirmacion) {
      router.replace("/pos");
    }
  }, [cart.lines.length, confirmacion, router]);

  // ── Handlers de submit ──────────────────────────────────────────────
  const handleGuardarCotizacion = useCallback(async () => {
    const err = validarPreSubmit("cotizacion");
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting("cotizacion");
    try {
      const clienteId =
        modoCliente === "GENERICO"
          ? await upsertGenericClient()
          : clienteSel!.id;
      const res = (await createVenta.mutateAsync({
        clienteId,
        notas: cart.notas || undefined,
        detalles: cart.lines.map((l) => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          descuento: l.descuento || undefined,
          equipoSerie: l.equipoSerie || undefined,
        })),
      })) as { data?: VentaCreada };
      toast.success(`Cotización ${res.data?.numero ?? "guardada"}`);
      cart.clear();
      router.push("/pos");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al guardar cotización",
      );
    } finally {
      setSubmitting(null);
    }
  }, [
    validarPreSubmit,
    modoCliente,
    upsertGenericClient,
    clienteSel,
    createVenta,
    cart,
    router,
  ]);

  const handleCobrar = useCallback(async () => {
    const err = validarPreSubmit("cobrar");
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting("cobrar");
    try {
      const clienteId =
        modoCliente === "GENERICO"
          ? await upsertGenericClient()
          : clienteSel!.id;
      const detalles = cart.lines.map((l) => ({
        productoId: l.productoId,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        descuento: l.descuento || undefined,
        equipoSerie: l.equipoSerie || undefined,
      }));

      let comprobante: ComprobanteCreado | undefined;

      const ventaRes = (await createVenta.mutateAsync({
        clienteId,
        notas: cart.notas || undefined,
        detalles,
      })) as { data?: VentaCreada };
      const venta = ventaRes.data;
      if (!venta?.id) throw new Error("No se obtuvo ID de la venta");
      await api.patch(`/ventas/${venta.id}/confirmar`, {
        metodoPagoId,
        almacenId,
        referenciaPago: referenciaPago || undefined,
        evidenciaPagoFilename: paymentProof?.filename,
        ventaInterna: isVentaInternaLegal,
      });

      if (!venta?.id) throw new Error("No se obtuvo ID de la venta cobrada");
      toast.success(
        isVentaInternaLegal
          ? `Venta interna ${venta.numero ?? venta.id} cobrada`
          : `Venta ${venta.numero ?? venta.id} cobrada y enviada a Por emitir`,
      );

      const [freshFiscalRes, freshEmpresaRes] = await Promise.all([
        api.get<ApiDataEnvelope<ConfigEmpresaFiscalItem | null>>(
          "/facturacion/config-fiscal",
        ),
        api.get<ApiDataEnvelope<EmpresaPublica>>("/config/empresa/publica", {
          skipAuth: true,
        }),
      ]);
      const freshConfigFiscal =
        unwrapApiData<ConfigEmpresaFiscalItem | null>(freshFiscalRes) ??
        configFiscal;
      const freshEmpresaPublica =
        unwrapApiData<EmpresaPublica>(freshEmpresaRes) ?? empresaPublica;
      const empresaComprobante = buildEmpresaPrintData(
        freshConfigFiscal,
        freshEmpresaPublica,
      );
      if (
        !isVentaInternaLegal &&
        (!empresaComprobante.ruc ||
          !empresaComprobante.nombre ||
          !empresaComprobante.direccion)
      ) {
        throw new Error(
          "No se pudo cargar la configuración tributaria real para imprimir",
        );
      }

      const metodoNombre = selectedMetodo?.nombre;
      const clienteNombre =
        modoCliente === "GENERICO"
          ? POS_GENERIC_CLIENT_NAME
          : clienteLabel(clienteSel!);
      const docTipo = clienteSel?.ruc
        ? "RUC"
        : clienteSel?.dni
          ? "DNI"
          : undefined;
      const docNumero = clienteSel?.ruc ?? clienteSel?.dni ?? undefined;
      const fechaComprobante =
        comprobante?.fechaEmision ?? new Date().toISOString();
      const hasComprobante = Boolean(comprobante?.numero);
      const hashFirma = firstText(comprobante?.hashCpe, comprobante?.hashSunat);
      const qrPayload = hasComprobante
        ? buildSunatQrPayload({
            ruc: empresaComprobante.ruc,
            tipo: tipoDoc,
            comprobante,
            igv: cart.totals.igv,
            total: cart.totals.total,
            fecha: fechaComprobante,
            docTipo,
            docNumero,
            hashFirma,
          })
        : undefined;

      setPrintData({
        empresa: empresaComprobante,
        comprobante: {
          tipo: hasComprobante
            ? tipoDoc
            : isVentaInternaLegal
              ? "VENTA_INTERNA"
              : "VENTA",
          serie: comprobante?.serie,
          numero: comprobante?.numero ?? venta.numero,
          fecha: fechaComprobante,
          estado: hasComprobante
            ? undefined
            : isVentaInternaLegal
              ? "INTERNA"
              : "PENDIENTE DE EMISION",
          esComprobanteElectronico: hasComprobante,
          leyendaTipo: hasComprobante
            ? undefined
            : isVentaInternaLegal
              ? "TICKET INTERNO - NO ES COMPROBANTE FISCAL"
              : tipoDoc === TipoDocumento.FACTURA
                ? "VENTA PENDIENTE DE FACTURA"
                : "VENTA PENDIENTE DE BOLETA",
        },
        cliente: {
          nombre: clienteNombre,
          docTipo,
          docNumero,
          direccion: clienteSel?.direccion ?? undefined,
        },
        items: cart.lines.map((l) => ({
          sku: l.sku,
          nombre: l.nombre,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          total: lineTotalInclIgv(l.cantidad, l.precioUnitario, l.descuento),
        })),
        totales: {
          opGravadas: cart.totals.subtotal,
          opExoneradas: 0,
          opInafectas: 0,
          subtotal: cart.totals.subtotal,
          igv: cart.totals.igv,
          total: cart.totals.total,
          moneda: "PEN",
        },
        pago: {
          metodo: metodoNombre,
          referencia: referenciaPago || undefined,
          formaPago: "CONTADO",
          recibido: isCashPayment && recibido > 0 ? recibido : undefined,
          vuelto: isCashPayment && vuelto > 0 ? vuelto : undefined,
        },
        ventaNumero: venta.numero,
        pieImpresion: freshConfigFiscal?.pieImpresion ?? undefined,
        qrPayload,
        hashFirma,
      });

      setConfirmacion({
        venta,
        comprobante,
        total: cart.totals.total,
        ventaInterna: isVentaInternaLegal,
      });
      cart.clear();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cobrar la venta");
    } finally {
      setSubmitting(null);
    }
  }, [
    validarPreSubmit,
    modoCliente,
    upsertGenericClient,
    clienteSel,
    cart,
    tipoDoc,
    metodoPagoId,
    almacenId,
    referenciaPago,
    paymentProof?.filename,
    selectedMetodo,
    recibido,
    vuelto,
    isCashPayment,
    isVentaInternaLegal,
    empresaPublica,
    configFiscal,
    createVenta,
  ]);

  const handleConfirmacionOpenChange = useCallback(
    (open: boolean) => {
      if (!open) router.push("/pos");
    },
    [router],
  );

  // ── UI principal ────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Top Header Row for Checkout Step - Compact and Sleek */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Cobro y comprobante
          </h1>
          <p className="text-xs text-muted-foreground font-sans mt-0.5">
            Paso 2 · Cobra la venta y define si queda interna o lista para
            comprobante.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/pos")}
          className="h-8.5 gap-2 rounded-xl text-xs border-border bg-background/50 hover:bg-primary/5 hover:text-primary active:scale-95 transition-all duration-200 cursor-pointer font-sans"
        >
          <ArrowLeft className="size-4" /> Volver al carrito
        </Button>
      </div>

      {!aperturaActiva ? (
        <div className="flex items-start gap-3 rounded-xl border border-[oklch(0.86_0.05_75)] bg-[oklch(0.96_0.02_75)] px-3 py-2.5 text-xs text-[oklch(0.38_0.08_75)] dark:border-[oklch(0.25_0.05_75)] dark:bg-[oklch(0.16_0.03_75)] dark:text-[oklch(0.78_0.08_75)]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[oklch(0.45_0.10_75)] dark:text-[oklch(0.75_0.10_75)]" />
          <div className="flex-1">
            <p className="font-semibold">No tienes una caja abierta.</p>
            <p className="opacity-90">
              Abre tu turno desde{" "}
              <Link
                href="/pos/caja"
                className="font-medium underline underline-offset-2 hover:text-[oklch(0.30_0.08_75)] dark:hover:text-[oklch(0.85_0.08_75)] transition-colors"
              >
                Caja
              </Link>{" "}
              para poder cobrar.
            </p>
          </div>
        </div>
      ) : null}

      {!configFiscalQ.isLoading ? (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-primary">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">
              {isVentaInternaLegal ? "Venta interna disponible." : "Emisión centralizada."}
            </p>
            <p className="opacity-90">
              {isVentaInternaLegal ? (
                <>
                  Público en general hasta S/{" "}
                  {LIMITE_VENTA_INTERNA_LEGAL.toFixed(2)} puede cerrarse como
                  ticket interno. No aparecerá en Por emitir.
                </>
              ) : (
                <>
                  Al cobrar, la venta quedará en{" "}
                  <Link
                    href="/comprobantes"
                    className="font-medium underline underline-offset-2"
                  >
                    Comprobantes &gt; Por emitir
                  </Link>
                  . Desde ahí se emite la boleta o factura con la validación SUNAT correspondiente.
                </>
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid h-full min-h-0 gap-2 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Columna izquierda: resumen carrito (read-only) ─── */}
        <section className="flex min-h-0 flex-col rounded-xl border border-border/80 bg-card shadow-lg shadow-primary/[0.01]">
          <header className="flex items-center justify-between border-b border-border/40 px-3 py-2.5 bg-gradient-to-r from-primary/5 via-primary/[0.01] to-transparent rounded-t-xl">
            <div>
              <h2 className="font-display text-[15px] font-bold tracking-tight text-foreground">
                Resumen del pedido
              </h2>
              <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
                {cart.totals.itemsCount}{" "}
                {cart.totals.itemsCount === 1 ? "ítem" : "ítems"} ·{" "}
                <Link
                  href="/pos"
                  className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-semibold"
                >
                  Editar carrito
                </Link>
              </p>
            </div>
          </header>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2.5">
            {cart.lines.map((l) => {
              const lineTotal = Math.max(
                0,
                l.cantidad * l.precioUnitario - l.descuento,
              );
              return (
                <div
                  key={l.id}
                  className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2 text-xs hover:border-primary/20 hover:bg-primary/[0.005] hover:shadow-sm transition-all duration-300 ease-out animate-fade-in group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">
                        {l.nombre}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {l.sku}
                        {l.equipoSerie ? ` · Serie ${l.equipoSerie}` : ""}
                      </p>
                      {l.mesesGarantia ? (
                        <p className="mt-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                          Garantía {l.mesesGarantia}{" "}
                          {l.mesesGarantia === 1 ? "mes" : "meses"}
                          {l.garantiaMaxCopias
                            ? ` · ${l.garantiaMaxCopias}k cop.`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-display font-bold text-foreground group-hover:text-primary transition-colors tabular-nums">
                      {money(lineTotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {l.cantidad} × {money(l.precioUnitario)} inc. IGV
                    {l.descuento > 0 ? ` − ${money(l.descuento)} desc.` : ""}
                  </p>
                </div>
              );
            })}
          </div>
          <Separator className="bg-border/30" />
          <div className="space-y-1.5 px-4 py-3 text-xs font-sans">
            <Row
              label="Base imponible"
              value={money(cart.totals.subtotal)}
              muted
            />
            <Row
              label="IGV incluido (18%)"
              value={money(cart.totals.igv)}
              muted
            />
            <div className="flex items-baseline justify-between pt-2 border-t border-border/40 mt-1.5">
              <span className="text-[13px] font-bold text-foreground">
                Total a cobrar (inc. IGV)
              </span>
              <span className="font-display text-3xl font-extrabold tabular-nums text-primary tracking-tight">
                {money(cart.totals.total)}
              </span>
            </div>
          </div>
        </section>

        {/* ── Columna derecha: formulario de cobro ─── */}
        <section className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {/* Cliente */}
          <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-md shadow-primary/[0.01]">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cliente
              </Label>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[11px] font-medium transition",
                    modoCliente === "GENERICO"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Público
                </span>
                <Switch
                  size="sm"
                  checked={modoCliente === "IDENTIFICADO"}
                  disabled={requiresIdentificacion}
                  onCheckedChange={(c) =>
                    setModoCliente(c ? "IDENTIFICADO" : "GENERICO")
                  }
                  aria-label="Alternar entre cliente genérico e identificado"
                />
                <span
                  className={cn(
                    "text-[11px] font-medium transition",
                    modoCliente === "IDENTIFICADO"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Identificar
                </span>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {modoCliente === "GENERICO"
                ? "Público en General · Boleta sin datos del cliente"
                : requiresIdentificacion
                  ? "Obligatorio: total ≥ S/ 700 o factura"
                  : "Permite factura o boleta ≥ S/ 700"}
            </p>

            {modoCliente === "IDENTIFICADO" ? (
              <div className="mt-3 space-y-2">
                <Popover
                  open={clienteSelectOpen}
                  onOpenChange={(open) => {
                    setClienteSelectOpen(open);
                    if (!open) setClienteQuery("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={clienteSelectOpen}
                      className={cn(
                        "h-auto min-h-12 w-full justify-between rounded-xl border-border bg-background/50 px-3 py-2 text-left shadow-inner hover:bg-primary/5 hover:border-primary/30",
                        !clienteSel && "text-muted-foreground",
                        (validacionFactura || validacionBoleta700) &&
                          !clienteSel &&
                          "border-destructive/40",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-lg border",
                            clienteSel
                              ? "border-primary/15 bg-primary/10 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {clienteSel?.tipo === TipoCliente.EMPRESA ? (
                            <Building2 className="size-4" />
                          ) : clienteSel ? (
                            <User className="size-4" />
                          ) : (
                            <UserSearch className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {clienteSel
                              ? clienteLabel(clienteSel)
                              : "Seleccionar cliente"}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <IdCard className="size-3" />
                            {clienteSel
                              ? (clienteDoc(clienteSel) ?? "Sin documento")
                              : "Buscar por nombre, RUC o DNI"}
                          </span>
                        </span>
                      </span>
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-2xl border-border/80 p-0 shadow-xl"
                    onWheel={(event) => event.stopPropagation()}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        value={clienteQuery}
                        onValueChange={setClienteQuery}
                        placeholder="Buscar por nombre, RUC o DNI…"
                      />
                      <CommandList className="max-h-72 overflow-y-auto overscroll-contain">
                        {clientesQ.isFetching ? (
                          <CommandItem value="buscando" disabled>
                            <Loader2 className="size-4 animate-spin opacity-70" />
                            <span>Buscando clientes…</span>
                          </CommandItem>
                        ) : null}

                        {!clientesQ.isFetching &&
                        clientesEncontrados.length === 0 ? (
                          <CommandGroup>
                            <CommandItem value="sin-clientes" disabled>
                              <div className="flex w-full flex-col items-center gap-2 py-4 text-center">
                                <UserSearch className="size-8 text-muted-foreground/40" />
                                <p className="text-xs font-medium">
                                  {debouncedClienteQuery
                                    ? `Sin coincidencias para “${debouncedClienteQuery}”`
                                    : "No hay clientes activos para mostrar"}
                                </p>
                              </div>
                            </CommandItem>
                          </CommandGroup>
                        ) : null}

                        <CommandEmpty>No se encontraron clientes.</CommandEmpty>

                        {clientesEncontrados.length > 0 ? (
                          <CommandGroup heading="Clientes activos">
                            {clientesEncontrados.map((cliente) => {
                              const ClienteIcon =
                                cliente.tipo === TipoCliente.EMPRESA
                                  ? Building2
                                  : User;
                              const doc = clienteDoc(cliente);
                              const selected = clienteSel?.id === cliente.id;

                              return (
                                <CommandItem
                                  key={cliente.id}
                                  value={`${clienteLabel(cliente)} ${doc ?? ""}`}
                                  onSelect={() => {
                                    setClienteSel(cliente);
                                    setClienteQuery("");
                                    setClienteSelectOpen(false);
                                  }}
                                  className="items-start gap-2.5 py-2.5"
                                >
                                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                    <ClienteIcon className="size-4" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold">
                                      {clienteLabel(cliente)}
                                    </span>
                                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                                      <span className="font-mono uppercase">
                                        {doc ?? "Sin documento"}
                                      </span>
                                      {cliente.telefono || cliente.celular ? (
                                        <span>
                                          {cliente.telefono ?? cliente.celular}
                                        </span>
                                      ) : null}
                                    </span>
                                  </span>
                                  <Check
                                    className={cn(
                                      "mt-1 size-4 shrink-0 text-primary",
                                      selected ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        ) : null}

                        <CommandGroup heading="Acciones">
                          <CommandItem
                            value="crear cliente nuevo"
                            onSelect={() => {
                              setCreateClienteOpen(true);
                              setClienteSelectOpen(false);
                            }}
                            className="gap-2 text-primary"
                          >
                            <UserPlus className="size-4" />
                            <span>Crear cliente nuevo</span>
                          </CommandItem>
                          {clienteSel ? (
                            <CommandItem
                              value="limpiar cliente"
                              onSelect={() => {
                                setClienteSel(null);
                                setClienteQuery("");
                                setClienteSelectOpen(false);
                              }}
                              className="gap-2 text-muted-foreground"
                            >
                              <X className="size-4" />
                              <span>Quitar selección</span>
                            </CommandItem>
                          ) : null}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {clienteSel ? (
                  <div className="grid gap-2 rounded-xl border border-primary/15 bg-primary/[0.03] px-3 py-2 text-[11px] sm:grid-cols-3">
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Tipo</span>
                      <p className="truncate font-semibold">
                        {clienteSel.tipo === TipoCliente.EMPRESA
                          ? "Empresa"
                          : "Persona natural"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Documento</span>
                      <p className="truncate font-mono font-semibold">
                        {clienteDoc(clienteSel) ?? "—"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Contacto</span>
                      <p className="truncate font-semibold">
                        {clienteSel.telefono ?? clienteSel.celular ?? "—"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {validacionBoleta700 ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{validacionBoleta700}</span>
              </div>
            ) : null}
            {validacionFactura ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{validacionFactura}</span>
              </div>
            ) : null}
          </div>

          {/* Tipo comprobante + método de pago */}
          <div className="grid gap-3 rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-md shadow-primary/[0.01] md:grid-cols-2 xl:grid-cols-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tipo de comprobante
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <TipoDocTile
                  label="Boleta"
                  hint="Consumidor final / DNI"
                  active={tipoDoc === TipoDocumento.BOLETA}
                  onClick={() => setTipoDoc(TipoDocumento.BOLETA)}
                />
                <TipoDocTile
                  label="Factura"
                  hint={
                    modoCliente === "GENERICO"
                      ? "Requiere cliente identificado"
                      : "Empresa con RUC"
                  }
                  active={tipoDoc === TipoDocumento.FACTURA}
                  onClick={() => {
                    if (modoCliente === "GENERICO") {
                      setModoCliente("IDENTIFICADO");
                    }
                    setTipoDoc(TipoDocumento.FACTURA);
                  }}
                  disabled={modoCliente === "GENERICO"}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Método de pago
              </Label>
              {loadingMetodos ? (
                <div className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Cargando…
                </div>
              ) : metodos.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-[oklch(0.86_0.05_75)] bg-[oklch(0.96_0.02_75)] p-2.5 text-[11px] text-[oklch(0.38_0.08_75)] dark:border-[oklch(0.25_0.05_75)] dark:bg-[oklch(0.16_0.03_75)] dark:text-[oklch(0.78_0.08_75)]">
                  No hay métodos de pago activos.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {metodos.map((m) => {
                    const Icon = metodoIcon(m.codigo);
                    const active = metodoPagoId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodoPagoId(m.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ease-out active:scale-95 cursor-pointer w-full font-sans shadow-sm",
                          active
                            ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/[0.05]"
                            : "border-border bg-background/50 hover:border-primary/30 hover:bg-primary/[0.02] text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate max-w-full leading-none">
                          {m.nombre}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Formato al finalizar
              </Label>
              <Select
                value={formatoImpresion}
                onValueChange={(value) =>
                  setFormatoImpresion(value as FormatoImpresionDocumento)
                }
              >
                <SelectTrigger className="mt-2 h-12 rounded-xl border-border bg-background/50 text-sm focus:border-primary/40 focus:ring-primary/20">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATO_IMPRESION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {option.hint}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Default:{" "}
                {formatoDefault
                  ? formatoLabel(formatoDefault)
                  : "Ticket si no hay configuración"}
                .
              </p>
            </div>
          </div>

          {/* Pago: efectivo (recibido/vuelto) o digital (evidencia) */}
          <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-md shadow-primary/[0.01]">
            {isCashPayment ? (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recibido (efectivo)
                </Label>
                <Input
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="h-11 rounded-lg border-border text-right text-lg font-bold tabular-nums focus-visible:ring-primary/20 focus-visible:border-primary/40 bg-background/50 focus:bg-background transition-all duration-300"
                />
                {recibido > 0 && recibido < cart.totals.total ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs">
                    <Row label="Falta" value={money(faltante)} />
                  </div>
                ) : null}
                {recibido > cart.totals.total ? (
                  <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs dark:bg-primary/10">
                    <Row
                      label="Vuelto"
                      value={money(vuelto)}
                      className="font-semibold text-primary"
                    />
                  </div>
                ) : null}
              </div>
            ) : requiresDigitalProof ? (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Evidencia del pago digital *
                </Label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 bg-background px-4 py-4 text-center text-xs transition hover:border-primary/40 hover:bg-primary/5">
                  <input
                    type="file"
                    className="sr-only"
                    accept={getUploadAcceptAttr("mixed")}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handlePaymentProofSelected(file);
                      e.currentTarget.value = "";
                    }}
                    disabled={isUploadingProof}
                  />
                  {isUploadingProof ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <span className="font-medium">Subiendo…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 text-primary" />
                      <span className="font-medium">
                        Adjuntar captura o PDF
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        JPG, PNG, WEBP o PDF · hasta 5 MB
                      </span>
                    </>
                  )}
                </label>
                {paymentProof ? (
                  <div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1.5 dark:bg-primary/10">
                    {paymentProof.isImage ? (
                      <FileImage className="mt-0.5 size-4 text-primary" />
                    ) : (
                      <FileText className="mt-0.5 size-4 text-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {paymentProof.originalName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {(paymentProof.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={clearPaymentProof}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  N.º de operación
                </Label>
                <Input
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Opcional"
                  className="h-9.5 rounded-xl border-border text-sm focus-visible:ring-primary/20 focus-visible:border-primary/40 bg-background/50 focus:bg-background transition-all duration-300"
                />
              </div>
            )}
          </div>

          {/* Almacén + Notas */}
          <div className="grid gap-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-md shadow-primary/[0.01] md:grid-cols-[200px_1fr]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Almacén
              </Label>
              <Select value={almacenId} onValueChange={setAlmacenId}>
                <SelectTrigger className="h-9.5 rounded-xl border-border text-sm focus:border-primary/40 focus:ring-primary/20 bg-background/50 transition-all duration-300">
                  <SelectValue placeholder="Almacén" />
                </SelectTrigger>
                <SelectContent>
                  {almacenes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notas
              </Label>
              <Textarea
                value={cart.notas}
                onChange={(e) => cart.setNotas(e.target.value)}
                placeholder="Observaciones internas (opcional)"
                className="min-h-[50px] resize-none rounded-xl border-border text-xs focus-visible:ring-primary/20 focus-visible:border-primary/40 bg-background/50 focus:bg-background transition-all duration-300"
              />
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              size="lg"
              onClick={() => void handleCobrar()}
              disabled={
                submitting !== null ||
                !aperturaActiva ||
                !!validacionBoleta700 ||
                !!validacionFactura
              }
              className="h-13 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/10 hover:bg-primary/95 active:scale-[0.97] transition-all duration-200 cursor-pointer gap-2"
            >
              {submitting === "cobrar" ? (
                <Loader2 className="size-4.5 animate-spin" />
              ) : (
                <Receipt className="size-4.5" />
              )}
              {isVentaInternaLegal ? "Cobrar venta interna" : "Cobrar y enviar a Por emitir"} · {money(cart.totals.total)}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleGuardarCotizacion()}
              disabled={submitting !== null}
              className="h-11 rounded-xl border-border bg-background/50 hover:bg-primary/5 hover:border-primary/20 hover:text-primary active:scale-[0.98] transition-all duration-200 cursor-pointer text-xs font-semibold text-muted-foreground gap-2"
            >
              {submitting === "cotizacion" ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Save className="size-4 text-muted-foreground/80 group-hover:text-primary" />
              )}
              Guardar como cotización
            </Button>
          </div>
        </section>
      </div>

      <ClienteQuickCreateModal
        open={createClienteOpen}
        onClose={() => setCreateClienteOpen(false)}
        onCreated={(c) => {
          // El modal devuelve un cliente con id; refrescamos consulta y lo
          // seleccionamos. Como `useClientes` cachea, le pasamos el cliente
          // armado a mano con los campos que conocemos.
          setClienteSel({
            id: c.id,
            nombre: c.nombre ?? null,
            apellido: c.apellido ?? null,
            razonSocial: c.razonSocial ?? null,
            ruc: null,
            dni: null,
            email: null,
            telefono: null,
            celular: null,
            direccion: null,
            tipo: TipoCliente.NATURAL,
            activo: true,
          } as unknown as ClienteListItem);
          setClienteQuery("");
          toast.info(
            "Cliente creado y seleccionado. Si necesitas RUC o dirección, edítalo en /clientes.",
          );
        }}
      />

      <Dialog
        open={!!confirmacion}
        onOpenChange={handleConfirmacionOpenChange}
      >
        <DialogContent className="max-w-xl rounded-3xl border-emerald-500/20 p-0 shadow-2xl shadow-emerald-500/[0.08]">
          <div className="flex flex-col items-center gap-5 px-6 py-7 text-center sm:px-8">
            <div className="grid size-16 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="size-9" />
            </div>
            <DialogHeader className="items-center text-center">
              <DialogTitle className="font-display text-2xl font-black uppercase tracking-tight text-emerald-600 dark:text-emerald-400">
                Venta cobrada con éxito
              </DialogTitle>
            </DialogHeader>
            {confirmacion ? (
              <>
                <div className="w-full space-y-1 rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
                  {confirmacion.venta.numero ? (
                    <p className="flex items-center justify-between gap-4 text-xs font-semibold text-muted-foreground">
                      <span>Código de venta:</span>
                      <span className="font-mono text-[13px] font-bold text-foreground">
                        {confirmacion.venta.numero}
                      </span>
                    </p>
                  ) : null}
                  {confirmacion.comprobante?.numero ? (
                    <p className="flex items-center justify-between gap-4 border-t border-border/40 pt-1.5 text-xs font-semibold text-muted-foreground">
                      <span>
                        {tipoDoc === TipoDocumento.FACTURA
                          ? "Factura electrónica"
                          : "Boleta de venta"}
                        :
                      </span>
                      <span className="font-mono text-[13px] font-bold text-foreground">
                        {confirmacion.comprobante.numero}
                      </span>
                    </p>
                  ) : (
                    <p className="flex items-center justify-between gap-4 border-t border-border/40 pt-1.5 text-xs font-semibold text-muted-foreground">
                      <span>Estado fiscal:</span>
                      <span className="font-bold text-foreground">
                        {confirmacion.ventaInterna
                          ? "Ticket interno"
                          : "Pendiente en Comprobantes"}
                      </span>
                    </p>
                  )}
                  <p className="flex items-center justify-between gap-4 border-t border-border/40 pt-1.5 text-xs font-semibold text-muted-foreground">
                    <span>Formato:</span>
                    <span className="font-bold text-foreground">
                      {formatoLabel(formatoImpresion)}
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/10 px-6 py-3 dark:bg-emerald-500/[0.07]">
                  <span className="block text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Total cobrado
                  </span>
                  <p className="mt-0.5 font-display text-3xl font-black tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                    {money(confirmacion.total)}
                  </p>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter className="grid gap-2 border-t border-border/50 bg-muted/20 px-6 py-4 sm:grid-cols-2 sm:gap-2">
            {printData ? (
              <Button
                variant="outline"
                onClick={() => setPrintOpen(true)}
                className="h-11 gap-2 rounded-xl border-border bg-background/70 text-xs font-semibold hover:border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-500"
              >
                <Printer className="size-4" /> Imprimir{" "}
                {formatoLabel(formatoImpresion)}
              </Button>
            ) : null}
            {confirmacion?.venta.id && !confirmacion.ventaInterna ? (
              <Button
                asChild
                className="h-11 gap-2 rounded-xl text-xs font-extrabold"
              >
                <Link href={`/comprobantes?ventaId=${confirmacion.venta.id}`}>
                  <Receipt className="size-4" /> Ir a Por emitir
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/pos")}
                className="h-11 gap-2 rounded-xl text-xs font-extrabold"
              >
                <Sparkles className="size-4" /> Nueva venta
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="h-10 gap-2 rounded-xl text-xs font-semibold text-muted-foreground sm:col-span-2"
            >
              <Link href="/ventas">Ver historial de ventas</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ThermalReceiptDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        data={printData}
        format={formatoImpresion}
      />
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  className,
}: {
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        muted ? "text-muted-foreground" : "",
        className,
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function TipoDocTile({
  label,
  hint,
  active,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all duration-300 ease-out active:scale-98 cursor-pointer w-full font-sans shadow-sm",
        active
          ? "border-primary bg-primary/[0.04] text-primary shadow-sm shadow-primary/[0.05]"
          : "border-border bg-card hover:border-primary/30 hover:bg-primary/[0.01]",
        disabled &&
          "cursor-not-allowed opacity-40 hover:bg-card hover:border-border shadow-none active:scale-100",
      )}
    >
      <span className="text-[13px] font-bold tracking-tight">{label}</span>
      <span className="text-[10px] text-muted-foreground leading-normal font-medium">
        {hint}
      </span>
    </button>
  );
}
