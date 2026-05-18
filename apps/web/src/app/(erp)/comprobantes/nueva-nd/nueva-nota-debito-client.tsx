"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Info, Loader2, Send } from "lucide-react";
import { EstadoComprobante, MOTIVOS_ND, TipoDocumento } from "@erp/shared";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useComprobante, useCrearNotaDebito } from "@/hooks/use-facturacion";

interface NuevaNotaDebitoClientProps {
  origenId?: string;
  motivoCodigo: string;
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

export function NuevaNotaDebitoClient({
  origenId,
  motivoCodigo: motivoCodigoInicial,
}: NuevaNotaDebitoClientProps) {
  const router = useRouter();
  const detalleQuery = useComprobante(origenId);
  const crearNota = useCrearNotaDebito();
  const data = detalleQuery.data?.data as ComprobanteOrigenData | undefined;

  const [motivoCodigo, setMotivoCodigo] = useState(motivoCodigoInicial || "03");
  const [motivoDescripcion, setMotivoDescripcion] = useState("");
  const [montoStr, setMontoStr] = useState("");
  const [lineasEditadas, setLineasEditadas] = useState<NotaLineaForm[]>([]);
  const defaultLineas = useMemo(
    () =>
      data?.detallesFiscales?.map((detalle) => ({
        item: Number(detalle.item),
        descripcion: detalle.descripcion,
        cantidad: "1",
        precioUnitario: Number(detalle.precioUnitario ?? 0).toFixed(2),
        total: "0.00",
      })) ?? [],
    [data?.detallesFiscales],
  );
  const lineas = lineasEditadas.length > 0 ? lineasEditadas : defaultLineas;

  const motivoSeleccionado = MOTIVOS_ND.find((m) => m.codigo === motivoCodigo);
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
  const monto = lineas.length > 0 ? totalLineas : Number(montoStr || 0);
  const descripcionValida = motivoDescripcion.trim().length >= 10;

  // §7.1 — soportar documentos relacionados 01/03/07/08 como origen.
  const origenValido =
    !!data &&
    (data.tipo === TipoDocumento.FACTURA ||
      data.tipo === TipoDocumento.BOLETA ||
      data.tipo === TipoDocumento.NOTA_CREDITO ||
      data.tipo === TipoDocumento.NOTA_DEBITO);
  const estadoValido =
    !!data &&
    (data.estado === EstadoComprobante.ACEPTADO ||
      data.estado === EstadoComprobante.ACEPTADO_CON_OBSERVACIONES);

  const puedeEnviar =
    origenValido &&
    estadoValido &&
    monto > 0 &&
    (lineas.length === 0 || lineasPayload.length > 0) &&
    descripcionValida &&
    !crearNota.isPending;

  const handleSubmit = () => {
    if (!origenId || !puedeEnviar) return;
    crearNota.mutate(
      {
        comprobanteOrigenId: origenId,
        motivoCodigo,
        motivoDescripcion: motivoDescripcion.trim(),
        monto,
        lineas: lineasPayload.length > 0 ? lineasPayload : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Nota de débito encolada");
          router.push(`/comprobantes/${origenId}`);
        },
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "No se pudo crear la ND",
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
            <CardTitle>Nueva nota de débito</CardTitle>
            <CardDescription>
              Selecciona una factura o boleta aceptada para emitir la ND.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (detalleQuery.isLoading) {
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
          <CardTitle>Nota de débito electrónica</CardTitle>
          <CardDescription>
            Doc 08 §6 — La ND agrega cargos al comprobante origen (intereses,
            penalidades, ajustes). No anula nada.
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
              </div>

              {!origenValido ? (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                  <AlertTriangle className="mt-0.5 size-4" />
                  Sólo FACTURA, BOLETA, NC o ND admiten ND. Origen es{" "}
                  {data.tipo}.
                </div>
              ) : null}

              {!estadoValido ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4" />
                  El comprobante debe estar ACEPTADO por SUNAT. Estado actual:{" "}
                  {data.estado}.
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="motivo-codigo">Motivo SUNAT (Cat 10)</Label>
                <Select
                  value={motivoCodigo}
                  onValueChange={(v) => setMotivoCodigo(v)}
                >
                  <SelectTrigger id="motivo-codigo">
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Motivos Cat 10</SelectLabel>
                      {MOTIVOS_ND.map((m) => (
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto">Monto adicional (incluye IGV)</Label>
                <Input
                  id="monto"
                  inputMode="decimal"
                  value={lineas.length > 0 ? totalLineas.toFixed(2) : montoStr}
                  onChange={(e) => setMontoStr(e.target.value)}
                  readOnly={lineas.length > 0}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  La ND agrega cargos al origen — sin tope respecto al total.
                </p>
              </div>

              {lineas.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <Label>Líneas del cargo</Label>
                    <p className="text-xs text-muted-foreground">
                      Ingresa el total adicional por línea. Las líneas en cero
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
                  placeholder="Detalle del cargo adicional"
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
                  Emitir ND
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
