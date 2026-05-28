import {
  BarChart3,
  Box,
  HeadsetIcon,
  LayoutDashboard,
  Monitor,
  Package,
  Printer,
  Receipt,
  ScrollText,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { RolUsuario } from "@erp/shared"

export type ErpRouteDescriptor = {
  title: string
  url: string
  description: string
  roles: RolUsuario[]
}

export type ErpNavigationItem = ErpRouteDescriptor & {
  icon?: LucideIcon
  items?: ErpRouteDescriptor[]
}

type ErpDynamicRouteDescriptor = ErpRouteDescriptor & {
  matcher: (pathname: string) => boolean
}

const ALL_ROLES = [RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO]
const ADMIN_AND_ENCARGADO = [RolUsuario.ADMIN, RolUsuario.ENCARGADO]
const ADMIN_ONLY = [RolUsuario.ADMIN]

export const ERP_NAVIGATION: ErpNavigationItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    description: "Resumen operativo del ERP con accesos y estado general.",
    roles: ALL_ROLES,
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    description: "Gestion de clientes, ficha comercial y seguimiento.",
    roles: ALL_ROLES,
  },
  {
    title: "Proveedores",
    url: "/proveedores",
    icon: Truck,
    description: "Administración de proveedores, datos fiscales y contacto.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Productos",
    url: "/productos",
    icon: Package,
    description: "Catalogo, repuestos, consumibles y estructura comercial.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Servicios",
    url: "/servicios",
    icon: Wrench,
    description: "Catalogo de servicios tecnicos y reglas de repuestos.",
    roles: ALL_ROLES,
  },
  {
    title: "Inventario",
    url: "/inventario",
    icon: Box,
    description: "Stock, movimientos, alertas y control de almacen.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Equipos",
    url: "/equipos",
    icon: Printer,
    description: "Equipos serializados y trazabilidad de servicio.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Alquileres",
    url: "/alquileres",
    icon: ScrollText,
    description: "Contratos mensuales, lecturas, excedentes y devolución de equipos.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Ventas",
    url: "/ventas",
    icon: ShoppingCart,
    description: "Hub de ventas: rápida, detallada, historial y comprobantes.",
    roles: ADMIN_AND_ENCARGADO,
    items: [
      {
        title: "Cotizaciones",
        url: "/ventas/cotizaciones",
        description: "Propuestas comerciales para entregar al cliente.",
        roles: ADMIN_AND_ENCARGADO,
      },
      {
        title: "Punto de venta",
        url: "/pos",
        description: "Venta rápida desde catálogo y carrito.",
        roles: ADMIN_AND_ENCARGADO,
      },
    ],
  },
  {
    title: "Comprobantes",
    url: "/comprobantes",
    icon: Receipt,
    description: "Hub fiscal SUNAT: por emitir, emitidos, notas y bajas.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Compras",
    url: "/compras",
    icon: Truck,
    description: "Ordenes de compra, recepciones y proveedores.",
    roles: ADMIN_AND_ENCARGADO,

  },
  {
    title: "Soporte",
    url: "/soporte",
    icon: HeadsetIcon,
    description: "Tickets, recepcion de equipos y trabajo tecnico.",
    roles: ALL_ROLES,
  },
  {
    title: "Equipos externos",
    url: "/soporte/equipos-externos",
    icon: Monitor,
    description: "Equipos propiedad de clientes para soporte y mantenimiento.",
    roles: ALL_ROLES,
  },
  {
    title: "Garantias",
    url: "/garantias",
    icon: ShieldCheck,
    description: "Control de garantias activas, casos y validaciones.",
    roles: ALL_ROLES,
  },
  {
    title: "Reportes",
    url: "/reportes",
    icon: BarChart3,
    description: "Analitica de ventas, inventario y soporte.",
    roles: ADMIN_AND_ENCARGADO,
    items: [
      {
        title: "Ventas",
        url: "/reportes/ventas",
        description: "Reporte detallado de ventas.",
        roles: ADMIN_AND_ENCARGADO,
      },
      {
        title: "Inventario",
        url: "/reportes/inventario",
        description: "Reporte detallado de inventario.",
        roles: ADMIN_AND_ENCARGADO,
      },
      {
        title: "Soporte",
        url: "/reportes/soporte",
        description: "Reporte detallado de soporte.",
        roles: ADMIN_AND_ENCARGADO,
      },
    ],
  },
  {
    title: "Auditoria",
    url: "/auditoria",
    icon: ScrollText,
    description: "Bitacora operativa y trazabilidad de cambios del sistema.",
    roles: ADMIN_ONLY,
  },
  {
    title: "Configuración",
    url: "/configuracion",
    icon: Settings2,
    description: "Empresa, SUNAT, usuarios y catálogos en una vista dedicada.",
    roles: ADMIN_AND_ENCARGADO,
  },
]

export const ERP_SPECIAL_ROUTES: ErpRouteDescriptor[] = [
  {
    title: "Acceso denegado",
    url: "/acceso-denegado",
    description: "Pantalla de restriccion por permisos insuficientes.",
    roles: ALL_ROLES,
  },
  {
    title: "Configuración tributaria",
    url: "/configuracion/tributario",
    description: "Datos fiscales, series, certificados, reglas y feriados.",
    roles: ADMIN_ONLY,
  },
  {
    title: "Nuevo cliente",
    url: "/clientes/nuevo",
    description: "Acceso directo al formulario de clientes.",
    roles: ALL_ROLES,
  },
  {
    title: "Nuevo producto",
    url: "/productos/nuevo",
    description: "Acceso directo al formulario de productos.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Nuevo servicio",
    url: "/servicios/nuevo",
    description: "Acceso directo al formulario de servicios.",
    roles: ALL_ROLES,
  },
  {
    title: "Nuevo equipo",
    url: "/equipos/nuevo",
    description: "Acceso directo al formulario de equipos.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Nuevo ticket",
    url: "/soporte/nuevo",
    description: "Acceso directo al formulario de tickets.",
    roles: ALL_ROLES,
  },
  {
    title: "Ventas",
    url: "/ventas",
    description: "Acceso directo al módulo comercial legacy de ventas.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Cotizaciones",
    url: "/ventas/cotizaciones",
    description: "Acceso directo al tablero de cotizaciones legacy.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Nuevo proveedor",
    url: "/proveedores/nuevo",
    description: "Acceso directo al formulario de proveedores.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Facturación",
    url: "/ventas/facturacion",
    description: "Acceso directo al flujo legacy de facturación comercial.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Punto de venta",
    url: "/pos",
    description: "Paso 1: catálogo y armado del carrito.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Cobro y emisión",
    url: "/pos/cobrar",
    description: "Paso 2: cliente, comprobante y método de pago.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes",
    url: "/comprobantes",
    description: "Hub fiscal: por emitir, emitidos y bajas SUNAT.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes · por emitir",
    url: "/comprobantes/por-emitir",
    description: "Bandeja de ventas pendientes de comprobante.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes · facturas",
    url: "/comprobantes/facturas",
    description: "Listado de facturas emitidas.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes · boletas",
    url: "/comprobantes/boletas",
    description: "Listado de boletas emitidas.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes · notas de crédito",
    url: "/comprobantes/notas-credito",
    description: "Notas de crédito emitidas.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes · nueva nota de credito",
    url: "/comprobantes/nueva-nc",
    description: "Emision de nota de credito vinculada a comprobante origen.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes · notas de débito",
    url: "/comprobantes/notas-debito",
    description: "Notas de débito emitidas.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes · nueva nota de débito",
    url: "/comprobantes/nueva-nd",
    description: "Emisión de nota de débito vinculada a comprobante origen.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes · comunicaciones de baja",
    url: "/comprobantes/bajas",
    description: "Resúmenes RA enviados a SUNAT.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Comprobantes emitidos POS",
    url: "/pos/comprobantes",
    description: "Boletas, facturas y notas de la venta.",
    roles: ADMIN_AND_ENCARGADO,
  },
  {
    title: "Caja del turno",
    url: "/pos/caja",
    description: "Apertura, movimientos y arqueo del turno actual.",
    roles: ADMIN_AND_ENCARGADO,
  },
]

