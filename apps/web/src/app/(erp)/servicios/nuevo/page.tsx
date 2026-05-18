'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { RolUsuario } from '@erp/shared'

import {
  type ServicioFormPayload,
  useCreateServicio,
} from '@/hooks/use-servicios'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/layout/page-header'
import { ServicioForm } from '@/components/forms/servicio-form'
import { Button } from '@/components/ui/button'
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

export default function NuevoServicioPage() {
  const router = useRouter()
  const { hasRole } = useAuth()
  const createMutation = useCreateServicio()
  const [isDirty, setIsDirty] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleSubmit(data: ServicioFormPayload) {
    const payload: ServicioFormPayload = {
      ...data,
      manejaInventario: false,
    }
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Servicio creado correctamente')
        setIsDirty(false)
        router.push('/servicios')
      },
      onError: (error: Error) => {
        toast.error(error.message || 'No se pudo crear el servicio')
      },
    })
  }

  function handleBack() {
    if (isDirty) {
      setShowConfirm(true)
    } else {
      router.push('/servicios')
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
      <PageHeader
        title="Nuevo servicio"
        description="Define servicios técnicos: mantenimientos, instalaciones, diagnósticos, recargas, etc."
        actions={
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        }
      />

      <section className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wrench className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Ficha del servicio</h2>
            <p className="text-sm text-muted-foreground">
              Los servicios no manejan stock; sólo precios, categoría y tiempo
              estimado de ejecución.
            </p>
          </div>
        </div>
        <ServicioForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleBack}
          onDirtyChange={setIsDirty}
          canViewInternalCosts={hasRole(RolUsuario.ADMIN)}
          isLoading={createMutation.isPending}
        />
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
