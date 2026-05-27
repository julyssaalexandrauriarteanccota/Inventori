"use client";

import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAbrirCaja, useCajas } from "@/hooks/use-caja";

interface OpenCajaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened?: () => void;
}

export function OpenCajaDialog({
  open,
  onOpenChange,
  onOpened,
}: OpenCajaDialogProps) {
  const { data: cajasResp, isLoading: loadingCajas } = useCajas();
  const cajas = (cajasResp?.data ?? []).filter((c) => c.activa);
  const abrir = useAbrirCaja();

  const [cajaId, setCajaId] = useState<string>("");
  const [montoInicial, setMontoInicial] = useState<string>("0");
  const [notas, setNotas] = useState<string>("");

  const selectedCajaId = cajas.some((c) => c.id === cajaId)
    ? cajaId
    : (cajas[0]?.id ?? "");

  function reset() {
    setCajaId("");
    setMontoInicial("0");
    setNotas("");
  }

  function submit() {
    const monto = Number(montoInicial);
    if (!selectedCajaId) {
      toast.error("Selecciona una caja.");
      return;
    }
    if (Number.isNaN(monto) || monto < 0) {
      toast.error("Monto inicial inválido.");
      return;
    }
    abrir.mutate(
      {
        cajaId: selectedCajaId,
        montoInicial: monto,
        notasApertura: notas.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Caja abierta.");
          reset();
          onOpenChange(false);
          onOpened?.();
        },
        onError: (e: unknown) => {
          const msg =
            e instanceof Error ? e.message : "No se pudo abrir la caja.";
          toast.error(msg);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full rounded-2xl p-0 sm:max-w-md overflow-hidden bg-card/95 backdrop-blur-sm border-border/60">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wallet className="size-5" />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-base font-semibold leading-none">Abrir caja</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Para registrar ventas necesitas un turno de caja abierto.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 px-5 py-5">
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caja</Label>
            {loadingCajas ? (
              <div className="flex h-9 items-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-3.5 animate-spin" /> Cargando…
              </div>
            ) : cajas.length === 0 ? (
              <p className="text-xs text-rose-600 font-medium">
                No hay cajas activas. Crea una en Configuración → Cajas.
              </p>
            ) : (
              <Select value={selectedCajaId} onValueChange={setCajaId}>
                <SelectTrigger className="rounded-xl border-border/80 h-9 text-xs">
                  <SelectValue placeholder="Selecciona una caja" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {cajas.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs rounded-lg">
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="monto-inicial" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Monto inicial (S/.)
            </Label>
            <Input
              id="monto-inicial"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
              className="rounded-xl border-border/80 h-9 text-xs font-mono"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notas-apertura" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Notas (opcional)
            </Label>
            <Textarea
              id="notas-apertura"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones del turno…"
              className="rounded-xl border-border/80 text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-5 py-4 bg-muted/10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={abrir.isPending}
            className="rounded-xl h-9 text-xs font-medium transition-all duration-300 hover:scale-[1.02] active:scale-95"
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={abrir.isPending || cajas.length === 0}
            className="rounded-xl h-9 text-xs font-medium erp-page-primary-cta transition-all duration-300 hover:scale-[1.02] active:scale-95"
          >
            {abrir.isPending ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" /> Abriendo…
              </>
            ) : (
              "Abrir caja"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
