"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, FilterX, Send } from "lucide-react";
import {
  EstadoFacturacionVenta,
  EstadoVenta,
  type VentaPendienteFacturacionItem,
} from "@erp/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { useVentasPendientesFacturacion } from "@/hooks/use-facturacion";
import { useDebounce } from "@/hooks/use-debounce";

import { EmitirComprobanteModal } from "./emitir-comprobante-modal";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const ALL_VALUE = "__all__";

const ESTADO_LABELS: Partial<Record<EstadoVenta, string>> = {
  [EstadoVenta.ORDEN_CONFIRMADA]: "Orden confirmada",
  [EstadoVenta.ENTREGADA]: "Entregada",
};

const FACTURACION_LABELS: Record<EstadoFacturacionVenta, string> = {
  [EstadoFacturacionVenta.SIN_COMPROBANTE]: "Sin comprobante",
  [EstadoFacturacionVenta.VENTA_INTERNA]: "Venta interna",
  [EstadoFacturacionVenta.EN_EMISION]: "En emision",
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

export function PorEmitirTable() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [totalMin, setTotalMin] = useState("");
  const [totalMax, setTotalMax] = useState("");
  const [estadoComercial, setEstadoComercial] = useState<
    EstadoVenta | undefined
  >();
  const [vendedor, setVendedor] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedVenta, setSelectedVenta] =
    useState<VentaPendienteFacturacionItem | null>(null);
  const [dismissedVentaId, setDismissedVentaId] = useState<string | null>(null);

  const debounced = useDebounce(search, 300);
  const query = useVentasPendientesFacturacion({
    page,
    limit,
    search: debounced || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    totalMin: totalMin || undefined,
    totalMax: totalMax || undefined,
    estadoComercial,
    vendedor: vendedor || undefined,
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
        accessorKey: "estado",
        header: "Estados",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="border-primary/20 text-primary">
              {ESTADO_LABELS[row.original.estado] ?? row.original.estado}
            </Badge>
            <Badge variant="secondary">
              {FACTURACION_LABELS[row.original.estadoFacturacion] ??
                row.original.estadoFacturacion}
            </Badge>
          </div>
        ),
      },
      {
        id: "vendedor",
        header: "Vendedor",
        cell: ({ row }) => {
          const usuario = row.original.usuario;
          if (!usuario) return <span className="text-muted-foreground">-</span>;
          return (
            <span className="text-sm">
              {[usuario.nombre, usuario.apellido].filter(Boolean).join(" ")}
            </span>
          );
        },
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
        header: () => <div className="text-right">Accion</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 gap-1"
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

  function clearFilters() {
    setSearch("");
    setFechaDesde("");
    setFechaHasta("");
    setTotalMin("");
    setTotalMax("");
    setEstadoComercial(undefined);
    setVendedor("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(2,minmax(140px,0.8fr))_repeat(2,minmax(110px,0.65fr))_minmax(170px,1fr)_minmax(160px,1fr)_auto]">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por venta o cliente..."
          className="rounded-lg"
        />
        <Input
          type="date"
          value={fechaDesde}
          onChange={(e) => {
            setFechaDesde(e.target.value);
            setPage(1);
          }}
          className="rounded-lg"
        />
        <Input
          type="date"
          value={fechaHasta}
          onChange={(e) => {
            setFechaHasta(e.target.value);
            setPage(1);
          }}
          className="rounded-lg"
        />
        <Input
          value={totalMin}
          onChange={(e) => {
            setTotalMin(e.target.value);
            setPage(1);
          }}
          inputMode="decimal"
          placeholder="Min."
          className="rounded-lg"
        />
        <Input
          value={totalMax}
          onChange={(e) => {
            setTotalMax(e.target.value);
            setPage(1);
          }}
          inputMode="decimal"
          placeholder="Max."
          className="rounded-lg"
        />
        <Select
          value={estadoComercial ?? ALL_VALUE}
          onValueChange={(value) => {
            setEstadoComercial(
              value === ALL_VALUE ? undefined : (value as EstadoVenta),
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="rounded-lg">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos</SelectItem>
            <SelectItem value={EstadoVenta.ORDEN_CONFIRMADA}>
              Orden confirmada
            </SelectItem>
            <SelectItem value={EstadoVenta.ENTREGADA}>Entregada</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={vendedor}
          onChange={(e) => {
            setVendedor(e.target.value);
            setPage(1);
          }}
          placeholder="Vendedor"
          className="rounded-lg"
        />
        <Button
          type="button"
          variant="outline"
          className="gap-1 rounded-lg"
          onClick={clearFilters}
        >
          <FilterX className="size-4" />
          Limpiar
        </Button>
      </div>

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
      />

      <EmitirComprobanteModal
        venta={modalVenta}
        onClose={() => {
          setSelectedVenta(null);
          if (queryVentaId) setDismissedVentaId(queryVentaId);
        }}
        onSuccess={() => void query.refetch()}
      />
    </div>
  );
}
