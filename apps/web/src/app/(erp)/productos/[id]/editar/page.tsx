'use client'

import { useCallback, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { RolUsuario, type ProductoFormPayload, type ProductoListItem } from '@erp/shared'

import { useAuth } from '@/hooks/use-auth'
import { useProducto, useUpdateProducto } from '@/hooks/use-productos'
import { PageHeader } from '@/components/layout/page-header'
import { ProductoForm } from '@/components/forms/producto-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

function mapProductoToForm(producto: ProductoListItem): Partial<ProductoFormPayload> {
  return {
    sku: producto.sku,
    nombre: producto.nombre,
    descripcion: producto.descripcion ?? undefined,
    tipo: producto.tipo,
    categoriaId: producto.categoria?.id,
    marcaId: producto.marca?.id ?? null,
    modeloId: producto.modeloId ?? null,
    unidadMedidaId: producto.unidadMedida?.id,
    modelo: producto.modelo ?? undefined,
    codigoBarras: producto.codigoBarras ?? undefined,
    codigoQr: producto.codigoQr ?? undefined,
    condicion: producto.condicion ?? undefined,
    precioCompra: producto.precioCompra,
    precioVenta: producto.precioVenta,
    precioMinimo: producto.precioMinimo,
    stockMinimo: producto.stockMinimo,
    manejaInventario: producto.manejaInventario,
    tieneNumeroSerie: producto.tieneNumeroSerie,
    esConsumible: producto.esConsumible,
    requiereRepuestos: producto.requiereRepuestos,
    tiempoEstimadoMin: producto.tiempoEstimadoMin ?? undefined,
    imagen: producto.imagen ?? undefined,
    imagenes: producto.imagenes?.map((image) => ({
      id: image.id,
      url: image.url,
      nombre: image.nombre ?? undefined,
      tipo: image.tipo ?? undefined,
      tamano: image.tamano ?? undefined,
      esPrincipal: image.esPrincipal,
      orden: image.orden,
    })),
    atributos: producto.atributos
      ? Object.entries(producto.atributos).map(([clave, valor]) => ({
          clave,
          valor: valor == null ? '' : String(valor),
        }))
      : undefined,
    activo: producto.activo,
  }
}

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { hasRole } = useAuth()
  const id = params.id

  const { data, isLoading, isError } = useProducto(id)
  const updateMutation = useUpdateProducto(id)
  const producto = data?.data
  const defaultValues = useMemo(
    () => (producto ? mapProductoToForm(producto) : undefined),
    [producto],
  )

  function handleSubmit(formData: ProductoFormPayload) {
    updateMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Producto actualizado correctamente')
        setIsDirty(false)
        router.push(`/productos/${id}`)
      },
      onError: (error: Error) => {
        toast.error(error.message || 'No se pudo actualizar el producto')
      },
    })
  }

  const [isDirty, setIsDirty] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowConfirm(true)
    } else {
      router.push(producto ? `/productos/${id}` : '/productos')
    }
  }, [isDirty, router, producto, id])

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
      <PageHeader
        title="Editar producto"
        description="Actualiza la clasificación, precios, códigos, imágenes y reglas del catálogo."
        actions={(
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        )}
      />

      <section className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Pencil className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">
              {producto?.nombre ?? 'Cargando producto'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {producto?.sku ?? 'Preparando formulario editable...'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : isError || !defaultValues ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <Loader2 className="size-8" />
            <p>No se pudo cargar el producto para editar.</p>
            <Button type="button" variant="outline" onClick={() => router.push('/productos')}>
              Volver al listado
            </Button>
          </div>
        ) : (
          <ProductoForm
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
              Tienes cambios sin guardar. Si sales ahora, perderás toda la información ingresada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => router.push(producto ? `/productos/${id}` : '/productos')}
            >
              Sí, descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
