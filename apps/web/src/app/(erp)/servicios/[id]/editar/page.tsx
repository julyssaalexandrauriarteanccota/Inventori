'use client'

import { useCallback, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { RolUsuario } from '@erp/shared'

import {
  type ServicioFormPayload,
  type ServicioListItem,
  useServicio,
  useUpdateServicio,
} from '@/hooks/use-servicios'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/layout/page-header'
import { ServicioForm } from '@/components/forms/servicio-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function mapServicioToForm(servicio: ServicioListItem): Partial<ServicioFormPayload> {
  return {
    sku: servicio.sku,
    nombre: servicio.nombre,
    descripcion: servicio.descripcion ?? undefined,
    categoriaId: servicio.categoria?.id,
    unidadMedidaId: servicio.unidadMedida?.id,
    precioCompra: servicio.precioCompra,
    precioVenta: servicio.precioVenta,
    precioMinimo: servicio.precioVenta,
    stockMinimo: 0,
    manejaInventario: false,
    tieneNumeroSerie: false,
    esConsumible: false,
    requiereRepuestos: servicio.requiereRepuestos,
    tiempoEstimadoMin: servicio.tiempoEstimadoMin ?? undefined,
    imagen: undefined,
    imagenes: [],
    atributos: [],
    activo: servicio.activo,
  }
}

export default function EditarServicioPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { hasRole } = useAuth()
  const id = params.id

  const { data, isLoading, isError } = useServicio(id)
  const updateMutation = useUpdateServicio(id)
  const servicio = data?.data
  const defaultValues = useMemo(
    () => (servicio ? mapServicioToForm(servicio) : undefined),
    [servicio],
  )

  const [isDirty, setIsDirty] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleSubmit(formData: ServicioFormPayload) {
    const payload: ServicioFormPayload = {
      ...formData,
      manejaInventario: false,
      tieneNumeroSerie: false,
      esConsumible: false,
      stockMinimo: 0,
      imagen: undefined,
      imagenes: [],
      atributos: [],
      stockInicial: [],
    }
    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Servicio actualizado correctamente')
        setIsDirty(false)
        router.push('/servicios')
      },
      onError: (error: Error) => {
        toast.error(error.message || 'No se pudo actualizar el servicio')
      },
    })
  }

  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowConfirm(true)
    } else {
      router.push('/servicios')
    }
  }, [isDirty, router])

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
      <PageHeader
        title="Editar servicio"
        description="Actualiza precios, categoría, descripción y tiempo estimado del servicio."
        actions={
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        }
      />

      <section className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Pencil className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">
              {servicio?.nombre ?? 'Cargando servicio'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {servicio?.sku ?? 'Preparando formulario editable...'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : isError || !defaultValues ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <Loader2 className="size-8" />
            <p>No se pudo cargar el servicio.</p>
            <Button type="button" variant="outline" onClick={() => router.push('/servicios')}>
              Volver al listado
            </Button>
          </div>
        ) : (
          <ServicioForm
            mode="edit"
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
            onCancel={handleBack}
            onDirtyChange={setIsDirty}
            canViewInternalCosts={hasRole(RolUsuario.ADMIN)}
            isLoading={updateMutation.isPending}
          />
        )}
      </section>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. Si sales ahora, perderás toda la
              información ingresada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => router.push('/servicios')}
            >
              Sí, descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
