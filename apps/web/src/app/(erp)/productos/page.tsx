"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Check,
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
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RolUsuario, TipoProducto, type ProductoListItem } from "@erp/shared";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useProductos,
  useDeleteProducto,
  useCategorias,
  useMarcas,
} from "@/hooks/use-productos";
import { useDebounce } from "@/hooks/use-debounce";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ErpBadge, ErpStatusBadge } from "@/components/erp-badges";
import { ProductoCard } from "@/components/products/producto-card";
import { ProductoDetalleModal } from "@/components/modals/producto-detalle-modal";
import { EtiquetaProductoPdfDocument } from "@/components/products/etiqueta-producto-pdf";
import { ProductoThumbnail } from "@/components/products/producto-thumbnail";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import {
  fetchAssetAsDataUrl,
  generateBarcodeDataUrl,
  generateQrDataUrl,
  resolveProductCodeValues,
} from "@/lib/product-code-utils";
import { getPrimaryProductImage } from "@/lib/product-images";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const VIEW_MODE_STORAGE_KEY = "erp:productos:view-mode";

function getInitialViewMode() {
  if (typeof window === "undefined") return "list" as const;
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "grid" ? "grid" : "list";
}

function buildEtiquetaFilename(sku: string) {
  const safeSku = sku.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `etiqueta-${safeSku || "producto"}.pdf`;
}

