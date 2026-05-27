"use client";

import { AlertTriangle, ShoppingCart, Ticket, Users } from "lucide-react";
import { RolUsuario } from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import { useDashboardKpis } from "@/hooks/use-configuracion";
import { StatCard } from "@/components/layout/stat-card";

function formatCurrency(amount: number) {
  return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReporteResumenTab() {
  const { hasRole } = useAuth();
  const { data, isLoading, isError } = useDashboardKpis();

  const kpis = data?.data;
  const canViewFinancials = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);

  if (isError) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-3 size-8 text-destructive/50" />
        <p className="text-sm text-muted-foreground">
          No se pudieron cargar los indicadores. Intenta recargar la página.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Este mes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canViewFinancials && (
            <StatCard
              label="Ventas del mes"
              value={
                isLoading || !kpis
                  ? undefined
                  : formatCurrency(kpis.ventasMes.totalMonto)
              }
              subtitle={
                isLoading || !kpis
                  ? undefined
                  : `${kpis.ventasMes.cantidad} ${kpis.ventasMes.cantidad === 1 ? "venta" : "ventas"} registrada${kpis.ventasMes.cantidad !== 1 ? "s" : ""}`
              }
              icon={ShoppingCart}
              theme="emerald"
              isLoading={isLoading}
            />
          )}

          <StatCard
            label="Tickets abiertos"
            value={isLoading || !kpis ? undefined : String(kpis.tickets.abiertos)}
            subtitle={
              isLoading || !kpis
                ? undefined
                : `${kpis.tickets.cerradosMes} cerrado${kpis.tickets.cerradosMes !== 1 ? "s" : ""} este mes`
            }
            icon={Ticket}
            theme="amber"
            isLoading={isLoading}
          />

          {canViewFinancials && (
            <StatCard
              label="Alertas de stock"
              value={
                isLoading || !kpis
                  ? undefined
                  : String(kpis.alertasStockPendientes)
              }
              subtitle={
                isLoading || !kpis
                  ? undefined
                  : kpis.alertasStockPendientes === 1
                    ? "1 producto bajo mínimo"
                    : `${kpis.alertasStockPendientes} productos bajo mínimo`
              }
              icon={AlertTriangle}
              theme="red"
              isLoading={isLoading}
              className={
                kpis && kpis.alertasStockPendientes > 0
                  ? "animate-pulse shadow-md shadow-red-500/5 ring-1 ring-red-500/20"
                  : ""
              }
            />
          )}

          {canViewFinancials && (
            <StatCard
              label="Clientes nuevos"
              value={isLoading || !kpis ? undefined : String(kpis.clientesNuevosMes)}
              subtitle={
                isLoading || !kpis
                  ? undefined
                  : `${kpis.clientesNuevosMes} ${kpis.clientesNuevosMes === 1 ? "cliente registrado" : "clientes registrados"}`
              }
              icon={Users}
              theme="indigo"
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
