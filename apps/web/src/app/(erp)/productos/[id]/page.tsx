"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Barcode,
  Box,
  Copy,
  DollarSign,
  ImageIcon,
  MonitorCheck,
  Package,
  Pencil,
  QrCode,
  Settings2,
  UserRound,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import {
  CondicionProducto,
  EstadoComercialEquipo,
  RolUsuario,
  TipoProducto,
  type ProductoImagenListItem,
} from "@erp/shared";

import { getApiAssetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useEquipos } from "@/hooks/use-equipos";
import { useStock } from "@/hooks/use-inventario";
import { useProducto } from "@/hooks/use-productos";
import { PageHeader } from "@/components/layout/page-header";
import { ProductCodePreview } from "@/components/products/product-code-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

const ESTADO_COMERCIAL_LABELS: Record<EstadoComercialEquipo, string> = {
  [EstadoComercialEquipo.DISPONIBLE]: "Disponible",
  [EstadoComercialEquipo.VENDIDO]: "Vendido",
  [EstadoComercialEquipo.ALQUILADO]: "Alquilado",
  [EstadoComercialEquipo.RESERVADO]: "Reservado",
  [EstadoComercialEquipo.EN_REPARACION]: "En reparación",
  [EstadoComercialEquipo.USO_INTERNO]: "Uso interno",
  [EstadoComercialEquipo.BAJA]: "Baja",
};

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }
  return `S/ ${Number(value).toFixed(2)}`;
}

