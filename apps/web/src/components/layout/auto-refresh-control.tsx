'use client'

import { ChevronDown, RefreshCcw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export interface AutoRefreshIntervalOption {
  label: string
  value: number
}

interface AutoRefreshControlProps {
  enabled: boolean
  interval: number
  intervals: AutoRefreshIntervalOption[]
  switchId: string
  onEnabledChange: (enabled: boolean) => void
  onIntervalChange: (interval: number) => void
  onManualRefresh?: () => void
  className?: string
  label?: string
}

export function AutoRefreshControl({
  enabled,
  interval,
  intervals,
  switchId,
  onEnabledChange,
  onIntervalChange,
  onManualRefresh,
  className,
  label = 'Auto',
}: AutoRefreshControlProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors duration-300 shadow-none',
        enabled
          ? 'border-primary/25 bg-primary/8 dark:border-[color-mix(in_oklch,var(--sidebar-primary)_22%,var(--app-border))] dark:bg-[color-mix(in_oklch,var(--sidebar-primary)_20%,var(--app-canvas))]'
          : 'border-border bg-muted/45 dark:border-[color-mix(in_oklch,var(--sidebar-primary)_16%,var(--app-border))] dark:bg-[color-mix(in_oklch,var(--sidebar-primary)_12%,var(--app-canvas))]',
        className,
      )}
    >
      {enabled ? (
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex size-5 animate-ping rounded-full bg-primary opacity-10" />
          <RefreshCcw
            className="size-3.5 animate-spin text-primary transition-all"
            style={{ animationDuration: '3s' }}
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="size-5 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground dark:text-foreground/70 dark:hover:text-foreground"
          onClick={onManualRefresh}
          disabled={!onManualRefresh}
        >
          <RefreshCcw className="size-3.5" />
          <span className="sr-only">Actualizar</span>
        </Button>
      )}

      {enabled ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline dark:text-foreground/90"
            >
              {intervals.find((option) => option.value === interval)?.label ??
                'Auto'}
              <ChevronDown className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {intervals.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onIntervalChange(option.value)}
                className={cn(
                  'text-xs',
                  interval === option.value && 'font-medium text-primary',
                )}
              >
                {option.label}
                {interval === option.value ? ' ✓' : ''}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <Switch
        id={switchId}
        size="sm"
        checked={enabled}
        onCheckedChange={onEnabledChange}
        className="dark:data-[state=checked]:border-[color-mix(in_oklch,var(--sidebar-primary)_18%,var(--app-border))] dark:data-[state=checked]:bg-[color-mix(in_oklch,var(--sidebar-primary)_28%,var(--app-muted))]"
      />
      <Label
        htmlFor={switchId}
        className="hidden cursor-pointer text-xs text-muted-foreground sm:block dark:text-sidebar-foreground/75"
      >
        {label}
      </Label>
    </div>
  )
}
