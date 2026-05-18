'use client'

import { Loader2, Sparkles } from 'lucide-react'
import type { TicketClassificationResult } from '@erp/shared'

import { useClasificarTicket } from '@/hooks/use-ai'
import { Button } from '@/components/ui/button'

interface ClasificarTicketButtonProps {
  titulo: string
  descripcion: string
  fallaReportada?: string
  onResult: (result: TicketClassificationResult) => void
  disabled?: boolean
}

const PRIORIDAD_LABEL: Record<string, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

const SERVICIO_LABEL: Record<string, string> = {
  TALLER: 'Taller',
  VISITA: 'Visita',
  REMOTO: 'Remoto',
}

export function ClasificarTicketButton({
  titulo,
  descripcion,
  fallaReportada,
  onResult,
  disabled,
}: ClasificarTicketButtonProps) {
  const { mutate, isPending } = useClasificarTicket()

  const handleClick = () => {
    if (!titulo.trim() || !descripcion.trim()) return
    mutate(
      { titulo, descripcion, fallaReportada },
      {
        onSuccess: (result) => {
          onResult(result)
        },
      },
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || isPending || !titulo.trim() || !descripcion.trim()}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {isPending ? 'Clasificando…' : 'Clasificar con IA'}
    </Button>
  )
}

export { PRIORIDAD_LABEL, SERVICIO_LABEL }
