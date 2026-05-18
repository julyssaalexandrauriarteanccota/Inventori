"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { StockListItem } from "@erp/shared";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  Filter,
  MoreHorizontal,
  Package,
  RefreshCcw,
  Search,
  TrendingDown,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useStock, useAlmacenes } from "@/hooks/use-inventario";
import { useReporteStock } from "@/hooks/use-configuracion";
import { useDebounce } from "@/hooks/use-debounce";
import {
  readStoredInventarioAutoRefreshPreference,
  writeStoredInventarioAutoRefreshPreference,
} from "@/lib/inventario-auto-refresh";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/layout/stat-card";
import { cn } from "@/lib/utils";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const REFRESH_INTERVALS = [
  { label: "30 s", value: 30_000 },
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
  { label: "15 min", value: 900_000 },
];

const REPORTE_INVENTARIO_REFRESH_TOAST_ID = "reporte-inventario-refresh";
const REPORTE_INVENTARIO_AUTO_REFRESH_TOAST_ID =
  "reporte-inventario-auto-refresh";

function exportToCSV(rows: StockListItem[], filename: string) {
  const header = [
    "Producto",
    "SKU",
    "Almacén",
    "Cantidad",
    "Stock mínimo",
    "Estado",
  ];
  const lines = rows.map((row) => {
    const isBajo = row.cantidad <= row.producto.stockMinimo;

    return [
      `"${row.producto.nombre}"`,
      row.producto.sku,
      `"${row.almacen.nombre}"`,
      row.cantidad,
      row.producto.stockMinimo,
      isBajo ? "Stock bajo" : "Normal",
    ].join(",");
  });

  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}


