# apps/api

Backend NestJS del ERP.

## Estado

- Paquete: `@erp/api`
- Stack: NestJS 11 + TypeScript + Prisma + PostgreSQL
- Puerto usado por el repo: `4000`
- Prefijo global: `api/v1`
- Swagger: `http://localhost:4000/api/docs`
- Dependencia compartida: `@erp/shared`

## Estructura de primer nivel

| Ruta | Propósito |
| --- | --- |
| `src/` | Código fuente NestJS |
| `prisma/` | `schema.prisma` y migraciones |
| `test/` | Suite e2e y factory de pruebas |
| `generated/` | Salida del cliente Prisma generado |
| `scripts/` | Scripts operativos fuera de `src/` |
| `uploads/` | Carpeta runtime para archivos |
| `dist/` | Salida de build |
| `node_modules/` | Dependencias locales |
| `package.json` | Scripts, dependencias y configuración Jest |
| `prisma.config.ts` | Configuración Prisma v7 |
| `nest-cli.json` | Configuración del build Nest |
| `tsconfig.json` | Configuración TypeScript principal |
| `tsconfig.build.json` | Configuración TypeScript para build |
| `eslint.config.mjs` | ESLint 9 + TypeScript + Prettier |
| `.prettierrc` | Reglas de formato |

## Comandos

Desde la raíz del repo:

- Desarrollo: `pnpm --filter @erp/api start:dev`
- Build: `pnpm --filter @erp/api build`
- Lint: `pnpm --filter @erp/api lint`
- Type-check: `pnpm --filter @erp/api type-check`
- Unit tests: `pnpm --filter @erp/api test`
- E2E tests: `pnpm --filter @erp/api test:e2e`
- Migración Prisma: `pnpm --filter @erp/api exec prisma migrate dev --name <descripcion>`
- Generar cliente Prisma: `pnpm --filter @erp/api exec prisma generate`
- Seed: `pnpm --filter @erp/api exec prisma db seed`
- Exportar contrato Sprint 01: `pnpm --filter @erp/api swagger:export:sprint-01`

## Bootstrap y comportamiento global

### `src/main.ts`

- crea la aplicación con `NestFactory.create(AppModule)`
- aplica prefijo global `api/v1`
- aplica `helmet()`
- habilita CORS con origen `FRONTEND_URL` o `http://localhost:3000`
- aplica `ValidationPipe` global con:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`
  - `enableImplicitConversion: true`
- aplica `HttpExceptionFilter` global
- aplica `TransformInterceptor` y `LoggingInterceptor` globales
- genera Swagger con `buildSwaggerConfig()`

### `src/app.module.ts`

- carga variables desde `../../.env`
- configura `ThrottlerModule` con límite global `100` requests por `60000 ms`
- registra guards globales:
  - `ThrottlerGuard`
  - `JwtAuthGuard`
  - `RolesGuard`
- registra `AuditoriaInterceptor` como `APP_INTERCEPTOR`
- importa `DatabaseModule`, `WebsocketsModule` y los módulos de negocio

## `src/`

### Capas principales

| Ruta | Contenido |
| --- | --- |
| `src/common/` | Decorators, guards, filters, interceptors y tipos |
| `src/database/` | Prisma service, módulo global y seed |
| `src/modules/` | Módulos de negocio |
| `src/swagger/` | Configuración de Swagger |
| `src/websockets/` | Gateway y servicio realtime |
| `src/scripts/` | Scripts TypeScript del backend |
| `src/main.ts` | Bootstrap |
| `src/app.module.ts` | Módulo raíz |
| `src/app.controller.ts` | Archivo del scaffold inicial |
| `src/app.service.ts` | Archivo del scaffold inicial |

### `src/common/`

| Ruta | Función actual |
| --- | --- |
| `decorators/public.decorator.ts` | Marca endpoints públicos |
| `decorators/roles.decorator.ts` | Declara roles permitidos |
| `decorators/current-user.decorator.ts` | Lee `request.user` o una propiedad puntual |
| `filters/http-exception.filter.ts` | Normaliza errores a `{ error: { code, message, statusCode } }` |
| `guards/jwt-auth.guard.ts` | Aplica JWT salvo en endpoints `@Public()` |
| `guards/roles.guard.ts` | Valida `RolUsuario` desde `request.user` |
| `interceptors/transform.interceptor.ts` | Envuelve respuestas no paginadas en `{ data, meta.timestamp }` |
| `interceptors/logging.interceptor.ts` | Log HTTP por método, URL, status y tiempo |
| `interceptors/auditoria.interceptor.ts` | Registra auditoría en `POST`, `PATCH`, `PUT`, `DELETE` |
| `types/express.d.ts` | Extiende `Express.User` con `sub`, `email`, `rol` |
| `types/jwt-payload.type.ts` | Tipo del payload JWT |
| `types/paginated-response.type.ts` | Tipo para respuestas paginadas |

## Base de datos y Prisma

### Archivos y configuración

- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma.config.ts`
- `src/database/prisma.service.ts`
- `src/database/seed.ts`

