import type { Metadata } from 'next'

import { getPublicBrandingFromApi } from '@/lib/public-branding'
import { ContactoContent } from './contacto-content'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicBrandingFromApi()

  return {
    title: branding.content.contactTitle,
    description: branding.content.contactDescription,
  }
}

export default async function ContactoPage() {
  const branding = await getPublicBrandingFromApi()

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {branding.content.contactTitle}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {branding.content.contactDescription}
      </p>
      <ContactoContent />
    </div>
  )
}
