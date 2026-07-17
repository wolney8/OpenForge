# Plum Duff UI and Accessibility Contract

_Last updated: 2026-07-16_

## Status and authority

This is the non-negotiable UI contract for every feature, bug fix, route, workflow,
fixture-backed UI, and component change in the Plum Duff repository.

Standards:

- [Material Design 3](https://m3.material.io/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), Level AA
- [W3C WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [MDN accessible names](https://developer.mozilla.org/en-US/docs/Glossary/Accessible_name)
- [MDN ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)

If this contract conflicts with a local one-off pattern, this contract wins unless a documented
workflow, financial, or accessibility requirement proves the exception.

## Product name

- The public-facing product name is **Plum Duff**.
- Current routes, metadata, navigation, onboarding, generated UI, screenshots, tests and
  user-facing documentation must not call the product OpenForge.
- `OpenForge` may remain only for internal technical identifiers or historical traceability,
  including the repository name, `@openforge/web`, `openforge_api`, environment/database keys,
  archived plans, migration contracts and issue history.
- New public copy must use `platformBrand` rather than duplicating the product name.

## Repository design-system baseline

The current web app is Next.js/React with a custom Material-aligned token and CSS system. Before
adding UI, search `apps/web/components`, `apps/web/lib` and `apps/web/app/globals.css` for an
existing primitive or class.

Current shared patterns include:

- actions: `button-link`, `modal-primary-button`, `icon-button`, `modal-close-button`
- fields: `field-control`, `table-search-field`, `table-filter-field`, `m3-picker-field`
- dialogs: `modal-backdrop`, `modal-panel`, `workflow-editor-modal`
- wide data: `table-scroll`, `data-table`
- surfaces: `content-panel`, `content-subpanel`, `stat-card`, `hero-panel`
- state: `LedgerLoadingIndicator`, `StatusToast`, error text and status chips
- icons: Material Symbols loaded by the root layout

Rules:

1. Reuse a shared component or class before creating local CSS.
2. Do not create a second search, button, dialog geometry or table-overflow pattern.
3. If a primitive is missing, add one reusable Plum Duff primitive and use it immediately.
4. A one-off override requires a short code comment and task-summary justification.
5. Equivalent controls in one region must share structure and computed styling.

## Material 3 and token rules

- Use named Plum Duff variables for colour, surface, outline, focus, status, shadow and back/lay
  roles. Add a semantic token if the required role is missing.
- Do not scatter literal colours, arbitrary opacity, spacing, radius, elevation or state values.
- Existing literals are migration debt, not precedent for new work.
- Use the existing typography families and hierarchy; do not invent local font stacks.
- Hover, pressed, focus, selected, loading and disabled states must be deliberate Material-style
  states, not browser accidents.
- Equivalent controls must match height, radius, border, surface, typography, icon size, padding,
  focus and disabled treatment.
- Verify all changed states in both light and dark modes.

## WCAG 2.2 AA rules

- Normal text contrast: at least `4.5:1`.
- Large text contrast: at least `3:1`.
- Meaningful component boundaries, focus indicators and icons: at least `3:1` against adjacent
  colours.
- Do not communicate status by colour alone.
- Disabled controls must remain understandable; nearby text must explain unmet preconditions.
- Prefer semantic HTML. Add ARIA only when native semantics are insufficient.
- Every control requires a context-specific accessible name. `Search`, `Close`, `Submit`, `Icon`
  and `Button` are insufficient where ambiguity is possible.
- Inputs require visible labels; placeholders are supplementary only.
- Errors must be associated with their controls and must not cause avoidable layout shift.

## Stable inspection identifiers

Important regions and controls require `data-pd-id` using:

`<feature>.<region>.<element>`

Examples:

- `import-review.dialog`
- `import-review.search`
- `import-review.ledger-filter`
- `import-review.table-scroll`
- `import-review.import-selected-button`

Use semantic role/name locators for user behaviour tests. Use `data-pd-id` for stable inspection,
geometry, style parity and cases where role/name alone cannot identify the implementation region.
Do not test against CSS classes alone when a stable identifier is warranted.

## Keyboard and focus

- Every interactive workflow must be keyboard operable with visible focus.
- Tab order follows visual and workflow order.
- Dismissible dialogs close on Escape, contain focus while open, and return focus to their trigger.
- Menus/popovers close on Escape and outside interaction.
- Sticky actions remain keyboard reachable.
- No unintentional keyboard traps.

## Layout and overflow

- No changed feature may create page-level horizontal scroll.
- Flex/grid children containing wide content require `min-width: 0` and `max-width: 100%`.
- Overflow must occur in a named, intentional scroll viewport.
- Toolbars wrap or scroll deliberately on narrow screens while preserving the primary action.

## Dialog rules

The target dialog structure is:

1. constrained dialog shell;
2. visible non-scrolling header;
3. bounded scrollable body/content region;
4. visible sticky/non-scrolling action footer where actions exist.

Requirements:

- `role="dialog"`, `aria-modal="true"` and a context-specific accessible name;
- width and height constrained to the viewport;
- wide children cannot define dialog width;
- close action remains visible;
- dismissible dialogs close on Escape and restore trigger focus;
- submissions are protected against duplicate action while loading.

New dialog work must use a shared dialog primitive when one is available. Until the current modal
shell is migrated, new behaviour must not copy another ad hoc modal implementation.

## Tables and data grids

- Use `table-scroll` for wide tables. `table-wrap` is not a supported substitute.
- A table in a dialog must have its own horizontal and, when needed, vertical scroll viewport.
- Every flex/grid ancestor around that viewport must permit shrinking with `min-width: 0`.
- Use semantic table headings and useful sticky headers for long datasets.
- Pagination, search and selected-row counts must be explicit for large datasets.
- Footer actions remain outside the table scroll region.
- Table min-content width must never enlarge the page or dialog.

## Forms, buttons, icons and navigation

- Side-by-side text/search/select controls use the same `field-control` structure and size.
- Primary, secondary, destructive and icon actions use platform variants only.
- Icon-only actions use Material Symbols and a context-specific accessible name.
- Do not replace an established icon with random text or a text glyph.
- Navigation has a current-state indication that does not rely only on colour.
- Navigation and toolbars preserve keyboard order and minimum usable targets.

## Empty, loading, error and disabled states

Every asynchronous or actionable UI defines:

- empty state and next action;
- loading state that prevents duplicate submission;
- error state that preserves user input/selection;
- success confirmation stating what changed;
- enabled and disabled preconditions.

An action must be disabled unless its exact business preconditions are true. The interface must
state why a disabled action cannot run. Do not show a working-looking disabled control.

## Consistency propagation

Every UI change must:

1. search the current component for equivalent controls;
2. search related routes/dialogs for the same pattern;
3. search shared components/CSS for a reusable primitive;
4. update equivalent instances or document why they intentionally differ;
5. add regression coverage for the corrected pattern;
6. update `plum-duff-known-ui-pitfalls.md` when the issue is repeated.

## Required verification

Before completion, run the applicable repository commands and record results:

- web lint and typecheck;
- unit tests;
- focused Playwright flow;
- production build for structural UI changes;
- light and dark mode review;
- keyboard/focus review;
- viewport and horizontal-overflow review;
- computed-style parity where equivalent controls previously diverged;
- contrast checks using the existing contrast test helpers where applicable.

Complete `docs/agent-contracts/plum-duff-ui-implementation-checklist.md`. A UI task is not done
while required checks remain unperformed without an explicit reason.
