"use client"

import { Check, ChevronsUpDown, ClipboardList } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function SidebarBrand() {
  return (
    <SidebarHeader className="h-16 justify-center gap-1 border-b border-sidebar-border/70 group-data-[collapsible=icon]:px-0.5">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip="Inventori ERP"
                aria-label="Inventori ERP - Selector de Workspace"
                className="group/brand h-12 rounded-xl border border-transparent bg-transparent !transition-[background-color,color,border-color] data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:p-0 dark:border-sidebar-border/80 dark:bg-sidebar-accent/55 dark:text-sidebar-foreground dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:hover:bg-sidebar-accent/72 dark:data-[state=open]:bg-sidebar-accent/80"
              >
                <span className="relative flex aspect-square size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[var(--sidebar-primary)] to-[color-mix(in_oklch,var(--sidebar-primary),black_18%)] text-sidebar-primary-foreground shadow-sm group-hover/brand:scale-105 group-hover/brand:rotate-[-3deg] transition-all duration-300 group-data-[collapsible=icon]:size-8 dark:from-[color-mix(in_oklch,var(--sidebar-primary),black_10%)] dark:to-[color-mix(in_oklch,var(--sidebar-primary),black_28%)] dark:shadow-none dark:ring-1 dark:ring-white/5">
                  <ClipboardList className="size-4.5" strokeWidth={2.25} />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-sidebar bg-emerald-500 group-data-[collapsible=icon]:hidden" />
                </span>
                <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-display text-[13.5px] font-bold tracking-tight text-foreground/90">
                    Inventori
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    ERP · Sistema principal
                  </span>
                </span>
                <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground transition-all duration-200 group-hover/brand:text-foreground group-hover/brand:translate-y-px group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
              align="start"
              sideOffset={8}
            >
              <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Workspace
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-3">
                <span className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-[var(--sidebar-primary)] to-[color-mix(in_oklch,var(--sidebar-primary),black_18%)] text-sidebar-primary-foreground">
                  <ClipboardList className="size-4" />
                </span>
                <div className="grid flex-1 leading-tight">
                  <span className="text-[13px] font-medium">Inventori ERP</span>
                  <span className="text-[11px] text-muted-foreground">
                    Sistema principal
                  </span>
                </div>
                <Check className="size-4 text-[var(--sidebar-primary)]" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled
                className="text-[12px] text-muted-foreground"
              >
                Mas workspaces proximamente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}
