# 🗺️ Sistema de Atmósferas: Las 3 Identidades Visuales del ERP

Este documento define el **sistema de tematización** del ERP Inventori. Reemplaza el sistema anterior de 6 colores de acento + tonos de fondo separados por un modelo unificado de **3 atmósferas** que empaquetan en una sola decisión coherente:

- la **claridad** (luminosidad base) del fondo en modo claro y oscuro,
- la **calidez** de los grises (chroma + hue),
- el **color de acento** y todas sus variantes (soft, hover, texto),
- la **pareja tipográfica** (sans para UI + display para títulos),
- la **personalidad** general de la interfaz.

Una atmósfera no es solo un color — es un entorno visual completo que se aplica en bloque al ERP.

> [!IMPORTANT]
> Este documento es la **fuente de verdad** para la implementación del sistema de atmósferas. Toda la lógica de tematización del ERP debe derivar de estas 3 atmósferas. El sistema anterior de 6 acentos + tonos independientes está obsoleto y eliminado del código.

> [!NOTE]
> Para los fundamentos teóricos de color (regla 60-30-10, OKLCH, capas de luminosidad), consulta [colores.md](colores.md). Para el catálogo completo de fuentes y sus parejas, consulta [tipografias.md](tipografias.md).

---

## 🎯 Por Qué Reducir a 3 Atmósferas

### El Problema que se Resolvió

El sistema anterior ofrecía 6 colores de acento y múltiples tonos de fondo que el usuario podía combinar libremente. Esto generaba:

*   **Combinaciones rotas:** Un acento naranja sobre un fondo frío azulado viola los contrastes WCAG y se ve disonante.
*   **Caos de opacidad:** Cada combinación necesitaba ajustes manuales de opacidad, bordes y sombras para verse bien, multiplicando la complejidad del CSS.
*   **Modo oscuro impredecible:** Un color que funcionaba en modo claro sobre fondo cálido podía ser ilegible en modo oscuro sobre fondo frío.
*   **Fatiga de decisión:** Demasiadas opciones sin guía hacían que el usuario eligiera combinaciones genéricas o incoherentes.

### La Solución: Atmósferas Integradas

En lugar de dos controles separados ("Tono de fondo" y "Color de acento"), el panel de ajustes unifica todo en un **único selector de Atmósfera de Trabajo**. Cada atmósfera configura automáticamente:

1.  La **claridad base** del fondo en modo claro (`--bg-l`) y modo oscuro (`--bg-l-dark`). Cada atmósfera elige una luminosidad distinta para reforzar su personalidad: Industrial es la más clara/contrastada, Tecnológica la más matizada, Comercial la más cálida y suave.
2.  El **grado de calidez** de los grises del fondo (`--bg-chroma` + `--bg-hue`).
3.  El **color de acento** y sus variantes `soft` / `hover` / texto sobre acento, que armonizan naturalmente con ese fondo.
4.  La **pareja tipográfica** sans + display que refuerza la personalidad de la atmósfera (ver tabla por atmósfera más abajo).
5.  Los **valores OKLCH descompuestos** (`--accent-l`, `--accent-chroma`, `--accent-hue`) que permiten que el modo oscuro **aclare la luminosidad y desature el chroma** sin que el operador tenga que redefinir cada color.
6.  La **adaptación automática** de fondos, bordes, texto y `*-soft` semánticos cuando cambia el modo claro/oscuro: solo cambia la luminosidad relativa, no la identidad.

---

## 🏢 Atmósfera 1 — Industrial (Opaco / Neutro)

| Propiedad | Valor |
| :--- | :--- |
| **Claridad en modo claro** | `--bg-l: 0.975` — **la más alta** de las tres (fondo casi blanco, máximo contraste) |
| **Claridad en modo oscuro** | `--bg-l-dark: 0.055` — **la más profunda** de las tres (negro casi puro) |
| **Grado de calidez** | Gris neutro matemático puro (sin tinte azul ni amarillo) |
| **Chroma del fondo** | `0` (acromático total) |
| **Hue del fondo** | `0` (sin dirección de tono) |
| **Color de acento** | Azul Eléctrico Corporativo — `oklch(0.60 0.25 250)` |
| **Fuente UI (sans)** | **Inter** — palo seco optimizado para pantalla |
| **Fuente títulos (display)** | **Playfair Display** — serif editorial de alto contraste |
| **Pareja editorial** | Corporativo / Premium (ver [tipografias.md](tipografias.md)) |
| **Personalidad** | Frío, directo, alto contraste, cero distracciones |

### Para Qué Sirve

