"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EstadoTicket } from "@erp/shared";

import { cn } from "@/lib/utils";
import { useUpdateTicket } from "@/hooks/use-soporte";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ESTADO_LABELS: Record<EstadoTicket, string> = {
  [EstadoTicket.ABIERTO]: "Abierto",
  [EstadoTicket.EN_PROCESO]: "En proceso",
  [EstadoTicket.EN_ESPERA]: "En espera",
  [EstadoTicket.CERRADO]: "Cerrado",
  [EstadoTicket.CANCELADO]: "Cancelado",
};

const STATUS_OPTIONS = [
  EstadoTicket.EN_PROCESO,
  EstadoTicket.EN_ESPERA,
  EstadoTicket.CANCELADO,
];

function statusDotClass(estado: EstadoTicket) {
  return cn("size-1.5 rounded-full shrink-0", {
    "bg-sky-500": estado === EstadoTicket.ABIERTO,
    "bg-amber-500": estado === EstadoTicket.EN_PROCESO,
    "bg-violet-500": estado === EstadoTicket.EN_ESPERA,
    "bg-emerald-500": estado === EstadoTicket.CERRADO,
    "bg-slate-500": estado === EstadoTicket.CANCELADO,
  });
}

export function TicketStatusAction({
  ticketId,
  estado,
  compact = false,
}: {
  ticketId: string;
  estado: EstadoTicket;
  compact?: boolean;
}) {
  const updateTicket = useUpdateTicket(ticketId);
  const disabled =
    updateTicket.isPending ||
    estado === EstadoTicket.CERRADO ||
    estado === EstadoTicket.CANCELADO;
  const options = STATUS_OPTIONS.filter((option) => option !== estado);

  const handleChange = (nextEstado: EstadoTicket) => {
    updateTicket.mutate(
      { estado: nextEstado },
      {
        onSuccess: () =>
          toast.success(`Ticket marcado como ${ESTADO_LABELS[nextEstado]}`),
        onError: (error: Error) =>
          toast.error(error.message || "No se pudo cambiar el estado"),
      },
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          disabled={disabled}
          className={cn(
            "gap-2 rounded-full border font-semibold tracking-[0.01em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150 shadow-none",
            compact ? "h-8 px-2.5 text-[11px]" : "h-9 px-3.5 text-xs",
            {
              "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100/70 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 dark:hover:bg-sky-500/20": estado === EstadoTicket.ABIERTO,
              "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:hover:bg-amber-500/20": estado === EstadoTicket.EN_PROCESO,
              "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100/70 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20 dark:hover:bg-violet-500/20": estado === EstadoTicket.EN_ESPERA,
              "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20": estado === EstadoTicket.CERRADO,
              "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70 dark:bg-white/[0.04] dark:text-slate-400 dark:border-white/[0.08] dark:hover:bg-white/[0.08]": estado === EstadoTicket.CANCELADO,
            }
          )}
        >
          {updateTicket.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <span className={statusDotClass(estado)} aria-hidden="true" />
          )}
          <span>{ESTADO_LABELS[estado]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => handleChange(option)}
              className="gap-2"
            >
              <span className={statusDotClass(option)} aria-hidden="true" />
              {ESTADO_LABELS[option]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
