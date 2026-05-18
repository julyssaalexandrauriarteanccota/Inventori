"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { EquipoFormPayload } from "@erp/shared";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EquipoForm } from "@/components/forms/equipo-form";
import {
  useCreateEquipo,
  useAsignarEquipoCliente,
} from "@/hooks/use-equipos";

type CreatedEquipo = { id: string; numeroSerie: string };

interface EquipoQuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  onCreated: (equipo: CreatedEquipo) => void;
}

export function EquipoQuickCreateModal({
  open,
  onClose,
  clienteId,
  onCreated,
}: EquipoQuickCreateModalProps) {
  const createMut = useCreateEquipo();
  const [createdSerie, setCreatedSerie] = useState<string | null>(null);
  const asignarMut = useAsignarEquipoCliente(createdSerie ?? "");

  const handleSubmit = (data: EquipoFormPayload) => {
    createMut.mutate(data, {
      onSuccess: (resp: unknown) => {
        const equipo = (resp as { data: CreatedEquipo })?.data;
        if (!equipo?.id || !equipo?.numeroSerie) {
          toast.error("Equipo creado pero no se pudo asignar (respuesta inesperada).");
          onClose();
          return;
        }
        setCreatedSerie(equipo.numeroSerie);
        // Asignar al cliente inmediatamente
        asignarMut.mutate(
          { clienteId },
          {
            onSuccess: () => {
              toast.success("Equipo registrado y asignado al cliente.");
              onCreated(equipo);
              onClose();
            },
            onError: (err: Error) => {
              // Equipo se creó pero falló la asignación; aún así devolverlo
              toast.warning(
                err.message ?? "Equipo creado, pero no se pudo asignar al cliente.",
              );
              onCreated(equipo);
              onClose();
            },
          },
        );
      },
      onError: (err: Error) => {
        toast.error(err.message || "No se pudo crear el equipo.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <Plus className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold">
                Nuevo equipo del cliente
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Se asignará automáticamente al cliente seleccionado en el ticket.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          <EquipoForm
            mode="create"
            onSubmit={handleSubmit}
            isLoading={createMut.isPending || asignarMut.isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
