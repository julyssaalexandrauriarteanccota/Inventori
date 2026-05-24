import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

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
  className?: string
}

function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/50 px-5 py-4 shadow-sm",
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
  active,
  className,
}: Omit<StatCardProps, "href">) {
  if (isLoading) return <StatCardSkeleton className={className} />

  return (
    <div
      className={cn(
        "group flex items-center gap-3.5 rounded-2xl border bg-card/75 backdrop-blur-sm px-5 py-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] animate-fade-up",
        onClick
          ? "cursor-pointer hover:shadow-md hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.96] active:duration-150"
          : "hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] transition-transform",
        active
          ? "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
          : "border-border/70 hover:border-border-strong/80",
        className,
      )}
      style={{ animationDelay: `${index * 75}ms` }}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:rotate-[2deg]",
          color,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium leading-tight">{label}</p>
        <p className="text-2xl font-display font-bold tabular-nums leading-tight mt-0.5">
          {value === undefined ? (
            <span className="text-muted-foreground text-lg animate-pulse">
              …
            </span>
          ) : (
            value
          )}
        </p>
        {subtitle ? (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

export function StatCard({ href, ...props }: StatCardProps) {
  if (href) {
    return (
      <Link href={href} className="block">
        <StatCardInner {...props} />
      </Link>
    )
  }

  return <StatCardInner {...props} />
}
