"use client";

import { useMemo, useState } from "react";
import { Wrench, Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  type ServicioFormPayload,
  type ServicioListItem,
  useCreateServicio,
  useServicio,
  useUpdateServicio,
} from "@/hooks/use-servicios";
import { ServicioForm } from "@/components/forms/servicio-form";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ServicioFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicioId?: string | null;
  onSaved?: () => void;
  canViewInternalCosts?: boolean;
}

function mapServicioToForm(
  servicio: ServicioListItem,
): Partial<ServicioFormPayload> {
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
  };
}

export function ServicioFormModal({
  open,
  onOpenChange,
  servicioId,
  onSaved,
  canViewInternalCosts = true,
}: ServicioFormModalProps) {
  const isEdit = Boolean(servicioId);
  const { data: detailRes, isLoading: loadingDetail } = useServicio(
    isEdit ? (servicioId ?? undefined) : undefined,
  );
  const servicio = detailRes?.data;

  const createMutation = useCreateServicio();
  const updateMutation = useUpdateServicio(servicioId ?? "");

  const [isDirty, setIsDirty] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const defaultValues = useMemo(
    () => (isEdit && servicio ? mapServicioToForm(servicio) : undefined),
    [isEdit, servicio],
  );

  function handleSubmit(data: ServicioFormPayload) {
    const payload: ServicioFormPayload = {
      ...data,
      manejaInventario: false,
      tieneNumeroSerie: false,
      esConsumible: false,
      stockMinimo: 0,
      imagen: undefined,
      imagenes: [],
      atributos: [],
      stockInicial: [],
    };

    if (isEdit) {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Servicio actualizado");
          setIsDirty(false);
          onSaved?.();
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || "No se pudo actualizar el servicio");
        },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Servicio creado");
          setIsDirty(false);
          onSaved?.();
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || "No se pudo crear el servicio");
        },
      });
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    setIsDirty(false);
    onOpenChange(next);
  }

  function discardChangesAndClose() {
    setConfirmCloseOpen(false);
    setIsDirty(false);
    onOpenChange(false);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border/60 px-5 py-4 pr-12">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                  isEdit
                    ? "bg-orange-100 text-orange-700"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {isEdit ? (
                  <Pencil className="size-5" />
                ) : (
                  <Wrench className="size-5" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate text-base">
                  {isEdit
                    ? servicio?.nombre ?? "Editar servicio"
                    : "Nuevo servicio"}
                </DialogTitle>
                <DialogDescription>
                  {isEdit
                    ? "Actualiza precio, categoria, duracion y alcance."
                    : "Define mantenimientos, instalaciones, diagnósticos, recargas, etc."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-4">
            {isEdit && loadingDetail ? (
              <div className="grid gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : isEdit && !defaultValues ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No se pudo cargar el servicio.
              </div>
            ) : (
              <ServicioForm
                mode={isEdit ? "edit" : "create"}
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                onCancel={() => handleOpenChange(false)}
                onDirtyChange={setIsDirty}
                canViewInternalCosts={canViewInternalCosts}
                isLoading={isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. Si sales ahora, se perdera la
              informacion ingresada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={discardChangesAndClose}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
