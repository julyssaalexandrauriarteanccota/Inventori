"use client";

import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Download,
  Filter,
  LayoutGrid,
  List,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { type AuditoriaListItem } from "@erp/shared";
import { toast } from "sonner";

import { useAuditoria } from "@/hooks/use-configuracion";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ErpBadge, type ErpBadgeTone } from "@/components/erp-badges";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ACCION_META: Record<string, { label: string; tone: ErpBadgeTone }> = {
  CREAR: {
    label: "Crear",
    tone: "success",
  },
  ACTUALIZAR: {
    label: "Actualizar",
    tone: "info",
  },
  ELIMINAR: {
    label: "Eliminar",
    tone: "danger",
  },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatModelo(modelo: string) {
  return modelo.replace(/_/g, " ");
}

function shortenId(value: string | null) {
  if (!value) {
    return null;
  }

  return value.length > 14 ? `${value.slice(0, 8)}...` : value;
}

function getAccionMeta(accion: string) {
  return (
    ACCION_META[accion] ?? {
      label: accion,
      tone: "neutral",
    }
  );
}

function exportToCSV(rows: AuditoriaListItem[], filename: string) {
  const header = [
    "Fecha",
    "Acción",
    "Módulo",
    "Referencia",
    "Usuario",
    "Email",
    "Registro",
  ];
  const lines = rows.map((row) =>
    [
      `"${formatDateTime(row.createdAt)}"`,
      getAccionMeta(row.accion).label,
      `"${formatModelo(row.modelo)}"`,
      row.modeloId ?? "",
      `"${row.usuario?.nombre ?? "Sistema"}"`,
      row.usuario?.email ?? "",
      row.id,
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

const VIEW_MODE_STORAGE_KEY = "erp:auditoria:view-mode";

function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

// ── AuditoriaCard Component ──────────────────────────────────────────────────

interface AuditoriaCardProps {
  item: AuditoriaListItem;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  animationDelay?: number;
  search?: string;
}

function AuditoriaCard({
  item,
  isSelected = false,
  onToggleSelect,
  animationDelay,
  search = "",
}: AuditoriaCardProps) {
  const meta = getAccionMeta(item.accion);
  const user = item.usuario;

  // Custom theme colors for operator avatar
  const avatarCls = user
    ? "bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 dark:shadow-indigo-500/40"
    : "bg-slate-500 text-white shadow-sm shadow-slate-500/30 dark:shadow-slate-500/40";

  const initials = user
    ? user.nombre.slice(0, 2).toUpperCase()
    : "SI";

  const name = user ? user.nombre : "Sistema";
  const email = user ? user.email : "";

  // Dynamic colors for action badge
  const actionCls = 
    item.accion === "CREAR"
      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
      : item.accion === "ACTUALIZAR"
        ? "bg-sky-500 text-white shadow-sm shadow-sky-500/20"
        : item.accion === "ELIMINAR"
          ? "bg-red-500 text-white shadow-sm shadow-red-500/20"
          : "bg-muted text-muted-foreground";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3.5 rounded-2xl border bg-card/85 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.97] active:duration-150 animate-fade-up overflow-hidden",
        isSelected
          ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-500/10 dark:border-emerald-500/50 shadow-md ring-2 ring-emerald-400/20 dark:ring-emerald-500/20"
          : "border-border/70 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-md hover:shadow-indigo-500/5",
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
          item.accion === "CREAR"
            ? "from-emerald-400 to-emerald-600"
            : item.accion === "ACTUALIZAR"
              ? "from-sky-400 to-sky-600"
              : item.accion === "ELIMINAR"
                ? "from-red-400 to-red-600"
                : "from-slate-400 to-slate-600",
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
            "flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm",
            avatarCls,
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="break-words whitespace-normal font-semibold text-sm leading-snug"
            title={name}
          >
            <HighlightedText text={name} search={search} />
          </p>
          {email && (
            <p className="truncate text-xs text-muted-foreground mt-0.5 font-mono">
              <HighlightedText text={email} search={search} />
            </p>
          )}
        </div>
      </div>

      {/* Action + Module section */}
      <div className="flex items-center justify-between gap-1.5 border-t border-border/40 pt-3 mt-1">
        <span className="text-xs text-muted-foreground font-medium">Acción:</span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
            actionCls,
          )}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1.5">
        <span className="text-xs text-muted-foreground font-medium">Módulo:</span>
        <span className="text-sm font-semibold text-foreground">
          <HighlightedText text={formatModelo(item.modelo)} search={search} />
        </span>
      </div>

      <div className="flex items-center justify-between gap-1.5">
        <span className="text-xs text-muted-foreground font-medium">Referencia:</span>
        <span className="font-mono text-xs text-muted-foreground">
          <HighlightedText text={item.modeloId ?? "—"} search={search} />
        </span>
      </div>

      {/* Footer date */}
      <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
        <Clock className="size-3.5 text-muted-foreground/60 shrink-0" />
        <span className="font-mono">{formatDateTime(item.createdAt)}</span>
      </div>
    </div>
  );
}

