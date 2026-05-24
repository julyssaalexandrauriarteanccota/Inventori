"use client";

import { DEFAULT_AUTO_REFRESH_INTERVALS } from "@/lib/auto-refresh";
import type { PageAutoRefreshState } from "@/hooks/use-page-auto-refresh";
import {
  AutoRefreshControl,
  type AutoRefreshIntervalOption,
} from "./auto-refresh-control";

interface PageAutoRefreshControlProps {
  autoRefresh: PageAutoRefreshState;
  intervals?: AutoRefreshIntervalOption[];
  className?: string;
  isRefreshing?: boolean;
  label?: string;
}

export function PageAutoRefreshControl({
  autoRefresh,
  intervals = [...DEFAULT_AUTO_REFRESH_INTERVALS],
  className,
  isRefreshing,
  label,
}: PageAutoRefreshControlProps) {
  return (
    <AutoRefreshControl
      enabled={autoRefresh.enabled}
      interval={autoRefresh.interval}
      intervals={intervals}
      switchId={autoRefresh.switchId}
      onEnabledChange={autoRefresh.setEnabled}
      onIntervalChange={autoRefresh.setInterval}
      onManualRefresh={autoRefresh.manualRefresh}
      className={className}
      isRefreshing={isRefreshing}
      label={label}
    />
  );
}
