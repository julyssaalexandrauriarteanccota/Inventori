# Design Spec: 4-Subagent Automated Design Pipeline

**Date**: 2026-05-20  
**Status**: APPROVED  

This document outlines the architecture, configuration, and orchestration pipeline for segmenting design system intelligence into 4 specialized subagents.

---

## 🗺️ Subagent Architecture

To avoid context fatigue and ensure that high-fidelity design guidelines (e.g., OKLCH scales, Bento grids, cubic-bezier curves, and UX cognitive laws) are strictly followed, the design intelligence is divided into 4 specialized subagents.

### 🏢 1. Design Token Architect (`design-token-architect`)
* **Role**: Configures colors, scales, spacings, and typographies.
* **Knowledge Files**:
  * [atmosferas.md](file:///c:/Inventori/design/atmosferas.md)
  * [colores.md](file:///c:/Inventori/design/colores.md)
  * [tipografias.md](file:///c:/Inventori/design/tipografias.md)
  * [espaciado.md](file:///c:/Inventori/design/espaciado.md)
* **Responsibilities**:
  * Configures global CSS scales and theme variables.
  * Injects HSL/OKLCH scales, light/dark mode parameters, and text pairings.
  * Ensures strict font and scale pairing in the base stylesheets.

### 📐 2. Structure & Component Engineer (`structure-component-engineer`)
* **Role**: Orchestrates markup structure, layout grids, and component spacing.
* **Knowledge Files**:
  * [layouts.md](file:///c:/Inventori/design/layouts.md)
  * [elementos-ui.md](file:///c:/Inventori/design/elementos-ui.md)
  * [iconos-app.md](file:///c:/Inventori/design/iconos-app.md)
* **Responsibilities**:
  * Designs layout structures (e.g., Bento grids, line grids).
  * Manages padding calculations, hierarchy, and nested border-radius values.
  * Controls page layouts and aligns components properly.

### ⚡ 3. Motion Engineer (`motion-engineer`)
* **Role**: Injects animations, transitions, hovers, and interactive states.
* **Knowledge Files**:
  * [microanimaciones.md](file:///c:/Inventori/design/microanimaciones.md)
  * [animaciones-mascaras.md](file:///c:/Inventori/design/animaciones-mascaras.md)
  * [iconos-animados.md](file:///c:/Inventori/design/iconos-animados.md)
  * [plataformas-iconos.md](file:///c:/Inventori/design/plataformas-iconos.md)
* **Responsibilities**:
  * Implements cubic-bezier curves, spring animations, and shimmers.
  * Applies overflow-masking for sliding transitions.
  * Handles interactive states (hover, press, focus, active).

### 👁️ 4. UX Usability Inspector (`ux-usability-inspector`)
* **Role**: Audits design usability, contrast, and cognitive constraints.
* **Knowledge Files**:
  * [leyes-ux.md](file:///c:/Inventori/design/leyes-ux.md)
  * [README.md](file:///c:/Inventori/design/README.md)
  * [herramientas-frontend.md](file:///c:/Inventori/design/herramientas-frontend.md)
* **Responsibilities**:
  * Validates adherence to the 12 UX Laws (Jakob's Law, Fitts's Law, etc.).
  * Verifies semantic colors consistency (Red for failure, Green for success).
  * Audits WCAG contrast ratios and accessibility.

---

## ⚙️ Orchestration Pipeline

When the main agent receives a layout or component request:

1. **Token Phase**: `design-token-architect` establishes CSS variables and theme rules.
2. **Structure Phase**: `structure-component-engineer` generates structural HTML/CSS.
3. **Motion Phase**: `motion-engineer` implements transitions, animations, and micro-interactions.
4. **Audit Phase**: `ux-usability-inspector` checks contrast, UX compliance, and accessibility.

If any issues are found in the Audit Phase, the main agent coordinates fixes before delivering the final code.

---

## 🧪 Verification Plan

### Manual Verification
- Verify subagent definitions and prompts contain correct references to design documents.
- Run a dry-run task through the subagents and observe their inputs/outputs.
