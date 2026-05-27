"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  EstadoGarantia,
  TipoProducto,
  type TicketAdjuntoEntry,
  type TicketDetalle,
} from "@erp/shared";

import { useProductos } from "@/hooks/use-productos";
import { useAlmacenes, useStockByProducto } from "@/hooks/use-inventario";
import {
  useAgregarDetalleTicket,
  useUpdateDetalleTicket,
  useRemoveDetalleTicket,
  useUploadTicketAdjunto,
  useDeleteTicketAdjunto,
} from "@/hooks/use-soporte";
import { useAuth } from "@/hooks/use-auth";
import { getApiAssetUrl } from "@/lib/api";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CerrarTicketForm } from "@/components/forms/cerrar-ticket-form";
import { cn } from "@/lib/utils";

type DetalleLine = {
  id: string;
  cantidad: number;
  precioUnitario: number;
  cubiertoGarantia?: boolean;
  producto?: {
    id: string;
    nombre: string;
    sku?: string;
    tipo?: string;
    requiereRepuestos?: boolean;
    precioVenta?: number;
  };
};

interface CierreTicketPanelProps {
  ticket: TicketDetalle;
  onClose: () => void;
}

export function CierreTicketPanel({ ticket, onClose }: CierreTicketPanelProps) {
  const ticketId = ticket.id;
  const tecnicoAsignadoId = ticket.tecnico?.id ?? null;
  const { user } = useAuth();
  const esTecnicoAsignado =
    !!user?.id && !!tecnicoAsignadoId && user.id === tecnicoAsignadoId;

  const detalles = ((ticket.detalles ?? ticket.repuestos ?? []) as DetalleLine[]).filter(
    (d) => !!d.id,
  );
  const serviciosDelTicket = detalles.filter(
    (detalle) => detalle.producto?.tipo === TipoProducto.SERVICIO,
  );
  const serviciosQuePermitenRepuestos = serviciosDelTicket.filter(
    (detalle) => detalle.producto?.requiereRepuestos,
  );
  const equipoModeloCatalogoId =
    ticket.equipo?.producto?.modeloCatalogoId ??
    ticket.equipo?.producto?.modeloCatalogo?.id ??
    null;

  const tieneCasoAceptado = (ticket.casos ?? []).some(
    (caso) => caso.aceptada !== false,
  );
  const garantiaActual = ticket.garantiaActual ?? null;
  const garantiaOperativa =
    tieneCasoAceptado ||
    (garantiaActual?.estado === EstadoGarantia.ACTIVA &&
      garantiaActual.vigente !== false);
  const garantiaPendiente =
    !garantiaOperativa &&
    garantiaActual?.estado === EstadoGarantia.PENDIENTE_COMPLETAR;

  const agregar = useAgregarDetalleTicket(ticketId);
  const updateDetalle = useUpdateDetalleTicket(ticketId);
  const removeDetalle = useRemoveDetalleTicket(ticketId);

  /* Totales auto (excluyen líneas cubiertas por garantía) */
  const totales = useMemo(() => {
    let manoObra = 0;
    let repuestos = 0;
    let serviciosCount = 0;
    let repuestosCount = 0;
    for (const d of detalles) {
      if (d.cubiertoGarantia) continue;
      const subtotal = Number(d.cantidad) * Number(d.precioUnitario);
      if (d.producto?.tipo === TipoProducto.SERVICIO) {
        manoObra += subtotal;
        serviciosCount += 1;
      } else {
        repuestos += subtotal;
        repuestosCount += 1;
      }
    }
    return {
      manoObra,
      repuestos,
      total: manoObra + repuestos,
      serviciosCount,
      repuestosCount,
    };
  }, [detalles]);

  return (
    <div className="flex flex-col gap-5">
      <AgregarLinea
        title="Servicios realizados"
        helper="Selecciona un servicio para sumar a la mano de obra."
        onAdd={(payload) =>
          agregar.mutate(payload, {
            onSuccess: () => toast.success("Servicio agregado"),
            onError: (e: Error) => toast.error(e.message),
          })
        }
        adding={agregar.isPending}
        productoFilter={{ tipo: TipoProducto.SERVICIO }}
        itemLabel="servicio"
        resetOnAdd={false}
        defaultCubiertoGarantia={garantiaOperativa}
      />

      {garantiaPendiente ? (
        <GarantiaPendienteNotice />
      ) : null}

      {serviciosQuePermitenRepuestos.length > 0 ? (
        <AgregarLinea
          title="Repuestos utilizados"
          helper={
            equipoModeloCatalogoId
              ? "Muestra repuestos compatibles con el modelo del equipo."
              : "Selecciona repuestos utilizados en el trabajo."
          }
          onAdd={(payload) =>
            agregar.mutate(payload, {
              onSuccess: () => toast.success("Repuesto agregado"),
              onError: (e: Error) => toast.error(e.message),
            })
          }
          adding={agregar.isPending}
          productoFilter={{ tipo: TipoProducto.REPUESTO }}
          itemLabel="repuesto"
          compatibleModeloId={equipoModeloCatalogoId}
          defaultCubiertoGarantia={garantiaOperativa}
        />
      ) : (
        <RepuestosBloqueadosNotice hasServicios={serviciosDelTicket.length > 0} />
      )}

      <DetallesEditableTable
        rows={detalles}
        garantiaOperativa={garantiaOperativa}
        onToggleGarantia={(detalleId, value) =>
          updateDetalle.mutate(
            { detalleId, data: { cubiertoGarantia: value } },
            { onError: (e: Error) => toast.error(e.message) },
          )
        }
        onUpdate={(detalleId, data) =>
          updateDetalle.mutate(
            { detalleId, data },
            {
              onSuccess: () => toast.success("Línea actualizada"),
              onError: (e: Error) => toast.error(e.message),
            },
          )
        }
        onRemove={(detalleId) =>
          removeDetalle.mutate(detalleId, {
            onSuccess: () => toast.success("Línea eliminada"),
            onError: (e: Error) => toast.error(e.message),
          })
        }
        removing={removeDetalle.isPending}
      />

      <TotalesAuto
        manoObra={totales.manoObra}
        repuestos={totales.repuestos}
        total={totales.total}
        serviciosCount={totales.serviciosCount}
        repuestosCount={totales.repuestosCount}
        garantiaOperativa={garantiaOperativa}
      />

      {esTecnicoAsignado && (
        <FotosTrabajoPanel
          ticketId={ticketId}
          adjuntos={ticket.adjuntos ?? []}
        />
      )}

      <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
        <h4 className="text-sm font-semibold mb-3">Cerrar ticket</h4>
        <CerrarTicketForm ticketId={ticketId} onSuccess={onClose} />
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function GarantiaPendienteNotice() {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <h4 className="font-semibold text-amber-800">
        Garantía pendiente de activar
      </h4>
      <p className="mt-1 text-xs text-muted-foreground">
        El equipo tiene una garantía registrada por la venta, pero aún no se
        usa para cubrir servicios o repuestos. Completa y activa la garantía
        para habilitar la columna de cobertura.
      </p>
    </div>
  );
}

function RepuestosBloqueadosNotice({ hasServicios }: { hasServicios: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4">
      <h4 className="text-sm font-semibold mb-1">Repuestos no disponibles</h4>
      <p className="text-xs text-muted-foreground">
        {hasServicios
          ? "Los servicios registrados en este ticket no requieren repuestos. Agrega o cambia a un servicio que tenga activado Requiere repuestos."
          : "Agrega primero un servicio realizado que tenga activado Requiere repuestos."}
      </p>
    </div>
  );
}

function AgregarLinea({
  title,
  helper,
  onAdd,
  adding,
  productoFilter,
  itemLabel,
  resetOnAdd = true,
  compatibleModeloId,
  defaultCubiertoGarantia = false,
}: {
  title: string;
  helper: string;
  onAdd: (p: {
    productoId: string;
    almacenId?: string;
    cantidad: number;
    precioUnitario: number;
    cubiertoGarantia?: boolean;
  }) => void;
  adding: boolean;
  productoFilter: { tipo?: TipoProducto; excluirTipos?: TipoProducto[] };
  itemLabel: "servicio" | "repuesto";
  resetOnAdd?: boolean;
  compatibleModeloId?: string | null;
  defaultCubiertoGarantia?: boolean;
}) {
  const [productoId, setProductoId] = useState("");
  const [almacenId, setAlmacenId] = useState("");

  const { data: productosRes, isLoading } = useProductos({
    page: 1,
    limit: 100,
    activo: true,
    ...productoFilter,
  });
  const productosBase = productosRes?.data ?? [];
  const productos =
    itemLabel === "repuesto" && compatibleModeloId
      ? productosBase.filter((producto) => {
          const modeloIds = new Set(producto.modeloIds ?? []);
          for (const item of producto.modelosCompatibles ?? []) {
            modeloIds.add(item.modeloCatalogo.id);
          }
          return modeloIds.has(compatibleModeloId);
        })
      : productosBase;
  const selectedProducto = productos.find((p) => p.id === productoId);
  const { data: almacenesRes } = useAlmacenes();
  const { data: stockRes, isFetching: isLoadingStock } =
    useStockByProducto(
      itemLabel === "repuesto" ? productoId || undefined : undefined,
    );
  const almacenesActivos = useMemo(
    () => (almacenesRes?.data ?? []).filter((almacen) => almacen.activo),
    [almacenesRes?.data],
  );
  const stockRows = useMemo(() => stockRes?.data ?? [], [stockRes?.data]);
  const stockByAlmacen = useMemo(
    () =>
      new Map(
        stockRows.map((row) => [row.almacen.id, Number(row.cantidad)]),
      ),
    [stockRows],
  );
  const almacenOptions: SearchableSelectOption[] = almacenesActivos.map(
    (almacen) => {
      const cantidad = stockByAlmacen.get(almacen.id) ?? 0;
      const stockLabel =
        itemLabel === "repuesto" ? ` · Stock: ${cantidad}` : "";
      const principalLabel = almacen.esPrincipal ? " · principal" : "";

      return {
        value: almacen.id,
        label: `${almacen.nombre}${stockLabel}${principalLabel}`,
      };
    },
  );
  const stockSeleccionado = almacenId
    ? (stockByAlmacen.get(almacenId) ?? 0)
    : 0;
  const opciones: SearchableSelectOption[] = productos.map((p) => ({
    value: p.id,
    label: `${p.sku} · ${p.nombre}`,
  }));

  useEffect(() => {
    if (itemLabel !== "repuesto") return;
    if (!productoId || almacenesActivos.length === 0) {
      setAlmacenId("");
      return;
    }

    const currentIsActive =
      !!almacenId &&
      almacenesActivos.some((almacen) => almacen.id === almacenId);
    const primeroConStock = almacenesActivos.find(
      (almacen) => (stockByAlmacen.get(almacen.id) ?? 0) > 0,
    );

    if (
      currentIsActive &&
      ((stockByAlmacen.get(almacenId) ?? 0) > 0 || !primeroConStock)
    ) {
      return;
    }

    const principalConStock = almacenesActivos.find(
      (almacen) =>
        almacen.esPrincipal && (stockByAlmacen.get(almacen.id) ?? 0) > 0,
    );
    const principal = almacenesActivos.find((almacen) => almacen.esPrincipal);

    setAlmacenId(
      principalConStock?.id ??
        primeroConStock?.id ??
        principal?.id ??
        almacenesActivos[0]?.id ??
        "",
    );
  }, [almacenId, almacenesActivos, itemLabel, productoId, stockByAlmacen]);

  const handleSelect = (value: string) => {
    setProductoId(value);
    setAlmacenId("");
  };

  const submit = () => {
    if (!productoId) {
      toast.error(`Selecciona un ${itemLabel}`);
      return;
    }
    if (itemLabel === "repuesto" && !almacenId) {
      toast.error("Selecciona el almacén de origen del repuesto");
      return;
    }
    if (itemLabel === "repuesto" && stockSeleccionado <= 0) {
      toast.error("El almacén seleccionado no tiene stock disponible");
      return;
    }
    const precioBase = Number(selectedProducto?.precioVenta) || 0;
    onAdd({
      productoId,
      ...(itemLabel === "repuesto" ? { almacenId } : {}),
      cantidad: 1,
      precioUnitario: precioBase,
      cubiertoGarantia: defaultCubiertoGarantia,
    });
    if (resetOnAdd) {
      setProductoId("");
    }
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
      <h4 className="text-sm font-semibold mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground mb-3">
        {helper}
      </p>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {itemLabel === "servicio" ? "Servicio" : "Repuesto"}
          </label>
          <SearchableSelect
            value={productoId}
            onChange={handleSelect}
            options={opciones}
            placeholder={isLoading ? "Cargando..." : `Selecciona ${itemLabel}`}
            searchPlaceholder="Buscar por SKU o nombre"
            emptyLabel={
              compatibleModeloId && itemLabel === "repuesto"
                ? "No hay repuestos compatibles con este modelo."
                : "Sin resultados"
            }
            ariaLabel={itemLabel === "servicio" ? "Servicio" : "Repuesto"}
            disabled={isLoading}
            clearable
            clearLabel={`Quitar ${itemLabel}`}
          />
          {selectedProducto && itemLabel === "servicio" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                Precio base: S/ {Number(selectedProducto.precioVenta ?? 0).toFixed(2)}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {selectedProducto.requiereRepuestos
                  ? "Habilita repuestos"
                  : "No usa repuestos"}
              </Badge>
            </div>
          ) : null}
        </div>

        {itemLabel === "repuesto" ? (
          <div className="grid gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Almacén origen
            </label>
            <SearchableSelect
              value={almacenId}
              onChange={(value) => setAlmacenId(value || "")}
              options={almacenOptions}
              placeholder={
                !productoId
                  ? "Selecciona primero un repuesto"
                  : isLoadingStock
                    ? "Cargando stock..."
                    : "Selecciona almacén"
              }
              searchPlaceholder="Buscar almacén..."
              emptyLabel="No hay almacenes activos"
              ariaLabel="Almacén origen del repuesto"
              disabled={!productoId || almacenesActivos.length === 0}
              clearable
              clearLabel="Quitar almacén"
            />
            {productoId && almacenId ? (
              <p className="text-xs text-muted-foreground">
                Stock disponible en este almacén: {stockSeleccionado}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="gap-1"
            onClick={submit}
            disabled={
              adding ||
              !productoId ||
              (itemLabel === "repuesto" &&
                (!almacenId || stockSeleccionado <= 0))
            }
          >
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetallesEditableTable({
  rows,
  garantiaOperativa,
  onUpdate,
  onToggleGarantia,
  onRemove,
  removing,
}: {
  rows: DetalleLine[];
  garantiaOperativa: boolean;
  onUpdate: (
    detalleId: string,
    data: { precioUnitario?: number },
  ) => void;
  onToggleGarantia: (detalleId: string, value: boolean) => void;
  onRemove: (detalleId: string) => void;
  removing: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Aún no hay servicios ni repuestos en este ticket.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-muted/30">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Línea</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Precio base</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Precio a cobrar</th>
            {garantiaOperativa && (
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Cubierto</th>
            )}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const cantidad = Number(d.cantidad);
            const precioCobro = Number(d.precioUnitario);
            const subtotal = cantidad * precioCobro;
            const precioBase = Number(d.producto?.precioVenta ?? precioCobro);
            const subtotalBase = cantidad * precioBase;
            const tipo = d.producto?.tipo === TipoProducto.SERVICIO ? "Servicio" : "Repuesto";
            return (
              <tr key={d.id} className="border-b border-border/20 last:border-0">
                <td className="px-3 py-2">
                  <div className="font-medium truncate max-w-60">{d.producto?.nombre ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{tipo}</div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  S/ {subtotalBase.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {d.cubiertoGarantia ? (
                    <span className="text-green-600 line-through">S/ {subtotal.toFixed(2)}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      defaultValue={subtotal.toFixed(2)}
                      className="ml-auto h-8 w-24 text-right font-medium"
                      aria-label="Total de línea"
                      onBlur={(event) => {
                        const nextTotal = Number(event.target.value);
                        if (nextTotal >= 0 && nextTotal !== subtotal) {
                          onUpdate(d.id, {
                            precioUnitario: cantidad > 0 ? nextTotal / cantidad : 0,
                          });
                        }
                      }}
                    />
                  )}
                </td>
                {garantiaOperativa && (
                  <td className="px-3 py-2 text-center">
                    <Checkbox
                      checked={!!d.cubiertoGarantia}
                      onCheckedChange={(v) => onToggleGarantia(d.id, !!v)}
                      aria-label="Cubierto por garantía"
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(d.id)}
                    disabled={removing}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TotalesAuto({
  manoObra,
  repuestos,
  total,
  serviciosCount,
  repuestosCount,
  garantiaOperativa,
}: {
  manoObra: number;
  repuestos: number;
  total: number;
  serviciosCount: number;
  repuestosCount: number;
  garantiaOperativa: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-semibold">Totales (calculados)</h4>
        {garantiaOperativa && (
          <span className="text-[11px] text-muted-foreground">
            Las líneas cubiertas por garantía no suman.
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-3 text-sm">
        <Row label={`Mano de obra (${serviciosCount})`} value={manoObra} />
        <Row label={`Repuestos (${repuestosCount})`} value={repuestos} />
        <Row label="Total" value={total} bold />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/30 bg-background/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold" : ""}`}>S/ {value.toFixed(2)}</span>
    </div>
  );
}

function FotosTrabajoPanel({
  ticketId,
  adjuntos,
}: {
  ticketId: string;
  adjuntos: TicketAdjuntoEntry[];
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const upload = useUploadTicketAdjunto(ticketId);
  const remove = useDeleteTicketAdjunto(ticketId);

  const fotos = useMemo(
    () => adjuntos.filter((a) => a.tipo?.startsWith("image/")),
    [adjuntos],
  );
  const otros = useMemo(
    () => adjuntos.filter((a) => !a.tipo?.startsWith("image/")),
    [adjuntos],
  );

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    for (const file of list) {
      try {
        await upload.mutateAsync(file);
        toast.success(`Foto "${file.name}" subida`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al subir foto";
        toast.error(msg);
      }
    }
  };

  const handleDelete = async (adjuntoId: string) => {
    try {
      await remove.mutateAsync(adjuntoId);
      toast.success("Foto eliminada");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      toast.error(msg);
    }
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Fotos del trabajo realizado</h3>
          <p className="text-xs text-muted-foreground">
            Adjunta evidencia visual del mantenimiento o reparación. Solo el técnico asignado puede gestionar estos archivos.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <Upload className="mr-1 size-4" />
          )}
          Subir
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          "flex min-h-24 items-center justify-center rounded-lg border-2 border-dashed border-border/40 bg-background/40 p-4 text-center text-sm text-muted-foreground transition",
          dragOver && "border-primary/60 bg-primary/5",
        )}
      >
        <div className="flex flex-col items-center gap-1">
          <ImagePlus className="size-5 opacity-60" />
          <span>Arrastra fotos aquí o usa el botón Subir</span>
        </div>
      </div>

      {fotos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {fotos.map((foto) => (
            <div
              key={foto.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border/40 bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getApiAssetUrl(foto.url)}
                alt={foto.nombre}
                className="size-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => handleDelete(foto.id)}
                disabled={remove.isPending}
                className="absolute right-1 top-1 rounded-md bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                aria-label={`Eliminar ${foto.nombre}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {otros.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {otros.map((adj) => (
            <li
              key={adj.id}
              className="flex items-center justify-between rounded border border-border/30 bg-background/40 px-2 py-1"
            >
              <a
                href={getApiAssetUrl(adj.url)}
                target="_blank"
                rel="noreferrer"
                className="truncate text-primary hover:underline"
              >
                {adj.nombre}
              </a>
              <button
                type="button"
                onClick={() => handleDelete(adj.id)}
                disabled={remove.isPending}
                className="text-destructive hover:underline disabled:opacity-50"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
