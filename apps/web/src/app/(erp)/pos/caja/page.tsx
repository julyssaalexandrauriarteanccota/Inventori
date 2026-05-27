"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Lock,
  ShoppingCart,
  Wallet,
  Loader2,
  CheckCircle2,
  Download,
  RefreshCcw,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { StatCard } from "@/components/layout/stat-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { PageActionsMenu } from "@/components/layout/page-actions-menu";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ServerDataTable } from "@/components/tables/ServerDataTable";


import {
  useAbrirCaja,
  useCajas,
  useCerrarCaja,
  useMiAperturaActiva,
  useMovimientosApertura,
  useRegistrarMovimiento,
  useResumenApertura,
  type MovimientoCajaPayload,
  type MovimientoCaja,
} from "@/hooks/use-caja";
import { useMetodosPago } from "@/hooks/use-configuracion";

const fmt = (v: unknown) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(Number(v ?? 0));

const tipoLabel: Record<string, string> = {
  VENTA: "Venta",
  INGRESO: "Ingreso",
  EGRESO: "Egreso",
  RETIRO: "Retiro",
  DEPOSITO: "Depósito",
  DEVOLUCION: "Devolución",
  AJUSTE: "Ajuste",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CajaPage() {
  const apertura = useMiAperturaActiva();
  const aperturaId = apertura.data?.data?.id ?? null;

  if (apertura.isLoading) {
    return (
      <div className="space-y-3 w-full min-w-0 sm:flex-1 sm:min-h-0">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0 overflow-y-auto h-full pr-1">
      {/* Decorative backing glows for premium high-contrast dark mode aesthetic */}
      <div className="pointer-events-none absolute -z-10 bg-primary/5 blur-[120px] top-0 left-1/4 size-[400px] rounded-full dark:opacity-75" />
      <div className="pointer-events-none absolute -z-10 bg-violet-500/5 blur-[130px] bottom-1/4 right-1/4 size-[380px] rounded-full dark:opacity-50" />

      {aperturaId ? (
        <CajaActiva aperturaId={aperturaId} />
      ) : (
        <AbrirCajaPanel />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SIN APERTURA: panel para abrir
// ────────────────────────────────────────────────────────────────────────────
function AbrirCajaPanel() {
  const cajas = useCajas();
  const abrir = useAbrirCaja();
  const [cajaId, setCajaId] = useState<string>("");
  const [montoInicial, setMontoInicial] = useState<string>("0");
  const [notas, setNotas] = useState<string>("");

  const opciones = (cajas.data?.data ?? []).filter((c) => c.activa);

  const handleAbrir = async () => {
    if (!cajaId) {
      toast.error("Selecciona una caja");
      return;
    }
    const monto = Number(montoInicial);
    if (Number.isNaN(monto) || monto < 0) {
      toast.error("Monto inicial inválido");
      return;
    }
    try {
      await abrir.mutateAsync({
        cajaId,
        montoInicial: monto,
        notasApertura: notas.trim() || undefined,
      });
      toast.success("Caja abierta");
      setMontoInicial("0");
      setNotas("");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "No se pudo abrir la caja"));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <header className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Wallet className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Abrir caja</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Necesitas una caja abierta para cobrar ventas en POS.
          </p>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="caja" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caja registradora</Label>
          <Select value={cajaId} onValueChange={setCajaId}>
            <SelectTrigger id="caja" className="rounded-xl border-border/80 text-xs h-10">
              <SelectValue placeholder="Selecciona una caja" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {opciones.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No hay cajas activas configuradas.
                </div>
              ) : (
                opciones.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs rounded-lg">
                    {c.nombre}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="monto" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monto inicial (efectivo)</Label>
          <Input
            id="monto"
            type="number"
            min={0}
            step="0.01"
            value={montoInicial}
            onChange={(e) => setMontoInicial(e.target.value)}
            className="rounded-xl border-border/80 text-xs h-10 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notas" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas (opcional)</Label>
          <Textarea
            id="notas"
            placeholder="Observaciones de apertura..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            className="rounded-xl border-border/80 text-xs resize-none"
          />
        </div>

        <Button
          className="w-full rounded-xl h-10 text-xs font-medium erp-page-primary-cta transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] mt-2"
          onClick={handleAbrir}
          disabled={abrir.isPending || !cajaId}
        >
          {abrir.isPending ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" /> Abriendo…
            </>
          ) : (
            "Abrir caja"
          )}
        </Button>
      </div>
    </div>
  );
}

function buildMovimientoCsvRows(rows: MovimientoCaja[]) {
  const headers = [
    "Hora",
    "Tipo",
    "Concepto",
    "Método de Pago",
    "Monto",
  ];

  const lines = rows.map((m) =>
    [
      new Date(m.createdAt).toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tipoLabel[m.tipo] ?? m.tipo,
      m.concepto,
      m.metodoPago?.nombre ?? "—",
      m.monto,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

function CajaActiva({ aperturaId }: { aperturaId: string }) {
  const resumen = useResumenApertura(aperturaId);
  const movimientos = useMovimientosApertura(aperturaId);
  const cerrar = useCerrarCaja(aperturaId);
  const registrar = useRegistrarMovimiento(aperturaId);
  const metodos = useMetodosPago();

  const [movTipo, setMovTipo] =
    useState<MovimientoCajaPayload["tipo"]>("INGRESO");
  const [movMonto, setMovMonto] = useState("");
  const [movConcepto, setMovConcepto] = useState("");
  const [movMetodo, setMovMetodo] = useState<string>("");

  const [montoContado, setMontoContado] = useState("");
  const [notasCierre, setNotasCierre] = useState("");
  const [showCloseAlert, setShowCloseAlert] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectionMode, setSelectionMode] = useState(false);

  const data = resumen.data?.data;
  const movs = useMemo(() => movimientos.data?.data ?? [], [movimientos.data?.data]);
  const metodosPago = metodos.data?.data ?? [];

  const diferenciaActual = useMemo(() => {
    if (!data) return 0;
    const contado = Number(montoContado || 0);
    return contado - Number(data.montoEsperado);
  }, [data, montoContado]);

  const filteredMovs = useMemo(() => {
    if (!search.trim()) return movs;
    const q = search.toLowerCase().trim();
    return movs.filter(
      (m) =>
        m.concepto.toLowerCase().includes(q) ||
        (m.metodoPago?.nombre ?? "").toLowerCase().includes(q) ||
        (tipoLabel[m.tipo] ?? m.tipo).toLowerCase().includes(q)
    );
  }, [movs, search]);

  const paginatedMovs = useMemo(() => {
    return filteredMovs.slice((page - 1) * limit, page * limit);
  }, [filteredMovs, page, limit]);

  const handleManualRefresh = useCallback(() => {
    void Promise.all([resumen.refetch(), movimientos.refetch()]);
  }, [resumen, movimientos]);

  const handleExportCSV = useCallback(() => {
    const csv = buildMovimientoCsvRows(filteredMovs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "movimientos_caja.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredMovs.length} movimientos exportados`);
  }, [filteredMovs]);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns = useMemo<ColumnDef<MovimientoCaja>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Hora",
        cell: ({ row }) => (
          <span className="font-mono text-[10px] text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleTimeString("es-PE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[10px] h-5 rounded-md px-1.5 bg-muted/30">
            {tipoLabel[row.original.tipo] ?? row.original.tipo}
          </Badge>
        ),
      },
      {
        accessorKey: "concepto",
        header: "Concepto",
        cell: ({ row }) => (
          <span className="font-medium text-xs break-words whitespace-normal leading-normal max-w-sm block">
            {row.original.concepto}
          </span>
        ),
      },
      {
        id: "metodo",
        header: "Método",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.metodoPago?.nombre ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "monto",
        header: "Monto",
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-foreground whitespace-nowrap">
            {fmt(row.original.monto)}
          </span>
        ),
      },
    ],
    [],
  );

  const handleRegistrar = async () => {
    const monto = Number(movMonto);
    if (Number.isNaN(monto) || monto <= 0) {
      toast.error("Monto inválido");
      return;
    }
    if (!movConcepto.trim()) {
      toast.error("Concepto requerido");
      return;
    }
    try {
      await registrar.mutateAsync({
        tipo: movTipo,
        monto,
        concepto: movConcepto.trim(),
        metodoPagoId: movMetodo || undefined,
      });
      toast.success("Movimiento registrado");
      setMovMonto("");
      setMovConcepto("");
      setMovMetodo("");
      void Promise.all([resumen.refetch(), movimientos.refetch()]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "No se pudo registrar"));
    }
  };

  const handleCerrarClick = () => {
    const monto = Number(montoContado);
    if (Number.isNaN(monto) || monto < 0) {
      toast.error("Monto contado inválido");
      return;
    }
    setShowCloseAlert(true);
  };

  const handleConfirmCerrar = async () => {
    const monto = Number(montoContado);
    try {
      await cerrar.mutateAsync({
        montoContado: monto,
        notasCierre: notasCierre.trim() || undefined,
      });
      toast.success("Caja cerrada");
      setMontoContado("");
      setNotasCierre("");
      setShowCloseAlert(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "No se pudo cerrar la caja"));
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full min-w-0 py-4">
      <PageHeader
        title={`Caja: ${data.apertura.caja?.nombre ?? ""}`}
        hideTitleVisually={true}
        actionsClassName="w-full sm:w-auto"
        actions={
          <div className="flex items-center gap-2">
            <RealtimeStatus />
            <PageActionsMenu
              items={[
                {
                  label: "Actualizar lista",
                  icon: RefreshCcw,
                  onSelect: handleManualRefresh,
                },
                {
                  label: "Exportar CSV",
                  icon: Download,
                  onSelect: handleExportCSV,
                },
              ]}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] w-full min-w-0 items-start">
        {/* ── Columna principal ── */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Totales */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
            <StatCard
              label="Saldo esperado"
              value={fmt(data.montoEsperado)}
              icon={Calculator}
              color="bg-primary/10 text-primary border border-primary/20"
              index={0}
            />
            <StatCard
              label="Ventas"
              value={fmt(data.totales.ventas)}
              icon={ShoppingCart}
              color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              index={1}
            />
            <StatCard
              label="Otros ingresos"
              value={fmt(data.totales.ingresos)}
              icon={ArrowDownCircle}
              color="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
              index={2}
            />
            <StatCard
              label="Egresos / retiros"
              value={fmt(data.totales.egresos)}
              icon={ArrowUpCircle}
              color="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              index={3}
            />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <ToolbarSearchInput
                value={search}
                onChange={handleSearchChange}
                placeholder="Buscar por concepto o método..."
                className="w-full sm:w-80 lg:w-96"
                inputClassName="border-border/60 bg-background/40 hover:bg-muted/60"
              />
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <Button
                  variant={selectionMode ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 w-9 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-lg border-border/80 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                  onClick={() => setSelectionMode(!selectionMode)}
                >
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span className="hidden sm:inline">
                    {selectionMode ? "Cancelar" : "Seleccionar"}
                  </span>
                </Button>
              </div>
            </div>
          </div>

          {/* DataTable */}
          <ServerDataTable
            columns={columns}
            data={paginatedMovs}
            total={filteredMovs.length}
            page={page}
            limit={limit}
            isLoading={movimientos.isLoading}
            isError={movimientos.isError}
            errorMessage="No se pudo cargar la lista de movimientos."
            onRetry={() => void movimientos.refetch()}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            pageSizeOptions={[10, 20, 50, 100]}
            enableRowSelection={selectionMode}
            enableColumnVisibility
            columnVisibilityStorageKey="erp:pos-caja:table-columns"
            fillAvailableHeight={false}
            emptyMessage="Sin movimientos"
            emptyDescription="Aún no hay movimientos en este turno."
            bulkActionsBar={(selectedRows, clearSelection) => (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 rounded-xl text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                  title="Exportar"
                  onClick={() => {
                    const rows = selectedRows as MovimientoCaja[];
                    const csv = buildMovimientoCsvRows(rows);
                    const blob = new Blob([csv], {
                      type: "text/csv;charset=utf-8;",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "movimientos_seleccionados.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(`${rows.length} movimientos exportados`);
                    clearSelection();
                  }}
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </div>
            )}
          />
        </div>

        {/* ── Sidebar: ingresos manuales + cierre en Tabs ── */}
        <aside className="flex min-w-0 flex-col">
          <Tabs defaultValue="movimiento" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl border border-border/85 bg-muted/30 p-1">
              <TabsTrigger value="movimiento" className="rounded-lg text-xs py-1.5 transition-all duration-300">
                Movimiento
              </TabsTrigger>
              <TabsTrigger value="cierre" className="rounded-lg text-xs py-1.5 transition-all duration-300">
                Cerrar caja
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movimiento" className="outline-none">
              {/* Movimiento manual */}
              <section className="space-y-4 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5 shadow-sm">
                <h3 className="text-sm font-semibold tracking-tight">Registrar movimiento</h3>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</Label>
                  <Select
                    value={movTipo}
                    onValueChange={(v) =>
                      setMovTipo(v as MovimientoCajaPayload["tipo"])
                    }
                  >
                    <SelectTrigger className="rounded-xl border-border/80 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="INGRESO" className="text-xs rounded-lg">Ingreso (otros)</SelectItem>
                      <SelectItem value="EGRESO" className="text-xs rounded-lg">Egreso</SelectItem>
                      <SelectItem value="RETIRO" className="text-xs rounded-lg">Retiro</SelectItem>
                      <SelectItem value="DEPOSITO" className="text-xs rounded-lg">Depósito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monto</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={movMonto}
                    onChange={(e) => setMovMonto(e.target.value)}
                    className="rounded-xl border-border/80 text-xs h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Concepto</Label>
                  <Input
                    value={movConcepto}
                    onChange={(e) => setMovConcepto(e.target.value)}
                    placeholder="Ej. cambio para mostrador"
                    className="rounded-xl border-border/80 text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Método de pago (opcional)</Label>
                  <Select
                    value={movMetodo || "none"}
                    onValueChange={(v) => setMovMetodo(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="rounded-xl border-border/80 text-xs h-9">
                      <SelectValue placeholder="Sin método" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="text-xs rounded-lg">Sin método</SelectItem>
                      {metodosPago.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs rounded-lg">
                          {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full rounded-xl h-9 text-xs font-medium transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] mt-1"
                  onClick={handleRegistrar}
                  disabled={registrar.isPending}
                >
                  {registrar.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-3.5 animate-spin" /> Registrando…
                    </>
                  ) : (
                    "Registrar"
                  )}
                </Button>
              </section>
            </TabsContent>

            <TabsContent value="cierre" className="outline-none">
              {/* Cierre */}
              <section className="space-y-4 rounded-2xl border border-rose-500/20 dark:border-rose-500/30 bg-card/70 backdrop-blur-sm p-5 shadow-sm">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <Lock className="size-4" />
                  <h3 className="text-sm font-semibold tracking-tight">Cerrar caja</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cuenta el efectivo en caja y registra el cierre.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo esperado</Label>
                  <div className="rounded-xl border bg-muted/40 px-3 py-2 font-mono text-xs font-semibold text-foreground">
                    {fmt(data.montoEsperado)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monto contado</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={montoContado}
                    onChange={(e) => setMontoContado(e.target.value)}
                    className="rounded-xl border-border/80 text-xs h-9 font-mono"
                  />
                </div>
                {montoContado !== "" && (
                  <div
                    className={
                      "rounded-xl px-3 py-2 text-xs font-medium border " +
                      (Math.abs(diferenciaActual) < 0.01
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : diferenciaActual > 0
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20")
                    }
                  >
                    Diferencia:{" "}
                    <span className="font-mono font-semibold">
                      {diferenciaActual >= 0 ? "+" : ""}
                      {fmt(diferenciaActual)}
                    </span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas de cierre</Label>
                  <Textarea
                    rows={2}
                    value={notasCierre}
                    onChange={(e) => setNotasCierre(e.target.value)}
                    className="rounded-xl border-border/80 text-xs resize-none"
                  />
                </div>
                <Separator className="border-border/40" />
                <Button
                  variant="destructive"
                  className="w-full rounded-xl h-9 text-xs font-medium transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
                  onClick={handleCerrarClick}
                  disabled={cerrar.isPending || montoContado === ""}
                >
                  {cerrar.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-3.5 animate-spin" /> Cerrando…
                    </>
                  ) : (
                    "Cerrar caja"
                  )}
                </Button>
              </section>
            </TabsContent>
          </Tabs>
        </aside>

        <AlertDialog open={showCloseAlert} onOpenChange={setShowCloseAlert}>
          <AlertDialogContent className="rounded-2xl border-border/60">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Lock className="size-5" /> ¿Cerrar la caja?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-1">
                Esta acción dará por finalizado el turno actual y registrará el arqueo con una diferencia de{" "}
                <span className="font-mono font-semibold text-foreground bg-muted/40 px-1 py-0.5 rounded">
                  {diferenciaActual >= 0 ? "+" : ""}
                  {fmt(diferenciaActual)}
                </span>.
                Esta operación es irreversible. ¿Deseas continuar con el arqueo y cierre?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-3 gap-2">
              <AlertDialogCancel className="rounded-xl h-9 text-xs">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmCerrar}
                className="rounded-xl h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sí, cerrar caja
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