### Estado actual verificado

- `schema.prisma` usa `provider = "postgresql"`
- el `datasource` del schema no lleva `url`
- `prisma.config.ts` carga `../../.env` y define la URL de conexión
- el generador Prisma apunta a `../generated/prisma`
- `PrismaService` importa `PrismaClient` desde `../../generated/prisma/client`
- `PrismaService` usa `PrismaPg(DATABASE_URL)`
- `generated/prisma/` se puebla al ejecutar `prisma generate`; el cliente debe generarse antes de compilar/ejecutar donde haga falta
- `.gitignore` de `apps/api` excluye `generated/prisma`

### Migraciones

`prisma/migrations/` contiene actualmente 16 carpetas de migración más `migration_lock.toml`.

### Seed actual

`src/database/seed.ts` crea o actualiza:

- usuario admin `admin@erp.local`
- métodos de pago base
- tipos de movimiento base desde `@erp/shared`
- catálogo de unidades de medida
- configuración inicial de empresa

### Alcance del schema

El `schema.prisma` actual contiene 52 bloques `model`.

## WebSockets

`src/websockets/` está separado de `src/modules/`.

### `websockets.module.ts`

- módulo global
- registra `JwtModule` con `JWT_SECRET`
- exporta `EventsService`

### `events.gateway.ts`

- namespace: `/ws`
- acepta token desde:
  - `handshake.auth.token`
  - header `Authorization: Bearer ...`
- valida JWT
- guarda en `client.data`:
  - `userId`
  - `email`
  - `rol`
- une sockets a rooms:
  - `user:{sub}`
  - `role:{rol}`

### `events.service.ts`

Expone:

- `emitToUser()`
- `emitToRole()`
- `emitToRoles()`
- `emitToAll()`

## Módulos en `src/modules/`

`src/modules/` contiene 24 carpetas.

### Infraestructura y core

| Carpeta | Prefijo | Función actual |
| --- | --- | --- |
| `ai/` | `ai` | Proxy hacia `apps/ai` para OCR y clasificación |
| `auditoria/` | — | Servicio global para registrar auditoría |
| `auth/` | `auth` | Login, register, refresh, forgot/reset password, perfil y logout |
| `health/` | `health` | Health check de base de datos, Redis y servicio AI |
| `uploads/` | `uploads` | Carpeta presente, pero sin archivos visibles en el árbol actual |

### Administración y catálogos

| Carpeta | Prefijo | Función actual |
| --- | --- | --- |
| `usuarios/` | `usuarios` | CRUD de usuarios y cambio de contraseña por admin |
| `clientes/` | `clientes` | CRUD de clientes, contactos y vistas relacionadas |
| `proveedores/` | `proveedores` | CRUD de proveedores |
| `categorias/` | `categorias` | Catálogo de categorías con endpoint público |
| `marcas/` | `marcas` | Catálogo de marcas con endpoint público |
| `modelos/` | `modelos` | Modelos de catálogo |
| `unidades-medida/` | `unidades-medida` | Catálogo de unidades de medida |
| `productos/` | `productos` | CRUD de productos, catálogo público, compatibilidades y proveedores |
| `config/` | `config` | Empresa, branding público, series, métodos de pago, tipos de movimiento y auditoría |
| `ubicaciones/` | `ubicaciones` | Búsqueda y reversa de ubicaciones/mapa |

