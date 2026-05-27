'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Printer,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react'
import { RolUsuario } from '@erp/shared'

import { useAuth } from '@/hooks/use-auth'
import { useDashboardKpis } from '@/hooks/use-configuracion'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

import { CompactKpiCard } from './_components/compact-kpi-card'
import { DashboardTicketsByState } from './_components/tickets-by-state'
import { DualWeeklyBars } from './_components/dual-weekly-bars'
import { FeaturedCard } from './_components/featured-card'
import { PeriodSummaryCard } from './_components/period-summary-card'
import { QuickActions } from './_components/quick-actions'
import { RecentActivity } from './_components/recent-activity'
import { useDashboardStats, useDashboardVentasSemana } from './_hooks/use-dashboard-stats'

/* ─────────────────────────────── helpers ────────────────────────────── */

function formatCurrency(amount: number) {
  return `S/ ${amount.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function todayLabel() {
  const d = new Date()
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}

/* ─────────────────────────── DashboardPage ──────────────────────────── */

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const { ticketsQ, alertasQ, equiposQ } = useDashboardStats()
  const kpisQ = useDashboardKpis()
  const ventasSemanaQ = useDashboardVentasSemana()

  const ticketsTotal = ticketsQ.data?.meta?.total ?? 0
  const alertasTotal = alertasQ.data?.meta?.total ?? 0
  const equiposTotal = equiposQ.data?.meta?.total ?? 0

  const ventasMes = kpisQ.data?.data?.ventasMes
  const clientesNuevosMes = kpisQ.data?.data?.clientesNuevosMes ?? 0
  const ticketsCerradosMes = kpisQ.data?.data?.tickets?.cerradosMes ?? 0

  const showAdmin = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO)

  return (
    <div className="relative space-y-5 overflow-x-hidden pb-6">
      {/* ── ambient glows ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute -left-28 -top-28 -z-10 h-[520px] w-[520px] rounded-full bg-primary/7 blur-[160px]" />
      <div className="pointer-events-none absolute right-0 -top-10 -z-10 h-[340px] w-[340px] rounded-full bg-emerald-400/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-32 right-12 -z-10 h-[240px] w-[340px] rounded-full bg-primary/4 blur-[110px]" />

      {/* ── header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 pt-1">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
            {user ? `Hola, ${user.nombre}` : 'Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen general del sistema
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm self-start">
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">{todayLabel()}</span>
        </div>
      </div>

      {/* ── info pills ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs shadow-sm">
          <CheckCircle2 className="size-3 text-emerald-500" />
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {kpisQ.isLoading ? '…' : ticketsCerradosMes}
          </span>
          <span className="text-muted-foreground">tickets cerrados este mes</span>
        </div>

        {showAdmin && (
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs shadow-sm">
            <Users className="size-3 text-blue-500" />
            <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {kpisQ.isLoading ? '…' : clientesNuevosMes}
            </span>
            <span className="text-muted-foreground">clientes nuevos</span>
          </div>
        )}

        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs shadow-sm',
            alertasTotal > 0 ? 'border-red-500/20 bg-red-500/5' : '',
          )}
        >
          <AlertTriangle
            className={cn(
              'size-3',
              alertasTotal > 0 ? 'text-red-500' : 'text-muted-foreground',
            )}
          />
          <span
            className={cn(
              'font-bold tabular-nums',
              alertasTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
            )}
          >
            {alertasQ.isLoading ? '…' : alertasTotal}
          </span>
          <span className="text-muted-foreground">alertas de stock</span>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:h-full">
        {showAdmin && (
          <FeaturedCard
            value={kpisQ.isLoading ? '--' : formatCurrency(ventasMes?.totalMonto ?? 0)}
            subtitle={
              kpisQ.isLoading
                ? 'Cargando...'
                : `${ventasMes?.cantidad ?? 0} ventas registradas`
            }
            isLoading={kpisQ.isLoading}
          />
        )}

        <CompactKpiCard
          label="Tickets abiertos"
          value={ticketsQ.isLoading ? '--' : String(ticketsTotal)}
          subtitle={`${ticketsTotal} pendiente${ticketsTotal !== 1 ? 's' : ''} de resolución`}
          icon={Ticket}
          color="bg-amber-50 dark:bg-amber-500/[0.12] border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
          href="/soporte"
          isLoading={ticketsQ.isLoading}
          index={showAdmin ? 1 : 0}
        />

        {showAdmin && (
          <CompactKpiCard
            label="Alertas de stock"
            value={alertasQ.isLoading ? '--' : String(alertasTotal)}
            subtitle={`${alertasTotal} producto${alertasTotal !== 1 ? 's' : ''} bajo mínimo`}
            icon={AlertTriangle}
            color={
              alertasTotal > 0
                ? 'bg-red-50 dark:bg-red-500/[0.12] border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400'
                : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }
            href="/inventario"
            isLoading={alertasQ.isLoading}
            index={2}
          />
        )}

        <CompactKpiCard
          label="Equipos activos"
          value={equiposQ.isLoading ? '--' : String(equiposTotal)}
          subtitle={`${equiposTotal} en operación`}
          icon={Printer}
          color="bg-sky-50 dark:bg-sky-500/[0.12] border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-400"
          href="/equipos"
          isLoading={equiposQ.isLoading}
          index={showAdmin ? 3 : 1}
        />
      </div>

      {/* ── charts / actions / activity row (3 cols on desktop) ─────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Activity & Stock Levels bar chart */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Ventas y Movimientos</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ventas (S/) vs. movimientos de stock · últimos 7 días
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground">
              Última semana
            </span>
          </div>

          {/* totals strip */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/40 px-4 py-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Total mes
              </p>
              {kpisQ.isLoading ? (
                <div className="mt-0.5 h-6 w-24 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-lg font-display font-bold">
                  {formatCurrency(ventasMes?.totalMonto ?? 0)}
                </p>
              )}
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Operaciones
              </p>
              <p className="text-lg font-display font-bold">
                {kpisQ.isLoading ? '--' : (ventasMes?.cantidad ?? 0)}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3" />
              Activo
            </div>
          </div>

          {ventasSemanaQ.isLoading ? (
            <Skeleton className="h-[170px] w-full rounded-xl" />
          ) : (
            <DualWeeklyBars data={ventasSemanaQ.data?.data ?? []} />
          )}
        </div>

        {/* Quick Actions pill buttons */}
        <div className="lg:col-span-3">
          <QuickActions hasRole={hasRole} />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3">
          <RecentActivity />
        </div>
      </div>

      {/* ── bottom row ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardTicketsByState />
        <PeriodSummaryCard
          clientesNuevosMes={clientesNuevosMes}
          ticketsCerradosMes={ticketsCerradosMes}
          kpisLoading={kpisQ.isLoading}
          showAdmin={showAdmin}
        />
      </div>
    </div>
  )
}
