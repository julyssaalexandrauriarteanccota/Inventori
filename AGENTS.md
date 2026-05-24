# AGENTS.md

High-signal repo notes for AI coding agents. Keep this file strict: only verified behavior from code/config.

## Workspace Shape

- Monorepo uses `pnpm-workspace.yaml` with `apps/api`, `apps/web`, and `packages/*`.
- `apps/ai` is **not** a pnpm workspace package; it is a standalone Python service.
- Root dev entrypoint runs all 3 services concurrently: `pnpm dev`.
  - `dev:web`: `pnpm --filter @erp/web dev` (Next.js, default `3000`)
  - `dev:api`: `pnpm --filter @erp/api start:dev` (NestJS, `PORT_API` default `4000`)
  - `dev:ai`: `cd apps/ai && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000` (FastAPI, `8000`). The venv must exist at `apps/ai/.venv`.

## Verified Command Source of Truth

- Install deps: `pnpm install` (CI uses `pnpm install --frozen-lockfile`).
- Repo checks follow CI order: `pnpm lint` -> `pnpm type-check` -> tests -> `pnpm build`.
- Root build depends on shared first: `pnpm build` runs `build:shared` -> `build:web` -> `build:api`.
- API lint auto-fixes: `apps/api` lint script uses `eslint ... --fix`.
- CI toolchain: Node `24`, pnpm `10`.

## Focused Test Commands

- Shared only: `pnpm --filter @erp/shared test` (Vitest run mode).
- Web only: `pnpm --filter @erp/web test` (Vitest, jsdom, `src/**/*.{test,spec}.{ts,tsx}`).
- API unit specs only: `pnpm --filter @erp/api test` (Jest on `src/**/*.spec.ts`).
- API e2e only: `pnpm --filter @erp/api test:e2e` (config `apps/api/test/jest-e2e.json`, matches `.e2e-spec.ts`).
- AI tests: `cd apps/ai && pytest --tb=short` (matches CI behavior).

## Architecture Constraints That Affect Edits

- `packages/shared` exports shared enums/types/schemas and is consumed by both `api` and `web` via workspace dependency `@erp/shared`.
- Roles are enforced from shared enum: `ADMIN`, `ENCARGADO`, `TECNICO` (`packages/shared/src/enums/roles.enum.ts`).
- API uses global prefix `api/v1` (`apps/api/src/main.ts`); web client default base URL is `http://localhost:4000/api/v1` (`apps/web/src/lib/api.ts`).
- API wraps non-paginated responses as `{ data, meta.timestamp }` via global `TransformInterceptor`; errors are normalized to `{ error: { code, message, statusCode } }` via global exception filter.
- API config loads env from repo root `.env` (`ConfigModule.forRoot({ envFilePath: '../../.env' })`).
- AI config also loads repo root `.env` (`SettingsConfigDict(env_file='../../.env')`).

## Data/Infra Quirks

- Prisma client is generated to `apps/api/generated/prisma` and `PrismaService` imports from that generated path (not `@prisma/client` directly).
- **Prisma v7 adapter**: uses `@prisma/adapter-pg` with `PrismaPg(connectionString)` — datasource has NO `url`; config lives in `prisma.config.ts`. Never call `new PrismaClient()` without the adapter.
- `apps/api/prisma/schema.prisma` currently has 61 `model` blocks. Historical table ownership notes live in [`otros no uties/00-MAPA-TABLAS.md`](otros%20no%20uties/00-MAPA-TABLAS.md); verify against Prisma before relying on them.
- Migration workflow: `pnpm --filter @erp/api exec prisma migrate dev --name <description>`, then `pnpm --filter @erp/api exec prisma generate`.
- CI API tests require PostgreSQL + Redis service containers and run `npx prisma migrate deploy` before tests.
- `docker-compose.yml` provisions local `postgres` (pgvector/pgvector:pg16, host port `5433` mapped to container `5432`), `redis` (7-alpine, `6379`), `minio` (`9000/9001`), and cron-based `backup`/`minio-backup` services.
- Swagger API docs available at `http://localhost:4000/api/docs` when API is running.

