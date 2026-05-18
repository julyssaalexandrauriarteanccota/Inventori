"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileImage,
  FileText,
  Loader2,
  Plus,
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
  ModalidadEnvioBoletas,
  TipoCliente,
  TipoDocumento,
  type ClienteListItem,
} from "@erp/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import {
  ThermalReceiptDialog,
  type ThermalReceiptData,
} from "@/components/pos/thermal-receipt";
import { ClienteQuickCreateModal } from "@/components/modals/cliente-quick-create-modal";

import { useMiAperturaActiva } from "@/hooks/use-caja";
import { useClientes, useCreateCliente } from "@/hooks/use-clientes";
import { useMetodosPago } from "@/hooks/use-configuracion";
import { useDebounce } from "@/hooks/use-debounce";
import { useConfigFiscal, useEmitirComprobante } from "@/hooks/use-facturacion";
import { useAlmacenes } from "@/hooks/use-inventario";
import { useCreateVenta } from "@/hooks/use-ventas";
import { api } from "@/lib/api";
import {
  getUploadAcceptAttr,
  revokeObjectPreviewUrl,
  uploadSelectedFiles,
  type NormalizedUploadedFile,
} from "@/lib/file-uploads";
import { POS_GENERIC_CLIENT_NAME } from "@/lib/pos-navigation";
import {
  BOLETA_UMBRAL_IDENTIFICACION,
  isSunatRuc,
} from "@/lib/sunat-validators";
import { cn } from "@/lib/utils";

import { useCart } from "../_components/cart-context";

const CASH_METHOD_CODE = "EFECTIVO";
const DIGITAL_PROOF_METHOD_CODE = "YAPE_PLIN";

type ModoCliente = "GENERICO" | "IDENTIFICADO";
type ClienteRaw = { id: string };
type VentaCreada = { id: string; numero?: string };
type ComprobanteCreado = { id?: string; numero?: string };
type CobrarEmitirPosResponse = {
  data?: { venta?: VentaCreada; comprobante?: ComprobanteCreado };
};

function asNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function money(n: number) {
  return `S/ ${n.toFixed(2)}`;
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
  const [clienteQuery, setClienteQuery] = useState("");
  const debouncedClienteQuery = useDebounce(clienteQuery, 250);
  const [createClienteOpen, setCreateClienteOpen] = useState(false);

  const clientesQ = useClientes({
    page: 1,
    limit: 6,
    activo: true,
    search: debouncedClienteQuery || undefined,
  });
  const clientesEncontrados = useMemo(
    () => (debouncedClienteQuery ? clientesQ.data?.data ?? [] : []),
    [clientesQ.data?.data, debouncedClienteQuery],
  );
  const createCliente = useCreateCliente();

  // ── Tipo de comprobante ─────────────────────────────────────────────
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>(TipoDocumento.BOLETA);

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
  const selectedMetodo =
    metodos.find((m) => m.id === metodoPagoId) ?? null;
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

  // ── Modalidad SUNAT ─────────────────────────────────────────────────
  const configFiscalQ = useConfigFiscal();
  const modalidadBoletas = configFiscalQ.data?.data?.modalidadEnvioBoletas;
  const modalidadIndividual =
    modalidadBoletas === ModalidadEnvioBoletas.INDIVIDUAL;

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
  const emitirComprobanteMut = useEmitirComprobante();
  const [submitting, setSubmitting] = useState<
    null | "cotizacion" | "cobrar"
  >(null);

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

      let venta: VentaCreada | undefined;
      let comprobante: ComprobanteCreado | undefined;

      if (tipoDoc === TipoDocumento.BOLETA && modalidadIndividual) {
        const res = await api.post<CobrarEmitirPosResponse>(
          "/ventas/pos/cobrar-emitir",
          {
            clienteId,
            notas: cart.notas || undefined,
            detalles,
            metodoPagoId,
            almacenId,
            referenciaPago: referenciaPago || undefined,
            evidenciaPagoFilename: paymentProof?.filename,
          },
        );
        venta = res.data?.venta;
        comprobante = res.data?.comprobante;
      } else if (tipoDoc === TipoDocumento.BOLETA) {
        const ventaRes = (await createVenta.mutateAsync({
          clienteId,
          notas: cart.notas || undefined,
          detalles,
        })) as { data?: VentaCreada };
        venta = ventaRes.data;
        if (!venta?.id) throw new Error("No se obtuvo ID de la venta");
        await api.patch(`/ventas/${venta.id}/confirmar`, {
          metodoPagoId,
          almacenId,
          referenciaPago: referenciaPago || undefined,
          evidenciaPagoFilename: paymentProof?.filename,
        });
      } else {
        const ventaRes = (await createVenta.mutateAsync({
          clienteId,
          notas: cart.notas || undefined,
          detalles,
        })) as { data?: VentaCreada };
        venta = ventaRes.data;
        if (!venta?.id) throw new Error("No se obtuvo ID de la venta");
        await api.patch(`/ventas/${venta.id}/confirmar`, {
          metodoPagoId,
          almacenId,
          referenciaPago: referenciaPago || undefined,
          evidenciaPagoFilename: paymentProof?.filename,
        });
        const emitRes = (await emitirComprobanteMut.mutateAsync({
          ventaId: venta.id,
          tipo: TipoDocumento.FACTURA,
        })) as { data?: ComprobanteCreado };
        comprobante = emitRes.data;
      }

      if (!venta?.id) throw new Error("No se obtuvo ID de la venta cobrada");
      toast.success(`Venta ${venta.numero ?? venta.id} cobrada`);

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

      setPrintData({
        empresa: { nombre: "INVENTORI POS" },
        comprobante: {
          tipo: tipoDoc,
          numero: comprobante?.numero,
          fecha: new Date().toISOString(),
        },
        cliente: { nombre: clienteNombre, docTipo, docNumero },
        items: cart.lines.map((l) => ({
          sku: l.sku,
          nombre: l.nombre,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          total: Math.max(0, l.cantidad * l.precioUnitario - l.descuento),
        })),
        totales: {
          subtotal: cart.totals.subtotal,
          igv: cart.totals.igv,
          total: cart.totals.total,
        },
        pago: {
          metodo: metodoNombre,
          referencia: referenciaPago || undefined,
        },
        ventaNumero: venta.numero,
      });

      setConfirmacion({ venta, comprobante, total: cart.totals.total });
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
    modalidadIndividual,
    metodoPagoId,
    almacenId,
    referenciaPago,
    paymentProof?.filename,
    selectedMetodo,
    createVenta,
    emitirComprobanteMut,
  ]);

  // ── Pantalla de éxito ───────────────────────────────────────────────
  if (confirmacion) {
    return (
      <>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-primary/20 bg-card px-6 py-12 text-center shadow-sm">
          <div className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <CheckCircle2 className="size-9" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Venta cobrada</h1>
            {confirmacion.venta.numero ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Venta{" "}
                <span className="font-mono font-semibold">
                  {confirmacion.venta.numero}
                </span>
              </p>
            ) : null}
            {confirmacion.comprobante?.numero ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {tipoDoc === TipoDocumento.FACTURA ? "Factura" : "Boleta"}{" "}
                <span className="font-mono font-semibold">
                  {confirmacion.comprobante.numero}
                </span>
              </p>
            ) : null}
            <p className="mt-3 text-3xl font-bold tabular-nums text-primary">
              {money(confirmacion.total)}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {printData ? (
              <Button
                variant="outline"
                onClick={() => setPrintOpen(true)}
                className="rounded-xl"
              >
                <Printer className="size-4" /> Imprimir ticket
              </Button>
            ) : null}
            <Button
              onClick={() => router.push("/pos")}
              className="rounded-xl bg-primary text-primary-foreground"
            >
              <Sparkles className="size-4" /> Nueva venta
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/pos/historial">Historial</Link>
            </Button>
          </div>
        </div>
        <ThermalReceiptDialog
          open={printOpen}
          onOpenChange={setPrintOpen}
          data={printData}
        />
      </>
    );
  }

  // ── UI principal ────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader
        title="Cobro y emisión"
        description="Paso 2 · Cliente, comprobante y método de pago. El carrito está fijado del paso anterior."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/pos")}
            className="gap-2 rounded-xl"
          >
            <ArrowLeft className="size-4" /> Volver al carrito
          </Button>
        }
      />

      {!aperturaActiva ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">No tienes una caja abierta.</p>
            <p className="opacity-90">
              Abre tu turno desde{" "}
              <Link
                href="/pos/caja"
                className="font-medium underline underline-offset-2"
              >
                Caja
              </Link>{" "}
              para poder cobrar.
            </p>
          </div>
        </div>
      ) : null}

      {tipoDoc === TipoDocumento.BOLETA &&
      !modalidadIndividual &&
      !configFiscalQ.isLoading ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">
              Modalidad de boletas no es INDIVIDUAL.
            </p>
            <p className="opacity-90">
              Se cobrará y guardará la venta; la boleta se emitirá por resumen
              diario. Cambia la modalidad en{" "}
              <Link
                href="/configuracion/tributario"
                className="font-medium underline underline-offset-2"
              >
                Configuración tributaria
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Columna izquierda: resumen carrito (read-only) ─── */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-primary/20 bg-card shadow-sm">
          <header className="border-b border-primary/15 px-4 py-3">
            <h2 className="text-base font-semibold tracking-tight">
              Resumen del pedido
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {cart.totals.itemsCount} ítem
              {cart.totals.itemsCount === 1 ? "" : "s"} ·{" "}
              <Link
                href="/pos"
                className="text-primary underline-offset-2 hover:underline"
              >
                Editar carrito
              </Link>
            </p>
          </header>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-3">
            {cart.lines.map((l) => {
              const lineTotal = Math.max(
                0,
                l.cantidad * l.precioUnitario - l.descuento,
              );
              return (
                <div
                  key={l.id}
                  className="rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-2 text-xs dark:bg-primary/10"
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
                    <span className="shrink-0 font-semibold tabular-nums">
                      {money(lineTotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {l.cantidad} × {money(l.precioUnitario)} s/IGV
                    {l.descuento > 0 ? ` − ${money(l.descuento)}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
          <Separator className="bg-primary/15" />
          <div className="space-y-1 px-4 py-3 text-sm">
            <Row
              label="Subtotal (s/IGV)"
              value={money(cart.totals.subtotal)}
              muted
            />
            <Row label="IGV (18%)" value={money(cart.totals.igv)} muted />
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-medium">Total a cobrar</span>
              <span className="text-3xl font-bold tabular-nums text-primary">
                {money(cart.totals.total)}
              </span>
            </div>
          </div>
        </section>

        {/* ── Columna derecha: formulario de cobro ─── */}
        <section className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          {/* Cliente */}
          <div className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
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
              <div className="mt-3">
                {clienteSel ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <User className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {clienteLabel(clienteSel)}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {clienteDoc(clienteSel) ?? "Sin documento"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 rounded-lg px-2 text-xs"
                      onClick={() => {
                        setClienteSel(null);
                        setClienteQuery("");
                      }}
                    >
                      <X className="size-3.5" /> Cambiar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <UserSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={clienteQuery}
                        onChange={(e) => setClienteQuery(e.target.value)}
                        placeholder="Buscar por nombre, RUC o DNI…"
                        className="h-10 rounded-xl border-primary/20 pl-9 text-sm"
                        autoFocus
                      />
                    </div>
                    {debouncedClienteQuery ? (
                      clientesQ.isLoading ? (
                        <p className="px-1 text-xs text-muted-foreground">
                          <Loader2 className="mr-1 inline size-3 animate-spin" />
                          Buscando…
                        </p>
                      ) : clientesEncontrados.length === 0 ? (
                        <div className="space-y-2">
                          <p className="rounded-lg border border-dashed border-primary/20 px-3 py-2 text-xs text-muted-foreground">
                            Sin coincidencias para “{debouncedClienteQuery}”.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 rounded-lg border-primary/30 text-primary hover:bg-primary/5"
                            onClick={() => setCreateClienteOpen(true)}
                          >
                            <UserPlus className="size-4" />
                            Crear cliente nuevo
                          </Button>
                        </div>
                      ) : (
                        <>
                          <ul className="max-h-44 overflow-auto rounded-xl border border-primary/15">
                            {clientesEncontrados.map((c) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClienteSel(c);
                                    setClienteQuery("");
                                  }}
                                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-primary/5"
                                >
                                  <span className="min-w-0 truncate text-sm">
                                    {clienteLabel(c)}
                                  </span>
                                  <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
                                    {clienteDoc(c) ?? "—"}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full gap-2 rounded-lg text-primary hover:bg-primary/5"
                            onClick={() => setCreateClienteOpen(true)}
                          >
                            <Plus className="size-3.5" /> Crear cliente nuevo
                          </Button>
                        </>
                      )
                    ) : null}
                  </div>
                )}
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
          <div className="grid gap-3 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm md:grid-cols-2">
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
                <p className="mt-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
                  No hay métodos de pago activos.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {metodos.map((m) => {
                    const Icon = metodoIcon(m.codigo);
                    const active = metodoPagoId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodoPagoId(m.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-primary/20 bg-card hover:bg-primary/5",
                        )}
                      >
                        <Icon className="size-4" />
                        <span className="truncate">{m.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pago: efectivo (recibido/vuelto) o digital (evidencia) */}
          <div className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
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
                  className="h-12 rounded-xl border-primary/20 text-right text-lg font-semibold tabular-nums"
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
                  className="h-9 rounded-xl border-primary/20 text-sm"
                />
              </div>
            )}
          </div>

          {/* Almacén + Notas */}
          <div className="grid gap-3 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm md:grid-cols-[200px_1fr]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Almacén
              </Label>
              <Select value={almacenId} onValueChange={setAlmacenId}>
                <SelectTrigger className="h-9 rounded-xl border-primary/20 text-sm">
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
                className="min-h-[50px] resize-none rounded-xl border-primary/20 text-xs"
              />
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2">
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
              className="h-14 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
            >
              {submitting === "cobrar" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Receipt className="size-5" />
              )}
              Cobrar y emitir · {money(cart.totals.total)}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleGuardarCotizacion()}
              disabled={submitting !== null}
              className="rounded-xl border-primary/20 hover:bg-primary/5"
            >
              {submitting === "cotizacion" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
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
        "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-primary/20 bg-card hover:bg-primary/5",
        disabled && "cursor-not-allowed opacity-50 hover:bg-card",
      )}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[10px] text-muted-foreground">{hint}</span>
    </button>
  );
}
