# Auth: registro, roles y `mustChangePassword`

## Resumen
Corregir el flujo de registro / activación / cambio forzado de contraseña para que:

1. El **auto-registro** no decida solo el rol del nuevo usuario — ese rol lo asigna el admin recién al activar la cuenta.
2. La pantalla de "cambiar contraseña" forzada se dispare **sólo cuando el admin eligió la contraseña** (creación desde panel de admin o reset por admin), **no** cuando el propio usuario la eligió en signup / reset por email.

Origen del problema: hoy `auth.service.register()` setea `rol: TECNICO` automáticamente y `mustChangePassword: true`, mientras que `usuarios.service.create()` **no** setea `mustChangePassword`. El comportamiento está invertido.

## Objetivos
- El admin elige el rol al activar (no antes, no por accidente).
- `mustChangePassword=true` sólo cuando el admin eligió la contraseña.
- Cambios mínimos: sin migración de schema, sin nuevos roles en el enum, sin nuevos endpoints.
- Bloquear regresiones con tests unitarios.

## No‑objetivos
- Crear un rol `PENDIENTE` u otro valor nuevo en `RolUsuario`.
- Hacer `rol` nullable en el schema.
- Cambiar el guard `mustChangePassword` del frontend (sigue redirigiendo a `/auth/cambiar-contrasena`).
- Cambiar la política de fuerza de contraseña (`PASSWORD_POLICY_REGEX`).
- Tocar verificación de email por OTP, reset por email, sesión única.

## Estado actual
`apps/api/src/modules/auth/auth.service.ts`:
- `register(dto)` setea `rol: RolUsuario.TECNICO`, `activo: false`, `mustChangePassword: true`.

`apps/api/src/modules/usuarios/usuarios.service.ts`:
- `create(dto)` spreaded de `dto` (rol elegido por admin) + hashed password. **No** setea `mustChangePassword`.
- `activar(id)` setea sólo `activo: true`. No toca `rol` ni `mustChangePassword`.
- `changePassword(id, dto)` (admin resetea pwd de otro) hace bcrypt + update. **No** setea `mustChangePassword`.

`apps/web`:
- `auth-context.tsx` y `(erp)/layout.tsx` redirigen a `/auth/cambiar-contrasena` cuando `user.mustChangePassword === true`. Correcto.
- `settings-dialog.tsx` botón "Activar" dispara `useActivarUsuario().mutate(id)` sin rol.
- Hook `useActivarUsuario` (en `use-configuracion.ts`) hace `api.patch('/usuarios/:id/activar')` sin body.

## Diseño propuesto

### Backend

#### 1. `auth.service.register()` — quitar el flag
```ts
data: {
  // ...
  rol: RolUsuario.TECNICO,   // placeholder; admin lo override al activar
  activo: false,
  mustChangePassword: false, // ← antes era true; el usuario eligió su propia pwd
  emailVerificado: false,
},
```
El placeholder TECNICO es seguro porque `activo:false` impide login hasta que admin active.

#### 2. `usuarios.service.create()` — setear el flag por defecto
```ts
const { mustChangePassword: mustChangeOverride, ...rest } = dto;
const usuario = await this.prisma.usuario.create({
  data: {
    ...rest,
    password: hashedPassword,
    mustChangePassword: mustChangeOverride ?? true, // admin eligió la pwd
  },
  select: SELECT_USUARIO,
});
```
`CreateUsuarioDto` se extiende con `@IsOptional() mustChangePassword?: boolean` (default `true` si no viene).

#### 3. `usuarios.service.changePassword(id, dto, opts)` — bifurcar por origen

Hoy `changePassword` está compartido entre **tres** call sites:
- `usuarios.controller.changePassword` → **admin resetea pwd ajena** (queremos `mustChangePassword: true`).
- `auth.service.changeOwnPassword` → **usuario cambia su propia pwd** (queremos `mustChangePassword: false`, ya lo hace).
- `auth.service.resetPassword` → **usuario completó reset por email** (queremos `mustChangePassword: false`, ya lo hace).

Por eso NO podemos cambiar el comportamiento default. Solución: agregar un parámetro opcional.

```ts
async changePassword(
  id: string,
  dto: ChangePasswordDto,
  opts: { forceChange?: boolean } = {},
) {
  await this.findOne(id);
  this.ensureSecurePassword(dto.password);
  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

  await this.prisma.usuario.update({
    where: { id },
    data: {
      password: hashedPassword,
      mustChangePassword: opts.forceChange ?? false,  // ← default false
      sessionVersion: { increment: 1 },
    },
  });
  // ...resto idéntico (refreshToken deleteMany + logger)
}
```

