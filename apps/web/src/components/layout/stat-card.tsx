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
  /** Stagger index for entrance animation delay (70ms per step). */
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

const THEME_MAP: Record<
  StatCardTheme,
  { card: string; tile: string; text: string; watermark: string }
> = {
  sky: {
    card: "bg-sky-50 dark:bg-sky-500/[0.08] border-sky-200 dark:border-sky-500/25",
    tile: "bg-sky-100 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
    watermark: "text-sky-500 dark:text-sky-400",
  },
  indigo: {
    card: "bg-indigo-50 dark:bg-indigo-500/[0.08] border-indigo-200 dark:border-indigo-500/25",
    tile: "bg-indigo-100 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    watermark: "text-indigo-500 dark:text-indigo-400",
  },
  violet: {
    card: "bg-violet-50 dark:bg-violet-500/[0.08] border-violet-200 dark:border-violet-500/25",
    tile: "bg-violet-100 dark:bg-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
    watermark: "text-violet-500 dark:text-violet-400",
  },
  amber: {
    card: "bg-amber-50 dark:bg-amber-500/[0.08] border-amber-200 dark:border-amber-500/25",
    tile: "bg-amber-100 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    watermark: "text-amber-500 dark:text-amber-400",
  },
  emerald: {
    card: "bg-emerald-50 dark:bg-emerald-500/[0.08] border-emerald-200 dark:border-emerald-500/25",
    tile: "bg-emerald-100 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    watermark: "text-emerald-500 dark:text-emerald-400",
  },
  red: {
    card: "bg-red-50 dark:bg-red-500/[0.08] border-red-200 dark:border-red-500/25",
    tile: "bg-red-100 dark:bg-red-500/20",
    text: "text-red-600 dark:text-red-400",
    watermark: "text-red-500 dark:text-red-400",
  },
  rose: {
    card: "bg-rose-50 dark:bg-rose-500/[0.08] border-rose-200 dark:border-rose-500/25",
    tile: "bg-rose-100 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    watermark: "text-rose-500 dark:text-rose-400",
  },
  slate: {
    card: "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
    tile: "bg-slate-200 dark:bg-slate-800/60",
    text: "text-slate-600 dark:text-slate-300",
    watermark: "text-slate-500 dark:text-slate-400",
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
  index = 0,
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
        "group relative overflow-hidden flex items-center gap-3.5 rounded-2xl border px-5 py-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] animate-fade-up",
        styles
          ? styles.card
          : "bg-card/75 backdrop-blur-sm border-border/70",
        isInteractive
          ? "cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98]"
          : "hover:shadow-md hover:-translate-y-0.5 transition-transform",
        // Stronger hover border for non-themed; themed cards keep their tint
        !styles &&
          (active
            ? "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
            : "hover:border-border-strong/80"),
        styles && isInteractive && "hover:-translate-y-1",
        className,
      )}
      style={{ animationDelay: `${index * 75}ms` }}
      onClick={onClick}
    >
      <div
        className={cn(
          "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:rotate-[2deg]",
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
            "pointer-events-none absolute -right-3 -bottom-3 size-20 opacity-[0.10] dark:opacity-[0.14] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110",
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
