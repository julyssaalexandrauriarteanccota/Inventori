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
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Indicadores y métricas del sistema
      </p>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl lg:grid-cols-4">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          {canViewFinancials && (
            <TabsTrigger value="ventas">Ventas</TabsTrigger>
          )}
          {canViewFinancials && (
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
          )}
          <TabsTrigger value="soporte">Soporte</TabsTrigger>
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
