import type { EmpresaPublica } from '@erp/shared'

import { api } from './api'
import { CURRENT_INDUSTRY_PUBLIC_BRANDING_DEFAULTS } from './public-branding-defaults'
import type { PublicBranding } from './public-branding-types'

export type EmpresaPublicaBrandingInput =
  | Partial<EmpresaPublica>
  | null
  | undefined

export const PUBLIC_BRANDING_QUERY_KEY = 'public-branding'

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const cleaned = cleanText(value)
    if (cleaned) return cleaned
  }

  return null
}

function requiredText(...values: unknown[]): string {
  return firstText(...values) ?? ''
}

function buildMetadataTitle(displayName: string, industry: string) {
  if (!displayName && !industry) return ''
  if (!industry) return displayName
  if (!displayName) return industry
  return `${displayName} — ${industry}`
}

export function resolvePublicBranding(
  empresa: EmpresaPublicaBrandingInput,
  defaults: PublicBranding = CURRENT_INDUSTRY_PUBLIC_BRANDING_DEFAULTS,
): PublicBranding {
  const displayName = requiredText(
    empresa?.nombreComercial,
    empresa?.razonSocial,
    defaults.identity.displayName,
  )
  const legalName = requiredText(
    empresa?.razonSocial,
    empresa?.nombreComercial,
    defaults.identity.legalName,
    displayName,
  )
  const industry = requiredText(empresa?.rubro, defaults.identity.industry)
  const seoDescription = requiredText(
    empresa?.descripcionSeo,
    empresa?.descripcionCorta,
    defaults.identity.seoDescription,
  )
  const shortDescription = requiredText(
    empresa?.descripcionCorta,
    empresa?.descripcionSeo,
    defaults.identity.shortDescription,
  )
  const slogan = requiredText(empresa?.slogan, defaults.identity.slogan)
  const phone = firstText(empresa?.telefono, defaults.contact.phone)
  const email = firstText(empresa?.email, defaults.contact.email)
  const salesPhone = firstText(
    empresa?.telefonoVentas,
    defaults.contact.salesPhone,
  )
  const supportPhone = firstText(
    empresa?.telefonoSoporte,
    defaults.contact.supportPhone,
  )
  const whatsapp = firstText(empresa?.whatsapp, defaults.contact.whatsapp)
  const salesEmail = firstText(
    empresa?.emailVentas,
    defaults.contact.salesEmail,
  )
  const supportEmail = firstText(
    empresa?.emailSoporte,
    defaults.contact.supportEmail,
  )
  const hasConfiguredIdentity = Boolean(
    firstText(empresa?.nombreComercial, empresa?.razonSocial, empresa?.rubro),
  )

  return {
    identity: {
      displayName,
      legalName,
      taxId: firstText(empresa?.ruc, defaults.identity.taxId),
      slogan,
      shortDescription,
      seoDescription,
      industry,
      website: firstText(empresa?.website, defaults.identity.website),
    },
    contact: {
      address: firstText(empresa?.direccion, defaults.contact.address),
      phone,
      email,
      salesPhone,
      supportPhone,
      whatsapp,
      salesEmail,
      supportEmail,
      primaryPhone: firstText(
        salesPhone,
        whatsapp,
        phone,
        defaults.contact.primaryPhone,
      ),
      primaryEmail: firstText(salesEmail, email, defaults.contact.primaryEmail),
    },
    assets: {
      logo: firstText(empresa?.logo, defaults.assets.logo),
      logoDark: firstText(empresa?.logoDark, defaults.assets.logoDark),
      favicon: firstText(empresa?.favicon, defaults.assets.favicon),
    },
    theme: {
      primaryColor: firstText(
        empresa?.colorPrimario,
        defaults.theme.primaryColor,
      ),
      secondaryColor: firstText(
        empresa?.colorSecundario,
        defaults.theme.secondaryColor,
      ),
    },
    content: {
      metadataTitle: hasConfiguredIdentity
        ? buildMetadataTitle(displayName, industry)
        : requiredText(defaults.content.metadataTitle),
      metadataTemplate:
        firstText(defaults.content.metadataTemplate)?.replace(
          defaults.identity.displayName,
          displayName,
        ) ?? `%s | ${displayName}`,
      pwaDescription: requiredText(
        empresa?.pwaDescripcion,
        defaults.content.pwaDescription,
        seoDescription,
      ),
      heroEyebrow: requiredText(
        empresa?.rubro,
        empresa?.slogan,
        defaults.content.heroEyebrow,
      ),
      heroTitle: requiredText(empresa?.heroTitulo, defaults.content.heroTitle),
      heroSubtitle: requiredText(
        empresa?.heroSubtitulo,
        defaults.content.heroSubtitle,
        shortDescription,
      ),
      catalogTitle: defaults.content.catalogTitle,
      catalogDescription: requiredText(
        empresa?.catalogoDescripcion,
        defaults.content.catalogDescription,
      ),
      contactTitle: defaults.content.contactTitle,
      contactDescription: requiredText(
        empresa?.contactoDescripcion,
        defaults.content.contactDescription,
      ),
      warrantyTitle: defaults.content.warrantyTitle,
      warrantyDescription: requiredText(
        empresa?.garantiaDescripcion,
        defaults.content.warrantyDescription,
      ),
      ticketTitle: defaults.content.ticketTitle,
      ticketDescription: requiredText(
        empresa?.ticketDescripcion,
        defaults.content.ticketDescription,
      ),
      quickAccessTitle: defaults.content.quickAccessTitle,
      quickAccessDescription: defaults.content.quickAccessDescription,
    },
  }
}

export async function getPublicBrandingFromApi() {
  try {
    const response = await api.get<{
      data: EmpresaPublica
      meta: { timestamp: string }
    }>('/config/empresa/publica', { skipAuth: true })

    return resolvePublicBranding(response.data)
  } catch {
    return resolvePublicBranding(null)
  }
}

export type { PublicBranding }