Es el look clásico del software empresarial. Fondos grises puros, texto negro nítido, acento azul institucional. Ideal para:
*   Impresión de reportes y documentos fiscales.
*   Administración pura y módulos de auditoría.
*   Usuarios que prefieren la máxima neutralidad y formalidad.

---

## 🌌 Atmósfera 2 — Tecnológica (Slate / Frío)

| Propiedad | Valor |
| :--- | :--- |
| **Claridad en modo claro** | `--bg-l: 0.965` — **la más matizada** en claro (gris frío sutil alineado al acento jade) |
| **Claridad en modo oscuro** | `--bg-l-dark: 0.075` — slate profundo con tono frío |
| **Grado de calidez** | Gris frío con tinte sutil jade/azulado |
| **Chroma del fondo** | `0.006` (chroma bajo, matiz frío perceptible) |
| **Hue del fondo** | `185` (base jade/fría) |
| **Color de acento** | Jade Green — `oklch(0.58 0.15 185)` |
| **Fuente UI (sans)** | **IBM Plex Sans** — corporativa con detalle industrial |
| **Fuente títulos (display)** | **Montserrat** — geométrica robusta moderna |
| **Pareja editorial** | Tecnológico / Moderno (ver [tipografias.md](tipografias.md)) |
| **Personalidad** | Sofisticado, premium, tecnológico moderno |

### Para Qué Sirve

Es el look premium por excelencia del software moderno (Linear, Vercel, Raycast). Reduce drásticamente la fatiga visual en entornos oscuros (Modo Oscuro). Ideal para:
*   Uso prolongado en pantallas durante jornadas completas.
*   Dashboards de análisis y módulos técnicos.
*   Usuarios que trabajan con las luces apagadas o en entornos de baja iluminación.

---

## ☀️ Atmósfera 3 — Comercial (Cálido / Orgánico)

| Propiedad | Valor |
| :--- | :--- |
| **Claridad en modo claro** | `--bg-l: 0.955` — cream suave (entre Industrial y Tecnológica, sin reflejos duros bajo luz fluorescente) |
| **Claridad en modo oscuro** | `--bg-l-dark: 0.085` — oscuro cálido (resistente a fatiga) |
| **Grado de calidez** | Gris enriquecido con matiz ámbar/arena confortable |
| **Chroma del fondo** | `0.018` (chroma bajo-medio, calidez perceptible) |
| **Hue del fondo** | `35` (base ámbar/cálida) |
| **Color de acento** | Naranja Quemado — `oklch(0.65 0.22 45)` |
| **Fuente UI (sans)** | **Poppins** — geometría pura y amigable |
| **Fuente títulos (display)** | **Bricolage Grotesque** — curvas expresivas y cercanas |
| **Pareja editorial** | Creativo / Cercano (ver [tipografias.md](tipografias.md)) |
| **Personalidad** | Cálido, orgánico, acogedor, resistente a fatiga |

### Para Qué Sirve

Diseñada para pantallas de atención al cliente locales o tablets de almacén. La calidez del fondo amortigua la luz fluorescente de las oficinas, haciendo que sea muy cómodo de leer durante jornadas largas de día. Ideal para:
*   Punto de venta (POS) y mostrador de atención.
*   Tablets y dispositivos de almacén con luz artificial.
*   Usuarios que trabajan de día con iluminación fluorescente directa.

---

## 🔆 Comparativa de Claridad

Esta tabla muestra cómo cambia la luminosidad base de los fondos entre las 3 atmósferas. Las diferencias son sutiles (2-4 puntos OKLCH) pero perceptibles: cambian la "personalidad" sin romper la consistencia general.

| Atmósfera | Claro `--bg-l` | Oscuro `--bg-l-dark` | Sensación |
| :--- | :---: | :---: | :--- |
| **Industrial** | `0.975` | `0.055` | Máxima nitidez, alto contraste, "papel limpio" / "negro profundo" |
| **Tecnológica** | `0.965` | `0.075` | Premium matizado, no quema en pantallas grandes, ideal para sesiones largas |
| **Comercial** | `0.955` | `0.085` | Cálido y suave, resistente a fatiga, acogedor bajo luz fluorescente |

> [!NOTE]
> Las luminosidades de **bordes**, **texto** y **colores semánticos base** (verde, rojo, etc.) **no cambian** entre atmósferas para preservar contrastes WCAG. Solo cambia el fondo + las superficies derivadas (`bg-surface`, `bg-elevated`, `app-muted`) y los colores de acento de cada atmósfera.

---

## 🔒🚨 Regla Inmutable: Los Colores Semánticos No Cambian

