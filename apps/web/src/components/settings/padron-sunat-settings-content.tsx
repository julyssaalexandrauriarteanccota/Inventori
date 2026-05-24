"use client";

import { useMemo } from "react";
import {
  Activity,
  ArrowRight,
  XCircle,
  Database,
  Download,
  Loader2,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  useCancelPadronSunatRucImport,
  useImportPadronSunatRuc,
  usePadronSunatRucImportStatus,
} from "@/hooks/use-facturacion";
import { ClienteValidacionesSection } from "@/components/settings/fiscal-settings-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsStatCard } from "@/components/settings/settings-data-table";

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat("es-PE").format(value ?? 0);
}

function formatDuration(durationMs: number | null | undefined) {
  if (!durationMs) return "-";
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return minutes > 0 ? `${minutes} min ${rest} s` : `${seconds} s`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin sincronizar";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const stageOrder = [
  { value: "DOWNLOADING", label: "Descarga" },
  { value: "DECOMPRESSING", label: "ZIP" },
  { value: "CLEANING", label: "Staging" },
  { value: "IMPORTING", label: "Registros" },
  { value: "PUBLISHING", label: "Publicación" },
] as const;

export function PadronSunatSettingsContent() {
  const importMutation = useImportPadronSunatRuc();
  const cancelMutation = useCancelPadronSunatRucImport();
  const statusQuery = usePadronSunatRucImportStatus();
  const status = statusQuery.data?.data ?? importMutation.data?.data;
  const isRunning =
    status?.status === "RUNNING" ||
    status?.status === "CANCEL_REQUESTED" ||
    importMutation.isPending;
  const progress =
    status?.totalLines && status.totalLines > 0
      ? Math.min(100, Math.round((status.processed / status.totalLines) * 100))
      : status?.status === "SUCCESS"
        ? 100
        : 0;
  const isIndeterminateProgress =
    isRunning && (!status?.totalLines || status.totalLines <= 0);
  const activeStageIndex = stageOrder.findIndex(
    (stage) => stage.value === status?.stage,
  );

  const statusText = useMemo(() => {
    if (status?.message) {
      return status.message;
    }

    return "Listo para sincronizar cuando quieras actualizar la base local.";
  }, [status?.message]);

  const handleImport = () => {
    importMutation.mutate(undefined, {
      onSuccess: (response) => {
        statusQuery.refetch();
        toast.success(
          response.data.status === "RUNNING"
            ? "Sincronización del padrón iniciada"
            : `Padrón RUC sincronizado: ${formatNumber(response.data.inserted)} registros`,
        );
      },
      onError: (error: Error) => {
        toast.error(error.message || "No se pudo sincronizar el padrón RUC");
      },
    });
  };

  const handleCancel = () => {
    cancelMutation.mutate(undefined, {
      onSuccess: () => {
        statusQuery.refetch();
        toast.success("Cancelación solicitada. Se conservará el padrón publicado.");
      },
      onError: (error: Error) => {
        toast.error(error.message || "No se pudo cancelar la sincronización");
      },
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Database className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              Padrón SUNAT RUC
            </h2>
            <p className="max-w-3xl text-xs text-muted-foreground">
              Mantenimiento administrativo de la base local de contribuyentes.
              Clientes usa esta tabla primero para RUC y deja las APIs externas
              como respaldo.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              SUNAT local aplica solo a RUC. DNI siempre se consulta por API externa.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit rounded-lg">
          Solo ADMIN
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SettingsStatCard
          label="Origen"
          value="SUNAT local"
          tone={status?.status === "SUCCESS" ? "active" : "muted"}
        />
        <SettingsStatCard
          label={isRunning ? "Insertados ahora" : "Registros importados"}
          value={formatNumber(status?.currentRecords ?? status?.inserted)}
          tone={status?.currentRecords || status?.inserted ? "active" : "muted"}
        />
        <SettingsStatCard
          label="Ultima sincronizacion"
          value={formatDateTime(status?.importedAt)}
          tone={status?.importedAt ? "default" : "muted"}
        />
      </div>

      <Card className="rounded-2xl border-border/60 shadow-none">
        <CardHeader className="gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <RefreshCcw className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm">
                Sincronizar padrón reducido RUC
              </CardTitle>
              <CardDescription className="text-xs">
                Descarga el archivo oficial, conserva solo los campos útiles y
                reemplaza la tabla local para búsquedas rápidas desde Clientes.
              </CardDescription>
            </div>
          </div>
          <CardAction className="flex flex-wrap gap-2">
            {isRunning ? (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelMutation.isPending || status?.status === "CANCEL_REQUESTED"}
                className="rounded-xl"
              >
                <XCircle data-icon="inline-start" />
                {status?.status === "CANCEL_REQUESTED" ? "Cancelando..." : "Cancelar"}
              </Button>
            ) : null}
            <Button onClick={handleImport} disabled={isRunning} className="rounded-xl">
              {isRunning ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Download data-icon="inline-start" />
              )}
              {isRunning ? "Procesando..." : "Sincronizar"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {stageLabel(status?.stage)}
                </p>
                <p className="text-sm text-muted-foreground">{statusText}</p>
              </div>
              <Badge
                variant={status?.status === "ERROR" ? "destructive" : "outline"}
                className="w-fit rounded-lg"
              >
                {statusLabel(status?.status)}
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                {isIndeterminateProgress ? (
                  <div className="h-full w-1/3 rounded-full bg-primary/80 transition-all animate-pulse" />
                ) : (
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </div>
              {isRunning ? (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Activity className="size-3.5 animate-pulse text-primary" />
                  {stageOrder.map((stage, index) => (
                    <div key={stage.value} className="flex items-center gap-1.5">
                      <span
                        className={
                          index === activeStageIndex
                            ? "font-medium text-primary"
                            : index < activeStageIndex
                              ? "text-foreground"
                              : ""
                        }
                      >
                        {stage.label}
                      </span>
                      {index < stageOrder.length - 1 ? (
                        <ArrowRight className="size-3 text-muted-foreground/50" />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <span>
                  Avance: {isIndeterminateProgress ? "en curso" : `${progress}%`}
                </span>
                <span>Procesados: {formatNumber(status?.processed)}</span>
                <span>Insertados: {formatNumber(status?.inserted)}</span>
                <span>Descartados: {formatNumber(status?.discarded)}</span>
                <span>Total leído: {formatNumber(status?.totalLines ?? undefined)}</span>
              </div>
            </div>

            {status?.error ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {status.error}
              </p>
            ) : null}
            {status?.sourceUrl ? (
              <p className="truncate text-xs text-muted-foreground" title={status.sourceUrl}>
                Fuente: {status.sourceUrl}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
            <div className="rounded-xl border border-border/60 px-3 py-3">
              <p className="font-medium text-foreground">Publicación segura</p>
              <p className="mt-1">
                El backend carga primero en staging. Si el ZIP falla, viene vacío
                o se cancela, el padrón publicado no se reemplaza.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 px-3 py-3">
              <p className="font-medium text-foreground">Uso en Clientes</p>
              <p className="mt-1">
                RUC, razón social, estado, condición, ubigeo y dirección fiscal
                llegan al formulario cuando existan.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 px-3 py-3">
              <p className="font-medium text-foreground">Respaldo por API</p>
              <p className="mt-1">
                Si un RUC no está en local, el sistema puede consultar
                Decolecta/APISPERU según la configuración.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <p>
              Esta acción reemplaza la tabla local del padrón RUC. Es normal que
              tarde y consuma recursos mientras descarga, descomprime e inserta
              millones de registros.
            </p>
          </div>
        </CardContent>
      </Card>

      {status && status.status !== "IDLE" ? (
        <Card className="rounded-2xl border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-sm">Resultado reciente</CardTitle>
            <CardDescription className="text-xs">
              Resumen devuelto por el backend al terminar la última ejecución.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <SettingsStatCard
              label="Líneas procesadas"
              value={formatNumber(status.processed)}
            />
            <SettingsStatCard
              label="Insertadas"
              value={formatNumber(status.inserted)}
              tone="active"
            />
            <SettingsStatCard
              label="Descartadas"
              value={formatNumber(status.discarded)}
              tone={status.discarded ? "default" : "muted"}
            />
            <SettingsStatCard
              label="Duración"
              value={formatDuration(status.durationMs)}
            />
          </CardContent>
        </Card>
      ) : null}

      <ClienteValidacionesSection />
    </div>
  );
}

function statusLabel(status: string | undefined) {
  if (status === "RUNNING") return "En proceso";
  if (status === "CANCEL_REQUESTED") return "Cancelando";
  if (status === "CANCELLED") return "Cancelado";
  if (status === "SUCCESS") return "Completado";
  if (status === "ERROR") return "Error";
  return "Disponible";
}

function stageLabel(stage: string | undefined) {
  if (stage === "DOWNLOADING") return "Descargando";
  if (stage === "DECOMPRESSING") return "Descomprimiendo";
  if (stage === "CLEANING") return "Preparando tabla";
  if (stage === "IMPORTING") return "Importando registros";
  if (stage === "PUBLISHING") return "Publicando padrón";
  if (stage === "COMPLETED") return "Importación completa";
  if (stage === "CANCELLED") return "Importación cancelada";
  if (stage === "ERROR") return "Importación detenida";
  return "Sin proceso activo";
}
