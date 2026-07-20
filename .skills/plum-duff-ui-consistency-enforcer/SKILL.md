---
name: plum-duff-ui-consistency-enforcer
description: Mandatory fail-closed consistency audit for every Plum Duff UI change. Use for pages, routes, dialogs, modals, drawers, tables, rows, forms, controls, stat cards, text, icons, loading states, responsive layouts, Material 3 styling, WCAG behaviour, and any visual or interaction fix before implementation and handoff.
---

# Plum Duff UI Consistency Enforcer

## Authority

This skill is mandatory for every Plum Duff UI change. It supplements, and does not replace:

- `AGENTS.md`
- `docs/agent-contracts/plum-duff-ui-accessibility-contract.md`
- `docs/agent-contracts/plum-duff-ui-implementation-checklist.md`
- `docs/agent-contracts/plum-duff-known-ui-pitfalls.md`
- `.skills/plum-duff-ui-review/SKILL.md`

Do not call UI work ready for smoke testing until this skill's evidence gate is complete.

## 1. Inventory before editing

List the exact affected UI surfaces and their nearest established Plum Duff equivalents. Check all
applicable categories:

- page and route shell;
- modal, dialog, drawer, menu or popover;
- header, body, footer and scroll ownership;
- table, row, column, cell and pagination;
- toolbar, search, filter and action group;
- input, select, checkbox, switch and validation state;
- primary, secondary, icon and destructive actions;
- loading, empty, disabled, success, warning and error states;
- stat card, value display, helper text and headings;
- icon family, icon size, target size, alignment and colour;
- light theme, dark theme, desktop and reduced viewport.

Search shared components and CSS first. Identify one canonical existing implementation for each
pattern. Never use the current broken element as its own reference.

## 2. Build a consistency matrix

Before changing markup or CSS, compare the affected control with its canonical equivalent:

| Area | Required comparison |
|---|---|
| Geometry | width, max-width, height, padding, gap, radius and alignment |
| Layout | flex/grid behaviour, `min-width: 0`, overflow owner and responsive reflow |
| Typography | family, size, weight, line height, case and truncation |
| Colour | semantic token, light/dark contrast, hover, focus, selected and disabled states |
| Actions | variant, target size, icon size, ordering, spacing and destructive treatment |
| Accessibility | semantic role, visible label, accessible name, focus order and keyboard action |
| Process state | enabled, disabled, loading, success, error and cancellation behaviour |

If an intentional difference exists, record the workflow reason before implementation. Otherwise,
use the canonical primitive and computed styling.

## 3. Non-negotiable implementation rules

- Use existing Plum Duff components, classes, tokens and Material Symbols before adding local CSS.
- Portal viewport-level dialogs to `document.body` when an ancestor can constrain fixed positioning.
- Dialog header and footer remain visible; only the intended body or table viewport scrolls.
- No dialog child may enlarge the browser viewport or cause page-level horizontal scrolling.
- Icon-only controls use the established Material Symbol, a context-specific accessible name and
  the same target dimensions as sibling actions.
- Destructive actions use the shared danger treatment in every state; local selector specificity
  must not override their red border, surface or icon colour.
- Equivalent actions occupy stable slots so rows align when an optional action is absent.
- Loading states show only controls that intentionally remain available. Do not leave duplicate or
  misleading close/actions visible.
- Text, stat cards and helper copy must earn their space. Remove duplicated or non-actionable noise.
- Do not fix one instance without searching the current route, sibling routes and shared primitive.

## 4. Required automated evidence

Add or update focused tests for every changed pattern. Use role/name selectors for behaviour and
`data-pd-id` for geometry/style inspection.

For dialogs and drawers, assert:

- top, bottom, left and right remain inside the viewport;
- header, close control and footer are visible in applicable states;
- body/table scroll is local and page-level horizontal scroll is absent;
- Escape, focus containment and focus return follow the platform contract.

For tables and rows, assert:

- header and body columns align;
- action slots have matching centres and dimensions;
- optional actions do not shift destructive actions;
- narrow viewports use the intended local scroll or reflow.

For controls and icons, assert:

- equivalent computed heights, radii, borders, surfaces, typography and focus treatment;
- destructive controls resolve to the semantic danger colour;
- Material Symbol text renders as an icon, not visible fallback wording;
- accessible names are contextual and unique.

Verify light and dark themes and at least one reduced viewport. Respect `prefers-reduced-motion`.
Screenshots are optional diagnostic evidence, not a substitute for assertions.

## 5. Fail-closed handoff gate

Before handoff, report:

1. affected surfaces reviewed;
2. canonical components/styles used;
3. equivalent instances searched;
4. M3 and WCAG checks completed;
5. geometry, overflow, theme, keyboard and icon checks run;
6. automated tests and results;
7. any manual check still required.

If any applicable item is unverified, state that the UI tranche is incomplete. Do not ask the user
to discover basic consistency, clipping, alignment, icon or overflow defects through smoke testing.

When a repeated defect is found, update `plum-duff-known-ui-pitfalls.md` and add a regression test.
