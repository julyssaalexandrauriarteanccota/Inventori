<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tech Stack

- **Next.js 16.2** (App Router, Turbopack), **TailwindCSS v4** (`@import "tailwindcss"` + `@theme` in `globals.css`), **shadcn/ui v4** (Radix primitives).
- **State**: TanStack React Query v5 for server state; React Context for auth. No Redux/Zustand.
- **Forms**: `react-hook-form` + `zod` + `@hookform/resolvers`.
- **Tables**: TanStack React Table.
- **Tests**: Vitest + React Testing Library (`src/**/*.{test,spec}.{ts,tsx}`).

## Route Groups

- `(public)` — Unauthenticated: `/catalogo`, `/contacto`, `/garantia`, `/ticket`.
- `(erp)` — Protected, role-gated: wrapped with `AuthGuard` + `SidebarProvider`. Roles: `ADMIN`, `ENCARGADO`, `TECNICO`.
- `/auth` — Login, signup, forgot/change password flows.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | API client — auto-injects JWT, refreshes on 401, retries |
| `src/lib/auth.ts` | Token storage helpers (localStorage + cookie) |
| `src/lib/erp-navigation.ts` | Route definitions + role-based access control |
| `src/components/auth-context.tsx` | Auth state: `useAuth()` hook |
| `src/components/providers.tsx` | React Query + Theme + Toast providers |
| `components.json` | shadcn/ui config (aliases: `@/components`, `@/ui`, `@/lib`, `@/hooks`) |

## Conventions

- **Server Components by default**; use `"use client"` only when interactivity is required.
- **API calls** go through `src/lib/api.ts` (`api.get<T>()`, `api.post<T>()`, etc.) — never call `fetch` directly.
- **Backend URL**: use `NEXT_PUBLIC_API_URL` env var; `src/lib/api.ts` reads it automatically.
- **Domain hooks** in `src/hooks/` wrap React Query (`useClientes()`, `useInventario()`, etc.).
- **Component folders**: `forms/` for domain forms, `tables/` for data tables, `modals/` for dialogs, `ui/` for shadcn primitives, `layout/` for shells.
- **`components/ui/` is read-only** — never edit shadcn primitives directly; override via composition or CSS vars.
- **Class names** use `cn()` helper (clsx + tailwind-merge) from `src/lib/utils.ts`.
- New ERP routes **must** be registered in `erp-navigation.ts` or they will redirect to access denied.
