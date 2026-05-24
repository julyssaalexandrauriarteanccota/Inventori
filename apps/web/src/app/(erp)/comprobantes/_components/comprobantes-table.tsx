"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, Printer } from "lucide-react";
import {
  EstadoComprobante,
  TipoDocumento,
  type ComprobanteListItem,
} from "@erp/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ThermalReceiptDialog,
  type ThermalReceiptData,
} from "@/components/pos/thermal-receipt";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import {
  useComprobante,
  useComprobantes,
  useConfigFiscal,
} from "@/hooks/use-facturacion";
import { usePublicBranding } from "@/hooks/use-public-branding";
import { useDebounce } from "@/hooks/use-debounce";

import {
  buildEmpresaPrintData,
  comprobanteToPrintData,
} from "./comprobante-print-utils";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ESTADO_TONE: Record<EstadoComprobante, string> = {
  [EstadoComprobante.PENDIENTE_ENVIO]:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  [EstadoComprobante.EN_PROCESO_SUNAT]: "bg-primary/10 text-primary",
  [EstadoComprobante.ACEPTADO]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  [EstadoComprobante.ACEPTADO_CON_OBSERVACIONES]:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  [EstadoComprobante.RECHAZADO]:
    "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  [EstadoComprobante.REQUIERE_REVISION]:
    "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  [EstadoComprobante.BAJA_PENDIENTE]:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  [EstadoComprobante.ANULADO]:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400",
};

const TIPO_LABEL: Record<TipoDocumento, string> = {
  [TipoDocumento.FACTURA]: "Factura",
  [TipoDocumento.BOLETA]: "Boleta",
  [TipoDocumento.NOTA_CREDITO]: "Nota de crédito",
  [TipoDocumento.NOTA_DEBITO]: "Nota de débito",
};

interface ComprobantesTableProps {
  tipo?: TipoDocumento;
  detailBaseHref?: string;
  storageKey?: string;
}

export function ComprobantesTable({
  tipo,
  detailBaseHref = "/comprobantes",
  storageKey,
}: ComprobantesTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const debounced = useDebounce(search, 300);

  // Print preview state
  const [printId, setPrintId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const query = useComprobantes({
    page,
    limit,
    search: debounced || undefined,
    tipo,
  });

  // Fetch full detail for the comprobante selected for printing
  const printDetailQuery = useComprobante(printId ?? undefined);
  const configFiscalQ = useConfigFiscal();
  const publicBrandingQ = usePublicBranding();

  const printData = useMemo<ThermalReceiptData | null>(() => {
    const detail = printDetailQuery.data?.data;
    if (!detail) return null;

    const configFiscal = configFiscalQ.data?.data ?? null;
    const empresaPublica = publicBrandingQ.data?.data ?? null;
    const empresa = buildEmpresaPrintData(
      configFiscal,
      empresaPublica,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (detail as any).snapshotEmisorJson,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return comprobanteToPrintData(detail as any, empresa, configFiscal?.pieImpresion ?? undefined);
  }, [printDetailQuery.data, configFiscalQ.data, publicBrandingQ.data]);

  const handlePrintClick = (id: string) => {
    setPrintId(id);
    setPrintOpen(true);
  };

  const columns = useMemo<ColumnDef<ComprobanteListItem>[]>(
    () => [
      {
        accessorKey: "numero",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Número
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Link
            href={`${detailBaseHref}/${row.original.id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            {row.original.numero}
          </Link>
        ),
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => TIPO_LABEL[row.original.tipo] ?? row.original.tipo,
      },
      {
        accessorKey: "fechaEmision",
        header: "Emisión",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.fechaEmision).toLocaleDateString("es-PE")}
          </span>
        ),
      },
      {
        id: "cliente",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.clienteNombre || "—"}</span>
            {row.original.clienteDocNum ? (
              <span className="font-mono text-[10px] text-muted-foreground">
                {row.original.clienteDocNum}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={`border-0 ${ESTADO_TONE[row.original.estado]}`}
          >
            {row.original.estado}
          </Badge>
        ),
      },
      {
        accessorKey: "total",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold tabular-nums text-primary">
            S/ {row.original.total.toFixed(2)}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Acciones</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => handlePrintClick(row.original.id)}
            >
              <Printer className="size-3.5" />
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1">
              <Link href={`${detailBaseHref}/${row.original.id}`}>
                <ExternalLink className="size-3.5" /> Ver
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [detailBaseHref],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por número, serie o cliente…"
          className="max-w-sm rounded-lg"
        />
      </div>
      <ServerDataTable
        columns={columns}
        data={query.data?.data ?? []}
        total={query.data?.meta?.total ?? 0}
        page={page}
        limit={limit}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage="No se pudieron cargar los comprobantes."
        onRetry={() => void query.refetch()}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        emptyMessage="Sin comprobantes"
        emptyDescription="No hay comprobantes que coincidan con el filtro."
        enableColumnVisibility
        columnVisibilityStorageKey={
          storageKey ?? `erp:comprobantes:${tipo ?? "all"}`
        }
      />

      <ThermalReceiptDialog
        open={printOpen}
        onOpenChange={(open) => {
          setPrintOpen(open);
          if (!open) setPrintId(null);
        }}
        data={printData}
        format="AMBOS"
      />
    </div>
  );
}
