"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronDown,
  FileMinus,
  FilePlus,
  FileText,
  Hourglass,
  Plus,
  Receipt,
  ScrollText,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { ToolbarSearchInput } from "@/components/layout/toolbar-search-input";
import {
  EstadoComprobante,
  TipoDocumento,
  type PropositoElegibilidadComprobante,
} from "@erp/shared";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { BuscarComprobanteOrigenModal } from "@/components/modals/buscar-comprobante-origen-modal";
import { useComprobantes, useVentasPendientesFacturacion } from "@/hooks/use-facturacion";

import { ComprobantesTable } from "./_components/comprobantes-table";
import { ComunicacionesBajaTable } from "./_components/comunicaciones-baja-table";
import { PorEmitirTable } from "./_components/por-emitir-table";

type ComprobantesTab =
  | "todos"
  | "por-emitir"
  | "facturas"
  | "boletas"
  | "notas-credito"
  | "notas-debito"
  | "bajas";

const TAB_VALUES: readonly ComprobantesTab[] = [
  "todos",
  "por-emitir",
  "facturas",
  "boletas",
  "notas-credito",
  "notas-debito",
  "bajas",
] as const;

const DEFAULT_TAB: ComprobantesTab = "todos";

function isComprobantesTab(value: string | null): value is ComprobantesTab {
  return !!value && (TAB_VALUES as readonly string[]).includes(value);
}

