import type { Metadata } from 'next'

import { getPublicBrandingFromApi } from '@/lib/public-branding'
import { DetalleContent } from './detalle-content'

interface Props {
  params: Promise<{ sku: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ sku }, branding] = await Promise.all([
    params,
    getPublicBrandingFromApi(),
  ])

  return {
    title: `Producto ${sku}`,
    description: `Detalle del producto ${sku} en el catálogo de ${branding.identity.displayName}.`,
  }
}

export default async function CatalogoDetallePage({ params }: Props) {
  const { sku } = await params
  return <DetalleContent sku={sku} />
}
