"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import { TipoProducto, type ProductoListItem } from "@erp/shared";

import { cn } from "@/lib/utils";
import { getPrimaryProductImage } from "@/lib/product-images";
import { ErpBadge, ErpStatusBadge } from "@/components/erp-badges";
import { ProductoThumbnail } from "@/components/products/producto-thumbnail";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import {
  TIPO_LABELS,
  formatCurrency,
  getProductoRuleLabels,
} from "@/app/(erp)/productos/_helpers";

export interface ProductoCardProps {
  producto: ProductoListItem;
  canEdit: boolean;
  canDelete: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  animationDelay?: number;
}

export function ProductoCard({
  producto: p,
  canEdit,
  canDelete,
  isSelected = false,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  animationDelay,
}: ProductoCardProps) {
  const skuLabel = p.sku.slice(0, 4).toUpperCase();
  const isServicio = p.tipo === TipoProducto.SERVICIO;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 ease-out animate-fade-up",
        isSelected
          ? "border-primary/50 bg-primary/[0.03] shadow-md ring-1 ring-primary/20"
          : "border-border/60 hover:border-primary/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1",
        onToggleSelect && "cursor-pointer",
      )}
      style={
        animationDelay !== undefined
          ? { animationDelay: `${animationDelay}ms` }
          : undefined
      }
      onClick={onToggleSelect}
    >
      {onToggleSelect && (
        <div
          className={cn(
            "absolute left-3 top-3 z-10 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect()}
            className="size-4 shadow-sm"
          />
        </div>
      )}

      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-full text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Eliminar"
        >
          <Trash2 className="size-4" />
        </button>
      )}

      <div
        className={cn(
          "flex items-start gap-3.5",
          onToggleSelect ? "pl-6 pr-7" : "pr-7",
        )}
      >
        <div className="shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-sm rounded-xl overflow-hidden ring-1 ring-border/50">
          <ProductoThumbnail
            src={getPrimaryProductImage(p)}
            alt={p.nombre}
            fallback={skuLabel}
            size={52}
            rounded="xl"
          />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className="truncate font-semibold text-sm leading-tight text-foreground/90 group-hover:text-primary transition-colors"
            title={p.nombre}
          >
            {p.nombre}
          </p>
          {p.modelo && (
            <p className="truncate text-[13px] text-muted-foreground mt-1">
              {p.modelo}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        <ErpBadge tone="violet" className="font-medium bg-violet-100/80 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-transparent">{TIPO_LABELS[p.tipo]}</ErpBadge>
        {p.categoria ? (
          <ErpBadge tone="neutral" className="font-medium bg-secondary/60 border-transparent text-secondary-foreground/80 hover:bg-secondary/80">{p.categoria.nombre}</ErpBadge>
        ) : null}
        {p.marca ? <ErpBadge tone="info" className="font-medium border-transparent">{p.marca.nombre}</ErpBadge> : null}
        {getProductoRuleLabels(p)
          .slice(0, 2)
          .map((label) => (
            <ErpBadge key={label} tone="warning" className="font-medium border-transparent">
              {label}
            </ErpBadge>
          ))}
        <ErpStatusBadge active={p.activo} />
      </div>

      <div className="border-t border-border/40 pt-4 flex items-end justify-between mt-1">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
            Precio venta
          </p>
          <p className="text-lg font-bold tabular-nums text-foreground tracking-tight">
            {formatCurrency(p.precioVenta)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
            {isServicio ? "Unidad" : "Stock actual"}
          </p>
          <p className="text-[13px] font-mono font-medium text-foreground/80">
            {isServicio ? (p.unidadMedida?.codigo ?? "—") : p.stockActual}
          </p>
          {!isServicio ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground/60 font-medium">
              Mín. {p.stockMinimo}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 mt-auto pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-sm border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow transition-all duration-200 group/btn"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye className="size-3.5 transition-transform group-hover/btn:scale-110" /> Ver detalles
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 gap-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="size-3.5" /> Editar
          </Button>
        )}
      </div>
    </div>
  );
}
