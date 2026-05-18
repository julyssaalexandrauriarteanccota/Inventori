import type { Metadata } from 'next'

import { getPublicBrandingFromApi } from '@/lib/public-branding'
import { CatalogoContent } from './catalogo-content'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicBrandingFromApi()

  return {
    title: branding.content.catalogTitle,
    description: branding.content.catalogDescription,
  }
}

export default async function CatalogoPage() {
  const branding = await getPublicBrandingFromApi()

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {branding.content.catalogTitle}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {branding.content.catalogDescription}
      </p>
      <CatalogoContent />
    </div>
  )
}
