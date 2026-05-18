"use client"

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

export type { NavItem, NavSection, NavSubItem } from "@/components/nav-main.types"
export { groupNavItems } from "@/components/nav-main-utils"

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const badges = useNavBadges()
  const sections = groupNavItems(items)

  return (
    <>
      {sections.map((section) => (
        <SidebarGroup
          key={section.label}
          className="py-1 group-data-[collapsible=icon]:px-0"
        >
          <SidebarGroupLabel className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:transition-opacity">
            {section.label}
          </SidebarGroupLabel>
          <SidebarMenu>
            {section.items.map((item) => (
              <NavMainItem
                key={item.title}
                item={item}
                pathname={pathname}
                badges={badges}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
