# apps/web

Frontend Next.js del ERP.

## Estado

- Paquete: `@erp/web`
- Stack principal: Next.js `16.2.2` + React `19.2.4`
- Puerto de desarrollo usado por el repo: `3000`
- Routing: App Router
- Build verificada con `pnpm --filter @erp/web build`
- Dependencia compartida: `@erp/shared`

## Estructura de primer nivel

| Ruta | Propósito |
| --- | --- |
| `src/` | Código fuente del frontend |
| `public/` | Assets públicos, iconos y manifest PWA |
| `.next/` | Artefactos locales de Next |
| `node_modules/` | Dependencias locales |
| `package.json` | Scripts y dependencias |
| `next.config.ts` | Configuración de Next, imágenes remotas y Serwist |
| `tsconfig.json` | Configuración TypeScript |
| `vitest.config.ts` | Configuración de Vitest |
| `eslint.config.mjs` | ESLint con presets de Next |
| `components.json` | Configuración shadcn/ui |
| `postcss.config.mjs` | Plugin de Tailwind v4 |
| `AGENTS.md` | Reglas frontend específicas del repo |
| `CLAUDE.md` | Guía complementaria local |

## Comandos

Desde la raíz del repo:

- Desarrollo: `pnpm --filter @erp/web dev`
- Build: `pnpm --filter @erp/web build`
- Start: `pnpm --filter @erp/web start`
- Lint: `pnpm --filter @erp/web lint`
- Type-check: `pnpm --filter @erp/web type-check`
- Tests: `pnpm --filter @erp/web test`
- Tests watch: `pnpm --filter @erp/web test:watch`
- Coverage: `pnpm --filter @erp/web test:cov`

## Configuración principal

### `next.config.ts`

- usa `@serwist/next`
- genera service worker desde `src/app/sw.ts` hacia `public/sw.js`
- desactiva el service worker en desarrollo
- configura `images.remotePatterns` a partir de:
  - `NEXT_PUBLIC_API_URL`
  - `http://localhost:4000/api/v1`
  - `http://127.0.0.1:4000/api/v1`

### `components.json`

- estilo shadcn: `new-york`
- `rsc: true`
- CSS principal: `src/app/globals.css`
- aliases:
  - `@/components`
  - `@/lib`
  - `@/hooks`
  - `@/components/ui`
  - `@/lib/utils`

### `tsconfig.json`

- `strict: true`
- alias `@/* -> ./src/*`
- incluye tipos para Vitest y Testing Library

### `vitest.config.ts`

- entorno `jsdom`
- setup file: `src/test/setup.ts`
- patrón de tests: `src/**/*.{test,spec}.{ts,tsx}`

### `eslint.config.mjs`

- usa `eslint-config-next/core-web-vitals`
- usa `eslint-config-next/typescript`
- ignora `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

## `src/`

| Ruta | Función actual |
| --- | --- |
| `src/app/` | App Router, layouts, páginas, errores y service worker |
| `src/components/` | Shell, auth, formularios, tablas, modales y primitivas UI |
| `src/data/` | Datos locales, actualmente `ubigeo/` |
| `src/hooks/` | Hooks de dominio, auth, sockets, offline y público |
| `src/lib/` | API client, auth storage, navegación, uploads y utilidades |
| `src/test/` | Setup de Vitest |
| `src/_legacy/` | Remanentes legacy |
| `src/proxy.ts` | Guard de navegación del lado Next |

## App Router

### Layout raíz

`src/app/layout.tsx`:

- registra metadata global
- declara `manifest: /manifest.json`
- monta `AtmosphereScript` en `<head>` (preferencia de atmósfera antes de hidratación)
- carga `src/app/globals.css`
- envuelve toda la app con `Providers` (incluye `AtmosphereProvider`)

### Archivos globales

- `src/app/error.tsx`: error boundary global
- `src/app/not-found.tsx`: 404 global
- `src/app/globals.css`: tema y estilos globales
- `src/app/sw.ts`: service worker Serwist
- `src/app/favicon.ico`: favicon

### Route group `(public)`

`src/app/(public)/` contiene:

- `layout.tsx`
- `page.tsx`
- `catalogo/`
- `contacto/`
- `garantia/`
- `ticket/`

Rutas públicas verificadas por build:

- `/`
- `/catalogo`
- `/catalogo/[sku]`
- `/contacto`
- `/garantia`
- `/garantia/[codigoQR]`
- `/ticket`

### Route group `auth`

`src/app/auth/` contiene:

- `layout.tsx`
- `login/page.tsx`
- `signup/page.tsx`
- `forgot-password/page.tsx`
- `cambiar-contrasena/page.tsx`

Rutas verificadas por build:

- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/auth/cambiar-contrasena`

