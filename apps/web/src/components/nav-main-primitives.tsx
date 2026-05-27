import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { NavBadgeValue } from "@/components/nav-badges"

export const navButtonClasses = cn(
  "group/item relative h-9 gap-2.5 rounded-xl font-medium",
  "!transition-[background-color,color,font-weight]",
  "text-sidebar-foreground/85 hover:text-foreground",
  "data-[active=true]:bg-[var(--sidebar-active-bg)] data-[active=true]:text-[var(--sidebar-active-fg)] data-[active=true]:font-semibold",
  "data-[active=true]:hover:bg-[var(--sidebar-active-bg)] data-[active=true]:hover:text-[var(--sidebar-active-fg)]",
  "data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0",
  "data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-[var(--sidebar-primary)]",
  "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:p-0",
  "group-data-[collapsible=icon]:before:hidden",
)

export const subButtonClasses = cn(
  "h-7 gap-2 rounded-md text-[13px] font-normal text-muted-foreground transition-colors",
  "hover:bg-[var(--sidebar-accent)] hover:text-foreground",
  "relative data-[active=true]:bg-transparent data-[active=true]:text-[var(--sidebar-active-fg)] data-[active=true]:font-semibold",
  "data-[active=true]:hover:bg-transparent data-[active=true]:hover:text-[var(--sidebar-active-fg)]",
  "data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5",
  "data-[active=true]:before:-ml-px data-[active=true]:before:w-[2px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-[var(--sidebar-primary)]",
)

export function SidebarNavIconTile({
  icon: Icon,
  active,
  badge,
  className,
}: {
  icon?: LucideIcon
  active: boolean
  badge?: NavBadgeValue
  className?: string
}) {
  if (!Icon) {
    return null
  }

  return (
    <span
      className={cn(
        "relative flex size-7 group-data-[collapsible=icon]:size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
        active
          ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] shadow-sm shadow-[var(--sidebar-primary)]/25 dark:shadow-none"
          : "bg-[var(--sidebar-accent)]/60 text-[var(--sidebar-icon-fg)] group-hover/item:bg-[var(--sidebar-primary)]/[0.10] group-hover/item:text-[var(--sidebar-primary)]",
      )}
    >
      <Icon
        className={cn(
          "size-4.5 group-data-[collapsible=icon]:size-5 transition-transform duration-300 ease-out group-hover/item:scale-115",
          className
        )}
        strokeWidth={1.85}
      />
      {badge != null ? (
        <span
          aria-hidden
          className={cn(
            "absolute -right-0.5 -top-0.5 hidden size-1.5 rounded-full bg-[var(--sidebar-primary)] ring-2 ring-sidebar",
            "group-data-[collapsible=icon]:block",
          )}
        />
      ) : null}
    </span>
  )
}

export function SidebarNavBadge({
  value,
  active,
  className,
}: {
  value: NavBadgeValue
  active: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums transition-colors",
        active
          ? "bg-black/10 text-inherit"
          : "bg-[var(--sidebar-accent)] text-foreground/70",
        className,
      )}
    >
      {value}
    </span>
  )
}
