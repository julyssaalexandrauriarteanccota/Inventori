import type { Metadata } from 'next'

import { getPublicBrandingFromApi } from '@/lib/public-branding'
import { TicketContent } from './ticket-content'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicBrandingFromApi()

  return {
    title: branding.content.ticketTitle,
    description: branding.content.ticketDescription,
  }
}

export default async function TicketPage() {
  const branding = await getPublicBrandingFromApi()

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {branding.content.ticketTitle}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {branding.content.ticketDescription}
      </p>
      <TicketContent />
    </div>
  )
}
