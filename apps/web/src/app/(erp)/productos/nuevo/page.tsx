"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { RolUsuario, type ProductoFormPayload } from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import { useCreateProducto } from "@/hooks/use-productos";
import { ProductoForm } from "@/components/forms/producto-form";
import { Button } from "@/components/ui/button";
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

type CreatedProducto = {
  id: string;
  sku: string;
  nombre: string;
};

export default function NuevoProductoPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const createMutation = useCreateProducto();
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (data: ProductoFormPayload) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Producto creado correctamente");
        setIsDirty(false);
        router.push("/productos");
      },
      onError: (error: Error) => {
        toast.error(error.message || "No se pudo crear el producto");
      },
    });
  };

  const handleBack = () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      router.push("/productos");
    }
  };

  const handleCancelClick = () => {
    setIsDirty(false);
    router.push("/productos");
  };

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-6 p-6">
      {/* Premium Header: Back button + Title on Left, Form Actions on Right */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 rounded-xl hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Añadir Nuevo Producto</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelClick}
            className="rounded-xl text-xs h-9 px-4 gap-1.5 border-border/80 hover:bg-muted/50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
            disabled={createMutation.isPending}
          >
            <X className="size-3.5" />
            Cancelar
          </Button>
          <Button
            type="submit"
            form="producto-form"
            className="rounded-xl text-xs h-9 px-5 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs hover:scale-[1.02] hover:shadow-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1" />
                Creando...
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                Guardar Producto
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Form rendered directly on page canvas */}
      <ProductoForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleBack}
        onDirtyChange={setIsDirty}
        canViewInternalCosts={hasRole(RolUsuario.ADMIN)}
        isLoading={createMutation.isPending}
        hideBottomActions
      />

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
