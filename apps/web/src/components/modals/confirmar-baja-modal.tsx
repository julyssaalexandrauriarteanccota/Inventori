"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useAnularComprobante,
  useElegibilidadComprobante,
} from "@/hooks/use-facturacion";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ConfirmarBajaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comprobanteId: string;
}

/* ------------------------------------------------------------------ */
/*  Component (gate + remount)                                         */
/* ------------------------------------------------------------------ */

export function ConfirmarBajaModal({
  open,
  onOpenChange,
  comprobanteId,
}: ConfirmarBajaModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <ConfirmarBajaModalContent
          key={comprobanteId}
          comprobanteId={comprobanteId}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Inner content                                                      */
/* ------------------------------------------------------------------ */

type Step = "form" | "review";

function ConfirmarBajaModalContent({
  comprobanteId,
  onClose,
}: {
  comprobanteId: string;
  onClose: () => void;
}) {
  const elegibilidadQ = useElegibilidadComprobante(comprobanteId, "baja", true);
  const elegibilidad = elegibilidadQ.data?.data ?? null;
  const anularM = useAnularComprobante();

  const [step, setStep] = useState<Step>("form");
  const [motivo, setMotivo] = useState("");
  const [confirmacionMarcada, setConfirmacionMarcada] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  // Cuenta regresiva en vivo (1s) si la elegibilidad trae plazoVenceAt
  useEffect(() => {
    if (!elegibilidad?.plazoVenceAt) return;
    const i = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(i);
  }, [elegibilidad?.plazoVenceAt]);

  const motivoTrimmed = motivo.trim();
  const motivoValido =
    motivoTrimmed.length >= 10 && motivoTrimmed.length <= 200;

  const remainingMs = elegibilidad?.plazoVenceAt
    ? new Date(elegibilidad.plazoVenceAt).getTime() - nowTs
    : null;
  const plazoVencido =
    remainingMs !== null && remainingMs < 0;

  const handleAnular = useCallback(() => {
    if (!motivoValido || !confirmacionMarcada || !elegibilidad?.puede) return;
    anularM.mutate(
      { id: comprobanteId, motivo: motivoTrimmed },
      {
        onSuccess: () => {
          toast.success("Comunicación de baja iniciada — se envió a SUNAT");
          onClose();
        },
        onError: (e) => {
          toast.error(
            e instanceof Error ? e.message : "Error al comunicar baja",
          );
        },
      },
    );
  }, [
    anularM,
    comprobanteId,
    confirmacionMarcada,
    elegibilidad,
    motivoTrimmed,
    motivoValido,
    onClose,
  ]);

  /* ----------------- Loading ----------------- */
  if (elegibilidadQ.isLoading) {
    return (
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Verificando elegibilidad…
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </DialogContent>
    );
  }

  /* ----------------- Error ----------------- */
  if (elegibilidadQ.isError || !elegibilidad) {
    return (
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            No se pudo verificar
          </DialogTitle>
          <DialogDescription>
            No se logró obtener la información de elegibilidad. Intenta nuevamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  /* ----------------- No elegible ----------------- */
  if (!elegibilidad.puede) {
    return (
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            No se puede comunicar la baja
          </DialogTitle>
          <DialogDescription>
            Las siguientes razones impiden generar la comunicación de baja para{" "}
            <span className="font-mono">{elegibilidad.numero}</span>.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          {elegibilidad.bloqueos.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-destructive"
            >
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <span>
                <strong>{b.codigo}</strong>: {b.mensaje}
              </span>
            </li>
          ))}
        </ul>

        {elegibilidad.bloqueoPorOperacionEnProceso && (
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
            Comunicación de baja en proceso:{" "}
            <span className="font-mono">
              {elegibilidad.bloqueoPorOperacionEnProceso.numero}
            </span>{" "}
            ({elegibilidad.bloqueoPorOperacionEnProceso.estado})
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  /* ----------------- Elegible — paso de revisión ----------------- */
  if (step === "review") {
    return (
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            Confirmar comunicación de baja
          </DialogTitle>
          <DialogDescription>
            Esta acción enviará un Resumen de Anulaciones (RA) a SUNAT y{" "}
            <strong className="text-destructive">no se puede revertir</strong>.
            Verifica los datos antes de continuar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
          <SummaryRow label="Comprobante" value={elegibilidad.numero} />
          <SummaryRow
            label="Tipo"
            value={String(elegibilidad.tipoOrigen).replace(/_/g, " ")}
          />
          <SummaryRow
            label="Total"
            value={`${elegibilidad.moneda} ${elegibilidad.totalOrigen.toFixed(2)}`}
          />
          <SummaryRow
            label="Emitido"
            value={new Date(elegibilidad.fechaEmision).toLocaleDateString(
              "es-PE",
            )}
          />
          {remainingMs !== null && !plazoVencido && (
            <SummaryRow
              label="Plazo restante"
              value={
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Clock className="size-3" />
                  {formatRemaining(remainingMs)}
                </span>
              }
            />
          )}
          <div className="pt-2 border-t border-border/40">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Motivo
            </div>
            <p className="text-sm">{motivoTrimmed}</p>
          </div>
        </div>

        <label className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm cursor-pointer">
          <Checkbox
            checked={confirmacionMarcada}
            onCheckedChange={(v) => setConfirmacionMarcada(v === true)}
            className="mt-0.5"
          />
          <span className="text-destructive">
            Confirmo que entiendo que esta comunicación de baja{" "}
            <strong>no podrá ser revertida</strong> y notificará a SUNAT.
          </span>
        </label>

        <DialogFooter className="flex-row justify-between">
          <Button
            variant="outline"
            onClick={() => setStep("form")}
            disabled={anularM.isPending}
            className="gap-1"
          >
            <ArrowLeft className="size-3.5" />
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={handleAnular}
            disabled={
              anularM.isPending || !confirmacionMarcada || plazoVencido
            }
            className="gap-1"
          >
            {anularM.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Ban className="size-3.5" />
            )}
            Comunicar baja a SUNAT
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  /* ----------------- Elegible — paso del formulario ----------------- */
  return (
    <DialogContent className="sm:max-w-lg rounded-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Ban className="size-5 text-destructive" />
          Comunicar baja a SUNAT
        </DialogTitle>
        <DialogDescription>
          Se enviará un Resumen de Anulaciones (RA) para{" "}
          <span className="font-mono">{elegibilidad.numero}</span>.
        </DialogDescription>
      </DialogHeader>

      {/* Resumen del comprobante */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Comprobante elegible
        </span>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {elegibilidad.moneda} {elegibilidad.totalOrigen.toFixed(2)}
        </Badge>
      </div>

      {/* Plazo */}
      {remainingMs !== null && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border p-2 text-xs",
            plazoVencido
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : remainingMs < 24 * 3600 * 1000
                ? "border-amber-300/70 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300"
                : "border-border/70 bg-muted/20 text-muted-foreground",
          )}
        >
          <Clock className="size-3.5" />
          {plazoVencido ? (
            <span>Plazo de comunicación de baja vencido.</span>
          ) : (
            <span>
              Plazo restante: <strong>{formatRemaining(remainingMs)}</strong>
              {elegibilidad.plazoVenceAt && (
                <>
                  {" "}
                  · vence{" "}
                  {new Date(elegibilidad.plazoVenceAt).toLocaleString("es-PE", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </span>
          )}
        </div>
      )}

      {/* Motivo input */}
      <div className="space-y-2">
        <Label htmlFor="motivo-baja">
          Motivo de la baja <span className="text-destructive">*</span>
        </Label>
        <Input
          id="motivo-baja"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Error en datos del cliente (RUC incorrecto)"
          minLength={10}
          maxLength={200}
          autoFocus
        />
        <p
          className={cn(
            "text-xs",
            motivoTrimmed.length > 0 && !motivoValido
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          Entre 10 y 200 caracteres ({motivoTrimmed.length}/200).
        </p>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={anularM.isPending}
        >
          Cancelar
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setConfirmacionMarcada(false);
            setStep("review");
          }}
          disabled={!motivoValido || plazoVencido}
        >
          Revisar y confirmar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function formatRemaining(ms: number): string {
  if (ms < 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
