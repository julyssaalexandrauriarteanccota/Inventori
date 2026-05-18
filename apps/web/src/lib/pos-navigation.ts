import {
  FileText,
  History,
  LogOut,
  Receipt,
  Store,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { RolUsuario } from '@erp/shared'

export type PosNavItem = {
  title: string
  url: string
  description: string
  icon: LucideIcon
  roles: RolUsuario[]
  comingSoon?: boolean
}

export type PosNavGroup = {
  label: string
  items: PosNavItem[]
}

const POS_ROLES = [RolUsuario.ADMIN, RolUsuario.ENCARGADO]

export const POS_NAVIGATION: PosNavGroup[] = [
  {
    label: 'Operación',
    items: [
      {
        title: 'Punto de venta',
        url: '/pos',
        description: 'Catálogo, carrito y cobro con emisión de boleta o factura.',
        icon: Store,
        roles: POS_ROLES,
      },
    ],
  },
  {
    label: 'Caja',
    items: [
      {
        title: 'Caja',
        url: '/pos/caja',
        description: 'Apertura, movimientos y arqueo del turno.',
        icon: Wallet,
        roles: POS_ROLES,
      },
    ],
  },
  {
    label: 'Documentos',
    items: [
      {
        title: 'Cotizaciones',
        url: '/pos/cotizaciones',
        description: 'Cotizaciones abiertas y conversión a venta.',
        icon: FileText,
        roles: POS_ROLES,
      },
      {
        title: 'Comprobantes',
        url: '/pos/comprobantes',
        description: 'Boletas, facturas y notas emitidas.',
        icon: Receipt,
        roles: POS_ROLES,
      },
      {
        title: 'Historial de ventas',
        url: '/pos/historial',
        description: 'Ventas confirmadas, entregadas y canceladas.',
        icon: History,
        roles: POS_ROLES,
      },
    ],
  },
]

export const POS_EXIT_ITEM: PosNavItem = {
  title: 'Volver a la app',
  url: '/dashboard',
  description: 'Salir del mundo POS y volver al ERP principal.',
  icon: LogOut,
  roles: POS_ROLES,
}

export function flattenPosRoutes(): PosNavItem[] {
  return POS_NAVIGATION.flatMap((g) => g.items)
}

export function getPosRoute(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return flattenPosRoutes().find((item) => item.url === normalized)
}

export function canAccessPosPath(pathname: string, rol?: RolUsuario | null) {
  if (!rol) return false
  // Cualquier ruta dentro de /pos es accesible si el rol es ADMIN o ENCARGADO.
  if (!pathname.startsWith('/pos')) return false
  return POS_ROLES.includes(rol)
}

export const POS_BRAND = {
  title: 'Punto de venta',
  subtitle: 'Inventori POS',
  accent: 'amber',
} as const

// Atajo: items disponibles para un rol con su flag comingSoon.
export function getPosNavigationForRole(rol?: RolUsuario | null) {
  if (!rol) return [] as PosNavGroup[]
  return POS_NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(rol)),
  })).filter((group) => group.items.length > 0)
}

export const POS_DEFAULT_PATH = '/pos'

export const POS_GENERIC_CLIENT_NAME = 'Público en General'

export const IGV_RATE = 0.18
