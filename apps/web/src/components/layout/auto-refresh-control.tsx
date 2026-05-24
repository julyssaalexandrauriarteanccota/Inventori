"use client";

import { ChevronDown, RefreshCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface AutoRefreshIntervalOption {
  label: string;
  value: number;
}

interface AutoRefreshControlProps {
  enabled: boolean;
  interval: number;
  intervals: AutoRefreshIntervalOption[];
  switchId: string;
  onEnabledChange: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
  onManualRefresh?: () => void;
  className?: string;
  isRefreshing?: boolean;
  label?: string;
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
  isRefreshing = false,
  label = "Auto",
}: AutoRefreshControlProps) {
  const showSpinner = enabled || isRefreshing;

  return (
    <div
      data-slot="auto-refresh-control"
      data-active={showSpinner}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-none",
        className,
      )}
    >
      {enabled ? (
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex size-5 animate-ping rounded-full bg-primary opacity-10" />
          <RefreshCcw
            className="size-3.5 animate-spin text-primary transition-all"
            style={{ animationDuration: "3s" }}
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
          <RefreshCcw
            className={cn(
              "size-3.5",
              isRefreshing && "animate-spin text-primary",
            )}
            style={isRefreshing ? { animationDuration: "3s" } : undefined}
          />
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
                "Auto"}
              <ChevronDown className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {intervals.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onIntervalChange(option.value)}
                className={cn(
                  "text-xs",
                  interval === option.value && "font-medium text-primary",
                )}
              >
                {option.label}
                {interval === option.value ? " ✓" : ""}
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
      />
      <Label
        htmlFor={switchId}
        className="hidden cursor-pointer text-xs text-muted-foreground sm:block dark:text-sidebar-foreground/75"
      >
        {label}
      </Label>
    </div>
  );
}