export default function ReporteInventarioTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [tabValue, setTabValue] = useState<"todos" | "bajo">("todos");
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [almacenId, setAlmacenId] = useState<string | undefined>(undefined);
  const [draftAlmacenId, setDraftAlmacenId] = useState<string | undefined>(
    undefined,
  );
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(
    () => readStoredInventarioAutoRefreshPreference().enabled,
  );
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(
    () => readStoredInventarioAutoRefreshPreference().interval,
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFiltrosOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setDraftAlmacenId(almacenId);
      }

      setFiltrosOpen(open);
    },
    [almacenId],
  );

  const applyFiltros = useCallback(() => {
    setAlmacenId(draftAlmacenId);
    setPage(1);
    setFiltrosOpen(false);
  }, [draftAlmacenId]);

  const clearFiltros = useCallback(() => {
    setDraftAlmacenId(undefined);
    setAlmacenId(undefined);
    setPage(1);
    setFiltrosOpen(false);
  }, []);

  const stockFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      almacenId,
      stockBajo: tabValue === "bajo" ? true : undefined,
    }),
    [page, limit, debouncedSearch, almacenId, tabValue],
  );

  const reporteFilters = useMemo(
    () => ({
      almacenId,
    }),
    [almacenId],
  );

  const {
    data: almacenesData,
    isFetching: almacenesFetching,
    refetch: refetchAlmacenes,
  } = useAlmacenes();
  const almacenes = almacenesData?.data ?? [];

  const {
    data: reporteData,
    isLoading: reporteLoading,
    isFetching: reporteFetching,
    refetch: refetchReporte,
  } = useReporteStock(reporteFilters);
  const reporte = reporteData?.data;

  const {
    data: stockData,
    isLoading: stockLoading,
    isError: stockIsError,
    error: stockError,
    isFetching: stockFetching,
    refetch: refetchStock,
  } = useStock(stockFilters);

  const rows = useMemo(() => stockData?.data ?? [], [stockData?.data]);
  const meta = stockData?.meta;

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchStock(), refetchReporte(), refetchAlmacenes()]);
  }, [refetchStock, refetchReporte, refetchAlmacenes]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (autoRefreshEnabled) {
      intervalRef.current = setInterval(() => {
        void refetchAll();
      }, autoRefreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefreshEnabled, autoRefreshInterval, refetchAll]);

  const handleToggleAutoRefresh = useCallback(
    (enabled: boolean) => {
      setAutoRefreshEnabled(enabled);
      writeStoredInventarioAutoRefreshPreference({
        enabled,
        interval: autoRefreshInterval,
      });
    },
    [autoRefreshInterval],
  );

  const handleChangeInterval = useCallback(
    (interval: number) => {
      setAutoRefreshInterval(interval);
      writeStoredInventarioAutoRefreshPreference({
        enabled: autoRefreshEnabled,
        interval,
      });
    },
    [autoRefreshEnabled],
  );

  const handleManualRefresh = useCallback(() => {
    void refetchAll();
    toast.info("Reporte actualizado", {
      id: REPORTE_INVENTARIO_REFRESH_TOAST_ID,
      duration: 1600,
    });
  }, [refetchAll]);

  const handleExportCSV = useCallback(() => {
    if (rows.length === 0) {
      toast.info("No hay registros para exportar", { duration: 1600 });
      return;
    }

    exportToCSV(
      rows,
      `reporte-inventario-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success("CSV exportado", { duration: 1600 });
  }, [rows]);

  const hasActiveFiltros = Boolean(almacenId);
  const activeFilterCount = hasActiveFiltros ? 1 : 0;
  const isRefreshing = stockFetching || reporteFetching || almacenesFetching;

  const alertasPendientes =
    reporte?.alertas.filter((alerta) => !alerta.resuelta).length ?? 0;
  const alertasResueltas =
    reporte?.alertas.filter((alerta) => alerta.resuelta).length ?? 0;
  const stockBajoCount = reporte?.stockBajo?.length ?? 0;
  const totalAlertas = reporte?.totalAlertas ?? 0;

  const columns = useMemo<ColumnDef<StockListItem, unknown>[]>(
    () => [
      {
        id: "producto",
        accessorFn: (row) => row.producto.nombre,
        header: "Producto",
        size: 220,
        cell: ({ row }) => (
          <div className="flex flex-col max-w-55">
            <span
              className="truncate font-medium"
              title={row.original.producto.nombre}
            >
              {row.original.producto.nombre}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {row.original.producto.sku}
            </span>
          </div>
        ),
      },
      {
        id: "sku",
        accessorFn: (row) => row.producto.sku,
        header: "SKU",
        size: 120,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: "almacen",
        accessorFn: (row) => row.almacen.nombre,
        header: "Almacén",
        size: 150,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Warehouse className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{row.original.almacen.nombre}</span>
          </div>
        ),
      },
      {
        accessorKey: "cantidad",
        header: "Cantidad",
        size: 100,
        cell: ({ getValue, row }) => {
          const isBajo =
            (getValue() as number) <= row.original.producto.stockMinimo;

          return (
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                isBajo ? "text-destructive" : "text-foreground",
              )}
            >
              {getValue() as number}
            </span>
          );
        },
      },
      {
        id: "stockMinimo",
        accessorFn: (row) => row.producto.stockMinimo,
        header: "Mínimo",
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: "estado",
        header: "Estado",
        size: 110,
        cell: ({ row }) => {
          const isBajo =
            row.original.cantidad <= row.original.producto.stockMinimo;

          return isBajo ? (
            <Badge
              variant="outline"
              className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[11px]"
            >
              Stock bajo
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px]"
            >
              Normal
            </Badge>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 w-full min-w-0 flex-1 min-h-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sr-only text-2xl font-semibold tracking-tight text-foreground">
            Reporte de inventario
          </h1>
          <p className="text-sm text-muted-foreground">
            Visibilidad de stock, alertas y movimientos
          </p>
        </div>

        <div className="ml-auto flex max-w-full items-center gap-2 shrink-0 flex-wrap justify-end">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors duration-300",
              autoRefreshEnabled
                ? "border-primary/25 bg-primary/5"
                : "border-border bg-muted/30",
            )}
          >
            <div className="relative flex items-center justify-center">
              {autoRefreshEnabled && (
                <span className="absolute inline-flex size-5 animate-ping rounded-full bg-primary opacity-10" />
              )}
              <RefreshCcw
                className={cn(
                  "size-3.5 text-muted-foreground transition-all",
                  (autoRefreshEnabled || isRefreshing) &&
                    "text-primary animate-spin",
                )}
                style={
                  autoRefreshEnabled || isRefreshing
                    ? { animationDuration: "3s" }
                    : {}
                }
              />
            </div>

            {autoRefreshEnabled ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    {REFRESH_INTERVALS.find(
                      (item) => item.value === autoRefreshInterval,
                    )?.label ?? "Auto"}
                    <ChevronDown className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {REFRESH_INTERVALS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleChangeInterval(option.value)}
                      className={cn(
                        "text-xs",
                        autoRefreshInterval === option.value &&
                          "font-medium text-primary",
                      )}
                    >
                      {option.label}
                      {autoRefreshInterval === option.value ? " ✓" : ""}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="text-xs text-muted-foreground">Manual</span>
            )}

            <Switch
              id="reporte-inventario-auto-refresh"
              size="sm"
              checked={autoRefreshEnabled}
              onCheckedChange={(value) => {
                handleToggleAutoRefresh(value);

                if (value) {
                  toast.success("Auto-refresh activado", {
                    id: REPORTE_INVENTARIO_AUTO_REFRESH_TOAST_ID,
                    duration: 1800,
                  });
                } else {
                  toast.info("Auto-refresh desactivado", {
                    id: REPORTE_INVENTARIO_AUTO_REFRESH_TOAST_ID,
                    duration: 1800,
                  });
                }
              }}
            />
            <Label
              htmlFor="reporte-inventario-auto-refresh"
              className="hidden cursor-pointer text-xs text-muted-foreground sm:block"
            >
              Auto
            </Label>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-lg">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Más opciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleManualRefresh}>
                <RefreshCcw className="size-4" />
                Actualizar lista
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <Download className="size-4" />
                Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={AlertTriangle}
          label="Total alertas"
          value={totalAlertas}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          index={0}
          isLoading={reporteLoading}
        />
        <StatCard
          icon={TrendingDown}
          label="Stock bajo"
          value={stockBajoCount}
          color="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
          index={1}
          isLoading={reporteLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Alertas pendientes"
          value={alertasPendientes}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
          index={2}
          isLoading={reporteLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Alertas resueltas"
          value={alertasResueltas}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
          index={3}
          isLoading={reporteLoading}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full shrink-0 sm:w-64 lg:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar producto o SKU…"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-9 w-full rounded-lg border-muted bg-muted/40 pl-9 pr-9 text-sm shadow-none transition-colors hover:bg-muted/80 focus-visible:border-ring focus-visible:ring-1"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                onClick={() => handleSearchChange("")}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Tabs
              value={tabValue}
              onValueChange={(value) => {
                setTabValue(value as typeof tabValue);
                setPage(1);
              }}
            >
              <TabsList className="h-9 gap-0.5 overflow-x-auto rounded-lg border border-border/60 bg-muted/60 p-0.5">
                <TabsTrigger
                  value="todos"
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Package className="size-3.5" />
                  Todos
                </TabsTrigger>
                <TabsTrigger
                  value="bajo"
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <TrendingDown className="size-3.5" />
                  Stock bajo
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Popover open={filtrosOpen} onOpenChange={handleFiltrosOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={filtrosOpen ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg text-xs"
                >
                  <Filter className="size-3.5" />
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFilterCount > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      filtrosOpen && "rotate-180",
                    )}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-70 rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">
                    Refina el stock visible por almacén
                  </p>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Almacén
                    </p>
                    <div className="grid gap-2">
                      {[
                        { value: undefined, label: "Todos los almacenes" },
                        ...almacenes.map((almacen) => ({
                          value: almacen.id,
                          label: almacen.nombre,
                        })),
                      ].map((option) => {
                        const isActive = draftAlmacenId === option.value;

                        return (
                          <button
                            key={option.value ?? "all"}
                            type="button"
                            className={cn(
                              "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                              isActive
                                ? "border-primary/40 bg-primary/5 text-foreground"
                                : "border-border/60 bg-background hover:bg-muted/40",
                            )}
                            onClick={() => setDraftAlmacenId(option.value)}
                          >
                            <span
                              className={cn(
                                "flex size-4 items-center justify-center rounded-full border transition-colors",
                                isActive
                                  ? "border-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              <span
                                className={cn(
                                  "size-2 rounded-full transition-colors",
                                  isActive ? "bg-primary" : "bg-transparent",
                                )}
                              />
                            </span>
                            <Warehouse className="size-3.5 shrink-0 text-muted-foreground" />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg text-xs text-muted-foreground"
                      onClick={clearFiltros}
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      onClick={applyFiltros}
                    >
                      Aplicar filtros
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant={selectionMode ? "secondary" : "outline"}
              size="sm"
              className="h-9 gap-1.5 rounded-lg text-xs"
              onClick={() => setSelectionMode((value) => !value)}
            >
              <CheckCircle2 className="size-3.5" />
              {selectionMode ? "Cancelar" : "Seleccionar"}
            </Button>
          </div>
        </div>
      </div>

      <ServerDataTable
        data={rows}
        columns={columns}
        isLoading={stockLoading}
        isError={stockIsError}
        errorMessage={
          stockError instanceof Error
            ? stockError.message
            : "No se pudo cargar el reporte de inventario."
        }
        onRetry={() => {
          void refetchAll();
        }}
        page={page}
        limit={limit}
        total={meta?.total ?? 0}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        enableRowSelection={selectionMode}
        enableColumnResizing
        enableColumnVisibility
        columnVisibilityStorageKey="erp:reportes:inventario:table-columns"
        bulkActionsBar={(selectedRows, clearSelection) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-xl text-xs"
              onClick={() => {
                const typedRows = selectedRows as StockListItem[];
                exportToCSV(typedRows, "reporte-inventario-seleccion.csv");
                toast.success(`${typedRows.length} registros exportados`);
                clearSelection();
              }}
            >
              <Download className="size-3.5" /> Exportar
            </Button>
          </div>
        )}
        emptyMessage="Sin registros de stock"
        emptyDescription={
          search || hasActiveFiltros || tabValue === "bajo"
            ? "Prueba ajustando la búsqueda o los filtros activos."
            : "No se encontraron registros de stock."
        }
      />
    </div>
  );
}
