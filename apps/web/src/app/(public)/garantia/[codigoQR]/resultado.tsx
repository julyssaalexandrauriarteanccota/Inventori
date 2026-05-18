'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useGarantiaPublica } from '@/hooks/use-public'

export function GarantiaResultado({ codigoQR }: { codigoQR: string }) {
  const { data, isLoading, isError } = useGarantiaPublica(codigoQR)
  const garantia = data?.data

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !garantia) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-foreground">
          Garantía no encontrada
        </h2>
        <p className="mt-2 text-muted-foreground">
          No se encontró una garantía con el código «{codigoQR}».
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/garantia">Buscar con otro código</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/garantia" className="hover:text-foreground">
          Consulta de garantía
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{codigoQR}</span>
      </nav>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{garantia.equipo.producto.nombre}</CardTitle>
              <CardDescription>
                {garantia.equipo.producto.modelo &&
                  `Modelo: ${garantia.equipo.producto.modelo}`}
                {garantia.equipo.producto.marca?.nombre &&
                  ` · ${garantia.equipo.producto.marca.nombre}`}
              </CardDescription>
            </div>
            <Badge variant={garantia.vigente ? 'default' : 'destructive'}>
              {garantia.vigente ? 'Vigente' : 'Vencida'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Serie del equipo" value={garantia.equipo.numeroSerie} />
            <InfoItem label="Estado" value={garantia.estado} />
            <InfoItem label="Inicio" value={formatDate(garantia.fechaInicio)} />
            <InfoItem label="Fin" value={formatDate(garantia.fechaFin)} />
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-foreground">Cobertura</p>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
              {garantia.cobertura}
            </p>
          </div>

          {garantia.exclusiones && (
            <div>
              <p className="text-sm font-medium text-foreground">Exclusiones</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {garantia.exclusiones}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button asChild variant="outline">
          <Link href="/garantia">← Nueva consulta</Link>
        </Button>
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
