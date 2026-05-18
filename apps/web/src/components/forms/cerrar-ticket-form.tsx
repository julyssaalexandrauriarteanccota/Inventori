'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eraser, Loader2 } from 'lucide-react'
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  const mutation = useCerrarTicket(ticketId)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CerrarTicketPayload>({
    resolver: zodResolver(cerrarTicketSchema),
  })

  /* ── Canvas setup ────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = 'hsl(var(--foreground))'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        const touch = e.touches[0]
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    },
    [],
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      isDrawingRef.current = true
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      const { x, y } = getPos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    },
    [getPos],
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      if (!isDrawingRef.current) return
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      const { x, y } = getPos(e)
      ctx.lineTo(x, y)
      ctx.stroke()
      setHasSignature(true)
    },
    [getPos],
  )

  const stopDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    isDrawingRef.current = false
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }, [])

  /* ── Geolocation helper ──────────────────────────── */
  const getGeolocation = useCallback(
    () =>
      new Promise<{ lat?: number; lng?: number }>((resolve) => {
        if (!navigator.geolocation) {
          resolve({})
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({}),
          { timeout: 5000 },
        )
      }),
    [],
  )

  /* ── Submit ──────────────────────────────────────── */
  const onSubmit = useCallback(
    async (data: CerrarTicketPayload) => {
      // Firma digital → base64
      if (hasSignature && canvasRef.current) {
        data.firmaCliente = canvasRef.current.toDataURL('image/png')
      }

      // Geolocation (optional)
      const geo = await getGeolocation()
      if (geo.lat !== undefined) data.firmaGeoLat = geo.lat
      if (geo.lng !== undefined) data.firmaGeoLng = geo.lng

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
    [hasSignature, getGeolocation, mutation, onSuccess],
  )

  return (
    // The signature canvas ref is read only when react-hook-form invokes submit.
    // eslint-disable-next-line react-hooks/refs
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

        {/* ── Firma digital ── */}
        <Field>
          <FieldLabel>Firma del cliente</FieldLabel>
          <div className="flex flex-col gap-2">
            <canvas
              ref={canvasRef}
              width={400}
              height={180}
              className="w-full rounded-lg border border-border bg-background touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              className="self-start"
            >
              <Eraser className="size-4" />
              Limpiar firma
            </Button>
          </div>
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
