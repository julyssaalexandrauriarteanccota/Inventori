"use client"

import { Fragment } from "react"
import { usePathname } from "next/navigation"

import { AppCommand } from "@/components/app-command"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
import { OfflineBanner } from "@/components/offline-banner"
import { SettingsDialogProvider } from "@/components/settings-dialog-provider"
import { ThemeToggle } from "@/components/theme-toggle"
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

export function ErpShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SettingsDialogProvider>
      <SidebarProvider
        className="erp-sidebar-shell h-dvh overflow-hidden"
        style={{ "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          <header
            className={cn(
              "flex h-16 shrink-0 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4",
              "bg-sidebar text-sidebar-foreground",
              "border-b border-sidebar-border/70",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_-1px_0_color-mix(in_srgb,var(--accent)_18%,var(--sidebar-border))]",
              // Icons always painted with accent color, hover brightens
              "[&_button>svg]:text-sidebar-primary [&_button>svg]:opacity-75 [&_button:hover>svg]:opacity-100 [&_button>svg]:transition-opacity",
            )}
          >
            <div className="flex min-w-0 items-center gap-1.5 border-0 bg-transparent p-0 shadow-none sm:gap-3 sm:rounded-2xl sm:border sm:border-sidebar-border/90 sm:bg-[color-mix(in_srgb,var(--accent-soft)_55%,var(--sidebar-accent))] sm:px-4 sm:py-2 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:dark:bg-sidebar-accent/82">
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
            <div className="flex shrink-0 items-center gap-1 border-0 bg-transparent p-0 shadow-none sm:gap-2 sm:rounded-2xl sm:border sm:border-sidebar-border/90 sm:bg-[color-mix(in_srgb,var(--accent-soft)_55%,var(--sidebar-accent))] sm:px-3 sm:py-2 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:dark:bg-sidebar-accent/82">
              <AppCommand />
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
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
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SettingsDialogProvider>
  )
}
