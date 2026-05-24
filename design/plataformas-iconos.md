# 📥 Directorio de Iconografía Profesional y Customización Variable

Este documento centraliza los tres repositorios web más potentes para buscar, descargar y calibrar iconos vectoriales de alta calidad sin costo.

> [!NOTE]
> Para iconos **animados** e interactivos (hover con Lottie/SVG), consulta [iconos-animados.md](iconos-animados.md). Para el diseño del **icono de la app** en tiendas, consulta [iconos-app.md](iconos-app.md).

---

## 🌐 Las 3 Plataformas Líderes

### 1. Flaticon

*   **URL:** [flaticon.com](https://www.flaticon.com)
*   **Ventaja Principal:** Da acceso instantáneo a la **mayor base de datos de iconos vectoriales** en internet. Millones de iconos organizados en packs temáticos con consistencia de estilo.
*   **Formatos de descarga:** Soporta múltiples extensiones nativas de diseño y desarrollo: `PNG`, `SVG`, `EPS`, `PSD`.
*   **Cuándo usarlo:** Cuando necesitas variedad masiva y acceso rápido a iconos individuales o sets completos para prototipar.

---

### 2. Icon Finder

*   **URL:** [iconfinder.com](https://www.iconfinder.com)
*   **Ventaja Principal:** Cuenta con un **motor de búsqueda y filtrado ultra potente**. Permite filtrar por estilo (lineal, sólido, 3D), tamaño, precio (free/premium) y licencia.
*   **Propósito UI:** Diseñado para localizar conjuntos (*packs*) completos de iconos con **consistencia de trazo exacta** bajo palabras clave muy específicas. Ideal cuando necesitas que todos los iconos de una sección compartan el mismo peso visual.

---

### 3. Google Fonts: Material Symbols

*   **URL:** [fonts.google.com/icons](https://fonts.google.com/icons)
*   **Ventaja Principal:** Evolución directa de Material Icons, integrada como la suite de iconos oficiales de Google Fonts.
*   **El factor diferencial — Iconos Variables:** Es una de las mejores herramientas de frontend porque permite **personalizar de forma nativa en la web** cuatro ejes críticos mediante sliders antes de copiar el código:

| Eje | Propiedad CSS | Rango | Uso |
| :--- | :--- | :---: | :--- |
| **Weight** (Grosor del trazo) | `font-variation-settings: 'wght'` | `100` – `700` | Emparejar con el peso de tu fuente de texto |
| **Fill** (Relleno) | `font-variation-settings: 'FILL'` | `0` o `1` | Alternar entre iconos lineales o sólidos |
| **Optical Size** (Tamaño óptico) | `font-variation-settings: 'opsz'` | `20` – `48` | Ajustar densidad para pantallas pequeñas |
| **Grade** (Grosor del contenedor) | `font-variation-settings: 'GRAD'` | `-25` – `200` | Calibrar peso visual sin cambiar el tamaño |

#### Ejemplo de Integración CSS

```css
.material-symbols-outlined {
    font-variation-settings:
        'FILL' 0,
        'wght' 400,
        'GRAD' 0,
        'opsz' 24;
    font-size: 24px;
    transition: font-variation-settings 0.2s ease;
}

/* Hover: rellenar el icono suavemente */
.icon-interactive:hover .material-symbols-outlined {
    font-variation-settings:
        'FILL' 1,
        'wght' 500,
        'GRAD' 0,
        'opsz' 24;
}
```

> [!TIP]
> La transición animada de `font-variation-settings` en hover genera una micro-interacción premium con **cero JavaScript y cero dependencias externas**. Es la forma más eficiente de animar iconos en un proyecto web moderno.
