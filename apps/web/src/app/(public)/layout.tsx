import type { Metadata } from "next";
import Link from "next/link";

import { IvIcon } from "@/components/iv";
import { getPublicBrandingFromApi } from "@/lib/public-branding";

import { PublicNav } from "./_components/public-nav";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicBrandingFromApi();

  return {
    title: {
      default: branding.content.metadataTitle,
      template: branding.content.metadataTemplate,
    },
    description: branding.identity.seoDescription,
  };
}

const NAV_LINKS = [
  { href: "/catalogo?categoria=equipos", label: "Equipos" },
  { href: "/#equipamiento", label: "Soluciones" },
  { href: "/#soporte", label: "Servicios" },
  { href: "/#ubicacion", label: "Ubicación" },
  { href: "/#contacto", label: "Contacto" },
] as const;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getPublicBrandingFromApi();

  return (
    <div className="iv min-h-screen">
      <PublicNav
        brandName={branding.identity.displayName}
        links={[...NAV_LINKS]}
        whatsapp={branding.contact.whatsapp}
        phone={
          branding.contact.salesPhone ??
          branding.contact.primaryPhone ??
          branding.contact.phone
        }
      />

      <main>{children}</main>

      <footer>
        <div className="iv-tech-footer">
          <div className="iv-footer-brand">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label={`${branding.identity.displayName} · Inicio`}
            >
              <IvIcon name="logo" size={28} />
              <span
                style={{
                  fontFamily: "var(--iv-font-display)",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--ink)",
                }}
              >
                <span style={{ color: "var(--accent)" }}>I</span>nventori
              </span>
            </Link>
            <p>
              Equipos de impresión inteligentes para empresas que no pueden
              detenerse. Operamos en LATAM con soporte técnico certificado.
            </p>
          </div>
          <div>
            <h5>Producto</h5>
            <ul>
              <li>
                <Link href="/catalogo?categoria=equipos">
                  Multifuncionales
                </Link>
              </li>
              <li>
                <Link href="/catalogo?categoria=repuestos">Repuestos</Link>
              </li>
              <li>
                <Link href="/catalogo?categoria=insumos">Insumos</Link>
              </li>
              <li>
                <Link href="/catalogo">Catálogo completo</Link>
              </li>
            </ul>
          </div>
          <div>
            <h5>Empresa</h5>
            <ul>
              <li>
                <Link href="/contacto">Nosotros</Link>
              </li>
              <li>
                <Link href="/contacto">Casos de éxito</Link>
              </li>
              <li>
                <Link href="/contacto">Carreras</Link>
              </li>
              <li>
                <Link href="/contacto">Prensa</Link>
              </li>
            </ul>
          </div>
          <div>
            <h5>Soporte</h5>
            <ul>
              <li>
                <Link href="/ticket">Centro de ayuda</Link>
              </li>
              <li>
                <Link href="/garantia">Garantía</Link>
              </li>
              <li>
                <Link href="/portal-cliente">Portal cliente</Link>
              </li>
              <li>
                <Link href="/contacto">Contacto</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="iv-footer-bottom">
          <span>
            © {new Date().getFullYear()} {branding.identity.displayName.toUpperCase()} ·
            TODOS LOS DERECHOS RESERVADOS
          </span>
          <span>PUNO · PERÚ</span>
        </div>
      </footer>
    </div>
  );
}
