'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCatalogoPublico,
  useCategoriasPublicas,
  useMarcasPublicas,
} from '@/hooks/use-public'

export function CatalogoContent() {
  const [search, setSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState<string | undefined>()
  const [marcaId, setMarcaId] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const limit = 12

  const { data: categoriasRes } = useCategoriasPublicas()
  const { data: marcasRes } = useMarcasPublicas()

  const { data, isLoading } = useCatalogoPublico({
    page,
    limit,
    search: search || undefined,
    categoriaId,
    marcaId,
  })

  const productos = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1

  // Flatten category tree for select
  const categorias = categoriasRes?.data ?? []
  function flattenCategorias(
    cats: typeof categorias,
    prefix = '',
  ): { id: string; label: string }[] {
    return cats.flatMap((c) => [
      { id: c.id, label: prefix + c.nombre },
      ...flattenCategorias(c.children ?? [], prefix + c.nombre + ' › '),
    ])
  }
  const flatCategorias = flattenCategorias(categorias)
  const marcas = marcasRes?.data ?? []

  return (
    <div className="mt-8">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre, modelo o SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={categoriaId ?? 'all'}
          onValueChange={(v) => {
            setCategoriaId(v === 'all' ? undefined : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {flatCategorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={marcaId ?? 'all'}
          onValueChange={(v) => {
            setMarcaId(v === 'all' ? undefined : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            {marcas.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          No se encontraron productos con los filtros seleccionados.
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productos.map((p) => (
              <Link key={p.id} href={`/catalogo/${p.sku}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-sm">
                        {p.nombre}
                      </CardTitle>
                      {p.esConsumible && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          Consumible
                        </Badge>
                      )}
                    </div>
                    {p.modelo && (
                      <p className="text-xs text-muted-foreground">{p.modelo}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {p.categoria.nombre}
                      </Badge>
                      {p.marca && (
                        <Badge variant="outline" className="text-xs">
                          {p.marca.nombre}
                        </Badge>
                      )}
                    </div>
                    {p.descripcion && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {p.descripcion}
                      </p>
                    )}
                    <p className="text-lg font-semibold text-foreground">
                      S/ {Number(p.precioVenta).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {meta?.page ?? page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
