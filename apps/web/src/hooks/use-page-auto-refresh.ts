"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  DEFAULT_AUTO_REFRESH_INTERVAL,
  DEFAULT_AUTO_REFRESH_INTERVALS,
  getAutoRefreshIntervalLabel,
  getAutoRefreshQueryKeys,
  readStoredAutoRefreshPreference,
  writeStoredAutoRefreshPreference,
} from "@/lib/auto-refresh";
import { useStoredAutoRefresh } from "@/hooks/use-stored-auto-refresh";

interface UsePageAutoRefreshOptions {
  scope: string;
  toastLabel?: string;
  defaultInterval?: number;
  queryKeys?: readonly QueryKey[];
  refetchActiveQueries?: boolean;
  manualToastMessage?: string;
  toastId?: string;
  onRefresh?: () => void | Promise<void>;
}

export function usePageAutoRefresh({
  scope,
  toastLabel = "Datos",
  defaultInterval = DEFAULT_AUTO_REFRESH_INTERVAL,
  queryKeys,
  refetchActiveQueries = false,
  manualToastMessage,
  toastId,
  onRefresh,
}: UsePageAutoRefreshOptions) {
  const queryClient = useQueryClient();

  const readPreference = useCallback(
    () => readStoredAutoRefreshPreference(scope, defaultInterval),
    [defaultInterval, scope],
  );

  const writePreference = useCallback(
    (preference: { enabled: boolean; interval: number }) =>
      writeStoredAutoRefreshPreference(scope, preference),
    [scope],
  );

  const resolvedQueryKeys = useMemo(() => {
    if (queryKeys) {
      return queryKeys;
    }

    if (onRefresh) {
      return [];
    }

    return [...getAutoRefreshQueryKeys(scope)];
  }, [onRefresh, queryKeys, scope]);

  const refreshQueries = useCallback(async () => {
    if (resolvedQueryKeys.length > 0) {
      await Promise.all(
        resolvedQueryKeys.map((queryKey) =>
          queryClient.refetchQueries({ queryKey, type: "active" }),
        ),
      );
      return;
    }

    if (refetchActiveQueries) {
      await queryClient.refetchQueries({ type: "active" });
    }
  }, [queryClient, refetchActiveQueries, resolvedQueryKeys]);

  const refreshAsync = useCallback(async () => {
    await refreshQueries();
    await onRefresh?.();
  }, [onRefresh, refreshQueries]);

  const refresh = useCallback(() => {
    void refreshAsync();
  }, [refreshAsync]);

  const stored = useStoredAutoRefresh({
    readPreference,
    writePreference,
    onRefresh: refresh,
  });

  const setEnabled = useCallback(
    (enabled: boolean) => {
      stored.setEnabled(enabled);
      const intervalLabel = getAutoRefreshIntervalLabel(
        stored.interval,
        DEFAULT_AUTO_REFRESH_INTERVALS,
      );

      toast[enabled ? "success" : "info"](
        enabled
          ? `Auto-refresh activado cada ${intervalLabel}`
          : "Auto-refresh desactivado",
        { id: toastId ? `${toastId}:toggle` : undefined, duration: 1800 },
      );
    },
    [stored, toastId],
  );

  const setInterval = useCallback(
    (interval: number) => {
      stored.setInterval(interval);

      if (stored.enabled) {
        const intervalLabel = getAutoRefreshIntervalLabel(
          interval,
          DEFAULT_AUTO_REFRESH_INTERVALS,
        );
        toast.info(`Auto-refresh cada ${intervalLabel}`, {
          id: toastId ? `${toastId}:interval` : undefined,
          duration: 1600,
        });
      }
    },
    [stored, toastId],
  );

  const manualRefresh = useCallback(() => {
    refresh();
    toast.info(manualToastMessage ?? `${toastLabel} actualizados`, {
      id: toastId ? `${toastId}:manual` : undefined,
      duration: 1600,
    });
  }, [manualToastMessage, refresh, toastId, toastLabel]);

  return {
    enabled: stored.enabled,
    interval: stored.interval,
    setEnabled,
    setInterval,
    refresh,
    manualRefresh,
    switchId: `auto-refresh-${scope}`,
  };
}

export type PageAutoRefreshState = ReturnType<typeof usePageAutoRefresh>;
