"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { ClienteFormPayload } from "@erp/shared";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClienteForm } from "@/components/forms/cliente-form";
import { useCreateCliente } from "@/hooks/use-clientes";

type CreatedCliente = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  razonSocial?: string | null;
};

interface ClienteQuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (cliente: CreatedCliente) => void;
}

export function ClienteQuickCreateModal({
  open,
  onClose,
  onCreated,
}: ClienteQuickCreateModalProps) {
  const createMut = useCreateCliente();

  const handleSubmit = (data: ClienteFormPayload) => {
    createMut.mutate(data, {
      onSuccess: (resp: unknown) => {
        const cliente = (resp as { data: CreatedCliente })?.data;
        if (!cliente?.id) {
          toast.error("Cliente creado pero la respuesta es inesperada.");
          onClose();
          return;
        }
        toast.success("Cliente registrado.");
        onCreated(cliente);
        onClose();
      },
      onError: (err: Error) => {
        toast.error(err.message || "No se pudo crear el cliente.");
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
                Nuevo cliente
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Quedará seleccionado automáticamente en el ticket.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          <ClienteForm
            mode="create"
            onSubmit={handleSubmit}
            isLoading={createMut.isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
