'use client'

import { AuthProvider } from '@/components/auth-context'
import { AuthLegalFooter } from '@/components/auth-legal-footer'
import { SignupForm } from '@/components/signup-form'

export default function SignupPage() {
  return (
    <AuthProvider>
      <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-5xl flex-col gap-6">
          <SignupForm />
          <AuthLegalFooter />
        </div>
      </div>
    </AuthProvider>
  )
}
