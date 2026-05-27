"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { RolUsuario, TipoProducto, type ProductoFormPayload, type ProductoListItem } from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import { useProducto, useUpdateProducto } from "@/hooks/use-productos";
import { ProductoForm } from "@/components/forms/producto-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TIPO_LABELS: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Equipo",
  [TipoProducto.REPUESTO]: "Repuesto",
  [TipoProducto.INSUMO]: "Insumo",
  [TipoProducto.SERVICIO]: "Servicio",
  [TipoProducto.ACCESORIO]: "Accesorio",
};

function mapProductoToForm(producto: ProductoListItem): Partial<ProductoFormPayload> {
  return {
    sku: producto.sku,
    nombre: producto.nombre,
    descripcion: producto.descripcion ?? undefined,
    tipo: producto.tipo,
    categoriaId: producto.categoria?.id,
    marcaId: producto.marca?.id ?? null,
    modeloId: producto.modeloId ?? null,
    modeloIds:
      producto.modeloIds && producto.modeloIds.length > 0
        ? producto.modeloIds
        : producto.modeloId
          ? [producto.modeloId]
          : [],
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
          valor: valor == null ? "" : String(valor),
        }))
      : undefined,
    activo: producto.activo,
  };
}

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const id = params?.id;

  const { data, isLoading, isError } = useProducto(id ?? "");
  const updateMutation = useUpdateProducto(id ?? "");
  const producto = data?.data;

  const defaultValues = useMemo(
    () => (producto ? mapProductoToForm(producto) : undefined),
    [producto],
  );

  const [isDirty, setIsDirty] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (formData: ProductoFormPayload) => {
    updateMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Producto actualizado correctamente");
        setIsDirty(false);
        router.push("/productos");
      },
      onError: (error: Error) => {
        toast.error(error.message || "No se pudo actualizar el producto");
      },
    });
  };

  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      router.push("/productos");
    }
  }, [isDirty, router]);

  const handleCancelClick = () => {
    setIsDirty(false);
    router.push("/productos");
  };

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-6 p-0 sm:p-6">
      {/* Premium Header: Back button + Title on Left, Form Actions on Right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60 px-3 sm:px-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 rounded-xl hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
              {isLoading ? "Cargando Ficha..." : `Editar: ${producto?.nombre}`}
            </h1>
            {producto && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20 uppercase tracking-wider select-none animate-in fade-in zoom-in-95 duration-300 shrink-0">
                {TIPO_LABELS[producto.tipo]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelClick}
            className="rounded-xl text-xs h-9 px-3 sm:px-4 gap-1.5 border-border/80 hover:bg-muted/50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
            disabled={updateMutation.isPending}
          >
            <X className="size-3.5" />
            <span className="hidden sm:inline">Cancelar</span>
          </Button>
          <Button
            type="submit"
            form="producto-form"
            className="rounded-xl text-xs h-9 px-3.5 sm:px-5 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs hover:scale-[1.02] hover:shadow-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
            disabled={updateMutation.isPending || isLoading || isError}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Guardar</span>
                <span className="hidden sm:inline">Cambios</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Form rendered directly on page canvas */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isError || !defaultValues ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p>No se pudo cargar el producto para editar.</p>
          <Button type="button" variant="outline" onClick={handleBack} className="rounded-xl h-9 text-xs">
            Volver al listado
          </Button>
        </div>
      ) : (
        <ProductoForm
          mode="edit"
          defaultValues={defaultValues}
          lockedTipo={defaultValues.tipo}
          onSubmit={handleSubmit}
          onCancel={handleBack}
          onDirtyChange={setIsDirty}
          canViewInternalCosts={hasRole(RolUsuario.ADMIN)}
          isLoading={updateMutation.isPending}
          hideBottomActions
        />
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="w-full sm:max-w-md rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. Si sales ahora, perderás toda la información ingresada en la ficha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0 w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0 hover:bg-muted transition-all duration-300">
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300"
              onClick={() => {
                setIsDirty(false);
                setShowConfirm(false);
                router.push("/productos");
              }}
            >
              Sí, descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
