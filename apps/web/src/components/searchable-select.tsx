"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

interface SearchableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  ariaLabel: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  clearable?: boolean;
  clearLabel?: string;
  onSearchChange?: (value: string) => void;
  onCreateOption?: (label: string) => Promise<void> | void;
  createLabel?: string;
  creatingLabel?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  ariaLabel,
  disabled = false,
  invalid = false,
  className,
  clearable = false,
  clearLabel = "Limpiar seleccion",
  onSearchChange,
  onCreateOption,
  createLabel = "Crear",
  creatingLabel = "Creando...",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLElement | null>(null);

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  React.useEffect(() => {
    if (!open) {
      setSearchValue("");
      onSearchChange?.("");
      return;
    }

    const dialogContent =
      anchorRef.current?.closest<HTMLElement>('[data-slot="dialog-content"]') ??
      null;

    setPortalContainer(dialogContent);
  }, [open, onSearchChange]);

  const normalizedSearch = searchValue.trim();
  const canCreate =
    Boolean(onCreateOption) &&
    normalizedSearch.length > 0 &&
    !options.some(
      (option) => option.label.toLowerCase() === normalizedSearch.toLowerCase(),
    );

  async function handleCreateOption() {
    if (!onCreateOption || !normalizedSearch) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreateOption(normalizedSearch);
      setSearchValue("");
      setOpen(false);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div ref={anchorRef}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-invalid={invalid}
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-between rounded-xl border-input bg-background px-3.5 font-normal shadow-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted/30 active:scale-[0.99] active:duration-150",
              !selectedOption && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">
              {selectedOption?.label ?? placeholder}
            </span>
            <ChevronsUpDown data-icon="inline-end" className="opacity-50" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        align="start"
        container={portalContainer}
        className="overflow-hidden p-0 rounded-2xl data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        onWheel={(event) => event.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={(nextValue) => {
              setSearchValue(nextValue);
              onSearchChange?.(nextValue);
            }}
          />
          <CommandList className="max-h-64 overflow-y-auto overscroll-contain">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {clearable && selectedOption ? (
              <CommandGroup heading="Acciones">
                <CommandItem
                  value={clearLabel}
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <X className="opacity-70" />
                  <span>{clearLabel}</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            {canCreate ? (
              <CommandGroup heading="Crear">
                <CommandItem
                  value={`${createLabel} ${normalizedSearch}`}
                  onSelect={() => void handleCreateOption()}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="animate-spin opacity-70" />
                  ) : (
                    <Plus className="opacity-70" />
                  )}
                  <span>
                    {isCreating
                      ? creatingLabel
                      : `${createLabel} "${normalizedSearch}"`}
                  </span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      selectedOption?.value === option.value
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
