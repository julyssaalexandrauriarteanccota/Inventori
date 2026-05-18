"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Package,
  Ruler,
  Warehouse,
} from "lucide-react";
import type { StockListItem } from "@erp/shared";

import { useMovimientos, useAlertasStock } from "@/hooks/use-inventario";
import { useTiposMovimientoConfig } from "@/hooks/use-configuracion";
import { getTiposMovimientoLabelMap } from "@/lib/tipos-movimiento";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface StockDetailSheetProps {
  stock: StockListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateMovimiento?: (stock: StockListItem) => void;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StockDetailSheet({
  stock,
  open,
  onOpenChange,
  onCreateMovimiento,
}: StockDetailSheetProps) {
  const router = useRouter();

  const { data: tiposMovRes } = useTiposMovimientoConfig();
  const tipoLabels = useMemo(
    () => getTiposMovimientoLabelMap(tiposMovRes?.data),
    [tiposMovRes?.data],
  );

  const { data: movRes, isLoading: movLoading } = useMovimientos(
    stock
      ? {
          page: 1,
          limit: 10,
          productoId: stock.producto.id,
          almacenId: stock.almacen.id,
        }
      : { page: 1, limit: 1 },
  );
  const movimientos = stock ? (movRes?.data ?? []) : [];

  const { data: alertasRes } = useAlertasStock();
  const alertasRelacionadas = useMemo(() => {
    if (!stock) return [];
    return (alertasRes?.data ?? []).filter(
      (a) =>
        a.producto.id === stock.producto.id &&
        a.almacen.id === stock.almacen.id,
    );
  }, [alertasRes?.data, stock]);

  if (!stock) return null;

  const { producto, almacen, cantidad, ubicacion } = stock;
  const stockMinimo = producto.stockMinimo;
  const sinStock = cantidad === 0;
  const stockBajo = !sinStock && cantidad <= stockMinimo;

  const estadoBadge = sinStock ? (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400">
      Sin stock
    </Badge>
  ) : stockBajo ? (
    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400">
      Stock bajo
    </Badge>
  ) : (
    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400">
      Normal
    </Badge>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <Package className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <SheetTitle className="truncate text-base">
                {producto.nombre}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {producto.sku} · Detalle de stock
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
            {/* Resumen */}
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Cantidad actual
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {cantidad}
                </div>
                <div className="mt-1">{estadoBadge}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Stock mínimo
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">
                  {stockMinimo}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {cantidad - stockMinimo >= 0
                    ? `+${cantidad - stockMinimo} sobre el mínimo`
                    : `${cantidad - stockMinimo} bajo el mínimo`}
                </div>
              </div>
            </section>

            {/* Datos */}
            <section className="grid gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Información
              </h3>
              <dl className="grid gap-2 rounded-xl border border-border/60 bg-card/30 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Warehouse className="size-3.5" /> Almacén
                  </dt>
                  <dd className="text-right font-medium">{almacen.nombre}</dd>
                </div>
                <Separator />
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-3.5" /> Ubicación física
                  </dt>
                  <dd className="text-right font-medium">
                    {ubicacion ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <Separator />
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Ruler className="size-3.5" /> Unidad de medida
                  </dt>
                  <dd className="text-right font-medium">
                    {producto.unidadMedida ? (
                      <>
                        {producto.unidadMedida.nombre}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({producto.unidadMedida.codigo})
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Alertas */}
            {alertasRelacionadas.length > 0 && (
              <section className="grid gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Alertas activas
                </h3>
                <div className="flex flex-col gap-2">
                  {alertasRelacionadas.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm",
                        a.resuelta
                          ? "border-border/60 bg-muted/40"
                          : "border-destructive/30 bg-destructive/5",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {a.resuelta ? (
                          <CheckCircle2 className="size-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="size-4 text-destructive" />
                        )}
                        <span className="truncate">
                          Actual {a.stockActual} / mín {a.stockMinimo}
                        </span>
                      </div>
                      <Badge
                        variant={a.resuelta ? "secondary" : "destructive"}
                        className="shrink-0"
                      >
                        {a.resuelta ? "Resuelta" : "Pendiente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Movimientos recientes */}
            <section className="grid gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Movimientos recientes
                </h3>
                <span className="text-xs text-muted-foreground">
                  {movimientos.length} de los últimos 10
                </span>
              </div>
              {movLoading ? (
                <div className="grid gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-xl border border-border/40 bg-muted/30"
                    />
                  ))}
                </div>
              ) : movimientos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 py-8 text-xs text-muted-foreground">
                  <ArrowRightLeft className="size-5 text-muted-foreground/50" />
                  Sin movimientos para este stock
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {movimientos.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/30 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {tipoLabels[m.tipo] ?? m.tipo}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(m.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium tabular-nums">
                          {m.cantidadAnterior}
                          <ArrowRightLeft className="mx-1 inline size-3 text-muted-foreground" />
                          {m.cantidadPosterior}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          ({m.cantidad >= 0 ? "+" : ""}
                          {m.cantidad})
                        </span>
                      </div>
                      {m.justificacion && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {m.justificacion}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </ScrollArea>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => router.push(`/productos/${producto.id}`)}
          >
            <ExternalLink className="size-3.5" />
            Ver producto
          </Button>
          {onCreateMovimiento && (
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              onClick={() => onCreateMovimiento(stock)}
            >
              <ArrowRightLeft className="size-3.5" />
              Registrar movimiento
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
