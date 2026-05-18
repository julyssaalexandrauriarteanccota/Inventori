'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicBranding } from '@/hooks/use-public-branding'

export function ContactoContent() {
  const { branding, isLoading } = usePublicBranding()

  if (isLoading) {
    return (
      <div className="mt-8 space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  const items = [
    { label: 'Nombre comercial', value: branding.identity.displayName },
    { label: 'Razón social', value: branding.identity.legalName },
    { label: 'RUC', value: branding.identity.taxId },
    { label: 'Dirección', value: branding.contact.address },
    { label: 'Teléfono', value: branding.contact.primaryPhone },
    { label: 'WhatsApp', value: branding.contact.whatsapp },
    { label: 'Ventas', value: branding.contact.salesEmail },
    { label: 'Soporte', value: branding.contact.supportEmail },
    { label: 'Correo electrónico', value: branding.contact.primaryEmail },
    { label: 'Sitio web', value: branding.identity.website },
  ].filter((item) => item.value)

  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Información de la empresa</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              La información de contacto aún no ha sido configurada.
            </p>
          ) : (
            <dl className="space-y-4">
              {items.map((i) => (
                <div key={i.label}>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {i.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-foreground">{i.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
