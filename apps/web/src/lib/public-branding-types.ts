export interface PublicBrandingIdentity {
  displayName: string
  legalName: string
  taxId: string | null
  slogan: string
  shortDescription: string
  seoDescription: string
  industry: string
  website: string | null
}

export interface PublicBrandingContact {
  address: string | null
  phone: string | null
  email: string | null
  salesPhone: string | null
  supportPhone: string | null
  whatsapp: string | null
  salesEmail: string | null
  supportEmail: string | null
  primaryPhone: string | null
  primaryEmail: string | null
}

export interface PublicBrandingAssets {
  logo: string | null
  logoDark: string | null
  favicon: string | null
}

export interface PublicBrandingTheme {
  primaryColor: string | null
  secondaryColor: string | null
}

export interface PublicBrandingContent {
  metadataTitle: string
  metadataTemplate: string
  pwaDescription: string
  heroEyebrow: string
  heroTitle: string
  heroSubtitle: string
  catalogTitle: string
  catalogDescription: string
  contactTitle: string
  contactDescription: string
  warrantyTitle: string
  warrantyDescription: string
  ticketTitle: string
  ticketDescription: string
  quickAccessTitle: string
  quickAccessDescription: string
}

export interface PublicBranding {
  identity: PublicBrandingIdentity
  contact: PublicBrandingContact
  assets: PublicBrandingAssets
  theme: PublicBrandingTheme
  content: PublicBrandingContent
}
