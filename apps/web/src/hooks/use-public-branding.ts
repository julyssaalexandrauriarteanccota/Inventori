'use client'

import { resolvePublicBranding } from '@/lib/public-branding'
import { useEmpresaPublica } from './use-public'

export function usePublicBranding() {
  const query = useEmpresaPublica()

  return {
    ...query,
    branding: resolvePublicBranding(query.data?.data),
  }
}
