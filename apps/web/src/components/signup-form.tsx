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
import { AlertCircle, Eye, EyeOff, Loader2, Wand2 } from 'lucide-react'

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
  FieldError,
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
        <CardContent className="grid p-0 md:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex items-center justify-center p-6 md:p-9">
            <div className="w-full max-w-[380px]">
              <CardHeader className="px-0 pb-0">
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  Crea tu cuenta
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Registra tus datos para solicitar acceso al ERP.
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
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!errors.nombre}>
                      <FieldLabel htmlFor="signup-nombre">Nombre</FieldLabel>
                      <FieldContent>
                        <Input
                          id="signup-nombre"
                          placeholder="Juan"
                          disabled={isSubmitting}
                          className="h-11 rounded-xl border-border/70 shadow-none"
                          {...register('nombre')}
                        />
                        <FieldError errors={[errors.nombre]} />
                      </FieldContent>
                    </Field>

                    <Field data-invalid={!!errors.apellido}>
                      <FieldLabel htmlFor="signup-apellido">Apellido</FieldLabel>
                      <FieldContent>
                        <Input
                          id="signup-apellido"
                          placeholder="Perez"
                          disabled={isSubmitting}
                          className="h-11 rounded-xl border-border/70 shadow-none"
                          {...register('apellido')}
                        />
                        <FieldError errors={[errors.apellido]} />
                      </FieldContent>
                    </Field>
                  </div>

                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="signup-email">Correo electronico</FieldLabel>
                    <FieldContent>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="m@ejemplo.com"
                        autoComplete="email"
                        disabled={isSubmitting}
                        className="h-11 rounded-xl border-border/70 shadow-none"
                        {...register('email')}
                      />
                      <FieldDescription>
                        Usaremos este correo para avisarte cuando tu cuenta este activa.
                      </FieldDescription>
                      <FieldError errors={[errors.email]} />
                    </FieldContent>
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!errors.password}>
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel htmlFor="signup-password">Contrasena</FieldLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-lg px-2 text-xs"
                          onClick={handleGeneratePassword}
                          disabled={isSubmitting}
                        >
                          <Wand2 className="mr-1 size-3.5" />
                          Generar
                        </Button>
                      </div>
                      <FieldContent>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            disabled={isSubmitting}
                            className="h-11 rounded-xl border-border/70 pr-11 shadow-none"
                            {...register('password')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                            className="absolute right-1 top-1 size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => setShowPassword((current) => !current)}
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </Button>
                        </div>
                        <FieldDescription>{PASSWORD_REQUIREMENTS_TEXT}</FieldDescription>
                        <FieldError errors={[errors.password]} />
                      </FieldContent>
                    </Field>

                    <Field data-invalid={!!errors.confirmPassword}>
                      <FieldLabel htmlFor="signup-confirm-password">Confirmar contrasena</FieldLabel>
                      <FieldContent>
                        <div className="relative">
                          <Input
                            id="signup-confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            disabled={isSubmitting}
                            className="h-11 rounded-xl border-border/70 pr-11 shadow-none"
                            {...register('confirmPassword')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={showConfirmPassword ? 'Ocultar confirmacion de contrasena' : 'Mostrar confirmacion de contrasena'}
                            className="absolute right-1 top-1 size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => setShowConfirmPassword((current) => !current)}
                          >
                            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </Button>
                        </div>
                        <FieldError errors={[errors.confirmPassword]} />
                      </FieldContent>
                    </Field>
                  </div>
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
                    'Crear cuenta'
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
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
