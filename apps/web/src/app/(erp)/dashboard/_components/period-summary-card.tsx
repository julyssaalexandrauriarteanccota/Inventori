'use client'

import { CheckCircle2, Ticket, Users } from 'lucide-react'

import { useReporteTickets } from '@/hooks/use-configuracion'
import { Skeleton } from '@/components/ui/skeleton'

import { DonutRing } from './donut-ring'

/* ─────────────────────────── PeriodSummaryCard ──────────────────────── */

export function PeriodSummaryCard({
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
