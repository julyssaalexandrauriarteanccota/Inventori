"use client";

import {
  Box,
  Calendar,
  Clock,
  Copy,
  DollarSign,
  Package,
  Pencil,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { TipoProducto } from "@erp/shared";

import { useProducto } from "@/hooks/use-productos";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function InfoItem({
  label,
  value,
  icon: Icon,
  copyable = false,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ElementType;
  copyable?: boolean;
}) {
  return (
    <div className="group flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        {Icon && (
          <Icon className="size-3.5 shrink-0 text-muted-foreground/50" />
        )}
        <span className="text-sm font-medium text-foreground truncate">
          {value || (
            <span className="text-muted-foreground/40 font-normal italic text-xs">
              —
            </span>
          )}
        </span>
        {copyable && value && (
          <button
            onClick={() => {
              void navigator.clipboard.writeText(value);
              toast.success("Copiado al portapapeles", { duration: 1500 });
            }}
            title="Copiar"
            className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-muted"
          >
            <Copy className="size-3 text-muted-foreground/50" />
          </button>
        )}
      </div>
    </div>
  );
}

function AuditItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon: React.ElementType;
}) {
  const formatted = value
    ? new Date(value).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 ring-1 ring-border/50">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </span>
        <span className="text-sm font-medium tabular-nums">
          {formatted ?? "—"}
        </span>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((s) => (
        <div key={s} className="rounded-xl border border-border/50 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProductoDetalleModalProps {
  id: string | null;
  onClose: () => void;
  onEdit?: (producto: Record<string, unknown>) => void;
  canEdit?: boolean;
}

const TIPO_LABELS: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Equipo",
  [TipoProducto.REPUESTO]: "Repuesto",
  [TipoProducto.INSUMO]: "Insumo",
  [TipoProducto.SERVICIO]: "Servicio",
  [TipoProducto.ACCESORIO]: "Accesorio",
};

function getRuleBadges(producto: Record<string, unknown>) {
  const tipo = producto.tipo as TipoProducto | undefined;
  const labels: string[] = [];

  if (tipo === TipoProducto.SERVICIO) labels.push("Sin stock");
  else if (producto.manejaInventario) labels.push("Inventario");
  if (producto.tieneNumeroSerie) labels.push("Serializado");
  if (producto.esConsumible) labels.push("Consumible");
  if (producto.requiereRepuestos) labels.push("Req. repuestos");

  return labels;
}

export function ProductoDetalleModal({
  id,
  onClose,
  onEdit,
  canEdit,
}: ProductoDetalleModalProps) {
  const {
    data: productoRes,
    isLoading,
    isError,
  } = useProducto(id || undefined);

  const producto = productoRes?.data as Record<string, unknown> | undefined;

  if (!id) return null;

  const categoria = producto?.categoria as {
    id: string;
    nombre: string;
  } | null;
  const marca = producto?.marca as { id: string; nombre: string } | null;
  const unidadMedida = producto?.unidadMedida as {
    id: string;
    codigo: string;
    nombre: string;
  } | null;
  const skuLabel = (producto?.sku as string)?.slice(0, 3).toUpperCase() ?? "P";
  const tipo = producto?.tipo as TipoProducto | undefined;
  const isServicio = tipo === TipoProducto.SERVICIO;

  function formatCurrency(value: number | undefined) {
    if (value === undefined || value === null) return "—";
    return `S/ ${Number(value).toFixed(2)}`;
  }

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[88vh] w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background p-0 shadow-2xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
        {/* ── HEADER ── */}
        <DialogHeader className="shrink-0 border-b border-border/40 bg-background px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Avatar SKU */}
            <div
              className={cn(
                "flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-2xl font-bold text-sm select-none shadow-md ring-2 ring-background dark:ring-border transition-all",
                isLoading
                  ? "bg-muted ring-0 shadow-none text-muted-foreground"
                  : "bg-linear-to-br from-blue-500 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 text-white",
              )}
            >
              {isLoading ? "…" : skuLabel}
            </div>

            {/* Title + badges */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-xl font-semibold leading-tight truncate">
                {isLoading ? (
                  <Skeleton className="h-5 w-48" />
                ) : (
                  ((producto?.nombre as string) ?? "Cargando...")
                )}
              </DialogTitle>
              {producto && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs h-5 font-mono">
                    {producto.sku as string}
                  </Badge>
                  {categoria && (
                    <Badge
                      variant="outline"
                      className="text-xs h-5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                    >
                      {categoria.nombre}
                    </Badge>
                  )}
                  <Badge
                    variant={
                      (producto.activo as boolean) ? "default" : "outline"
                    }
                    className={cn(
                      "text-xs h-5 gap-1.5",
                      (producto.activo as boolean)
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                        : "text-muted-foreground",
                    )}
                  >
                    {(producto.activo as boolean) ? (
                      <span className="relative flex size-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                      </span>
                    ) : (
                      <span className="size-1.5 rounded-full inline-block bg-muted-foreground/40" />
                    )}
                    {(producto.activo as boolean) ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              )}
              <DialogDescription className="sr-only">
                Información detallada del producto.
              </DialogDescription>
            </div>

            {/* Edit button */}
            {canEdit && producto && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0 mr-8 sm:mr-10 h-8"
                onClick={() => onEdit?.(producto)}
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline text-xs">Editar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError || !producto ? (
            <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
                <Package className="size-6 opacity-40" />
              </div>
              <p className="text-sm">
                No se pudo cargar la información del producto.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* 1 — Información principal */}
              <section
                className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 dark:border-l-blue-800 bg-card p-4 sm:p-5 animate-fade-up"
                style={{ animationDelay: "0ms" }}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30">
                    1
                  </span>
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                    <Package className="size-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Información principal
                  </h3>
                </div>
                <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <InfoItem
                    label="SKU"
                    value={producto.sku as string}
                    icon={Box}
                    copyable
                  />
                  <InfoItem
                    label="Tipo"
                    value={tipo ? TIPO_LABELS[tipo] : null}
                  />
                  <InfoItem label="Nombre" value={producto.nombre as string} />
                  <InfoItem
                    label="Modelo"
                    value={producto.modelo as string | null}
                  />
                  <InfoItem
                    label="Categoría"
                    value={categoria?.nombre ?? null}
                  />
                  <InfoItem label="Marca" value={marca?.nombre ?? null} />
                  <InfoItem
                    label="Unidad de medida"
                    value={
                      unidadMedida
                        ? `${unidadMedida.codigo} · ${unidadMedida.nombre}`
                        : null
                    }
                  />
                </div>
              </section>

              {/* 2 — Precios y stock */}
              <section
                className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 dark:border-l-green-800 bg-card p-4 sm:p-5 animate-fade-up"
                style={{ animationDelay: "70ms" }}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-100 dark:ring-green-900/30">
                    2
                  </span>
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                    <DollarSign className="size-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Precios y stock
                  </h3>
                </div>
                <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
                  <InfoItem
                    label="Precio compra"
                    value={formatCurrency(producto.precioCompra as number)}
                    icon={DollarSign}
                  />
                  <InfoItem
                    label="Precio venta"
                    value={formatCurrency(producto.precioVenta as number)}
                    icon={DollarSign}
                  />
                  <InfoItem
                    label="Precio mínimo"
                    value={formatCurrency(producto.precioMinimo as number)}
                    icon={DollarSign}
                  />
                  <InfoItem
                    label="Stock mínimo de alerta"
                    value={
                      isServicio
                        ? "No aplica"
                        : String(producto.stockMinimo ?? 0)
                    }
                  />
                </div>
              </section>

              {/* 3 — Configuración */}
              <section
                className="rounded-xl border border-border/50 border-l-[3px] border-l-orange-400 dark:border-l-orange-800 bg-card p-4 sm:p-5 animate-fade-up"
                style={{ animationDelay: "140ms" }}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 ring-2 ring-orange-100 dark:ring-orange-900/30">
                    3
                  </span>
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                    <Settings2 className="size-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Configuración
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getRuleBadges(producto).map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="text-xs gap-1.5"
                    >
                      <span className="size-1.5 rounded-full bg-orange-400 inline-block" />
                      {label}
                    </Badge>
                  ))}
                </div>
                {!isServicio ? (
                  <p className="mb-4 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    El stock mínimo es solo un umbral de alerta. El stock real
                    se registra en Compras o en movimientos de Inventario.
                  </p>
                ) : null}
                {(producto.descripcion as string | null) && (
                  <div className="border-t border-border/40 pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
                      Descripción
                    </p>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {producto.descripcion as string}
                    </p>
                  </div>
                )}
              </section>

              {/* 4 — Auditoría */}
              <section
                className="rounded-xl border border-border/50 border-l-[3px] border-l-border bg-muted/20 p-4 sm:p-5 animate-fade-up"
                style={{ animationDelay: "210ms" }}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground ring-2 ring-muted">
                    4
                  </span>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Auditoría
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AuditItem
                    label="Registrado el"
                    value={producto.createdAt as string}
                    icon={Calendar}
                  />
                  <AuditItem
                    label="Última actualización"
                    value={producto.updatedAt as string}
                    icon={Clock}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
