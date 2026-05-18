import { Suspense } from 'react'

import { ConfigurationPageContent } from '@/components/settings/configuration-page-content'

function ConfiguracionPageFallback() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 text-card-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">
        Cargando configuración...
      </p>
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={<ConfiguracionPageFallback />}>
      <ConfigurationPageContent />
    </Suspense>
  )
}
