import { AuthLegalFooter } from '@/components/auth-legal-footer'
import { ResetPasswordForm } from '@/components/reset-password-form'

interface PageProps {
  searchParams: Promise<{
    token?: string | string[]
  }>
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = Array.isArray(params.token) ? params.token[0] : params.token

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <ResetPasswordForm token={token} />
        <AuthLegalFooter />
      </div>
    </div>
  )
}
