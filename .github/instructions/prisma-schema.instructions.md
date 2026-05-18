---
description: "Use when modifying the Prisma schema, creating migrations, or adding new models to apps/api/prisma/schema.prisma. Covers required fields, naming conventions, and index rules."
applyTo: "apps/api/prisma/**"
---

# Prisma Schema Conventions

Ver mapa completo de tablas en [`SPRINTS/00-MAPA-TABLAS.md`](../../SPRINTS/00-MAPA-TABLAS.md).

## Campos obligatorios en todo modelo

```prisma
id        String    @id @default(uuid())
createdAt DateTime  @default(now())
updatedAt DateTime  @updatedAt
deletedAt DateTime?              // solo en entidades de negocio (soft delete)
```

## Enums

- Los enums del schema **deben** estar alineados con `packages/shared/src/enums/`
- Si necesitas un enum nuevo, crearlo primero en `packages/shared`, luego usarlo en Prisma
- Después de cambiar enums compartidos: `pnpm --filter @erp/shared build`

## Índices

- **Indexar todas las foreign keys**: `@@index([foreignKeyField])`
- Campos usados frecuentemente como filtro también deben indexarse

## Prisma v7 — particularidades

- El cliente generado está en `apps/api/generated/prisma` (no en `node_modules/@prisma/client`)
- El datasource **no** lleva `url` directamente; la URL va en `prisma.config.ts` via `@prisma/adapter-pg`
- Nunca usar `new PrismaClient()` sin el adapter `PrismaPg`

## Workflow de migración

```bash
pnpm --filter @erp/api exec prisma migrate dev --name <descripcion>
pnpm --filter @erp/api exec prisma generate
```
