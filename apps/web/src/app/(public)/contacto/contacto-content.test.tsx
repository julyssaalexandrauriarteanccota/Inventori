import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// ── Mocks ──

const mockUsePublicBranding = vi.fn()

vi.mock('@/hooks/use-public-branding', () => ({
  usePublicBranding: () => mockUsePublicBranding(),
}))

import { ContactoContent } from './contacto-content'

const sampleBranding = {
  identity: {
    displayName: 'Inventori',
    legalName: 'Inventori SAC',
    taxId: '20612345678',
    slogan: 'Gestión integral',
    shortDescription: 'Portal público configurable',
    seoDescription: 'Portal público configurable',
    industry: 'Servicios técnicos',
    website: 'https://inventori.pe',
  },
  contact: {
    address: 'Av. La Marina 123, Lima',
    phone: '01-555-1234',
    email: 'contacto@inventori.pe',
    salesPhone: '999-888-777',
    supportPhone: null,
    whatsapp: '999-888-777',
    salesEmail: 'ventas@inventori.pe',
    supportEmail: 'soporte@inventori.pe',
    primaryPhone: '999-888-777',
    primaryEmail: 'ventas@inventori.pe',
  },
  assets: {
    logo: null,
    logoDark: null,
    favicon: '/favicon.ico',
  },
  theme: {
    primaryColor: null,
    secondaryColor: null,
  },
  content: {
    metadataTitle: 'Inventori',
    metadataTemplate: '%s | Inventori',
    pwaDescription: 'ERP configurable',
    heroEyebrow: 'Servicios técnicos',
    heroTitle: 'Portal público',
    heroSubtitle: 'Portal público configurable',
    catalogTitle: 'Catálogo',
    catalogDescription: 'Catálogo público',
    contactTitle: 'Contacto',
    contactDescription: 'Comunícate con nosotros',
    warrantyTitle: 'Garantía',
    warrantyDescription: 'Consulta garantías',
    ticketTitle: 'Ticket',
    ticketDescription: 'Consulta tickets',
    quickAccessTitle: '¿Qué necesitas?',
    quickAccessDescription: 'Accesos rápidos',
  },
}

describe('ContactoContent', () => {
  it('muestra información de la empresa', () => {
    mockUsePublicBranding.mockReturnValue({
      branding: sampleBranding,
      isLoading: false,
    })

    render(<ContactoContent />)

    expect(screen.getByText('Información de la empresa')).toBeInTheDocument()
    expect(screen.getByText('Inventori')).toBeInTheDocument()
    expect(screen.getByText('Inventori SAC')).toBeInTheDocument()
    expect(screen.getByText('20612345678')).toBeInTheDocument()
    expect(screen.getByText('Av. La Marina 123, Lima')).toBeInTheDocument()
    expect(screen.getAllByText('999-888-777')).toHaveLength(2)
    expect(screen.getAllByText('ventas@inventori.pe')).toHaveLength(2)
  })

  it('muestra skeleton durante la carga', () => {
    mockUsePublicBranding.mockReturnValue({
      branding: sampleBranding,
      isLoading: true,
    })

    const { container } = render(<ContactoContent />)

    const skeletons = container.querySelectorAll(
      '[class*="animate-pulse"], [data-slot="skeleton"]',
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('muestra defaults resueltos cuando no hay datos de contacto configurados', () => {
    mockUsePublicBranding.mockReturnValue({
      branding: {
        ...sampleBranding,
        contact: {
          ...sampleBranding.contact,
          address: null,
          phone: null,
          email: null,
          salesPhone: null,
          supportPhone: null,
          whatsapp: null,
          salesEmail: null,
          supportEmail: null,
          primaryPhone: null,
          primaryEmail: null,
        },
      },
      isLoading: false,
    })

    render(<ContactoContent />)

    expect(screen.getByText('Información de la empresa')).toBeInTheDocument()
    expect(screen.getByText('Inventori')).toBeInTheDocument()
    expect(screen.queryByText('Dirección')).not.toBeInTheDocument()
    expect(screen.queryByText('Teléfono')).not.toBeInTheDocument()
  })

  it('oculta campos vacíos', () => {
    mockUsePublicBranding.mockReturnValue({
      branding: {
        ...sampleBranding,
        identity: {
          ...sampleBranding.identity,
          displayName: 'Solo Nombre',
          legalName: 'Solo Nombre SAC',
          taxId: null,
          website: null,
        },
        contact: {
          ...sampleBranding.contact,
          address: null,
          phone: null,
          salesPhone: null,
          supportPhone: null,
          whatsapp: null,
          salesEmail: null,
          supportEmail: null,
          primaryPhone: null,
          primaryEmail: 'test@test.com',
        },
      },
      isLoading: false,
    })

    render(<ContactoContent />)

    expect(screen.getByText('Solo Nombre')).toBeInTheDocument()
    expect(screen.getByText('Solo Nombre SAC')).toBeInTheDocument()
    expect(screen.getByText('test@test.com')).toBeInTheDocument()
    expect(screen.queryByText('RUC')).not.toBeInTheDocument()
    expect(screen.queryByText('Dirección')).not.toBeInTheDocument()
    expect(screen.queryByText('Teléfono')).not.toBeInTheDocument()
  })
})
