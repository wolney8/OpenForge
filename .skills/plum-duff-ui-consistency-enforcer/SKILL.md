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

Before editing, assign or preserve an ID for every user-reported item and record the affected area,
request, supplied selector/reference, canonical equivalent and status. No item may disappear when
the batch is reconciled.

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
- A modal close control must be a true square/circle after all shared button rules apply: assert
  computed width equals height, zero internal padding, centred Material Symbol glyph, and no
  inherited minimum size that turns it into an oval.
- Composite monetary inputs must have exactly one visible field surface. Prefix/suffix adornments
  belong inside that surface; generic input borders, radius, padding and backgrounds must be
  explicitly reset so they cannot create a second overlapping control.
- In a grid, chip-heavy fields must not stretch neighbouring fields vertically. Use `align-items:
  start` and compare every field's input height and top alignment with its adjacent field.
- Quick-select chips must be visibly actionable, preserve semantic financial colour states, and
  use the existing account-brand foreground/background pair when they represent a bookmaker.
- Destructive actions use the shared danger treatment in every state; local selector specificity
  must not override their red border, surface or icon colour.
- Equivalent actions occupy stable slots so rows align when an optional action is absent.
- Loading states show only controls that intentionally remain available. Do not leave duplicate or
  misleading close/actions visible.
- Every asynchronous data surface must distinguish `loading`, `empty`, `error` and `populated`
  states. Pending data must never render as an authoritative zero value or empty dataset. Follow
  the canonical loading hierarchy: meaningful application route/data transitions use the thin
  shell progress line directly beneath the authenticated header; structured content uses
  `LedgerLoadingIndicator` or a layout-preserving skeleton inside its stable shell; a small
  isolated action uses the canonical button spinner; empty and error states remain semantically
  distinct. Never add an artificial delay. Verify light/dark and reduced-motion behaviour.
- Text, stat cards and helper copy must earn their space. Remove duplicated or non-actionable noise.
- Equivalent top-level Settings tabs use `content-panel stack`. Use `content-subpanel stack` only
  for a genuinely nested card, inset section or secondary surface; do not use it to create a
  visually smaller peer tab.
- Settings authority data follows the signed-off inline table pattern: contextual search occupies
  the left half, filters/actions occupy the right, and shared pagination appears above and below
  the table. Reserve modal surfaces for add/edit/confirmation rather than duplicating the full
  authority table in a dialog.
- In Fund Manager and Profile Settings only, equivalent positive create/manage controls use
  `modal-primary-button`. Authority-page primary actions sit in the right filter/action group below
  stat cards, aligned with Search and filters, before pagination. Secondary utilities remain
  visually secondary.
- Standard Search controls use the canonical `table-search-field` surface and signed-off toolbar
  input height. Use a practical 13.75rem minimum and a responsive width up to 30rem where layout
  permits; do not create route-specific search heights or undersized search pills.
- The canonical application shell uses three stable regions: brand/navigation trigger, global
  search, and account/theme/notification actions. At reduced widths these regions reflow without
  changing control semantics, hiding the search, or creating page-level horizontal overflow.
- The global drawer contains stable Fund Manager destinations and must never render an unbounded
  Profile roster. It may expose a bounded maximum of three browser-recent Profiles plus `View all`
  and `Add Profile`; full discovery and management remain in the searchable Profiles surface.
  Recent links always open the canonical Profile Dashboard and archived Profiles are excluded.
- Global search reuses `table-search-field`, provides grouped loading/empty/error states and
  keyboard navigation, and receives only server-authorized results. Never build an unprotected
  client-side index of Profile or account data.
- Public authentication routes render without the authenticated application top bar. They retain
  canonical centred branding and the locally stored theme, defaulting to dark when no preference
  exists. The authenticated shell represents the current principal with one
  compact identity trigger built from the existing menu, avatar and semantic-chip patterns; its
  account and logout actions must not become a separate auth-specific navigation system.
- Canonical page and Settings tab navigation remains in the established static document-flow
  location. It must not become content-following, newly sticky/fixed/floating, or independently
  scrolling unless the approved feature explicitly requires that behaviour. Reuse the shared tab
  rail and verify its computed position plus scroll geometry rather than patching route-specific
  offsets.
- Do not fix one instance without searching the current route, sibling routes and shared primitive.

## 3a. Retrospective audit boundary

Inventory repeated UI patterns when drift is discovered. Give every mismatch an audit ID,
canonical reference and LOW/MEDIUM/HIGH blast-radius rating. Fix unambiguous LOW-risk drift only;
record MEDIUM/HIGH changes for review and do not use an audit as permission for a platform-wide
redesign. Update the known-pitfalls register and regression coverage for recurring defects.

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
