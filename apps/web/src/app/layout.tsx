import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google'

import { Providers } from '@/components/providers'
import { AccentScript } from '@/lib/accent'
import { getPublicBrandingFromApi } from '@/lib/public-branding'
import { ToneScript } from '@/lib/tone'

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
      className={`${inter.variable} ${bricolage.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <AccentScript />
        <ToneScript />
      </head>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