### Route group `(erp)`

`src/app/(erp)/layout.tsx`:

- monta `AuthProvider`
- monta `SocketProvider`
- monta `NavBadgesProvider`
- envuelve el contenido con `ErpShell`
- aplica `AuthGuard` cliente
- redirige según:
  - sesión inexistente -> `/auth/login`
  - `mustChangePassword` -> `/auth/cambiar-contrasena`
  - ruta sin permiso -> `/acceso-denegado`

Archivos del grupo:

- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `[...slug]/page.tsx`
- `acceso-denegado/page.tsx`
- módulos ERP en subcarpetas

Rutas ERP verificadas por build:

- `/dashboard`
- `/clientes`
- `/clientes/[id]`
- `/clientes/[id]/editar`
- `/clientes/nuevo`
- `/productos`
- `/productos/[id]`
- `/productos/[id]/editar`
- `/productos/nuevo`
- `/inventario`
- `/equipos`
- `/equipos/[serie]`
- `/equipos/[serie]/editar`
- `/equipos/nuevo`
- `/compras`
- `/compras/proveedores`
- `/soporte`
- `/soporte/[id]`
- `/soporte/nuevo`
- `/garantias`
- `/reportes`
- `/reportes/ventas`
- `/reportes/inventario`
- `/reportes/soporte`
- `/auditoria`
- `/ventas`
- `/ventas/cotizaciones`
- `/ventas/facturacion`
- `/ventas/rapida`
- `/acceso-denegado`
- `/[...slug]`

### Subárbol POS

`src/app/(erp)/pos/` contiene:

- `layout.tsx`
- `_components/`
- `page.tsx`
- `rapida/page.tsx`
- `caja/page.tsx`
- `comprobantes/page.tsx`
- `historial/page.tsx`

`src/app/(erp)/pos/layout.tsx` monta `CartProvider`.

Rutas POS verificadas por build:

- `/pos`
- `/pos/rapida`
- `/pos/caja`
- `/pos/comprobantes`
- `/pos/historial`

### Catch-all ERP

`src/app/(erp)/[...slug]/page.tsx`:

- usa `getExactErpRoute()`
- muestra `ErpRoutePlaceholder` para rutas registradas pero no implementadas completamente
- llama `notFound()` para rutas no reconocidas
- excluye explícitamente `/dashboard` y `/acceso-denegado`

## Branding y contenido público

El frontend ya tiene una capa base de branding público y las pantallas públicas principales consumen esa configuración para metadata, landing, manifest y contenido visible. Los defaults del rubro actual viven fuera de componentes base.

Estado actual:

- `src/lib/public-branding-types.ts` define la estructura de branding público resuelta
- `src/lib/public-branding-defaults.ts` conserva defaults del rubro actual fuera de componentes base
- `src/lib/public-branding.ts` combina `GET /api/v1/config/empresa/publica` con defaults locales
- `src/hooks/use-public-branding.ts` expone el branding resuelto para componentes cliente

Aplicado en Slice 3:

