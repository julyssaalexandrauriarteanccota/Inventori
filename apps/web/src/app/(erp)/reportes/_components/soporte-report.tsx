"use client";

import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Filter,
  HeadsetIcon,
  MessageSquare,
  MoreHorizontal,
  PauseCircle,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  EstadoTicket,
  PrioridadTicket,
  TipoServicio,
  type TicketListItem,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { useReporteTickets } from "@/hooks/use-configuracion";
import { useTickets } from "@/hooks/use-soporte";
import { useDebounce } from "@/hooks/use-debounce";
import { usePageAutoRefresh } from "@/hooks/use-page-auto-refresh";
import { PageAutoRefreshControl } from "@/components/layout/page-auto-refresh-control";
import { StatCard } from "@/components/layout/stat-card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ── Label maps ─────────────────────────────────────── */

const ESTADO_LABELS: Record<string, string> = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En proceso",
  EN_ESPERA: "En espera",
  CERRADO: "Cerrado",
  CANCELADO: "Cancelado",
};

const PRIORIDAD_LABELS: Record<string, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

const TIPO_LABELS: Record<string, string> = {
  TALLER: "Taller",
  VISITA: "Visita",
  REMOTO: "Remoto",
};

/* ── Helpers ────────────────────────────────────────── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getEstadoClasses(estado: string) {
  switch (estado) {
    case "ABIERTO":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300";
    case "EN_PROCESO":
      return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300";
    case "EN_ESPERA":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300";
    case "CERRADO":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300";
    case "CANCELADO":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getEstadoDot(estado: string) {
  switch (estado) {
    case "ABIERTO":
      return "bg-blue-500";
    case "EN_PROCESO":
      return "bg-yellow-500";
    case "EN_ESPERA":
      return "bg-orange-500";
    case "CERRADO":
      return "bg-green-500";
    case "CANCELADO":
      return "bg-red-500";
    default:
      return "bg-slate-400";
  }
}

function getPrioridadClasses(prioridad: string) {
  switch (prioridad) {
    case "BAJA":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300";
    case "MEDIA":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300";
    case "ALTA":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300";
    case "CRITICA":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function exportToCSV(rows: TicketListItem[], filename: string) {
  const header = [
    "Código",
    "Cliente",
    "Título",
    "Estado",
    "Prioridad",
    "Tipo",
    "Técnico",
    "Fecha",
  ];
  const lines = rows.map((row) =>
    [
      row.codigo,
      `"${row.cliente?.nombre ?? "—"}"`,
      `"${row.titulo}"`,
      ESTADO_LABELS[row.estado] ?? row.estado,
      PRIORIDAD_LABELS[row.prioridad] ?? row.prioridad,
      TIPO_LABELS[row.tipoServicio] ?? row.tipoServicio,
      `"${row.tecnico?.nombre ?? "Sin asignar"}"`,
      row.createdAt ? formatDate(row.createdAt) : "—",
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
const REPORTE_SOPORTE_REFRESH_TOAST_ID = "reporte-soporte-refresh";

/* ── Page ───────────────────────────────────────────── */

