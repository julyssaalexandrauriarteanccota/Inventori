'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginRequestSchema, type LoginRequestSchema } from '@erp/shared'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { usePublicBranding } from '@/hooks/use-public-branding'
import { ApiError } from '@/lib/api'
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { login } = useAuth()
  const { branding } = usePublicBranding()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequestSchema>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginRequestSchema) {
    setError(null)

    try {
      await login(data.email, data.password)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        return
      }

      setError('Error de conexion al servidor.')
    }
  }

  return (
    <div className={cn('flex w-full flex-col', className)} {...props}>
      <Card className="overflow-hidden rounded-2xl border-border/70 py-0 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
        <CardContent className="grid p-0 md:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex items-center justify-center p-6 md:p-9">
            <div className="w-full max-w-90">
              <CardHeader className="px-0 pb-0">
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  Bienvenido de vuelta
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Inicia sesion en tu cuenta de Inventori ERP.
                </CardDescription>
              </CardHeader>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-8 space-y-5"
              >
                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <FieldGroup className="gap-5">
                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="login-email">
                      Correo electronico
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="admin@empresa.com"
                        autoComplete="email"
                        disabled={isSubmitting}
                        className="h-11 rounded-xl border-border/70 shadow-none"
                        {...register('email')}
                      />
                      <FieldError errors={[errors.email]} />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={!!errors.password}>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor="login-password">
                        Contrasena
                      </FieldLabel>
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                      >
                        Olvidaste tu contrasena?
                      </Link>
                    </div>
                    <FieldContent>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          disabled={isSubmitting}
                          className="h-11 rounded-xl border-border/70 pr-11 shadow-none"
                          {...register('password')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={
                            showPassword
                              ? 'Ocultar contrasena'
                              : 'Mostrar contrasena'
                          }
                          className="absolute right-1 top-1 size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => setShowPassword((current) => !current)}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      </div>
                      <FieldError errors={[errors.password]} />
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
                      Ingresando...
                    </>
                  ) : (
                    'Iniciar sesion'
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                No tienes una cuenta?{' '}
                <Link
                  href="/auth/signup"
                  className="font-medium underline underline-offset-4 transition hover:text-foreground"
                >
                  Registrate
                </Link>
              </p>
            </div>
          </div>

          <AuthSidePanel
            title={branding.identity.displayName}
            description={branding.identity.shortDescription}
          />
        </CardContent>
      </Card>
    </div>
  )
}
