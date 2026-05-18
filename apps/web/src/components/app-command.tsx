"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  HeadsetIcon,
  Search,
  type LucideIcon,
} from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import {
  canAccessErpPath,
  getNavigationForRole,
} from "@/lib/erp-navigation"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

type CommandAction = {
  title: string
  url: string
  icon: LucideIcon
  shortcut?: string
}

const COMMAND_ACTIONS: CommandAction[] = [
  {
    title: "Registrar cliente",
    url: "/clientes/nuevo",
    icon: CreditCard,
    shortcut: "Ctrl+C",
  },
  {
    title: "Nueva cotizacion",
    url: "/ventas/cotizaciones",
    icon: CreditCard,
  },
  {
    title: "Crear ticket de soporte",
    url: "/soporte/nuevo",
    icon: HeadsetIcon,
  },
]

export function AppCommand() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const navigationItems = React.useMemo(
    () => getNavigationForRole(user?.rol).slice(0, 6),
    [user?.rol],
  )

  const visibleActions = React.useMemo(
    () =>
      COMMAND_ACTIONS.filter((action) =>
        canAccessErpPath(action.url, user?.rol),
      ),
    [user?.rol],
  )

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((currentOpen) => !currentOpen)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "group relative h-8 w-8 justify-center rounded-lg p-0 text-sm font-normal shadow-none transition-colors sm:w-auto sm:justify-start sm:px-3 sm:pr-12 md:w-40 lg:w-64",
          "border-sidebar-border/90 bg-sidebar-accent/82 text-sidebar-foreground/80",
          "hover:border-sidebar-primary/55 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 transition-colors group-hover:text-[var(--sidebar-primary)] sm:mr-2" />
        <span className="hidden sm:inline-block">Buscar...</span>
        <kbd
          className={cn(
            "pointer-events-none absolute right-1.5 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium sm:flex",
            "border-sidebar-border/85 bg-sidebar/85 text-sidebar-foreground/65",
          )}
        >
          <span>Ctrl</span>K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className={cn(
          "max-h-[85vh] overflow-hidden border-sidebar-border/70 p-0 shadow-2xl",
          "[&_[cmdk-list]]:max-h-[60vh]",
          // Input row
          "[&_[data-slot=command-input-wrapper]]:border-sidebar-border/60 [&_[data-slot=command-input-wrapper]]:px-4 [&_[data-slot=command-input-wrapper]]:h-14",
          "[&_[data-slot=command-input-wrapper]_svg]:text-[var(--sidebar-primary)] [&_[data-slot=command-input-wrapper]_svg]:opacity-100",
          "[&_[cmdk-input]]:text-[15px] [&_[cmdk-input]]:placeholder:text-muted-foreground/70",
          // Group headings
          "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/80",
          // Items
          "[&_[cmdk-item]]:mx-1 [&_[cmdk-item]]:my-0.5 [&_[cmdk-item]]:rounded-md [&_[cmdk-item]]:px-2.5 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:gap-2.5 [&_[cmdk-item]]:text-sm [&_[cmdk-item]]:transition-colors",
          "[&_[cmdk-item][data-selected=true]]:bg-[var(--sidebar-active-bg)] [&_[cmdk-item][data-selected=true]]:text-[var(--sidebar-active-fg)]",
          "[&_[cmdk-item][data-selected=true]_svg]:text-[var(--sidebar-active-fg)]",
          "[&_[cmdk-item]_svg]:text-muted-foreground",
          // Separator
          "[&_[data-slot=command-separator]]:bg-sidebar-border/60 [&_[data-slot=command-separator]]:my-1",
          // List padding
          "[&_[cmdk-list]]:py-1",
        )}
      >
        <CommandInput placeholder="Buscar rutas o acciones del ERP..." />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1.5 py-2">
              <Search className="size-5 text-muted-foreground/60" />
              <span className="text-sm text-muted-foreground">
                No se encontraron resultados.
              </span>
            </div>
          </CommandEmpty>
          <CommandGroup heading="Accesos directos">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.url}
                onSelect={() => runCommand(() => router.push(item.url))}
              >
                {item.icon ? (
                  <item.icon className="size-4 shrink-0" />
                ) : null}
                <span className="flex-1 truncate">{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Acciones">
            {visibleActions.map((action) => (
              <CommandItem
                key={action.url}
                onSelect={() => runCommand(() => router.push(action.url))}
              >
                <action.icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{action.title}</span>
                {action.shortcut ? (
                  <CommandShortcut className="rounded border border-sidebar-border/70 bg-sidebar/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {action.shortcut}
                  </CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
