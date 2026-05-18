'use client'

import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, Hash } from 'lucide-react'
import { toast } from 'sonner'

import {
  useSeriesDocumentos,
  useUpdateSeriesDocumentos,
} from '@/hooks/use-configuracion'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const seriesSchema = z.object({
  serieFactura: z.string().trim().max(4, 'Máximo 4 caracteres').optional(),
  serieBoleta: z.string().trim().max(4, 'Máximo 4 caracteres').optional(),
})

type SeriesForm = z.infer<typeof seriesSchema>

type SeriesView = {
  serieFactura?: string
  serieBoleta?: string
  correlativoFactura?: number
  correlativoBoleta?: number
}

function nextCorrelativo(value?: number) {
  return String((value ?? 0) + 1).padStart(8, '0')
}

export function SeriesSettingsContent() {
  const { data, isLoading } = useSeriesDocumentos()
  const updateMutation = useUpdateSeriesDocumentos()
  const series = (data?.data ?? {}) as SeriesView

  const form = useForm<SeriesForm>({
    resolver: zodResolver(seriesSchema),
    values: {
      serieFactura: series.serieFactura ?? '',
      serieBoleta: series.serieBoleta ?? '',
    },
  })

  const onSubmit = useCallback(
    (values: SeriesForm) => {
      updateMutation.mutate(values, {
        onSuccess: () => toast.success('Series actualizadas correctamente'),
        onError: (err: Error) =>
          toast.error(err.message || 'Error al guardar series'),
      })
    },
    [updateMutation],
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border/40 bg-card/50 p-4"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-10 w-full" />
              <Skeleton className="mt-3 h-14 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Series de comprobantes
        </h2>
        <p className="text-xs text-muted-foreground">
          Configura solo las series principales para facturas y boletas.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/40 bg-card/50 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Factura</p>
              <p className="text-xs text-muted-foreground">
                Serie usada al emitir facturas.
              </p>
            </div>
          </div>

          <FieldGroup className="mt-4 gap-3">
            <Field data-invalid={errors.serieFactura ? true : undefined}>
              <FieldLabel>Serie</FieldLabel>
              <Input
                placeholder="F001"
                maxLength={4}
                {...register('serieFactura')}
              />
              <FieldError>{errors.serieFactura?.message}</FieldError>
            </Field>

            <div className="rounded-xl border border-border/50 bg-background px-3 py-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Hash className="size-3.5" />
                Siguiente correlativo
              </div>
              <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                {series.serieFactura || 'F001'}-{nextCorrelativo(series.correlativoFactura)}
              </p>
            </div>
          </FieldGroup>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Boleta</p>
              <p className="text-xs text-muted-foreground">
                Serie usada al emitir boletas simples.
              </p>
            </div>
          </div>

          <FieldGroup className="mt-4 gap-3">
            <Field data-invalid={errors.serieBoleta ? true : undefined}>
              <FieldLabel>Serie</FieldLabel>
              <Input
                placeholder="B001"
                maxLength={4}
                {...register('serieBoleta')}
              />
              <FieldError>{errors.serieBoleta?.message}</FieldError>
            </Field>

            <div className="rounded-xl border border-border/50 bg-background px-3 py-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Hash className="size-3.5" />
                Siguiente correlativo
              </div>
              <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                {series.serieBoleta || 'B001'}-{nextCorrelativo(series.correlativoBoleta)}
              </p>
            </div>
          </FieldGroup>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        Notas de crédito y débito siguen existiendo internamente para facturación,
        pero ya no se exponen en esta configuración rápida.
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-xl"
        >
          {updateMutation.isPending ? 'Guardando...' : 'Guardar series'}
        </Button>
      </div>
    </form>
  )
}