> [!CAUTION]
> Al empaquetar el diseño en estas 3 atmósferas, los colores semánticos son **sagrados e intocables**. No importa qué atmósfera elija el usuario:

| Semántica | Color | Nunca Cambia |
| :--- | :--- | :--- |
| **Éxito** | Verde | Una venta finalizada **siempre** es verde |
| **Peligro / Error** | Rojo | Una anulación o error **siempre** es rojo |
| **Advertencia** | Amarillo/Ámbar | Un aviso de plazo próximo **siempre** es amarillo |
| **Información** | Azul | Un tooltip informativo **siempre** es azul |

Esto respeta la **Ley de Jakob** (documentada en [leyes-ux.md](leyes-ux.md)): los usuarios esperan que verde = éxito y rojo = peligro en cualquier aplicación. Violar esta convención en un ERP genera errores operativos críticos.

> [!NOTE]
> El **hue** y la luminosidad base de cada color semántico **no cambian** entre atmósferas. Lo único que se adapta es la variante `*-soft` (el fondo tenue del estado): en modo claro es muy alta (≈`0.92`) y en modo oscuro baja a una mancha tintada profunda (≈`0.18 0.05`) para mantener legibilidad y proporción. Esto se hace para que un badge de éxito no se vea como un cuadro blanco brillante en modo oscuro.

---

## 🎯 Alcance: Atmósferas Solo Aplican al ERP

> [!IMPORTANT]
> El sistema de atmósferas **solo se aplica al ERP interno** (rutas bajo `(erp)` en Next.js). El sitio público (rutas bajo `(public)`: landing, catálogo, garantía, ticket, contacto) usa una identidad visual propia bajo el namespace `.iv` con sus propios tokens (`--accent`, `--ink`, `--bg`, etc.) que **no heredan** de `data-atmosphere`.

Esto es intencional:

*   **El ERP es una herramienta de trabajo** y debe adaptarse al gusto y contexto del operador → atmósfera configurable.
*   **El sitio público es marca** y debe mantener una identidad estable, reconocible y consistente con el branding configurado por el cliente → paleta fija.

Si necesitas tematizar el sitio público, hazlo a través de la configuración de branding (`/configuracion/empresa`) y no de las atmósferas.

---

## 💻 Implementación en CSS — Variables Nativas

La complejidad se reduce radicalmente. Solo necesitas inyectar un atributo `data-atmosphere` en `<html>` (o en el contenedor raíz del ERP). El modo claro/oscuro se controla por separado con `class="dark"` (next-themes) y la atmósfera funciona con cualquiera de los dos.

### Definición de Atmósferas

Cada atmósfera publica las variables OKLCH **descompuestas** (`--accent-l`, `--accent-chroma`, `--accent-hue`) para que el modo oscuro pueda reconstruir el acento con menor saturación y mayor luminosidad sin que hagas nada manualmente:

```css
/* ═══════════════════════════════════════════════════════
   ATMÓSFERAS — Variables raíz por identidad visual
   ═══════════════════════════════════════════════════════ */

/* 🏢 INDUSTRIAL */
:root[data-atmosphere="industrial"] {
    --bg-chroma: 0;
    --bg-hue: 0;
    --bg-l: 0.975;
    --bg-l-dark: 0.055;
    --accent-hue: 250;
    --accent-chroma: 0.25;
    --accent-l: 0.6;
    --accent: hsl(212 95% 50%);
    --accent-soft: hsl(212 100% 96%);
    --accent-border: hsl(212 92% 84%);
    --accent-on-soft: hsl(212 92% 38%);
    --accent-hover: hsl(212 95% 44%);
    --accent-text: oklch(0.98 0 0);
    --app-font-sans: var(--font-inter);
    --app-font-display: var(--font-playfair);
}

/* 🌌 TECNOLÓGICA */
:root[data-atmosphere="tecnologica"] {
    --bg-chroma: 0.006;
    --bg-hue: 185;
    --bg-l: 0.965;
    --bg-l-dark: 0.075;
    --accent-hue: 185;
    --accent-chroma: 0.15;
    --accent-l: 0.58;
    --accent: hsl(174 72% 36%);
    --accent-soft: hsl(174 68% 94%);
    --accent-border: hsl(174 52% 76%);
    --accent-on-soft: hsl(174 82% 25%);
    --accent-hover: hsl(174 76% 31%);
    --accent-text: oklch(0.98 0 0);
    --app-font-sans: var(--font-ibm-plex);
    --app-font-display: var(--font-montserrat);
}

/* ☀️ COMERCIAL */
:root[data-atmosphere="comercial"] {
    --bg-chroma: 0.018;
    --bg-hue: 35;
    --bg-l: 0.955;
    --bg-l-dark: 0.085;
    --accent-hue: 45;
    --accent-chroma: 0.22;
    --accent-l: 0.65;
    --accent: hsl(22 95% 52%);
    --accent-soft: hsl(24 100% 95%);
    --accent-border: hsl(24 92% 80%);
    --accent-on-soft: hsl(22 86% 36%);
    --accent-hover: hsl(22 92% 45%);
    --accent-text: oklch(0.98 0 0);
    --app-font-sans: var(--font-poppins);
    --app-font-display: var(--font-bricolage);
}
```

