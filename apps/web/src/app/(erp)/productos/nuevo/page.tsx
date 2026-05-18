'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { RolUsuario, type ProductoFormPayload } from '@erp/shared'

import { useAuth } from '@/hooks/use-auth'
import { useCreateProducto } from '@/hooks/use-productos'
import { PageHeader } from '@/components/layout/page-header'
import { ProductoForm } from '@/components/forms/producto-form'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export default function NuevoProductoPage() {
  const router = useRouter()
  const { hasRole } = useAuth()
  const createMutation = useCreateProducto()
  const [isDirty, setIsDirty] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleSubmit(data: ProductoFormPayload) {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Producto creado correctamente')
        setIsDirty(false)
        router.push('/productos')
      },
      onError: (error: Error) => {
        toast.error(error.message || 'No se pudo crear el producto')
      },
    })
  }

  function handleBack() {
    if (isDirty) {
      setShowConfirm(true)
    } else {
      router.push('/productos')
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
      <PageHeader
        title="Nuevo producto"
        description="Registra equipos, repuestos, insumos, servicios o accesorios con imágenes y códigos."
        actions={(
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        )}
      />

      <section className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PackagePlus className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Ficha de catálogo</h2>
            <p className="text-sm text-muted-foreground">
              Primero clasifica por tipo; luego selecciona la categoría correspondiente.
            </p>
          </div>
        </div>
        <ProductoForm
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
              Tienes cambios sin guardar. Si sales ahora, perderás toda la información ingresada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => router.push('/productos')}
            >
              Sí, descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
