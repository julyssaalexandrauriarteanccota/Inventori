"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { SectionContent } from "@/components/settings-dialog";
import {
  CONFIGURATION_SECTION_GROUPS,
  CONFIGURATION_SECTION_MAP,
  DEFAULT_CONFIGURATION_SECTION,
  getConfigurationSectionHref,
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
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

const CONFIGURATION_PANEL_GROUP_ID = "configuracion-shell";
const LAST_PRIMARY_PATH_KEY = "erp:last-primary-path";

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

function ConfigurationSectionNav({
  activeSection,
}: {
  activeSection: ConfigurationSectionId;
}) {
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    if (typeof window === "undefined") {
      router.push("/dashboard");
      return;
    }
    const stored = window.sessionStorage.getItem(LAST_PRIMARY_PATH_KEY);
    const target =
      stored && !stored.startsWith("/configuracion") ? stored : "/dashboard";
    router.push(target);
  }, [router]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-8 gap-1.5 rounded-lg px-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          <span className="text-xs font-medium">Volver</span>
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 [scrollbar-gutter:stable]">
        {CONFIGURATION_SECTION_GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <div className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((sectionId) => {
                const section = CONFIGURATION_SECTION_MAP.get(sectionId);
                if (!section) return null;
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <li key={section.id}>
                    <Link
                      href={getConfigurationSectionHref(section.id)}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground group-hover:bg-muted",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="truncate">{section.name}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

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
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId={CONFIGURATION_PANEL_GROUP_ID}
          className="min-h-0 flex-1 gap-3"
        >
          <ResizablePanel
            defaultSize={22}
            minSize={15}
            maxSize={38}
            className="min-w-[200px]"
          >
            <ConfigurationSectionNav activeSection={activeSection} />
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className="bg-transparent hover:bg-border"
          />

          <ResizablePanel defaultSize={78} minSize={50}>
            <section className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto rounded-2xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm sm:p-5">
              <SectionContent
                sectionId={activeSection}
                onRequestDeleteAction={handleRequestDelete}
              />
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
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
