# 🦄 Unicorn Icons: Implementación de Iconos Animados en Interfaces

Manual para la integración de micro-interacciones animadas basadas en vectores, elevando el feedback visual del frontend al interactuar con el cursor.

> [!NOTE]
> Para las plataformas de iconos estáticos (Flaticon, Icon Finder, Material Symbols), consulta [plataformas-iconos.md](plataformas-iconos.md).

> [!TIP]
> **Integración con Atmósferas** — Los iconos animados heredan automáticamente los colores de la atmósfera activa vía `var(--accent)`. Consulta [atmosferas.md](atmosferas.md) para el sistema de theming completo.

---

## ⚡ Características del Recurso

*   **Librería Objetivo:** `Unicorn Icons` ([unicornicons.com](https://unicornicons.com)), una plataforma que provee decenas de iconos animados personalizables y gratuitos.
*   **Micro-interacciones Nativas:** Los iconos permanecen estáticos y ejecutan su animación de forma fluida **únicamente cuando el usuario posiciona el cursor encima (efecto hover)**. Esto genera una sensación de interfaz viva y reactiva sin sobrecargar el rendimiento.

---

## 💻 Flujo de Exportación e Integración Web

Los iconos se pueden previsualizar y personalizar directamente en la plataforma (color, grosor del trazo, velocidad de animación) para luego ser exportados en dos formatos clave para desarrollo:

### 1. SVG (Scalable Vector Graphics)
*   **Cuándo usarlo:** Para animaciones vectoriales inline ligeras y manipulación directa por CSS (`stroke-dasharray`, `transform`, `opacity`).
*   **Ventaja:** Zero dependencias externas. El SVG se incrusta directamente en el HTML y se anima con CSS puro o con atributos SMIL.

### 2. JSON (Lottie)
*   **Cuándo usarlo:** Formato óptimo si utilizas librerías de renderizado de animaciones como **Lottie** en frameworks modernos (React, Next.js, Vue, etc.).
*   **Ventaja:** Las animaciones son más complejas y suaves que las posibles con CSS puro, con un peso mínimo (generalmente < 10 KB por icono).

---

## 🔧 Ejemplo de Integración con React/Next.js

```tsx
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

function AnimatedIcon() {
    return (
        <DotLottieReact
            src="/icons/check-animation.lottie"
            loop={false}
            autoplay={false}
            // Activar al hover del contenedor padre
        />
    );
}
```

> [!TIP]
> Combina estos iconos animados con las **micro-animaciones simples** documentadas en [microanimaciones.md](microanimaciones.md) para lograr una experiencia de hover consistente en toda la interfaz.
