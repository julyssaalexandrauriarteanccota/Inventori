"use client";

import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCcw,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  TipoCliente,
  type ClienteListItem,
  type ClienteFormPayload,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  useCliente,
  useClientes,
  useDeleteCliente,
  useCreateCliente,
  useUpdateCliente,
} from "@/hooks/use-clientes";
import { useDebounce } from "@/hooks/use-debounce";
import { usePageAutoRefresh } from "@/hooks/use-page-auto-refresh";
import { PageAutoRefreshControl } from "@/components/layout/page-auto-refresh-control";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ErpBadge, ErpStatusBadge } from "@/components/erp-badges";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ClienteDetalleModal } from "@/components/modals/cliente-detalle-modal";
import { ClienteForm } from "@/components/forms/cliente-form";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const VIEW_MODE_STORAGE_KEY = "erp:clientes:view-mode";

const CLIENTES_REFRESH_TOAST_ID = "clientes-refresh";

function hasNuevoParam() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("nuevo") === "1";
}

function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

function isSystemGenericClient(
  c: Pick<ClienteListItem, "esGenerico" | "dni">,
): boolean {
  return c.esGenerico === true || c.dni === "00000000";
}

function getInitials(c: ClienteListItem): string {
  if (isSystemGenericClient(c)) return "PG";
  if (c.tipo === TipoCliente.EMPRESA)
    return (c.razonSocial ?? "E").slice(0, 2).toUpperCase();
  const n = (c.nombre ?? "").charAt(0);
  const a = (c.apellido ?? "").charAt(0);
  return (n + a).toUpperCase() || "CL";
}

function getDisplayName(c: ClienteListItem): string {
  if (isSystemGenericClient(c)) return "Público en General";
  if (c.tipo === TipoCliente.EMPRESA) return c.razonSocial ?? "—";
  return [c.nombre, c.apellido].filter(Boolean).join(" ") || "—";
}

function getDocumento(c: ClienteListItem): string {
  if (isSystemGenericClient(c)) return "Sistema · sin documento";
  if (c.tipo === TipoCliente.EMPRESA) return c.ruc ? `RUC ${c.ruc}` : "—";
  return c.dni ? `DNI ${c.dni}` : "—";
}

function getUbicacion(c: ClienteListItem): string {
  return (
    [c.distrito, c.provincia, c.departamento].filter(Boolean).join(" / ") ||
    c.direccion ||
    "—"
  );
}

function getTelefono(c: ClienteListItem): string {
  return c.celular ?? c.telefono ?? "";
}

type ClienteDocumentoValidation = NonNullable<
  ClienteListItem["validacionesSunat"]
>[number];

function getLatestDocumentoValidation(
  c: ClienteListItem,
): ClienteDocumentoValidation | null {
  return c.validacionesSunat?.[0] ?? null;
}

function getDocumentoFiscalStatus(c: ClienteListItem) {
  const validation = getLatestDocumentoValidation(c);
  if (isSystemGenericClient(c)) {
    return {
      label: "Público general",
      tone: "warning" as const,
      description: "Sin documento para boleta simple",
    };
  }

  if (!validation) {
    return {
      label: "Sin validar",
      tone: "neutral" as const,
      description:
        c.tipo === TipoCliente.EMPRESA
          ? "RUC pendiente de validación"
          : "DNI pendiente de validación",
    };
  }

  if (validation.estado === "VALIDO" || validation.estado === "ACTIVO") {
    return {
      label: "Validado",
      tone: "success" as const,
      description: validation.condicionDomicilio
        ? `Estado: ${validation.estado} · Condición: ${validation.condicionDomicilio}`
        : "Documento válido",
    };
  }

  if (validation.estado === "INVALIDO") {
    return {
      label: "Inválido",
      tone: "danger" as const,
      description: "Revisar documento antes de facturar",
    };
  }

  if (validation.estado === "ERROR") {
    return {
      label: "Error",
      tone: "danger" as const,
      description: "No se pudo validar el documento",
    };
  }

  return {
    label: "Pendiente",
    tone: "warning" as const,
    description: "Validación registrada como pendiente",
  };
}

