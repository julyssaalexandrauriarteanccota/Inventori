# Especificación Técnica: Rediseño Premium de Auditoría y Reportes

Este documento detalla el plan de diseño, los componentes y la arquitectura técnica para reajustar los módulos de **Auditoría** y **Reportes** del ERP, logrando la consistencia premium, dinámica e interactiva establecida en la pantalla de Clientes.

---

## 1. Módulo de Auditoría

El objetivo es transformar la bitácora de auditoría en una interfaz dinámica de doble vista (Lista y Tarjetas) con capacidades de selección avanzadas y una estética visualmente impactante.

### 1.1 Brillos de Fondo Estéticos
Se añadirán tres esferas de brillo absoluto de fondo coordinadas con la paleta de colores oklch:
* **Brillo superior izquierdo**: `bg-indigo-400/8 dark:bg-indigo-500/8 blur-[140px] size-[420px]`
* **Brillo central derecho**: `bg-sky-400/6 dark:bg-sky-500/6 blur-[130px] size-[360px]`
* **Brillo inferior derecho**: `bg-violet-400/5 dark:bg-violet-500/5 blur-[150px] size-[380px]`

### 1.2 Dualidad de Vista (List/Grid)
* **Persistencia**: Se usará la clave de localStorage `VIEW_MODE_STORAGE_KEY = "erp:auditoria:view-mode"` para guardar la preferencia del usuario.
* **Componente de Interfaz**: Se incorporará el componente `ToggleGroup` en la barra de herramientas principal con las opciones de Vista Tabla (`List`) y Vista Tarjeta (`LayoutGrid`), alineado horizontalmente a la derecha junto al botón "Seleccionar".

### 1.3 Vista de Tarjetas Premium (`AuditoriaCard`)
Cada tarjeta de auditoría representará un registro operativo y contará con:
* **Estado de Selección**: Al estar en `selectionMode` y seleccionado, mostrará un checkbox marcado en la esquina superior izquierda, se aplicará un borde iluminado (`border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/70 dark:bg-emerald-500/10`) y una sombra más profunda.
* **Cabecera del Operador**:
  * Un avatar de iniciales (`SI` para Sistema, iniciales del usuario para cuentas registradas).
  * Fondo de color sólido vibrante: Gradiente índigo (`from-indigo-500 to-indigo-600`) para usuarios reales; gris pizarra sólido (`bg-slate-500`) para registros automáticos del sistema.
  * Nombre completo y dirección de correo electrónico del operador (si está disponible) alineados a la derecha del avatar, usando el helper `HighlightedText` para resaltar coincidencias de búsqueda.
* **Insignia de Acción (Acción Badge)**:
  * Insignias con bordes definidos y tonos de fondo semitransparentes u opacos vibrantes según la acción:
    * `CREAR`: Verde Esmeralda (`bg-emerald-500 text-white` o tonos oklch esmeralda sólidos).
    * `ACTUALIZAR`: Azul Cielo (`bg-sky-500 text-white`).
    * `ELIMINAR`: Rojo Carmesí (`bg-red-500 text-white`).
* **Cuerpo de Información**:
  * Nombre del Módulo/Modelo en negrita, limpiando guiones bajos (ej: `auth` o `clientes`).
  * Referencia ID del registro afectado en fuente monoespaciada estilizada de tamaño `xs` con soporte para `HighlightedText`.
* **Pie de Tarjeta**:
  * Fecha y hora formateadas con el helper `formatDateTime` acompañadas de un icono `Calendar` o `Clock` sutil de color `muted-foreground`.
* **Microinteracciones**:
  * Transición de elevación y escala suave al pasar el ratón (`hover:-translate-y-1 hover:scale-[1.015] duration-300`).
  * Animación de entrada escalonada (`animate-fade-up`) con un retardo dinámico calculado (`animationDelay: Math.min(index * 45, 360)`).

### 1.4 Barra de Selección Flotante (`FloatingSelectionBar`)
* **Activación**: Se mostrará únicamente cuando `selectionMode` esté activo y el conjunto de tarjetas seleccionadas (`selectedCards`) tenga al menos 1 elemento.
* **Estilo**: Barra flotante fija centrada en la parte inferior, con bordes ultra redondos, fondo con desenfoque translúcido (`bg-background/95 backdrop-blur-md border border-border/60 shadow-2xl`).
* **Acciones**:
  * Contador numérico dinámico de registros seleccionados.
  * Botón de **Exportar Selección** para descargar solo los registros seleccionados en un archivo CSV formateado.
  * Botón de **Cancelar/Limpiar Selección** para restablecer la selección y ocultar la barra flotante de forma limpia.

### 1.5 Paginador de Tarjetas Anclado
Se implementará el panel de paginación y selección del límite de filas por página en la base del contenedor de cuadrícula, manteniendo el comportamiento del paginador nativo de la tabla para que la experiencia sea fluida y consistente.

---

## 2. Módulo de Reportes

El objetivo es rejuvenecer visualmente el Hub de Reportes para alinearlo a la temática interactiva oklch del ERP.

### 2.1 Pestañas Modernas (`Tabs`)
* Rediseño completo de `TabsList` y `TabsTrigger` en la página raíz `/reportes`.
* Bordes redondeados más amplios (`rounded-2xl` o `rounded-xl`).
* Estados activos destacados mediante gradientes de la marca, escala microscópica en *hover* (`hover:scale-[1.02] active:scale-95`) y sombras vibrantes que denoten foco e interacción real.

### 2.2 Tarjetas KPI Vibrantes y Sólidas (`KpiCard`)
* **Colores de Acento Sólidos**: Modificación de las tarjetas KPI en la pestaña de **Resumen** para usar combinaciones de colores sólidos modernos, erradicando los tonos pálidos y aburridos:
  * **Ventas del mes**: Icono y contorno basados en un verde esmeralda premium con brillo.
  * **Tickets abiertos**: Tema ámbar/naranja vibrante y cálido.
  * **Alertas de stock**: Alerta en rojo intenso con una animación de pulso ultra-sutil en el icono cuando hay existencias críticas.
  * **Clientes nuevos**: Azul cobalto/índigo de alta visibilidad para denotar crecimiento.
* **Efecto de Brillo Interno**: Inclusión de un fondo sutil con brillo degradado interactivo en hover que resalte el valor de la métrica.
* **Consistencia**: Garantizar que los mismos patrones y refinamientos visuales se propaguen a las pestañas de **Ventas**, **Inventario** y **Soporte**.

---

## 3. Plan de Verificación

* **Visual**: Validar que la interfaz se adapte perfectamente tanto a pantallas de teléfonos móviles (un solo bloque vertical, menús colapsados, barra inferior) como a monitores ultraanchos (rejillas perfectas de 4 columnas, espaciados estables).
* **Funcional**:
  * El cambio de vista debe guardarse instantáneamente en `localStorage` y recuperarse al refrescar la página.
  * La barra de selección flotante debe aparecer/desaparecer dinámicamente con transiciones fluidas.
  * La exportación selectiva a CSV debe generar un archivo con exactamente los registros seleccionados.
  * Las pestañas del Hub de Reportes deben responder fluidamente al hacer clic y cambiar los parámetros de la URL sin recargar completamente el sitio.
