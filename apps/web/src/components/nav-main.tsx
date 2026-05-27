"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import { NavMainItem } from "@/components/nav-main-item"
import type { NavItem } from "@/components/nav-main.types"
import { groupNavItems } from "@/components/nav-main-utils"
import { useNavBadges } from "@/components/nav-badges"
import { cn } from "@/lib/utils"

export type { NavItem, NavSection, NavSubItem } from "@/components/nav-main.types"
export { groupNavItems } from "@/components/nav-main-utils"

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const badges = useNavBadges()
  const sections = groupNavItems(items)
  const activeUrl = React.useMemo(() => {
    const urls = items.flatMap((item) => [
      item.url,
      ...(item.items?.map((subItem) => subItem.url) ?? []),
    ])

    return urls
      .filter((url) => pathname === url || pathname.startsWith(url + "/"))
      .sort((a, b) => b.length - a.length)[0]
  }, [items, pathname])

  return (
    <>
      {sections.map((section, idx) => (
        <SidebarGroup
          key={section.label}
          className={cn(
            "py-1 group-data-[collapsible=icon]:px-0",
            idx > 0 &&
              "mt-1 pt-3 border-t border-sidebar-border/50 group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:pt-0",
          )}
        >
          <SidebarGroupLabel className="px-2 text-[10.5px] font-semibold uppercase tracking-widest text-[var(--sidebar-primary)]/60 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:transition-opacity">
            {section.label}
          </SidebarGroupLabel>
          <SidebarMenu>
            {section.items.map((item) => (
              <NavMainItem
                key={item.title}
                item={item}
                activeUrl={activeUrl}
                badges={badges}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
