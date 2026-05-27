"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { SectionContent } from "@/components/settings-dialog";
import {
  DEFAULT_CONFIGURATION_SECTION,
  isConfigurationSectionId,
} from "@/components/settings/configuration-nav";
import { type ConfigurationSectionId } from "@/components/settings/settings-sections";
import { useDeleteUsuario } from "@/hooks/use-configuracion";
import { useDeleteAlmacen } from "@/hooks/use-inventario";
import {
  useDeleteCategoria,
  useDeleteMarca,
  useDeleteModeloCatalogo,
} from "@/hooks/use-productos";
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

type DeleteTargetType =
  | "almacen"
  | "categoria"
  | "marca"
  | "modelo"
  | "usuario";

const DELETE_TYPE_BY_SECTION: Partial<
  Record<ConfigurationSectionId, DeleteTargetType>
> = {
  usuarios: "usuario",
  almacenes: "almacen",
  categorias: "categoria",
  marcas: "marca",
  modelos: "modelo",
};

const DELETE_LABEL_BY_TYPE: Record<DeleteTargetType, string> = {
  almacen: "almacén",
  categoria: "categoría",
  marca: "marca",
  modelo: "modelo",
  usuario: "usuario",
};

export function ConfigurationPageContent() {
  const searchParams = useSearchParams();
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: string;
    type: DeleteTargetType;
  } | null>(null);

  const deleteAlmacenMutation = useDeleteAlmacen();
  const deleteCategoriaMutation = useDeleteCategoria();
  const deleteMarcaMutation = useDeleteMarca();
  const deleteModeloMutation = useDeleteModeloCatalogo();
  const deleteUsuarioMutation = useDeleteUsuario();

  const activeSection = React.useMemo<ConfigurationSectionId>(() => {
    const section = searchParams.get("section");
    return isConfigurationSectionId(section)
      ? section
      : DEFAULT_CONFIGURATION_SECTION;
  }, [searchParams]);

  const activeMutation =
    deleteTarget?.type === "almacen"
      ? deleteAlmacenMutation
      : deleteTarget?.type === "categoria"
        ? deleteCategoriaMutation
        : deleteTarget?.type === "marca"
          ? deleteMarcaMutation
          : deleteTarget?.type === "modelo"
            ? deleteModeloMutation
            : deleteTarget?.type === "usuario"
              ? deleteUsuarioMutation
              : null;

  const handleRequestDelete = React.useCallback(
    (id: string) => {
      const type = DELETE_TYPE_BY_SECTION[activeSection];

      if (!type) {
        return;
      }

      setDeleteTarget({ id, type });
    },
    [activeSection],
  );

  const handleDelete = React.useCallback(() => {
    if (!deleteTarget || !activeMutation) return;

    const label = DELETE_LABEL_BY_TYPE[deleteTarget.type];

    activeMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(
          `${label.charAt(0).toUpperCase() + label.slice(1)} eliminado`,
        );
        setDeleteTarget(null);
      },
      onError: (error: Error) => {
        toast.error(error.message || "Error al eliminar");
      },
    });
  }, [activeMutation, deleteTarget]);

  return (
    <>
      <div className="flex h-[calc(100dvh-7rem)] flex-col">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-border/70 bg-card/75 backdrop-blur-sm p-4 text-card-foreground shadow-[0_14px_34px_-34px_rgba(15,23,42,0.42)] sm:p-5 overflow-y-auto">
          <SectionContent
            sectionId={activeSection}
            onRequestDeleteAction={handleRequestDelete}
          />
        </section>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(openState) => !openState && setDeleteTarget(null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar{" "}
                {deleteTarget
                  ? DELETE_LABEL_BY_TYPE[deleteTarget.type]
                  : "registro"}
                ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El registro será eliminado
                permanentemente.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0">
            <AlertDialogCancel className="mt-0 w-full rounded-xl sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={activeMutation?.isPending ?? false}
              className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            >
              {activeMutation?.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
