"use client"

import { useAuth } from "@/hooks/use-auth"
import { AppSidebarContextualNav } from "@/components/app-sidebar-contextual-nav"
import { getNavigationForRole } from "@/lib/erp-navigation"
import { SidebarBrand } from "@/components/sidebar-brand"
import { SidebarFooterSection } from "@/components/sidebar-footer"
import {
  Sidebar,
  SidebarContent,
  SidebarSeparator,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const filteredNav = getNavigationForRole(user?.rol)

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      {...props}
    >
      <SidebarBrand />

      <SidebarSeparator className="mx-2 bg-sidebar-border/70 group-data-[collapsible=icon]:mx-1" />

      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-hidden px-1.5 group-data-[collapsible=icon]:px-0.5">
        <AppSidebarContextualNav items={filteredNav} />
      </SidebarContent>

      <SidebarSeparator className="mx-2 bg-sidebar-border/70 group-data-[collapsible=icon]:mx-1" />

      <SidebarFooterSection role={user?.rol} />
    </Sidebar>
  )
}
