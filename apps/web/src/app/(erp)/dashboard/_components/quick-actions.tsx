'use client'

import { Package, ShoppingCart, Ticket, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { RolUsuario } from '@erp/shared'

import { cn } from '@/lib/utils'

/* ─────────────────────────── QuickActions (pill buttons) ───────────── */

export function QuickActions({ hasRole }: { hasRole: (...roles: RolUsuario[]) => boolean }) {
  const PILLS: {
    label: string
    icon: LucideIcon
    href: string
    cls: string
    roles?: RolUsuario[]
  }[] = [
    {
      label: 'Nueva venta',
      icon: ShoppingCart,
      href: '/ventas',
      cls: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 dark:brightness-75 dark:hover:brightness-90',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
    {
      label: 'Crear ticket',
      icon: Ticket,
      href: '/soporte/nuevo',
      cls: 'bg-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/90 text-white shadow-primary/20 dark:brightness-75 dark:hover:brightness-90',
    },
    {
      label: 'Registrar cliente',
      icon: Users,
      href: '/clientes/nuevo',
      cls: 'bg-card border border-border hover:border-primary/30 hover:bg-primary/5 text-foreground dark:hover:bg-primary/10 dark:brightness-105',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
    {
      label: 'Ver inventario',
      icon: Package,
      href: '/inventario',
      cls: 'bg-card border border-border hover:border-violet-500/30 hover:bg-violet-500/5 text-foreground dark:hover:bg-violet-500/10 dark:brightness-105',
      roles: [RolUsuario.ADMIN, RolUsuario.ENCARGADO],
    },
  ].filter((p) => !p.roles || hasRole(...p.roles))

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Acciones frecuentes</p>
        </div>
        <Zap className="size-4 text-muted-foreground/30" />
      </div>

      <div className="flex flex-col gap-2.5 flex-1">
        {PILLS.map((p) => (
          <Link key={p.href} href={p.href} className="w-full">
            <div
              className={cn(
                'flex items-center justify-center gap-2 w-full h-12 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-md',
                p.cls,
              )}
            >
              <p.icon className="size-4 shrink-0" />
              {p.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
