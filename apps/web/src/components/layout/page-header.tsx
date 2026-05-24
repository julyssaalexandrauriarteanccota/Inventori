'use client'

import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  hideTitleVisually?: boolean
  className?: string
  contentClassName?: string
  actionsClassName?: string
  titleClassName?: string
  descriptionClassName?: string
}

export function PageHeader({
  title,
  description,
  actions,
  hideTitleVisually = false,
  className,
  contentClassName,
  actionsClassName,
  titleClassName,
  descriptionClassName,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className={cn('min-w-0', contentClassName)}>
        <h1
          className={cn(
            'font-display text-2xl font-bold tracking-tight text-foreground',
            hideTitleVisually && 'sr-only',
            titleClassName,
          )}
        >
          {title}
        </h1>
        {description ? (
          <div
            className={cn(
              hideTitleVisually
                ? 'mt-0 text-sm text-muted-foreground'
                : 'mt-1 text-sm text-muted-foreground',
              descriptionClassName,
            )}
          >
            {description}
          </div>
        ) : null}
      </div>

      {actions ? (
        <div
          data-page-header-actions
          className={cn(
            'flex shrink-0 flex-wrap items-center justify-end gap-2',
            actionsClassName,
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}
