# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Primary source of truth:** [`AGENTS.md`](AGENTS.md). If anything below conflicts with `AGENTS.md`, follow `AGENTS.md`. Scoped rules in [`.github/instructions/`](.github/instructions/) apply automatically to their respective paths (`apps/api/src/**`, `apps/api/prisma/**`, `apps/web/**`).

---

## What This Project Is

**Inventori** is a full-stack ERP for office equipment companies (copiers/printers), built as a `pnpm` monorepo. Two runtime services + shared package:

| Service | Stack | Port | Workspace? |
|---------|-------|------|------------|
| `apps/web` | Next.js 16.2 + React 19 + TailwindCSS v4 + shadcn/ui v4 | 3000 | yes (`@erp/web`) |
| `apps/api` | NestJS 11 + TypeScript + Prisma v7 + PostgreSQL | 4000 | yes (`@erp/api`) |
| `packages/shared` | Enums, Zod schemas, TS types | — | yes (`@erp/shared`) |

`pnpm-workspace.yaml` includes `apps/api`, `apps/web`, `packages/*`.

Infrastructure (Docker Compose): PostgreSQL 16 + pgvector, Redis 7, MinIO (S3-compatible), backup cron.

---

## Commands

### Start everything
```bash
docker-compose up -d   # Start infra first (postgres, redis, minio, backup)
pnpm dev               # Runs web + api concurrently
```

Individual services: `pnpm dev:web` / `pnpm dev:api`

### Build (order matters: shared → web → api)
```bash
pnpm build
```

After modifying `packages/shared`:
```bash
pnpm --filter @erp/shared build
```

### Lint & type-check (CI order)
```bash
pnpm lint        # pnpm -r lint — fans out per package
pnpm type-check  # shared → web → api
```

CI toolchain: Node 24, pnpm 10. CI order: `lint → type-check → tests → build`. Only `apps/api` lint runs `eslint --fix`; web and shared do not auto-fix.

### Tests
```bash
pnpm --filter @erp/shared test    # Vitest
pnpm --filter @erp/web test       # Vitest + jsdom + RTL
pnpm --filter @erp/api test       # Jest unit (src/**/*.spec.ts)
pnpm --filter @erp/api test:e2e   # Jest e2e — uses test-app.factory.ts with mocks
```

Run a single API spec: `pnpm --filter @erp/api test -- path/to/file.spec.ts`. Run a single web test: `pnpm --filter @erp/web test -- src/path/to/file.test.tsx`.

### Database (Prisma v7)
```bash
pnpm --filter @erp/api exec prisma migrate dev --name <description>
pnpm --filter @erp/api exec prisma generate
pnpm --filter @erp/api exec prisma db seed
```

Swagger docs: `http://localhost:4000/api/docs` (API must be running).

Sprint 01 OpenAPI export: `pnpm --filter @erp/api swagger:export:sprint-01` → writes `docs/contracts/sprint-01-openapi.json` (generado en runtime; el directorio no está commiteado).

---

## Architecture

### Data flow
```
Browser → Next.js (3000) → NestJS API (4000) → PostgreSQL / Redis / MinIO
```

### Shared package contract
`packages/shared` (`@erp/shared`) is the single source of truth for **enums, Zod schemas, and TypeScript types**. Both `api` and `web` consume it. Always rebuild after any change:
```bash
pnpm --filter @erp/shared build
```

`package.json` exports point `types` at `./src/index.ts` (live TS) but `default` at `./dist/index.js` — so JS consumers fail until you build. Roles are fixed: `ADMIN`, `ENCARGADO`, `TECNICO` (`packages/shared/src/enums/roles.enum.ts`) — do not add new roles.

### Standard API response shape
```json
{ "data": { ... }, "meta": { "timestamp": "...", "page": 1, "limit": 10, "total": 42 } }
```
Errors:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "statusCode": 400 } }
```
Both wrapped globally by `TransformInterceptor` and the global exception filter (`apps/api/src/main.ts`) — do not wire these per-endpoint.

### Web route groups (`apps/web/src/app/`)
- `(public)` — unauthenticated: `/`, `/catalogo`, `/contacto`, `/garantia`, `/ticket`, `/portal-cliente`, `/preview-design`
- `(erp)` — protected + role-gated, wrapped in `AuthGuard` + `ErpShell`. Authoritative subroute list + per-route role gating lives in `apps/web/src/lib/erp-navigation.ts` — don't enumerate routes by hand
- `(erp)/pos/` — POS subtree with its own `CartProvider`, restricted to `ADMIN` + `ENCARGADO` (see `src/lib/pos-navigation.ts`)
- `auth/` — login, signup, forgot-password, cambiar-contrasena

`src/proxy.ts` is a Next middleware (file is named `proxy.ts`, exported as middleware) that gates protected routes via the `erp_authenticated` cookie. New ERP routes **must** be registered in `apps/web/src/lib/erp-navigation.ts` or they redirect to `/acceso-denegado`.

---

## Key Patterns

### NestJS API modules (`apps/api/src/modules/`)
`alquileres`, `auditoria`, `auth`, `caja`, `categorias`, `clientes`, `compras`, `config`, `equipos`, `facturacion`, `garantias`, `health`, `inventario`, `marcas`, `modelos`, `portal-cliente`, `productos`, `proveedores`, `reportes`, `soporte`, `ubicaciones`, `unidades-medida`, `uploads`, `usuarios`, `ventas`.

API uses global prefix `api/v1` (`apps/api/src/main.ts`); the web client default base URL is `http://localhost:4000/api/v1`.

