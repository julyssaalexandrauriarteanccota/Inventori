"use client";

import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Clock,
  Download,
  Eye,
  Headphones,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  EstadoTicket,
  PrioridadTicket,
  TipoServicio,
  type TicketListItem,
  type TicketFormPayload,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import {
  readStoredSoporteAutoRefreshPreference,
  writeStoredSoporteAutoRefreshPreference,
} from "@/lib/soporte-auto-refresh";
import { useAuth } from "@/hooks/use-auth";
import { useStoredAutoRefresh } from "@/hooks/use-stored-auto-refresh";
import {
  useTickets,
  useDeleteTicket,
  useCreateTicket,
  useUpdateTicket,
} from "@/hooks/use-soporte";
import { AutoRefreshControl } from "@/components/layout/auto-refresh-control";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { TicketDetalleModal } from "@/components/modals/ticket-detalle-modal";
import { useDebounce } from "@/hooks/use-debounce";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketForm } from "@/components/forms/ticket-form";

/* ── Label maps ─────────────────────────────────────── */

const ESTADO_LABELS: Record<EstadoTicket, string> = {
  [EstadoTicket.ABIERTO]: "Abierto",
  [EstadoTicket.EN_PROCESO]: "En proceso",
  [EstadoTicket.EN_ESPERA]: "En espera",
  [EstadoTicket.CERRADO]: "Cerrado",
  [EstadoTicket.CANCELADO]: "Cancelado",
};

const PRIORIDAD_LABELS: Record<PrioridadTicket, string> = {
  [PrioridadTicket.BAJA]: "Baja",
  [PrioridadTicket.MEDIA]: "Media",
  [PrioridadTicket.ALTA]: "Alta",
  [PrioridadTicket.CRITICA]: "Crítica",
};

const TIPO_LABELS: Record<TipoServicio, string> = {
  [TipoServicio.TALLER]: "Taller",
  [TipoServicio.VISITA]: "Visita",
  [TipoServicio.REMOTO]: "Remoto",
};

/* ── Helpers ────────────────────────────────────────── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function hasNuevoParam() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("nuevo") === "1";
}

/* ── Constants ──────────────────────────────────────── */

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const REFRESH_INTERVALS = [
  { label: "30 seg", value: 30_000 },
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
];

const SOPORTE_REFRESH_TOAST_ID = "soporte-refresh";
const SOPORTE_AUTO_REFRESH_TOAST_ID = "soporte-auto-refresh";

/* ── Page ───────────────────────────────────────────── */

