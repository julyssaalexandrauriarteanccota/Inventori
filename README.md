# Inventori

Guía inicial de la raíz del repositorio.

## Alcance de este README

Este documento cubre la **estructura de la raíz** y el **arranque local completo** del proyecto.

Para detalles internos de `apps/ai`, `apps/api`, `apps/web` y `packages/shared`, revisa los README propios de cada carpeta.

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
- `apps/ai`: servicio independiente en FastAPI para OCR y clasificación.
- `packages/shared`: paquete compartido para enums, tipos y esquemas.

Importante:

- `apps/ai` **no** forma parte del workspace de `pnpm`.
- El workspace de `pnpm` incluye `apps/api`, `apps/web` y `packages/*`.
- El comando raíz `pnpm dev` levanta `web`, `api` y `ai` en paralelo.

## Instalación rápida en otro equipo

Requisitos:

- Node.js `24`.
- pnpm `10`.
- Python `3.12`.
- Docker Desktop o Docker Engine con Compose.

Pasos desde una terminal en la raíz del proyecto:

```powershell
pnpm install
Copy-Item .env.example .env
docker compose up -d postgres redis minio minio-init
pnpm setup:ai
pnpm prisma:generate
pnpm db:migrate
pnpm dev
```

Antes de ejecutar `pnpm dev`, completa en `.env` los secretos vacíos que correspondan a tu entorno: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AI_INTERNAL_KEY`, credenciales SMTP, claves de IA y credenciales SUNAT si vas a probar emisión fiscal real.

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
- AI: `http://localhost:8000`
- PostgreSQL local: `localhost:5433`
- Redis local: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO consola: `http://localhost:9001`

Si clonas en Linux/macOS, crea el entorno de AI con estos comandos equivalentes:

```bash
cd apps/ai
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cd ../..
```

## Mapa de la raíz

| Ruta | Tipo | Propósito verificado | Observaciones |
| --- | --- | --- | --- |
| `.agents/` | Carpeta | Habilidades y recursos para flujos con agentes | Contiene `skills/` reutilizables |
| `.claude/` | Carpeta | Configuración compartida de Claude | La configuración local queda excluida por `.gitignore` |
| `.github/` | Carpeta | Workflows e instrucciones de trabajo por stack | Incluye `instructions/`, `skills/` y `workflows/` |
| `.vscode/` | Carpeta | Configuración del workspace para VS Code | Incluye `extensions.json` y `mcp.json` |
| `.windsurf/` | Carpeta | Habilidades para Windsurf | Estructura similar a `.agents/` |
| `SPRINTS/` | Carpeta | Planificación y secuencia de trabajo por sprint | Tiene README propio y archivos `00-19` |
| `apps/` | Carpeta | Aplicaciones principales del sistema | Contiene `ai`, `api` y `web` |
| `docker/` | Carpeta | Dockerfiles por servicio | Tiene `Dockerfile.ai`, `Dockerfile.api`, `Dockerfile.web` |
| `docs/` | Carpeta | Documentación auxiliar y contratos | Contiene `contracts/` y `superpowers/` |
| `packages/` | Carpeta | Paquetes compartidos del monorepo | Actualmente contiene `shared/` |

## Contenido inicial de carpetas clave

### `apps/`

Primer nivel verificado:

- `apps/ai`
- `apps/api`
- `apps/web`

### `packages/`

Primer nivel verificado:

- `packages/shared`

### `docs/`

Primer nivel verificado:

- `docs/contracts`
- `docs/superpowers`

Archivos detectados en `docs/contracts/`:

- `sprint-01-openapi.json`
- `sprint-02-master-data.md`
- `sprint-03-inventario.md`
- `sprint-04-equipos-garantias.md`
- `sprint-05-compras.md`
- `sprint-06-ventas.md`
- `sprint-07-facturacion.md`
- `sprint-08-soporte.md`
- `sprint-09-config-reportes.md`

### `docker/`

Primer nivel verificado:

- `docker/Dockerfile.ai`
- `docker/Dockerfile.api`
- `docker/Dockerfile.web`

### `SPRINTS/`

Esta carpeta ya tiene una documentación útil en `SPRINTS/README.md`.

Primer nivel verificado:

- `00-CHECKLIST-GLOBAL.md`
- `00-MAPA-TABLAS.md`
- `00-REGLAS-AGENTS.md`
- `01-backend-auth-usuarios.md` a `19-deploy-produccion.md`
- `_handoff-template.md`
- `archive/`

### Carpetas de tooling y asistentes

Estas carpetas no representan módulos funcionales del ERP, sino configuración y soporte del entorno:

- `.agents/skills/`
- `.windsurf/skills/`
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
| `.gitignore` | Exclusiones de secretos, archivos generados y artefactos locales como `node_modules`, `.env`, `.venv`, `.next`, `dist`, uploads y cliente Prisma generado |
| `opencode.json` | Configuración MCP local para `shadcn` |



## Comandos raíz verificados

Desde la raíz del repositorio:

- Instalar dependencias: `pnpm install`
- Preparar entorno Python de AI: `pnpm setup:ai`
- Generar cliente Prisma: `pnpm prisma:generate`
- Revisar estado de migraciones: `pnpm db:status`
- Ejecutar migraciones en desarrollo: `pnpm db:migrate`
- Aplicar migraciones preparadas: `pnpm db:deploy`
- Reconstruir base local de desarrollo: `pnpm db:reset`
- Ejecutar seed: `pnpm db:seed`
- Levantar todo: `pnpm dev`
- Levantar web: `pnpm dev:web`
- Levantar api: `pnpm dev:api`
- Levantar ai: `pnpm dev:ai`
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
6. `test-ai`
7. `build`

Toolchain verificado en CI:

- Node `24`
- `pnpm` `10`
- Python `3.12` para `apps/ai`

## Estado de los README

- `SPRINTS/README.md`: documentado
- `apps/api/README.md`: documentado
- `apps/web/README.md`: documentado
- `apps/ai/README.md`: documentado
- `packages/shared/README.md`: documentado
- `docs/README.md`: documentado
- `docs/arquitectura-escalable-erp.md`: plan de arquitectura escalable
- `docs/handoff-arquitectura-escalable.md`: resumen actualizado para retomar el trabajo en otro chat/agente
- `docs/configuracion-empresa-branding.md`: guía para usar `ConfigEmpresa` como branding/datos públicos
- `docs/seguimiento-arquitectura-escalable.md`: checklist de implementación por bloques
- `docs/auditoria-reventa-hardcoded.md`: auditoría de textos hardcodeados por rubro
- `docs/facturacion-sunat-roadmap.md`: roadmap futuro SUNAT
- `docs/multisede-futuro.md`: decisión actual de sede única y diseño futuro para multi-sede operativo
