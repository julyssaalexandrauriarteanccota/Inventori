"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { EstadoComunicacionBaja } from "@erp/shared";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ErpBadge, type ErpBadgeTone } from "@/components/erp-badges";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import {
  useComunicacionesBaja,
  useConsultarEstadoBaja,
  type ComunicacionBajaListItem,
} from "@/hooks/use-facturacion";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ESTADO_TONE: Record<EstadoComunicacionBaja, ErpBadgeTone> = {
  [EstadoComunicacionBaja.PENDIENTE]: "neutral",
  [EstadoComunicacionBaja.EN_PROCESO]: "info",
  [EstadoComunicacionBaja.ACEPTADA]: "success",
  [EstadoComunicacionBaja.RECHAZADA]: "danger",
};

const ESTADO_LABEL: Record<EstadoComunicacionBaja, string> = {
  [EstadoComunicacionBaja.PENDIENTE]: "Pendiente",
  [EstadoComunicacionBaja.EN_PROCESO]: "En proceso",
  [EstadoComunicacionBaja.ACEPTADA]: "Aceptada",
  [EstadoComunicacionBaja.RECHAZADA]: "Rechazada",
};

export function ComunicacionesBajaTable({ search = "", fillAvailableHeight = true }: { search?: string; fillAvailableHeight?: boolean }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => { setPage(1); }, [search]);

  const query = useComunicacionesBaja({
    page,
    limit,
    search: search || undefined,
  });

  const consultar = useConsultarEstadoBaja();
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const columns = useMemo<ColumnDef<ComunicacionBajaListItem>[]>(
    () => [
      {
        accessorKey: "identificadorBaja",
        header: "Identificador",
        cell: ({ row }) => (
          <Link
            href={`/comprobantes/bajas/${row.original.id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            {row.original.identificadorBaja}
          </Link>
        ),
      },
      {
        id: "comprobante",
        header: "Comprobante",
        cell: ({ row }) => {
          const c = row.original.comprobante;
          if (!c) return <span className="text-muted-foreground">—</span>;
          return (
            <Link
              href={`/comprobantes/${c.id}`}
              className="font-mono text-xs text-primary hover:underline"
            >
              {c.numero}
            </Link>
          );
        },
      },
      {
        id: "cliente",
        header: "Cliente",
        cell: ({ row }) => {
          const c = row.original.comprobante;
          return (
            <div className="flex flex-col">
              <span>{c?.clienteNombre || "—"}</span>
              {c?.clienteDocNum ? (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {c.clienteDocNum}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const estado = row.original.estado as EstadoComunicacionBaja;
          return (
            <ErpBadge tone={ESTADO_TONE[estado] ?? "neutral"}>
              {ESTADO_LABEL[estado] ?? row.original.estado}
            </ErpBadge>
          );
        },
      },
      {
        accessorKey: "deadline",
        header: "Plazo",
        cell: ({ row }) =>
          row.original.deadline ? (
            <span className="text-xs text-muted-foreground">
              {new Date(row.original.deadline).toLocaleDateString("es-PE")}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Iniciada",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString("es-PE")}
          </span>
        ),
      },
      {
        accessorKey: "ticketSunat",
        header: "Ticket SUNAT",
        cell: ({ row }) =>
          row.original.ticketSunat ? (
            <span className="font-mono text-[10px]">{row.original.ticketSunat}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => {
          const r = row.original;
          const enProceso =
            r.estado === EstadoComunicacionBaja.PENDIENTE ||
            r.estado === EstadoComunicacionBaja.EN_PROCESO;
          const aceptada = r.estado === EstadoComunicacionBaja.ACEPTADA;
          return (
            <div className="flex items-center gap-1">
              {enProceso && r.ticketSunat ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  disabled={consultar.isPending}
                  onClick={() => {
                    consultar.mutate(r.id, {
                      onSuccess: () =>
                        toast.success("Consulta a SUNAT enviada"),
                      onError: (e) =>
                        toast.error(
                          e instanceof Error ? e.message : "Error al consultar",
                        ),
                    });
                  }}
                  title="Consultar estado en SUNAT"
                >
                  {consultar.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                </Button>
              ) : null}
              <a
                href={`${apiBase}/facturacion/comunicaciones-baja/${r.id}/xml`}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-accent"
                title="Descargar XML"
              >
                <Download className="size-3.5" /> XML
              </a>
              {aceptada ? (
                <a
                  href={`${apiBase}/facturacion/comunicaciones-baja/${r.id}/cdr`}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-accent"
                  title="Descargar CDR"
                >
                  <Download className="size-3.5" /> CDR
                </a>
              ) : null}
            </div>
          );
        },
      },
    ],
    [apiBase, consultar],
  );

  return (
    <ServerDataTable
      columns={columns}
      data={query.data?.data ?? []}
      total={query.data?.meta?.total ?? 0}
      page={page}
      limit={limit}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage="No se pudieron cargar las comunicaciones de baja."
      onRetry={() => void query.refetch()}
      onPageChange={setPage}
      onLimitChange={(l) => {
        setLimit(l);
        setPage(1);
      }}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      emptyMessage="Sin comunicaciones de baja"
      emptyDescription="Aún no se han generado comunicaciones RA."
      enableColumnVisibility
      columnVisibilityStorageKey="erp:comprobantes:bajas"
      fillAvailableHeight={fillAvailableHeight}
    />
  );
}