### Operación y negocio

| Carpeta | Prefijo | Función actual |
| --- | --- | --- |
| `inventario/` | `inventario` | Almacenes, stock y movimientos |
| `equipos/` | `equipos` | Equipos serializados y lecturas SNMP |
| `garantias/` | `garantias` | Garantías y casos de garantía, con verificación pública por QR |
| `compras/` | `compras` | Órdenes de compra, recepciones y OCR de factura vía AI |
| `ventas/` | `ventas` | Cotizaciones, confirmación, entrega, cancelación y envío |
| `caja/` | `caja` | Cajas, aperturas, movimientos y arqueos |
| `facturacion/` | `facturacion` | Comprobantes, notas y envío asíncrono directo a SUNAT vía SOAP |
| `soporte/` | `soporte` | Tickets, adjuntos, repuestos, cierre y clasificación con AI |
| `reportes/` | `reportes` | Dashboard, ventas, stock, tickets, clientes y telemetría |

### Patrón general observado

La mayoría de módulos siguen `controller/service/dto`.

Excepciones visibles:

- `auditoria/` tiene `module` + `service`, sin controller
- `health/` tiene `module` + `controller`, sin service propio
- `facturacion/` agrega `sunat.processor.ts`
- `ai/` es integración, no CRUD clásico
- `uploads/` está vacío en el árbol actual

## Endpoints públicos verificados

