"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
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
  Ban,
  Trash2,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  EstadoTicket,
  PrioridadTicket,
  TipoServicio,
  type TicketListItem,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useTickets,
  useDeleteTicket,
  useUpdateTicketStatus,
} from "@/hooks/use-soporte";
import { useConfigEmpresa } from "@/hooks/use-configuracion";
import { generateTicketSoporteBlobUrl } from "@/lib/ticket-soporte-pdf";
import { api } from "@/lib/api";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { TicketStatusAction } from "@/components/soporte/ticket-status-action";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

function formatClienteNombre(cliente: TicketListItem["cliente"]) {
  if (!cliente) return "";
  return (
    cliente.razonSocial ||
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim() ||
    cliente.nombre ||
    ""
  );
}

/* ── Constants ──────────────────────────────────────── */

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];



/* ── Page ───────────────────────────────────────────── */

export default function SoportePage() {
  const isMobile = useIsMobile();
  const { hasRole } = useAuth();

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

  const { data: empresaRes } = useConfigEmpresa();
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTicket, setPreviewTicket] = useState<TicketListItem | null>(null);

  const handleRowPdfPreview = useCallback(
    async (ticketListItem: TicketListItem) => {
      try {
        setPdfLoadingId(ticketListItem.id);
        const res = await api.get<{
          data: any;
          meta: { timestamp: string };
        }>(`/soporte/tickets/${ticketListItem.id}`);
        
        const empresa = empresaRes?.data;
        const blobUrl = await generateTicketSoporteBlobUrl(res.data, empresa);
        setPreviewUrl(blobUrl);
        setPreviewTicket(ticketListItem);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "No se pudo generar la vista previa del PDF",
        );
      } finally {
        setPdfLoadingId(null);
      }
    },
    [empresaRes],
  );

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
  const statusMutation = useUpdateTicketStatus();

  const canDelete = hasRole(
    RolUsuario.ADMIN,
    RolUsuario.ENCARGADO,
    RolUsuario.TECNICO,
  );
  const canEdit = hasRole(
    RolUsuario.ADMIN,
    RolUsuario.ENCARGADO,
    RolUsuario.TECNICO,
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

  const handleCancelTicket = useCallback(
    (ticketId: string) => {
      statusMutation.mutate(
        { id: ticketId, estado: EstadoTicket.CANCELADO },
        {
          onSuccess: () => toast.success("Ticket cancelado correctamente"),
          onError: (err: Error) =>
            toast.error(err.message || "Error al cancelar el ticket"),
        },
      );
    },
    [statusMutation],
  );

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
          const nombre = formatClienteNombre(row.original.cliente);
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
        id: "equipo",
        header: "Equipo",
        cell: ({ row }) => {
          const equipo = row.original.equipo;
          const clienteEquipo = row.original.clienteEquipo;
          const label = equipo
            ? equipo.numeroSerie
            : clienteEquipo
              ? clienteEquipo.numeroSerie
              : null;
          const tipo = equipo ? "Entregado" : clienteEquipo ? "Externo" : null;

          if (!label) {
            return (
              <span className="text-sm text-muted-foreground/50">—</span>
            );
          }

          return (
            <div className="flex max-w-44 flex-col gap-1">
              <span className="truncate font-mono text-xs" title={label}>
                {label}
              </span>
              <Badge variant="outline" className="w-fit text-[10px]">
                {tipo}
              </Badge>
            </div>
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
          return (
            <TicketStatusAction
              ticketId={row.original.id}
              estado={row.original.estado}
              compact
            />
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
        cell: ({ row }) => {
          const canModifyRow =
            row.original.estado !== EstadoTicket.CERRADO &&
            row.original.estado !== EstadoTicket.CANCELADO;
          const canRemoveRow = canDelete;
          const hasRowActions = (canEdit && canModifyRow) || canRemoveRow;

          return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
            >
              <Link href={`/soporte/${row.original.id}`}>
                <Eye className="size-3.5" />
                Ver
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
              onClick={() => void handleRowPdfPreview(row.original)}
              disabled={pdfLoadingId === row.original.id}
              title="Vista previa PDF"
            >
              {pdfLoadingId === row.original.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileText className="size-3.5" />
              )}
              PDF
            </Button>
            {hasRowActions && (
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
                    {canEdit && canModifyRow && (
                      <DropdownMenuItem asChild>
                        <Link href={`/soporte/${row.original.id}/editar`}>
                          <Pencil className="size-4" /> Editar
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {canEdit && canModifyRow && (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={statusMutation.isPending}
                          onClick={() => handleCancelTicket(row.original.id)}
                        >
                          <Ban className="size-4" /> Anular
                        </DropdownMenuItem>
                      )}
                    {canRemoveRow && (
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
          );
        },
      },
    ],
    [
      canDelete,
      canEdit,
      handleCancelTicket,
      statusMutation.isPending,
      pdfLoadingId,
      handleRowPdfPreview,
    ],
  );

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative backing glows — coordinated with stat-card palette */}
      <div className="pointer-events-none absolute -z-10 bg-indigo-400/8 dark:bg-indigo-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-sky-400/6 dark:bg-sky-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-red-400/5 dark:bg-red-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />
      <TopbarActions>
        <RealtimeStatus />
        <Button asChild className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150">
          <Link href="/soporte/nuevo">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nuevo ticket</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        </Button>
      </TopbarActions>
      <h1 className="sr-only">Soporte</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total tickets"
          value={totalData?.meta?.total}
          icon={Headphones}
          theme="indigo"
          subtitle="Histórico"
        />
        <StatCard
          label="Abiertos"
          value={abiertosData?.meta?.total}
          icon={MessageSquare}
          theme="sky"
          subtitle="Sin atender"
        />
        <StatCard
          label="En proceso"
          value={enProcesoData?.meta?.total}
          icon={Clock}
          theme="amber"
          subtitle="En atención"
        />
        <StatCard
          label="Críticos"
          value={criticosData?.meta?.total}
          icon={AlertTriangle}
          theme="red"
          subtitle="Alta prioridad"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por código, título, cliente…"
            className="sm:w-72 lg:w-80"
            inputClassName="border-border bg-background hover:border-indigo-400/60 dark:hover:border-indigo-500/60 focus-visible:border-indigo-500 dark:focus-visible:border-indigo-400 focus-visible:ring-indigo-400/25 dark:focus-visible:ring-indigo-500/25 shadow-sm"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end w-full sm:w-auto">
            {/* Estado tabs */}
            <Tabs value={estadoFilter} onValueChange={handleEstadoChange} className="w-full sm:w-auto min-w-0">
              <TabsList className="scrollbar-none h-9 w-full justify-start gap-0.5 overflow-x-auto rounded-lg border border-border/70 bg-muted/70 p-0.5 flex flex-nowrap sm:w-auto">
                <TabsTrigger
                  value="all"
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground"
                >
                  <Headphones className="size-3.5" />
                  <span className="hidden sm:inline">Todos</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.ABIERTO}
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground"
                >
                  <MessageSquare className="size-3.5" />
                  <span className="hidden sm:inline">Abierto</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.EN_PROCESO}
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground"
                >
                  <Clock className="size-3.5" />
                  <span className="hidden sm:inline">En proceso</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.EN_ESPERA}
                  className="h-8 shrink-0 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-violet-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground"
                >
                  <span className="hidden sm:inline">En espera</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.CERRADO}
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground"
                >
                  Cerrado
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.CANCELADO}
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-slate-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground"
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
                className="w-[calc(100vw-2rem)] sm:w-70 max-w-xs rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
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
        fillAvailableHeight={!isMobile}
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
                Esta acción solo elimina el registro del ticket. No revierte
                repuestos ni movimientos de stock; para revertir la operación
                usa Anular.
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

      {/* Dialog: Vista previa PDF */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(o) => {
          if (!o) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setPreviewTicket(null);
          }
        }}
      >
        <DialogContent className="flex h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl rounded-2xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between w-full">
              <div className="min-w-0 text-left">
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  Vista Previa - Orden de Servicio
                </DialogTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {previewTicket ? `${previewTicket.codigo} — ${formatClienteNombre(previewTicket.cliente)}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-3 text-xs"
                onClick={() => {
                  if (previewUrl && previewTicket) {
                    const a = document.createElement("a");
                    a.href = previewUrl;
                    a.download = `ticket-${previewTicket.codigo}.pdf`;
                    a.click();
                  }
                }}
              >
                <Download className="size-3.5" />
                Descargar
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-zinc-900 dark:bg-zinc-950 p-0 flex items-center justify-center">
            {previewUrl ? (
              <iframe
                src={`${previewUrl}#view=FitH`}
                className="w-full h-full border-0"
                title="Vista previa del PDF de soporte"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm">Cargando visor...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
