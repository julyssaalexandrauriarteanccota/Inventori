"use client";

import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  List,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCcw,
  Search,
  ShieldCheck,
  ClipboardCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  EstadoGarantia,
  RolUsuario,
  type GarantiaFormPayload,
  type GarantiaListItem,
} from "@erp/shared";

import { GarantiaForm } from "@/components/forms/garantia-form";
import { GarantiaCasoModal } from "@/components/modals/garantia-caso-modal";
import {
  GarantiaDetalleModal,
  type GarantiaCasoItem,
  type GarantiaDetailRecord,
} from "@/components/modals/garantia-detalle-modal";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useCreateGarantia,
  useDeleteGarantia,
  useEliminarCasoGarantia,
  useGarantia,
  useGarantias,
  useUpdateGarantia,
} from "@/hooks/use-garantias";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/layout/stat-card";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ErpBadge, type ErpBadgeTone } from "@/components/erp-badges";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const VIEW_MODE_STORAGE_KEY = "erp:garantias:view-mode";

const ESTADO_LABELS: Record<EstadoGarantia, string> = {
  [EstadoGarantia.PENDIENTE_COMPLETAR]: "Pendiente",
  [EstadoGarantia.ACTIVA]: "Activa",
  [EstadoGarantia.VENCIDA]: "Vencida",
  [EstadoGarantia.ANULADA]: "Anulada",
};

const ESTADO_VARIANTS: Record<EstadoGarantia, string> = {
  [EstadoGarantia.PENDIENTE_COMPLETAR]:
    "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  [EstadoGarantia.ACTIVA]:
    "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
  [EstadoGarantia.VENCIDA]:
    "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  [EstadoGarantia.ANULADA]:
    "border-destructive/20 bg-destructive/10 text-destructive",
};

type EstadoFilter =
  | "all"
  | EstadoGarantia.PENDIENTE_COMPLETAR
  | EstadoGarantia.ACTIVA
  | EstadoGarantia.VENCIDA
  | EstadoGarantia.ANULADA;

function hasNuevoParam() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("nuevo") === "1";
}

