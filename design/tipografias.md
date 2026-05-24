# 🎨 Guía y Catálogo Completo de Tipografías para Inventori

Esta guía documenta el **Catálogo de Fuentes Curadas** para el diseño de interfaces en **Inventori**. Ha sido diseñada para romper con los patrones de diseño genéricos y lograr interfaces dinámicas, memorables y premium, tanto en el sitio web público como en las pantallas internas del sistema (ERP).

> [!NOTE]
> Para las reglas de **colores, espaciado, layouts y psicología UX**, consulta el índice de documentos de diseño en [README.md](README.md).

> [!TIP]
> **Pares Tipográficos por Atmósfera** — Cada atmósfera del ERP tiene un par tipográfico asignado (sans + display). Industrial: Inter + Playfair Display · Tecnológica: IBM Plex Sans + Montserrat · Comercial: Poppins + Bricolage Grotesque. Ver [atmosferas.md](atmosferas.md) para detalles completos.

---

## 🏆 El Top 5 Oficial

### 1. Inter
*   **Tipo:** Sans-Serif Variable (Palo Seco).
*   **ADN:** Diseñada específicamente para pantallas por *Rasmus Andersson*. Tiene una altura de "X" muy generosa y apertura de caracteres optimizada, lo que la hace ultra-legible incluso en pantallas de baja resolución y tamaños pequeños. Es la evolución natural y moderna de Helvetica.
*   **Uso en Web:** Ideal para plataformas SaaS, dashboards de administración, textos de párrafos generales y componentes interactivos de UI (botones, inputs, menús).
*   **Integración Técnica (CSS):**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        letter-spacing: -0.01em; /* Altamente recomendado para Inter */
    }
    ```

### 2. Bebas Neue
*   **Tipo:** Sans-Serif Condensada (Solo Mayúsculas).
*   **ADN:** Creada por *Ryoichi Tsunekawa*. Es una fuente limpia, masiva y con un impacto vertical enorme. Su peso visual es ideal para captar la atención de inmediato de manera organizada.
*   **Uso en Web:** Títulos `H1` muy cortos, banners promocionales, números gigantes en métricas clave o tarjetas destacadas. **Jamás** debe usarse para texto corrido o párrafos.
*   **Integración Técnica (CSS):**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

    .hero-title {
        font-family: 'Bebas Neue', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.05em; /* Un poco de tracking resalta su estructura condensada */
        line-height: 0.95;
    }
    ```

### 3. Merriweather
*   **Tipo:** Serif (Con remates / Romana de transición).
*   **ADN:** Diseñada por *Eben Sorkin*. Tiene una calidez renacentista y editorial, pero sus formas se abrieron geométricamente para que no se rompa ni se borre al leerse en pantallas digitales (especialmente en resoluciones estándar).
*   **Uso en Web:** Blogs, artículos largos, documentación densa o secciones de narrativa. Si quieres usar su contraparte limpia, busca *Merriweather Sans* para combinarlas.
*   **Integración Técnica (CSS):**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap');

    .narrative-text {
        font-family: 'Merriweather', Georgia, serif;
        line-height: 1.7;
        font-size: 1.05rem;
    }
    ```

### 4. Source Serif
*   **Tipo:** Serif de bajo contraste.
*   **ADN:** Diseñada por *Frank Grießhammer* para Adobe. Inspirada en la tipografía histórica *Fournier*. Es extremadamente adaptable a tamaños pequeños sin perder su elegancia y elegida frecuentemente por su excelente legibilidad en dispositivos móviles.
*   **Uso en Web:** Secciones "Hero" elegantes, subtítulos editoriales, marcas de agua o citas textuales (`blockquote`). Combina perfectamente con *Source Sans*.
*   **Integración Técnica (CSS):**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..144,300;0,8..144,400;0,8..144,600;1,8..144,400&display=swap');

    blockquote {
        font-family: 'Source Serif 4', Georgia, serif;
        font-style: italic;
        color: var(--text-muted);
    }
    ```

### 5. Playfair Display
*   **Tipo:** Serif de Exhibición (Construcción romana moderna).
*   **ADN:** Diseñada por *Claus Eggers Sørensen*. Inspirada en el siglo XIX (Baskerville y Bodoni). Tiene un contraste dramático y muy marcado entre sus trazos gruesos y delgados, lo que le da una estética de lujo y alta costura.
*   **Uso en Web:** Títulos principales de landing pages premium.
*   **Nota crítica:** No la uses en textos de lectura larga porque su alto contraste fatiga rápidamente la vista en tamaños pequeños.
*   **Integración Técnica (CSS):**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap');

    .premium-header {
        font-family: 'Playfair Display', serif;
        font-weight: 700;
        letter-spacing: -0.02em; /* Reducir kerning resalta su contraste elegante */
    }
    ```

---

## 🏅 Las 3 Menciones de Honor

### 6. Montserrat
*   **Tipo:** Sans-Serif Geométrica (18 estilos).
*   **ADN:** Creada por *Julieta Ulanovsky*, inspirada en los carteles y letreros urbanos antiguos del tradicional barrio de Montserrat en Buenos Aires. Es la alternativa gratuita y open-source más robusta a la famosa tipografía *Gotham*.
*   **Uso en Web:** Títulos modernos de empresas, landing pages tecnológicas, botones y llamadas a la acción (CTAs). Si buscas un toque divertido, existe *Montserrat Alternates*.
*   **Integración Técnica (CSS):**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

    .cta-button {
        font-family: 'Montserrat', sans-serif;
        font-weight: 600;
        letter-spacing: -0.015em;
    }
    ```

