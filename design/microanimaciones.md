# ⚡ Manual de Implementación: 11 Microanimaciones de Alto Nivel

Este documento detalla la lógica de programación y comportamiento CSS/JS para 11 interacciones de interfaz refinadas. No aplicamos cambios bruscos de color; usamos transformaciones físicas, enmascaramientos y curvas de rebote. Las microanimaciones son el secreto para que el código frontend no parezca un clon genérico de IA, sino un producto premium hecho a mano.

> [!NOTE]
> Para las mecánicas avanzadas de **máscaras y curvas inversas** (toggle, hamburguesa → X), consulta [animaciones-mascaras.md](animaciones-mascaras.md). Para los **patrones de layout** donde aplicar estas animaciones, consulta [layouts.md](layouts.md).

---

## 🦾 Catálogo Técnico de Interacciones

### 1. Botón Hover con Texto Desplazable y Escala de Presión

*   **Qué hace:** Al pasar el cursor, el texto original se desliza hacia arriba desapareciendo y un segundo texto idéntico sube desde abajo. Al hacer clic, el botón reduce su escala general.
*   **Forma y Tamaño:** Botón estándar de acción (`py-2.5 px-6`).
*   **Implementación Frontend:**
    *   El botón requiere `position: relative` y `overflow: hidden` (actúa como máscara).
    *   Contiene un contenedor flex interno con dos copias del texto apiladas verticalmente. Al hover, todo el contenedor se desplaza en el eje Y (`translate-y`).
    *   **Efecto Click:** Usa clases de estado activo en CSS/Tailwind: `active:scale-95 transition-transform duration-150`. Evita alterar colores de forma aleatoria.

```css
.btn-slide {
    position: relative;
    overflow: hidden;
    padding: 0.625rem 1.5rem;
}
.btn-slide .btn-slide-inner {
    display: flex;
    flex-direction: column;
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-slide:hover .btn-slide-inner {
    transform: translateY(-100%);
}
.btn-slide:active {
    transform: scale(0.95);
    transition: transform 150ms ease;
}
```

---

### 2. Feedback de Atajos de Teclado (Keyboard Shortcuts)

*   **Qué hace:** Pequeña animación visual reactiva al presionar comandos físicos de teclado, disparando un mensaje flotante de éxito instantáneo al cumplirse la combinación.
*   **Implementación Frontend:** Enlaza un listener de JS (`keydown`). Al detectar las teclas específicas presionadas simultáneamente, inyecta clases de animación de rebote temporal (`animate-bounce` o una transición de escala rápida) sobre un componente flotante con posición fija (`fixed` o `absolute`).

```js
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        showShortcutFeedback('Guardado'); // Dispara la animación flotante
    }
});
```

---

### 3. Toast Notifications Dinámicas

*   **Qué hace:** Tarjetas de notificación que se deslizan verticalmente desde el borde de la pantalla, incluyendo estados de carga internos (spinners) o partículas físicas de celebración al completarse una tarea con éxito.
*   **Forma y Tamaño:** Rectángulos flotantes pequeños (`max-w-sm w-full p-4 rounded-xl shadow-lg`).
*   **Implementación Frontend:** Controlado mediante temporizadores (`setTimeout` / delay triggers en JS). El contenedor padre maneja transiciones del eje Y (`translate-y-0` activo, `translate-y-12` oculto) con una opacidad gradual (`opacity-0` a `opacity-100`).

```css
.toast {
    transform: translateY(1rem);
    opacity: 0;
    transition: all 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
.toast.is-visible {
    transform: translateY(0);
    opacity: 1;
}
```

---

### 4. Tarjeta Flotante de Nombre (Avatar Name Tag)

*   **Qué hace:** Al pasar el mouse sobre la foto o avatar pequeño de un usuario, se despliega una pequeña etiqueta o tooltip con su nombre que emerge con un sutil efecto elástico.
*   **Forma y Tamaño:** Etiqueta negra ovalada (`rounded-full bg-slate-950 text-white text-xs px-3 py-1`).
*   **Implementación Frontend:**
    *   El Name Tag inicia con `absolute opacity-0 translate-y-2 pointer-events-none`.
    *   Al hacer `:hover` en el avatar, cambia a `opacity-100 translate-y-0`.
    *   **Curva Física Premium:** Para emular el comportamiento elástico del video (Stiffness: 636, Damping: 24), usa una curva Bézier cúbica personalizada en CSS:

