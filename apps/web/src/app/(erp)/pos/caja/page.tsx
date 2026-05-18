"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Lock,
  ShoppingCart,
  Wallet,
} from "lucide-react";

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

import {
  useAbrirCaja,
  useCajas,
  useCerrarCaja,
  useMiAperturaActiva,
  useMovimientosApertura,
  useRegistrarMovimiento,
  useResumenApertura,
  type MovimientoCajaPayload,
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
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return aperturaId ? (
    <CajaActiva aperturaId={aperturaId} />
  ) : (
    <AbrirCajaPanel />
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
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Wallet className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Abrir caja</h1>
          <p className="text-sm text-muted-foreground">
            Necesitas una caja abierta para cobrar ventas en POS.
          </p>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-amber-500/25 bg-card p-5 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="caja">Caja registradora</Label>
          <Select value={cajaId} onValueChange={setCajaId}>
            <SelectTrigger id="caja">
              <SelectValue placeholder="Selecciona una caja" />
            </SelectTrigger>
            <SelectContent>
              {opciones.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No hay cajas activas configuradas.
                </div>
              ) : (
                opciones.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="monto">Monto inicial (efectivo)</Label>
          <Input
            id="monto"
            type="number"
            min={0}
            step="0.01"
            value={montoInicial}
            onChange={(e) => setMontoInicial(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Textarea
            id="notas"
            placeholder="Observaciones de apertura"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleAbrir}
          disabled={abrir.isPending || !cajaId}
        >
          {abrir.isPending ? "Abriendo…" : "Abrir caja"}
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CON APERTURA: resumen + movimientos + arqueo + cierre
// ────────────────────────────────────────────────────────────────────────────
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

  const data = resumen.data?.data;
  const movs = movimientos.data?.data ?? [];
  const metodosPago = metodos.data?.data ?? [];

  const diferenciaActual = useMemo(() => {
    if (!data) return 0;
    const contado = Number(montoContado || 0);
    return contado - Number(data.montoEsperado);
  }, [data, montoContado]);

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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "No se pudo registrar"));
    }
  };

  const handleCerrar = async () => {
    const monto = Number(montoContado);
    if (Number.isNaN(monto) || monto < 0) {
      toast.error("Monto contado inválido");
      return;
    }
    if (!confirm("¿Cerrar la caja? Esta acción no se puede deshacer.")) return;
    try {
      await cerrar.mutateAsync({
        montoContado: monto,
        notasCierre: notasCierre.trim() || undefined,
      });
      toast.success("Caja cerrada");
      setMontoContado("");
      setNotasCierre("");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "No se pudo cerrar la caja"));
    }
  };

  if (!data) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ── Columna principal ── */}
      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Caja {data.apertura.caja?.nombre ?? ""}
              </h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                Abierta
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Abierta{" "}
              {new Date(data.apertura.abiertaEn).toLocaleString("es-PE")} ·{" "}
              {data.apertura.usuarioApertura?.nombre}{" "}
              {data.apertura.usuarioApertura?.apellido}
            </p>
          </div>
        </header>

        {/* Totales */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Saldo esperado"
            value={fmt(data.montoEsperado)}
            icon={<Calculator className="size-4" />}
            tone="primary"
          />
          <KpiCard
            label="Ventas"
            value={fmt(data.totales.ventas)}
            icon={<ShoppingCart className="size-4" />}
            tone="emerald"
          />
          <KpiCard
            label="Otros ingresos"
            value={fmt(data.totales.ingresos)}
            icon={<ArrowDownCircle className="size-4" />}
            tone="sky"
          />
          <KpiCard
            label="Egresos / retiros"
            value={fmt(data.totales.egresos)}
            icon={<ArrowUpCircle className="size-4" />}
            tone="rose"
          />
        </div>

        {/* Movimientos */}
        <section className="flex min-w-0 flex-col gap-2 rounded-2xl border border-primary/15 bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Movimientos del turno</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Hora</th>
                  <th className="px-2 py-1.5 text-left font-medium">Tipo</th>
                  <th className="px-2 py-1.5 text-left font-medium">
                    Concepto
                  </th>
                  <th className="px-2 py-1.5 text-left font-medium">Método</th>
                  <th className="px-2 py-1.5 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-xs text-muted-foreground"
                    >
                      Aún no hay movimientos en este turno.
                    </td>
                  </tr>
                ) : (
                  movs.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t border-border/40 hover:bg-muted/30"
                    >
                      <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge variant="outline" className="font-mono text-xs">
                          {tipoLabel[m.tipo] ?? m.tipo}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5">{m.concepto}</td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">
                        {m.metodoPago?.nombre ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {fmt(m.monto)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Sidebar: ingresos manuales + cierre ── */}
      <aside className="flex min-w-0 flex-col gap-4">
        {/* Movimiento manual */}
        <section className="space-y-3 rounded-2xl border border-primary/15 bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Registrar movimiento</h3>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={movTipo}
              onValueChange={(v) =>
                setMovTipo(v as MovimientoCajaPayload["tipo"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INGRESO">Ingreso (otros)</SelectItem>
                <SelectItem value="EGRESO">Egreso</SelectItem>
                <SelectItem value="RETIRO">Retiro</SelectItem>
                <SelectItem value="DEPOSITO">Depósito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={movMonto}
              onChange={(e) => setMovMonto(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Concepto</Label>
            <Input
              value={movConcepto}
              onChange={(e) => setMovConcepto(e.target.value)}
              placeholder="Ej. cambio para mostrador"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Método de pago (opcional)</Label>
            <Select
              value={movMetodo || "none"}
              onValueChange={(v) => setMovMetodo(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin método</SelectItem>
                {metodosPago.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={handleRegistrar}
            disabled={registrar.isPending}
          >
            {registrar.isPending ? "Registrando…" : "Registrar"}
          </Button>
        </section>

        {/* Cierre */}
        <section className="space-y-3 rounded-2xl border border-rose-500/25 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-rose-600" />
            <h3 className="text-sm font-semibold">Cerrar caja</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Cuenta el efectivo en caja y registra el cierre.
          </p>
          <div className="space-y-1.5">
            <Label>Saldo esperado</Label>
            <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
              {fmt(data.montoEsperado)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Monto contado</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={montoContado}
              onChange={(e) => setMontoContado(e.target.value)}
            />
          </div>
          {montoContado !== "" && (
            <div
              className={
                "rounded-md px-3 py-2 text-sm " +
                (Math.abs(diferenciaActual) < 0.01
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : diferenciaActual > 0
                    ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300")
              }
            >
              Diferencia:{" "}
              <span className="font-mono">
                {diferenciaActual >= 0 ? "+" : ""}
                {fmt(diferenciaActual)}
              </span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notas de cierre</Label>
            <Textarea
              rows={2}
              value={notasCierre}
              onChange={(e) => setNotasCierre(e.target.value)}
            />
          </div>
          <Separator />
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleCerrar}
            disabled={cerrar.isPending || montoContado === ""}
          >
            {cerrar.isPending ? "Cerrando…" : "Cerrar caja"}
          </Button>
        </section>
      </aside>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "emerald" | "sky" | "rose";
}) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  }[tone];
  return (
    <div className="rounded-2xl border border-primary/15 bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={`grid size-7 place-items-center rounded-md ${toneCls}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
