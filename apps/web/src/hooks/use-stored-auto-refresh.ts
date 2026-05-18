'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface StoredAutoRefreshPreference {
  enabled: boolean
  interval: number
}

interface UseStoredAutoRefreshOptions {
  readPreference: () => StoredAutoRefreshPreference
  writePreference: (preference: StoredAutoRefreshPreference) => void
  onRefresh: () => void
}

export function useStoredAutoRefresh({
  readPreference,
  writePreference,
  onRefresh,
}: UseStoredAutoRefreshOptions) {
  const initialPreference = useMemo(() => readPreference(), [readPreference])
  const [enabled, setEnabled] = useState(initialPreference.enabled)
  const [interval, setIntervalValue] = useState(initialPreference.interval)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    writePreference({ enabled, interval })
  }, [enabled, interval, writePreference])

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (enabled) {
      timerRef.current = setInterval(() => {
        onRefresh()
      }, interval)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [enabled, interval, onRefresh])

  return {
    enabled,
    interval,
    setEnabled,
    setInterval: setIntervalValue,
  }
}
