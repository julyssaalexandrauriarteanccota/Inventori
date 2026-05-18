'use client'

import { AuthProvider } from '@/components/auth-context'
import { AuthLegalFooter } from '@/components/auth-legal-footer'
import { ForgotPasswordForm } from '@/components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthProvider>
      <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-5xl flex-col gap-6">
          <ForgotPasswordForm />
          <AuthLegalFooter />
        </div>
      </div>
    </AuthProvider>
  )
}
