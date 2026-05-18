import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useOnlineStatus, useOfflineQueue } from './use-offline-sync'

// ── IndexedDB stub ────────────────────────────────────────────────────────────

function makeRequest<T>(result: T) {
  const req: Record<string, unknown> = { result, onerror: null }
  Object.defineProperty(req, 'onsuccess', {
    set(fn: () => void) { setTimeout(fn, 0) },
    get() { return null },
  })
  return req
}

const dbStore: Record<string, object> = {}

const objectStore = {
  getAll: () => makeRequest(Object.values(dbStore)),
  put: (item: { id: string }) => { dbStore[item.id] = item; return makeRequest(undefined) },
  delete: (id: string) => { delete dbStore[id]; return makeRequest(undefined) },
  clear: () => { Object.keys(dbStore).forEach((k) => delete dbStore[k]); return makeRequest(undefined) },
}

const mockDb = {
  objectStoreNames: { contains: () => true },
  transaction: () => ({ objectStore: () => objectStore }),
  createObjectStore: vi.fn(),
}

vi.stubGlobal('indexedDB', {
  open: () => {
    const req: Record<string, unknown> = { result: mockDb, onerror: null, onupgradeneeded: null }
    Object.defineProperty(req, 'onsuccess', {
      set(fn: (e: { target: typeof req }) => void) { setTimeout(() => fn({ target: req }), 0) },
      get() { return null },
    })
    return req
  },
})

// ── useOnlineStatus ───────────────────────────────────────────────────────────

describe('useOnlineStatus', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('devuelve true cuando navigator.onLine es true', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.isOnline).toBe(true)
  })

  it('devuelve false cuando navigator.onLine es false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.isOnline).toBe(false)
  })

  it('actualiza isOnline al disparar evento offline', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.isOnline).toBe(true)

    act(() => { window.dispatchEvent(new Event('offline')) })

    expect(result.current.isOnline).toBe(false)
  })

  it('actualiza isOnline al disparar evento online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())

    act(() => { window.dispatchEvent(new Event('online')) })

    expect(result.current.isOnline).toBe(true)
  })

  it('limpia los event listeners al desmontar', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useOnlineStatus())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
  })
})

// ── useOfflineQueue ───────────────────────────────────────────────────────────

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    Object.keys(dbStore).forEach((k) => delete dbStore[k])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('expone las funciones enqueue, flush y clear', () => {
    const { result } = renderHook(() => useOfflineQueue())
    expect(typeof result.current.enqueue).toBe('function')
    expect(typeof result.current.flush).toBe('function')
    expect(typeof result.current.clear).toBe('function')
  })

  it('inicia con pendingCount 0', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    expect(result.current.pendingCount).toBe(0)
  })

  it('encola un item y aumenta pendingCount', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    await act(async () => {
      await result.current.enqueue('/api/v1/soporte/tickets/abc/cerrar', 'PATCH', { observaciones: 'ok' })
    })
    expect(result.current.pendingCount).toBe(1)
  })

  it('clear vacia la cola', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    await act(async () => {
      await result.current.enqueue('/api/v1/soporte/tickets/abc/cerrar', 'PATCH', null)
    })
    expect(result.current.pendingCount).toBe(1)

    await act(async () => { await result.current.clear() })
    expect(result.current.pendingCount).toBe(0)
  })

  it('refleja isOnline del estado de conexion', () => {
    const { result } = renderHook(() => useOfflineQueue())
    expect(result.current.isOnline).toBe(true)

    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(result.current.isOnline).toBe(false)
  })
})

