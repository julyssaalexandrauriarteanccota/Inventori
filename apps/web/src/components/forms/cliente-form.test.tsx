import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const submitMock = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { rol: 'ADMIN' } }),
}))

vi.mock('@/components/location/location-picker', () => ({
  LocationPicker: () => <div data-testid="location-picker" />,
}))

import { ClienteForm } from './cliente-form'

describe('ClienteForm', () => {
  beforeEach(() => {
    submitMock.mockReset()
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('renderiza los campos de persona natural por defecto', () => {
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    expect(screen.getByPlaceholderText('Nombres')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Apellidos completos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('12345678')).toBeInTheDocument()
    expect(screen.queryByTestId('location-picker')).not.toBeInTheDocument()
  })

  it('muestra el boton con texto "Crear cliente" en modo create', () => {
    render(<ClienteForm mode="create" onSubmit={submitMock} />)
    expect(screen.getByRole('button', { name: /Crear cliente/i })).toBeInTheDocument()
  })

  it('muestra el boton con texto "Guardar cambios" en modo edit', () => {
    render(
      <ClienteForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{ nombre: 'Juan', apellido: 'Perez', dni: '12345678' }}
      />,
    )
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
  })

  it('muestra errores de validacion si se envia vacio', async () => {
    const user = userEvent.setup()
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    await user.click(screen.getByRole('button', { name: /Crear cliente/i }))

    await waitFor(() => {
      expect(submitMock).not.toHaveBeenCalled()
    })
  })

  it('permite escribir en los campos de texto', async () => {
    const user = userEvent.setup()
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    const nombreInput = screen.getByPlaceholderText('Nombres')
    await user.type(nombreInput, 'Juan')
    expect(nombreInput).toHaveValue('Juan')

    const apellidoInput = screen.getByPlaceholderText('Apellidos completos')
    await user.type(apellidoInput, 'Perez')
    expect(apellidoInput).toHaveValue('Perez')
  })

  it('carga valores por defecto en modo edit', () => {
    render(
      <ClienteForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{
          nombre: 'Maria',
          apellido: 'Lopez',
          dni: '87654321',
          email: 'maria@test.com',
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Nombres')).toHaveValue('Maria')
    expect(screen.getByPlaceholderText('Apellidos completos')).toHaveValue('Lopez')
    expect(screen.getByPlaceholderText('12345678')).toHaveValue('87654321')
    expect(screen.getByPlaceholderText('correo@ejemplo.com')).toHaveValue('maria@test.com')
  })

  it('deshabilita el boton cuando isLoading es true', () => {
    render(<ClienteForm mode="create" onSubmit={submitMock} isLoading />)
    expect(screen.getByRole('button', { name: /Creando/i })).toBeDisabled()
  })

  it('usa Puno como ubigeo por defecto en modo create', () => {
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    expect(screen.getByRole('combobox', { name: 'Departamento' })).toHaveTextContent('Puno')
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveTextContent('Puno')
    expect(screen.getByRole('combobox', { name: 'Distrito' })).toHaveTextContent('Puno')
  })

  it('limpia provincia y distrito cuando cambia el departamento', async () => {
    const user = userEvent.setup()
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    await user.click(screen.getByRole('combobox', { name: 'Departamento' }))
    await user.click(screen.getByRole('option', { name: 'Lima' }))

    expect(screen.getByRole('combobox', { name: 'Departamento' })).toHaveTextContent('Lima')
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveTextContent('Seleccionar provincia')
    expect(screen.getByRole('combobox', { name: 'Distrito' })).toHaveTextContent('Seleccionar distrito')
  })

  it('muestra el bloque de mapa solo cuando se activa el boton', async () => {
    const user = userEvent.setup()
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    await user.click(screen.getByRole('button', { name: /Mapa y coordenadas/i }))

    expect(screen.getByTestId('location-picker')).toBeInTheDocument()
  })
})
