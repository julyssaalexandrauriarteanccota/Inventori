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

import { useAprobarOrdenCompra } from './use-compras'

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

describe('use-compras', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aprueba ordenes de compra usando el endpoint del contrato', async () => {
    apiMock.patch.mockResolvedValue({ data: { id: 'oc-1' } })

    const hook = renderHook(() => useAprobarOrdenCompra(), {
      wrapper: createWrapper(),
    })

    act(() => {
      hook.result.current.mutate('oc-1')
    })

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith('/compras/oc-1/aprobar', {})
    })
  })
})
