"use client";

import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Download,
  Eye,
  Package,
  Plus,
  RefreshCcw,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  TipoMovimiento,
  type MovimientoListItem,
  type MovimientoFilters,
  type StockFilters,
  type StockListItem,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import {
  readStoredInventarioAutoRefreshPreference,
  writeStoredInventarioAutoRefreshPreference,
} from "@/lib/inventario-auto-refresh";
import {
  getSelectableManualTiposMovimiento,
  getTiposMovimientoConfig,
  getTiposMovimientoLabelMap,
} from "@/lib/tipos-movimiento";
import { useAuth } from "@/hooks/use-auth";
import { useStoredAutoRefresh } from "@/hooks/use-stored-auto-refresh";
import { useTiposMovimientoConfig } from "@/hooks/use-configuracion";
import {
  useStock,
  useMovimientos,
  useAlertasStock,
  useAlmacenes,
  useCreateMovimiento,
  useResolverAlerta,
} from "@/hooks/use-inventario";
import { useDebounce } from "@/hooks/use-debounce";
import { AutoRefreshControl } from "@/components/layout/auto-refresh-control";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { PageHeader } from "@/components/layout/page-header";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { MovimientoForm } from "@/components/forms/movimiento-form";
import { StockDetailSheet } from "@/components/inventario/stock-detail-sheet";
import { MovimientoDetailDialog } from "@/components/inventario/movimiento-detail-dialog";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ── Constants ─────────────────────────────────────── */

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const REFRESH_INTERVALS = [
  { label: "30 s", value: 30_000 },
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
  { label: "15 min", value: 900_000 },
];

const INVENTARIO_REFRESH_TOAST_ID = "inventario-refresh";
const INVENTARIO_AUTO_REFRESH_TOAST_ID = "inventario-auto-refresh";

