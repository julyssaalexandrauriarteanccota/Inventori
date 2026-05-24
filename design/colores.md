# 🎨 Sistema de Colores, Accesibilidad y Capas Visuales

Este documento regula la creación de paletas cromáticas accesibles, la estructura de capas por luminosidad y las técnicas avanzadas de sombreado. Evita la saturación visual y garantiza que la interfaz sea utilizable para todo tipo de usuarios.

> [!NOTE]
> Para la guía de **tipografías y fuentes**, consulta [tipografias.md](tipografias.md). Para **espaciado**, consulta [espaciado.md](espaciado.md).

> [!TIP]
> **Integración con Atmósferas** — El sistema de colores descrito aquí se aplica a través de las 3 atmósferas del ERP (Industrial, Tecnológica, Comercial). Cada atmósfera selecciona un acento, escala de grises y luminosidad específicos. Consulta [atmosferas.md](atmosferas.md) para la implementación completa con variables CSS OKLCH.

---

## 📹 Parte 1 — Reglas de Oro Visuales

*Fuente: Igna UX*

### La Regla del 60-30-10

Toda interfaz debe distribuir sus colores en tres niveles de jerarquía estricta:

| Porcentaje | Rol | Ejemplos |
| :---: | :--- | :--- |
| **60 %** | **Neutros** — fondos, contenedores y texto de lectura general | Backgrounds, cards base, párrafos |
| **30 %** | **Secundario / Alertas** — bordes, estados activos y elementos de soporte | Bordes de input en foco, badges, chips de estado |
| **10 %** | **Primario (Marca)** — reservado **exclusivamente** para botones de acción principal (CTA) o elementos de atención crítica | Botón "Guardar", indicador de notificación |

> [!IMPORTANT]
> **El color da más jerarquía que el tamaño.** Un botón pequeño con el color de marca correcto captura la atención antes que un bloque grande y neutro. No necesitas agrandar elementos para que destaquen si tu paleta cromática está bien calibrada.

### Independencia del Color (Diseño Inclusivo)

El **8 % de los hombres** y el **0.5 % de las mujeres** padecen algún tipo de daltonismo. Por lo tanto:

*   **Nunca** dependas únicamente del color para comunicar un estado o un cambio.
*   Si una lección pasa de *Pendiente* a *Finalizada*, el cambio de color **debe ir reforzado** por un icono (✓), un trazo, un cambio de grosor tipográfico o una etiqueta de texto.

### Diseño en Escala de Grises

Como buena práctica de validación, la estructura de toda UI debe **probarse primero en blanco y negro**. Si no se entiende qué hace cada botón, dónde empieza una sección o cuál es la acción principal sin color alguno, la interfaz está mal planteada y necesita ser reestructurada antes de aplicar la paleta cromática.

### Implementación en Código — Escala de Tonos

Los colores de marca se deben escalar en **11 tonos** basados en la luminosidad (del `50` al `1000`):

| Tono | Uso |
| :--- | :--- |
| `50` | Disabled / desaturado total |
| `100` – `300` | Fondos sutiles, estados hover suaves en modo oscuro |
| `400` – `600` | Bordes, iconografía secundaria |
| **`700`** | **Base de marca** (punto de anclaje principal) |
| `800` – `900` | Hover en modo claro (más oscuro que la base) |
| `1000` | Texto sobre fondos claros, peso máximo |

**Contraste WCAG mínimo obligatorio:**
*   Texto sobre fondo: **4.5 : 1**
*   Contenedor sobre fondo general: **3 : 1**

---

## 📹 Parte 2 — Los 7 Errores de Color que Arruinan tu UI

*Fuente: Kole Jain — Color Mistakes*

Guía de auditoría para corregir interfaces que se ven "baratas", sobrecargadas o clonadas por IA.

### 1. Saturación de Accent Colors
Evita usar 5 colores llamativos en tarjetas distintas compitiendo por la atención del usuario al mismo tiempo. **Agrupa usando grises** y mantén un **solo color de acento** como protagonista visual.

### 2. Falta de Balance Neutro
Los fondos puros (blancos o grises planos) se ven aburridos y genéricos. Añade un **tinte muy sutil de tu color de marca** al fondo gris o a las tarjetas. Por ejemplo, si tu marca es morada, usa un gris con matiz púrpura en vez de `gray-100`. Esto genera cohesión visual instantánea sin saturar.

