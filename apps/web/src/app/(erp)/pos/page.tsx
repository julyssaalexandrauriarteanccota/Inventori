"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  EstadoComercialEquipo,
  TipoProducto,
} from "@erp/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { useMiAperturaActiva } from "@/hooks/use-caja";
import { useEquipos } from "@/hooks/use-equipos";
import { lineTotalInclIgv } from "@/lib/pos-pricing";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/layout/page-header";
import { useCart, type CartLine } from "./_components/cart-context";
import { PosCatalog } from "./_components/pos-catalog";

function money(n: number) {
  return `S/ ${n.toFixed(2)}`;
}

export default function PosCarritoPage() {
  const router = useRouter();
  const cart = useCart();
  const aperturaQ = useMiAperturaActiva();
  const aperturaActiva = aperturaQ.data?.data ?? null;

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

  const handleIrACobrar = useCallback(() => {
    if (validacionCarrito) {
      toast.error(validacionCarrito);
      return;
    }
    router.push("/pos/cobrar");
  }, [validacionCarrito, router]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto md:overflow-hidden pr-1">
      {/* Cabecera invisible para SEO/a11y */}
      <PageHeader title="Punto de venta" hideTitleVisually={true} />

      {/* Alerta de Caja no abierta - Banner delgado de una línea */}
      {!aperturaActiva ? (
        <div className="flex items-center gap-2 rounded-lg border border-[oklch(0.86_0.05_75)] bg-[oklch(0.96_0.02_75)] py-1 px-3 text-[11px] text-[oklch(0.38_0.08_75)] dark:border-[oklch(0.25_0.05_75)] dark:bg-[oklch(0.16_0.03_75)] dark:text-[oklch(0.78_0.08_75)] animate-fade-in shadow-sm">
          <AlertTriangle className="size-3.5 shrink-0 text-[oklch(0.45_0.10_75)] dark:text-[oklch(0.75_0.10_75)]" />
          <span className="flex-1 truncate">
            <strong className="font-bold mr-1">No tienes una caja abierta.</strong>
            <span>Para cobrar y emitir comprobantes, abre tu turno en </span>
            <Link
              href="/pos/caja"
              className="font-semibold underline underline-offset-1 hover:text-[oklch(0.30_0.08_75)] dark:hover:text-[oklch(0.85_0.08_75)] transition-colors"
            >
              Caja
            </Link>
            .
          </span>
        </div>
      ) : null}

      {/* Grid General con Spacing consistente a tokens */}
      <div className="grid h-auto md:h-full min-h-0 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)]">
        {/* Catálogo visual de productos */}
        <PosCatalog
          className="h-[520px] md:h-full"
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

        {/* Aside Sidebar de Carrito de Alto Nivel */}
        <aside className="flex h-[420px] md:h-full min-h-0 flex-col rounded-2xl border border-border/80 bg-card shadow-xl shadow-primary/[0.015] transition-all duration-300">
          {/* Header de Carrito Premium con degradado muy sutil */}
          <header className="flex items-center justify-between gap-3 border-b border-border/40 px-3.5 py-3 bg-gradient-to-r from-primary/5 via-primary/[0.01] to-transparent rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingBag className="size-4.5" />
              </div>
              <div>
                <h2 className="font-display text-[15px] font-bold tracking-tight text-foreground">
                  Detalle del pedido
                </h2>
                <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
                  {cart.totals.itemsCount}{" "}
                  {cart.totals.itemsCount === 1 ? "ítem" : "ítems"} agregados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-7 gap-1 rounded-lg px-2 text-xs border-border/60 bg-background/50 hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary active:scale-95 transition-all duration-200 cursor-pointer font-sans"
              >
                <Link href="/pos/historial">
                  <FileText className="size-3.5" />
                  <span className="hidden sm:inline">Historial</span>
                </Link>
              </Button>
              {cart.lines.length > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 active:scale-95 transition-all duration-200 cursor-pointer font-sans"
                  onClick={() => cart.clear()}
                >
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">Vaciar</span>
                </Button>
              ) : null}
            </div>
          </header>

          {/* Listado de Líneas del Pedido */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 relative">
            <AnimatePresence mode="popLayout" initial={false}>
              {cart.lines.length === 0 ? (
                <motion.div
                  key="empty-cart"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 py-16 text-center text-sm text-muted-foreground bg-muted/5 animate-fade-in"
                >
                  <div className="size-12 rounded-full bg-muted/40 flex items-center justify-center mb-1">
                    <ShoppingBag className="size-6 opacity-30 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="font-sans text-xs font-semibold text-foreground">
                      Tu carrito está vacío
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Toca un producto del catálogo para agregarlo.
                    </p>
                  </div>
                </motion.div>
              ) : (
                cart.lines.map((line) => (
                  <motion.div
                    key={line.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -50, scale: 0.95, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <CartLineRow line={line} cart={cart} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <Separator className="bg-border/30" />

          {/* Sección de Totales de Alta Fidelidad */}
          <div className="space-y-1.5 px-4 pt-3 text-xs font-sans">
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

            {/* Total a pagar / 60-30-10 Focus Target */}
            <div className="flex items-baseline justify-between pt-2 border-t border-border/40 mt-1.5">
              <span className="text-[13px] font-bold text-foreground">
                Total a cobrar (inc. IGV)
              </span>
              <span className="font-display text-3xl font-extrabold tabular-nums text-primary tracking-tight">
                {money(cart.totals.total)}
              </span>
            </div>
          </div>

          {/* Validaciones de Carrito (Red-soft UI con WCAG) */}
          {validacionCarrito && cart.lines.length > 0 ? (
            <div className="mx-4 mt-2 flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-[11px] text-[oklch(0.42_0.18_25)] dark:text-[oklch(0.72_0.14_25)] animate-fade-in">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[oklch(0.42_0.18_25)] dark:text-[oklch(0.72_0.14_25)]" />
              <span className="font-medium">{validacionCarrito}</span>
            </div>
          ) : null}

          {/* CTAs de Carrito - Hover y Active refinados */}
          <div className="flex flex-col gap-1.5 p-3 pt-3 mt-0">
            <Button
              type="button"
              size="lg"
              onClick={handleIrACobrar}
              disabled={cart.lines.length === 0 || !!validacionCarrito}
              className="group/cobro h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/10 hover:bg-primary/95 hover:-translate-y-[1px] active:scale-[0.97] active:translate-y-0 active:duration-150 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer gap-2"
            >
              <ArrowRight className="size-4.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/cobro:translate-x-0.5" />
              Proceder al cobro · {money(cart.totals.total)}
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
        muted ? "text-muted-foreground font-medium" : "",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums font-semibold">{value}</span>
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
  const lineTotal = lineTotalInclIgv(
    line.cantidad,
    line.precioUnitario,
    line.descuento,
  );
  const belowMin =
    line.precioMinimo !== undefined && line.precioUnitario < line.precioMinimo;
  const overStock =
    line.stockDisponible !== undefined && line.cantidad > line.stockDisponible;
  const isEquipo = line.tipo === TipoProducto.EQUIPO || line.requiereSerie;
  const equiposDisponiblesQ = useEquipos(
    {
      page: 1,
      limit: 100,
      productoId: line.productoId,
      estadoComercial: EstadoComercialEquipo.DISPONIBLE,
    },
    { enabled: Boolean(line.requiereSerie) },
  );
  const equiposDisponibles = equiposDisponiblesQ.data?.data ?? [];
  const selectedSerieIsAvailable = Boolean(
    line.equipoSerie &&
    equiposDisponibles.some(
      (equipo) => equipo.numeroSerie === line.equipoSerie,
    ),
  );

  return (
    <div className="rounded-xl border border-border/80 bg-card p-2.5 shadow-sm hover:border-primary/30 hover:bg-primary/[0.005] hover:shadow-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] relative group/row">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Nombre de Producto en Poppins (UI sans) */}
          <p
            className="truncate text-xs font-bold leading-snug text-foreground font-sans tracking-tight"
            title={line.nombre}
          >
            {line.nombre}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
            {line.sku}
          </p>
        </div>

        {/* Total y botón de eliminar (precio colocado arriba) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-display text-sm font-extrabold tabular-nums text-foreground group-hover/row:text-primary transition-colors duration-200">
            {money(lineTotal)}
          </span>
          <button
            type="button"
            aria-label="Quitar"
            onClick={() => cart.removeLine(line.id)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-[0.85] active:duration-150 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer"
          >
            <X className="size-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Etiquetas / Badges adaptados al Commercial theme */}
      {(isEquipo ||
        line.mesesGarantia ||
        line.stockDisponible !== undefined) && (
        <div className="mt-1.5 flex flex-wrap gap-1 text-[8.5px] font-bold uppercase tracking-wider font-sans">
          {isEquipo && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary border border-primary/10">
              Equipo
            </span>
          )}
          {line.mesesGarantia ? (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
              Garantía {line.mesesGarantia}{" "}
              {line.mesesGarantia === 1 ? "mes" : "meses"}
              {line.garantiaMaxCopias
                ? ` · ${line.garantiaMaxCopias}k cop.`
                : ""}
            </span>
          ) : null}
          {line.stockDisponible !== undefined && (
            <span className="rounded-full bg-muted/65 px-2 py-0.5 text-muted-foreground border border-border/40 font-semibold">
              Stock disp: {line.stockDisponible}
            </span>
          )}
        </div>
      )}

      {/* Grid Operativo del Item */}
      <div className="mt-2.5 grid grid-cols-[auto_1fr_1fr] items-center gap-1.5">
        {/* Tactile Quantity Controller */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background shadow-inner">
          <button
            type="button"
            aria-label="Disminuir"
            disabled={line.requiereSerie}
            className={cn(
              "grid size-9 place-items-center text-muted-foreground hover:text-foreground hover:bg-primary/5 active:scale-75 transition-all duration-150 cursor-pointer rounded-l-lg",
              line.requiereSerie &&
                "cursor-not-allowed opacity-20 hover:bg-transparent hover:text-muted-foreground",
            )}
            onClick={() => cart.setCantidad(line.id, line.cantidad - 1)}
          >
            <Minus className="size-4" />
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
            className="w-10 border-none bg-transparent py-1 text-center text-xs font-bold tabular-nums text-foreground focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            aria-label="Aumentar"
            disabled={line.requiereSerie}
            className={cn(
              "grid size-9 place-items-center text-muted-foreground hover:text-foreground hover:bg-primary/5 active:scale-75 transition-all duration-150 cursor-pointer rounded-r-lg",
              line.requiereSerie &&
                "cursor-not-allowed opacity-20 hover:bg-transparent hover:text-muted-foreground",
            )}
            onClick={() => cart.setCantidad(line.id, line.cantidad + 1)}
          >
            <Plus className="size-4" />
          </button>
        </div>

        {/* Precio Unitario Input */}
        <div className="flex items-center gap-1 bg-background border border-border/80 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 rounded-lg px-2.5 h-9 transition-colors duration-200">
          <span
            className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground shrink-0"
            title="Precio unitario de venta (incluye IGV)"
          >
            P.U.
          </span>
          <input
            aria-label="Precio unitario de venta con IGV incluido"
            type="number"
            min={line.precioMinimo ?? 0}
            step="0.01"
            value={line.precioUnitario}
            onChange={(e) =>
              cart.setPrecio(line.id, Number(e.target.value) || 0)
            }
            className="w-full bg-transparent text-right text-xs font-semibold tabular-nums focus:outline-none text-foreground"
          />
        </div>

        {/* Descuento Input */}
        <div className="flex items-center gap-1 bg-background border border-border/80 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 rounded-lg px-2.5 h-9 transition-colors duration-200">
          <span
            className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground shrink-0"
            title="Descuento de venta (incluye IGV)"
          >
            Dsc
          </span>
          <input
            aria-label="Descuento de venta con IGV incluido"
            type="number"
            min={0}
            step="0.01"
            value={line.descuento}
            onChange={(e) =>
              cart.setDescuento(line.id, Number(e.target.value) || 0)
            }
            className="w-full bg-transparent text-right text-xs font-semibold tabular-nums focus:outline-none text-foreground"
          />
        </div>
      </div>

      {/* Serie del Equipo Input */}
      {line.requiereSerie ? (
        <div className="mt-3 bg-muted/10 p-2.5 rounded-xl border border-border/40">
          <div className="mb-1 flex items-center justify-between gap-2">
            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Serie del equipo *
            </Label>
            <span className="text-[9px] font-medium text-muted-foreground">
              {equiposDisponiblesQ.isFetching
                ? "Buscando series…"
                : equiposDisponibles.length > 0
                  ? `${equiposDisponibles.length} disponible${equiposDisponibles.length === 1 ? "" : "s"}`
                  : "Sin series listadas"}
            </span>
          </div>

          {equiposDisponibles.length > 0 ? (
            <Select
              value={line.equipoSerie ?? ""}
              onValueChange={(value) => cart.setEquipoSerie(line.id, value)}
            >
              <SelectTrigger
                className={cn(
                  "h-8 rounded-lg border-border bg-background text-xs focus:ring-primary/20",
                  !line.equipoSerie?.trim() && "border-destructive/40",
                )}
              >
                <SelectValue placeholder="Selecciona la serie física" />
              </SelectTrigger>
              <SelectContent>
                {line.equipoSerie && !selectedSerieIsAvailable ? (
                  <SelectItem value={line.equipoSerie}>
                    {line.equipoSerie} · ingresada manualmente
                  </SelectItem>
                ) : null}
                {equiposDisponibles.map((equipo) => (
                  <SelectItem key={equipo.id} value={equipo.numeroSerie}>
                    {equipo.numeroSerie}
                    {equipo.almacen?.nombre
                      ? ` · ${equipo.almacen.nombre}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={line.equipoSerie ?? ""}
              onChange={(event) =>
                cart.setEquipoSerie(line.id, event.target.value)
              }
              placeholder="Escribe o escanea la serie física"
              className={cn(
                "h-8 rounded-lg border-border bg-background text-xs focus-visible:ring-primary/20 focus-visible:ring-offset-0",
                !line.equipoSerie?.trim() &&
                  "border-destructive/40 focus-visible:ring-destructive/20 focus-visible:border-destructive/40",
              )}
            />
          )}

          <p className="mt-1.5 text-[9.5px] leading-snug text-muted-foreground">
            Obligatorio para identificar el equipo físico, asignarlo al cliente
            y emitir su garantía.
          </p>
        </div>
      ) : null}

      {/* Footer del item - precio de venta final */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
        <span className="text-[10px] text-muted-foreground font-sans">
          Precio venta inc. IGV
          {line.stockDisponible !== undefined
            ? ` · stock disp. ${line.stockDisponible}`
            : ""}
        </span>
        <span className="font-display text-sm font-extrabold tabular-nums text-foreground group-hover/row:text-primary transition-colors duration-200">
          {money(lineTotal)}
        </span>
      </div>

      {/* Errores semánticos de item */}
      {belowMin ? (
        <p className="mt-1.5 text-[9.5px] font-semibold text-[oklch(0.42_0.18_25)] dark:text-[oklch(0.72_0.14_25)] flex items-center gap-1">
          <span className="size-1 rounded-full bg-[oklch(0.45_0.10_25)] dark:bg-[oklch(0.68_0.06_25)]" />
          Precio mínimo de venta: {money(line.precioMinimo ?? 0)}
        </p>
      ) : null}
      {overStock ? (
        <p className="mt-1.5 text-[9.5px] font-semibold text-[oklch(0.42_0.18_25)] dark:text-[oklch(0.72_0.14_25)] flex items-center gap-1">
          <span className="size-1 rounded-full bg-[oklch(0.45_0.10_25)] dark:bg-[oklch(0.68_0.06_25)]" />
          Excede existencias físicas disponibles.
        </p>
      ) : null}
    </div>
  );
}