```css
.avatar-tag {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) translateY(0.5rem);
    opacity: 0;
    pointer-events: none;
    transition: all 500ms cubic-bezier(0.25, 1.5, 0.5, 1); /* curva elástica */
}
.avatar-wrapper:hover .avatar-tag {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}
```

---

### 5. Shimmer Stroke (Borde con Gradiente Animado)

*   **Qué hace:** El borde exterior de una tarjeta o botón brilla mediante un gradiente cónico continuo que gira a lo largo del perímetro. Incluye un botón para pausar o reproducir el bucle.
*   **Implementación Frontend:** Usa un pseudo-elemento (`::before`) en la tarjeta con un `background: conic-gradient(...)`. Este elemento gira continuamente usando una animación CSS clásica de rotación. El contenedor padre debe tener `overflow: hidden` y un padding de 1–2px para simular que solo el borde brilla. Para pausarlo, manipula la propiedad `animation-play-state: paused` por JS.

```css
.shimmer-card {
    position: relative;
    overflow: hidden;
    padding: 2px;
    border-radius: 1rem;
}
.shimmer-card::before {
    content: '';
    position: absolute;
    inset: -50%;
    background: conic-gradient(
        from 0deg,
        transparent 0%,
        oklch(0.7 0.15 250) 25%,
        transparent 50%
    );
    animation: shimmer-spin 3s linear infinite;
}
.shimmer-card > .shimmer-card-inner {
    position: relative;
    background: var(--surface);
    border-radius: calc(1rem - 2px);
    padding: 1.5rem;
}
@keyframes shimmer-spin {
    100% { transform: rotate(360deg); }
}
/* Pausar desde JS: element.style.animationPlayState = 'paused' */
```

---

### 6. Tooltips Inteligentes con Delay Temporal

*   **Qué hace:** Al posicionar el mouse sobre un icono aislado, el tooltip descriptivo no aparece de inmediato, sino que espera exactamente un segundo para no entorpecer la vista si el usuario solo está moviendo el puntero rápido por la pantalla.
*   **Implementación Frontend:** Escucha los eventos nativos de JavaScript `mouseenter` y `mouseleave`. Configura un `setTimeout` de `1000ms` al entrar. Si el usuario dispara `mouseleave` antes de que se cumpla el segundo, ejecuta un `clearTimeout` para abortar la renderización.

```js
let tooltipTimer = null;

icon.addEventListener('mouseenter', () => {
    tooltipTimer = setTimeout(() => {
        tooltip.classList.add('is-visible');
    }, 1000); // 1 segundo de espera intencional
});

icon.addEventListener('mouseleave', () => {
    clearTimeout(tooltipTimer);
    tooltip.classList.remove('is-visible');
});
```

---

### 7. Pop-Out de Texto en Hover (Text Hover Card)

*   **Qué hace:** Al pasar el cursor sobre una palabra o enlace específico dentro de un párrafo, emerge una tarjeta flotante interactiva con una imagen o vista previa detallada sobre el concepto.
*   **Implementación Frontend:** La palabra clave debe envolver un contenedor con `relative inline-block`. La tarjeta flotante se maqueta internamente como `absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 pointer-events-none transition-all duration-300`. Al activarse el hover del texto padre, pasa a `opacity-100 translate-y-0`.

```css
.text-hover-card {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    opacity: 0;
    pointer-events: none;
    transition: all 300ms cubic-bezier(0.22, 1, 0.36, 1);
    width: 280px;
}
.hover-trigger:hover .text-hover-card {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
}
```

---

### 8. Barra de Progreso Fluida (Linear Style)

