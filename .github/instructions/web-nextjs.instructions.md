---
applyTo: "apps/web/**"
description: "Frontend conventions for Next.js 16.2 + React 19 + TailwindCSS v4 + shadcn/ui v4 in apps/web."
---

# Web Frontend Conventions

Detalle completo en [`apps/web/AGENTS.md`](../../apps/web/AGENTS.md). Reglas de arquitectura general en [`AGENTS.md`](../../AGENTS.md).

## Reglas críticas

- **Next.js 16.2 tiene breaking changes**: verificar APIs en `node_modules/next/dist/docs/` antes de escribir código basado en memoria.
- **Server Components por defecto**; usar `"use client"` solo cuando se requiera interactividad.
- **Llamadas HTTP** pasan por `src/lib/api.ts` (`api.get<T>()`, `api.post<T>()`, etc.); **nunca** llamar `fetch` directamente.
- **`components/ui/` es read-only** — nunca editar primitivas shadcn; sobreescribir vía composición o variables CSS.
- **Class names** con el helper `cn()` de `src/lib/utils.ts` (clsx + tailwind-merge).

## Estructura

- Hooks de dominio en `src/hooks/` envolviendo TanStack Query (`useClientes()`, `useInventario()`, …).
- Formularios en `src/components/forms/` usando `react-hook-form` + schemas Zod de `@erp/shared`.
- Tablas en `src/components/tables/` usando TanStack Table.
- Modales en `src/components/modals/`, layouts/shells en `src/components/layout/`.

## Routing y autorización

- Rutas ERP nuevas **deben** registrarse en `src/lib/erp-navigation.ts`; rutas no registradas redirigen a access denied.
- Roles permitidos (de `@erp/shared`): `ADMIN`, `ENCARGADO`, `TECNICO` — no agregar roles nuevos sin actualizar el enum compartido.

## Tipos y schemas compartidos

- Enums, types y schemas Zod vienen de `@erp/shared` (`packages/shared`).
- Tras modificar `packages/shared`: `pnpm --filter @erp/shared build`.

## Tests

```bash
pnpm --filter @erp/web test    # Vitest + jsdom + RTL, src/**/*.{test,spec}.{ts,tsx}
```