function buildClienteCsvRows(rows: ClienteListItem[]) {
  const headers = [
    "Tipo",
    "Nombre/Razón Social",
    "Documento",
    "Email",
    "Teléfono",
    "Celular",
    "Dirección",
    "Distrito",
    "Provincia",
    "Departamento",
    "Validación documento",
    "Estado",
  ];

  const lines = rows.map((c) =>
    [
      c.tipo,
      getDisplayName(c),
      getDocumento(c),
      c.email ?? "",
      c.telefono ?? "",
      c.celular ?? "",
      c.direccion ?? "",
      c.distrito ?? "",
      c.provincia ?? "",
      c.departamento ?? "",
      getDocumentoFiscalStatus(c).label,
      c.activo ? "Activo" : "Inactivo",
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

function hasMapCoordinates(
  c: Pick<ClienteListItem, "latitud" | "longitud">,
): boolean {
  return c.latitud != null && c.longitud != null;
}

function getGoogleMapsUrl(
  c: Pick<ClienteListItem, "latitud" | "longitud">,
): string | null {
  if (!hasMapCoordinates(c)) {
    return null;
  }

  return `https://www.google.com/maps?q=${c.latitud},${c.longitud}`;
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

interface ClienteCardProps {
  cliente: ClienteListItem;
  canEdit: boolean;
  canDelete: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  animationDelay?: number;
  search?: string;
}

function ClienteCard({
  cliente: c,
  canEdit,
  canDelete,
  isSelected = false,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  animationDelay,
  search = "",
}: ClienteCardProps) {
  const isEmpresa = c.tipo === TipoCliente.EMPRESA;
  const isGeneric = isSystemGenericClient(c);
  const canEditCliente = canEdit && !isGeneric;
  const canDeleteCliente = canDelete && !isGeneric;
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3.5 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.97] active:duration-150 animate-fade-up",
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-md ring-2 ring-[var(--accent)]/20"
          : "border-border hover:border-ring/50 hover:shadow-md",
        onToggleSelect && "cursor-pointer",
      )}
      style={
        animationDelay !== undefined
          ? { animationDelay: `${animationDelay}ms` }
          : undefined
      }
      onClick={onToggleSelect}
    >
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

      {/* Delete corner */}
      {canDeleteCliente && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full text-muted-foreground/40 hover:bg-[var(--semantic-danger-soft)] hover:text-[var(--semantic-danger)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 active:scale-95 active:duration-150"
          title="Eliminar"
          aria-label="Eliminar cliente"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}

      {/* Header avatar + name */}
      <div
        className={cn(
          "flex items-center gap-3",
          onToggleSelect ? "pl-6 pr-7" : "pr-7",
        )}
      >
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm",
            isEmpresa
              ? "bg-[var(--accent)] text-[var(--accent-text)]"
              : "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20",
          )}
        >
          {getInitials(c)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate font-semibold text-sm leading-tight"
            title={getDisplayName(c)}
          >
            <HighlightedText text={getDisplayName(c)} search={search} />
          </p>
          <p className="truncate text-xs text-muted-foreground mt-0.5 font-mono">
            <HighlightedText text={getDocumento(c)} search={search} />
          </p>
        </div>
      </div>

      {/* Type + status badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <ErpBadge tone={isEmpresa ? "info" : "violet"} className="gap-1">
          {isEmpresa ? (
            <Building2 className="size-3" />
          ) : (
            <User className="size-3" />
          )}
          {isEmpresa ? "Empresa" : "Natural"}
        </ErpBadge>
        {isGeneric ? <ErpBadge tone="warning">Sistema</ErpBadge> : null}
        <ErpStatusBadge active={c.activo} />
      </div>

      {/* Contact details */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t border-border/40 pt-3">
        {c.email ? (
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="size-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">
              <HighlightedText text={c.email} search={search} />
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-40">
            <Mail className="size-3 shrink-0" />
            <span className="italic">Sin email</span>
          </div>
        )}
        {c.celular && (
          <div className="flex items-center gap-2">
            <Phone className="size-3 shrink-0 text-muted-foreground/60" />
            <span>
              <HighlightedText text={c.celular} search={search} />
            </span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              cel
            </span>
          </div>
        )}
        {c.telefono && c.telefono !== c.celular && (
          <div className="flex items-center gap-2">
            <Phone className="size-3 shrink-0 text-muted-foreground/60" />
            <span>
              <HighlightedText text={c.telefono} search={search} />
            </span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              tel
            </span>
          </div>
        )}
        {!c.celular && !c.telefono && (
          <div className="flex items-center gap-2 opacity-40">
            <Phone className="size-3 shrink-0" />
            <span className="italic">Sin teléfono</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto pt-0.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 gap-1.5 rounded-lg text-xs font-medium hover:bg-[var(--accent)] hover:text-[var(--accent-text)] hover:border-[var(--accent)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye className="size-3.5" /> Ver detalles
        </Button>
        {canEditCliente && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 gap-1.5 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            onClick={(e) => {
              e.stopPropagation();
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

// ── Floating selection bar ───────────────────────────────────────────────────

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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md shadow-2xl px-2 py-1.5 ring-1 ring-black/5 animate-in slide-in-from-bottom-3 duration-300 ease-[cubic-bezier(0.25,1.5,0.5,1)]">
      <div className="flex items-center gap-2 px-2 py-0.5">
        <div className="flex size-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold">
          {count}
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          seleccionado{count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="h-5 w-px bg-border mx-0.5" />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        onClick={onExport}
      >
        <Download className="size-3.5" /> Exportar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        onClick={onPrint}
      >
        <Printer className="size-3.5" /> Imprimir
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs text-[var(--semantic-danger)] hover:text-[var(--semantic-danger)] hover:bg-[var(--semantic-danger-soft)] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" /> Eliminar
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

// ── Page ───────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canDelete = hasRole(RolUsuario.ADMIN);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 300);

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [draftEstadoFilter, setDraftEstadoFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [openCreate, setOpenCreate] = useState(
    () => canEdit && hasNuevoParam(),
  );
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      tipo: tipoFilter !== "all" ? (tipoFilter as TipoCliente) : undefined,
      activo: estadoFilter === "all" ? undefined : estadoFilter === "activos",
    }),
    [page, limit, debouncedSearch, tipoFilter, estadoFilter],
  );

  const { data, isLoading, isError, refetch } = useClientes(filters);
  const clientes = useMemo(
    () =>
      (data?.data ?? []).filter((cliente) => !isSystemGenericClient(cliente)),
    [data?.data],
  );
  const { data: editClientRes, isLoading: isLoadingEditClient } = useCliente(
    editClientId || undefined,
  );

  // Stat queries (limit=1 just to get meta.total). We subtract the generic
  // customer client-side to stay compatible with running APIs that may still
  // parse esGenerico=false incorrectly.
  const { data: statsTotal } = useClientes({ limit: 1 });
  const { data: statsEmpresa } = useClientes({
    limit: 1,
    tipo: TipoCliente.EMPRESA,
  });
  const { data: statsNatural } = useClientes({
    limit: 1,
    tipo: TipoCliente.NATURAL,
  });
  const { data: statsActivo } = useClientes({
    limit: 1,
    activo: true,
  });
  const { data: statsGeneric } = useClientes({ limit: 1, esGenerico: true });
  const genericCount = statsGeneric?.meta?.total ?? 0;
  const normalizedSearch = debouncedSearch.trim().toLowerCase();
  const genericMatchesCurrentFilters =
    (tipoFilter === "all" || tipoFilter === TipoCliente.NATURAL) &&
    (estadoFilter === "all" || estadoFilter === "activos") &&
    (!normalizedSearch ||
      ["público", "publico", "general", "00000000", "sistema"].some((value) =>
        value.includes(normalizedSearch),
      ));
  const visibleTotal = Math.max(
    (data?.meta?.total ?? 0) -
      (genericMatchesCurrentFilters ? genericCount : 0),
    0,
  );
  const totalClientes = Math.max(
    (statsTotal?.meta?.total ?? 0) - genericCount,
    0,
  );
  const totalNaturales = Math.max(
    (statsNatural?.meta?.total ?? 0) - genericCount,
    0,
  );
  const totalActivos = Math.max(
    (statsActivo?.meta?.total ?? 0) - genericCount,
    0,
  );

  const deleteMutation = useDeleteCliente();
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente(editClientId || "");

  const autoRefresh = usePageAutoRefresh({
    scope: "clientes",
    toastLabel: "Clientes",
    manualToastMessage: "Lista actualizada",
    toastId: CLIENTES_REFRESH_TOAST_ID,
  });
  const handleManualRefresh = autoRefresh.manualRefresh;

  const handleCreate = useCallback(
    (formData: ClienteFormPayload) => {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Cliente creado correctamente");
          setOpenCreate(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al crear el cliente");
        },
      });
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (formData: ClienteFormPayload) => {
      updateMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Cliente actualizado correctamente");
          setEditClientId(null);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al actualizar el cliente");
        },
      });
    },
    [updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    const cliente = clientes.find((item) => item.id === deleteId);
    if (cliente && isSystemGenericClient(cliente)) {
      toast.info("El cliente genérico del sistema no se puede eliminar");
      setDeleteId(null);
      return;
    }

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Cliente eliminado");
        setDeleteId(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || "Error al eliminar");
      },
    });
  }, [clientes, deleteId, deleteMutation]);

  const handleBulkDelete = useCallback(() => {
    const ids = bulkDeleteIds.filter((id) => {
      const cliente = clientes.find((item) => item.id === id);
      return !cliente || !isSystemGenericClient(cliente);
    });

    if (!ids.length) {
      toast.info("No hay clientes editables seleccionados para eliminar");
      setBulkDeleteIds([]);
      return;
    }

    let done = 0;
    ids.forEach((id) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          done++;
          if (done === ids.length) {
            toast.success(`${done} clientes eliminados`);
            setBulkDeleteIds([]);
          }
        },
        onError: () => {
          toast.error(`Error al eliminar cliente`);
        },
      });
    });
  }, [bulkDeleteIds, clientes, deleteMutation]);

  const handleExportCSV = useCallback(() => {
    const rows = clientes;
    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }
    const csv = buildClienteCsvRows(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado correctamente");
  }, [clientes]);

  const handleExportSelectedCards = useCallback(() => {
    const rows = clientes.filter((c) => selectedCards.has(c.id));
    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }
    const csv = buildClienteCsvRows(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes-seleccionados.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} clientes exportados`);
  }, [clientes, selectedCards]);

  const handlePrintSelectedCards = useCallback(() => {
    const rows = clientes.filter((c) => selectedCards.has(c.id));
    if (!rows.length) {
      toast.error("No hay clientes seleccionados");
      return;
    }
    toast.info(`Imprimiendo ${rows.length} clientes...`, { duration: 2000 });
  }, [clientes, selectedCards]);

  const handleBulkDeleteCards = useCallback(() => {
    const ids = clientes
      .filter((cliente) => selectedCards.has(cliente.id))
      .filter((cliente) => !isSystemGenericClient(cliente))
      .map((cliente) => cliente.id);

    if (!ids.length) {
      toast.info("No hay clientes editables seleccionados para eliminar");
      setSelectedCards(new Set());
      return;
    }

    setBulkDeleteIds(ids);
    setSelectedCards(new Set());
  }, [clientes, selectedCards]);

  const columns = useMemo<ColumnDef<ClienteListItem>[]>(
    () => [
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => (
          <ErpBadge
            tone={row.original.tipo === TipoCliente.EMPRESA ? "info" : "violet"}
            className="gap-1"
          >
            {row.original.tipo === TipoCliente.EMPRESA ? (
              <>
                <Building2 className="size-3" />
                Empresa
              </>
            ) : (
              <>
                <User className="size-3" />
                Natural
              </>
            )}
          </ErpBadge>
        ),
      },
      {
        id: "nombreCompleto",
        header: "Cliente",
        cell: ({ row }) => {
          const text = getDisplayName(row.original);
          return (
            <div className="flex flex-col min-w-0">
              <span
                className="block max-w-55 truncate font-semibold text-sm text-foreground"
                title={text}
              >
                <HighlightedText text={text} search={search} />
              </span>
              {row.original.esGenerico ? (
                <span className="text-xs text-[var(--semantic-warning)]">
                  Registro del sistema
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "documento",
        header: "Documento",
        cell: ({ row }) => {
          const doc = getDocumento(row.original);
          return (
            <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
              <HighlightedText text={doc} search={search} />
            </span>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.original.email;
          return email ? (
            <span className="block max-w-50 truncate text-sm" title={email}>
              <HighlightedText text={email} search={search} />
            </span>
          ) : (
            <span className="text-muted-foreground/50 text-xs">—</span>
          );
        },
      },
      {
        id: "telefono",
        header: "Teléfono",
        cell: ({ row }) => {
          const telefono = getTelefono(row.original);
          return telefono ? (
            <span className="whitespace-nowrap text-sm text-foreground font-medium">
              <HighlightedText text={telefono} search={search} />
            </span>
          ) : (
            <span className="text-muted-foreground/50 text-xs">—</span>
          );
        },
      },
      {
        id: "ubicacion",
        header: "Ubicación",
        cell: ({ row }) => {
          const ubicacion = getUbicacion(row.original);
          return (
            <span
              className="block max-w-56 truncate text-xs text-muted-foreground"
              title={ubicacion}
            >
              {ubicacion}
            </span>
          );
        },
      },
      {
        id: "validacionDocumento",
        header: "Doc. fiscal",
        cell: ({ row }) => {
          const status = getDocumentoFiscalStatus(row.original);
          return (
            <div className="flex flex-col gap-1">
              <ErpBadge tone={status.tone} className="w-fit">
                {status.label}
              </ErpBadge>
              <span
                className="max-w-40 truncate text-[11px] text-muted-foreground"
                title={status.description}
              >
                {status.description}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "activo",
        header: "Estado",
        cell: ({ row }) => <ErpStatusBadge active={row.original.activo} />,
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        size: 120,
        cell: ({ row }) => {
          const mapUrl = getGoogleMapsUrl(row.original);
          const isGeneric = isSystemGenericClient(row.original);
          const canEditCliente = canEdit && !isGeneric;
          const canDeleteCliente = canDelete && !isGeneric;

          return (
            <div className="flex items-center justify-end gap-1.5">
              {mapUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-95 active:duration-150"
                  title="Abrir ubicación en Google Maps"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    window.open(mapUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  <MapPin className="size-3.5" />
                  <span className="sr-only">
                    Abrir ubicación en Google Maps
                  </span>
                </Button>
              ) : null}

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

              {(canEditCliente || canDeleteCliente) && (
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
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuGroup>
                      {canEditCliente && (
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            setEditClientId(row.original.id);
                          }}
                        >
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                      )}
                      {canDeleteCliente && (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={(event) => {
                            event.preventDefault();
                            setDeleteId(row.original.id);
                          }}
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
    [canEdit, canDelete, search],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const handleTipoChange = useCallback((value: string) => {
    setTipoFilter(value);
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

  const openFilterPopover = useCallback(
    (open: boolean) => {
      setFilterPopoverOpen(open);
      if (open) {
        setDraftEstadoFilter(estadoFilter);
      }
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

  return (
    <div className="flex flex-col gap-6 w-full min-w-0 flex-1 min-h-0">
      <PageHeader
        title="Clientes"
        description="Gestiona la información de tus clientes"
        hideTitleVisually
        actions={
          <>
            <PageAutoRefreshControl autoRefresh={autoRefresh} />
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
            {canEdit ? (
              <Button
                onClick={() => setOpenCreate(true)}
                className="erp-page-primary-cta rounded-xl gap-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nuevo cliente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            ) : null}
          </>
        }
      />

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total clientes"
          value={statsTotal && statsGeneric ? totalClientes : undefined}
          icon={Users}
          index={0}
        />
        <StatCard
          label="Empresas"
          value={statsEmpresa?.meta?.total}
          icon={Building2}
          color="bg-[var(--semantic-info-soft)] text-[var(--semantic-info)]"
          index={1}
        />
        <StatCard
          label="Personas"
          value={statsNatural && statsGeneric ? totalNaturales : undefined}
          icon={User}
          color="bg-[var(--accent-soft)] text-[var(--accent)]"
          index={2}
        />
        <StatCard
          label="Activos"
          value={statsActivo && statsGeneric ? totalActivos : undefined}
          icon={CheckCircle2}
          color="bg-[var(--accent-soft)] text-[var(--accent)]"
          index={3}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por nombre, RUC, DNI…"
            className="sm:w-80 lg:w-96"
            inputClassName="border-border/60 bg-background/40 hover:bg-muted/60"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {/* Tipo tabs */}
            <Tabs value={tipoFilter} onValueChange={handleTipoChange}>
              <TabsList className="h-9 gap-0.5 rounded-lg border border-border bg-muted p-0.5">
                <TabsTrigger
                  value="all"
                  className="h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <Users className="size-3.5" />
                  <span className="hidden sm:inline">Todos</span>
                </TabsTrigger>
                <TabsTrigger
                  value={TipoCliente.EMPRESA}
                  className="h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <Building2 className="size-3.5" />
                  <span className="hidden sm:inline">Empresa</span>
                </TabsTrigger>
                <TabsTrigger
                  value={TipoCliente.NATURAL}
                  className="h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <User className="size-3.5" />
                  <span className="hidden sm:inline">Natural</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Floating filters */}
            <Popover open={filterPopoverOpen} onOpenChange={openFilterPopover}>
              <PopoverTrigger asChild>
                <ToolbarFiltersButton
                  open={filterPopoverOpen}
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
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Estado
                    </p>
                    <div className="grid gap-2">
                      {[
                        { value: "all", label: "Todos" },
                        { value: "activos", label: "Activos" },
                        { value: "inactivos", label: "Inactivos" },
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
                className="h-9 gap-1.5 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                onClick={handleSelectionModeToggle}
              >
                <CheckCircle2 className="size-3.5" />
                {selectionMode ? "Cancelar selección" : "Seleccionar"}
              </Button>
            )}

            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={handleViewModeChange}
              variant="outline"
              size="sm"
              className="gap-0 rounded-lg border border-border/60 bg-background/40 p-0.5"
            >
              <ToggleGroupItem
                value="list"
                className="h-8 rounded-md px-2.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
                aria-label="Vista tabla"
                title="Vista tabla"
              >
                <List className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="grid"
                className="h-8 rounded-md px-2.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
                aria-label="Vista tarjetas"
                title="Vista tarjetas"
              >
                <LayoutGrid className="size-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {viewMode === "list" ? (
        <ServerDataTable
          columns={columns}
          data={clientes}
          total={visibleTotal}
          page={page}
          limit={limit}
          isLoading={isLoading}
          isError={isError}
          errorMessage="No se pudo cargar la lista de clientes."
          onRetry={() => void refetch()}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          enableRowSelection={canDelete && selectionMode}
          enableColumnVisibility
          columnVisibilityStorageKey="erp:clientes:table-columns"
          bulkActionsBar={
            canDelete
              ? (selectedRows, clearSelection) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                      onClick={() => {
                        const rows = selectedRows as ClienteListItem[];
                        const csv = buildClienteCsvRows(rows);
                        const blob = new Blob([csv], {
                          type: "text/csv;charset=utf-8;",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "clientes.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`${rows.length} clientes exportados`);
                        clearSelection();
                      }}
                    >
                      <Download className="size-3.5" /> Exportar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-[var(--semantic-danger)] hover:text-[var(--semantic-danger)] hover:bg-[var(--semantic-danger-soft)] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                      onClick={() => {
                        const ids = (selectedRows as ClienteListItem[])
                          .filter((row) => !isSystemGenericClient(row))
                          .map((row) => row.id);

                        if (!ids.length) {
                          toast.info(
                            "No hay clientes editables seleccionados para eliminar",
                          );
                          return;
                        }

                        setBulkDeleteIds(ids);
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
        <div className="min-h-0">
          {isLoading ? (
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
          ) : !clientes.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Users className="size-12 opacity-20" />
              <p className="text-sm font-medium">No se encontraron clientes</p>
              <p className="text-xs opacity-70">
                Prueba ajustando los filtros de búsqueda
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {clientes.map((c, index) => (
                  <ClienteCard
                    key={c.id}
                    cliente={c}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    search={search}
                    isSelected={selectionMode && selectedCards.has(c.id)}
                    animationDelay={Math.min(index * 55, 440)}
                    onToggleSelect={
                      selectionMode && !isSystemGenericClient(c)
                        ? () =>
                            setSelectedCards((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.id)) next.delete(c.id);
                              else next.add(c.id);
                              return next;
                            })
                        : undefined
                    }
                    onView={() => setViewDetailId(c.id)}
                    onEdit={() => setEditClientId(c.id)}
                    onDelete={() => setDeleteId(c.id)}
                  />
                ))}
              </div>
              {visibleTotal > limit && (
                <div className="flex items-center justify-between mt-5">
                  <p className="text-xs text-muted-foreground">
                    {(page - 1) * limit + 1}–
                    {Math.min(page * limit, visibleTotal)} de {visibleTotal}{" "}
                    clientes
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-95 active:duration-150"
                      disabled={page <= 1}
                      onClick={() => setPage(1)}
                      title="Primera"
                      aria-label="Primera página"
                    >
                      <ChevronsLeft className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-95 active:duration-150"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      title="Anterior"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    {(() => {
                      const totalPages = Math.ceil(visibleTotal / limit);
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
                              "size-8 rounded-lg text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150",
                              p === page
                                ? "pointer-events-none"
                                : "hover:scale-[1.05]",
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
                      className="size-8 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-95 active:duration-150"
                      disabled={page * limit >= visibleTotal}
                      onClick={() => setPage(page + 1)}
                      title="Siguiente"
                      aria-label="Página siguiente"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-95 active:duration-150"
                      disabled={page * limit >= visibleTotal}
                      onClick={() => setPage(Math.ceil(visibleTotal / limit))}
                      title="Ultima"
                      aria-label="Última página"
                    >
                      <ChevronsRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
              {selectedCards.size > 0 && (
                <FloatingSelectionBar
                  count={selectedCards.size}
                  onExport={handleExportSelectedCards}
                  onPrint={handlePrintSelectedCards}
                  onDelete={handleBulkDeleteCards}
                  onClear={() => setSelectedCards(new Set())}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ── Delete confirm (single) ── */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => (!o ? setDeleteId(null) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-3xl p-6 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(null)}
            className="absolute right-4 top-4 size-6 text-muted-foreground hover:bg-muted mt-0 border-0 z-10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 active:scale-95 active:duration-150"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-950 ring-1 ring-red-500/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar cliente?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-1">
                  {(() => {
                    const c = clientes.find((x) => x.id === deleteId);
                    const nombre = c
                      ? c.tipo === "EMPRESA"
                        ? c.razonSocial
                        : [c.nombre, c.apellido].filter(Boolean).join(" ")
                      : null;
                    return nombre ? (
                      <p>
                        Se eliminará el registro de{" "}
                        <span className="font-medium text-foreground">
                          {nombre}
                        </span>
                        .
                      </p>
                    ) : null;
                  })()}
                  <p>Esta acción no se puede deshacer.</p>
                  <p className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive/80">
                    ⚠️ Los registros asociados (equipos, tickets) no se
                    eliminarán.
                  </p>
                </div>
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0 hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                "Eliminando..."
              ) : (
                <>
                  <Trash2 className="size-3.5" /> Sí, eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk delete confirm ── */}
      <AlertDialog
        open={bulkDeleteIds.length > 0}
        onOpenChange={(o) => (!o ? setBulkDeleteIds([]) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-3xl p-6 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-950 ring-1 ring-red-500/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar {bulkDeleteIds.length} clientes?
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  {bulkDeleteIds.length}
                </span>{" "}
                Esta acción no se puede deshacer. Se eliminarán{" "}
                {bulkDeleteIds.length} clientes seleccionados.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel
              className="w-full sm:w-auto rounded-xl mt-0 hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
              onClick={() => setBulkDeleteIds([])}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                "Eliminando..."
              ) : (
                <>
                  <Trash2 className="size-3.5" /> Sí, eliminar{" "}
                  {bulkDeleteIds.length}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create dialog ── */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col rounded-3xl border border-border/60 bg-background shadow-2xl data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent)]/10 ring-1 ring-[var(--accent)]/10">
                <Users className="size-4 text-[var(--accent)]" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Nuevo cliente
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Completa la información para registrar un nuevo cliente en el
                  sistema.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            <ClienteForm
              mode="create"
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog
        open={!!editClientId}
        onOpenChange={(open) => !open && setEditClientId(null)}
      >
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col rounded-3xl border border-border/60 bg-background shadow-2xl data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-500/10">
                <Pencil className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Editar cliente
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Actualiza los datos registrados de este cliente.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            {editClientRes?.data ? (
              <ClienteForm
                mode="edit"
                validacionFiscal={
                  Array.isArray(editClientRes.data.validacionesSunat)
                    ? (editClientRes.data
                        .validacionesSunat[0] as ClienteDocumentoValidation | undefined) ??
                      null
                    : null
                }
                defaultValues={{
                  tipo: editClientRes.data.tipo as TipoCliente,
                  nombre:
                    (editClientRes.data.nombre as string | null) ?? undefined,
                  apellido:
                    (editClientRes.data.apellido as string | null) ?? undefined,
                  razonSocial:
                    (editClientRes.data.razonSocial as string | null) ??
                    undefined,
                  dni: (editClientRes.data.dni as string | null) ?? undefined,
                  ruc: (editClientRes.data.ruc as string | null) ?? undefined,
                  email:
                    (editClientRes.data.email as string | null) ?? undefined,
                  telefono:
                    (editClientRes.data.telefono as string | null) ?? undefined,
                  celular:
                    (editClientRes.data.celular as string | null) ?? undefined,
                  direccion:
                    (editClientRes.data.direccion as string | null) ??
                    undefined,
                  distrito:
                    (editClientRes.data.distrito as string | null) ?? undefined,
                  provincia:
                    (editClientRes.data.provincia as string | null) ??
                    undefined,
                  departamento:
                    (editClientRes.data.departamento as string | null) ??
                    undefined,
                  referencia:
                    (editClientRes.data.referencia as string | null) ??
                    undefined,
                  notas:
                    (editClientRes.data.notas as string | null) ?? undefined,
                  latitud:
                    (editClientRes.data.latitud as number | null) ?? null,
                  longitud:
                    (editClientRes.data.longitud as number | null) ?? null,
                  activo: Boolean(editClientRes.data.activo),
                }}
                onSubmit={handleUpdate}
                isLoading={updateMutation.isPending}
              />
            ) : isLoadingEditClient ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Cargando cliente...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-destructive">
                <AlertCircle className="size-4" />
                No se pudo cargar el cliente para editar.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ClienteDetalleModal
        id={viewDetailId}
        onClose={() => setViewDetailId(null)}
        canEdit={canEdit}
        onEdit={(clienteId) => {
          setViewDetailId(null);
          setTimeout(() => setEditClientId(clienteId), 50);
        }}
      />
    </div>
  );
}