export default function ComprobantesHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  // Modal de búsqueda de comprobante origen para NC/ND/Baja
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [buscarProposito, setBuscarProposito] =
    useState<PropositoElegibilidadComprobante>("nc");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const activeTab = useMemo<ComprobantesTab>(() => {
    const raw = searchParams.get("tab");
    return isComprobantesTab(raw) ? raw : DEFAULT_TAB;
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      setSearch("");
      const next = new URLSearchParams(searchParams.toString());
      if (value === DEFAULT_TAB) {
        next.delete("tab");
      } else {
        next.set("tab", value);
      }
      const query = next.toString();
      router.replace(query ? `/comprobantes?${query}` : "/comprobantes");
    },
    [router, searchParams],
  );

  const abrirBuscar = useCallback(
    (proposito: PropositoElegibilidadComprobante) => {
      setBuscarProposito(proposito);
      setBuscarOpen(true);
    },
    [],
  );

  // Stats (4 cards) — pedimos solo meta.total con limit=1 para cada filtro
  const statsTotal = useComprobantes({ limit: 1 });
  const statsAceptados = useComprobantes({
    limit: 1,
    estado: EstadoComprobante.ACEPTADO,
  });
  const statsRechazados = useComprobantes({
    limit: 1,
    estado: EstadoComprobante.RECHAZADO,
  });
  const statsPorEmitir = useVentasPendientesFacturacion({ limit: 1 });

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative glows — paleta indigo/sky para diferenciar de clientes */}
      <div className="pointer-events-none absolute -z-10 bg-indigo-400/8 dark:bg-indigo-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-sky-400/6 dark:bg-sky-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-rose-400/5 dark:bg-rose-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />

      {/* CTA en topbar: WS realtime + dropdown 'Nuevo' con NC/ND/Baja */}
      <TopbarActions>
        <RealtimeStatus />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nuevo</span>
              <ChevronDown className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => abrirBuscar("nc")}>
              <FilePlus className="size-4 text-emerald-600 dark:text-emerald-400" />
              Nueva nota de crédito
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => abrirBuscar("nd")}>
              <FileMinus className="size-4 text-rose-600 dark:text-rose-400" />
              Nueva nota de débito
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => abrirBuscar("baja")}>
              <Ban className="size-4 text-slate-600 dark:text-slate-400" />
              Comunicar baja
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TopbarActions>

      <h1 className="sr-only">Comprobantes</h1>

      {/* Stats row (4 cards) */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
        <StatCard
          label="Total emitidos"
          value={statsTotal.data?.meta?.total}
          icon={FileText}
          theme="indigo"
          subtitle="Comprobantes registrados"
          isLoading={statsTotal.isLoading}
        />
        <StatCard
          label="Aceptados"
          value={statsAceptados.data?.meta?.total}
          icon={CheckCircle2}
          theme="emerald"
          subtitle="Estado SUNAT OK"
          isLoading={statsAceptados.isLoading}
        />
        <StatCard
          label="Rechazados"
          value={statsRechazados.data?.meta?.total}
          icon={AlertCircle}
          theme="rose"
          subtitle="Requieren revisión"
          isLoading={statsRechazados.isLoading}
        />
        <StatCard
          label="Por emitir"
          value={statsPorEmitir.data?.meta?.total}
          icon={Hourglass}
          theme="amber"
          subtitle="Ventas pendientes"
          isLoading={statsPorEmitir.isLoading}
        />
      </div>

      {/* Toolbar — search inline-left of scrollable tabs */}
      <div className="flex flex-col gap-2.5 w-full min-w-0 shrink-0">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <ToolbarSearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              activeTab === "por-emitir"
                ? "Buscar por venta o cliente…"
                : activeTab === "bajas"
                  ? "Buscar por identificador o número…"
                  : "Buscar por número, serie o cliente…"
            }
            className="w-full sm:w-72 lg:w-80 shrink-0"
          />
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex-1 min-w-0"
          >
            <TabsList className="scrollbar-none h-9 gap-0.5 overflow-x-auto rounded-lg border border-border/70 bg-muted/70 p-0.5 w-full justify-start">
              <TabsTrigger
                value="todos"
                className="flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <FileText className="size-3.5" />
                <span>Todos</span>
              </TabsTrigger>
              <TabsTrigger
                value="por-emitir"
                className="flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Hourglass className="size-3.5" />
                <span>Por emitir</span>
              </TabsTrigger>
              <TabsTrigger
                value="facturas"
                className="flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Receipt className="size-3.5" />
                <span>Facturas</span>
              </TabsTrigger>
              <TabsTrigger
                value="boletas"
                className="flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 dark:data-[state=active]:bg-sky-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <ScrollText className="size-3.5" />
                <span>Boletas</span>
              </TabsTrigger>
              <TabsTrigger
                value="notas-credito"
                className="flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <FilePlus className="size-3.5" />
                <span>Notas crédito</span>
              </TabsTrigger>
              <TabsTrigger
                value="notas-debito"
                className="flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-rose-500/30 dark:data-[state=active]:bg-rose-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <FileMinus className="size-3.5" />
                <span>Notas débito</span>
              </TabsTrigger>
              <TabsTrigger
                value="bajas"
                className="flex-none shrink-0 h-8 gap-1.5 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-slate-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-slate-500/30 dark:data-[state=active]:bg-slate-500 dark:data-[state=active]:text-white data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
              >
                <Ban className="size-3.5" />
                <span>Com. baja</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Table content — direct render, no TabsContent → no layout shifts */}
      <div className="w-full min-w-0 sm:flex-1 sm:min-h-0 sm:flex sm:flex-col">
        {activeTab === "todos" && (
          <ComprobantesTable search={debouncedSearch} storageKey="erp:comprobantes:todos" fillAvailableHeight={!isMobile} />
        )}
        {activeTab === "por-emitir" && (
          <PorEmitirTable search={debouncedSearch} fillAvailableHeight={!isMobile} />
        )}
        {activeTab === "facturas" && (
          <ComprobantesTable search={debouncedSearch} tipo={TipoDocumento.FACTURA} fillAvailableHeight={!isMobile} />
        )}
        {activeTab === "boletas" && (
          <ComprobantesTable search={debouncedSearch} tipo={TipoDocumento.BOLETA} fillAvailableHeight={!isMobile} />
        )}
        {activeTab === "notas-credito" && (
          <ComprobantesTable search={debouncedSearch} tipo={TipoDocumento.NOTA_CREDITO} fillAvailableHeight={!isMobile} />
        )}
        {activeTab === "notas-debito" && (
          <ComprobantesTable search={debouncedSearch} tipo={TipoDocumento.NOTA_DEBITO} fillAvailableHeight={!isMobile} />
        )}
        {activeTab === "bajas" && (
          <ComunicacionesBajaTable search={debouncedSearch} fillAvailableHeight={!isMobile} />
        )}
      </div>

      <BuscarComprobanteOrigenModal
        open={buscarOpen}
        onOpenChange={setBuscarOpen}
        proposito={buscarProposito}
      />
    </div>
  );
}
