"use client";

import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
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
  Mail,
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
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  type ProveedorFormPayload,
  type ProveedorListItem,
} from "@erp/shared";

import { ProveedorForm } from "@/components/forms/proveedor-form";
import { ProveedorDetalleModal } from "@/components/modals/proveedor-detalle-modal";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useCreateProveedor,
  useDeleteProveedor,
  useProveedores,
  useUpdateProveedor,
} from "@/hooks/use-proveedores";

import { cn } from "@/lib/utils";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ErpStatusBadge } from "@/components/erp-badges";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const VIEW_MODE_STORAGE_KEY = "erp:proveedores:view-mode";



type ActivoFilter = "all" | "activos" | "inactivos";

function hasNuevoParam() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("nuevo") === "1";
}

function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

function getProveedorInitials(proveedor: ProveedorListItem): string {
  const words = proveedor.razonSocial.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  return proveedor.razonSocial.slice(0, 2).toUpperCase() || "PR";
}

interface ProveedorCardProps {
  proveedor: ProveedorListItem;
  canEdit: boolean;
  canDelete: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  animationDelay?: number;
}

function ProveedorCard({
  proveedor,
  canEdit,
  canDelete,
  isSelected = false,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  animationDelay,
}: ProveedorCardProps) {
  const showPrimaryPhone = proveedor.telefono;
  const showContactPhone =
    proveedor.contactoTelefono &&
    proveedor.contactoTelefono !== proveedor.telefono;

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
      {onToggleSelect && (
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
      )}

      {canDelete && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className={cn(
            "absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-full text-muted-foreground/40 transition-colors transition-opacity hover:bg-destructive/10 hover:text-destructive",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          title="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}

      <div
        className={cn(
          "flex items-center gap-3",
          onToggleSelect ? "pl-6 pr-7" : "pr-7",
        )}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white shadow-sm dark:from-blue-700 dark:to-blue-900">
          {getProveedorInitials(proveedor)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold leading-tight"
            title={proveedor.razonSocial}
          >
            {proveedor.razonSocial}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            RUC {proveedor.ruc}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ErpStatusBadge active={proveedor.activo} />
      </div>

      <div className="flex flex-col gap-1 border-t border-border/40 pt-3 text-xs text-muted-foreground">
        {proveedor.email ? (
          <div className="flex min-w-0 items-center gap-2">
            <Mail className="size-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{proveedor.email}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-40">
            <Mail className="size-3 shrink-0" />
            <span className="italic">Sin email</span>
          </div>
        )}

        {showPrimaryPhone ? (
          <div className="flex items-center gap-2">
            <Phone className="size-3 shrink-0 text-muted-foreground/60" />
            <span>{proveedor.telefono}</span>
            <span className="ml-auto text-[10px] text-muted-foreground/50">
              tel
            </span>
          </div>
        ) : null}

        {showContactPhone ? (
          <div className="flex items-center gap-2">
            <Phone className="size-3 shrink-0 text-muted-foreground/60" />
            <span>{proveedor.contactoTelefono}</span>
            <span className="ml-auto text-[10px] text-muted-foreground/50">
              contacto
            </span>
          </div>
        ) : null}

        {!showPrimaryPhone && !proveedor.contactoTelefono ? (
          <div className="flex items-center gap-2 opacity-40">
            <Phone className="size-3 shrink-0" />
            <span className="italic">Sin teléfono</span>
          </div>
        ) : null}

        {proveedor.contactoNombre ? (
          <div className="flex min-w-0 items-center gap-2">
            <User className="size-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{proveedor.contactoNombre}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-40">
            <User className="size-3 shrink-0" />
            <span className="italic">Sin contacto asignado</span>
          </div>
        )}
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
          Ver detalles
        </Button>
        {canEdit && (
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
        )}
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
          seleccionado{count !== 1 ? "s" : ""}
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

export default function ProveedoresPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canDelete = hasRole(RolUsuario.ADMIN);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [activoFilter, setActivoFilter] = useState<ActivoFilter>("all");
  const debouncedSearch = useDebounce(search, 300);

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [draftActivoFilter, setDraftActivoFilter] =
    useState<ActivoFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [openCreate, setOpenCreate] = useState(
    () => canEdit && hasNuevoParam(),
  );
  const [editItem, setEditItem] = useState<ProveedorListItem | null>(null);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      activo: activoFilter === "all" ? undefined : activoFilter === "activos",
    }),
    [page, limit, debouncedSearch, activoFilter],
  );

  const { data, isLoading, isError, refetch } = useProveedores(filters);

  const { data: statsTotal } = useProveedores({ limit: 1 });
  const { data: statsActivos } = useProveedores({ limit: 1, activo: true });
  const { data: statsInactivos } = useProveedores({ limit: 1, activo: false });

  const deleteMutation = useDeleteProveedor();
  const createMutation = useCreateProveedor();
  const updateMutation = useUpdateProveedor(editItem?.id || "");



  const handleCreate = useCallback(
    (formData: ProveedorFormPayload) => {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Proveedor creado correctamente");
          setOpenCreate(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Error al crear el proveedor");
        },
      });
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (formData: ProveedorFormPayload) => {
      updateMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Proveedor actualizado correctamente");
          setEditItem(null);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Error al actualizar el proveedor");
        },
      });
    },
    [updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Proveedor eliminado");
        setDeleteId(null);
      },
      onError: (error: Error) => {
        toast.error(error.message || "Error al eliminar");
      },
    });
  }, [deleteId, deleteMutation]);

  const handleBulkDelete = useCallback(() => {
    if (!bulkDeleteIds.length) return;

    let done = 0;

    bulkDeleteIds.forEach((id) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          done++;

          if (done === bulkDeleteIds.length) {
            toast.success(`${done} proveedores eliminados`);
            setBulkDeleteIds([]);
          }
        },
        onError: () => {
          toast.error("Error al eliminar proveedor");
        },
      });
    });
  }, [bulkDeleteIds, deleteMutation]);

  const handleExportCSV = useCallback(() => {
    const rows = data?.data ?? [];

    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "Razón social",
      "RUC",
      "Email",
      "Teléfono",
      "Teléfono contacto",
      "Contacto",
      "Estado",
    ];
    const lines = rows.map((proveedor) =>
      [
        proveedor.razonSocial,
        proveedor.ruc,
        proveedor.email ?? "",
        proveedor.telefono ?? "",
        proveedor.contactoTelefono ?? "",
        proveedor.contactoNombre ?? "",
        proveedor.activo ? "Activo" : "Inactivo",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "proveedores.csv";
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Exportado correctamente");
  }, [data]);

  const handleExportSelectedCards = useCallback(() => {
    const rows = (data?.data ?? []).filter((proveedor) =>
      selectedCards.has(proveedor.id),
    );

    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "Razón social",
      "RUC",
      "Email",
      "Teléfono",
      "Teléfono contacto",
      "Contacto",
      "Estado",
    ];
    const lines = rows.map((proveedor) =>
      [
        proveedor.razonSocial,
        proveedor.ruc,
        proveedor.email ?? "",
        proveedor.telefono ?? "",
        proveedor.contactoTelefono ?? "",
        proveedor.contactoNombre ?? "",
        proveedor.activo ? "Activo" : "Inactivo",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "proveedores-seleccionados.csv";
    link.click();

    URL.revokeObjectURL(url);
    toast.success(`${rows.length} proveedores exportados`);
  }, [data, selectedCards]);

  const handlePrintSelectedCards = useCallback(() => {
    const rows = (data?.data ?? []).filter((proveedor) =>
      selectedCards.has(proveedor.id),
    );

    if (!rows.length) {
      toast.error("No hay proveedores seleccionados");
      return;
    }

    toast.info(`Imprimiendo ${rows.length} proveedores...`, { duration: 2000 });
  }, [data, selectedCards]);

  const handleBulkDeleteCards = useCallback(() => {
    setBulkDeleteIds(Array.from(selectedCards));
    setSelectedCards(new Set());
  }, [selectedCards]);

  const columns = useMemo<ColumnDef<ProveedorListItem>[]>(
    () => [
      {
        accessorKey: "razonSocial",
        header: "Razón social",
        cell: ({ row }) => (
          <span
            className="block max-w-[220px] truncate font-medium"
            title={row.original.razonSocial}
          >
            {row.original.razonSocial}
          </span>
        ),
      },
      {
        accessorKey: "ruc",
        header: "RUC",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-sm">
            {row.original.ruc}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span
            className="block max-w-[180px] truncate text-sm text-muted-foreground"
            title={row.original.email ?? ""}
          >
            {row.original.email || "—"}
          </span>
        ),
      },
      {
        accessorKey: "contactoNombre",
        header: "Contacto",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.contactoNombre || "—"}
          </span>
        ),
      },
      {
        accessorKey: "telefono",
        header: "Teléfono",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {row.original.telefono || row.original.contactoTelefono || "—"}
          </span>
        ),
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
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
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
                        onClick={() => setEditItem(row.original)}
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

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleActivoChange = useCallback((value: string) => {
    setActivoFilter(value as ActivoFilter);
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

    setSelectionMode((previous) => !previous);
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
        setDraftActivoFilter(activoFilter);
      }
    },
    [activoFilter],
  );

  const applyFilterPopover = useCallback(() => {
    handleActivoChange(draftActivoFilter);
    setFilterPopoverOpen(false);
  }, [draftActivoFilter, handleActivoChange]);

  const clearFilterPopover = useCallback(() => {
    setDraftActivoFilter("all");
    handleActivoChange("all");
    setFilterPopoverOpen(false);
  }, [handleActivoChange]);

  const activeFilterCount = activoFilter !== "all" ? 1 : 0;
  const deleteItemName = data?.data?.find(
    (proveedor) => proveedor.id === deleteId,
  )?.razonSocial;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
      <PageHeader
        title="Proveedores"
        description="Gestiona la información comercial y de contacto de tus proveedores"
        hideTitleVisually
        actions={
          <>
            <RealtimeStatus />
            <PageActionsMenu
              items={[
                {
                  label: "Actualizar lista",
                  icon: RefreshCcw,
                  onSelect: () => void refetch(),
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
                className="erp-page-primary-cta rounded-xl"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nuevo proveedor</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total proveedores"
          value={statsTotal?.meta?.total}
          icon={Building2}
          index={0}
        />
        <StatCard
          label="Activos"
          value={statsActivos?.meta?.total}
          icon={CheckCircle2}
          color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          index={1}
        />
        <StatCard
          label="Inactivos"
          value={statsInactivos?.meta?.total}
          icon={XCircle}
          color="bg-muted text-muted-foreground"
          index={2}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por razón social, RUC o contacto..."
            inputClassName="border-border/60 bg-background/40 hover:bg-muted/60"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Tabs value={activoFilter} onValueChange={handleActivoChange}>
              <TabsList className="h-9 gap-0.5 rounded-lg border border-border bg-muted p-0.5">
                <TabsTrigger
                  value="all"
                  className="h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Users className="size-3.5" />
                  <span className="hidden sm:inline">Todos</span>
                </TabsTrigger>
                <TabsTrigger
                  value="activos"
                  className="h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span className="hidden sm:inline">Activos</span>
                </TabsTrigger>
                <TabsTrigger
                  value="inactivos"
                  className="h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <XCircle className="size-3.5" />
                  <span className="hidden sm:inline">Inactivos</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
                className="w-[280px] rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
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
                            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            draftActivoFilter === option.value
                              ? "border-primary/40 bg-primary/5 text-foreground"
                              : "border-border/60 bg-background hover:bg-muted/40",
                          )}
                          onClick={() =>
                            setDraftActivoFilter(option.value as ActivoFilter)
                          }
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border transition-colors",
                              draftActivoFilter === option.value
                                ? "border-primary"
                                : "border-muted-foreground/40",
                            )}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full transition-colors",
                                draftActivoFilter === option.value
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

            {canDelete && (
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                size="sm"
                className="h-9 gap-1.5 rounded-lg text-xs"
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
                className="h-8 rounded-md px-2.5"
                aria-label="Vista tabla"
                title="Vista tabla"
              >
                <List className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="grid"
                className="h-8 rounded-md px-2.5"
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
          data={data?.data ?? []}
          total={data?.meta?.total ?? 0}
          page={page}
          limit={limit}
          isLoading={isLoading}
          isError={isError}
          errorMessage="No se pudo cargar la lista de proveedores."
          onRetry={() => void refetch()}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          enableRowSelection={canDelete && selectionMode}
          enableColumnVisibility
          columnVisibilityStorageKey="erp:proveedores:table-columns"
          bulkActionsBar={
            canDelete
              ? (selectedRows, clearSelection) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-xl text-xs"
                      onClick={() => {
                        const rows = selectedRows as ProveedorListItem[];
                        const headers = [
                          "Razón social",
                          "RUC",
                          "Email",
                          "Teléfono",
                          "Teléfono contacto",
                          "Contacto",
                          "Estado",
                        ];
                        const lines = rows.map((proveedor) =>
                          [
                            proveedor.razonSocial,
                            proveedor.ruc,
                            proveedor.email ?? "",
                            proveedor.telefono ?? "",
                            proveedor.contactoTelefono ?? "",
                            proveedor.contactoNombre ?? "",
                            proveedor.activo ? "Activo" : "Inactivo",
                          ]
                            .map(
                              (value) =>
                                `"${String(value).replace(/"/g, '""')}"`,
                            )
                            .join(","),
                        );
                        const csv = [headers.join(","), ...lines].join("\n");
                        const blob = new Blob([csv], {
                          type: "text/csv;charset=utf-8;",
                        });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");

                        link.href = url;
                        link.download = "proveedores.csv";
                        link.click();

                        URL.revokeObjectURL(url);
                        toast.success(`${rows.length} proveedores exportados`);
                        clearSelection();
                      }}
                    >
                      <Download className="size-3.5" /> Exportar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setBulkDeleteIds(
                          (selectedRows as ProveedorListItem[]).map(
                            (row) => row.id,
                          ),
                        );
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
          ) : !data?.data?.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Building2 className="size-12 opacity-20" />
              <p className="text-sm font-medium">
                No se encontraron proveedores
              </p>
              <p className="text-xs opacity-70">
                Prueba ajustando la búsqueda o los filtros
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.data.map((proveedor, index) => (
                  <ProveedorCard
                    key={proveedor.id}
                    proveedor={proveedor}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    isSelected={
                      selectionMode && selectedCards.has(proveedor.id)
                    }
                    animationDelay={Math.min(index * 55, 440)}
                    onToggleSelect={
                      selectionMode
                        ? () =>
                            setSelectedCards((previous) => {
                              const next = new Set(previous);

                              if (next.has(proveedor.id))
                                next.delete(proveedor.id);
                              else next.add(proveedor.id);

                              return next;
                            })
                        : undefined
                    }
                    onView={() => setViewDetailId(proveedor.id)}
                    onEdit={() => setEditItem(proveedor)}
                    onDelete={() => setDeleteId(proveedor.id)}
                  />
                ))}
              </div>

              {(data?.meta?.total ?? 0) > limit && (
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {(page - 1) * limit + 1}-
                    {Math.min(page * limit, data.meta.total)} de{" "}
                    {data.meta.total} proveedores
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
                            onClick={() => setPage(pageItem as number)}
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

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => (!open ? setDeleteId(null) : null)}
      >
        <AlertDialogContent className="w-full rounded-2xl p-6 sm:max-w-md">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(null)}
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
                ¿Eliminar proveedor?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-1">
                  {deleteItemName ? (
                    <p>
                      Se eliminará el registro de{" "}
                      <span className="font-medium text-foreground">
                        {deleteItemName}
                      </span>
                      .
                    </p>
                  ) : null}
                  <p>Esta acción no se puede deshacer.</p>
                </div>
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 w-full rounded-xl sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteIds.length > 0}
        onOpenChange={(open) => (!open ? setBulkDeleteIds([]) : null)}
      >
        <AlertDialogContent className="w-full rounded-2xl p-6 sm:max-w-md">
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar {bulkDeleteIds.length} proveedores?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminarán{" "}
                {bulkDeleteIds.length} proveedores seleccionados.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel
              className="mt-0 w-full rounded-xl sm:w-auto"
              onClick={() => setBulkDeleteIds([])}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? "Eliminando..."
                : `Sí, eliminar ${bulkDeleteIds.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="flex max-h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <Plus className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  Nuevo proveedor
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  Completa los datos del nuevo proveedor.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <ProveedorForm
              mode="create"
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
      >
        <DialogContent className="flex max-h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
                <Pencil className="size-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  Editar proveedor
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  Modifica los datos del proveedor.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {editItem && (
              <ProveedorForm
                mode="edit"
                defaultValues={{
                  razonSocial: editItem.razonSocial,
                  ruc: editItem.ruc,
                  email: editItem.email ?? undefined,
                  telefono: editItem.telefono ?? undefined,
                  direccion: editItem.direccion ?? undefined,
                  contactoNombre: editItem.contactoNombre ?? undefined,
                  contactoTelefono: editItem.contactoTelefono ?? undefined,
                  notas: editItem.notas ?? undefined,
                  activo: editItem.activo,
                }}
                onSubmit={handleUpdate}
                isLoading={updateMutation.isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProveedorDetalleModal
        id={viewDetailId}
        onClose={() => setViewDetailId(null)}
        canEdit={canEdit}
        onEdit={(proveedor) => {
          const pickString = (key: string): string | null =>
            typeof proveedor[key] === "string"
              ? (proveedor[key] as string)
              : null;
          const pickNumber = (key: string): number | null =>
            typeof proveedor[key] === "number"
              ? (proveedor[key] as number)
              : null;
          const pickIsoString = (key: string): string =>
            typeof proveedor[key] === "string"
              ? (proveedor[key] as string)
              : new Date().toISOString();

          const nextEditItem: ProveedorListItem = {
            id: String(proveedor.id ?? ""),
            razonSocial: String(proveedor.razonSocial ?? ""),
            ruc: String(proveedor.ruc ?? ""),
            email: pickString("email"),
            telefono: pickString("telefono"),
            celular: pickString("celular"),
            direccion: pickString("direccion"),
            distrito: pickString("distrito"),
            provincia: pickString("provincia"),
            departamento: pickString("departamento"),
            referencia: pickString("referencia"),
            latitud: pickNumber("latitud"),
            longitud: pickNumber("longitud"),
            contactoNombre: pickString("contactoNombre"),
            contactoTelefono: pickString("contactoTelefono"),
            notas: pickString("notas"),
            activo: Boolean(proveedor.activo),
            createdAt: pickIsoString("createdAt"),
            updatedAt: pickIsoString("updatedAt"),
          };

          setViewDetailId(null);
          setTimeout(() => setEditItem(nextEditItem), 50);
        }}
      />
    </div>
  );
}
