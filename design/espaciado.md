# 📏 Sistema de Espaciado Óptico Basado en `rem`

*Fuente: Sajid — Perfect Spacing*

Reglas estrictas para agrupar, separar y balancear el peso visual de los componentes usando unidades relativas. Un espaciado consistente es la diferencia entre una interfaz que se siente profesional y una que se siente improvisada.

> [!NOTE]
> Para la guía de **colores**, consulta [colores.md](colores.md). Para **layouts**, consulta [layouts.md](layouts.md).

> [!TIP]
> **Relación con Atmósferas** — El espaciado es consistente entre las 3 atmósferas del ERP. Las variables de spacing se aplican igual en Industrial, Tecnológica y Comercial. Ver [atmosferas.md](atmosferas.md) para el sistema completo de theming.

---

## 📐 Ley de Proximidad y Agrupación

El **propósito del espacio** no es decorar: es **agrupar y separar información**, guiando al usuario sin que tenga que pensar.

| Relación entre elementos | Gap recomendado | Ejemplo |
| :--- | :---: | :--- |
| Directamente relacionados (subgrupo estrecho) | `0.25rem` – `0.5rem` | Título de la lección + barra de progreso |
| Elementos del mismo bloque | `0.75rem` – `1rem` | Campos dentro de un formulario |
| Bloques o secciones distintas | `1.5rem` – `2rem` | Separación entre secciones de una página |

> [!TIP]
> **Consistencia absoluta:** Si mantienes el mismo patrón de espaciado en toda la app, el diseño se verá ordenado automáticamente, incluso si los números elegidos no son perfectos. La consistencia importa más que la precisión individual.

---

## 🔧 Reglas de Padding Interno vs. Externo

### Botones e Inputs

El espacio entre el icono interno y el texto (`gap`) **jamás** debe ser mayor que el `padding` exterior que envuelve al botón. Si el gap interior supera al padding, el componente se siente desequilibrado y roto.

### Compensación de Peso Óptico

El texto genera más "ruido" e irregularidad visual a los lados que arriba y abajo. Por eso, para botones limpios y proporcionados, el **padding horizontal debe ser entre 2 y 3 veces mayor** que el padding vertical:

```css
/* ✅ Proporción correcta */
.btn {
    padding: 0.5rem 1.25rem;  /* py < px */
}

/* ❌ Proporción incorrecta */
.btn-bad {
    padding: 1rem 1rem;  /* cuadrado: se siente aplastado */
}
```

---

## 📊 Tabla de Tokens de Espaciado

Escala de espaciado estandarizada para toda la interfaz. Usar estos tokens garantiza consistencia visual entre componentes y páginas.

| Token | Valor | Uso típico |
| :--- | :---: | :--- |
| `--space-0.5` | `0.125rem` (2px) | Micro-gaps entre iconos inline |
| `--space-1` | `0.25rem` (4px) | Gap mínimo, separación de badges |
| `--space-1.5` | `0.375rem` (6px) | Padding interno de pills/tags |
| `--space-2` | `0.5rem` (8px) | Gap entre elementos de un subgrupo |
| `--space-3` | `0.75rem` (12px) | Padding interno de inputs, gap entre ítems de lista |
| `--space-4` | `1rem` (16px) | Padding de cards, gap entre bloques |
| `--space-5` | `1.25rem` (20px) | Padding horizontal de botones CTA |
| `--space-6` | `1.5rem` (24px) | Gap entre secciones dentro de un card |
| `--space-8` | `2rem` (32px) | Separación entre secciones principales |
| `--space-10` | `2.5rem` (40px) | Margen superior de secciones de página |
| `--space-12` | `3rem` (48px) | Separación entre bloques de contenido mayor |
| `--space-16` | `4rem` (64px) | Hero padding, separación de secciones de landing |

---

## 📱 Guía Responsive

El espaciado debe adaptarse al viewport para mantener la proporción visual. Usa estos valores como referencia al diseñar para múltiples dispositivos:

| Contexto | Mobile (< 640px) | Tablet (640–1024px) | Desktop (> 1024px) |
| :--- | :---: | :---: | :---: |
| Padding de página | `--space-4` | `--space-6` | `--space-8` |
| Gap entre cards | `--space-3` | `--space-4` | `--space-6` |
| Padding de card | `--space-3` | `--space-4` | `--space-5` |
| Gap de formularios | `--space-3` | `--space-4` | `--space-4` |
| Separación de secciones | `--space-6` | `--space-8` | `--space-12` |

> [!IMPORTANT]
> En móvil, prioriza reducir padding de página y cards antes de comprimir el gap entre elementos. El espacio entre elementos dentro de un grupo debe mantenerse legible incluso en las pantallas más pequeñas.

---

## 🔄 Flujo de Trabajo de Espaciado

Al maquetar un bloque, **comienza aplicando un espacio grande** (`1.5rem`) y redúcelo poco a poco con tu ojo hasta que se sienta bien. **Nunca** empieces desde un espacio pequeño e intentes agrandarlo, porque psicológicamente te costará soltar espacio y la interfaz quedará apretada.
