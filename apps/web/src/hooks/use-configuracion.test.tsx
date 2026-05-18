import { renderHook, waitFor } from '@testing-library/react'
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

import { useDashboardKpis } from './use-configuracion'

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

describe('use-configuracion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('consulta KPIs del dashboard en el endpoint del contrato', async () => {
    apiMock.get.mockResolvedValue({
      data: {
        ventasMes: { totalMonto: 0, cantidad: 0 },
        tickets: { abiertos: 0, cerradosMes: 0 },
        alertasStockPendientes: 0,
        clientesNuevosMes: 0,
      },
      meta: { timestamp: '2026-04-20T00:00:00.000Z' },
    })

    renderHook(() => useDashboardKpis(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith('/reportes/dashboard')
    })
  })
})