### Propagación Automática a Modo Claro y Oscuro

Las variables del ERP consumen el `--bg-chroma`, `--bg-hue` y la descomposición del acento asignados por la atmósfera. El modo claro/oscuro se resuelve cambiando luminosidad de fondos y **recalculando el acento** para que no queme en oscuro:

```css
/* ═══════════════════════════════════════════════════════
   MODO CLARO — Inversión óptica
   (el fondo base es ligeramente más oscuro que las cards)
   ═══════════════════════════════════════════════════════ */
:root, [data-mode="light"] {
    --bg-main:       oklch(0.96 var(--bg-chroma) var(--bg-hue));
    --bg-surface:    oklch(0.995 var(--bg-chroma) var(--bg-hue));
    --bg-elevated:   oklch(1.0 0 0); /* blanco puro para popovers */
    --border-subtle: oklch(0.88 var(--bg-chroma) var(--bg-hue));
    --border-strong: oklch(0.78 var(--bg-chroma) var(--bg-hue));
    --text-primary:  oklch(0.14 0.01 var(--bg-hue));
    --text-secondary: oklch(0.38 0.01 var(--bg-hue));
    --text-muted:    oklch(0.55 0.01 var(--bg-hue));
}

/* ═══════════════════════════════════════════════════════
   MODO OSCURO — Capas por luminosidad + acento desaturado
   (consulta colores.md → Capítulo 3 para la teoría)
   ═══════════════════════════════════════════════════════ */
:root.dark[data-atmosphere],
:root[data-mode="dark"][data-atmosphere],
:root[data-atmosphere].dark,
:root[data-atmosphere][data-mode="dark"] {
    /* Re-evaluate backgrounds using per-atmosphere dark luminosity, chroma and hue */
    --bg-main: oklch(var(--bg-l-dark) var(--bg-chroma) var(--bg-hue));
    --bg-surface: oklch(
        calc(var(--bg-l-dark) + 0.03) var(--bg-chroma) var(--bg-hue)
    );
    --bg-elevated: oklch(
        calc(var(--bg-l-dark) + 0.06) var(--bg-chroma) var(--bg-hue)
    );
    --border-subtle: oklch(calc(var(--bg-l-dark) + 0.07) var(--bg-chroma) var(--bg-hue));
    --border-strong: oklch(calc(var(--bg-l-dark) + 0.12) var(--bg-chroma) var(--bg-hue));
    --text-primary:  oklch(0.98 0 0);
    --text-secondary: oklch(0.72 0.01 var(--bg-hue));
    --text-muted:    oklch(0.55 0.01 var(--bg-hue));

    /* Acento recalculado: más luz, menos chroma (no quema los ojos) */
    --accent:       oklch(0.70 calc(var(--accent-chroma) - 0.04) var(--accent-hue));
    --accent-soft:  oklch(0.18 0.06 var(--accent-hue));
    --accent-hover: oklch(0.76 calc(var(--accent-chroma) - 0.04) var(--accent-hue));
    --accent-text:  oklch(0.98 0 0);
}

/* ═══════════════════════════════════════════════════════
   COLORES SEMÁNTICOS — Hue inmutable, soft adapta a modo
   ═══════════════════════════════════════════════════════ */
:root {
    --semantic-success:      oklch(0.65 0.18 150);
    --semantic-success-soft: oklch(0.92 0.04 150);
    --semantic-danger:       oklch(0.60 0.22 25);
    --semantic-danger-soft:  oklch(0.92 0.04 25);
    --semantic-warning:      oklch(0.75 0.16 75);
    --semantic-warning-soft: oklch(0.93 0.04 75);
    --semantic-info:         oklch(0.62 0.18 250);
    --semantic-info-soft:    oklch(0.92 0.04 250);
}

.dark, [data-mode="dark"] {
    /* El hue y el color base no cambian. Solo las variantes -soft
       bajan a una mancha profunda para no quemar en oscuro. */
    --semantic-success-soft: oklch(0.18 0.05 150);
    --semantic-danger-soft:  oklch(0.18 0.05 25);
    --semantic-warning-soft: oklch(0.18 0.05 75);
    --semantic-info-soft:    oklch(0.18 0.05 250);
}
```

