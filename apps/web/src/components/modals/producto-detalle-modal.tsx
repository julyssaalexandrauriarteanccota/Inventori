"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import {
  Barcode,
  Boxes,
  Cable,
  Calendar,
  Clock,
  Copy,
  DollarSign,
  FileText,
  Folder,
  Hash,
  ImageIcon,
  Laptop,
  Layers,
  Package,
  Pencil,
  QrCode,
  Settings2,
  Sparkles,
  Tag,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  CondicionProducto,
  RolUsuario,
  TipoProducto,
  type ProductoDetailItem,
  type ProductoImagenListItem,
} from "@erp/shared";

import { getApiAssetUrl, getApiAssetUrlCandidates } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useStockByProducto } from "@/hooks/use-inventario";
import { useProducto } from "@/hooks/use-productos";
import {
  RichDescriptionViewer,
  isRichDescriptionHtml,
} from "@/components/forms/rich-description-editor";
import { ProductCodePreview } from "@/components/products/product-code-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProductoDetalleModalProps {
  id: string | null;
  onClose: () => void;
  onEdit?: (producto: ProductoDetailItem) => void;
  canEdit?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Equipo",
  [TipoProducto.REPUESTO]: "Repuesto",
  [TipoProducto.INSUMO]: "Insumo",
  [TipoProducto.SERVICIO]: "Servicio",
  [TipoProducto.ACCESORIO]: "Accesorio",
};

const CONDICION_LABELS: Record<CondicionProducto, string> = {
  [CondicionProducto.NUEVO]: "Nuevo",
  [CondicionProducto.SEMINUEVO]: "Seminuevo",
  [CondicionProducto.USADO]: "Usado",
  [CondicionProducto.REACONDICIONADO]: "Reacondicionado",
  [CondicionProducto.RECUPERADO]: "Recuperado",
};

const TIPO_COLOR: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "bg-orange-500 shadow-orange-500/30",
  [TipoProducto.REPUESTO]: "bg-sky-500 shadow-sky-500/30",
  [TipoProducto.INSUMO]: "bg-emerald-500 shadow-emerald-500/30",
  [TipoProducto.SERVICIO]: "bg-violet-500 shadow-violet-500/30",
  [TipoProducto.ACCESORIO]: "bg-amber-500 shadow-amber-500/30",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `S/ ${Number(value).toFixed(2)}`;
}

function getProductImages(
  imagenes: ProductoImagenListItem[] | undefined,
  legacyImage: string | null | undefined,
) {
  if (imagenes?.length) return imagenes;
  if (!legacyImage) return [];
  return [
    {
      id: legacyImage,
      url: legacyImage,
      nombre: "Imagen principal",
      tipo: null,
      tamano: null,
      esPrincipal: true,
      orden: 0,
    },
  ];
}

function renderDescription(text: string) {
  if (isRichDescriptionHtml(text)) {
    return <RichDescriptionViewer value={text} />;
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoItem({
  label,
  value,
  icon: Icon,
  mono = false,
  copyable = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  mono?: boolean;
  copyable?: boolean;
}) {
  const textVal = typeof value === "string" ? value : null;
  return (
    <div className="group flex flex-col gap-1 min-w-0 w-full">
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex items-start gap-1.5 min-w-0 w-full">
        {Icon && (
          <Icon className="size-3.5 shrink-0 text-muted-foreground/40 transition-colors mt-0.5" />
        )}
        <span
          className={cn(
            "text-sm font-medium text-foreground break-words whitespace-normal leading-normal flex-1 min-w-0",
            mono && "font-mono",
          )}
        >
          {value || (
            <span className="text-muted-foreground/40 font-normal italic text-xs">
              —
            </span>
          )}
        </span>
        {copyable && textVal && (
          <button
            onClick={() => {
              void navigator.clipboard.writeText(textVal);
              toast.success("Copiado al portapapeles", { duration: 1500 });
            }}
            title="Copiar"
            className="ml-auto shrink-0 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-colors duration-150 rounded p-1 hover:bg-muted focus:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Copy className="size-3 text-muted-foreground/50" />
          </button>
        )}
      </div>
    </div>
  );
}

function AuditItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon: React.ElementType;
}) {
  const formatted = value
    ? new Date(value).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 ring-1 ring-border/50">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-medium tabular-nums">
          {formatted ?? "—"}
        </span>
      </div>
    </div>
  );
}

