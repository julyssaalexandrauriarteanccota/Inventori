import Link from "next/link";

import { IvIcon } from "@/components/iv";
import type { IvIconName } from "@/components/iv";
import { getPublicBrandingFromApi } from "@/lib/public-branding";

import { BrandMarquee } from "./_components/brand-marquee";
import { ContactQuickForm } from "./_components/contact-quick-form";
import { InfiniteMarquee } from "./_components/infinite-marquee";
import type { MarqueeItem } from "./_components/infinite-marquee";
import { RevealOnScroll } from "./_components/reveal-on-scroll";

const STRIP_METRICS: { num: string; unit: string; label: string }[] = [
  { num: "30", unit: "ppm", label: "Velocidad real" },
  { num: "100", unit: "%", label: "Repuestos originales" },
  { num: "Mismo", unit: "día", label: "Atención técnica" },
  { num: "Puno", unit: "", label: "Servicio local · Perú" },
];

const EQUIPAMIENTO_FEATURES: {
  icon: IvIconName;
  title: string;
  body: string;
}[] = [
  {
    icon: "search",
    title: "Asesoría especializada",
    body: "Te ayudamos a elegir el equipo ideal según el volumen y el tipo de impresión que necesitas.",
  },
  {
    icon: "settings",
    title: "Instalación incluida",
    body: "Configuramos el equipo en tu oficina y capacitamos al personal que lo va a usar.",
  },
  {
    icon: "tools",
    title: "Mantenimiento preventivo",
    body: "Visitas periódicas para mantener tu equipo operativo y alargar su vida útil.",
  },
];

const EQUIPOS: MarqueeItem[] = [
  {
    num: "A3 · 01",
    icon: "copier",
    title: "Multifuncionales A3",
    body: "Color y B/N para alto volumen. Escaneo, copia e impresión en un solo equipo.",
    href: "/catalogo?categoria=equipos",
  },
  {
    num: "A4 · 02",
    icon: "printer",
    title: "Impresoras A4",
    body: "Equipos compactos para oficina y home office. Conexión por red y por USB.",
    href: "/catalogo?categoria=equipos",
  },
  {
    num: "SCAN · 03",
    icon: "doc",
    title: "Escáneres de oficina",
    body: "Captura rápida de documentos con alimentador automático y dúplex.",
    href: "/catalogo?categoria=equipos",
  },
  {
    num: "CONS · 04",
    icon: "ink",
    title: "Consumibles originales",
    body: "Tóners, drums y fusores originales. Compatibles garantizados con tu equipo.",
    href: "/catalogo?categoria=insumos",
  },
  {
    num: "REP · 05",
    icon: "settings",
    title: "Repuestos técnicos",
    body: "Rodillos, fusores, piñones y tarjetas electrónicas. Componentes internos garantizados.",
    href: "/catalogo?categoria=repuestos",
  },
  {
    num: "SERV · 06",
    icon: "tools",
    title: "Servicio técnico",
    body: "Mantenimiento preventivo y correctivo. Diagnóstico especializado en tu oficina.",
    href: "/contacto",
  },
  {
    num: "PROD · 07",
    icon: "box",
    title: "Equipos de producción",
    body: "Sistemas de pedestal para alto volumen. Imprentas y oficinas con demanda intensiva.",
    href: "/catalogo?categoria=equipos",
  },
];

const CONSUMIBLES_FEATURES: {
  icon: IvIconName;
  title: string;
  body: string;
}[] = [
  {
    icon: "wallet",
    title: "Precios honestos",
    body: "Cotización clara. Sin sorpresas ni costos ocultos en la facturación.",
  },
  {
    icon: "package",
    title: "Stock disponible",
    body: "Repuestos e insumos en stock local para los modelos que vendemos.",
  },
];

