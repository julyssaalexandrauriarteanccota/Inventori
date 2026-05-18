"use client";

import { AlertTriangle, ShoppingCart, Ticket, Users } from "lucide-react";
import { RolUsuario } from "@erp/shared";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardKpis } from "@/hooks/use-configuracion";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
  isLoading: boolean;
  index?: number;
}

function KpiCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  isLoading,
  index = 0,
}: KpiCardProps) {
  if (isLoading) return <KpiCardSkeleton />;
  return (
    <div
      className="group flex animate-fade-up items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-all duration-200"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
          accent,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs leading-tight text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold leading-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

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
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
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
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Este mes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canViewFinancials && (
            <KpiCard
              title="Ventas del mes"
              value={
                isLoading || !kpis
                  ? "--"
                  : formatCurrency(kpis.ventasMes.totalMonto)
              }
              subtitle={
                isLoading || !kpis
                  ? "Cargando..."
                  : `${kpis.ventasMes.cantidad} ${kpis.ventasMes.cantidad === 1 ? "venta" : "ventas"} registradas`
              }
              icon={ShoppingCart}
              accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
              isLoading={isLoading}
              index={0}
            />
          )}

          <KpiCard
            title="Tickets abiertos"
            value={isLoading || !kpis ? "--" : String(kpis.tickets.abiertos)}
            subtitle={
              isLoading || !kpis
                ? "Cargando..."
                : `${kpis.tickets.cerradosMes} cerrado${kpis.tickets.cerradosMes !== 1 ? "s" : ""} este mes`
            }
            icon={Ticket}
            accent="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            isLoading={isLoading}
            index={1}
          />

          {canViewFinancials && (
            <KpiCard
              title="Alertas de stock"
              value={
                isLoading || !kpis
                  ? "--"
                  : String(kpis.alertasStockPendientes)
              }
              subtitle={
                isLoading || !kpis
                  ? "Cargando..."
                  : kpis.alertasStockPendientes === 1
                    ? "1 producto bajo mínimo"
                    : `${kpis.alertasStockPendientes} productos bajo mínimo`
              }
              icon={AlertTriangle}
              accent="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              isLoading={isLoading}
              index={2}
            />
          )}

          {canViewFinancials && (
            <KpiCard
              title="Clientes nuevos"
              value={isLoading || !kpis ? "--" : String(kpis.clientesNuevosMes)}
              subtitle={
                isLoading || !kpis
                  ? "Cargando..."
                  : `${kpis.clientesNuevosMes} ${kpis.clientesNuevosMes === 1 ? "cliente registrado" : "clientes registrados"}`
              }
              icon={Users}
              accent="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
              isLoading={isLoading}
              index={3}
            />
          )}
        </div>
      </div>
    </div>
  );
}
