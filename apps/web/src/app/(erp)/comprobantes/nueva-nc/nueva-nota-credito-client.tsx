"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Info, Loader2, Send } from "lucide-react";
import {
  EstadoComprobante,
  MOTIVOS_NC_EXCEPCIONAL,
  MOTIVOS_NC_REGULAR,
  TipoDocumento,
  esMotivoNcSoloFactura,
} from "@erp/shared";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useComprobante,
  useCrearNotaCredito,
  useSaldoNoAcreditado,
} from "@/hooks/use-facturacion";

interface NuevaNotaCreditoClientProps {
  origenId?: string;
  motivoCodigo: string;
  esExcepcionalInicial?: boolean;
  anulaTotalmenteInicial?: boolean;
}

interface ComprobanteOrigenData {
  id: string;
  numero: string;
  tipo: TipoDocumento;
  estado: EstadoComprobante;
  total: number;
  moneda?: string | null;
  clienteNombre?: string | null;
  clienteDocNum?: string | null;
  detallesFiscales?: Array<{
    item: number;
    descripcion: string;
    cantidad: number | string;
    precioUnitario: number | string;
    total: number | string;
  }>;
}

interface NotaLineaForm {
  item: number;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  total: string;
}

function fmtMoney(value: number, moneda = "PEN") {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: moneda,
  }).format(Number(value ?? 0));
}

const MOTIVO_NC_ANULACION_REGULAR = {
  codigo: "01",
  label: "Anulación de la operación",
  descripcionLarga:
    "Anulación regular del comprobante cuando corresponde emitir NC, no RA.",
  soloFactura: false,
};

