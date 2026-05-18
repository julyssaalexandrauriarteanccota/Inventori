'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { ChevronDown, Filter } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ToolbarFiltersButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  open: boolean
  activeCount?: number
  label?: string
}

export function ToolbarFiltersButton({
  open,
  activeCount = 0,
  label = 'Filtros',
  className,
  ...props
}: ToolbarFiltersButtonProps) {
  return (
    <Button
      variant={open ? 'secondary' : 'outline'}
      size="sm"
      className={cn(
        'h-9 gap-1.5 rounded-lg border-border/80 bg-muted/45 text-xs hover:bg-muted/80',
        open && 'bg-muted/80',
        className,
      )}
      {...props}
    >
      <Filter className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
      {activeCount > 0 ? (
        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {activeCount}
        </span>
      ) : null}
      <ChevronDown
        className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')}
      />
    </Button>
  )
}
