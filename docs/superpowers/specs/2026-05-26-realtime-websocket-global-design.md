# Realtime WebSocket Global — Eliminación de Polling

**Fecha:** 2026-05-26
**Estado:** Diseño aprobado, pendiente de plan de implementación.
**Autor:** Devin (con Michael)

## 1. Objetivo

Toda la aplicación ERP debe funcionar **100% en tiempo real vía WebSocket**: cada acción que realice un usuario (crear, editar, anular, cambiar de estado, etc.) debe reflejarse instantáneamente en las pantallas de los demás usuarios conectados — listados, formularios, dropdowns, filtros, badges, contadores. Eliminar todo polling (`refetchInterval`, `setInterval` para datos, `staleTime: 0` agresivos) y dejar el WebSocket como único mecanismo de invalidación de cache.

No se toca el countdown de UI del formulario de verificación de email (`verify-email-form.tsx` línea 87) porque es un timer visual de cooldown de reenvío, no data polling.

## 2. Estado actual

La infraestructura WebSocket ya existe y cubre la gran mayoría de los casos. Resumen del flujo actual:

```
Mutación HTTP (POST/PATCH/PUT/DELETE)
        │
        ▼
RealtimeInvalidateInterceptor (global, en AppModule)
        │ map(URL segment → scope)
        ▼
EventsService.emitToAll(SocketEvents.ERP_INVALIDATE, { scope })
        │
        ▼ (todos los clientes conectados al ws/ namespace)
SocketProvider (apps/web/src/hooks/use-socket.ts)
        │ getRealtimeInvalidationQueryKeys(scope)
        ▼
queryClient.invalidateQueries({ queryKey })  →  TanStack Query refetch
```

**Componentes que ya existen y se mantienen sin cambios:**

- `apps/api/src/websockets/events.gateway.ts` — gateway en `/ws` con autenticación JWT + verificación de `sessionVersion`, rooms `user:{id}` y `role:{rol}`.
- `apps/api/src/websockets/events.service.ts` — helpers `emitToUser`, `emitToRole`, `emitToRoles`, `emitToAll`.
- `apps/api/src/common/interceptors/realtime-invalidate.interceptor.ts` — interceptor global, mapea segmento de URL → scope, dispara `ERP_INVALIDATE` en todas las mutaciones.
- `apps/web/src/hooks/use-socket.ts` — `SocketProvider` montado en `(erp)/layout.tsx` que escucha eventos y maneja invalidación + toasts + notificaciones.
- `apps/web/src/lib/realtime-invalidation.ts` — mapa scope → query keys.
- Eventos de negocio ya emitidos por el API: tickets (`TICKET_CREATED`/`UPDATED`/`CLOSED`), stock (`STOCK_ALERTA`), comprobantes SUNAT (`COMPROBANTE_ACEPTADO`/`RECHAZADO`/`REQUIERE_REVISION`/`PLAZO_PROXIMO`), certificados (`CERTIFICADO_PROXIMO_VENCER`/`VENCIDO`), comunicaciones de baja (`COMUNICACION_BAJA_ACEPTADA`/`RECHAZADA`), solicitudes públicas (`SOLICITUD_NUEVA`).

## 3. Gaps identificados

Tres únicos puntos donde el flujo realtime no está completo:

### 3.1. Polling del estado del import del Padrón SUNAT RUC

**Archivo:** `apps/web/src/hooks/use-facturacion.ts` líneas 1127–1139.

```ts
export function usePadronSunatRucImportStatus() {
  return useQuery({
    queryKey: [FACTURACION_KEY, "padron-sunat-ruc", "import-status"],
    queryFn: () =>
      api.get<ApiEnvelope<ImportPadronSunatRucResult>>(
        "/facturacion/padron-sunat-ruc/importar/status",
      ),
    refetchInterval: (query) =>
      query.state.data?.data.status === "RUNNING" ||
      query.state.data?.data.status === "CANCEL_REQUESTED"
        ? 2000
        : false,
  });
}
```

Este es el **único polling real de datos** en toda la app web. El job de import vive en `apps/api/src/modules/facturacion/padron-sunat-ruc.service.ts` y atraviesa varias etapas: `DOWNLOADING → DECOMPRESSING → CLEANING → IMPORTING → PUBLISHING → COMPLETED` (o `CANCELLED` / `ERROR`).

### 3.2. Scope `alquileres` no mapeado en el frontend

**Archivo:** `apps/web/src/lib/realtime-invalidation.ts`.

