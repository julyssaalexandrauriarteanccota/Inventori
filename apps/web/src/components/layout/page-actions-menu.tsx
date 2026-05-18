'use client'

import { MoreHorizontal, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PageActionsMenuItem {
  label: string
  icon: LucideIcon
  onSelect: () => void
  hidden?: boolean
  destructive?: boolean
}

interface PageActionsMenuProps {
  items: PageActionsMenuItem[]
  align?: 'start' | 'center' | 'end'
  contentClassName?: string
}

export function PageActionsMenu({
  items,
  align = 'end',
  contentClassName,
}: PageActionsMenuProps) {
  const visibleItems = items.filter((item) => !item.hidden)

  if (!visibleItems.length) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-lg border border-border/70 bg-muted/40 hover:bg-muted/80 dark:border dark:border-[color-mix(in_oklch,var(--sidebar-primary)_16%,var(--app-border))] dark:bg-[color-mix(in_oklch,var(--sidebar-primary)_14%,var(--app-canvas))] dark:hover:bg-[color-mix(in_oklch,var(--sidebar-primary)_24%,var(--app-muted))]"
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Más opciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={contentClassName ?? 'w-48'}>
        <DropdownMenuGroup>
          {visibleItems.map((item) => {
            const Icon = item.icon

            return (
              <DropdownMenuItem
                key={item.label}
                onClick={item.onSelect}
                className={
                  item.destructive
                    ? 'text-destructive focus:text-destructive'
                    : undefined
                }
              >
                <Icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
