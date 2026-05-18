import type { Metadata } from 'next'

import { getPublicBrandingFromApi } from '@/lib/public-branding'
import { GarantiaResultado } from './resultado'

interface Props {
  params: Promise<{ codigoQR: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ codigoQR }, branding] = await Promise.all([
    params,
    getPublicBrandingFromApi(),
  ])

  return {
    title: `Garantía ${codigoQR}`,
    description: `${branding.content.warrantyTitle}: ${codigoQR}.`,
  }
}

export default async function GarantiaDetallePage({ params }: Props) {
  const { codigoQR } = await params
  return <GarantiaResultado codigoQR={codigoQR} />
}
