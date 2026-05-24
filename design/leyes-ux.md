# 🧠 Las 12 Leyes Psicológicas del Diseño UX/UI

*Fuente: Soy Dalto*

Fundamentos científicos basados en el comportamiento humano y la ergonomía cognitiva para estructurar interfaces exitosas. Cada ley incluye su aplicación práctica directa al frontend.

> [!NOTE]
> Estas leyes fundamentan las decisiones tomadas en [colores.md](colores.md), [espaciado.md](espaciado.md) y [layouts.md](layouts.md). Consúltalas en conjunto.

> [!TIP]
> **Aplicación en Atmósferas** — Estas leyes UX informan decisiones clave del sistema de atmósferas: la Ley de Jakob justifica los colores semánticos inmutables (rojo=peligro, verde=éxito) que NO cambian entre atmósferas. La Ley de Hick guía la simplicidad del selector de 3 opciones. Ver [atmosferas.md](atmosferas.md).

---

## 📝 Las 12 Leyes Aplicadas al Frontend

### 1. Ley de Pregnancia (Gestalt)
El cerebro humano tiende a simplificar imágenes complejas y busca la estructura más estable y simple posible. **Diseña componentes simétricos y limpios** para reducir el esfuerzo mental del usuario. Evita formas irregulares o asimetrías sin propósito.

### 2. Ley de Hick
El tiempo que toma tomar una decisión **aumenta logarítmicamente** con el número y la complejidad de las opciones. **Reduce las opciones del usuario al mínimo funcional.** Es mejor ofrecer 3 alternativas claras que 9 amontonadas. Aplica esto a menús, filtros y formularios de selección.

### 3. Ley de Tesler (Conservación de la Complejidad)
Todo sistema tiene un nivel de complejidad mínimo que **no se puede simplificar más sin romper su función**. Un formulario de registro necesita saber ciertos datos obligatorios; no puedes eliminarlo todo. Lo que sí puedes hacer es que el frontend **absorba esa carga** de forma intuitiva: pasos guiados, valores predeterminados inteligentes y validación en tiempo real.

### 4. Ley de Proximidad
Los elementos que están cerca entre sí tienden a ser percibidos como un **único grupo**. Usa el espacio en blanco y los cambios sutiles de fondo para clusterizar la información de manera lógica. Nunca dejes que dos bloques no relacionados queden pegados sin separación visual.

### 5. Efecto de Posición de Serie
Los seres humanos recuerdan **drásticamente mejor el primer y el último elemento** de una lista o secuencia. Coloca los elementos más importantes (botones clave, acciones primarias) en los **extremos** de tus menús, barras de herramientas o flujos de navegación.

### 6. Ley de Fitts
El tiempo para alcanzar un objetivo depende del **tamaño del botón** y de su **distancia al cursor/dedo**. Por ergonomía, el movimiento natural del mouse va hacia abajo y a la derecha; en móviles, el pulgar tiene un arco natural hacia la zona inferior. Pon tus **botones de acción principales (CTA) grandes y accesibles** en esa trayectoria visual y física.

### 7. Ley de Parkinson
El usuario expandirá el tiempo de una tarea para ajustarse al tiempo disponible. Diseña interfaces que **empujen al usuario a resolver flujos de forma ágil y directa**: barras de progreso, contadores de tiempo, indicadores de "casi listo" y micro-recompensas visuales al completar un paso.

### 8. Efecto de Aislamiento (Von Restorff)
En un grupo de elementos similares, **el que difiere del resto será el más recordado**. Usa esto estratégicamente: destaca un botón de compra, un plan de suscripción premium o una alerta crítica cambiándole el color, tamaño o forma respecto a los demás elementos del grupo.

### 9. Principio de Pareto (80/20)
El **20 % de tus componentes visuales** (menús de navegación, formularios de conversión, dashboards principales) generan el **80 % de la utilidad y satisfacción** del usuario. Enfoca tus mayores esfuerzos de diseño, rendimiento y pulido en perfeccionar ese 20 % crítico antes de embellecer lo periférico.

### 10. Efecto Zeigarnik
Los usuarios recuerdan **mucho mejor las tareas incompletas** o interrumpidas que las completadas. Uso clave: muestra **barras de progreso visuales**, indicadores de pasos completados y notificaciones de tareas pendientes para generar un gancho psicológico que motive al usuario a regresar y terminar lo que empezó.

### 11. Ley de Miller
La memoria a corto plazo solo puede retener un promedio de **7 ± 2 elementos** a la vez. Si tienes un formulario extenso, **divídelo en pasos** (multi-step wizard) para no abrumar al usuario ni causar el abandono de la página. Lo mismo aplica para menús de navegación: agrupa subitems en categorías.

### 12. Ley de Jakob
Los usuarios pasan la mayor parte del tiempo en **otras aplicaciones**. Esto significa que prefieren que tu sitio funcione exactamente igual a los sitios que ya conocen: el carrito arriba a la derecha, verde para éxito, rojo para error, el logo lleva al inicio, los filtros están a la izquierda. **No reinventes la rueda** a menos que tengas una razón revolucionaria y verificada.
