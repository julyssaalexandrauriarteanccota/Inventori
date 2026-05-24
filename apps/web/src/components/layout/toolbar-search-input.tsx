'use client'

import { useEffect, useRef, useState } from 'react'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement?.tagName
      const isTyping = activeElement === 'INPUT' || activeElement === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true'

      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className={cn('relative w-full shrink-0 sm:w-64 lg:w-72', className)}>
      <Input
        ref={inputRef}
        startIcon={Search}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          'h-9 w-full rounded-lg border-border/80 bg-muted/55 pr-9 text-sm shadow-none transition-all duration-300 hover:bg-muted/85 focus-visible:border-ring focus-visible:ring-1 focus-visible:scale-[1.01]',
          inputClassName,
        )}
      />
      {value ? (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 size-7 -translate-y-1/2 rounded-md hover:bg-muted"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
        >
          <X className="size-3.5" />
          <span className="sr-only">Limpiar búsqueda</span>
        </Button>
      ) : !isFocused ? (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden size-5 -translate-y-1/2 items-center justify-center rounded border border-border/70 bg-muted/40 font-mono text-[9px] font-semibold text-muted-foreground shadow-none sm:flex">
          /
        </kbd>
      ) : null}
    </div>
  )
}
