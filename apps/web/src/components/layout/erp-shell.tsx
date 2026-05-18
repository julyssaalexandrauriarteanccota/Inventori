"use client"

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
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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
          <BreadcrumbItem key={`${segment}-${index}`}>
            {index > 0 ? (
              <span className="mx-1 text-muted-foreground/50">/</span>
            ) : null}
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
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function ErpShell({ children }: { children: React.ReactNode }) {
  return (
    <SettingsDialogProvider>
      <SidebarProvider className="erp-sidebar-shell h-dvh overflow-hidden">
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          <header
            className={cn(
              "flex h-16 shrink-0 items-center justify-between gap-2 px-4 pr-3",
              "bg-sidebar text-sidebar-foreground",
              "border-b border-sidebar-border shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]",
              // Icons always painted with accent color, hover brightens
              "[&_button>svg]:text-sidebar-primary [&_button>svg]:opacity-75 [&_button:hover>svg]:opacity-100 [&_button>svg]:transition-opacity",
            )}
          >
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-sidebar-border/90 bg-sidebar-accent/70 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:bg-sidebar-accent/82">
              <SidebarTrigger className="-ml-0.5 rounded-lg border border-sidebar-border/80 bg-sidebar/75 text-sidebar-primary hover:bg-sidebar-accent hover:text-sidebar-primary" />
              <Separator
                orientation="vertical"
                className="mr-1 h-5 bg-sidebar-border opacity-100"
              />
              <div className="min-w-0">
                <DynamicBreadcrumb />
              </div>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              <AppCommand />
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <OfflineBanner />
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-4">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SettingsDialogProvider>
  )
}
