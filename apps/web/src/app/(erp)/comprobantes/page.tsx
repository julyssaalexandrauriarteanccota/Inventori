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
} from "lucide-react";
import {
  EstadoComprobante,
  TipoDocumento,
  type PropositoElegibilidadComprobante,
} from "@erp/shared";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  | "por-emitir"
  | "todos"
  | "facturas"
  | "boletas"
  | "notas-credito"
  | "notas-debito"
  | "bajas";

const TAB_VALUES: readonly ComprobantesTab[] = [
  "por-emitir",
  "todos",
  "facturas",
  "boletas",
  "notas-credito",
  "notas-debito",
  "bajas",
] as const;

const DEFAULT_TAB: ComprobantesTab = "por-emitir";

function isComprobantesTab(value: string | null): value is ComprobantesTab {
  return !!value && (TAB_VALUES as readonly string[]).includes(value);
}

export default function ComprobantesHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Modal de búsqueda de comprobante origen para NC/ND/Baja
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [buscarProposito, setBuscarProposito] =
    useState<PropositoElegibilidadComprobante>("nc");

  const activeTab = useMemo<ComprobantesTab>(() => {
    const raw = searchParams.get("tab");
    return isComprobantesTab(raw) ? raw : DEFAULT_TAB;
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
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
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
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

      {/* Tabs + tabla */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
        <TabsList className="grid w-full grid-cols-2 min-[500px]:grid-cols-4 lg:grid-cols-7 h-auto gap-0.5 rounded-xl border border-border/70 bg-muted/70 p-0.5">
          <TabsTrigger
            value="por-emitir"
            className="h-9 rounded-lg gap-1.5 text-xs text-muted-foreground data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95"
          >
            <Hourglass className="size-3.5" />
            <span className="hidden min-[500px]:inline">Por emitir</span>
          </TabsTrigger>
          <TabsTrigger
            value="todos"
            className="h-9 rounded-lg gap-1.5 text-xs text-muted-foreground data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-violet-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95"
          >
            <FileText className="size-3.5" />
            <span className="hidden min-[500px]:inline">Todos</span>
          </TabsTrigger>
          <TabsTrigger
            value="facturas"
            className="h-9 rounded-lg text-xs text-muted-foreground data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95"
          >
            Facturas
          </TabsTrigger>
          <TabsTrigger
            value="boletas"
            className="h-9 rounded-lg text-xs text-muted-foreground data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95"
          >
            Boletas
          </TabsTrigger>
          <TabsTrigger
            value="notas-credito"
            className="h-9 rounded-lg text-xs text-muted-foreground data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95"
          >
            <span className="hidden sm:inline">Notas crédito</span>
            <span className="sm:hidden">NC</span>
          </TabsTrigger>
          <TabsTrigger
            value="notas-debito"
            className="h-9 rounded-lg text-xs text-muted-foreground data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-rose-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95"
          >
            <span className="hidden sm:inline">Notas débito</span>
            <span className="sm:hidden">ND</span>
          </TabsTrigger>
          <TabsTrigger
            value="bajas"
            className="h-9 rounded-lg text-xs text-muted-foreground data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95"
          >
            <span className="hidden sm:inline">Com. baja</span>
            <span className="sm:hidden">Bajas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="por-emitir" className="mt-2">
          <PorEmitirTable />
        </TabsContent>
        <TabsContent value="todos" className="mt-2">
          <ComprobantesTable storageKey="erp:comprobantes:todos" />
        </TabsContent>
        <TabsContent value="facturas" className="mt-2">
          <ComprobantesTable tipo={TipoDocumento.FACTURA} />
        </TabsContent>
        <TabsContent value="boletas" className="mt-2">
          <ComprobantesTable tipo={TipoDocumento.BOLETA} />
        </TabsContent>
        <TabsContent value="notas-credito" className="mt-2">
          <ComprobantesTable tipo={TipoDocumento.NOTA_CREDITO} />
        </TabsContent>
        <TabsContent value="notas-debito" className="mt-2">
          <ComprobantesTable tipo={TipoDocumento.NOTA_DEBITO} />
        </TabsContent>
        <TabsContent value="bajas" className="mt-2">
          <ComunicacionesBajaTable />
        </TabsContent>
      </Tabs>

      <BuscarComprobanteOrigenModal
        open={buscarOpen}
        onOpenChange={setBuscarOpen}
        proposito={buscarProposito}
      />
    </div>
  );
}
