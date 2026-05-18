"use client";

import { useState } from "react";
import { Loader2, MessageSquarePlus, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  type ActualizarCasoGarantiaPayload,
  type CrearCasoGarantiaPayload,
} from "@erp/shared";

import {
  useActualizarCasoGarantia,
  useCrearCasoGarantia,
} from "@/hooks/use-garantias";
import type { GarantiaCasoItem } from "@/components/modals/garantia-detalle-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface GarantiaCasoModalProps {
  open: boolean;
  mode: "create" | "update";
  garantiaId: string | null;
  caso?: GarantiaCasoItem | null;
  onClose: () => void;
  onSuccess?: (garantiaId: string) => void;
}

export function GarantiaCasoModal({
  open,
  mode,
  garantiaId,
  caso,
  onClose,
  onSuccess,
}: GarantiaCasoModalProps) {
  const [descripcion, setDescripcion] = useState(() =>
    mode === "create" ? "" : (caso?.descripcion ?? ""),
  );
  const [resolucion, setResolucion] = useState(() => caso?.resolucion ?? "");
  const [aceptada, setAceptada] = useState<string>(() =>
    caso?.aceptada === true ? "true" : caso?.aceptada === false ? "false" : "",
  );
  const [motivo, setMotivo] = useState(() => caso?.motivo ?? "");

  const createMutation = useCrearCasoGarantia(garantiaId ?? "");
  const updateMutation = useActualizarCasoGarantia(
    garantiaId ?? "",
    caso?.id ?? "",
  );

  const isPending =
    mode === "create" ? createMutation.isPending : updateMutation.isPending;

  const handleClose = () => {
    if (isPending) {
      return;
    }

    onClose();
  };

  const handleSubmit = () => {
    if (!garantiaId) {
      return;
    }

    if (mode === "create") {
      const trimmedDescripcion = descripcion.trim();

      if (!trimmedDescripcion) {
        return;
      }

      const payload: CrearCasoGarantiaPayload = {
        descripcion: trimmedDescripcion,
      };

      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Caso de garantía creado correctamente");
          onClose();
          onSuccess?.(garantiaId);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Error al crear el caso de garantía");
        },
      });

      return;
    }

    const payload: ActualizarCasoGarantiaPayload = {};

    if (resolucion.trim()) {
      payload.resolucion = resolucion.trim();
    }

    if (aceptada !== "") {
      payload.aceptada = aceptada === "true";
    }

    if (motivo.trim()) {
      payload.motivo = motivo.trim();
    }

    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Caso de garantía actualizado");
        onClose();
        onSuccess?.(garantiaId);
      },
      onError: (error: Error) => {
        toast.error(error.message || "Error al actualizar el caso");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleClose()}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className={
                mode === "create"
                  ? "flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40"
                  : "flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40"
              }
            >
              {mode === "create" ? (
                <MessageSquarePlus className="size-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Wrench className="size-4 text-orange-600 dark:text-orange-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold sm:text-lg">
                {mode === "create"
                  ? "Nuevo caso de garantía"
                  : "Actualizar caso de garantía"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {mode === "create"
                  ? "Registra un reclamo o incidencia asociada a esta garantía."
                  : "Documenta la decisión y la resolución del caso."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4">
            {mode === "update" && caso ? (
              <section className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    1
                  </span>
                  <h3 className="text-sm font-medium tracking-tight text-foreground/90">
                    Caso reportado
                  </h3>
                </div>

                <div className="rounded-xl bg-background/70 p-3 text-sm text-foreground/90">
                  {caso.descripcion}
                </div>
              </section>
            ) : null}

            {mode === "create" ? (
              <section className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    1
                  </span>
                  <h3 className="text-sm font-medium tracking-tight text-foreground/90">
                    Descripción del problema
                  </h3>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Descripción *</Label>
                  <Textarea
                    placeholder="Describe el problema reportado por el cliente..."
                    value={descripcion}
                    onChange={(event) => setDescripcion(event.target.value)}
                    rows={5}
                  />
                </div>
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      2
                    </span>
                    <h3 className="text-sm font-medium tracking-tight text-foreground/90">
                      Decisión
                    </h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>Resultado</Label>
                      <Select
                        value={aceptada}
                        onValueChange={(value) => {
                          setAceptada(value);
                          if (value !== "false") {
                            setMotivo("");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar decisión" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Aceptar garantía</SelectItem>
                          <SelectItem value="false">
                            Rechazar garantía
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                      <ShieldCheck className="size-4 shrink-0 text-primary" />
                      La resolución puede guardarse parcial y completarse
                      después.
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      3
                    </span>
                    <h3 className="text-sm font-medium tracking-tight text-foreground/90">
                      Resolución
                    </h3>
                  </div>

                  <div className="grid gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>Resolución</Label>
                      <Textarea
                        placeholder="Describe la solución aplicada o el resultado del análisis..."
                        value={resolucion}
                        onChange={(event) => setResolucion(event.target.value)}
                        rows={4}
                      />
                    </div>

                    {aceptada === "false" ? (
                      <div className="flex flex-col gap-1.5">
                        <Label>Motivo de rechazo</Label>
                        <Textarea
                          placeholder="Explica por qué la garantía fue rechazada..."
                          value={motivo}
                          onChange={(event) => setMotivo(event.target.value)}
                          rows={3}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border/40 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              className="rounded-xl sm:w-auto"
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="min-w-32 gap-2 rounded-xl sm:w-auto"
              disabled={
                mode === "create" ? !descripcion.trim() || isPending : isPending
              }
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "create" ? "Crear caso" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
