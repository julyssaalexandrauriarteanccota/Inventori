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

  it('permite /configuracion a ENCARGADO y lo bloquea para TECNICO', () => {
    expect(canAccessErpPath('/configuracion', RolUsuario.ENCARGADO)).toBe(true)
    expect(canAccessErpPath('/configuracion', RolUsuario.ADMIN)).toBe(true)
    expect(canAccessErpPath('/configuracion', RolUsuario.TECNICO)).toBe(false)
  })

  it('configuraion aparece en navegacion de ENCARGADO pero no de TECNICO', () => {
    const navEncargado = getNavigationForRole(RolUsuario.ENCARGADO)
    const navTecnico = getNavigationForRole(RolUsuario.TECNICO)
    expect(navEncargado.find((item) => item.url === '/configuracion')).toBeDefined()
    expect(navTecnico.find((item) => item.url === '/configuracion')).toBeUndefined()
  })

  it('mantiene /configuracion/tributario bloqueado para ENCARGADO', () => {
    expect(canAccessErpPath('/configuracion/tributario', RolUsuario.ENCARGADO)).toBe(false)
    expect(canAccessErpPath('/configuracion/tributario', RolUsuario.ADMIN)).toBe(true)
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
    // /proveedores IS registered at root level → allowed for ENCARGADO
    expect(canAccessErpPath('/proveedores', RolUsuario.ENCARGADO)).toBe(true)
  })
})
