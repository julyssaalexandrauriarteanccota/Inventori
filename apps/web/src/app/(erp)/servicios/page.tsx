"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { RolUsuario } from "@erp/shared";

import { cn } from "@/lib/utils";
import {
  formatServicioCurrency,
  formatServicioDuracion,
} from "@/lib/servicios-formatters";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { usePageAutoRefresh } from "@/hooks/use-page-auto-refresh";
import {
  type ServicioListItem,
  useCategoriasServicio,
  useDeleteServicio,
  useServicios,
} from "@/hooks/use-servicios";
import { ErpBadge, ErpStatusBadge } from "@/components/erp-badges";
import { PageAutoRefreshControl } from "@/components/layout/page-auto-refresh-control";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ServicioDetailModal } from "@/components/modals/servicio-detail-modal";
import { ServicioFormModal } from "@/components/modals/servicio-form-modal";
import { ServicioCard } from "@/components/services/servicio-card";
import {
  ServerDataTable,
  type ColumnDef,
} from "@/components/tables/ServerDataTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DEFAULT_LIMIT = 24;
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];
const VIEW_MODE_STORAGE_KEY = "erp:servicios:view-mode";

function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

function buildServiciosCsvRows(servicios: ServicioListItem[]): string {
  const headers = [
    "SKU",
    "Nombre",
    "Categoria",
    "Unidad",
    "Precio Base",
    "Costo Referencial",
    "Tiempo Estimado (min)",
    "Estado",
  ];
  const rows = servicios.map((s) => [
    s.sku || "",
    s.nombre,
    s.categoria?.nombre || "",
    `${s.unidadMedida.codigo} - ${s.unidadMedida.nombre}`,
    s.precioVenta.toString(),
    s.precioCompra.toString(),
    s.tiempoEstimadoMin?.toString() || "",
    s.activo ? "Activo" : "Inactivo",
  ]);
  return [headers, ...rows]
    .map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
}

