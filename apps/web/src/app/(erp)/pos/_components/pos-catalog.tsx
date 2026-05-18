'use client'

import { useMemo, useState } from 'react'
import { Loader2, Package, Plus, Search, X } from 'lucide-react'
import { TipoProducto } from '@erp/shared'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebounce } from '@/hooks/use-debounce'
import { useCategorias, useProductos } from '@/hooks/use-productos'
import { IGV_RATE } from '@/lib/pos-navigation'
import { getPrimaryProductImage } from '@/lib/product-images'
import { cn } from '@/lib/utils'

export type PosCatalogProduct = {
  id: string
  sku: string
  nombre: string
  precioVenta: number
  precioMinimo: number
  imagen: string | null
  stockMinimo: number
  stockActual: number
  manejaInventario: boolean
  tieneNumeroSerie: boolean
  tipo: TipoProducto
  imagenes?: Array<{
    url?: string | null
    esPrincipal?: boolean | null
    orden?: number | null
  }>
  /** Meses de garantía estándar de fábrica (para equipos serializados). */
  mesesGarantia?: number | null
  /** Tope opcional de copias de la garantía (equipos con contador). */
  garantiaMaxCopias?: number | null
}

type Props = {
  onPick: (p: PosCatalogProduct) => void
  /** clases extra para el contenedor exterior */
  className?: string
}

/**
 * Catálogo POS reutilizable.
 * - Incluye TODOS los tipos: EQUIPO, REPUESTO, INSUMO, ACCESORIO, SERVICIO.
 *   El POS de mostrador es sobre todo para vender equipos y consumibles.
 * - Permite filtrar por Tipo y por Categoría.
 * - Búsqueda con debounce.
 */
export function PosCatalog({ onPick, className }: Props) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250)
  const [tipo, setTipo] = useState<TipoProducto | 'TODOS'>('TODOS')
  const [categoriaId, setCategoriaId] = useState<string>('TODAS')

  const { data, isLoading, isFetching } = useProductos({
    page: 1,
    limit: 60,
    activo: true,
    conStock: true,
    search: debouncedQuery || undefined,
    tipo: tipo === 'TODOS' ? undefined : tipo,
    categoriaId: categoriaId === 'TODAS' ? undefined : categoriaId,
  })

  const { data: categoriasRes } = useCategorias(
    tipo === 'TODOS' ? undefined : tipo,
  )
  const categorias = useMemo(
    () => categoriasRes?.data ?? [],
    [categoriasRes],
  )

  const productos = useMemo(
    () => (data?.data ?? []) as unknown as PosCatalogProduct[],
    [data],
  )

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col gap-3 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm',
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Catálogo</h2>
          <p className="text-xs text-muted-foreground">
            Equipos, repuestos, insumos, accesorios y servicios disponibles para venta.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/10 text-primary"
        >
          {productos.length} resultados
        </Badge>
      </header>

      {/* Buscador */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por SKU o nombre…"
          className="h-11 rounded-xl pl-9 text-sm"
          autoFocus
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Filtros: Tipo (chips) + Categoría (select) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          <TipoChip
            label="Todos"
            active={tipo === 'TODOS'}
            onClick={() => {
              setTipo('TODOS')
              setCategoriaId('TODAS')
            }}
          />
          {([
            TipoProducto.EQUIPO,
            TipoProducto.REPUESTO,
            TipoProducto.INSUMO,
            TipoProducto.ACCESORIO,
            TipoProducto.SERVICIO,
          ] as const).map((t) => (
            <TipoChip
              key={t}
              label={TIPO_LABEL[t]}
              active={tipo === t}
              onClick={() => {
                setTipo(t)
                setCategoriaId('TODAS')
              }}
            />
          ))}
        </div>

        <div className="ml-auto min-w-[180px]">
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="h-9 rounded-lg text-xs">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas las categorías</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando catálogo…
          </div>
        ) : productos.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Package className="size-6 opacity-50" />
            {debouncedQuery
              ? <>Sin resultados para “{debouncedQuery}”.</>
              : <>No hay productos vendibles con estos filtros.</>}
          </div>
        ) : (
          productos.map((p) => {
            const precioVenta = toFiniteNumber(p.precioVenta)
            const stockActual = toFiniteNumber(p.stockActual)
            const normalizedProduct: PosCatalogProduct = {
              ...p,
              precioVenta,
              precioMinimo: toFiniteNumber(p.precioMinimo),
              stockActual,
              stockMinimo: toFiniteNumber(p.stockMinimo),
              mesesGarantia: toNullableNumber(p.mesesGarantia),
              garantiaMaxCopias: toNullableNumber(p.garantiaMaxCopias),
              imagen: getPrimaryProductImage(p),
            }

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(normalizedProduct)}
                className={cn(
                  'group flex flex-col gap-1 rounded-xl border bg-white p-3 text-left transition',
                  'border-primary/15 bg-card hover:border-primary/35 hover:bg-primary/5 hover:shadow-sm dark:bg-card dark:hover:bg-primary/10',
                )}
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                  <span className="truncate">{p.sku}</span>
                  <span className="flex shrink-0 gap-1">
                    {p.tieneNumeroSerie ? (
                      <span className="rounded bg-amber-500/15 px-1 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                        Serie
                      </span>
                    ) : null}
                    <span className="rounded bg-primary/10 px-1 text-[9px] font-semibold text-primary">
                      {TIPO_LABEL[p.tipo] ?? p.tipo}
                    </span>
                  </span>
                </div>
                <p className="line-clamp-2 text-[13px] font-medium leading-snug">
                  {p.nombre}
                </p>
                <div className="mt-auto flex items-end justify-between pt-1">
                  <span>
                    <span className="block text-base font-bold tabular-nums text-primary">
                      S/ {(precioVenta * (1 + IGV_RATE)).toFixed(2)}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">
                      Inc. IGV · S/ {precioVenta.toFixed(2)} sin IGV
                    </span>
                    {p.manejaInventario ? (
                      <span className="block text-[10px] text-muted-foreground">
                        Stock {stockActual}
                      </span>
                    ) : null}
                  </span>
                  <Plus className="size-4 text-muted-foreground transition group-hover:text-primary" />
                </div>
              </button>
            )
          })
        )}
      </div>

      {isFetching && !isLoading ? (
        <p className="text-[11px] text-muted-foreground">Actualizando catálogo…</p>
      ) : null}
    </section>
  )
}

function toFiniteNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  return toFiniteNumber(value)
}

const TIPO_LABEL: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: 'Equipo',
  [TipoProducto.REPUESTO]: 'Repuesto',
  [TipoProducto.INSUMO]: 'Insumo',
  [TipoProducto.ACCESORIO]: 'Accesorio',
  [TipoProducto.SERVICIO]: 'Servicio',
}

function TipoChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-primary/20 bg-card text-primary hover:bg-primary/10',
      )}
    >
      {label}
    </button>
  )
}
