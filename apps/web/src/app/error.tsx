'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Algo salio mal
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Ocurrio un error inesperado. Puedes intentar de nuevo o volver al
          inicio.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl border border-border px-5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