function InfoItem({
  label,
  value,
  icon: Icon,
  copyable = false,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ElementType;
  copyable?: boolean;
}) {
  const textValue =
    value === null || value === undefined || value === ""
      ? null
      : String(value);

  return (
    <div className="group flex min-w-0 flex-col gap-1 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 shadow-sm transition-colors hover:bg-muted/40">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <Icon className="size-4 shrink-0 text-muted-foreground/70" />
        ) : null}
        <span className="truncate text-sm font-medium text-foreground/90">
          {textValue ?? (
            <span className="font-normal text-muted-foreground/50">—</span>
          )}
        </span>
        {copyable && textValue ? (
          <button
            type="button"
            className="ml-auto rounded-md p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
            onClick={() => {
              void navigator.clipboard.writeText(textValue);
              toast.success("Copiado al portapapeles");
            }}
          >
            <Copy className="size-3.5 text-muted-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getProductImages(
  imagenes: ProductoImagenListItem[] | undefined,
  legacyImage: string | null | undefined,
) {
  if (imagenes?.length) {
    return imagenes;
  }

  if (!legacyImage) {
    return [];
  }

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

function getClienteNombre(
  cliente?: {
    nombre: string | null;
    apellido: string | null;
    razonSocial: string | null;
  } | null,
) {
  if (!cliente) return null;
  return (
    cliente.razonSocial ??
    ([cliente.nombre, cliente.apellido].filter(Boolean).join(" ") || null)
  );
}

export default function ProductoDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const canEdit = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canViewInternalCosts = hasRole(RolUsuario.ADMIN);
  const id = params.id;

  const { data, isLoading, isError } = useProducto(id);
  const { data: stockRes } = useStock({ page: 1, limit: 100, productoId: id });
  const { data: equiposRes } = useEquipos({
    page: 1,
    limit: 100,
    productoId: id,
  });
  const producto = data?.data;
  const stockRows = stockRes?.data ?? [];
  const equipos = equiposRes?.data ?? [];
  const stockTotal = stockRows.reduce((total, row) => total + row.cantidad, 0);
  const showSerializedUnits = Boolean(
    producto &&
    (producto.tipo === TipoProducto.EQUIPO || producto.tieneNumeroSerie),
  );
  const equiposDisponibles = equipos.filter(
    (equipo) => equipo.estadoComercial === EstadoComercialEquipo.DISPONIBLE,
  ).length;
  const equiposAlquilados = equipos.filter(
    (equipo) => equipo.estadoComercial === EstadoComercialEquipo.ALQUILADO,
  ).length;
  const usesPhysicalEquipmentQr = Boolean(
    producto &&
    (producto.tipo === TipoProducto.EQUIPO || producto.tieneNumeroSerie),
  );
  const images = useMemo(
    () => getProductImages(producto?.imagenes, producto?.imagen),
    [producto?.imagenes, producto?.imagen],
  );
  const [manualSelectedImageUrl, setManualSelectedImageUrl] = useState<
    string | null
  >(null);
  const defaultSelectedImageUrl =
    images.find((image) => image.esPrincipal)?.url ?? images[0]?.url ?? null;
  const selectedImageUrl =
    manualSelectedImageUrl &&
    images.some((image) => image.url === manualSelectedImageUrl)
      ? manualSelectedImageUrl
      : defaultSelectedImageUrl;
  const productFlags = producto
    ? [
        { label: "Maneja inventario", enabled: producto.manejaInventario },
        { label: "Tiene N° serie", enabled: producto.tieneNumeroSerie },
        { label: "Consumible", enabled: producto.esConsumible },
        { label: "Requiere repuestos", enabled: producto.requiereRepuestos },
      ]
    : [];

  const selectedImage =
    images.find((image) => image.url === selectedImageUrl) ?? null;

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
      <PageHeader
        title={producto?.nombre ?? "Producto"}
        description={
          producto
            ? `${producto.sku} · ${TIPO_LABELS[producto.tipo]}`
            : "Detalle del catálogo"
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/productos")}
            >
              <ArrowLeft className="size-4" />
              Volver
            </Button>
            {canEdit && producto ? (
              <Button
                type="button"
                onClick={() => router.push(`/productos/${id}/editar`)}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
            ) : null}
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Skeleton className="h-80 rounded-2xl" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      ) : isError || !producto ? (
        <section className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card text-center text-muted-foreground">
          <Package className="size-10 opacity-40" />
          <p>No se pudo cargar la información del producto.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/productos")}
          >
            Volver al listado
          </Button>
        </section>
      ) : (
        <div className="grid gap-5 md:items-start lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <aside className="flex self-start flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm xl:sticky xl:top-24">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-500">
                <ImageIcon className="size-4" />
              </div>
              <h2 className="text-sm font-semibold">Fotografía principal</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
              {selectedImage ? (
                <div className="h-44 md:h-52 w-full flex items-center justify-center p-2 relative group">
                  <img
                    src={getApiAssetUrl(selectedImage.url)}
                    alt={selectedImage.nombre ?? producto.nombre}
                    className="h-full w-full object-contain mix-blend-multiply"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                      e.currentTarget.className = "h-16 w-16 opacity-30 mix-blend-normal object-contain";
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-44 md:h-52 w-full flex-col items-center justify-center gap-2 text-muted-foreground/60 bg-muted/20">
                  <ImageIcon className="size-10 opacity-30" />
                  <span className="text-xs font-medium">Sin imagen</span>
                </div>
              )}
            </div>

            {images.length > 1 ? (
              <div className="grid grid-cols-4 gap-2 px-1">
                {images.slice(0, 8).map((image) => {
                  const isSelected = selectedImage?.url === image.url;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      className={cn(
                        "overflow-hidden rounded-lg border bg-card transition-all",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border/70 hover:border-primary/40",
                      )}
                      onClick={() => setManualSelectedImageUrl(image.url)}
                    >
                      <img
                        src={getApiAssetUrl(image.url)}
                        alt={image.nombre ?? producto.nombre}
                        className="aspect-square w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15 border-0 font-semibold">{TIPO_LABELS[producto.tipo]}</Badge>
              {producto.condicion ? (
                <Badge variant="outline">
                  {CONDICION_LABELS[producto.condicion]}
                </Badge>
              ) : null}
              <Badge variant={producto.activo ? "default" : "outline"}>
                {producto.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </aside>

          <main className="flex min-w-0 flex-col gap-4">
            <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="size-4" />
                </div>
                <h2 className="text-sm font-semibold">Datos base</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                <InfoItem
                  label="SKU"
                  value={producto.sku}
                  icon={Box}
                  copyable
                />
                <InfoItem
                  label="Código de barras"
                  value={producto.codigoBarras}
                  icon={Barcode}
                  copyable
                />
                {!usesPhysicalEquipmentQr ? (
                  <InfoItem
                    label="Código QR"
                    value={producto.codigoQr}
                    icon={QrCode}
                    copyable
                  />
                ) : null}
                <InfoItem
                  label="Categoría"
                  value={producto.categoria?.nombre}
                />
                <InfoItem label="Marca" value={producto.marca?.nombre} />
                <InfoItem
                  label="Unidad"
                  value={`${producto.unidadMedida.codigo} · ${producto.unidadMedida.nombre}`}
                />
                <InfoItem
                  label="Modelo / compatibilidad"
                  value={producto.modeloCatalogo?.nombre ?? producto.modelo}
                />
                <InfoItem label="Tipo" value={TIPO_LABELS[producto.tipo]} />
                <InfoItem
                  label="Condición"
                  value={
                    producto.condicion
                      ? CONDICION_LABELS[producto.condicion]
                      : null
                  }
                />
              </div>
              <ProductCodePreview
                sku={producto.sku}
                barcodeValue={producto.codigoBarras}
                qrValue={producto.codigoQr}
                showQr={!usesPhysicalEquipmentQr}
                className="mt-4"
              />
              {usesPhysicalEquipmentQr ? (
                <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                  Este producto es una ficha de catálogo. El QR operativo se
                  genera por cada equipo físico en el módulo Equipos.
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-500">
                  <DollarSign className="size-4" />
                </div>
                <h2 className="text-sm font-semibold">Precios y reglas</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {producto.tipo !== TipoProducto.SERVICIO || canViewInternalCosts ? (
                  <InfoItem
                    label="Precio compra"
                    value={formatCurrency(producto.precioCompra)}
                  />
                ) : null}
                <InfoItem
                  label="Precio venta"
                  value={formatCurrency(producto.precioVenta)}
                />
                <InfoItem
                  label="Precio mínimo"
                  value={formatCurrency(producto.precioMinimo)}
                />
                <InfoItem
                  label={
                    producto.tipo === TipoProducto.SERVICIO
                      ? "Tiempo estimado"
                      : "Stock mínimo"
                  }
                  value={
                    producto.tipo === TipoProducto.SERVICIO
                      ? producto.tiempoEstimadoMin
                        ? `${producto.tiempoEstimadoMin} min`
                        : null
                      : producto.stockMinimo
                  }
                />
              </div>
            </section>

            {producto.tipo !== TipoProducto.SERVICIO ? (
              <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-500">
                      <Warehouse className="size-4" />
                    </div>
                    <h2 className="text-sm font-semibold">
                      Inventario y unidades
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/inventario")}
                    >
                      <Warehouse className="size-4" />
                      Ver inventario
                    </Button>
                    {showSerializedUnits && canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => router.push("/equipos?nuevo=1")}
                      >
                        <MonitorCheck className="size-4" />
                        Registrar unidad
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  <InfoItem
                    label="Stock total"
                    value={stockTotal}
                    icon={Warehouse}
                  />
                  <InfoItem
                    label="Almacenes con stock"
                    value={stockRows.filter((row) => row.cantidad > 0).length}
                  />
                  {showSerializedUnits ? (
                    <>
                      <InfoItem
                        label="Unidades serializadas"
                        value={equipos.length}
                        icon={MonitorCheck}
                      />
                      <InfoItem
                        label="Disponibles / alquiladas"
                        value={`${equiposDisponibles} / ${equiposAlquilados}`}
                      />
                    </>
                  ) : (
                    <InfoItem label="Control" value="Cantidad por almacén" />
                  )}
                </div>

                {stockRows.length ? (
                  <div className="mt-4 rounded-xl border border-border/60 bg-background">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      <span>Almacén</span>
                      <span>Stock</span>
                      <span>Mín.</span>
                    </div>
                    {stockRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{row.almacen.nombre}</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {row.cantidad}
                        </span>
                        <span className="font-mono text-muted-foreground tabular-nums">
                          {row.producto.stockMinimo}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                    Sin stock registrado en almacenes. Las cantidades se crean
                    con compras recibidas o movimientos de inventario.
                  </div>
                )}

                {showSerializedUnits ? (
                  <div className="mt-4 rounded-xl border border-border/60 bg-background">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      <span>Equipos físicos</span>
                      <span>Estado</span>
                    </div>
                    {equipos.length ? (
                      equipos.slice(0, 8).map((equipo) => {
                        const destino =
                          equipo.almacen?.nombre ??
                          getClienteNombre(equipo.clienteActual) ??
                          equipo.ubicacion ??
                          "Sin ubicación logística";
                        return (
                          <div
                            key={equipo.id}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-mono font-medium">
                                {equipo.numeroSerie}
                              </p>
                              <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                                {equipo.almacen ? (
                                  <Warehouse className="size-3" />
                                ) : (
                                  <UserRound className="size-3" />
                                )}
                                <span className="truncate">{destino}</span>
                              </p>
                            </div>
                            <Badge variant="outline">
                              {ESTADO_COMERCIAL_LABELS[equipo.estadoComercial]}
                            </Badge>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Todavía no hay unidades físicas registradas para este
                        producto.
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-500">
                  <Settings2 className="size-4" />
                </div>
                <h2 className="text-sm font-semibold">Configuración</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {productFlags.map(({ label, enabled }) => (
                  <Badge
                    key={label}
                    variant={enabled ? "secondary" : "outline"}
                    className={cn(!enabled && "text-muted-foreground")}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
              {producto.descripcion ? (
                <div className="mt-4 rounded-xl border border-border/60 bg-background px-3 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Descripción
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                    {producto.descripcion}
                  </p>
                </div>
              ) : null}
            </section>
          </main>
        </div>
      )}
    </div>
  );
}
