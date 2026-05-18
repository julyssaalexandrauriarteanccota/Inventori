"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface OfflineQueueItem {
  id: string;
  url: string;
  method: string;
  body: string | null;
  timestamp: number;
  retries: number;
}

type FlushResult = { success: number; failed: number };

// ── IndexedDB helpers ────────────────────────────────────────────────────────

const DB_NAME = "erp-offline";
const DB_VERSION = 1;
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(): Promise<OfflineQueueItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineQueueItem[]);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(item: OfflineQueueItem): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbClear(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── useOnlineStatus ──────────────────────────────────────────────────────────

export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}

// ── useOfflineQueue ──────────────────────────────────────────────────────────

export function useOfflineQueue(token?: string | null) {
  const [pendingCount, setPendingCount] = useState(0);
  const { isOnline } = useOnlineStatus();
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const refreshCount = useCallback(async () => {
    if (typeof indexedDB === "undefined") return;
    const items = await dbGetAll();
    setPendingCount(items.length);
  }, []);

  /** Add a request to the offline queue */
  const enqueue = useCallback(
    async (url: string, method: string, body: unknown): Promise<void> => {
      const item: OfflineQueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url,
        method: method.toUpperCase(),
        body: body != null ? JSON.stringify(body) : null,
        timestamp: Date.now(),
        retries: 0,
      };
      await dbPut(item);
      setPendingCount((c) => c + 1);
    },
    [],
  );

  /** Replay all queued requests and return counts */
  const flush = useCallback(async (): Promise<FlushResult> => {
    if (typeof indexedDB === "undefined") return { success: 0, failed: 0 };
    const items = await dbGetAll();
    let success = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (tokenRef.current)
          headers["Authorization"] = `Bearer ${tokenRef.current}`;

        const res = await fetch(item.url, {
          method: item.method,
          headers,
          body: item.body ?? undefined,
        });

        if (res.ok || res.status < 500) {
          await dbDelete(item.id);
          success++;
        } else {
          const updated: OfflineQueueItem = {
            ...item,
            retries: item.retries + 1,
          };
          await dbPut(updated);
          failed++;
        }
      } catch {
        const updated: OfflineQueueItem = {
          ...item,
          retries: item.retries + 1,
        };
        await dbPut(updated);
        failed++;
      }
    }

    await refreshCount();
    return { success, failed };
  }, [refreshCount]);

  useEffect(() => {
    let cancelled = false;

    if (typeof indexedDB === "undefined") {
      return;
    }

    void dbGetAll()
      .then((items) => {
        if (cancelled) {
          return;
        }

        setPendingCount(items.length);

        if (navigator.onLine && items.length > 0) {
          void flush().catch(() => undefined);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [flush]);

  /** Clear the entire queue (use only for testing / manual reset) */
  const clear = useCallback(async () => {
    await dbClear();
    setPendingCount(0);
  }, []);

  // Auto-flush when coming back online.
  useEffect(() => {
    function handleOnline() {
      if (pendingCount > 0) {
        void flush().catch(() => undefined);
      }
    }

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [pendingCount, flush]);

  return { pendingCount, enqueue, flush, clear, isOnline };
}
