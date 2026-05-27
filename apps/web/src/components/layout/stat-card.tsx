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

const THEME_MAP: Record<
  StatCardTheme,
  { card: string; tile: string; text: string; watermark: string }
> = {
  sky: {
    card: "bg-sky-100/80 dark:bg-sky-500/15 border-sky-300 dark:border-sky-500/40",
    tile: "bg-sky-500 text-white shadow-sm shadow-sky-500/30 dark:bg-sky-500 dark:text-white dark:shadow-sky-500/30",
    text: "text-white",
    watermark: "text-sky-500 dark:text-sky-400",
  },
  indigo: {
    card: "bg-indigo-100/80 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40",
    tile: "bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 dark:bg-indigo-500 dark:text-white dark:shadow-indigo-500/30",
    text: "text-white",
    watermark: "text-indigo-500 dark:text-indigo-400",
  },
  violet: {
    card: "bg-violet-100/80 dark:bg-violet-500/15 border-violet-300 dark:border-violet-500/40",
    tile: "bg-violet-500 text-white shadow-sm shadow-violet-500/30 dark:bg-violet-500 dark:text-white dark:shadow-violet-500/30",
    text: "text-white",
    watermark: "text-violet-500 dark:text-violet-400",
  },
  amber: {
    card: "bg-amber-100/80 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40",
    tile: "bg-amber-500 text-white shadow-sm shadow-amber-500/30 dark:bg-amber-500 dark:text-white dark:shadow-amber-500/30",
    text: "text-white",
    watermark: "text-amber-500 dark:text-amber-400",
  },
  emerald: {
    card: "bg-emerald-100/80 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40",
    tile: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 dark:bg-emerald-500 dark:text-white dark:shadow-emerald-500/30",
    text: "text-white",
    watermark: "text-emerald-500 dark:text-emerald-400",
  },
  red: {
    card: "bg-red-100/80 dark:bg-red-500/15 border-red-300 dark:border-red-500/40",
    tile: "bg-red-500 text-white shadow-sm shadow-red-500/30 dark:bg-red-500 dark:text-white dark:shadow-red-500/30",
    text: "text-white",
    watermark: "text-red-500 dark:text-red-400",
  },
  rose: {
    card: "bg-rose-100/80 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40",
    tile: "bg-rose-500 text-white shadow-sm shadow-rose-500/30 dark:bg-rose-500 dark:text-white dark:shadow-rose-500/30",
    text: "text-white",
    watermark: "text-rose-500 dark:text-rose-400",
  },
  slate: {
    card: "bg-slate-200/70 dark:bg-slate-700/40 border-slate-300 dark:border-slate-600",
    tile: "bg-slate-600 text-white shadow-sm shadow-slate-700/20 dark:bg-slate-500 dark:text-white",
    text: "text-white",
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
            "pointer-events-none absolute -right-3 -bottom-3 size-20 opacity-[0.18] dark:opacity-[0.22] transition-opacity duration-300 ease-out group-hover:opacity-[0.26] dark:group-hover:opacity-[0.30]",
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