const SOPORTE_FEATURES: {
  icon: IvIconName;
  title: string;
  body: string;
}[] = [
  {
    icon: "calendar",
    title: "Atención el mismo día",
    body: "Coordinamos visita rápida según disponibilidad y ubicación de tu oficina.",
  },
  {
    icon: "tools",
    title: "Repuestos originales",
    body: "Trabajamos con piezas originales para no comprometer la garantía de tu equipo.",
  },
  {
    icon: "store",
    title: "Servicio local en Puno",
    body: "Atención técnica con conocimiento de la región. Te respondemos en español.",
  },
];

const STEPS: { num: string; title: string; body: string }[] = [
  {
    num: "01",
    title: "Nos cuentas",
    body: "Por teléfono, WhatsApp o ticket. Una breve descripción del problema basta.",
  },
  {
    num: "02",
    title: "Coordinamos visita",
    body: "Agendamos la visita técnica en el horario que mejor te acomode.",
  },
  {
    num: "03",
    title: "Diagnóstico",
    body: "El técnico revisa el equipo y te explica qué pasa y cómo solucionarlo.",
  },
  {
    num: "04",
    title: "Reparación y garantía",
    body: "Reparación con repuestos originales y garantía sobre el servicio realizado.",
  },
];

/**
 * Splits the heroTitle to put visual emphasis on the last segment.
 * Convention: if the title contains a comma, the segment after the last
 * comma is the accent. Otherwise the last word is. Editors can simply
 * write a title like "Impresión empresarial, reinventada" and the comma
 * does the rest.
 */
function splitHeadline(title: string): { lead: string; accent: string } {
  const trimmed = title.trim();
  const commaIdx = trimmed.lastIndexOf(",");
  if (commaIdx > 0 && commaIdx < trimmed.length - 1) {
    return {
      lead: `${trimmed.slice(0, commaIdx + 1)} `,
      accent: trimmed.slice(commaIdx + 1).trim(),
    };
  }
  const spaceIdx = trimmed.lastIndexOf(" ");
  if (spaceIdx > 0) {
    return {
      lead: `${trimmed.slice(0, spaceIdx)} `,
      accent: trimmed.slice(spaceIdx + 1).trim(),
    };
  }
  return { lead: "", accent: trimmed };
}

