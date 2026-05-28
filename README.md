# Inventori

Guía inicial de la raíz del repositorio.

## Alcance de este README

Este documento cubre la **estructura de la raíz** y el **arranque local completo** del proyecto.

Para detalles internos de `apps/api`, `apps/web` y `packages/shared`, revisa los README propios de cada carpeta.

La información aquí fue verificada contra la estructura real del repositorio y estos archivos de configuración:

- `AGENTS.md`
- `package.json`
- `pnpm-workspace.yaml`
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `.gitignore`

## Qué es este repositorio

`Inventori` es un ERP full-stack organizado como monorepo con estas piezas principales:

- `apps/web`: frontend en Next.js.
- `apps/api`: backend en NestJS.
- `packages/shared`: paquete compartido para enums, tipos y esquemas.

Importante:

- El workspace de `pnpm` incluye `apps/api`, `apps/web` y `packages/*`.
- El comando raíz `pnpm dev` levanta `web` y `api` en paralelo.

## Instalación rápida en otro equipo

Requisitos:

- Node.js `24`.
- pnpm `10`.
- Docker Desktop o Docker Engine con Compose.

Pasos desde una terminal en la raíz del proyecto:

```powershell
pnpm install
Copy-Item .env.example .env
docker compose up -d postgres redis minio minio-init
pnpm prisma:generate
pnpm db:migrate
pnpm dev
```

Antes de ejecutar `pnpm dev`, completa en `.env` los secretos vacíos que correspondan a tu entorno: `JWT_SECRET`, `JWT_REFRESH_SECRET`, credenciales SMTP y credenciales SUNAT si vas a probar emisión fiscal real.

### Base de datos y Prisma

En una instalación nueva, la estructura de la base de datos se crea desde las migraciones de Prisma con `pnpm db:migrate`. Esto deja las tablas, columnas, claves e índices alineados con `apps/api/prisma/schema.prisma`.

Comandos útiles:

- `pnpm db:status`: revisa si la base está alineada con las migraciones.
- `pnpm db:migrate`: aplica migraciones en desarrollo y regenera el estado local.
- `pnpm db:deploy`: aplica migraciones pendientes en un entorno ya preparado.
- `pnpm db:seed`: carga datos iniciales.
- `pnpm db:reset`: borra y reconstruye la base de datos de desarrollo desde cero. Úsalo solo si puedes perder los datos locales o después de hacer backup.

Si ya existe una base antigua y Prisma detecta diferencias por columnas, claves o cambios hechos durante desarrollo, no edites tablas a mano. Primero ejecuta `pnpm db:status`; si es una base de desarrollo descartable, usa `pnpm db:reset` y luego `pnpm db:seed` si necesitas datos iniciales. Si contiene información real, respáldala y crea una migración controlada antes de aplicar cambios.

También existe un respaldo temporal de datos de prueba en `database-backups/erp_db_demo_backup.sql`. Revisa `database-backups/README.md` para restaurarlo.

Servicios locales:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Swagger API: `http://localhost:4000/api/docs`
- PostgreSQL local: `localhost:5433`
- Redis local: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO consola: `http://localhost:9001`

## Mapa de la raíz

| Ruta | Tipo | Propósito verificado | Observaciones |
| --- | --- | --- | --- |
| `.agents/` | Carpeta | Habilidades y recursos para flujos con agentes | Contiene `skills/` reutilizables |
| `.claude/` | Carpeta | Configuración compartida de Claude | La configuración local queda excluida por `.gitignore` |
| `.github/` | Carpeta | Workflows e instrucciones de trabajo por stack | Incluye `instructions/`, `skills/` y `workflows/` |
| `.vscode/` | Carpeta | Configuración del workspace para VS Code | Incluye `extensions.json` y `mcp.json` |
| `apps/` | Carpeta | Aplicaciones principales del sistema | Contiene `api`, `web` y el sidecar PHP `greenter/` |
| `docker/` | Carpeta | Dockerfiles por servicio | Tiene `Dockerfile.api` y `Dockerfile.web` |
| `docs/` | Carpeta | Documentación auxiliar | Contiene `superpowers/` (design specs); `contracts/` se genera bajo demanda con `pnpm --filter @erp/api swagger:export:sprint-01` |
| `packages/` | Carpeta | Paquetes compartidos del monorepo | Actualmente contiene `shared/` |

## Contenido inicial de carpetas clave

### `apps/`

Primer nivel verificado:

- `apps/api`
- `apps/web`

### `packages/`

Primer nivel verificado:

- `packages/shared`

### `docs/`

Primer nivel verificado:

- `docs/superpowers` — design specs (skill `brainstorming`)

### `docker/`

Primer nivel verificado:

- `docker/Dockerfile.api`
- `docker/Dockerfile.web`

### Carpetas de tooling y asistentes

Estas carpetas no representan módulos funcionales del ERP, sino configuración y soporte del entorno:

- `.agents/skills/`
- `.github/instructions/`
- `.github/skills/`
- `.vscode/`
- `.claude/`

## Archivos raíz importantes

| Archivo | Propósito verificado |
| --- | --- |
| `README.md` | Este documento, limitado a la capa raíz |
| `AGENTS.md` | Fuente principal de notas operativas verificadas para trabajar el repo |
| `CLAUDE.md` | Guía complementaria; remite a `AGENTS.md` como fuente prioritaria |
| `package.json` | Scripts raíz para `dev`, `build`, `lint` y `type-check` |
| `pnpm-workspace.yaml` | Define el workspace: `apps/api`, `apps/web` y `packages/*` |
| `pnpm-lock.yaml` | Lockfile del monorepo |
| `docker-compose.yml` | Infraestructura local: PostgreSQL, Redis, MinIO y backups |
| `.gitignore` | Exclusiones de secretos, archivos generados y artefactos locales como `node_modules`, `.env`, `.next`, `dist`, uploads y cliente Prisma generado |
| `opencode.json` | Configuración MCP local para `shadcn` |



## Comandos raíz verificados

Desde la raíz del repositorio:

- Instalar dependencias: `pnpm install`
- Generar cliente Prisma: `pnpm prisma:generate`
- Revisar estado de migraciones: `pnpm db:status`
- Ejecutar migraciones en desarrollo: `pnpm db:migrate`
- Aplicar migraciones preparadas: `pnpm db:deploy`
- Reconstruir base local de desarrollo: `pnpm db:reset`
- Ejecutar seed: `pnpm db:seed`
- Levantar todo: `pnpm dev`
- Levantar web: `pnpm dev:web`
- Levantar api: `pnpm dev:api`
- Build completo: `pnpm build`
- Lint general: `pnpm lint`
- Verificación de tipos: `pnpm type-check`

Orden de build verificado en `package.json`:

1. `build:shared`
2. `build:web`
3. `build:api`

## Infraestructura local desde la raíz

`docker-compose.yml` define estos servicios:

- `postgres` en `5433` del host, mapeado a `5432` dentro del contenedor
- `redis` en `6379`
- `minio` en `9000` y `9001`
- `backup` como contenedor separado para respaldos programados

## CI verificado

El workflow principal está en `.github/workflows/ci.yml`.

Secuencia observada:

1. `lint`
2. `type-check`
3. `test-shared`
4. `test-api`
5. `test-web`
6. `build`

Toolchain verificado en CI:

- Node `24`
- `pnpm` `10`

## Estado de los README

- `apps/api/README.md`: documentado
- `apps/web/README.md`: documentado
- `packages/shared/README.md`: documentado
