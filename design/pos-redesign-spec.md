# Especificación de Diseño: Rediseño Premium del Punto de Venta (POS)

**Fecha**: 2026-05-21  
**Estado**: Aprobado por el usuario  
**Propósito**: Rediseñar la interfaz de usuario del Punto de Venta (POS) para maximizar el espacio útil, integrar accesos clave como el Historial, optimizar las tarjetas de productos haciéndolas altamente visuales y aplicar un filtro estricto de disponibilidad de stock que excluya los servicios y evite la sobreelección en tiempo real.

---

## 1. Objetivos del Rediseño

1. **Optimización del Espacio Vertical**: Eliminar cabeceras redundantes y textos explicativos largos.
2. **Reubicación Inteligente**: Mover el acceso a "Historial" (ventas pasadas) de la cabecera general a la sección del carrito.
3. **Catálogo de Alta Estética**: Implementar una cuadrícula moderna de tarjetas de productos que incluyan imágenes reales o placeholders sofisticados con degradados según su categoría.
4. **Filtro de Stock Estricto en Tiempo Real**:
   * Ocultar por completo productos sin stock físico.
   * Excluir por completo los productos de tipo `SERVICIO` del Punto de Venta.
   * Ocultar dinámicamente del catálogo cualquier producto físico cuya cantidad en el carrito sea igual o superior a su stock actual disponible.

---

## 2. Cambios de Interfaz Propuestos

### 2.1 Cabecera de la Página principal (`apps/web/src/app/(erp)/pos/page.tsx`)
* Se elimina la llamada al componente `<PageHeader>` completo o se reduce a un título `<h1>` compacto.
* **Antes**: Cabecera grande con descripción textual ("Arma el carrito. En el siguiente paso eliges cliente...") y botón de Historial flotante.
* **Ahora**: Un simple contenedor con un título estilizado `h1` que dice `Punto de venta` (font-size: `text-xl font-bold tracking-tight`). Ocupa un espacio vertical mínimo (< 40px) y no tiene subtítulo.
* La franja de alerta de Caja Abierta/Caja Cerrada se mantiene muy delgada e informativa.

### 2.2 Reubicación del Historial
* El botón **Historial** se rediseña como un botón ultra-compacto `outline` con un icono `FileText`.
* Se coloca en el header del Carrito Lateral (`aside`), justo a la izquierda del botón **Vaciar**.
* Esto consolida todas las acciones globales del carrito en un solo panel y limpia la parte superior de la interfaz.

### 2.3 Filtros y Exclusión de Servicios (`apps/web/src/app/(erp)/pos/_components/pos-catalog.tsx`)
* Se elimina por completo el tipo `SERVICIO` de los filtros de chips de categorías.
* Se modifica la consulta o el renderizado del listado para que los productos con `tipo === TipoProducto.SERVICIO` estén excluidos estrictamente.
* Los chips de filtro de tipo de producto serán:
  1. **Todos**
  2. **Equipos**
  3. **Repuestos**
  4. **Insumos**
  5. **Accesorios**

### 2.4 Control Dinámico de Stock en Catálogo
* El catálogo recibe como prop las líneas de carrito actuales o las calcula.
* **Fórmula de visibilidad**:
  * Un producto físico `p` se renderiza en el catálogo **SI Y SOLO SI**:
    * Su stock actual `stockActual > 0` (cuando `manejaInventario === true`).
    * La cantidad del producto agregada en el carrito `cantidadEnCarrito` es **menor** que `stockActual`.
* Al presionar la tarjeta o botón de agregar, si la cantidad en el carrito alcanza el stock disponible, el producto se desvanece de la vista del catálogo inmediatamente. Esto previene de raíz la sobreelección y la consecuente validación de error en la barra lateral.

### 2.5 Tarjeta Premium de Producto (Visual Grid)
* El listado se mantiene en una cuadrícula responsiva (`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4`).
* Cada tarjeta se rediseña para lucir extremadamente moderna y premium:
  * **Aspect Ratio**: Contenedor superior con `aspect-square` o `aspect-[4/3]`, bordes redondeados (`rounded-xl`), y `overflow-hidden`.
  * **Imagen**: Muestra la imagen principal del producto. Si no tiene, se muestra un placeholder con un degradado de color (OKLCH o HSL según las atmósferas del ERP) y un icono central de gran estilo de Lucide (`Laptop` para Equipos, `Wrench` para Repuestos, `Droplet` para Insumos, `Nut` para Accesorios).
  * **Efecto de Hover**: Al pasar el cursor por encima:
    * La imagen hace un zoom suave (`scale-105 duration-300`).
    * El borde de la tarjeta se ilumina con el color principal del tema activo (`border-primary/45`).
    * Una pequeña sombra difuminada y elegante envuelve la tarjeta.
  * **Detalles**:
    * SKU y tipo en una micro-línea con fuente mono-espaciada y badge.
    * Nombre en negrita de tamaño `text-[13px]` limitado a dos líneas (`line-clamp-2`).
    * Fila inferior con el precio formateado en grande (con y sin IGV detallado de forma minimalista) y un badge de stock:
      * Si el stock es > 5: Badge verde.
      * Si el stock es <= 5: Badge naranja/ámbar.

---

## 3. Plan de Verificación

* **Visual**: Validar que la cuadrícula se renderice responsivamente en pantallas móviles, tabletas y de escritorio.
* **Funcional**:
  * Añadir un producto con stock = 1 al carrito. Verificar que el producto desaparece automáticamente del catálogo de `PosCatalog`.
  * Vaciar el carrito y verificar que el producto vuelve a aparecer instantáneamente en el catálogo.
  * Verificar que no hay productos de tipo `SERVICIO` visibles en ningún chip de filtro ni en el listado general del catálogo.