function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function getGarantiaProductName(garantia: GarantiaListItem) {
  return [garantia.equipo.producto.nombre, garantia.equipo.producto.modelo]
    .filter(Boolean)
    .join(" · ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

interface GarantiaCardProps {
  garantia: GarantiaListItem;
  canEdit: boolean;
  canDelete: boolean;
  canManageCasos: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
  onEdit: () => void;
  onCreateCaso: () => void;
  onDelete: () => void;
  animationDelay?: number;
  search?: string;
}

function GarantiaCard({
  garantia,
  canEdit,
  canDelete,
  canManageCasos,
  isSelected = false,
  onToggleSelect,
  onView,
  onEdit,
  onCreateCaso,
  onDelete,
  animationDelay,
  search = "",
}: GarantiaCardProps) {
  const productName = garantia.equipo.producto.nombre;
  const productModel = garantia.equipo.producto.modelo;

  const statusTones: Record<EstadoGarantia, ErpBadgeTone> = {
    [EstadoGarantia.PENDIENTE_COMPLETAR]: "warning",
    [EstadoGarantia.ACTIVA]: "success",
    [EstadoGarantia.VENCIDA]: "warning",
    [EstadoGarantia.ANULADA]: "danger",
  };

  const accentBar =
    garantia.estado === EstadoGarantia.ACTIVA
      ? "from-emerald-400 via-emerald-500 to-emerald-600"
      : garantia.estado === EstadoGarantia.PENDIENTE_COMPLETAR
        ? "from-sky-400 via-sky-500 to-sky-600"
        : "from-slate-400 via-slate-500 to-slate-600";

  const avatarCls =
    garantia.estado === EstadoGarantia.ACTIVA
      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 dark:bg-emerald-600 dark:shadow-none"
      : garantia.estado === EstadoGarantia.PENDIENTE_COMPLETAR
        ? "bg-sky-500 text-white shadow-sm shadow-sky-500/30 dark:bg-sky-600 dark:shadow-none"
        : "bg-slate-500 text-white shadow-sm shadow-slate-500/30 dark:shadow-slate-500/40";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3.5 rounded-2xl border bg-card/85 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.97] active:duration-150 animate-fade-up overflow-hidden",
        isSelected
          ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-500/10 dark:border-emerald-500/50 shadow-md ring-2 ring-emerald-400/20 dark:ring-emerald-500/20"
          : "border-border/70 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5",
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

      {onToggleSelect ? (
        <div
          className={cn(
            "absolute left-3 top-3 z-10 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect()}
            className="size-4 shadow-sm"
          />
        </div>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className={cn(
            "absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full text-muted-foreground/40 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 active:scale-95 active:duration-150",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          title="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-3 relative",
          onToggleSelect ? "pl-6 pr-7" : "pl-2 pr-7",
        )}
      >
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm",
            avatarCls,
          )}
        >
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="break-words whitespace-normal font-semibold text-sm leading-snug"
            title={getGarantiaProductName(garantia)}
          >
            <HighlightedText text={productName} search={search} />
            {productModel ? (
              <span className="ml-1 text-xs text-muted-foreground font-normal">
                · <HighlightedText text={productModel} search={search} />
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            QR <HighlightedText text={garantia.codigoQR} search={search} />
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ErpBadge
          tone={statusTones[garantia.estado]}
          className="gap-1 text-xs"
        >
          {garantia.estado === EstadoGarantia.PENDIENTE_COMPLETAR ? (
            <ClipboardCheck className="size-3" />
          ) : garantia.estado === EstadoGarantia.ACTIVA ? (
            <span className="relative flex size-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
            </span>
          ) : garantia.estado === EstadoGarantia.VENCIDA ? (
            <Clock3 className="size-3" />
          ) : (
            <Ban className="size-3" />
          )}
          {ESTADO_LABELS[garantia.estado]}
        </ErpBadge>

        <ErpBadge
          tone={garantia.vigente ? "success" : "neutral"}
          className="gap-1 text-xs"
        >
          {garantia.vigente ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <Clock3 className="size-3" />
          )}
          {garantia.vigente ? "Vigente" : "No vigente"}
        </ErpBadge>
      </div>

      <div className="flex flex-col gap-1 border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <QrCode className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="font-mono">
            <HighlightedText text={garantia.equipo.numeroSerie} search={search} />
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground/50">
            serie
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="truncate">
            {garantia.clienteNombre ? (
              <HighlightedText text={garantia.clienteNombre} search={search} />
            ) : (
              <span className="italic text-muted-foreground/50">Sin cliente visible</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="size-3 shrink-0 text-muted-foreground/60" />
          <span>Vence {formatDate(garantia.fechaFin)}</span>
        </div>
      </div>

      <div className="mt-auto flex gap-2 pt-0.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 gap-1.5 rounded-lg text-xs font-medium border-border/80 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 dark:hover:bg-emerald-500 dark:hover:border-emerald-500"
          onClick={(event) => {
            event.stopPropagation();
            onView();
          }}
        >
          <Eye className="size-3.5" />
          Ver detalle
        </Button>

        {canEdit ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 gap-1.5 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            {garantia.estado === EstadoGarantia.PENDIENTE_COMPLETAR ? (
              <ClipboardCheck className="size-3.5" />
            ) : (
              <Pencil className="size-3.5" />
            )}
            {garantia.estado === EstadoGarantia.PENDIENTE_COMPLETAR
              ? "Completar"
              : "Editar"}
          </Button>
        ) : null}

        {canManageCasos && garantia.estado === EstadoGarantia.ACTIVA ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 active:scale-95 active:duration-150"
            onClick={(event) => {
              event.stopPropagation();
              onCreateCaso();
            }}
            title="Nuevo caso"
          >
            <MessageSquarePlus className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface FloatingBarProps {
  count: number;
  onExport: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onClear: () => void;
}

function FloatingSelectionBar({
  count,
  onExport,
  onPrint,
  onDelete,
  onClear,
}: FloatingBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md shadow-2xl px-2 py-1.5 ring-1 ring-black/5 animate-in slide-in-from-bottom-3 duration-300 ease-[cubic-bezier(0.25,1.5,0.5,1)] max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-1.5 px-1 sm:px-2 py-0.5">
        <div className="flex size-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold">
          {count}
        </div>
        <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">
          seleccionada{count !== 1 ? "s" : ""}
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
      <Button
        variant="ghost"
        className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        title="Imprimir"
        onClick={onPrint}
      >
        <Printer className="size-3.5" />
        <span className="hidden sm:inline">Imprimir</span>
      </Button>
      <Button
        variant="ghost"
        className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 text-[var(--semantic-danger)] hover:text-[var(--semantic-danger)] hover:bg-[var(--semantic-danger-soft)] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        title="Eliminar"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
        <span className="hidden sm:inline">Eliminar</span>
      </Button>
      <div className="h-5 w-px bg-border mx-0.5" />
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 active:scale-95 active:duration-150"
        onClick={onClear}
        aria-label="Limpiar selección"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export default function GarantiasPage() {
  const isMobile = useIsMobile();
  const { hasRole } = useAuth();
  const canEdit = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canDelete = hasRole(RolUsuario.ADMIN);
  const canManageCasos = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canCreateManual = hasRole(RolUsuario.ADMIN);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("all");
  const debouncedSearch = useDebounce(search, 300);

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [draftEstadoFilter, setDraftEstadoFilter] =
    useState<EstadoFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [openCreate, setOpenCreate] = useState(
    () => canCreateManual && hasNuevoParam(),
  );
  const [editGarantiaId, setEditGarantiaId] = useState<string | null>(null);
  const [editIntent, setEditIntent] = useState<"edit" | "complete">("edit");
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const [createCasoGarantiaId, setCreateCasoGarantiaId] = useState<
    string | null
  >(null);
  const [updateCasoData, setUpdateCasoData] = useState<{
    garantiaId: string;
    caso: GarantiaCasoItem;
  } | null>(null);
  const [deleteCasoData, setDeleteCasoData] = useState<{
    garantiaId: string;
    caso: GarantiaCasoItem;
  } | null>(null);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      estado: estadoFilter !== "all" ? estadoFilter : undefined,
      soloOperativas: estadoFilter === "all" ? true : undefined,
    }),
    [page, limit, debouncedSearch, estadoFilter],
  );

  const statsBaseFilters = useMemo(
    () => ({
      page: 1,
      limit: 1,
      search: debouncedSearch || undefined,
    }),
    [debouncedSearch],
  );

  const { data, isLoading, isError, refetch } = useGarantias(filters);
  const { data: statsTotal } = useGarantias(statsBaseFilters);
  const { data: statsPendientes } = useGarantias({
    ...statsBaseFilters,
    estado: EstadoGarantia.PENDIENTE_COMPLETAR,
  });
  const { data: statsActivas } = useGarantias({
    ...statsBaseFilters,
    estado: EstadoGarantia.ACTIVA,
  });
  const { data: statsVencidas } = useGarantias({
    ...statsBaseFilters,
    estado: EstadoGarantia.VENCIDA,
  });
  const { data: statsAnuladas } = useGarantias({
    ...statsBaseFilters,
    estado: EstadoGarantia.ANULADA,
  });

  const createMutation = useCreateGarantia();
  const updateMutation = useUpdateGarantia(editGarantiaId ?? "");
  const deleteMutation = useDeleteGarantia();
  const deleteCasoMutation = useEliminarCasoGarantia();
  const {
    data: editGarantiaResponse,
    isLoading: isEditLoading,
    isError: isEditError,
  } = useGarantia(editGarantiaId ?? undefined);
  const editGarantia = editGarantiaResponse?.data as unknown as
    | GarantiaDetailRecord
    | undefined;

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const activeFilterCount = estadoFilter !== "all" ? 1 : 0;
  const pendingDeleteIds = useMemo(
    () =>
      bulkDeleteIds.length > 0 ? bulkDeleteIds : deleteId ? [deleteId] : [],
    [bulkDeleteIds, deleteId],
  );
  const deleteTargetItem = rows.find((item) => item.id === deleteId) ?? null;
  const selectedCardRows = useMemo(
    () => rows.filter((item) => selectedCards.has(item.id)),
    [rows, selectedCards],
  );
  const pendingCount = statsPendientes?.meta?.total ?? 0;

  const handleCreate = useCallback(
    (payload: GarantiaFormPayload) => {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Garantía registrada correctamente");
          setOpenCreate(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Error al registrar la garantía");
        },
      });
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (payload: GarantiaFormPayload) => {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(
            editIntent === "complete"
              ? "Garantía completada y activada"
              : "Garantía actualizada correctamente",
          );
          setEditGarantiaId(null);
          setEditIntent("edit");
        },
        onError: (error: Error) => {
          toast.error(error.message || "Error al actualizar la garantía");
        },
      });
    },
    [editIntent, updateMutation],
  );

  const openEditGarantia = useCallback(
    (garantiaId: string, intent: "edit" | "complete" = "edit") => {
      setViewDetailId(null);
      setEditIntent(intent);
      setEditGarantiaId(garantiaId);
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteIds.length) {
      return;
    }

    try {
      for (const garantiaId of pendingDeleteIds) {
        await deleteMutation.mutateAsync(garantiaId);
      }

      toast.success(
        pendingDeleteIds.length === 1
          ? "Garantía eliminada correctamente"
          : `${pendingDeleteIds.length} garantías eliminadas correctamente`,
      );

      if (viewDetailId && pendingDeleteIds.includes(viewDetailId)) {
        setViewDetailId(null);
      }

      if (editGarantiaId && pendingDeleteIds.includes(editGarantiaId)) {
        setEditGarantiaId(null);
        setEditIntent("edit");
      }

      setDeleteId(null);
      setBulkDeleteIds([]);
      setSelectedCards(new Set<string>());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al eliminar las garantías",
      );
    }
  }, [pendingDeleteIds, deleteMutation, viewDetailId, editGarantiaId]);

  const openCreateCaso = useCallback((garantiaId: string) => {
    setViewDetailId(null);
    setCreateCasoGarantiaId(garantiaId);
  }, []);

  const openUpdateCaso = useCallback(
    (garantiaId: string, caso: GarantiaCasoItem) => {
      setViewDetailId(null);
      setUpdateCasoData({ garantiaId, caso });
    },
    [],
  );

  const openDeleteCaso = useCallback(
    (garantiaId: string, caso: GarantiaCasoItem) => {
      setDeleteCasoData({ garantiaId, caso });
    },
    [],
  );

  const handleConfirmDeleteCaso = useCallback(() => {
    if (!deleteCasoData) return;

    deleteCasoMutation.mutate(
      {
        garantiaId: deleteCasoData.garantiaId,
        casoId: deleteCasoData.caso.id,
      },
      {
        onSuccess: () => {
          toast.success("Caso eliminado correctamente");
          setDeleteCasoData(null);
          setViewDetailId(deleteCasoData.garantiaId);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Error al eliminar el caso");
        },
      },
    );
  }, [deleteCasoData, deleteCasoMutation]);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    setSelectedCards(new Set<string>());
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    setSelectedCards(new Set<string>());
  }, []);

  const handleEstadoChange = useCallback((value: string) => {
    setEstadoFilter(value as EstadoFilter);
    setPage(1);
    setSelectedCards(new Set<string>());
  }, []);

  const handleLimitChange = useCallback((value: number) => {
    setLimit(value);
    setPage(1);
    setSelectedCards(new Set<string>());
  }, []);

  const openFilterPopover = useCallback(
    (open: boolean) => {
      setFilterPopoverOpen(open);

      if (open) {
        setDraftEstadoFilter(estadoFilter);
      }
    },
    [estadoFilter],
  );

  const clearFilterPopover = useCallback(() => {
    setDraftEstadoFilter("all");
    setEstadoFilter("all");
    setPage(1);
    setFilterPopoverOpen(false);
  }, []);

  const applyFilterPopover = useCallback(() => {
    setEstadoFilter(draftEstadoFilter);
    setPage(1);
    setFilterPopoverOpen(false);
  }, [draftEstadoFilter]);

  const handleSelectionModeToggle = useCallback(() => {
    setSelectionMode((previous) => !previous);
    setSelectedCards(new Set<string>());
  }, []);

  const handleViewModeChange = useCallback((value: string) => {
    if (value !== "list" && value !== "grid") return;
    setViewMode(value);
    setSelectedCards(new Set<string>());
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
  }, []);

  const exportGarantias = useCallback((items: GarantiaListItem[]) => {
    if (!items.length) {
      toast.error("No hay garantías para exportar");
      return;
    }

    const headers = [
      "Código QR",
      "Serie",
      "Producto",
      "Modelo",
      "Cliente",
      "Estado",
      "Inicio",
      "Fin",
      "Vigente",
    ];
    const lines = items.map((garantia) =>
      [
        garantia.codigoQR,
        garantia.equipo.numeroSerie,
        garantia.equipo.producto.nombre,
        garantia.equipo.producto.modelo ?? "",
        garantia.clienteNombre ?? "",
        ESTADO_LABELS[garantia.estado],
        formatDate(garantia.fechaInicio),
        formatDate(garantia.fechaFin),
        garantia.vigente ? "Sí" : "No",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "garantias.csv";
    link.click();

    URL.revokeObjectURL(url);
    toast.success(
      `${items.length} garantía${items.length !== 1 ? "s" : ""} exportada${items.length !== 1 ? "s" : ""}`,
    );
  }, []);

  const printGarantias = useCallback((items: GarantiaListItem[]) => {
    if (!items.length) {
      toast.error("No hay garantías para imprimir");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1080,height=720");

    if (!printWindow) {
      toast.error("No se pudo abrir la vista de impresión");
      return;
    }

    const rowsHtml = items
      .map(
        (garantia) => `
      <tr>
        <td>${escapeHtml(garantia.codigoQR)}</td>
        <td>${escapeHtml(garantia.equipo.numeroSerie)}</td>
        <td>${escapeHtml(garantia.equipo.producto.nombre)}</td>
        <td>${escapeHtml(garantia.equipo.producto.modelo ?? "—")}</td>
        <td>${escapeHtml(garantia.clienteNombre ?? "—")}</td>
        <td>${escapeHtml(ESTADO_LABELS[garantia.estado])}</td>
        <td>${escapeHtml(formatDate(garantia.fechaFin))}</td>
      </tr>
    `,
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Garantías</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0 0 20px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f3f4f6; text-transform: uppercase; letter-spacing: 0.06em; }
          </style>
        </head>
        <body>
          <h1>Listado de garantías</h1>
          <p>${items.length} registro${items.length !== 1 ? "s" : ""}</p>
          <table>
            <thead>
              <tr>
                <th>Código QR</th>
                <th>Serie</th>
                <th>Producto</th>
                <th>Modelo</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Vence</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, []);

  const toggleCardSelection = useCallback((garantiaId: string) => {
    setSelectedCards((previous) => {
      const next = new Set(previous);

      if (next.has(garantiaId)) next.delete(garantiaId);
      else next.add(garantiaId);

      return next;
    });
  }, []);

  const handleExportSelectedCards = () => {
    exportGarantias(selectedCardRows);
  };

  const handlePrintSelectedCards = () => {
    printGarantias(selectedCardRows);
  };

  const handleBulkDeleteCards = () => {
    setBulkDeleteIds(selectedCardRows.map((item) => item.id));
  };

  const columns = useMemo<ColumnDef<GarantiaListItem>[]>(
    () => [
      {
        id: "serie",
        header: "N.° serie",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
            <HighlightedText
              text={row.original.equipo.numeroSerie}
              search={search}
            />
          </span>
        ),
      },
      {
        id: "producto",
        header: "Producto",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 dark:bg-emerald-600 dark:shadow-none"
              aria-hidden
            >
              <ShieldCheck className="size-4" />
            </span>
            <div className="flex flex-col min-w-0">
              <span
                className="block max-w-64 sm:max-w-xs md:max-w-md break-words whitespace-normal font-semibold text-sm leading-snug text-foreground"
                title={getGarantiaProductName(row.original)}
              >
                <HighlightedText
                  text={row.original.equipo.producto.nombre}
                  search={search}
                />
                {row.original.equipo.producto.modelo ? (
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    · <HighlightedText
                      text={row.original.equipo.producto.modelo}
                      search={search}
                    />
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "codigoQR",
        header: "Código QR",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            <HighlightedText text={row.original.codigoQR} search={search} />
          </span>
        ),
      },
      {
        accessorKey: "clienteNombre",
        header: "Cliente",
        cell: ({ row }) => {
          const cliente = row.original.clienteNombre;
          return cliente ? (
            <span className="whitespace-nowrap text-sm text-foreground font-medium">
              <HighlightedText text={cliente} search={search} />
            </span>
          ) : (
            <span className="text-muted-foreground/50 text-xs">—</span>
          );
        },
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const statusTones: Record<EstadoGarantia, ErpBadgeTone> = {
            [EstadoGarantia.PENDIENTE_COMPLETAR]: "warning",
            [EstadoGarantia.ACTIVA]: "success",
            [EstadoGarantia.VENCIDA]: "warning",
            [EstadoGarantia.ANULADA]: "danger",
          };
          return (
            <ErpBadge
              tone={statusTones[row.original.estado]}
              className="whitespace-nowrap"
            >
              {ESTADO_LABELS[row.original.estado]}
            </ErpBadge>
          );
        },
      },
      {
        id: "vigencia",
        header: "Vigencia",
        cell: ({ row }) => (
          <ErpBadge
            tone={row.original.vigente ? "success" : "neutral"}
            className="whitespace-nowrap"
          >
            {row.original.vigente ? "Vigente" : "No vigente"}
          </ErpBadge>
        ),
      },
      {
        accessorKey: "fechaFin",
        header: "Vence",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDate(row.original.fechaFin)}
          </span>
        ),
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        size: 120,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setViewDetailId(row.original.id);
              }}
            >
              <Eye className="size-3.5" />
              Ver
            </Button>

            {canEdit &&
            row.original.estado === EstadoGarantia.PENDIENTE_COMPLETAR ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                onClick={() => openEditGarantia(row.original.id, "complete")}
              >
                <ClipboardCheck className="size-3.5" />
                Completar
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setViewDetailId(row.original.id)}
                  >
                    <Eye className="size-4" />
                    Ver detalle
                  </DropdownMenuItem>

                  {canManageCasos &&
                  row.original.estado === EstadoGarantia.ACTIVA ? (
                    <DropdownMenuItem
                      onClick={() => openCreateCaso(row.original.id)}
                    >
                      <MessageSquarePlus className="size-4" />
                      Nuevo caso
                    </DropdownMenuItem>
                  ) : null}

                  <DropdownMenuSeparator />

                  {canEdit && (
                    <DropdownMenuItem
                      onClick={() =>
                        openEditGarantia(
                          row.original.id,
                          row.original.estado ===
                            EstadoGarantia.PENDIENTE_COMPLETAR
                            ? "complete"
                            : "edit",
                        )
                      }
                    >
                      {row.original.estado ===
                      EstadoGarantia.PENDIENTE_COMPLETAR ? (
                        <ClipboardCheck className="size-4" />
                      ) : (
                        <Pencil className="size-4" />
                      )}
                      {row.original.estado === EstadoGarantia.PENDIENTE_COMPLETAR
                        ? "Completar garantía"
                        : "Editar"}
                    </DropdownMenuItem>
                  )}

                  {canDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteId(row.original.id)}
                    >
                      <Trash2 className="size-4" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [
      canEdit,
      canDelete,
      canManageCasos,
      openCreateCaso,
      openEditGarantia,
      search,
    ],
  );

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative backing glows — coordinated with oklch themes */}
      <div className="pointer-events-none absolute -z-10 bg-emerald-400/8 dark:bg-emerald-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-teal-400/6 dark:bg-teal-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-cyan-400/5 dark:bg-cyan-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />

      {/* Topbar page action slot */}
      <TopbarActions>
        <RealtimeStatus />

        {canCreateManual ? (
          <Button
            onClick={() => setOpenCreate(true)}
            className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nueva garantía</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        ) : null}
      </TopbarActions>

      <h1 className="sr-only">Garantías</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total garantías"
          value={statsTotal?.meta?.total}
          icon={ShieldCheck}
          theme="slate"
          subtitle="Registradas"
        />
        <StatCard
          label="Pendientes"
          value={statsPendientes?.meta?.total}
          icon={ClipboardCheck}
          theme="sky"
          subtitle="Por completar"
        />
        <StatCard
          label="Activas"
          value={statsActivas?.meta?.total}
          icon={CheckCircle2}
          theme="emerald"
          subtitle="En vigencia"
        />
        <StatCard
          label="Vencidas"
          value={statsVencidas?.meta?.total}
          icon={Clock3}
          theme="amber"
          subtitle="Plazo expirado"
        />
        <StatCard
          label="Anuladas"
          value={statsAnuladas?.meta?.total}
          icon={Ban}
          theme="red"
          subtitle="Sin cobertura"
        />
      </div>

      {pendingCount > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border/40 border-l-[3px] border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/10 px-4 py-3.5 text-foreground shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              <ClipboardCheck className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                {pendingCount === 1
                  ? "Hay 1 garantía pendiente de completar"
                  : `Hay ${pendingCount} garantías pendientes de completar`}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                Completa fecha y lugar de instalación para activarlas antes de
                abrir casos o validar cobertura.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-lg border-amber-200/80 bg-background text-xs text-amber-800 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900/20 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            onClick={() =>
              handleEstadoChange(EstadoGarantia.PENDIENTE_COMPLETAR)
            }
          >
            <Filter className="size-3.5" />
            Ver pendientes
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Search bar */}
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por QR, serie, producto o cliente..."
            className="sm:w-80 lg:w-96"
            inputClassName="border-border bg-background hover:border-emerald-400/60 dark:hover:border-emerald-500/60 focus-visible:border-emerald-500 dark:focus-visible:border-emerald-400 focus-visible:ring-emerald-400/25 dark:focus-visible:ring-emerald-500/25 shadow-sm"
          />

          <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Tabs
              value={estadoFilter}
              onValueChange={handleEstadoChange}
              className="w-full sm:w-auto"
            >
              <TabsList className="flex w-full sm:w-auto h-9 gap-0.5 rounded-lg border border-border/70 bg-muted/70 p-0.5">
                <TabsTrigger
                  value="all"
                  className="flex-1 sm:flex-initial h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-teal-500/30 dark:data-[state=active]:bg-teal-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <ShieldCheck className="size-3.5" />
                  <span className="hidden sm:inline">Operativas</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoGarantia.PENDIENTE_COMPLETAR}
                  className="flex-1 sm:flex-initial h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 dark:data-[state=active]:bg-sky-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <ClipboardCheck className="size-3.5" />
                  <span className="hidden sm:inline">Pendientes</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoGarantia.ACTIVA}
                  className="flex-1 sm:flex-initial h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 dark:data-[state=active]:bg-emerald-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span className="hidden sm:inline">Activas</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoGarantia.VENCIDA}
                  className="flex-1 sm:flex-initial h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 dark:data-[state=active]:bg-amber-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <Clock3 className="size-3.5" />
                  <span className="hidden sm:inline">Vencidas</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoGarantia.ANULADA}
                  className="flex-1 sm:flex-initial h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-red-500/30 dark:data-[state=active]:bg-red-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <Ban className="size-3.5" />
                  <span className="hidden sm:inline">Anuladas</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <Popover open={filterPopoverOpen} onOpenChange={openFilterPopover}>
                <PopoverTrigger asChild>
                  <ToolbarFiltersButton
                    open={filterPopoverOpen}
                    activeCount={activeFilterCount}
                    className="flex-1 sm:flex-initial"
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={10}
                  className="w-[calc(100vw-2rem)] sm:w-[480px] max-w-lg rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
                >
                  <div className="border-b border-border/60 px-4 py-3">
                    <p className="text-sm font-semibold">Filtros</p>
                    <p className="text-xs text-muted-foreground">
                      Refina la lista visible de garantías
                    </p>
                  </div>

                  <div className="space-y-4 px-4 py-4">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Estado
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { value: "all", label: "Operativas" },
                          {
                            value: EstadoGarantia.PENDIENTE_COMPLETAR,
                            label: "Pendientes",
                          },
                          { value: EstadoGarantia.ACTIVA, label: "Activas" },
                          { value: EstadoGarantia.VENCIDA, label: "Vencidas" },
                          { value: EstadoGarantia.ANULADA, label: "Anuladas" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.01] active:scale-[0.97] active:duration-150",
                              draftEstadoFilter === option.value
                                ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-foreground"
                                : "border-border/60 bg-background hover:bg-muted/40",
                            )}
                            onClick={() =>
                              setDraftEstadoFilter(option.value as EstadoFilter)
                            }
                          >
                            <span
                              className={cn(
                                "flex size-4 items-center justify-center rounded-full border transition-colors",
                                draftEstadoFilter === option.value
                                  ? "border-[var(--accent)]"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              <span
                                className={cn(
                                  "size-2 rounded-full transition-colors",
                                  draftEstadoFilter === option.value
                                    ? "bg-[var(--accent)]"
                                    : "bg-transparent",
                                )}
                              />
                            </span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg text-xs text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted active:scale-95 active:duration-150"
                        onClick={clearFilterPopover}
                      >
                        Limpiar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                        onClick={applyFilterPopover}
                      >
                        Aplicar filtros
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {canDelete ? (
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
              ) : null}

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

      {viewMode === "list" ? (
        <ServerDataTable
          columns={columns}
          data={rows}
          total={data?.meta?.total ?? 0}
          page={page}
          limit={limit}
          isLoading={isLoading}
          isError={isError}
          errorMessage="No se pudo cargar la lista de garantías."
          onRetry={() => void refetch()}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          enableRowSelection={canDelete && selectionMode}
          enableColumnVisibility
          columnVisibilityStorageKey="erp:garantias:table-columns"
          fillAvailableHeight={!isMobile}
          bulkActionsBar={
            canDelete
              ? (selectedRows, clearSelection) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-xl text-xs"
                      onClick={() => {
                        exportGarantias(selectedRows as GarantiaListItem[]);
                        clearSelection();
                      }}
                    >
                      <Download className="size-3.5" /> Exportar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-xl text-xs"
                      onClick={() => {
                        printGarantias(selectedRows as GarantiaListItem[]);
                        clearSelection();
                      }}
                    >
                      <Printer className="size-3.5" /> Imprimir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setBulkDeleteIds(
                          (selectedRows as GarantiaListItem[]).map(
                            (row) => row.id,
                          ),
                        );
                        clearSelection();
                      }}
                    >
                      <Trash2 className="size-3.5" /> Eliminar
                    </Button>
                  </div>
                )
              : undefined
          }
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col">
          {isLoading ? (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-11 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-8 flex-1 rounded-lg" />
                      <Skeleton className="h-8 flex-1 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !rows.length ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <ShieldCheck className="size-12 opacity-20" />
              <p className="text-sm font-medium">No se encontraron garantías</p>
              <p className="text-xs opacity-70">
                Prueba ajustando la búsqueda o los filtros
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {rows.map((garantia, index) => (
                    <GarantiaCard
                      key={garantia.id}
                      garantia={garantia}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      canManageCasos={canManageCasos}
                      isSelected={selectionMode && selectedCards.has(garantia.id)}
                      animationDelay={Math.min(index * 55, 440)}
                      onToggleSelect={
                        selectionMode
                          ? () => toggleCardSelection(garantia.id)
                          : undefined
                      }
                      onView={() => setViewDetailId(garantia.id)}
                      onEdit={() =>
                        openEditGarantia(
                          garantia.id,
                          garantia.estado === EstadoGarantia.PENDIENTE_COMPLETAR
                            ? "complete"
                            : "edit",
                        )
                      }
                      onCreateCaso={() => openCreateCaso(garantia.id)}
                      onDelete={() => setDeleteId(garantia.id)}
                      search={search}
                    />
                  ))}
                </div>
              </div>

              {/* Anchored pagination wrapper matching Clientes */}
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
                      garantías
                    </p>
                  </div>

                  {(data?.meta?.total ?? 0) > limit && (
                    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95 disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => handlePageChange(1)}
                        title="Primera página"
                      >
                        <ChevronsLeft className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95 disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => handlePageChange(page - 1)}
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
                              onClick={() => handlePageChange(p as number)}
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
                        onClick={() => handlePageChange(page + 1)}
                      >
                        Siguiente
                        <ChevronRight className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95 disabled:opacity-50"
                        disabled={page * limit >= (data?.meta?.total ?? 0)}
                        onClick={() => handlePageChange(Math.ceil((data?.meta?.total ?? 0) / limit))}
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
                  onExport={handleExportSelectedCards}
                  onPrint={handlePrintSelectedCards}
                  onDelete={handleBulkDeleteCards}
                  onClear={() => setSelectedCards(new Set<string>())}
                />
              )}
            </>
          )}
        </div>
      )}

      <AlertDialog
        open={pendingDeleteIds.length > 0}
        onOpenChange={(open) =>
          !open ? (setDeleteId(null), setBulkDeleteIds([])) : null
        }
      >
        <AlertDialogContent className="w-full rounded-2xl p-6 sm:max-w-md">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => {
              setDeleteId(null);
              setBulkDeleteIds([]);
            }}
            className="absolute right-4 top-4 z-10 mt-0 size-6 border-0 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="relative flex flex-row items-start gap-4 space-y-0">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                {pendingDeleteIds.length === 1
                  ? "¿Eliminar garantía?"
                  : `¿Eliminar ${pendingDeleteIds.length} garantías?`}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-1">
                  <p>
                    Esta acción no se puede deshacer. Los registros
                    seleccionados se eliminarán del sistema.
                  </p>
                  {pendingDeleteIds.length === 1 && deleteTargetItem ? (
                    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-foreground/80">
                      <div className="font-medium">
                        {getGarantiaProductName(deleteTargetItem)}
                      </div>
                      <div className="mt-0.5 font-mono text-muted-foreground">
                        QR {deleteTargetItem.codigoQR}
                      </div>
                    </div>
                  ) : null}
                </div>
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0">
            <AlertDialogCancel className="mt-0 w-full rounded-xl sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteCasoData}
        onOpenChange={(open) => {
          if (!open) setDeleteCasoData(null);
        }}
      >
        <AlertDialogContent className="w-full rounded-2xl p-6 sm:max-w-md">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteCasoData(null)}
            className="absolute right-4 top-4 z-10 mt-0 size-6 border-0 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="relative flex flex-row items-start gap-4 space-y-0">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar caso?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    Esta acción elimina solo el caso registrado dentro de la
                    garantía. La garantía y el equipo permanecen intactos.
                  </p>
                  {deleteCasoData ? (
                    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-foreground/80">
                      <div className="line-clamp-3 font-medium">
                        {deleteCasoData.caso.descripcion}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {new Date(deleteCasoData.caso.createdAt).toLocaleString(
                          "es-PE",
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0">
            <AlertDialogCancel className="mt-0 w-full rounded-xl sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteCaso}
              className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              disabled={deleteCasoMutation.isPending}
            >
              {deleteCasoMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="flex max-h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  Nueva garantía
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  Registra cobertura, vigencia y datos base del equipo.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <GarantiaForm
              mode="create"
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editGarantiaId}
        onOpenChange={(open) => {
          if (!open) {
            setEditGarantiaId(null);
            setEditIntent("edit");
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
                {editIntent === "complete" ? (
                  <ClipboardCheck className="size-4 text-orange-600 dark:text-orange-400" />
                ) : (
                  <Pencil className="size-4 text-orange-600 dark:text-orange-400" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  {editIntent === "complete"
                    ? "Completar garantía"
                    : "Editar garantía"}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  {editIntent === "complete"
                    ? "Completa instalación y activa la cobertura del equipo vendido."
                    : "Actualiza los datos operativos de la garantía."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {isEditLoading ? (
              <div className="space-y-4 py-2">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-40 w-full rounded-2xl" />
              </div>
            ) : isEditError || !editGarantia ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-12 text-center text-sm text-muted-foreground">
                No se pudo cargar la garantía para edición.
              </div>
            ) : (
              <GarantiaForm
                mode="edit"
                defaultValues={{
                  equipoId: editGarantia.equipo.id,
                  ventaId: editGarantia.ventaId ?? undefined,
                  fechaInicio: toDateInputValue(editGarantia.fechaInicio),
                  fechaFin: toDateInputValue(editGarantia.fechaFin),
                  estado:
                    editIntent === "complete" &&
                    editGarantia.estado === EstadoGarantia.PENDIENTE_COMPLETAR
                      ? EstadoGarantia.ACTIVA
                      : editGarantia.estado,
                  cobertura: editGarantia.cobertura,
                  exclusiones: editGarantia.exclusiones ?? undefined,
                  fechaInstalacion: toDateInputValue(
                    editGarantia.fechaInstalacion,
                  ),
                  direccionInstalacion:
                    editGarantia.direccionInstalacion ?? undefined,
                  ubigeoInstalacion:
                    editGarantia.ubigeoInstalacion ?? undefined,
                  departamentoInstalacion:
                    editGarantia.departamentoInstalacion ?? undefined,
                  provinciaInstalacion:
                    editGarantia.provinciaInstalacion ?? undefined,
                  distritoInstalacion:
                    editGarantia.distritoInstalacion ?? undefined,
                  latitudInstalacion:
                    editGarantia.latitudInstalacion ?? undefined,
                  longitudInstalacion:
                    editGarantia.longitudInstalacion ?? undefined,
                  contactoInstalacion:
                    editGarantia.contactoInstalacion ?? undefined,
                  telefonoInstalacion:
                    editGarantia.telefonoInstalacion ?? undefined,
                  notasInstalacion:
                    editGarantia.notasInstalacion ?? undefined,
                  contadorMaxCopias: editGarantia.contadorMaxCopias ?? null,
                }}
                onSubmit={handleUpdate}
                isLoading={updateMutation.isPending}
                submitLabel={
                  editIntent === "complete"
                    ? "Completar y activar garantía"
                    : undefined
                }
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GarantiaDetalleModal
        id={viewDetailId}
        onClose={() => setViewDetailId(null)}
        onEdit={(garantia) => {
          openEditGarantia(
            garantia.id,
            garantia.estado === EstadoGarantia.PENDIENTE_COMPLETAR
              ? "complete"
              : "edit",
          );
        }}
        onCreateCaso={openCreateCaso}
        onUpdateCaso={openUpdateCaso}
        onDeleteCaso={openDeleteCaso}
        canEdit={canEdit}
        canManageCasos={canManageCasos}
      />

      <GarantiaCasoModal
        key={createCasoGarantiaId ?? "create-closed"}
        open={!!createCasoGarantiaId}
        mode="create"
        garantiaId={createCasoGarantiaId}
        onClose={() => setCreateCasoGarantiaId(null)}
        onSuccess={(garantiaId) => setViewDetailId(garantiaId)}
      />

      <GarantiaCasoModal
        key={
          updateCasoData
            ? `${updateCasoData.garantiaId}:${updateCasoData.caso.id}`
            : "update-closed"
        }
        open={!!updateCasoData}
        mode="update"
        garantiaId={updateCasoData?.garantiaId ?? null}
        caso={updateCasoData?.caso ?? null}
        onClose={() => setUpdateCasoData(null)}
        onSuccess={(garantiaId) => setViewDetailId(garantiaId)}
      />
    </div>
  );
}
