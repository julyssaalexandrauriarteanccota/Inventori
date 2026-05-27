'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTicketPublico } from '@/hooks/use-public'

const estadoColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ABIERTO: 'outline',
  EN_PROGRESO: 'default',
  EN_ESPERA: 'secondary',
  CERRADO: 'secondary',
  CANCELADO: 'destructive',
}

const prioridadColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  BAJA: 'outline',
  MEDIA: 'secondary',
  ALTA: 'default',
  URGENTE: 'destructive',
}

function TicketContentInner() {
  const searchParams = useSearchParams()
  const initialCodigo = searchParams.get('codigo') || ''

  const [input, setInput] = useState(initialCodigo)
  const [codigo, setCodigo] = useState(initialCodigo)

  const { data, isLoading, isError } = useTicketPublico(codigo)
  const ticket = data?.data

  // Automatically search if query param updates
  useEffect(() => {
    const codeParam = searchParams.get('codigo')
    if (codeParam) {
      setInput(codeParam)
      setCodigo(codeParam)
    }
  }, [searchParams])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (trimmed) setCodigo(trimmed)
  }

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          placeholder="Código de ticket (ej: TKT-2026-0002)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-xl"
        />
        <Button type="submit" disabled={!input.trim()} className="rounded-xl">
          Consultar
        </Button>
      </form>

      {isLoading && codigo && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/3 rounded" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {isError && codigo && (
        <Card className="rounded-2xl border border-destructive/20 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="font-medium text-destructive">
              No se encontró un ticket con el código «{codigo}».
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Verifica que el código sea correcto e inténtalo de nuevo.
            </p>
          </CardContent>
        </Card>
      )}

      {ticket && (
        <Card className="rounded-2xl shadow-sm border border-border/70">
          <CardHeader className="border-b border-border/40 bg-muted/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold">{ticket.titulo}</CardTitle>
                <p className="mt-1 text-xs font-mono text-muted-foreground">
                  Código: {ticket.codigo}
                </p>
              </div>
              <Badge variant={estadoColors[ticket.estado] ?? 'outline'} className="rounded-md">
                {ticket.estado.replace(/_/g, ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem label="Prioridad">
                <Badge variant={prioridadColors[ticket.prioridad] ?? 'outline'} className="rounded-md mt-1">
                  {ticket.prioridad}
                </Badge>
              </InfoItem>
              <InfoItem label="Tipo de servicio">
                <span className="text-sm text-foreground font-medium mt-1 block">
                  {ticket.tipoServicio.replace(/_/g, ' ')}
                </span>
              </InfoItem>
              <InfoItem label="Fecha de recepción">
                <span className="text-sm text-foreground font-medium mt-1 block">
                  {formatDate(ticket.fechaRecepcion)}
                </span>
              </InfoItem>
              {ticket.fechaPromesa && (
                <InfoItem label="Fecha promesa">
                  <span className="text-sm text-foreground font-medium mt-1 block">
                    {formatDate(ticket.fechaPromesa)}
                  </span>
                </InfoItem>
              )}
              {ticket.fechaCierre && (
                <InfoItem label="Fecha de cierre">
                  <span className="text-sm text-foreground font-medium mt-1 block font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatDate(ticket.fechaCierre)}
                  </span>
                </InfoItem>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function TicketContent() {
  return (
    <Suspense fallback={
      <div className="mt-8 space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-2 mt-8">
          <Skeleton className="h-6 w-1/3 rounded" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    }>
      <TicketContentInner />
    </Suspense>
  )
}

function InfoItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-muted/5 px-3 py-2.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div>{children}</div>
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