Estos prefijos o rutas tienen acceso público por `@Public()`:

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/categorias/publico`
- `GET /api/v1/marcas/publico`
- `GET /api/v1/productos/catalogo`
- `GET /api/v1/productos/catalogo/:sku`
- `GET /api/v1/config/empresa/publica`
- `GET /api/v1/garantias/verificar/:codigoQR`
- `GET /api/v1/soporte/tickets/:codigo/publico`

El resto de controladores queda bajo JWT y, cuando corresponde, `@Roles(...)`.

## Configuración de empresa

`src/modules/config/` administra la configuración general de empresa.

Estado actual:

- `GET /api/v1/config/empresa/publica` expone datos públicos, branding, contacto público y textos públicos sin autenticación
- `GET /api/v1/config/empresa` y `PATCH /api/v1/config/empresa` son privados para `ADMIN`
- `ConfigEmpresa` guarda `razonSocial`, `ruc`, `direccion`, `telefono`, `email`, `logo`, branding público no sensible, contenido público, series/correlativos heredados e IGV

Uso definido para Bloque 1:

- usar los campos públicos/no sensibles de `ConfigEmpresa` para reemplazar textos hardcodeados del frontend
- no guardar certificados, claves ni series fiscales complejas nuevas en `ConfigEmpresa`

Avance Bloque 2:

- `ConfigEmpresaFiscal` existe en Prisma para datos tributarios no sensibles
- `SerieDocumento` existe en Prisma para series/correlativos futuros por documento
- `ComprobanteDetalle` existe en Prisma como línea fiscal congelable separada de `DetalleVenta`
- `ComprobanteEnvioLog` y `ClienteValidacionSunat` existen como base de auditoría/envío y validación documental
- runtime mínimo de emisión ya crea `ComprobanteDetalle`, guarda snapshot básico de emisor y registra `ComprobanteEnvioLog`
- `ConfiguracionFiscalService` expone configuración fiscal no sensible desde `FacturacionController`
- `SerieDocumentoService` usa `SerieDocumento` con fallback temporal a correlativos heredados de `ConfigEmpresa`
- endpoints administrativos fiscales disponibles:
  - `GET/PATCH /api/v1/facturacion/config-fiscal`
  - `GET/POST/PATCH/DELETE /api/v1/facturacion/series-documento`
  - `POST /api/v1/facturacion/series-documento/sync-legacy`
  - `GET/POST/PATCH/DELETE /api/v1/facturacion/clientes-validaciones`
  - `GET /api/v1/facturacion/envio-logs`
  - `GET /api/v1/facturacion/comprobantes/:id/envios`
- certificados, claves, provider/builder SUNAT formal y UI fiscal están implementados en el módulo tributario

Referencia: `docs/configuracion-empresa-branding.md`.

## Integraciones especiales

### AI desde API

`src/modules/ai/`:

- usa `HttpModule` con timeout `30000`
- reenvía archivos a:
  - `/ocr/invoice`
  - `/ocr/serial`
- reenvía clasificación a:
  - `/clasificar/ticket`
- envía `X-Internal-Key` al servicio AI

### Facturación asíncrona

`src/modules/facturacion/`:

- registra BullMQ con Redis
- crea colas BullMQ para comprobantes, bajas, consulta de tickets y monitor fiscal
- `sunat.processor.ts` procesa jobs:
  - `enviar-comprobante`
  - `enviar-nota-credito`
  - `enviar-nota-debito`
- emite eventos websocket a roles `ADMIN` y `ENCARGADO`
- usa emisión directa a SUNAT vía SOAP; en desarrollo local puede simular aceptación solo si el ambiente efectivo no es `PRODUCCION`

### Health real

`src/modules/health/health.controller.ts` verifica:

- PostgreSQL con `SELECT 1`
- Redis con `PING`
- servicio AI con `fetch(<AI_SERVICE_URL>/health)`

## Tests

### Unit tests

- Ubicación: `src/**/*.spec.ts`
- Cantidad detectada: 29 archivos `.spec.ts`
- Incluyen servicios, guards, interceptors, websockets, auth, AI y DTOs puntuales

### E2E tests

- Ubicación: `test/*.e2e-spec.ts`
- Cantidad detectada: 12 archivos `.e2e-spec.ts`
- Archivos de soporte:
  - `test/jest-e2e.json`
  - `test/test-app.factory.ts`

### `test/test-app.factory.ts`

La factory de e2e:

- crea la app con `AppModule`
- vuelve a aplicar prefijo global, pipes, filter e interceptors
- overridea `PrismaService`
- overridea `UploadsService`
- overridea la cola BullMQ `sunat`

En el estado actual, la suite e2e corre sobre una app controlada por mocks, no contra una base de datos real completa dentro de la propia factory.

## Scripts internos

### `src/scripts/export-sprint-01-openapi.ts`

- genera un documento OpenAPI filtrado para Sprint 01
- conserva rutas de:
  - `auth`
  - `usuarios`
  - `uploads`
  - `health`
- escribe salida en `../../docs/contracts/sprint-01-openapi.json`

### `scripts/reconcile-equipos-stock.ts`

- recorre productos serializados o con número de serie
- cuenta equipos por `productoId + almacenId`
- sincroniza `almacenStock` con el estado real de equipos

## Tooling

### ESLint

`eslint.config.mjs` usa:

- ESLint 9
- `typescript-eslint`
- `eslint-plugin-prettier/recommended`

Reglas destacadas:

- `@typescript-eslint/no-explicit-any`: `off`
- `@typescript-eslint/no-floating-promises`: `warn`
- `@typescript-eslint/no-unsafe-argument`: `warn`

### Prettier

`.prettierrc`:

- `singleQuote: true`
- `trailingComma: all`

## Estado actual del árbol

- `src/modules/uploads/` existe, pero no muestra archivos en el árbol revisado
- `generated/prisma/` existe como destino del cliente y queda poblado tras `prisma generate`
- `uploads/` existe a nivel de app y está vacío en el árbol actual
- `src/app.controller.ts` y `src/app.service.ts` siguen presentes como resto del scaffold de Nest, pero `AppModule` no los registra