- metadata raíz y pública se resuelven desde branding público
- `src/app/manifest.ts` genera el manifest PWA desde branding público
- landing raíz, landing pública y páginas públicas de catálogo/contacto/garantía/ticket consumen branding configurable
- el módulo interno `Equipos` usa descripción configurable por rubro resuelto

Estado de cierre de Bloque 1:

- el apartado `Empresa` de configuración ya administra logo, identidad, contacto y contenido público
- fixtures públicas y auxiliares del rubro actual fueron neutralizadas donde correspondía
- las referencias restantes de tóner/SNMP representan feature técnica existente del rubro actual, no copy base

Pendiente recomendado:

- crear una sección administrativa fiscal separada de `Empresa` para consumir los endpoints de `FacturacionController`
- la UI fiscal debe ser solo `ADMIN` y no debe solicitar certificados, claves ni archivos `.p12` hasta que exista diseño de almacenamiento seguro
- ver plan detallado en `docs/handoff-arquitectura-escalable.md`

Referencias:

- `docs/configuracion-empresa-branding.md`
- `docs/auditoria-reventa-hardcoded.md`
- `docs/seguimiento-arquitectura-escalable.md`
- `docs/handoff-arquitectura-escalable.md`

## Autenticación y control de acceso

### `src/proxy.ts`

Este archivo actúa como guard de navegación, no como proxy HTTP hacia el backend.

Comportamiento actual:

- cookie usada: `erp_authenticated`
- deja pasar rutas públicas
- deja pasar rutas auth
- deja pasar assets y `_next`
- permite `/auth/cambiar-contrasena`
- si no hay cookie en rutas protegidas, redirige a `/auth/login?from=<pathname>`
- si ya hay cookie y se entra a login/signup/forgot-password, redirige a `/dashboard`

### `src/lib/auth.ts`

Almacenamiento actual:

- access token en `localStorage` bajo `erp_token`
- refresh token en `localStorage` bajo `erp_refresh_token`
- cookie `erp_authenticated` solo como señal para `proxy.ts`

### `src/components/auth-context.tsx`

Responsabilidades actuales:

- consulta `/auth/me` al iniciar si hay token
- guarda `user` en estado cliente
- expone `login()`, `logout()` y `hasRole()`
- redirige a cambiar contraseña si `mustChangePassword` es `true`
- escucha el evento `auth:expired`

### `src/lib/erp-navigation.ts`

Centraliza:

- navegación ERP visible por rol
- definición de rutas especiales
- control de acceso exacto por ruta
- helpers como:
  - `getNavigationForRole()`
  - `findErpRoute()`
  - `canAccessErpPath()`

### `src/lib/pos-navigation.ts`

Define:

- navegación POS
- roles permitidos (`ADMIN`, `ENCARGADO`)
- ruta por defecto `/pos/rapida`
- salida al ERP principal `/dashboard`

## Providers y shell

### `src/components/providers.tsx`

Monta:

- `AtmosphereProvider`
- `next-themes`
- `QueryClientProvider`
- `TooltipProvider`
- `Toaster`
- `ReactQueryDevtools`

Configuración base de React Query:

- `staleTime`: 5 minutos
- `gcTime`: 24 horas
- `retry`: 1
- `networkMode`: `offlineFirst` en queries y mutations

### `src/components/layout/erp-shell.tsx`

Compone el shell ERP con:

- `SettingsDialogProvider`
- `SidebarProvider`
- `AppSidebar`
- breadcrumb dinámico
- `AppCommand`
- `NotificationCenter`
- `ThemeToggle`
- `OfflineBanner`

### Ajustes

- `src/components/settings-dialog-provider.tsx` carga `SettingsDialog` de forma dinámica
- `src/components/settings-dialog.tsx` centraliza la UI de ajustes internos
- secciones verificadas en la UI de ajustes:
  - preferencias
  - empresa
  - series
  - usuarios
  - almacenes
  - categorías
  - marcas
  - modelos
  - métodos de pago
  - tipos de movimiento
  - unidades de medida
  - cajas

