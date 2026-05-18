import type { Metadata } from 'next'

import { PortalClienteContent } from './portal-cliente-content'

export const metadata: Metadata = {
  title: 'Portal del cliente — Verifica tu comprobante',
  description:
    'Consulta el estado fiscal de tu factura o boleta electrónica emitida.',
}

export default function PortalClientePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Portal del cliente
      </h1>
      <p className="mt-2 text-muted-foreground">
        Verifica que tu factura o boleta electrónica fue emitida correctamente
        por SUNAT. Necesitas el RUC del emisor, el tipo de comprobante y el
        número (serie + correlativo), además del documento del receptor.
      </p>
      <PortalClienteContent />
    </div>
  )
}
