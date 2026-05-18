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

export function TicketContent() {
  const [input, setInput] = useState('')
  const [codigo, setCodigo] = useState('')

  const { data, isLoading, isError } = useTicketPublico(codigo)
  const ticket = data?.data

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (trimmed) setCodigo(trimmed)
  }

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          placeholder="Código de ticket (ej: TK-000001)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!input.trim()}>
          Consultar
        </Button>
      </form>

      {isLoading && codigo && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {isError && codigo && (
        <Card>
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
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{ticket.titulo}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Código: {ticket.codigo}
                </p>
              </div>
              <Badge variant={estadoColors[ticket.estado] ?? 'outline'}>
                {ticket.estado.replace(/_/g, ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="Prioridad">
                <Badge variant={prioridadColors[ticket.prioridad] ?? 'outline'}>
                  {ticket.prioridad}
                </Badge>
              </InfoItem>
              <InfoItem label="Tipo de servicio">
                <span className="text-sm text-foreground">
                  {ticket.tipoServicio.replace(/_/g, ' ')}
                </span>
              </InfoItem>
              <InfoItem label="Fecha de recepción">
                <span className="text-sm text-foreground">
                  {formatDate(ticket.fechaRecepcion)}
                </span>
              </InfoItem>
              {ticket.fechaPromesa && (
                <InfoItem label="Fecha promesa">
                  <span className="text-sm text-foreground">
                    {formatDate(ticket.fechaPromesa)}
                  </span>
                </InfoItem>
              )}
              {ticket.fechaCierre && (
                <InfoItem label="Fecha de cierre">
                  <span className="text-sm text-foreground">
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

function InfoItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5">{children}</div>
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