## API client, uploads y hooks

### `src/lib/api.ts`

Comportamiento actual:

- base HTTP: `NEXT_PUBLIC_API_URL` o `http://localhost:4000/api/v1`
- inyecta `Authorization` automáticamente
- intenta refresh en respuestas `401`
- si el refresh falla:
  - limpia tokens
  - emite `auth:expired`
- expone métodos:
  - `get`
  - `post`
  - `patch`
  - `delete`
  - `upload`
- incluye helpers para construir URLs de assets servidos por API

### `src/lib/file-uploads.ts`

- presets de subida:
  - `image`
  - `document`
  - `mixed`
- límite por defecto: `5 MB`
- endpoint por defecto: `/uploads`
- genera `previewUrl` local para imágenes

### `src/hooks/`

El patrón dominante es:

- hooks de dominio con React Query
- consumo de `src/lib/api.ts`
- separación por módulo funcional

Hooks detectados:

- auth: `use-auth.ts`
- caja: `use-caja.ts`
- clientes: `use-clientes.ts`
- compras: `use-compras.ts`
- configuración: `use-configuracion.ts`
- equipos: `use-equipos.ts`
- facturación: `use-facturacion.ts`
- garantías: `use-garantias.ts`
- inventario: `use-inventario.ts`
- productos: `use-productos.ts`
- proveedores: `use-proveedores.ts`
- público: `use-public.ts`
- soporte: `use-soporte.ts`
- ubicaciones: `use-ubicaciones.ts`
- ventas: `use-ventas.ts`
- sockets/offline/utilidades:
  - `use-socket.ts`
  - `use-offline-sync.ts`
  - `use-debounce.ts`
  - `use-mobile.ts`
  - `use-stored-auto-refresh.ts`

### `src/lib/`

Archivos clave detectados:

- `api.ts`
- `auth.ts`
- `erp-navigation.ts`
- `pos-navigation.ts`
- `file-uploads.ts`
- `utils.ts`
- `ubigeo.ts`
- `tipos-movimiento.ts`
- múltiples archivos `*-auto-refresh.ts` por dominio

## PWA, offline y tiempo real

### PWA

- manifest en `public/manifest.json`
- iconos en `public/icons/`
- `start_url`: `/dashboard`
- shortcuts definidos:
  - `Tickets` -> `/soporte`
  - `Dashboard` -> `/dashboard`

### Service worker

- fuente: `src/app/sw.ts`
- salida: `public/sw.js`
- usa `Serwist` con `defaultCache`
- habilita:
  - `skipWaiting`
  - `clientsClaim`
  - `navigationPreload`

### Offline

`src/hooks/use-offline-sync.ts`:

- usa IndexedDB
- base local:
  - `erp-offline`
- store:
  - `queue`
- expone:
  - `enqueue()`
  - `flush()`
  - `clear()`
  - `pendingCount`
  - `isOnline`
- reintenta vaciar la cola al recuperar conexión

### Realtime

`src/hooks/use-socket.ts`:

- usa `socket.io-client`
- fallback de socket: `http://localhost:4000`
- conecta al namespace `/ws`
- guarda notificaciones en memoria
- tope actual: `50`
- integra toasts y `invalidateQueries()`

Eventos manejados actualmente:

- tickets:
  - creación
  - actualización
  - cierre
- inventario:
  - alerta de stock
- facturación:
  - comprobante aceptado
  - comprobante rechazado

## Componentes

### `src/components/`

Subcarpetas detectadas:

- `caja/`
- `charts/`
- `forms/`
- `layout/`
- `location/`
- `modals/`
- `pos/`
- `products/`
- `settings/`
- `tables/`
- `ui/`

### Grupos principales

- auth y sesión:
  - `auth-context.tsx`
  - `login-form.tsx`
  - `signup-form.tsx`
  - `forgot-password-form.tsx`
  - `change-password-form.tsx`