El interceptor del API ya emite `ERP_INVALIDATE { scope: 'alquileres' }` en mutaciones de `/alquileres/*`, pero el mapa del frontend no tiene la entrada `alquileres`. Cae al fallback `[[scope]]` = `[['alquileres']]`, lo que invalida el listado pero **no** los queries cruzados (`equipos`, `inventario`, `caja`) que el hook local de `use-alquileres.ts` líneas 36-39 sí invalida en `onSuccess` de las mutaciones.

Resultado: el usuario que hace la mutación ve todo actualizado (vía `onSuccess`), pero **otros usuarios** solo ven el listado de alquileres actualizado, no los equipos/inventario/caja.

### 3.3. `staleTime: 0` en productos

**Archivo:** `apps/web/src/hooks/use-productos.ts` línea 101.

`staleTime: 0` fuerza re-fetch en cada mount del componente. Patrón anti-realtime — la frescura debe venir del `ERP_INVALIDATE`, no de un re-fetch oportunista.

## 4. Diseño

### 4.1. Nuevo evento WebSocket: `PADRON_SUNAT_RUC_IMPORT_STAGE`

Se elige **emitir solo en cambios de etapa** (decisión del usuario en brainstorming) — ~6-8 eventos por import en lugar de uno por cada batch de 5k registros.

**`packages/shared/src/types/socket-events.type.ts`:**

```ts
export const SocketEvents = {
  // ... eventos existentes
  PADRON_SUNAT_RUC_IMPORT_STAGE: 'padron-sunat-ruc.import.stage',
} as const

export interface PadronSunatRucImportStagePayload {
  status: 'RUNNING' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'SUCCESS' | 'ERROR'
  stage:
    | 'DOWNLOADING'
    | 'DECOMPRESSING'
    | 'CLEANING'
    | 'IMPORTING'
    | 'PUBLISHING'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'ERROR'
  message: string
}

export interface SocketEventMap {
  // ... existing
  [SocketEvents.PADRON_SUNAT_RUC_IMPORT_STAGE]: PadronSunatRucImportStagePayload
}
```

### 4.2. Emisión en `PadronSunatRucService`

**`apps/api/src/modules/facturacion/padron-sunat-ruc.service.ts`:**

- Inyectar `EventsService` desde `../../websockets/events.service`.
- Crear método privado `emitStage(status, stage, message)` que llame `events.emitToRoles([RolUsuario.ADMIN, RolUsuario.ENCARGADO], SocketEvents.PADRON_SUNAT_RUC_IMPORT_STAGE, payload)`.
- Llamar `emitStage` en cada transición de etapa:
  - `startImportFromSunatUrl` (al crear el job): RUNNING/DOWNLOADING
  - `importFromSunatUrl` después del `updateJob({ stage: 'DOWNLOADING' })`: redundante con el anterior, omitir
  - `importFromZip` después del `updateJob({ stage: 'DECOMPRESSING' })`: RUNNING/DECOMPRESSING
  - `importFromZip` después del `updateJob({ stage: 'CLEANING' })`: RUNNING/CLEANING
  - `importFromZip` después del `updateJob({ stage: 'IMPORTING' })`: RUNNING/IMPORTING
  - Etapa PUBLISHING (donde hace el swap staging → tabla final): RUNNING/PUBLISHING
  - Al finalizar exitoso (`updateJob` con `status: 'SUCCESS'`, `stage: 'COMPLETED'`): SUCCESS/COMPLETED
  - En `cancelImport`: CANCEL_REQUESTED/(stage actual)
  - Al detectarse cancelación efectiva: CANCELLED/CANCELLED
  - En `handleImportFailure`: ERROR/ERROR

**Restricción:** se emite solo a roles ADMIN y ENCARGADO porque son los únicos que pueden ver la página de configuración del padrón.

### 4.3. Listener en `SocketProvider`

**`apps/web/src/hooks/use-socket.ts`:**

```ts
socket.on(
  SocketEvents.PADRON_SUNAT_RUC_IMPORT_STAGE,
  (p: PadronSunatRucImportStagePayload) => {
    queryClient.invalidateQueries({
      queryKey: ['facturacion', 'padron-sunat-ruc', 'import-status'],
    })

    if (p.status === 'SUCCESS') {
      const n = makeNotification(
        SocketEvents.PADRON_SUNAT_RUC_IMPORT_STAGE,
        'Padrón SUNAT actualizado',
        p.message,
        '/configuracion',
      )
      addNotification(n)
      toast.success(n.title, { description: n.description })
    } else if (p.status === 'ERROR') {
      const n = makeNotification(
        SocketEvents.PADRON_SUNAT_RUC_IMPORT_STAGE,
        'Error al importar Padrón SUNAT',
        p.message,
        '/configuracion',
      )
      addNotification(n)
      toast.error(n.title, { description: n.description })
    }
    // RUNNING / CANCEL_REQUESTED / CANCELLED: solo invalida, sin toast
  },
)
```

