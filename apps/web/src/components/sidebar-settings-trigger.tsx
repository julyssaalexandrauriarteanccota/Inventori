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
        aria-label="Ajustes del sistema"
        onClick={() => openSettings()}
        className="group/settings h-9 gap-2.5 rounded-lg border border-transparent font-medium text-muted-foreground !transition-[background-color,color,border-color] hover:text-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:p-0 dark:border-sidebar-border/75 dark:bg-sidebar-accent/45 dark:text-sidebar-foreground/85 dark:hover:bg-sidebar-accent/68 dark:hover:text-sidebar-foreground"
      >
        <span className="relative flex size-7 group-data-[collapsible=icon]:size-8 shrink-0 items-center justify-center rounded-[8px] transition-all duration-300 text-[var(--sidebar-icon-fg)] dark:bg-sidebar/70 dark:text-sidebar-primary">
          <Cog className="size-4.5 group-data-[collapsible=icon]:size-5 transition-transform duration-500 ease-out group-hover/settings:rotate-90" strokeWidth={1.85} />
        </span>
        <span className="group-data-[collapsible=icon]:hidden">
          Ajustes
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
