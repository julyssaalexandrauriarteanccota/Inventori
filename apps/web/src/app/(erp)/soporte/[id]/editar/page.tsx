"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  type TicketDetalle,
  type TicketFormPayload,
} from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import { useTicket, useUpdateTicket } from "@/hooks/use-soporte";
import { TicketForm } from "@/components/forms/ticket-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function mapTicketToForm(ticket: TicketDetalle): Partial<TicketFormPayload> {
  return {
    clienteId: ticket.cliente?.id ?? "",
    equipoId: ticket.equipo?.id,
    clienteEquipoId: ticket.clienteEquipo?.id,
    tecnicoId: ticket.tecnico?.id,
    titulo: ticket.titulo,
    descripcion: ticket.descripcion,
    fallaReportada: ticket.fallaReportada ?? undefined,
    prioridad: ticket.prioridad,
    tipoServicio: ticket.tipoServicio,
    fechaPromesa: ticket.fechaPromesa ?? undefined,
    notas: ticket.notas ?? undefined,
  };
}

export default function EditarTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id;
  const { data, isLoading, isError } = useTicket(id);
  const updateMutation = useUpdateTicket(id ?? "");
  const ticket = data?.data;
  const formId = "ticket-edit-form";

  const defaultValues = useMemo(
    () => (ticket ? mapTicketToForm(ticket) : undefined),
    [ticket],
  );

  const handleSubmit = (payload: TicketFormPayload) => {
    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Ticket actualizado correctamente");
        router.push(`/soporte/${id}`);
      },
      onError: (error: Error) => {
        toast.error(error.message || "Error al actualizar el ticket");
      },
    });
  };

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-6 p-0 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 px-4 sm:px-0 mt-3 sm:mt-0">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push(id ? `/soporte/${id}` : "/soporte")}
            className="h-9 w-9 rounded-xl"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground">
              {ticket ? `Editar ${ticket.codigo}` : "Editar ticket"}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Ajusta cliente, equipo, descripción, técnico y clasificación.
            </p>
          </div>
        </div>
        {ticket ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(id ? `/soporte/${id}` : "/soporte")}
              className="h-9 w-9 sm:w-auto p-0 sm:px-4 rounded-xl text-xs"
              disabled={updateMutation.isPending}
            >
              <X className="size-3.5" />
              <span className="hidden sm:inline ml-1.5">Cancelar</span>
            </Button>
            <Button
              type="submit"
              form={formId}
              className="h-9 rounded-xl px-4 sm:px-5 text-xs font-semibold"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-3.5 mr-1" />
              )}
              <span className="hidden sm:inline">Guardar cambios</span>
              <span className="sm:hidden">Guardar</span>
            </Button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : isError || !ticket || !defaultValues ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No se pudo cargar el ticket.
        </div>
      ) : (
        <TicketForm
          formId={formId}
          mode="edit"
          defaultValues={defaultValues}
          initialSelections={{
            cliente: ticket.cliente,
            equipo: ticket.equipo,
            clienteEquipo: ticket.clienteEquipo,
          }}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
          userRol={user?.rol}
          hideBottomActions
        />
      )}
    </div>
  );
}
