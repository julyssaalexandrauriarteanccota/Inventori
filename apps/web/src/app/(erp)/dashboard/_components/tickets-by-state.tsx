'use client'

import { Ticket } from 'lucide-react'

import { useReporteTickets } from '@/hooks/use-configuracion'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

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

export function DashboardTicketsByState() {
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
