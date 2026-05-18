---
name: web-design-guidelines
description: 'Audit UI code against Vercel Web Interface Guidelines for design, accessibility, and UX compliance. Use when: reviewing frontend PRs, auditing pages/components, and generating terse file:line findings.'
argument-hint: 'Provide file paths or glob patterns (for example: apps/web/src/app/** or apps/web/src/components/**/*.tsx).'
user-invocable: true
---

# Web Design Guidelines Audit

## Objective
Audit UI code against Vercel Web Interface Guidelines with concise, actionable findings that are easy to remediate.

## When To Use
- Reviewing frontend pull requests before merge.
- Auditing pages, layouts, and components for visual and interaction quality.
- Catching accessibility, UX, and consistency regressions in production-facing UI.

## Inputs
1. One or more file paths, folders, or glob patterns.
2. Optional context: product area, target device, design system constraints.

If no files are provided, ask the user which files to review before continuing.

## Procedure

1. Refresh the source of truth before each audit.
   - Fetch the latest Vercel guidelines from the remote repository before reviewing code.
   - If the primary remote document is unavailable, use the best available official fallback from the same repository and state that fallback in output.

2. Resolve scope and files.
   - If arguments include explicit files, audit only those files.
   - If arguments include globs, expand and audit matching UI files.
   - If arguments are empty, prompt for files or patterns.

3. Run a category-based review.
   - Design: typography scale, spacing rhythm, color contrast, hierarchy, visual clarity.
   - Accessibility: semantics, labels, keyboard flows, focus visibility, ARIA misuse, readable states.
   - UX: affordance clarity, feedback states, loading/empty/error states, responsiveness.

4. Produce terse findings for fast remediation.
   - Output each issue on one line in this format:
     path/to/file.ext:line | severity | rule | short fix
   - Keep severity to: high, medium, low.
   - Do not append narrative summaries or extra prose.
   - If no issue is found, return: No findings.

5. Add completion checks.
   - Confirm every finding includes an exact file and line.
   - Remove duplicate findings that describe the same root issue.
   - Prioritize high-impact issues first, then medium, then low.

## Decision Points
- If guidelines cannot be fetched: continue with fallback and explicitly flag reduced confidence.
- If requested files are missing: report unresolved paths and request corrected targets.
- If generated findings are verbose: compress each finding to one line while preserving actionability.

## Quality Criteria
- Uses latest available remote guidelines at review time.
- Findings are terse, scannable, and directly mappable to edits.
- Covers design, accessibility, and UX in every audit.
- Avoids generic advice; each finding points to concrete code.

## Output Example
apps/web/src/app/(public)/page.tsx:42 | high | Missing visible focus state on primary CTA | Add :focus-visible style with >= 3:1 contrast ring.
apps/web/src/components/forms/contact-form.tsx:88 | medium | Input lacks associated label | Add <label htmlFor> and matching id.

## Example Prompts
- /web-design-guidelines apps/web/src/app/**
- /web-design-guidelines apps/web/src/components/**/*.tsx
- /web-design-guidelines Audit checkout and support pages for accessibility and UX regressions.