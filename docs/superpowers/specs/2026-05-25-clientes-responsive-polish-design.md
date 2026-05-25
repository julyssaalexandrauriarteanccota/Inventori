# Diseño de Optimización Responsiva y Pulido Premium para Clientes

Este documento especifica los detalles técnicos de la optimización responsiva, corrección de scroll bloqueado, unificación de paginación en la vista de cuadrícula y distinción cromática premium para el módulo de Clientes en el ERP Inventori.

## 1. Objetivos

* **Corrección de Scroll Bloqueado en Móviles:** Permitir que toda la página fluya de forma vertical en pantallas móviles (`< 768px`) desactivando el bloqueo de altura fija en la tabla y en el contenedor principal.
* **Alineación Inteligente del CTA "Nuevo":** Empujar el botón "+ Nuevo" hacia el extremo derecho en móviles usando flexbox y `ml-auto`, logrando un diseño balanceado e intuitivo.
* **Unificación de Paginación en Vista Cuadrícula:** Reemplazar el pie de página de cuadrícula actual con un panel idéntico al de la vista de tabla, siempre visible si el total es superior a cero, con selector de límite de filas por página y controles estándar.
* **Distinción Cromática de Categorías:** Refactorizar el tono `violet` en `ErpBadge` para que use colores morados/violetas premium y reales, diferenciando visualmente los clientes naturales (morados) de los corporativos (azul/info).
* **Atmósfera Dark Premium:** Añadir focos de luz ambiental trasera difusa para elevar la estética en tema oscuro.

## 2. Cambios Propuestos

### 2.1. Arquitectura y Control de Altura Dinámica (`useIsMobile`)
En [page.tsx](file:///c:/Inventori/apps/web/src/app/(erp)/clientes/page.tsx):
* Se importará `useIsMobile` de `@/hooks/use-mobile`.
* Se llamará al hook dentro de la página: `const isMobile = useIsMobile();`.
* Se actualizará la propiedad `fillAvailableHeight` de `ServerDataTable`:
  ```tsx
  fillAvailableHeight={!isMobile}
  ```
* En móviles, al ser `false`, la tabla no forzará la altura `flex-1` ni ocultará el desborde con `overflow-hidden`. Esto permitirá al scrollbar del shell del ERP manejar la pantalla completa.

### 2.2. Alineación de Cabecera y CTAs
En [page.tsx](file:///c:/Inventori/apps/web/src/app/(erp)/clientes/page.tsx):
* El prop `actionsClassName` de `<PageHeader />` se configurará como `"w-full sm:w-auto"`.
* Se agruparán los controles de la izquierda:
  ```tsx
  <div className="flex items-center gap-2">
    <PageAutoRefreshControl autoRefresh={autoRefresh} />
    <PageActionsMenu items={...} />
  </div>
  ```
* Al botón "+ Nuevo" se le añadirá la clase `ml-auto sm:ml-0` para empujarlo a la derecha en móvil de forma automática.

### 2.3. Paginación Unificada en Vista Cuadrícula
En [page.tsx](file:///c:/Inventori/apps/web/src/app/(erp)/clientes/page.tsx), se importarán los componentes de `Select`:
`import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";`

El bloque de paginación condicional se actualizará para que renderice un pie de página idéntico al de la tabla:
* Contenedor con fondo translúcido: `bg-card/75 backdrop-blur-sm border border-border/70 rounded-xl px-4 py-3 shadow-[0_12px_24px_-34px_rgba(15,23,42,0.38)] mt-6`.
* Selector de filas por página usando el callback `handleLimitChange(Number(value))`.
* Indicadores textuales del rango actual (`(page - 1) * limit + 1` al mínimo de `page * limit` o `visibleTotal`).
* Controles completos de navegación de páginas (Primero, Anterior, Números con Elipsis, Siguiente, Último) usando variantes outline de botones para máxima consistencia visual.

### 2.4. Distinción de Badges de Cliente y Atmósfera Dark
En [erp-badges.tsx](file:///c:/Inventori/apps/web/src/components/erp-badges.tsx):
* El mapeo de `violet` en `erpBadgeToneClassNames` se cambiará de usar `atmosphereToneClassName` a su propia cadena cromática morada/violeta dedicada:
  * Light: `border-violet-200 bg-violet-50 text-violet-700`
  * Dark: `dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-300`

En [page.tsx](file:///c:/Inventori/apps/web/src/app/(erp)/clientes/page.tsx):
* Se inyectará un foco radial decorativo en el fondo de la página de clientes para simular atmósfera premium:
  ```tsx
  <div className="pointer-events-none absolute -z-10 bg-primary/5 blur-[120px] top-0 left-1/4 size-[400px] rounded-full" />
  ```

## 3. Plan de Verificación

* **Pruebas de Compilación:** Ejecución de `pnpm --filter @erp/web type-check` y `pnpm --filter @erp/web build` para asegurar cero errores de compilación y optimización.
* **Verificación Visual:** Ajuste del tamaño del navegador a 320px de ancho para comprobar la perfecta fluidez de las tarjetas, botones agrupados a la izquierda y el botón "+ Nuevo" alineado al borde derecho, así como el scroll vertical impecable y la presencia del pie de paginación responsivo.
