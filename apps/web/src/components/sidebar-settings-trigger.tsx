"use client"

import { Cog } from "lucide-react"

import { useSettingsDialog } from "@/components/settings-dialog-provider"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

export function SidebarSettingsTrigger() {
  const { openSettings } = useSettingsDialog()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        size="default"
        tooltip="Ajustes"
        onClick={() => openSettings()}
        className="h-9 gap-2.5 rounded-lg border border-transparent font-medium text-muted-foreground !transition-[background-color,color,border-color] hover:text-foreground group-data-[collapsible=icon]:justify-start group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!h-9 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!pl-3 group-data-[collapsible=icon]:!pr-0 group-data-[collapsible=icon]:!py-0 dark:border-sidebar-border/75 dark:bg-sidebar-accent/45 dark:text-sidebar-foreground/85 dark:hover:bg-sidebar-accent/68 dark:hover:text-sidebar-foreground"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--sidebar-icon-fg)] dark:bg-sidebar/70 dark:text-sidebar-primary">
          <Cog className="size-4" strokeWidth={1.85} />
        </span>
        <span className="group-data-[collapsible=icon]:hidden">
          Ajustes
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
