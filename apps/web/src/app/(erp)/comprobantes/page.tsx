"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TipoDocumento } from "@erp/shared";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ComprobantesTable } from "./_components/comprobantes-table";
import { ComunicacionesBajaTable } from "./_components/comunicaciones-baja-table";
import { PorEmitirTable } from "./_components/por-emitir-table";

type ComprobantesTab =
  | "por-emitir"
  | "facturas"
  | "boletas"
  | "notas-credito"
  | "notas-debito"
  | "bajas";

const TAB_VALUES: readonly ComprobantesTab[] = [
  "por-emitir",
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

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative backing glows */}
      <div className="pointer-events-none absolute -z-10 bg-indigo-400/7 dark:bg-indigo-500/7 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-sky-400/5 dark:bg-sky-500/5 blur-[130px] bottom-1/4 right-12 size-[380px] rounded-full" />
      <h1 className="sr-only">Comprobantes</h1>

    <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
      <TabsList className="grid w-full grid-cols-2 rounded-xl border border-border/70 bg-muted/70 p-0.5 lg:grid-cols-6">
        <TabsTrigger value="por-emitir" className="rounded-lg text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">Por emitir</TabsTrigger>
        <TabsTrigger value="facturas" className="rounded-lg text-xs data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">Facturas</TabsTrigger>
        <TabsTrigger value="boletas" className="rounded-lg text-xs data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-sky-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">Boletas</TabsTrigger>
        <TabsTrigger value="notas-credito" className="rounded-lg text-xs data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">Notas crédito</TabsTrigger>
        <TabsTrigger value="notas-debito" className="rounded-lg text-xs data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-rose-500/30 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">Notas débito</TabsTrigger>
        <TabsTrigger value="bajas" className="rounded-lg text-xs data-[state=active]:bg-slate-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">Com. baja</TabsTrigger>
      </TabsList>

      <TabsContent value="por-emitir" className="mt-4">
        <PorEmitirTable />
      </TabsContent>
      <TabsContent value="facturas" className="mt-4">
        <ComprobantesTable tipo={TipoDocumento.FACTURA} />
      </TabsContent>
      <TabsContent value="boletas" className="mt-4">
        <ComprobantesTable tipo={TipoDocumento.BOLETA} />
      </TabsContent>
      <TabsContent value="notas-credito" className="mt-4">
        <ComprobantesTable tipo={TipoDocumento.NOTA_CREDITO} />
      </TabsContent>
      <TabsContent value="notas-debito" className="mt-4">
        <ComprobantesTable tipo={TipoDocumento.NOTA_DEBITO} />
      </TabsContent>
      <TabsContent value="bajas" className="mt-4">
        <ComunicacionesBajaTable />
      </TabsContent>
    </Tabs>
    </div>
  );
}
