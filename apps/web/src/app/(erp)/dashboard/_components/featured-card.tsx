'use client'

import { ArrowUpRight, ShoppingCart, TrendingUp } from 'lucide-react'
import Link from 'next/link'

/* ─────────────────────────── FeaturedCard ───────────────────────────── */

export function FeaturedCard({
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
