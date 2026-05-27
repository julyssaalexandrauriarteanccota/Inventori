"use client";

import { useCallback, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  CheckCircle2,
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
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  type ProveedorFormPayload,
  type ProveedorListItem,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useProveedores,
  useDeleteProveedor,
  useCreateProveedor,
  useUpdateProveedor,
} from "@/hooks/use-proveedores";
import { useDebounce } from "@/hooks/use-debounce";

import { RealtimeStatus } from "@/components/layout/realtime-status";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ErpBadge, ErpStatusBadge } from "@/components/erp-badges";
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
import { ProveedorDetalleModal } from "@/components/modals/proveedor-detalle-modal";
import { ProveedorForm } from "@/components/forms/proveedor-form";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const VIEW_MODE_STORAGE_KEY = "erp:proveedores:view-mode";

function hasNuevoParam() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("nuevo") === "1";
}

function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

function getInitials(p: ProveedorListItem): string {
  const rs = p.razonSocial ?? "";
  if (!rs) return "PV";
  return rs.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function getUbicacion(p: ProveedorListItem): string {
  return (
    [p.distrito, p.provincia, p.departamento].filter(Boolean).join(" / ") ||
    p.direccion ||
    "—"
  );
}

function hasMapCoordinates(
  p: Pick<ProveedorListItem, "latitud" | "longitud">,
): boolean {
  return p.latitud != null && p.longitud != null;
}

function getGoogleMapsUrl(
  p: Pick<ProveedorListItem, "latitud" | "longitud">,
): string | null {
  if (!hasMapCoordinates(p)) {
    return null;
  }
  return `https://www.google.com/maps?q=${p.latitud},${p.longitud}`;
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
  search?: string;
}

function ProveedorCard({
  proveedor: p,
  canEdit,
  canDelete,
  isSelected = false,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  animationDelay,
  search = "",
}: ProveedorCardProps) {
  const accentBar = "from-blue-400 via-blue-500 to-blue-600";
  const avatarCls = "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-500/30";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3.5 rounded-2xl border bg-card/85 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.97] active:duration-150 animate-fade-up overflow-hidden",
        isSelected
          ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-500/10 dark:border-emerald-500/50 shadow-md ring-2 ring-emerald-400/20 dark:ring-emerald-500/20"
          : "border-border/70 hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-md hover:shadow-blue-500/5",
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

      {/* Delete corner */}
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full text-muted-foreground/40 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 active:scale-95 active:duration-150"
          title="Eliminar"
          aria-label="Eliminar proveedor"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}

      {/* Header avatar + name */}
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
          {getInitials(p)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="break-words whitespace-normal font-semibold text-sm leading-snug"
            title={p.razonSocial}
          >
            <HighlightedText text={p.razonSocial} search={search} />
          </p>
          <p className="truncate text-xs text-muted-foreground mt-0.5 font-mono">
            RUC {p.ruc}
          </p>
        </div>
      </div>

      {/* Type + status badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <ErpBadge tone="info" className="gap-1">
          <Building2 className="size-3" />
          Proveedor
        </ErpBadge>
        <ErpStatusBadge active={p.activo} />
      </div>

      {/* Contact details */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t border-border/40 pt-3">
        {p.email ? (
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="size-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">
              <HighlightedText text={p.email} search={search} />
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-40">
            <Mail className="size-3 shrink-0" />
            <span className="italic">Sin email</span>
          </div>
        )}
        {p.celular && (
          <div className="flex items-center gap-2">
            <Phone className="size-3 shrink-0 text-muted-foreground/60" />
            <span>
              <HighlightedText text={p.celular} search={search} />
            </span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              cel
            </span>
          </div>
        )}
        {p.telefono && p.telefono !== p.celular && (
          <div className="flex items-center gap-2">
            <Phone className="size-3 shrink-0 text-muted-foreground/60" />
            <span>
              <HighlightedText text={p.telefono} search={search} />
            </span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              tel
            </span>
          </div>
        )}
        {!p.celular && !p.telefono && (
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
          className="flex-1 h-8 gap-1.5 rounded-lg text-xs font-medium border-border/80 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150 hover:bg-blue-500 hover:text-white hover:border-blue-500 dark:hover:bg-blue-500 dark:hover:border-blue-500"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye className="size-3.5" />
          Ver ficha
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 gap-1.5 rounded-lg text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            onClick={(e) => {
              e.stopPropagation();
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

// ── Main Page Component ──────────────────────────────────────────────────────

export default function ProveedoresPage() {
  const { hasRole } = useAuth();
  const isMobile = useIsMobile();
  const canCreate = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canEdit = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canDelete = hasRole(RolUsuario.ADMIN);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [draftEstadoFilter, setDraftEstadoFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [openCreate, setOpenCreate] = useState(
    () => canEdit && hasNuevoParam(),
  );
  const [editProveedorId, setEditProveedorId] = useState<string | null>(null);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      activo: estadoFilter === "all" ? undefined : estadoFilter === "activos",
    }),
    [page, limit, debouncedSearch, estadoFilter],
  );

  const { data: proveedoresRes, isLoading, isError, refetch } = useProveedores(filters);

  // Statistics queries
  const { data: statsTotal } = useProveedores({ limit: 1 });
  const { data: statsActivos } = useProveedores({ limit: 1, activo: true });
  const { data: statsInactivos } = useProveedores({ limit: 1, activo: false });

  const deleteMutation = useDeleteProveedor();
  const createMutation = useCreateProveedor();
  const updateMutation = useUpdateProveedor(editProveedorId || "");

  const proveedores = proveedoresRes?.data ?? [];
  const visibleTotal = proveedoresRes?.meta?.total ?? 0;

  const handleCreate = useCallback(
    (formData: ProveedorFormPayload) => {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Proveedor creado correctamente");
          setOpenCreate(false);
          void refetch();
        },
        onError: (error: Error) => {
          toast.error(error.message || "Error al crear el proveedor");
        },
      });
    },
    [createMutation, refetch],
  );

  const handleUpdate = useCallback(
    (formData: ProveedorFormPayload) => {
      if (!editProveedorId) return;
      updateMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Proveedor actualizado correctamente");
          setEditProveedorId(null);
          void refetch();
        },
        onError: (error: Error) => {
          toast.error(error.message || "Error al actualizar el proveedor");
        },
      });
    },
    [updateMutation, editProveedorId, refetch],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Proveedor eliminado");
        setDeleteId(null);
        void refetch();
      },
      onError: (error: Error) => {
        toast.error(error.message || "Error al eliminar");
      },
    });
  }, [deleteId, deleteMutation, refetch]);

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
            void refetch();
          }
        },
        onError: () => {
          toast.error("Error al eliminar proveedor");
        },
      });
    });
  }, [bulkDeleteIds, deleteMutation, refetch]);

  const buildCsvRows = useCallback((rows: ProveedorListItem[]) => {
    const headers = [
      "Razón social",
      "RUC",
      "Email",
      "Teléfono",
      "Celular",
      "Contacto",
      "Ubicación",
      "Estado",
    ];
    const lines = rows.map((p) =>
      [
        p.razonSocial,
        p.ruc,
        p.email ?? "",
        p.telefono ?? "",
        p.celular ?? "",
        p.contactoNombre ?? "",
        getUbicacion(p),
        p.activo ? "Activo" : "Inactivo",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    return [headers.join(","), ...lines].join("\n");
  }, []);

  const handleExportSelected = useCallback(() => {
    const selectedRows = proveedores.filter((p) => selectedCards.has(p.id));
    if (!selectedRows.length) {
      toast.error("No hay proveedores seleccionados");
      return;
    }
    const csv = buildCsvRows(selectedRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proveedores-seleccionados.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedRows.length} proveedores exportados`);
  }, [proveedores, selectedCards, buildCsvRows]);

  const handleBulkDeleteCards = useCallback(() => {
    const ids = proveedores
      .filter((p) => selectedCards.has(p.id))
      .map((p) => p.id);
    if (!ids.length) {
      toast.info("No hay proveedores seleccionados para eliminar");
      setSelectedCards(new Set());
      return;
    }
    setBulkDeleteIds(ids);
    setSelectedCards(new Set());
  }, [proveedores, selectedCards]);

  const columns = useMemo<ColumnDef<ProveedorListItem>[]>(
    () => [
      {
        id: "nombreCompleto",
        header: "Proveedor",
        cell: ({ row }) => {
          const text = row.original.razonSocial;
          const avatarCls = "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-500/30";
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                  avatarCls,
                )}
                aria-hidden
              >
                {getInitials(row.original)}
              </span>
              <div className="flex flex-col min-w-0">
                <span
                  className="block max-w-64 sm:max-w-xs md:max-w-md break-words whitespace-normal font-semibold text-sm leading-snug text-foreground"
                  title={text}
                >
                  <HighlightedText text={text} search={search} />
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "documento",
        header: "RUC",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
            {row.original.ruc}
          </span>
        ),
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
          const tel = row.original.celular ?? row.original.telefono;
          return tel ? (
            <span className="whitespace-nowrap text-sm text-foreground font-medium">
              <HighlightedText text={tel} search={search} />
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
          const hasUbicacion = ubicacion && ubicacion !== "—";
          return hasUbicacion ? (
            <span
              className="inline-flex items-center gap-1.5 max-w-56 text-xs text-muted-foreground"
              title={ubicacion}
            >
              <MapPin className="size-3 shrink-0 text-sky-500 dark:text-sky-400" />
              <span className="truncate">{ubicacion}</span>
            </span>
          ) : (
            <span className="text-muted-foreground/50 text-xs">—</span>
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
          const canEditProveedor = canEdit;
          const canDeleteProveedor = canDelete;

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
                  <span className="sr-only">Abrir ubicación</span>
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

              {(canEditProveedor || canDeleteProveedor) && (
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
                      {canEditProveedor && (
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            setEditProveedorId(row.original.id);
                          }}
                        >
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                      )}
                      {canDeleteProveedor && (
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

  // Selected values for edit form
  const editingProveedor = useMemo(() => {
    if (!editProveedorId) return undefined;
    const found = proveedores.find((p) => p.id === editProveedorId);
    if (!found) return undefined;

    // Convert null values to undefined to match ProveedorFormPayload types
    const mapped: Record<string, any> = { ...found };
    Object.keys(mapped).forEach((key) => {
      if (mapped[key] === null) {
        mapped[key] = undefined;
      }
    });
    return mapped as unknown as Partial<ProveedorFormPayload>;
  }, [editProveedorId, proveedores]);

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative backing glows — coordinated with stat-card palette */}
      <div className="pointer-events-none absolute -z-10 bg-blue-400/8 dark:bg-blue-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-indigo-400/6 dark:bg-indigo-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-emerald-400/5 dark:bg-emerald-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />

      {/* Topbar actions */}
      <TopbarActions>
        <RealtimeStatus />
        {canCreate ? (
          <Button
            onClick={() => setOpenCreate(true)}
            className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150 bg-blue-500 text-white"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nuevo proveedor</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        ) : null}
      </TopbarActions>

      <h1 className="sr-only">Proveedores</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total proveedores"
          value={statsTotal?.meta?.total}
          icon={Users}
          theme="sky"
          subtitle="Registrados en sistema"
          index={0}
        />
        <StatCard
          label="Empresas con RUC"
          value={statsTotal?.meta?.total} // Every supplier has a RUC
          icon={Building2}
          theme="indigo"
          subtitle="Entidades fiscales"
          index={1}
        />
        <StatCard
          label="Activos"
          value={statsActivos?.meta?.total}
          icon={CheckCircle2}
          theme="emerald"
          subtitle="Disponibles para compras"
          index={2}
        />
        <StatCard
          label="Inactivos"
          value={statsInactivos?.meta?.total}
          icon={X}
          theme="rose"
          subtitle="Históricos/Suspendidos"
          index={3}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por razón social, RUC…"
            className="sm:w-80 lg:w-96"
            inputClassName="border-border bg-background hover:border-blue-400/60 dark:hover:border-blue-500/60 focus-visible:border-blue-500 dark:focus-visible:border-blue-400 focus-visible:ring-blue-400/25 dark:focus-visible:ring-blue-500/25 shadow-sm"
          />

          <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            {/* Status Tabs */}
            <Tabs value={estadoFilter} onValueChange={handleEstadoChange} className="w-full sm:w-auto">
              <TabsList className="flex w-full sm:w-auto h-9 gap-0.5 rounded-lg border border-border/70 bg-muted/70 p-0.5">
                <TabsTrigger
                  value="all"
                  className="flex-1 sm:flex-initial h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-blue-500/30 dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <Users className="size-3.5" />
                  <span>Todos</span>
                </TabsTrigger>
                <TabsTrigger
                  value="activos"
                  className="flex-1 sm:flex-initial h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Activos</span>
                </TabsTrigger>
                <TabsTrigger
                  value="inactivos"
                  className="flex-1 sm:flex-initial h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-rose-500/30 dark:data-[state=active]:bg-rose-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  <X className="size-3.5" />
                  <span>Inactivos</span>
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
          data={proveedores}
          total={visibleTotal}
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
          fillAvailableHeight={!isMobile}
          bulkActionsBar={
            canDelete
              ? (selectedRows, clearSelection) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                      title="Exportar"
                      onClick={() => {
                        const rows = selectedRows as ProveedorListItem[];
                        const csv = buildCsvRows(rows);
                        const blob = new Blob([csv], {
                          type: "text/csv;charset=utf-8;",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "proveedores.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`${rows.length} proveedores exportados`);
                      }}
                    >
                      <Download className="size-3.5" />
                      <span className="hidden sm:inline">Exportar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      title="Eliminar"
                      onClick={() => {
                        const ids = selectedRows.map((r) => r.id);
                        setBulkDeleteIds(ids);
                        clearSelection();
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
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/50 p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="size-11 animate-spin text-muted-foreground/30" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded-full w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded-full w-1/2 animate-pulse" />
                </div>
              </div>
              <div className="h-px bg-border/40 my-1" />
              <div className="space-y-1.5">
                <div className="h-3 bg-muted rounded-full w-5/6 animate-pulse" />
                <div className="h-3 bg-muted rounded-full w-4/6 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <p className="text-sm text-muted-foreground">
            No se pudo cargar la lista de proveedores.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : proveedores.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 rounded-3xl border border-dashed border-border bg-card/20">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/40">
            <Users className="size-7 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-muted-foreground">
              Sin proveedores
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              No se encontraron proveedores registrados con estos filtros.
            </p>
          </div>
          {canCreate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpenCreate(true)}
              className="rounded-xl mt-2"
            >
              <Plus className="size-4" />
              Nuevo proveedor
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {proveedores.map((p, idx) => {
              const isSelected = selectedCards.has(p.id);
              return (
                <ProveedorCard
                  key={p.id}
                  proveedor={p}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  isSelected={isSelected}
                  search={debouncedSearch}
                  animationDelay={idx * 40}
                  onToggleSelect={
                    selectionMode
                      ? () => {
                          const next = new Set(selectedCards);
                          if (next.has(p.id)) {
                            next.delete(p.id);
                          } else {
                            next.add(p.id);
                          }
                          setSelectedCards(next);
                        }
                      : undefined
                  }
                  onView={() => setViewDetailId(p.id)}
                  onEdit={() => setEditProveedorId(p.id)}
                  onDelete={() => setDeleteId(p.id)}
                />
              );
            })}
          </div>

          {/* Simple pagination footer for grid view */}
          {visibleTotal > limit ? (
            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <p className="text-xs text-muted-foreground">
                Mostrando {proveedores.length} de {visibleTotal} resultados
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs"
                  disabled={page * limit >= visibleTotal}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Floating Selection Bar for Grid Selection Mode */}
      {selectionMode && selectedCards.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex h-14 -translate-x-1/2 items-center gap-3.5 rounded-full border border-emerald-200 bg-background/90 dark:border-emerald-800/80 px-5 py-3 shadow-[0_24px_50px_-16px_rgba(16,185,129,0.3)] backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2 border-r border-border/60 pr-3.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
              {selectedCards.size}
            </span>
            <span className="text-xs font-semibold text-foreground hidden sm:inline">
              Seleccionados
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full gap-1.5 text-xs text-muted-foreground border-border/80 hover:bg-muted"
              onClick={() => setSelectedCards(new Set())}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full gap-1.5 text-xs hover:bg-emerald-500 hover:text-white"
              onClick={handleExportSelected}
            >
              <Download className="size-3.5" />
              Exportar
            </Button>
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-full gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={handleBulkDeleteCards}
              >
                <Trash2 className="size-3.5" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col rounded-3xl border border-border/60 bg-background shadow-2xl data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm shadow-blue-500/25">
                <Users className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Nuevo Proveedor
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Registra un nuevo proveedor en el sistema.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            <ProveedorForm
              mode="create"
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProveedorId} onOpenChange={(open) => !open && setEditProveedorId(null)}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col rounded-3xl border border-border/60 bg-background shadow-2xl data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/25">
                <Pencil className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Editar Proveedor
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Actualiza los datos del proveedor seleccionado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            {editingProveedor && (
              <ProveedorForm
                mode="edit"
                defaultValues={editingProveedor}
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
        onEdit={(p) => {
          setViewDetailId(null);
          setEditProveedorId(p.id as string);
        }}
      />

      {/* Alert Dialogs */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará al proveedor. Sus compras anteriores e historial no se perderán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteIds.length > 0} onOpenChange={(open) => !open && setBulkDeleteIds([])}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Se procederá a eliminar {bulkDeleteIds.length} proveedores seleccionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleBulkDelete}
            >
              Eliminar {bulkDeleteIds.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
