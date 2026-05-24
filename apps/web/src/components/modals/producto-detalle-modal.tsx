"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import {
  Barcode,
  Boxes,
  Cable,
  Clock,
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
  X,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductoDetalleModalProps {
  id: string | null;
  onClose: () => void;
  onEdit?: (producto: ProductoDetailItem) => void;
  canEdit?: boolean;
}

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
    <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-12">
      <div className="lg:col-span-6 space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="lg:col-span-6 space-y-4">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

function renderDescription(text: string) {
  if (isRichDescriptionHtml(text)) {
    return <RichDescriptionViewer value={text} />;
  }

  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
}

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
  const [manualSelectedImageUrl, setManualSelectedImageUrl] = useState<
    string | null
  >(null);

  const images = useMemo(
    () => getProductImages(producto?.imagenes, producto?.imagen),
    [producto?.imagenes, producto?.imagen],
  );
  const selectedImageUrl =
    manualSelectedImageUrl &&
    images.some((image) => image.url === manualSelectedImageUrl)
      ? manualSelectedImageUrl
      : images.find((image) => image.esPrincipal)?.url ?? images[0]?.url ?? null;
  const selectedImage =
    images.find((image) => image.url === selectedImageUrl) ?? null;
  const showQr = Boolean(
    producto &&
      !(producto.tipo === TipoProducto.EQUIPO || producto.tieneNumeroSerie),
  );
  const isServicio = producto?.tipo === TipoProducto.SERVICIO;

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[92vh] w-[min(96vw,1180px)] max-w-[1180px] flex-col overflow-hidden rounded-3xl p-0 sm:max-w-[1180px] border-border/80 shadow-2xl">
        <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
          <div className="flex min-w-0 items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-semibold text-foreground">
                {producto?.nombre ?? "Detalle del producto"}
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                {producto ? (
                  <>
                    <Badge variant="secondary" className="font-mono text-[10px] bg-muted/60 text-muted-foreground border-border/40">
                      {producto.sku}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/2 text-primary font-semibold">
                      {TIPO_LABELS[producto.tipo]}
                    </Badge>
                    <Badge variant={producto.activo ? "default" : "outline"} className="text-[10px]">
                      {producto.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </>
                ) : (
                  "Información detallada del producto."
                )}
              </DialogDescription>
            </div>
            {canEdit && producto ? (
              <Button
                type="button"
                size="sm"
                className="shrink-0 rounded-xl text-xs gap-1.5 h-9 px-4 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-xs"
                onClick={() => onEdit?.(producto)}
              >
                <Pencil className="size-3.5" />
                Editar
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/15 p-4 sm:p-5">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError || !producto ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card text-center text-muted-foreground">
              <Package className="size-10 opacity-40 text-primary" />
              <p className="text-sm font-semibold">No se pudo cargar la información del producto.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Left side: Datos base, Precios, Inventario */}
                <div className="lg:col-span-6 space-y-4 p-4 sm:p-5">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                    <Package className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Clasificación y Datos Base</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field className="sm:col-span-2">
                      <FieldLabel>{isServicio ? "Nombre del servicio" : "Nombre"}</FieldLabel>
                      <Input value={producto.nombre} readOnly startIcon={FileText} className="bg-muted/10 cursor-default" />
                    </Field>

                    <Field>
                      <FieldLabel>Categoría / subcategoría</FieldLabel>
                      <Input
                        value={
                          producto.categoria?.padre
                            ? `${producto.categoria.padre.nombre} / ${producto.categoria.nombre}`
                            : producto.categoria?.nombre ?? "—"
                        }
                        readOnly
                        startIcon={Folder}
                        className="bg-muted/10 cursor-default"
                      />
                    </Field>

                    {!isServicio && (
                      <Field>
                        <FieldLabel>Marca</FieldLabel>
                        <Input value={producto.marca?.nombre ?? "Sin marca"} readOnly startIcon={Tag} className="bg-muted/10 cursor-default" />
                      </Field>
                    )}

                    <Field>
                      <FieldLabel>Unidad de medida</FieldLabel>
                      <Input
                        value={`${producto.unidadMedida.codigo} · ${producto.unidadMedida.nombre}`}
                        readOnly
                        startIcon={Boxes}
                        className="bg-muted/10 cursor-default"
                      />
                    </Field>

                    {!isServicio && (
                      <Field>
                        <FieldLabel>{producto.tipo === TipoProducto.EQUIPO ? "Modelo" : "Modelo / compatibilidad"}</FieldLabel>
                        <Input
                          value={producto.modeloCatalogo?.nombre ?? producto.modelo ?? "Sin modelo"}
                          readOnly
                          startIcon={Settings2}
                          className="bg-muted/10 cursor-default"
                        />
                      </Field>
                    )}

                    {!isServicio && producto.condicion && (
                      <Field>
                        <FieldLabel>Condición</FieldLabel>
                        <Input
                          value={CONDICION_LABELS[producto.condicion] ?? "Sin condición"}
                          readOnly
                          startIcon={Package}
                          className="bg-muted/10 cursor-default"
                        />
                      </Field>
                    )}
                  </div>

                  {/* Precios y Finanzas */}
                  <div className="flex items-center gap-2 border-b border-border/40 pb-3 pt-2">
                    <DollarSign className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Precios y Reglas</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {(!isServicio || canViewInternalCosts) && (
                      <Field>
                        <FieldLabel>{isServicio ? "Costo referencial" : "Precio compra"}</FieldLabel>
                        <Input
                          value={formatCurrency(producto.precioCompra)}
                          readOnly
                          startIcon={DollarSign}
                          className="bg-muted/10 cursor-default font-mono"
                        />
                      </Field>
                    )}

                    <Field>
                      <FieldLabel>{isServicio ? "Precio base" : "Precio venta"}</FieldLabel>
                      <Input
                        value={formatCurrency(producto.precioVenta)}
                        readOnly
                        startIcon={DollarSign}
                        className="bg-muted/10 cursor-default font-mono"
                      />
                    </Field>

                    {!isServicio && (
                      <Field>
                        <FieldLabel>Precio mínimo</FieldLabel>
                        <Input
                          value={formatCurrency(producto.precioMinimo)}
                          readOnly
                          startIcon={DollarSign}
                          className="bg-muted/10 cursor-default font-mono"
                        />
                      </Field>
                    )}

                    <Field>
                      <FieldLabel>{isServicio ? "Tiempo estimado" : "Stock mínimo de alerta"}</FieldLabel>
                      <Input
                        value={
                          isServicio
                            ? producto.tiempoEstimadoMin
                              ? `${producto.tiempoEstimadoMin} min`
                              : "—"
                            : producto.stockMinimo ?? 0
                        }
                        readOnly
                        startIcon={isServicio ? Clock : Hash}
                        className="bg-muted/10 cursor-default"
                      />
                    </Field>
                  </div>

                  {/* Inventario y Códigos */}
                  <div className="flex items-center gap-2 border-b border-border/40 pb-3 pt-2">
                    <Boxes className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Inventario y Códigos</h3>
                  </div>

                  <div className="space-y-4">
                    {!isServicio && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel>SKU</FieldLabel>
                          <Input value={producto.sku} readOnly startIcon={Hash} className="bg-muted/10 cursor-default font-mono text-left" />
                        </Field>
                        <Field>
                          <FieldLabel>Código de barras</FieldLabel>
                          <Input value={producto.codigoBarras ?? "—"} readOnly startIcon={Barcode} className="bg-muted/10 cursor-default font-mono text-left" />
                        </Field>
                        {showQr && (
                          <Field className="sm:col-span-2">
                            <FieldLabel>Código QR</FieldLabel>
                            <Input value={producto.codigoQr ?? "—"} readOnly startIcon={QrCode} className="bg-muted/10 cursor-default font-mono text-left" />
                          </Field>
                        )}
                      </div>
                    )}

                    <ProductCodePreview
                      sku={producto.sku}
                      barcodeValue={producto.codigoBarras}
                      qrValue={producto.codigoQr}
                      showQr={showQr}
                      compact
                      className="rounded-xl border border-border bg-muted/5 p-4"
                    />

                    {!isServicio && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <span>Stock Total: {stockTotal} unidades</span>
                          <span>Almacenes con Stock: {stockRows.filter((row) => row.cantidad > 0).length}</span>
                        </div>

                        {stockRows.length ? (
                          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-3xs">
                            <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] gap-2 border-b border-border/50 bg-muted/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              <span>Almacén</span>
                              <span className="text-right">Stock</span>
                              <span className="text-right">Alerta Mín.</span>
                            </div>
                            {stockRows.map((row) => (
                              <div
                                key={row.id}
                                className="grid grid-cols-[minmax(0,1fr)_80px_80px] gap-2 border-b border-border/30 last:border-0 px-3 py-2 text-xs"
                              >
                                <span className="truncate font-medium text-foreground">{row.almacen.nombre}</span>
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
                    )}
                  </div>
                </div>

                {/* Right side: Imágenes, Descripción, Ficha Técnica */}
                <div className="border-t border-border/40 lg:col-span-6 lg:border-l lg:border-t-0 space-y-4 p-4 sm:p-5">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                    <ImageIcon className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Imágenes del producto</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-muted/10">
                      {selectedImage ? (
                        <ProductDetailImage
                          key={selectedImage.url}
                          src={selectedImage.url}
                          alt={selectedImage.nombre ?? producto.nombre}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                          <ImageIcon className="size-10 opacity-40 text-primary" />
                          <span className="text-xs font-semibold">Sin imagen</span>
                        </div>
                      )}
                      {selectedImage?.esPrincipal && (
                        <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground font-bold shadow-xs">
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
                                    ? "scale-95 border-primary ring-2 ring-primary/20"
                                    : "border-border/70 hover:border-primary/45",
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
                                  <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Technical classifications/badges */}
                    <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
                      {[
                        ["Maneja inventario", producto.manejaInventario],
                        ["Tiene N° serie", producto.tieneNumeroSerie],
                        ["Consumible", producto.esConsumible],
                        ["Requiere repuestos", producto.requiereRepuestos],
                      ].map(([label, enabled]) => (
                        <Badge
                          key={String(label)}
                          variant={enabled ? "secondary" : "outline"}
                          className={cn("text-[10px] font-semibold", !enabled && "text-muted-foreground/60 border-border/50")}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Descripción comercial */}
                  <div className="flex items-center gap-2 border-b border-border/40 pb-3 pt-2">
                    <FileText className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Descripción Comercial</h3>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm leading-relaxed text-foreground/90 animate-in fade-in duration-300">
                    {producto.descripcion ? (
                      renderDescription(producto.descripcion)
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin descripción comercial registrada.</p>
                    )}
                  </div>

                  {/* Ficha técnica */}
                  {producto.atributos && Object.keys(producto.atributos).length ? (
                    <>
                      <div className="flex items-center gap-2 border-b border-border/40 pb-3 pt-2">
                        <Sparkles className="size-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Ficha Técnica</h3>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {Object.entries(producto.atributos).map(([clave, valor]) => (
                          <Field key={clave}>
                            <FieldLabel>{clave}</FieldLabel>
                            <Input value={valor == null ? "" : String(valor)} readOnly className="bg-muted/10 cursor-default" />
                          </Field>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
