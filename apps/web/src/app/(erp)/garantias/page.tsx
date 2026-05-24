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
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCcw,
  Search,
  ShieldCheck,
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
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { usePageAutoRefresh } from "@/hooks/use-page-auto-refresh";
import {
  useCreateGarantia,
  useDeleteGarantia,
  useGarantia,
  useGarantias,
  useUpdateGarantia,
} from "@/hooks/use-garantias";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/layout/stat-card";
import { PageAutoRefreshControl } from "@/components/layout/page-auto-refresh-control";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const GARANTIAS_REFRESH_TOAST_ID = "garantias-refresh";

const ESTADO_LABELS: Record<EstadoGarantia, string> = {
  [EstadoGarantia.ACTIVA]: "Activa",
  [EstadoGarantia.VENCIDA]: "Vencida",
  [EstadoGarantia.ANULADA]: "Anulada",
};

const ESTADO_VARIANTS: Record<EstadoGarantia, string> = {
  [EstadoGarantia.ACTIVA]:
    "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
  [EstadoGarantia.VENCIDA]:
    "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  [EstadoGarantia.ANULADA]:
    "border-destructive/20 bg-destructive/10 text-destructive",
};

type EstadoFilter =
  | "all"
  | EstadoGarantia.ACTIVA
  | EstadoGarantia.VENCIDA
  | EstadoGarantia.ANULADA;