- shell y navegación:
  - `app-sidebar.tsx`
  - `app-command.tsx`
  - `nav-main.tsx`
  - `nav-user.tsx`
  - `sidebar-brand.tsx`
  - `sidebar-footer.tsx`
- shell ERP:
  - `components/layout/erp-shell.tsx`
  - `page-header.tsx`
  - `page-actions-menu.tsx`
  - `toolbar-search-input.tsx`
  - `toolbar-filters-button.tsx`
  - `auto-refresh-control.tsx`
- notificaciones y conectividad:
  - `notification-center.tsx`
  - `offline-banner.tsx`
- datos y formularios:
  - formularios en `components/forms/`
  - tablas en `components/tables/`
  - modales en `components/modals/`
- primitivas UI:
  - `components/ui/` contiene primitivas shadcn como `button`, `dialog`, `select`, `sidebar`, `table`, `tabs`, `tooltip`, `sonner`

## Estilos, tema y personalización visual

### `src/app/globals.css`

Este archivo concentra la mayor parte del sistema visual.

Estado actual verificado:

- usa Tailwind CSS v4 vía `@import "tailwindcss"`
- importa `leaflet/dist/leaflet.css`
- define tokens de color con `@theme`
- redefine superficies y semánticas vía `@theme inline`
- soporta modo oscuro
- soporta sistema de 3 atmósferas vía `data-atmosphere` (`industrial`, `tecnologica`, `comercial`)
- cada atmósfera define: acento OKLCH, luminosidad de fondos, pareja tipográfica, calidez de grises
- aplica overrides visuales a componentes mediante selectores `data-slot`
- soporta modo oscuro con recálculo automático de acento y luminosidad por atmósfera

### Scripts de preferencia visual

- `src/lib/atmosphere.tsx`:
  - `AtmosphereProvider` con React Context + localStorage
  - `AtmosphereScript` aplica `data-atmosphere` antes de la hidratación (previene FOUC)
  - sincroniza preferencia entre pestañas vía `StorageEvent`
  - default: `"industrial"`
  - valores: `"industrial"`, `"tecnologica"`, `"comercial"`

## Datos locales

`src/data/ubigeo/` contiene:

- `departamentos.json`
- `provincias.json`
- `distritos.json`

## Tests

### Configuración

- runner: Vitest
- entorno: `jsdom`
- setup: `src/test/setup.ts`

`src/test/setup.ts` incluye polyfills/mocks para:

- `ResizeObserver`
- `HTMLCanvasElement.getContext`
- `HTMLCanvasElement.toDataURL`
- `window.matchMedia`

### Cobertura detectada

Se detectaron 24 archivos `test/spec` dentro de `src/`.

Áreas con tests visibles:

- páginas públicas
- auth guard
- login
- providers
- notification center
- shell/sidebar
- formularios
- hooks de compras, configuración, offline, soporte y ventas
- utilidades `api`, `erp-navigation`, `tipos-movimiento`, `ubigeo`, `utils`
- tabla server-side

## Assets públicos

`public/` contiene actualmente:

- `manifest.json`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `auth-panel.png`
- assets heredados de plantilla:
  - `next.svg`
  - `vercel.svg`
  - `file.svg`
  - `globe.svg`
  - `window.svg`

## Estado actual del árbol

- el branding público editable desde configuración ya está aplicado en metadata, manifest y pantallas públicas principales
- `src/_legacy/ventas-page-legacy.tsx.bak` sigue presente
- la ruta `/dashboard` activa proviene de `src/app/(erp)/dashboard/page.tsx`
- `src/app/page.module.css` sigue presente y no se detectaron referencias a este archivo en `src/`
- `src/app/page.tsx` y `src/app/(public)/page.tsx` coexisten en el árbol; la build actual expone una sola ruta `/`
- `src/proxy.ts` está activo y la build lo reporta como `Proxy (Middleware)`
