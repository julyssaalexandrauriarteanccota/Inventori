"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { pdf } from "@react-pdf/renderer";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Cpu,
  Download,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Trash2,
  UserRound,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  EstadoComercialEquipo,
  EstadoEquipo,
  type EquipoListItem,
  type EquipoFormPayload,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { ProductoThumbnail } from "@/components/products/producto-thumbnail";
import { useAuth } from "@/hooks/use-auth";
import {
  useEquipos,
  useDeleteEquipo,
  useCreateEquipo,
  useUpdateEquipo,
  useEquipoFlujoActions,
} from "@/hooks/use-equipos";
import { useClientes } from "@/hooks/use-clientes";
import { useAlmacenes } from "@/hooks/use-inventario";
import { useDebounce } from "@/hooks/use-debounce";
import { usePublicBranding } from "@/hooks/use-public-branding";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ErpBadge } from "@/components/erp-badges";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EquipoForm } from "@/components/forms/equipo-form";
import { EquipoDetalleModal } from "@/components/modals/equipo-detalle-modal";
import { SearchableSelect } from "@/components/searchable-select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { EtiquetaProductoPdfDocument } from "@/components/products/etiqueta-producto-pdf";
import { api } from "@/lib/api";
import {
  fetchFirstAssetAsDataUrl,
  generateBarcodeDataUrl,
  generateQrDataUrl,
  resolveProductCodeValues,
} from "@/lib/product-code-utils";
import {
  getPrimaryProductImage,
  getProductImageCandidates,
} from "@/lib/product-images";
import type { ProductoDetailItem, ProductoListItem } from "@erp/shared";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const VIEW_MODE_STORAGE_KEY = "erp:equipos:view-mode";

const ESTADO_LABELS: Record<EstadoEquipo, string> = {
  [EstadoEquipo.ACTIVO]: "Activo",
  [EstadoEquipo.EN_REPARACION]: "En reparación",
  [EstadoEquipo.BAJA]: "Baja",
};

const ESTADO_BADGE_TONES: Record<
  EstadoEquipo,
  "success" | "warning" | "danger"
> = {
  [EstadoEquipo.ACTIVO]: "success",
  [EstadoEquipo.EN_REPARACION]: "warning",
  [EstadoEquipo.BAJA]: "danger",
};

const ESTADO_COMERCIAL_LABELS: Record<EstadoComercialEquipo, string> = {
  [EstadoComercialEquipo.DISPONIBLE]: "Disponible",
  [EstadoComercialEquipo.VENDIDO]: "Vendido",
  [EstadoComercialEquipo.ALQUILADO]: "Alquilado",
  [EstadoComercialEquipo.RESERVADO]: "Reservado",
  [EstadoComercialEquipo.EN_REPARACION]: "En reparación",
  [EstadoComercialEquipo.USO_INTERNO]: "Uso interno",
  [EstadoComercialEquipo.BAJA]: "Baja",
};

const ESTADO_COMERCIAL_BADGE_TONES: Record<
  EstadoComercialEquipo,
  "success" | "warning" | "danger" | "info" | "violet" | "neutral"
> = {
  [EstadoComercialEquipo.DISPONIBLE]: "success",
  [EstadoComercialEquipo.VENDIDO]: "neutral",
  [EstadoComercialEquipo.ALQUILADO]: "violet",
  [EstadoComercialEquipo.RESERVADO]: "info",
  [EstadoComercialEquipo.EN_REPARACION]: "warning",
  [EstadoComercialEquipo.USO_INTERNO]: "info",
  [EstadoComercialEquipo.BAJA]: "danger",
};

const ESTADO_COMERCIAL_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: EstadoComercialEquipo.DISPONIBLE, label: "Disponible" },
  { value: EstadoComercialEquipo.RESERVADO, label: "Reservado" },
  { value: EstadoComercialEquipo.USO_INTERNO, label: "Uso interno" },
  { value: EstadoComercialEquipo.VENDIDO, label: "Vendido" },
  { value: EstadoComercialEquipo.ALQUILADO, label: "Alquilado" },
  { value: EstadoComercialEquipo.EN_REPARACION, label: "Reparación" },
  { value: EstadoComercialEquipo.BAJA, label: "Baja" },
] as const;

function hasNuevoParam() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("nuevo") === "1";
}

function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

function renderEquipoEstadoBadge(estado: EstadoEquipo) {
  const styles = {
    [EstadoEquipo.ACTIVO]: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
      dot: "bg-emerald-500",
    },
    [EstadoEquipo.EN_REPARACION]: {
      bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
      dot: "bg-amber-500",
    },
    [EstadoEquipo.BAJA]: {
      bg: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
      dot: "bg-red-500",
    },
  }[estado];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.01em] whitespace-nowrap shadow-none",
        styles.bg
      )}
    >
      <span className={cn("inline-flex size-1.5 rounded-full shrink-0", styles.dot)} />
      {ESTADO_LABELS[estado]}
    </span>
  );
}

function renderEstadoComercialBadge(estado: EstadoComercialEquipo) {
  const styles = {
    [EstadoComercialEquipo.DISPONIBLE]: {
      bg: "bg-emerald-500 shadow-emerald-500/30",
      icon: CheckCircle2,
    },
    [EstadoComercialEquipo.RESERVADO]: {
      bg: "bg-blue-500 shadow-blue-500/30",
      icon: Clock,
    },
    [EstadoComercialEquipo.USO_INTERNO]: {
      bg: "bg-indigo-500 shadow-indigo-500/30",
      icon: Warehouse,
    },
    [EstadoComercialEquipo.VENDIDO]: {
      bg: "bg-slate-500 shadow-slate-500/30",
      icon: Cpu,
    },
    [EstadoComercialEquipo.ALQUILADO]: {
      bg: "bg-violet-500 shadow-violet-500/30",
      icon: UserRound,
    },
    [EstadoComercialEquipo.EN_REPARACION]: {
      bg: "bg-amber-500 shadow-amber-500/30",
      icon: Wrench,
    },
    [EstadoComercialEquipo.BAJA]: {
      bg: "bg-red-500 shadow-red-500/30",
      icon: Trash2,
    },
  }[estado];

  const Icon = styles.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-sm transition-all duration-200",
        styles.bg
      )}
    >
      <Icon className="size-3 shrink-0" />
      {ESTADO_COMERCIAL_LABELS[estado]}
    </span>
  );
}


