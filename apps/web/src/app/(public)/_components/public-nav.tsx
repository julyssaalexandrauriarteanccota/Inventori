"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { IvIcon } from "@/components/iv";

import { PublicMobileNav } from "./public-mobile-nav";
import { PublicThemeToggle } from "./public-theme-toggle";

type NavLink = { href: string; label: string };

type Props = {
  brandName: string;
  links: NavLink[];
  whatsapp?: string | null;
  phone?: string | null;
};

export function PublicNav({ brandName, links, whatsapp, phone }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`iv-nav${scrolled ? " iv-scrolled" : ""}`}
      aria-label="Navegación principal"
    >
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-4 md:grid-cols-3">
        <Link
          href="/"
          className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded-full"
          aria-label={`${brandName} · Inicio`}
        >
          <IvIcon name="logo" size={32} />
          <span
            className="hidden sm:inline"
            style={{
              fontFamily: "var(--iv-font-display)",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>I</span>
            {brandName.replace(/^./, "").toLowerCase() === "nventori"
              ? "nventori"
              : brandName.slice(1)}
          </span>
        </Link>

        <ul className="hidden items-center justify-center gap-2 md:flex lg:gap-6">
          {links.map((link) => (
            <li key={`${link.label}-${link.href}`}>
              <Link href={link.href} className="iv-nav-link">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2 md:gap-3">
          <PublicThemeToggle />
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="iv-pill-cta hidden sm:inline-flex"
              aria-label="WhatsApp"
            >
              <IvIcon name="phone" size={14} stroke={2.2} />
              WhatsApp
            </a>
          ) : phone ? (
            <a
              href={`tel:${phone.replace(/[^+\d]/g, "")}`}
              className="iv-pill-cta hidden sm:inline-flex"
              aria-label={`Llamar a ${phone}`}
            >
              <IvIcon name="phone" size={14} stroke={2.2} />
              Llamar
            </a>
          ) : (
            <Link href="/#contacto" className="iv-pill-cta hidden sm:inline-flex">
              Contactar
            </Link>
          )}
          <Link
            href="/auth/login"
            className="iv-icon-btn"
            aria-label="Acceso interno (staff)"
            title="Acceso interno · Iniciar sesión"
          >
            <IvIcon name="user" size={18} />
          </Link>
          <PublicMobileNav links={links} />
        </div>
      </div>
    </nav>
  );
}
