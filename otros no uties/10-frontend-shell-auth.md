# Sprint 10 - Shell ERP y autenticacion frontend

- Estado: COMPLETADO
- Fase: Frontend ERP
- Depende de: 01
- Desbloquea: 11, 12, 14, 16

## Objetivo

Levantar el ERP visual: login, layout base, navegacion, manejo de sesion y
componentes reutilizables para el resto de pantallas.

## Tablas y contratos consumidos por este sprint

- `Usuario`
- `RefreshToken`
- contratos de `auth/login`, `auth/refresh` y `auth/me`

## Reglas AGENTS criticas para este sprint

- [x] Server Components por defecto
  > El layout ERP y las pages usan `'use client'` solo donde es necesario
    (layout, login, auth guard). Componentes de UI en `components/ui/` no
    marcan `'use client'`.
- [x] TanStack Query para fetching en client components
  > Hooks en `hooks/use-configuracion.ts`, `hooks/use-clientes.ts`, etc.
    usan `useQuery`/`useMutation` de `@tanstack/react-query`.
- [x] Formularios con `react-hook-form` + Zod + `@erp/shared`
  > Login usa `react-hook-form` + `zodResolver` + `loginRequestSchema`
    de `@erp/shared`. Patron replicado en 13+ formularios.
- [x] No modificar `components/ui/`
  > 29 componentes shadcn intactos en `components/ui/`.
- [x] El ERP vive dentro de `app/(erp)` y el login en `app/auth/login`
  > Confirmado: `app/(erp)/layout.tsx` con AuthGuard,
    `app/auth/login/page.tsx` para login.

## Checklist de implementacion

### Frontend - `apps/web`

- [x] Completar cliente base en `lib/api.ts`
  > `ApiError` class, metodos GET/POST/PATCH/DELETE tipados, base URL via
    `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api/v1`),
    opcion `skipAuth` para login.
- [x] Consumir handoff del Sprint 01 (OpenAPI auth + ejemplos + catalogo de errores + matriz de permisos)
  > Contrato OpenAPI en `docs/contracts/sprint-01-openapi.json`. El
    cliente consume exactamente los endpoints documentados.
- [x] Manejar JWT y refresh automaticamente
  > `lib/api.ts` intercepta 401, llama `POST /auth/refresh`, reintenta
    con nuevo token. Previene refreshes multiples con flag
    `isRefreshing`. Al fallar refresh emite evento `auth:expired`.
- [x] Completar `lib/auth.ts` o `hooks/use-auth.ts` como estado central de sesion
  > 3 archivos cooperan:
    - `lib/auth.ts` — storage (localStorage: `erp_token`,
      `erp_refresh_token`, cookie `erp_authenticated`)
    - `components/auth-context.tsx` — React Context con `AuthProvider`
      (`login`, `logout`, `hasRole`, carga inicial via `/auth/me`,
      listener `auth:expired`, redirect a cambiar contrasena si
      `mustChangePassword`)
    - `hooks/use-auth.ts` — hook consumidor del contexto
- [x] Crear `app/auth/login/page.tsx`
  > Formulario con `react-hook-form` + `zodResolver` +
    `loginRequestSchema` de `@erp/shared`. Toggle visibilidad de
    contrasena, manejo de errores con AlertCircle, links a
    forgot-password y signup. Envuelto en `AuthProvider`.
- [x] Completar `app/(erp)/layout.tsx`
  > `ErpLayout` → `AuthProvider` → `ErpShell` → `AuthGuard` +
    `SidebarProvider` + `AppSidebar` + header con breadcrumbs,
    `AppCommand`, `ThemeToggle`. Main con flex layout.
- [x] Crear `components/layout/Sidebar.tsx`
  > **Nota de implementacion:** no existe `components/layout/Sidebar.tsx`
    como archivo separado. El sidebar se implemento con la estructura de
    shadcn: `components/app-sidebar.tsx` (sidebar principal),
    `components/nav-main.tsx` (items de navegacion),
    `components/nav-user.tsx` (dropdown de usuario). El directorio
    `components/layout/` existe pero esta vacio. Funcionalmente completo.
- [x] Crear `components/layout/Header.tsx`
  > **Nota de implementacion:** no existe `components/layout/Header.tsx`
    como archivo separado. El header esta inline en
    `app/(erp)/layout.tsx` linea 153: `<header>` con SidebarTrigger,
    Separator, DynamicBreadcrumb, AppCommand y ThemeToggle.
    Funcionalmente completo.
- [x] Redirigir si no hay sesion
  > `AuthGuard` en `app/(erp)/layout.tsx`:
    - Sin sesion → `router.replace('/auth/login')`
    - `mustChangePassword` → `router.replace('/auth/cambiar-contrasena')`
    - Ruta no autorizada → `router.replace('/acceso-denegado')`
