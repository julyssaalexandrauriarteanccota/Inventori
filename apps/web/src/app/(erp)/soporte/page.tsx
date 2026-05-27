"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Headphones,
  Home,
  Loader2,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  UserRound,
  Wrench,
  X,
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
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());

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

  const handleBulkDelete = useCallback(() => {
    if (!bulkDeleteIds.length) return;
    let done = 0;
    const totalToDestroy = bulkDeleteIds.length;
    bulkDeleteIds.forEach((id) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          done++;
          if (done === totalToDestroy) {
            toast.success(`${done} tickets eliminados correctamente`);
            setBulkDeleteIds([]);
            setSelectedTickets(new Set());
          }
        },
        onError: () => {
          toast.error("Error al eliminar ticket");
        },
      });
    });
  }, [bulkDeleteIds, deleteMutation]);

  const handleSelectionModeToggle = useCallback(() => {
    if (selectionMode) {
      setSelectedTickets(new Set());
    }
    setSelectionMode((prev) => !prev);
  }, [selectionMode]);

  const handleBulkExportCSV = useCallback((rows: TicketListItem[]) => {
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
        formatClienteNombre(ticket.cliente),
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
    anchor.download = `tickets-seleccionados-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} tickets exportados correctamente`);
  }, []);

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

// ── Highlighted Text helper ──────────────────────────────────────────────────

interface HighlightedTextProps {
  text: string;
  search: string;
}

