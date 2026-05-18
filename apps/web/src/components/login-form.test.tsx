import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loginMock = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}))

vi.mock('@/hooks/use-public-branding', () => ({
  usePublicBranding: () => ({
    branding: {
      identity: {
        displayName: 'Inventori',
        shortDescription: 'ERP reutilizable',
      },
    },
  }),
}))

import { ApiError } from '@/lib/api'
import { LoginForm } from '@/components/login-form'

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset()
  })

  it('envia las credenciales al flujo de login', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValue(undefined)

    render(<LoginForm />)

    await user.type(
      screen.getByLabelText('Correo electronico'),
      'admin@empresa.com',
    )
    await user.type(screen.getByLabelText('Contrasena'), 'Admin123!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesion' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin@empresa.com', 'Admin123!')
    })
  })

  it('muestra el mensaje del backend si el login falla', async () => {
    const user = userEvent.setup()
    loginMock.mockRejectedValue(
      new ApiError('Credenciales invalidas', 401, 'INVALID_CREDENTIALS'),
    )

    render(<LoginForm />)

    await user.type(
      screen.getByLabelText('Correo electronico'),
      'admin@empresa.com',
    )
    await user.type(screen.getByLabelText('Contrasena'), 'Admin123!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesion' }))

    expect(
      await screen.findByText('Credenciales invalidas'),
    ).toBeInTheDocument()
  })

  it('permite mostrar y ocultar la contrasena', async () => {
    const user = userEvent.setup()

    render(<LoginForm />)

    const passwordInput = screen.getByLabelText('Contrasena')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar contrasena' }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Ocultar contrasena' }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})
