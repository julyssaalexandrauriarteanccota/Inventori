import type { MetadataRoute } from 'next'

import { getPublicBrandingFromApi } from '@/lib/public-branding'

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength).trim() : value
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getPublicBrandingFromApi()
  const name = branding.identity.displayName

  return {
    name,
    short_name: truncate(name, 12),
    description: branding.content.pwaDescription,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: branding.theme.primaryColor ?? '#000000',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Tickets',
        url: '/soporte',
        description: 'Ver tickets de soporte',
      },
      {
        name: 'Dashboard',
        url: '/dashboard',
        description: 'Panel principal',
      },
    ],
  }
}
