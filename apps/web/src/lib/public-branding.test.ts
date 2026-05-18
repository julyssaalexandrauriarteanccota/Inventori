import { describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { CURRENT_INDUSTRY_PUBLIC_BRANDING_DEFAULTS } from './public-branding-defaults'
import { resolvePublicBranding } from './public-branding'

describe('resolvePublicBranding', () => {
  it('usa defaults locales cuando la API no entrega configuración', () => {
    const branding = resolvePublicBranding(null)

    expect(branding.identity.displayName).toBe('Inventori')
    expect(branding.content.catalogDescription).toBeTruthy()
    expect(branding.assets.favicon).toBe('/favicon.ico')
  })

  it('sobrescribe defaults con datos públicos de ConfigEmpresa', () => {
    const branding = resolvePublicBranding({
      razonSocial: 'Empresa Demo SAC',
      nombreComercial: 'DemoTech',
      slogan: 'Tecnología para tu operación',
      descripcionCorta: 'Equipos, servicios y soporte para empresas.',
      descripcionSeo: 'ERP configurable para empresas de tecnología.',
      rubro: 'Informática',
      telefono: '01-555-0000',
      telefonoVentas: '999 888 777',
      email: 'contacto@example.com',
      emailVentas: 'ventas@example.com',
      logo: '/uploads/logo.png',
      colorPrimario: '#111827',
      heroTitulo: 'Soluciones tecnológicas para tu empresa',
      heroSubtitulo: 'Catálogo, ventas y soporte en un solo lugar.',
      catalogoDescripcion: 'Explora nuestros equipos y servicios.',
      pwaDescripcion: 'Portal comercial de DemoTech.',
    })

    expect(branding.identity.displayName).toBe('DemoTech')
    expect(branding.identity.legalName).toBe('Empresa Demo SAC')
    expect(branding.contact.primaryPhone).toBe('999 888 777')
    expect(branding.contact.primaryEmail).toBe('ventas@example.com')
    expect(branding.content.heroTitle).toBe(
      'Soluciones tecnológicas para tu empresa',
    )
    expect(branding.content.catalogDescription).toBe(
      'Explora nuestros equipos y servicios.',
    )
    expect(branding.content.pwaDescription).toBe(
      'Portal comercial de DemoTech.',
    )
    expect(branding.assets.logo).toBe('/uploads/logo.png')
    expect(branding.theme.primaryColor).toBe('#111827')
  })

  it('ignora strings vacíos y conserva fallback útil', () => {
    const branding = resolvePublicBranding({
      razonSocial: '   ',
      nombreComercial: 'Marca Visible',
      telefonoVentas: '',
      whatsapp: '  999 111 222 ',
      emailVentas: ' ',
      email: 'contacto@example.com',
    })

    expect(branding.identity.displayName).toBe('Marca Visible')
    expect(branding.contact.primaryPhone).toBe('999 111 222')
    expect(branding.contact.primaryEmail).toBe('contacto@example.com')
  })

  it('permite reemplazar defaults del rubro sin tocar componentes', () => {
    const customDefaults = {
      ...CURRENT_INDUSTRY_PUBLIC_BRANDING_DEFAULTS,
      identity: {
        ...CURRENT_INDUSTRY_PUBLIC_BRANDING_DEFAULTS.identity,
        displayName: 'ERP Genérico',
        legalName: 'ERP Genérico',
        industry: 'Servicios técnicos',
      },
      content: {
        ...CURRENT_INDUSTRY_PUBLIC_BRANDING_DEFAULTS.content,
        catalogDescription: 'Explora el catálogo público configurado.',
      },
    }

    const branding = resolvePublicBranding(null, customDefaults)

    expect(branding.identity.industry).toBe('Servicios técnicos')
    expect(branding.content.catalogDescription).toBe(
      'Explora el catálogo público configurado.',
    )
  })
})
