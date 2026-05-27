'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

import { useRecentAuditoria } from '../_hooks/use-dashboard-stats'

/* ──────────── action label map (modelo → readable action) ───────────── */

const ACCION_MAP: Record<string, { label: string; cls: string }> = {
  CREATE:  { label: 'Creó',       cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  UPDATE:  { label: 'Actualizó',  cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  DELETE:  { label: 'Eliminó',    cls: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  PATCH:   { label: 'Modificó',   cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
}

function getAccionMeta(accion: string) {
  // Try exact match first, then prefix match (e.g. "CREATE_VENTA" → "CREATE")
  const key = Object.keys(ACCION_MAP).find((k) => accion.toUpperCase().startsWith(k))
  return ACCION_MAP[key ?? ''] ?? {
    label: accion,
    cls: 'bg-slate-400/10 text-slate-600 dark:text-slate-400',
  }
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-400',
  'bg-emerald-500',
  'bg-rose-500',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Justo ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `Hace ${days}d`
}

function humanizeModelo(modelo: string): string {
  return modelo
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
}

/* ─────────────────────────── RecentActivity ─────────────────────────── */

export function RecentActivity() {
  const { data, isLoading } = useRecentAuditoria()
  const items = data?.data ?? []

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Actividad reciente</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Últimas acciones del equipo</p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Sin actividad reciente
          </p>
        ) : (
          items.map((item, idx) => {
            const nombre = item.usuario?.nombre ?? 'Sistema'
            const meta = getAccionMeta(item.accion)
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold shadow-sm',
                    AVATAR_COLORS[idx % AVATAR_COLORS.length],
                  )}
                >
                  {getInitials(nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold leading-tight truncate">{nombre}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {meta.label} {humanizeModelo(item.modelo)}
                  </p>
                  <span
                    className={cn(
                      'mt-1 inline-block text-[10px] font-semibold rounded-full px-2 py-0.5',
                      meta.cls,
                    )}
                  >
                    {item.accion.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
