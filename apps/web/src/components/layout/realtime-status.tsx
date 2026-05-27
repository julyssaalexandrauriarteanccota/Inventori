"use client";

import { RefreshCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";

interface RealtimeStatusProps {
  className?: string;
  /** Label shown next to the dot. Default "En vivo" when connected. */
  label?: string;
  /** Toast message when the user triggers a manual refresh. */
  toastMessage?: string;
}

export function RealtimeStatus({
  className,
  label,
  toastMessage = "Datos actualizados",
}: RealtimeStatusProps) {
  const { isConnected } = useSocket();
  const queryClient = useQueryClient();

  const manualRefresh = useCallback(() => {
    void queryClient.refetchQueries({ type: "active" });
    toast.info(toastMessage, { duration: 1600 });
  }, [queryClient, toastMessage]);

  return (
    <div
      data-slot="realtime-status"
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium",
        isConnected
          ? "border-emerald-200/60 bg-emerald-50/50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400"
          : "border-red-200/60 bg-red-50/50 text-red-600 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-400",
        className,
      )}
    >
      {/* Pulsating dot */}
      <span className="relative flex size-2">
        {isConnected && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40 dark:bg-emerald-500" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            isConnected
              ? "bg-emerald-500 dark:bg-emerald-400"
              : "bg-red-500 dark:bg-red-400",
          )}
        />
      </span>

      <span className="select-none whitespace-nowrap">
        {label ?? (isConnected ? "En vivo" : "Sin conexión")}
      </span>

      {/* Manual refresh button */}
      <Button
        variant="ghost"
        size="icon"
        className="size-5 p-0 text-current opacity-60 hover:bg-transparent hover:opacity-100"
        onClick={manualRefresh}
        title="Actualizar datos manualmente"
      >
        <RefreshCcw className="size-3" />
        <span className="sr-only">Actualizar</span>
      </Button>
    </div>
  );
}
