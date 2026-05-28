"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Send } from "lucide-react";
import {
  EstadoFacturacionVenta,
  EstadoVenta,
  type VentaPendienteFacturacionItem,
} from "@erp/shared";

import { Button } from "@/components/ui/button";
import { ErpBadge } from "@/components/erp-badges";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { useVentasPendientesFacturacion } from "@/hooks/use-facturacion";

import { EmitirComprobanteModal } from "./emitir-comprobante-modal";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ESTADO_LABELS: Partial<Record<EstadoVenta, string>> = {
  [EstadoVenta.ORDEN_CONFIRMADA]: "Orden confirmada",
  [EstadoVenta.ENTREGADA]: "Entregada",
};

const FACTURACION_LABELS: Record<EstadoFacturacionVenta, string> = {
  [EstadoFacturacionVenta.SIN_COMPROBANTE]: "Sin comprobante",
  [EstadoFacturacionVenta.VENTA_INTERNA]: "Venta interna",
  [EstadoFacturacionVenta.EN_EMISION]: "En emisión",
  [EstadoFacturacionVenta.EMITIDA]: "Emitida",
  [EstadoFacturacionVenta.EMITIDA_CON_OBS]: "Emitida c/ obs.",
  [EstadoFacturacionVenta.RECHAZADA]: "Rechazada",
  [EstadoFacturacionVenta.ANULADA_FISCAL]: "Anulada fiscal",
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PorEmitirTable({ search = "", fillAvailableHeight = true }: { search?: string; fillAvailableHeight?: boolean }) {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedVenta, setSelectedVenta] =
    useState<VentaPendienteFacturacionItem | null>(null);
  const [dismissedVentaId, setDismissedVentaId] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [search]);

  const query = useVentasPendientesFacturacion({
    page,
    limit,
    search: search || undefined,
  });

  const queryVentaId = searchParams.get("ventaId");
  const ventaFromQuery =
    queryVentaId && queryVentaId !== dismissedVentaId
      ? query.data?.data.find((item) => item.id === queryVentaId) ?? null
      : null;
  const modalVenta = selectedVenta ?? ventaFromQuery;

  const columns = useMemo<ColumnDef<VentaPendienteFacturacionItem>[]>(
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
            Venta
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Link
            href={`/ventas/${row.original.id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            {row.original.numero}
          </Link>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "cliente",
        header: "Cliente",
        cell: ({ row }) => {
          const cliente = row.original.cliente;
          const nombre =
            cliente.razonSocial ??
            [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ??
            "Cliente";
          const doc = cliente.ruc ?? cliente.dni;
          return (
            <div className="flex flex-col">
              <span>{nombre}</span>
              {doc ? (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {doc}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "facturacion",
        header: "Facturación",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <ErpBadge tone="info">
              {ESTADO_LABELS[row.original.estado] ?? row.original.estado}
            </ErpBadge>
            <ErpBadge tone="warning">
              {FACTURACION_LABELS[row.original.estadoFacturacion] ??
                row.original.estadoFacturacion}
            </ErpBadge>
          </div>
        ),
      },
      {
        id: "vendedor",
        header: "Vendedor",
        cell: ({ row }) => {
          const usuario = row.original.usuario;
          if (!usuario) return <span className="text-muted-foreground/50 text-xs">—</span>;
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {[usuario.nombre, usuario.apellido].filter(Boolean).join(" ")}
            </span>
          );
        },
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
        header: () => <div className="text-right">Acción</div>,
        size: 120,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-3 text-xs"
              onClick={() => setSelectedVenta(row.original)}
            >
              <Send className="size-3.5" /> Emitir
            </Button>
          </div>
        ),
      },
    ],
    [],
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
        errorMessage="No se pudieron cargar las ventas pendientes."
        onRetry={() => void query.refetch()}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        emptyMessage="Sin ventas por emitir"
        emptyDescription="No hay ventas confirmadas o entregadas pendientes de comprobante."
        enableColumnVisibility
        columnVisibilityStorageKey="erp:comprobantes:por-emitir"
        fillAvailableHeight={fillAvailableHeight}
      />

      <EmitirComprobanteModal
        venta={modalVenta}
        onClose={() => {
          setSelectedVenta(null);
          if (queryVentaId) setDismissedVentaId(queryVentaId);
        }}
        onSuccess={() => void query.refetch()}
      />
    </>
  );
}
