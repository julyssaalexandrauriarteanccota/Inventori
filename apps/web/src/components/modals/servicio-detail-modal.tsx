"use client";

import { Clock, Pencil, Wrench } from "lucide-react";

import { useServicio } from "@/hooks/use-servicios";
import {
  formatServicioCurrency,
  formatServicioDuracion,
} from "@/lib/servicios-formatters";
import { ErpBadge, ErpStatusBadge } from "@/components/erp-badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ServicioDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicioId?: string | null;
  canEdit?: boolean;
  canViewInternalCosts?: boolean;
  onEdit?: (id: string) => void;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function ServicioDetailModal({
  open,
  onOpenChange,
  servicioId,
  canEdit = false,
  canViewInternalCosts = true,
  onEdit,
}: ServicioDetailModalProps) {
  const { data, isLoading, isError } = useServicio(
    open ? (servicioId ?? undefined) : undefined,
  );
  const servicio = data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-2xl rounded-3xl border border-border/60 shadow-2xl data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
        <DialogHeader className="border-b border-border/60 px-5 py-4 pr-12">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--semantic-primary-soft)] text-[var(--semantic-primary)] transition-all duration-300">
              <Wrench className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">
                {servicio?.nombre ?? "Detalle del servicio"}
              </DialogTitle>
              <DialogDescription>
                Informacion comercial y operativa del servicio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 px-5 pb-5">
          {isLoading ? (
            <div className="grid gap-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : isError || !servicio ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              No se pudo cargar el servicio.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <ErpBadge tone="violet">Servicio</ErpBadge>
                {servicio.categoria ? (
                  <ErpBadge tone="neutral">{servicio.categoria.nombre}</ErpBadge>
                ) : null}
                {servicio.requiereRepuestos ? (
                  <ErpBadge tone="warning">Requiere repuestos</ErpBadge>
                ) : null}
                <ErpStatusBadge active={servicio.activo} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="SKU"
                  value={
                    <span className="font-mono">{servicio.sku || "Sin SKU"}</span>
                  }
                />
                <DetailItem
                  label="Categoria"
                  value={servicio.categoria?.nombre ?? "Sin categoria"}
                />
                <DetailItem
                  label="Unidad"
                  value={`${servicio.unidadMedida.codigo} · ${servicio.unidadMedida.nombre}`}
                />
                {canViewInternalCosts ? (
                  <DetailItem
                    label="Costo referencial"
                    value={formatServicioCurrency(servicio.precioCompra)}
                  />
                ) : null}
                <DetailItem
                  label="Precio base"
                  value={formatServicioCurrency(servicio.precioVenta)}
                />
                <DetailItem
                  label="Tiempo estimado"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-4 text-muted-foreground" />
                      {formatServicioDuracion(servicio.tiempoEstimadoMin)}
                    </span>
                  }
                />
                <DetailItem
                  label="Repuestos"
                  value={
                    servicio.requiereRepuestos
                      ? "Requiere repuestos"
                      : "No requiere repuestos"
                  }
                />
                <DetailItem
                  label="Estado"
                  value={servicio.activo ? "Activo" : "Inactivo"}
                />
              </div>

              {servicio.descripcion ? (
                <div className="rounded-lg border border-border/60 bg-background p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Descripcion
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/85">
                    {servicio.descripcion}
                  </p>
                </div>
              ) : null}

              {canEdit ? (
                <div className="flex justify-end border-t border-border/60 pt-4">
                  <Button
                    type="button"
                    className="rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit?.(servicio.id);
                    }}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
