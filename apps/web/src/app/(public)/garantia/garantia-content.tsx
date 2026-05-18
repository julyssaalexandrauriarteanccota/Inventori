'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export function GarantiaContent() {
  const [input, setInput] = useState('')
  const [codigoQR, setCodigoQR] = useState('')

  const { data, isLoading, isError } = useGarantiaPublica(codigoQR)
  const garantia = data?.data

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (trimmed) setCodigoQR(trimmed)
  }

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          placeholder="Código QR de garantía"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!input.trim()}>
          Consultar
        </Button>
      </form>

      {isLoading && codigoQR && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {isError && codigoQR && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="font-medium text-destructive">
              No se encontró una garantía con el código «{codigoQR}».
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Verifica que el código sea correcto e inténtalo de nuevo.
            </p>
          </CardContent>
        </Card>
      )}

      {garantia && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {garantia.equipo.producto.nombre}
                </CardTitle>
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
                <p className="text-sm font-medium text-foreground">
                  Exclusiones
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {garantia.exclusiones}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
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
