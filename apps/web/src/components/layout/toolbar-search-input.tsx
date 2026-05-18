'use client'

import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ToolbarSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  inputClassName?: string
}

export function ToolbarSearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
}: ToolbarSearchInputProps) {
  return (
    <div className={cn('relative w-full shrink-0 sm:w-64 lg:w-72', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-9 w-full rounded-lg border-border/80 bg-muted/55 pl-9 pr-9 text-sm shadow-none transition-colors hover:bg-muted/85 focus-visible:border-ring focus-visible:ring-1',
          inputClassName,
        )}
      />
      {value ? (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
          onClick={() => onChange('')}
        >
          <X className="size-3.5" />
          <span className="sr-only">Limpiar búsqueda</span>
        </Button>
      ) : null}
    </div>
  )
}
