'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { NavMain } from '@/components/nav-main'
import {
  navButtonClasses,
  SidebarNavIconTile,
} from '@/components/nav-main-primitives'
import type { NavItem } from '@/components/nav-main.types'
import {
  CONFIGURATION_SECTION_GROUPS,
  CONFIGURATION_SECTION_MAP,
  DEFAULT_CONFIGURATION_SECTION,
  getConfigurationSectionHref,
  isConfigurationSectionId,
} from '@/components/settings/configuration-nav'
import type { ConfigurationSectionId } from '@/components/settings/settings-sections'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type ContextView = 'primary' | 'config'

const LAST_PRIMARY_PATH_KEY = 'erp:last-primary-path'

function SidebarPrimaryView({ items }: { items: NavItem[] }) {
  return (
    <div className="h-full overflow-y-auto">
      <NavMain items={items} />
    </div>
  )
}

function SidebarConfigView({
  activeSection,
  onBack,
}: {
  activeSection: ConfigurationSectionId
  onBack: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <SidebarGroup className="pb-1 pt-1 group-data-[collapsible=icon]:px-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip="Volver"
              onClick={onBack}
              className={cn(navButtonClasses, 'text-sidebar-foreground/75')}
            >
              <SidebarNavIconTile icon={ChevronLeft} active={false} />
              <span className="truncate group-data-[collapsible=icon]:hidden">
                Volver
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4 pr-1 [scrollbar-gutter:stable]">
        {CONFIGURATION_SECTION_GROUPS.map((group, idx) => (
          <SidebarGroup
            key={group.label}
            className={cn(
              "py-1 group-data-[collapsible=icon]:px-0",
              idx > 0 &&
                "mt-1 pt-3 border-t border-sidebar-border/50 group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:pt-0",
            )}
          >
            <SidebarGroupLabel className="px-2 text-[10.5px] font-semibold uppercase tracking-widest text-[var(--sidebar-primary)]/60 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:transition-opacity">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((sectionId) => {
                const section = CONFIGURATION_SECTION_MAP.get(sectionId)

                if (!section) {
                  return null
                }

                const isActive = activeSection === section.id

                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      tooltip={section.name}
                      asChild
                      isActive={isActive}
                      className={navButtonClasses}
                    >
                      <Link href={getConfigurationSectionHref(section.id)}>
                        <SidebarNavIconTile
                          icon={section.icon}
                          active={isActive}
                        />
                        <span className="truncate group-data-[collapsible=icon]:hidden">
                          {section.name}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </div>
    </div>
  )
}

export function AppSidebarContextualNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefersReducedMotion = useReducedMotion()

  const currentView: ContextView = pathname.startsWith('/configuracion')
    ? 'config'
    : 'primary'

  const [direction, setDirection] = React.useState<1 | -1>(1)
  const previousViewRef = React.useRef<ContextView>(currentView)

  React.useEffect(() => {
    const previousView = previousViewRef.current

    if (previousView !== currentView) {
      setDirection(currentView === 'config' ? 1 : -1)
      previousViewRef.current = currentView
    }
  }, [currentView])

  React.useEffect(() => {
    if (pathname.startsWith('/configuracion')) {
      return
    }

    window.sessionStorage.setItem(LAST_PRIMARY_PATH_KEY, pathname)
  }, [pathname])

  const activeSection = React.useMemo<ConfigurationSectionId>(() => {
    const section = searchParams.get('section')
    return isConfigurationSectionId(section)
      ? section
      : DEFAULT_CONFIGURATION_SECTION
  }, [searchParams])

  const handleBack = React.useCallback(() => {
    const storedPath = window.sessionStorage.getItem(LAST_PRIMARY_PATH_KEY)
    const fallbackPath = '/dashboard'
    const targetPath =
      storedPath && !storedPath.startsWith('/configuracion')
        ? storedPath
        : fallbackPath

    router.push(targetPath)
  }, [router])

  const motionVariants = React.useMemo(
    () => ({
      enter: (customDirection: 1 | -1) => ({
        x: prefersReducedMotion ? 0 : customDirection === 1 ? 44 : -44,
        opacity: prefersReducedMotion ? 1 : 0,
      }),
      center: {
        x: 0,
        opacity: 1,
      },
      exit: (customDirection: 1 | -1) => ({
        x: prefersReducedMotion ? 0 : customDirection === 1 ? -28 : 28,
        opacity: prefersReducedMotion ? 1 : 0,
      }),
    }),
    [prefersReducedMotion],
  )

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentView}
          custom={direction}
          variants={motionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  x: {
                    type: 'spring',
                    stiffness: 260,
                    damping: 30,
                    mass: 0.8,
                  },
                  opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
                }
          }
          className="absolute inset-0 will-change-transform"
        >
          {currentView === 'config' ? (
            <SidebarConfigView
              activeSection={activeSection}
              onBack={handleBack}
            />
          ) : (
            <SidebarPrimaryView items={items} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
