# Especificación de Diseño: Ficha de Producto en Sheet Lateral (Drawer)

## Contexto y Objetivo
Actualmente, el registro de nuevos productos se realiza en una página dedicada (`/productos/nuevo`). Esto interrumpe el flujo de trabajo del usuario cuando se encuentra en la pantalla de catálogo (`/productos`) o en otros módulos del sistema como Ventas, Compras o Soporte.

El objetivo es trasladar este flujo a un **Sheet Lateral (Slide-over panel)** reutilizable y sumamente pulido que envuelva el componente `<ProductoForm>`. Esto permitirá a los usuarios agregar productos "en caliente" sin perder su contexto de navegación activa.

---

## Decisiones de Arquitectura y UX

### 1. Primitiva de Visualización (Sheet)
Se utilizará la primitiva `@/components/ui/sheet` (de shadcn/ui) con el fin de proporcionar un cajón que se deslice desde el extremo derecho de la pantalla, ocupando el 100% de la altura vertical disponible.
* **Justificación**: El formulario de producto (`ProductoForm`) es muy denso, con carga de múltiples imágenes, campos dinámicos de atributos y selección de categorías/almacenes. Un modal centrado obligaría al usuario a realizar scroll excesivo y reduciría el espacio visual cómodo.

### 2. Guardia de Seguridad (Intercepción de Cierre Accidental)
* **El Problema**: Las hojas laterales suelen cerrarse por defecto al presionar `ESC` o al hacer clic sobre el fondo oscurecido (overlay). Si el usuario ha redactado campos del formulario, esto causaría la pérdida accidental de datos.
* **La Solución**:
  * Utilizaremos el estado `isDirty` provisto por `ProductoForm` a través del callback `onDirtyChange`.
  * Escucharemos los eventos de intento de cierre del Sheet (`onInteractOutside` y `onEscapeKeyDown` en el Content de Radix UI / shadcn).
  * Si `isDirty` es verdadero, cancelaremos el cierre automático y mostraremos un `AlertDialog` clásico de confirmación ("¿Descartar cambios?"). Si el usuario confirma, el Sheet se cierra. De lo contrario, se mantiene abierto.

---

## Componentes a Modificar / Crear

### 1. `[NEW]` [producto-create-sheet.tsx](file:///c:/Inventori/apps/web/src/components/sheets/producto-create-sheet.tsx)
Un componente controlador que expone el Sheet.

```typescript
interface ProductoCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (producto: any) => void;
  lockedTipo?: TipoProducto;
}
```

* Renderiza `<Sheet>` y su respectivo `<SheetContent className="w-full sm:max-w-2xl overflow-y-auto">`.
* Incrusta `<ProductoForm>` en modo `"create"`.
* Mantiene un estado interno `isDirty: boolean` actualizado mediante el callback `onDirtyChange`.
* Muestra un `<AlertDialog>` si se intenta cerrar el Sheet con cambios sin guardar.

### 2. `[MODIFY]` [page.tsx](file:///c:/Inventori/apps/web/src/app/(erp)/productos/page.tsx)
* Integra el estado local `createSheetOpen: boolean`.
* Reemplaza la acción del CTA "Nuevo producto" (`router.push('/productos/nuevo')`) por la apertura del Sheet (`setCreateSheetOpen(true)`).
* Inyecta el componente `<ProductoCreateSheet>` en la base del DOM del listado.
* El callback `onSuccess` del Sheet ejecutará la función `refetch()` de TanStack Query para refrescar la tabla al instante.

### 3. `[MODIFY]` [page.tsx](file:///c:/Inventori/apps/web/src/app/(erp)/productos/nuevo/page.tsx)
Para asegurar compatibilidad con enlaces anteriores y marcadores del navegador:
* Redirecciona al usuario inmediatamente a `/productos` mediante `router.replace('/productos?nuevo=true')`.
* En la página de `/productos`, capturaremos el query param `?nuevo=true` en un `useEffect` para activar el Sheet de forma automática en la carga de la página.

---

## Plan de Verificación

### Verificación Manual
1. **Flujo de Apertura**: Hacer clic en el botón "Nuevo producto" en la tabla y verificar que el Sheet lateral se desliza suavemente desde la derecha.
2. **Auto-Cierre Limpio**: Si el formulario no ha sido editado, hacer clic fuera del panel o presionar `ESC` debe cerrar el panel instantáneamente.
3. **Guardia Activa**: Llenar cualquier campo (ej. nombre del producto), hacer clic fuera del panel. Comprobar que aparece el diálogo "¿Descartar cambios?".
4. **Refresco de Datos**: Registrar un producto completo. Verificar que tras guardar exitosamente, la lista del catálogo se actualiza automáticamente con el nuevo registro.
5. **Redirección**: Navegar directamente a `/productos/nuevo` y comprobar que el sistema nos lleva de inmediato a `/productos` con el Sheet abierto automáticamente.
