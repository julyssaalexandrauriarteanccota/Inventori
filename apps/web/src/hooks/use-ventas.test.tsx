import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ api: apiMock }))

import { useConfirmarVenta, useEntregarVenta } from './use-ventas'

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

describe('use-ventas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('confirma y entrega ventas contra los endpoints esperados', async () => {
    apiMock.patch.mockResolvedValue({ data: { id: 'venta-1' } })

    const confirmHook = renderHook(() => useConfirmarVenta('venta-1'), {
      wrapper: createWrapper(),
    })
    const deliverHook = renderHook(() => useEntregarVenta(), {
      wrapper: createWrapper(),
    })

    act(() => {
      confirmHook.result.current.mutate({
        metodoPagoId: '11111111-1111-1111-1111-111111111111',
        almacenId: '22222222-2222-2222-2222-222222222222',
        referenciaPago: 'OP-001',
      })
    })

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith('/ventas/venta-1/confirmar', {
        metodoPagoId: '11111111-1111-1111-1111-111111111111',
        almacenId: '22222222-2222-2222-2222-222222222222',
        referenciaPago: 'OP-001',
      })
    })

    act(() => {
      deliverHook.result.current.mutate('venta-1')
    })

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith('/ventas/venta-1/entregar', {})
    })
  })
})
