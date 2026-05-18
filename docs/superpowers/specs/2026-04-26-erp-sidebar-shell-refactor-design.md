# ERP Sidebar Shell Refactor Design

## Context

The ERP shell sidebar currently mixes layout orchestration, navigation rendering, user actions, and a very large settings dialog in the same render tree. This creates three concrete problems:

- Sidebar expand/collapse feels slow and visually unstable.
- Collapsed icon alignment is inconsistent and hard to tune.
- The code is difficult to understand because responsibilities are not clearly separated.

The current implementation also violates the repo expectation that UI primitives in `src/components/ui/` stay read-only and that app behavior should be composed around them instead of patched inside them.

## Goals

- Preserve the current ERP visual language as much as possible.
- Keep existing behavior working:
  - theme switching
  - role-based navigation
  - active route highlighting
  - badges
  - settings access
  - sidebar keyboard toggle
- Improve perceived sidebar performance.
- Make the ERP shell easier to extend without growing a single large component.

## Non-Goals

- Rebuild the ERP navigation system from scratch.
- Change route authorization rules.
- Rewrite shadcn sidebar primitives.
- Redesign the settings feature itself beyond the shell integration needed for this refactor.

## Design

### 1. ERP Shell Separation

Move the visual shell composition out of `apps/web/src/app/(erp)/layout.tsx` into a dedicated component in `src/components/layout/`.

Responsibilities:

- layout file keeps auth and providers wiring
- shell component owns sidebar, header, breadcrumb, and content frame

This keeps the route layout focused on routing concerns and moves ERP chrome concerns into a reusable unit.

### 2. Sidebar Composition

Keep `AppSidebar` as the public sidebar entry point, but reduce it to a small composition layer. Split sidebar concerns into focused pieces:

- brand/header block
- nav rendering
- settings trigger
- user/footer block

The sidebar remains built on the existing read-only `ui/sidebar` primitives.

### 3. Settings Dialog Decoupling

The settings dialog is currently mounted inside the sidebar footer. That means a very large component tree participates in sidebar renders and contributes to the collapse/expand jank.

Refactor to a provider-driven pattern:

- add a settings dialog provider at ERP shell level
- render the heavy dialog host outside the sidebar tree
- expose an `openSettings()` action
- sidebar renders only a lightweight trigger button

This preserves the same user capability while removing heavy configuration content from the sidebar render path.

### 4. Controlled Settings Dialog

Update the settings dialog component so it can operate in controlled mode:

- `open`
- `onOpenChange`
- optional trigger rendering

This allows the provider host to manage mount timing while keeping the current dialog internals intact.

### 5. Sidebar Visual Contract

Define a consistent collapsed-state contract in app-level sidebar components:

- buttons centered when collapsed
- icon tiles do not shrink excessively
- collapsed controls use stable spacing
- footer and brand blocks obey the same alignment rules
- header height remains stable to avoid layout jumps

This avoids scattering ad hoc collapsed-state overrides across unrelated files.

### 6. Validation

Validate the refactor through:

- existing sidebar/unit tests updated for new composition
- local browser verification of collapse/expand behavior
- smoke checks for:
  - theme switching
  - settings dialog opening
  - role-based nav rendering

## Risks

- The settings dialog has a very large internal surface area, so the refactor should preserve its internal behavior and only change how it is mounted.
- Sidebar visual tweaks should stay conservative to avoid unnecessary regressions in the ERP shell.

## Recommended Implementation Order

1. Create ERP shell component and settings provider.
2. Make settings dialog controllable and lazily mounted.
3. Refactor `AppSidebar` into smaller composition pieces.
4. Clean up navigation rendering and collapsed-state styling.
5. Update tests.
6. Verify in the in-app browser.
