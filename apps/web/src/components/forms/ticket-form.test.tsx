import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const submitMock = vi.fn()
const cerrarMock = vi.fn()

vi.mock('@/hooks/use-clientes', () => ({
  useClientes: () => ({
    data: { data: [{ id: 'c1', nombre: 'Juan', apellido: 'Perez' }] },
  }),
  useCreateCliente: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/hooks/use-equipos', () => ({
  useEquipos: () => ({
    data: {
      data: [
        {
          id: 'ep1',
          numeroSerie: 'OWN-001',
          producto: { nombre: 'Equipo propio vendido' },
        },
      ],
    },
  }),
  useClienteEquipos: () => ({
    data: {
      data: [
        {
          id: 'e1',
          numeroSerie: 'SN-001',
          nombre: 'Equipo demo',
          marca: 'Demo',
          modelo: 'A1',
        },
      ],
    },
  }),
  useCreateClienteEquipo: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/hooks/use-soporte', () => ({
  useCerrarTicket: () => ({
    mutate: cerrarMock,
    isPending: false,
  }),
}))

vi.mock('@/hooks/use-configuracion', () => ({
  useUsuarios: () => ({
    data: { data: [] },
  }),
}))

vi.mock('@/hooks/use-productos', () => ({
  useProductos: () => ({
    data: { data: [] },
    isLoading: false,
  }),
}))

import { TicketForm } from './ticket-form'
import { CerrarTicketForm } from './cerrar-ticket-form'

describe('TicketForm', () => {
  beforeEach(() => {
    submitMock.mockReset()
  })

  it('renderiza los campos principales del ticket', () => {
    render(<TicketForm mode="create" onSubmit={submitMock} />)

    expect(
      screen.getByPlaceholderText('Resumen del problema'),
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Describe el problema en detalle'),
    ).toBeInTheDocument()
  })

  it('muestra "Crear ticket" en modo create', () => {
    render(<TicketForm mode="create" onSubmit={submitMock} />)
    expect(
      screen.getByRole('button', { name: /Crear ticket/i }),
    ).toBeInTheDocument()
  })

  it('muestra "Guardar cambios" en modo edit', () => {
    render(
      <TicketForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{
          titulo: 'Equipo no responde',
          descripcion: 'No inicia correctamente',
        }}
      />,
    )
    expect(
      screen.getByRole('button', { name: /Guardar cambios/i }),
    ).toBeInTheDocument()
  })

  it('no envia si faltan campos obligatorios', async () => {
    const user = userEvent.setup()
    render(<TicketForm mode="create" onSubmit={submitMock} />)

    await user.click(screen.getByRole('button', { name: /Crear ticket/i }))

    await waitFor(() => {
      expect(submitMock).not.toHaveBeenCalled()
    })
  })

  it('deshabilita el boton cuando isLoading es true', () => {
    render(<TicketForm mode="create" onSubmit={submitMock} isLoading />)
    expect(screen.getByRole('button', { name: /Creando/i })).toBeDisabled()
  })
})

describe('CerrarTicketForm', () => {
  beforeEach(() => {
    cerrarMock.mockReset()
  })

  it('renderiza los campos del formulario de cierre', () => {
    render(<CerrarTicketForm ticketId="t-123" onSuccess={vi.fn()} />)

    expect(
      screen.getByPlaceholderText('Describe la solución aplicada'),
    ).toBeInTheDocument()
    expect(screen.getByText(/se calculan automáticamente/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Cerrar ticket/i }),
    ).toBeInTheDocument()
  })

  it('no muestra firma del cliente en el cierre interno', () => {
    const { container } = render(
      <CerrarTicketForm ticketId="t-123" onSuccess={vi.fn()} />,
    )
    expect(screen.queryByText(/Firma del cliente/i)).not.toBeInTheDocument()
    expect(container.querySelector('canvas')).not.toBeInTheDocument()
  })

  it('no muestra boton de limpiar firma', () => {
    render(<CerrarTicketForm ticketId="t-123" onSuccess={vi.fn()} />)
    expect(
      screen.queryByRole('button', { name: /Limpiar/i }),
    ).not.toBeInTheDocument()
  })
})
