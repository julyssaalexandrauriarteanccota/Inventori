"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Download,
  Eye,
  MoreHorizontal,
  Receipt,
  RefreshCcw,
  ShoppingCart,
  X,
  XCircle,
} from "lucide-react";
import { EstadoFacturacionVenta, EstadoVenta, type VentaListItem } from "@erp/shared";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  readStoredVentasAutoRefreshPreference,
  writeStoredVentasAutoRefreshPreference,
} from "@/lib/ventas-auto-refresh";
import { AutoRefreshControl } from "@/components/layout/auto-refresh-control";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { StatCard } from "@/components/layout/stat-card";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { useDebounce } from "@/hooks/use-debounce";
import { useStoredAutoRefresh } from "@/hooks/use-stored-auto-refresh";
import { useCancelarVenta, useVentas } from "@/hooks/use-ventas";

import { EmitirComprobanteModal } from "@/app/(erp)/comprobantes/_components/emitir-comprobante-modal";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const REFRESH_INTERVALS = [
  { label: "30 seg", value: 30_000 },
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
];

const ESTADO_LABELS: Record<EstadoVenta, string> = {
  [EstadoVenta.COTIZACION]: "Cotización",
  [EstadoVenta.ORDEN_CONFIRMADA]: "Confirmada",
  [EstadoVenta.ENTREGADA]: "Entregada",
  [EstadoVenta.CANCELADA]: "Cancelada",
};

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

function formatCurrency(amount: number) {
  return `S/ ${amount.toFixed(2)}`;
}

function estadoBadgeClass(estado: EstadoVenta) {
  return cn("gap-1.5 text-xs whitespace-nowrap", {
    "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-300 dark:border-zinc-800":
      estado === EstadoVenta.COTIZACION,
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800":
      estado === EstadoVenta.ORDEN_CONFIRMADA,
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800":
      estado === EstadoVenta.ENTREGADA,
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800":
      estado === EstadoVenta.CANCELADA,
  });
}

const FACTURACION_LABELS: Record<EstadoFacturacionVenta, string> = {
  [EstadoFacturacionVenta.SIN_COMPROBANTE]: "Sin comprobante",
  [EstadoFacturacionVenta.EN_EMISION]: "En emisión",
  [EstadoFacturacionVenta.EMITIDA]: "Emitida",
  [EstadoFacturacionVenta.EMITIDA_CON_OBS]: "Emitida c/ obs.",
  [EstadoFacturacionVenta.RECHAZADA]: "Rechazada",
  [EstadoFacturacionVenta.ANULADA_FISCAL]: "Anulada fiscal",
};

function facturacionBadgeClass(estado: EstadoFacturacionVenta) {
  return cn("gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium", {
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300":
      estado === EstadoFacturacionVenta.SIN_COMPROBANTE,
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300":
      estado === EstadoFacturacionVenta.EN_EMISION,
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300":
      estado === EstadoFacturacionVenta.EMITIDA ||
      estado === EstadoFacturacionVenta.EMITIDA_CON_OBS,
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300":
      estado === EstadoFacturacionVenta.RECHAZADA,
    "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-900 dark:bg-neutral-950 dark:text-neutral-400":
      estado === EstadoFacturacionVenta.ANULADA_FISCAL,
  });
}

function toEmitVentaInput(v: VentaListItem) {
  return {
    id: v.id,
    numero: v.numero,
    estado: v.estado,
    estadoFacturacion: v.estadoFacturacion,
    subtotal: v.subtotal,
    igv: v.igv,
    total: v.total,
    cliente: {
      id: v.cliente.id,
      nombre: v.cliente.nombre ?? null,
      apellido: v.cliente.apellido ?? null,
      razonSocial: v.cliente.razonSocial ?? null,
      ruc: v.cliente.ruc ?? null,
      dni: v.cliente.dni ?? null,
    },
  };
}

function estadoDotClass(estado: EstadoVenta) {  return cn("size-1.5 rounded-full inline-block shrink-0", {
    "bg-zinc-400": estado === EstadoVenta.COTIZACION,
    "bg-blue-400": estado === EstadoVenta.ORDEN_CONFIRMADA,
    "bg-green-500": estado === EstadoVenta.ENTREGADA,
    "bg-red-400": estado === EstadoVenta.CANCELADA,
  });
}

