'use client'

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Package,
  Printer,
  ShoppingCart,
  Ticket,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { EstadoTicket, EstadoEquipo, RolUsuario } from '@erp/shared'

import { useAuth } from '@/hooks/use-auth'
import { useDashboardKpis, useReporteTickets } from '@/hooks/use-configuracion'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

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

/* ─────────────────────────── DonutRing (SVG) ────────────────────────── */

function DonutRing({
  pct,
  size = 120,
  stroke = 10,
  label,
}: {
  pct: number
  size?: number
  stroke?: number
  label: string
}) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--sidebar-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display font-bold leading-none tabular-nums">
          {pct}%
        </span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────── WeeklyBars (SVG) ───────────────────────── */

/* Demo data — wire to /reportes/ventas-semana when the endpoint is ready */
const MOCK_WEEKLY = [
  { day: 'Lun', v: 1200 },
  { day: 'Mar', v: 1900 },
  { day: 'Mié', v: 2600 },
  { day: 'Jue', v: 2100 },
  { day: 'Vie', v: 3400 },
  { day: 'Sáb', v: 1700 },
  { day: 'Dom', v: 800 },
]

function WeeklyBars() {
  const maxV = Math.max(...MOCK_WEEKLY.map((d) => d.v))
  const VH = 76
  const totalW = 300
  const n = MOCK_WEEKLY.length
  const barW = 30
  const spacing = (totalW - n * barW) / (n + 1)

  return (
    <svg
      viewBox={`0 0 ${totalW} ${VH + 24}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="dg-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sidebar-primary)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--sidebar-primary)" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="dg-bar-hi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sidebar-primary)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--sidebar-primary)" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* faint horizontal grid */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={0} y1={VH * (1 - f)}
          x2={totalW} y2={VH * (1 - f)}
          stroke="currentColor" strokeOpacity={0.05} strokeWidth={1}
        />
      ))}

      {MOCK_WEEKLY.map(({ day, v }, i) => {
        const bH = Math.max(6, (v / maxV) * VH)
        const x = spacing + i * (barW + spacing)
        const isHi = v === maxV
        return (
          <g key={day}>
            <rect
              x={x} y={VH - bH}
              width={barW} height={bH} rx={7}
              fill={isHi ? 'url(#dg-bar-hi)' : 'url(#dg-bar)'}
            />
            {isHi && (
              <text
                x={x + barW / 2} y={VH - bH - 5}
                textAnchor="middle" fontSize={8}
                fill="var(--sidebar-primary)" fontWeight="700"
                fontFamily="var(--font-sans)"
              >
                {(v / 1000).toFixed(1)}k
              </text>
            )}
            <text
              x={x + barW / 2} y={VH + 15}
              textAnchor="middle" fontSize={9}
              fill="currentColor" fillOpacity={0.4}
              fontFamily="var(--font-sans)"
            >
              {day}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ────────────────────────── estado meta map ─────────────────────────── */

const ESTADO_META: Record<string, { bar: string; badge: string; dot: string }> = {
  ABIERTO:    { bar: 'bg-blue-500',    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',    dot: 'bg-blue-500' },
  EN_PROCESO: { bar: 'bg-amber-500',   badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', dot: 'bg-amber-500' },
  EN_ESPERA:  { bar: 'bg-slate-400',   badge: 'bg-slate-400/10 text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  CERRADO:    { bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300', dot: 'bg-emerald-500' },
  CANCELADO:  { bar: 'bg-red-400',     badge: 'bg-red-400/10 text-red-600 dark:text-red-300',       dot: 'bg-red-400' },
}

function getEstadoMeta(e: string) {
  return ESTADO_META[e] ?? { bar: 'bg-slate-400', badge: 'bg-slate-400/10 text-slate-500', dot: 'bg-slate-400' }
}

/* ─────────────────────── DashboardTicketsByState ────────────────────── */

function DashboardTicketsByState() {
  const { data, isLoading } = useReporteTickets()
  const total = data?.data?.total ?? 0

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Tickets por estado</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Distribución actual de soporte</p>
        </div>
        {!isLoading && total > 0 && (
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted rounded-full px-3 py-1">
            {total} total
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full rounded-lg" />
            ))
          : data?.data?.porEstado?.length
          ? data.data.porEstado.map((item) => {
              const pct = total > 0 ? Math.round((item.cantidad / total) * 100) : 0
              const meta = getEstadoMeta(item.estado)
              return (
                <div key={item.estado} className="flex items-center gap-2.5">
                  <div className={cn('size-2 rounded-full shrink-0', meta.dot)} />
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 min-w-[92px] text-center leading-tight',
                      meta.badge,
                    )}
                  >
                    {item.estado.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', meta.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-5 text-right">
                    {item.cantidad}
                  </span>
                </div>
              )
            })
          : (
            <div className="flex flex-col items-center justify-center flex-1 py-8">
              <Ticket className="size-8 text-muted-foreground/20" />
              <p className="mt-2 text-xs text-muted-foreground">Sin tickets registrados</p>
            </div>
          )}
      </div>

      {!isLoading && total > 0 && (
        <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
          {data?.data?.porEstado?.find((e) => e.estado === 'CERRADO')?.cantidad ?? 0} cerrados de {total} en total
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────── QuickActions ───────────────────────────── */

function QuickActions({ hasRole }: { hasRole: (...roles: RolUsuario[]) => boolean }) {
  const ACTIONS: {
    label: string
    desc: string
    icon: LucideIcon
    href: string
    color: string
    roles?: RolUsuario[]
  }[] = [
    {
      label: 'Nueva venta',
      desc: 'Registrar comprobante de venta',
      icon: ShoppingCart,
      href: '/ventas',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
    {
      label: 'Crear ticket',
      desc: 'Abrir ticket de soporte técnico',
      icon: Ticket,
      href: '/soporte/nuevo',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO],
    },
    {
      label: 'Registrar cliente',
      desc: 'Agregar nuevo cliente al sistema',
      icon: Users,
      href: '/clientes/nuevo',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
    {
      label: 'Ver inventario',
      desc: 'Consultar stock y alertas de mínimo',
      icon: Package,
      href: '/inventario',
      color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
  ].filter((a) => !a.roles || hasRole(...a.roles))

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Accesos rápidos</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Acciones frecuentes para tu rol</p>
        </div>
        <Zap className="size-4 text-muted-foreground/30" />
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3.5 py-2.5 transition-all hover:border-primary/25 hover:bg-primary/5 hover:shadow-sm"
          >
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                a.color,
              )}
            >
              <a.icon className="size-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{a.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{a.desc}</p>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────── PeriodSummaryCard ──────────────────────── */

function PeriodSummaryCard({
  clientesNuevosMes,
  ticketsCerradosMes,
  kpisLoading,
  showAdmin,
}: {
  clientesNuevosMes: number
  ticketsCerradosMes: number
  kpisLoading: boolean
  showAdmin: boolean
}) {
  const ticketsQ = useReporteTickets()
  const cerrados = ticketsQ.data?.data?.porEstado?.find((e) => e.estado === 'CERRADO')?.cantidad ?? 0
  const total = ticketsQ.data?.data?.total ?? 0
  const pct = total > 0 ? Math.round((cerrados / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Resumen del período</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Métricas del mes en curso</p>
      </div>

      {/* donut ring — resolution rate */}
      <div className="flex flex-col items-center gap-1 py-1">
        {ticketsQ.isLoading ? (
          <Skeleton className="size-[110px] rounded-full" />
        ) : (
          <DonutRing pct={pct} size={110} stroke={10} label="resueltos" />
        )}
        <p className="text-[11px] text-muted-foreground">Resolución de tickets</p>
      </div>

      {/* stats list */}
      <div className="flex flex-col gap-2.5 border-t border-border pt-3">
        {showAdmin && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="size-3.5" />
              </span>
              <span className="text-xs text-muted-foreground">Clientes nuevos</span>
            </div>
            {kpisLoading ? (
              <Skeleton className="h-5 w-6 rounded" />
            ) : (
              <span className="text-sm font-bold tabular-nums">{clientesNuevosMes}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
            </span>
            <span className="text-xs text-muted-foreground">Tickets cerrados</span>
          </div>
          {kpisLoading ? (
            <Skeleton className="h-5 w-6 rounded" />
          ) : (
            <span className="text-sm font-bold tabular-nums">{ticketsCerradosMes}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Ticket className="size-3.5" />
            </span>
            <span className="text-xs text-muted-foreground">Abiertos ahora</span>
          </div>
          {ticketsQ.isLoading ? (
            <Skeleton className="h-5 w-6 rounded" />
          ) : (
            <span className="text-sm font-bold tabular-nums">
              {ticketsQ.data?.data?.porEstado?.find((e) => e.estado === 'ABIERTO')?.cantidad ?? 0}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── API queries ────────────────────────────── */

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
      api.get<{ meta: { total: number } }>(`/inventario/alertas?limit=1`),
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

/* ─────────────────────────── FeaturedCard ───────────────────────────── */

function FeaturedCard({
  value,
  subtitle,
  isLoading,
}: {
  value: string
  subtitle: string
  isLoading: boolean
}) {
  return (
    <Link href="/ventas" className="block">
      <div className="group relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between min-h-[128px] bg-[var(--sidebar-primary)] text-white shadow-lg shadow-[var(--sidebar-primary)]/20 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--sidebar-primary)]/30 cursor-pointer">
        {/* decorative ambient glows inside the card */}
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-2 size-32 rounded-full bg-white/6 blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15">
            <ShoppingCart className="size-5" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
            <TrendingUp className="size-3" />
            Este mes
          </div>
        </div>

        <div className="relative mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
            Ventas del mes
          </p>
          {isLoading ? (
            <div className="mt-1 h-8 w-28 animate-pulse rounded-xl bg-white/15" />
          ) : (
            <p className="mt-0.5 text-3xl font-display font-bold leading-tight">
              {value}
            </p>
          )}
          <p className="mt-0.5 text-xs text-white/55">{subtitle}</p>
        </div>

        <div className="absolute right-4 bottom-4 flex size-8 items-center justify-center rounded-full bg-white/15 transition-all group-hover:bg-white/25">
          <ArrowUpRight className="size-4" />
        </div>
      </div>
    </Link>
  )
}

/* ─────────────────────────── CompactKpiCard ─────────────────────────── */

function CompactKpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  href,
  isLoading,
  index = 0,
}: {
  label: string
  value: string
  subtitle: string
  icon: LucideIcon
  color: string
  href: string
  isLoading: boolean
  index?: number
}) {
  return (
    <Link href={href} className="block">
      <div
        className="group flex items-center gap-3.5 rounded-2xl border border-border bg-card/80 backdrop-blur-sm px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md animate-fade-up"
        style={{ animationDelay: `${index * 70}ms` }}
      >
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl transition-all group-hover:scale-110',
            color,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground leading-tight">
            {label}
          </p>
          {isLoading ? (
            <div className="mt-1 h-7 w-12 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-0.5 text-2xl font-display font-bold tabular-nums leading-tight">
              {value}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
        </div>
      </div>
    </Link>
  )
}

/* ─────────────────────────── DashboardPage ──────────────────────────── */

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const { ticketsQ, alertasQ, equiposQ } = useDashboardStats()
  const kpisQ = useDashboardKpis()

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
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm">
          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground">{todayLabel()}</span>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
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
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
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
          color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          href="/equipos"
          isLoading={equiposQ.isLoading}
          index={showAdmin ? 3 : 1}
        />
      </div>

      {/* ── charts row ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* sales bar chart */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Actividad de ventas</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Distribución estimada · vista semanal
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground">
              Esta semana
            </span>
          </div>

          {/* totals inline strip */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/40 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Total mes
              </p>
              {kpisQ.isLoading ? (
                <div className="mt-0.5 h-6 w-24 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-xl font-display font-bold">
                  {formatCurrency(ventasMes?.totalMonto ?? 0)}
                </p>
              )}
            </div>

            <div className="h-9 w-px bg-border" />

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Operaciones
              </p>
              <p className="text-xl font-display font-bold">
                {kpisQ.isLoading ? '--' : (ventasMes?.cantidad ?? 0)}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3" />
              Activo
            </div>
          </div>

          <WeeklyBars />
        </div>

        {/* period summary card */}
        <PeriodSummaryCard
          clientesNuevosMes={clientesNuevosMes}
          ticketsCerradosMes={ticketsCerradosMes}
          kpisLoading={kpisQ.isLoading}
          showAdmin={showAdmin}
        />
      </div>

      {/* ── bottom row ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardTicketsByState />
        <QuickActions hasRole={hasRole} />
      </div>
    </div>
  )
}
