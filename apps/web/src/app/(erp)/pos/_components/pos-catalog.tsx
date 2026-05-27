"use client";

import { useMemo, useState } from "react";
import {
  Cpu,
  Droplet,
  Laptop,
  Loader2,
  Nut,
  Package,
  Plus,
  Search,
  Wrench,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { TipoProducto } from "@erp/shared";
import { useCart } from "./cart-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useCategorias, useProductos } from "@/hooks/use-productos";
import { getApiAssetUrlCandidates } from "@/lib/api";
import { getPrimaryProductImage } from "@/lib/product-images";
import { cn } from "@/lib/utils";

export type PosCatalogProduct = {
  id: string;
  sku: string;
  nombre: string;
  precioVenta: number;
  precioMinimo: number;
  imagen: string | null;
  stockMinimo: number;
  stockActual: number;
  manejaInventario: boolean;
  tieneNumeroSerie: boolean;
  tipo: TipoProducto;
  imagenes?: Array<{
    url?: string | null;
    esPrincipal?: boolean | null;
    orden?: number | null;
  }>;
  /** Meses de garantía estándar de fábrica (para equipos serializados). */
  mesesGarantia?: number | null;
  /** Tope opcional de copias de la garantía (equipos con contador). */
  garantiaMaxCopias?: number | null;
};

type Props = {
  onPick: (p: PosCatalogProduct) => void;
  /** clases extra para el contenedor exterior */
  className?: string;
};

/**
 * Catálogo POS optimizado con el sistema de diseño premium:
 * - 60-30-10 Rule: visual anchors and accent placements
 * - Comercial Theme: Poppins + Bricolage Grotesque, warm gray cards, organic feel
 * - Spacing Tokens: precise margins, responsive gaps, padded layout boundaries
 * - Premium Micro-animations: active:scale-95, cubic-bezier transitions, card pop effects
 * - Excludes SERVICIO products and handles real-time dynamic stock hiding perfectly.
 */
export function PosCatalog({ onPick, className }: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [tipo, setTipo] = useState<TipoProducto | "TODOS">("TODOS");
  const [categoriaId, setCategoriaId] = useState<string>("TODAS");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);

  const cart = useCart();

  const { data, isLoading, isFetching } = useProductos({
    page,
    limit,
    activo: true,
    conStock: true,
    search: debouncedQuery || undefined,
    tipo: tipo === "TODOS" ? undefined : tipo,
    categoriaId: categoriaId === "TODAS" ? undefined : categoriaId,
  });

  const { data: categoriasRes } = useCategorias(
    tipo === "TODOS" ? undefined : tipo,
  );
  const categorias = useMemo(() => categoriasRes?.data ?? [], [categoriasRes]);

  const productos = useMemo(
    () => (data?.data ?? []) as unknown as PosCatalogProduct[],
    [data],
  );

  const cartLinesMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of cart.lines) {
      map[line.productoId] = (map[line.productoId] ?? 0) + line.cantidad;
    }
    return map;
  }, [cart.lines]);

  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      // Excluir servicios estrictamente en el POS
      if (p.tipo === TipoProducto.SERVICIO) return false;

      // Si maneja inventario, validar disponibilidad de stock y lo que ya está en carrito
      if (p.manejaInventario) {
        const stock = toFiniteNumber(p.stockActual);
        if (stock <= 0) return false;

        const cartQty = cartLinesMap[p.id] ?? 0;
        if (cartQty >= stock) return false;
      }

      return true;
    });
  }, [productos, cartLinesMap]);

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-md shadow-primary/[0.01] transition-all duration-300",
        className,
      )}
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-base font-black tracking-tight text-foreground uppercase">
            Catálogo
          </h2>
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/5 text-primary font-bold text-[10px] rounded-full px-2.5 py-0.5 tracking-wider animate-fade-in uppercase"
          >
            {filteredProductos.length} productos
          </Badge>
        </div>

        {/* Dropdown de categorías en la cabecera en pantallas grandes (ahorra espacio vertical) */}
        <div className="hidden sm:block w-[180px]">
          <Select
            value={categoriaId}
            onValueChange={(val) => {
              setCategoriaId(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8.5 rounded-xl text-xs border-border bg-background/50 hover:bg-background hover:border-primary/30 transition-all duration-300 cursor-pointer focus:ring-primary/20 font-sans">
              <SelectValue placeholder="Categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS" className="cursor-pointer">
                Todas las categorías
              </SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Buscador + Selector de Categorías en Móvil */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr] gap-2">
        <div className="relative group/search">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary group-focus-within/search:scale-110 transition-all duration-300 ease-out" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por SKU, código o nombre de producto…"
            className="h-9.5 rounded-xl pl-9 pr-9 text-xs border-border/80 focus-visible:ring-primary/20 bg-background/50 focus:bg-background transition-all duration-300 ease-out font-sans"
            autoFocus
          />
          {query ? (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted active:scale-90 transition-all duration-150 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        {/* Dropdown de categorías en móvil */}
        <div className="block sm:hidden">
          <Select
            value={categoriaId}
            onValueChange={(val) => {
              setCategoriaId(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 rounded-xl text-xs border-border bg-background/50 hover:bg-background transition-all duration-300 cursor-pointer focus:ring-primary/20 font-sans">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS" className="cursor-pointer">
                Todas las categorías
              </SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-5 gap-1.5 bg-muted/20 p-1.5 rounded-2xl border border-border/30">
        <TipoChip
          label="Todos"
          active={tipo === "TODOS"}
          icon={Package}
          onClick={() => {
            setTipo("TODOS");
            setCategoriaId("TODAS");
            setPage(1);
          }}
        />
        {(
          [
            TipoProducto.EQUIPO,
            TipoProducto.REPUESTO,
            TipoProducto.INSUMO,
            TipoProducto.ACCESORIO,
          ] as const
        ).map((t) => (
          <TipoChip
            key={t}
            label={TIPO_LABEL[t]}
            active={tipo === t}
            icon={TIPO_ICON[t]}
            onClick={() => {
              setTipo(t);
              setCategoriaId("TODAS");
              setPage(1);
            }}
          />
        ))}
      </div>

      {/* Grid de Productos - Spacing optimizado a tokens */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4 sm:gap-2.5 lg:gap-3 auto-rows-max content-start">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Cargando catálogo de productos…</span>
          </div>
        ) : filteredProductos.length === 0 ? (
          <div className="col-span-full h-full min-h-[360px] flex flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground animate-fade-in bg-muted/5 rounded-2xl border border-dashed border-border/80 p-6">
            <div className="size-12 rounded-2xl bg-muted/40 flex items-center justify-center border border-dashed border-border mb-1">
              <Package className="size-6 opacity-40 text-muted-foreground" />
            </div>
            {debouncedQuery ? (
              <div className="max-w-[280px]">
                <p className="font-semibold text-foreground font-sans text-xs sm:text-sm">
                  Sin resultados para tu búsqueda
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Intenta con otros términos o limpia el filtro.
                </p>
              </div>
            ) : (
              <div className="max-w-[280px]">
                <p className="font-semibold text-foreground font-sans text-xs sm:text-sm">
                  No hay productos disponibles
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Todos los productos de esta categoría están agotados o ya se
                  agregaron al carrito.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredProductos.map((p) => {
            const precioVenta = toFiniteNumber(p.precioVenta);
            const stockActual = toFiniteNumber(p.stockActual);
            const normalizedProduct: PosCatalogProduct = {
              ...p,
              precioVenta,
              precioMinimo: toFiniteNumber(p.precioMinimo),
              stockActual,
              stockMinimo: toFiniteNumber(p.stockMinimo),
              mesesGarantia: toNullableNumber(p.mesesGarantia),
              garantiaMaxCopias: toNullableNumber(p.garantiaMaxCopias),
              imagen: getPrimaryProductImage(p),
            };

            // Seleccionar icono premium para placeholders según tipo físico
            const iconMap = {
              [TipoProducto.EQUIPO]: Laptop,
              [TipoProducto.REPUESTO]: Wrench,
              [TipoProducto.INSUMO]: Droplet,
              [TipoProducto.ACCESORIO]: Nut,
              [TipoProducto.SERVICIO]: Cpu,
            };
            const IconComponent = iconMap[p.tipo] || Package;

            // Asignar gradiente de fondo premium para cada tipo físico en placeholder con OKLCH a medida
            const gradientMap = {
              [TipoProducto.EQUIPO]:
                "from-[oklch(0.72_0.16_55)/0.08] via-[oklch(0.65_0.22_45)/0.03] to-[oklch(0.75_0.14_65)/0.08] text-[oklch(0.65_0.22_45)] dark:text-[oklch(0.75_0.16_55)]",
              [TipoProducto.REPUESTO]:
                "from-[oklch(0.65_0.22_45)/0.08] via-[oklch(0.60_0.20_35)/0.03] to-[oklch(0.65_0.22_45)/0.08] text-[oklch(0.60_0.20_35)] dark:text-[oklch(0.70_0.18_45)]",
              [TipoProducto.INSUMO]:
                "from-[oklch(0.78_0.14_75)/0.08] via-[oklch(0.75_0.16_65)/0.03] to-[oklch(0.80_0.12_85)/0.08] text-[oklch(0.70_0.16_65)] dark:text-[oklch(0.80_0.14_75)]",
              [TipoProducto.ACCESORIO]:
                "from-[oklch(0.58_0.18_30)/0.08] via-[oklch(0.62_0.20_40)/0.03] to-[oklch(0.58_0.18_30)/0.08] text-[oklch(0.58_0.18_30)] dark:text-[oklch(0.68_0.16_40)]",
              [TipoProducto.SERVICIO]:
                "from-[oklch(0.60_0.02_45)/0.08] via-[oklch(0.55_0.01_45)/0.03] to-[oklch(0.60_0.02_45)/0.08] text-[oklch(0.50_0.02_45)] dark:text-[oklch(0.65_0.01_45)]",
            };
            const cardGradient =
              gradientMap[p.tipo] ||
              "from-[oklch(0.60_0.02_45)/0.08] to-[oklch(0.50_0.02_45)/0.08] text-[oklch(0.50_0.02_45)]";

            const hasImage = !!normalizedProduct.imagen;
            const isLowStock = p.manejaInventario && stockActual <= 5;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(normalizedProduct)}
                className={cn(
                  "group relative flex flex-col gap-3 rounded-xl border bg-card p-3 text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "border-border hover:border-primary/45 hover:bg-primary/[0.01] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
                  "active:scale-[0.96] active:duration-150 animate-fade-in cursor-pointer",
                )}
              >
                {/* Visual Header / Contenedor de Imagen de Alto Nivel - aspect-[4/3] con bordes limpios */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/30 flex items-center justify-center shadow-inner border border-border/30 dark:border-border/40">
                  {hasImage ? (
                    <PosProductImage
                      src={normalizedProduct.imagen!}
                      alt={p.nombre}
                    />
                  ) : (
                    <div
                      className={cn(
                        "h-full w-full bg-gradient-to-tr flex flex-col items-center justify-center gap-1 transition-all duration-300 group-hover:scale-[1.02]",
                        cardGradient,
                      )}
                    >
                      <IconComponent className="size-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" />
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-70 font-sans">
                        {TIPO_LABEL[p.tipo] ?? p.tipo}
                      </span>
                    </div>
                  )}

                  {/* Badge absoluto para requerimiento de Serie */}
                  {p.tieneNumeroSerie && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-500/90 backdrop-blur-md px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-amber-950 shadow-sm border border-amber-400/30">
                      Serie
                    </span>
                  )}

                  {/* Badge absoluto para Tipo de producto cuando hay imagen */}
                  {hasImage && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[7.5px] font-semibold uppercase tracking-wider text-white">
                      {TIPO_LABEL[p.tipo] ?? p.tipo}
                    </span>
                  )}
                </div>

                {/* SKU y Stock Badge con Proximidad Estricta y Balance de Espacio */}
                <div className="flex items-center justify-between text-[8.5px] font-sans font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                  <span className="font-mono font-normal truncate max-w-[55%]" title={p.sku}>
                    {p.sku}
                  </span>
                  {p.manejaInventario && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[8px] font-bold tracking-wider uppercase flex items-center gap-1 border shrink-0",
                        isLowStock
                          ? "bg-[oklch(0.96_0.04_75)] text-[oklch(0.35_0.09_75)] border-[oklch(0.85_0.05_75)] dark:bg-[oklch(0.16_0.04_75)] dark:text-[oklch(0.75_0.06_75)] dark:border-[oklch(0.24_0.04_75)]"
                          : "bg-[oklch(0.96_0.04_150)] text-[oklch(0.35_0.10_150)] border-[oklch(0.85_0.05_150)] dark:bg-[oklch(0.16_0.04_150)] dark:text-[oklch(0.72_0.06_150)] dark:border-[oklch(0.24_0.04_150)]",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1 rounded-full",
                          isLowStock
                            ? "bg-[oklch(0.45_0.09_75)] dark:bg-[oklch(0.68_0.06_75)]"
                            : "bg-[oklch(0.45_0.10_150)] dark:bg-[oklch(0.68_0.06_150)]",
                        )}
                      />
                      {isLowStock ? `${stockActual} bajo` : `${stockActual} disp`}
                    </span>
                  )}
                </div>

                {/* Nombre de Producto - Pairing Poppins (UI sans) */}
                <h3 className="line-clamp-2 text-[13px] font-bold leading-tight px-0.5 text-foreground group-hover:text-primary transition-colors min-h-[36px] font-sans tracking-tight">
                  {p.nombre}
                </h3>

                {/* Fila de precios y botón de acción (60-30-10 rule) - Restructured for visual balance */}
                <div className="mt-auto flex items-center justify-between pt-2.5 border-t border-border/30 px-0.5 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-display text-[15px] font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors leading-none tabular-nums">
                      S/ {precioVenta.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-medium text-muted-foreground leading-none tabular-nums mt-0.5">
                      S/ {(precioVenta / 1.18).toFixed(2)} <span className="text-[8px] opacity-75 font-sans">ex. IGV</span>
                    </span>
                  </div>

                  {/* Plus Trigger with advanced micro-interaction (spring scale) */}
                  <div
                    className={cn(
                      "rounded-xl p-2 bg-primary/10 text-primary transition-all duration-300 ease-[cubic-bezier(0.25,1.5,0.5,1)] shadow-inner",
                      "group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-active:scale-95 shadow-sm shrink-0",
                    )}
                  >
                    <Plus className="size-4 shrink-0 transition-transform duration-200" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {isFetching && !isLoading ? (
        <p className="text-[10px] text-muted-foreground animate-pulse text-right">
          Sincronizando existencias en tiempo real…
        </p>
      ) : null}

      {/* Control de paginación del catálogo */}
      {(() => {
        const totalItems = data?.meta?.total ?? 0;
        const totalPages = Math.ceil(totalItems / limit) || 1;
        const rangeStart = totalItems === 0 ? 0 : (page - 1) * limit + 1;
        const rangeEnd = totalItems === 0 ? 0 : Math.min(page * limit, totalItems);

        return (
          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card px-4 py-2.5 shadow-[0_12px_24px_-34px_rgba(15,23,42,0.38)] sm:flex-row sm:items-center sm:justify-between shrink-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  Filas por página
                </span>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 min-w-20 rounded-md border-border/80 bg-muted/55 text-xs shadow-none hover:bg-muted/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {[12, 24, 48, 60, 100].map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                {rangeStart}-{rangeEnd} de {totalItems} producto{totalItems !== 1 ? "s" : ""}
              </p>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 sm:justify-end">
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95"
                >
                  <ChevronLeft className="size-3.5" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95"
                >
                  Siguiente
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95"
                  title="Última página"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })()}
    </section>
  );
}

function toFiniteNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return toFiniteNumber(value);
}

const TIPO_LABEL: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Equipo",
  [TipoProducto.REPUESTO]: "Repuesto",
  [TipoProducto.INSUMO]: "Insumo",
  [TipoProducto.ACCESORIO]: "Accesorio",
  [TipoProducto.SERVICIO]: "Servicio",
};

const TIPO_ICON = {
  TODOS: Package,
  [TipoProducto.EQUIPO]: Laptop,
  [TipoProducto.REPUESTO]: Wrench,
  [TipoProducto.INSUMO]: Droplet,
  [TipoProducto.ACCESORIO]: Nut,
  [TipoProducto.SERVICIO]: Cpu,
};

function TipoChip({
  label,
  active,
  icon: Icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/chip rounded-xl border px-3 py-2 text-xs sm:text-[13px] font-extrabold uppercase tracking-wide transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150 cursor-pointer font-sans shadow-sm flex items-center justify-center gap-2",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "border-border bg-background/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary",
      )}
    >
      <Icon className="size-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/chip:scale-110" />
      <span>{label}</span>
    </button>
  );
}

function PosProductImage({ src, alt }: { src: string; alt: string }) {
  const [attemptIndex, setAttemptIndex] = useState(0);
  const candidates = useMemo(
    () => (src ? getApiAssetUrlCandidates(src) : []),
    [src],
  );
  const currentSrc = candidates[attemptIndex];

  if (!currentSrc) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
      onError={() => setAttemptIndex((idx) => idx + 1)}
    />
  );
}