function hasNuevoParam() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("nuevo") === "1";
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
}: GarantiaCardProps) {
  const productName = getGarantiaProductName(garantia);

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3.5 rounded-xl border bg-card p-4 shadow-sm transition-all duration-150 animate-fade-up",
        isSelected
          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
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
            "absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-full text-muted-foreground/40 transition-opacity hover:bg-destructive/10 hover:text-destructive",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          title="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-3",
          onToggleSelect ? "pl-6 pr-7" : "pr-7",
        )}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-700 text-white shadow-sm dark:from-emerald-700 dark:to-teal-900">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold leading-tight"
            title={productName}
          >
            {productName}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            QR {garantia.codigoQR}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn("gap-1.5 text-xs", ESTADO_VARIANTS[garantia.estado])}
        >
          {garantia.estado === EstadoGarantia.ACTIVA ? (
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
        </Badge>

        <Badge
          variant={garantia.vigente ? "default" : "outline"}
          className={cn(
            "gap-1.5 text-xs",
            garantia.vigente
              ? "border-primary/20 bg-primary/10 text-primary"
              : "text-muted-foreground",
          )}
        >
          {garantia.vigente ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <Clock3 className="size-3" />
          )}
          {garantia.vigente ? "Vigente" : "No vigente"}
        </Badge>
      </div>

      <div className="flex flex-col gap-1 border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <QrCode className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="font-mono">{garantia.equipo.numeroSerie}</span>
          <span className="ml-auto text-[10px] text-muted-foreground/50">
            serie
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="truncate">
            {garantia.clienteNombre || "Sin cliente visible"}
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
          className="h-8 flex-1 gap-1.5 rounded-lg text-xs font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
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
            className="h-8 flex-1 gap-1.5 rounded-lg text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : null}

        {canManageCasos && garantia.estado === EstadoGarantia.ACTIVA ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
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
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border/60 bg-background/95 px-2 py-1.5 shadow-2xl ring-1 ring-black/5 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-2 px-2 py-0.5">
        <div className="flex size-6 min-w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {count}
        </div>
        <span className="whitespace-nowrap text-sm font-medium">
          seleccionada{count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded-xl text-xs"
        onClick={onExport}
      >
        <Download className="size-3.5" /> Exportar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded-xl text-xs"
        onClick={onPrint}
      >
        <Printer className="size-3.5" /> Imprimir
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" /> Eliminar
      </Button>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
        onClick={onClear}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export default function GarantiasPage() {
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
  const [viewMode] = useState<"list" | "grid">("list");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [openCreate, setOpenCreate] = useState(
    () => canCreateManual && hasNuevoParam(),
  );
  const [editGarantiaId, setEditGarantiaId] = useState<string | null>(null);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const [createCasoGarantiaId, setCreateCasoGarantiaId] = useState<
    string | null
  >(null);
  const [updateCasoData, setUpdateCasoData] = useState<{
    garantiaId: string;
    caso: GarantiaCasoItem;
  } | null>(null);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      estado: estadoFilter !== "all" ? estadoFilter : undefined,
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

  const autoRefresh = usePageAutoRefresh({
    scope: "garantias",
    toastLabel: "Garantías",
    manualToastMessage: "Lista actualizada",
    toastId: GARANTIAS_REFRESH_TOAST_ID,
  });
  const handleManualRefresh = autoRefresh.manualRefresh;

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
          toast.success("Garantía actualizada correctamente");
          setEditGarantiaId(null);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Error al actualizar la garantía");
        },
      });
    },
    [updateMutation],
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
          <span className="whitespace-nowrap font-mono text-sm">
            {row.original.equipo.numeroSerie}
          </span>
        ),
      },
      {
        id: "producto",
        header: "Producto",
        cell: ({ row }) => (
          <span
            className="block max-w-55 truncate"
            title={getGarantiaProductName(row.original)}
          >
            {row.original.equipo.producto.nombre}
            {row.original.equipo.producto.modelo ? (
              <span className="ml-1 text-xs text-muted-foreground">
                {row.original.equipo.producto.modelo}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: "codigoQR",
        header: "Código QR",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.codigoQR}</span>
        ),
      },
      {
        accessorKey: "clienteNombre",
        header: "Cliente",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.clienteNombre ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "whitespace-nowrap",
              ESTADO_VARIANTS[row.original.estado],
            )}
          >
            {ESTADO_LABELS[row.original.estado]}
          </Badge>
        ),
      },
      {
        id: "vigencia",
        header: "Vigencia",
        cell: ({ row }) => (
          <Badge
            variant={row.original.vigente ? "default" : "outline"}
            className={cn(
              "whitespace-nowrap",
              row.original.vigente
                ? "border-primary/20 bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
          >
            {row.original.vigente ? "Vigente" : "No vigente"}
          </Badge>
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
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
              onClick={() => setViewDetailId(row.original.id)}
            >
              <Eye className="size-3.5" />
              Ver
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg"
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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

                {canEdit ? (
                  <DropdownMenuItem
                    onClick={() => setEditGarantiaId(row.original.id)}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </DropdownMenuItem>
                ) : null}

                {canDelete ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteId(row.original.id)}
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [canEdit, canDelete, canManageCasos, openCreateCaso],
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="sr-only text-2xl font-semibold tracking-tight">
            Garantías
          </h1>
          <p className="text-sm text-muted-foreground">
            Controla vigencia, cobertura y el seguimiento de casos de cada
            equipo.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <PageAutoRefreshControl autoRefresh={autoRefresh} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-lg">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Más opciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleManualRefresh}>
                <RefreshCcw className="size-4" /> Actualizar lista
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportGarantias(rows)}>
                <Download className="size-4" /> Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canCreateManual ? (
            <Button
              onClick={() => setOpenCreate(true)}
              className="erp-page-primary-cta rounded-xl"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nueva garantía</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total garantías"
          value={statsTotal?.meta?.total}
          icon={ShieldCheck}
          index={0}
        />
        <StatCard
          label="Activas"
          value={statsActivas?.meta?.total}
          icon={CheckCircle2}
          color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          index={1}
        />
        <StatCard
          label="Vencidas"
          value={statsVencidas?.meta?.total}
          icon={Clock3}
          color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          index={2}
        />
        <StatCard
          label="Anuladas"
          value={statsAnuladas?.meta?.total}
          icon={Ban}
          color="bg-destructive/10 text-destructive"
          index={3}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full shrink-0 sm:w-72 lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por QR, serie, producto o cliente..."
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-9 w-full rounded-lg border-muted bg-muted/40 pl-9 pr-9 text-sm shadow-none transition-colors hover:bg-muted/80 focus-visible:border-ring focus-visible:ring-1"
            />
            {search ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                onClick={() => handleSearchChange("")}
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Tabs value={estadoFilter} onValueChange={handleEstadoChange}>
              <TabsList className="h-9 gap-0.5 rounded-lg border border-border/60 bg-muted/60 p-0.5">
                <TabsTrigger
                  value="all"
                  className="h-8 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <ShieldCheck className="size-3.5" />
                  <span className="hidden sm:inline">Todas</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoGarantia.ACTIVA}
                  className="h-8 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span className="hidden sm:inline">Activas</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoGarantia.VENCIDA}
                  className="h-8 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Clock3 className="size-3.5" />
                  <span className="hidden sm:inline">Vencidas</span>
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoGarantia.ANULADA}
                  className="h-8 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Ban className="size-3.5" />
                  <span className="hidden sm:inline">Anuladas</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Popover open={filterPopoverOpen} onOpenChange={openFilterPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant={filterPopoverOpen ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg text-xs"
                >
                  <Filter className="size-3.5" />
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFilterCount > 0 ? (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  ) : null}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      filterPopoverOpen && "rotate-180",
                    )}
                  />
                </Button>
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
                        { value: "all", label: "Todas" },
                        { value: EstadoGarantia.ACTIVA, label: "Activas" },
                        { value: EstadoGarantia.VENCIDA, label: "Vencidas" },
                        { value: EstadoGarantia.ANULADA, label: "Anuladas" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            draftEstadoFilter === option.value
                              ? "border-primary/40 bg-primary/5 text-foreground"
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
                                ? "border-primary"
                                : "border-muted-foreground/40",
                            )}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full transition-colors",
                                draftEstadoFilter === option.value
                                  ? "bg-primary"
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
                      className="h-8 rounded-lg text-xs text-muted-foreground"
                      onClick={clearFilterPopover}
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
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
                className="h-9 gap-1.5 rounded-lg text-xs"
                onClick={handleSelectionModeToggle}
              >
                <CheckCircle2 className="size-3.5" />
                {selectionMode ? "Cancelar selección" : "Seleccionar"}
              </Button>
            ) : null}
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
        <div className="min-h-0">
          {isLoading ? (
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
          ) : !rows.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <ShieldCheck className="size-12 opacity-20" />
              <p className="text-sm font-medium">No se encontraron garantías</p>
              <p className="text-xs opacity-70">
                Prueba ajustando la búsqueda o los filtros
              </p>
            </div>
          ) : (
            <>
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
                    onEdit={() => setEditGarantiaId(garantia.id)}
                    onCreateCaso={() => openCreateCaso(garantia.id)}
                    onDelete={() => setDeleteId(garantia.id)}
                  />
                ))}
              </div>

              {(data?.meta?.total ?? 0) > limit ? (
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {(page - 1) * limit + 1}-
                    {Math.min(page * limit, data?.meta?.total ?? 0)} de{" "}
                    {data?.meta?.total ?? 0} garantías
                  </p>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page <= 1}
                      onClick={() => handlePageChange(1)}
                      title="Primera"
                    >
                      <ChevronsLeft className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page <= 1}
                      onClick={() => handlePageChange(page - 1)}
                      title="Anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    {(() => {
                      const totalPages = Math.ceil(
                        (data?.meta?.total ?? 0) / limit,
                      );
                      const pages: Array<number | "..."> = [];

                      if (totalPages <= 7) {
                        for (let index = 1; index <= totalPages; index++)
                          pages.push(index);
                      } else {
                        pages.push(1);

                        if (page > 3) pages.push("...");

                        for (
                          let index = Math.max(2, page - 1);
                          index <= Math.min(totalPages - 1, page + 1);
                          index++
                        ) {
                          pages.push(index);
                        }

                        if (page < totalPages - 2) pages.push("...");

                        pages.push(totalPages);
                      }

                      return pages.map((pageItem, index) =>
                        pageItem === "..." ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="select-none px-1.5 text-sm text-muted-foreground"
                          >
                            ...
                          </span>
                        ) : (
                          <Button
                            key={pageItem}
                            variant={pageItem === page ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                              "size-8 rounded-lg text-xs font-medium",
                              pageItem === page && "pointer-events-none",
                            )}
                            onClick={() => handlePageChange(pageItem as number)}
                          >
                            {pageItem}
                          </Button>
                        ),
                      );
                    })()}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page * limit >= (data?.meta?.total ?? 0)}
                      onClick={() => handlePageChange(page + 1)}
                      title="Siguiente"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page * limit >= (data?.meta?.total ?? 0)}
                      onClick={() =>
                        handlePageChange(
                          Math.ceil((data?.meta?.total ?? 0) / limit),
                        )
                      }
                      title="Última"
                    >
                      <ChevronsRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {selectedCards.size > 0 ? (
                <FloatingSelectionBar
                  count={selectedCards.size}
                  onExport={handleExportSelectedCards}
                  onPrint={handlePrintSelectedCards}
                  onDelete={handleBulkDeleteCards}
                  onClear={() => setSelectedCards(new Set<string>())}
                />
              ) : null}
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
        onOpenChange={(open) => !open && setEditGarantiaId(null)}
      >
        <DialogContent className="flex max-h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
                <Pencil className="size-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  Editar garantía
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  Actualiza los datos operativos de la garantía.
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
                  estado: editGarantia.estado,
                  cobertura: editGarantia.cobertura,
                  exclusiones: editGarantia.exclusiones ?? undefined,
                }}
                onSubmit={handleUpdate}
                isLoading={updateMutation.isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GarantiaDetalleModal
        id={viewDetailId}
        onClose={() => setViewDetailId(null)}
        onEdit={(garantia) => {
          setViewDetailId(null);
          setEditGarantiaId(garantia.id);
        }}
        onCreateCaso={openCreateCaso}
        onUpdateCaso={openUpdateCaso}
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
