"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { type TicketFormPayload } from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import { useClienteEquipo } from "@/hooks/use-equipos";
import { useCreateTicket } from "@/hooks/use-soporte";
import { TicketForm } from "@/components/forms/ticket-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function NuevoTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const createMutation = useCreateTicket();
  const formId = "ticket-create-form";
  const clienteId = searchParams.get("clienteId") || undefined;
  const clienteEquipoId = searchParams.get("clienteEquipoId") || undefined;
  const equipoId = searchParams.get("equipoId") || undefined;
  const { data: clienteEquipoRes, isLoading: isClienteEquipoLoading } =
    useClienteEquipo(clienteEquipoId);
  const clienteEquipo = clienteEquipoRes?.data;
  const defaultClienteId = clienteId ?? clienteEquipo?.clienteId;

  const handleSubmit = (payload: TicketFormPayload) => {
    createMutation.mutate(payload, {
      onSuccess: (response) => {
        const id = (response as { data?: { id?: string } })?.data?.id;
        toast.success("Ticket creado correctamente");
        router.push(id ? `/soporte/${id}` : "/soporte");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Error al crear el ticket");
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
            onClick={() => router.push("/soporte")}
            className="h-9 w-9 rounded-xl"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground">
              Nuevo ticket
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Registra soporte, mantenimiento, equipo y servicios solicitados.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/soporte")}
            className="h-9 w-9 sm:w-auto p-0 sm:px-4 rounded-xl text-xs"
            disabled={createMutation.isPending}
          >
            <X className="size-3.5" />
            <span className="hidden sm:inline ml-1.5">Cancelar</span>
          </Button>
          <Button
            type="submit"
            form={formId}
            className="h-9 rounded-xl px-4 sm:px-5 text-xs font-semibold"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-3.5 mr-1" />
            )}
            <span className="hidden sm:inline">Crear ticket</span>
            <span className="sm:hidden">Crear</span>
          </Button>
        </div>
      </div>

      {clienteEquipoId && isClienteEquipoLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : (
        <TicketForm
          formId={formId}
          mode="create"
          defaultValues={{
            clienteId: defaultClienteId,
            clienteEquipoId,
            equipoId,
          }}
          initialSelections={{
            cliente: clienteEquipo?.cliente ?? null,
            clienteEquipo: clienteEquipo ?? null,
          }}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          userRol={user?.rol}
          hideBottomActions
        />
      )}
    </div>
  );
}
