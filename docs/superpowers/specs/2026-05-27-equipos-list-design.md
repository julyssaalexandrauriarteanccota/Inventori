# Especificación de Diseño: Renovación Premium de Vista de Equipos

**Fecha:** 2026-05-27  
**Autor:** Antigravity (AI Coding Assistant)  
**Estado:** Aprobado por el usuario  

---

## 1. Contexto y Objetivos

La vista de **Equipos** en el ERP interno actualmente cuenta con funcionalidades de tabla y cuadrícula de tarjetas, pero carece de la consistencia estética, micro-animaciones premium, organización unificada de la barra de herramientas y los flujos de selección inteligente que se acaban de implementar en **Clientes**.

Esta especificación describe los cambios requeridos en la página principal de Equipos para replicar exactamente el patrón visual y funcional de Clientes, garantizando un aspecto de primera clase, interacciones fluidas, transiciones suaves en hover/click y una navegación intuitiva sin alterar el backend ni los modales de detalle/edición/creación.

---

## 2. Cambios Propuestos

Los cambios se concentran en un único archivo principal:
*   [page.tsx](file:///c:/Inventori/apps/web/src/app/(erp)/equipos/page.tsx)

### 2.1 Componente `HighlightedText` (Nuevo Helper)
Añadiremos un componente auxiliar `HighlightedText` para resaltar coincidencias en tiempo real de los términos buscados en la barra de herramientas:
```tsx
interface HighlightedTextProps {
  text: string;
  search: string;
}

function HighlightedText({ text, search }: HighlightedTextProps) {
  if (!search || !search.trim()) return <>{text}</>;
  const escapedSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedSearch})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="rounded bg-[var(--accent)]/18 px-0.5 font-semibold text-foreground dark:bg-[var(--accent)]/24"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
```

### 2.2 Componente `FloatingSelectionBar` (Nuevo Componente)
Incorporaremos una barra de selección flotante fija en la parte inferior de la pantalla para cuando se seleccionan elementos en la vista de cuadrícula de tarjetas (`selectedCards.size > 0`):
*   Muestra el contador total de elementos seleccionados.
*   Incluye botones premium para **Exportar CSV**, **Imprimir Etiquetas** (con su estado de carga) y **Eliminar Definitivo** en lote.
*   Botón para limpiar selección con transiciones fluidas.

### 2.3 Estructura Responsiva de la Barra de Herramientas (Toolbar)
Para evitar saturar la interfaz y que los elementos se desborden en resoluciones de pantalla estándar, la barra de herramientas se divide en dos filas sumamente limpias y responsivas:

1.  **Fila 1 (Buscador y Acciones):**
    *   **Buscador (`ToolbarSearchInput`):** A la izquierda, con un ancho flexible (`sm:w-80 lg:w-96`) para dar máximo espacio al texto de búsqueda.
    *   **Botones de Acción (Filtros, Seleccionar, Vista):** Alineados a la derecha de forma fija. Incluye el Popover de Filtros, el conmutador de selección grupal (que se ilumina de color verde activo) y el selector de modo de vista (Tabla/Tarjetas).
2.  **Fila 2 (Pestañas de Estado Comercial):**
    *   Un contenedor horizontal exclusivo de ancho completo (`w-full`) con soporte de **desplazamiento táctil (scroll horizontal) fluido y sin barras de scroll visibles** (`overflow-x-auto no-scrollbar`).
    *   Cada uno de los 8 estados comerciales cuenta con su icono representativo y un color de fondo dinámico al activarse:
        *   `Todos`: Icono `Monitor` · Color `bg-sky-500`
        *   `Disponible`: Icono `CheckCircle2` · Color `bg-emerald-500`
        *   `Reservado`: Icono `Clock` · Color `bg-blue-500`
        *   `Uso interno`: Icono `Warehouse` · Color `bg-indigo-500`
        *   `Vendido`: Icono `Cpu` · Color `bg-slate-500`
        *   `Alquilado`: Icono `UserRound` · Color `bg-violet-500`
        *   `Reparación`: Icono `Wrench` · Color `bg-amber-500`
        *   `Baja`: Icono `Trash2` · Color `bg-red-500`

### 2.4 Rediseño Premium de `EquipoCard`
*   **Micro-animaciones:** Agregaremos `hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.97] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]` para dar vida a las tarjetas.
*   **Gradiante Lateral:** Añadiremos una barra lateral de 4px con un gradiente correspondiente al estado operativo del equipo:
    *   `ACTIVO`: Gradiente verde (`from-emerald-400 via-emerald-500 to-emerald-600`).
    *   `EN_REPARACION`: Gradiente amarillo/naranja (`from-amber-400 via-amber-500 to-amber-600`).
    *   `BAJA`: Gradiente rojo (`from-red-400 via-red-500 to-red-600`).
*   **Búsqueda Resaltada:** Utilizaremos `HighlightedText` en el número de serie, nombre del producto y la ubicación/destino.
*   **Selección Integrada:** Si `selectionMode` está activo, hacer clic en cualquier parte de la tarjeta activa la selección/deselección de forma intuitiva, con un borde de tono verde esmeralda y anillo brillante en la tarjeta seleccionada.

### 2.5 Mejoras en la Vista Tabla (`ServerDataTable`)
*   Se eliminan textos redundantes.
*   Utilizaremos `HighlightedText` en las columnas clave para una respuesta visual inmediata a la búsqueda.
*   Estilización del menú de acciones para que se integre perfectamente con la estética del ERP.

---

## 3. Plan de Verificación

### 3.1 Pruebas Manuales
1.  **Visuales:**
    *   Verificar que la barra de herramientas quede alineada en una sola fila en escritorio y se acomode limpiamente en dispositivos móviles.
    *   Comprobar las micro-animaciones en hover y active state de las tarjetas.
    *   Verificar los bordes gradientes en las tarjetas según su estado.
2.  **Funcionales:**
    *   Búsqueda: El texto coincide y se resalta en amarillo semitransparente.
    *   Pestañas Rápidas: Cada pestaña muestra los datos del estado comercial correcto y aplica su color distintivo al activarse.
    *   Filtro Popover: Permite filtrar por estado operativo y no interfiere con el estado comercial.
    *   Modo Selección:
        *   En lista: Permite la selección nativa por fila en el DataTable.
        *   En tarjetas: Al dar clic sobre cualquier parte de una tarjeta, se selecciona, cambia el borde a esmeralda y muestra el checkbox activo.
        *   La barra flotante (`FloatingSelectionBar`) aparece al pie de la página con el conteo exacto y realiza las acciones grupales correspondientes (Exportar CSV, Imprimir lote, Eliminar lote).
