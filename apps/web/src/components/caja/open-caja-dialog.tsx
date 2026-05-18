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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" /> Abrir caja
          </DialogTitle>
          <DialogDescription>
            Para registrar ventas necesitas un turno de caja abierto.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Caja</Label>
            {loadingCajas ? (
              <div className="flex h-9 items-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-3 animate-spin" /> Cargando…
              </div>
            ) : cajas.length === 0 ? (
              <p className="text-xs text-rose-600">
                No hay cajas activas. Crea una en Configuración → Cajas.
              </p>
            ) : (
              <Select value={selectedCajaId} onValueChange={setCajaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una caja" />
                </SelectTrigger>
                <SelectContent>
                  {cajas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="monto-inicial">Monto inicial (S/.)</Label>
            <Input
              id="monto-inicial"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notas-apertura">Notas (opcional)</Label>
            <Textarea
              id="notas-apertura"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones del turno…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={abrir.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={abrir.isPending || cajas.length === 0}
          >
            {abrir.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Abriendo…
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
