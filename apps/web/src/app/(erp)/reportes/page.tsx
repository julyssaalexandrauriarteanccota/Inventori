"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RolUsuario } from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ReporteInventarioTab from "./_components/inventario-report";
import ReporteResumenTab from "./_components/resumen-report";
import ReporteSoporteTab from "./_components/soporte-report";
import ReporteVentasTab from "./_components/ventas-report";

type ReportesTab = "resumen" | "ventas" | "inventario" | "soporte";

const TAB_VALUES: readonly ReportesTab[] = [
  "resumen",
  "ventas",
  "inventario",
  "soporte",
] as const;

const DEFAULT_TAB: ReportesTab = "resumen";

function isReportesTab(value: string | null): value is ReportesTab {
  return !!value && (TAB_VALUES as readonly string[]).includes(value);
}

export default function ReportesHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();

  const canViewFinancials = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);

  const activeTab = useMemo<ReportesTab>(() => {
    const raw = searchParams.get("tab");
    return isReportesTab(raw) ? raw : DEFAULT_TAB;
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
      router.replace(query ? `/reportes?${query}` : "/reportes");
    },
    [router, searchParams],
  );

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col gap-4">
      {/* Decorative backing glows — coordinated with premium themes */}
      <div className="pointer-events-none absolute -z-10 bg-indigo-400/8 dark:bg-indigo-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-sky-400/6 dark:bg-sky-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-violet-400/5 dark:bg-violet-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />

      <p className="text-sm text-muted-foreground">
        Indicadores y métricas del sistema
      </p>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
        <TabsList className="grid w-full grid-cols-2 sm:flex sm:w-auto h-10 gap-0.5 rounded-xl border border-border/70 bg-muted/70 p-0.5">
          <TabsTrigger
            value="resumen"
            className="h-9 shrink-0 rounded-lg px-4 text-xs text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
          >
            Resumen
          </TabsTrigger>
          {canViewFinancials && (
            <TabsTrigger
              value="ventas"
              className="h-9 shrink-0 rounded-lg px-4 text-xs text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              Ventas
            </TabsTrigger>
          )}
          {canViewFinancials && (
            <TabsTrigger
              value="inventario"
              className="h-9 shrink-0 rounded-lg px-4 text-xs text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              Inventario
            </TabsTrigger>
          )}
          <TabsTrigger
            value="soporte"
            className="h-9 shrink-0 rounded-lg px-4 text-xs text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30 dark:data-[state=active]:bg-indigo-500 data-[state=active]:font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground hover:scale-[1.02] active:scale-95 active:duration-150"
          >
            Soporte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <ReporteResumenTab />
        </TabsContent>
        {canViewFinancials && (
          <TabsContent value="ventas" className="mt-4">
            <ReporteVentasTab />
          </TabsContent>
        )}
        {canViewFinancials && (
          <TabsContent value="inventario" className="mt-4">
            <ReporteInventarioTab />
          </TabsContent>
        )}
        <TabsContent value="soporte" className="mt-4">
          <ReporteSoporteTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
