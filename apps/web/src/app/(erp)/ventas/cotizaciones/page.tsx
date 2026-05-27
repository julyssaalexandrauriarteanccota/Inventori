"use client";

/**
 * Cotizaciones
 * ───────────────────────────────────────────────────────────────
 * Página dedicada al ciclo de cotización (estado COTIZACION).
 *
 * Diferencia con /ventas:
 *   - /ventas              → vista global de ventas en cualquier estado.
 *   - /ventas/cotizaciones → solo propuestas comerciales para PDF/cliente.
 *   - /pos                 → POS de mostrador (catálogo + cobro).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  EstadoVenta,
  type VentaFormPayload,
  type VentaListItem,
} from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useVentas,
  useVenta,
  useCreateVenta,
  useDeleteVenta,
} from "@/hooks/use-ventas";
import { useConfigEmpresa } from "@/hooks/use-configuracion";
import { downloadCotizacionPdf, generateCotizacionPdfBlobUrl } from "@/lib/cotizacion-pdf";
import type { CotizacionPdfData } from "@/components/pdf/cotizacion-pdf";
import { api, getApiAssetUrl } from "@/lib/api";

import { TopbarActions } from "@/components/layout/topbar-actions";
import { StatCard } from "@/components/layout/stat-card";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      atributos?: any | null;
    } | null;
  }>;
};

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAtributos(atributos: any): Array<{ clave: string; valor: string }> {
  if (!atributos) return [];
  if (Array.isArray(atributos)) return atributos;
  if (typeof atributos === "string") {
    try {
      const parsed = JSON.parse(atributos);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function formatCurrency(amount: any) {
  const num = typeof amount === "number" ? amount : Number(amount ?? 0);
  return `S/ ${num.toFixed(2)}`;
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

function getCotizacionNumero(numero?: string | null) {
  if (!numero) return "COT";
  return numero.replace(/^VTA-/i, "COT-");
}

function getCotizacionSearch(search: string) {
  const trimmed = search.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^COT-/i, "VTA-");
}

export default function CotizacionesPage() {
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const canCreate = hasRole(
    RolUsuario.ADMIN,
    RolUsuario.ENCARGADO,
    RolUsuario.TECNICO,
  );
  const canDelete = hasRole(RolUsuario.ADMIN);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [openCreate, setOpenCreate] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewVenta, setPreviewVenta] = useState<VentaListItem | null>(null);

  const filters = useMemo(
    () => ({
      page,
      limit,
      estado: EstadoVenta.COTIZACION,
      search: getCotizacionSearch(debouncedSearch),
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
  const { data: empresaRes } = useConfigEmpresa();
  const detail = detailRes?.data as VentaDetalle | undefined;

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const prefillCotizacion = useMemo<Partial<VentaFormPayload> | undefined>(() => {
    const productoId = searchParams.get("productoId");
    if (!productoId) return undefined;

    return {
      detalles: [
        {
          productoId: productoId ?? "",
          cantidad: 1,
          precioUnitario: 0,
        },
      ],
    };
  }, [searchParams]);

  useEffect(() => {
    if (prefillCotizacion && canCreate) {
      setOpenCreate(true);
    }
  }, [canCreate, prefillCotizacion]);

  const getPdfData = useCallback(
    (venta: VentaDetalle): CotizacionPdfData => {
      return {
        numero: getCotizacionNumero(venta.numero),
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
    },
    [],
  );

  const handleRowPdfPreview = useCallback(
    async (venta: VentaListItem) => {
      try {
        setPdfLoadingId(venta.id);
        const res = await api.get<{
          data: VentaDetalle;
          meta: { timestamp: string };
        }>(`/ventas/${venta.id}`);

        const empresa = empresaRes?.data;
        if (!empresa) {
          toast.error("No hay configuración de empresa cargada todavía.");
          return;
        }
        const igvPercent = empresa.porcentajeIGV
          ? Number(empresa.porcentajeIGV)
          : 18;

        const pdfData = getPdfData(res.data);
        const blobUrl = await generateCotizacionPdfBlobUrl(pdfData, empresa, igvPercent);

        setPreviewUrl(blobUrl);
        setPreviewVenta(venta);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "No se pudo generar la vista previa del PDF",
        );
      } finally {
        setPdfLoadingId(null);
      }
    },
    [empresaRes, getPdfData],
  );

  const handleDetailPdfPreview = useCallback(async () => {
    if (!detail) return;
    try {
      setPdfLoadingId(detail.id);
      const empresa = empresaRes?.data;
      if (!empresa) {
        toast.error("No hay configuración de empresa cargada todavía.");
        return;
      }
      const igvPercent = empresa.porcentajeIGV
        ? Number(empresa.porcentajeIGV)
        : 18;

      const pdfData = getPdfData(detail);
      const blobUrl = await generateCotizacionPdfBlobUrl(pdfData, empresa, igvPercent);

      setPreviewUrl(blobUrl);
      setPreviewVenta(detail);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo generar la vista previa del PDF",
      );
    } finally {
      setPdfLoadingId(null);
    }
  }, [detail, empresaRes, getPdfData]);

  const createMutation = useCreateVenta();
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
            {getCotizacionNumero(row.original.numero)}
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
              onClick={() => void handleRowPdfPreview(row.original)}
              disabled={pdfLoadingId === row.original.id}
              title="Vista previa PDF"
            >
              {pdfLoadingId === row.original.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Eye className="size-3.5" />
              )}
              <span className="hidden lg:inline">PDF</span>
            </Button>
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
    [
      canDelete,
      handleRowPdfPreview,
      pdfLoadingId,
    ],
  );

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-6">
      {/* Decorative backing glows */}
      <div className="pointer-events-none absolute -z-10 bg-amber-400/8 dark:bg-amber-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-emerald-400/6 dark:bg-emerald-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-sky-400/5 dark:bg-sky-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />

      <TopbarActions>
        <Button variant="outline" asChild size="sm" className="gap-1.5 rounded-xl h-9">
          <Link href="/ventas">
            <ArrowLeft className="size-4" /> Ventas
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          className="gap-1.5 rounded-xl h-9"
        >
          <RefreshCcw className="size-4" />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
        {canCreate ? (
          <Button
            size="sm"
            onClick={() => setOpenCreate(true)}
            className="erp-page-primary-cta gap-2 rounded-xl h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nueva cotización</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        ) : null}
      </TopbarActions>
      <h1 className="sr-only">Cotizaciones</h1>

      <div className="grid gap-4 grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Cotizaciones activas"
          value={data?.meta?.total ?? 0}
          icon={FileText}
          theme="amber"
          subtitle="Activas para PDF/cliente"
          isLoading={isLoading}
          index={0}
        />
        <StatCard
          label="Monto cotizado"
          value={`S/ ${(data?.data ?? [])
            .reduce((acc, v) => acc + Number(v.total ?? 0), 0)
            .toFixed(2)}`}
          icon={CheckCircle2}
          theme="emerald"
          subtitle="Suma de la página actual"
          isLoading={isLoading}
          index={1}
        />
        <StatCard
          label="Items por página"
          value={data?.data?.length ?? 0}
          icon={Eye}
          theme="sky"
          subtitle={`Página ${page} · ${limit}/pág`}
          isLoading={isLoading}
          index={2}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar por número o cliente…"
            className="sm:w-80 lg:w-96"
            inputClassName="border-border bg-background hover:border-amber-400/60 dark:hover:border-amber-500/60 focus-visible:border-amber-500 dark:focus-visible:border-amber-400 focus-visible:ring-amber-400/25 dark:focus-visible:ring-amber-500/25 shadow-sm"
          />
        </div>
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
                  Registra una propuesta comercial para entregar al cliente.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <VentaForm
              key={
                prefillCotizacion?.detalles?.[0]?.productoId ??
                "nueva-cotizacion"
              }
              mode="create"
              defaultValues={prefillCotizacion}
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
              soloEquipos
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
                    ? `${getCotizacionNumero(detail.numero)} — ${getClienteNombre(detail.cliente)}`
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

              {(() => {
                const item = detail.detalles[0];
                if (!item) return null;
                const attrs = parseAtributos(item.producto?.atributos);
                
                return (
                  <div className="space-y-5">
                    {/* Main Card */}
                    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center sm:gap-6">
                      {item.producto?.imagen && (
                        <div className="flex size-24 shrink-0 items-center justify-center rounded-xl border border-border bg-background p-1.5 self-center">
                          <img
                            src={getApiAssetUrl(item.producto.imagen)}
                            alt={item.producto.nombre}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <h4 className="text-base font-bold text-foreground">
                          {item.producto?.nombre || "Producto sin nombre"}
                        </h4>
                        <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                          {item.producto?.sku && (
                            <Badge variant="outline" className="text-[10px]">
                              SKU: {item.producto.sku}
                            </Badge>
                          )}
                          {item.producto?.marca?.nombre && (
                            <Badge variant="outline" className="text-[10px]">
                              Marca: {item.producto.marca.nombre}
                            </Badge>
                          )}
                          {item.producto?.modeloCatalogo?.nombre && (
                            <Badge variant="outline" className="text-[10px]">
                              Modelo: {item.producto.modeloCatalogo.nombre}
                            </Badge>
                          )}
                          {item.equipoSerie && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                              Serie: {item.equipoSerie}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-primary">
                          Precio Unitario: {formatCurrency(item.precioUnitario)}
                        </p>
                      </div>
                    </div>

                    {/* Descripción Comercial */}
                    {item.producto?.descripcion && (
                      <div className="rounded-xl border border-border/60 bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                          Descripción Comercial
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                          {stripHtml(item.producto.descripcion)}
                        </p>
                      </div>
                    )}

                    {/* Ficha Técnica / Atributos */}
                    {attrs.length > 0 && (
                      <div className="rounded-xl border border-border/60 bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                          Ficha Técnica
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {attrs.map((attr, aIdx) => (
                            <div key={aIdx} className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                {attr.clave}
                              </p>
                              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground">
                                {attr.valor}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                onClick={() => void handleDetailPdfPreview()}
                disabled={pdfLoadingId === detail.id}
                className="erp-page-primary-cta rounded-xl"
              >
                {pdfLoadingId === detail.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Eye className="size-4" />
                )}
                Vista Previa PDF
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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

      {/* Dialog: Vista previa PDF */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(o) => {
          if (!o) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setPreviewVenta(null);
          }
        }}
      >
        <DialogContent className="flex h-[90vh] w-full flex-col overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl rounded-2xl">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between w-full">
              <div className="min-w-0 text-left">
                <DialogTitle className="text-base font-semibold sm:text-lg">
                  Vista Previa - Cotización
                </DialogTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {previewVenta ? `${getCotizacionNumero(previewVenta.numero)} — ${getClienteNombre(previewVenta.cliente)}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-3 text-xs"
                onClick={() => {
                  if (previewUrl && previewVenta) {
                    const a = document.createElement("a");
                    a.href = previewUrl;
                    a.download = `cotizacion-${getCotizacionNumero(previewVenta.numero)}.pdf`;
                    a.click();
                  }
                }}
              >
                <Download className="size-3.5" />
                Descargar
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-zinc-900 dark:bg-zinc-950 p-0 flex items-center justify-center">
            {previewUrl ? (
              <iframe
                src={`${previewUrl}#view=FitH`}
                className="w-full h-full border-0"
                title="Vista previa de la cotización"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm">Cargando visor...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
