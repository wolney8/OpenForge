# Plum Duff UI Implementation Checklist

Complete this for every feature, bug fix, component, fixture-backed UI, route or page change.

## Before implementation

- [ ] Read `plum-duff-ui-accessibility-contract.md`.
- [ ] Identify the workbook/workflow/financial contract, if relevant.
- [ ] Search for an existing Plum Duff component or CSS primitive.
- [ ] Search the current and related routes for equivalent controls.
- [ ] Confirm all public-facing naming uses Plum Duff.

## Components and tokens

- [ ] Material 3-aligned platform primitive used, or exception documented.
- [ ] Existing semantic theme tokens used.
- [ ] No new hard-coded colour, spacing, shape, opacity or elevation where a token exists.
- [ ] Equivalent controls match size, border, surface, typography, focus and state styling.
- [ ] Platform Material Symbols convention used for established icon actions.

## Accessibility

- [ ] WCAG 2.2 AA is the baseline.
- [ ] Light mode checked.
- [ ] Dark mode checked.
- [ ] Text and meaningful non-text contrast checked.
- [ ] Keyboard navigation and visible focus checked.
- [ ] Every control has a context-specific accessible name.
- [ ] Visible labels exist for form controls; placeholders are not labels.
- [ ] Dialog focus containment, Escape close and trigger-focus return checked.
- [ ] Important regions and controls have stable `data-pd-id` identifiers.

## Layout and process state

- [ ] Responsive layout checked at desktop and reduced viewport widths.
- [ ] No unintended page-level horizontal scroll.
- [ ] Tables/wide content use a contained `table-scroll`/scroll viewport.
- [ ] Flex/grid ancestors around wide content use `min-width: 0` where required.
- [ ] Dialog header/close action remain visible.
- [ ] Dialog footer actions remain visible and keyboard reachable.
- [ ] Enabled, disabled, loading, success and error action conditions are defined.
- [ ] Disabled state is logically correct and its reason is available to the user.
- [ ] Empty, loading and error states are handled without losing user input.

## Consistency and tests

- [ ] Similar controls elsewhere were searched and updated or intentionally excluded with reason.
- [ ] Unit/Playwright/accessibility tests added or updated.
- [ ] Geometry and computed-style parity asserted where the task fixes layout/style divergence.
- [ ] Light/dark contrast regression updated where colours changed.
- [ ] Known-mistakes register updated if this fixes a repeated issue.
- [ ] Lint, typecheck and relevant tests recorded in the completion report.
