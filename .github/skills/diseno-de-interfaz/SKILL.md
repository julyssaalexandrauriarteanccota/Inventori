---
name: diseno-de-interfaz
description: 'Disena interfaces frontend distintivas y profesionales con workflow completo. Use when: frontend design, UI direction, typography system, color palette, motion design, responsive layouts, and avoiding generic AI-looking interfaces.'
argument-hint: 'Describe producto, publico, objetivo visual y stack tecnico (HTML/CSS/JS, React, Vue, Next.js).'
user-invocable: true
---

# Diseno De Interfaz

## Objetivo
Crear interfaces de usuario memorables y funcionales que eviten patrones genericos. El resultado debe combinar una direccion estetica clara con una implementacion tecnica consistente.

## Cuando Usar
- Diseno de landing pages, dashboards o modulos ERP que necesitan identidad visual fuerte.
- Rediseno de pantallas que se ven planas, repetitivas o demasiado "template".
- Implementacion de UI en HTML/CSS/JS, React, Vue o Next.js con foco en calidad visual.
- Casos donde necesitas equilibrar expresividad visual con legibilidad y usabilidad.

## Entradas Minimas
1. Tipo de producto o modulo.
2. Publico objetivo y tono de marca.
3. Restricciones tecnicas (stack, librerias, design system existente).
4. Dispositivo prioritario (desktop, mobile o ambos).

## Procedimiento

1. Define direccion estetica con una intencion clara.
   - Elige una linea dominante: brutalista, maximalista, retrofuturista, editorial, lujosa, ludica o minimalista de alto contraste.
   - Si no se especifica estilo, usa por defecto "editorial industrial" (recomendado para ERP).
   - Resume en una frase: "Esta interfaz debe sentirse ... para ...".

2. Toma decisiones de estilo con branching.
   - Si existe design system activo: preserva su lenguaje base y amplifica diferenciacion en tipografia, ritmo espacial y detalles.
   - Si no existe design system: crea un sistema visual completo desde cero (tokens, escala tipografica, paleta, espaciado, radios, sombras).
   - Si el producto es enterprise/ERP: prioriza jerarquia visual, lectura rapida y estados claros sin perder personalidad.

3. Construye fundamentos visuales primero, no componentes primero.
   - Tipografia: define familia principal y secundaria, escala, pesos, interlineado y contraste.
   - Color: define paleta principal, acentos, neutrales y estados semanticos.
   - Tokens: implementa variables CSS para color, tipografia, spacing, radius, shadow y motion.
   - Composicion: define grilla, ritmo vertical, densidad y reglas de alineacion.

4. Adapta complejidad de implementacion a la direccion estetica.
   - Si la direccion es maximalista/experimental: usa capas, texturas, formas y animaciones con intencion.
   - Si la direccion es minimalista/sobria: usa menos elementos, pero con precision en escala, espaciado y contraste.
   - Mantiene el codigo modular: estructura por secciones y componentes reutilizables.

5. Implementa movimiento con proposito.
   - Incluye solo animaciones utiles: entrada de pantalla, reveals por scroll, transiciones de estado.
   - Controla duraciones y curvas para evitar ruido visual.
   - Verifica rendimiento en dispositivos medios antes de agregar efectos avanzados.

6. Garantiza comportamiento responsive real.
   - Define breakpoints por contenido, no solo por dispositivo.
   - Ajusta tipografia, densidad y jerarquia para mobile y desktop.
   - Verifica navegacion tactil, foco visual y legibilidad de tablas y formularios.

7. Ejecuta chequeo anti-genericidad antes de cerrar.
   - Evita stacks tipograficos sobreutilizados como Inter/Roboto por defecto.
   - Evita gradientes morados genericos y layouts de plantilla repetidos.
   - Elimina bloques visuales intercambiables sin identidad.
   - Confirma que cada decision visual responde al tono del producto.

## Criterios De Calidad
- Direccion estetica explicita y coherente en toda la interfaz.
- Sistema tipografico y cromatico consistente por tokens.
- Jerarquia visual clara para tareas principales.
- Animaciones utiles y no decorativas.
- Experiencia correcta en desktop y mobile.
- Resultado diferenciado, no confundible con una plantilla generica.

## Entregables
- Brief visual corto (direccion, tono, principios).
- Mapa de tokens CSS.
- Estructura de layout y componentes principales.
- Implementacion funcional de UI con codigo ejecutable.
- Lista de validaciones finales (accesibilidad basica, responsive, performance visual).

## Anti-Patrones
- Empezar por componentes sin definir direccion visual.
- Elegir fuentes y colores por costumbre en lugar de estrategia.
- Sobrecargar con efectos sin relacion con el objetivo de producto.
- Repetir layouts predecibles sin variacion de ritmo o composicion.

## Ejemplos De Uso
- /diseno-de-interfaz Dashboard ERP para soporte tecnico con estilo editorial industrial y enfasis en legibilidad.
- /diseno-de-interfaz Landing de alquiler de impresoras para pymes con tono premium sobrio, animaciones suaves y CTA fuertes.
- /diseno-de-interfaz Modulo de inventario mobile-first con visual ludico pero lectura operativa rapida.