function getEquipoProductImage(equipo: EquipoListItem) {
  return getPrimaryProductImage(equipo.producto);
}

function getClienteNombre(cliente: EquipoListItem["clienteActual"]) {
  if (!cliente) return null;
  return (
    cliente.razonSocial ??
    ([cliente.nombre, cliente.apellido].filter(Boolean).join(" ") || null)
  );
}

function getDestinoEquipo(equipo: EquipoListItem) {
  return (
    equipo.almacen?.nombre ??
    getClienteNombre(equipo.clienteActual) ??
    equipo.ubicacion ??
    null
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

// ── Floating selection bar ───────────────────────────────────────────────────

interface FloatingBarProps {
  count: number;
  onExport: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onClear: () => void;
  isPrinting?: boolean;
}

function FloatingSelectionBar({
  count,
  onExport,
  onPrint,
  onDelete,
  onClear,
  isPrinting = false,
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
      <Button
        variant="ghost"
        className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        title="Imprimir etiquetas"
        disabled={isPrinting}
        onClick={onPrint}
      >
        {isPrinting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Printer className="size-3.5" />
        )}
        <span className="hidden sm:inline">Imprimir etiquetas</span>
      </Button>
      <Button
        variant="ghost"
        className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 text-[var(--semantic-danger)] hover:text-[var(--semantic-danger)] hover:bg-[var(--semantic-danger-soft)] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        title="Eliminar definitivo"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
        <span className="hidden sm:inline">Eliminar</span>
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

// ── Grid card ──────────────────────────────────────────────────────────────

interface EquipoCardProps {
  equipo: EquipoListItem;
  canEdit: boolean;
  canDelete: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
  onEdit: () => void;
  onDarBaja: () => void;
  onReactivar: () => void;
  onDelete: () => void;
  animationDelay?: number;
  search?: string;
}

function EquipoCard({
  equipo: e,
  canEdit,
  canDelete,
  isSelected = false,
  onToggleSelect,
  onView,
  onEdit,
  onDarBaja,
  onReactivar,
  onDelete,
  animationDelay,
  search = "",
}: EquipoCardProps) {
  const seriePrefix = e.numeroSerie.slice(0, 3).toUpperCase();
  const imageUrl = getEquipoProductImage(e);
  const destino = getDestinoEquipo(e);
  const gradientClass = {
    [EstadoEquipo.ACTIVO]:
      "bg-linear-to-br from-emerald-500 to-green-700 dark:from-emerald-700 dark:to-green-900",
    [EstadoEquipo.EN_REPARACION]:
      "bg-linear-to-br from-amber-500 to-orange-600 dark:from-amber-700 dark:to-orange-800",
    [EstadoEquipo.BAJA]:
      "bg-linear-to-br from-red-500 to-rose-600 dark:from-red-700 dark:to-rose-900",
  }[e.estado];

  const accentBar = {
    [EstadoEquipo.ACTIVO]: "from-emerald-400 via-emerald-500 to-emerald-600",
    [EstadoEquipo.EN_REPARACION]: "from-amber-400 via-amber-500 to-amber-600",
    [EstadoEquipo.BAJA]: "from-red-400 via-red-500 to-red-600",
  }[e.estado];

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
          onClick={(ev) => ev.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect()}
            className="size-4 shadow-sm"
          />
        </div>
      )}

      {/* Delete corner */}
      {canDelete && (
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full text-muted-foreground/40 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 active:scale-95 active:duration-150"
          title="Eliminar definitivo"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}

      {/* Header: avatar + name */}
      <div
        className={cn(
          "flex items-center gap-3 relative",
          onToggleSelect ? "pl-6 pr-7" : "pl-2 pr-7",
        )}
      >
        <ProductoThumbnail
          src={imageUrl}
          alt={e.producto?.nombre ?? e.numeroSerie}
          fallback={seriePrefix}
          size={44}
          rounded="xl"
          className={!imageUrl ? gradientClass : undefined}
        />
        <div className="min-w-0 flex-1">
          <p
            className="break-words whitespace-normal font-semibold text-sm leading-snug"
            title={e.producto?.nombre ?? "—"}
          >
            <HighlightedText text={e.producto?.nombre ?? "—"} search={search} />
          </p>
          <p className="truncate text-xs text-muted-foreground mt-0.5 font-mono">
            <HighlightedText text={e.numeroSerie} search={search} />
          </p>
        </div>
      </div>

      {/* Estado + marca badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        {renderEquipoEstadoBadge(e.estado)}
        {renderEstadoComercialBadge(e.estadoComercial)}
        {e.producto?.marca?.nombre ? (
          <ErpBadge tone="neutral">
            <HighlightedText text={e.producto.marca.nombre} search={search} />
          </ErpBadge>
        ) : null}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t border-border/40 pt-3 pl-2">
        {destino ? (
          <div className="flex items-center gap-2 min-w-0">
            {e.almacen ? (
              <Warehouse className="size-3 shrink-0 text-muted-foreground/60" />
            ) : (
              <MapPin className="size-3 shrink-0 text-muted-foreground/60" />
            )}
            <span className="truncate">
              <HighlightedText text={destino} search={search} />
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-40">
            <Warehouse className="size-3 shrink-0" />
            <span className="italic">Sin destino logístico</span>
          </div>
        )}
        {e.producto?.modelo && (
          <div className="flex items-center gap-2">
            <Cpu className="size-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">
              <HighlightedText text={e.producto.modelo} search={search} />
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-0.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 gap-1.5 rounded-lg text-xs font-medium border-border/80 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150 hover:bg-sky-500 hover:text-white hover:border-sky-500 dark:hover:bg-sky-500 dark:hover:border-sky-500"
          onClick={(ev) => {
            ev.stopPropagation();
            onView();
          }}
        >
          <Eye className="size-3.5" /> Ver ficha
        </Button>
        {canEdit && e.estadoComercial === EstadoComercialEquipo.BAJA ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 gap-1.5 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            onClick={(ev) => {
              ev.stopPropagation();
              onReactivar();
            }}
          >
            <RefreshCcw className="size-3.5" /> Reactivar
          </Button>
        ) : null}
        {canEdit &&
        e.estadoComercial !== EstadoComercialEquipo.BAJA &&
        e.estadoComercial !== EstadoComercialEquipo.VENDIDO &&
        e.estadoComercial !== EstadoComercialEquipo.ALQUILADO ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 gap-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            onClick={(ev) => {
              ev.stopPropagation();
              onDarBaja();
            }}
          >
            <Trash2 className="size-3.5" /> Baja
          </Button>
        ) : null}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 gap-1.5 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            onClick={(ev) => {
              ev.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="size-3.5" /> Editar
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function EquiposPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const { branding } = usePublicBranding();
  const canEdit = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canDelete = hasRole(RolUsuario.ADMIN);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [estadoComercialFilter, setEstadoComercialFilter] =
    useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [draftEstadoFilter, setDraftEstadoFilter] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 300);

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);
  const [deleteSerie, setDeleteSerie] = useState<string | null>(null);
  const [bulkDeleteSeries, setBulkDeleteSeries] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [openCreate, setOpenCreate] = useState(
    () => canEdit && hasNuevoParam(),
  );
  const [editEquipo, setEditEquipo] = useState<EquipoListItem | null>(null);
  const [viewDetailSerie, setViewDetailSerie] = useState<string | null>(null);
  const [printingEquipoId, setPrintingEquipoId] = useState<string | null>(null);
  const [assignEquipo, setAssignEquipo] = useState<EquipoListItem | null>(null);
  const [assignClienteId, setAssignClienteId] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [reactivarEquipo, setReactivarEquipo] = useState<EquipoListItem | null>(
    null,
  );
  const [reactivarAlmacenId, setReactivarAlmacenId] = useState("");

  const brandingIdentity = branding?.identity;

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      estadoComercial:
        estadoComercialFilter !== "all"
          ? (estadoComercialFilter as EstadoComercialEquipo)
          : undefined,
      estado: estadoFilter !== "all" ? (estadoFilter as EstadoEquipo) : undefined,
    }),
    [page, limit, debouncedSearch, estadoComercialFilter, estadoFilter],
  );

  const { data, isLoading, isError, refetch } = useEquipos(filters);

  // Stat queries
  const { data: statsTotal } = useEquipos({ page: 1, limit: 1 });
  const { data: statsDisponible } = useEquipos({
    page: 1, limit: 1,
    estadoComercial: EstadoComercialEquipo.DISPONIBLE,
  });
  const { data: statsVendido } = useEquipos({
    page: 1, limit: 1,
    estadoComercial: EstadoComercialEquipo.VENDIDO,
  });
  const { data: statsBaja } = useEquipos({
    page: 1, limit: 1,
    estadoComercial: EstadoComercialEquipo.BAJA,
  });

  const deleteMutation = useDeleteEquipo();
  const createMutation = useCreateEquipo();
  const updateMutation = useUpdateEquipo(editEquipo?.numeroSerie || "");
  const flujoMutation = useEquipoFlujoActions();
  const { data: almacenesData } = useAlmacenes();
  const { data: clientesData } = useClientes({
    search: clienteSearch || undefined,
    limit: 20,
    activo: true,
  });
  const clienteOptions = useMemo(
    () =>
      (clientesData?.data ?? []).map((cliente) => ({
        value: cliente.id,
        label:
          cliente.razonSocial ||
          [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
          cliente.ruc ||
          cliente.dni ||
          "Cliente sin nombre",
      })),
    [clientesData],
  );
  const almacenOptions = useMemo(
    () =>
      (almacenesData?.data ?? [])
        .filter((almacen) => almacen.activo)
        .map((almacen) => ({
          value: almacen.id,
          label: `${almacen.nombre}${almacen.esPrincipal ? " · Principal" : ""}`,
        })),
    [almacenesData?.data],
  );

  const handleCreate = useCallback(
    (formData: EquipoFormPayload) => {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Equipo registrado correctamente");
          setOpenCreate(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al registrar el equipo");
        },
      });
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (formData: EquipoFormPayload) => {
      updateMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Equipo actualizado correctamente");
          setEditEquipo(null);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al actualizar el equipo");
        },
      });
    },
    [updateMutation],
  );

  const handleFlujoEquipo = useCallback(
    (
      equipo: EquipoListItem,
      action: "reservar" | "uso-interno" | "liberar" | "baja",
      successMessage: string,
    ) => {
      flujoMutation.mutate(
        { serie: equipo.numeroSerie, action },
        {
          onSuccess: () => toast.success(successMessage),
          onError: (err: Error) =>
            toast.error(err.message || "No se pudo actualizar el equipo"),
        },
      );
    },
    [flujoMutation],
  );

  const openReactivarEquipo = useCallback(
    (equipo: EquipoListItem) => {
      setReactivarEquipo(equipo);
      const principal = almacenOptions.find((option) =>
        option.label.includes("Principal"),
      );
      setReactivarAlmacenId(principal?.value ?? almacenOptions[0]?.value ?? "");
    },
    [almacenOptions],
  );

  const handleReactivarEquipo = useCallback(() => {
    if (!reactivarEquipo || !reactivarAlmacenId) {
      toast.error("Selecciona el almacén al que vuelve el equipo.");
      return;
    }

    flujoMutation.mutate(
      {
        serie: reactivarEquipo.numeroSerie,
        action: "reactivar",
        almacenId: reactivarAlmacenId,
      },
      {
        onSuccess: () => {
          toast.success("Equipo reactivado y disponible en stock");
          setReactivarEquipo(null);
          setReactivarAlmacenId("");
        },
        onError: (err: Error) =>
          toast.error(err.message || "No se pudo reactivar el equipo"),
      },
    );
  }, [flujoMutation, reactivarAlmacenId, reactivarEquipo]);

  const openAsignarCliente = useCallback((equipo: EquipoListItem) => {
    setAssignEquipo(equipo);
    setAssignClienteId("");
    setClienteSearch("");
  }, []);

  const handleAsignarCliente = useCallback(() => {
    if (!assignEquipo || !assignClienteId) {
      toast.error("Selecciona un cliente para crear el alquiler.");
      return;
    }

    router.push(
      `/alquileres?nuevo=1&equipoId=${encodeURIComponent(assignEquipo.id)}&clienteId=${encodeURIComponent(assignClienteId)}`,
    );
    setAssignEquipo(null);
    setAssignClienteId("");
  }, [assignEquipo, assignClienteId, router]);

  const handleDelete = useCallback(() => {
    if (!deleteSerie) return;
    deleteMutation.mutate(deleteSerie, {
      onSuccess: () => {
        toast.success("Equipo eliminado");
        setDeleteSerie(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || "Error al eliminar");
      },
    });
  }, [deleteSerie, deleteMutation]);

  const handleBulkDelete = useCallback(() => {
    if (!bulkDeleteSeries.length) return;
    let done = 0;
    bulkDeleteSeries.forEach((serie) => {
      deleteMutation.mutate(serie, {
        onSuccess: () => {
          done++;
          if (done === bulkDeleteSeries.length) {
            toast.success(`${done} equipos eliminados`);
            setBulkDeleteSeries([]);
          }
        },
        onError: () => {
          toast.error("Error al eliminar equipo");
        },
      });
    });
  }, [bulkDeleteSeries, deleteMutation]);

  const handleExportCSV = useCallback(() => {
    const rows = data?.data ?? [];
    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }
    const headers = [
      "Nro. Serie",
      "Producto",
      "Marca",
      "Estado operativo",
      "Estado comercial",
      "Destino",
    ];
    const lines = rows.map((e) =>
      [
        e.numeroSerie,
        e.producto?.nombre ?? "",
        e.producto?.marca?.nombre ?? "",
        e.estado,
        e.estadoComercial,
        getDestinoEquipo(e) ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "equipos.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado correctamente");
  }, [data]);

  const handlePrintEtiquetaEquipo = useCallback(
    async (equipo: EquipoListItem) => {
      if (printingEquipoId) return;

      const loadingToastId = toast.loading(
        `Generando etiqueta de ${equipo.numeroSerie}...`,
      );
      const previewWindow = window.open("", "_blank");
      if (previewWindow) {
        previewWindow.document.title = `Etiqueta ${equipo.numeroSerie}`;
        previewWindow.document.body.style.margin = "0";
        previewWindow.document.body.style.fontFamily = "system-ui, sans-serif";
        previewWindow.document.body.innerHTML =
          '<div style="padding:24px;color:#475569">Generando PDF...</div>';
      }

      setPrintingEquipoId(equipo.id);

      try {
        const productoResp = await api.get<{
          data: ProductoDetailItem;
          meta: { timestamp: string };
        }>(`/productos/${equipo.producto.id}`);
        const producto: ProductoListItem = productoResp.data;

        const { barcodeValue, qrValue } = resolveProductCodeValues({
          sku: producto.sku,
          barcodeValue: producto.codigoBarras,
          qrValue: equipo.codigoQr ?? `EQP:${equipo.numeroSerie}`,
          showQr: true,
        });

        if (!barcodeValue) {
          throw new Error("El producto no tiene código de barras ni SKU.");
        }

        const [barcodeDataUrl, qrDataUrl, imageDataUrl, lecturasResp] =
          await Promise.all([
            generateBarcodeDataUrl(barcodeValue),
            qrValue ? generateQrDataUrl(qrValue) : Promise.resolve(null),
            fetchFirstAssetAsDataUrl(
              getProductImageCandidates(producto, equipo.producto),
            ),
            api
              .get<{
                data: Array<{
                  timestamp?: string;
                  paginasTotales?: number | null;
                  nivelTonerNegro?: number | null;
                  nivelTonerCian?: number | null;
                  nivelTonerMagenta?: number | null;
                  nivelTonerAmarillo?: number | null;
                  estadoFusor?: string | null;
                  erroresActivos?: string[] | null;
                }>;
              }>(
                `/equipos/${encodeURIComponent(equipo.numeroSerie)}/lecturas-snmp?limit=1`,
              )
              .catch(() => ({ data: [] })),
          ]);

        const ultimaLectura = lecturasResp.data?.[0] ?? null;

        const blob = await pdf(
          <EtiquetaProductoPdfDocument
            producto={producto}
            equipo={equipo}
            barcodeValue={barcodeValue}
            qrValue={qrValue}
            barcodeDataUrl={barcodeDataUrl}
            qrDataUrl={qrDataUrl}
            imageDataUrl={imageDataUrl}
            ultimaLectura={ultimaLectura}
            empresa={{
              nombre: brandingIdentity?.displayName,
              ruc: brandingIdentity?.taxId,
            }}
          />,
        ).toBlob();
        const url = URL.createObjectURL(blob);

        if (previewWindow) {
          previewWindow.location.href = url;
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.download = `etiqueta-${equipo.numeroSerie}.pdf`;
          a.click();
        }

        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

        toast.success(`Etiqueta PDF generada para ${equipo.numeroSerie}`, {
          id: loadingToastId,
        });
      } catch (error) {
        if (previewWindow) {
          previewWindow.close();
        }
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo generar la etiqueta del equipo.",
          { id: loadingToastId },
        );
      } finally {
        setPrintingEquipoId(null);
      }
    },
    [printingEquipoId, brandingIdentity?.displayName, brandingIdentity?.taxId],
  );

  const handleExportSelectedCards = useCallback(() => {
    const rows = (data?.data ?? []).filter((row) => selectedCards.has(row.numeroSerie));
    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }
    const headers = [
      "Nro. Serie",
      "Producto",
      "Marca",
      "Estado operativo",
      "Estado comercial",
      "Destino",
    ];
    const lines = rows.map((e) =>
      [
        e.numeroSerie,
        e.producto?.nombre ?? "",
        e.producto?.marca?.nombre ?? "",
        e.estado,
        e.estadoComercial,
        getDestinoEquipo(e) ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "equipos-seleccionados.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} equipos exportados`);
    setSelectedCards(new Set());
  }, [data?.data, selectedCards]);

  const handlePrintSelectedCards = useCallback(async () => {
    const rows = (data?.data ?? []).filter((row) => selectedCards.has(row.numeroSerie));
    if (!rows.length) {
      toast.error("No hay equipos seleccionados");
      return;
    }
    toast.info(`Imprimiendo etiquetas para ${rows.length} equipos...`, { duration: 3000 });
    for (const row of rows) {
      await handlePrintEtiquetaEquipo(row);
    }
    setSelectedCards(new Set());
  }, [data?.data, selectedCards, handlePrintEtiquetaEquipo]);

  const handleBulkDeleteCards = useCallback(() => {
    setBulkDeleteSeries(Array.from(selectedCards));
    setSelectedCards(new Set());
  }, [selectedCards]);

  const columns = useMemo<ColumnDef<EquipoListItem>[]>(
    () => [
      {
        accessorKey: "numeroSerie",
        header: "Nro. Serie",
        cell: ({ row }) => (
          <span className="font-mono text-sm whitespace-nowrap text-muted-foreground">
            <HighlightedText text={row.original.numeroSerie} search={search} />
          </span>
        ),
      },
      {
        id: "producto",
        header: "Producto",
        cell: ({ row }) => {
          const name = row.original.producto?.nombre ?? "—";
          const modelo = row.original.producto?.modelo;
          const imageUrl = getEquipoProductImage(row.original);
          const gradientClass = {
            [EstadoEquipo.ACTIVO]:
              "bg-linear-to-br from-emerald-500 to-green-700 dark:from-emerald-700 dark:to-green-900 text-white shadow-sm shadow-emerald-500/30",
            [EstadoEquipo.EN_REPARACION]:
              "bg-linear-to-br from-amber-500 to-orange-600 dark:from-amber-700 dark:to-orange-800 text-white shadow-sm shadow-amber-500/30",
            [EstadoEquipo.BAJA]:
              "bg-linear-to-br from-red-500 to-rose-600 dark:from-red-700 dark:to-rose-900 text-white shadow-sm shadow-red-500/30",
          }[row.original.estado];
          const seriePrefix = row.original.numeroSerie.slice(0, 3).toUpperCase();
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <ProductoThumbnail
                src={imageUrl}
                alt={name}
                fallback={seriePrefix}
                size={36}
                rounded="md"
                className={cn(!imageUrl ? gradientClass : "shadow-sm shadow-black/5")}
              />
              <div className="flex min-w-0 flex-col">
                <span
                  className="block max-w-55 truncate font-semibold text-sm text-foreground"
                  title={name}
                >
                  <HighlightedText text={name} search={search} />
                </span>
                {modelo && (
                  <span className="text-xs text-muted-foreground truncate max-w-55">
                    <HighlightedText text={modelo} search={search} />
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "marca",
        header: "Marca",
        cell: ({ row }) =>
          row.original.producto?.marca?.nombre ? (
            <ErpBadge tone="neutral" className="whitespace-nowrap">
              <HighlightedText text={row.original.producto.marca.nombre} search={search} />
            </ErpBadge>
          ) : (
            <span className="text-muted-foreground/50 text-xs">—</span>
          ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => renderEquipoEstadoBadge(row.original.estado),
      },
      {
        accessorKey: "estadoComercial",
        header: "Comercial",
        cell: ({ row }) =>
          renderEstadoComercialBadge(row.original.estadoComercial),
      },
      {
        id: "destino",
        header: "Destino",
        cell: ({ row }) => {
          const destino = getDestinoEquipo(row.original);
          const icon = row.original.almacen ? (
            <Warehouse className="size-3.5 shrink-0 text-sky-500 dark:text-sky-400" />
          ) : (
            <UserRound className="size-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
          );
          return destino ? (
            <span
              className="flex max-w-45 items-center gap-1.5 truncate text-xs text-muted-foreground"
              title={destino}
            >
              {icon}
              <span className="truncate">
                <HighlightedText text={destino} search={search} />
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground/50 text-xs">—</span>
          );
        },
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        size: 120,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-95 active:duration-150"
              title="Imprimir etiqueta"
              disabled={printingEquipoId === row.original.id}
              onClick={() => handlePrintEtiquetaEquipo(row.original)}
            >
              {printingEquipoId === row.original.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              <span className="sr-only">Imprimir etiqueta</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={() => setViewDetailSerie(row.original.numeroSerie)}
            >
              <Eye className="size-3.5" />
              Ver
            </Button>
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

              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  {canEdit && (
                    <>
                      {row.original.estadoComercial ===
                        EstadoComercialEquipo.BAJA && (
                        <DropdownMenuItem
                          onClick={() => openReactivarEquipo(row.original)}
                        >
                          <RefreshCcw className="size-4" /> Reactivar
                        </DropdownMenuItem>
                      )}
                      {row.original.estadoComercial ===
                        EstadoComercialEquipo.DISPONIBLE && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleFlujoEquipo(
                              row.original,
                              "reservar",
                              "Equipo reservado",
                            )
                          }
                        >
                          <CheckCircle2 className="size-4" /> Reservar
                        </DropdownMenuItem>
                      )}
                      {(row.original.estadoComercial ===
                        EstadoComercialEquipo.RESERVADO ||
                        row.original.estadoComercial ===
                          EstadoComercialEquipo.USO_INTERNO) && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleFlujoEquipo(
                              row.original,
                              "liberar",
                              "Equipo disponible nuevamente",
                            )
                          }
                        >
                          <X className="size-4" /> Liberar
                        </DropdownMenuItem>
                      )}
                      {(row.original.estadoComercial ===
                        EstadoComercialEquipo.DISPONIBLE ||
                        row.original.estadoComercial ===
                          EstadoComercialEquipo.RESERVADO) && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleFlujoEquipo(
                              row.original,
                              "uso-interno",
                              "Equipo marcado para uso interno",
                            )
                          }
                        >
                          <Warehouse className="size-4" /> Uso interno
                        </DropdownMenuItem>
                      )}
                      {(row.original.estadoComercial ===
                        EstadoComercialEquipo.DISPONIBLE ||
                        row.original.estadoComercial ===
                          EstadoComercialEquipo.RESERVADO) && (
                        <DropdownMenuItem
                          onClick={() => openAsignarCliente(row.original)}
                        >
                          <UserRound className="size-4" /> Alquilar/asignar
                        </DropdownMenuItem>
                      )}
                      {(row.original.estadoComercial ===
                        EstadoComercialEquipo.DISPONIBLE ||
                        row.original.estadoComercial ===
                          EstadoComercialEquipo.RESERVADO) && (
                        <DropdownMenuItem
                          onClick={() => {
                            const params = new URLSearchParams({
                              equipoSerie: row.original.numeroSerie,
                            });
                            if (row.original.producto?.id) {
                              params.set("productoId", row.original.producto.id);
                            }
                            window.location.href = `/ventas/cotizaciones?${params.toString()}`;
                          }}
                        >
                          <Printer className="size-4" /> Cotizar/vender
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setEditEquipo(row.original)}
                      >
                        <Pencil className="size-4" /> Editar datos
                      </DropdownMenuItem>
                      {row.original.estadoComercial !==
                        EstadoComercialEquipo.BAJA &&
                        row.original.estadoComercial !==
                          EstadoComercialEquipo.VENDIDO &&
                        row.original.estadoComercial !==
                          EstadoComercialEquipo.ALQUILADO && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              handleFlujoEquipo(
                                row.original,
                                "baja",
                                "Equipo dado de baja",
                              )
                            }
                          >
                            <Trash2 className="size-4" /> Dar de baja
                          </DropdownMenuItem>
                        )}
                    </>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteSerie(row.original.numeroSerie)}
                    >
                      <Trash2 className="size-4" /> Eliminar definitivo
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
      search,
      handleFlujoEquipo,
      handlePrintEtiquetaEquipo,
      openReactivarEquipo,
      openAsignarCliente,
      printingEquipoId,
    ],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const handleEstadoComercialChange = useCallback((value: string) => {
    setEstadoComercialFilter(value);
    setPage(1);
  }, []);
  const handleEstadoChange = useCallback((value: string) => {
    setEstadoFilter(value);
    setPage(1);
  }, []);
  const handleLimitChange = useCallback((value: number) => {
    setLimit(value);
    setPage(1);
    setSelectedCards(new Set());
  }, []);
  const handleSelectionModeToggle = useCallback(() => {
    if (selectionMode) setSelectedCards(new Set());
    setSelectionMode((prev) => !prev);
  }, [selectionMode]);

  const openFilterPopover = useCallback(
    (open: boolean) => {
      setFilterPopoverOpen(open);
      if (open) setDraftEstadoFilter(estadoFilter);
    },
    [estadoFilter],
  );

  const applyFilterPopover = useCallback(() => {
    handleEstadoChange(draftEstadoFilter);
    setFilterPopoverOpen(false);
  }, [draftEstadoFilter, handleEstadoChange]);

  const clearFilterPopover = useCallback(() => {
    setDraftEstadoFilter("all");
    handleEstadoChange("all");
    setFilterPopoverOpen(false);
  }, [handleEstadoChange]);

  const activeFilterCount = estadoFilter !== "all" ? 1 : 0;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 flex-1 min-h-0">
      {/* Decorative backing glows — coordinated with stat-card palette */}
      <div className="pointer-events-none absolute -z-10 bg-sky-400/8 dark:bg-sky-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-emerald-400/6 dark:bg-emerald-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-violet-400/5 dark:bg-violet-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />
      <TopbarActions>
        <RealtimeStatus />
        {canEdit ? (
          <Button
            onClick={() => setOpenCreate(true)}
            className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nuevo equipo</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        ) : null}
      </TopbarActions>
      <h1 className="sr-only">Equipos</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total equipos"
          value={statsTotal?.meta?.total}
          icon={Monitor}
          theme="sky"
          subtitle="En sistema"
        />
        <StatCard
          label="Disponibles"
          value={statsDisponible?.meta?.total}
          icon={CheckCircle2}
          theme="emerald"
          subtitle="Listos para venta"
        />
        <StatCard
          label="Vendidos"
          value={statsVendido?.meta?.total}
          icon={Cpu}
          theme="indigo"
          subtitle="Transferidos"
        />
        <StatCard
          label="Dados de baja"
          value={statsBaja?.meta?.total}
          icon={Trash2}
          theme="slate"
          subtitle="Fuera de servicio"
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3.5 w-full min-w-0">
        {/* Row 1: Search and Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
          {/* Search */}
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por serie, producto…"
            className="w-full sm:w-80 lg:w-96"
            inputClassName="border-border bg-background hover:border-sky-400/60 dark:hover:border-sky-500/60 focus-visible:border-sky-500 dark:focus-visible:border-sky-400 focus-visible:ring-sky-400/25 dark:focus-visible:ring-sky-500/25 shadow-sm"
          />

          {/* Action buttons (Filtros, Seleccionar, ToggleGroup) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
            {/* Filtros popover */}
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
                className="w-[calc(100vw-2rem)] sm:w-70 max-w-xs rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">
                    Refina la lista visible
                  </p>
                </div>
                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Estado operativo
                    </p>
                    <div className="grid gap-2">
                      {[
                        { value: "all", label: "Todos" },
                        { value: EstadoEquipo.ACTIVO, label: "Activos" },
                        { value: EstadoEquipo.EN_REPARACION, label: "En reparación" },
                        { value: EstadoEquipo.BAJA, label: "De baja" },
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
                          onClick={() => setDraftEstadoFilter(option.value)}
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

            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value === "list" || value === "grid") {
                  setViewMode(value);
                  setSelectedCards(new Set());
                }
              }}
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

        {/* Row 2: Commercial status quick tabs - fully scrollable full width */}
        <div className="w-full overflow-hidden">
          <Tabs
            value={estadoComercialFilter}
            onValueChange={handleEstadoComercialChange}
            className="w-full"
          >
            <TabsList className="flex w-full h-9 gap-0.5 rounded-lg border border-border/70 bg-muted/70 p-0.5 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap">
              <TabsTrigger
                value="all"
                className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 dark:data-[state=active]:bg-sky-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Monitor className="size-3.5" />
                <span>Todos</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoComercialEquipo.DISPONIBLE}
                className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Disponible</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoComercialEquipo.RESERVADO}
                className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-blue-500/30 dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Clock className="size-3.5" />
                <span>Reservado</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoComercialEquipo.USO_INTERNO}
                className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Warehouse className="size-3.5" />
                <span>Uso interno</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoComercialEquipo.VENDIDO}
                className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-slate-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-slate-500/30 dark:data-[state=active]:bg-slate-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Cpu className="size-3.5" />
                <span>Vendido</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoComercialEquipo.ALQUILADO}
                className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-violet-500/30 dark:data-[state=active]:bg-violet-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <UserRound className="size-3.5" />
                <span>Alquilado</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoComercialEquipo.EN_REPARACION}
                className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Wrench className="size-3.5" />
                <span>Reparación</span>
              </TabsTrigger>
              <TabsTrigger
                value={EstadoComercialEquipo.BAJA}
                className="flex-1 sm:flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-red-500/30 dark:data-[state=active]:bg-red-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Trash2 className="size-3.5" />
                <span>Baja</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
          errorMessage="No se pudo cargar la lista de equipos."
          onRetry={() => void refetch()}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          enableRowSelection={canDelete && selectionMode}
          enableColumnVisibility
          columnVisibilityStorageKey="erp:equipos:table-columns"
          bulkActionsBar={
            canDelete
              ? (selectedRows, clearSelection) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-xl"
                      onClick={() => {
                        const rows = selectedRows as EquipoListItem[];
                        const headers = [
                          "Nro. Serie",
                          "Producto",
                          "Marca",
                          "Estado operativo",
                          "Estado comercial",
                          "Destino",
                        ];
                        const lines = rows.map((e) =>
                          [
                            e.numeroSerie,
                            e.producto?.nombre ?? "",
                            e.producto?.marca?.nombre ?? "",
                            e.estado,
                            e.estadoComercial,
                            getDestinoEquipo(e) ?? "",
                          ]
                            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                            .join(","),
                        );
                        const csv = [headers.join(","), ...lines].join("\n");
                        const blob = new Blob([csv], {
                          type: "text/csv;charset=utf-8;",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "equipos.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`${rows.length} equipos exportados`);
                        clearSelection();
                      }}
                    >
                      <Download className="size-3.5" /> Exportar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => {
                        setBulkDeleteSeries(
                          (selectedRows as EquipoListItem[]).map(
                            (r) => r.numeroSerie,
                          ),
                        );
                      }}
                    >
                      <Trash2 className="size-3.5" /> Eliminar definitivo
                    </Button>
                  </div>
                )
              : undefined
          }
        />
      ) : (
        <div className="min-h-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse"
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
          ) : !data?.data?.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Monitor className="size-12 opacity-20" />
              <p className="text-sm font-medium">No se encontraron equipos</p>
              <p className="text-xs opacity-70">
                Prueba ajustando los filtros de búsqueda
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.data.map((e, index) => (
                  <EquipoCard
                    key={e.numeroSerie}
                    equipo={e}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    isSelected={
                      selectionMode && selectedCards.has(e.numeroSerie)
                    }
                    animationDelay={Math.min(index * 55, 440)}
                    onToggleSelect={
                      selectionMode
                        ? () =>
                            setSelectedCards((prev) => {
                              const next = new Set(prev);
                              if (next.has(e.numeroSerie))
                                next.delete(e.numeroSerie);
                              else next.add(e.numeroSerie);
                              return next;
                            })
                        : undefined
                    }
                    onView={() => setViewDetailSerie(e.numeroSerie)}
                    onEdit={() => setEditEquipo(e)}
                    onDarBaja={() =>
                      handleFlujoEquipo(e, "baja", "Equipo dado de baja")
                    }
                    onReactivar={() => openReactivarEquipo(e)}
                    onDelete={() => setDeleteSerie(e.numeroSerie)}
                    search={search}
                  />
                ))}
              </div>
              {data.meta.total > limit && (
                <div className="flex items-center justify-between mt-5">
                  <p className="text-xs text-muted-foreground">
                    {(page - 1) * limit + 1}–
                    {Math.min(page * limit, data.meta.total)} de{" "}
                    {data.meta.total} equipos
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page <= 1}
                      onClick={() => setPage(1)}
                      title="Primera"
                    >
                      <ChevronsLeft className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      title="Anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    {(() => {
                      const totalPages = Math.ceil(data.meta.total / limit);
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
                            key={`e${i}`}
                            className="px-1.5 text-muted-foreground text-sm select-none"
                          >
                            …
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === page ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                              "size-8 rounded-lg text-xs font-medium",
                              p === page && "pointer-events-none",
                            )}
                            onClick={() => setPage(p as number)}
                          >
                            {p}
                          </Button>
                        ),
                      );
                    })()}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page * limit >= data.meta.total}
                      onClick={() => setPage(page + 1)}
                      title="Siguiente"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page * limit >= data.meta.total}
                      onClick={() =>
                        setPage(Math.ceil(data.meta.total / limit))
                      }
                      title="Última"
                    >
                      <ChevronsRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Delete confirm (single) ── */}
      <AlertDialog
        open={!!deleteSerie}
        onOpenChange={(o) => (!o ? setDeleteSerie(null) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteSerie(null)}
            className="absolute right-4 top-4 size-6 text-muted-foreground hover:bg-muted mt-0 border-0 z-10"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0 relative">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar equipo definitivamente?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Se ocultará el equipo con serie{" "}
                <span className="font-mono font-semibold">{deleteSerie}</span>.
                Para solo retirarlo del stock usa “Dar de baja”.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? "Eliminando..."
                : "Sí, eliminar definitivo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk delete confirm ── */}
      <AlertDialog
        open={bulkDeleteSeries.length > 0}
        onOpenChange={(o) => (!o ? setBulkDeleteSeries([]) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar definitivamente {bulkDeleteSeries.length} equipos?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Se ocultarán {bulkDeleteSeries.length} equipos seleccionados. Para
                solo retirarlos del stock usa “Dar de baja” por equipo.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel
              className="w-full sm:w-auto rounded-xl mt-0"
              onClick={() => setBulkDeleteSeries([])}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? "Eliminando..."
                : `Sí, eliminar definitivo ${bulkDeleteSeries.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create dialog ── */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <Plus className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Nuevo equipo propio
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Registra una unidad física de la empresa para stock, venta o
                  alquiler.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            <EquipoForm
              mode="create"
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog
        open={!!editEquipo}
        onOpenChange={(open) => !open && setEditEquipo(null)}
      >
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
                <Pencil className="size-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Editar equipo
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Modifica los datos del equipo.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            {editEquipo && (
              <EquipoForm
                mode="edit"
                defaultValues={{
                  numeroSerie: editEquipo.numeroSerie,
                  productoId: editEquipo.producto?.id ?? undefined,
                  almacenId: editEquipo.almacen?.id ?? undefined,
                  estado: editEquipo.estado,
                  estadoComercial: editEquipo.estadoComercial,
                  codigoQr: editEquipo.codigoQr ?? undefined,
                  firmware: editEquipo.firmware ?? undefined,
                  procedencia: editEquipo.procedencia ?? undefined,
                  contadorInicial: editEquipo.contadorInicial ?? undefined,
                  contadorActual: editEquipo.contadorActual ?? undefined,
                  fechaIngreso: editEquipo.fechaIngreso ?? undefined,
                  observacionEstado: editEquipo.observacionEstado ?? undefined,
                  ubicacion: editEquipo.ubicacion ?? undefined,
                  notas: editEquipo.notas ?? undefined,
                }}
                onSubmit={handleUpdate}
                isLoading={updateMutation.isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Assign/rent dialog ── */}
      <Dialog
        open={!!assignEquipo}
        onOpenChange={(open) => {
          if (!open) {
            setAssignEquipo(null);
            setAssignClienteId("");
          }
        }}
      >
        <DialogContent className="w-full sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Alquilar/asignar equipo propio</DialogTitle>
            <DialogDescription>
              Se creará un contrato mensual para cobrar cuota inicial,
              excedentes y soporte fuera de garantía desde Alquileres.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel>Equipo</FieldLabel>
              <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3 text-sm">
                <p className="font-mono font-medium">
                  {assignEquipo?.numeroSerie ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {assignEquipo?.producto?.nombre ?? "Equipo propio"}
                </p>
              </div>
            </Field>
            <Field>
              <FieldLabel>Cliente</FieldLabel>
              <SearchableSelect
                value={assignClienteId}
                onChange={setAssignClienteId}
                options={clienteOptions}
                placeholder="Seleccionar cliente"
                searchPlaceholder="Buscar cliente..."
                emptyLabel="No se encontraron clientes."
                ariaLabel="Seleccionar cliente para alquilar equipo"
                onSearchChange={setClienteSearch}
              />
            </Field>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssignEquipo(null);
                  setAssignClienteId("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAsignarCliente}
                disabled={!assignClienteId}
              >
                <UserRound className="size-4" />
                Crear alquiler
              </Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      {/* ── Reactivate dialog ── */}
      <Dialog
        open={!!reactivarEquipo}
        onOpenChange={(open) => {
          if (!open) {
            setReactivarEquipo(null);
            setReactivarAlmacenId("");
          }
        }}
      >
        <DialogContent className="w-full sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reactivar equipo dado de baja</DialogTitle>
            <DialogDescription>
              El equipo volverá a estar activo, disponible y sumará 1 unidad al
              stock del almacén seleccionado.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel>Equipo</FieldLabel>
              <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3 text-sm">
                <p className="font-mono font-medium">
                  {reactivarEquipo?.numeroSerie ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reactivarEquipo?.producto?.nombre ?? "Equipo propio"}
                </p>
              </div>
            </Field>
            <Field>
              <FieldLabel>Almacén de reingreso</FieldLabel>
              <SearchableSelect
                value={reactivarAlmacenId}
                onChange={setReactivarAlmacenId}
                options={almacenOptions}
                placeholder="Seleccionar almacén"
                searchPlaceholder="Buscar almacén..."
                emptyLabel="No se encontraron almacenes activos."
                ariaLabel="Seleccionar almacén para reactivar equipo"
                disabled={flujoMutation.isPending}
              />
            </Field>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReactivarEquipo(null);
                  setReactivarAlmacenId("");
                }}
                disabled={flujoMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleReactivarEquipo}
                disabled={!reactivarAlmacenId || flujoMutation.isPending}
              >
                {flujoMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCcw className="size-4" />
                )}
                Reactivar equipo
              </Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      {/* ── Detail modal ── */}
      <EquipoDetalleModal
        serie={viewDetailSerie}
        onClose={() => setViewDetailSerie(null)}
        onEdit={(eq) => {
          setViewDetailSerie(null);
          setTimeout(() => setEditEquipo(eq as unknown as EquipoListItem), 50);
        }}
        canEdit={canEdit}
      />

      {selectedCards.size > 0 && (
        <FloatingSelectionBar
          count={selectedCards.size}
          onExport={handleExportSelectedCards}
          onPrint={handlePrintSelectedCards}
          onDelete={handleBulkDeleteCards}
          onClear={() => setSelectedCards(new Set())}
          isPrinting={printingEquipoId !== null}
        />
      )}
    </div>
  );
}