## AI Service (apps/ai)

- Standalone FastAPI service (Python 3.12, **not** a pnpm workspace member).
- Endpoints: `/ocr`, `/clasificar`, `/health`. Internal-only via `X-Internal-Key` header.
- `web` never calls `ai` directly; always routes through `api`.
- Async tasks use Celery + Redis. Anthropic/OpenAI for OCR classification.
- Tests: `cd apps/ai && pytest --tb=short`.

## Web-Specific Guardrails

- Follow `apps/web/AGENTS.md` for frontend conventions.
- Next.js 16.2 has breaking changes — verify APIs against `node_modules/next/dist/docs/` when behavior is uncertain.
- ERP route authorization is centralized in `apps/web/src/lib/erp-navigation.ts` and uses exact route matching; unknown ERP paths are treated as unauthorized and redirect.

## Module / Feature Patterns

- **API modules** (25 total) follow `module/controller/service/dto/` structure inside `apps/api/src/modules/<name>/`:
  `ai`, `auditoria`, `auth`, `caja`, `categorias`, `clientes`, `compras`, `config`, `equipos`, `facturacion`, `garantias`, `health`, `inventario`, `marcas`, `modelos`, `portal-cliente`, `productos`, `proveedores`, `reportes`, `soporte`, `ubicaciones`, `unidades-medida`, `uploads`, `usuarios`, `ventas`.
- **Web route groups** under `apps/web/src/app/`: `(public)` (sitio público sin auth), `(erp)` (ERP interno con auth + roles), `(pos)` (punto de venta), `auth/` (login/signup/recovery).
- **Web features** live under `apps/web/src/app/(erp)/<name>/` with hooks in `src/hooks/`, forms in `src/components/forms/`, tables in `src/components/tables/`.
- **Web capabilities**: PWA via Serwist, WebSockets via socket.io-client, PDF generation via @react-pdf/renderer.
- **Shared enums/types/schemas** go in `packages/shared/src/` — both `api` and `web` consume them via `@erp/shared`. Always rebuild after changes: `pnpm --filter @erp/shared build`.

## Key Documentation

- Start from the nearest folder README before deep-diving into implementation docs or inferring structure:
  - Root map: [`README.md`](README.md)
  - API service: [`apps/api/README.md`](apps/api/README.md)
  - Web service: [`apps/web/README.md`](apps/web/README.md)
  - AI service: [`apps/ai/README.md`](apps/ai/README.md)
  - Shared package: [`packages/shared/README.md`](packages/shared/README.md)
  - Supporting docs index: [`docs/README.md`](docs/README.md)
  - SUNAT docs index: [`comprobantes sunat/README.md`](comprobantes%20sunat/README.md)
- Historical sprint/archive index: [`otros no uties/README.md`](otros%20no%20uties/README.md) — planning context only.
- Historical agent/planning rules: [`otros no uties/00-REGLAS-AGENTS.md`](otros%20no%20uties/00-REGLAS-AGENTS.md) — useful context, not executable truth.
- Per-sprint API contracts: [`docs/contracts/`](docs/contracts/) — freeze payloads, filters, and frontend fields.
- Historical table ownership map: [`otros no uties/00-MAPA-TABLAS.md`](otros%20no%20uties/00-MAPA-TABLAS.md) — verify against `schema.prisma` before editing data models.
- Scoped instructions (auto-applied): [`.github/instructions/`](.github/instructions/) — NestJS (`apps/api/src/**`), FastAPI (`apps/ai/**/*.py`), Prisma (`apps/api/prisma/**`), and Next.js (`apps/web/**`).
- Frontend conventions: [`apps/web/AGENTS.md`](apps/web/AGENTS.md).
- CI pipeline (lint -> type-check -> tests -> build, with Postgres + Redis services): [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Instruction Hygiene

- Treat files in `otros no uties/` as historical planning artifacts; executable truth is in code/config/scripts.
- If prose docs conflict with scripts/config, follow scripts/config.
- Link to existing docs/READMEs instead of duplicating long explanations in customization files.
