"use client";

import { Eye, Receipt, Trash2, XCircle } from "lucide-react";
import { EstadoFacturacionVenta, EstadoVenta, type VentaListItem } from "@erp/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface VentaCardProps {
  venta: VentaListItem;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
  onEmit?: () => void;
  onAnular?: () => void;
  onDelete?: () => void;
  canAnular?: boolean;
  canDelete?: boolean;
  canEmit?: boolean;
  search?: string;
  ESTADO_LABELS: Record<EstadoVenta, string>;
  FACTURACION_LABELS: Record<EstadoFacturacionVenta, string>;
  estadoBadgeClass: (estado: EstadoVenta) => string;
  estadoDotClass: (estado: EstadoVenta) => string;
  facturacionBadgeClass: (estado: EstadoFacturacionVenta) => string;
  facturacionDotClass: (estado: EstadoFacturacionVenta) => string;
}

function clienteNombre(venta: VentaListItem) {
  return (
    venta.cliente.razonSocial ||
    [venta.cliente.nombre, venta.cliente.apellido]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "—"
  );
}

function getInitials(nombre: string): string {
  if (nombre === "Público en General" || nombre === "—") return "PG";
  return nombre.slice(0, 2).toUpperCase();
}

type MoneyValue = number | string | null | undefined;

function toMoneyNumber(amount: MoneyValue) {
  const value =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? Number(amount)
        : 0;

  return Number.isFinite(value) ? value : 0;
}

function formatCurrency(amount: MoneyValue) {
  return `S/ ${toMoneyNumber(amount).toFixed(2)}`;
}

export function VentaCard({
  venta,
  isSelected = false,
  onToggleSelect,
  onView,
  onEmit,
  onAnular,
  onDelete,
  canAnular = false,
  canDelete = false,
  canEmit = false,
  search = "",
  ESTADO_LABELS,
  FACTURACION_LABELS,
  estadoBadgeClass,
  estadoDotClass,
  facturacionBadgeClass,
  facturacionDotClass,
}: VentaCardProps) {
  const nombre = clienteNombre(venta);
  const initials = getInitials(nombre);

  const isCancelled = venta.estado === EstadoVenta.CANCELADA;
  const isDelivered = venta.estado === EstadoVenta.ENTREGADA;
  const isConfirmed = venta.estado === EstadoVenta.ORDEN_CONFIRMADA;

  const showEmit = canEmit && (isConfirmed || isDelivered) && (
    venta.estadoFacturacion === EstadoFacturacionVenta.SIN_COMPROBANTE ||
    venta.estadoFacturacion === EstadoFacturacionVenta.RECHAZADA
  );

  const showAnular = canAnular && (isConfirmed || isDelivered);
  const showDelete = canDelete && isCancelled;

  // Highlight search text helper inline
  const highlightText = (text: string) => {
    if (!search || !search.trim()) return text;
    const escapedSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${escapedSearch})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="rounded bg-[var(--accent)]/18 px-0.5 font-semibold text-foreground dark:bg-[var(--accent)]/24"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3.5 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 animate-fade-up",
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-md ring-2 ring-[var(--accent)]/20"
          : "border-border/80 hover:border-primary/20 hover:shadow-md",
        onToggleSelect && "cursor-pointer"
      )}
      onClick={onToggleSelect}
    >
      {/* Checkbox top-left */}
      {onToggleSelect && (
        <div
          className={cn(
            "absolute left-3 top-3 z-10 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
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

      {/* Delete/Anular corner button */}
      {(showDelete || showAnular) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (showDelete && onDelete) onDelete();
            else if (showAnular && onAnular) onAnular();
          }}
          className={cn(
            "absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full text-muted-foreground/40 hover:bg-[var(--semantic-danger-soft)] hover:text-[var(--semantic-danger)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 active:scale-95 active:duration-150"
          )}
          title={showDelete ? "Eliminar de historial" : "Anular venta"}
        >
          {showDelete ? <Trash2 className="size-3.5" /> : <XCircle className="size-3.5" />}
        </button>
      )}

      {/* Header avatar + client name + venta number */}
      <div className={cn("flex items-center gap-3", onToggleSelect ? "pl-6 pr-7" : "pr-7")}>
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm",
            "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20"
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words whitespace-normal font-semibold text-sm leading-snug" title={nombre}>
            {highlightText(nombre)}
          </p>
          <p className="truncate text-xs text-muted-foreground mt-0.5 font-mono">
            {highlightText(venta.numero)}
          </p>
        </div>
      </div>

      {/* Badges de Estado */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={estadoBadgeClass(venta.estado)}>
          <span className={estadoDotClass(venta.estado)} />
          {ESTADO_LABELS[venta.estado]}
        </Badge>
        {venta.estadoFacturacion && (
          <Badge variant="outline" className={facturacionBadgeClass(venta.estadoFacturacion)}>
            <span className={facturacionDotClass(venta.estadoFacturacion)} />
            {FACTURACION_LABELS[venta.estadoFacturacion]}
          </Badge>
        )}
      </div>

      {/* Detalle subtotal / descuentos (Punteado) */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t border-dashed border-border/60 pt-3">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-mono">{formatCurrency(venta.subtotal)}</span>
        </div>
        {venta.descuento > 0 && (
          <div className="flex justify-between text-[var(--semantic-danger)]">
            <span>Descuento:</span>
            <span className="font-mono">- {formatCurrency(venta.descuento)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>IGV:</span>
          <span className="font-mono">{formatCurrency(venta.igv)}</span>
        </div>
      </div>

      {/* Footer totals + button actions */}
      <div className="flex justify-between items-center mt-auto border-t border-border/40 pt-3">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
          <div className="font-bold font-display text-[15px] text-primary tabular-nums">
            {formatCurrency(venta.total)}
          </div>
        </div>

        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            <Eye className="size-3.5" /> Ver
          </Button>

          {showEmit && onEmit && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-xs font-medium border border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-500 dark:hover:text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={(e) => {
                e.stopPropagation();
                onEmit();
              }}
            >
              <Receipt className="size-3.5" /> Emitir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
