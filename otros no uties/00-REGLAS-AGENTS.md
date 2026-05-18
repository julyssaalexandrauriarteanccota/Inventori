# Reglas obligatorias tomadas de AGENTS.md

Este archivo no reemplaza `AGENTS.md`. Solo resume las reglas que deben
aplicarse en todos los sprints para que la ejecucion no se desvie.

## Regla superior

- [ ] Si hay conflicto entre esta carpeta y `AGENTS.md`, gana `AGENTS.md`

## Arquitectura

- [ ] Existen exactamente 3 servicios: `apps/web`, `apps/api`, `apps/ai`
- [ ] `web` siempre llama a `api`; `web` nunca llama directo a `ai`
- [ ] El sitio publico vive en `apps/web/src/app/(public)`
- [ ] El ERP interno vive en `apps/web/src/app/(erp)`
- [ ] `packages/shared` es la fuente de enums, tipos y schemas compartidos

## Roles

- [ ] Los roles son exactamente `ADMIN`, `ENCARGADO` y `TECNICO`
- [ ] No crear roles nuevos
- [ ] Cada endpoint protegido debe declarar `@Roles(...)`
- [ ] Los permisos por rol deben respetar literalmente `AGENTS.md`

## NestJS - `apps/api`

- [ ] Cada modulo mantiene estructura `module/controller/service/dto`
- [ ] DTOs con `class-validator`
- [ ] `UpdateDto extends PartialType(CreateDto)`
- [ ] `PrismaService` por DI; nunca `new PrismaClient()`
- [ ] `@ApiTags()` y `@ApiOperation()` en controllers
- [ ] Respuesta estandar `{ data, meta }`
- [ ] Listas siempre paginadas
- [ ] `PATCH` para actualizacion parcial; no usar `PUT`
- [ ] No usar `console.log`; usar `Logger`
- [ ] Soft delete en entidades de negocio

## Next.js - `apps/web`

- [ ] Server Components por defecto
- [ ] `use client` solo cuando sea necesario
- [ ] TanStack Query para fetching en client components
- [ ] Formularios con `react-hook-form` + Zod + `@erp/shared`
- [ ] No modificar `components/ui/`
- [ ] `NEXT_PUBLIC_API_URL` para URLs del backend

## FastAPI - `apps/ai`

- [ ] Usar modelos Pydantic, no dicts crudos
- [ ] Solo `claude_service.py` importa `anthropic`
- [ ] Validar `X-Internal-Key` en todos los endpoints privados
- [ ] Tareas pesadas via Celery

## Prisma y datos

- [ ] `id String @id @default(uuid())`
- [ ] `createdAt` y `updatedAt`
- [ ] `deletedAt` para soft delete donde aplique
- [ ] Enums alineados con `packages/shared`
- [ ] Indexar foreign keys
- [ ] Respetar reglas SUNAT, garantias, inventario y series del negocio

## Testing

- [ ] `apps/api` usa Jest
- [ ] `apps/web` usa Vitest
- [ ] `apps/ai` usa pytest
- [ ] `packages/shared` usa Vitest
- [ ] No cerrar sprint sin validacion real
