# Sprint 01 - Infraestructura base y autenticacion

- Estado: COMPLETADO
- Fase: Backend nucleo
- Depende de: Ninguno
- Desbloquea: 02, 09, 10

## Objetivo

Dejar lista la base comun de la API: autenticacion, JWT, roles, usuario actual,
errores, respuestas estandar y gestion inicial de usuarios.

## Tablas duenas de este sprint

- `Usuario`
- `RefreshToken`
- `Auditoria`

## Reglas AGENTS criticas para este sprint

- [x] Solo existen `ADMIN`, `ENCARGADO` y `TECNICO`
- [x] Cada endpoint protegido debe llevar `@Roles(...)`
- [x] `PrismaService` por DI; nunca `new PrismaClient()`
- [x] DTOs con `class-validator` y `PartialType`
- [x] Respuesta estandar `{ data, meta }`
- [x] No usar `console.log`; usar `Logger`
- [x] Soft delete en usuarios

## Checklist de implementacion

### Backend - `apps/api`

- [x] Completar `common/guards/`, `common/decorators/`, `common/filters/` y `common/interceptors/`
- [x] Confirmar `jwt-auth.guard.ts`, `roles.guard.ts`, `current-user.decorator.ts`, `roles.decorator.ts` y `public.decorator.ts`
- [x] Confirmar formato estandar de error y formato `{ data, meta }`
- [x] Dejar `database/prisma.service.ts` listo para inyeccion por DI
- [x] Implementar `JwtStrategy` con `passport-jwt` y `JwtModule.registerAsync()` usando `ConfigService`
- [x] Confirmar y completar `modules/auth/` con `login`, `refresh`, `logout`, `logout-all` y `me`
- [x] Confirmar y completar `modules/usuarios/` con CRUD paginado
- [x] Restringir gestion de usuarios a `ADMIN`
- [x] Hash de password con `bcryptjs`
- [x] Configurar Swagger en `main.ts`
- [x] Crear infraestructura de uploads: `uploads/upload.service.ts`, config Multer, validacion MIME server-side, endpoint `GET /api/v1/uploads/:filename` autenticado
- [x] Crear `AuditoriaService` e interceptor para registrar acciones CRUD en tabla `Auditoria` (usuario, accion, modelo, datos antes/despues, IP)
- [x] Confirmar `modules/health/` funcional con check de DB, Redis y AI service
- [x] Configurar rate limiting diferenciado: login 5/min, publico 30/min, autenticado 100/min, facturacion 10/min, uploads 20/min
- [x] Confirmar `seed.ts` con admin inicial, `mustChangePassword`, series base y metodos de pago requeridos por `AGENTS.md`

### Shared - `packages/shared`

- [x] Confirmar enum `RolUsuario` con solo `ADMIN`, `ENCARGADO` y `TECNICO`
- [x] Exportar tipos de payload o respuestas que necesite el frontend (`login`, `refresh`, `me`)
- [x] Versionar schemas Zod de auth en `packages/shared/src/schemas/`

### Frontend - preparacion de contrato

- [x] Definir payload esperado para login, refresh y `me`
- [x] Dejar claro que campos del usuario autenticado consumira el shell ERP

### Entregable de handoff obligatorio hacia Sprint 10

- [x] Publicar OpenAPI actualizado de `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` y `GET /auth/me`
- [x] Documentar ejemplos reales de request/response para login, refresh y `me`
- [x] Documentar catalogo de errores de auth (`401`, `403`, `429`) con shape final
- [x] Entregar matriz de permisos por rol para navegacion ERP (`ADMIN`, `ENCARGADO`, `TECNICO`)
- [x] Versionar contratos compartidos de auth en `packages/shared`

### Testing

- [x] Unit tests para `auth.service`
- [x] Unit tests para `usuarios.service`
- [x] Tests de guards y decorators criticos
- [x] Tests de `AuditoriaService` (registra accion correcta)
- [x] Tests de rate limiting en endpoint login (devuelve 429 tras exceder limite)
- [x] E2E de `POST /auth/login`
- [x] E2E de `GET /auth/me`
- [x] E2E de acceso restringido a `GET /usuarios`
- [x] E2E de upload y descarga de archivo

## Checklist de cierre

- [x] Login devuelve `accessToken` y `refreshToken`
- [x] `GET /api/v1/auth/me` devuelve usuario autenticado
- [x] Solo `ADMIN` accede al CRUD de usuarios
- [x] Seed crea usuario admin inicial
- [x] Swagger abre sin errores
- [x] Uploads funcionan: subir archivo y descargarlo via endpoint autenticado
- [x] Auditoria registra acciones CRUD automaticamente
- [x] Rate limiting bloquea login tras 5 intentos en 1 minuto
- [x] Health check responde estado de DB, Redis y AI service
- [x] Seed deja admin inicial, config empresa placeholder y metodos de pago base requeridos
- [x] El handoff de auth para Sprint 10 queda publicado y versionado (OpenAPI + ejemplos + errores + permisos)
- [x] Las 3 tablas duenas del sprint quedaron cubiertas
