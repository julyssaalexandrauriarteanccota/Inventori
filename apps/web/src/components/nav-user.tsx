"use client"

import { useTheme } from "next-themes"
import {
  ChevronsUpDown,
  Laptop,
  LifeBuoy,
  LogOut,
  Moon,
  Sun,
  UserRound,
} from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { getApiAssetUrl } from "@/lib/api"
import { useSettingsDialog } from "@/components/settings-dialog-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const ROL_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  ENCARGADO: "Encargado",
  TECNICO: "Tecnico",
}

export function NavUser() {
  const { user, logout } = useAuth()
  const { openSettings } = useSettingsDialog()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()

  if (!user) return null

  const displayName = [user.nombre, user.apellido].filter(Boolean).join(" ").trim()
  const rolLabel = ROL_LABELS[user.rol] || user.rol
  const cargoLabel = user.cargo?.trim() || rolLabel
  const initials = `${user.nombre[0] || ""}${user.apellido[0] || ""}`.toUpperCase()
  const avatarUrl = user.avatarUrl?.trim() ? getApiAssetUrl(user.avatarUrl) : null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={displayName}
              aria-label={cargoLabel ? `Menú de usuario: ${displayName} (${cargoLabel})` : `Menú de usuario: ${displayName}`}
              className="group/user h-12 gap-3 rounded-xl border border-transparent bg-transparent !transition-[background-color,color,border-color] data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:p-0 dark:border-sidebar-border/80 dark:bg-sidebar-accent/55 dark:text-sidebar-foreground dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:hover:bg-sidebar-accent/72 dark:data-[state=open]:bg-sidebar-accent/80"
            >
              <Avatar className="size-9 rounded-md transition-transform duration-300 ease-out group-hover/user:scale-105 group-data-[collapsible=icon]:size-8">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={displayName}
                    className="rounded-md object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-md bg-gradient-to-br from-[var(--sidebar-primary)] to-[color-mix(in_oklch,var(--sidebar-primary),black_18%)] text-[12px] font-semibold text-sidebar-primary-foreground dark:from-[color-mix(in_oklch,var(--sidebar-primary),black_10%)] dark:to-[color-mix(in_oklch,var(--sidebar-primary),black_28%)] dark:ring-1 dark:ring-white/5">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-[13px] font-medium">
                  {displayName}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {cargoLabel}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground transition-transform duration-300 group-hover/user:translate-y-px group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left">
                <Avatar className="size-9 rounded-md">
                  {avatarUrl ? (
                    <AvatarImage
                      src={avatarUrl}
                      alt={displayName}
                      className="rounded-md object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-md bg-gradient-to-br from-[var(--sidebar-primary)] to-[color-mix(in_oklch,var(--sidebar-primary),black_18%)] text-[12px] font-semibold text-sidebar-primary-foreground dark:from-[color-mix(in_oklch,var(--sidebar-primary),black_10%)] dark:to-[color-mix(in_oklch,var(--sidebar-primary),black_28%)] dark:ring-1 dark:ring-white/5">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 leading-tight">
                  <span className="truncate font-display text-[13px] font-medium">
                    {displayName}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {user.email}
                  </span>
                  {user.cargo?.trim() ? (
                    <span className="truncate pt-0.5 text-[11px] text-muted-foreground">
                      {user.cargo.trim()}
                    </span>
                  ) : null}
                  <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-md border border-[var(--sidebar-primary)]/20 bg-[var(--sidebar-primary)]/8 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-foreground dark:text-[var(--sidebar-primary)]">
                    {rolLabel}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2"
              onClick={() => openSettings("perfil")}
            >
              <UserRound className="size-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={() => openSettings("soporte")}
            >
              <LifeBuoy className="size-4" />
              Ayuda y soporte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-display text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tema
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={theme ?? "system"}
              onValueChange={(v) => setTheme(v)}
            >
              <DropdownMenuRadioItem value="light" className="gap-2">
                <Sun className="size-4" />
                Claro
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="gap-2">
                <Moon className="size-4" />
                Oscuro
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system" className="gap-2">
                <Laptop className="size-4" />
                Sistema
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void logout()}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
