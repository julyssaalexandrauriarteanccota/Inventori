'use client'

import { AuthProvider } from '@/components/auth-context'
import { AuthLegalFooter } from '@/components/auth-legal-footer'
import { ChangePasswordForm } from '@/components/change-password-form'

export default function CambiarContrasenaPage() {
  return (
    <AuthProvider>
      <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 bg-background text-foreground">
        <div className="flex w-full max-w-5xl flex-col gap-6">
          <ChangePasswordForm />
          <AuthLegalFooter />
        </div>
      </div>
    </AuthProvider>
  )
}
