"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  MoreHorizontal,
  Package,
  PackageCheck,
  Plus,
  ScanLine,
  ShoppingBag,
  Trash2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  RolUsuario,
  EstadoOrdenCompra,
  type OrdenCompraListItem,
  type OrdenCompraFormPayload,
  type CompraDirectaFormPayload,
  type RecepcionCompraFormPayload,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  useOrdenesCompra,
  useOrdenCompra,
  useCreateOrdenCompra,
  useCreateCompraDirecta,
  useAprobarOrdenCompra,
  useCreateRecepcion,
  useCancelarOrdenCompra,
  useDeleteOrdenCompra,
} from "@/hooks/use-compras";
import { useAlmacenes } from "@/hooks/use-inventario";
import { useDebounce } from "@/hooks/use-debounce";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdenCompraForm } from "@/components/forms/orden-compra-form";

/* ── Constants ──────────────────────────────────────── */

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/* ── Label maps ─────────────────────────────────────── */

const ESTADO_LABELS: Record<EstadoOrdenCompra, string> = {
  [EstadoOrdenCompra.BORRADOR]: "Borrador",
  [EstadoOrdenCompra.APROBADA]: "Aprobada",
  [EstadoOrdenCompra.ENVIADA_PROVEEDOR]: "Enviada",
  [EstadoOrdenCompra.RECIBIDA_PARCIAL]: "Rec. parcial",
  [EstadoOrdenCompra.RECIBIDA_TOTAL]: "Recibida",
  [EstadoOrdenCompra.CANCELADA]: "Cancelada",
};

/* ── Helpers ─────────────────────────────────────────── */

