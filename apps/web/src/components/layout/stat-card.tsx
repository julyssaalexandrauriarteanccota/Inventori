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
        "rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-12" />
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
        "group flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-sm transition-all duration-200 animate-fade-up",
        onClick
          ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
          : "hover:shadow-md hover:-translate-y-0.5",
        active
          ? "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
          : "border-border",
        className,
      )}
      style={{ animationDelay: `${index * 70}ms` }}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
          color,
        )}
      >
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <p className="text-2xl font-bold tabular-nums leading-tight">
          {value === undefined ? (
            <span className="text-muted-foreground text-lg animate-pulse">
              …
            </span>
          ) : (
            value
          )}
        </p>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
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
