"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import {
  EstadoComprobante,
  TipoDocumento,
  type ComprobanteListItem,
  type ElegibilidadComprobante,
  type PropositoElegibilidadComprobante,
} from "@erp/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useComprobantes,
  useElegibilidadComprobante,
} from "@/hooks/use-facturacion";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROPOSITO_CONFIG: Record<
  PropositoElegibilidadComprobante,
  { title: string; description: string; accent: string }
> = {
  nc: {
    title: "Buscar comprobante para Nota de crédito",
    description:
      "Selecciona el comprobante origen sobre el cual se emitirá la nota de crédito.",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  nd: {
    title: "Buscar comprobante para Nota de débito",
    description:
      "Selecciona el comprobante origen sobre el cual se emitirá la nota de débito.",
    accent: "text-rose-600 dark:text-rose-400",
  },
  baja: {
    title: "Buscar comprobante para comunicación de baja",
    description:
      "Selecciona el comprobante (factura) para comunicar la baja ante SUNAT.",
    accent: "text-slate-600 dark:text-slate-400",
  },
};

const TIPO_LABEL: Record<TipoDocumento, string> = {
  [TipoDocumento.FACTURA]: "Factura",
  [TipoDocumento.BOLETA]: "Boleta",
  [TipoDocumento.NOTA_CREDITO]: "NC",
  [TipoDocumento.NOTA_DEBITO]: "ND",
};

const ESTADO_TONE: Record<string, string> = {
  [EstadoComprobante.ACEPTADO]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  [EstadoComprobante.ACEPTADO_CON_OBSERVACIONES]:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
};

/* ------------------------------------------------------------------ */
/*  Types & Props                                                      */
/* ------------------------------------------------------------------ */

interface BuscarComprobanteOrigenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposito: PropositoElegibilidadComprobante;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BuscarComprobanteOrigenModal({
  open,
  onOpenChange,
  proposito,
}: BuscarComprobanteOrigenModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
       * Forzamos un remount completo cada vez que cambia `proposito` o se
       * abre el modal, así no necesitamos un useEffect para resetear filtros
       * (regla react-hooks/set-state-in-effect).
       */}
      {open ? (
        <BuscarComprobanteOrigenModalContent
          key={`${proposito}-${open}`}
          proposito={proposito}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

function BuscarComprobanteOrigenModalContent({
  proposito,
  onClose,
}: {
  proposito: PropositoElegibilidadComprobante;
  onClose: () => void;
}) {
  const router = useRouter();
  const config = PROPOSITO_CONFIG[proposito];

  // Filters
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Allowed tipo options per proposito — SUNAT rules:
  //  · NC origen: FACTURA o BOLETA (no se emite NC sobre otra NC/ND).
  //  · ND origen: FACTURA o BOLETA (no se emite ND sobre otra NC/ND).
  //  · Baja (RA): sólo FACTURA. Boletas se anulan con NC.
  const tipoOptions = useMemo<TipoDocumento[]>(() => {
    if (proposito === "baja") return [TipoDocumento.FACTURA];
    return [TipoDocumento.FACTURA, TipoDocumento.BOLETA];
  }, [proposito]);

  const [tipoFilter, setTipoFilter] = useState<TipoDocumento | "todos">(
    "todos",
  );

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Query comprobantes — siempre limita el listado a los tipos válidos según
  // propósito y a estados aceptados (con o sin observaciones), para evitar
  // mostrar candidatos no elegibles (NC sobre NC, anulados, en proceso, etc.).
  const tiposCsv =
    tipoFilter === "todos" ? tipoOptions.join(",") : undefined;
  const query = useComprobantes({
    page,
    limit: 8,
    search: debouncedSearch || undefined,
    estados: `${EstadoComprobante.ACEPTADO},${EstadoComprobante.ACEPTADO_CON_OBSERVACIONES}`,
    tipo: tipoFilter === "todos" ? undefined : tipoFilter,
    tipos: tiposCsv,
  });

  const comprobantes = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 8);

  // Elegibilidad for selected comprobante
  const elegibilidadQ = useElegibilidadComprobante(
    selectedId ?? undefined,
    proposito,
    !!selectedId,
  );
  const elegibilidad = elegibilidadQ.data?.data ?? null;
  const elegibilidadLoading = elegibilidadQ.isLoading && !!selectedId;

  const handleRowClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedId || !elegibilidad?.puede) return;
    if (proposito === "nc") {
      router.push(`/comprobantes/nueva-nc?origen=${selectedId}`);
    } else if (proposito === "nd") {
      router.push(`/comprobantes/nueva-nd?origen=${selectedId}`);
    } else {
      router.push(`/comprobantes/${selectedId}`);
    }
    onClose();
  }, [selectedId, elegibilidad, proposito, router, onClose]);

  return (
    <DialogContent
      className={cn(
        // Responsive: usa todo el viewport en móvil, hasta 4xl en desktop.
        // El cuerpo es flex-col con secciones scrollable internas.
        "w-[calc(100vw-1rem)] sm:max-w-2xl lg:max-w-4xl",
        "max-h-[calc(100dvh-2rem)] sm:max-h-[85vh]",
        "flex flex-col gap-3 p-0 overflow-hidden rounded-2xl",
      )}
    >
      {/* Header */}
      <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
        <DialogTitle className={cn("flex items-center gap-2", config.accent)}>
          <FileText className="size-5" />
          {config.title}
        </DialogTitle>
        <DialogDescription className="text-xs">
          {config.description}
        </DialogDescription>
      </DialogHeader>

      {/* Filters */}
      <div className="flex flex-col gap-2 px-5 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setSelectedId(null);
            }}
            placeholder="Buscar por número, serie o cliente…"
            className="pl-9 rounded-lg"
          />
        </div>
        {tipoOptions.length > 1 ? (
          <Select
            value={tipoFilter}
            onValueChange={(v) => {
              setTipoFilter(v as TipoDocumento | "todos");
              setPage(1);
              setSelectedId(null);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] rounded-lg">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {tipoOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge
            variant="outline"
            className="h-9 px-3 rounded-lg text-xs justify-center sm:w-[160px]"
          >
            {TIPO_LABEL[tipoOptions[0]]} (único tipo válido)
          </Badge>
        )}
      </div>

      {/* Table — scroll interno + flex-1 para llenar el espacio disponible */}
      <div className="flex-1 min-h-0 overflow-auto border-y border-border/60 mx-0">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="bg-muted/70 hover:bg-muted/70">
              <TableHead className="text-xs">Número</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Tipo</TableHead>
              <TableHead className="text-xs">Cliente</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Emisión</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : comprobantes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-10"
                >
                  {proposito === "baja" ? (
                    <>
                      No hay facturas aceptadas disponibles para baja.
                      <br />
                      <span className="text-xs">Boletas se anulan vía nota de crédito.</span>
                    </>
                  ) : (
                    <>
                      No hay facturas o boletas aceptadas para usar como origen.
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              comprobantes.map((c) => (
                <ComprobanteRow
                  key={c.id}
                  comprobante={c}
                  selected={selectedId === c.id}
                  onClick={() => handleRowClick(c.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: pagination + elegibility panel */}
      <div className="flex flex-col gap-2 px-5 pb-5">
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Pág. {page} de {totalPages} ({total} resultados)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => p - 1);
                  setSelectedId(null);
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => p + 1);
                  setSelectedId(null);
                }}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {selectedId && (
          <ElegibilidadPanel
            elegibilidad={elegibilidad}
            loading={elegibilidadLoading}
            error={elegibilidadQ.isError}
            proposito={proposito}
            onContinue={handleContinue}
          />
        )}
      </div>
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function ComprobanteRow({
  comprobante,
  selected,
  onClick,
}: {
  comprobante: ComprobanteListItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-colors",
        selected
          ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
          : "hover:bg-muted/40",
      )}
      onClick={onClick}
    >
      <TableCell className="font-mono text-xs">{comprobante.numero}</TableCell>
      <TableCell className="text-xs">
        {TIPO_LABEL[comprobante.tipo] ?? comprobante.tipo}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-xs truncate max-w-[180px]">
            {comprobante.clienteNombre || "—"}
          </span>
          {comprobante.clienteDocNum && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {comprobante.clienteDocNum}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(comprobante.fechaEmision).toLocaleDateString("es-PE")}
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums text-xs">
        S/ {comprobante.total.toFixed(2)}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            "border-0 text-[10px]",
            ESTADO_TONE[comprobante.estado] ?? "",
          )}
        >
          {comprobante.estado}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function ElegibilidadPanel({
  elegibilidad,
  loading,
  error,
  proposito,
  onContinue,
}: {
  elegibilidad: ElegibilidadComprobante | null;
  loading: boolean;
  error: boolean;
  proposito: PropositoElegibilidadComprobante;
  onContinue: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Verificando elegibilidad…
      </div>
    );
  }

  if (error || !elegibilidad) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="size-4" />
        No se pudo verificar la elegibilidad. Intente de nuevo.
      </div>
    );
  }

  const continueLabel =
    proposito === "nc"
      ? "Crear nota de crédito"
      : proposito === "nd"
        ? "Crear nota de débito"
        : "Ver comprobante";

  if (elegibilidad.puede) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          Comprobante elegible — {elegibilidad.numero}
        </div>

        {/* Saldo (only for NC) */}
        {proposito === "nc" &&
          elegibilidad.saldoNoAcreditado !== undefined && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>
                Total: S/{" "}
                <strong className="text-foreground">
                  {elegibilidad.totalOrigen.toFixed(2)}
                </strong>
              </span>
              <span>
                Acreditado: S/{" "}
                <strong>{(elegibilidad.acreditado ?? 0).toFixed(2)}</strong>
              </span>
              <span>
                Saldo disponible: S/{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {elegibilidad.saldoNoAcreditado.toFixed(2)}
                </strong>
              </span>
            </div>
          )}

        {/* Plazo (for baja) */}
        {proposito === "baja" && elegibilidad.plazoVenceAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Plazo vence:{" "}
            {new Date(elegibilidad.plazoVenceAt).toLocaleDateString("es-PE")}
          </div>
        )}

        {/* Motivos */}
        {elegibilidad.motivosAplicables.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {elegibilidad.motivosAplicables.slice(0, 5).map((m) => (
              <Badge
                key={m.codigo}
                variant="outline"
                className={cn(
                  "text-[10px]",
                  m.esExcepcional
                    ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                    : "",
                )}
              >
                {m.codigo} — {m.label}
              </Badge>
            ))}
            {elegibilidad.motivosAplicables.length > 5 && (
              <Badge variant="outline" className="text-[10px]">
                +{elegibilidad.motivosAplicables.length - 5} más
              </Badge>
            )}
          </div>
        )}

        <Button
          size="sm"
          className="ml-auto gap-1.5"
          onClick={onContinue}
        >
          {continueLabel}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    );
  }

  // Not eligible — show bloqueos
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
        <Ban className="size-4" />
        Comprobante no elegible — {elegibilidad.numero}
      </div>
      <ul className="space-y-1">
        {elegibilidad.bloqueos.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400"
          >
            <AlertCircle className="size-3 mt-0.5 shrink-0" />
            <span>
              <strong>{b.codigo}</strong>: {b.mensaje}
            </span>
          </li>
        ))}
      </ul>

      {elegibilidad.bloqueoPorOperacionEnProceso && (
        <div className="text-xs text-muted-foreground">
          Operación en proceso:{" "}
          <span className="font-mono">
            {elegibilidad.bloqueoPorOperacionEnProceso.numero}
          </span>{" "}
          ({elegibilidad.bloqueoPorOperacionEnProceso.estado})
        </div>
      )}
    </div>
  );
}
