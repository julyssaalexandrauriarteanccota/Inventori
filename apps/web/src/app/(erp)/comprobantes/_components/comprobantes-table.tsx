"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  ExternalLink,
  FileMinus,
  FilePlus,
  FileText,
  Printer,
  Receipt,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  EstadoComprobante,
  TipoDocumento,
  type ComprobanteListItem,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErpBadge, type ErpBadgeTone } from "@/components/erp-badges";
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
import {
  buildEmpresaPrintData,
  comprobanteToPrintData,
} from "./comprobante-print-utils";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ESTADO_TONE: Record<EstadoComprobante, ErpBadgeTone> = {
  [EstadoComprobante.PENDIENTE_ENVIO]: "neutral",
  [EstadoComprobante.EN_PROCESO_SUNAT]: "info",
  [EstadoComprobante.ACEPTADO]: "success",
  [EstadoComprobante.ACEPTADO_CON_OBSERVACIONES]: "success",
  [EstadoComprobante.RECHAZADO]: "danger",
  [EstadoComprobante.REQUIERE_REVISION]: "danger",
  [EstadoComprobante.BAJA_PENDIENTE]: "warning",
  [EstadoComprobante.ANULADO]: "neutral",
};

const ESTADO_LABEL: Record<EstadoComprobante, string> = {
  [EstadoComprobante.PENDIENTE_ENVIO]: "Pendiente envío",
  [EstadoComprobante.EN_PROCESO_SUNAT]: "En proceso SUNAT",
  [EstadoComprobante.ACEPTADO]: "Aceptado",
  [EstadoComprobante.ACEPTADO_CON_OBSERVACIONES]: "Aceptado c/obs.",
  [EstadoComprobante.RECHAZADO]: "Rechazado",
  [EstadoComprobante.REQUIERE_REVISION]: "Requiere revisión",
  [EstadoComprobante.BAJA_PENDIENTE]: "Baja pendiente",
  [EstadoComprobante.ANULADO]: "Anulado",
};

const TIPO_LABEL: Record<TipoDocumento, string> = {
  [TipoDocumento.FACTURA]: "Factura",
  [TipoDocumento.BOLETA]: "Boleta",
  [TipoDocumento.NOTA_CREDITO]: "Nota de crédito",
  [TipoDocumento.NOTA_DEBITO]: "Nota de débito",
};

const TIPO_TONE: Record<TipoDocumento, ErpBadgeTone> = {
  [TipoDocumento.FACTURA]: "info",
  [TipoDocumento.BOLETA]: "violet",
  [TipoDocumento.NOTA_CREDITO]: "success",
  [TipoDocumento.NOTA_DEBITO]: "warning",
};

const TIPO_ICON: Record<TipoDocumento, LucideIcon> = {
  [TipoDocumento.FACTURA]: Receipt,
  [TipoDocumento.BOLETA]: ScrollText,
  [TipoDocumento.NOTA_CREDITO]: FilePlus,
  [TipoDocumento.NOTA_DEBITO]: FileMinus,
};

const TIPO_AVATAR_CLS: Record<TipoDocumento, string> = {
  [TipoDocumento.FACTURA]:
    "bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 dark:bg-indigo-600 dark:shadow-none",
  [TipoDocumento.BOLETA]:
    "bg-violet-500 text-white shadow-sm shadow-violet-500/30 dark:bg-violet-600 dark:shadow-none",
  [TipoDocumento.NOTA_CREDITO]:
    "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 dark:bg-emerald-600 dark:shadow-none",
  [TipoDocumento.NOTA_DEBITO]:
    "bg-amber-500 text-white shadow-sm shadow-amber-500/30 dark:bg-amber-600 dark:shadow-none",
};

interface ComprobantesTableProps {
  tipo?: TipoDocumento;
  detailBaseHref?: string;
  storageKey?: string;
  search?: string;
  fillAvailableHeight?: boolean;
}

export function ComprobantesTable({
  tipo,
  detailBaseHref = "/comprobantes",
  storageKey,
  search = "",
  fillAvailableHeight = true,
}: ComprobantesTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const debounced = search;

  useEffect(() => { setPage(1); }, [search]);

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
        cell: ({ row }) => {
          const tipo = row.original.tipo;
          const Icon = TIPO_ICON[tipo] ?? FileText;
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  TIPO_AVATAR_CLS[tipo],
                )}
                aria-hidden
              >
                <Icon className="size-3.5" />
              </span>
              <div className="flex flex-col min-w-0">
                <Link
                  href={`${detailBaseHref}/${row.original.id}`}
                  className="font-mono text-xs font-semibold text-foreground hover:text-[var(--accent)] hover:underline"
                >
                  {row.original.numero}
                </Link>
                <span className="text-[10px] text-muted-foreground">
                  {TIPO_LABEL[tipo] ?? tipo}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => (
          <ErpBadge tone={TIPO_TONE[row.original.tipo] ?? "neutral"}>
            {TIPO_LABEL[row.original.tipo] ?? row.original.tipo}
          </ErpBadge>
        ),
      },
      {
        accessorKey: "fechaEmision",
        header: "Emisión",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {new Date(row.original.fechaEmision).toLocaleDateString("es-PE")}
          </span>
        ),
      },
      {
        id: "cliente",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0">
            <span
              className="block max-w-64 sm:max-w-xs break-words whitespace-normal font-medium text-sm leading-snug text-foreground"
              title={row.original.clienteNombre || "—"}
            >
              {row.original.clienteNombre || "—"}
            </span>
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
          <ErpBadge tone={ESTADO_TONE[row.original.estado] ?? "neutral"}>
            {ESTADO_LABEL[row.original.estado] ?? row.original.estado}
          </ErpBadge>
        ),
      },
      {
        accessorKey: "total",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold tabular-nums text-foreground">
            S/ {row.original.total.toFixed(2)}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Acciones</div>,
        size: 120,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-lg"
              title="Imprimir"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handlePrintClick(row.original.id);
              }}
            >
              <Printer className="size-3.5" />
              <span className="sr-only">Imprimir comprobante</span>
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary"
            >
              <Link href={`${detailBaseHref}/${row.original.id}`}>
                <ExternalLink className="size-3.5" />
                Ver
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [detailBaseHref],
  );

  return (
    <>
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
        fillAvailableHeight={fillAvailableHeight}
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
    </>
  );
}