### 4.4. Eliminar `refetchInterval`

**`apps/web/src/hooks/use-facturacion.ts`:**

```ts
export function usePadronSunatRucImportStatus() {
  return useQuery({
    queryKey: [FACTURACION_KEY, "padron-sunat-ruc", "import-status"],
    queryFn: () =>
      api.get<ApiEnvelope<ImportPadronSunatRucResult>>(
        "/facturacion/padron-sunat-ruc/importar/status",
      ),
  });
}
```

### 4.5. Mapear scope `alquileres` en el frontend

**`apps/web/src/lib/realtime-invalidation.ts`:**

```ts
const INVALIDATION_QUERY_KEYS_BY_SCOPE: Record<
  string,
  readonly RealtimeInvalidationQueryKey[]
> = {
  // ... existing
  alquileres: [
    ['alquileres'],
    ['equipos'],
    ['inventario'],
    ['caja'],
  ],
  // ... existing
}
```

### 4.6. Eliminar `staleTime: 0` en productos

**`apps/web/src/hooks/use-productos.ts` línea 101:** quitar la línea `staleTime: 0,` (deja que use el default global de TanStack Query, 5 min, definido en `providers.tsx`). La frescura está garantizada por `ERP_INVALIDATE`.

## 5. Lo que **NO** se toca

- `verify-email-form.tsx` línea 87: `window.setInterval` → es un countdown de UI para cooldown de reenvío de email, no polling de datos.
- Las llamadas `invalidateQueries` dentro de `onSuccess` de las mutations en los hooks: se quedan. Dan feedback instantáneo al autor del cambio (no esperar el roundtrip del WS), y son complementarias al `ERP_INVALIDATE`. La doble invalidación es inocua.
- Las cache options globales de React Query en `apps/web/src/components/providers.tsx`: `staleTime: 5min`, `gcTime: 24h`, `networkMode: offlineFirst` — son correctas para un patrón realtime con WS.
- Los demás 14 eventos de socket existentes: ya funcionan, no requieren cambio.

## 6. Resultado final

- **0** `refetchInterval` en toda la app web (solo queda el countdown de UI de email, que no es de datos).
- **0** `staleTime: 0` en queries de datos del ERP.
- Todos los datos, dropdowns, estados, filtros, tablas y badges se actualizan instantáneamente cuando cualquier usuario realiza un cambio en cualquier parte de la app.
- Tráfico WebSocket bajo: solo en mutaciones reales (1 evento por mutación) + cambios de etapa del job del padrón (~6-8 por import).
- Padrón SUNAT pasa de polling cada 2 s a actualización event-driven en cambios de etapa.

## 7. Pruebas / verificación

- **Web Vitest:** `pnpm --filter @erp/web test` — los tests existentes de `use-socket.ts` no deben romperse al agregar el nuevo listener.
- **API Jest:** `pnpm --filter @erp/api test` — verificar que `events.gateway.spec.ts` y `events.service.spec.ts` siguen pasando, y agregar test para la emisión del nuevo evento desde `PadronSunatRucService` si hay test del servicio.
- **Smoke manual recomendado:**
  1. Dos navegadores logueados como `ADMIN` y `ENCARGADO` respectivamente.
  2. En navegador 1, crear un cliente / producto / venta. Verificar que el listado en navegador 2 se actualiza sin recargar.
  3. En navegador 1, registrar un alquiler. Verificar en navegador 2 que el listado de alquileres, equipos, inventario y caja se actualizan.
  4. En navegador 1, disparar import del padrón SUNAT. Verificar en navegador 2 (`/configuracion`) que la barra de estado avanza por etapa sin polling y muestra toast al completar.

## 8. Riesgo / impacto

Bajo. Toca:
- 1 archivo en `packages/shared` (agregar 1 evento + 1 payload).
- 1 archivo en `apps/api/src/modules/facturacion` (inyectar `EventsService` + emitir en transiciones).
- 1 archivo en `apps/web/src/hooks/use-socket.ts` (1 listener nuevo).
- 1 archivo en `apps/web/src/hooks/use-facturacion.ts` (quitar `refetchInterval`).
- 1 archivo en `apps/web/src/hooks/use-productos.ts` (quitar `staleTime: 0`).
- 1 archivo en `apps/web/src/lib/realtime-invalidation.ts` (agregar entrada `alquileres`).

Todos los cambios son aditivos o eliminan polling redundante. No hay cambios de schema de Prisma, ni de DTOs HTTP, ni de rutas, ni breaking changes.

Después de tocar `packages/shared` hay que correr:
```
pnpm --filter @erp/shared build
```
para que `@erp/shared` se publique al monorepo y los typings nuevos lleguen al api y al web.
