# Sprint 16 - PWA offline para tecnicos

- Estado: COMPLETADO
- Fase: PWA
- Depende de: 08, 11
- Desbloquea: Ninguno

## Objetivo

Permitir que tecnicos trabajen sin conexion en campo y sin perder datos al
cerrar tickets o registrar evidencia.

## Tablas y contratos consumidos por este sprint

- `Ticket`
- `DetalleTicket`
- `AdjuntoTicket`
- `Cliente`
- `Equipo`
- `Producto`

## Reglas AGENTS criticas para este sprint

- [x] El modo offline se limita a flujos utiles para `TECNICO`
- [x] La sincronizacion debe respetar roles y validaciones del backend
- [x] El frontend debe indicar claramente estado offline/online

## Checklist de implementacion

### Frontend - `apps/web`

- [x] Configurar PWA con Serwist (`@serwist/next`) — `next.config.ts` + `src/app/sw.ts`
- [x] Web App Manifest (`public/manifest.json`) — installable, shortcuts a tickets y dashboard
- [x] Meta tags PWA en root layout (`manifest`, `appleWebApp`, `themeColor viewport`)
- [x] `hooks/use-offline-sync.ts` — `useOnlineStatus()` + `useOfflineQueue()` con IndexedDB
- [x] Cachear datos offline: TanStack Query gcTime=24h, staleTime=5min, networkMode=offlineFirst
- [x] `components/offline-banner.tsx` — banner ambar con icono WifiOff
- [x] Banner añadido al ERP layout (visible en toda la zona autenticada)

### Backend - `apps/api`

- [x] Endpoints existentes son idempotentes para operaciones de tecnico (PATCH cerrar ticket)

### Shared - `packages/shared`

- [x] Tipos de payloads de sync son los existentes (CerrarTicketPayload)

### Testing

- [x] Tests de `useOnlineStatus` — 5 casos (online, offline, evento online/offline, cleanup)
- [x] Tests de `useOfflineQueue` — 4 casos (init, enqueue, clear, isOnline)

## Checklist de cierre

- [x] App es instalable (manifest + service worker configurados)
- [x] La UI comunica claramente el estado de conexion (OfflineBanner)
- [x] TanStack Query cachea datos 24h para lectura offline
- [x] Cola IndexedDB permite encolar mutaciones offline y re-ejecutar al reconectar
- [x] Service worker deshabilitado en desarrollo (no interfiere con hot-reload)
