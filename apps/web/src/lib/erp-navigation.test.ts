import { describe, expect, it } from 'vitest'
import { RolUsuario } from '@erp/shared'

import {
  canAccessErpPath,
  getExactErpRoute,
  getNavigationForRole,
} from '@/lib/erp-navigation'

describe('erp-navigation', () => {
  it('oculta ventas para tecnico cuando no tiene subrutas habilitadas', () => {
    const navigation = getNavigationForRole(RolUsuario.TECNICO)

    const ventas = navigation.find((item) => item.url === '/ventas')
    expect(ventas).toBeUndefined()

    const equipos = navigation.find((item) => item.url === '/equipos')
    expect(equipos).toBeUndefined()

    const soporte = navigation.find((item) => item.url === '/soporte')
    expect(soporte).toBeDefined()

    const equiposExternos = navigation.find(
      (item) => item.url === '/soporte/equipos-externos',
    )
    expect(equiposExternos).toBeDefined()
  })

  it('bloquea accesos directos que tecnico no debe abrir', () => {
    expect(canAccessErpPath('/inventario', RolUsuario.TECNICO)).toBe(false)
    expect(canAccessErpPath('/reportes/ventas', RolUsuario.TECNICO)).toBe(false)
  })

  it('permite accesos operativos segun rol', () => {
    expect(canAccessErpPath('/ventas/cotizaciones', RolUsuario.TECNICO)).toBe(false)
    expect(canAccessErpPath('/equipos', RolUsuario.TECNICO)).toBe(false)
    expect(canAccessErpPath('/soporte', RolUsuario.TECNICO)).toBe(true)
    expect(canAccessErpPath('/soporte/equipos-externos', RolUsuario.TECNICO)).toBe(true)
    expect(canAccessErpPath('/reportes/ventas', RolUsuario.ENCARGADO)).toBe(true)
    expect(canAccessErpPath('/dashboard', RolUsuario.TECNICO)).toBe(true)
  })

  it('deniega rutas no registradas en la navegacion', () => {
    expect(canAccessErpPath('/ruta/inventada', RolUsuario.ADMIN)).toBe(false)
  })

  it('permite accesos directos registrados para formularios core', () => {
    expect(canAccessErpPath('/clientes/nuevo', RolUsuario.ADMIN)).toBe(true)
    expect(canAccessErpPath('/productos/nuevo', RolUsuario.ENCARGADO)).toBe(true)
    expect(canAccessErpPath('/equipos/nuevo', RolUsuario.ADMIN)).toBe(true)
    expect(canAccessErpPath('/soporte/nuevo', RolUsuario.TECNICO)).toBe(true)
    expect(canAccessErpPath('/clientes/nuevo?from=dashboard', RolUsuario.ADMIN)).toBe(true)
  })

  it('resuelve rutas exactas del modulo principal', () => {
    expect(getExactErpRoute('/dashboard')).toEqual(
      expect.objectContaining({
        title: 'Dashboard',
        url: '/dashboard',
      }),
    )
    expect(getExactErpRoute('/soporte')).toEqual(
      expect.objectContaining({
        title: 'Soporte',
        url: '/soporte',
      }),
    )
  })

  it('respeta permisos de sub-rutas registradas', () => {
    expect(canAccessErpPath('/ventas/cotizaciones', RolUsuario.ADMIN)).toBe(true)
    expect(canAccessErpPath('/ventas/cotizaciones', RolUsuario.TECNICO)).toBe(false)
    // /ventas/facturacion IS registered → allowed for ADMIN
    expect(canAccessErpPath('/ventas/facturacion', RolUsuario.ADMIN)).toBe(true)
    // /ventas/facturacion IS registered → denied for TECNICO
    expect(canAccessErpPath('/ventas/facturacion', RolUsuario.TECNICO)).toBe(false)
    // /compras/proveedores IS registered → allowed for ENCARGADO
    expect(canAccessErpPath('/compras/proveedores', RolUsuario.ENCARGADO)).toBe(true)
  })
})