function HighlightedText({ text, search }: HighlightedTextProps) {
  if (!search || !search.trim()) {
    return <>{text}</>;
  }

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
        ),
      )}
    </>
  );
}

  /* ── Columns ──────────────────────────────────────── */

  const columns = useMemo<ColumnDef<TicketListItem>[]>(
    () => [
      {
        accessorKey: "codigo",
        header: "Código",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold whitespace-nowrap text-muted-foreground">
            <HighlightedText text={row.original.codigo} search={search} />
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
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground truncate max-w-40"
              title={nombre ?? ""}
            >
              <UserRound className="size-3.5 shrink-0 text-muted-foreground/60" />
              <span className="truncate">
                {nombre ? (
                  <HighlightedText text={nombre} search={search} />
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </span>
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

          const badgeStyle = equipo
            ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20"
            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";

          return (
            <div className="flex max-w-44 flex-col gap-1.5">
              <span className="truncate font-mono text-xs font-semibold text-muted-foreground" title={label}>
                <HighlightedText text={label} search={search} />
              </span>
              <span className={cn("inline-flex items-center w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.01em] shadow-none", badgeStyle)}>
                {tipo}
              </span>
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
            <span className="block max-w-50 truncate text-sm font-semibold text-foreground" title={text}>
              <HighlightedText text={text} search={search} />
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
          const styles = {
            [PrioridadTicket.BAJA]: {
              bg: "bg-slate-500 shadow-slate-500/30",
              icon: Clock,
            },
            [PrioridadTicket.MEDIA]: {
              bg: "bg-sky-500 shadow-sky-500/30",
              icon: AlertCircle,
            },
            [PrioridadTicket.ALTA]: {
              bg: "bg-orange-500 shadow-orange-500/30",
              icon: AlertTriangle,
            },
            [PrioridadTicket.CRITICA]: {
              bg: "bg-red-500 shadow-red-500/30",
              icon: ShieldAlert,
            },
          }[p];

          const Icon = styles.icon;

          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-sm transition-all duration-200",
                styles.bg
              )}
            >
              <Icon className="size-3 shrink-0" />
              {PRIORIDAD_LABELS[p]}
            </span>
          );
        },
      },
      {
        accessorKey: "tipoServicio",
        header: "Tipo",
        cell: ({ row }) => {
          const t = row.original.tipoServicio;
          const styles = {
            [TipoServicio.TALLER]: {
              bg: "bg-indigo-500 shadow-indigo-500/30",
              icon: Wrench,
            },
            [TipoServicio.VISITA]: {
              bg: "bg-emerald-500 shadow-emerald-500/30",
              icon: Home,
            },
            [TipoServicio.REMOTO]: {
              bg: "bg-violet-500 shadow-violet-500/30",
              icon: Monitor,
            },
          }[t];

          const Icon = styles.icon;

          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-sm transition-all duration-200",
                styles.bg
              )}
            >
              <Icon className="size-3 shrink-0" />
              {TIPO_LABELS[t]}
            </span>
          );
        },
      },
      {
        accessorKey: "tecnico",
        header: "Técnico",
        cell: ({ row }) => {
          const nombre = row.original.tecnico?.nombre;
          return (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
              <UserRound className="size-3.5 shrink-0 text-muted-foreground/60" />
              <span>
                {nombre ? (
                  <HighlightedText text={nombre} search={search} />
                ) : (
                  <span className="italic opacity-60">Sin asignar</span>
                )}
              </span>
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
            <span className="text-sm text-muted-foreground whitespace-nowrap font-medium font-medium">
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
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Link href={`/soporte/${row.original.id}`}>
                  <Eye className="size-3.5" />
                  Ver
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
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
                      className="size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
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
      search,
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

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5 w-full min-w-0">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between w-full">
          {/* Search */}
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por código, título, cliente…"
            className="w-full lg:w-72 xl:w-80 shrink-0"
            inputClassName="border-border bg-background hover:border-indigo-400/60 dark:hover:border-indigo-500/60 focus-visible:border-indigo-500 dark:focus-visible:border-indigo-400 focus-visible:ring-indigo-400/25 dark:focus-visible:ring-indigo-500/25 shadow-sm"
          />

          {/* Controls: Tabs & Popover Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto justify-end shrink-0 min-w-0">
            {/* Estado tabs */}
            <Tabs
              value={estadoFilter}
              onValueChange={handleEstadoChange}
              className="w-full sm:w-auto min-w-0 shrink"
            >
              <TabsList className="flex w-full h-9 gap-0.5 rounded-lg border border-border/70 bg-muted/70 p-0.5 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap sm:w-auto shrink">
                <TabsTrigger
                  value="all"
                  className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <Headphones className="size-3.5" />
                  <span>Todos</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.ABIERTO}
                  className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 dark:data-[state=active]:bg-sky-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <MessageSquare className="size-3.5" />
                  <span>Abierto</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.EN_PROCESO}
                  className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <Clock className="size-3.5" />
                  <span>En proceso</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.EN_ESPERA}
                  className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-violet-500/30 dark:data-[state=active]:bg-violet-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <AlertCircle className="size-3.5" />
                  <span>En espera</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.CERRADO}
                  className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Cerrado</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoTicket.CANCELADO}
                  className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-slate-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <Ban className="size-3.5" />
                  <span>Cancelado</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtros popover */}
            <Popover open={filtrosOpen} onOpenChange={openFiltrosPopover}>
              <PopoverTrigger asChild>
                <ToolbarFiltersButton
                  open={filtrosOpen}
                  activeCount={activeFilterCount}
                  className="w-full sm:w-auto"
                />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-[calc(100vw-2rem)] sm:w-[480px] sm:max-w-md rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)] flex flex-col max-h-[min(calc(100vh-4rem),540px)]"
              >
                <div className="border-b border-border/60 px-4 py-3 shrink-0">
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">
                    Refina la lista visible
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 px-5 py-5 overflow-y-auto min-h-0 flex-1 scrollbar-thin">
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
                            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.01] active:scale-[0.97] active:duration-150",
                            draftPrioridad === opt.value
                              ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-foreground"
                              : "border-border/60 bg-background hover:bg-muted/40",
                          )}
                          onClick={() => setDraftPrioridad(opt.value)}
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border transition-colors",
                              draftPrioridad === opt.value
                                ? "border-[var(--accent)]"
                                : "border-muted-foreground/40",
                            )}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full transition-colors",
                                draftPrioridad === opt.value
                                  ? "bg-[var(--accent)]"
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
                            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.01] active:scale-[0.97] active:duration-150",
                            draftTipo === opt.value
                              ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-foreground"
                              : "border-border/60 bg-background hover:bg-muted/40",
                          )}
                          onClick={() => setDraftTipo(opt.value)}
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border transition-colors",
                              draftTipo === opt.value
                                ? "border-[var(--accent)]"
                                : "border-muted-foreground/40",
                            )}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full transition-colors",
                                draftTipo === opt.value
                                  ? "bg-[var(--accent)]"
                                  : "bg-transparent",
                              )}
                            />
                          </span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3 shrink-0 bg-background/50">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-xs text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted active:scale-95 active:duration-150"
                    onClick={clearFiltros}
                  >
                    Limpiar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                    onClick={applyFiltros}
                  >
                    Aplicar filtros
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {canDelete && (
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-9 w-9 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150",
                  selectionMode
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 dark:hover:bg-emerald-500/30"
                    : "border-border/80 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300",
                )}
                onClick={handleSelectionModeToggle}
              >
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {selectionMode ? "Cancelar" : "Seleccionar"}
                </span>
              </Button>
            )}
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
        enableRowSelection={canDelete && selectionMode}
        bulkActionsBar={
          canDelete
            ? (selectedRows, clearSelection) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                    title="Exportar"
                    onClick={() => {
                      const rows = selectedRows as TicketListItem[];
                      handleBulkExportCSV(rows);
                      clearSelection();
                    }}
                  >
                    <Download className="size-3.5" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 text-[var(--semantic-danger)] hover:text-[var(--semantic-danger)] hover:bg-[var(--semantic-danger-soft)] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                    title="Eliminar"
                    onClick={() => {
                      const ids = (selectedRows as TicketListItem[]).map((row) => row.id);
                      if (!ids.length) return;
                      setBulkDeleteIds(ids);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </Button>
                </div>
              )
            : undefined
        }
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

      {/* ── Bulk delete confirm ── */}
      <AlertDialog
        open={bulkDeleteIds.length > 0}
        onOpenChange={(o) => (!o ? setBulkDeleteIds([]) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-3xl border-l-4 border-l-red-500 p-6 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white shadow-sm shadow-red-500/30 dark:bg-red-600 dark:shadow-none">
              <Trash2 className="size-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl font-semibold inline-flex items-center gap-2 flex-wrap">
                ¿Eliminar
                <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5 shadow-sm shadow-red-500/30">
                  {bulkDeleteIds.length}
                </span>
                tickets?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p>
                    Se eliminarán{" "}
                    <span className="font-semibold text-foreground">
                      {bulkDeleteIds.length} tickets seleccionados
                    </span>
                    . Esta action no se puede deshacer.
                  </p>
                </div>
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel
              className="w-full sm:w-auto rounded-xl mt-0 border-border/80 hover:bg-muted transition-all duration-200 ease-out active:scale-95"
              onClick={() => setBulkDeleteIds([])}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="w-full sm:w-auto rounded-xl bg-red-500 text-white shadow-sm shadow-red-500/30 dark:bg-red-600 dark:shadow-none hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Eliminando…
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" /> Sí, eliminar {bulkDeleteIds.length}
                </>
              )}
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
