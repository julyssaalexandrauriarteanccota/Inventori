"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  X,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  EstadoComercialEquipo,
  EstadoContratoAlquiler,
  type ContratoAlquilerListItem,
} from "@erp/shared";

import { cn } from "@/lib/utils";
import { useAlquileres, useDeleteAlquiler } from "@/hooks/use-alquileres";
import { useCreateAlquiler } from "@/hooks/use-alquileres";
import { useClientes } from "@/hooks/use-clientes";
import { useEquipos } from "@/hooks/use-equipos";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";

import { RealtimeStatus } from "@/components/layout/realtime-status";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ToolbarFiltersButton } from "@/components/layout/toolbar-filters-button";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import { SearchableSelect } from "@/components/searchable-select";
import { ServerDataTable } from "@/components/tables/ServerDataTable";
import { ErpBadge, type ErpBadgeTone } from "@/components/erp-badges";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const CONTRATO_LABELS: Record<EstadoContratoAlquiler, string> = {
  [EstadoContratoAlquiler.BORRADOR]: "Borrador",
  [EstadoContratoAlquiler.RESERVADO]: "Reservado",
  [EstadoContratoAlquiler.PENDIENTE_ENTREGA]: "Pendiente entrega",
  [EstadoContratoAlquiler.ACTIVO]: "Activo",
  [EstadoContratoAlquiler.EN_RETORNO]: "En retorno",
  [EstadoContratoAlquiler.CERRADO]: "Cerrado",
  [EstadoContratoAlquiler.FINALIZADO]: "Finalizado",
  [EstadoContratoAlquiler.CANCELADO]: "Cancelado",
};

function clienteLabel(cliente?: ContratoAlquilerListItem["cliente"]) {
  if (!cliente) return "—";
  return (
    cliente.razonSocial ||
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
    "—"
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(value ?? 0));
}

function apiErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operación";
}

function formatUnitPrice(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toFixed(4).replace(/0+$/u, "").replace(/\.$/u, "");
}