*   **Qué hace:** Barras de carga de tareas o formularios que no avanzan de manera rígida, sino dibujándose de forma ultra fluida utilizando máscaras vectoriales para mantener al usuario enganchado.
*   **Implementación Frontend:** En lugar de manipular bruscamente el ancho (`width`), utiliza una transición CSS en la barra interior con propiedades optimizadas por GPU (`transform: scaleX(...)` con `transform-origin: left`) combinada con una curva de suavizado.

```css
.progress-bar {
    height: 4px;
    background: oklch(0.92 0 0);
    border-radius: 9999px;
    overflow: hidden;
}
.progress-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 9999px;
    transform-origin: left;
    transform: scaleX(0);
    transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
/* Desde JS: element.style.transform = `scaleX(${progress / 100})` */
```

---

### 9. Pilas de Notificaciones Interactivas (Card Swipe)

*   **Qué hace:** Tarjetas de notificación apiladas en capas en la esquina inferior derecha. Al deslizar la superior para descartarla, las tarjetas de fondo escalan su tamaño hacia adelante y descienden para tomar el espacio vacío de forma orgánica.
*   **Implementación Frontend:** Requiere el uso de librerías de gestos táctiles y arrastre como `Framer Motion` (`drag="x"`). Al descartar la tarjeta superior cambiando su opacidad a 0, los índices y estados de escala (`scale`) de los componentes hijos del DOM se actualizan en cadena con un efecto resorte (`type: "spring"`).

```tsx
// React + Framer Motion
<motion.div
    drag="x"
    dragConstraints={{ left: 0, right: 0 }}
    onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100) dismiss();
    }}
    exit={{ opacity: 0, x: info.offset.x > 0 ? 200 : -200 }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
/>
```

---

### 10. Expansión Horizontal de Barra de Búsqueda

*   **Qué hace:** Reduce el espacio de la barra de búsqueda comprimiéndola en un simple icono circular de lupa. Al hacer clic, se expande horizontalmente transformándose en un input de texto completo.
*   **Forma y Tamaño:** Inicia como un círculo de `w-10 h-10` y se expande suavemente a `w-64 h-10`.
*   **Implementación Frontend:** Usa transiciones fluidas sobre el ancho. El input debe tener `overflow-hidden` para ocultar el placeholder de texto mientras esté colapsado.

```css
.search-bar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    overflow: hidden;
    transition: width 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.search-bar.is-expanded {
    width: 16rem;
}
.search-bar input {
    opacity: 0;
    transition: opacity 200ms ease 100ms; /* delay para que aparezca después de expandir */
}
.search-bar.is-expanded input {
    opacity: 1;
}
```

---

### 11. Revelado Desplazable de Límites (Upgrade Details)

*   **Qué hace:** Al pasar el cursor sobre un indicador de límites de cuenta (ej. "20 usos"), la interfaz desliza de forma milimétrica los nuevos límites de un plan superior para incentivar la mejora de la cuenta de manera elegante.
*   **Implementación Frontend:** Un bloque con `overflow: hidden` donde el texto viejo se traslada verticalmente hacia arriba (`-translate-y-full`) al mismo tiempo que el nuevo texto entra desde el fondo (`translate-y-0`) con una duración de `200ms` y curva suave.

```css
.upgrade-reveal {
    overflow: hidden;
    height: 1.5em;
    position: relative;
}
.upgrade-reveal .text-stack {
    display: flex;
    flex-direction: column;
    transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.upgrade-reveal:hover .text-stack {
    transform: translateY(-50%);
}
```

---

## 📋 Referencia Rápida de Curvas CSS

| Nombre | Valor `cubic-bezier` | Uso |
| :--- | :--- | :--- |
| **Suave estándar** | `cubic-bezier(0.4, 0, 0.2, 1)` | Barras de progreso, fades |
| **Entrada rápida** | `cubic-bezier(0.22, 1, 0.36, 1)` | Toasts, expansiones |
| **Elástica / Spring** | `cubic-bezier(0.25, 1.5, 0.5, 1)` | Tooltips, tags, popovers |
| **Rebote inverso** | `cubic-bezier(0.68, -0.6, 0.32, 1.6)` | Toggles, morphing |
| **Click / Press** | `ease` + `duration: 150ms` | `active:scale-95` en botones |
