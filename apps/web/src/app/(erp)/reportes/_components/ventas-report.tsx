"use client";

import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Download,
  FileText,
  Filter,
  LayoutGrid,
  MoreHorizontal,
  RefreshCcw,
  Search,
  ShoppingCart,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { EstadoVenta, type VentaListItem } from "@erp/shared";

import { cn } from "@/lib/utils";
import { useReporteVentas } from "@/hooks/use-configuracion";
import { useVentas } from "@/hooks/use-ventas";
import { useDebounce } from "@/hooks/use-debounce";

import { StatCard } from "@/components/layout/stat-card";
import { RealtimeStatus } from "@/components/layout/realtime-status";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ── Label maps ─────────────────────────────────────── */

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  COTIZACION: {
    label: "Cotización",
    color:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300",
  },
  ORDEN_CONFIRMADA: {
    label: "Confirmada",
    color:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300",
  },
  FACTURADA: {
    label: "Facturada",
    color:
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300",
  },
  ENTREGADA: {
    label: "Entregada",
    color:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300",
  },
  CANCELADA: {
    label: "Cancelada",
    color:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300",
  },
};

/* ── Helpers ────────────────────────────────────────── */

function formatCurrency(amount: number) {
  return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getClienteName(cliente: VentaListItem["cliente"]) {
  if (cliente.razonSocial) return cliente.razonSocial;
  return [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") || "—";
}

function exportToCSV(rows: VentaListItem[], filename: string) {
  const header = [
    "Número",
    "Cliente",
    "Estado",
    "Subtotal",
    "Descuento",
    "IGV",
    "Total",
  ];
  const lines = rows.map((row) =>
    [
      row.numero,
      `"${getClienteName(row.cliente)}"`,
      ESTADO_LABELS[row.estado]?.label ?? row.estado,
      row.subtotal,
      row.descuento,
      row.igv,
      row.total,
    ].join(","),
  );

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

/* ── Constants ──────────────────────────────────────── */

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];


/* ── Page ───────────────────────────────────────────── */

export default function ReporteVentasTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [filtrosOpen, setFiltrosOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Aggregate report for stat cards
  const {
    data: reporteData,
    isLoading: reporteLoading,
    isFetching: reporteFetching,
    refetch: refetchReporte,
  } = useReporteVentas({});

  const ventaFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      estado:
        estadoFilter !== "all" ? (estadoFilter as EstadoVenta) : undefined,
    }),
    [page, limit, debouncedSearch, estadoFilter],
  );

  const {
    data: ventasData,
    isLoading,
    isError,
    isFetching: ventasFetching,
    refetch,
  } = useVentas(ventaFilters);

  const reporte = reporteData?.data;
  const rows = useMemo(() => ventasData?.data ?? [], [ventasData?.data]);

  const countByEstado = useMemo(() => {
    const map: Record<string, number> = {};
    reporte?.porEstado.forEach((e) => {
      map[e.estado] = e.cantidad;
    });
    return map;
  }, [reporte]);

  const refetchAll = useCallback(async () => {
    await Promise.all([refetch(), refetchReporte()]);
  }, [refetch, refetchReporte]);



  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const handleEstadoChange = (value: string) => {
    setEstadoFilter(value);
    setPage(1);
  };
  const handleLimitChange = (l: number) => {
    setLimit(l);
    setPage(1);
  };
  const handleExportCSV = useCallback(() => {
    if (rows.length === 0) {
      toast.info("No hay ventas para exportar", { duration: 1600 });
      return;
    }

    exportToCSV(
      rows,
      `reporte-ventas-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success("CSV exportado", { duration: 1600 });
  }, [rows]);

  const activeFilterCount = estadoFilter === EstadoVenta.CANCELADA ? 1 : 0;
  const isRefreshing = reporteFetching || ventasFetching;

  /* ── Columns ──────────────────────────────────────── */

  const columns = useMemo<ColumnDef<VentaListItem>[]>(
    () => [
      {
        accessorKey: "numero",
        header: "N°",
        size: 110,
        enableResizing: true,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium whitespace-nowrap">
            {row.original.numero}
          </span>
        ),
      },
      {
        accessorKey: "cliente",
        header: "Cliente",
        size: 220,
        enableResizing: true,
        cell: ({ row }) => {
          const nombre = getClienteName(row.original.cliente);
          return (
            <span className="text-sm truncate max-w-50 block" title={nombre}>
              {nombre}
            </span>
          );
        },
      },
      {
        accessorKey: "estado",
        header: "Estado",
        size: 130,
        enableResizing: true,
        cell: ({ row }) => {
          const meta = ESTADO_LABELS[row.original.estado];
          return (
            <Badge
              variant="outline"
              className={cn("whitespace-nowrap text-xs", meta?.color)}
            >
              {meta?.label ?? row.original.estado}
            </Badge>
          );
        },
      },
      {
        accessorKey: "subtotal",
        header: "Subtotal",
        size: 120,
        enableResizing: true,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums whitespace-nowrap">
            {formatCurrency(row.original.subtotal)}
          </span>
        ),
      },
      {
        accessorKey: "descuento",
        header: "Descuento",
        size: 110,
        enableResizing: true,
        meta: { defaultHidden: true },
        cell: ({ row }) => (
          <span className="text-sm tabular-nums whitespace-nowrap text-muted-foreground">
            {formatCurrency(row.original.descuento)}
          </span>
        ),
      },
      {
        accessorKey: "igv",
        header: "IGV",
        size: 100,
        enableResizing: true,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums whitespace-nowrap text-muted-foreground">
            {formatCurrency(row.original.igv)}
          </span>
        ),
      },
      {
        accessorKey: "total",
        header: "Total",
        size: 120,
        enableResizing: true,
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
            {formatCurrency(row.original.total)}
          </span>
        ),
      },
    ],
    [],
  );

  /* ── Render ───────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-5 w-full min-w-0 flex-1 min-h-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sr-only text-2xl font-semibold tracking-tight text-foreground">
            Reporte de ventas
          </h1>
          <p className="text-sm text-muted-foreground">
            Resumen comercial y evolución de ventas
          </p>
        </div>

        <div className="ml-auto flex max-w-full items-center gap-2 shrink-0 flex-wrap justify-end">
          <RealtimeStatus />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-lg">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Más opciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => void refetchAll()}>
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total ventas"
          value={reporte?.resumen.totalVentas}
          icon={ShoppingCart}
          color="bg-primary/10 text-primary"
          index={0}
          isLoading={reporteLoading}
        />
        <StatCard
          label="Cotizaciones"
          value={countByEstado[EstadoVenta.COTIZACION]}
          icon={FileText}
          color="bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400"
          index={1}
          isLoading={reporteLoading}
        />
        <StatCard
          label="Confirmadas"
          value={countByEstado[EstadoVenta.ORDEN_CONFIRMADA]}
          icon={LayoutGrid}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          index={2}
          isLoading={reporteLoading}
        />
        <StatCard
          label="Canceladas"
          value={countByEstado[EstadoVenta.CANCELADA]}
          icon={DollarSign}
          color="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
          index={3}
          isLoading={reporteLoading}
        />
        <StatCard
          label="Entregadas"
          value={countByEstado[EstadoVenta.ENTREGADA]}
          icon={Truck}
          color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          index={4}
          isLoading={reporteLoading}
        />
        <StatCard
          label="Canceladas"
          value={countByEstado[EstadoVenta.CANCELADA]}
          icon={XCircle}
          color="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
          index={5}
          isLoading={reporteLoading}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-64 lg:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por número, cliente…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 w-full rounded-lg border-muted bg-muted/40 pl-9 pr-9 text-sm shadow-none transition-colors hover:bg-muted/80 focus-visible:border-ring focus-visible:ring-1"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
              onClick={() => handleSearchChange("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Tabs + Filtros */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
          {/* Estado tabs */}
          <Tabs value={estadoFilter} onValueChange={handleEstadoChange}>
            <TabsList className="h-9 gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/60 overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="all"
                className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
              >
                <ShoppingCart className="size-3.5" />
                <span className="hidden sm:inline">Todos</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoVenta.COTIZACION}
                className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
              >
                <FileText className="size-3.5" />
                <span className="hidden sm:inline">Cotización</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoVenta.ORDEN_CONFIRMADA}
                className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Confirmada</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoVenta.ENTREGADA}
                className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
              >
                <Truck className="size-3.5" />
                <span className="hidden sm:inline">Entregada</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoVenta.CANCELADA}
                className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
              >
                <XCircle className="size-3.5" />
                <span className="hidden sm:inline">Cancelada</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtros popover */}
          <Popover open={filtrosOpen} onOpenChange={setFiltrosOpen}>
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
              sideOffset={8}
              className="w-60 rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
            >
              <div className="border-b border-border/60 px-3 py-2.5">
                <p className="text-xs font-semibold">Filtros</p>
                <p className="text-[11px] text-muted-foreground">
                  Opciones adicionales
                </p>
              </div>
              <div className="px-3 py-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Estado
                </p>
                <div className="grid gap-1">
                  {[
                    { value: EstadoVenta.CANCELADA, label: "Solo canceladas" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                        estadoFilter === opt.value
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "border-border/60 bg-background hover:bg-muted/40",
                      )}
                      onClick={() => {
                        handleEstadoChange(
                          estadoFilter === opt.value ? "all" : opt.value,
                        );
                        setFiltrosOpen(false);
                      }}
                    >
                      <span
                        className={cn(
                          "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                          estadoFilter === opt.value
                            ? "border-primary"
                            : "border-muted-foreground/40",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full transition-colors",
                            estadoFilter === opt.value
                              ? "bg-primary"
                              : "bg-transparent",
                          )}
                        />
                      </span>
                      {opt.label}
                    </button>
                  ))}
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

      {/* DataTable */}
      <ServerDataTable
        columns={columns}
        data={rows}
        total={ventasData?.meta?.total ?? 0}
        page={page}
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        errorMessage="No se pudo cargar la lista de ventas."
        onRetry={() => void refetchAll()}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        enableRowSelection={selectionMode}
        enableColumnVisibility
        enableColumnResizing
        columnVisibilityStorageKey="erp:reportes:ventas:table-columns"
        bulkActionsBar={(selectedRows, clearSelection) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-xl text-xs"
              onClick={() => {
                const typedRows = selectedRows as VentaListItem[];
                exportToCSV(typedRows, "reporte-ventas-seleccion.csv");
                toast.success(`${typedRows.length} ventas exportadas`);
                clearSelection();
              }}
            >
              <Download className="size-3.5" /> Exportar
            </Button>
          </div>
        )}
        emptyMessage="Sin ventas"
        emptyDescription={
          search || estadoFilter !== "all"
            ? "No hay ventas registradas para los filtros aplicados."
            : "Todavía no hay ventas registradas."
        }
      />
    </div>
  );
}
