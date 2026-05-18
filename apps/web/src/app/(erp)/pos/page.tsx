"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Loader2,
  Minus,
  Plus,
  Save,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TipoCliente, TipoProducto, type VentaFormPayload } from "@erp/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";

import { useMiAperturaActiva } from "@/hooks/use-caja";
import { useCreateCliente } from "@/hooks/use-clientes";
import { useCreateVenta } from "@/hooks/use-ventas";
import { api } from "@/lib/api";
import { POS_GENERIC_CLIENT_NAME } from "@/lib/pos-navigation";
import { cn } from "@/lib/utils";

import { useCart, type CartLine } from "./_components/cart-context";
import { PosCatalog } from "./_components/pos-catalog";

type ClienteRaw = { id: string };

function money(n: number) {
  return `S/ ${n.toFixed(2)}`;
}

export default function PosCarritoPage() {
  const router = useRouter();
  const cart = useCart();
  const aperturaQ = useMiAperturaActiva();
  const aperturaActiva = aperturaQ.data?.data ?? null;

  const createVenta = useCreateVenta();
  const createCliente = useCreateCliente();
  const [submitting, setSubmitting] = useState(false);

  // Buscar/crear cliente genérico para cotizaciones rápidas
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

  // Validaciones del carrito (espejo backend ventas.service)
  const overStockLine = useMemo(
    () =>
      cart.lines.find(
        (l) =>
          l.stockDisponible !== undefined && l.cantidad > l.stockDisponible,
      ),
    [cart.lines],
  );
  const underMinPriceLine = useMemo(
    () =>
      cart.lines.find(
        (l) =>
          l.precioMinimo !== undefined && l.precioUnitario < l.precioMinimo,
      ),
    [cart.lines],
  );
  const missingSerieLine = useMemo(
    () => cart.lines.find((l) => l.requiereSerie && !l.equipoSerie?.trim()),
    [cart.lines],
  );

  const validacionCarrito = useMemo<string | null>(() => {
    if (cart.lines.length === 0) return "Agrega al menos un producto";
    if (overStockLine) {
      return `Stock insuficiente para ${overStockLine.sku}. Disponible: ${overStockLine.stockDisponible}`;
    }
    if (underMinPriceLine) {
      return `${underMinPriceLine.sku}: el precio no puede ser menor a ${money(underMinPriceLine.precioMinimo ?? 0)}`;
    }
    if (missingSerieLine) {
      return `${missingSerieLine.sku}: ingresa el número de serie del equipo`;
    }
    return null;
  }, [cart.lines.length, overStockLine, underMinPriceLine, missingSerieLine]);

  const handleGuardarCotizacion = useCallback(async () => {
    if (validacionCarrito) {
      toast.error(validacionCarrito);
      return;
    }
    setSubmitting(true);
    try {
      const clienteId = await upsertGenericClient();
      const payload: VentaFormPayload = {
        clienteId,
        notas: cart.notas || undefined,
        detalles: cart.lines.map((l) => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          descuento: l.descuento || undefined,
          equipoSerie: l.equipoSerie || undefined,
        })),
      };
      const res = (await createVenta.mutateAsync(payload)) as {
        data?: { numero?: string };
      };
      toast.success(`Cotización ${res.data?.numero ?? "guardada"}`);
      cart.clear();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al guardar cotización",
      );
    } finally {
      setSubmitting(false);
    }
  }, [validacionCarrito, upsertGenericClient, cart, createVenta]);

  const handleIrACobrar = useCallback(() => {
    if (validacionCarrito) {
      toast.error(validacionCarrito);
      return;
    }
    router.push("/pos/cobrar");
  }, [validacionCarrito, router]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader
        title="Punto de venta"
        description="Arma el carrito. En el siguiente paso eliges cliente, comprobante y método de pago."
        actions={
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-2 rounded-xl"
          >
            <Link href="/ventas">
              <FileText className="size-4" /> Historial
            </Link>
          </Button>
        }
      />

      {!aperturaActiva ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">No tienes una caja abierta.</p>
            <p className="opacity-90">
              Puedes guardar cotizaciones sin caja. Para cobrar y emitir,
              abre tu turno desde{" "}
              <Link
                href="/pos/caja"
                className="font-medium underline underline-offset-2"
              >
                Caja
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <PosCatalog
          onPick={(p) =>
            cart.addLine({
              kind: p.tipo === TipoProducto.EQUIPO ? "EQUIPO" : "PRODUCTO",
              productoId: p.id,
              sku: p.sku,
              nombre: p.nombre,
              precioUnitario: p.precioVenta,
              precioMinimo: p.precioMinimo,
              requiereSerie: p.tieneNumeroSerie,
              stockDisponible: p.manejaInventario ? p.stockActual : undefined,
              imagen: p.imagen,
              tipo: p.tipo,
              mesesGarantia: p.mesesGarantia,
              garantiaMaxCopias: p.garantiaMaxCopias,
            })
          }
        />

        <aside className="flex min-h-0 flex-col rounded-2xl border border-primary/20 bg-card shadow-sm">
          {/* Header carrito */}
          <header className="flex items-center justify-between gap-2 border-b border-primary/15 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Detalle del pedido
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {cart.totals.itemsCount} ítem
                {cart.totals.itemsCount === 1 ? "" : "s"} en el carrito
              </p>
            </div>
            {cart.lines.length > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => cart.clear()}
              >
                <Trash2 className="size-3.5" /> Vaciar
              </Button>
            ) : null}
          </header>

          {/* Líneas */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            {cart.lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 py-10 text-center text-sm text-muted-foreground">
                <ShoppingBag className="size-6 opacity-40" />
                Toca un producto del catálogo para agregarlo.
              </div>
            ) : (
              cart.lines.map((line) => (
                <CartLineRow key={line.id} line={line} cart={cart} />
              ))
            )}
          </div>

          <Separator className="bg-primary/15" />

          {/* Totales */}
          <div className="space-y-1 px-4 pt-3 text-sm">
            <Row
              label="Subtotal (s/IGV)"
              value={money(cart.totals.subtotal)}
              muted
            />
            <Row label="IGV (18%)" value={money(cart.totals.igv)} muted />
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-medium">Total a cobrar</span>
              <span className="text-3xl font-bold tabular-nums">
                {money(cart.totals.total)}
              </span>
            </div>
          </div>

          {validacionCarrito && cart.lines.length > 0 ? (
            <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{validacionCarrito}</span>
            </div>
          ) : null}

          {/* CTAs */}
          <div className="flex flex-col gap-2 px-4 pb-4 pt-4">
            <Button
              type="button"
              size="lg"
              onClick={handleIrACobrar}
              disabled={cart.lines.length === 0 || !!validacionCarrito}
              className="h-14 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
            >
              <ArrowRight className="size-5" />
              Ir a cobrar · {money(cart.totals.total)}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleGuardarCotizacion()}
              disabled={submitting || cart.lines.length === 0}
              className="rounded-xl border-primary/20 hover:bg-primary/5"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar como cotización (Público en General)
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        muted ? "text-muted-foreground" : "",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function CartLineRow({
  line,
  cart,
}: {
  line: CartLine;
  cart: ReturnType<typeof useCart>;
}) {
  const lineTotal = Math.max(
    0,
    line.cantidad * line.precioUnitario - line.descuento,
  );
  const belowMin =
    line.precioMinimo !== undefined && line.precioUnitario < line.precioMinimo;
  const overStock =
    line.stockDisponible !== undefined && line.cantidad > line.stockDisponible;
  const isEquipo = line.tipo === TipoProducto.EQUIPO || line.requiereSerie;
  const isServicio = line.tipo === TipoProducto.SERVICIO;

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-2.5 dark:bg-primary/10">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">
            {line.nombre}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {line.sku}
          </p>
          <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-medium uppercase tracking-wide">
            {isEquipo ? (
              <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-violet-700 dark:text-violet-300">
                Equipo
              </span>
            ) : null}
            {isServicio ? (
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-700 dark:text-sky-300">
                Servicio
              </span>
            ) : null}
            {line.mesesGarantia ? (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
                Garantía {line.mesesGarantia} {line.mesesGarantia === 1 ? "mes" : "meses"}
                {line.garantiaMaxCopias ? ` · ${line.garantiaMaxCopias}k cop.` : ""}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label="Quitar"
          onClick={() => cart.removeLine(line.id)}
          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-[auto_1fr_1fr] items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-primary/25 bg-background">
          <button
            type="button"
            aria-label="Disminuir"
            disabled={line.requiereSerie}
            className={cn(
              "grid size-7 place-items-center text-muted-foreground hover:text-foreground",
              line.requiereSerie && "cursor-not-allowed opacity-30",
            )}
            onClick={() => cart.setCantidad(line.id, line.cantidad - 1)}
          >
            <Minus className="size-3.5" />
          </button>
          <input
            aria-label="Cantidad"
            type="number"
            min={1}
            value={line.cantidad}
            disabled={line.requiereSerie}
            onChange={(e) =>
              cart.setCantidad(line.id, Number(e.target.value) || 0)
            }
            className="w-10 border-x border-primary/20 bg-transparent py-1 text-center text-sm tabular-nums focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            aria-label="Aumentar"
            disabled={line.requiereSerie}
            className={cn(
              "grid size-7 place-items-center text-muted-foreground hover:text-foreground",
              line.requiereSerie && "cursor-not-allowed opacity-30",
            )}
            onClick={() => cart.setCantidad(line.id, line.cantidad + 1)}
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span
            className="text-[10px] uppercase tracking-wide text-muted-foreground"
            title="Precio unitario sin IGV (base imponible)"
          >
            P.U. s/IGV
          </span>
          <input
            aria-label="Precio unitario sin IGV"
            type="number"
            min={line.precioMinimo ?? 0}
            step="0.01"
            value={line.precioUnitario}
            onChange={(e) =>
              cart.setPrecio(line.id, Number(e.target.value) || 0)
            }
            className="h-7 w-full rounded-md border border-primary/20 bg-background px-2 text-right text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Dscto
          </span>
          <input
            aria-label="Descuento"
            type="number"
            min={0}
            step="0.01"
            value={line.descuento}
            onChange={(e) =>
              cart.setDescuento(line.id, Number(e.target.value) || 0)
            }
            className="h-7 w-full rounded-md border border-primary/20 bg-background px-2 text-right text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      {line.requiereSerie ? (
        <div className="mt-2">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Serie del equipo *
          </Label>
          <Input
            value={line.equipoSerie ?? ""}
            onChange={(event) =>
              cart.setEquipoSerie(line.id, event.target.value)
            }
            placeholder="Ingresa o escanea la serie"
            className={cn(
              "mt-1 h-8 rounded-md border-primary/20 text-xs",
              !line.equipoSerie?.trim() && "border-destructive/40",
            )}
          />
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between border-t border-primary/15 pt-1.5">
        <span className="text-[11px] text-muted-foreground">
          Base s/IGV
          {line.stockDisponible !== undefined
            ? ` · stock ${line.stockDisponible}`
            : ""}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {money(lineTotal)}
        </span>
      </div>
      {belowMin ? (
        <p className="mt-1 text-[11px] text-destructive">
          Precio mínimo: {money(line.precioMinimo ?? 0)}
        </p>
      ) : null}
      {overStock ? (
        <p className="mt-1 text-[11px] text-destructive">
          Stock insuficiente para la cantidad indicada.
        </p>
      ) : null}
    </div>
  );
}
