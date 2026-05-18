import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── Mocks ──

const mockUseTicket = vi.fn()

vi.mock('@/hooks/use-public', () => ({
  useTicketPublico: (...args: unknown[]) => mockUseTicket(...args),
}))

import { TicketContent } from './ticket-content'

const sampleTicket = {
  titulo: 'Equipo no enciende',
  codigo: 'TK-000042',
  estado: 'EN_PROGRESO',
  prioridad: 'ALTA',
  tipoServicio: 'SOPORTE_TECNICO',
  fechaRecepcion: '2024-06-01T00:00:00.000Z',
  fechaPromesa: '2024-06-10T00:00:00.000Z',
  fechaCierre: null,
}

beforeEach(() => {
  mockUseTicket.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  })
})

describe('TicketContent', () => {
  it('renderiza formulario con placeholder correcto', () => {
    render(<TicketContent />)

    expect(screen.getByPlaceholderText(/TK-000001/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /consultar/i }),
    ).toBeInTheDocument()
  })

  it('botón submit deshabilitado cuando input vacío', () => {
    render(<TicketContent />)

    expect(screen.getByRole('button', { name: /consultar/i })).toBeDisabled()
  })

  it('muestra tarjeta de ticket tras búsqueda exitosa', async () => {
    const user = userEvent.setup()

    mockUseTicket.mockImplementation((code: string) => ({
      data: code ? { data: sampleTicket } : undefined,
      isLoading: false,
      isError: false,
    }))

    render(<TicketContent />)

    const input = screen.getByPlaceholderText(/TK-000001/)
    await user.type(input, 'TK-000042')
    await user.click(screen.getByRole('button', { name: /consultar/i }))

    expect(screen.getByText('Equipo no enciende')).toBeInTheDocument()
    expect(screen.getByText(/TK-000042/)).toBeInTheDocument()
    expect(screen.getByText('EN PROGRESO')).toBeInTheDocument()
    expect(screen.getByText('ALTA')).toBeInTheDocument()
  })

  it('muestra mensaje de error cuando ticket no encontrado', async () => {
    const user = userEvent.setup()

    mockUseTicket.mockImplementation((code: string) => ({
      data: undefined,
      isLoading: false,
      isError: !!code,
    }))

    render(<TicketContent />)

    const input = screen.getByPlaceholderText(/TK-000001/)
    await user.type(input, 'INVALID')
    await user.click(screen.getByRole('button', { name: /consultar/i }))

    expect(screen.getByText(/no se encontró un ticket/i)).toBeInTheDocument()
  })

  it('muestra skeleton mientras carga', async () => {
    const user = userEvent.setup()

    mockUseTicket.mockImplementation((code: string) => ({
      data: undefined,
      isLoading: !!code,
      isError: false,
    }))

    const { container } = render(<TicketContent />)

    const input = screen.getByPlaceholderText(/TK-000001/)
    await user.type(input, 'TK-123')
    await user.click(screen.getByRole('button', { name: /consultar/i }))

    const skeletons = container.querySelectorAll(
      '[class*="animate-pulse"], [data-slot="skeleton"]',
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
