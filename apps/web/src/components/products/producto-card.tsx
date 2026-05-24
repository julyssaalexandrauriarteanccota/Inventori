"use client";

import { useEffect, useState } from "react";
import { Eye, Pencil, Trash2, MoreVertical, Star } from "lucide-react";
import { TipoProducto, type ProductoListItem } from "@erp/shared";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { getPrimaryProductImage } from "@/lib/product-images";
import { ProductoThumbnail } from "@/components/products/producto-thumbnail";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  formatCurrency,
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

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("erp:productos:favoritos") || "[]");
      setIsFavorite(favs.includes(p.id));
    } catch (e) {
      // fallback
    }
  }, [p.id]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const favs: string[] = JSON.parse(localStorage.getItem("erp:productos:favoritos") || "[]");
      let nextFavs: string[];
      if (favs.includes(p.id)) {
        nextFavs = favs.filter((id) => id !== p.id);
        setIsFavorite(false);
        toast.success("Eliminado de favoritos");
      } else {
        nextFavs = [...favs, p.id];
        setIsFavorite(true);
        toast.success("Añadido a favoritos");
      }
      localStorage.setItem("erp:productos:favoritos", JSON.stringify(nextFavs));
    } catch (e) {
      // fallback
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-card p-2.5 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-md hover:-translate-y-0.5 border-border/80",
        isSelected
          ? "border-primary/50 bg-primary/[0.02] shadow-sm ring-1 ring-primary/10"
          : "hover:border-primary/20",
        "cursor-pointer",
      )}
      style={
        animationDelay !== undefined
          ? { animationDelay: `${animationDelay}ms` }
          : undefined
      }
      onClick={onToggleSelect ? onToggleSelect : onView}
    >
      {/* Top Header Row inside the card */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          {onToggleSelect && (
            <div
              className={cn(
                "transition-opacity mr-0.5",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect()}
                className="size-4 rounded shadow-xs"
              />
            </div>
          )}

          {/* Status pill indicator */}
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              p.activo ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
            )}
            title={p.activo ? "Activo" : "Inactivo"}
          />
          
          <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider truncate" title={p.sku}>
            {p.sku}
          </span>
        </div>

        {/* Dropdown Menu actions */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                title="Acciones"
              >
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={onView}>
                <Eye className="size-4 mr-2" /> Ver detalles
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-4 mr-2" /> Editar
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4 mr-2" /> Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Centered Image Container */}
      <div className="flex items-center justify-center rounded-xl aspect-[4/3] w-full overflow-hidden relative p-0 shrink-0 bg-transparent">
        <ProductoThumbnail
          src={getPrimaryProductImage(p)}
          alt={p.nombre}
          fallback={skuLabel}
          size="full"
          imgClassName="object-cover"
          className="border-0 bg-transparent"
        />
      </div>

      {/* Details Section */}
      <div className="flex flex-col flex-1 min-w-0 justify-between gap-2">
        {/* Product Name & Favorite button in the same row */}
        <div className="flex items-start justify-between gap-2 mt-0.5 w-full">
          <p
            className="font-medium text-xs leading-snug text-foreground/90 group-hover:text-primary transition-colors line-clamp-2 flex-1 h-8"
            title={p.nombre}
          >
            {p.nombre}
          </p>

          <button
            type="button"
            onClick={toggleFavorite}
            className="flex size-7 items-center justify-center rounded-lg hover:bg-muted/55 transition-colors shrink-0 -mt-1 text-muted-foreground"
            title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Star
              className={cn(
                "size-4 transition-all duration-200",
                isFavorite
                  ? "fill-yellow-400 text-yellow-500 hover:scale-105"
                  : "text-muted-foreground/35 hover:text-yellow-500 hover:scale-110"
              )}
            />
          </button>
        </div>

        {/* Price, Category, and Stock in the same horizontal row */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/45 w-full gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-xs text-foreground tabular-nums whitespace-nowrap">
              {formatCurrency(p.precioVenta)}
            </span>
            {p.categoria && (
              <span className="inline-block text-[9px] text-muted-foreground bg-muted/65 rounded px-1.5 py-0.5 font-medium truncate max-w-[65px]" title={p.categoria.nombre}>
                {p.categoria.nombre}
              </span>
            )}
          </div>

          <div className="shrink-0">
            {!isServicio ? (
              <span
                className={cn(
                  "text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0",
                  p.stockActual <= p.stockMinimo
                    ? "bg-destructive/10 text-destructive font-semibold"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {p.stockActual} stock
              </span>
            ) : (
              <span className="text-[9px] text-muted-foreground/80 shrink-0">Servicio</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