// ── FloatingSelectionBar Component ──────────────────────────────────────────

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

export default function AuditoriaPage() {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [accionFilter, setAccionFilter] = useState<string>("all");
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [draftModelo, setDraftModelo] = useState("");
  const [draftDesde, setDraftDesde] = useState("");
  const [draftHasta, setDraftHasta] = useState("");
  const [modeloFilter, setModeloFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState<string | undefined>();
  const [fechaHasta, setFechaHasta] = useState<string | undefined>();

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
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
  }, []);

  const debouncedSearch = useDebounce(search, 300);

  const auditoriaFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      accion: accionFilter !== "all" ? accionFilter : undefined,
      modelo: modeloFilter || undefined,
      fechaDesde,
      fechaHasta,
    }),
    [
      page,
      limit,
      debouncedSearch,
      accionFilter,
      modeloFilter,
      fechaDesde,
      fechaHasta,
    ],
  );

  const { data, isLoading, isError, error, refetch } =
    useAuditoria(auditoriaFilters);

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.meta?.total ?? 0;
  const currentPage = data?.meta?.page ?? page;
  const uniqueUsers = new Set(
    rows.map((row) => row.usuario?.id).filter(Boolean),
  ).size;
  const activeFilterCount =
    (modeloFilter ? 1 : 0) + (fechaDesde ? 1 : 0) + (fechaHasta ? 1 : 0);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const openFiltrosPopover = useCallback(
    (open: boolean) => {
      setFiltrosOpen(open);

      if (open) {
        setDraftModelo(modeloFilter);
        setDraftDesde(fechaDesde ?? "");
        setDraftHasta(fechaHasta ?? "");
      }
    },
    [modeloFilter, fechaDesde, fechaHasta],
  );

  const applyFiltros = useCallback(() => {
    if (draftDesde && draftHasta && draftDesde > draftHasta) {
      toast.error("La fecha inicial no puede ser mayor que la final", {
        duration: 1800,
      });
      return;
    }

    setModeloFilter(draftModelo.trim());
    setFechaDesde(draftDesde || undefined);
    setFechaHasta(draftHasta || undefined);
    setPage(1);
    setFiltrosOpen(false);
  }, [draftDesde, draftHasta, draftModelo]);

  const clearFiltros = useCallback(() => {
    setDraftModelo("");
    setDraftDesde("");
    setDraftHasta("");
    setModeloFilter("");
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    setPage(1);
    setFiltrosOpen(false);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (rows.length === 0) {
      toast.info("No hay registros para exportar", { duration: 1600 });
      return;
    }

    exportToCSV(rows, `auditoria-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("CSV exportado", { duration: 1600 });
  }, [rows]);

  const handleExportSelectedCards = useCallback(() => {
    const selectedRows = rows.filter((r) => selectedCards.has(r.id));
    if (!selectedRows.length) {
      toast.error("No hay registros seleccionados");
      return;
    }
    exportToCSV(selectedRows, "auditoria-seleccion.csv");
    toast.success(`${selectedRows.length} registros exportados`);
    setSelectedCards(new Set());
    setSelectionMode(false);
  }, [rows, selectedCards]);

  const columns = useMemo<ColumnDef<AuditoriaListItem, unknown>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Fecha",
        size: 170,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-mono text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "accion",
        header: "Acción",
        size: 120,
        cell: ({ row }) => {
          const meta = getAccionMeta(row.original.accion);
          return (
            <ErpBadge tone={meta.tone} className="whitespace-nowrap">
              {meta.label}
            </ErpBadge>
          );
        },
      },
      {
        accessorKey: "modelo",
        header: "Módulo",
        size: 180,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-foreground">
            <HighlightedText
              text={formatModelo(row.original.modelo)}
              search={search}
            />
          </span>
        ),
      },
      {
        id: "usuario",
        header: "Usuario",
        size: 220,
        cell: ({ row }) => {
          const user = row.original.usuario;
          if (user) {
            return (
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 dark:shadow-indigo-500/40 font-bold text-[10px]"
                  aria-hidden
                >
                  {user.nombre.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex flex-col min-w-0">
                  <span
                    className="truncate font-semibold text-sm leading-snug text-foreground"
                    title={user.nombre}
                  >
                    <HighlightedText text={user.nombre} search={search} />
                  </span>
                  <span
                    className="truncate text-xs text-muted-foreground"
                    title={user.email}
                  >
                    <HighlightedText text={user.email} search={search} />
                  </span>
                </div>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-500 text-white shadow-sm shadow-slate-500/30 dark:shadow-slate-500/40 font-bold text-[10px]"
                aria-hidden
              >
                SI
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm leading-snug text-foreground">
                  Sistema
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "modeloId",
        header: "Referencia",
        size: 150,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            <HighlightedText
              text={row.original.modeloId ?? "—"}
              search={search}
            />
          </span>
        ),
      },
      {
        accessorKey: "id",
        header: "Registro",
        size: 140,
        meta: { defaultHidden: true },
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {shortenId(row.original.id)}
          </span>
        ),
      },
    ],
    [search],
  );

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative backing glows — coordinated with oklch themes */}
      <div className="pointer-events-none absolute -z-10 bg-indigo-400/8 dark:bg-indigo-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-sky-400/6 dark:bg-sky-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-violet-400/5 dark:bg-violet-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />

      {/* Topbar page action slot */}
      <TopbarActions>
        <RealtimeStatus />

        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-95 active:duration-150"
          onClick={() => void refetch()}
          title="Actualizar lista"
        >
          <RefreshCcw className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-95 active:duration-150"
          onClick={handleExportCSV}
          title="Exportar CSV"
        >
          <Download className="size-4" />
        </Button>
      </TopbarActions>

      <h1 className="sr-only">Auditoría</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total registros"
          value={total}
          icon={ScrollText}
          theme="indigo"
          subtitle="Bitácora total"
          isLoading={isLoading}
        />
        <StatCard
          label="En página"
          value={rows.length}
          icon={Filter}
          theme="sky"
          subtitle="Registros cargados"
          isLoading={isLoading}
        />
        <StatCard
          label="Usuarios visibles"
          value={uniqueUsers}
          icon={UserRound}
          theme="amber"
          subtitle="Operadores activos"
          isLoading={isLoading}
        />
        <StatCard
          label="Página actual"
          value={currentPage}
          icon={ShieldCheck}
          theme="emerald"
          subtitle="Navegación"
          isLoading={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por módulo, acción, usuario o referencia…"
            className="sm:w-80 lg:w-96"
            inputClassName="border-border bg-background hover:border-indigo-400/60 dark:hover:border-indigo-500/60 focus-visible:border-indigo-500 dark:focus-visible:border-indigo-400 focus-visible:ring-indigo-400/25 dark:focus-visible:ring-indigo-500/25 shadow-sm"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Tabs
              value={accionFilter}
              onValueChange={(value) => {
                setAccionFilter(value);
                setPage(1);
              }}
            >
              <TabsList className="flex h-9 gap-0.5 rounded-lg border border-border/70 bg-muted/70 p-0.5">
                <TabsTrigger
                  value="all"
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  Todo
                </TabsTrigger>
                <TabsTrigger
                  value="CREAR"
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 dark:data-[state=active]:bg-emerald-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  Crear
                </TabsTrigger>
                <TabsTrigger
                  value="ACTUALIZAR"
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 dark:data-[state=active]:bg-sky-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  Actualizar
                </TabsTrigger>
                <TabsTrigger
                  value="ELIMINAR"
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-red-500/30 dark:data-[state=active]:bg-red-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  Eliminar
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
                className="w-[calc(100vw-2rem)] sm:w-[380px] max-w-sm rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">
                    Refina la bitácora visible de auditoría
                  </p>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Módulo
                    </p>
                    <Input
                      value={draftModelo}
                      onChange={(event) => setDraftModelo(event.target.value)}
                      placeholder="Ej. clientes, ventas, config"
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Desde
                      </p>
                      <Input
                        type="date"
                        value={draftDesde}
                        onChange={(event) => setDraftDesde(event.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Hasta
                      </p>
                      <Input
                        type="date"
                        value={draftHasta}
                        onChange={(event) => setDraftHasta(event.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
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
                </div>
              </PopoverContent>
            </Popover>

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

      {viewMode === "list" ? (
        <ServerDataTable
          columns={columns}
          data={rows}
          total={total}
          page={currentPage}
          limit={limit}
          isLoading={isLoading}
          isError={isError}
          errorMessage={
            error instanceof Error
              ? error.message
              : "No se pudo cargar la auditoría."
          }
          onRetry={() => {
            void refetch();
          }}
          onPageChange={setPage}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          enableRowSelection={selectionMode}
          enableColumnVisibility
          enableColumnResizing
          columnVisibilityStorageKey="erp:auditoria:table-columns"
          fillAvailableHeight={!isMobile}
          bulkActionsBar={(selectedRows, clearSelection) => (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-xl text-xs"
                onClick={() => {
                  const typedRows = selectedRows as AuditoriaListItem[];
                  exportToCSV(typedRows, "auditoria-seleccion.csv");
                  toast.success(`${typedRows.length} registros exportados`);
                  clearSelection();
                }}
              >
                <Download className="size-3.5" /> Exportar
              </Button>
            </div>
          )}
          emptyMessage="Sin registros de auditoría"
          emptyDescription={
            search || accionFilter !== "all" || activeFilterCount > 0
              ? "No hay actividad para los filtros aplicados."
              : "Cuando se registren cambios, aparecerán aquí."
          }
        />
      ) : (
        // Grid View
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
                      <div className="size-10 rounded-xl bg-muted" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 rounded bg-muted w-3/4" />
                        <div className="h-3 rounded bg-muted w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 rounded bg-muted w-full" />
                    <div className="h-3 rounded bg-muted w-2/3" />
                    <div className="h-3 rounded bg-muted w-full" />
                    <div className="h-7 rounded bg-muted w-1/3 pt-1" />
                  </div>
                ))}
              </div>
            </div>
          ) : !rows.length ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <ScrollText className="size-12 opacity-20" />
              <p className="text-sm font-medium">No se encontraron registros</p>
              <p className="text-xs opacity-70">
                Prueba ajustando los filtros de búsqueda
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {rows.map((item, index) => (
                    <AuditoriaCard
                      key={item.id}
                      item={item}
                      isSelected={selectionMode && selectedCards.has(item.id)}
                      search={search}
                      animationDelay={Math.min(index * 45, 360)}
                      onToggleSelect={
                        selectionMode
                          ? () =>
                              setSelectedCards((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              })
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Pagination footer */}
              {total > 0 && (
                <div className="shrink-0 mt-3 flex flex-col gap-3 rounded-xl border border-border/70 bg-card/75 backdrop-blur-sm px-4 py-3 shadow-[0_12px_24px_-34px_rgba(15,23,42,0.38)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        Filas por página
                      </span>
                      <Select
                        value={String(limit)}
                        onValueChange={(value) => {
                          setLimit(Number(value));
                          setPage(1);
                          setSelectedCards(new Set());
                        }}
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
                      {Math.min(page * limit, total)} de {total}{" "}
                      registros
                    </p>
                  </div>

                  {total > limit && (
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
                        const totalPages = Math.ceil(total / limit);
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
                          )
                        );
                      })()}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95 disabled:opacity-50"
                        disabled={page >= Math.ceil(total / limit)}
                        onClick={() => setPage(page + 1)}
                      >
                        Siguiente
                        <ChevronRight className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95 disabled:opacity-50"
                        disabled={page >= Math.ceil(total / limit)}
                        onClick={() => setPage(Math.ceil(total / limit))}
                        title="Última página"
                      >
                        <ChevronsRight className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Selection Bar for card view selection mode */}
      {selectionMode && selectedCards.size > 0 && (
        <FloatingSelectionBar
          count={selectedCards.size}
          onExport={handleExportSelectedCards}
          onClear={() => {
            setSelectedCards(new Set());
            setSelectionMode(false);
          }}
        />
      )}
    </div>
  );
}