type EtiquetaPreviewState = {
  producto: ProductoListItem;
  url: string;
  filename: string;
  qrValue: string | null;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductosPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const isMobile = useIsMobile();

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
  const [draftCategoriaFilter, setDraftCategoriaFilter] = useState<string>("all");
  const [draftMarcaFilter, setDraftMarcaFilter] = useState<string>("all");
  const [categoriaSearch, setCategoriaSearch] = useState("");
  const [marcaSearch, setMarcaSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(getInitialViewMode);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [printingProductId, setPrintingProductId] = useState<string | null>(
    null,
  );
  const [etiquetaPreview, setEtiquetaPreview] =
    useState<EtiquetaPreviewState | null>(null);
  const etiquetaFrameRef = useRef<HTMLIFrameElement | null>(null);

  const closeEtiquetaPreview = useCallback(() => {
    setEtiquetaPreview(null);
  }, []);

  useEffect(() => () => {
    if (etiquetaPreview) URL.revokeObjectURL(etiquetaPreview.url);
  }, [etiquetaPreview]);

  const { data: categoriasRes } = useCategorias(
    tipoFilter === "all" ? undefined : tipoFilter,
  );
  const { data: marcasRes } = useMarcas(
    tipoFilter === "all" ? undefined : tipoFilter,
  );
  const categorias = categoriasRes?.data ?? [];
  const marcas = marcasRes?.data ?? [];

  const filteredCategorias = useMemo(() => {
    return categorias.filter((cat) =>
      cat.nombre.toLowerCase().includes(categoriaSearch.toLowerCase())
    );
  }, [categorias, categoriaSearch]);

  const filteredMarcas = useMemo(() => {
    return marcas.filter((m) =>
      m.nombre.toLowerCase().includes(marcaSearch.toLowerCase())
    );
  }, [marcas, marcaSearch]);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      tipo: tipoFilter === "all" ? undefined : tipoFilter,
      // Si el usuario no filtró por un tipo específico, ocultamos SERVICIO
      // (se gestiona en su propia pantalla /erp/servicios).
      excluirTipos: tipoFilter === "all" ? [TipoProducto.SERVICIO] : undefined,
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

      const { barcodeValue, qrValue } = resolveProductCodeValues({
        sku: producto.sku,
        barcodeValue: producto.codigoBarras,
        qrValue: producto.codigoQr,
        showQr: true,
      });

      if (!barcodeValue) {
        toast.error("No se pudo resolver el código de barras de la etiqueta.");
        return;
      }

      const loadingToastId = toast.loading(
        `Generando etiqueta de ${producto.sku}...`,
      );

      setPrintingProductId(producto.id);

      try {
        const [barcodeDataUrl, qrDataUrl, imageDataUrl] = await Promise.all([
          generateBarcodeDataUrl(barcodeValue),
          qrValue ? generateQrDataUrl(qrValue) : Promise.resolve(null),
          fetchAssetAsDataUrl(getPrimaryProductImage(producto)),
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
        const filename = buildEtiquetaFilename(producto.sku);

        setEtiquetaPreview({
          producto,
          url,
          filename,
          qrValue,
        });

        toast.success(
          qrValue
            ? `Etiqueta lista para revisar: ${producto.sku}`
            : `Etiqueta lista para revisar: ${producto.sku}. El QR se maneja por unidad física.`,
          { id: loadingToastId },
        );
      } catch (error) {
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

  const handlePrintEtiquetaPreview = useCallback(() => {
    const frameWindow = etiquetaFrameRef.current?.contentWindow;
    if (!frameWindow) {
      toast.error("La vista previa aún no está lista.");
      return;
    }

    frameWindow.focus();
    frameWindow.print();
  }, []);

  const handleDownloadEtiquetaPreview = useCallback(() => {
    if (!etiquetaPreview) return;

    const a = document.createElement("a");
    a.href = etiquetaPreview.url;
    a.download = etiquetaPreview.filename;
    a.click();
  }, [etiquetaPreview]);

  const handleOpenEtiquetaPreview = useCallback(() => {
    if (!etiquetaPreview) return;

    window.open(etiquetaPreview.url, "_blank", "noopener,noreferrer");
  }, [etiquetaPreview]);

  const columns = useMemo<ColumnDef<ProductoListItem>[]>(
    () => [
      {
        id: "producto",
        header: "Producto info",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ProductoThumbnail
              src={getPrimaryProductImage(row.original)}
              alt={row.original.nombre}
              fallback={row.original.sku}
              size={40}
              rounded="lg"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-sm text-foreground truncate max-w-56" title={row.original.nombre}>
                {row.original.nombre}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {row.original.sku}
                </span>
                {row.original.modelo && (
                  <>
                    <span className="text-[10px] text-muted-foreground/50">|</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-28" title={row.original.modelo}>
                      {row.original.modelo}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
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
          const tone = pct >= 30 ? "success" : pct >= 10 ? "warning" : "danger";
          return (
            <ErpBadge tone={tone} className="tabular-nums whitespace-nowrap">
              {formatPercent(pct)}
            </ErpBadge>
          );
        },
      },
      {
        id: "stock",
        header: "Stock",
        cell: ({ row }) => {
          if (row.original.tipo === TipoProducto.SERVICIO) {
            return <span className="text-xs text-muted-foreground">No aplica</span>;
          }
          const stock = row.original.stockActual;
          const min = row.original.stockMinimo;
          const isLow = stock <= min;
          return (
            <div className="flex flex-col">
              <span className={cn("font-mono text-sm font-semibold", isLow ? "text-destructive" : "text-foreground")}>
                {stock}
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                mín: {min}
              </span>
            </div>
          );
        },
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
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              onClick={() => setViewDetailId(row.original.id)}
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
                    className="size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Acciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuGroup>
                    {canEdit && (
                      <DropdownMenuItem
                        onClick={() => {
                          router.push(`/productos/${row.original.id}/editar`);
                        }}
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

  const handleClearAllFilters = useCallback(() => {
    setSearch("");
    setTipoFilter("all");
    setCategoriaFilter("all");
    setMarcaFilter("all");
    setEstadoFilter("all");
    setDraftEstadoFilter("all");
    setDraftCategoriaFilter("all");
    setDraftMarcaFilter("all");
    setCategoriaSearch("");
    setMarcaSearch("");
    setPage(1);
  }, []);

  const openFilterPopover = useCallback(
    (open: boolean) => {
      setFilterPopoverOpen(open);
      if (open) {
        setDraftEstadoFilter(estadoFilter);
        setDraftCategoriaFilter(categoriaFilter);
        setDraftMarcaFilter(marcaFilter);
        setCategoriaSearch("");
        setMarcaSearch("");
      }
    },
    [estadoFilter, categoriaFilter, marcaFilter],
  );

  const applyFilterPopover = useCallback(() => {
    setEstadoFilter(draftEstadoFilter);
    setCategoriaFilter(draftCategoriaFilter);
    setMarcaFilter(draftMarcaFilter);
    setPage(1);
    setFilterPopoverOpen(false);
  }, [draftEstadoFilter, draftCategoriaFilter, draftMarcaFilter]);

  const clearFilterPopover = useCallback(() => {
    setDraftEstadoFilter("all");
    setDraftCategoriaFilter("all");
    setDraftMarcaFilter("all");
    setEstadoFilter("all");
    setCategoriaFilter("all");
    setMarcaFilter("all");
    setCategoriaSearch("");
    setMarcaSearch("");
    setPage(1);
    setFilterPopoverOpen(false);
  }, []);

  const activeFilterCount =
    (estadoFilter !== "all" ? 1 : 0) +
    (categoriaFilter !== "all" ? 1 : 0) +
    (marcaFilter !== "all" ? 1 : 0);

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative backing glows — coordinated with stat-card palette */}
      <div className="pointer-events-none absolute -z-10 bg-sky-400/8 dark:bg-sky-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-violet-400/6 dark:bg-violet-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-amber-400/5 dark:bg-amber-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />
      <TopbarActions>
        <RealtimeStatus />
        {canEdit ? (
          <Button
            onClick={() => router.push("/productos/nuevo")}
            className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nuevo producto</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        ) : null}
      </TopbarActions>
      <h1 className="sr-only">Productos</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total productos"
          value={statsTotal?.meta?.total}
          icon={Package}
          theme="sky"
          subtitle="En catálogo"
        />
        <StatCard
          label="Activos"
          value={statsActivo?.meta?.total}
          icon={CheckCircle2}
          theme="emerald"
          subtitle="Disponibles"
        />
        <StatCard
          label="Equipos"
          value={statsEquipos?.meta?.total}
          icon={Tag}
          theme="indigo"
          subtitle="Tipo equipo"
        />
        <StatCard
          label="Repuestos"
          value={statsRepuestos?.meta?.total}
          icon={Package}
          theme="amber"
          subtitle="Tipo repuesto"
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
            <ToolbarSearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar por SKU, nombre, modelo…"
              className="shrink sm:w-auto lg:w-auto flex-1 max-w-sm"
              inputClassName="border-border bg-background hover:border-sky-400/60 dark:hover:border-sky-500/60 focus-visible:border-sky-500 dark:focus-visible:border-sky-400 focus-visible:ring-sky-400/25 dark:focus-visible:ring-sky-500/25 shadow-sm"
            />

            <Tabs value={tipoFilter} onValueChange={handleTipoChange} className="w-full sm:w-auto min-w-0 shrink-0 sm:ml-2">
              <TabsList className="scrollbar-none h-9 gap-0.5 overflow-x-auto rounded-lg border border-border/70 bg-muted/70 p-0.5 w-full justify-start">
                <TabsTrigger value="all" className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 dark:data-[state=active]:bg-sky-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground">
                  Todos
                </TabsTrigger>
                {Object.values(TipoProducto)
                  .filter((tipo) => tipo !== TipoProducto.SERVICIO)
                  .map((tipo) => (
                    <TabsTrigger key={tipo} value={tipo} className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground">
                      {TIPO_LABELS[tipo]}
                    </TabsTrigger>
                  ))}
              </TabsList>
            </Tabs>

            {/* Clear Filters Link */}
            {(tipoFilter !== "all" || categoriaFilter !== "all" || marcaFilter !== "all" || estadoFilter !== "all" || search !== "") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/5 rounded-lg px-2"
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
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

            {/* Selection Mode Button */}
            {canDelete && (
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                size="sm"
                className="h-9 w-9 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-lg border-border/80 bg-muted/30 text-xs hover:bg-muted/50 transition-all"
                onClick={handleSelectionModeToggle}
              >
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {selectionMode ? "Cancelar" : "Seleccionar"}
                </span>
              </Button>
            )}

            {/* Advanced Filters Button */}
            <ToolbarFiltersButton
              open={filterPopoverOpen}
              activeCount={activeFilterCount}
              onClick={() => openFilterPopover(true)}
            />
          </div>
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
          enableColumnResizing={true}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          enableRowSelection={canDelete && selectionMode}
          enableColumnVisibility
          fillAvailableHeight={!isMobile}
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
        <div className="flex min-h-0 w-full min-w-0 flex-col gap-3 flex-1">
          {isLoading ? (
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 min-[450px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-3 space-y-3 animate-pulse"
                  >
                    <div className="aspect-square w-full rounded-lg bg-muted" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 rounded bg-muted w-3/4" />
                      <div className="h-2 rounded bg-muted w-1/2" />
                    </div>
                    <div className="h-3 rounded bg-muted w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          ) : !data?.data?.length ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground gap-3 border border-border/70 rounded-2xl bg-card shadow-xs">
              <Package className="size-12 opacity-20" />
              <p className="text-sm font-medium">No se encontraron productos</p>
              <p className="text-xs opacity-70">
                Prueba ajustando los filtros de búsqueda
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                <div className="grid grid-cols-1 min-[450px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
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
                        onView={() => setViewDetailId(p.id)}
                        onEdit={() => router.push(`/productos/${p.id}/editar`)}
                        onDelete={() => setDeleteId(p.id)}
                      />
                    );
                  })}
                </div>
              </div>
              {(data?.meta?.total ?? 0) > 0 && (
                <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-[0_12px_24px_-34px_rgba(15,23,42,0.38)] sm:flex-row sm:items-center sm:justify-between shrink-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        Filas por página
                      </span>
                      <Select
                        value={String(limit)}
                        onValueChange={(value) => handleLimitChange(Number(value))}
                      >
                        <SelectTrigger className="h-8 min-w-22 rounded-md border-border/80 bg-muted/55 text-xs shadow-none hover:bg-muted/80">
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
                      {(page - 1) * limit + 1}–{Math.min(page * limit, data.meta.total)} de {data.meta.total} productos
                    </p>
                  </div>

                  {Math.ceil(data.meta.total / limit) > 1 && (
                    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(1)}
                        disabled={page <= 1}
                        className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95"
                        title="Primera página"
                      >
                        <ChevronsLeft className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                        className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95 sm:px-2.5"
                      >
                        <ChevronLeft className="size-3.5" />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                      {(() => {
                        const totalPages = Math.ceil(data.meta.total / limit);
                        const pages: (number | "ellipsis")[] = [];
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (page > 3) pages.push("ellipsis");
                          for (
                            let i = Math.max(2, page - 1);
                            i <= Math.min(totalPages - 1, page + 1);
                            i++
                          )
                            pages.push(i);
                          if (page < totalPages - 2) pages.push("ellipsis");
                          pages.push(totalPages);
                        }
                        return pages.map((pg, i) =>
                          pg === "ellipsis" ? (
                            <span
                              key={`ellipsis-${i}`}
                              className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                            >
                              ...
                            </span>
                          ) : (
                            <Button
                              key={pg}
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(pg as number)}
                              className={cn(
                                "h-8 w-8 rounded-md border-border/80 px-0 text-xs shadow-none transition-all duration-150 active:scale-95",
                                pg === page
                                  ? "border-primary/20 bg-primary/10 text-foreground pointer-events-none"
                                  : "bg-muted/55 hover:bg-muted/80",
                              )}
                            >
                              {pg}
                            </Button>
                          ),
                        );
                      })()}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= Math.ceil(data.meta.total / limit)}
                        className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95 sm:px-2.5"
                      >
                        <span className="hidden sm:inline">Siguiente</span>
                        <ChevronRight className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.ceil(data.meta.total / limit))}
                        disabled={page >= Math.ceil(data.meta.total / limit)}
                        className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95"
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

      {/* ── Advanced Filters Sheet ── */}
      <Sheet open={filterPopoverOpen} onOpenChange={openFilterPopover}>
        <SheetContent className="w-full sm:max-w-md flex flex-col h-full rounded-l-3xl border-l p-0 border-border/80 shadow-2xl">
          <SheetHeader className="border-b px-5 py-4 text-left bg-muted/5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              <SheetTitle className="text-base font-bold text-foreground">Filtros avanzados</SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground mt-1">
              Ajusta los filtros adicionales para afinar el catálogo de productos.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Estado Filter (Premium Segmented Control) */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Estado del Producto
              </label>
              <div className="flex w-full gap-1 p-1 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/40">
                {[
                  { value: "all", label: "Todos" },
                  { value: "activos", label: "Activos" },
                  { value: "inactivos", label: "Inactivos" },
                ].map((option) => {
                  const isActive = draftEstadoFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-lg py-1.5 px-3 text-xs font-semibold transition-all duration-300 relative select-none",
                        isActive
                          ? "bg-background text-primary shadow-xs border border-border/80 font-bold scale-[1.01]"
                          : "text-muted-foreground hover:bg-muted/45 hover:text-foreground active:scale-[0.99]"
                      )}
                      onClick={() => setDraftEstadoFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categoría Filter */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Categoría
                </label>
                {draftCategoriaFilter !== "all" && (
                  <button
                    onClick={() => setDraftCategoriaFilter("all")}
                    className="text-[10px] text-destructive hover:underline font-semibold font-normal normal-case"
                  >
                    Restablecer
                  </button>
                )}
              </div>
              
              <div className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-3 shadow-3xs">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Buscar categoría..."
                    value={categoriaSearch}
                    onChange={(e) => setCategoriaSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-border bg-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  <button
                    type="button"
                    onClick={() => setDraftCategoriaFilter("all")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition-all duration-200 border",
                      draftCategoriaFilter === "all"
                        ? "bg-primary/10 border-primary/20 text-primary font-bold shadow-3xs"
                        : "border-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Todas las categorías</span>
                    {draftCategoriaFilter === "all" && <Check className="size-3.5" />}
                  </button>
                  {filteredCategorias.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDraftCategoriaFilter(cat.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition-all duration-200 border",
                        draftCategoriaFilter === cat.id
                          ? "bg-primary/10 border-primary/20 text-primary font-bold shadow-3xs"
                          : "border-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{cat.nombre}</span>
                      {draftCategoriaFilter === cat.id && <Check className="size-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Marca Filter */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Marca
                </label>
                {draftMarcaFilter !== "all" && (
                  <button
                    onClick={() => setDraftMarcaFilter("all")}
                    className="text-[10px] text-destructive hover:underline font-semibold font-normal normal-case"
                  >
                    Restablecer
                  </button>
                )}
              </div>
              
              <div className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-3 shadow-3xs">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Buscar marca..."
                    value={marcaSearch}
                    onChange={(e) => setMarcaSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-border bg-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  <button
                    type="button"
                    onClick={() => setDraftMarcaFilter("all")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition-all duration-200 border",
                      draftMarcaFilter === "all"
                        ? "bg-primary/10 border-primary/20 text-primary font-bold shadow-3xs"
                        : "border-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Todas las marcas</span>
                    {draftMarcaFilter === "all" && <Check className="size-3.5" />}
                  </button>
                  {filteredMarcas.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDraftMarcaFilter(m.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition-all duration-200 border",
                        draftMarcaFilter === m.id
                          ? "bg-primary/10 border-primary/20 text-primary font-bold shadow-3xs"
                          : "border-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{m.nombre}</span>
                      {draftMarcaFilter === m.id && <Check className="size-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t px-5 py-4 bg-muted/10 gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl text-xs text-muted-foreground hover:bg-muted/50 active:scale-95 transition-all duration-300"
              onClick={clearFilterPopover}
            >
              Limpiar filtros
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-xl text-xs gap-1.5 hover:scale-[1.02] hover:shadow-xs active:scale-95 transition-all duration-300 font-semibold"
              onClick={applyFilterPopover}
            >
              <Check className="size-3.5" />
              Aplicar filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ProductoDetalleModal
        id={viewDetailId}
        onClose={() => setViewDetailId(null)}
        canEdit={canEdit}
        onEdit={(producto) => {
          setViewDetailId(null);
          router.push(`/productos/${producto.id}/editar`);
        }}
      />

      <Dialog
        open={!!etiquetaPreview}
        onOpenChange={(open) => {
          if (!open) closeEtiquetaPreview();
        }}
      >
        <DialogContent className="flex max-h-[94vh] w-[min(96vw,980px)] max-w-[980px] flex-col overflow-hidden rounded-2xl p-0 sm:max-w-[980px]">
          <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
            <DialogTitle>Vista previa de etiqueta</DialogTitle>
            <DialogDescription>
              {etiquetaPreview
                ? `${etiquetaPreview.producto.sku} · ${etiquetaPreview.producto.nombre}`
                : "Revisa la etiqueta antes de imprimir."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 bg-muted/35 p-4">
            {etiquetaPreview ? (
              <iframe
                ref={etiquetaFrameRef}
                src={etiquetaPreview.url}
                title={`Etiqueta ${etiquetaPreview.producto.sku}`}
                className="h-[min(70vh,760px)] w-full rounded-xl border border-border bg-background shadow-sm"
              />
            ) : null}
          </div>

          <DialogFooter className="gap-2 border-t border-border/70 px-5 py-4 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={closeEtiquetaPreview}
              className="rounded-xl"
            >
              Cerrar
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadEtiquetaPreview}
                className="gap-2 rounded-xl"
                disabled={!etiquetaPreview}
              >
                <Download className="size-4" />
                Descargar PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenEtiquetaPreview}
                className="gap-2 rounded-xl"
                disabled={!etiquetaPreview}
              >
                <Eye className="size-4" />
                Abrir PDF
              </Button>
              <Button
                type="button"
                onClick={handlePrintEtiquetaPreview}
                className="gap-2 rounded-xl"
                disabled={!etiquetaPreview}
              >
                <Printer className="size-4" />
                Imprimir
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Bulk delete */}
      <AlertDialog
        open={bulkDeleteIds.length > 0}
        onOpenChange={(o) => (!o ? setBulkDeleteIds([]) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-3xl p-6 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
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
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0 hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
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
        <AlertDialogContent className="w-full sm:max-w-md rounded-3xl p-6 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(null)}
            className="absolute right-4 top-4 size-6 text-muted-foreground hover:bg-muted mt-0 border-0 z-10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 active:scale-95 active:duration-150"
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
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0 hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
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
