"use client";

import { Clock, Eye, Pencil, Trash2, Wrench } from "lucide-react";

import type { ServicioListItem } from "@/hooks/use-servicios";
import {
  formatServicioCurrency,
  formatServicioDuracion,
} from "@/lib/servicios-formatters";
import { cn } from "@/lib/utils";
import { ErpBadge, ErpStatusBadge } from "@/components/erp-badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export interface ServicioCardProps {
  servicio: ServicioListItem;
  canEdit: boolean;
  canDelete: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  animationDelay?: number;
}

export function ServicioCard({
  servicio,
  canEdit,
  canDelete,
  isSelected = false,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  animationDelay,
}: ServicioCardProps) {
  return (
    <div
      className={cn(
        "group relative flex min-h-0 flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm transition-colors duration-200 animate-fade-up",
        isSelected
          ? "border-primary/45 bg-primary/[0.03] ring-1 ring-primary/15"
          : "border-border/70 hover:border-primary/30",
        onToggleSelect && "cursor-pointer",
      )}
      style={
        animationDelay !== undefined
          ? { animationDelay: `${animationDelay}ms` }
          : undefined
      }
      onClick={onToggleSelect}
    >
      {onToggleSelect ? (
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
      ) : null}

      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 z-10 size-8 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
          title="Eliminar"
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}

      <div
        className={cn(
          "flex min-w-0 items-start gap-3",
          onToggleSelect ? "pl-6 pr-7" : "pr-7",
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Wrench className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold leading-tight text-foreground"
            title={servicio.nombre}
          >
            {servicio.nombre}
          </p>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {servicio.sku}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ErpBadge tone="violet" className="border-transparent font-medium">
          Servicio
        </ErpBadge>
        {servicio.categoria ? (
          <ErpBadge
            tone="neutral"
            className="border-transparent bg-secondary/60 font-medium text-secondary-foreground/80 hover:bg-secondary/80"
          >
            {servicio.categoria.nombre}
          </ErpBadge>
        ) : null}
        {servicio.requiereRepuestos ? (
          <ErpBadge tone="warning" className="border-transparent font-medium">
            Requiere repuestos
          </ErpBadge>
        ) : null}
        <ErpStatusBadge active={servicio.activo} />
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-border/50 pt-4">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Precio
          </p>
          <p className="truncate text-base font-bold text-foreground tabular-nums">
            {formatServicioCurrency(servicio.precioVenta)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Duracion
          </p>
          <div className="flex min-w-0 items-center gap-1 text-sm font-medium text-foreground">
            <Clock className="size-3.5 text-muted-foreground" />
            <span className="truncate tabular-nums">
              {formatServicioDuracion(servicio.tiempoEstimadoMin)}
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Unidad
          </p>
          <p
            className="truncate text-sm font-medium text-foreground"
            title={servicio.unidadMedida.nombre}
          >
            {servicio.unidadMedida.codigo}
          </p>
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 gap-1.5 rounded-lg border-border/70 text-xs font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye className="size-3.5" />
          Ver detalles
        </Button>
        {canEdit ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 gap-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