Required in every module:
- DTOs use `class-validator`; updates use `UpdateXxxDto extends PartialType(CreateXxxDto)`
- Controllers: `@ApiTags()` and `@ApiOperation()` on every endpoint
- Services: inject `PrismaService` via DI — **never `new PrismaClient()`**
- Use `Logger` from `@nestjs/common` — **never `console.log`**
- Use `PATCH` for partial updates — **never `PUT`**
- Lists always paginated with `page`, `limit`, `total` in meta
- Soft delete for business entities: filter `where: { deletedAt: null }`

Global guards (`AppModule`): `ThrottlerGuard` (100 req / 60s) → `JwtAuthGuard` → `RolesGuard`. Use `@Public()` to bypass JWT and `@Roles(RolUsuario.X)` to restrict.

### Prisma v7 quirks
- Generated client lives at `apps/api/generated/prisma` (not `@prisma/client`); `PrismaService` imports from `../../generated/prisma/client`
- Datasource has **no `url` field** — connection string lives in `prisma.config.ts` and is injected via `PrismaPg(connectionString)` adapter
- Always use the adapter: `new PrismaClient({ adapter: PrismaPg(...) })`
- All models require: `id String @id @default(uuid())`, `createdAt`, `updatedAt`
- New enums: create in `packages/shared` first, then reference in Prisma schema
- Index all foreign keys: `@@index([foreignKeyField])`
- `schema.prisma` currently has **55 `model` blocks**; 32 migration folders in `prisma/migrations/`

### Next.js (`apps/web`)
- **Server Components by default** — `"use client"` only when required
- Next.js 16.2 has breaking changes vs older versions; verify against `node_modules/next/dist/docs/` when uncertain
- API calls through `src/lib/api.ts` only (auto-injects JWT, refreshes on 401, emits `auth:expired`) — **never call `fetch` directly**
- Domain state via TanStack Query hooks in `src/hooks/`; React Query defaults are `staleTime: 5min`, `gcTime: 24h`, `networkMode: offlineFirst`
- Forms: `react-hook-form` + Zod schemas from `@erp/shared`
- Class names: `cn()` helper from `src/lib/utils.ts`
- **`components/ui/` is read-only** — never edit shadcn primitives; override via composition or CSS vars
- PWA via Serwist (sw built from `src/app/sw.ts` → `public/sw.js`); offline queue via IndexedDB in `use-offline-sync.ts`
- Realtime: `socket.io-client` connects to `/ws` namespace on the API

### Facturación SUNAT
- BullMQ queues with Redis power async SUNAT submission (`sunat.processor.ts`)
- Direct SUNAT SOAP submission; in non-`PRODUCCION` envs can simulate acceptance
- Emits websocket events to `ADMIN`/`ENCARGADO` rooms on `comprobante.aceptado` / `comprobante.rechazado`

---

## Critical Files

| File | Why It Matters |
|------|----------------|
| `AGENTS.md` | Verified-behavior source of truth — wins over all other docs |
| `apps/web/AGENTS.md` | Frontend-specific conventions (Next 16.2, shadcn, route groups). `apps/web/CLAUDE.md` is just `@AGENTS.md` (alias) |
| `apps/api/prisma.config.ts` | Prisma v7 adapter setup (DATABASE_URL lives here, not in schema) |
| `apps/api/src/main.ts` | Global prefix, helmet, CORS, ValidationPipe, interceptors, filters, Swagger |
| `apps/api/src/app.module.ts` | Loads `../../.env`, registers global guards, throttler, audit interceptor |
| `apps/web/src/lib/api.ts` | Fetch wrapper — JWT injection, 401 refresh, base URL |
| `apps/web/src/lib/erp-navigation.ts` | Route definitions + role-based access control (exact-match) |
| `apps/web/src/proxy.ts` | Next middleware — cookie-based gate for protected routes |
| `.env` (root) | Shared by both services. NestJS loads via `ConfigModule.forRoot({ envFilePath: '../../.env' })` |
| `docker-compose.yml` | Local infra: postgres `:5432`, redis `:6379`, minio `:9000/:9001`, backup cron |
| `.github/instructions/` | Auto-applied scoped rules (NestJS, Prisma, Next.js) |

---

## Folder READMEs (start here for deep dives)

Each main folder has a verified, detailed README — prefer these over inferring from code:

- [`README.md`](README.md) — root map and toolchain
- [`apps/api/README.md`](apps/api/README.md) — full module/endpoint/Prisma walkthrough
- [`apps/web/README.md`](apps/web/README.md) — App Router, providers, hooks, PWA, branding
- [`packages/shared/README.md`](packages/shared/README.md) — enums, Zod schemas, exported types