### Uso en HTML

```html
<!-- El <html> recibe la atmósfera; next-themes pone class="dark" para el modo -->
<html data-atmosphere="tecnologica" class="dark">
    <!-- Todo el ERP hereda automáticamente -->
</html>
```

Alternativamente, si no usas next-themes, puedes inyectar `data-mode="dark"`/`"light"` — el CSS los soporta a ambos.

---

## 💎 Beneficios del Nuevo Enfoque

| Antes (6 acentos + tonos) | Después (3 atmósferas) |
| :--- | :--- |
| El usuario combinaba 6 colores × N tonos libremente | El usuario elige **1 de 3** atmósferas coherentes |
| Combinaciones rotas que violaban contraste WCAG | Cada atmósfera **garantiza** contraste correcto |
| Opacidad manual para cada combinación | Chroma y hue se propagan automáticamente por CSS |
| Modo oscuro requería ajustes por acento | Modo oscuro recalcula automáticamente luminosidad + chroma |
| Cientos de clases Tailwind dinámicas en el DOM | CSS nativo puro: `var(--accent)` en todo el código |
| Tipografía fija para todo el ERP | Pareja sans + display elegida por la atmósfera |
| Panel de ajustes parecía un juguete | Panel profesional tipo "entorno de desarrollo" |

---

## 🔄 Plan de Migración

> [!NOTE]
> El sistema actual ya está implementado en `apps/web/src/app/globals.css`. Los pasos siguientes describen cómo se hizo y qué hay que respetar para mantener la migración intacta o agregar una cuarta atmósfera en el futuro.

### Paso 1 — Definir variables CSS de atmósferas
Crear los bloques `:root[data-atmosphere="..."]` en `globals.css` con `--bg-chroma`, `--bg-hue`, descomposición del acento (`--accent-l/-chroma/-hue`) y las fuentes (`--app-font-sans` + `--app-font-display`).

### Paso 2 — Mapear variables legacy al nuevo sistema
**El proyecto mantiene las variables legacy `--sidebar-primary`, `--sidebar-foreground`, `--app-canvas`, `--app-surface`, etc.**, pero las redirige por CSS para que apunten a las nuevas variables (`var(--accent)`, `var(--bg-main)`, ...). Esto se hace dentro del mismo `:root[data-atmosphere]` y evita reescribir todos los componentes de shadcn que ya consumían las variables viejas.

### Paso 3 — Recalcular automáticamente en modo oscuro
Bajo `:root.dark[data-atmosphere]` y `:root[data-mode="dark"][data-atmosphere]`, recalcular: (a) las luminosidades de `--bg-*`, `--border-*` y `--text-*`; (b) el `--accent` con `+0.10` de luminosidad y `−0.04` de chroma; (c) las variantes `*-soft` semánticas con luminosidad baja (`0.18`).

### Paso 4 — Actualizar el panel de configuración
Sustituir los selectores de "Tono" y "Color de acento" por un **único selector de Atmósfera** con 3 tarjetas de preview que muestren el fondo y el círculo de acento. Implementado en `src/components/settings/preferencias-settings-content.tsx`. El estado vive en `src/lib/atmosphere.tsx` (Context + localStorage + script de hidratación temprana en `<head>`).

### Paso 5 — Migrar componentes
Reemplazar todas las referencias a colores de acento dinámicos por `var(--accent)`, `var(--accent-soft)`, `var(--accent-hover)` y las variables semánticas. Los componentes shadcn (`components/ui/*`) **no se editan** — heredan el acento vía `--sidebar-primary` / `--color-primary` mapeados al sistema nuevo.

### Paso 6 — Validar contraste WCAG
Verificar que cada atmósfera × modo (6 combinaciones totales) cumple con los ratios mínimos:
*   Texto sobre fondo: **4.5 : 1**
*   Contenedor sobre fondo general: **3 : 1**
*   Acento sobre fondo: **3 : 1** mínimo para elementos grandes

> [!NOTE]
> Este documento debe actualizarse si se agrega una cuarta atmósfera en el futuro. Cualquier nueva atmósfera debe seguir el mismo patrón: definir `--bg-chroma`, `--bg-hue`, la **descomposición del acento** y la **pareja tipográfica** como un paquete inseparable. Si una de estas dimensiones falta, no es una atmósfera completa.
