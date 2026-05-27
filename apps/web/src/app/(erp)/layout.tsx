'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { AuthProvider } from '@/components/auth-context'
import { ErpShell } from '@/components/layout/erp-shell'
import { NavBadgesProvider } from '@/components/nav-badges'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { SocketProvider } from '@/hooks/use-socket'
import { canAccessErpPath } from '@/lib/erp-navigation'

function AuthLoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function AuthUnavailableScreen({
  label,
  onRetry,
}: {
  label: string
  onRetry: () => void
}) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="size-8 rounded-full border border-destructive/30 bg-destructive/10" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            Servidor no disponible
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authError, isAuthenticated, isLoading, retryAuth, user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

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
    return <AuthLoadingScreen label="Cargando sesion..." />
  }

  if (authError && !isAuthenticated) {
    return (
      <AuthUnavailableScreen
        label={authError}
        onRetry={() => void retryAuth()}
      />
    )
  }

  // Mientras el `router.replace` viaja al destino, mostramos un loader
  // intencional en vez de `return null`. Sin esto se ve la pantalla blanca
  // entre que el estado local se limpia (logout) y Next.js navega al login.
  if (!isAuthenticated) {
    return <AuthLoadingScreen label="Cerrando sesion..." />
  }

  if (user?.mustChangePassword) {
    return <AuthLoadingScreen label="Debes cambiar tu contrasena..." />
  }

  if (!isAllowedPath && pathname !== '/acceso-denegado') {
    return <AuthLoadingScreen label="Verificando permisos..." />
  }

  return <>{children}</>
}

export default function ErpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <SocketProvider>
        <NavBadgesProvider>
          <AuthenticatedErpShell>{children}</AuthenticatedErpShell>
        </NavBadgesProvider>
      </SocketProvider>
    </AuthProvider>
  )
}

function AuthenticatedErpShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ErpShell>{children}</ErpShell>
    </AuthGuard>
  )
}
