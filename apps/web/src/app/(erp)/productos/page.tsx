"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { type ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  LayoutGrid,
  List,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RolUsuario, TipoProducto, type ProductoListItem } from "@erp/shared";

import { cn } from "@/lib/utils";
import {
  readStoredProductosAutoRefreshPreference,
  writeStoredProductosAutoRefreshPreference,
} from "@/lib/productos-auto-refresh";
import { useAuth } from "@/hooks/use-auth";
import { useStoredAutoRefresh } from "@/hooks/use-stored-auto-refresh";
import {
  useProductos,
  useDeleteProducto,
  useCategorias,
  useMarcas,
} from "@/hooks/use-productos";
import { useDebounce } from "@/hooks/use-debounce";
import { AutoRefreshControl } from "@/components/layout/auto-refresh-control";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ErpBadge, ErpStatusBadge } from "@/components/erp-badges";
import { ProductoCard } from "@/components/products/producto-card";
import { EtiquetaProductoPdfDocument } from "@/components/products/etiqueta-producto-pdf";
import { ProductoThumbnail } from "@/components/products/producto-thumbnail";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
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
import { usePublicBranding } from "@/hooks/use-public-branding";
import {
  TIPO_LABELS,
  formatCurrency,
  formatPercent,
  getProductoMargenPct,
  getProductoRuleLabels,
  buildProductosCsvRows,
} from "./_helpers";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const VIEW_MODE_STORAGE_KEY = "erp:productos:view-mode";

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