/* ── Helpers ───────────────────────────────────────── */

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportToCSV(rows: StockListItem[], filename: string) {
  const header = [
    "SKU",
    "Producto",
    "Almacén",
    "Cantidad",
    "Stock mínimo",
    "Estado",
  ];
  const lines = rows.map((r) => {
    const bajo = r.cantidad <= r.producto.stockMinimo;
    return [
      r.producto.sku,
      `"${r.producto.nombre}"`,
      `"${r.almacen.nombre}"`,
      r.cantidad,
      r.producto.stockMinimo,
      bajo ? "Bajo" : "Normal",
    ].join(",");
  });
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


/* ── Page component ────────────────────────────────── */

export default function InventarioPage() {
  const { hasRole } = useAuth();

  /* stock state */
  const [stockPage, setStockPage] = useState(1);
  const [stockLimit, setStockLimit] = useState(DEFAULT_LIMIT);
  const [stockSearch, setStockSearch] = useState("");
  const [stockAlmacen, setStockAlmacen] = useState<string>("all");
  /* filtros popover (draft state) */
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [draftStockBajo, setDraftStockBajo] = useState<boolean | undefined>(
    undefined,
  );
  /* applied filters */
  const [appliedStockBajo, setAppliedStockBajo] = useState<boolean | undefined>(
    undefined,
  );

  const debouncedStockSearch = useDebounce(stockSearch, 300);

  /* movimientos state */
  const [movPage, setMovPage] = useState(1);
  const [movLimit, setMovLimit] = useState(DEFAULT_LIMIT);
  const [movTipo, setMovTipo] = useState<string>("all");
  const [movAlmacen, setMovAlmacen] = useState<string>("all");

  /* dialog state */
  const [dialogOpen, setDialogOpen] = useState(false);

  /* details viewers */
  const [stockDetail, setStockDetail] = useState<StockListItem | null>(null);
  const [movDetail, setMovDetail] = useState<MovimientoListItem | null>(null);

  /* selection mode (stock tab) */
  const [selectionMode, setSelectionMode] = useState(false);

  /* movimientos filtros popover */
  const [movFiltrosOpen, setMovFiltrosOpen] = useState(false);
  const [draftMovAlmacen, setDraftMovAlmacen] = useState<string>("all");

  /* almacenes for filters */
  const { data: almacenesRes } = useAlmacenes();
  const almacenes = useMemo(
    () => almacenesRes?.data ?? [],
    [almacenesRes?.data],
  );
  const { data: tiposMovimientoRes } = useTiposMovimientoConfig();
  const tiposMovimientoConfig = tiposMovimientoRes?.data;

  /* stock query */
  const stockFilters = useMemo<StockFilters>(
    () => ({
      page: stockPage,
      limit: stockLimit,
      search: debouncedStockSearch || undefined,
      almacenId: stockAlmacen !== "all" ? stockAlmacen : undefined,
      stockBajo: appliedStockBajo,
    }),
    [
      stockPage,
      stockLimit,
      debouncedStockSearch,
      stockAlmacen,
      appliedStockBajo,
    ],
  );
  const {
    data: stockRes,
    isLoading: stockLoading,
    isError: stockError,
    refetch: refetchStock,
  } = useStock(stockFilters);

  /* stock bajo count for KPI */
  const { data: stockBajoCountRes } = useStock(
    useMemo<StockFilters>(() => ({ page: 1, limit: 1, stockBajo: true }), []),
  );

  const allowedTipoOptions = useMemo(() => {
    const base = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
      ? getSelectableManualTiposMovimiento(undefined, tiposMovimientoConfig)
      : getSelectableManualTiposMovimiento(undefined, tiposMovimientoConfig, {
          allowTecnico: true,
        });
    const activos = almacenes.filter((a) => a.activo).length;
    if (activos < 2) {
      return base.filter((item) => item.codigo !== TipoMovimiento.TRANSFERENCIA);
    }
    return base;
  }, [almacenes, hasRole, tiposMovimientoConfig]);
  const visibleMovimientoFilters = useMemo(
    () =>
      getTiposMovimientoConfig(tiposMovimientoConfig).filter(
        (item) => item.activo,
      ),
    [tiposMovimientoConfig],
  );
  const fallbackMovimientoFilters = useMemo(
    () => getTiposMovimientoConfig(tiposMovimientoConfig),
    [tiposMovimientoConfig],
  );
  const movimientoFilterOptions =
    visibleMovimientoFilters.length > 0
      ? visibleMovimientoFilters
      : fallbackMovimientoFilters;
  const effectiveMovTipo = useMemo(
    () =>
      movTipo !== "all" &&
      !movimientoFilterOptions.some((item) => item.codigo === movTipo)
        ? "all"
        : movTipo,
    [movTipo, movimientoFilterOptions],
  );
  const tipoMovimientoLabels = useMemo(
    () => getTiposMovimientoLabelMap(tiposMovimientoConfig),
    [tiposMovimientoConfig],
  );

  /* movimientos query */
  const movFilters = useMemo<MovimientoFilters>(
    () => ({
      page: movPage,
      limit: movLimit,
      tipo: effectiveMovTipo !== "all" ? effectiveMovTipo : undefined,
      almacenId: movAlmacen !== "all" ? movAlmacen : undefined,
    }),
    [movPage, movLimit, effectiveMovTipo, movAlmacen],
  );
  const {
    data: movRes,
    isLoading: movLoading,
    isError: movError,
    refetch: refetchMovimientos,
  } = useMovimientos(movFilters);

  /* alertas */
  const {
    data: alertasRes,
    isLoading: alertasLoading,
    isError: alertasError,
    refetch: refetchAlertas,
  } = useAlertasStock();
  const alertas = alertasRes?.data ?? [];
  const alertasPendientes = alertas.filter((a) => !a.resuelta).length;

  /* KPIs */
  const totalStockRows = stockRes?.meta?.total ?? 0;
  const stockBajoTotal = stockBajoCountRes?.meta?.total ?? 0;
  const almacenesActivos = almacenes.filter((a) => a.activo).length;

  /* mutations */
  const createMovimiento = useCreateMovimiento();
  const resolverAlerta = useResolverAlerta();

  const canResolveAlertas = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canCreate = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);

  /* ── Auto-refresh ── */
  const refetchAll = useCallback(() => {
    void refetchStock();
    void refetchMovimientos();
    void refetchAlertas();
  }, [refetchStock, refetchMovimientos, refetchAlertas]);

  const showRefreshToast = useCallback(() => {
    toast.info("Lista actualizada", {
      id: INVENTARIO_REFRESH_TOAST_ID,
      duration: 1600,
    });
  }, []);

  const showAutoRefreshToast = useCallback((enabled: boolean) => {
    if (enabled) {
      toast.success("Auto-refresh activado", {
        id: INVENTARIO_AUTO_REFRESH_TOAST_ID,
        duration: 1800,
      });
      return;
    }

    toast.info("Auto-refresh desactivado", {
      id: INVENTARIO_AUTO_REFRESH_TOAST_ID,
      duration: 1800,
    });
  }, []);

  const handleManualRefresh = useCallback(() => {
    refetchAll();
    showRefreshToast();
  }, [refetchAll, showRefreshToast]);

  const {
    enabled: autoRefreshEnabled,
    interval: autoRefreshInterval,
    setEnabled: setAutoRefreshEnabled,
    setInterval: setAutoRefreshInterval,
  } = useStoredAutoRefresh({
    readPreference: readStoredInventarioAutoRefreshPreference,
    writePreference: writeStoredInventarioAutoRefreshPreference,
    onRefresh: refetchAll,
  });

  /* ── Filtros popover handlers ── */
  const handleApplyFiltros = useCallback(() => {
    setAppliedStockBajo(draftStockBajo);
    setStockPage(1);
    setFiltrosOpen(false);
  }, [draftStockBajo]);

  const handleClearFiltros = useCallback(() => {
    setDraftStockBajo(undefined);
    setAppliedStockBajo(undefined);
    setStockPage(1);
    setFiltrosOpen(false);
  }, []);

  const handleApplyMovFiltros = useCallback(() => {
    setMovAlmacen(draftMovAlmacen);
    setMovPage(1);
    setMovFiltrosOpen(false);
  }, [draftMovAlmacen]);

  const handleClearMovFiltros = useCallback(() => {
    setDraftMovAlmacen("all");
    setMovAlmacen("all");
    setMovPage(1);
    setMovFiltrosOpen(false);
  }, []);

  const activeFiltersCount =
    (stockAlmacen !== "all" ? 1 : 0) + (appliedStockBajo !== undefined ? 1 : 0);
  const movActiveFiltersCount =
    (effectiveMovTipo !== "all" ? 1 : 0) + (movAlmacen !== "all" ? 1 : 0);

  /* ── Handlers ── */

  const handleCreateMovimiento = useCallback(
    (data: Parameters<typeof createMovimiento.mutate>[0]) => {
      createMovimiento.mutate(data, {
        onSuccess: () => {
          toast.success("Movimiento registrado correctamente");
          setDialogOpen(false);
          refetchAll();
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al registrar movimiento");
        },
      });
    },
    [createMovimiento, refetchAll],
  );

  const handleResolverAlerta = useCallback(
    (id: string) => {
      resolverAlerta.mutate(id, {
        onSuccess: () => toast.success("Alerta resuelta"),
        onError: (err: Error) =>
          toast.error(err.message || "Error al resolver alerta"),
      });
    },
    [resolverAlerta],
  );

  /* ── Column definitions ── */

  const stockColumns = useMemo<ColumnDef<StockListItem, unknown>[]>(
    () => [
      {
        accessorKey: "producto",
        header: "Producto",
        cell: ({ row }) => {
          const p = row.original.producto;
          return (
            <div className="flex max-w-55 flex-col">
              <span className="font-medium truncate" title={p.nombre}>
                {p.nombre}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {p.sku}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "almacen",
        header: "Almacén",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Warehouse className="size-3.5 text-muted-foreground shrink-0" />
            <span>{row.original.almacen.nombre}</span>
          </div>
        ),
      },
      {
        accessorKey: "cantidad",
        header: "Cantidad",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums font-medium">
            {row.original.cantidad}
          </span>
        ),
      },
      {
        accessorKey: "stockMinimo",
        header: "Stock mín.",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {row.original.producto.stockMinimo}
          </span>
        ),
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const { cantidad } = row.original;
          const { stockMinimo } = row.original.producto;
          if (cantidad === 0) {
            return (
              <Badge className="whitespace-nowrap bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400">
                Sin stock
              </Badge>
            );
          }
          if (cantidad <= stockMinimo) {
            return (
              <Badge className="whitespace-nowrap bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400">
                Stock bajo
              </Badge>
            );
          }
          return (
            <Badge className="whitespace-nowrap bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400">
              Normal
            </Badge>
          );
        },
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        enableHiding: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-xs"
              onClick={() => setStockDetail(row.original)}
            >
              <Eye className="size-3.5" />
              <span className="hidden sm:inline">Ver detalles</span>
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const movimientoColumns = useMemo<ColumnDef<MovimientoListItem, unknown>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => (
          <Badge variant="outline" className="whitespace-nowrap">
            {tipoMovimientoLabels[row.original.tipo]}
          </Badge>
        ),
      },
      {
        accessorKey: "cantidad",
        header: "Cantidad",
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold">
            {row.original.cantidad}
          </span>
        ),
      },
      {
        accessorKey: "cantidadAnterior",
        header: "Antes",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.cantidadAnterior}
          </span>
        ),
      },
      {
        accessorKey: "cantidadPosterior",
        header: "Después",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.cantidadPosterior}
          </span>
        ),
      },
      {
        accessorKey: "justificacion",
        header: "Justificación",
        cell: ({ row }) => {
          const text = row.original.justificacion;
          return text ? (
            <span className="block max-w-50 truncate" title={text}>
              {text}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        enableHiding: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-xs"
              onClick={() => setMovDetail(row.original)}
            >
              <Eye className="size-3.5" />
              <span className="hidden sm:inline">Ver detalles</span>
            </Button>
          </div>
        ),
      },
    ],
    [tipoMovimientoLabels],
  );

  /* ── Extra handlers ── */

  const handleStockSearch = useCallback((value: string) => {
    setStockSearch(value);
    setStockPage(1);
  }, []);

  const handleStockAlmacen = useCallback((value: string) => {
    setStockAlmacen(value);
    setStockPage(1);
  }, []);

  const handleMovTipo = useCallback((value: string) => {
    setMovTipo(value);
    setMovPage(1);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!stockRes?.data?.length) {
      toast.info("No hay datos para exportar");
      return;
    }
    exportToCSV(
      stockRes.data,
      `stock-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success("CSV exportado correctamente");
  }, [stockRes]);

  return (
    <div className="flex flex-col gap-5 w-full min-w-0 flex-1 min-h-0">
      <PageHeader
        title="Inventario"
        description="Stock, ajustes y transferencias"
        hideTitleVisually
        actions={
          <>
            <AutoRefreshControl
              enabled={autoRefreshEnabled}
              interval={autoRefreshInterval}
              intervals={REFRESH_INTERVALS}
              switchId="inv-auto-refresh"
              onEnabledChange={(value) => {
                setAutoRefreshEnabled(value);
                showAutoRefreshToast(value);
              }}
              onIntervalChange={setAutoRefreshInterval}
              onManualRefresh={handleManualRefresh}
            />
            <PageActionsMenu
              contentClassName="w-44"
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
              ]}
            />
            {canCreate ? (
              <Button
                onClick={() => setDialogOpen(true)}
                className="erp-page-primary-cta rounded-xl"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Registrar movimiento</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            ) : null}
          </>
        }
      />

      {/* KPI Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Registros stock"
          value={totalStockRows}
          isLoading={stockLoading}
          icon={Package}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          subtitle="producto x almacén"
          index={0}
        />
        <StatCard
          label="Stock bajo"
          value={stockBajoTotal}
          isLoading={stockLoading}
          icon={AlertTriangle}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
          subtitle="bajo mínimo"
          index={1}
        />
        <StatCard
          label="Alertas"
          value={alertasPendientes}
          isLoading={alertasLoading}
          icon={alertasPendientes > 0 ? AlertTriangle : CheckCircle2}
          color={
            alertasPendientes > 0
              ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          }
          subtitle="pendientes"
          index={2}
        />
        <StatCard
          label="Almacenes"
          value={almacenesActivos}
          icon={Warehouse}
          color="bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300"
          subtitle="activos"
          index={3}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stock" className="flex flex-col flex-1 min-h-0">
        <TabsList className="flex h-10 w-full gap-0.5 bg-muted/60 p-1 rounded-xl border border-border/60 shrink-0">
          <TabsTrigger
            value="stock"
            className="flex-1 gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Package className="size-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger
            value="movimientos"
            className="flex-1 gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <ArrowRightLeft className="size-4" />
            <span className="hidden sm:inline">Movimientos</span>
            <span className="sm:hidden">Mov.</span>
          </TabsTrigger>
          <TabsTrigger
            value="alertas"
            className="flex-1 gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <AlertTriangle className="size-4" />
            Alertas
            {alertasPendientes > 0 && (
              <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {alertasPendientes > 9 ? "9+" : alertasPendientes}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Stock tab ── */}
        <TabsContent
          value="stock"
          className="mt-2 flex flex-col flex-1 min-h-0"
        >
          {/* Stock toolbar */}
          <div className="flex flex-col gap-2.5 mb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <ToolbarSearchInput
                value={stockSearch}
                onChange={handleStockSearch}
                placeholder="Buscar producto…"
              />

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
                {/* Almacén quick-filter tabs */}
                <Tabs value={stockAlmacen} onValueChange={handleStockAlmacen}>
                  <TabsList className="h-9 max-w-70 gap-0.5 overflow-x-auto rounded-lg border border-border/60 bg-muted/60 p-0.5 sm:max-w-none">
                    <TabsTrigger
                      value="all"
                      className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                    >
                      <Warehouse className="size-3.5" />
                      <span className="hidden sm:inline">Todos</span>
                    </TabsTrigger>
                    {almacenes.map((a) => (
                      <TabsTrigger
                        key={a.id}
                        value={a.id}
                        className="h-8 max-w-30 shrink-0 truncate rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        {a.nombre}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Filtros popover (stockBajo) */}
                <Popover open={filtrosOpen} onOpenChange={setFiltrosOpen}>
                  <PopoverTrigger asChild>
                    <ToolbarFiltersButton
                      open={filtrosOpen}
                      activeCount={activeFiltersCount}
                    />
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={10}
                    className="w-65 rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
                  >
                    <div className="border-b border-border/60 px-4 py-3">
                      <p className="text-sm font-semibold">Filtros</p>
                      <p className="text-xs text-muted-foreground">
                        Refina el stock visible
                      </p>
                    </div>
                    <div className="space-y-4 px-4 py-4">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Estado de stock
                        </p>
                        <div className="grid gap-2">
                          {[
                            { label: "Todos", value: undefined },
                            { label: "Solo stock bajo", value: true },
                            { label: "Solo normal", value: false },
                          ].map((opt) => (
                            <button
                              key={String(opt.value)}
                              type="button"
                              className={cn(
                                "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                draftStockBajo === opt.value
                                  ? "border-primary/40 bg-primary/5 text-foreground"
                                  : "border-border/60 bg-background hover:bg-muted/40",
                              )}
                              onClick={() => setDraftStockBajo(opt.value)}
                            >
                              <span
                                className={cn(
                                  "flex size-4 items-center justify-center rounded-full border transition-colors",
                                  draftStockBajo === opt.value
                                    ? "border-primary"
                                    : "border-muted-foreground/40",
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-2 rounded-full transition-colors",
                                    draftStockBajo === opt.value
                                      ? "bg-primary"
                                      : "bg-transparent",
                                  )}
                                />
                              </span>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-xs text-muted-foreground"
                          onClick={handleClearFiltros}
                        >
                          Limpiar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          onClick={handleApplyFiltros}
                        >
                          Aplicar filtros
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Seleccionar */}
                <Button
                  variant={selectionMode ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg text-xs"
                  onClick={() => setSelectionMode(!selectionMode)}
                >
                  <CheckCircle2 className="size-3.5" />
                  {selectionMode ? "Cancelar" : "Seleccionar"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Cada fila representa el stock de un producto en un almacén
              específico.
            </p>
          </div>

          <ServerDataTable
            columns={stockColumns}
            data={stockRes?.data ?? []}
            total={stockRes?.meta?.total ?? 0}
            page={stockPage}
            limit={stockLimit}
            isLoading={stockLoading}
            isError={stockError}
            errorMessage="No se pudo cargar el stock."
            onRetry={() => void refetchStock()}
            onPageChange={setStockPage}
            onLimitChange={(l) => {
              setStockLimit(l);
              setStockPage(1);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            enableRowSelection={selectionMode}
            bulkActionsBar={(selectedRows, clearSelection) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-xl text-xs"
                onClick={() => {
                  exportToCSV(
                    selectedRows,
                    `stock-seleccionado-${new Date().toISOString().slice(0, 10)}.csv`,
                  );
                  toast.success(
                    `${selectedRows.length} registros de stock exportados`,
                  );
                  clearSelection();
                }}
              >
                <Download className="size-3.5" /> Exportar
              </Button>
            )}
            columnVisibilityStorageKey="erp:inventario:stock-columns"
            emptyMessage="Sin stock"
            emptyDescription="No se encontraron registros de stock."
          />
        </TabsContent>

        {/* ── Movimientos tab ── */}
        <TabsContent
          value="movimientos"
          className="mt-2 flex flex-col flex-1 min-h-0"
        >
          {/* Movimientos toolbar */}
          <div className="flex flex-col gap-2.5 mb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {/* Tipo quick-filter tabs */}
              <Tabs value={effectiveMovTipo} onValueChange={handleMovTipo}>
                <TabsList className="h-9 gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/60 overflow-x-auto max-w-[calc(100vw-2rem)] sm:max-w-none flex-nowrap">
                  <TabsTrigger
                    value="all"
                    className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                  >
                    Todos
                  </TabsTrigger>
                  {movimientoFilterOptions.map((item) => (
                    <TabsTrigger
                      key={item.codigo}
                      value={item.codigo}
                      className="h-8 px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                    >
                      {item.nombre}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 sm:ml-auto shrink-0">
                {/* Filtros popover (almacén) */}
                <Popover open={movFiltrosOpen} onOpenChange={setMovFiltrosOpen}>
                  <PopoverTrigger asChild>
                    <ToolbarFiltersButton
                      open={movFiltrosOpen}
                      activeCount={movActiveFiltersCount}
                    />
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={10}
                    className="w-65 rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
                  >
                    <div className="border-b border-border/60 px-4 py-3">
                      <p className="text-sm font-semibold">Filtros</p>
                      <p className="text-xs text-muted-foreground">
                        Refina los movimientos
                      </p>
                    </div>
                    <div className="space-y-4 px-4 py-4">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Almacén
                        </p>
                        <div className="grid gap-2">
                          <button
                            type="button"
                            className={cn(
                              "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                              draftMovAlmacen === "all"
                                ? "border-primary/40 bg-primary/5 text-foreground"
                                : "border-border/60 bg-background hover:bg-muted/40",
                            )}
                            onClick={() => setDraftMovAlmacen("all")}
                          >
                            <span
                              className={cn(
                                "flex size-4 items-center justify-center rounded-full border transition-colors",
                                draftMovAlmacen === "all"
                                  ? "border-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              <span
                                className={cn(
                                  "size-2 rounded-full transition-colors",
                                  draftMovAlmacen === "all"
                                    ? "bg-primary"
                                    : "bg-transparent",
                                )}
                              />
                            </span>
                            <span>Todos los almacenes</span>
                          </button>
                          {almacenes.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              className={cn(
                                "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                draftMovAlmacen === a.id
                                  ? "border-primary/40 bg-primary/5 text-foreground"
                                  : "border-border/60 bg-background hover:bg-muted/40",
                              )}
                              onClick={() => setDraftMovAlmacen(a.id)}
                            >
                              <span
                                className={cn(
                                  "flex size-4 items-center justify-center rounded-full border transition-colors",
                                  draftMovAlmacen === a.id
                                    ? "border-primary"
                                    : "border-muted-foreground/40",
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-2 rounded-full transition-colors",
                                    draftMovAlmacen === a.id
                                      ? "bg-primary"
                                      : "bg-transparent",
                                  )}
                                />
                              </span>
                              <span className="truncate">{a.nombre}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-xs text-muted-foreground"
                          onClick={handleClearMovFiltros}
                        >
                          Limpiar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          onClick={handleApplyMovFiltros}
                        >
                          Aplicar filtros
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <ServerDataTable
            columns={movimientoColumns}
            data={movRes?.data ?? []}
            total={movRes?.meta?.total ?? 0}
            page={movPage}
            limit={movLimit}
            isLoading={movLoading}
            isError={movError}
            errorMessage="No se pudo cargar el historial de movimientos."
            onRetry={() => void refetchMovimientos()}
            onPageChange={setMovPage}
            onLimitChange={(l) => {
              setMovLimit(l);
              setMovPage(1);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            columnVisibilityStorageKey="erp:inventario:movimientos-columns"
            emptyMessage="Sin movimientos"
            emptyDescription="No se encontraron movimientos registrados."
          />
        </TabsContent>

        {/* ── Alertas tab ── */}
        <TabsContent value="alertas" className="mt-2 flex-1 overflow-y-auto">
          {alertasLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6 animate-pulse h-24"
                />
              ))}
            </div>
          ) : alertasError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-xl border border-border text-center">
              <AlertTriangle className="size-10 text-destructive/70" />
              <div className="flex flex-col gap-1">
                <p className="font-medium text-foreground">
                  No se pudieron cargar las alertas
                </p>
                <p className="text-xs text-muted-foreground">
                  Revisa la conexión con la API y vuelve a intentar.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchAlertas()}
                className="rounded-lg"
              >
                Reintentar
              </Button>
            </div>
          ) : alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 rounded-xl border border-border">
              <CheckCircle2 className="size-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">Sin alertas</p>
              <p className="text-xs text-muted-foreground/70">
                No hay alertas de stock pendientes
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={cn(
                    "rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    alerta.resuelta && "opacity-60",
                  )}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-medium truncate max-w-50"
                        title={alerta.producto.nombre}
                      >
                        {alerta.producto.nombre}
                      </span>
                      {alerta.resuelta ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400">
                          Resuelta
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Pendiente</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {alerta.producto.sku} · {alerta.almacen.nombre}
                    </span>
                    <div className="flex gap-4 text-sm mt-1">
                      <span className="text-muted-foreground">
                        Actual:{" "}
                        <span className="font-medium text-destructive">
                          {alerta.stockActual}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Mínimo:{" "}
                        <span className="font-medium">
                          {alerta.stockMinimo}
                        </span>
                      </span>
                    </div>
                  </div>
                  {!alerta.resuelta && canResolveAlertas && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl shrink-0"
                      disabled={resolverAlerta.isPending}
                      onClick={() => handleResolverAlerta(alerta.id)}
                    >
                      <CheckCircle2 className="size-4" />
                      Resolver
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Registrar movimiento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-y-auto max-h-[90vh] p-3 sm:p-6">
          <DialogHeader className="mb-2 sm:mb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
                <ArrowRightLeft className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle>Registrar movimiento</DialogTitle>
                <DialogDescription>
                  Registra un nuevo movimiento de inventario
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <MovimientoForm
            onSubmit={handleCreateMovimiento}
            isLoading={createMovimiento.isPending}
            tipoOptions={allowedTipoOptions}
          />
        </DialogContent>
      </Dialog>

      {/* Stock detail */}
      <StockDetailSheet
        stock={stockDetail}
        open={stockDetail !== null}
        onOpenChange={(open) => {
          if (!open) setStockDetail(null);
        }}
        onCreateMovimiento={
          canCreate
            ? () => {
                setStockDetail(null);
                setDialogOpen(true);
              }
            : undefined
        }
      />

      {/* Movimiento detail */}
      <MovimientoDetailDialog
        movimiento={movDetail}
        open={movDetail !== null}
        onOpenChange={(open) => {
          if (!open) setMovDetail(null);
        }}
      />
    </div>
  );
}
