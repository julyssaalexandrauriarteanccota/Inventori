"use client"

import { RolUsuario } from "@erp/shared"

import { NavUser } from "@/components/nav-user"
import { SidebarSettingsTrigger } from "@/components/sidebar-settings-trigger"
import { SidebarFooter, SidebarMenu } from "@/components/ui/sidebar"

export function SidebarFooterSection({
  role,
}: {
  role?: RolUsuario | null
}) {
  return (
    <SidebarFooter className="gap-1 border-t border-sidebar-border/70 pb-2 pt-2 group-data-[collapsible=icon]:px-0.5">
      <SidebarMenu>
        {role === RolUsuario.ADMIN ? <SidebarSettingsTrigger /> : null}
      </SidebarMenu>
      <NavUser />
      <p className="px-3 pt-1 text-[10px] text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
        v1.0.0 · Inventori ERP
      </p>
    </SidebarFooter>
  )
}
