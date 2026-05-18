import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mocks ---

const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/dashboard',
}))

const useAuthReturn = {
  user: null as {
    id: string
    nombre: string
    apellido: string
    email: string
    rol: string
    activo: boolean
    mustChangePassword: boolean
    ultimoAcceso: string | null
    createdAt: string
  } | null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasRole: vi.fn(),
}

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => useAuthReturn,
}))

vi.mock('@/lib/erp-navigation', () => ({
  canAccessErpPath: (pathname: string, rol: string) => {
    if (pathname === '/acceso-denegado') return true
    if (rol === 'ADMIN') return true
    if (rol === 'TECNICO' && pathname === '/reportes') return false
    return true
  },
}))

// Inline AuthGuard extracted from layout (cannot import Next.js layout directly)
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { canAccessErpPath } from '@/lib/erp-navigation'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  // Use the mocked pathname from next/navigation
  const pathname = '/dashboard'

  const isAllowedPath = user ? canAccessErpPath(pathname, user.rol) : false

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login')
      return
    }

    if (!isLoading && isAuthenticated && user?.mustChangePassword) {
      router.replace('/auth/cambiar-contrasena')
      return
    }

    if (!isLoading && isAuthenticated && user && !isAllowedPath) {
      router.replace('/acceso-denegado')
    }
  }, [isAllowedPath, isAuthenticated, isLoading, pathname, router, user])

  if (isLoading) {
    return (
      <div>
        <p>Cargando sesion...</p>
      </div>
    )
  }

  if (!isAuthenticated || user?.mustChangePassword) {
    return null
  }

  if (!isAllowedPath) {
    return null
  }

  return <>{children}</>
}

const ADMIN_USER = {
  id: '1',
  nombre: 'Admin',
  apellido: 'Test',
  email: 'admin@test.com',
  rol: 'ADMIN' as const,
  activo: true,
  mustChangePassword: false,
  ultimoAcceso: null,
  createdAt: '2024-01-01',
}

describe('AuthGuard', () => {
  beforeEach(() => {
    replaceMock.mockReset()
    useAuthReturn.user = null
    useAuthReturn.isLoading = false
    useAuthReturn.isAuthenticated = false
  })

  it('muestra spinner mientras carga la sesion', () => {
    useAuthReturn.isLoading = true

    render(
      <AuthGuard>
        <div>Contenido protegido</div>
      </AuthGuard>,
    )

    expect(screen.getByText('Cargando sesion...')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('redirige a login cuando no hay sesion', async () => {
    useAuthReturn.isLoading = false
    useAuthReturn.isAuthenticated = false

    render(
      <AuthGuard>
        <div>Contenido protegido</div>
      </AuthGuard>,
    )

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/auth/login')
    })

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('renderiza children cuando hay sesion autenticada', () => {
    useAuthReturn.isLoading = false
    useAuthReturn.isAuthenticated = true
    useAuthReturn.user = ADMIN_USER

    render(
      <AuthGuard>
        <div>Contenido protegido</div>
      </AuthGuard>,
    )

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('redirige a cambiar-contrasena si mustChangePassword es true', async () => {
    useAuthReturn.isLoading = false
    useAuthReturn.isAuthenticated = true
    useAuthReturn.user = { ...ADMIN_USER, mustChangePassword: true }

    render(
      <AuthGuard>
        <div>Contenido protegido</div>
      </AuthGuard>,
    )

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/auth/cambiar-contrasena')
    })

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })
})
