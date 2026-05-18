import type { Metadata } from 'next'

import { PortalClienteContent } from '../../portal-cliente-content'

export const metadata: Metadata = {
  title: 'Comprobante electrónico — Portal del cliente',
  description: 'Consulta y descarga tu comprobante electrónico.',
}

export default async function PortalClienteTokenPage({
  params,
}: {
  params: Promise<{ tokenConsulta: string }>
}) {
  const { tokenConsulta } = await params

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Comprobante electrónico
      </h1>
      <p className="mt-2 text-muted-foreground">
        Consulta el estado fiscal y descarga los documentos asociados.
      </p>
      <PortalClienteContent tokenConsulta={tokenConsulta} />
    </div>
  )
}
