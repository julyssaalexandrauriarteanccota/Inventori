import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const erpBadgeBaseClassName =
  'rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-[0.01em] shadow-none'

const erpBadgeToneClassNames = {
  neutral:
    'border-border/60 bg-muted/30 text-foreground/75 dark:border-border/50 dark:bg-white/[0.02] dark:text-foreground/70',
  info:
    'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:border-blue-500/24 dark:bg-blue-500/12 dark:text-blue-200',
  violet:
    'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:border-violet-500/24 dark:bg-violet-500/12 dark:text-violet-200',
  success:
    'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/24 dark:bg-emerald-500/12 dark:text-emerald-200',
  warning:
    'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-500/24 dark:bg-amber-500/12 dark:text-amber-200',
  danger:
    'border-red-500/20 bg-red-500/10 text-red-700 dark:border-red-500/24 dark:bg-red-500/12 dark:text-red-200',
} as const

export type ErpBadgeTone = keyof typeof erpBadgeToneClassNames

interface ErpBadgeProps extends ComponentProps<typeof Badge> {
  tone?: ErpBadgeTone
}

export function ErpBadge({
  tone = 'neutral',
  variant = 'outline',
  className,
  ...props
}: ErpBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn(
        erpBadgeBaseClassName,
        erpBadgeToneClassNames[tone],
        className,
      )}
      {...props}
    />
  )
}

interface ErpStatusBadgeProps extends Omit<ErpBadgeProps, 'tone'> {
  active: boolean
  tone?: Exclude<ErpBadgeTone, 'neutral'>
  activeLabel?: string
  inactiveLabel?: string
}

export function ErpStatusBadge({
  active,
  tone = 'success',
  activeLabel = 'Activo',
  inactiveLabel = 'Inactivo',
  className,
  children,
  ...props
}: ErpStatusBadgeProps) {
  return (
    <ErpBadge
      tone={active ? tone : 'neutral'}
      className={cn('gap-1.5', className)}
      {...props}
    >
      {children ?? (
        <>
          <span
            className={cn(
              'inline-flex size-1.5 rounded-full',
              active ? 'bg-current opacity-80' : 'bg-muted-foreground/45',
            )}
          />
          {active ? activeLabel : inactiveLabel}
        </>
      )}
    </ErpBadge>
  )
}
