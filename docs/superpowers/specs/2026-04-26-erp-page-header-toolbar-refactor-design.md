# ERP Page Header And Toolbar Refactor Design

## Goal

Reduce repeated top-of-page ERP UI code without over-generalizing domain-specific behavior.

## Current Problem

The ERP shell header is centralized in `src/components/layout/erp-shell.tsx`, but page-level headers and toolbars are duplicated across many ERP pages.

Repeated patterns currently include:

- Page title and description blocks
- Auto-refresh UI in page actions
- Overflow actions menu with refresh/export actions
- Search inputs with the same icon and clear affordance
- Filter trigger buttons with the same badge and chevron behavior

This duplication makes files longer, harder to scan, and harder to evolve consistently.

## Scope

This refactor targets the pages with the closest shared structure first:

- `clientes`
- `compras`
- `compras/proveedores`
- `equipos`
- `inventario`
- `soporte`
- `ventas`
- `ventas/facturacion`

The initial pass will not force `dashboard` or the report pages into the same abstraction if their structure is meaningfully different.

## Approach Options

### Option A: Keep all page headers inline and only copy cleanup patterns

Pros:

- Lowest short-term risk
- No new shared components

Cons:

- Duplication remains
- Consistency still depends on manual edits in many files
- Large page files stay large

### Option B: Extract only presentational primitives and keep domain state local

Pros:

- Good reduction in repeated UI code
- Keeps domain logic inside each page
- Low coupling and easy rollout

Cons:

- Some repeated auto-refresh state logic remains in pages

### Option C: Extract both UI primitives and a generic auto-refresh hook

Pros:

- Best duplication reduction
- Consistent timer and persisted preference behavior

Cons:

- Slightly higher implementation risk
- Requires more careful rollout across pages with different refresh semantics

## Recommendation

Use a hybrid of Option B and Option C:

- Extract shared UI primitives for page header and toolbar controls
- Extract a small generic auto-refresh hook only if it stays storage-agnostic and domain-agnostic
- Keep page-specific filters, popover bodies, tabs, and CTA behavior inside each page

This gives a strong reduction in code size while avoiding a “framework inside the app”.

## Shared Building Blocks

The new shared layer should live outside `components/ui/` and wrap existing shadcn primitives.

Planned components:

- `PageHeader`
  - Renders title, description, and right-side actions slot
- `AutoRefreshControl`
  - Renders enabled/disabled visual state
  - Shows interval selector while enabled
  - Shows manual refresh button while disabled
- `PageActionsMenu`
  - Generic overflow menu for page actions such as refresh/export
- `ToolbarSearchInput`
  - Shared search field with search icon and clear button
- `ToolbarFiltersButton`
  - Shared “Filtros” button with open state, active count, and chevron

Optional hook:

- `useStoredAutoRefresh`
  - Accepts read/write storage helpers and a refresh callback
  - Owns timer lifecycle and preference persistence

## Boundaries

Shared layer responsibilities:

- Repeated layout and control markup
- Consistent spacing and interaction states
- Reusable menu/search/filter button structure

Page responsibilities:

- Data fetching and refetch behavior
- Toast wording
- Filter state and popover body content
- Tabs and quick filters
- CTA actions like “Nuevo”, “Registrar movimiento”, “Escanear factura”

## Rollout Plan

1. Add shared layout/toolbar components.
2. Migrate the first group of highly similar CRUD pages.
3. Migrate `inventario` using the same building blocks where they fit without forcing tab-specific toolbars into a single abstraction.
4. Re-run type-check and sidebar shell tests.
5. Leave second-wave pages for a later pass if their layouts are materially different.

## Validation

Minimum validation:

- `pnpm --filter @erp/web type-check`
- `pnpm --filter @erp/web exec vitest run src/components/shell-sidebar.test.tsx`

Manual verification focus:

- Page header alignment
- Auto-refresh behavior
- Search clear button behavior
- Filter trigger badge counts
- Responsive wrapping of right-side actions

