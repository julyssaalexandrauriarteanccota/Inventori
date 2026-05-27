"use client";

import * as React from "react";
import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { useAtmosphere, type AtmosphereValue } from "@/lib/atmosphere";
import { cn } from "@/lib/utils";

type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  description: string;
  icon: LucideIcon;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Claro",
    description: "Interfaz luminosa para entornos bien iluminados",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Mejor contraste para sesiones largas o poca luz",
    icon: Moon,
  },
  {
    value: "system",
    label: "Sistema",
    description: "Sigue la preferencia del sistema operativo",
    icon: Monitor,
  },
];

type AtmosphereMeta = {
  value: AtmosphereValue;
  label: string;
  description: string;
  preview: { base: string; accent: string };
  fontVar: string;
  fontLabel: string;
};

const ATMOSPHERE_OPTIONS: AtmosphereMeta[] = [
  {
    value: "industrial",
    label: "Industrial",
    description:
      "Gris neutro nítido y acento azul. Inter + Playfair Display. Máxima claridad para reporte formal.",
    preview: { base: "oklch(0.975 0 0)", accent: "oklch(0.60 0.25 250)" },
    fontVar: "var(--font-playfair)",
    fontLabel: "Aa",
  },
  {
    value: "tecnologica",
    label: "Tecnológica",
    description:
      "Gris frío matizado y acento jade. IBM Plex + Montserrat. Look técnico para uso prolongado.",
    preview: { base: "oklch(0.965 0.006 185)", accent: "oklch(0.58 0.15 185)" },
    fontVar: "var(--font-montserrat)",
    fontLabel: "Aa",
  },
  {
    value: "comercial",
    label: "Comercial",
    description:
      "Fondo cálido cream y acento naranja. Poppins + Bricolage. Suave y acogedor para POS.",
    preview: { base: "oklch(0.955 0.018 35)", accent: "oklch(0.65 0.22 45)" },
    fontVar: "var(--font-bricolage)",
    fontLabel: "Aa",
  },
];

export function PreferenciasSettingsContent() {
  const { theme, setTheme } = useTheme();
  const { atmosphere, setAtmosphere } = useAtmosphere();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const currentTheme = mounted ? (theme ?? "system") : "system";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preferencias</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajustes personales de apariencia e interfaz
        </p>
      </div>

      {/* Tema */}
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Tema</h3>
          <p className="text-xs text-muted-foreground">
            Cambia entre claro, oscuro o sigue tu sistema
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Tema de la interfaz"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = currentTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "group/theme flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                  selected
                    ? "border-(--sidebar-primary) bg-(--sidebar-primary)/10 shadow-sm"
                    : "border-border/70 bg-muted/20 hover:border-border hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg transition-colors",
                    selected
                      ? "bg-(--sidebar-primary) text-(--sidebar-primary-foreground) shadow-sm shadow-[var(--sidebar-primary)]/25 dark:shadow-none"
                      : "bg-background text-muted-foreground group-hover/theme:text-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.85} />
                </span>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      selected ? "text-foreground" : "text-foreground/90",
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Atmósfera de trabajo */}
      <section className="flex flex-col gap-3 border-t border-border/70 pt-5">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Atmósfera de trabajo
          </h3>
          <p className="text-xs text-muted-foreground">
            Determina el fondo, contraste y color de acento de tu entorno
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Atmósfera de trabajo"
          className="grid grid-cols-1 gap-3"
        >
          {ATMOSPHERE_OPTIONS.map((option) => {
            const selected = mounted && atmosphere === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setAtmosphere(option.value)}
                className={cn(
                  "group/atmosphere flex items-center gap-4 rounded-xl border p-3.5 text-left transition-colors",
                  selected
                    ? "border-(--sidebar-primary) bg-(--sidebar-primary)/10 shadow-sm"
                    : "border-border/70 bg-muted/20 hover:border-border hover:bg-muted/40",
                )}
              >
                <span
                  className="relative flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 shadow-sm"
                  style={{ backgroundColor: option.preview.base }}
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-full text-[13px] font-semibold leading-none text-white ring-1 ring-black/10 shadow-sm"
                    style={{
                      backgroundColor: option.preview.accent,
                      fontFamily: option.fontVar,
                    }}
                  >
                    {option.fontLabel}
                  </span>
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      selected ? "text-foreground" : "text-foreground/90",
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground leading-normal">
                    {option.description}
                  </span>
                </div>
                {selected ? (
                  <Check
                    className="size-5 text-(--sidebar-primary) shrink-0"
                    strokeWidth={3}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Más opciones */}
      <section className="flex flex-col gap-3 border-t border-border/70 pt-5">
        <div>
          <h3 className="text-sm font-medium text-foreground">Más opciones</h3>
          <p className="text-xs text-muted-foreground">Próximamente</p>
        </div>
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-4 text-xs text-muted-foreground">
          Densidad, idioma y atajos de teclado estarán disponibles en una
          próxima versión.
        </div>
      </section>
    </div>
  );
}
