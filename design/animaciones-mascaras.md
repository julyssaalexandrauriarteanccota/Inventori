# 🍔 Mecánicas Avanzadas: Máscaras de Capas y Curvas de Rebote Inverso

Este manual regula la maquetación a nivel de código de animaciones fluidas basadas en enmascaramientos y deformaciones geométricas directas en el frontend. Estos componentes elevan la percepción de calidad de la interfaz al nivel de productos como Linear, Vercel o Stripe.

> [!NOTE]
> Para el catálogo completo de **11 microanimaciones**, consulta [microanimaciones.md](microanimaciones.md). Para la **referencia rápida de curvas CSS**, consulta la tabla al final de ese mismo archivo.

---

## 🛠️ Los 2 Componentes Maestros

### 1. El Interruptor Toggle con Texto Enmascarado en Movimiento

*   **Qué hace:** Un botón interruptor deslizante de dos estados (ON/OFF). Al cambiar de estado, la palabra "OFF" se desliza verticalmente hacia abajo volviéndose invisible y la palabra "ON" desciende desde el tope interno para centrarse. El fondo completo del componente transmuta de un gris neutro a un gradiente vivo de forma sutil.

#### Forma y Tamaños Exactos

| Elemento | Dimensión | Valor |
| :--- | :--- | :---: |
| Contenedor cápsula | Ancho | `300px` |
| Contenedor cápsula | Alto | `120px` |
| Contenedor cápsula | Border-radius | `50px` |
| Círculo deslizante | Diámetro | `80px` |
| Círculo deslizante | Margen lateral | `30px` |


#### Lógica de Programación Frontend (Overflow Masking)

El círculo blanco interno actúa como una **máscara física de recorte** (`overflow: hidden`). Los elementos de texto están dentro de este círculo. Al salirse de los límites geométricos de la circunferencia, el navegador los oculta automáticamente.

**La Curva del Rebote (Ease-In-Out Back):** Para romper la rigidez lineal de las IAs, aplica una curva elástica que sobrepase los límites antes de encajar en su posición final:

```css
.custom-toggle {
    width: 300px;
    height: 120px;
    border-radius: 50px;
    background: oklch(0.85 0 0);
    position: relative;
    cursor: pointer;
    transition: background 850ms cubic-bezier(0.68, -0.6, 0.32, 1.6);
}

.custom-toggle.is-on {
    background: linear-gradient(135deg, oklch(0.65 0.2 250), oklch(0.55 0.18 280));
}

.custom-toggle .knob {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: white;
    position: absolute;
    top: 50%;
    left: 30px;
    transform: translateY(-50%);
    overflow: hidden; /* ← MÁSCARA: todo lo que salga del círculo es invisible */
    transition: all 850ms cubic-bezier(0.68, -0.6, 0.32, 1.6);
}

.custom-toggle.is-on .knob {
    left: calc(100% - 80px - 30px); /* desplaza al extremo derecho */
}

/* Texto enmascarado dentro del knob */
.custom-toggle .knob .text-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200%; /* el doble para que ON y OFF quepan apilados */
    transition: transform 850ms cubic-bezier(0.68, -0.6, 0.32, 1.6);
}

.custom-toggle.is-on .knob .text-stack {
    transform: translateY(-50%); /* sube: OFF sale, ON entra */
}
```

> [!IMPORTANT]
> La curva `cubic-bezier(0.68, -0.6, 0.32, 1.6)` es una **Ease In Out Back hiper-enfatizada a 45 grados**. Los valores negativos y superiores a 1 hacen que la animación sobrepase su destino antes de asentarse, creando el efecto elástico que separa un producto premium de uno genérico.

---

### 2. Morfosis de Menú Hamburguesa a Cierre (X) con Expansión de Contenedor

*   **Qué hace:** El clásico icono de tres líneas horizontales se transforma orgánicamente en una "X" de cierre, mientras que el contenedor exterior muta su geometría de cuadrado a círculo.

#### Forma y Tamaños Exactos

| Elemento | Dimensión | Valor |
| :--- | :--- | :---: |
| Contenedor cuadrado | Ancho × Alto | `200px × 200px` |
| Contenedor cuadrado | Border-radius (cerrado) | `20px` |
| Contenedor cuadrado | Border-radius (abierto) | `50%` (círculo) |
| Líneas del menú | Grosor | `7px` |
| Líneas del menú | Longitud | `80px` |
| Líneas del menú | Terminaciones | `border-radius: 9999px` |

#### Lógica de Programación Frontend

La transformación ocurre en tres movimientos simultáneos:

1.  **Línea Central:** Al hacer clic (estado `is-open`), cambia su opacidad a cero de inmediato (`opacity: 0`), desapareciendo del flujo visual.
2.  **Líneas Superior e Inferior:** Sufren una rotación simétrica cruzada de 45° (`rotate(45deg)` y `rotate(-45deg)`) y se trasladan verticalmente mediante CSS para colisionar en el centro exacto del contenedor.
3.  **El Contenedor Exterior (Morfosis Circular):** Al mismo tiempo que las líneas rotan, el contenedor cuadrado eleva su `border-radius` de `20px` a `50%`, transformándose en un círculo perfecto.

```css
.hamburger-container {
    width: 200px;
    height: 200px;
    border-radius: 20px;
    background: oklch(0.15 0 0);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: pointer;
    transition: border-radius 500ms cubic-bezier(0.68, -0.6, 0.32, 1.6);
}

.hamburger-container.is-open {
    border-radius: 50%; /* cuadrado → círculo */
}

.hamburger-line {
    width: 80px;
    height: 7px;
    background: white;
    border-radius: 9999px;
    transition: all 500ms cubic-bezier(0.68, -0.6, 0.32, 1.6);
}

/* Línea central: desaparece */
.hamburger-container.is-open .hamburger-line:nth-child(2) {
    opacity: 0;
}

/* Línea superior: rota 45° y baja al centro */
.hamburger-container.is-open .hamburger-line:nth-child(1) {
    transform: translateY(19px) rotate(45deg);
    /* 19px = gap(12px) + half-height(3.5px) + ajuste fino */
}

/* Línea inferior: rota -45° y sube al centro */
.hamburger-container.is-open .hamburger-line:nth-child(3) {
    transform: translateY(-19px) rotate(-45deg);
}
```

```js
// Toggle en JavaScript
const container = document.querySelector('.hamburger-container');
container.addEventListener('click', () => {
    container.classList.toggle('is-open');
});
```

---

## 📋 Principios de Enmascaramiento Aplicados

| Principio | Técnica CSS | Cuándo Usarlo |
| :--- | :--- | :--- |
| **Overflow Masking** | `overflow: hidden` en el padre | Texto que entra/sale de un contenedor circular o rectangular |
| **Clip-path** | `clip-path: circle(...)` o `polygon(...)` | Formas de recorte complejas que `overflow` no puede lograr |
| **Opacity Masking** | `opacity: 0` + `pointer-events: none` | Ocultar sin remover del DOM (preserva layout y transiciones) |
| **Transform Origin** | `transform-origin: center` | Rotaciones que deben girar sobre su propio centro |

> [!TIP]
> Todas las curvas de rebote usadas en este documento están documentadas en la **tabla de referencia rápida** al final de [microanimaciones.md](microanimaciones.md).
