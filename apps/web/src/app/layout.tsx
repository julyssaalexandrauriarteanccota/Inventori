import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Inter, JetBrains_Mono, Playfair_Display, Montserrat, IBM_Plex_Sans, Poppins } from 'next/font/google'

import { Providers } from '@/components/providers'
import { AtmosphereScript } from '@/lib/atmosphere'
import { getPublicBrandingFromApi } from '@/lib/public-branding'


import './globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['600', '700'],
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const ibmPlex = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicBrandingFromApi()

  return {
    title: {
      default: branding.content.metadataTitle,
      template: branding.content.metadataTemplate,
    },
    description: branding.identity.seoDescription,
    manifest: '/manifest.webmanifest',
    icons: branding.assets.favicon
      ? {
          icon: branding.assets.favicon,
          shortcut: branding.assets.favicon,
          apple: branding.assets.favicon,
        }
      : undefined,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: branding.identity.displayName,
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${bricolage.variable} ${jetbrainsMono.variable} ${playfair.variable} ${montserrat.variable} ${ibmPlex.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <head>
        <AtmosphereScript />
      </head>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
