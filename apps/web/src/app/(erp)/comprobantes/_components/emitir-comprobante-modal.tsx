"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  EstadoFacturacionVenta,
  TipoDocumento,
  type VentaPendienteFacturacionItem,
} from "@erp/shared";

import {
  useEmitirComprobante,
  useSeriesDocumento,
} from "@/hooks/use-facturacion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EmitirComprobanteModalProps {
  venta: VentaPendienteFacturacionItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type ComprobanteCreado = {
  id?: string;
  numero?: string;
};

function inferDefaultTipo(venta: VentaPendienteFacturacionItem): TipoDocumento {
  return venta.cliente.ruc?.length === 11
    ? TipoDocumento.FACTURA
    : TipoDocumento.BOLETA;
}

function buildSeriePreview(serie: string, correlativoActual: number) {
  return `${serie}-${String(correlativoActual + 1).padStart(8, "0")}`;
}

export function EmitirComprobanteModal({
  venta,
  onClose,
  onSuccess,
}: EmitirComprobanteModalProps) {
  const router = useRouter();
  const emitir = useEmitirComprobante();
  const [tipoOverride, setTipoOverride] = useState<{
    ventaId: string;
    tipo: TipoDocumento;
  } | null>(null);
  const [serieOverride, setSerieOverride] = useState<{
    ventaId: string;
    tipo: TipoDocumento;
    id: string;
  } | null>(null);
  const [observacionesDraft, setObservacionesDraft] = useState<{
    ventaId: string;
    value: string;
  } | null>(null);

  const tipo =
    venta && tipoOverride?.ventaId === venta.id
      ? tipoOverride.tipo
      : venta
        ? inferDefaultTipo(venta)
        : TipoDocumento.BOLETA;

  const seriesQuery = useSeriesDocumento({
    tipo,
    activo: true,
    limit: 100,
  });
  const series = useMemo(() => seriesQuery.data?.data ?? [], [seriesQuery.data]);
  const serieDocumentoId =
    venta &&
    serieOverride?.ventaId === venta.id &&
    serieOverride.tipo === tipo
      ? serieOverride.id
      : series[0]?.id;
  const selectedSerie = series.find((serie) => serie.id === serieDocumentoId);
  const observaciones =
    venta && observacionesDraft?.ventaId === venta.id
      ? observacionesDraft.value
      : "";

  const validations = useMemo(() => {
    if (!venta) return [];
    return [
      {
        ok: venta.estadoFacturacion === EstadoFacturacionVenta.SIN_COMPROBANTE,
        text: "Venta sin comprobante previo",
      },
      {
        ok: tipo !== TipoDocumento.FACTURA || venta.cliente.ruc?.length === 11,
        text: "Factura con RUC valido",
      },
      {
        ok:
          tipo !== TipoDocumento.BOLETA ||
          venta.total <= 700 ||
          !!venta.cliente.dni ||
          !!venta.cliente.ruc,
        text: "Boleta mayor a S/ 700 con cliente identificado",
      },
      {
        ok: !selectedSerie || selectedSerie.tipo === tipo,
        text: "Serie compatible con el tipo seleccionado",
      },
    ];
  }, [selectedSerie, tipo, venta]);

  const hasBlockers = validations.some((item) => !item.ok);

  async function handleSubmit() {
    if (!venta || hasBlockers) return;
    try {
      const result = (await emitir.mutateAsync({
        ventaId: venta.id,
        tipo,
        serieDocumentoId,
        observaciones: observaciones.trim() || undefined,
      })) as { data?: ComprobanteCreado } | ComprobanteCreado;
      const comprobante =
        (result as { data?: ComprobanteCreado }).data ??
        (result as ComprobanteCreado);

      toast.success("Comprobante encolado para envio a SUNAT");
      onSuccess?.();
      onClose();
      if (comprobante.id) router.push(`/comprobantes/${comprobante.id}`);
      setTipoOverride(null);
      setSerieOverride(null);
      setObservacionesDraft(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al emitir comprobante";
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={!!venta}
      onOpenChange={(open) => {
        if (!open && !emitir.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emitir comprobante</DialogTitle>
          <DialogDescription>
            {venta
              ? `Venta ${venta.numero} por S/ ${venta.total.toFixed(2)}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Tipo de comprobante</Label>
            <Select
              value={tipo}
              onValueChange={(value) => {
                if (!venta) return;
                setTipoOverride({
                  ventaId: venta.id,
                  tipo: value as TipoDocumento,
                });
                setSerieOverride(null);
              }}
              disabled={emitir.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TipoDocumento.FACTURA}>
                  Factura (RUC requerido)
                </SelectItem>
                <SelectItem value={TipoDocumento.BOLETA}>Boleta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium">Serie</Label>
            <Select
              value={serieDocumentoId}
              onValueChange={(value) => {
                if (!venta) return;
                setSerieOverride({ ventaId: venta.id, tipo, id: value });
              }}
              disabled={emitir.isPending || series.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    seriesQuery.isLoading ? "Cargando series" : "Serie legacy"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {series.map((serie) => (
                  <SelectItem key={serie.id} value={serie.id}>
                    {serie.serie} - sig.{" "}
                    {buildSeriePreview(serie.serie, serie.correlativoActual)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedSerie
                ? `Correlativo preview: ${buildSeriePreview(
                    selectedSerie.serie,
                    selectedSerie.correlativoActual,
                  )}`
                : "Sin serie activa nueva: el backend usara la configuracion legacy si existe."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium">Observaciones</Label>
            <Textarea
              value={observaciones}
              onChange={(event) => {
                if (!venta) return;
                setObservacionesDraft({
                  ventaId: venta.id,
                  value: event.target.value,
                });
              }}
              maxLength={500}
              placeholder="Texto opcional para el comprobante"
              disabled={emitir.isPending}
            />
          </div>

          <div className="grid gap-1 rounded-lg border border-border p-3">
            {validations.map((validation) => (
              <div
                key={validation.text}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                {validation.ok ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="size-3.5 text-amber-600" />
                )}
                <span>{validation.text}</span>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={emitir.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={emitir.isPending || hasBlockers}
          >
            {emitir.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Emitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
