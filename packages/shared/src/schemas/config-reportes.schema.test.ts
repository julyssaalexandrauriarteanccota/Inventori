import { describe, expect, it } from 'vitest'

import {
  auditoriaPaginatedResponseSchema,
  configEmpresaSchema,
  dashboardKpisResponseSchema,
  empresaPublicaResponseSchema,
} from './config-reportes.schema'

describe('config y reportes schemas', () => {
  it('valida respuesta de dashboard', () => {
    const parsed = dashboardKpisResponseSchema.parse({
      data: {
        ventasMes: { totalMonto: 15000, cantidad: 8 },
        tickets: { abiertos: 3, cerradosMes: 12 },
        alertasStockPendientes: 2,
        clientesNuevosMes: 5,
      },
      meta: {
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data.ventasMes.totalMonto).toBe(15000)
  })

  it('valida payload de configuración de empresa', () => {
    const parsed = configEmpresaSchema.parse({
      razonSocial: 'ERP Demo SAC',
      ruc: '20123456789',
      nombreComercial: 'Inventori Demo',
      slogan: 'Gestión integral para empresas técnicas',
      descripcionSeo: 'ERP configurable para ventas, inventario y soporte',
      rubro: 'servicios técnicos',
      telefonoVentas: '+51 999 888 777',
      emailVentas: 'ventas@example.com',
      heroTitulo: 'Controla tu operación desde un solo lugar',
      pwaDescripcion: 'ERP configurable con catálogo, ventas y soporte',
      porcentajeIGV: 18,
    })

    expect(parsed.ruc).toBe('20123456789')
    expect(parsed.nombreComercial).toBe('Inventori Demo')
  })

  it('valida respuesta pública de empresa con branding', () => {
    const parsed = empresaPublicaResponseSchema.parse({
      data: {
        razonSocial: 'ERP Demo SAC',
        ruc: '20123456789',
        direccion: 'Av. Demo 123',
        telefono: '01-555-1234',
        email: 'contacto@example.com',
        logo: '/logo.png',
        nombreComercial: 'Inventori Demo',
        slogan: 'Gestión integral para empresas técnicas',
        descripcionCorta: 'ERP configurable para operaciones comerciales',
        descripcionSeo: 'ERP configurable para ventas, inventario y soporte',
        rubro: 'servicios técnicos',
        website: 'https://example.com',
        telefonoVentas: '+51 999 888 777',
        telefonoSoporte: '+51 999 111 222',
        whatsapp: '+51 999 888 777',
        emailVentas: 'ventas@example.com',
        emailSoporte: 'soporte@example.com',
        logoDark: null,
        favicon: '/favicon.ico',
        colorPrimario: '#0f172a',
        colorSecundario: '#f97316',
        heroTitulo: 'Controla tu operación desde un solo lugar',
        heroSubtitulo: 'Inventario, ventas y soporte en tiempo real',
        catalogoDescripcion: 'Explora productos y servicios disponibles',
        contactoDescripcion: 'Comunícate con nuestro equipo comercial',
        garantiaDescripcion: 'Consulta el estado de tus garantías',
        ticketDescripcion: 'Haz seguimiento a tus solicitudes de soporte',
        pwaDescripcion: 'ERP configurable con catálogo, ventas y soporte',
      },
      meta: {
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data.nombreComercial).toBe('Inventori Demo')
    expect(parsed.data.logoDark).toBeNull()
  })

  it('valida respuesta paginada de auditoría', () => {
    const parsed = auditoriaPaginatedResponseSchema.parse({
      data: [
        {
          id: '11111111-1111-4111-8111-000000000001',
          accion: 'UPDATE',
          modelo: 'ConfigEmpresa',
          modeloId: 'empresa',
          createdAt: '2026-04-06T00:00:00.000Z',
          usuario: {
            id: '11111111-1111-4111-8111-000000000002',
            nombre: 'Admin Demo',
            email: 'admin@example.com',
          },
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        timestamp: '2026-04-06T00:00:00.000Z',
      },
    })

    expect(parsed.data[0].modelo).toBe('ConfigEmpresa')
    expect(parsed.data[0].usuario?.nombre).toBe('Admin Demo')
  })
})
