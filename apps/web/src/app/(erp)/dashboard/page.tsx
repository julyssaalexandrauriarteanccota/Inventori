'use client'

import {
  AlertTriangle,
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

/* ─────────────────────────── DualWeeklyBars (SVG) ───────────────────── */

/* Demo data (dual-series) — wire to real endpoint when available */
const MOCK_DUAL = [
  { day: 'Lun', stock: 1800, ventas: 1200 },
  { day: 'Mar', stock: 2200, ventas: 1900 },
  { day: 'May', stock: 1600, ventas: 2600 },
  { day: 'Jun', stock: 2800, ventas: 2100 },
  { day: 'Sep', stock: 2400, ventas: 3400 },
  { day: 'Sáb', stock: 1400, ventas: 1700 },
  { day: 'Rep', stock: 2000, ventas: 2200 },
]

function DualWeeklyBars() {
  /* layout constants */
  const TW = 420          // total svg width
  const YAW = 34          // y-axis label area width
  const CW = TW - YAW     // chart drawing width
  const VH = 130          // chart height in SVG units
  const TOP = 14          // top padding (above tallest bar)
  const BTM = 26          // bottom padding (for day labels)
  const SVG_H = TOP + VH + BTM
  const BASE = TOP + VH   // y-coordinate of the baseline (bottom of bars)

  const MAX_V = 4000      // scale ceiling
  const scaleH = (v: number) => Math.max(3, (v / MAX_V) * VH)

  const BAR_W = 13
  const BAR_GAP = 4
  const GROUP_W = BAR_W * 2 + BAR_GAP   // 30
  const N = MOCK_DUAL.length
  const GROUP_SP = (CW - N * GROUP_W) / (N + 1)
  const groupX = (i: number) => YAW + GROUP_SP + i * (GROUP_W + GROUP_SP)

  const Y_TICKS = [0, 1000, 2000, 3000, 4000]

  return (
    <svg
      viewBox={`0 0 ${TW} ${SVG_H}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="db-primary" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sidebar-primary)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--sidebar-primary)" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="db-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f4a3d" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1f4a3d" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Y-axis gridlines + labels */}
      {Y_TICKS.map((tick) => {
        const y = BASE - (tick / MAX_V) * VH
        return (
          <g key={tick}>
            <line
              x1={YAW} y1={y} x2={TW} y2={y}
              stroke="currentColor" strokeOpacity={tick === 0 ? 0.12 : 0.06}
              strokeWidth={tick === 0 ? 1.5 : 1}
            />
            <text
              x={YAW - 5} y={y + 4}
              textAnchor="end" fontSize={9}
              fill="currentColor" fillOpacity={0.38}
              fontFamily="var(--font-sans)"
            >
              {tick === 0 ? '0' : `${tick / 1000}k`}
            </text>
          </g>
        )
      })}

      {/* Dual bars per day */}
      {MOCK_DUAL.map(({ day, stock, ventas }, i) => {
        const gx = groupX(i)
        const sH = scaleH(stock)
        const vH = scaleH(ventas)
        const labelX = gx + BAR_W + BAR_GAP / 2
        return (
          <g key={day}>
            {/* dark series (stock) */}
            <rect x={gx} y={BASE - sH} width={BAR_W} height={sH} rx={5} fill="url(#db-dark)" />
            {/* primary series (ventas) */}
            <rect x={gx + BAR_W + BAR_GAP} y={BASE - vH} width={BAR_W} height={vH} rx={5} fill="url(#db-primary)" />
            {/* day label */}
            <text
              x={labelX} y={BASE + 17}
              textAnchor="middle" fontSize={9}
              fill="currentColor" fillOpacity={0.42}
              fontFamily="var(--font-sans)"
            >
              {day}
            </text>
          </g>
        )
      })}

      {/* legend */}
      <g transform={`translate(${YAW}, ${SVG_H - 8})`}>
        <rect width={8} height={8} rx={2} fill="#1f4a3d" fillOpacity={0.7} />
        <text x={11} y={7} fontSize={8} fill="currentColor" fillOpacity={0.45} fontFamily="var(--font-sans)">Stock</text>
        <rect x={48} width={8} height={8} rx={2} fill="var(--sidebar-primary)" fillOpacity={0.8} />
        <text x={59} y={7} fontSize={8} fill="currentColor" fillOpacity={0.45} fontFamily="var(--font-sans)">Ventas</text>
      </g>
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

/* ─────────────────────────── QuickActions (pill buttons) ───────────── */

function QuickActions({ hasRole }: { hasRole: (...roles: RolUsuario[]) => boolean }) {
  const PILLS: {
    label: string
    icon: LucideIcon
    href: string
    cls: string
    roles?: RolUsuario[]
  }[] = [
    {
      label: 'Nueva venta',
      icon: ShoppingCart,
      href: '/ventas',
      cls: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 dark:brightness-75 dark:hover:brightness-90',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
    {
      label: 'Crear ticket',
      icon: Ticket,
      href: '/soporte/nuevo',
      cls: 'bg-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/90 text-white shadow-primary/20 dark:brightness-75 dark:hover:brightness-90',
    },
    {
      label: 'Registrar cliente',
      icon: Users,
      href: '/clientes/nuevo',
      cls: 'bg-card border border-border hover:border-primary/30 hover:bg-primary/5 text-foreground dark:hover:bg-primary/10 dark:brightness-105',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
    {
      label: 'Ver inventario',
      icon: Package,
      href: '/inventario',
      cls: 'bg-card border border-border hover:border-violet-500/30 hover:bg-violet-500/5 text-foreground dark:hover:bg-violet-500/10 dark:brightness-105',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
  ].filter((p) => !p.roles || hasRole(...p.roles))

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Acciones frecuentes</p>
        </div>
        <Zap className="size-4 text-muted-foreground/30" />
      </div>

      <div className="flex flex-col gap-2.5 flex-1">
        {PILLS.map((p) => (
          <Link key={p.href} href={p.href} className="w-full">
            <div
              className={cn(
                'flex items-center justify-center gap-2 w-full h-12 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-md',
                p.cls,
              )}
            >
              <p.icon className="size-4 shrink-0" />
              {p.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────── RecentActivity ─────────────────────────── */

/* Placeholder data — replace with real /actividad endpoint when available */
const ACTIVITY_DATA = [
  {
    initials: 'AD',
    bg: 'bg-blue-500',
    name: 'Alexandra Deff',
    action: 'Actualizó repositorio de productos',
    status: 'Completado',
    statusCls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  {
    initials: 'EA',
    bg: 'bg-purple-500',
    name: 'Edwin Adenike',
    action: 'Procesó nueva orden de venta',
    status: 'En progreso',
    statusCls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  {
    initials: 'IO',
    bg: 'bg-orange-400',
    name: 'Isaac O.',
    action: 'Revisó ticket de soporte',
    status: 'Pendiente',
    statusCls: 'bg-slate-400/10 text-slate-600 dark:text-slate-400',
  },
]

function RecentActivity() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Actividad reciente</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Últimas acciones del equipo</p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {ACTIVITY_DATA.map((item) => (
          <div key={item.name} className="flex items-start gap-3">
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold shadow-sm',
                item.bg,
              )}
            >
              {item.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{item.name}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.action}</p>
              <span
                className={cn(
                  'mt-1 inline-block text-[10px] font-semibold rounded-full px-2 py-0.5',
                  item.statusCls,
                )}
              >
                {item.status}
              </span>
            </div>
          </div>
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
      <div className="group relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between h-full min-h-[130px] bg-[var(--sidebar-primary)] text-white shadow-lg shadow-[var(--sidebar-primary)]/20 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--sidebar-primary)]/30 cursor-pointer dark:brightness-75">
        {/* decorative ambient glows inside the card */}
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-2 size-32 rounded-full bg-white/10 blur-2xl" />

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
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/75 dark:text-white/80">
            Ventas del mes
          </p>
          {isLoading ? (
            <div className="mt-1 h-8 w-28 animate-pulse rounded-xl bg-white/15" />
          ) : (
            <p className="mt-0.5 text-3xl font-display font-bold leading-tight">
              {value}
            </p>
          )}
          <p className="mt-0.5 text-xs text-white/65 dark:text-white/75">{subtitle}</p>
        </div>

        <div className="absolute right-4 bottom-4 flex size-8 items-center justify-center rounded-full bg-white/15 transition-all group-hover:bg-white/25">
          <ArrowUpRight className="size-4" />
        </div>
      </div>
    </Link>
  )
}

/* ─────────────────────────── CompactKpiCard ─────────────────────────── */

const THEME_MAP = {
  amber: {
    card: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    tile: 'bg-amber-100 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
    lightText: 'text-amber-600',
  },
  red: {
    card: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
    tile: 'bg-red-100 dark:bg-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30',
    lightText: 'text-red-600',
  },
  slate: {
    card: 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700',
    tile: 'bg-slate-200 dark:bg-slate-800/40',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    lightText: 'text-slate-500',
  },
  sky: {
    card: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30',
    tile: 'bg-sky-100 dark:bg-sky-500/20',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-500/30',
    lightText: 'text-sky-600',
  },
}

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
  let theme: 'amber' | 'red' | 'slate' | 'sky' = 'slate'
  if (color.includes('amber')) theme = 'amber'
  else if (color.includes('red')) theme = 'red'
  else if (color.includes('sky')) theme = 'sky'

  const styles = THEME_MAP[theme]

  return (
    <Link href={href} className="block">
      <div
        className={cn(
          'group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md animate-fade-up min-h-[130px] flex flex-col justify-between',
          styles.card,
        )}
        style={{ animationDelay: `${index * 70}ms` }}
      >
        {/* top row: solid colored icon tile + arrow circle */}
        <div className="flex items-center justify-between">
          <div className={cn('flex size-10 items-center justify-center rounded-xl', styles.tile)}>
            <Icon className={cn('size-5', styles.text)} />
          </div>
          <div className={cn(
            'flex size-8 items-center justify-center rounded-full border transition-all',
            styles.border,
            'group-hover:bg-current/10',
          )}>
            <ArrowUpRight className={cn('size-3.5 transition-colors', styles.lightText, 'opacity-60 group-hover:opacity-100')} />
          </div>
        </div>

        {/* label + number */}
        <div className="mt-3">
          <p className="text-xs font-medium text-foreground/65 dark:text-foreground/75">{label}</p>
          {isLoading ? (
            <div className="mt-1.5 h-9 w-14 animate-pulse rounded-lg bg-foreground/[0.08]" />
          ) : (
            <p className="mt-0.5 text-4xl font-display font-bold tabular-nums leading-none text-foreground">
              {value}
            </p>
          )}
        </div>

        {/* subtitle */}
        <p className="mt-1.5 text-xs leading-tight text-foreground/55 dark:text-foreground/65">{subtitle}</p>

        {/* watermark icon */}
        <div className="pointer-events-none absolute -bottom-3 -right-3 opacity-[0.12] dark:opacity-[0.18]">
          <Icon className={cn('size-24', styles.text)} />
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
              <h2 className="text-sm font-semibold text-foreground">Activity &amp; Stock Levels</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ventas vs. stock · datos de demo
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground">
              Last week
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

          <DualWeeklyBars />
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