function ProductDetailImage({ src, alt }: { src: string; alt: string }) {
  const [attemptIndex, setAttemptIndex] = useState(0);
  const candidates = useMemo(() => getApiAssetUrlCandidates(src), [src]);
  const currentSrc = candidates[attemptIndex];

  if (!currentSrc) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground/60 bg-muted/5">
        <ImageIcon className="size-10 opacity-40" />
        <span className="text-xs font-medium">No se pudo cargar</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className="size-full object-contain mix-blend-multiply animate-in fade-in duration-300"
      referrerPolicy="no-referrer"
      onError={() => setAttemptIndex((index) => index + 1)}
    />
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, s) => (
        <div
          key={s}
          className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ProductoDetalleModal({
  id,
  onClose,
  onEdit,
  canEdit = false,
}: ProductoDetalleModalProps) {
  const { hasRole } = useAuth();
  const canViewInternalCosts = hasRole(RolUsuario.ADMIN);
  const { data: productoRes, isLoading, isError } = useProducto(id ?? undefined);
  const { data: stockRes } = useStockByProducto(id ?? undefined);

  const producto = productoRes?.data;
  const stockRows = stockRes?.data ?? [];
  const stockTotal = stockRows.reduce((total, row) => total + row.cantidad, 0);
  const [manualSelectedImageUrl, setManualSelectedImageUrl] = useState<string | null>(null);

  const images = useMemo(
    () => getProductImages(producto?.imagenes, producto?.imagen),
    [producto?.imagenes, producto?.imagen],
  );
  const selectedImageUrl =
    manualSelectedImageUrl &&
    images.some((image) => image.url === manualSelectedImageUrl)
      ? manualSelectedImageUrl
      : images.find((image) => image.esPrincipal)?.url ?? images[0]?.url ?? null;
  const selectedImage = images.find((image) => image.url === selectedImageUrl) ?? null;

  const showQr = Boolean(
    producto && !(producto.tipo === TipoProducto.EQUIPO || producto.tieneNumeroSerie),
  );
  const isServicio = producto?.tipo === TipoProducto.SERVICIO;
  const modelosCompatibles = producto?.modelosCompatibles ?? [];

  const tipoColorClass = producto ? TIPO_COLOR[producto.tipo] : "bg-muted";

  // Section numbers adjust when inventory section is hidden (services)
  const imgSectionNum = isServicio ? 3 : 4;
  const descSectionNum = isServicio ? 4 : 5;
  const auditSectionNum = isServicio ? 5 : 6;

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[88vh] max-h-[calc(100dvh-1rem)] w-full max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background p-0 shadow-2xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">

        {/* ── HEADER ── */}
        <DialogHeader className="shrink-0 border-b border-border/40 bg-background px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Product type icon tile */}
            <div
              className={cn(
                "flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ring-2 ring-background dark:ring-border transition-all",
                isLoading ? "bg-muted ring-0 shadow-none" : tipoColorClass,
              )}
            >
              {isLoading ? (
                <Package className="size-5 text-muted-foreground" />
              ) : producto?.tipo === TipoProducto.EQUIPO ? (
                <Laptop className="size-5 sm:size-6" />
              ) : producto?.tipo === TipoProducto.REPUESTO ? (
                <Wrench className="size-5 sm:size-6" />
              ) : producto?.tipo === TipoProducto.INSUMO ? (
                <Layers className="size-5 sm:size-6" />
              ) : producto?.tipo === TipoProducto.SERVICIO ? (
                <Sparkles className="size-5 sm:size-6" />
              ) : (
                <Cable className="size-5 sm:size-6" />
              )}
            </div>

            {/* Title + badges */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-xl font-semibold leading-tight font-display break-words pr-12 sm:pr-0">
                {isLoading ? (
                  <Skeleton className="h-5 w-48" />
                ) : (
                  producto?.nombre ?? "Detalle del producto"
                )}
              </DialogTitle>
              {producto && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {/* SKU chip */}
                  <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 border border-border/40">
                    {producto.sku}
                  </span>
                  {/* Tipo pill */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm whitespace-nowrap",
                      TIPO_COLOR[producto.tipo],
                    )}
                  >
                    {TIPO_LABELS[producto.tipo]}
                  </span>
                  {/* Activo pill */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                      producto.activo
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 dark:bg-emerald-600 dark:shadow-none"
                        : "bg-muted text-muted-foreground border border-border/60",
                    )}
                  >
                    {producto.activo ? (
                      <span className="relative flex size-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-white" />
                      </span>
                    ) : (
                      <span className="size-1.5 rounded-full inline-block bg-muted-foreground/40" />
                    )}
                    {producto.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              )}
              <DialogDescription className="sr-only">
                Información detallada del producto.
              </DialogDescription>
            </div>

            {/* Edit button */}
            {canEdit && producto && (
              <Button
                size="sm"
                className="gap-1.5 shrink-0 mr-8 sm:mr-10 h-9 rounded-xl px-3.5 bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30 dark:bg-orange-500 dark:hover:bg-orange-600 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-95"
                onClick={() => onEdit?.(producto)}
                aria-label="Editar producto"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline text-xs font-semibold">Editar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-5">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError || !producto ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              No se pudo cargar la información del producto.
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">

              {/* ── 1 · Clasificación ── */}
              <section className="rounded-2xl border border-border/60 border-l-4 border-l-sky-500 bg-card/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white shadow-sm shadow-sky-500/30">
                    1
                  </span>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-500/30 dark:bg-sky-600 dark:shadow-none">
                    <Package className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground font-sans">Clasificación</h3>
                    <p className="text-[11px] text-muted-foreground">Tipo, categoría y datos de identificación</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <InfoItem label="Nombre" value={producto.nombre} icon={FileText} />
                  <InfoItem
                    label="Categoría"
                    value={
                      producto.categoria?.padre
                        ? `${producto.categoria.padre.nombre} / ${producto.categoria.nombre}`
                        : producto.categoria?.nombre
                    }
                    icon={Folder}
                  />
                  {!isServicio && (
                    <InfoItem
                      label="Marca"
                      value={producto.marca?.nombre ?? "Sin marca"}
                      icon={Tag}
                    />
                  )}
                  <InfoItem
                    label="Unidad de medida"
                    value={`${producto.unidadMedida.codigo} · ${producto.unidadMedida.nombre}`}
                    icon={Boxes}
                  />
                  {!isServicio && (
                    <div className="flex flex-col gap-1 min-w-0 w-full">
                      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                        {producto.tipo === TipoProducto.EQUIPO ? "Modelo" : "Modelos compatibles"}
                      </span>
                      {producto.tipo === TipoProducto.EQUIPO ? (
                        <div className="flex items-start gap-1.5">
                          <Settings2 className="size-3.5 shrink-0 text-muted-foreground/40 mt-0.5" />
                          <span className="text-sm font-medium text-foreground">
                            {producto.modeloCatalogo?.nombre ?? producto.modelo ?? "Sin modelo"}
                          </span>
                        </div>
                      ) : modelosCompatibles.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {modelosCompatibles.map(({ modeloCatalogo }) => (
                            <Badge
                              key={modeloCatalogo.id}
                              variant="secondary"
                              className="max-w-full truncate text-[10px]"
                            >
                              {modeloCatalogo.marca?.nombre
                                ? `${modeloCatalogo.marca.nombre} · ${modeloCatalogo.nombre}`
                                : modeloCatalogo.nombre}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 font-normal italic text-xs">
                          Sin compatibilidades registradas
                        </span>
                      )}
                    </div>
                  )}
                  {!isServicio && producto.condicion && (
                    <InfoItem
                      label="Condición"
                      value={CONDICION_LABELS[producto.condicion] ?? producto.condicion}
                      icon={Package}
                    />
                  )}
                </div>
              </section>

              {/* ── 2 · Precios y Reglas ── */}
              <section className="rounded-2xl border border-border/60 border-l-4 border-l-emerald-500 bg-card/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-sm shadow-emerald-500/30">
                    2
                  </span>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 dark:bg-emerald-600 dark:shadow-none">
                    <DollarSign className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground font-sans">Precios y Reglas</h3>
                    <p className="text-[11px] text-muted-foreground">Tarifas, márgenes y configuración comercial</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {(!isServicio || canViewInternalCosts) && (
                    <InfoItem
                      label={isServicio ? "Costo referencial" : "Precio compra"}
                      value={formatCurrency(producto.precioCompra)}
                      icon={DollarSign}
                      mono
                    />
                  )}
                  <InfoItem
                    label={isServicio ? "Precio base" : "Precio venta"}
                    value={formatCurrency(producto.precioVenta)}
                    icon={DollarSign}
                    mono
                  />
                  {!isServicio && (
                    <InfoItem
                      label="Precio mínimo"
                      value={formatCurrency(producto.precioMinimo)}
                      icon={DollarSign}
                      mono
                    />
                  )}
                  <InfoItem
                    label={isServicio ? "Tiempo estimado" : "Stock mínimo de alerta"}
                    value={
                      isServicio
                        ? producto.tiempoEstimadoMin
                          ? `${producto.tiempoEstimadoMin} min`
                          : null
                        : String(producto.stockMinimo ?? 0)
                    }
                    icon={isServicio ? Clock : Hash}
                  />
                </div>
                {/* Feature flags */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-4">
                  {(
                    [
                      ["Maneja inventario", producto.manejaInventario],
                      ["Tiene N° serie", producto.tieneNumeroSerie],
                      ["Consumible", producto.esConsumible],
                      ["Requiere repuestos", producto.requiereRepuestos],
                    ] as [string, boolean][]
                  ).map(([label, enabled]) => (
                    <Badge
                      key={label}
                      variant={enabled ? "secondary" : "outline"}
                      className={cn(
                        "text-[10px] font-semibold",
                        !enabled && "text-muted-foreground/60 border-border/50",
                      )}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </section>

              {/* ── 3 · Inventario y Códigos (non-service only) ── */}
              {!isServicio && (
                <section className="rounded-2xl border border-border/60 border-l-4 border-l-indigo-500 bg-card/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white shadow-sm shadow-indigo-500/30">
                      3
                    </span>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 dark:bg-indigo-600 dark:shadow-none">
                      <Boxes className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground font-sans">Inventario y Códigos</h3>
                      <p className="text-[11px] text-muted-foreground">SKU, códigos y niveles de stock por almacén</p>
                    </div>
                  </div>

                  {/* Code fields */}
                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 mb-5">
                    <InfoItem label="SKU" value={producto.sku} icon={Hash} mono copyable />
                    <InfoItem
                      label="Código de barras"
                      value={producto.codigoBarras}
                      icon={Barcode}
                      mono
                      copyable
                    />
                    {showQr && (
                      <InfoItem
                        label="Código QR"
                        value={producto.codigoQr}
                        icon={QrCode}
                        mono
                        copyable
                      />
                    )}
                  </div>

                  {/* Visual barcode / QR preview */}
                  <ProductCodePreview
                    sku={producto.sku}
                    barcodeValue={producto.codigoBarras}
                    qrValue={producto.codigoQr}
                    showQr={showQr}
                    compact
                    className="rounded-xl border border-border bg-muted/5 p-4 mb-5"
                  />

                  {/* Stock per warehouse */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap justify-between items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800/60 border-l-4 border-l-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Stock total:
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {stockTotal} unidades
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Almacenes con stock:
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {stockRows.filter((row) => row.cantidad > 0).length}
                        </span>
                      </div>
                    </div>

                    {stockRows.length ? (
                      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
                        <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] gap-2 border-b border-border/50 bg-muted/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Almacén</span>
                          <span className="text-right">Stock</span>
                          <span className="text-right">Alerta mín.</span>
                        </div>
                        {stockRows.map((row) => (
                          <div
                            key={row.id}
                            className="grid grid-cols-[minmax(0,1fr)_80px_80px] gap-2 border-b border-border/30 last:border-0 px-3 py-2 text-xs"
                          >
                            <span className="truncate font-medium text-foreground">
                              {row.almacen.nombre}
                            </span>
                            <span className="font-mono font-bold text-right text-foreground">
                              {row.cantidad}
                            </span>
                            <span className="font-mono text-muted-foreground text-right">
                              {producto.stockMinimo}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/75 bg-muted/10 px-4 py-6 text-center text-xs text-muted-foreground">
                        Sin stock registrado en almacenes.
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ── 4 (or 3 for services) · Imágenes ── */}
              <section className="rounded-2xl border border-border/60 border-l-4 border-l-violet-500 bg-card/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white shadow-sm shadow-violet-500/30">
                    {imgSectionNum}
                  </span>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white shadow-sm shadow-violet-500/30 dark:bg-violet-600 dark:shadow-none">
                    <ImageIcon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground font-sans">Imágenes</h3>
                    <p className="text-[11px] text-muted-foreground">Galería de imágenes del producto</p>
                  </div>
                </div>

                <div className="relative flex aspect-[16/9] max-h-72 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-muted/10 mb-4">
                  {selectedImage ? (
                    <ProductDetailImage
                      key={selectedImage.url}
                      src={selectedImage.url}
                      alt={selectedImage.nombre ?? producto.nombre}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                      <ImageIcon className="size-10 opacity-40 text-violet-500" />
                      <span className="text-xs font-semibold">Sin imagen registrada</span>
                    </div>
                  )}
                  {selectedImage?.esPrincipal && (
                    <Badge className="absolute left-3 top-3 bg-violet-500 text-white font-bold shadow-xs">
                      Principal
                    </Badge>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Galería ({images.length})
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                      {images.map((image, index) => {
                        const isSelected = image.url === selectedImageUrl;
                        return (
                          <button
                            key={`${image.url}-${index}`}
                            type="button"
                            className={cn(
                              "relative size-14 shrink-0 overflow-hidden rounded-lg border bg-card transition-all cursor-pointer",
                              isSelected
                                ? "scale-95 border-violet-500 ring-2 ring-violet-500/20"
                                : "border-border/70 hover:border-violet-500/45",
                            )}
                            onClick={() => setManualSelectedImageUrl(image.url)}
                          >
                            <img
                              src={getApiAssetUrl(image.url)}
                              alt={image.nombre ?? producto.nombre}
                              className="size-full object-cover mix-blend-multiply"
                              referrerPolicy="no-referrer"
                            />
                            {image.esPrincipal && (
                              <span className="absolute right-1 top-1 size-2 rounded-full bg-violet-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* ── 5 (or 4 for services) · Descripción y Ficha Técnica ── */}
              <section className="rounded-2xl border border-border/60 border-l-4 border-l-amber-500 bg-card/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-sm shadow-amber-500/30">
                    {descSectionNum}
                  </span>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm shadow-amber-500/30 dark:bg-amber-600 dark:shadow-none">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground font-sans">Descripción y Ficha Técnica</h3>
                    <p className="text-[11px] text-muted-foreground">Descripción comercial y especificaciones técnicas</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm leading-relaxed text-foreground/90 animate-in fade-in duration-300">
                  {producto.descripcion ? (
                    renderDescription(producto.descripcion)
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Sin descripción comercial registrada.
                    </p>
                  )}
                </div>

                {producto.atributos && Object.keys(producto.atributos).length > 0 && (
                  <div className="mt-4 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 border-t border-border/40 pt-4">
                    {Object.entries(producto.atributos).map(([clave, valor]) => (
                      <InfoItem
                        key={clave}
                        label={clave}
                        value={valor == null ? "—" : String(valor)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── 6 (or 5 for services) · Auditoría ── */}
              <section className="rounded-2xl border border-border/60 border-l-4 border-l-slate-500 bg-slate-100/60 dark:bg-slate-900/40 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-bold text-white shadow-sm shadow-slate-600/30 dark:bg-slate-500 dark:shadow-slate-500/30">
                    {auditSectionNum}
                  </span>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-600 text-white shadow-sm shadow-slate-600/30 dark:bg-slate-500 dark:shadow-slate-500/30">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground font-sans">Auditoría</h3>
                    <p className="text-[11px] text-muted-foreground">Registro de creación y modificación</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AuditItem
                    label="Registrado el"
                    value={producto.createdAt}
                    icon={Calendar}
                  />
                  <AuditItem
                    label="Última actualización"
                    value={producto.updatedAt}
                    icon={Clock}
                  />
                </div>
              </section>

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