export default function ServiciosPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canDelete = hasRole(RolUsuario.ADMIN);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);
  const debouncedSearch = useDebounce(search, 300);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Estados de selección múltiple y filtros avanzados
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [draftEstadoFilter, setDraftEstadoFilter] = useState<string>("all");

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      categoriaId: categoriaFilter !== "all" ? categoriaFilter : undefined,
      activo: estadoFilter === "all" ? undefined : estadoFilter === "activos",
    }),
    [page, limit, debouncedSearch, categoriaFilter, estadoFilter],
  );

  const { data, isLoading, isError, refetch } = useServicios(filters);
  const { data: categoriasRes } = useCategoriasServicio();
  const categorias = categoriasRes?.data ?? [];

  const { data: statsTotal } = useServicios({ limit: 1 });
  const { data: statsActivos } = useServicios({ limit: 1, activo: true });

  const deleteMutation = useDeleteServicio();

  const handleSelectionModeToggle = useCallback(() => {
    setSelectionMode((prev) => !prev);
  }, []);

  useEffect(() => {
    if (selectionMode) setSelectedCards(new Set());
  }, [selectionMode]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (estadoFilter !== "all") count++;
    return count;
  }, [estadoFilter]);

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
    setEstadoFilter(draftEstadoFilter);
    setPage(1);
    setFilterPopoverOpen(false);
  }, [draftEstadoFilter]);

  const clearFilters = useCallback(() => {
    setDraftEstadoFilter("all");
    setEstadoFilter("all");
    setPage(1);
    setFilterPopoverOpen(false);
  }, []);

  const handleSearchChange = useCallback((nextSearch: string) => {
    setSearch(nextSearch);
    setPage(1);
  }, []);

  const handleCategoriaChange = useCallback((nextCategoria: string) => {
    setCategoriaFilter(nextCategoria);
    setPage(1);
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (!bulkDeleteIds.length) return;
    let done = 0;
    bulkDeleteIds.forEach((id) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          done++;
          if (done === bulkDeleteIds.length) {
            toast.success(`${done} servicios eliminados`);
            setBulkDeleteIds([]);
            void refetch();
          }
        },
        onError: () => {
          toast.error("Error al eliminar servicio");
        },
      });
    });
  }, [bulkDeleteIds, deleteMutation, refetch]);

  const handleExportCSV = useCallback(
    (serviciosToExport: ServicioListItem[]) => {
      if (!serviciosToExport.length) {
        toast.error("No hay datos para exportar");
        return;
      }
      const csv = buildServiciosCsvRows(serviciosToExport);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "servicios.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exportado correctamente");
    },
    [],
  );

  const autoRefresh = usePageAutoRefresh({
    scope: "servicios",
    toastLabel: "Servicios",
    manualToastMessage: "Lista actualizada",
  });
  const handleManualRefresh = autoRefresh.manualRefresh;

  const handleView = useCallback((id: string) => {
    setViewingId(id);
  }, []);

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
    setModalOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingId(null);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (servicio: ServicioListItem) => {
      if (!canDelete) return;
      setDeleteId(servicio.id);
    },
    [canDelete],
  );

  const handleLimitChange = useCallback((nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  }, []);

  const handleViewModeChange = useCallback((value: string) => {
    if (value !== "list" && value !== "grid") return;
    setViewMode(value);
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
  }, []);

  const columns = useMemo<ColumnDef<ServicioListItem>[]>(
    () => [
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.sku}
          </span>
        ),
      },
      {
        accessorKey: "nombre",
        header: "Servicio",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wrench className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {row.original.nombre}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.categoria?.nombre ?? "Sin categoria"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "unidad",
        header: "Unidad",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.unidadMedida.codigo} ·{" "}
            {row.original.unidadMedida.nombre}
          </span>
        ),
      },
      {
        id: "precioVenta",
        header: "Precio base",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">
            {formatServicioCurrency(row.original.precioVenta)}
          </span>
        ),
      },
      {
        id: "duracion",
        header: "Duracion",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Clock className="size-3.5 text-muted-foreground" />
            {formatServicioDuracion(row.original.tiempoEstimadoMin)}
          </span>
        ),
      },
      {
        id: "requiereRepuestos",
        header: "Repuestos",
        cell: ({ row }) =>
          row.original.requiereRepuestos ? (
            <ErpBadge tone="warning">Requiere</ErpBadge>
          ) : (
            <span className="text-xs text-muted-foreground">No requiere</span>
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
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-xl px-2.5 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={() => handleView(row.original.id)}
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
                    className="size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Acciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40 rounded-2xl p-1 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]"
                >
                  <DropdownMenuGroup>
                    {canEdit ? (
                      <DropdownMenuItem
                        onClick={() => handleEdit(row.original.id)}
                      >
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                    ) : null}
                    {canDelete ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(row.original)}
                      >
                        <Trash2 className="size-4" />
                        Eliminar
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, handleDelete, handleEdit, handleView],
  );

  function confirmDelete() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Servicio eliminado");
        setDeleteId(null);
      },
      onError: (error: Error) => {
        toast.error(error.message || "No se pudo eliminar el servicio");
      },
    });
  }

  const items = data?.data ?? [];

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5">
      <PageHeader
        title="Servicios"
        description="Catálogo de servicios técnicos: mantenimientos, instalaciones, diagnósticos, recargas y más."
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
              ]}
            />
            {canEdit ? (
              <Button
                type="button"
                onClick={handleNew}
                className="rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Plus className="size-4" />
                Nuevo servicio
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up">
        <StatCard
          icon={Wrench}
          label="Total servicios"
          value={statsTotal?.meta?.total ?? 0}
          color="bg-[var(--semantic-warning-soft)] text-[var(--semantic-warning)]"
          index={0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Activos"
          value={statsActivos?.meta?.total ?? 0}
          color="bg-[var(--semantic-success-soft)] text-[var(--semantic-success)]"
          index={1}
        />
        <StatCard
          icon={List}
          label="En esta pagina"
          value={items.length}
          color="bg-[var(--semantic-info-soft)] text-[var(--semantic-info)]"
          index={2}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por nombre o SKU..."
            inputClassName="border-border/80 bg-muted/55 hover:bg-muted/80"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {/* Popover de Filtros */}
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
                className="w-70 rounded-2xl border border-border/80 bg-background p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">
                    Refina la lista de servicios
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
                            "flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-all duration-200",
                            draftEstadoFilter === option.value
                              ? "border-primary/40 bg-primary/5 text-foreground"
                              : "border-border/70 bg-card hover:bg-muted/50",
                          )}
                          onClick={() => setDraftEstadoFilter(option.value)}
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
                  <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl text-xs hover:bg-muted"
                      onClick={clearFilters}
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-xl text-xs"
                      onClick={applyFilterPopover}
                    >
                      Aplicar filtros
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Seleccionar */}
            {canDelete && (
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-border/80 bg-muted/45 text-xs hover:bg-muted/80 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                onClick={handleSelectionModeToggle}
              >
                <CheckCircle2 className="size-3.5" />
                {selectionMode ? "Cancelar" : "Seleccionar"}
              </Button>
            )}

            {/* Toggle vista */}
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={handleViewModeChange}
              variant="outline"
              size="sm"
              className="gap-0 rounded-xl border border-border/60 bg-background/40 p-0.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
            >
              <ToggleGroupItem
                value="list"
                className="h-8 rounded-lg px-2.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=on]:bg-muted"
                aria-label="Vista tabla"
                title="Vista tabla"
              >
                <List className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="grid"
                className="h-8 rounded-lg px-2.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=on]:bg-muted"
                aria-label="Vista tarjetas"
                title="Vista tarjetas"
              >
                <LayoutGrid className="size-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* ── Pestañas de Categoría (Fila 2) ── */}
        <div className="flex w-full items-center justify-end">
          <Tabs
            value={categoriaFilter}
            onValueChange={handleCategoriaChange}
            className="max-w-full"
          >
            <TabsList className="scrollbar-none h-9 max-w-full gap-0.5 overflow-x-auto rounded-xl border border-border/80 bg-muted/65 p-0.5">
              <TabsTrigger
                value="all"
                className="h-8 shrink-0 rounded-lg px-3.5 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                Todas las categorias
              </TabsTrigger>
              {categorias.map((categoria) => (
                <TabsTrigger
                  key={categoria.id}
                  value={categoria.id}
                  className="h-8 shrink-0 rounded-lg px-3.5 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  {categoria.nombre}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {viewMode === "list" ? (
        <ServerDataTable
          columns={columns}
          data={items}
          total={data?.meta?.total ?? 0}
          page={page}
          limit={limit}
          isLoading={isLoading}
          isError={isError}
          errorMessage="No se pudo cargar la lista de servicios."
          onRetry={() => void refetch()}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          enableRowSelection={canDelete && selectionMode}
          enableColumnVisibility
          fillAvailableHeight
          columnVisibilityStorageKey="erp:servicios:table-columns"
          emptyMessage="Sin servicios"
          emptyDescription="No hay servicios que coincidan con los filtros actuales."
          bulkActionsBar={
            canDelete
              ? (selectedRows, clearSelection) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-xl hover:bg-muted"
                      onClick={() => {
                        const rows = selectedRows as ServicioListItem[];
                        handleExportCSV(rows);
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
                        setBulkDeleteIds(
                          (selectedRows as ServicioListItem[]).map((r) => r.id),
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
        <section className="flex w-full min-w-0 flex-col gap-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive">
                Ocurrió un error al cargar los servicios.
              </p>
              <Button variant="outline" onClick={handleManualRefresh}>
                Reintentar
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
              <Wrench className="size-10 text-muted-foreground/60" />
              <div>
                <p className="text-base font-semibold">Sin servicios aún</p>
                <p className="text-sm text-muted-foreground">
                  Crea tu primer servicio para empezar a registrarlo en tickets
                  y comprobantes.
                </p>
              </div>
              {canEdit ? (
                <Button type="button" onClick={handleNew}>
                  <Plus className="size-4" />
                  Nuevo servicio
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {items.map((servicio, idx) => (
                  <ServicioCard
                    key={servicio.id}
                    servicio={servicio}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    isSelected={selectionMode && selectedCards.has(servicio.id)}
                    onToggleSelect={
                      selectionMode
                        ? () =>
                            setSelectedCards((prev) => {
                              const next = new Set(prev);
                              if (next.has(servicio.id))
                                next.delete(servicio.id);
                              else next.add(servicio.id);
                              return next;
                            })
                        : undefined
                    }
                    onView={() => handleView(servicio.id)}
                    onEdit={() => handleEdit(servicio.id)}
                    onDelete={() => handleDelete(servicio)}
                    animationDelay={Math.min(idx * 30, 300)}
                  />
                ))}
              </div>

              {selectionMode && selectedCards.size > 0 && (
                <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-xl backdrop-blur-md animate-fade-in-up">
                  <span className="text-xs font-semibold px-2 text-muted-foreground">
                    {selectedCards.size} seleccionados
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs rounded-xl hover:bg-muted"
                    onClick={() => {
                      const itemsToExport = items.filter((item) =>
                        selectedCards.has(item.id),
                      );
                      handleExportCSV(itemsToExport);
                      setSelectedCards(new Set());
                      setSelectionMode(false);
                    }}
                  >
                    <Download className="size-3.5" /> Exportar
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => {
                        setBulkDeleteIds(Array.from(selectedCards));
                      }}
                    >
                      <Trash2 className="size-3.5" /> Eliminar
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-3xl p-6 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marca el servicio como eliminado. Los tickets que ya
              lo referenciaron mantendrán el histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0 w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-destructive/90 hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={confirmDelete}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteIds.length > 0}
        onOpenChange={(open) => !open && setBulkDeleteIds([])}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-3xl p-6 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {bulkDeleteIds.length} servicio
              {bulkDeleteIds.length !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará los servicios seleccionados como eliminados.
              Los tickets y comprobantes existentes que los referencian
              mantendrán el histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0 w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-destructive/90 hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={handleBulkDelete}
            >
              Sí, eliminar {bulkDeleteIds.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ServicioFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        servicioId={editingId}
        canViewInternalCosts={hasRole(RolUsuario.ADMIN)}
        onSaved={() => {
          void refetch();
        }}
      />

      <ServicioDetailModal
        open={!!viewingId}
        onOpenChange={(open) => !open && setViewingId(null)}
        servicioId={viewingId}
        canEdit={canEdit}
        canViewInternalCosts={hasRole(RolUsuario.ADMIN)}
        onEdit={handleEdit}
      />
    </div>
  );
}