export default function SoportePage() {
  const { hasRole, user } = useAuth();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [prioridadFilter, setPrioridadFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 300);

  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [draftPrioridad, setDraftPrioridad] = useState<string>("all");
  const [draftTipo, setDraftTipo] = useState<string>("all");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(() => hasNuevoParam());
  const [editTicket, setEditTicket] = useState<TicketListItem | null>(null);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);

  const filters = useMemo(
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
    }),
    [page, limit, debouncedSearch, estadoFilter, prioridadFilter, tipoFilter],
  );

  const { data, isLoading, isError, refetch } = useTickets(filters);

  const { data: totalData } = useTickets({ limit: 1 });
  const { data: abiertosData } = useTickets({
    limit: 1,
    estado: EstadoTicket.ABIERTO,
  });
  const { data: enProcesoData } = useTickets({
    limit: 1,
    estado: EstadoTicket.EN_PROCESO,
  });
  const { data: criticosData } = useTickets({
    limit: 1,
    prioridad: PrioridadTicket.CRITICA,
  });

  const deleteMutation = useDeleteTicket();
  const createMutation = useCreateTicket();
  const updateMutation = useUpdateTicket(editTicket?.id ?? "");

  const canDelete = hasRole(RolUsuario.ADMIN);
  const canEdit = hasRole(
    RolUsuario.ADMIN,
    RolUsuario.ENCARGADO,
    RolUsuario.TECNICO,
  );

  const showRefreshToast = useCallback(() => {
    toast.info("Lista actualizada", {
      id: SOPORTE_REFRESH_TOAST_ID,
      duration: 1600,
    });
  }, []);

  const handleManualRefresh = useCallback(() => {
    void refetch();
    showRefreshToast();
  }, [refetch, showRefreshToast]);

  const handleAutoRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const {
    enabled: autoRefresh,
    interval: refreshInterval,
    setEnabled: setAutoRefresh,
    setInterval: setRefreshInterval,
  } = useStoredAutoRefresh({
    readPreference: readStoredSoporteAutoRefreshPreference,
    writePreference: writeStoredSoporteAutoRefreshPreference,
    onRefresh: handleAutoRefresh,
  });

  const showAutoRefreshToast = useCallback(
    (enabled: boolean) => {
      const label =
        REFRESH_INTERVALS.find((r) => r.value === refreshInterval)?.label ??
        "intervalo actual";
      const message = enabled
        ? `Auto-refresh activado cada ${label}`
        : "Auto-refresh desactivado";
      if (enabled) {
        toast.success(message, {
          id: SOPORTE_AUTO_REFRESH_TOAST_ID,
          duration: 1800,
        });
      } else {
        toast.info(message, {
          id: SOPORTE_AUTO_REFRESH_TOAST_ID,
          duration: 1800,
        });
      }
    },
    [refreshInterval],
  );

  const handleCreate = useCallback(
    (payload: TicketFormPayload) => {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Ticket creado correctamente");
          setOpenCreate(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al crear el ticket");
        },
      });
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (payload: TicketFormPayload) => {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Ticket actualizado correctamente");
          setEditTicket(null);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al actualizar el ticket");
        },
      });
    },
    [updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Ticket eliminado correctamente");
        setDeleteId(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || "Error al eliminar el ticket");
      },
    });
  }, [deleteId, deleteMutation]);

  const handleExportCSV = useCallback(() => {
    const rows = data?.data ?? [];
    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "Código",
      "Estado",
      "Prioridad",
      "Tipo de servicio",
      "Cliente",
      "Título",
      "Técnico",
      "Fecha",
    ];
    const lines = rows.map((ticket) =>
      [
        ticket.codigo,
        ESTADO_LABELS[ticket.estado],
        PRIORIDAD_LABELS[ticket.prioridad],
        TIPO_LABELS[ticket.tipoServicio],
        ticket.cliente?.nombre ?? "",
        ticket.titulo,
        ticket.tecnico?.nombre ?? "Sin asignar",
        ticket.createdAt ? formatDate(ticket.createdAt) : "",
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Tickets exportados correctamente");
  }, [data]);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const handleEstadoChange = useCallback((value: string) => {
    setEstadoFilter(value);
    setPage(1);
  }, []);

  const openFiltrosPopover = useCallback(
    (open: boolean) => {
      setFiltrosOpen(open);
      if (open) {
        setDraftPrioridad(prioridadFilter);
        setDraftTipo(tipoFilter);
      }
    },
    [prioridadFilter, tipoFilter],
  );

  const applyFiltros = useCallback(() => {
    setPrioridadFilter(draftPrioridad);
    setTipoFilter(draftTipo);
    setPage(1);
    setFiltrosOpen(false);
  }, [draftPrioridad, draftTipo]);

  const clearFiltros = useCallback(() => {
    setDraftPrioridad("all");
    setDraftTipo("all");
    setPrioridadFilter("all");
    setTipoFilter("all");
    setPage(1);
    setFiltrosOpen(false);
  }, []);

  const activeFilterCount =
    (estadoFilter !== "all" ? 1 : 0) +
    (prioridadFilter !== "all" ? 1 : 0) +
    (tipoFilter !== "all" ? 1 : 0);

  /* ── Columns ──────────────────────────────────────── */

  const columns = useMemo<ColumnDef<TicketListItem>[]>(
    () => [
      {
        accessorKey: "codigo",
        header: "Código",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium whitespace-nowrap">
            {row.original.codigo}
          </span>
        ),
      },
      {
        accessorKey: "cliente",
        header: "Cliente",
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
        cell: ({ row }) => {
          const text = row.original.titulo;
          return (
            <span className="block max-w-50 truncate text-sm" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const e = row.original.estado;
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="relative flex size-2 shrink-0">
                {e === EstadoTicket.ABIERTO && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
                )}
                <span
                  className={cn("relative inline-flex size-2 rounded-full", {
                    "bg-blue-500": e === EstadoTicket.ABIERTO,
                    "bg-yellow-500": e === EstadoTicket.EN_PROCESO,
                    "bg-orange-500": e === EstadoTicket.EN_ESPERA,
                    "bg-green-500": e === EstadoTicket.CERRADO,
                    "bg-red-500": e === EstadoTicket.CANCELADO,
                  })}
                />
              </span>
              <Badge
                variant="outline"
                className={cn("whitespace-nowrap text-xs gap-1.5", {
                  "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300":
                    e === EstadoTicket.ABIERTO,
                  "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300":
                    e === EstadoTicket.EN_PROCESO,
                  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300":
                    e === EstadoTicket.EN_ESPERA,
                  "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300":
                    e === EstadoTicket.CERRADO,
                  "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300":
                    e === EstadoTicket.CANCELADO,
                })}
              >
                {ESTADO_LABELS[e]}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "prioridad",
        header: "Prioridad",
        cell: ({ row }) => {
          const p = row.original.prioridad;
          return (
            <Badge
              variant="outline"
              className={cn("whitespace-nowrap text-xs", {
                "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300":
                  p === PrioridadTicket.BAJA,
                "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300":
                  p === PrioridadTicket.MEDIA,
                "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300":
                  p === PrioridadTicket.ALTA,
                "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300":
                  p === PrioridadTicket.CRITICA,
              })}
            >
              {PRIORIDAD_LABELS[p]}
            </Badge>
          );
        },
      },
      {
        accessorKey: "tipoServicio",
        header: "Tipo",
        cell: ({ row }) => (
          <Badge variant="secondary" className="whitespace-nowrap text-xs">
            {TIPO_LABELS[row.original.tipoServicio]}
          </Badge>
        ),
      },
      {
        accessorKey: "tecnico",
        header: "Técnico",
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
        cell: ({ row }) => {
          const fecha = row.original.createdAt;
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {fecha ? formatDate(fecha) : "—"}
            </span>
          );
        },
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
              onClick={() => setViewDetailId(row.original.id)}
            >
              <Eye className="size-3.5" />
              Ver
            </Button>
            {(canEdit || canDelete) && (
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
                    {canEdit && (
                      <DropdownMenuItem
                        onClick={() => setEditTicket(row.original)}
                      >
                        <Pencil className="size-4" /> Editar
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteId(row.original.id)}
                      >
                        <Trash2 className="size-4" /> Eliminar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ),
      },
    ],
    [canDelete, canEdit],
  );

  return (
    <div className="flex flex-col gap-5 w-full min-w-0 flex-1 min-h-0">
      <PageHeader
        title="Soporte"
        description="Gestión de tickets de soporte técnico"
        hideTitleVisually
        actions={
          <>
            <AutoRefreshControl
              enabled={autoRefresh}
              interval={refreshInterval}
              intervals={REFRESH_INTERVALS}
              switchId="soporte-auto-refresh"
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
              ]}
            />
            <Button
              onClick={() => setOpenCreate(true)}
              className="erp-page-primary-cta rounded-xl"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nuevo ticket</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total tickets"
          value={totalData?.meta?.total}
          icon={Headphones}
          index={0}
        />
        <StatCard
          label="Abiertos"
          value={abiertosData?.meta?.total}
          icon={MessageSquare}
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          index={1}
        />
        <StatCard
          label="En proceso"
          value={enProcesoData?.meta?.total}
          icon={Clock}
          color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          index={2}
        />
        <StatCard
          label="Críticos"
          value={criticosData?.meta?.total}
          icon={AlertTriangle}
          color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          index={3}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por código, título, cliente…"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {/* Estado tabs */}
            <Tabs value={estadoFilter} onValueChange={handleEstadoChange}>
              <TabsList className="h-9 max-w-[calc(100vw-2rem)] gap-0.5 overflow-x-auto rounded-lg border border-border/60 bg-muted/60 p-0.5 flex-nowrap sm:max-w-none">
                <TabsTrigger
                  value="all"
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Headphones className="size-3.5" />
                  <span className="hidden sm:inline">Todos</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.ABIERTO}
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <MessageSquare className="size-3.5" />
                  <span className="hidden sm:inline">Abierto</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.EN_PROCESO}
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Clock className="size-3.5" />
                  <span className="hidden sm:inline">En proceso</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.EN_ESPERA}
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <span className="hidden sm:inline">En espera</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.CERRADO}
                  className="h-8 shrink-0 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Cerrado
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.CANCELADO}
                  className="h-8 shrink-0 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Cancelado
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtros popover */}
            <Popover open={filtrosOpen} onOpenChange={openFiltrosPopover}>
              <PopoverTrigger asChild>
                <ToolbarFiltersButton
                  open={filtrosOpen}
                  activeCount={activeFilterCount}
                />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-70 rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">
                    Refina la lista visible
                  </p>
                </div>
                <div className="space-y-4 px-4 py-4">
                  {/* Prioridad */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Prioridad
                    </p>
                    <div className="grid gap-2">
                      {[
                        { value: "all", label: "Todas" },
                        ...Object.values(PrioridadTicket).map((v) => ({
                          value: v,
                          label: PRIORIDAD_LABELS[v],
                        })),
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            draftPrioridad === opt.value
                              ? "border-primary/40 bg-primary/5 text-foreground"
                              : "border-border/60 bg-background hover:bg-muted/40",
                          )}
                          onClick={() => setDraftPrioridad(opt.value)}
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border transition-colors",
                              draftPrioridad === opt.value
                                ? "border-primary"
                                : "border-muted-foreground/40",
                            )}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full transition-colors",
                                draftPrioridad === opt.value
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
                  {/* Tipo servicio */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Tipo de servicio
                    </p>
                    <div className="grid gap-2">
                      {[
                        { value: "all", label: "Todos" },
                        ...Object.values(TipoServicio).map((v) => ({
                          value: v,
                          label: TIPO_LABELS[v],
                        })),
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            draftTipo === opt.value
                              ? "border-primary/40 bg-primary/5 text-foreground"
                              : "border-border/60 bg-background hover:bg-muted/40",
                          )}
                          onClick={() => setDraftTipo(opt.value)}
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border transition-colors",
                              draftTipo === opt.value
                                ? "border-primary"
                                : "border-muted-foreground/40",
                            )}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full transition-colors",
                                draftTipo === opt.value
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
        errorMessage="No se pudo cargar la lista de tickets."
        onRetry={() => void refetch()}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        enableColumnVisibility
        columnVisibilityStorageKey="erp:soporte:table-columns"
      />

      {/* AlertDialog: Eliminar */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => (!o ? setDeleteId(null) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(null)}
            className="absolute right-4 top-4 size-6 text-muted-foreground hover:bg-muted mt-0 border-0 z-10"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar ticket?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El ticket será eliminado del
                sistema.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Crear ticket */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <Plus className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Nuevo ticket
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Registra un nuevo caso de soporte técnico.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            <TicketForm
              mode="create"
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
              userRol={user?.rol}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar ticket */}
      <Dialog
        open={!!editTicket}
        onOpenChange={(open) => !open && setEditTicket(null)}
      >
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
                <Pencil className="size-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Editar ticket
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Modifica los datos del ticket de soporte.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            {editTicket && (
              <TicketForm
                mode="edit"
                onSubmit={handleUpdate}
                isLoading={updateMutation.isPending}
                defaultValues={{
                  titulo: editTicket.titulo,
                  prioridad: editTicket.prioridad,
                  tipoServicio: editTicket.tipoServicio,
                }}
                userRol={user?.rol}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TicketDetalleModal
        id={viewDetailId}
        onClose={() => setViewDetailId(null)}
        onEdit={(t) => {
          setViewDetailId(null);
          setEditTicket(t as unknown as TicketListItem);
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
