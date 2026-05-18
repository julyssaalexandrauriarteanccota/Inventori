'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  PASSWORD_REQUIREMENTS_TEXT,
  resetPasswordRequestSchema,
  type ResetPasswordRequestSchema,
} from '@erp/shared'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Wand2,
} from 'lucide-react'

import { api, ApiError } from '@/lib/api'
import { clearTokens } from '@/lib/auth'
import { generateSecurePassword } from '@/lib/passwords'
import { cn } from '@/lib/utils'
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

interface ApiEnvelope<T> {
  data: T
  meta: { timestamp: string }
}

interface ResetPasswordFormProps extends React.ComponentProps<'div'> {
  token?: string
}

export function ResetPasswordForm({
  token,
  className,
  ...props
}: ResetPasswordFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<
    'missing' | 'checking' | 'valid' | 'invalid'
  >(token ? 'checking' : 'missing')
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordRequestSchema>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: { token: token ?? '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!token) {
      setTokenStatus('missing')
      return
    }

    let cancelled = false
    setTokenStatus('checking')
    setTokenError(null)
    setValue('token', token, { shouldValidate: true })

    api
      .post<ApiEnvelope<{ valid: boolean; expiresAt: string }>>(
        '/auth/reset-password/validate',
        { token },
        { skipAuth: true },
      )
      .then(() => {
        if (!cancelled) {
          setTokenStatus('valid')
        }
      })
      .catch((err) => {
        if (cancelled) return
        setTokenStatus('invalid')
        setTokenError(
          err instanceof ApiError
            ? err.message
            : 'El enlace vencio, fue usado o no es valido.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [setValue, token])

  async function onSubmit(data: ResetPasswordRequestSchema) {
    setError(null)

    try {
      await api.post<ApiEnvelope<{ message: string }>>(
        '/auth/reset-password',
        {
          token: data.token,
          password: data.password,
        },
        { skipAuth: true },
      )
      clearTokens()
      setSuccess(true)
      setTokenStatus('invalid')
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

  if (tokenStatus === 'missing') {
    return (
      <div className={cn('flex w-full flex-col', className)} {...props}>
        <Card className="rounded-2xl border-border/70 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
          <CardContent className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Enlace incompleto</h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                El enlace no incluye un token de restablecimiento. Solicita uno nuevo desde la pantalla de recuperacion.
              </p>
            </div>
            <Link href="/auth/forgot-password">
              <Button className="mt-2 rounded-xl">Solicitar nuevo enlace</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenStatus === 'checking') {
    return (
      <div className={cn('flex w-full flex-col', className)} {...props}>
        <Card className="rounded-2xl border-border/70 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
          <CardContent className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="size-7 animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Validando enlace</h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Estamos verificando si el enlace sigue vigente y no fue utilizado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenStatus === 'invalid' && !success) {
    return (
      <div className={cn('flex w-full flex-col', className)} {...props}>
        <Card className="rounded-2xl border-border/70 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
          <CardContent className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Enlace no disponible</h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                {tokenError ?? 'El enlace vencio, fue usado o no es valido.'}
              </p>
            </div>
            <Link href="/auth/forgot-password">
              <Button className="mt-2 rounded-xl">Solicitar nuevo enlace</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
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
              <h2 className="text-2xl font-semibold tracking-tight">Contrasena actualizada</h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Ya puedes iniciar sesion con tu nueva contrasena. Las sesiones anteriores fueron cerradas.
              </p>
            </div>
            <Button className="mt-2 rounded-xl" onClick={() => router.replace('/auth/login')}>
              Ir al inicio de sesion
            </Button>
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
                <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <KeyRound className="size-6" />
                </div>
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  Restablecer contrasena
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Crea una nueva contrasena para recuperar el acceso al ERP.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                <input type="hidden" {...register('token')} />

                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <FieldGroup className="gap-5">
                  <Field data-invalid={!!errors.password}>
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel htmlFor="reset-password">Nueva contrasena</FieldLabel>
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
                          id="reset-password"
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
                    <FieldLabel htmlFor="reset-confirm-password">Confirmar contrasena</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Input
                          id="reset-confirm-password"
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
                          aria-label={
                            showConfirmPassword
                              ? 'Ocultar confirmacion de contrasena'
                              : 'Mostrar confirmacion de contrasena'
                          }
                          className="absolute right-1 top-1 size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => setShowConfirmPassword((current) => !current)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      </div>
                      <FieldError errors={[errors.confirmPassword]} />
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
                      Guardando...
                    </>
                  ) : (
                    'Restablecer contrasena'
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
            title="Restablecimiento seguro"
            description="El enlace expira en 15 minutos y queda invalidado despues de usarlo."
          />
        </CardContent>
      </Card>
    </div>
  )
}