Call sites:
- `usuarios.controller.changePassword` → `this.usuariosService.changePassword(id, dto, { forceChange: true })`.
- `auth.service.changeOwnPassword(userId, password)` → sigue llamando `this.usuariosService.changePassword(userId, { password })` (default `false`).
- `auth.service.resetPassword` → sigue llamando `this.usuariosService.changePassword(tokenRecord.usuarioId, { password })` (default `false`).

#### 4. `usuarios.service.activar(id, dto)` — recibir rol obligatorio
Nuevo DTO `ActivarUsuarioDto`:
```ts
export class ActivarUsuarioDto {
  @IsEnum(RolUsuario)
  @IsNotEmpty()
  rol!: RolUsuario;
}
```
Service:
```ts
async activar(id: string, dto: ActivarUsuarioDto) {
  // findFirst igual que hoy; validar emailVerificado igual que hoy
  // ...
  await this.prisma.usuario.update({
    where: { id },
    data: {
      activo: true,
      rol: dto.rol,                    // ← override del placeholder
      mustChangePassword: false,       // ← limpia el flag legado en usuarios viejos
      sessionVersion: { increment: 1 },// invalidar tokens previos si el rol cambia
    },
  });
  // email de bienvenida igual que hoy, usando dto.rol para el ROL_LABELS
}
```
Si ya estaba activo (idempotencia): si el `rol` cambió, hacemos el update y mandamos email. Si el rol es igual y ya estaba activo → retornar el mensaje idempotente actual sin update.

Justificación de limpiar `mustChangePassword:false` en activar: los usuarios pre-existentes registrados con el código viejo tienen el flag colgado. Sin limpiarlo, al activarlos cargarían la pantalla de cambiar-contrasena innecesariamente — porque ellos mismos eligieron la pwd en signup. Para los recién registrados con el código nuevo el flag ya viene en `false`, así que la operación es no-op.

#### 5. Controller `usuarios.controller.activar`
```ts
@Patch(':id/activar')
@Roles(RolUsuario.ADMIN)
@ApiOperation({ summary: 'Activar cuenta y asignar rol (envia bienvenida)' })
activar(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: ActivarUsuarioDto,
) {
  return this.usuariosService.activar(id, dto);
}
```

#### 6. Flujos "usuario eligió pwd" — sin cambios
Verificado en el código actual:
- `auth.service.changeOwnPassword(userId, password)` (`auth.service.ts:543`) llama a `usuariosService.changePassword` que con el cambio #3 deja `mustChangePassword: false` por default. Correcto.
- `auth.service.resetPassword(token, password)` (`auth.service.ts:358`) llama a la misma función. Correcto.

