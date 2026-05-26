"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
  wrap,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Brand wordmark SVGs ─── */
/* Using styled text with proper typography to represent each brand.
   These are NOT official logos — they are typographic representations
   used as placeholders. Replace with actual brand SVG assets if available. */

function CanonWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 32" className={className} aria-label="Canon">
      <text
        x="70" y="25" textAnchor="middle"
        fontFamily="var(--iv-font-display), 'Helvetica Neue', sans-serif"
        fontWeight="800" fontSize="30" letterSpacing="-0.02em"
        fill="currentColor"
      >Canon</text>
    </svg>
  );
}

function RicohWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 32" className={className} aria-label="Ricoh">
      <text
        x="70" y="25" textAnchor="middle"
        fontFamily="var(--iv-font-display), 'Helvetica Neue', sans-serif"
        fontWeight="800" fontSize="28" letterSpacing="0.06em"
        fill="currentColor"
      >RICOH</text>
    </svg>
  );
}

function KonicaMinoltaWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 32" className={className} aria-label="Konica Minolta">
      <text
        x="130" y="25" textAnchor="middle"
        fontFamily="var(--iv-font-display), 'Helvetica Neue', sans-serif"
        fontWeight="700" fontSize="24" letterSpacing="0.04em"
        fill="currentColor"
      >KONICA MINOLTA</text>
    </svg>
  );
}

function EpsonWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 32" className={className} aria-label="Epson">
      <text
        x="70" y="25" textAnchor="middle"
        fontFamily="var(--iv-font-display), 'Helvetica Neue', sans-serif"
        fontWeight="800" fontSize="28" letterSpacing="0.08em"
        fill="currentColor"
      >EPSON</text>
    </svg>
  );
}

function KyoceraWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 32" className={className} aria-label="Kyocera">
      <text
        x="90" y="25" textAnchor="middle"
        fontFamily="var(--iv-font-display), 'Helvetica Neue', sans-serif"
        fontWeight="800" fontSize="28" letterSpacing="0.06em"
        fill="currentColor"
      >KYOCERA</text>
    </svg>
  );
}

function BrotherWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 32" className={className} aria-label="Brother">
      <text
        x="80" y="25" textAnchor="middle"
        fontFamily="var(--iv-font-display), 'Helvetica Neue', sans-serif"
        fontWeight="700" fontSize="28" letterSpacing="0.02em"
        fill="currentColor"
      >brother</text>
    </svg>
  );
}

/* ─── Brand data ─── */
type Brand = {
  name: string;
  tagline: string;
  Wordmark: React.ComponentType<{ className?: string }>;
};

const BRANDS: Brand[] = [
  { name: "Canon", tagline: "Soluciones de imagen", Wordmark: CanonWordmark },
  { name: "Ricoh", tagline: "Tecnología inteligente", Wordmark: RicohWordmark },
  { name: "Konica Minolta", tagline: "Innovación en impresión", Wordmark: KonicaMinoltaWordmark },
  { name: "Epson", tagline: "Precisión confiable", Wordmark: EpsonWordmark },
  { name: "Kyocera", tagline: "Rendimiento duradero", Wordmark: KyoceraWordmark },
  { name: "Brother", tagline: "Productividad de oficina", Wordmark: BrotherWordmark },
];

/**
 * Brand marquee using Framer Motion's useAnimationFrame.
 * Moves in REVERSE direction (right → left visually = positive offset),
 * which is the opposite of the product marquee above.
 * Slim, elegant pill-style cards with hover lift.
 */
export function BrandMarquee() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const baseX = useMotionValue(0);
  const speedRef = useRef(35); // px/sec — reverse direction

  const assignRef = useCallback((el: HTMLDivElement | null) => {
    wrapperRef.current = el;
  }, []);

  // Visibility observer
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Animation loop via Framer Motion
  useAnimationFrame((_, delta) => {
    if (!isVisible || isPaused) return;
    // Move in the POSITIVE direction (right → left visual)
    const moveBy = (speedRef.current * delta) / 1000;
    baseX.set(baseX.get() + moveBy);
  });

  // We need the track width to wrap. Each brand pill is ~240px + 20px gap
  // With 6 brands = ~1560px per set. We render 3 sets.
  // Wrap at 1/3 of total (~1560px)
  const wrapWidth = BRANDS.length * 260; // approximate
  const x = useTransform(baseX, (v) => {
    const wrapped = wrap(0, wrapWidth, v);
    return -wrapped;
  });

  // Triplicate brands for seamless wrap
  const allBrands = [...BRANDS, ...BRANDS, ...BRANDS];

  return (
    <section className="iv-brand-section" ref={assignRef}>
      <div className="iv-brand-header">
        <span className="iv-section-label">
          <span className="iv-num">★</span> Marcas
        </span>
        <h3 className="iv-brand-title">
          Trabajamos con las marcas{" "}
          <span className="iv-accent">líderes</span>
        </h3>
        <p className="iv-brand-subtitle">
          Distribuidor autorizado de equipos, repuestos y consumibles originales.
        </p>
      </div>

      <div
        className="iv-brand-marquee"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <motion.div className="iv-brand-track" style={{ x }}>
          {allBrands.map((brand, i) => (
            <motion.div
              key={`${brand.name}-${i}`}
              className="iv-brand-pill"
              whileHover={{
                scale: 1.06,
                y: -4,
                transition: { duration: 0.2, ease: "easeOut" },
              }}
              aria-hidden={i >= BRANDS.length ? true : undefined}
            >
              <brand.Wordmark className="iv-brand-wordmark" />
              <span className="iv-brand-tagline">{brand.tagline}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