- [x] Confirmar componentes base de UI y formularios
  > 29 componentes en `components/ui/` (button, card, dialog, input,
    select, table, form, badge, avatar, sidebar, etc.). `field.tsx` como
    wrapper de react-hook-form. 13 formularios en `components/forms/`.
- [x] Crear `components/tables/DataTable.tsx`
  > Dos variantes:
    - `DataTable.tsx` — client-side con TanStack React Table, sorting,
      filtering, pagination, search, skeleton loading, empty state.
    - `ServerDataTable.tsx` — server-side pagination con props `total`,
      `page`, `limit`, `onPageChange`.
- [x] Implementar navegacion condicional por rol: items del menu visibles segun `ADMIN`, `ENCARGADO` o `TECNICO`
  > `lib/erp-navigation.ts` define 11 modulos con roles asignados.
    `getNavigationForRole(rol)` filtra items. `canAccessErpPath(path,rol)`
    valida acceso. `AppSidebar` consume esto para renderizar solo items
    permitidos. Boton "Configuracion" solo visible para ADMIN.
- [x] Crear pagina `app/not-found.tsx` (404)
  > Pagina completa con numero "404", mensaje en espanol, links a
    dashboard y home.
- [x] Crear pagina de acceso denegado (403) para cuando el rol no tiene permiso
  > `app/(erp)/acceso-denegado/page.tsx` con icono ShieldX, mensaje
    "Tu rol no tiene permisos...", link a dashboard.
- [x] Estados de carga, error y vacio
  > - **Carga:** AuthGuard muestra spinner animado; DataTable muestra
      skeletons; formularios desactivan submit con "Guardando...".
    - **Vacio:** DataTable muestra empty state con icono.
    - **Error:** Login muestra mensaje con AlertCircle; API client lanza
      `ApiError` tipado.
  > **Pendiente:** No existen archivos `error.tsx` (error boundary de
    Next.js) ni a nivel `app/` ni `app/(erp)/`. Ante un error de runtime
    no capturado, Next.js mostrara su error overlay generico en
    desarrollo y una pagina blanca en produccion. **Se recomienda crear
    `app/error.tsx` y `app/(erp)/error.tsx`.**

### Backend - soporte al frontend

- [x] Confirmar contrato de login, refresh y `me`
  > 9 endpoints en auth controller: login, register, refresh, logout,
    logout-all, me, forgot-password, reset-password, change-password.
    Todos con DTOs tipados y class-validator. Rate-limited.
- [x] Confirmar codigos de error y shape de respuesta
  > Global exception filter normaliza a
    `{ error: { code, message, statusCode } }`. Codigos auth:
    UNAUTHORIZED (401), CONFLICT (409), BAD_REQUEST (400).
- [x] Corregir cualquier desvio entre implementacion real y handoff publicado en Sprint 01 antes de cerrar sprint
  > Sprint 01 marcado como COMPLETADO. OpenAPI publicado en
    `docs/contracts/sprint-01-openapi.json`. Sin desvios detectados
    entre contrato y codigo actual.

### Shared - `packages/shared`

- [x] Exportar esquemas o tipos usados por auth y tablas basicas
  > Exporta via `packages/shared/src/index.ts`:
    - Enums: `RolUsuario` (ADMIN, ENCARGADO, TECNICO)
    - Schemas Zod: `loginRequestSchema`, `registerRequestSchema`,
      `authResponseSchema`, `authUserSchema`, `changePasswordRequestSchema`
    - Types: `JwtPayload`, `LoginRequest`, `LoginResponse`, `AuthResponse`,
      `AuthUser`, `RefreshRequest`, `RefreshResponse`,
      `ForgotPasswordRequest`, `ResetPasswordRequest`,
      `ChangePasswordRequest`, `CurrentUserProfile`

### Testing

- [x] Tests de login page
  > `components/login-form.test.tsx` — 3 tests:
    envia credenciales, muestra error de backend, toggle visibilidad
    password.
- [x] Tests de shell ERP con sesion y sin sesion
  > `components/auth-guard.test.tsx` — 4 tests:
    spinner durante carga, redirect a login sin sesion, renderiza
    children con sesion, redirect a cambiar-contrasena si
    mustChangePassword.
  > `components/shell-sidebar.test.tsx` — 8 tests:
    AppSidebar: items filtrados ADMIN (3 items), items TECNICO (2 items),
    boton Configuracion visible solo ADMIN.
    NavUser: nombre+rol, iniciales avatar, label por rol, null sin user.
  > `lib/erp-navigation.test.ts` — 5 tests adicionales de logica pura.
- [x] Tests del cliente API con refresh
  > `lib/api.test.ts` — 2 tests:
    reintenta con nuevo token tras refresh exitoso, limpia sesion y
    emite evento cuando refresh falla.