export const ERP_DYNAMIC_ROUTES: ErpDynamicRouteDescriptor[] = [
  {
    title: "Historial de ventas",
    url: "/pos/historial",
    description: "Ruta legacy que redirige a Ventas.",
    roles: ADMIN_AND_ENCARGADO,
    matcher: (pathname) => pathname === "/pos/historial",
  },
  {
    title: "Detalle de producto",
    url: "/productos/[id]",
    description: "Ficha completa del producto, servicio o repuesto.",
    roles: ADMIN_AND_ENCARGADO,
    matcher: (pathname) => /^\/productos\/[^/]+$/.test(pathname),
  },
  {
    title: "Editar producto",
    url: "/productos/[id]/editar",
    description: "Formulario completo de edicion del catalogo.",
    roles: ADMIN_AND_ENCARGADO,
    matcher: (pathname) => /^\/productos\/[^/]+\/editar$/.test(pathname),
  },
  {
    title: "Editar servicio",
    url: "/servicios/[id]/editar",
    description: "Formulario completo de edición de servicios.",
    roles: ALL_ROLES,
    matcher: (pathname) => /^\/servicios\/[^/]+\/editar$/.test(pathname),
  },
  {
    title: "Detalle de ticket",
    url: "/soporte/[id]",
    description: "Ficha completa del caso de soporte.",
    roles: ALL_ROLES,
    matcher: (pathname) => /^\/soporte\/[^/]+$/.test(pathname),
  },
  {
    title: "Detalle de alquiler",
    url: "/alquileres/[id]",
    description: "Contrato, periodos, lecturas, cargos y estado del alquiler.",
    roles: ADMIN_AND_ENCARGADO,
    matcher: (pathname) => /^\/alquileres\/[^/]+$/.test(pathname),
  },
  {
    title: "Editar ticket",
    url: "/soporte/[id]/editar",
    description: "Formulario completo de edición del ticket.",
    roles: ALL_ROLES,
    matcher: (pathname) => /^\/soporte\/[^/]+\/editar$/.test(pathname),
  },
  {
    title: "Detalle de comprobante",
    url: "/comprobantes/[id]",
    description: "Datos fiscales, snapshot, logs SUNAT y vinculadas.",
    roles: ADMIN_AND_ENCARGADO,
    matcher: (pathname) => /^\/comprobantes\/[^/]+$/.test(pathname) && !/^\/comprobantes\/(por-emitir|facturas|boletas|notas-credito|notas-debito|bajas|nueva-nc|nueva-nd)$/.test(pathname),
  },
  {
    title: "Detalle de comunicación de baja",
    url: "/comprobantes/bajas/[id]",
    description: "Estado SUNAT, ticket, CDR y XML de la comunicación de baja.",
    roles: ADMIN_AND_ENCARGADO,
    matcher: (pathname) => /^\/comprobantes\/bajas\/[^/]+$/.test(pathname),
  },
  {
    title: "Configuración tributaria",
    url: "/configuracion/tributario/[tab]",
    description: "Subsecciones de configuración tributaria.",
    roles: ADMIN_ONLY,
    matcher: (pathname) => /^\/configuracion\/tributario\/[^/]+$/.test(pathname),
  },
]

function normalizePath(pathname: string) {
  if (!pathname) {
    return "/"
  }

  const [pathWithoutQuery] = pathname.split(/[?#]/)

  if (pathWithoutQuery.length > 1 && pathWithoutQuery.endsWith("/")) {
    return pathWithoutQuery.slice(0, -1)
  }

  return pathWithoutQuery
}

export function flattenErpRoutes() {
  const flatChildren = ERP_NAVIGATION.flatMap((item) => item.items ?? [])
  return [...ERP_NAVIGATION, ...flatChildren, ...ERP_SPECIAL_ROUTES]
}

export function hasRouteAccess(
  route: ErpRouteDescriptor,
  rol?: RolUsuario | null,
) {
  if (!rol) {
    return false
  }

  return route.roles.includes(rol)
}

export function getNavigationForRole(rol?: RolUsuario | null) {
  return ERP_NAVIGATION.flatMap((item) => {
    const visibleChildren = (item.items ?? []).filter((child) =>
      hasRouteAccess(child, rol),
    )
    const canSeeItem = hasRouteAccess(item, rol)

    if (!canSeeItem && visibleChildren.length === 0) {
      return []
    }

    return [
      {
        ...item,
        items: visibleChildren,
      },
    ]
  })
}

export function getExactErpRoute(pathname: string) {
  const normalizedPath = normalizePath(pathname)

  return flattenErpRoutes().find((route) => route.url === normalizedPath)
}

export function findErpRoute(pathname: string) {
  const normalizedPath = normalizePath(pathname)
  return (
    getExactErpRoute(normalizedPath) ??
    ERP_DYNAMIC_ROUTES.find((route) => route.matcher(normalizedPath))
  )
}

export function canAccessErpPath(
  pathname: string,
  rol?: RolUsuario | null,
) {
  const route = findErpRoute(pathname)

  if (!route) {
    return false
  }

  return hasRouteAccess(route, rol)
}

export function getRoleLabel(rol: RolUsuario) {
  switch (rol) {
    case RolUsuario.ADMIN:
      return "ADMIN"
    case RolUsuario.ENCARGADO:
      return "ENCARGADO"
    case RolUsuario.TECNICO:
      return "TECNICO"
    default:
      return rol
  }
}
