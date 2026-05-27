import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export type StatCardTheme =
  | "sky"
  | "indigo"
  | "violet"
  | "amber"
  | "emerald"
  | "red"
  | "rose"
  | "slate"

export interface StatCardProps {
  label: string
  value: number | string | undefined
  icon: LucideIcon
  color?: string
  subtitle?: string
  isLoading?: boolean
  /**
   * @deprecated No longer used. Previously controlled a staggered
   * entrance animation; the gentle global fade-in replaces it.
   * Kept on the type so existing call sites still compile.
   */
  index?: number
  /** Optional link — wraps card in an anchor when provided. */
  href?: string
  /** Click handler — makes the card interactive (cursor-pointer). */
  onClick?: () => void
  /** Visual active state — ring + accent background. */
  active?: boolean
  /**
   * Donezo-style tinted variant. When set, the card body uses a
   * palette-tinted background + border + colored icon tile + watermark
   * (light AND dark mode supported), overriding any `color` prop.
   */
  theme?: StatCardTheme
  className?: string
}

// Dark-mode tiles use a slightly darker shade (-600) plus reduced shadow
// alpha so the cards don't "glow" in dark theme. Card backgrounds and
// watermarks also dim a little in dark mode to keep the surface calm.
const THEME_MAP: Record<
  StatCardTheme,
  { card: string; tile: string; text: string; watermark: string }
> = {
  sky: {
    card: "bg-sky-100/80 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/25",
    tile: "bg-sky-500 text-white shadow dark:bg-sky-600 dark:shadow-none-sm shadow-sky-500/30 dark:bg-sky-600 dark:text-sky-50 dark:shadow-none",
    text: "text-white",
    watermark: "text-sky-500 dark:text-sky-400/60",
  },
  indigo: {
    card: "bg-indigo-100/80 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/25",
    tile: "bg-indigo-500 text-white shadow-sm shadow-indigo-500/3 dark:bg-indigo-600 dark:shadow-none0 dark:bg-indigo-600 dark:text-indigo-50 dark:shadow-none",
    text: "text-white",
    watermark: "text-indigo-500 dark:text-indigo-400/60",
  },
  violet: {
    card: "bg-violet-100/80 dark:bg-violet-500/10 border-violet-300 dark:border-violet-500/25",
    tile: "bg-violet-500 text-white shadow-sm shadow-violet-500/3 dark:bg-violet-600 dark:shadow-none0 dark:bg-violet-600 dark:text-violet-50 dark:shadow-none",
    text: "text-white",
    watermark: "text-violet-500 dark:text-violet-400/60",
  },
  amber: {
    card: "bg-amber-100/80 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/25",
    tile: "bg-amber-500 text-white shadow-sm shadow-amber-500/3 dark:bg-amber-600 dark:shadow-none0 dark:bg-amber-600 dark:text-amber-50 dark:shadow-none",
    text: "text-white",
    watermark: "text-amber-500 dark:text-amber-400/60",
  },
  emerald: {
    card: "bg-emerald-100/80 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/25",
    tile: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/3 dark:bg-emerald-600 dark:shadow-none0 dark:bg-emerald-600 dark:text-emerald-50 dark:shadow-none",
    text: "text-white",
    watermark: "text-emerald-500 dark:text-emerald-400/60",
  },
  red: {
    card: "bg-red-100/80 dark:bg-red-500/10 border-red-300 dark:border-red-500/25",
    tile: "bg-red-500 text-white shadow-sm shadow-red-500/3 dark:bg-red-600 dark:shadow-none0 dark:bg-red-600 dark:text-red-50 dark:shadow-none",
    text: "text-white",
    watermark: "text-red-500 dark:text-red-400/60",
  },
  rose: {
    card: "bg-rose-100/80 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/25",
    tile: "bg-rose-500 text-white shadow-sm shadow-rose-500/3 dark:bg-rose-600 dark:shadow-none0 dark:bg-rose-600 dark:text-rose-50 dark:shadow-none",
    text: "text-white",
    watermark: "text-rose-500 dark:text-rose-400/60",
  },
  slate: {
    card: "bg-slate-200/70 dark:bg-slate-700/30 border-slate-300 dark:border-slate-600/60",
    tile: "bg-slate-600 text-white shadow-sm shadow-slate-700/20 dark:bg-slate-600 dark:text-slate-100 dark:shadow-none",
    text: "text-white",
    watermark: "text-slate-500 dark:text-slate-400/60",
  },
}

function StatCardSkeleton({
  className,
  themed,
}: {
  className?: string
  themed?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-5 py-4 shadow-sm",
        themed
          ? "border-border/40 bg-muted/30"
          : "border-border/70 bg-card/50",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-10" />
        </div>
      </div>
    </div>
  )
}

function StatCardInner({
  label,
  value,
  icon: Icon,
  color = "bg-primary/10 text-primary",
  subtitle,
  isLoading = false,
  index: _index = 0,
  onClick,
  href,
  active,
  theme,
  className,
}: StatCardProps) {
  if (isLoading)
    return <StatCardSkeleton className={className} themed={!!theme} />

  const isInteractive = !!onClick || !!href
  const styles = theme ? THEME_MAP[theme] : null

  return (
    <div
      className={cn(
        "group relative overflow-hidden flex items-center gap-3.5 rounded-2xl border px-5 py-4 shadow-sm transition-shadow duration-200 ease-out animate-fade-in",
        styles
          ? styles.card
          : "bg-card/75 backdrop-blur-sm border-border/70",
        isInteractive
          ? "cursor-pointer hover:shadow-md active:scale-[0.99]"
          : "hover:shadow-sm",
        // Stronger hover border for non-themed; themed cards keep their tint
        !styles &&
          (active
            ? "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
            : "hover:border-border-strong/80"),
        className,
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 ease-out group-hover:scale-[1.04]",
          styles ? cn(styles.tile, styles.text) : color,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="relative z-10 min-w-0">
        <p
          className={cn(
            "text-xs font-medium leading-tight",
            styles
              ? "text-foreground/65 dark:text-foreground/75"
              : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <p className="text-2xl font-display font-bold tabular-nums leading-tight mt-0.5 text-foreground">
          {value === undefined ? (
            <span className="text-muted-foreground text-lg animate-pulse">
              …
            </span>
          ) : (
            value
          )}
        </p>
        {subtitle ? (
          <p
            className={cn(
              "text-xs mt-0.5",
              styles
                ? "text-foreground/55 dark:text-foreground/65"
                : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Watermark icon (themed cards only) */}
      {styles ? (
        <Icon
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-3 -bottom-3 size-20 opacity-[0.18] dark:opacity-[0.14] transition-opacity duration-300 ease-out group-hover:opacity-[0.26] dark:group-hover:opacity-[0.20]",
            styles.watermark,
          )}
        />
      ) : null}
    </div>
  )
}

export function StatCard(props: StatCardProps) {
  if (props.href) {
    return (
      <Link href={props.href} className="block">
        <StatCardInner {...props} />
      </Link>
    )
  }

  return <StatCardInner {...props} />
}
