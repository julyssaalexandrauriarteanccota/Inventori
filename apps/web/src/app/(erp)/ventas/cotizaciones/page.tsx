"use client";

/**
 * Cotizaciones
 * ───────────────────────────────────────────────────────────────
 * Página dedicada al ciclo de cotización (estado COTIZACION).
 *
 * Diferencia con /ventas:
 *   - /ventas              → vista global de ventas en cualquier estado.
 *   - /ventas/cotizaciones → solo cotizaciones, foco en convertir o cancelar.
 *   - /pos                 → POS de mostrador (catálogo + cobro).
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  EstadoVenta,
  type ConfirmarVentaPayload,
  type VentaFormPayload,
  type VentaListItem,
} from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useVentas,
  useVenta,
  useCreateVenta,
  useConfirmarVenta,
  useCancelarVenta,
  useDeleteVenta,
} from "@/hooks/use-ventas";
import { useAlmacenes } from "@/hooks/use-inventario";
import {
  useConfigEmpresa,
  useMetodosPago,
} from "@/hooks/use-configuracion";
import { downloadCotizacionPdf } from "@/lib/cotizacion-pdf";
import type { CotizacionPdfData } from "@/components/pdf/cotizacion-pdf";
import { api } from "@/lib/api";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VentaForm } from "@/components/forms/venta-form";

const DEFAULT_LIMIT = 20;

type VentaDetalle = VentaListItem & {
  createdAt?: string | null;
  notas?: string | null;
  validoHasta?: string | null;
  metodoPago?: {
    id: string;
    codigo: string;
    nombre: string;
  } | null;
  usuario?: {
    id: string;
    nombre: string;
    apellido?: string | null;
    email?: string | null;
  } | null;
  cliente: VentaListItem["cliente"] & {
    ruc?: string | null;
    dni?: string | null;
    email?: string | null;
    telefono?: string | null;
    celular?: string | null;
    direccion?: string | null;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
  };
  detalles: Array<{
    id: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    descuento: number;
    equipoSerie?: string | null;
    producto?: {
      id: string;
      sku: string;
      nombre: string;
      descripcion?: string | null;
      imagen?: string | null;
      tieneNumeroSerie?: boolean;
      mesesGarantia?: number | null;
      garantiaMaxCopias?: number | null;
      marca?: { nombre: string } | null;
      modeloCatalogo?: { nombre: string } | null;
    } | null;
  }>;
};

function formatCurrency(amount: number) {
  return `S/ ${amount.toFixed(2)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getClienteNombre(c: VentaListItem["cliente"]) {
  if (c.razonSocial) return c.razonSocial;
  const parts = [c.nombre, c.apellido].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

export default function CotizacionesPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole(
    RolUsuario.ADMIN,
    RolUsuario.ENCARGADO,
    RolUsuario.TECNICO,
  );
  const canConfirm = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canCancel = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canDelete = hasRole(RolUsuario.ADMIN);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [openCreate, setOpenCreate] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirmCotizacion, setConfirmCotizacion] =
    useState<VentaListItem | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [almacenId, setAlmacenId] = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");

  const filters = useMemo(
    () => ({
      page,
      limit,
      estado: EstadoVenta.COTIZACION,
      search: debouncedSearch || undefined,
    }),
    [page, limit, debouncedSearch],
  );

  const { data, isLoading, isError, refetch } = useVentas(filters);
  const {
    data: detailRes,
    isLoading: isDetailLoading,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useVenta(viewId ?? undefined);
  const { data: almacenesRes } = useAlmacenes();
  const { data: metodosRes } = useMetodosPago();
  const { data: empresaRes } = useConfigEmpresa();
  const detail = detailRes?.data as VentaDetalle | undefined;

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const generatePdf = useCallback(
    async (venta: VentaDetalle) => {
      const empresa = empresaRes?.data;
      if (!empresa) {
        toast.error("No hay configuración de empresa cargada todavía.");
        return;
      }
      const igvPercent = empresa.porcentajeIGV
        ? Number(empresa.porcentajeIGV)
        : 18;
      const pdfData: CotizacionPdfData = {
        numero: venta.numero,
        createdAt: venta.createdAt ?? null,
        validoHasta: venta.validoHasta ?? null,
        notas: venta.notas ?? null,
        subtotal: Number(venta.subtotal),
        descuento: Number(venta.descuento),
        igv: Number(venta.igv),
        total: Number(venta.total),
        cliente: venta.cliente,
        usuario: venta.usuario
          ? {
              nombre: venta.usuario.nombre,
              apellido: venta.usuario.apellido ?? null,
              email: venta.usuario.email ?? null,
            }
          : null,
        detalles: venta.detalles.map((d) => ({
          id: d.id,
          cantidad: Number(d.cantidad),
          precioUnitario: Number(d.precioUnitario),
          descuento: Number(d.descuento ?? 0),
          subtotal: Number(d.subtotal),
          equipoSerie: d.equipoSerie ?? null,
          producto: d.producto ?? null,
        })),
      };
      await downloadCotizacionPdf(pdfData, empresa, igvPercent);
    },
    [empresaRes],
  );

  const handleRowPdf = useCallback(
    async (venta: VentaListItem) => {
      try {
        setPdfLoadingId(venta.id);
        const res = await api.get<{
          data: VentaDetalle;
          meta: { timestamp: string };
        }>(`/ventas/${venta.id}`);
        await generatePdf(res.data);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "No se pudo generar el PDF",
        );
      } finally {
        setPdfLoadingId(null);
      }
    },
    [generatePdf],
  );

  const handleDetailPdf = useCallback(async () => {
    if (!detail) return;
    try {
      setPdfLoadingId(detail.id);
      await generatePdf(detail);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo generar el PDF",
      );
    } finally {
      setPdfLoadingId(null);
    }
  }, [detail, generatePdf]);

  const almacenesActivos = useMemo(
    () => (almacenesRes?.data ?? []).filter((almacen) => almacen.activo),
    [almacenesRes],
  );
  const metodosActivos = useMemo(
    () => (metodosRes?.data ?? []).filter((metodo) => metodo.activo),
    [metodosRes],
  );

  const createMutation = useCreateVenta();
  const confirmMutation = useConfirmarVenta(confirmCotizacion?.id ?? "");
  const cancelMutation = useCancelarVenta();
  const deleteMutation = useDeleteVenta();

  const handleCreate = useCallback(
    (payload: VentaFormPayload) => {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Cotización creada");
          setOpenCreate(false);
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al crear cotización"),
      });
    },
    [createMutation],
  );

  const openConfirm = useCallback((venta: VentaListItem) => {
    setConfirmCotizacion(venta);
    setMetodoPagoId("");
    setAlmacenId("");
    setReferenciaPago("");
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmCotizacion(null);
    setMetodoPagoId("");
    setAlmacenId("");
    setReferenciaPago("");
  }, []);

  const handleConvert = useCallback(() => {
    if (!confirmCotizacion || !metodoPagoId || !almacenId) return;
    const payload: ConfirmarVentaPayload = {
      metodoPagoId,
      almacenId,
      referenciaPago: referenciaPago || undefined,
    };
    confirmMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Cotización convertida en venta confirmada");
        closeConfirm();
      },
      onError: (err: Error) => toast.error(err.message || "Error al confirmar"),
    });
  }, [
    confirmCotizacion,
    metodoPagoId,
    almacenId,
    referenciaPago,
    confirmMutation,
    closeConfirm,
  ]);

  const handleCancel = useCallback(() => {
    if (!cancelId) return;
    cancelMutation.mutate(
      { id: cancelId },
      {
        onSuccess: () => {
          toast.success("Cotización cancelada");
          setCancelId(null);
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al cancelar"),
      },
    );
  }, [cancelId, cancelMutation]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Cotización eliminada");
        setDeleteId(null);
      },
      onError: (err: Error) => toast.error(err.message || "Error al eliminar"),
    });
  }, [deleteId, deleteMutation]);

  const columns = useMemo<ColumnDef<VentaListItem>[]>(
    () => [
      {
        accessorKey: "numero",
        header: "N.°",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium whitespace-nowrap">
            {row.original.numero}
          </span>
        ),
      },
      {
        id: "cliente",
        header: "Cliente",
        cell: ({ row }) => (
          <span
            className="block max-w-50 truncate"
            title={getClienteNombre(row.original.cliente)}
          >
            {getClienteNombre(row.original.cliente)}
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: () => (
          <Badge
            variant="outline"
            className="gap-1.5 whitespace-nowrap border-slate-200 bg-slate-100 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400"
          >
            <FileText className="size-3" />
            Cotización
          </Badge>
        ),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium tabular-nums">
            {formatCurrency(row.original.total)}
          </span>
        ),
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        size: 280,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
              onClick={() => setViewId(row.original.id)}
            >
              <Eye className="size-3.5" /> Ver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
              onClick={() => void handleRowPdf(row.original)}
              disabled={pdfLoadingId === row.original.id}
              title="Descargar PDF"
            >
              {pdfLoadingId === row.original.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span className="hidden lg:inline">PDF</span>
            </Button>
            {canConfirm && (
              <Button
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
                onClick={() => openConfirm(row.original)}
              >
                <CheckCircle2 className="size-3.5" /> Convertir
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => setCancelId(row.original.id)}
                title="Cancelar cotización"
              >
                <XCircle className="size-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteId(row.original.id)}
                title="Eliminar"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canConfirm, canCancel, canDelete, openConfirm, handleRowPdf, pdfLoadingId],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
      <PageHeader
        title="Cotizaciones"
        description="Propuestas comerciales pendientes — conviértelas en venta confirmada cuando el cliente acepte."
        actions={
          <>
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/ventas">
                <ArrowLeft className="size-4" /> Ventas
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              className="rounded-xl"
            >
              <RefreshCcw className="size-4" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            {canCreate ? (
              <Button
                onClick={() => setOpenCreate(true)}
                className="erp-page-primary-cta rounded-xl"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nueva cotización</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Cotizaciones activas"
          value={data?.meta?.total ?? 0}
          icon={FileText}
          color="bg-[oklch(0.96_0.02_75)] text-[oklch(0.38_0.08_75)] dark:bg-[oklch(0.16_0.03_75)] dark:text-[oklch(0.78_0.08_75)]"
          subtitle="En estado cotización"
          isLoading={isLoading}
          index={0}
        />
        <StatCard
          label="Monto cotizado"
          value={`S/ ${(data?.data ?? [])
            .reduce((acc, v) => acc + Number(v.total ?? 0), 0)
            .toFixed(2)}`}
          icon={CheckCircle2}
          color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          subtitle="Suma de la página actual"
          isLoading={isLoading}
          index={1}
        />
        <StatCard
          label="Items por página"
          value={data?.data?.length ?? 0}
          icon={Eye}
          color="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400"
          subtitle={`Página ${page} · ${limit}/pág`}
          isLoading={isLoading}
          index={2}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ToolbarSearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Buscar por número o cliente…"
        />
      </div>

      {isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Error al cargar cotizaciones.
          <Button variant="link" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <ServerDataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          page={page}
          limit={limit}
          total={data?.meta?.total ?? 0}
          onPageChange={setPage}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="flex max-h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <Plus className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 text-left">
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  Nueva cotización
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  Registra una propuesta comercial para convertirla en venta
                  cuando el cliente acepte.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <VentaForm
              mode="create"
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewId}
        onOpenChange={(open) => {
          if (!open) setViewId(null);
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 text-left">
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  Detalle de cotización
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  {detail
                    ? `${detail.numero} — ${getClienteNombre(detail.cliente)}`
                    : "Consulta el resumen completo de la cotización."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Cargando detalle…
            </div>
          ) : isDetailError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              No se pudo cargar la cotización.
              <Button
                variant="link"
                className="h-auto px-2"
                onClick={() => void refetchDetail()}
              >
                Reintentar
              </Button>
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-5 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Cliente
                  </p>
                  <p className="mt-1 font-medium">
                    {getClienteNombre(detail.cliente)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {detail.cliente.ruc ||
                      detail.cliente.dni ||
                      "Sin documento"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Resumen
                  </p>
                  <div className="mt-1 space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Estado:</span>{" "}
                      Cotización
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Válida hasta:
                      </span>{" "}
                      {formatDate(detail.validoHasta)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Vendedor:</span>{" "}
                      {detail.usuario
                        ? `${detail.usuario.nombre} ${detail.usuario.apellido ?? ""}`.trim()
                        : "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Método de pago:
                      </span>{" "}
                      {detail.metodoPago?.nombre || "Pendiente"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60">
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="font-medium">Items cotizados</p>
                </div>
                <div className="divide-y divide-border/60">
                  {detail.detalles.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {item.producto?.nombre || "Producto sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.producto?.sku || "Sin SKU"}
                          {item.equipoSerie
                            ? ` · Serie ${item.equipoSerie}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-sm md:text-right">
                        <p>
                          {item.cantidad} x{" "}
                          {formatCurrency(item.precioUnitario)}
                        </p>
                        <p className="font-medium tabular-nums">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Notas
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                    {detail.notas?.trim() || "Sin observaciones registradas."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background p-4 md:min-w-56">
                  <div className="flex items-center justify-between gap-6 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">
                      {formatCurrency(detail.subtotal)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-6 text-sm">
                    <span className="text-muted-foreground">IGV</span>
                    <span className="tabular-nums">
                      {formatCurrency(detail.igv)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-6 border-t border-border/60 pt-3 font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums text-primary">
                      {formatCurrency(detail.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          </div>
          {detail ? (
            <div className="shrink-0 border-t border-border/40 px-4 py-3 sm:px-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setViewId(null)}
                className="rounded-xl"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => void handleDetailPdf()}
                disabled={pdfLoadingId === detail.id}
                className="erp-page-primary-cta rounded-xl"
              >
                {pdfLoadingId === detail.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Descargar PDF
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmCotizacion}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
      >
        <DialogContent className="w-full overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/40 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40">
                <CheckCircle2 className="size-4 text-green-700 dark:text-green-400" />
              </div>
              <div className="min-w-0 text-left">
                <DialogTitle className="text-base font-semibold">
                  Convertir a venta confirmada
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  {confirmCotizacion
                    ? `${confirmCotizacion.numero} — ${formatCurrency(confirmCotizacion.total)}`
                    : "Selecciona los datos de entrega y pago."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-5 py-4">
            <div className="grid gap-1.5">
              <Label>Almacén *</Label>
              <Select value={almacenId} onValueChange={setAlmacenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar almacén" />
                </SelectTrigger>
                <SelectContent>
                  {almacenesActivos.map((almacen) => (
                    <SelectItem key={almacen.id} value={almacen.id}>
                      {almacen.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Método de pago *</Label>
              <Select value={metodoPagoId} onValueChange={setMetodoPagoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  {metodosActivos.map((metodo) => (
                    <SelectItem key={metodo.id} value={metodo.id}>
                      {metodo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Referencia de pago</Label>
              <Input
                value={referenciaPago}
                onChange={(e) => setReferenciaPago(e.target.value)}
                placeholder="N.° operación (opcional)"
              />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={closeConfirm} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleConvert}
                disabled={
                  !metodoPagoId || !almacenId || confirmMutation.isPending
                }
                className="rounded-xl"
              >
                {confirmMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Confirmar venta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!cancelId}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}
      >
        <AlertDialogContent className="w-full rounded-2xl p-6 sm:max-w-md">
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-[oklch(0.96_0.02_75)] dark:bg-[oklch(0.16_0.03_75)]">
              <XCircle className="size-5 text-[oklch(0.40_0.08_75)] dark:text-[oklch(0.78_0.08_75)]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <AlertDialogTitle className="text-xl">
                ¿Cancelar cotización?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Quedará marcada como cancelada y ya no podrá convertirse.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 rounded-xl">Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="rounded-xl bg-[oklch(0.60_0.14_75)] text-white hover:bg-[oklch(0.52_0.12_75)] dark:bg-[oklch(0.72_0.14_75)] dark:text-black dark:hover:bg-[oklch(0.65_0.12_75)] transition-all duration-200"
            >
              Cancelar cotización
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent className="w-full rounded-2xl p-6 sm:max-w-md">
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar cotización?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 rounded-xl">Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