function buildEtiquetaFilename(sku: string) {
  const safeSku = sku.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `etiqueta-${safeSku || "producto"}.pdf`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductosPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const canEdit = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canDelete = hasRole(RolUsuario.ADMIN);
  const { branding } = usePublicBranding();
  const brandingIdentity = branding?.identity;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoProducto | "all">("all");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [marcaFilter, setMarcaFilter] = useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 300);

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [draftEstadoFilter, setDraftEstadoFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [printingProductId, setPrintingProductId] = useState<string | null>(
    null,
  );

  const { data: categoriasRes } = useCategorias(
    tipoFilter === "all" ? undefined : tipoFilter,
  );
  const { data: marcasRes } = useMarcas(
    tipoFilter === "all" ? undefined : tipoFilter,
  );
  const categorias = categoriasRes?.data ?? [];
  const marcas = marcasRes?.data ?? [];

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      tipo: tipoFilter === "all" ? undefined : tipoFilter,
      // Si el usuario no filtró por un tipo específico, ocultamos SERVICIO
      // (se gestiona en su propia pantalla /erp/servicios).
      excluirTipos:
        tipoFilter === "all" ? [TipoProducto.SERVICIO] : undefined,
      categoriaId: categoriaFilter !== "all" ? categoriaFilter : undefined,
      marcaId: marcaFilter !== "all" ? marcaFilter : undefined,
      activo: estadoFilter === "all" ? undefined : estadoFilter === "activos",
    }),
    [
      page,
      limit,
      debouncedSearch,
      tipoFilter,
      categoriaFilter,
      marcaFilter,
      estadoFilter,
    ],
  );

  const { data, isLoading, isError, refetch } = useProductos(filters);

  // Stat queries (excluyen SERVICIO porque tiene su propio módulo /erp/servicios)
  const { data: statsTotal } = useProductos({
    limit: 1,
    excluirTipos: [TipoProducto.SERVICIO],
  });
  const { data: statsActivo } = useProductos({
    limit: 1,
    activo: true,
    excluirTipos: [TipoProducto.SERVICIO],
  });
  const { data: statsRepuestos } = useProductos({
    limit: 1,
    tipo: TipoProducto.REPUESTO,
  });
  const { data: statsEquipos } = useProductos({
    limit: 1,
    tipo: TipoProducto.EQUIPO,
  });

  const showRefreshToast = useCallback(() => {
    toast.info("Lista actualizada", { duration: 2000 });
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
    readPreference: readStoredProductosAutoRefreshPreference,
    writePreference: writeStoredProductosAutoRefreshPreference,
    onRefresh: handleAutoRefresh,
  });

  const showAutoRefreshToast = useCallback(
    (enabled: boolean) => {
      const label =
        REFRESH_INTERVALS.find((option) => option.value === refreshInterval)
          ?.label ?? "intervalo actual";
      const message = enabled
        ? `Auto-refresh activado cada ${label}`
        : "Auto-refresh desactivado";

      if (enabled) {
        toast.success(message, { duration: 2000 });
        return;
      }

      toast.info(message, { duration: 2000 });
    },
    [refreshInterval],
  );

  const deleteMutation = useDeleteProducto();

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Producto eliminado");
        setDeleteId(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || "Error al eliminar");
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
            toast.success(`${done} productos eliminados`);
            setBulkDeleteIds([]);
          }
        },
        onError: () => {
          toast.error("Error al eliminar producto");
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
    const csv = buildProductosCsvRows(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "productos.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado correctamente");
  }, [data]);

  const handlePrintEtiqueta = useCallback(
    async (producto: ProductoListItem) => {
      if (printingProductId) {
        return;
      }

      const showCatalogQr = !(
        producto.tipo === TipoProducto.EQUIPO || producto.tieneNumeroSerie
      );
      const { barcodeValue, qrValue } = resolveProductCodeValues({
        sku: producto.sku,
        barcodeValue: producto.codigoBarras,
        qrValue: producto.codigoQr,
        showQr: showCatalogQr,
      });

      if (!barcodeValue) {
        toast.error("No se pudo resolver el código de barras de la etiqueta.");
        return;
      }

      const loadingToastId = toast.loading(
        `Generando etiqueta de ${producto.sku}...`,
      );
      const previewWindow = window.open("", "_blank", "width=980,height=720");

      if (previewWindow) {
        previewWindow.document.title = `Etiqueta ${producto.sku}`;
        previewWindow.document.body.style.margin = "0";
        previewWindow.document.body.style.fontFamily = "system-ui, sans-serif";
        previewWindow.document.body.innerHTML =
          '<div style="padding:24px;color:#475569">Generando PDF...</div>';
      }

      setPrintingProductId(producto.id);

      try {
        const [barcodeDataUrl, qrDataUrl, imageDataUrl] = await Promise.all([
          generateBarcodeDataUrl(barcodeValue),
          qrValue ? generateQrDataUrl(qrValue) : Promise.resolve(null),
          fetchFirstAssetAsDataUrl(getProductImageCandidates(producto)),
        ]);
        const blob = await pdf(
          <EtiquetaProductoPdfDocument
            producto={producto}
            barcodeValue={barcodeValue}
            qrValue={qrValue}
            barcodeDataUrl={barcodeDataUrl}
            qrDataUrl={qrDataUrl}
            imageDataUrl={imageDataUrl}
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
          a.download = buildEtiquetaFilename(producto.sku);
          a.click();
        }

        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

        toast.success(
          qrValue
            ? `Etiqueta PDF generada para ${producto.sku}`
            : `Etiqueta PDF generada para ${producto.sku}. El QR se maneja por unidad física.`,
          { id: loadingToastId },
        );
      } catch (error) {
        if (previewWindow) {
          previewWindow.close();
        }

        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo generar la etiqueta PDF.",
          { id: loadingToastId },
        );
      } finally {
        setPrintingProductId(null);
      }
    },
    [printingProductId, brandingIdentity?.displayName, brandingIdentity?.taxId],
  );

  const columns = useMemo<ColumnDef<ProductoListItem>[]>(
    () => [
      {
        id: "imagen",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <ProductoThumbnail
            src={getPrimaryProductImage(row.original)}
            alt={row.original.nombre}
            fallback={row.original.sku}
            size={36}
            rounded="md"
          />
        ),
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-sm whitespace-nowrap">
            {row.original.sku}
          </span>
        ),
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => (
          <ErpBadge tone="neutral" className="whitespace-nowrap">
            {TIPO_LABELS[row.original.tipo]}
          </ErpBadge>
        ),
      },
      {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => (
          <div className="flex flex-col max-w-55">
            <span className="font-medium truncate" title={row.original.nombre}>
              {row.original.nombre}
            </span>
            {row.original.modelo && (
              <span className="text-xs text-muted-foreground truncate">
                {row.original.modelo}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "categoria",
        header: "Categoría",
        cell: ({ row }) =>
          row.original.categoria ? (
            <ErpBadge tone="neutral" className="whitespace-nowrap">
              {row.original.categoria.nombre}
            </ErpBadge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "marca",
        header: "Marca",
        cell: ({ row }) =>
          row.original.marca ? (
            <ErpBadge tone="info" className="whitespace-nowrap">
              {row.original.marca.nombre}
            </ErpBadge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "unidadMedida",
        header: "Unidad",
        cell: ({ row }) =>
          row.original.unidadMedida ? (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {row.original.unidadMedida.codigo}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "precioVenta",
        header: "Precio venta",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums whitespace-nowrap">
            {formatCurrency(row.original.precioVenta)}
          </span>
        ),
      },
      {
        id: "margen",
        header: "Margen",
        cell: ({ row }) => {
          const pct = getProductoMargenPct(row.original);
          if (pct == null) {
            return <span className="text-muted-foreground">—</span>;
          }
          const tone =
            pct >= 30 ? "success" : pct >= 10 ? "warning" : "danger";
          return (
            <ErpBadge tone={tone} className="tabular-nums whitespace-nowrap">
              {formatPercent(pct)}
            </ErpBadge>
          );
        },
      },
      {
        id: "stockActual",
        header: "Stock",
        cell: ({ row }) =>
          row.original.tipo === TipoProducto.SERVICIO ? (
            <span className="text-xs text-muted-foreground">No aplica</span>
          ) : (
            <span className="font-mono text-sm font-semibold">
              {row.original.stockActual}
            </span>
          ),
      },
      {
        id: "stockMinimo",
        header: "Stock mín.",
        cell: ({ row }) =>
          row.original.tipo === TipoProducto.SERVICIO ? (
            <span className="text-xs text-muted-foreground">No aplica</span>
          ) : (
            <span className="font-mono text-sm text-muted-foreground">
              {row.original.stockMinimo}
            </span>
          ),
      },
      {
        id: "reglas",
        header: "Reglas",
        cell: ({ row }) => {
          const labels = getProductoRuleLabels(row.original);
          return labels.length ? (
            <div className="flex max-w-48 flex-wrap gap-1">
              {labels.map((label) => (
                <ErpBadge key={label} tone="warning">
                  {label}
                </ErpBadge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
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
        cell: ({ row }) => (
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
              onClick={() => router.push(`/productos/${row.original.id}`)}
            >
              <Eye className="size-3.5" />
              Ver
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              title={
                printingProductId === row.original.id
                  ? "Generando etiqueta"
                  : "Imprimir etiqueta"
              }
              disabled={Boolean(printingProductId)}
              onClick={() => handlePrintEtiqueta(row.original)}
            >
              {printingProductId === row.original.id ? (
                <RefreshCcw className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              <span className="sr-only">Etiqueta</span>
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
                        onClick={() =>
                          router.push(`/productos/${row.original.id}/editar`)
                        }
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
    [canEdit, canDelete, router, handlePrintEtiqueta, printingProductId],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const handleTipoChange = useCallback((value: string) => {
    setTipoFilter(value === "all" ? "all" : (value as TipoProducto));
    setCategoriaFilter("all");
    setMarcaFilter("all");
    setPage(1);
  }, []);
  const handleCategoriaChange = useCallback((value: string) => {
    setCategoriaFilter(value);
    setPage(1);
  }, []);
  const handleMarcaChange = useCallback((value: string) => {
    setMarcaFilter(value);
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

  const handleViewModeChange = useCallback((value: string) => {
    if (value !== "list" && value !== "grid") return;
    setViewMode(value);
    setSelectedCards(new Set());
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
  }, []);

  const openFilterPopover = useCallback(
    (open: boolean) => {
      setFilterPopoverOpen(open);
      if (open) setDraftEstadoFilter(estadoFilter);
    },
    [estadoFilter],
  );

  const applyFilterPopover = useCallback(() => {
    setEstadoFilter(draftEstadoFilter);
    setPage(1);
    setFilterPopoverOpen(false);
  }, [draftEstadoFilter]);

  const clearFilterPopover = useCallback(() => {
    setDraftEstadoFilter("all");
    setEstadoFilter("all");
    setPage(1);
    setFilterPopoverOpen(false);
  }, []);

  const activeFilterCount = estadoFilter !== "all" ? 1 : 0;

  return (
    <div className="flex flex-col gap-5 w-full min-w-0 flex-1 min-h-0">
      <PageHeader
        title="Productos"
        description="Gestiona el catálogo de productos, repuestos y consumibles"
        hideTitleVisually
        actions={
          <>
            <AutoRefreshControl
              enabled={autoRefresh}
              interval={refreshInterval}
              intervals={REFRESH_INTERVALS}
              switchId="auto-refresh-productos"
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
                {
                  label: "Exportar CSV",
                  icon: Download,
                  onSelect: handleExportCSV,
                },
              ]}
            />
            {canEdit ? (
              <Button
                onClick={() => router.push("/productos/nuevo")}
                className="erp-page-primary-cta rounded-xl"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nuevo producto</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            ) : null}
          </>
        }
      />

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total productos"
          value={statsTotal?.meta?.total}
          icon={Package}
          index={0}
        />
        <StatCard
          label="Activos"
          value={statsActivo?.meta?.total}
          icon={CheckCircle2}
          color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          index={1}
        />
        <StatCard
          label="Repuestos"
          value={statsRepuestos?.meta?.total}
          icon={Tag}
          color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          index={2}
        />
        <StatCard
          label="Equipos"
          value={statsEquipos?.meta?.total}
          icon={Package}
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
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
            placeholder="Buscar por SKU, nombre, modelo…"
            inputClassName="border-border/80 bg-muted/55 hover:bg-muted/80"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {/* Type tabs */}
            <Tabs value={tipoFilter} onValueChange={handleTipoChange}>
              <TabsList className="scrollbar-none h-9 gap-0.5 overflow-x-auto rounded-lg border border-border/80 bg-muted/65 p-0.5">
                <TabsTrigger
                  value="all"
                  className="h-8 shrink-0 rounded-md px-3 text-xs"
                >
                  Todos
                </TabsTrigger>
                {Object.values(TipoProducto)
                  .filter((tipo) => tipo !== TipoProducto.SERVICIO)
                  .map((tipo) => (
                    <TabsTrigger
                      key={tipo}
                      value={tipo}
                      className="h-8 shrink-0 rounded-md px-3 text-xs"
                    >
                      {TIPO_LABELS[tipo]}
                    </TabsTrigger>
                  ))}
              </TabsList>
            </Tabs>

            {/* Marca select */}
            <Select value={marcaFilter} onValueChange={handleMarcaChange}>
              <SelectTrigger className="h-9 w-37.5 rounded-lg border-border/80 bg-muted/55 text-xs shadow-none transition-colors hover:bg-muted/80">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {marcas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Filtros popover */}
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
                className="w-70 rounded-xl border border-border/80 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
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

            {/* Seleccionar */}
            {canDelete && (
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-border/80 bg-muted/45 text-xs hover:bg-muted/80"
                onClick={handleSelectionModeToggle}
              >
                <CheckCircle2 className="size-3.5" />
                {selectionMode ? "Cancelar" : "Seleccionar"}
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

        {/* ── Category tabs (second row) ── */}
        <div className="flex w-full items-center justify-end">
          <Tabs
            value={categoriaFilter}
            onValueChange={handleCategoriaChange}
            className="max-w-full"
          >
            <TabsList className="scrollbar-none h-9 max-w-full gap-0.5 overflow-x-auto rounded-lg border border-border/80 bg-muted/65 p-0.5">
              <TabsTrigger
                value="all"
                className="h-8 shrink-0 rounded-md px-3 text-xs"
              >
                Todas
              </TabsTrigger>
              {categorias.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-xs"
                >
                  {cat.nombre}
                </TabsTrigger>
              ))}
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
          errorMessage="No se pudo cargar la lista de productos."
          onRetry={() => void refetch()}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          enableRowSelection={canDelete && selectionMode}
          enableColumnVisibility
          fillAvailableHeight
          columnVisibilityStorageKey="erp:productos:table-columns"
          bulkActionsBar={
            canDelete
              ? (selectedRows, clearSelection) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-xl"
                      onClick={() => {
                        const rows = selectedRows as ProductoListItem[];
                        const csv = buildProductosCsvRows(rows);
                        const blob = new Blob([csv], {
                          type: "text/csv;charset=utf-8;",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "productos.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`${rows.length} productos exportados`);
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
                          (selectedRows as ProductoListItem[]).map((r) => r.id),
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
              <Package className="size-12 opacity-20" />
              <p className="text-sm font-medium">No se encontraron productos</p>
              <p className="text-xs opacity-70">
                Prueba ajustando los filtros de búsqueda
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.data.map((p, index) => {
                  const CardComponent = ProductoCard;
                  return (
                  <CardComponent
                    key={p.id}
                    producto={p}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    isSelected={selectionMode && selectedCards.has(p.id)}
                    animationDelay={Math.min(index * 55, 440)}
                    onToggleSelect={
                      selectionMode
                        ? () =>
                            setSelectedCards((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            })
                        : undefined
                    }
                    onView={() => router.push(`/productos/${p.id}`)}
                    onEdit={() => router.push(`/productos/${p.id}/editar`)}
                    onDelete={() => setDeleteId(p.id)}
                  />
                  );
                })}
              </div>
              {data.meta.total > limit && (
                <div className="flex items-center justify-between mt-5">
                  <p className="text-xs text-muted-foreground">
                    {(page - 1) * limit + 1}–
                    {Math.min(page * limit, data.meta.total)} de{" "}
                    {data.meta.total} productos
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
                      return pages.map((pg, i) =>
                        pg === "..." ? (
                          <span
                            key={`ellipsis-${i}`}
                            className="px-1 text-muted-foreground text-xs"
                          >
                            …
                          </span>
                        ) : (
                          <Button
                            key={pg}
                            variant={page === pg ? "default" : "ghost"}
                            size="icon"
                            className="size-8 rounded-lg text-xs"
                            onClick={() => setPage(pg as number)}
                          >
                            {pg}
                          </Button>
                        ),
                      );
                    })()}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page >= Math.ceil(data.meta.total / limit)}
                      onClick={() => setPage(page + 1)}
                      title="Siguiente"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      disabled={page >= Math.ceil(data.meta.total / limit)}
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

      {/* AlertDialog: Bulk delete */}
      <AlertDialog
        open={bulkDeleteIds.length > 0}
        onOpenChange={(o) => (!o ? setBulkDeleteIds([]) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar {bulkDeleteIds.length} producto
                {bulkDeleteIds.length !== 1 ? "s" : ""}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0 w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? "Eliminando..."
                : `Sí, eliminar ${bulkDeleteIds.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Eliminar */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => (!o ? setDeleteId(null) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(null)}
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
                ¿Eliminar producto?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El producto será desactivado
                del sistema.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0 w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
