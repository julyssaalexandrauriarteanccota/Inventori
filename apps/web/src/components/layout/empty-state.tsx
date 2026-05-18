import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-dashed border-border animate-scale-in",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-muted/40">
        <Icon className="size-7 text-muted-foreground/40" />
      </div>
      <div className="text-center">
        <p className="font-medium text-muted-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground/70 mt-0.5 max-w-xs mx-auto">
            {description}
          </p>
        ) : null}
      </div>
      {action ?? null}
    </div>
  )
}
