'use client'

import { ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

/* ─────────────────────────── Theme Map ──────────────────────────────── */

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

/* ─────────────────────────── CompactKpiCard ─────────────────────────── */

export function CompactKpiCard({
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
