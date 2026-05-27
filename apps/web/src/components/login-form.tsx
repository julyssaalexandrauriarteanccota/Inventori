'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginRequestSchema, type LoginRequestSchema } from '@erp/shared'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'

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
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="flex items-center justify-center px-4 py-8 sm:p-8 md:p-12">
            <div className="w-full max-w-[360px]">
              <CardHeader className="px-0 pb-0">
                <CardTitle className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground/90">
                  Bienvenido de vuelta
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Inicia sesion en tu cuenta de Inventori ERP.
                </CardDescription>
              </CardHeader>

              <div className="h-px bg-border/60 my-6" />

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-0 space-y-6"
              >
                {error ? (
                  <div
                    className="flex items-start gap-2 rounded-xl border px-3 py-2 text-sm"
                    style={{
                      color: 'oklch(0.60 0.22 25)',
                      borderColor: 'oklch(0.60 0.22 25 / 0.3)',
                      backgroundColor: 'oklch(0.60 0.22 25 / 0.05)',
                    }}
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" style={{ color: 'oklch(0.60 0.22 25)' }} />
                    <span>{error}</span>
                  </div>
                ) : null}

                <FieldGroup className="gap-4">
                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="login-email">
                      Correo electronico
                    </FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-primary/60" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="admin@empresa.com"
                          autoComplete="email"
                          disabled={isSubmitting}
                          className={cn(
                            "h-12 rounded-xl border-border/70 pl-11 pr-4 py-3 shadow-none focus-visible:ring-primary/20 focus-visible:ring-[3px] focus-visible:border-primary transition-all duration-200",
                            errors.email && "border-[oklch(0.60_0.22_25)] focus-visible:border-[oklch(0.60_0.22_25)] focus-visible:ring-[oklch(0.60_0.22_25)/20]"
                          )}
                          style={errors.email ? { borderColor: 'oklch(0.60 0.22 25)' } : undefined}
                          aria-invalid={!!errors.email}
                          {...register('email')}
                        />
                      </div>
                      {errors.email?.message && (
                        <div
                          className="flex items-center gap-1.5 text-sm mt-1.5 font-normal"
                          style={{ color: 'oklch(0.60 0.22 25)' }}
                          role="alert"
                        >
                          <AlertCircle className="size-4 shrink-0" style={{ color: 'oklch(0.60 0.22 25)' }} />
                          <span>{errors.email.message}</span>
                        </div>
                      )}
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
                        <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-primary/60" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          disabled={isSubmitting}
                          className={cn(
                            "h-12 rounded-xl border-border/70 pl-11 pr-12 py-3 shadow-none focus-visible:ring-primary/20 focus-visible:ring-[3px] focus-visible:border-primary transition-all duration-200",
                            errors.password && "border-[oklch(0.60_0.22_25)] focus-visible:border-[oklch(0.60_0.22_25)] focus-visible:ring-[oklch(0.60_0.22_25)/20]"
                          )}
                          style={errors.password ? { borderColor: 'oklch(0.60 0.22 25)' } : undefined}
                          aria-invalid={!!errors.password}
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
                          className="absolute right-1.5 top-1.5 size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-transform active:scale-95 duration-150 ease-out"
                          onClick={() => setShowPassword((current) => !current)}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      </div>
                      {errors.password?.message && (
                        <div
                          className="flex items-center gap-1.5 text-sm mt-1.5 font-normal"
                          style={{ color: 'oklch(0.60 0.22 25)' }}
                          role="alert"
                        >
                          <AlertCircle className="size-4 shrink-0" style={{ color: 'oklch(0.60 0.22 25)' }} />
                          <span>{errors.password.message}</span>
                        </div>
                      )}
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl py-3 px-8 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]"
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

              <div className="h-px bg-border/60 my-6" />

              <p className="mt-0 text-center text-sm text-muted-foreground">
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