function exportToCSV(rows: ContratoAlquilerListItem[]) {
  if (!rows.length) {
    toast.error("No hay datos para exportar");
    return;
  }

  const headers = [
    "Contrato",
    "Estado",
    "Cliente",
    "Equipo",
    "Inicio",
    "Fin previsto",
    "Meses",
    "Copias incluidas",
    "Precio mensual",
    "Precio excedente",
    "Depósito garantía",
  ];
  const lines = rows.map((contrato) =>
    [
      contrato.numero,
      CONTRATO_LABELS[contrato.estado],
      clienteLabel(contrato.cliente),
      contrato.equipo?.numeroSerie ?? "",
      formatDate(contrato.fechaInicio),
      formatDate(contrato.fechaFinPrevista),
      contrato.mesesPlazo,
      contrato.copiasIncluidasMes,
      contrato.precioMensual,
      contrato.precioCopiaExcedente,
      contrato.depositoGarantia,
    ]
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );

  const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `alquileres-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success("Alquileres exportados");
}

// ── Highlighted Text helper ──────────────────────────────────────────────────

interface HighlightedTextProps {
  text: string;
  search: string;
}

function HighlightedText({ text, search }: HighlightedTextProps) {
  if (!search || !search.trim()) {
    return <>{text}</>;
  }

  const escapedSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedSearch})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="rounded bg-[var(--accent)]/18 px-0.5 font-semibold text-foreground dark:bg-[var(--accent)]/24"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function AlquileresPage() {
  const isMobile = useIsMobile();
  const params = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [draftEstado, setDraftEstado] = useState<string>("all");
  const [newOpen, setNewOpen] = useState(() => params.get("nuevo") === "1");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      estado:
        estadoFilter !== "all"
          ? (estadoFilter as EstadoContratoAlquiler)
          : undefined,
    }),
    [page, limit, debouncedSearch, estadoFilter],
  );

  const { data, isLoading, isError, refetch } = useAlquileres(filters);
  const { data: totalData } = useAlquileres({ limit: 1 });
  const { data: borradoresData } = useAlquileres({
    limit: 1,
    estado: EstadoContratoAlquiler.BORRADOR,
  });
  const { data: activosData } = useAlquileres({
    limit: 1,
    estado: EstadoContratoAlquiler.ACTIVO,
  });
  const { data: finalizadosData } = useAlquileres({
    limit: 1,
    estado: EstadoContratoAlquiler.FINALIZADO,
  });
  const { data: cerradosData } = useAlquileres({
    limit: 1,
    estado: EstadoContratoAlquiler.CERRADO,
  });

  const deleteRecord = useDeleteAlquiler(deleteId ?? "");
  const rows = data?.data ?? [];

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  }, []);

  const handleEstadoChange = useCallback((value: string) => {
    setEstadoFilter(value);
    setPage(1);
  }, []);

  const openFiltrosPopover = useCallback(
    (open: boolean) => {
      setFiltrosOpen(open);
      if (open) setDraftEstado(estadoFilter);
    },
    [estadoFilter],
  );

  const applyFiltros = useCallback(() => {
    setEstadoFilter(draftEstado);
    setPage(1);
    setFiltrosOpen(false);
  }, [draftEstado]);

  const clearFiltros = useCallback(() => {
    setDraftEstado("all");
    setEstadoFilter("all");
    setPage(1);
    setFiltrosOpen(false);
  }, []);

  const handleCancelDraft = useCallback(() => {
    if (!deleteId) return;
    deleteRecord.mutate(
      undefined,
      {
        onSuccess: () => {
          toast.success("Registro eliminado");
          setDeleteId(null);
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }, [deleteRecord, deleteId]);

  const activeFilterCount = estadoFilter !== "all" ? 1 : 0;

  const columns = useMemo<ColumnDef<ContratoAlquilerListItem>[]>(
    () => [
      {
        accessorKey: "numero",
        header: "Contrato",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-medium">
              <HighlightedText text={row.original.numero} search={search} />
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(row.original.fechaInicio)}
            </span>
          </div>
        ),
      },
      {
        id: "cliente",
        header: "Cliente",
        cell: ({ row }) => {
          const label = clienteLabel(row.original.cliente);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm shadow-orange-500/30 dark:shadow-orange-500/40 font-bold text-[10px]"
                aria-hidden
              >
                {label.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex flex-col min-w-0">
                <span
                  className="block max-w-64 sm:max-w-xs md:max-w-md break-words whitespace-normal font-semibold text-sm leading-snug text-foreground"
                  title={label}
                >
                  <HighlightedText text={label} search={search} />
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "equipo",
        header: "Equipo",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 dark:shadow-emerald-500/40"
              aria-hidden
            >
              <ShieldCheck className="size-4" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-xs text-foreground font-semibold">
                <HighlightedText
                  text={row.original.equipo?.numeroSerie ?? "—"}
                  search={search}
                />
              </span>
              <span
                className="truncate text-xs text-muted-foreground"
                title={row.original.equipo?.producto?.nombre ?? ""}
              >
                <HighlightedText
                  text={row.original.equipo?.producto?.nombre ?? "Equipo"}
                  search={search}
                />
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "mesesPlazo",
        header: "Periodo",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.mesesPlazo} meses</span>
        ),
      },
      {
        accessorKey: "precioMensual",
        header: "Mensual",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-foreground font-semibold">
            {money(row.original.precioMensual)}
          </span>
        ),
      },
      {
        accessorKey: "copiasIncluidasMes",
        header: "Copias",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.copiasIncluidasMes.toLocaleString("es-PE")}
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const statusTones: Record<EstadoContratoAlquiler, ErpBadgeTone> = {
            [EstadoContratoAlquiler.BORRADOR]: "neutral",
            [EstadoContratoAlquiler.RESERVADO]: "warning",
            [EstadoContratoAlquiler.PENDIENTE_ENTREGA]: "warning",
            [EstadoContratoAlquiler.ACTIVO]: "success",
            [EstadoContratoAlquiler.EN_RETORNO]: "warning",
            [EstadoContratoAlquiler.FINALIZADO]: "info",
            [EstadoContratoAlquiler.CERRADO]: "info",
            [EstadoContratoAlquiler.CANCELADO]: "danger",
          };
          return (
            <ErpBadge
              tone={statusTones[row.original.estado]}
              className="whitespace-nowrap"
            >
              {CONTRATO_LABELS[row.original.estado]}
            </ErpBadge>
          );
        },
      },
      {
        id: "acciones",
        header: "",
        enableHiding: false,
        size: 120,
        cell: ({ row }) => {
          const contrato = row.original;
          const isDraft = contrato.estado === EstadoContratoAlquiler.BORRADOR;
          const isActive = contrato.estado === EstadoContratoAlquiler.ACTIVO;
          const canDelete = !isActive;

          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Link href={`/alquileres/${contrato.id}`}>
                  <Eye className="size-3.5" />
                  Ver detalle
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Acciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuGroup>
                    {isDraft && (
                      <DropdownMenuItem asChild>
                        <Link href={`/alquileres/${contrato.id}`}>
                          <Pencil className="size-4" />
                          Editar contrato
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isDraft && (
                      <DropdownMenuItem asChild>
                        <Link href={`/alquileres/${contrato.id}`}>
                          <CheckCircle2 className="size-4" />
                          Activar contrato
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(contrato.id)}
                        >
                          <Trash2 className="size-4" />
                          Eliminar registro
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [search],
  );

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative backing glows — coordinated with oklch themes */}
      <div className="pointer-events-none absolute -z-10 bg-orange-400/8 dark:bg-orange-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-amber-400/6 dark:bg-amber-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-red-400/5 dark:bg-red-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />

      {/* Topbar page action slot */}
      <TopbarActions>
        <RealtimeStatus />

        <Button
          onClick={() => setNewOpen(true)}
          className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nuevo alquiler</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </TopbarActions>

      <h1 className="sr-only">Alquileres</h1>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total alquileres"
          value={totalData?.meta?.total}
          icon={ClipboardList}
          theme="slate"
          subtitle="Registrados"
        />
        <StatCard
          label="Borradores"
          value={borradoresData?.meta?.total}
          icon={Pencil}
          theme="violet"
          subtitle="Por activar"
        />
        <StatCard
          label="Activos"
          value={activosData?.meta?.total}
          icon={CheckCircle2}
          theme="emerald"
          subtitle="En vigencia"
        />
        <StatCard
          label="Cerrados"
          value={(finalizadosData?.meta?.total ?? 0) + (cerradosData?.meta?.total ?? 0)}
          icon={CalendarClock}
          theme="amber"
          subtitle="Finalizados"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por contrato, cliente o serie…"
            className="sm:w-80 lg:w-96"
            inputClassName="border-border bg-background hover:border-orange-400/60 dark:hover:border-orange-500/60 focus-visible:border-orange-500 dark:focus-visible:border-orange-400 focus-visible:ring-orange-400/25 dark:focus-visible:ring-orange-500/25 shadow-sm"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Tabs value={estadoFilter} onValueChange={handleEstadoChange}>
              <TabsList className="flex h-9 gap-0.5 rounded-lg border border-border/70 bg-muted/70 p-0.5">
                <TabsTrigger
                  value="all"
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-orange-500/30 dark:data-[state=active]:bg-orange-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  Todos
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoContratoAlquiler.BORRADOR}
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-violet-500/30 dark:data-[state=active]:bg-violet-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  Borrador
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoContratoAlquiler.ACTIVO}
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 dark:data-[state=active]:bg-emerald-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  Activo
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoContratoAlquiler.CERRADO}
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 dark:data-[state=active]:bg-amber-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  Cerrado
                </TabsTrigger>
                <TabsTrigger
                  value={EstadoContratoAlquiler.CANCELADO}
                  className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-red-500/30 dark:data-[state=active]:bg-red-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
                >
                  Cancelado
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Popover open={filtrosOpen} onOpenChange={openFiltrosPopover}>
              <PopoverTrigger asChild>
                <ToolbarFiltersButton
                  open={filtrosOpen}
                  activeCount={activeFilterCount}
                />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-[calc(100vw-2rem)] sm:w-[480px] max-w-lg rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">
                    Refina la lista visible de contratos de alquiler
                  </p>
                </div>
                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Estado del contrato
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { value: "all", label: "Todos" },
                        { value: EstadoContratoAlquiler.BORRADOR, label: "Borrador" },
                        { value: EstadoContratoAlquiler.ACTIVO, label: "Activo" },
                        { value: EstadoContratoAlquiler.CERRADO, label: "Cerrado" },
                        { value: EstadoContratoAlquiler.CANCELADO, label: "Cancelado" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.01] active:scale-[0.97] active:duration-150",
                            draftEstado === option.value
                              ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-foreground"
                              : "border-border/60 bg-background hover:bg-muted/40",
                          )}
                          onClick={() => setDraftEstado(option.value)}
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border transition-colors",
                              draftEstado === option.value
                                ? "border-[var(--accent)]"
                                : "border-muted-foreground/40",
                            )}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full transition-colors",
                                draftEstado === option.value
                                  ? "bg-[var(--accent)]"
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
                      className="h-8 rounded-lg text-xs text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted active:scale-95 active:duration-150"
                      onClick={clearFiltros}
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-lg text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                      onClick={applyFiltros}
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

      <ServerDataTable
        columns={columns}
        data={rows}
        total={data?.meta?.total ?? 0}
        page={page}
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        errorMessage="No se pudo cargar la lista de alquileres."
        onRetry={() => void refetch()}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        enableColumnVisibility
        columnVisibilityStorageKey="erp:alquileres:table-columns"
        fillAvailableHeight={!isMobile}
      />

      <NuevoContratoDialog open={newOpen} onOpenChange={setNewOpen} />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent className="w-full rounded-2xl sm:max-w-md">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(null)}
            className="absolute right-4 top-4 size-6 border-0 text-muted-foreground hover:bg-muted mt-0 z-10 transition-all duration-200 ease-out hover:scale-105 active:scale-95"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="text-destructive size-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <AlertDialogTitle>Eliminar registro</AlertDialogTitle>
              <AlertDialogDescription>
                Esto elimina el contrato de alquiler de la base de datos. No revierte stock, caja ni movimientos ya registrados.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end w-full">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl mt-0 border-border/80 hover:bg-muted transition-all duration-200 ease-out active:scale-95">
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelDraft}
              disabled={deleteRecord.isPending}
              className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-95"
            >
              Eliminar registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NuevoContratoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const params = useSearchParams();
  const clientes = useClientes({ limit: 100, activo: true });
  const equipos = useEquipos({
    limit: 100,
    estadoComercial: EstadoComercialEquipo.DISPONIBLE,
  });
  const create = useCreateAlquiler();
  const [form, setForm] = useState({
    clienteId: params.get("clienteId") ?? "",
    equipoId: params.get("equipoId") ?? "",
    fechaInicio: new Date().toISOString().slice(0, 10),
    mesesPlazo: "6",
    copiasIncluidasMes: "10000",
    precioMensual: "800",
    depositoGarantia: "0",
    contadorManual: "",
    notes: "",
  });

  const equiposData = equipos.data?.data ?? [];
  const selectedEquipo = equiposData.find((equipo) => equipo.id === form.equipoId);
  const contadorActualEquipo = selectedEquipo?.contadorActual ?? null;
  const requiereContadorManual = form.equipoId !== "" && contadorActualEquipo == null;
  const contadorVisible =
    contadorActualEquipo != null ? String(contadorActualEquipo) : form.contadorManual;
  const precioMensual = Number(form.precioMensual);
  const copiasIncluidasMes = Number(form.copiasIncluidasMes);
  const precioCopiaExcedente =
    Number.isFinite(precioMensual) &&
    Number.isFinite(copiasIncluidasMes) &&
    copiasIncluidasMes > 0
      ? precioMensual / copiasIncluidasMes
      : 0;
  const precioCopiaExcedenteLabel = formatUnitPrice(precioCopiaExcedente);

  const clienteOptions =
    clientes.data?.data.map((cliente) => ({
      value: cliente.id,
      label:
        cliente.razonSocial ||
        [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
        "Cliente",
    })) ?? [];
  const equipoOptions =
    equiposData.map((equipo) => ({
      value: equipo.id,
      label: `${equipo.numeroSerie} · ${equipo.producto.nombre}`,
    })) ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contadorInicio =
      contadorActualEquipo != null
        ? contadorActualEquipo
        : form.contadorManual
          ? Number(form.contadorManual)
          : undefined;

    if (requiereContadorManual && contadorInicio == null) {
      toast.error("El equipo no tiene contador actual. Ingresa la lectura inicial.");
      return;
    }
    if (copiasIncluidasMes <= 0) {
      toast.error("Las copias incluidas al mes deben ser mayores a 0.");
      return;
    }

    try {
      await create.mutateAsync({
        clienteId: form.clienteId,
        equipoId: form.equipoId,
        fechaInicio: form.fechaInicio,
        mesesPlazo: Number(form.mesesPlazo),
        copiasIncluidasMes: Number(form.copiasIncluidasMes),
        precioMensual: Number(form.precioMensual),
        precioCopiaExcedente,
        depositoGarantia: Number(form.depositoGarantia || 0),
        contadorInicio,
        notas: form.notes || undefined,
      });
      toast.success("Contrato de alquiler creado");
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-4xl flex max-h-[90vh] w-full flex-col rounded-3xl border border-border/60 bg-background shadow-2xl data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
        <DialogHeader className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-500/25">
              <ClipboardList className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold">
                Nuevo alquiler
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                El contador inicial se toma del contador actual del equipo. Solo se ingresa manualmente si el equipo no tiene contador registrado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            <FieldGroup className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel>Cliente</FieldLabel>
                <SearchableSelect
                  value={form.clienteId}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, clienteId: value }))
                  }
                  options={clienteOptions}
                  placeholder="Selecciona cliente"
                  searchPlaceholder="Buscar cliente"
                  emptyLabel="Sin clientes"
                  ariaLabel="Cliente"
                />
              </Field>
              <Field>
                <FieldLabel>Equipo disponible</FieldLabel>
                <SearchableSelect
                  value={form.equipoId}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      equipoId: value,
                      contadorManual: "",
                    }))
                  }
                  options={equipoOptions}
                  placeholder="Selecciona equipo"
                  searchPlaceholder="Buscar serie"
                  emptyLabel="Sin equipos disponibles"
                  ariaLabel="Equipo"
                />
              </Field>
              <Field>
                <FieldLabel>Contador inicial</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={contadorVisible}
                  disabled={contadorActualEquipo != null}
                  required={requiereContadorManual}
                  placeholder={
                    form.equipoId ? "Ingresa lectura inicial" : "Selecciona equipo"
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contadorManual: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {contadorActualEquipo != null
                    ? "Tomado del equipo. No se edita en este formulario."
                    : "Sin contador actual: esta lectura será la base del contrato."}
                </p>
              </Field>
              <Field>
                <FieldLabel>Fecha inicio</FieldLabel>
                <Input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fechaInicio: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Plazo en meses</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={36}
                  value={form.mesesPlazo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mesesPlazo: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Copias incluidas al mes</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={form.copiasIncluidasMes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      copiasIncluidasMes: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Precio mensual</FieldLabel>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.precioMensual}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      precioMensual: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Precio por copia excedente</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={precioCopiaExcedenteLabel}
                  readOnly
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Calculado como precio mensual / copias incluidas al mes.
                </p>
              </Field>
              <Field>
                <FieldLabel>Depósito de garantía</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.depositoGarantia}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      depositoGarantia: event.target.value,
                    }))
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Dinero reembolsable o aplicable a deuda/daños al cierre. Déjalo
                  en 0 si no retendrás garantía económica.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        depositoGarantia: current.precioMensual || "0",
                      }))
                    }
                  >
                    Usar mensualidad
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        depositoGarantia: "0",
                      }))
                    }
                  >
                    Sin depósito
                  </Button>
                </div>
              </Field>
            </FieldGroup>
            <Field className="mt-4">
              <FieldLabel>Notas</FieldLabel>
              <Textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter className="border-t p-4 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending} className="rounded-xl">
              {create.isPending ? <Loader2 className="animate-spin size-4 mr-2" /> : <Plus className="size-4 mr-2" />}
              Crear contrato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
