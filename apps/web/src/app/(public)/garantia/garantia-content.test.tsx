import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── Mocks ──

const mockUseGarantia = vi.fn()

vi.mock('@/hooks/use-public', () => ({
  useGarantiaPublica: (...args: unknown[]) => mockUseGarantia(...args),
}))

import { GarantiaContent } from './garantia-content'

const sampleGarantia = {
  estado: 'ACTIVA',
  vigente: true,
  fechaInicio: '2024-01-15T00:00:00.000Z',
  fechaFin: '2025-01-15T00:00:00.000Z',
  cobertura: 'Cobertura completa de piezas y mano de obra',
  exclusiones: 'Daño por agua',
  equipo: {
    numeroSerie: 'SN-12345',
    producto: {
      nombre: 'Equipo portátil empresarial',
      modelo: 'PRO-14',
      marca: { nombre: 'Marca Demo' },
    },
  },
}

beforeEach(() => {
  mockUseGarantia.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  })
})

describe('GarantiaContent', () => {
  it('renderiza formulario de búsqueda con input y botón', () => {
    render(<GarantiaContent />)

    expect(screen.getByPlaceholderText(/código qr/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /consultar/i }),
    ).toBeInTheDocument()
  })

  it('botón submit deshabilitado cuando input vacío', () => {
    render(<GarantiaContent />)

    expect(screen.getByRole('button', { name: /consultar/i })).toBeDisabled()
  })

  it('muestra tarjeta de garantía tras búsqueda exitosa', async () => {
    const user = userEvent.setup()

    mockUseGarantia.mockImplementation((code: string) => ({
      data: code ? { data: sampleGarantia } : undefined,
      isLoading: false,
      isError: false,
    }))

    render(<GarantiaContent />)

    const input = screen.getByPlaceholderText(/código qr/i)
    await user.type(input, 'QR-TEST-123')
    await user.click(screen.getByRole('button', { name: /consultar/i }))

    expect(screen.getByText('Equipo portátil empresarial')).toBeInTheDocument()
    expect(screen.getByText('Vigente')).toBeInTheDocument()
    expect(screen.getByText('SN-12345')).toBeInTheDocument()
    expect(screen.getByText(/cobertura completa/i)).toBeInTheDocument()
  })

  it('muestra mensaje de error cuando no se encuentra garantía', async () => {
    const user = userEvent.setup()

    mockUseGarantia.mockImplementation((code: string) => ({
      data: undefined,
      isLoading: false,
      isError: !!code,
    }))

    render(<GarantiaContent />)

    const input = screen.getByPlaceholderText(/código qr/i)
    await user.type(input, 'INVALID')
    await user.click(screen.getByRole('button', { name: /consultar/i }))

    expect(screen.getByText(/no se encontró una garantía/i)).toBeInTheDocument()
  })

  it('muestra skeleton mientras carga', async () => {
    const user = userEvent.setup()

    mockUseGarantia.mockImplementation((code: string) => ({
      data: undefined,
      isLoading: !!code,
      isError: false,
    }))

    const { container } = render(<GarantiaContent />)

    const input = screen.getByPlaceholderText(/código qr/i)
    await user.type(input, 'QR-123')
    await user.click(screen.getByRole('button', { name: /consultar/i }))

    const skeletons = container.querySelectorAll(
      '[class*="animate-pulse"], [data-slot="skeleton"]',
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
