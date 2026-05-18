'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordRequestSchema, type ForgotPasswordRequestSchema } from '@erp/shared'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { api, ApiError } from '@/lib/api'
import { AuthSidePanel } from '@/components/auth-side-panel'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordRequestSchema>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: ForgotPasswordRequestSchema) {
    setError(null)

    try {
      await api.post('/auth/forgot-password', { email: data.email }, { skipAuth: true })
      setSuccess(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        return
      }

      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className={cn('flex w-full flex-col', className)} {...props}>
        <Card className="rounded-2xl border-border/70 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
          <CardContent className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Revisa tu correo</h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Si existe una cuenta asociada a ese correo, recibiras un enlace para restablecer la contrasena.
              </p>
            </div>
            <Link href="/auth/login">
              <Button variant="outline" className="mt-2 rounded-xl">
                <ArrowLeft className="mr-2 size-4" />
                Volver al inicio de sesion
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex w-full flex-col', className)} {...props}>
      <Card className="overflow-hidden rounded-2xl border-border/70 py-0 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
        <CardContent className="grid p-0 md:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex items-center justify-center p-6 md:p-9">
            <div className="w-full max-w-[360px]">
              <CardHeader className="px-0 pb-0">
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  Recuperar contrasena
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Te enviaremos instrucciones para recuperar el acceso.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <FieldGroup className="gap-5">
                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="forgot-password-email">Correo electronico</FieldLabel>
                    <FieldContent>
                      <Input
                        id="forgot-password-email"
                        type="email"
                        placeholder="m@ejemplo.com"
                        autoComplete="email"
                        disabled={isSubmitting}
                        className="h-11 rounded-xl border-border/70 shadow-none"
                        {...register('email')}
                      />
                      <FieldDescription>
                        Te enviaremos un enlace seguro si la cuenta existe.
                      </FieldDescription>
                      <FieldError errors={[errors.email]} />
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl text-sm font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace de recuperacion'
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 font-medium underline underline-offset-4 transition hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                  Volver al inicio de sesion
                </Link>
              </p>
            </div>
          </div>

          <AuthSidePanel
            title="Recuperacion segura"
            description="Protege el acceso a tu cuenta y vuelve al ERP con un flujo guiado y seguro."
          />
        </CardContent>
      </Card>
    </div>
  )
}
