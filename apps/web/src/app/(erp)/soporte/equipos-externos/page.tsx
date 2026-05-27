"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  FileText,
  LayoutGrid,
  List,
  MapPin,
  Monitor,
  Plus,
  RefreshCcw,
  Ticket,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  EstadoEquipo,
  type ClienteEquipoListItem,
  type ClienteEquipoTicketResumen,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useClienteEquipo,
  useClienteEquipos,
} from "@/hooks/use-equipos";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { EquipoQuickCreateModal } from "@/components/modals/equipo-quick-create-modal";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ESTADO_EQUIPO_LABELS: Record<EstadoEquipo, string> = {
  [EstadoEquipo.ACTIVO]: "Activo",
  [EstadoEquipo.EN_REPARACION]: "En reparación",
  [EstadoEquipo.BAJA]: "Baja",
};

function formatClienteNombre(cliente: ClienteEquipoListItem["cliente"]) {
  if (!cliente) return "—";
  return (
    cliente.razonSocial ||
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim() ||
    "—"
  );
}

function formatEquipoNombre(equipo: ClienteEquipoListItem) {
  return (
    equipo.producto?.nombre ||
    equipo.nombre ||
    [equipo.marca, equipo.modelo].filter(Boolean).join(" ") ||
    "Equipo externo"
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function estadoBadgeClass(estado: EstadoEquipo) {
  return cn("text-xs", {
    "border-[var(--semantic-success)]/30 bg-[var(--semantic-success-soft)] text-[var(--semantic-success)]":
      estado === EstadoEquipo.ACTIVO,
    "border-[var(--semantic-warning)]/30 bg-[var(--semantic-warning-soft)] text-[var(--semantic-warning)]":
      estado === EstadoEquipo.EN_REPARACION,
    "border-muted-foreground/30 bg-muted text-muted-foreground":
      estado === EstadoEquipo.BAJA,
  });
}

function EquipoDetalleDialog({
  equipoId,
  onClose,
}: {
  equipoId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useClienteEquipo(equipoId ?? undefined);
  const equipo = data?.data;
  const tickets = equipo?.tickets ?? [];

  return (
    <Dialog open={!!equipoId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[88vh] w-full flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border/60 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Monitor className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base sm:text-lg">
                {equipo ? formatEquipoNombre(equipo) : "Equipo externo"}
              </DialogTitle>
              <DialogDescription className="truncate text-xs">
                Historial técnico del equipo del cliente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          ) : isError || !equipo ? (
            <div className="rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
              No se pudo cargar este equipo externo.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <section className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Cliente
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">
                    {formatClienteNombre(equipo.cliente)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Serie / código
                  </p>
                  <p className="mt-1 truncate font-mono text-sm">
                    {equipo.numeroSerie}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Marca / modelo
                  </p>
                  <p className="mt-1 truncate text-sm">
                    {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Referencia
                  </p>
                  <p className="mt-1 truncate text-sm">
                    {equipo.ubicacion || "—"}
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-border/60 bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">Tickets del equipo</h3>
                    <p className="text-xs text-muted-foreground">
                      Casos asociados a este equipo externo.
                    </p>
                  </div>
                  <Button asChild size="sm" className="h-8 rounded-xl text-xs">
                    <Link
                      href={`/soporte/nuevo?clienteId=${equipo.clienteId}&clienteEquipoId=${equipo.id}`}
                    >
                      <Plus className="size-3.5" />
                      Nuevo ticket
                    </Link>
                  </Button>
                </div>

                {tickets.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {tickets.map((ticket: ClienteEquipoTicketResumen) => (
                      <Link
                        key={ticket.id}
                        href={`/soporte/${ticket.id}`}
                        className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                      >
                        <Ticket className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {ticket.codigo} · {ticket.titulo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ticket.tipoServicio} · {formatDate(ticket.createdAt)}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {ticket.estado}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                    Todavía no tiene tickets registrados.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

// ── Grid card ──────────────────────────────────────────────────────────────

interface EquipoCardProps {
  equipo: ClienteEquipoListItem;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
  onNewTicket: () => void;
  search?: string;
  animationDelay?: number;
}

function EquipoCard({
  equipo: eq,
  isSelected = false,
  onToggleSelect,
  onView,
  onNewTicket,
  search = "",
  animationDelay,
}: EquipoCardProps) {
  const accentBar = "from-sky-400 via-sky-500 to-sky-600";
  const avatarCls = "bg-sky-500 text-white shadow-sm shadow-sky-500/30 dark:shadow-sky-500/40";
  const title = formatEquipoNombre(eq);
  const marcaModelo = [eq.marca, eq.modelo].filter(Boolean).join(" · ") || "Sin marca/modelo";
  const initials = (eq.marca || "EQ").slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3.5 rounded-2xl border bg-card/85 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.97] active:duration-150 animate-fade-up overflow-hidden",
        isSelected
          ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-500/10 dark:border-emerald-500/50 shadow-md ring-2 ring-emerald-400/20 dark:ring-emerald-500/20"
          : "border-border/70 hover:border-sky-300 dark:hover:border-sky-500/40 hover:shadow-md hover:shadow-sky-500/5",
        onToggleSelect && "cursor-pointer",
      )}
      style={
        animationDelay !== undefined
          ? { animationDelay: `${animationDelay}ms` }
          : undefined
      }
      onClick={onToggleSelect}
    >
      {/* Tinted accent bar (left edge) */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b opacity-70 group-hover:opacity-100 transition-opacity",
          accentBar,
        )}
      />

      {/* Checkbox top-left */}
      {onToggleSelect && (
        <div
          className={cn(
            "absolute left-3 top-3 z-10 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect()}
            className="size-4 shadow-sm"
          />
        </div>
      )}

      {/* Header avatar + name */}
      <div
        className={cn(
          "flex items-center gap-3 relative",
          onToggleSelect ? "pl-6 pr-2" : "pl-2 pr-2",
        )}
      >
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm",
            avatarCls,
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="break-words whitespace-normal font-semibold text-sm leading-snug"
            title={title}
          >
            <HighlightedText text={title} search={search} />
          </p>
          <p className="truncate text-xs text-muted-foreground mt-0.5 font-mono">
            <HighlightedText text={marcaModelo} search={search} />
          </p>
        </div>
      </div>

      {/* State Badge */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="outline"
          className={cn("shadow-none py-0.5", estadoBadgeClass(eq.estado))}
        >
          {ESTADO_EQUIPO_LABELS[eq.estado]}
        </Badge>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t border-border/40 pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <User className="size-3.5 shrink-0 text-muted-foreground/60" />
          <span className="truncate font-semibold text-foreground">
            <HighlightedText text={formatClienteNombre(eq.cliente)} search={search} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 shrink-0 text-muted-foreground/60" />
          <span>Registrado: {formatDate(eq.createdAt)}</span>
        </div>
        {eq.ubicacion && (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground/60" />
            <span className="truncate">
              <HighlightedText text={eq.ubicacion} search={search} />
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto pt-0.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 gap-1.5 rounded-lg text-xs font-medium border-border/80 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150 hover:bg-sky-500 hover:text-white hover:border-sky-500 dark:hover:bg-sky-500 dark:hover:border-sky-500"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye className="size-3.5" /> Ver detalles
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-8 gap-1.5 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
          onClick={(e) => {
            e.stopPropagation();
            onNewTicket();
          }}
        >
          <Ticket className="size-3.5" /> Ticket
        </Button>
      </div>
    </div>
  );
}

// ── Floating selection bar ───────────────────────────────────────────────────

interface FloatingBarProps {
  count: number;
  onExport: () => void;
  onClear: () => void;
}

function FloatingSelectionBar({
  count,
  onExport,
  onClear,
}: FloatingBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md shadow-2xl px-2 py-1.5 ring-1 ring-black/5 animate-in slide-in-from-bottom-3 duration-300 ease-[cubic-bezier(0.25,1.5,0.5,1)] max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-1.5 px-1 sm:px-2 py-0.5">
        <div className="flex size-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold">
          {count}
        </div>
        <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">
          seleccionado{count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="h-5 w-px bg-border mx-0.5" />
      <Button
        variant="ghost"
        className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        title="Exportar"
        onClick={onExport}
      >
        <Download className="size-3.5" />
        <span className="hidden sm:inline">Exportar</span>
      </Button>
      <div className="h-5 w-px bg-border mx-0.5" />
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-95 active:duration-150"
        onClick={onClear}
        aria-label="Limpiar selección"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export default function EquiposExternosPage() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
    }),
    [page, limit, debouncedSearch],
  );
  const { data, isLoading, isError, refetch } = useClienteEquipos(filters);
  const { data: totalData } = useClienteEquipos({ limit: 1 });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((value: number) => {
    setLimit(value);
    setPage(1);
  }, []);

  const handleSelectionModeToggle = useCallback(() => {
    if (selectionMode) {
      setSelectedCards(new Set());
    }
    setSelectionMode((prev) => !prev);
  }, [selectionMode]);

  const handleViewModeChange = useCallback((value: string) => {
    if (value !== "list" && value !== "grid") return;
    setViewMode(value);
    setSelectedCards(new Set());
  }, []);

  const handleBulkExportCSV = useCallback((rows: ClienteEquipoListItem[]) => {
    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "Equipo",
      "Marca/Modelo",
      "Cliente",
      "Serie / Código",
      "Estado",
      "Referencia",
      "Registro",
    ];
    const lines = rows.map((equipo) =>
      [
        formatEquipoNombre(equipo),
        [equipo.marca, equipo.modelo].filter(Boolean).join(" · "),
        formatClienteNombre(equipo.cliente),
        equipo.numeroSerie,
        ESTADO_EQUIPO_LABELS[equipo.estado],
        equipo.ubicacion ?? "",
        equipo.createdAt ? formatDate(equipo.createdAt) : "",
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `equipos-externos-seleccionados-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} equipos exportados correctamente`);
  }, []);

  const columns = useMemo<ColumnDef<ClienteEquipoListItem>[]>(
    () => [
      {
        id: "equipo",
        header: "Equipo",
        cell: ({ row }) => {
          const equipo = row.original;
          const title = formatEquipoNombre(equipo);
          const marcaModelo = [equipo.marca, equipo.modelo].filter(Boolean).join(" · ") || "Sin marca/modelo";
          return (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium text-foreground" title={title}>
                <HighlightedText text={title} search={search} />
              </span>
              <span className="truncate text-xs text-muted-foreground">
                <HighlightedText text={marcaModelo} search={search} />
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "cliente",
        header: "Cliente",
        cell: ({ row }) => {
          const cliente = formatClienteNombre(row.original.cliente);
          return (
            <div className="flex max-w-56 items-center gap-2">
              <User className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-semibold text-foreground" title={cliente}>
                <HighlightedText text={cliente} search={search} />
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "numeroSerie",
        header: "Serie / código",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground font-semibold">
            <HighlightedText text={row.original.numeroSerie} search={search} />
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn("shadow-none py-0.5", estadoBadgeClass(row.original.estado))}
          >
            {ESTADO_EQUIPO_LABELS[row.original.estado]}
          </Badge>
        ),
      },
      {
        accessorKey: "ubicacion",
        header: "Referencia",
        cell: ({ row }) => {
          const ubicacion = row.original.ubicacion;
          return ubicacion ? (
            <div className="flex max-w-48 items-center gap-2">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground/60" />
              <span className="truncate text-sm text-muted-foreground" title={ubicacion}>
                <HighlightedText text={ubicacion} search={search} />
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/50">—</span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Registro",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <Calendar className="size-3.5 text-muted-foreground/60" />
            {formatDate(row.original.createdAt)}
          </div>
        ),
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={() => setDetailId(row.original.id)}
            >
              <Eye className="size-3.5" />
              Ver
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              <Link
                href={`/soporte/nuevo?clienteId=${row.original.clienteId}&clienteEquipoId=${row.original.id}`}
              >
                <Ticket className="size-3.5" />
                Nuevo ticket
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [search],
  );

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative backing glows */}
      <div className="pointer-events-none absolute -z-10 bg-sky-400/8 dark:bg-sky-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-indigo-400/6 dark:bg-indigo-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />

      <TopbarActions>
        <RealtimeStatus />
        <Button
          type="button"
          className="erp-page-primary-cta h-9 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-3.5 mr-1" />
          <span className="hidden sm:inline">Registrar externo</span>
          <span className="sm:hidden">Registrar</span>
        </Button>
      </TopbarActions>
      <h1 className="sr-only">Equipos externos</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total externos"
          value={totalData?.meta?.total}
          icon={Monitor}
          theme="sky"
          subtitle="Equipos registrados"
        />
        <div className="rounded-2xl border border-border/70 bg-card/85 backdrop-blur-sm p-4 sm:col-span-2 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 shadow-sm shrink-0">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Uso correcto</p>
            <p className="text-sm text-foreground mt-1 leading-relaxed">
              Regístralos aquí o desde un ticket; luego se reutilizan en
              futuros servicios del mismo cliente.
            </p>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por equipo, serie, marca, modelo o cliente…"
            className="sm:w-80 lg:w-96"
            inputClassName="border-border bg-background hover:border-sky-400/60 dark:hover:border-sky-500/60 focus-visible:border-sky-500 dark:focus-visible:border-sky-400 focus-visible:ring-sky-400/25 dark:focus-visible:ring-sky-500/25 shadow-sm"
          />

          <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
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

              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={handleViewModeChange}
                variant="outline"
                size="sm"
                className="gap-0 rounded-lg border border-border/70 bg-muted/50 p-0.5 shrink-0"
              >
                <ToggleGroupItem
                  value="list"
                  className="h-8 rounded-md px-2.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm hover:bg-background/80"
                  aria-label="Vista tabla"
                  title="Vista tabla"
                >
                  <List className="size-3.5" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="grid"
                  className="h-8 rounded-md px-2.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm hover:bg-background/80"
                  aria-label="Vista tarjetas"
                  title="Vista tarjetas"
                >
                  <LayoutGrid className="size-3.5" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {viewMode === "list" ? (
        <ServerDataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.meta?.total ?? 0}
          page={page}
          limit={limit}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          emptyMessage="Sin equipos externos"
          emptyDescription="Registra un equipo del cliente para reutilizarlo en tickets de soporte."
          enableColumnVisibility
          columnVisibilityStorageKey="soporte:equipos-externos:columns"
          fillAvailableHeight={!isMobile}
          enableRowSelection={selectionMode}
          bulkActionsBar={
            (selectedRows, clearSelection) => (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                  title="Exportar"
                  onClick={() => {
                    const rows = selectedRows as ClienteEquipoListItem[];
                    handleBulkExportCSV(rows);
                    clearSelection();
                  }}
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </div>
            )
          }
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col">
          {isLoading ? (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-card p-4 space-y-3 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-xl bg-muted" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 rounded bg-muted w-3/4" />
                        <div className="h-3 rounded bg-muted w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 rounded bg-muted w-full" />
                    <div className="h-3 rounded bg-muted w-2/3" />
                    <div className="flex gap-2 pt-2">
                      <div className="h-8 flex-1 rounded-lg bg-muted" />
                      <div className="h-8 flex-1 rounded-lg bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !(data?.data ?? []).length ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Monitor className="size-12 opacity-20" />
              <p className="text-sm font-medium">No se encontraron equipos externos</p>
              <p className="text-xs opacity-70">
                Prueba ajustando los filtros de búsqueda
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {(data?.data ?? []).map((eq, index) => (
                    <EquipoCard
                      key={eq.id}
                      equipo={eq}
                      isSelected={selectionMode && selectedCards.has(eq.id)}
                      search={search}
                      animationDelay={Math.min(index * 55, 440)}
                      onToggleSelect={
                        selectionMode
                          ? () =>
                              setSelectedCards((prev) => {
                                const next = new Set(prev);
                                if (next.has(eq.id)) next.delete(eq.id);
                                else next.add(eq.id);
                                return next;
                              })
                          : undefined
                      }
                      onView={() => setDetailId(eq.id)}
                      onNewTicket={() =>
                        window.location.assign(`/soporte/nuevo?clienteId=${eq.clienteId}&clienteEquipoId=${eq.id}`)
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Grid view Pagination */}
              {(data?.meta?.total ?? 0) > 0 && (
                <div className="shrink-0 mt-3 flex flex-col gap-3 rounded-xl border border-border/70 bg-card/75 backdrop-blur-sm px-4 py-3 shadow-[0_12px_24px_-34px_rgba(15,23,42,0.38)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        Filas por página
                      </span>
                      <Select
                        value={String(limit)}
                        onValueChange={(value) => handleLimitChange(Number(value))}
                      >
                        <SelectTrigger className="h-8 min-w-[5.5rem] rounded-md border-border/80 bg-muted/55 text-xs shadow-none hover:bg-muted/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start">
                          {PAGE_SIZE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {(page - 1) * limit + 1}–
                      {Math.min(page * limit, data?.meta?.total ?? 0)} de {data?.meta?.total ?? 0}{" "}
                      equipos
                    </p>
                  </div>

                  {(data?.meta?.total ?? 0) > limit && (
                    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95 disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => setPage(1)}
                        title="Primera página"
                      >
                        <ChevronsLeft className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95 disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="size-3.5" />
                        Anterior
                      </Button>
                      {(() => {
                        const totalPages = Math.ceil((data?.meta?.total ?? 0) / limit);
                        const pages: (number | "...")[] = [];
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (page > 3) pages.push("...");
                          for (
                            let i = Math.max(2, page - 1);
                            i <= Math.min(totalPages - 1, page + 1);
                            i++
                          )
                            pages.push(i);
                          if (page < totalPages - 2) pages.push("...");
                          pages.push(totalPages);
                        }
                        return pages.map((p, i) =>
                          p === "..." ? (
                            <span
                              key={`ellipsis-${i}`}
                              className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground select-none"
                            >
                              ...
                            </span>
                          ) : (
                            <Button
                              key={p}
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 w-8 rounded-md border-border/80 px-0 text-xs shadow-none transition-all duration-150 active:scale-95",
                                p === page
                                  ? "border-primary/20 bg-primary/10 text-foreground pointer-events-none"
                                  : "bg-muted/55 hover:bg-muted/80",
                              )}
                              onClick={() => setPage(p as number)}
                            >
                              {p}
                            </Button>
                          ),
                        );
                      })()}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95 disabled:opacity-50"
                        disabled={page * limit >= (data?.meta?.total ?? 0)}
                        onClick={() => setPage(page + 1)}
                      >
                        Siguiente
                        <ChevronRight className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95 disabled:opacity-50"
                        disabled={page * limit >= (data?.meta?.total ?? 0)}
                        onClick={() => setPage(Math.ceil((data?.meta?.total ?? 0) / limit))}
                        title="Última página"
                      >
                        <ChevronsRight className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {selectedCards.size > 0 && (
                <FloatingSelectionBar
                  count={selectedCards.size}
                  onExport={() => {
                    const rows = (data?.data ?? []).filter((eq) => selectedCards.has(eq.id));
                    handleBulkExportCSV(rows);
                  }}
                  onClear={() => setSelectedCards(new Set())}
                />
              )}
            </>
          )}
        </div>
      )}

      <EquipoQuickCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />

      <EquipoDetalleDialog
        equipoId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
