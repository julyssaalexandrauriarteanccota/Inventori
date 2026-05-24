# 🧱 Los 7 Patrones de Diseño que Usan las Empresas Top de Software

*Fuente: Kole Jain — Modern UI Layouts*

Análisis de los bloques estructurales de las mejores páginas de producto de la industria (Vercel, Linear, Stripe). Estos patrones son la referencia directa para las secciones públicas de Inventori y cualquier landing page o página de producto.

> [!NOTE]
> Para las reglas de **espaciado** dentro de estos layouts, consulta [espaciado.md](espaciado.md). Para la **psicología** detrás de estas decisiones, consulta [leyes-ux.md](leyes-ux.md).

> [!TIP]
> **Compatibilidad con Atmósferas** — Los patrones de layout son agnósticos a la atmósfera activa. Usan variables CSS semánticas (`--bg-surface`, `--accent`, `--text-primary`) que se adaptan automáticamente. Ver [atmosferas.md](atmosferas.md).

---

## 🏛️ Estructuras de Bloques Modernos

### 1. Marquee de Logos con Progressive Blur
Bloques de *social proof* limpios que se deslizan horizontalmente de lado a lado. En los extremos, se aplica un **gradiente con desenfoque progresivo** (`backdrop-blur` + máscara CSS) para desvanecer los logos suavemente en lugar de cortarlos abruptamente.

### 2. Split Layout (Izquierda / Derecha Asimétrico)
Texto masivo y limpio a la izquierda, captura gigante del software a la derecha. El secreto para que no parezca generado por IA es usar una **fuente con mucha personalidad** (Serif o Display) y un **gradiente de fondo ultra sutil** que le dé vida al bloque.

```css
/* Split Layout — mitad visual, mitad contenido */
.split-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
    align-items: center;
    gap: var(--space-8);
}
@media (max-width: 768px) {
    .split-layout { grid-template-columns: 1fr; }
}
/* Tailwind: grid grid-cols-2 min-h-screen items-center gap-8 max-md:grid-cols-1 */
```

### 3. Clickable Multi-Section (Tabuladores con Timer)
Secciones donde el usuario hace clic en pestañas verticales u horizontales y el panel central cambia la pantalla del software mostrada. Opcionalmente, se acompaña de un **temporizador automático** que rota las vistas para que el usuario descubra cada feature sin interacción manual.

### 4. Micro-Animaciones Simples (Smart Animate)
Se rechazan los renders 3D pesados y las animaciones cinematográficas excesivas. Las empresas top usan **transiciones sutiles en hover**: una flecha que se desplaza 4px a la derecha, un icono que rota 15°, un borde que aparece con fade. **Simple y bien pulido** siempre gana sobre complejo y pesado.

### 5. Simple Bento Grid
Cuadrículas limpias basadas en `flexbox` o CSS Grid donde las tarjetas tienen **esquinas muy redondeadas** (`rounded-2xl` o `rounded-3xl`) y algunas contienen elementos ligeramente inclinados o desbordados intencionalmente para **romper la rigidez** del layout sin sacrificar la estructura.

```css
/* Bento Grid — CSS Grid asimétrico */
.bento-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-auto-rows: minmax(180px, auto);
    gap: var(--space-4);
}
.bento-grid .featured {
    grid-column: span 2;
    grid-row: span 2;
}
@media (max-width: 768px) {
    .bento-grid { grid-template-columns: 1fr; }
}
/* Tailwind: grid grid-cols-4 gap-4 [&>.featured]:col-span-2 [&>.featured]:row-span-2 */
```

### 6. Straight Line Grids (Líneas de Rejilla Nítidas)
En lugar de separar bloques con sombras, se usan **líneas divisorias de 1px muy tenues** que cruzan la pantalla horizontal y verticalmente, emulando un plano técnico refinado. Esto genera una estética industrial elegante sin ruido visual.

### 7. Mega-Nav con Imágenes
Los menús desplegables de navegación ya no son solo texto. Incluyen **pequeñas tarjetas visuales** con iconos o previsualizaciones para darle contexto inmediato al usuario antes de hacer clic, reduciendo la carga cognitiva de navegar por un menú extenso.
