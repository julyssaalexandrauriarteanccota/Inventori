"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  /** ISO string or Date */
  value?: string | Date | null
  /** Callback with ISO string or undefined */
  onChange?: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  /** aria-invalid for form integration */
  "aria-invalid"?: boolean
  clearable?: boolean
  className?: string
  id?: string
}

function parseToDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function toIsoString(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  ).toISOString()
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  disabled = false,
  "aria-invalid": ariaInvalid,
  clearable = true,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseToDate(value)

  function handleSelect(day: Date | undefined) {
    if (day) {
      onChange?.(toIsoString(day))
    } else {
      onChange?.(undefined)
    }
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange?.(undefined)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "w-full justify-start gap-2 text-left font-normal h-9 px-3",
            !selected && "text-muted-foreground",
            ariaInvalid && "border-destructive/60 ring-destructive/20",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">
            {selected
              ? format(selected, "dd 'de' MMMM, yyyy", { locale: es })
              : placeholder}
          </span>
          {clearable && selected ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Borrar fecha"
            >
              <X className="size-3" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          locale={es}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}
