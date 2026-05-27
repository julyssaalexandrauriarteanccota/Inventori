"use client"

import { Fragment } from "react"
import { usePathname } from "next/navigation"

import { useAuth } from "@/hooks/use-auth"
import { useIsMobile } from "@/hooks/use-mobile"
import { AppCommand } from "@/components/app-command"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
import { OfflineBanner } from "@/components/offline-banner"
import { SettingsDialogProvider } from "@/components/settings-dialog-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  TopbarActionsProvider,
  useTopbarActions,
} from "@/components/layout/topbar-actions"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  productos: "Productos",
  categorias: "Categorias",
  marcas: "Marcas",
  inventario: "Inventario",
  movimientos: "Movimientos",
  alertas: "Alertas",
  equipos: "Equipos",
  compatibilidad: "Compatibilidad",
  ventas: "Ventas",
  cotizaciones: "Cotizaciones",
  facturacion: "Facturacion",
  compras: "Compras",
  recepciones: "Recepciones",
  proveedores: "Proveedores",
  soporte: "Soporte",
  garantias: "Garantias",
  casos: "Casos",
  reportes: "Reportes",
  auditoria: "Auditoria",
  configuracion: "Configuración",
  empresa: "Empresa",
  usuarios: "Usuarios",
  "metodos-pago": "Metodos de pago",
  "acceso-denegado": "Acceso denegado",
  nuevo: "Nuevo",
  "reset-password": "Restablecer contrasena",
}

function getBreadcrumbLabel(segment: string): string {
  return (
    BREADCRUMB_LABELS[segment] ||
    segment.charAt(0).toUpperCase() + segment.slice(1)
  )
}

function DynamicBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          return (
            <Fragment key={`${segment}-${index}`}>
              {index > 0 && (
                <BreadcrumbSeparator className="text-muted-foreground/50 hidden sm:flex">
                  /
                </BreadcrumbSeparator>
              )}
              <BreadcrumbItem className={cn(!isLast && "hidden sm:inline-flex", "min-w-0")}>
                <BreadcrumbPage
                  className={cn(
                    "truncate max-w-[120px] sm:max-w-none block",
                    isLast
                      ? "font-semibold text-sidebar-primary tracking-tight"
                      : "text-muted-foreground"
                  )}
                >
                  {getBreadcrumbLabel(segment)}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function TopbarRightActions() {
  const actions = useTopbarActions()
  const isMobile = useIsMobile()
  if (!actions || isMobile) return null
  return <div className="hidden sm:flex items-center gap-2">{actions}</div>
}

function MobileBottomActionsBar() {
  const actions = useTopbarActions()
  const isMobile = useIsMobile()
  if (!actions || !isMobile) return null
  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 flex items-center justify-end gap-2",
        "rounded-2xl border border-border/70 bg-card/95 px-3 py-2 shadow-[0_18px_42px_-16px_rgba(15,23,42,0.35)] backdrop-blur",
        "sm:hidden",
      )}
      role="toolbar"
      aria-label="Acciones de página"
    >
      {actions}
    </div>
  )
}

export function ErpShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()

  const userInitials = user
    ? `${user.nombre?.[0] ?? ''}${user.apellido?.[0] ?? ''}`.toUpperCase()
    : ''

  return (
    <TopbarActionsProvider>
      <SettingsDialogProvider>
        <SidebarProvider
          className="erp-sidebar-shell h-dvh overflow-hidden"
          style={{ "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
        >
          <AppSidebar />
          <SidebarInset className="overflow-hidden">
            <header
              className={cn(
                "relative flex h-16 shrink-0 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4",
                "bg-sidebar text-sidebar-foreground",
                "border-b border-sidebar-border/70",
                "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.07),inset_0_-1px_0_rgba(0,0,0,0.04)]",
              )}
            >
              {/* 2px brand accent stripe at the very top of the content header */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
                style={{ background: 'color-mix(in srgb, var(--sidebar-primary) 40%, transparent)' }}
                aria-hidden
              />

              {/* ── Left: trigger + breadcrumb ─────────────────────────────── */}
              <div className="flex min-w-0 items-center gap-1.5 border-0 bg-transparent p-0 shadow-none sm:gap-3 sm:rounded-2xl sm:border sm:border-sidebar-border/90 sm:bg-sidebar-accent sm:px-4 sm:py-2 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:dark:bg-sidebar-accent/90">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger
                      className="rounded-lg border border-sidebar-border/80 bg-sidebar/75 text-sidebar-primary transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-primary active:scale-95"
                      aria-label="Alternar barra lateral"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start">Alternar barra lateral (Ctrl+B)</TooltipContent>
                </Tooltip>
                <Separator
                  orientation="vertical"
                  className="hidden sm:block h-5 bg-sidebar-border opacity-100"
                />
                <div className="min-w-0">
                  <DynamicBreadcrumb />
                </div>
              </div>

              {/* ── Right: search + notifications + theme + user chip + page actions ─ */}
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <AppCommand />
                <NotificationCenter />
                <ThemeToggle />
                {/* User avatar chip */}
                {user && (
                  <div className="hidden sm:flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-all cursor-default border-sidebar-primary/20 bg-sidebar-primary/[0.07] hover:bg-sidebar-primary/[0.12]">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: 'var(--sidebar-primary)' }}
                    >
                      {userInitials}
                    </span>
                    <span className="text-xs font-semibold text-foreground leading-none hidden lg:block">
                      {user.nombre}
                    </span>
                  </div>
                )}
                {/* Page-level CTA slot (desktop only) */}
                <TopbarRightActions />
              </div>
            </header>
            <main className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
              <OfflineBanner />
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col w-full min-w-0",
                  pathname.startsWith("/pos")
                    ? "overflow-hidden p-2 gap-2"
                    : "overflow-y-auto overflow-x-hidden p-4 pt-4 gap-4"
                )}
              >
                {children}
              </div>
              {/* Mobile sticky bottom action bar */}
              <MobileBottomActionsBar />
            </main>
          </SidebarInset>
        </SidebarProvider>
      </SettingsDialogProvider>
    </TopbarActionsProvider>
  )
}
