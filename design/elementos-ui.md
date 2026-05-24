# 🔷 Elementos Fundamentales del Diseño de Interfaces (UI)

Toda interfaz gráfica avanzada se desglosa en cinco componentes atómicos básicos. Dominar su uso estructural separa los frontends automatizados del software con diseño premium.

> [!NOTE]
> Este documento cubre los fundamentos teóricos. Para la aplicación práctica de tipografía, consulta [tipografias.md](tipografias.md). Para color, consulta [colores.md](colores.md).

> [!TIP]
> **Integración con Atmósferas** — Los 5 elementos atómicos (punto, línea, forma, tipografía, color) se materializan de forma diferente en cada atmósfera del ERP. Ver [atmosferas.md](atmosferas.md) para cómo cada atmósfera combina estos elementos en un sistema visual coherente.

---

## ⚛️ Los 5 Componentes del Diseño

### 1. El Punto

*   **Naturaleza:** Es el elemento de diseño más básico; geométricamente surge de la intersección exacta de dos líneas.
*   **Aplicación:** Aunque teóricamente carece de dimensiones, grosor o color, las herramientas modernas (como Figma) nos permiten darle escala para fijar el origen matemático de cualquier layout o nodo visual. En desarrollo, el punto se manifiesta como el píxel base, el punto de anclaje de una animación o el centro de un componente radial.

---

### 2. La Línea

*   **Naturaleza:** Puede ser recta, curva o mixta (combinando arcos y segmentos rectos).
*   **Propósito en UI:** Su principal superpoder psicológico es **redirigir y guiar la atención visual** de los usuarios. Las líneas horizontales transmiten estabilidad; las verticales, crecimiento; las diagonales, dinamismo y movimiento.
*   **Uso Correcto:** Utiliza líneas finas para atar textos sueltos y darles contexto de subtema o jerarquía de bloque, reduciendo la ambigüedad en el plano. En CSS, esto se traduce en bordes de `1px`, separadores sutiles y underlines con propósito.

---

### 3. Las Formas

*   **Clasificación:** Se dividen en formas predeterminadas básicas (rectángulos, cuadrados, círculos, óvalos, polígonos, estrellas) y formas personalizadas.
*   **Propósito en UI:** Unir múltiples líneas creando formas personalizadas te permite expresar el sentimiento exacto que requiere el flujo de tu aplicación. Los rectángulos redondeados transmiten amabilidad; los cuadrados con esquinas vivas, precisión técnica; los círculos, completitud y foco.

---

### 4. La Tipografía

*   **Naturaleza:** No es solo texto plano; **cada fuente tipográfica encierra una emoción psicológica distinta**. Una serif transmite autoridad y tradición; una sans-serif geométrica transmite modernidad y limpieza.
*   **Impacto Visual:** Cambiar una tipografía formal por una manuscrita o geométrica transforma por completo la interpretación de la interfaz (ej. convierte un mensaje genérico en un diseño amigable).

> [!TIP]
> Consulta el catálogo completo de fuentes recomendadas en [tipografias.md](tipografias.md).

---

### 5. El Color

*   **Naturaleza:** Es una herramienta esencial con una enorme carga emocional y psicológica preconfigurada en la mente humana. El rojo activa urgencia; el azul genera confianza; el verde comunica éxito o naturaleza.
*   **Uso Semántico:** Debe elegirse bajo el contexto del producto. Interfaces temáticas requieren colores que generen misterio o contraste controlado, en lugar de tonos extravagantes aleatorios. La coherencia cromática entre componentes es más importante que la vivacidad individual.

> [!TIP]
> Consulta las reglas completas de color, accesibilidad y OKLCH en [colores.md](colores.md).
