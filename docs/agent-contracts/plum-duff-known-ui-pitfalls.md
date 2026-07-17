# Plum Duff Known UI Pitfalls

Use this as a prevention register, not a changelog. Add every repeated issue with date, area, root
cause, prevention rule and regression test.

## 2026-07-16: Wide table enlarged modal

- Area: profile spreadsheet import review
- Root cause: the table had a deliberate wide minimum width but its wrapper did not use the
  platform `table-scroll` containment class; the modal also inherited stronger generic minimum
  width rules.
- Prevention: tables in dialogs use a dedicated scroll viewport, every flex/grid ancestor permits
  shrinking with `min-width: 0`, and the dialog has an explicit viewport maximum.
- Test: `tests/e2e/profile-spreadsheet-transfer.spec.ts` asserts dialog geometry and table overflow.

## 2026-07-16: Modal footer actions were hard to reach

- Area: profile spreadsheet import review
- Root cause: scrolling applied to the overall modal rather than a bounded data region.
- Prevention: header/footer remain outside data scroll; action footer is sticky where content can
  exceed the viewport.
- Test: import-review Playwright asserts the primary action remains visible.

## 2026-07-16: Search and Ledger controls diverged

- Area: profile spreadsheet import toolbar
- Root cause: Search used `field-control` while Ledger used a local label/select structure.
- Prevention: equivalent fields in one toolbar use the same field-control primitives and explicit
  shared dimensions.
- Test: Playwright compares computed height, radius, border and background.

## 2026-07-16: Accessible name regressed after shared styling

- Area: profile spreadsheet import search
- Root cause: adopting the shared visible `Search` label reduced the accessible name to a generic
  term.
- Prevention: shared visual primitives must accept a context-specific accessible name, such as
  `Search import review rows`.
- Test: Playwright locates the control by its context-specific accessible name.

## 2026-07-16: Import action appeared available without valid selection

- Area: spreadsheet import confirmation
- Root cause: process preconditions and visual disabled treatment were not enforced together.
- Prevention: derive enabled state from compatible selected-row count, acknowledgement and loading
  state; show a reason when selection is empty.
- Test: Playwright deselects all rows and asserts the action is disabled and explanatory text visible.

## 2026-07-16: Local fix missed equivalent control

- Area: import review toolbar and broader agent workflow
- Root cause: a local Search fix was not followed by an equivalent-control search.
- Prevention: every UI task must search the current component, related routes and shared primitives;
  update siblings or document intentional differences.
- Test: computed-style parity locks Search and Ledger fields together.

## 2026-07-16: UI tests waited for global network silence

- Area: flexible navigation and platform interaction Playwright flows
- Root cause: tests used `networkidle` even though profile routes perform multiple independent
  application fetches and development connections may remain active.
- Prevention: wait for the exact user-visible readiness condition, such as the target row, control,
  dialog or loading state, rather than incidental global network silence.
- Test added: existing navigation/interaction tests now wait for their operative elements.

## 2026-07-16: Profile operations were duplicated across analytics views

- Area: Fund Manager `/profiles` directory and combined analytics tabs
- Root cause: the directory rendered outside the tab panels while Overview and Exposure repeated
  profile-level action and tracker links.
- Prevention: profile management, issue resolution, dashboard/report navigation and the details
  drawer live only in the dedicated `Profiles` tab. Analytics tabs remain read-only and expose only
  data required for their stated reporting purpose.
- Test added: `tests/e2e/cross-profile-reporting.spec.ts` verifies exclusive directory placement,
  action-free Exposure, row/drawer keyboard behaviour and contained reduced-width layout.

## 2026-07-17: Adjacent form controls clipped focus indicators

- Area: Fund Manager Account Catalogue editor.
- Root cause: two-column form controls relied on the generic grid gap and retained intrinsic input
  widths, leaving insufficient room for the platform focus outline at reduced modal widths.
- Prevention: modal form grids must give focus indicators an explicit gutter; grid children and
  controls use `min-width: 0`, `max-width: 100%` and border-box sizing. Semantically paired fields
  must retain stable grid positions when another control is removed.
- Test added: `tests/e2e/fund-manager-account-catalogue.spec.ts` focuses a paired field and asserts
  the complete focus outline remains clear of its neighbouring control.

## Entry template

### YYYY-MM-DD: Short issue name

- Area:
- Root cause:
- Prevention:
- Test added:
