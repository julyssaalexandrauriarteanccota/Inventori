import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EstadoTicket } from '@erp/shared'
import type { ReactNode } from 'react'

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ api: apiMock }))

import {
  useCerrarTicket,
  useCreateTicket,
  useTickets,
} from './use-soporte'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('use-soporte', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista tickets contra el endpoint del contrato', async () => {
    apiMock.get.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 1, timestamp: '2026-04-20T00:00:00.000Z' },
    })

    renderHook(
      () => useTickets({ estado: EstadoTicket.ABIERTO, limit: 1 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith('/soporte/tickets?limit=1&estado=ABIERTO')
    })
  })

  it('crea y cierra tickets usando /soporte/tickets', async () => {
    apiMock.post.mockResolvedValue({ data: { id: 'ticket-1' } })
    apiMock.patch.mockResolvedValue({ data: { id: 'ticket-1' } })

    const createHook = renderHook(() => useCreateTicket(), { wrapper: createWrapper() })
    const closeHook = renderHook(() => useCerrarTicket('ticket-1'), { wrapper: createWrapper() })

    act(() => {
      createHook.result.current.mutate({
        clienteId: '11111111-1111-1111-1111-111111111111',
        titulo: 'Equipo atascado',
        descripcion: 'No imprime',
      })
    })

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith('/soporte/tickets', {
        clienteId: '11111111-1111-1111-1111-111111111111',
        titulo: 'Equipo atascado',
        descripcion: 'No imprime',
      })
    })

    act(() => {
      closeHook.result.current.mutate({ solucion: 'Limpieza completa' })
    })

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith(
        '/soporte/tickets/ticket-1/cerrar',
        { solucion: 'Limpieza completa' },
      )
    })
  })
})
