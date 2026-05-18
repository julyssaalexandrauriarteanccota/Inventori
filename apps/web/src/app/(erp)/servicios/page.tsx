"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
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

import {
  readStoredServiciosAutoRefreshPreference,
  writeStoredServiciosAutoRefreshPreference,
} from "@/lib/servicios-auto-refresh";
import {
  formatServicioCurrency,
  formatServicioDuracion,
} from "@/lib/servicios-formatters";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { useStoredAutoRefresh } from "@/hooks/use-stored-auto-refresh";
import {
  type ServicioListItem,
  useCategoriasServicio,
  useDeleteServicio,
  useServicios,
} from "@/hooks/use-servicios";
import { ErpBadge, ErpStatusBadge } from "@/components/erp-badges";
import { AutoRefreshControl } from "@/components/layout/auto-refresh-control";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
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

const DEFAULT_LIMIT = 24;
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];
const VIEW_MODE_STORAGE_KEY = "erp:servicios:view-mode";

const REFRESH_INTERVALS = [
  { label: "30 seg", value: 30_000 },
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
  { label: "15 min", value: 900_000 },
];

function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
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
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    getInitialViewMode,
  );
  const debouncedSearch = useDebounce(search, 300);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      categoriaId: categoriaFilter !== "all" ? categoriaFilter : undefined,
      activo:
        estadoFilter === "all" ? undefined : estadoFilter === "activos",
    }),
    [page, limit, debouncedSearch, categoriaFilter, estadoFilter],
  );

  const { data, isLoading, isError, refetch } = useServicios(filters);
  const { data: categoriasRes } = useCategoriasServicio();
  const categorias = categoriasRes?.data ?? [];

  const { data: statsTotal } = useServicios({ limit: 1 });
  const { data: statsActivos } = useServicios({ limit: 1, activo: true });

  const deleteMutation = useDeleteServicio();

  const showRefreshToast = useCallback(() => {
    toast.info("Lista actualizada", { duration: 1500 });
  }, []);

  const handleManualRefresh = useCallback(() => {
    void refetch();
    showRefreshToast();
  }, [refetch, showRefreshToast]);

  const handleAutoRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const {
    enabled: autoRefresh,
    interval: refreshInterval,
    setEnabled: setAutoRefresh,
    setInterval: setRefreshInterval,
  } = useStoredAutoRefresh({
    readPreference: readStoredServiciosAutoRefreshPreference,
    writePreference: writeStoredServiciosAutoRefreshPreference,
    onRefresh: handleAutoRefresh,
  });

  const showAutoRefreshToast = useCallback(
    (enabled: boolean) => {
      const label =
        REFRESH_INTERVALS.find((option) => option.value === refreshInterval)
          ?.label ?? "intervalo actual";
      toast[enabled ? "success" : "info"](
        enabled
          ? `Auto-refresh activado cada ${label}`
          : "Auto-refresh desactivado",
        { duration: 2000 },
      );
    },
    [refreshInterval],
  );

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
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
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
                    className="size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Acciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
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
            <AutoRefreshControl
              enabled={autoRefresh}
              interval={refreshInterval}
              intervals={REFRESH_INTERVALS}
              switchId="auto-refresh-servicios"
              onEnabledChange={(enabled) => {
                setAutoRefresh(enabled);
                showAutoRefreshToast(enabled);
              }}
              onIntervalChange={setRefreshInterval}
              onManualRefresh={handleManualRefresh}
            />
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
              <Button type="button" onClick={handleNew}>
                <Plus className="size-4" />
                Nuevo servicio
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Wrench}
          label="Total servicios"
          value={statsTotal?.meta?.total ?? 0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Activos"
          value={statsActivos?.meta?.total ?? 0}
        />
        <StatCard icon={List} label="En esta pagina" value={items.length} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar por nombre o SKU..."
            className="min-w-0 flex-1"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Select
              value={categoriaFilter}
              onValueChange={(value) => {
                setCategoriaFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-48 rounded-lg">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todas las categorias</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={estadoFilter}
              onValueChange={(value) => {
                setEstadoFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-36 rounded-lg">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

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
          enableColumnVisibility
          fillAvailableHeight
          columnVisibilityStorageKey="erp:servicios:table-columns"
          emptyMessage="Sin servicios"
          emptyDescription="No hay servicios que coincidan con los filtros actuales."
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
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {items.map((servicio, idx) => (
                <ServicioCard
                  key={servicio.id}
                  servicio={servicio}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onView={() => handleView(servicio.id)}
                  onEdit={() => handleEdit(servicio.id)}
                  onDelete={() => handleDelete(servicio)}
                  animationDelay={Math.min(idx * 30, 300)}
                />
              ))}
            </div>
          )}

        </section>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marca el servicio como eliminado. Los tickets que ya
              lo referenciaron mantendrán el histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Sí, eliminar
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