export default async function PublicHomePage() {
  const branding = await getPublicBrandingFromApi();
  const headline = splitHeadline(branding.content.heroTitle);
  const ctaPhone =
    branding.contact.salesPhone ??
    branding.contact.primaryPhone ??
    branding.contact.phone ??
    branding.contact.whatsapp;
  const phoneHref = ctaPhone
    ? `tel:${ctaPhone.replace(/[^+\d]/g, "")}`
    : "/contacto";

  return (
    <>
      {/* ============================== HERO ============================== */}
      <section className="iv-hero" aria-label={branding.identity.displayName}>
        <video
          className="iv-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/inventori/hero-poster.jpg"
        >
          <source src="/inventori/hero-loop.mp4" type="video/mp4" />
        </video>
        <div className="iv-hero-grid" aria-hidden />
        <div className="iv-particles" aria-hidden>
          <span
            className="iv-particle"
            style={{
              width: 220,
              height: 220,
              left: "3%",
              top: "16%",
              background: "var(--accent)",
              animationDuration: "22s",
            }}
          />
          <span
            className="iv-particle"
            style={{
              width: 160,
              height: 160,
              left: "14%",
              top: "64%",
              background: "var(--accent-2)",
              animationDuration: "26s",
              animationDelay: "-4s",
            }}
          />
          <span
            className="iv-particle"
            style={{
              width: 110,
              height: 110,
              left: "30%",
              top: "28%",
              background: "var(--accent)",
              animationDuration: "19s",
              animationDelay: "-7s",
            }}
          />
          <span
            className="iv-particle"
            style={{
              width: 130,
              height: 130,
              left: "2%",
              top: "78%",
              background: "var(--accent-2)",
              animationDuration: "24s",
              animationDelay: "-2s",
            }}
          />
          <span
            className="iv-particle"
            style={{
              width: 80,
              height: 80,
              left: "36%",
              top: "8%",
              background: "var(--accent)",
              animationDuration: "17s",
              animationDelay: "-10s",
            }}
          />
        </div>
        <div className="iv-hero-overlay" aria-hidden />
        <div className="iv-hero-vignette" aria-hidden />

        <div className="iv-hero-content">
          <div className="iv-stage iv-stage-1">
            <span className="iv-eyebrow">
              <span className="iv-eyebrow-dot" aria-hidden />
              {branding.content.heroEyebrow}
            </span>
          </div>

          <div className="iv-headline-wrap iv-stage iv-stage-2">
            <h1 className="iv-headline">
              {headline.lead}
              <br />
              <span className="iv-accent">{headline.accent}</span>
            </h1>
          </div>

          <p className="iv-subtitle iv-stage iv-stage-3">
            {branding.content.heroSubtitle}
          </p>

          <div className="iv-cta-row iv-stage iv-stage-4">
            <Link href="/catalogo" className="iv-cta-primary">
              Ver catálogo
              <IvIcon name="arrow" size={16} stroke={2.2} />
            </Link>
            <Link href="/#equipamiento" className="iv-cta-secondary">
              <IvIcon name="play" size={12} />
              Cómo funciona
            </Link>
          </div>
        </div>

        <div className="iv-hero-stats iv-stage iv-stage-5">
          <div className="iv-spec-chips">
            <span>30&nbsp;PPM</span>
            <span className="iv-spec-dot">·</span>
            <span>A3 FULL COLOR</span>
            <span className="iv-spec-dot">·</span>
            <span>GARANTÍA OFICIAL</span>
          </div>
          <div className="iv-trust-line hidden sm:inline-flex">
            <IvIcon name="store" size={14} stroke={2} />
            <span>Atención profesional · Puno, Perú</span>
          </div>
        </div>
      </section>

      {/* ============================ STRIP ============================ */}
      <section className="iv-strip" aria-label="Por qué Inventori">
        <div className="iv-strip-inner">
          {STRIP_METRICS.map((m) => (
            <RevealOnScroll key={m.label} className="iv-strip-item">
              <div className="iv-strip-num">
                {m.num}
                <span className="iv-unit">{m.unit}</span>
              </div>
              <div className="iv-strip-label">{m.label}</div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* ===================== 01 · EQUIPAMIENTO ===================== */}
      <section className="iv-tech-section" id="equipamiento">
        <div className="iv-feature-row">
          <RevealOnScroll className="iv-feature-media">
            <span className="iv-tag">Equipos en oficina</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/inventori/feat-smart.jpg"
              alt="Equipos multifunción Inventori instalados en oficina con monitoreo de uso."
              loading="lazy"
            />
          </RevealOnScroll>
          <RevealOnScroll className="iv-feature-body">
            <span className="iv-section-label">
              <span className="iv-num">01</span> Equipamiento
            </span>
            <h2 className="iv-section-title">
              Equipos modernos,{" "}
              <span className="iv-accent">servicio cercano</span>
            </h2>
            <p className="iv-section-lead" style={{ marginBottom: 0 }}>
              Te ayudamos a elegir, instalar y mantener tu impresora o
              fotocopiadora. Asesoría con criterio técnico y atención
              personalizada cuando la necesites.
            </p>
            <div className="iv-feat-list">
              {EQUIPAMIENTO_FEATURES.map((f) => (
                <div key={f.title} className="iv-feat-item">
                  <span className="iv-feat-icon">
                    <IvIcon name={f.icon} size={20} stroke={2} />
                  </span>
                  <div className="iv-feat-text">
                    <h4>{f.title}</h4>
                    <p>{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============================ 02 · EQUIPOS ============================ */}
      <section className="iv-tech-section-alt" id="equipos">
        <div className="iv-tech-inner">
          <RevealOnScroll>
            <span className="iv-section-label">
              <span className="iv-num">02</span> Equipos
            </span>
            <h2 className="iv-section-title">
              Toda la línea, un solo{" "}
              <span className="iv-accent">proveedor</span>
            </h2>
            <p className="iv-section-lead">
              Multifuncionales, impresoras de oficina, escáneres y consumibles
              originales. Asesoría técnica para que elijas con criterio.
            </p>
          </RevealOnScroll>

          <RevealOnScroll>
            <InfiniteMarquee items={EQUIPOS} speed={45} />
          </RevealOnScroll>

          <RevealOnScroll className="mt-[72px] block">
            <div className="iv-feature-row iv-reverse">
              <div className="iv-feature-media">
                <span className="iv-tag">Consumibles</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/inventori/feat-consumables.jpg"
                  alt="Tóners y consumibles originales Konica Minolta y Canon en stock."
                  loading="lazy"
                />
              </div>
              <div className="iv-feature-body">
                <h3
                  className="iv-section-title"
                  style={{ fontSize: "clamp(28px,3vw,40px)", marginBottom: 16 }}
                >
                  Consumibles originales,{" "}
                  <span className="iv-accent">a tu mano</span>
                </h3>
                <p className="iv-section-lead" style={{ marginBottom: 0 }}>
                  Tóners, drums y fusores originales en stock para los equipos
                  que vendemos. Compatibilidad garantizada y precios justos.
                </p>
                <div className="iv-feat-list">
                  {CONSUMIBLES_FEATURES.map((f) => (
                    <div key={f.title} className="iv-feat-item">
                      <span className="iv-feat-icon">
                        <IvIcon name={f.icon} size={20} stroke={2} />
                      </span>
                      <div className="iv-feat-text">
                        <h4>{f.title}</h4>
                        <p>{f.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============================ 03 · SOPORTE ============================ */}
      <section className="iv-tech-section" id="soporte">
        <RevealOnScroll>
          <span className="iv-section-label">
            <span className="iv-num">03</span> Soporte
          </span>
          <h2 className="iv-section-title">
            Técnicos cercanos,{" "}
            <span className="iv-accent">atención profesional</span>
          </h2>
          <p className="iv-section-lead">
            Llámanos o escríbenos cuando tu equipo necesite atención.
            Coordinamos visita técnica con repuestos originales y experiencia
            en Konica Minolta y Canon.
          </p>
        </RevealOnScroll>

        <div className="iv-feature-row" style={{ marginBottom: 16 }}>
          <RevealOnScroll className="iv-feature-media">
            <span className="iv-tag">Servicio técnico</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/inventori/feat-service.jpg"
              alt="Técnico Inventori realizando mantenimiento sobre un equipo multifunción."
              loading="lazy"
            />
          </RevealOnScroll>
          <RevealOnScroll className="iv-feature-body">
            <div className="iv-feat-list" style={{ marginTop: 0 }}>
              {SOPORTE_FEATURES.map((f) => (
                <div key={f.title} className="iv-feat-item">
                  <span className="iv-feat-icon">
                    <IvIcon name={f.icon} size={20} stroke={2} />
                  </span>
                  <div className="iv-feat-text">
                    <h4>{f.title}</h4>
                    <p>{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>

        <div className="iv-process">
          {STEPS.map((s) => (
            <RevealOnScroll key={s.num} className="iv-step">
              <div className="iv-step-num">{s.num}</div>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* ======================== MARCAS (brand marquee) ======================== */}
      <BrandMarquee />

      {/* ============================ FINAL CTA ============================ */}
      <section className="iv-tech-section" id="contacto">
        <RevealOnScroll>
          <div className="iv-cta-block">
            <div>
              <span className="iv-section-label">
                <span className="iv-num">→</span> Próximo paso
              </span>
              <h2>
                Hablemos de tu <span className="iv-accent">equipo</span>
              </h2>
              <p>
                {branding.content.contactDescription ||
                  "Cuéntanos qué necesitas y te recomendamos el equipo o servicio que mejor se ajusta a tu oficina."}
              </p>
              <div className="iv-cta-row" style={{ marginTop: 0 }}>
                {branding.contact.whatsapp ? (
                  <a
                    href={`https://wa.me/${branding.contact.whatsapp.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="iv-cta-primary"
                  >
                    Escribir por WhatsApp
                    <IvIcon name="arrow" size={16} stroke={2.2} />
                  </a>
                ) : (
                  <Link href="/contacto" className="iv-cta-primary">
                    Solicitar contacto
                    <IvIcon name="arrow" size={16} stroke={2.2} />
                  </Link>
                )}
                {ctaPhone ? (
                  <a href={phoneHref} className="iv-cta-secondary">
                    <IvIcon name="phone" size={14} stroke={2.2} />
                    {ctaPhone}
                  </a>
                ) : null}
              </div>
            </div>
            <ContactQuickForm
              whatsapp={branding.contact.whatsapp}
              fallbackEmail={
                branding.contact.salesEmail ??
                branding.contact.primaryEmail ??
                branding.contact.email
              }
            />
          </div>
        </RevealOnScroll>
      </section>

      {/* ============================ UBICACIÓN ============================ */}
      <section className="iv-tech-section" id="ubicacion">
        <RevealOnScroll>
          <span className="iv-section-label">
            <span className="iv-num">04</span> Ubicación
          </span>
          <h2 className="iv-section-title">
            Visítanos en <span className="iv-accent">Puno</span>
          </h2>
          <p className="iv-section-lead">
            Nuestra oficina está en Puno, Perú. Te atendemos en horario
            comercial. Si vienes desde fuera, coordina visita previa por
            WhatsApp.
          </p>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="iv-location">
            <div className="iv-location-info">
              {branding.contact.address ? (
                <div className="iv-location-item">
                  <span className="iv-feat-icon">
                    <IvIcon name="store" size={20} stroke={2} />
                  </span>
                  <div>
                    <h4>Dirección</h4>
                    <p>{branding.contact.address}</p>
                  </div>
                </div>
              ) : null}
              {ctaPhone ? (
                <div className="iv-location-item">
                  <span className="iv-feat-icon">
                    <IvIcon name="phone" size={20} stroke={2} />
                  </span>
                  <div>
                    <h4>Teléfono</h4>
                    <p>
                      <a href={phoneHref}>{ctaPhone}</a>
                    </p>
                  </div>
                </div>
              ) : null}
              {branding.contact.whatsapp ? (
                <div className="iv-location-item">
                  <span className="iv-feat-icon">
                    <IvIcon name="send" size={20} stroke={2} />
                  </span>
                  <div>
                    <h4>WhatsApp</h4>
                    <p>
                      <a
                        href={`https://wa.me/${branding.contact.whatsapp.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {branding.contact.whatsapp}
                      </a>
                    </p>
                  </div>
                </div>
              ) : null}
              {branding.contact.primaryEmail ? (
                <div className="iv-location-item">
                  <span className="iv-feat-icon">
                    <IvIcon name="mail" size={20} stroke={2} />
                  </span>
                  <div>
                    <h4>Email</h4>
                    <p>
                      <a href={`mailto:${branding.contact.primaryEmail}`}>
                        {branding.contact.primaryEmail}
                      </a>
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="iv-location-item">
                <span className="iv-feat-icon">
                  <IvIcon name="calendar" size={20} stroke={2} />
                </span>
                <div>
                  <h4>Horario de atención</h4>
                  <p>Lunes a Viernes · 9:00 – 18:00</p>
                  <p>Sábados · 9:00 – 13:00</p>
                </div>
              </div>
            </div>

            <div className="iv-location-map">
              <iframe
                title="Mapa de ubicación"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  branding.contact.address ?? "Puno, Perú",
                )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </>
  );
}
