'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useCatalogoDetalle } from '@/hooks/use-public'

export function DetalleContent({ sku }: { sku: string }) {
  const { data, isLoading, isError } = useCatalogoDetalle(sku)
  const producto = data?.data

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !producto) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-foreground">
          Producto no encontrado
        </h2>
        <p className="mt-2 text-muted-foreground">
          El SKU «{sku}» no corresponde a un producto activo.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/catalogo">Volver al catálogo</Link>
        </Button>
      </div>
    )
  }

  const repuestos = producto.compatibilidadesComoModelo ?? []
  const modelos = producto.compatibilidadesComoRepuesto ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/catalogo" className="hover:text-foreground">
          Catálogo
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{producto.nombre}</span>
      </nav>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{producto.categoria.nombre}</Badge>
          {producto.marca && (
            <Badge variant="outline">{producto.marca.nombre}</Badge>
          )}
          {producto.esConsumible && (
            <Badge variant="secondary">Consumible</Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {producto.nombre}
        </h1>
        {producto.modelo && (
          <p className="text-lg text-muted-foreground">
            Modelo: {producto.modelo}
          </p>
        )}
        <p className="text-sm text-muted-foreground">SKU: {producto.sku}</p>
      </div>

      <Separator className="my-8" />

      {/* Price */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Precio referencial (sin IGV)
        </p>
        <p className="text-3xl font-bold text-foreground">
          S/ {Number(producto.precioVenta).toFixed(2)}
        </p>
      </div>

      {/* Description */}
      {producto.descripcion && (
        <>
          <Separator className="my-8" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Descripción
            </h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">
              {producto.descripcion}
            </p>
          </div>
        </>
      )}

      {/* Compatible parts */}
      {repuestos.length > 0 && (
        <>
          <Separator className="my-8" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Repuestos y consumibles compatibles
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {repuestos.map((c) => (
                <Link key={c.repuesto.id} href={`/catalogo/${c.repuesto.sku}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">
                        {c.repuesto.nombre}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <p className="text-xs text-muted-foreground">
                        SKU: {c.repuesto.sku}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Compatible models */}
      {modelos.length > 0 && (
        <>
          <Separator className="my-8" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Modelos compatibles
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {modelos.map((c) => (
                <Link key={c.modelo.id} href={`/catalogo/${c.modelo.sku}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">
                        {c.modelo.nombre}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <p className="text-xs text-muted-foreground">
                        {c.modelo.modelo ?? c.modelo.sku}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Back */}
      <div className="mt-10">
        <Button asChild variant="outline">
          <Link href="/catalogo">← Volver al catálogo</Link>
        </Button>
      </div>
    </div>
  )
}