export default function ReporteSoporteTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [prioridadFilter, setPrioridadFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [fechaDesde, setFechaDesde] = useState<string | undefined>();
  const [fechaHasta, setFechaHasta] = useState<string | undefined>();

  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [draftPrioridad, setDraftPrioridad] = useState<string>("all");
  const [draftTipo, setDraftTipo] = useState<string>("all");
  const [draftDesde, setDraftDesde] = useState<string>("");
  const [draftHasta, setDraftHasta] = useState<string>("");

  const debouncedSearch = useDebounce(search, 300);

  const reporteFilters = useMemo(
    () => ({
      fechaDesde,
      fechaHasta,
    }),
    [fechaDesde, fechaHasta],
  );

  const {
    data: reporteData,
    isLoading: reporteLoading,
    isFetching: reporteFetching,
    refetch: refetchReporte,
  } = useReporteTickets(reporteFilters);

  const ticketFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      estado:
        estadoFilter !== "all" ? (estadoFilter as EstadoTicket) : undefined,
      prioridad:
        prioridadFilter !== "all"
          ? (prioridadFilter as PrioridadTicket)
          : undefined,
      tipoServicio:
        tipoFilter !== "all" ? (tipoFilter as TipoServicio) : undefined,
      fechaDesde,
      fechaHasta,
    }),
    [
      page,
      limit,
      debouncedSearch,
      estadoFilter,
      prioridadFilter,
      tipoFilter,
      fechaDesde,
      fechaHasta,
    ],
  );

  const {
    data: ticketsData,
    isLoading,
    isError,
    isFetching: ticketsFetching,
    refetch,
  } = useTickets(ticketFilters);

  const reporte = reporteData?.data;
  const rows = useMemo(() => ticketsData?.data ?? [], [ticketsData?.data]);

  // Derive counts from aggregate data (no extra API calls)
  const countByEstado = useMemo(() => {
    const map: Record<string, number> = {};
    reporte?.porEstado.forEach((e) => {
      map[e.estado] = e.cantidad;
    });
    return map;
  }, [reporte]);

  const countCriticos = useMemo(
    () =>
      reporte?.porPrioridad.find((p) => p.prioridad === "CRITICA")?.cantidad,
    [reporte],
  );

  const refetchAll = useCallback(async () => {
    await Promise.all([refetch(), refetchReporte()]);
  }, [refetch, refetchReporte]);

  const autoRefresh = usePageAutoRefresh({
    scope: "reporte-soporte",
    toastLabel: "Reporte de soporte",
    manualToastMessage: "Reporte actualizado",
    toastId: REPORTE_SOPORTE_REFRESH_TOAST_ID,
    onRefresh: refetchAll,
  });
  const handleManualRefresh = autoRefresh.manualRefresh;

  const activeFilterCount =
    (prioridadFilter !== "all" ? 1 : 0) +
    (tipoFilter !== "all" ? 1 : 0) +
    (fechaDesde ? 1 : 0) +
    (fechaHasta ? 1 : 0);

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
      toast.info("No hay tickets para exportar", { duration: 1600 });
      return;
    }

    exportToCSV(
      rows,
      `reporte-soporte-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success("CSV exportado", { duration: 1600 });
  }, [rows]);

  const openFiltrosPopover = (open: boolean) => {
    setFiltrosOpen(open);
    if (open) {
      setDraftPrioridad(prioridadFilter);
      setDraftTipo(tipoFilter);
      setDraftDesde(fechaDesde ?? "");
      setDraftHasta(fechaHasta ?? "");
    }
  };

  const applyFiltros = () => {
    if (draftDesde && draftHasta && draftDesde > draftHasta) {
      toast.error("La fecha inicial no puede ser mayor que la final", {
        duration: 1800,
      });
      return;
    }

    setPrioridadFilter(draftPrioridad);
    setTipoFilter(draftTipo);
    setFechaDesde(draftDesde || undefined);
    setFechaHasta(draftHasta || undefined);
    setPage(1);
    setFiltrosOpen(false);
  };

  const clearFiltros = () => {
    setDraftPrioridad("all");
    setDraftTipo("all");
    setDraftDesde("");
    setDraftHasta("");
    setPrioridadFilter("all");
    setTipoFilter("all");
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    setPage(1);
    setFiltrosOpen(false);
  };

  const isRefreshing = reporteFetching || ticketsFetching;

  /* ── Columns ──────────────────────────────────────── */

  const columns = useMemo<ColumnDef<TicketListItem>[]>(
    () => [
      {
        accessorKey: "codigo",
        header: "Código",
        size: 110,
        enableResizing: true,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium whitespace-nowrap">
            {row.original.codigo}
          </span>
        ),
      },
      {
        accessorKey: "cliente",
        header: "Cliente",
        size: 180,
        enableResizing: true,
        cell: ({ row }) => {
          const nombre = row.original.cliente?.nombre;
          return (
            <span
              className="text-sm truncate max-w-40 block"
              title={nombre ?? ""}
            >
              {nombre ?? <span className="text-muted-foreground/50">—</span>}
            </span>
          );
        },
      },
      {
        accessorKey: "titulo",
        header: "Título",
        size: 240,
        enableResizing: true,
        cell: ({ row }) => {
          const text = row.original.titulo;
          return (
            <span className="block max-w-55 truncate text-sm" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        accessorKey: "estado",
        header: "Estado",
        size: 150,
        enableResizing: true,
        cell: ({ row }) => {
          const e = row.original.estado;
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="relative flex size-2 shrink-0">
                {e === EstadoTicket.ABIERTO && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex size-2 rounded-full",
                    getEstadoDot(e),
                  )}
                />
              </span>
              <Badge
                variant="outline"
                className={cn("whitespace-nowrap text-xs", getEstadoClasses(e))}
              >
                {ESTADO_LABELS[e] ?? e}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "prioridad",
        header: "Prioridad",
        size: 110,
        enableResizing: true,
        cell: ({ row }) => {
          const p = row.original.prioridad;
          return (
            <Badge
              variant="outline"
              className={cn(
                "whitespace-nowrap text-xs",
                getPrioridadClasses(p),
              )}
            >
              {PRIORIDAD_LABELS[p] ?? p}
            </Badge>
          );
        },
      },
      {
        accessorKey: "tipoServicio",
        header: "Tipo",
        size: 100,
        enableResizing: true,
        cell: ({ row }) => (
          <Badge variant="secondary" className="whitespace-nowrap text-xs">
            {TIPO_LABELS[row.original.tipoServicio] ??
              row.original.tipoServicio}
          </Badge>
        ),
      },
      {
        accessorKey: "tecnico",
        header: "Técnico",
        size: 150,
        enableResizing: true,
        cell: ({ row }) => {
          const nombre = row.original.tecnico?.nombre;
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {nombre ?? <span className="italic opacity-60">Sin asignar</span>}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Fecha",
        size: 120,
        enableResizing: true,
        cell: ({ row }) => {
          const fecha = row.original.createdAt;
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {fecha ? formatDate(fecha) : "—"}
            </span>
          );
        },
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
            Reporte de soporte
          </h1>
          <p className="text-sm text-muted-foreground">
            Indicadores de tickets, cierres y carga técnica
          </p>
        </div>

        <div className="ml-auto flex max-w-full items-center gap-2 shrink-0 flex-wrap justify-end">
          <PageAutoRefreshControl
            autoRefresh={autoRefresh}
            isRefreshing={isRefreshing}
          />

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

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total"
          value={reporte?.total}
          icon={HeadsetIcon}
          color="bg-primary/10 text-primary"
          index={0}
          isLoading={reporteLoading}
        />
        <StatCard
          label="Abiertos"
          value={countByEstado[EstadoTicket.ABIERTO]}
          icon={MessageSquare}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          index={1}
          isLoading={reporteLoading}
        />
        <StatCard
          label="En proceso"
          value={countByEstado[EstadoTicket.EN_PROCESO]}
          icon={Clock}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          index={2}
          isLoading={reporteLoading}
        />
        <StatCard
          label="En espera"
          value={countByEstado[EstadoTicket.EN_ESPERA]}
          icon={PauseCircle}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
          index={3}
          isLoading={reporteLoading}
        />
        <StatCard
          label="Cerrados"
          value={countByEstado[EstadoTicket.CERRADO]}
          icon={CheckCircle2}
          color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          index={4}
          isLoading={reporteLoading}
        />
        <StatCard
          label="Críticos"
          value={countCriticos}
          icon={AlertTriangle}
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
            placeholder="Buscar por código, título, cliente…"
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
                <HeadsetIcon className="size-3.5" />
                <span className="hidden sm:inline">Todos</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoTicket.ABIERTO}
                className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
              >
                <MessageSquare className="size-3.5" />
                <span className="hidden sm:inline">Abierto</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoTicket.EN_PROCESO}
                className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
              >
                <Clock className="size-3.5" />
                <span className="hidden sm:inline">En proceso</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoTicket.EN_ESPERA}
                className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
              >
                <span className="hidden sm:inline">En espera</span>
                <span className="sm:hidden">Espera</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtros popover */}
          <Popover open={filtrosOpen} onOpenChange={openFiltrosPopover}>
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
              className="w-65 rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
            >
              <div className="border-b border-border/60 px-3 py-2.5">
                <p className="text-xs font-semibold">Filtros</p>
                <p className="text-[11px] text-muted-foreground">
                  Refina la lista visible
                </p>
              </div>

              <div className="space-y-3 px-3 py-3">
                {/* Rango de fechas */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Rango de fechas
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">
                        Desde
                      </Label>
                      <Input
                        type="date"
                        value={draftDesde}
                        onChange={(e) => setDraftDesde(e.target.value)}
                        className="h-7 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">
                        Hasta
                      </Label>
                      <Input
                        type="date"
                        value={draftHasta}
                        onChange={(e) => setDraftHasta(e.target.value)}
                        className="h-7 text-xs px-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Prioridad */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Prioridad
                  </p>
                  <div className="grid gap-1">
                    {[
                      { value: "all", label: "Todas" },
                      ...Object.values(PrioridadTicket).map((v) => ({
                        value: v,
                        label: PRIORIDAD_LABELS[v] ?? v,
                      })),
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                          draftPrioridad === opt.value
                            ? "border-primary/40 bg-primary/5 text-foreground"
                            : "border-border/60 bg-background hover:bg-muted/40",
                        )}
                        onClick={() => setDraftPrioridad(opt.value)}
                      >
                        <span
                          className={cn(
                            "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                            draftPrioridad === opt.value
                              ? "border-primary"
                              : "border-muted-foreground/40",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full transition-colors",
                              draftPrioridad === opt.value
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

                {/* Tipo de servicio */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Tipo de servicio
                  </p>
                  <div className="grid gap-1">
                    {[
                      { value: "all", label: "Todos" },
                      ...Object.values(TipoServicio).map((v) => ({
                        value: v,
                        label: TIPO_LABELS[v] ?? v,
                      })),
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                          draftTipo === opt.value
                            ? "border-primary/40 bg-primary/5 text-foreground"
                            : "border-border/60 bg-background hover:bg-muted/40",
                        )}
                        onClick={() => setDraftTipo(opt.value)}
                      >
                        <span
                          className={cn(
                            "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                            draftTipo === opt.value
                              ? "border-primary"
                              : "border-muted-foreground/40",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full transition-colors",
                              draftTipo === opt.value
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

                <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-md text-xs text-muted-foreground"
                    onClick={clearFiltros}
                  >
                    Limpiar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 rounded-md text-xs"
                    onClick={applyFiltros}
                  >
                    Aplicar
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

      {/* DataTable — fills remaining vertical space */}
      <ServerDataTable
        columns={columns}
        data={rows}
        total={ticketsData?.meta?.total ?? 0}
        page={page}
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        errorMessage="No se pudo cargar la lista de tickets."
        onRetry={() => void refetchAll()}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        enableRowSelection={selectionMode}
        enableColumnVisibility
        enableColumnResizing
        columnVisibilityStorageKey="erp:reportes:soporte:table-columns"
        bulkActionsBar={(selectedRows, clearSelection) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-xl text-xs"
              onClick={() => {
                const typedRows = selectedRows as TicketListItem[];
                exportToCSV(typedRows, "reporte-soporte-seleccion.csv");
                toast.success(`${typedRows.length} tickets exportados`);
                clearSelection();
              }}
            >
              <Download className="size-3.5" /> Exportar
            </Button>
          </div>
        )}
        emptyMessage="Sin tickets"
        emptyDescription={
          search || estadoFilter !== "all" || activeFilterCount > 0
            ? "No hay tickets registrados para los filtros aplicados."
            : "Todavía no hay tickets registrados."
        }
      />
    </div>
  );
}