export function NuevaNotaCreditoClient({
  origenId,
  motivoCodigo: motivoCodigoInicial,
  esExcepcionalInicial = false,
  anulaTotalmenteInicial = false,
}: NuevaNotaCreditoClientProps) {
  const router = useRouter();
  const detalleQuery = useComprobante(origenId);
  const saldoQuery = useSaldoNoAcreditado(origenId);
  const crearNota = useCrearNotaCredito();

  const data = detalleQuery.data?.data as ComprobanteOrigenData | undefined;
  const saldo = saldoQuery.data?.data;

  const [esExcepcional, setEsExcepcional] = useState(esExcepcionalInicial);
  const [motivoCodigo, setMotivoCodigo] = useState(motivoCodigoInicial || "01");
  const [motivoDescripcion, setMotivoDescripcion] = useState("");
  const [anulaTotalmente, setAnulaTotalmente] = useState(
    anulaTotalmenteInicial,
  );
  const [montoStr, setMontoStr] = useState("");
  const [lineasEditadas, setLineasEditadas] = useState<NotaLineaForm[]>([]);
  const defaultLineas = useMemo(
    () =>
      data?.detallesFiscales?.map((detalle) => ({
        item: Number(detalle.item),
        descripcion: detalle.descripcion,
        cantidad: String(Number(detalle.cantidad ?? 1)),
        precioUnitario: Number(detalle.precioUnitario ?? 0).toFixed(2),
        total: "0.00",
      })) ?? [],
    [data?.detallesFiscales],
  );
  const lineas = lineasEditadas.length > 0 ? lineasEditadas : defaultLineas;

  const motivos = useMemo(
    () =>
      esExcepcional
        ? MOTIVOS_NC_EXCEPCIONAL
        : [MOTIVO_NC_ANULACION_REGULAR, ...MOTIVOS_NC_REGULAR],
    [esExcepcional],
  );
  // Si el código guardado no aplica al modo actual, derivar el primero válido
  // sin pasar por useState+useEffect (evita cascading renders).
  const motivoCodigoEfectivo = motivos.some((m) => m.codigo === motivoCodigo)
    ? motivoCodigo
    : (motivos[0]?.codigo ?? "01");
  const motivoSeleccionado = motivos.find(
    (m) => m.codigo === motivoCodigoEfectivo,
  );

  // Si origen es BOLETA y motivo es soloFactura (04), bloquear silenciosamente.
  const motivoBloqueadoPorTipo =
    !!motivoSeleccionado &&
    !!motivoSeleccionado.soloFactura &&
    data?.tipo !== TipoDocumento.FACTURA;

  // Cuando "anula totalmente" está activo: el monto efectivo es el saldo
  // (derivado, no en state). Esto evita el effect que sincronizaba montoStr
  // y permite editarlo libremente cuando se desactiva.
  const lineasPayload = useMemo(
    () =>
      lineas
        .map((linea) => ({
          item: linea.item,
          descripcion: linea.descripcion.trim(),
          cantidad: Number(linea.cantidad || 0),
          precioUnitario: Number(linea.precioUnitario || 0),
          total: Number(linea.total || 0),
        }))
        .filter((linea) => linea.total > 0),
    [lineas],
  );
  const totalLineas = useMemo(
    () =>
      +lineasPayload
        .reduce((sum, linea) => sum + Number(linea.total || 0), 0)
        .toFixed(2),
    [lineasPayload],
  );

  const montoEfectivo = useMemo(() => {
    if (anulaTotalmente && saldo) return saldo.saldoNoAcreditado;
    if (lineas.length > 0) return totalLineas;
    return Number(montoStr || 0);
  }, [anulaTotalmente, saldo, lineas.length, totalLineas, montoStr]);

  // Cuando se activa anulaTotalmente, también forzamos motivo 01. Lo hacemos
  // en el handler del switch (no en effect).
  const handleAnulaTotalmente = (v: boolean) => {
    setAnulaTotalmente(v);
    if (v) setMotivoCodigo("01");
  };

  const monto = montoEfectivo;
  const descripcionValida = motivoDescripcion.trim().length >= 10;
  const montoValido =
    monto > 0 &&
    !!saldo &&
    monto <= saldo.saldoNoAcreditado + 0.005 &&
    (anulaTotalmente || lineas.length === 0 || lineasPayload.length > 0) &&
    (!anulaTotalmente ||
      Math.abs(monto - saldo.saldoNoAcreditado) <= 0.005);

  const puedeEnviar =
    !!data &&
    !!saldo &&
    saldo.puedeEmitirNc &&
    (!esExcepcional || !saldo.ncExcepcionalPlazoVencido) &&
    !motivoBloqueadoPorTipo &&
    descripcionValida &&
    montoValido &&
    !crearNota.isPending;

  const handleSubmit = () => {
    if (!origenId || !puedeEnviar) return;
    crearNota.mutate(
      {
        comprobanteOrigenId: origenId,
        motivoCodigo: motivoCodigoEfectivo,
        motivoDescripcion: motivoDescripcion.trim(),
        monto,
        esExcepcional,
        anulaTotalmente,
        lineas: anulaTotalmente ? undefined : lineasPayload,
      },
      {
        onSuccess: () => {
          toast.success(
            anulaTotalmente
              ? "NC de anulación total encolada"
              : "Nota de crédito encolada",
          );
          router.push(`/comprobantes/${origenId}`);
        },
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "No se pudo crear la nota",
          ),
      },
    );
  };

  if (!origenId) {
    return (
      <div className="max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/comprobantes">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Nueva nota de crédito</CardTitle>
            <CardDescription>
              Selecciona un comprobante aceptado para emitir la NC.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (detalleQuery.isLoading || saldoQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando comprobante...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="size-4" /> Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nota de crédito electrónica</CardTitle>
          <CardDescription>
            Doc 08 — Selecciona un motivo regular (Cat 09 03..13) o excepcional
            (01/02). El sistema valida saldo, plazo y origen ante SUNAT.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {detalleQuery.isError || !data ? (
            <p className="text-sm text-rose-600">
              No se pudo cargar el comprobante origen.
            </p>
          ) : (
            <>
              <div className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Comprobante</p>
                  <p className="font-mono text-sm">{data.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p>{data.clienteNombre ?? "-"}</p>
                  {data.clienteDocNum ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {data.clienteDocNum}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo / Estado</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{data.tipo}</Badge>
                    <Badge variant="secondary">{data.estado}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total origen</p>
                  <p className="font-semibold tabular-nums">
                    {fmtMoney(data.total, data.moneda ?? "PEN")}
                  </p>
                </div>
                {saldo ? (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Acreditado en NCs previas
                      </p>
                      <p className="tabular-nums">
                        {fmtMoney(saldo.acreditado, data.moneda ?? "PEN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Saldo no acreditado
                      </p>
                      <p
                        className={`font-semibold tabular-nums ${
                          saldo.saldoNoAcreditado <= 0
                            ? "text-rose-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {fmtMoney(
                          saldo.saldoNoAcreditado,
                          data.moneda ?? "PEN",
                        )}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              {saldo?.bloqueoPorNcEnProceso ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4" />
                  <div>
                    Existe otra NC{" "}
                    <span className="font-mono">
                      {saldo.bloqueoPorNcEnProceso.numero}
                    </span>{" "}
                    en estado{" "}
                    <span className="font-medium">
                      {saldo.bloqueoPorNcEnProceso.estado}
                    </span>
                    . Resuélvela antes de emitir otra.
                  </div>
                </div>
              ) : null}

              {saldo && !saldo.puedeEmitirNc && !saldo.bloqueoPorNcEnProceso ? (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                  <AlertTriangle className="mt-0.5 size-4" />
                  No se puede emitir NC sobre este comprobante (estado o saldo
                  insuficiente).
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Flujo excepcional</p>
                  <p className="text-xs text-muted-foreground">
                    Doc 08 §3 — sólo motivos 01/02, plazo 10 días hábiles
                    desde la emisión del origen.
                  </p>
                  {saldo?.ncExcepcionalPlazoVencido ? (
                    <p className="mt-1 text-xs text-rose-600">
                      Plazo vencido (excedió 10 días hábiles).
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={esExcepcional}
                  onCheckedChange={(v) => {
                    if (v && saldo?.ncExcepcionalPlazoVencido) return;
                    setEsExcepcional(v);
                    if (!v) setAnulaTotalmente(false);
                  }}
                  disabled={saldo?.ncExcepcionalPlazoVencido}
                  aria-label="Flujo excepcional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo-codigo">Motivo SUNAT (Cat 09)</Label>
                <Select
                  value={motivoCodigoEfectivo}
                  onValueChange={(v) => setMotivoCodigo(v)}
                >
                  <SelectTrigger id="motivo-codigo">
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>
                        {esExcepcional
                          ? "Motivos excepcionales"
                          : "Motivos regulares"}
                      </SelectLabel>
                      {motivos.map((m) => (
                        <SelectItem key={m.codigo} value={m.codigo}>
                          <span className="font-mono text-xs">{m.codigo}</span>
                          <span className="ml-2">{m.label}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {motivoSeleccionado ? (
                  <p className="flex items-start gap-1 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3" />
                    {motivoSeleccionado.descripcionLarga}
                  </p>
                ) : null}
                {motivoBloqueadoPorTipo ? (
                  <p className="text-xs text-rose-600">
                    El motivo {motivoCodigoEfectivo} sólo aplica a facturas.
                    Origen es {data.tipo}.
                  </p>
                ) : null}
                {esMotivoNcSoloFactura(motivoCodigoEfectivo) &&
                data.tipo === TipoDocumento.FACTURA ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Motivo restringido a facturas — origen es factura, OK.
                  </p>
                ) : null}
              </div>

              {motivoCodigoEfectivo === "01" ? (
                <div className="flex items-center justify-between rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <div>
                    <p className="text-sm font-medium">Anula totalmente</p>
                    <p className="text-xs text-muted-foreground">
                      Bloquea el monto al saldo no acreditado exacto.
                    </p>
                  </div>
                  <Switch
                    checked={anulaTotalmente}
                    onCheckedChange={handleAnulaTotalmente}
                    aria-label="Anula totalmente"
                  />
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto a acreditar</Label>
                  <Input
                    id="monto"
                    inputMode="decimal"
                    value={
                      anulaTotalmente && saldo
                        ? saldo.saldoNoAcreditado.toFixed(2)
                        : lineas.length > 0
                          ? totalLineas.toFixed(2)
                        : montoStr
                    }
                    onChange={(e) => setMontoStr(e.target.value)}
                    readOnly={anulaTotalmente || lineas.length > 0}
                    placeholder="0.00"
                  />
                  {saldo ? (
                    <p className="text-xs text-muted-foreground">
                      Máximo:{" "}
                      <span className="font-mono">
                        {saldo.saldoNoAcreditado.toFixed(2)}
                      </span>
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Plazo</Label>
                  <Input
                    value={
                      esExcepcional ? "10 días hábiles" : "Plazo del origen"
                    }
                    readOnly
                  />
                </div>
              </div>

              {!anulaTotalmente && lineas.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <Label>Líneas a acreditar</Label>
                    <p className="text-xs text-muted-foreground">
                      Ingresa el total a acreditar por línea. Las líneas en cero
                      no se enviarán.
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ítem</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-28 text-right">Cant.</TableHead>
                        <TableHead className="w-32 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineas.map((linea, index) => (
                        <TableRow key={linea.item}>
                          <TableCell className="font-mono text-xs">
                            {linea.item}
                          </TableCell>
                          <TableCell className="min-w-56 whitespace-normal">
                            {linea.descripcion}
                          </TableCell>
                          <TableCell>
                            <Input
                              inputMode="decimal"
                              value={linea.cantidad}
                              onChange={(event) => {
                                const next = [...lineas];
                                next[index] = {
                                  ...linea,
                                  cantidad: event.target.value,
                                };
                                setLineasEditadas(next);
                              }}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              inputMode="decimal"
                              value={linea.total}
                              onChange={(event) => {
                                const next = [...lineas];
                                next[index] = {
                                  ...linea,
                                  total: event.target.value,
                                };
                                setLineasEditadas(next);
                              }}
                              className="text-right"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="descripcion">
                  Descripción del motivo (mín. 10 caracteres)
                </Label>
                <Textarea
                  id="descripcion"
                  value={motivoDescripcion}
                  onChange={(e) => setMotivoDescripcion(e.target.value)}
                  placeholder="Detalle del por qué se emite esta NC"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {motivoDescripcion.trim().length}/10 caracteres mínimo
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/comprobantes/${origenId}`)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={!puedeEnviar}
                  onClick={handleSubmit}
                >
                  {crearNota.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Emitir NC
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
