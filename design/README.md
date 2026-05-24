# 🎨 Guía de Diseño — Inventori

Carpeta centralizada con todos los principios de diseño visual, tipografía, color, espaciado, iconografía y psicología UX del proyecto. Cada archivo cubre un tema específico y está pensado para consultarse de forma independiente antes de diseñar o modificar cualquier pantalla.

> [!IMPORTANT]
> Estos documentos son **la fuente de verdad** para toda decisión visual del proyecto. Deben consultarse antes de crear componentes, pantallas o flujos nuevos, tanto por desarrolladores humanos como por agentes de IA.

> [!CAUTION]
> **[atmosferas.md](atmosferas.md) es el documento central del sistema de theming.** Define las 3 atmósferas que empaquetan colores, tipografías, luminosidad y personalidad en un único selector. Debe consultarse **primero** antes de cualquier cambio visual en el ERP.

---

## 📂 Estructura de Archivos

| Archivo | Tema | Cuándo Consultarlo |
| :--- | :--- | :--- |
| [atmosferas.md](atmosferas.md) | 3 atmósferas ERP: Industrial, Tecnológica, Comercial — theming unificado | Al definir tema, colores base, tipografías por atmósfera |
| [tipografias.md](tipografias.md) | Catálogo de fuentes, ADN, CSS, pairings y kerning | Al elegir o cambiar fuentes |
| [colores.md](colores.md) | Sistema de colores, regla 60-30-10, OKLCH, accesibilidad y errores comunes | Al definir paletas o auditar interfaces |
| [espaciado.md](espaciado.md) | Sistema de espaciado óptico, padding, proximidad, tabla de tokens | Al maquetar formularios, cards o layouts |
| [layouts.md](layouts.md) | 7 patrones de layout de empresas top (Vercel, Linear, Stripe) | Al diseñar landing pages o secciones públicas |
| [leyes-ux.md](leyes-ux.md) | Las 12 leyes psicológicas del diseño UX/UI | Al tomar decisiones de flujo, navegación o jerarquía |
| [elementos-ui.md](elementos-ui.md) | Los 5 átomos del diseño: punto, línea, forma, tipografía, color | Al construir componentes desde cero |
| [microanimaciones.md](microanimaciones.md) | 11 microanimaciones avanzadas con CSS/JS y curvas Bézier | Al implementar hovers, toasts, transiciones |
| [animaciones-mascaras.md](animaciones-mascaras.md) | Máscaras overflow, toggle enmascarado, hamburguesa → X | Al crear toggles, menús animados o morfosis |
| [iconos-app.md](iconos-app.md) | Diseño de iconos de aplicación (App Store / Play Store) | Al crear o actualizar el icono de la app |
| [iconos-animados.md](iconos-animados.md) | Unicorn Icons y micro-interacciones hover con Lottie/SVG | Al implementar iconos interactivos |
| [plataformas-iconos.md](plataformas-iconos.md) | Flaticon, Icon Finder, Material Symbols (iconos variables) | Al buscar o descargar iconografía |
| [herramientas-frontend.md](herramientas-frontend.md) | CSS Scan, Iconscout, Coolors — herramientas de personalización | Al pulir sombras, bordes, paletas o iconos |

---

## 🔗 Flujo de Trabajo Recomendado

Al iniciar un cambio de interfaz, sigue este orden de lectura:

1. **Atmósferas** → verifica cuál atmósfera está activa y respeta sus tokens (acento, tipografía, luminosidad).
2. **Tipografías** → define las fuentes del componente o pantalla según la pareja tipográfica de la atmósfera.
3. **Colores** → asegúrate de respetar la regla 60-30-10 y el contraste WCAG.
4. **Espaciado** → aplica las reglas de proximidad, padding y peso óptico.
5. **Elementos UI** → verifica que los átomos visuales estén bien usados.
6. **Layouts** → si es una sección pública, elige el patrón estructural adecuado.
7. **Leyes UX** → valida que el flujo respeta la psicología del usuario.
8. **Microanimaciones** → agrega interacciones premium con las curvas correctas.
9. **Iconografía** → selecciona iconos consistentes y con micro-interacciones si aplica.
