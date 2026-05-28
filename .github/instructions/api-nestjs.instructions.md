---
description: "Use when writing or modifying NestJS API code: controllers, services, DTOs, modules, guards, interceptors, or decorators in apps/api. Covers required patterns, naming, and forbidden anti-patterns."
applyTo: "apps/api/src/**"
---

# NestJS API Conventions

Ver estructura de módulos y arquitectura general en [`AGENTS.md`](../../AGENTS.md).

## Estructura de módulos

- Cada módulo sigue: `module/controller/service/dto/` dentro de `apps/api/src/modules/<name>/`
- No crear archivos fuera de esta estructura sin justificación

## DTOs

```ts
// Patrón obligatorio para updates
export class UpdateXxxDto extends PartialType(CreateXxxDto) {}
```

- Validar siempre con `class-validator` (`@IsString()`, `@IsUUID()`, etc.)
- Nunca `PUT`; usar `PATCH` para actualizaciones parciales

## Controllers

```ts
@ApiTags('nombre-modulo')       // obligatorio
@ApiOperation({ summary: '...' }) // obligatorio en cada endpoint
```

- Respuesta estándar: `{ data, meta }` — ya inyectada por `TransformInterceptor` global
- Listas **siempre** paginadas (incluir `page`, `limit`, `total` en meta)
- Endpoints protegidos deben declarar `@Roles(Role.ADMIN, ...)` — roles: `ADMIN`, `ENCARGADO`, `TECNICO`

## Services

- `PrismaService` **siempre por DI**; nunca `new PrismaClient()`
- Importar `PrismaService` desde `../../prisma/prisma.service` (no desde `@prisma/client`)
- Usar `Logger` de `@nestjs/common`; **nunca `console.log`**
- Soft delete obligatorio en entidades de negocio: `deletedAt DateTime?` en schema → filtrar con `where: { deletedAt: null }`
