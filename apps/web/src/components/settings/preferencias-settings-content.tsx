"use client";

import * as React from "react";
import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { ACCENT_VALUES, useAccent, type AccentValue } from "@/lib/accent";
import { useTone, type ToneValue } from "@/lib/tone";
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

type AccentMeta = {
  value: AccentValue;
  label: string;
  /** Swatch para tono "muted" (paleta opaca actual). */
  swatch: string;
  /** Swatch para tono "warm" (paleta calida estilo POS). */
  swatchWarm: string;
};

const ACCENT_OPTIONS: AccentMeta[] = [
  {
    value: "default",
    label: "Naranja",
    swatch: "oklch(0.66 0.17 48)",
    swatchWarm: "oklch(0.7 0.19 55)",
  },
  {
    value: "blue",
    label: "Azul",
    swatch: "oklch(0.58 0.17 250)",
    swatchWarm: "oklch(0.62 0.18 245)",
  },
  {
    value: "green",
    label: "Verde",
    swatch: "oklch(0.6 0.16 150)",
    swatchWarm: "oklch(0.64 0.18 145)",
  },
  {
    value: "violet",
    label: "Violeta",
    swatch: "oklch(0.58 0.2 295)",
    swatchWarm: "oklch(0.62 0.2 295)",
  },
  {
    value: "rose",
    label: "Rosa",
    swatch: "oklch(0.62 0.19 15)",
    swatchWarm: "oklch(0.66 0.21 18)",
  },
  {
    value: "slate",
    label: "Gris",
    swatch: "oklch(0.45 0.03 260)",
    swatchWarm: "oklch(0.5 0.06 60)",
  },
];

type ToneMeta = {
  value: ToneValue;
  label: string;
  description: string;
  /** Vista previa: dos circulos representando neutro y acento. */
  preview: { base: string; accent: string };
};

const TONE_OPTIONS: ToneMeta[] = [
  {
    value: "muted",
    label: "Opaco",
    description: "Paleta sobria con neutros sin tinte",
    preview: { base: "oklch(0.97 0 0)", accent: "oklch(0.62 0.14 52)" },
  },
  {
    value: "warm",
    label: "Calido",
    description: "Fondos y bordes tintados, acento mas vibrante (estilo POS)",
    preview: { base: "oklch(0.985 0.025 80)", accent: "oklch(0.7 0.19 55)" },
  },
];

if (process.env.NODE_ENV !== "production") {
  const declared = new Set(ACCENT_OPTIONS.map((a) => a.value));
  for (const v of ACCENT_VALUES) {
    if (!declared.has(v)) {
      console.warn(`[Preferencias] Falta swatch para accent: ${v}`);
    }
  }
}

export function PreferenciasSettingsContent() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const { tone, setTone } = useTone();
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
                    ? "border-(--sidebar-primary)/60 bg-(--sidebar-primary)/8"
                    : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg transition-colors",
                    selected
                      ? "bg-(--sidebar-primary)/15 text-(--sidebar-primary)"
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

      <section className="flex flex-col gap-3 border-t border-border/40 pt-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Tono</h3>
          <p className="text-xs text-muted-foreground">
            Elige entre paleta opaca o calida (la calida tinta fondos y bordes)
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Tono de la paleta"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {TONE_OPTIONS.map((option) => {
            const selected = mounted && tone === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTone(option.value)}
                className={cn(
                  "group/tone flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  selected
                    ? "border-(--sidebar-primary)/60 bg-(--sidebar-primary)/8"
                    : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40",
                )}
              >
                <span
                  className="relative flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/5"
                  style={{ backgroundColor: option.preview.base }}
                >
                  <span
                    className="size-5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: option.preview.accent }}
                  />
                </span>
                <div className="flex flex-1 flex-col">
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
                {selected ? (
                  <Check
                    className="size-4 text-(--sidebar-primary)"
                    strokeWidth={3}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border/40 pt-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Color de acento
          </h3>
          <p className="text-xs text-muted-foreground">
            Define el color de resaltado, botones y elementos activos
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Color de acento"
          className="grid grid-cols-3 gap-2 sm:grid-cols-6"
        >
          {ACCENT_OPTIONS.map((option) => {
            const selected = mounted && accent === option.value;
            const swatch =
              mounted && tone === "warm" ? option.swatchWarm : option.swatch;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                title={option.label}
                onClick={() => setAccent(option.value)}
                className={cn(
                  "group/accent flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-colors",
                  selected
                    ? "border-foreground/30 bg-muted/30"
                    : "border-border/40 bg-muted/10 hover:border-border hover:bg-muted/30",
                )}
              >
                <span
                  className="relative flex size-9 items-center justify-center rounded-full shadow-inner ring-1 ring-black/5"
                  style={{ backgroundColor: swatch }}
                >
                  {selected && (
                    <Check
                      className="size-4 text-white drop-shadow"
                      strokeWidth={3}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    selected ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border/40 pt-4">
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
