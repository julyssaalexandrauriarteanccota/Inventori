'use client'

import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cerrarTicketSchema, type CerrarTicketPayload } from '@erp/shared'

import { useCerrarTicket } from '@/hooks/use-soporte'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

interface CerrarTicketFormProps {
  ticketId: string
  onSuccess: () => void
}

export function CerrarTicketForm({ ticketId, onSuccess }: CerrarTicketFormProps) {
  const mutation = useCerrarTicket(ticketId)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CerrarTicketPayload>({
    resolver: zodResolver(cerrarTicketSchema),
  })

  /* ── Submit ──────────────────────────────────────── */
  const onSubmit = useCallback(
    async (data: CerrarTicketPayload) => {
      mutation.mutate(data, {
        onSuccess: () => {
          toast.success('Ticket cerrado correctamente')
          onSuccess()
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Error al cerrar el ticket')
        },
      })
    },
    [mutation, onSuccess],
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={errors.solucion ? true : undefined}>
          <FieldLabel>Solución</FieldLabel>
          <Textarea
            {...register('solucion')}
            placeholder="Describe la solución aplicada"
            rows={3}
            aria-invalid={!!errors.solucion}
          />
          <FieldError>{errors.solucion?.message}</FieldError>
        </Field>

        <p className="text-xs text-muted-foreground">
          Los montos de mano de obra, repuestos y total se calculan automáticamente
          desde los servicios y repuestos del ticket. Las líneas marcadas como
          “cubierto por garantía” no suman.
        </p>

        <Field data-invalid={errors.notas ? true : undefined}>
          <FieldLabel>Notas adicionales</FieldLabel>
          <Textarea
            {...register('notas')}
            placeholder="Notas internas (opcional)"
            rows={2}
            aria-invalid={!!errors.notas}
          />
          <FieldError>{errors.notas?.message}</FieldError>
        </Field>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-xl"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Cerrar ticket
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
