import type { PublicBranding } from './public-branding-types'

export const CURRENT_INDUSTRY_PUBLIC_BRANDING_DEFAULTS: PublicBranding = {
  identity: {
    displayName: 'Inventori',
    legalName: 'Inventori',
    taxId: null,
    slogan: 'Venta, alquiler y soporte técnico especializado',
    shortDescription:
      'Venta, alquiler y soporte técnico de impresoras y fotocopiadoras para empresas.',
    seoDescription:
      'Venta, alquiler y soporte técnico de impresoras y fotocopiadoras Konica Minolta Bizhub y Canon en Perú.',
    industry: 'Fotocopiadoras e impresoras',
    website: null,
  },
  contact: {
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
    metadataTitle: 'Inventori — Fotocopiadoras e Impresoras',
    metadataTemplate: '%s | Inventori',
    pwaDescription:
      'ERP para gestión de inventario, ventas y soporte técnico de impresoras y fotocopiadoras.',
    heroEyebrow: 'Konica Minolta Bizhub · Canon',
    heroTitle: 'Impresoras y fotocopiadoras para tu empresa',
    heroSubtitle:
      'Venta, alquiler y soporte técnico especializado. Soluciones confiables para la gestión documental de tu negocio.',
    catalogTitle: 'Catálogo de equipos',
    catalogDescription:
      'Explora nuestra variedad de impresoras y fotocopiadoras Konica Minolta Bizhub y Canon.',
    contactTitle: 'Contacto',
    contactDescription:
      'Comunícate con nosotros para ventas, alquiler o soporte técnico.',
    warrantyTitle: 'Consulta de garantía',
    warrantyDescription:
      'Verifica el estado de garantía de tu equipo ingresando el código QR.',
    ticketTitle: 'Estado de ticket',
    ticketDescription:
      'Consulta el progreso de tu ticket de soporte técnico en tiempo real.',
    quickAccessTitle: '¿Qué necesitas?',
    quickAccessDescription:
      'Accede rápidamente a nuestros servicios sin necesidad de crear una cuenta.',
  },
}