## Checklist de cierre

- [x] Se puede iniciar sesion desde frontend
  > Login funcional con formulario validado, errores visibles, tokens
    almacenados, redireccion a dashboard.
- [x] El shell ERP muestra usuario y rol
  > `NavUser` muestra avatar con iniciales, nombre completo, label de
    rol (Administrador/Encargado/Tecnico) en el sidebar dropdown.
- [x] La navegacion base funciona en desktop y mobile
  > SidebarProvider con collapsible sidebar. SidebarTrigger en header
    para mobile. Layout responsive con min-w-0 para overflow.
- [x] La navegacion respeta el rol del usuario logueado
  > `getNavigationForRole(rol)` filtra items del sidebar.
    `canAccessErpPath()` en AuthGuard bloquea rutas no autorizadas.
    5 tests unitarios confirman la logica.
- [x] Las paginas 404 y 403 funcionan correctamente
  > `app/not-found.tsx` (404) y `app/(erp)/acceso-denegado/page.tsx`
    (403) ambas implementadas con UI profesional.
- [x] El frontend auth usa contrato versionado de Sprint 01 sin endpoints inventados
  > Todos los endpoints consumidos existen en el OpenAPI del Sprint 01.
    Schemas compartidos via `@erp/shared`.
- [x] Quedo lista la base visual para los modulos
  > Shell completo (sidebar, header, breadcrumbs, command palette,
    theme toggle). DataTable (client + server). 29 componentes UI.
    13 formularios. Patron replicable para nuevos modulos.
- [x] Los contratos de autenticacion del sprint quedaron cubiertos
  > Login, refresh, me, logout, change-password, forgot-password,
    reset-password — todos consumidos y tipados.

## Resumen de auditoria (2025-04-20)

### Estado general: COMPLETO

**Implementacion funcional:** Todos los items del checklist estan
implementados y funcionan. El shell ERP es operativo con autenticacion
completa, navegacion por rol, y base visual lista para modulos.

**Completado en segunda pasada:**
- Error boundaries: `app/error.tsx` y `app/(erp)/error.tsx`
- Loading page: `app/(erp)/loading.tsx`
- Tests de shell: `auth-guard.test.tsx` (4 tests) y `shell-sidebar.test.tsx` (8 tests)

### Nota menor

- El directorio `components/layout/` esta vacio. Sidebar y Header se
  implementaron en `app-sidebar.tsx` y inline en `layout.tsx`
  respectivamente, siguiendo la convencion shadcn. Se puede eliminar el
  directorio vacio en una limpieza futura.

### Archivos clave del sprint

| Archivo | Lineas | Rol |
|---------|--------|-----|
| `lib/api.ts` | ~120 | Cliente HTTP con JWT + auto-refresh |
| `lib/auth.ts` | ~30 | Storage de tokens (localStorage) |
| `components/auth-context.tsx` | ~100 | AuthProvider (Context + estado sesion) |
| `hooks/use-auth.ts` | ~10 | Hook consumidor de AuthContext |
| `app/auth/login/page.tsx` | ~20 | Pagina de login |
| `components/login-form.tsx` | ~150 | Formulario de login con RHF + Zod |
| `app/(erp)/layout.tsx` | ~170 | Layout ERP: AuthGuard + Shell + Header |
| `app/(erp)/error.tsx` | ~45 | Error boundary ERP |
| `app/(erp)/loading.tsx` | ~10 | Suspense loading fallback ERP |
| `app/error.tsx` | ~48 | Error boundary global |
| `app/not-found.tsx` | ~33 | Pagina 404 |
| `app/(erp)/acceso-denegado/page.tsx` | ~29 | Pagina 403 |
| `components/app-sidebar.tsx` | ~100 | Sidebar con navegacion filtrada por rol |
| `components/nav-main.tsx` | ~80 | Items de navegacion colapsables |
| `components/nav-user.tsx` | ~80 | Dropdown de usuario con logout |
| `lib/erp-navigation.ts` | ~150 | Config de rutas + permisos por rol |
| `components/tables/DataTable.tsx` | ~200 | Tabla reutilizable client-side |
| `components/tables/ServerDataTable.tsx` | ~150 | Tabla reutilizable server-side |

### Cobertura de tests

| Area | Tests | Estado |
|------|-------|--------|
| Login form | 3 | ✅ Completo |
| API client refresh | 2 | ✅ Completo |
| Navegacion/permisos | 5 | ✅ Completo |
| AuthGuard (con/sin sesion) | 4 | ✅ Completo |
| AppSidebar + NavUser | 8 | ✅ Completo |
| Auth schemas (shared) | 3 | ✅ Completo |
| Auth service (API) | 6 | ✅ Completo |
| Auth controller (API) | 2 | ✅ Completo |
| Auth E2E (API) | 4 | ✅ Completo |