No hay que editar `auth.service` salvo `register()` (cambio #1).

### Frontend

#### 1. Hook `useActivarUsuario`
`apps/web/src/hooks/use-configuracion.ts`:
```ts
export function useActivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rol }: { id: string; rol: RolUsuario }) =>
      api.patch<{ id: string; message: string }>(`/usuarios/${id}/activar`, { rol }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USUARIOS_KEY] });
    },
  });
}
```

#### 2. Diálogo "Activar y asignar rol"
Componente nuevo `ActivarUsuarioDialog` o inline en `settings-dialog.tsx`:
- Dispara cuando admin clic "Activar" en un usuario inactivo.
- Contenido: nombre del usuario + `<Select>` de rol con opciones `ADMIN`, `ENCARGADO`, `TECNICO`. Default = rol actual del usuario (en general TECNICO placeholder).
- Botón "Confirmar" → `activarMutation.mutate({ id, rol })`.
- Botón "Cancelar" → cierra sin acción.

El botón "Desactivar" sigue exactamente igual (mutación sin body).

#### 3. Sin cambios en
- `auth-context.tsx` — el guard `if (user.mustChangePassword) router.replace('/auth/cambiar-contrasena')` se mantiene.
- `(erp)/layout.tsx` — idem.
- Las páginas `/auth/signup`, `/auth/login`, `/auth/cambiar-contrasena` — se mantienen.

### Schema / migraciones
**Sin cambios.** Ni `schema.prisma` ni migraciones nuevas.

### Tipos compartidos (`packages/shared`)
Si `CreateUsuarioPayload` (o equivalente) está exportado en `@erp/shared`, agregarle `mustChangePassword?: boolean`. Igual con un eventual `ActivarUsuarioPayload`. Rebuild de `@erp/shared` después: `pnpm --filter @erp/shared build`.

## Contratos / payloads visibles

`POST /api/v1/usuarios` body — añadido opcional:
```jsonc
{
  "nombre": "...",
  "apellido": "...",
  "email": "...",
  "password": "...",
  "rol": "TECNICO",
  "activo": true,
  "mustChangePassword": true  // opcional, default true
}
```

`PATCH /api/v1/usuarios/:id/activar` body — nuevo, obligatorio:
```json
{ "rol": "ENCARGADO" }
```
Faltante o inválido → `400 VALIDATION_ERROR`.

`POST /api/v1/auth/register` — sin cambios de payload visibles. Internamente cambia `mustChangePassword: true → false`.

## Error handling
- `activar` sin `rol` o con rol fuera del enum → `400` por `ValidationPipe`.
- `activar` con email no verificado → sigue siendo `400` (mensaje actual).
- Lógica de respuesta envuelta por `TransformInterceptor` y `HttpExceptionFilter` — sin tocar.

## Datos existentes
- Usuarios actualmente con `(activo:false, mustChangePassword:true)` por self-register en código viejo: al activarlos con el nuevo flujo, `activar()` setea `mustChangePassword: false`. Limpia la inconsistencia sin script de migración.
- Usuarios actualmente con `(activo:true, mustChangePassword:true)` por self-register: si alguno se autoregistró y un admin lo dejó activo manualmente vía `PATCH /usuarios/:id` (no via `activar`), siguen con el flag colgado. **Opcional**: incluir un seed/script de cleanup que setee `mustChangePassword:false` en usuarios `(activo:true, mustChangePassword:true)` que no fueron creados por admin. Lo defiero — no es bloqueante; el siguiente flujo de cambio de pwd ya lo limpia.

## Impacto / performance
- Una columna más en el update de `activar`/`changePassword` (irrelevante).
- `sessionVersion + 1` en `changePassword` y en `activar` cuando el rol cambia: invalida access tokens viejos (alineado con la spec de sesión-única).
- Sin queries extra.

## Seguridad
- Refuerza el principio de menor privilegio: no se "filtra" un rol TECNICO operativo sin que el admin lo elija explícitamente.
- Reduce el riesgo de que el primer login con una pwd elegida por admin quede expuesta (mustChangePassword obliga a rotarla).

## Tests

### API unit (`apps/api/src/modules/`)
- `auth.service.spec.ts`:
  - `register()` deja `mustChangePassword=false`, `activo=false`, `rol=TECNICO`.
  - `register()` sigue rechazando pwd débil (regression guard).
- `usuarios.service.spec.ts`:
  - `create()` setea `mustChangePassword=true` por defecto.
  - `create()` respeta `mustChangePassword=false` si admin lo envía explícito.
  - `changePassword(id, dto)` sin `opts` → `mustChangePassword=false` y `sessionVersion+1`. (Cubre self-pwd y reset-por-email.)
  - `changePassword(id, dto, { forceChange: true })` → `mustChangePassword=true` y `sessionVersion+1`. (Cubre admin reset.)
  - `activar(id, { rol })` actualiza `rol` + `activo:true` + `mustChangePassword:false` + `sessionVersion+1`.
  - `activar(id, { rol })` falla `400` si `emailVerificado=false`.
  - `activar(id, { rol })` idempotente si `activo:true` y `rol` igual (no envía email, no bump sessionVersion).
- `usuarios.controller.spec.ts`: passthrough verifica `activar` recibe `(id, dto)`.

### Web (`apps/web/src/components`)
- Test del nuevo flujo de activación que verifica:
  - Click "Activar" abre el modal.
  - Sin elegir rol no se llama a la mutación.
  - Con rol elegido, la mutación se llama con `{ id, rol }`.

## Métricas de éxito
- Tests verdes en CI.
- Reproducción manual:
  1. Signup → confirmar OTP → admin abre panel → activar con rol ENCARGADO → login del usuario → entra al dashboard SIN pantalla de cambiar-contrasena.
  2. Admin crea usuario nuevo con pwd → primer login → SÍ entra a cambiar-contrasena → tras cambiar, accede normal.
  3. Admin resetea pwd a un usuario activo → ese usuario en próximo login → SÍ entra a cambiar-contrasena.

## Riesgos
- **Bump de `sessionVersion` en `activar`**: si un usuario re-activado tenía tokens válidos, se invalidan. Comportamiento intencional pero documentar.
- **Override del rol al re-activar**: si un usuario activo es desactivado y re-activado vía el modal, el modal puede sobreescribir un rol previo si el admin no presta atención. Mitigado por: el select default = rol actual del usuario, y el modal muestra el nombre + rol actual antes de confirmar.
- **API breaking-change para clientes externos** del endpoint `PATCH /usuarios/:id/activar`: pasa de body vacío a body con `rol`. Asumimos no hay clientes externos consumiéndolo (es admin-only y vive detrás de `@Roles(ADMIN)`). Si hay scripts/seeds internos que lo llaman, los actualizamos en el mismo PR.

## Implementación por etapas
1. Backend: DTO, service, controller, spec.
2. `@erp/shared` rebuild si se exporta el payload.
3. Frontend: hook + modal en `settings-dialog.tsx`.
4. Specs web.
5. Lint, type-check, build local.
6. PR contra `codex-project-upload-20260524`.
