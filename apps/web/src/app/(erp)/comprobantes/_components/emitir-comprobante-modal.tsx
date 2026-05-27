"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  EstadoFacturacionVenta,
  type ItemValidacion,
  type ResultadoValidacion,
  TipoDocumento,
  type VentaPendienteFacturacionItem,
} from "@erp/shared";

import {
  useEmitirComprobante,
  useSeriesDocumento,
  useValidarPreEmision,
} from "@/hooks/use-facturacion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ValidacionPreEmisionModal } from "@/components/modals/validacion-pre-emision-modal";
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
import { ApiError } from "@/lib/api";

interface EmitirComprobanteModalProps {
  venta: VentaPendienteFacturacionItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type ComprobanteCreado = {
  id?: string;
  numero?: string;
};

type ValidationErrorDetails = {
  bloqueantes?: ItemValidacion[];
  advertencias?: ItemValidacion[];
};

function inferDefaultTipo(venta: VentaPendienteFacturacionItem): TipoDocumento {
  return venta.cliente.ruc?.length === 11
    ? TipoDocumento.FACTURA
    : TipoDocumento.BOLETA;
}

function buildSeriePreview(serie: string, correlativoActual: number) {
  return `${serie}-${String(correlativoActual + 1).padStart(8, "0")}`;
}

function getValidationDetails(error: unknown): ResultadoValidacion | null {
  if (!(error instanceof ApiError)) return null;
  const details = error.details as ValidationErrorDetails | undefined;
  const bloqueantes = Array.isArray(details?.bloqueantes)
    ? details.bloqueantes
    : [];
  const advertencias = Array.isArray(details?.advertencias)
    ? details.advertencias
    : [];

  if (bloqueantes.length === 0 && advertencias.length === 0) return null;
  return { bloqueantes, advertencias };
}

export function EmitirComprobanteModal({
  venta,
  onClose,
  onSuccess,
}: EmitirComprobanteModalProps) {
  const router = useRouter();
  const emitir = useEmitirComprobante();
  const [serieOverride, setSerieOverride] = useState<{
    ventaId: string;
    tipo: TipoDocumento;
    id: string;
  } | null>(null);
  const [observacionesDraft, setObservacionesDraft] = useState<{
    ventaId: string;
    value: string;
  } | null>(null);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationModalResult, setValidationModalResult] =
    useState<ResultadoValidacion | null>(null);

  const tipo = venta ? inferDefaultTipo(venta) : TipoDocumento.BOLETA;
  const tipoLabel =
    tipo === TipoDocumento.FACTURA ? "Factura" : "Boleta";
  const tipoReason =
    tipo === TipoDocumento.FACTURA
      ? "Cliente con RUC"
      : venta?.cliente.dni
        ? "Cliente con DNI"
        : "Consumidor final";

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
  const preEmissionQuery = useValidarPreEmision(venta?.id, tipo, !!venta);
  const preEmissionResult = preEmissionQuery.data?.data ?? null;
  const fiscalBlockers = preEmissionResult?.bloqueantes ?? [];
  const fiscalWarnings = preEmissionResult?.advertencias ?? [];

  const validations = useMemo(() => {
    if (!venta) return [];
    return [
      {
        ok: venta.estadoFacturacion === EstadoFacturacionVenta.SIN_COMPROBANTE,
        text: "Venta sin comprobante previo",
      },
      ...(tipo === TipoDocumento.FACTURA
        ? [
            {
              ok: venta.cliente.ruc?.length === 11,
              text: "Factura con RUC valido",
            },
          ]
        : []),
      ...(tipo === TipoDocumento.BOLETA
        ? [
            {
              ok:
                venta.total <= 700 || !!venta.cliente.dni || !!venta.cliente.ruc,
              text: "Boleta mayor a S/ 700 con DNI o RUC registrado",
            },
          ]
        : []),
      {
        ok: !selectedSerie || selectedSerie.tipo === tipo,
        text: "Serie compatible con el tipo seleccionado",
      },
    ];
  }, [selectedSerie, tipo, venta]);

  const hasLocalBlockers = validations.some((item) => !item.ok);

  async function emit(confirmarAdvertencias = false) {
    if (!venta || hasLocalBlockers || fiscalBlockers.length > 0) return;
    try {
      const result = (await emitir.mutateAsync({
        ventaId: venta.id,
        tipo,
        serieDocumentoId,
        observaciones: observaciones.trim() || undefined,
        confirmarAdvertencias,
      })) as { data?: ComprobanteCreado } | ComprobanteCreado;
      const comprobante =
        (result as { data?: ComprobanteCreado }).data ??
        (result as ComprobanteCreado);

      toast.success("Comprobante encolado para envio a SUNAT");
      onSuccess?.();
      onClose();
      if (comprobante.id) router.push(`/comprobantes/${comprobante.id}`);
      setSerieOverride(null);
      setObservacionesDraft(null);
      setValidationModalOpen(false);
      setValidationModalResult(null);
    } catch (err) {
      const validationDetails = getValidationDetails(err);
      if (validationDetails) {
        setValidationModalResult(validationDetails);
        setValidationModalOpen(true);
      }
      const message =
        err instanceof Error ? err.message : "Error al emitir comprobante";
      toast.error(message);
    }
  }

  async function handleSubmit() {
    if (!venta) return;
    if (hasLocalBlockers || fiscalBlockers.length > 0) {
      setValidationModalResult(
        preEmissionResult ?? { bloqueantes: [], advertencias: [] },
      );
      setValidationModalOpen(true);
      return;
    }
    if (fiscalWarnings.length > 0) {
      setValidationModalResult(preEmissionResult);
      setValidationModalOpen(true);
      return;
    }
    await emit();
  }

  return (
    <>
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
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <span className="font-medium">{tipoLabel}</span>
              <Badge variant="secondary">{tipoReason}</Badge>
            </div>
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
            {preEmissionQuery.isFetching ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Validando reglas fiscales...</span>
              </div>
            ) : null}
            {fiscalBlockers.map((item) => (
              <div
                key={`bloq-${item.reglaId}`}
                className="flex items-center gap-2 text-xs text-destructive"
              >
                <AlertTriangle className="size-3.5" />
                <span>{item.mensaje}</span>
              </div>
            ))}
            {fiscalWarnings.map((item) => (
              <div
                key={`adv-${item.reglaId}`}
                className="flex items-center gap-2 text-xs text-amber-600"
              >
                <AlertTriangle className="size-3.5" />
                <span>{item.mensaje}</span>
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
            disabled={
              emitir.isPending ||
              preEmissionQuery.isFetching ||
              hasLocalBlockers
            }
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
      <ValidacionPreEmisionModal
        open={validationModalOpen}
        onOpenChangeAction={setValidationModalOpen}
        resultado={validationModalResult}
        onConfirmAction={() => void emit(true)}
        emitiendo={emitir.isPending}
      />
    </>
  );
}