function VentaDetailSheet({
  venta,
  open,
  onOpenChange,
}: {
  venta: VentaListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-xl" side="right">
        <SheetHeader className="border-b border-border/70 px-6 py-5">
          <SheetTitle>Detalle de venta</SheetTitle>
          <SheetDescription>
            Resumen comercial y estado operativo de la venta.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 px-6 py-5">
            {!venta ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Selecciona una venta para revisar su detalle.
              </div>
            ) : (
              <>
                <section className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold">
                        {venta.numero}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {clienteNombre(venta)}
                      </p>
                    </div>
                    <Badge variant="outline" className={estadoBadgeClass(venta.estado)}>
                      <span className={estadoDotClass(venta.estado)} />
                      {ESTADO_LABELS[venta.estado]}
                    </Badge>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Cliente
                      </p>
                      <p>{clienteNombre(venta)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Estado
                      </p>
                      <p>{ESTADO_LABELS[venta.estado]}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Subtotal
                      </p>
                      <p>{formatCurrency(venta.subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Descuento
                      </p>
                      <p>{formatCurrency(venta.descuento)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        IGV
                      </p>
                      <p>{formatCurrency(venta.igv)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Total
                      </p>
                      <p className="font-semibold">{formatCurrency(venta.total)}</p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function HistorialVentasWorkspace({
  showCreateButton = true,
}: {
  showCreateButton?: boolean;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [selectedVenta, setSelectedVenta] = useState<VentaListItem | null>(null);
  const [emitVenta, setEmitVenta] = useState<VentaListItem | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debounced || undefined,
      estado:
        estadoFilter !== "all" ? (estadoFilter as EstadoVenta) : undefined,
    }),
    [debounced, estadoFilter, limit, page],
  );

  const { data, isLoading, isError, refetch } = useVentas(filters);
  const { data: statsTotal } = useVentas({ page: 1, limit: 1 });
  const { data: statsCotizaciones } = useVentas({
    page: 1,
    limit: 1,
    estado: EstadoVenta.COTIZACION,
  });
  const { data: statsConfirmadas } = useVentas({
    page: 1,
    limit: 1,
    estado: EstadoVenta.ORDEN_CONFIRMADA,
  });
  const { data: statsEntregadas } = useVentas({
    page: 1,
    limit: 1,
    estado: EstadoVenta.ENTREGADA,
  });

  const cancelar = useCancelarVenta();

  const handleManualRefresh = useCallback(() => {
    void refetch();
    toast.info("Lista actualizada", { duration: 2000 });
  }, [refetch]);

  const handleAutoRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const {
    enabled: autoRefresh,
    interval: refreshInterval,
    setEnabled: setAutoRefresh,
    setInterval: setRefreshInterval,
  } = useStoredAutoRefresh({
    readPreference: readStoredVentasAutoRefreshPreference,
    writePreference: writeStoredVentasAutoRefreshPreference,
    onRefresh: handleAutoRefresh,
  });

  const showAutoRefreshToast = useCallback(
    (enabled: boolean) => {
      const label =
        REFRESH_INTERVALS.find((option) => option.value === refreshInterval)
          ?.label ?? "intervalo actual";
      toast[enabled ? "success" : "info"](
        enabled
          ? `Auto-refresh activado cada ${label}`
          : "Auto-refresh desactivado",
        { duration: 2000 },
      );
    },
    [refreshInterval],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleEstadoChange = useCallback((value: string) => {
    setEstadoFilter(value);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((value: number) => {
    setLimit(value);
    setPage(1);
  }, []);

  const handleAnular = useCallback(() => {
    if (!cancelId) return;
    cancelar.mutate(
      { id: cancelId, motivo: motivo.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Venta anulada y stock revertido");
          setCancelId(null);
          setMotivo("");
        },
        onError: (err: Error) =>
          toast.error(err.message || "No se pudo anular la venta"),
      },
    );
  }, [cancelId, cancelar, motivo]);

  const handleExportCSV = useCallback(() => {
    const rows = data?.data ?? [];
    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "Numero",
      "Cliente",
      "Estado",
      "Subtotal",
      "Descuento",
      "IGV",
      "Total",
    ];
    const lines = rows.map((venta) =>
      [
        venta.numero,
        clienteNombre(venta),
        ESTADO_LABELS[venta.estado],
        venta.subtotal,
        venta.descuento,
        venta.igv,
        venta.total,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ventas.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado correctamente");
  }, [data?.data]);

  const columns = useMemo<ColumnDef<VentaListItem>[]>(
    () => [
      {
        accessorKey: "numero",
        header: "Número",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-sm font-medium">
            {row.original.numero}
          </span>
        ),
      },
      {
        id: "cliente",
        header: "Cliente",
        cell: ({ row }) => (
          <span
            className="block max-w-56 truncate"
            title={clienteNombre(row.original)}
          >
            {clienteNombre(row.original)}
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant="outline" className={estadoBadgeClass(row.original.estado)}>
            <span className={estadoDotClass(row.original.estado)} />
            {ESTADO_LABELS[row.original.estado]}
          </Badge>
        ),
      },
      {
        accessorKey: "estadoFacturacion",
        header: "Facturación",
        cell: ({ row }) => {
          const ef = row.original.estadoFacturacion;
          if (!ef) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <Badge variant="outline" className={facturacionBadgeClass(ef)}>
              {FACTURACION_LABELS[ef]}
            </Badge>
          );
        },
      },
      {
        accessorKey: "subtotal",
        header: "Subtotal",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatCurrency(row.original.subtotal)}
          </span>
        ),
        meta: { defaultHidden: true },
      },
      {
        accessorKey: "igv",
        header: "IGV",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatCurrency(row.original.igv)}
          </span>
        ),
        meta: { defaultHidden: true },
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium tabular-nums">
            {formatCurrency(row.original.total)}
          </span>
        ),
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        size: 100,
        cell: ({ row }) => {
          const venta = row.original;
          const puedeAnular =
            venta.estado === EstadoVenta.ORDEN_CONFIRMADA ||
            venta.estado === EstadoVenta.ENTREGADA;
          const puedeEmitir =
            (venta.estadoFacturacion ===
              EstadoFacturacionVenta.SIN_COMPROBANTE ||
              venta.estadoFacturacion === EstadoFacturacionVenta.RECHAZADA) &&
            (venta.estado === EstadoVenta.ORDEN_CONFIRMADA ||
              venta.estado === EstadoVenta.ENTREGADA);

          return (
            <div className="flex items-center justify-end gap-1.5">
              {puedeEmitir ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg px-2.5 text-xs transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setEmitVenta(venta)}
                >
                  <Receipt className="size-3.5" />
                  Emitir
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => setSelectedVenta(venta)}
              >
                <Eye className="size-3.5" />
                Ver
              </Button>
              {puedeAnular ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted"
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setCancelId(venta.id)}
                      >
                        <XCircle className="size-4" />
                        Anular
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total ventas"
          value={statsTotal?.meta?.total}
          icon={ShoppingCart}
          index={0}
          onClick={() => handleEstadoChange("all")}
          active={estadoFilter === "all"}
        />
        <StatCard
          label="Cotizaciones"
          value={statsCotizaciones?.meta?.total}
          icon={Receipt}
          index={1}
          onClick={() =>
            handleEstadoChange(
              estadoFilter === EstadoVenta.COTIZACION
                ? "all"
                : EstadoVenta.COTIZACION,
            )
          }
          active={estadoFilter === EstadoVenta.COTIZACION}
        />
        <StatCard
          label="Confirmadas"
          value={statsConfirmadas?.meta?.total}
          icon={Receipt}
          index={2}
          onClick={() =>
            handleEstadoChange(
              estadoFilter === EstadoVenta.ORDEN_CONFIRMADA
                ? "all"
                : EstadoVenta.ORDEN_CONFIRMADA,
            )
          }
          active={estadoFilter === EstadoVenta.ORDEN_CONFIRMADA}
        />
        <StatCard
          label="Entregadas"
          value={statsEntregadas?.meta?.total}
          icon={ShoppingCart}
          index={3}
          onClick={() =>
            handleEstadoChange(
              estadoFilter === EstadoVenta.ENTREGADA
                ? "all"
                : EstadoVenta.ENTREGADA,
            )
          }
          active={estadoFilter === EstadoVenta.ENTREGADA}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por número o cliente..."
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Tabs value={estadoFilter} onValueChange={handleEstadoChange}>
              <TabsList className="h-9 max-w-[calc(100vw-2rem)] flex-nowrap gap-0.5 overflow-x-auto rounded-lg border border-border/60 bg-muted/60 p-0.5 sm:max-w-none">
                <TabsTrigger value="all" className="h-8 shrink-0 rounded-md px-3 text-xs">
                  Todos
                </TabsTrigger>
                <TabsTrigger value={EstadoVenta.COTIZACION} className="h-8 shrink-0 rounded-md px-3 text-xs">
                  Cotización
                </TabsTrigger>
                <TabsTrigger value={EstadoVenta.ORDEN_CONFIRMADA} className="h-8 shrink-0 rounded-md px-3 text-xs">
                  Confirmada
                </TabsTrigger>
                <TabsTrigger value={EstadoVenta.ENTREGADA} className="h-8 shrink-0 rounded-md px-3 text-xs">
                  Entregada
                </TabsTrigger>
                <TabsTrigger value={EstadoVenta.CANCELADA} className="h-8 shrink-0 rounded-md px-3 text-xs">
                  Cancelada
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <AutoRefreshControl
              enabled={autoRefresh}
              interval={refreshInterval}
              intervals={REFRESH_INTERVALS}
              switchId="auto-refresh-ventas"
              onEnabledChange={(value) => {
                setAutoRefresh(value);
                showAutoRefreshToast(value);
              }}
              onIntervalChange={setRefreshInterval}
              onManualRefresh={handleManualRefresh}
            />
            <PageActionsMenu
              items={[
                {
                  label: "Actualizar lista",
                  icon: RefreshCcw,
                  onSelect: handleManualRefresh,
                },
                {
                  label: "Exportar CSV",
                  icon: Download,
                  onSelect: handleExportCSV,
                },
                {
                  label: "Nueva venta",
                  icon: Receipt,
                  onSelect: () => {
                    window.location.href = "/pos";
                  },
                  hidden: !showCreateButton,
                },
              ]}
            />
            {showCreateButton ? (
              <Button asChild size="sm" className="rounded-lg">
                <Link href="/pos">
                  <Receipt className="size-4" />
                  Nueva venta
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <ServerDataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.meta?.total ?? 0}
        page={page}
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        errorMessage="No se pudo cargar el historial de ventas."
        onRetry={() => void refetch()}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        emptyMessage="Sin ventas"
        emptyDescription="No hay ventas que coincidan con el filtro."
        enableColumnVisibility
        columnVisibilityStorageKey="erp:historial-ventas:table-columns"
      />

      <VentaDetailSheet
        venta={selectedVenta}
        open={!!selectedVenta}
        onOpenChange={(open) => {
          if (!open) setSelectedVenta(null);
        }}
      />

      <EmitirComprobanteModal
        venta={emitVenta ? toEmitVentaInput(emitVenta) : null}
        onClose={() => setEmitVenta(null)}
        onSuccess={() => {
          void refetch();
        }}
      />

      <Dialog
        open={cancelId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelId(null);
            setMotivo("");
          }
        }}
      >
        <DialogContent className="w-full rounded-2xl p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="size-5 text-destructive" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <DialogTitle>Anular venta</DialogTitle>
                <DialogDescription>
                  Se revertirá el stock y se registrará la salida en caja como
                  devolución.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-2 px-5 py-4">
            <Label htmlFor="motivo-anulacion">Motivo (opcional)</Label>
            <Textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ej: Cliente desistió, error de cobro..."
              rows={3}
            />
          </div>
          <DialogFooter className="border-t border-border/60 px-5 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setCancelId(null);
                setMotivo("");
              }}
              disabled={cancelar.isPending}
              className="rounded-xl"
            >
              Cerrar
            </Button>
            <Button
              variant="destructive"
              onClick={handleAnular}
              disabled={cancelar.isPending}
              className="rounded-xl"
            >
              {cancelar.isPending ? "Anulando..." : "Sí, anular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HistorialPage() {
  return <HistorialVentasWorkspace />;
}
