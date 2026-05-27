# Sesión única por usuario (corte inmediato)

## Resumen
Implementar una sola sesión activa por usuario. Cada nuevo login invalida cualquier sesión previa **de inmediato**, sin romper el flujo actual de login/refresh ni UX existente.

## Objetivos
- Invalidar de forma inmediata sesiones antiguas al iniciar sesión.
- Mantener el mismo contrato de endpoints de autenticación (sin cambios de payload visibles).
- Evitar regresiones en flujos existentes (login, refresh, logout, cambio de contraseña).

## No‑objetivos
- Gestión de sesiones por dispositivo.
- UI para ver o revocar sesiones.
- Cambios en rutas públicas con tokens en URL (p. ej. portal‑cliente).

## Estado actual (resumen)
- Se emite JWT de acceso + refresh token.
- El refresh token se guarda en BD; al usarlo se consume.
- En login se revocan refresh tokens previos, pero los access tokens antiguos siguen válidos hasta su expiración.

## Diseño propuesto
### Campo `sessionVersion` en usuario
- Nuevo campo `sessionVersion` (int, default `1`) en `Usuario`.
- Representa la versión de sesión activa.

### Login
- Incrementa `sessionVersion` del usuario.
- Emite `accessToken` con claim `sv = sessionVersion` actualizado.
- Revoca todos los refresh tokens previos (ya se hace; se mantiene).

### Validación por request (HTTP y WebSocket)
- En cada request protegida, se valida que `sv` del JWT coincida con `sessionVersion` en BD.
- Si no coincide → `401` (sesión invalidada).

### Refresh
- NO incrementa `sessionVersion`.
- Emite `accessToken` con `sv` actual obtenido de BD.

### Logout‑all y cambio de contraseña
- Incrementan `sessionVersion` para invalidar access tokens existentes inmediatamente.
- Mantienen la revocación de refresh tokens existente.

## Contratos y payloads
- No se alteran endpoints ni estructuras de respuesta visibles.
- El claim `sv` es interno al JWT.

## Error handling
- Mismatch de `sv` → `401` con mensaje estándar de sesión expirada.
- No cambia el formato de errores global.

## Impacto y performance
- 1 lectura extra en BD por request autenticada.
- Beneficio: corte inmediato de sesiones previas.

## Seguridad
- Reduce riesgo de sesiones paralelas activas tras nuevo login.
- No cambia el manejo de HTTPS ni rutas públicas.

## Pruebas sugeridas
- Login invalida sesión anterior inmediatamente.
- Refresh token antiguo ya revocado no funciona.
- Change password invalida access tokens activos.
- WebSocket rechaza token con `sv` antiguo.

## Rollout
- Migración de Prisma para `sessionVersion`.
- Despliegue backend primero.
- Frontend sin cambios obligatorios.
