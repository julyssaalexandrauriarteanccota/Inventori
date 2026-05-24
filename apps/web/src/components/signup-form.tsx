'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  PASSWORD_REQUIREMENTS_TEXT,
  registerRequestSchema,
  type RegisterRequestSchema,
} from '@erp/shared'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, User, Wand2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { api, ApiError } from '@/lib/api'
import { generateSecurePassword } from '@/lib/passwords'
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
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterRequestSchema>({
    resolver: zodResolver(registerRequestSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: RegisterRequestSchema) {
    setError(null)

    try {
      await api.post(
        '/auth/register',
        {
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email,
          password: data.password,
        },
        { skipAuth: true },
      )
      // Backend ahora envía un OTP al correo. Redirigimos al paso de
      // verificación con el email pre-llenado.
      router.push(
        `/auth/verify-email?email=${encodeURIComponent(data.email)}`,
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        return
      }

      setError('Error de conexion al servidor.')
    }
  }

  function handleGeneratePassword() {
    const password = generateSecurePassword()
    setValue('password', password, { shouldDirty: true, shouldValidate: true })
    setValue('confirmPassword', password, { shouldDirty: true, shouldValidate: true })
    setShowPassword(true)
    setShowConfirmPassword(true)
  }

  return (
    <div className={cn('flex w-full flex-col', className)} {...props}>
      <Card className="overflow-hidden rounded-2xl border-border/70 py-0 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="flex items-center justify-center p-8 md:p-12">
            <div className="w-full max-w-[400px]">
              <CardHeader className="px-0 pb-0">
                <CardTitle className="font-display text-3xl font-bold tracking-tight text-foreground/90">
                  Crea tu cuenta
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Registra tus datos para solicitar acceso al ERP.
                </CardDescription>
              </CardHeader>

              <div className="h-px bg-border/60 my-6" />

              <form onSubmit={handleSubmit(onSubmit)} className="mt-0 space-y-4">
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
                  <Field data-invalid={!!errors.nombre}>
                    <FieldLabel htmlFor="signup-nombre">Nombre</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-primary/60" />
                        <Input
                          id="signup-nombre"
                          placeholder="Juan"
                          disabled={isSubmitting}
                          className={cn(
                            "h-12 rounded-xl py-3 pl-11 pr-4 border-border/70 shadow-none focus-visible:ring-primary/20 focus-visible:ring-[3px] focus-visible:border-primary transition-all duration-200",
                            errors.nombre && "border-[oklch(0.60_0.22_25)] focus-visible:border-[oklch(0.60_0.22_25)] focus-visible:ring-[oklch(0.60_0.22_25)/20]"
                          )}
                          style={errors.nombre ? { borderColor: 'oklch(0.60 0.22 25)' } : undefined}
                          aria-invalid={!!errors.nombre}
                          {...register('nombre')}
                        />
                      </div>
                      {errors.nombre?.message && (
                        <div
                          className="flex items-center gap-1.5 text-sm mt-1.5 font-normal"
                          style={{ color: 'oklch(0.60 0.22 25)' }}
                          role="alert"
                        >
                          <AlertCircle className="size-4 shrink-0" style={{ color: 'oklch(0.60 0.22 25)' }} />
                          <span>{errors.nombre.message}</span>
                        </div>
                      )}
                    </FieldContent>
                  </Field>

                  <Field data-invalid={!!errors.apellido}>
                    <FieldLabel htmlFor="signup-apellido">Apellido</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-primary/60" />
                        <Input
                          id="signup-apellido"
                          placeholder="Perez"
                          disabled={isSubmitting}
                          className={cn(
                            "h-12 rounded-xl py-3 pl-11 pr-4 border-border/70 shadow-none focus-visible:ring-primary/20 focus-visible:ring-[3px] focus-visible:border-primary transition-all duration-200",
                            errors.apellido && "border-[oklch(0.60_0.22_25)] focus-visible:border-[oklch(0.60_0.22_25)] focus-visible:ring-[oklch(0.60_0.22_25)/20]"
                          )}
                          style={errors.apellido ? { borderColor: 'oklch(0.60 0.22 25)' } : undefined}
                          aria-invalid={!!errors.apellido}
                          {...register('apellido')}
                        />
                      </div>
                      {errors.apellido?.message && (
                        <div
                          className="flex items-center gap-1.5 text-sm mt-1.5 font-normal"
                          style={{ color: 'oklch(0.60 0.22 25)' }}
                          role="alert"
                        >
                          <AlertCircle className="size-4 shrink-0" style={{ color: 'oklch(0.60 0.22 25)' }} />
                          <span>{errors.apellido.message}</span>
                        </div>
                      )}
                    </FieldContent>
                  </Field>

                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="signup-email">Correo electronico</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-primary/60" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="m@ejemplo.com"
                          autoComplete="email"
                          disabled={isSubmitting}
                          className={cn(
                            "h-12 rounded-xl py-3 pl-11 pr-4 border-border/70 shadow-none focus-visible:ring-primary/20 focus-visible:ring-[3px] focus-visible:border-primary transition-all duration-200",
                            errors.email && "border-[oklch(0.60_0.22_25)] focus-visible:border-[oklch(0.60_0.22_25)] focus-visible:ring-[oklch(0.60_0.22_25)/20]"
                          )}
                          style={errors.email ? { borderColor: 'oklch(0.60 0.22 25)' } : undefined}
                          aria-invalid={!!errors.email}
                          {...register('email')}
                        />
                      </div>
                      <FieldDescription>
                        Usaremos este correo para avisarte cuando tu cuenta este activa.
                      </FieldDescription>
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
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel htmlFor="signup-password">Contrasena</FieldLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg px-2 text-xs active:scale-95 transition-all duration-150 ease-out"
                        onClick={handleGeneratePassword}
                        disabled={isSubmitting}
                      >
                        <Wand2 className="mr-1 size-3.5" />
                        Generar
                      </Button>
                    </div>
                    <FieldContent>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-primary/60" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          disabled={isSubmitting}
                          className={cn(
                            "h-12 rounded-xl py-3 pl-11 pr-12 border-border/70 shadow-none focus-visible:ring-primary/20 focus-visible:ring-[3px] focus-visible:border-primary transition-all duration-200",
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
                          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                          className="absolute right-1.5 top-1.5 size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-transform active:scale-95 duration-150 ease-out"
                          onClick={() => setShowPassword((current) => !current)}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                      <FieldDescription>{PASSWORD_REQUIREMENTS_TEXT}</FieldDescription>
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

                  <Field data-invalid={!!errors.confirmPassword}>
                    <FieldLabel htmlFor="signup-confirm-password">Confirmar contrasena</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-primary/60" />
                        <Input
                          id="signup-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          disabled={isSubmitting}
                          className={cn(
                            "h-12 rounded-xl py-3 pl-11 pr-12 border-border/70 shadow-none focus-visible:ring-primary/20 focus-visible:ring-[3px] focus-visible:border-primary transition-all duration-200",
                            errors.confirmPassword && "border-[oklch(0.60_0.22_25)] focus-visible:border-[oklch(0.60_0.22_25)] focus-visible:ring-[oklch(0.60_0.22_25)/20]"
                          )}
                          style={errors.confirmPassword ? { borderColor: 'oklch(0.60 0.22 25)' } : undefined}
                          aria-invalid={!!errors.confirmPassword}
                          {...register('confirmPassword')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={showConfirmPassword ? 'Ocultar confirmacion de contrasena' : 'Mostrar confirmacion de contrasena'}
                          className="absolute right-1.5 top-1.5 size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-transform active:scale-95 duration-150 ease-out"
                          onClick={() => setShowConfirmPassword((current) => !current)}
                        >
                          {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                      {errors.confirmPassword?.message && (
                        <div
                          className="flex items-center gap-1.5 text-sm mt-1.5 font-normal"
                          style={{ color: 'oklch(0.60 0.22 25)' }}
                          role="alert"
                        >
                          <AlertCircle className="size-4 shrink-0" style={{ color: 'oklch(0.60 0.22 25)' }} />
                          <span>{errors.confirmPassword.message}</span>
                        </div>
                      )}
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl py-3 px-8 text-sm font-medium transition-all duration-150 ease-out active:scale-95 hover:bg-primary/95"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Crear cuenta'
                  )}
                </Button>
              </form>

              <div className="h-px bg-border/60 my-6" />

              <p className="mt-0 text-center text-sm text-muted-foreground">
                Ya tienes una cuenta?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium underline underline-offset-4 transition hover:text-foreground"
                >
                  Inicia sesion
                </Link>
              </p>
            </div>
          </div>

          <AuthSidePanel
            title="Acceso interno"
            description="Solicita acceso para trabajar con clientes, inventario, ventas y soporte desde un solo panel."
          />
        </CardContent>
      </Card>
    </div>
  )
}
