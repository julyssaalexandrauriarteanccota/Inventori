'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

import { NavMain } from '@/components/nav-main'
import type { NavItem } from '@/components/nav-main.types'

const LAST_PRIMARY_PATH_KEY = 'erp:last-primary-path'

export function AppSidebarContextualNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  // Configuración now renders its own contextual section nav in-page via
  // ConfigurationPageContent's ResizablePanelGroup, so the global sidebar
  // always shows the primary nav. We still remember the last non-config
  // path so the in-page "Volver" button can return the user there.
  React.useEffect(() => {
    if (pathname.startsWith('/configuracion')) {
      return
    }

    window.sessionStorage.setItem(LAST_PRIMARY_PATH_KEY, pathname)
  }, [pathname])

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0 h-full overflow-y-auto">
        <NavMain items={items} />
      </div>
    </div>
  )
}