function formatCurrency(amount: number) {
  return `S/ ${amount.toFixed(2)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ── Types ───────────────────────────────────────────── */

interface OrdenDetalle {
  id: string;
  productoId: string;
  cantidad: number;
  cantidadRecibida?: number;
  precioUnitario: number;
  producto?: { id: string; nombre: string; sku?: string };
}

interface OrdenCompraDetail {
  id: string;
  numero: string;
  detalles: OrdenDetalle[];
}

const RECEIVABLE_ESTADOS = [
  EstadoOrdenCompra.APROBADA,
  EstadoOrdenCompra.ENVIADA_PROVEEDOR,
  EstadoOrdenCompra.RECIBIDA_PARCIAL,
];

/* ── Page ────────────────────────────────────────────── */

export default function ComprasPage() {
  const { hasRole } = useAuth();

  const canCreate = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canApprove = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canCancel = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);
  const canDelete = hasRole(RolUsuario.ADMIN);
  const canRecibir = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 300);

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [draftEstadoFilter, setDraftEstadoFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openCreateDirecta, setOpenCreateDirecta] = useState(false);

  const [recepcionOrdenId, setRecepcionOrdenId] = useState<string | null>(null);
  const [almacenId, setAlmacenId] = useState("");
  const [notas, setNotas] = useState("");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});


  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      estado:
        estadoFilter !== "all"
          ? (estadoFilter as EstadoOrdenCompra)
          : undefined,
    }),
    [page, limit, debouncedSearch, estadoFilter],
  );

  const { data, isLoading, isError, refetch } = useOrdenesCompra(filters);

  const { data: statsTotal } = useOrdenesCompra({ page: 1, limit: 1 });
  const { data: statsBorrador } = useOrdenesCompra({
    page: 1,
    limit: 1,
    estado: EstadoOrdenCompra.BORRADOR,
  });
  const { data: statsAprobada } = useOrdenesCompra({
    page: 1,
    limit: 1,
    estado: EstadoOrdenCompra.APROBADA,
  });
  const { data: statsRecibida } = useOrdenesCompra({
    page: 1,
    limit: 1,
    estado: EstadoOrdenCompra.RECIBIDA_TOTAL,
  });



  const createMutation = useCreateOrdenCompra();
  const createDirectaMutation = useCreateCompraDirecta();
  const aprobarMutation = useAprobarOrdenCompra();
  const cancelarMutation = useCancelarOrdenCompra();
  const deleteMutation = useDeleteOrdenCompra();
  const { data: ordenDetail } = useOrdenCompra(recepcionOrdenId ?? undefined);
  const { data: almacenes } = useAlmacenes();
  const recepcionMutation = useCreateRecepcion(recepcionOrdenId ?? "");

  const orden = ordenDetail?.data as OrdenCompraDetail | undefined;

  const almacenesActivos = useMemo(
    () => (almacenes?.data ?? []).filter((a: { activo: boolean }) => a.activo),
    [almacenes],
  );

  /* ── Handlers ────────────────────────────────────── */

  const handleCreate = useCallback(
    (payload: OrdenCompraFormPayload | CompraDirectaFormPayload) => {
      createMutation.mutate(payload as OrdenCompraFormPayload, {
        onSuccess: () => {
          toast.success("Orden de compra creada correctamente");
          setOpenCreate(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al crear la orden");
        },
      });
    },
    [createMutation],
  );

  const handleCreateDirecta = useCallback(
    (payload: OrdenCompraFormPayload | CompraDirectaFormPayload) => {
      createDirectaMutation.mutate(payload as CompraDirectaFormPayload, {
        onSuccess: () => {
          toast.success("Compra registrada y stock actualizado correctamente");
          setOpenCreateDirecta(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al registrar la compra");
        },
      });
    },
    [createDirectaMutation],
  );

  const handleApprove = useCallback(() => {
    if (!approveId) return;
    aprobarMutation.mutate(approveId, {
      onSuccess: () => {
        toast.success("Orden aprobada correctamente");
        setApproveId(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || "Error al aprobar la orden");
      },
    });
  }, [approveId, aprobarMutation]);

  const handleCancel = useCallback(() => {
    if (!cancelId) return;
    cancelarMutation.mutate(cancelId, {
      onSuccess: () => {
        toast.success("Orden cancelada correctamente");
        setCancelId(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || "Error al cancelar la orden");
      },
    });
  }, [cancelId, cancelarMutation]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Orden eliminada correctamente");
        setDeleteId(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || "Error al eliminar la orden");
      },
    });
  }, [deleteId, deleteMutation]);

  const openRecepcionDialog = useCallback((ordenId: string) => {
    setRecepcionOrdenId(ordenId);
    setAlmacenId("");
    setNotas("");
    setCantidades({});
  }, []);

  const closeRecepcionDialog = useCallback(() => {
    setRecepcionOrdenId(null);
    setAlmacenId("");
    setNotas("");
    setCantidades({});
  }, []);

  const handleCantidadChange = useCallback(
    (productoId: string, value: number) => {
      setCantidades((prev) => ({ ...prev, [productoId]: value }));
    },
    [],
  );

  // Pre-rellena cantidades pendientes cuando carga la orden
  useEffect(() => {
    if (!orden?.detalles) return;
    const pendientes: Record<string, number> = {};
    for (const d of orden.detalles) {
      const pend = d.cantidad - (d.cantidadRecibida ?? 0);
      if (pend > 0) pendientes[d.productoId] = pend;
    }
    setCantidades(pendientes);
  }, [orden?.detalles]);

  // Pre-selecciona almacén principal o único activo
  useEffect(() => {
    if (!recepcionOrdenId) return;
    if (almacenId) return;
    const activos = almacenesActivos as {
      id: string;
      nombre: string;
      esPrincipal?: boolean;
    }[];
    const preferido =
      activos.find((a) => a.esPrincipal) ??
      (activos.length === 1 ? activos[0] : undefined);
    if (preferido) setAlmacenId(preferido.id);
  }, [recepcionOrdenId, almacenId, almacenesActivos]);

  const handleSubmitRecepcion = useCallback(() => {
    if (!recepcionOrdenId || !almacenId || !orden?.detalles) return;
    const detalles = orden.detalles
      .filter((d) => (cantidades[d.productoId] ?? 0) > 0)
      .map((d) => ({
        productoId: d.productoId,
        cantidadRecibida: cantidades[d.productoId] ?? 0,
      }));

    if (detalles.length === 0) {
      toast.error("Ingrese al menos una cantidad recibida");
      return;
    }

    const payload: RecepcionCompraFormPayload = {
      almacenDestinoId: almacenId,
      notas: notas || undefined,
      detalles,
    };

    recepcionMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Recepción registrada correctamente");
        closeRecepcionDialog();
      },
      onError: (err: Error) => {
        toast.error(err.message || "Error al registrar recepción");
      },
    });
  }, [
    recepcionOrdenId,
    almacenId,
    notas,
    cantidades,
    orden,
    recepcionMutation,
    closeRecepcionDialog,
  ]);

  const handleExportCSV = useCallback(() => {
    const rows = data?.data ?? [];
    if (!rows.length) {
      toast.error("No hay datos para exportar");
      return;
    }
    const headers = ["N.°", "Proveedor", "Estado", "Total", "Fecha esperada"];
    const lines = rows.map((o) =>
      [
        o.numero,
        o.proveedor.razonSocial,
        o.estado,
        o.total,
        o.fechaEsperada ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ordenes-compra.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado correctamente");
  }, [data]);

  /* ── Columns ──────────────────────────────────────── */

  const columns = useMemo<ColumnDef<OrdenCompraListItem>[]>(
    () => [
      {
        accessorKey: "numero",
        header: "N.°",
        cell: ({ row }) => (
          <span className="font-medium font-mono text-sm whitespace-nowrap">
            {row.original.numero}
          </span>
        ),
      },
      {
        id: "proveedor",
        header: "Proveedor",
        cell: ({ row }) => (
          <span
            className="block max-w-50 truncate"
            title={row.original.proveedor.razonSocial}
          >
            {row.original.proveedor.razonSocial}
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const e = row.original.estado;
          return (
            <Badge
              variant="outline"
              className={cn("gap-1.5 text-xs whitespace-nowrap", {
                "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800":
                  e === EstadoOrdenCompra.BORRADOR,
                "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800":
                  e === EstadoOrdenCompra.APROBADA,
                "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800":
                  e === EstadoOrdenCompra.ENVIADA_PROVEEDOR,
                "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800":
                  e === EstadoOrdenCompra.RECIBIDA_PARCIAL,
                "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800":
                  e === EstadoOrdenCompra.RECIBIDA_TOTAL,
                "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800":
                  e === EstadoOrdenCompra.CANCELADA,
              })}
            >
              {e === EstadoOrdenCompra.RECIBIDA_TOTAL ? (
                <>
                  <span className="relative flex size-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                  </span>
                  {ESTADO_LABELS[e]}
                </>
              ) : (
                <>
                  <span
                    className={cn(
                      "size-1.5 rounded-full inline-block shrink-0",
                      {
                        "bg-slate-400": e === EstadoOrdenCompra.BORRADOR,
                        "bg-blue-400": e === EstadoOrdenCompra.APROBADA,
                        "bg-violet-400":
                          e === EstadoOrdenCompra.ENVIADA_PROVEEDOR,
                        "bg-amber-400":
                          e === EstadoOrdenCompra.RECIBIDA_PARCIAL,
                        "bg-red-400": e === EstadoOrdenCompra.CANCELADA,
                      },
                    )}
                  />
                  {ESTADO_LABELS[e]}
                </>
              )}
            </Badge>
          );
        },
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
        accessorKey: "fechaEsperada",
        header: "Fecha esperada",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDate(row.original.fechaEsperada)}
          </span>
        ),
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        size: 100,
        cell: ({ row }) => {
          const estado = row.original.estado;
          const isFinalState =
            estado === EstadoOrdenCompra.RECIBIDA_TOTAL ||
            estado === EstadoOrdenCompra.CANCELADA;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                onClick={() => {}}
              >
                <Eye className="size-3.5" />
                Ver
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Acciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    {canApprove && estado === EstadoOrdenCompra.BORRADOR && (
                      <DropdownMenuItem
                        onClick={() => setApproveId(row.original.id)}
                      >
                        <CheckCircle2 className="size-4" /> Aprobar orden
                      </DropdownMenuItem>
                    )}
                    {canRecibir &&
                      RECEIVABLE_ESTADOS.includes(
                        estado as EstadoOrdenCompra,
                      ) && (
                        <DropdownMenuItem
                          onClick={() => openRecepcionDialog(row.original.id)}
                        >
                          <Package className="size-4" /> Registrar recepción
                        </DropdownMenuItem>
                      )}
                    {canCancel && !isFinalState && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setCancelId(row.original.id)}
                        >
                          <XCircle className="size-4" /> Cancelar
                        </DropdownMenuItem>
                      </>
                    )}
                    {canDelete &&
                      (estado === EstadoOrdenCompra.BORRADOR ||
                        estado === EstadoOrdenCompra.CANCELADA) && (
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(row.original.id)}
                        >
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canApprove, canCancel, canDelete, canRecibir, openRecepcionDialog],
  );

  /* ── Filter helpers ──────────────────────────────── */

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const handleEstadoChange = useCallback((value: string) => {
    setEstadoFilter(value);
    setPage(1);
  }, []);
  const handleLimitChange = useCallback((value: number) => {
    setLimit(value);
    setPage(1);
  }, []);

  const openFilterPopover = useCallback(
    (open: boolean) => {
      setFilterPopoverOpen(open);
      if (open) setDraftEstadoFilter(estadoFilter);
    },
    [estadoFilter],
  );

  const applyFilterPopover = useCallback(() => {
    handleEstadoChange(draftEstadoFilter);
    setFilterPopoverOpen(false);
  }, [draftEstadoFilter, handleEstadoChange]);

  const clearFilterPopover = useCallback(() => {
    setDraftEstadoFilter("all");
    handleEstadoChange("all");
    setFilterPopoverOpen(false);
  }, [handleEstadoChange]);

  const activeFilterCount = estadoFilter !== "all" ? 1 : 0;

  /* ── Render ──────────────────────────────────────── */

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 flex-1 min-h-0">
      {/* Decorative backing glows — coordinated with stat-card palette */}
      <div className="pointer-events-none absolute -z-10 bg-sky-400/8 dark:bg-sky-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-indigo-400/6 dark:bg-indigo-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-emerald-400/5 dark:bg-emerald-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />
      <TopbarActions>
        <RealtimeStatus />
        {canCreate ? (
          <>
            <Button
              variant="outline"
              onClick={() => setOpenCreateDirecta(true)}
              className="rounded-xl gap-2 h-9 hidden sm:flex"
            >
              <Zap className="size-4" />
              Compra rápida
            </Button>
            <Button
              onClick={() => setOpenCreate(true)}
              className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nueva orden</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </>
        ) : null}
      </TopbarActions>
      <h1 className="sr-only">Compras</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total órdenes"
          value={statsTotal?.meta?.total}
          icon={ShoppingBag}
          theme="sky"
          subtitle="Historial total"
        />
        <StatCard
          label="Borradores"
          value={statsBorrador?.meta?.total}
          icon={ClipboardList}
          theme="slate"
          subtitle="Pendientes"
          onClick={() =>
            handleEstadoChange(
              estadoFilter === EstadoOrdenCompra.BORRADOR
                ? "all"
                : EstadoOrdenCompra.BORRADOR,
            )
          }
          active={estadoFilter === EstadoOrdenCompra.BORRADOR}
        />
        <StatCard
          label="Aprobadas"
          value={statsAprobada?.meta?.total}
          icon={CheckCircle2}
          theme="indigo"
          subtitle="Listas para enviar"
          onClick={() =>
            handleEstadoChange(
              estadoFilter === EstadoOrdenCompra.APROBADA
                ? "all"
                : EstadoOrdenCompra.APROBADA,
            )
          }
          active={estadoFilter === EstadoOrdenCompra.APROBADA}
        />
        <StatCard
          label="Recibidas"
          value={statsRecibida?.meta?.total}
          icon={PackageCheck}
          theme="emerald"
          subtitle="Completas"
          onClick={() =>
            handleEstadoChange(
              estadoFilter === EstadoOrdenCompra.RECIBIDA_TOTAL
                ? "all"
                : EstadoOrdenCompra.RECIBIDA_TOTAL,
            )
          }
          active={estadoFilter === EstadoOrdenCompra.RECIBIDA_TOTAL}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por número, proveedor…"
            className="sm:w-80 lg:w-96"
            inputClassName="border-border bg-background hover:border-sky-400/60 dark:hover:border-sky-500/60 focus-visible:border-sky-500 dark:focus-visible:border-sky-400 focus-visible:ring-sky-400/25 dark:focus-visible:ring-sky-500/25 shadow-sm"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Tabs value={estadoFilter} onValueChange={handleEstadoChange}>
              <TabsList className="h-9 gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/60 overflow-x-auto max-w-[calc(100vw-2rem)] sm:max-w-none flex-nowrap">
                <TabsTrigger
                  value="all"
                  className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                >
                  Todos
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoOrdenCompra.BORRADOR}
                  className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                >
                  Borrador
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoOrdenCompra.APROBADA}
                  className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                >
                  Aprobada
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoOrdenCompra.ENVIADA_PROVEEDOR}
                  className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                >
                  Enviada
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoOrdenCompra.RECIBIDA_PARCIAL}
                  className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                >
                  Rec. parcial
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoOrdenCompra.RECIBIDA_TOTAL}
                  className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                >
                  Recibida
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoOrdenCompra.CANCELADA}
                  className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md shrink-0"
                >
                  Cancelada
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Popover open={filterPopoverOpen} onOpenChange={openFilterPopover}>
              <PopoverTrigger asChild>
                <ToolbarFiltersButton
                  open={filterPopoverOpen}
                  activeCount={activeFilterCount}
                />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-70 rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">
                    Refina la lista visible
                  </p>
                </div>
                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Estado
                    </p>
                    <div className="grid gap-2">
                      {[
                        { value: "all", label: "Todos" },
                        {
                          value: EstadoOrdenCompra.BORRADOR,
                          label: "Borrador",
                        },
                        {
                          value: EstadoOrdenCompra.APROBADA,
                          label: "Aprobada",
                        },
                        {
                          value: EstadoOrdenCompra.ENVIADA_PROVEEDOR,
                          label: "Enviada al proveedor",
                        },
                        {
                          value: EstadoOrdenCompra.RECIBIDA_PARCIAL,
                          label: "Recibida parcial",
                        },
                        {
                          value: EstadoOrdenCompra.RECIBIDA_TOTAL,
                          label: "Recibida total",
                        },
                        {
                          value: EstadoOrdenCompra.CANCELADA,
                          label: "Cancelada",
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            draftEstadoFilter === option.value
                              ? "border-primary/40 bg-primary/5 text-foreground"
                              : "border-border/60 bg-background hover:bg-muted/40",
                          )}
                          onClick={() => setDraftEstadoFilter(option.value)}
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border transition-colors",
                              draftEstadoFilter === option.value
                                ? "border-primary"
                                : "border-muted-foreground/40",
                            )}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full transition-colors",
                                draftEstadoFilter === option.value
                                  ? "bg-primary"
                                  : "bg-transparent",
                              )}
                            />
                          </span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg text-xs text-muted-foreground"
                      onClick={clearFilterPopover}
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      onClick={applyFilterPopover}
                    >
                      Aplicar filtros
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <ServerDataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.meta?.total ?? 0}
        page={page}
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        errorMessage="No se pudo cargar la lista de órdenes."
        onRetry={() => void refetch()}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        enableColumnVisibility
        columnVisibilityStorageKey="erp:compras:table-columns"
      />

      {/* ── Aprobar alert dialog ── */}
      <AlertDialog
        open={!!approveId}
        onOpenChange={(open) => (!open ? setApproveId(null) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setApproveId(null)}
            className="absolute right-4 top-4 size-6 text-muted-foreground hover:bg-muted mt-0 border-0 z-10"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0 relative">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
              <CheckCircle2 className="size-5 text-primary" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                Aprobar orden
              </AlertDialogTitle>
              <AlertDialogDescription>
                La orden pasará de Borrador a Aprobada y quedará lista para
                recepción.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0">
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={aprobarMutation.isPending}
              className="w-full sm:w-auto rounded-xl"
            >
              {aprobarMutation.isPending ? "Aprobando..." : "Aprobar orden"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Cancelar alert dialog ── */}
      <AlertDialog
        open={!!cancelId}
        onOpenChange={(o) => (!o ? setCancelId(null) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setCancelId(null)}
            className="absolute right-4 top-4 size-6 text-muted-foreground hover:bg-muted mt-0 border-0 z-10"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0 relative">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
              <XCircle className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Cancelar orden?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. La orden pasará a estado
                Cancelada.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0">
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelarMutation.isPending}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelarMutation.isPending ? "Cancelando..." : "Sí, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Eliminar alert dialog ── */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => (!o ? setDeleteId(null) : null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(null)}
            className="absolute right-4 top-4 size-6 text-muted-foreground hover:bg-muted mt-0 border-0 z-10"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0 relative">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar orden?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. La orden será eliminada del
                sistema.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Crear orden dialog ── */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <Plus className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Nueva orden de compra
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Crea una orden de compra para un proveedor.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            <OrdenCompraForm
              mode="create"
              variant="orden"
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Compra directa (rápida) dialog ── */}
      <Dialog open={openCreateDirecta} onOpenChange={setOpenCreateDirecta}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                <Zap className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Compra rápida
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Registra una compra ya recibida. El stock se actualizará
                  automáticamente.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            <OrdenCompraForm
              mode="create"
              variant="directa"
              onSubmit={handleCreateDirecta}
              isLoading={createDirectaMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Registrar recepción dialog ── */}
      <Dialog
        open={!!recepcionOrdenId}
        onOpenChange={(o) => {
          if (!o) closeRecepcionDialog();
        }}
      >
        <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40">
                <Package className="size-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Registrar recepción {orden?.numero ? `— ${orden.numero}` : ""}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Ingresa las cantidades recibidas y el almacén destino.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Almacén destino *</Label>
              <Select value={almacenId} onValueChange={setAlmacenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar almacén" />
                </SelectTrigger>
                <SelectContent>
                  {almacenesActivos.map((a: { id: string; nombre: string }) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {orden?.detalles && orden.detalles.length > 0 ? (
              <div className="flex flex-col gap-2">
                <Label>Productos</Label>
                <div className="rounded-lg border divide-y">
                  {orden.detalles.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {d.producto?.sku ? (
                            <span className="font-mono text-xs text-muted-foreground mr-1.5">
                              {d.producto.sku}
                            </span>
                          ) : null}
                          {d.producto?.nombre ?? d.productoId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ordenado: {d.cantidad}
                          {d.cantidadRecibida != null && (
                            <> · Recibido: {d.cantidadRecibida}</>
                          )}
                          {(() => {
                            const pend = d.cantidad - (d.cantidadRecibida ?? 0);
                            return pend > 0 ? (
                              <>
                                {" "}
                                · Pendiente: <strong>{pend}</strong>
                              </>
                            ) : null;
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Label className="text-xs text-muted-foreground">
                          Recibir:
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={d.cantidad - (d.cantidadRecibida ?? 0)}
                          value={cantidades[d.productoId] ?? ""}
                          onChange={(e) =>
                            handleCantidadChange(
                              d.productoId,
                              Number(e.target.value),
                            )
                          }
                          className="h-8 w-20 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                {recepcionOrdenId
                  ? "Cargando productos..."
                  : "Seleccione una orden"}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Notas</Label>
              <Textarea
                placeholder="Observaciones sobre la recepción (opcional)"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={closeRecepcionDialog}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitRecepcion}
                disabled={!almacenId || recepcionMutation.isPending}
                className="rounded-xl"
              >
                {recepcionMutation.isPending
                  ? "Registrando..."
                  : "Registrar recepción"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