### 7. Poppins
*   **Tipo:** Sans-Serif de Geometría Pura.
*   **ADN:** Basada en círculos y líneas perfectas (similar a Futura e ITC Avant Garde). Soporta el sistema latino y el devanagari (alfabeto de la India). Es sumamente amigable, limpia y equilibrada.
*   **Uso en Web:** Extremadamente versátil. Excelente para aplicaciones móviles, interfaces amigables, cabeceras modernas y paneles de control intuitivos.
*   **Integración Técnica (CSS):**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

    .friendly-card-title {
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
        letter-spacing: -0.02em;
    }
    ```

### 8. IBM Plex Sans
*   **Tipo:** Sans-Serif Corporativa / Industrial.
*   **ADN:** Diseñada por *Mike Abbink* como la fuente de marca global para IBM. Mezcla a la perfección lo humano con lo industrial gracias a sus curvas y terminaciones mecánicas. Forma parte de una súper familia (con versiones Serif, Condensed y Monospaced).
*   **Uso en Web:** Interfaces técnicas, herramientas analíticas, dashboards de desarrollo, tablas de datos, gráficos y utilidades de código.
*   **Integración Técnica (CSS):**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

    .technical-table-header {
        font-family: 'IBM Plex Sans', sans-serif;
        font-weight: 500;
        letter-spacing: -0.005em;
    }
    ```

---

### 9. Bricolage Grotesque
*   **Tipo:** Sans-serif grotesque con personalidad editorial.
*   **ADN:** Moderna y distintiva, con detalles únicos en las curvas que mezclan la funcionalidad grotesca con carácter display. Creada para ser versátil entre cuerpo de texto y títulos, con pesos variables que van desde light hasta extra-bold. Su personalidad expresiva la diferencia de las sans-serif genéricas.
*   **Uso en Web:** Títulos y display en la atmósfera Comercial del ERP. Headlines de landing pages. Logotipos y branding donde se busca calidez con carácter.
*   **Integración Técnica (CSS):**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap');

    .display-heading {
        font-family: 'Bricolage Grotesque', system-ui, sans-serif;
        font-optical-sizing: auto;
        font-weight: 700;
        /* Pesos recomendados: 400 (body), 600 (semi), 700 (bold), 800 (display) */
    }
    ```

---

## 🔗 Combinaciones Ganadoras (Font Pairings)

Para lograr un diseño cohesivo y premium, se recomienda alternar la tipografía de exhibición (display) con una de lectura (body). Aquí tienes 3 combinaciones recomendadas para proyectos web:

| Estilo General | Títulos (Display) | Cuerpo (Body) | Razón de la Combinación |
| :--- | :--- | :--- | :--- |
| **Corporativo/Premium** | **Playfair Display** | **Inter** | Contraste editorial elegante con UI ultra-limpia. |
| **Tecnológico/Moderno** | **Montserrat** | **IBM Plex Sans** | Estructura geométrica robusta combinada con detalles industriales técnicos. |
| **Creativo/Cercano** | **Bricolage Grotesque** | **Poppins** | Curvas alegres y expresivas de Bricolage balanceadas por la geometría pura de Poppins. |

---

## 💡 Reglas Críticas de Calibración de Kerning y Tracking en CSS

> [!WARNING]
> Al usar Google Fonts en entornos reales, **revisa siempre el espaciado (tracking) entre ciertos caracteres específicos**. Al ser un catálogo gratuito y variable, algunas fuentes requieren ajustes de kerning para verse perfectas y profesionales en desarrollo frontend.

### 📋 Checklist de Calibración

1.  **Reducir Tracking en Títulos Grandes (`h1`, `h2`):**
    A medida que aumenta el tamaño de la fuente, el espacio entre las letras parece mayor en proporción. **Reduce siempre** el `letter-spacing` para títulos grandes:
    ```css
    h1, h2 {
        font-size: 2.5rem;
        letter-spacing: -0.025em; /* Contrae el espacio para dar fuerza y cohesión */
    }
    ```
2.  **Ampliar Tracking en Textos de Mayúsculas Pequeñas (`uppercase`):**
    Si usas mayúsculas sostenidas para subtítulos, botones o etiquetas, el espaciado predeterminado se ve apretado. **Amplía siempre** el `letter-spacing`:
    ```css
    .pill-label, .btn-text {
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.05em; /* Aumenta para legibilidad refinada */
    }
    ```
3.  **Habilitar Renderizado Óptimo del Navegador:**
    Asegúrate de que el navegador aplique los kerning tipográficos definidos por la fuente usando estas directivas estándar en tu CSS raíz:
    ```css
    body {
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-feature-settings: "kern" 1, "liga" 1;
    }
    ```
