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
      <BreadcrumbList>
        {segments.map((segment, index) => (
          <Fragment key={`${segment}-${index}`}>
            {index > 0 && (
              <BreadcrumbSeparator className="text-muted-foreground/50">
                /
              </BreadcrumbSeparator>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage
                className={
                  index === segments.length - 1
                    ? "font-semibold text-sidebar-primary tracking-tight"
                    : "text-muted-foreground"
                }
              >
                {getBreadcrumbLabel(segment)}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </Fragment>
        ))}
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
              "flex h-16 shrink-0 items-center justify-between gap-4 px-4",
              "bg-sidebar text-sidebar-foreground",
              "border-b border-sidebar-border shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]",
              // Icons always painted with accent color, hover brightens
              "[&_button>svg]:text-sidebar-primary [&_button>svg]:opacity-75 [&_button:hover>svg]:opacity-100 [&_button>svg]:transition-opacity",
            )}
          >
            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-sidebar-border/90 bg-sidebar-accent/70 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:bg-sidebar-accent/82">
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
                className="h-5 bg-sidebar-border opacity-100"
              />
              <div className="min-w-0">
                <DynamicBreadcrumb />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-sidebar-border/90 bg-sidebar-accent/70 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:bg-sidebar-accent/82">
              <AppCommand />
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <OfflineBanner />
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                pathname.startsWith("/pos")
                  ? "overflow-hidden p-2 gap-2"
                  : "overflow-y-auto p-4 pt-4 gap-4"
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
