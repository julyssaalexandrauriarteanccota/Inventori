import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <p className="text-8xl font-extralight tracking-tighter text-muted-foreground/30">
          404
        </p>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Página no encontrada
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Ir al dashboard
          </Link>
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
