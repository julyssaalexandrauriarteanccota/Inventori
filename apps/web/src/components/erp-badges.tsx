import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const erpBadgeBaseClassName =
  "rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-[0.01em] shadow-none";

const atmosphereToneClassName =
  "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-on-soft)] dark:border-[var(--accent-border)] dark:bg-[var(--accent-soft)] dark:text-[var(--accent-on-soft)]";

const erpBadgeToneClassNames = {
  neutral:
    "border-border/60 bg-muted/30 text-foreground/75 dark:border-border/50 dark:bg-white/[0.02] dark:text-foreground/70",
  info: atmosphereToneClassName,
  violet: atmosphereToneClassName,
  success:
    "border-[color-mix(in_oklch,var(--semantic-success)_24%,transparent)] bg-[var(--semantic-success-soft)] text-[var(--semantic-success)] dark:border-[color-mix(in_oklch,var(--semantic-success)_24%,var(--app-border))] dark:bg-[var(--semantic-success-soft)] dark:text-[color-mix(in_oklch,var(--semantic-success)_82%,oklch(0.98_0_0))]",
  warning:
    "border-[color-mix(in_oklch,var(--semantic-warning)_24%,transparent)] bg-[var(--semantic-warning-soft)] text-[color-mix(in_oklch,var(--semantic-warning)_72%,oklch(0.18_0_0))] dark:border-[color-mix(in_oklch,var(--semantic-warning)_24%,var(--app-border))] dark:bg-[var(--semantic-warning-soft)] dark:text-[color-mix(in_oklch,var(--semantic-warning)_82%,oklch(0.98_0_0))]",
  danger:
    "border-[color-mix(in_oklch,var(--semantic-danger)_24%,transparent)] bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger)] dark:border-[color-mix(in_oklch,var(--semantic-danger)_24%,var(--app-border))] dark:bg-[var(--semantic-danger-soft)] dark:text-[color-mix(in_oklch,var(--semantic-danger)_82%,oklch(0.98_0_0))]",
} as const;

export type ErpBadgeTone = keyof typeof erpBadgeToneClassNames;

interface ErpBadgeProps extends ComponentProps<typeof Badge> {
  tone?: ErpBadgeTone;
}

export function ErpBadge({
  tone = "neutral",
  variant = "outline",
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
  );
}

interface ErpStatusBadgeProps extends Omit<ErpBadgeProps, "tone"> {
  active: boolean;
  tone?: Exclude<ErpBadgeTone, "neutral">;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function ErpStatusBadge({
  active,
  tone = "info",
  activeLabel = "Activo",
  inactiveLabel = "Inactivo",
  className,
  children,
  ...props
}: ErpStatusBadgeProps) {
  return (
    <ErpBadge
      tone={active ? tone : "neutral"}
      className={cn("gap-1.5", className)}
      {...props}
    >
      {children ?? (
        <>
          <span
            className={cn(
              "inline-flex size-1.5 rounded-full",
              active ? "bg-current opacity-80" : "bg-muted-foreground/45",
            )}
          />
          {active ? activeLabel : inactiveLabel}
        </>
      )}
    </ErpBadge>
  );
}
