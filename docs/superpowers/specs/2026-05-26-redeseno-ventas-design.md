# Diseño: Rediseño Responsivo y Premium del Historial de Ventas

Este documento define la especificación técnica y de diseño para la optimización visual, accesibilidad móvil e iconografía premium del Historial de Ventas del ERP, alineando la interfaz con los estándares implementados en el módulo de Clientes.

---

## 🎨 Principios Visuales y Tematización

Guiado por la atmósfera activa (Industrial, Tecnológica, Comercial) y el modo de luz (claro/oscuro), el módulo de Ventas incorporará los siguientes elementos:

1. **Decorative backing glows:**
   Añadir dos capas difuminadas absolutas con efecto de elevación para el modo oscuro/claro:
   - Glow superior izquierdo: `bg-primary/5 blur-[120px] top-0 left-1/4 size-[400px]`
   - Glow inferior derecho: `bg-violet-500/5 blur-[130px] bottom-1/4 right-1/4 size-[380px]`
2. **Espaciado y Grillas:**
   - Contenedor raíz con `gap-6` (`flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0`).
   - Reemplazar las clases de rejillas para que las estadísticas y las tarjetas sean responsivas desde resoluciones pequeñas (`grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4`).
3. **Modos de Vista (List vs. Grid):**
   - Incorporar un selector de modo de vista a la derecha del toolbar (`ToggleGroup` de shadcn con los iconos `List` y `LayoutGrid`).
   - Persistir la selección en `localStorage` usando la clave `"erp:ventas:view-mode"`.

---

## 🧱 Componentes a Desarrollar/Modificar

### 1. `VentaCard` (Nuevo Componente)
Se diseñará una tarjeta premium para la vista Grid (`viewMode === "grid"`) y pantallas móviles, estructurada de la siguiente manera:
- **Cabecera:**
  - Avatar con las iniciales del cliente en `bg-accent-soft` y texto `text-accent`.
  - Código correlativo de la venta en tipografía mono (`V001-000234`).
  - Indicador temporal ("Hace 15m", "Ayer, 4:10 pm") en la esquina derecha.
- **Badges de Estado:**
  - Fila de badges que contiene: `EstadoVenta` (Reservada, Confirmada, Entregada, Cancelada) y `EstadoFacturacionVenta` (Sin comprobante, Emitida, Rechazada, etc.), con círculos de color OKLCH y bordes adaptados.
- **Detalle de la Operación (Punteado):**
  - Contenedor con borde superior punteado (`border-t border-dashed`) que muestra el Método de Pago y el nombre del Vendedor.
- **Pie de Tarjeta:**
  - Valor total formateado (`S/ 1,250.00`) con tipografía display (`font-display font-bold text-[14px] text-primary`).
  - Botón "Detalles" (con icono `Eye`) y botón "Emitir CPE" (con icono `Receipt`) cuando corresponda.

### 2. `FloatingSelectionBar` (Nuevo Componente)
Se implementará una barra de selección flotante en la parte inferior de la pantalla cuando el usuario active el modo de selección:
- **Contenedor:** Esquinas redondeadas `rounded-2xl`, borde sutil, fondo con desenfoque `backdrop-blur-md bg-background/95`, y sombra profunda `shadow-2xl`.
- **Acciones:**
  - Contador de filas seleccionadas con burbuja en color de acento.
  - Botón de exportación masiva a CSV.
  - Botón de cancelación de selección.

### 3. Modales y Hojas de Detalle (`VentaDetailSheet`)
- **Modales de Diálogo (Anulación y Eliminación):**
  - Reemplazar el estilo básico de los modales de diálogo (`DialogContent`) con bordes redondeados `rounded-2xl`.
  - Añadir un contenedor de icono premium en la parte superior izquierda (`bg-destructive/10` para anulación/eliminación) y los iconos correspondientes (`XCircle` y `Trash2`).
- **Hoja de Detalle (`VentaDetailSheet`):**
  - Optimizar la presentación de la información en bloques limpios e independientes.
  - Usar la grilla responsiva `sm:grid-cols-2 lg:grid-cols-4` para la información general (Fecha, Vendedor, Método de Pago, Descuento).
  - Unificar las acciones de impresión (A4 y Ticket) y añadir iconos a los botones de visualización.

---

## 🧪 Plan de Verificación

### Pruebas Manuales
1. **Responsividad:** Reducir la pantalla a anchos móviles (p. ej. 360px, 412px) y verificar que las estadísticas de ventas y las tarjetas se apilan correctamente y no desbordan la pantalla.
2. **Alternancia de Vistas:** Hacer click en el selector de modo de vista (Tabla / Tarjetas) y validar que el cambio sea instantáneo. Recargar la página y verificar que se mantenga el modo de vista previamente seleccionado.
3. **Selección Masiva:** Activar el modo de selección en tarjetas y en tabla. Verificar que la barra flotante aparezca y que el botón de exportar genere un archivo CSV con las filas seleccionadas.
4. **Estados Visuales:** Validar que los botones y los ítems del menú tengan transiciones suaves (`duration-300`) y microanimaciones de escala (`active:scale-95`).