### 3. Abuso de Fondos en Tarjetas
Llenar cada bloque con un fondo de color satura la pantalla y aplasta la jerarquía. Muchas veces, un **borde sutil de 1px** es una solución mucho más limpia y elegante que un fondo completo.

### 4. Uso de Negro y Blanco Puro
El texto negro puro (`#000000`) sobre fondo blanco puro (`#FFFFFF`) genera **fatiga visual** por el contraste extremo. Usa grises profundos o tonos oscuros derivados de tu color de marca:

```css
/* ❌ Evita esto */
color: #000000;
background: #ffffff;

/* ✅ Prefiere esto */
color: oklch(0.15 0.01 var(--brand-hue));     /* gris casi negro con matiz de marca */
background: oklch(0.985 0.005 var(--brand-hue)); /* blanco cálido con matiz */
```

### 5. Modo Oscuro como Simple "Inversión"
El modo oscuro **no es solo invertir el modo claro**. Requiere que:
*   Los elementos que están "más cerca" del usuario (capas superiores, tarjetas, popovers) sean **más claros** que el fondo base oscuro.
*   Los colores de marca deben **desaturarse ligeramente** para no quemar los ojos en superficies oscuras.

### 6. Ignorar Estados de Elementos
Todo elemento interactivo debe cambiar de color de forma **matemática y predecible** a través de sus estados:

| Estado | Tratamiento del Color |
| :--- | :--- |
| **Default** | Color base de marca |
| **Hover** | Ligeramente más claro / más brillante |
| **Active / Click** | Más oscuro que la base |
| **Focus** | Anillo de foco visible con contraste |
| **Disabled** | Gris desaturado, opacidad reducida |

### 7. Inconsistencia Semántica
Usar verde para "eliminar" o rojo para "aceptar" viola las expectativas universales del usuario. Mantén siempre la semántica estándar: verde = éxito, rojo = error/peligro, amarillo = advertencia, azul = información.

---

## 📹 Parte 3 — Matemáticas del Color y Estructura de Capas (OKLCH)

*Fuente: Sajid — UI Colors & OKLCH*

### Rechazo de HEX y RGB

Los formatos `HEX` y `RGB` no representan la percepción humana real del color. Este proyecto adopta **OKLCH** (Luminosidad, Chroma, Tono) como formato nativo de referencia, alineado con Tailwind v4 y los estándares CSS modernos.

### Lógica de Capas por Luminosidad

El ojo humano interpreta que **los objetos más claros están más cerca** (tienen luz encima). Esta ilusión óptica se aprovecha para construir profundidad sin sombras pesadas.

#### Configuración Modo Oscuro (Efecto de Elevación)

| Capa | Luminosidad | Ejemplo |
| :--- | :---: | :--- |
| Fondo base de la app | **0 %** | El punto más lejano y oscuro |
| Tarjetas / Superficies | **5 %** | Se elevan hacia el usuario |
| Popovers / Modales | **10 %** | Lo más cercano al ojo |

#### Configuración Modo Claro (Inversión Óptica)

La luz viene de arriba, por lo que el contenedor flotante debe ser **el más claro** (blanco puro), mientras que el fondo base de la app debe ser **ligeramente más oscuro** (gris muy suave) para que las tarjetas se eleven visualmente.

### Técnicas Avanzadas de Sombreado y Bordes en CSS

#### Efecto "Shiny Top" (Bordes con Gradiente)

Para hacer que una tarjeta en modo oscuro parezca premium, aplica un **borde superior ligeramente más claro** que los bordes laterales e inferior. Esto simula que la luz física impacta el borde superior de la tarjeta:

```css
.dark .premium-card {
    border: 1px solid oklch(0.25 0 0);
    border-top-color: oklch(0.35 0 0);  /* borde superior más claro */
}
```

#### Estructura de Sombras Realistas

**Nunca** uses una sola sombra pesada. Mezcla siempre dos capas:

```css
.card {
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.12),   /* sombra corta y densa: da firmeza */
        0 8px 24px rgba(0, 0, 0, 0.06);   /* sombra larga y difusa: da profundidad */
}
```

La primera sombra ancla el elemento al plano; la segunda crea la ilusión de que flota con suavidad.
