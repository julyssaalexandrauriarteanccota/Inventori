"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  FileText,
  Hash,
  Package,
  User,
  Warehouse,
} from "lucide-react";
import type { MovimientoListItem } from "@erp/shared";

import { useTiposMovimientoConfig } from "@/hooks/use-configuracion";
import { getTiposMovimientoLabelMap } from "@/lib/tipos-movimiento";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface MovimientoDetailDialogProps {
  movimiento: MovimientoListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MovimientoDetailDialog({
  movimiento,
  open,
  onOpenChange,
}: MovimientoDetailDialogProps) {
  const { data: tiposMovRes } = useTiposMovimientoConfig();
  const tipoLabels = useMemo(
    () => getTiposMovimientoLabelMap(tiposMovRes?.data),
    [tiposMovRes?.data],
  );

  if (!movimiento) return null;

  const {
    tipo,
    cantidad,
    cantidadAnterior,
    cantidadPosterior,
    justificacion,
    referenciaId,
    referenciaTipo,
    createdAt,
    producto,
    almacenOrigen,
    almacenDestino,
    usuario,
  } = movimiento;

  const delta = cantidadPosterior - cantidadAnterior;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <ArrowRightLeft className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <DialogTitle className="text-base">
                Detalle del movimiento
              </DialogTitle>
              <DialogDescription className="text-xs">
                {tipoLabels[tipo] ?? tipo} · {formatDate(createdAt)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Cantidades */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-card/30 p-3">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Antes
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {cantidadAnterior}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Cambio
              </span>
              <span
                className={
                  "text-lg font-semibold tabular-nums " +
                  (delta > 0
                    ? "text-green-600 dark:text-green-400"
                    : delta < 0
                      ? "text-red-600 dark:text-red-400"
                      : "")
                }
              >
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Después
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {cantidadPosterior}
              </span>
            </div>
          </div>

          {/* Datos */}
          <dl className="grid gap-2 rounded-xl border border-border/60 bg-card/30 p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Hash className="size-3.5" /> Tipo
              </dt>
              <dd>
                <Badge variant="outline">{tipoLabels[tipo] ?? tipo}</Badge>
              </dd>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Package className="size-3.5" /> Producto
              </dt>
              <dd className="text-right">
                {producto ? (
                  <>
                    <div className="font-medium">{producto.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {producto.sku}
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Warehouse className="size-3.5" /> Almacén
              </dt>
              <dd className="text-right">
                {almacenOrigen && almacenDestino ? (
                  <span className="inline-flex items-center gap-1">
                    {almacenOrigen.nombre}
                    <ArrowRight className="size-3 text-muted-foreground" />
                    {almacenDestino.nombre}
                  </span>
                ) : almacenOrigen ? (
                  <>
                    <span className="font-medium">{almacenOrigen.nombre}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      (origen)
                    </span>
                  </>
                ) : almacenDestino ? (
                  <>
                    <span className="font-medium">{almacenDestino.nombre}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      (destino)
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <User className="size-3.5" /> Registrado por
              </dt>
              <dd className="text-right font-medium">
                {usuario ? (
                  `${usuario.nombre}${usuario.apellido ? ` ${usuario.apellido}` : ""}`
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-3.5" /> Fecha
              </dt>
              <dd className="text-right font-medium">{formatDate(createdAt)}</dd>
            </div>
            {(referenciaId || referenciaTipo) && (
              <>
                <Separator />
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="size-3.5" /> Referencia
                  </dt>
                  <dd className="text-right">
                    {referenciaTipo && (
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {referenciaTipo}
                      </div>
                    )}
                    {referenciaId && (
                      <div className="font-mono text-xs">
                        {referenciaId.slice(0, 8)}…
                      </div>
                    )}
                  </dd>
                </div>
              </>
            )}
            <Separator />
            <div className="flex flex-col gap-1.5">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <FileText className="size-3.5" /> Justificación
              </dt>
              <dd className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm">
                {justificacion ? (
                  <span className="whitespace-pre-wrap">{justificacion}</span>
                ) : (
                  <span className="text-muted-foreground">
                    Sin justificación
                  </span>
                )}
              </dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Cantidad del movimiento</span>
              <span className="tabular-nums font-medium text-foreground">
                {cantidad}
              </span>
            </div>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
