"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ItemValidacion, ResultadoValidacion } from "@erp/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ValidacionPreEmisionModalProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  resultado: ResultadoValidacion | null;
  onConfirmAction: () => void;
  emitiendo?: boolean;
}

/**
 * Doc 10 §8 — Modal mostrado al usuario antes de emitir un comprobante.
 * - Si hay bloqueantes: solo botón "Cerrar". No se puede continuar.
 * - Si hay advertencias y no hay bloqueantes: botón "Emitir de todos modos"
 *   que reenvía la mutación con `confirmarAdvertencias=true`.
 */
export function ValidacionPreEmisionModal({
  open,
  onOpenChangeAction,
  resultado,
  onConfirmAction,
  emitiendo,
}: ValidacionPreEmisionModalProps) {
  const bloqueantes = resultado?.bloqueantes ?? [];
  const advertencias = resultado?.advertencias ?? [];
  const hayBloqueantes = bloqueantes.length > 0;
  const hayAdvertencias = advertencias.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle
            className={cn(
              "flex items-center gap-2",
              hayBloqueantes ? "text-destructive" : "text-amber-600",
            )}
          >
            {hayBloqueantes ? (
              <>
                <ShieldAlert className="size-5" />
                No se puede emitir
              </>
            ) : (
              <>
                <AlertTriangle className="size-5" />
                Advertencias
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {hayBloqueantes
              ? `Se encontraron ${bloqueantes.length} ${
                  bloqueantes.length === 1 ? "error" : "errores"
                } que impiden la emisión.`
              : "Estos puntos no impiden la emisión, pero se recomienda revisar antes de continuar."}
          </DialogDescription>
        </DialogHeader>

        {hayBloqueantes && (
          <ul className="space-y-3">
            {bloqueantes.map((item) => (
              <ItemRow key={`bloq-${item.reglaId}`} item={item} tipo="bloqueante" />
            ))}
          </ul>
        )}

        {hayAdvertencias && !hayBloqueantes && (
          <ul className="space-y-3">
            {advertencias.map((item) => (
              <ItemRow key={`adv-${item.reglaId}`} item={item} tipo="advertencia" />
            ))}
          </ul>
        )}

        {/* Cuando hay ambos, mostramos las advertencias debajo */}
        {hayBloqueantes && hayAdvertencias && (
          <>
            <p className="mt-2 text-sm font-medium text-amber-600">
              Además, hay advertencias pendientes:
            </p>
            <ul className="space-y-3">
              {advertencias.map((item) => (
                <ItemRow
                  key={`adv2-${item.reglaId}`}
                  item={item}
                  tipo="advertencia"
                />
              ))}
            </ul>
          </>
        )}

        <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0">
          <Button
            variant="outline"
            className="w-full rounded-xl sm:w-auto"
            onClick={() => onOpenChangeAction(false)}
          >
            {hayBloqueantes ? "Cerrar" : "Cancelar"}
          </Button>
          {!hayBloqueantes && hayAdvertencias && (
            <Button
              className="w-full rounded-xl sm:w-auto"
              onClick={onConfirmAction}
              disabled={emitiendo}
            >
              {emitiendo ? "Emitiendo..." : "Emitir de todos modos"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemRow({
  item,
  tipo,
}: {
  item: ItemValidacion;
  tipo: "bloqueante" | "advertencia";
}) {
  return (
    <li
      className={cn(
        "rounded-xl border p-3 text-sm",
        tipo === "bloqueante"
          ? "border-destructive/30 bg-destructive/5"
          : "border-amber-300/60 bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      <p className="font-medium">{item.mensaje}</p>
      {item.enlaceCorreccion && (
        <Link
          href={item.enlaceCorreccion.url}
          className="mt-1 inline-block text-xs text-primary underline-offset-4 hover:underline"
        >
          {item.enlaceCorreccion.label} →
        </Link>
      )}
    </li>
  );
}
