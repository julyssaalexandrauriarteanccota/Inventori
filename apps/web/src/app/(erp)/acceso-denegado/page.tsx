'use client'

import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function AccesoDenegadoPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldX className="size-8 text-destructive" />
        </div>
        <h1 className="sr-only text-2xl font-semibold tracking-tight text-foreground">
          Acceso denegado
        </h1>
        <p className="mt-0 text-sm leading-relaxed text-muted-foreground">
          Tu rol no tiene permisos para acceder a esta sección.
          Contacta al administrador si crees que esto es un error.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
