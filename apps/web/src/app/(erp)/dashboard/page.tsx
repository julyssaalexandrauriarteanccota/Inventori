'use client'

import {
  AlertTriangle,
  ArrowRight,
  Printer,
  ShoppingCart,
  Ticket,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { EstadoTicket, EstadoEquipo, RolUsuario } from '@erp/shared'

import { useAuth } from '@/hooks/use-auth'
import { useDashboardKpis, useReporteTickets } from '@/hooks/use-configuracion'
import { api } from '@/lib/api'
import { StatCard } from '@/components/layout/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

/* ── Dashboard API queries ── */
function useDashboardStats() {
  const ticketsQ = useQuery({
    queryKey: ['dashboard', 'tickets-abiertos'],
    queryFn: () =>
      api.get<{ meta: { total: number } }>(
        `/soporte/tickets?estado=${EstadoTicket.ABIERTO}&limit=1`,
      ),
  })

  const alertasQ = useQuery({
    queryKey: ['dashboard', 'alertas-stock'],
    queryFn: () =>
      api.get<{ meta: { total: number } }>(
        `/inventario/alertas?limit=1`,
      ),
  })

  const equiposQ = useQuery({
    queryKey: ['dashboard', 'equipos-activos'],
    queryFn: () =>
      api.get<{ meta: { total: number } }>(
        `/equipos?estado=${EstadoEquipo.ACTIVO}&limit=1`,
      ),
  })

  return { ticketsQ, alertasQ, equiposQ }
}

function formatCurrency(amount: number) {
  return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* ── Stat card types ── */
interface DashboardStat {
  label: string
  value: string
  isLoading: boolean
  subtitle: string
  icon: typeof Ticket
  href: string
  color: string
  roles?: RolUsuario[]
}

/* ── Tickets by state ── */

function getEstadoStyle(estado: string) {
  switch (estado) {
    case 'ABIERTO': return 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
    case 'EN_PROCESO': return 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
    case 'EN_ESPERA': return 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
    case 'CERRADO': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
    case 'CANCELADO': return 'bg-red-500/10 text-red-600 dark:text-red-300'
    default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
  }
}

function DashboardTicketsByState() {
  const { data, isLoading } = useReporteTickets()

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-foreground">Tickets por estado</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Distribución actual de tickets de soporte.
      </p>
      {isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : data?.data?.porEstado && data.data.porEstado.length > 0 ? (
        <div className="mt-4 space-y-2">
          {data.data.porEstado.map((item) => {
            const pct = data.data.total > 0 ? Math.round((item.cantidad / data.data.total) * 100) : 0
            return (
              <div key={item.estado} className="flex items-center gap-3">
                <Badge variant="secondary" className={`${getEstadoStyle(item.estado)} text-xs w-[100px] justify-center`}>
                  {item.estado.replace('_', ' ')}
                </Badge>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--sidebar-primary)]/55 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-medium tabular-nums w-[36px] text-right text-foreground">{item.cantidad}</span>
              </div>
            )
          })}
          <p className="text-xs text-muted-foreground pt-1">{data.data.total} tickets en total</p>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center py-8">
          <div className="text-center">
            <Ticket className="mx-auto size-8 text-muted-foreground/20" />
            <p className="mt-2 text-xs text-muted-foreground">Sin tickets registrados</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const { ticketsQ, alertasQ, equiposQ } = useDashboardStats()
  const kpisQ = useDashboardKpis()

  const ticketsTotal = ticketsQ.data?.meta?.total ?? 0
  const alertasTotal = alertasQ.data?.meta?.total ?? 0
  const equiposTotal = equiposQ.data?.meta?.total ?? 0

  const STATS: DashboardStat[] = [
    {
      label: 'Tickets abiertos',
      value: ticketsQ.isLoading ? '--' : String(ticketsTotal),
      isLoading: ticketsQ.isLoading,
      subtitle: ticketsTotal === 1 ? '1 pendiente de resolución' : `${ticketsTotal} pendientes de resolución`,
      icon: Ticket,
      href: '/soporte',
      color: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    },
    {
      label: 'Ventas del mes',
      value: kpisQ.isLoading ? '--' : formatCurrency(kpisQ.data?.data?.ventasMes?.totalMonto ?? 0),
      isLoading: kpisQ.isLoading,
      subtitle:
        kpisQ.isLoading
          ? 'Cargando...'
          : `${kpisQ.data?.data?.ventasMes?.cantidad ?? 0} ventas registradas`,
      icon: ShoppingCart,
      href: '/ventas',
      color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
    {
      label: 'Alertas de stock',
      value: alertasQ.isLoading ? '--' : String(alertasTotal),
      isLoading: alertasQ.isLoading,
      subtitle: alertasTotal === 1 ? '1 producto bajo mínimo' : `${alertasTotal} productos bajo mínimo`,
      icon: AlertTriangle,
      href: '/inventario',
      color: 'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-300',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
    {
      label: 'Equipos activos',
      value: equiposQ.isLoading ? '--' : String(equiposTotal),
      isLoading: equiposQ.isLoading,
      subtitle: equiposTotal === 1 ? '1 equipo en operación' : `${equiposTotal} equipos en operación`,
      icon: Printer,
      href: '/equipos',
      color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    },
  ]

  const visibleStats = STATS.filter((stat) => {
    if (!stat.roles) return true
    if (!user) return false
    return stat.roles.includes(user.rol)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {user ? `Hola, ${user.nombre}` : 'Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen general del sistema
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleStats.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            subtitle={stat.subtitle}
            isLoading={stat.isLoading}
            href={stat.href}
            index={i}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardTicketsByState />

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground">Accesos rápidos</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Acciones frecuentes para tu rol.
          </p>
          <div className="mt-4 grid gap-2">
            {hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO) && (
              <Link
                href="/soporte/nuevo"
                className="group/q flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-all hover:border-[var(--sidebar-primary)]/30 hover:bg-[var(--sidebar-primary)]/5"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                  <Ticket className="size-4" />
                </span>
                <span className="flex-1">Crear ticket de soporte</span>
                <ArrowRight className="size-3.5 text-muted-foreground/60 transition-transform group-hover/q:translate-x-0.5 group-hover/q:text-foreground" />
              </Link>
            )}
            {hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO) && (
              <Link
                href="/ventas"
                className="group/q flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-all hover:border-[var(--sidebar-primary)]/30 hover:bg-[var(--sidebar-primary)]/5"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <ShoppingCart className="size-4" />
                </span>
                <span className="flex-1">Nueva venta</span>
                <ArrowRight className="size-3.5 text-muted-foreground/60 transition-transform group-hover/q:translate-x-0.5 group-hover/q:text-foreground" />
              </Link>
            )}
            {hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO) && (
              <Link
                href="/clientes/nuevo"
                className="group/q flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-all hover:border-[var(--sidebar-primary)]/30 hover:bg-[var(--sidebar-primary)]/5"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <TrendingUp className="size-4" />
                </span>
                <span className="flex-1">Registrar cliente</span>
                <ArrowRight className="size-3.5 text-muted-foreground/60 transition-transform group-hover/q:translate-x-0.5 group-hover/q:text-foreground" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
