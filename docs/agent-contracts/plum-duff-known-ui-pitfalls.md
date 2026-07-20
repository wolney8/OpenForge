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

## 2026-07-19: Opportunity table expanded the browser viewport

- Area: Fund Manager multi-profile opportunity placement dialog.
- Root cause: the placement table's deliberate wide minimum width was not fully constrained by
  every dialog/content ancestor, allowing its min-content width to influence the page.
- Prevention: wide workflow tables use the shared `table-scroll` viewport; the dialog and every
  content ancestor set explicit viewport bounds and permit shrinking with `min-width: 0`.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` asserts dialog bounds, absence of
  page-level horizontal scroll and deliberate table-local horizontal overflow.

## 2026-07-20: Viewport dialog was constrained by page layout

- Area: Fund Manager opportunity-first setup and placement dialog.
- Root cause: the viewport-level dialog rendered inside an animated page subtree instead of the
  established `document.body` portal, so fixed positioning and viewport bounds were unreliable.
- Prevention: compare new dialogs with established platform modal implementations; portal
  viewport-level dialogs and assert all four dialog edges plus header/footer visibility.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` verifies loading and populated dialog
  geometry, local table overflow and page-level containment.

## 2026-07-20: Local action selector overrode destructive styling

- Area: opportunity placement table action column.
- Root cause: a more-specific local icon selector replaced the shared danger colour and surface.
- Prevention: destructive variant styling must be asserted after all local action-grid selectors;
  stable action slots may size controls but must not replace semantic variants.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` compares the trash icon's computed
  colour with the semantic danger token and checks action alignment.

## 2026-07-20: End-to-end account fixtures leaked into daily-use authorities

- Area: Fund Manager opportunity-first bookmaker and exchange selectors.
- Root cause: Playwright created synthetic active accounts in the reused local development database
  without archiving them after the scenario, so test names became valid daily workflow options.
- Prevention: temporary account authorities must be unique, tracked and archived in Playwright
  cleanup. Production selectors use the master catalogue plus explicit profile-owned status;
  unavailable accounts remain visibly disabled and fixture labels must never become authority.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` now cleans temporary accounts and
  opportunity rows after each scenario. The opportunity UI regression uses the active-account
  authority path and verifies calculation/copy-down state independently.

## 2026-07-20: Material Symbol name rendered as text

- Area: Fund Manager opportunity target actions.
- Root cause: markup used a Material Symbol name that was not included in the shared font request's
  `icon_names` allowlist, so the ligature text appeared instead of an icon.
- Prevention: use the shared unfiltered Material Symbols font request in `apps/web/app/layout.tsx`;
  do not reintroduce a brittle icon-name allowlist. Prefer an established platform icon and assert
  that its ligature renders at icon geometry rather than as visible fallback wording.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` asserts the Add Target action renders
  the loaded `group_add` symbol.

## 2026-07-20: Table assist tooltip escaped its cell

- Area: opportunity placement lay-stake suggestion.
- Root cause: an absolutely positioned tooltip rendered above a control inside a horizontally
  scrolling table, so the help surface escaped the table viewport and obscured neighbouring UI.
- Prevention: compact table assistance must expand within its owning input or cell; do not use
  floating help surfaces where the table viewport cannot guarantee containment.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` verifies the expanded suggested-lay
  action remains inside the lay-input shell and that no detached tooltip is rendered.

## 2026-07-20: Adjacent heading actions used different geometry

- Area: opportunity placement Add Target and New Opportunity actions.
- Root cause: the icon action gained local flex styling while its text-only sibling retained generic
  compact geometry, producing visibly different padding and vertical alignment.
- Prevention: adjacent equivalent actions must share one explicit geometry class covering height,
  padding, radius, line-height and alignment, regardless of whether one contains an icon.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` compares computed height, padding,
  radius and vertical centres for both actions.

## 2026-07-20: Secondary status text escaped a table control cell

- Area: opportunity placement bookmaker selector.
- Root cause: a warning string was rendered as a second inline child after a full-width select,
  causing the warning to spill beyond the fixed bookmaker column.
- Prevention: compact table controls must contain all visible state in the control or a bounded
  indicator. Supplementary warning text may remain as an accessible description but must not enter
  the visual row flow when the controlled option already communicates the status.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` uses a warning-state bookmaker and
  verifies its description is visually hidden and its cell has no horizontal overflow.

## 2026-07-20: Applied inline action disappeared and left unusable field geometry

- Area: opportunity placement suggested lay control.
- Root cause: applying the suggestion removed its action while the input retained action-reserved
  padding, truncating the saved lay stake and removing the quick copy path.
- Prevention: stateful inline field actions retain a stable slot and change semantic icon/action
  after application; field padding must reserve only the collapsed action width.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` verifies calculate-to-copy state,
  two-decimal input visibility, clipboard confirmation and reset after strategy change.

## 2026-07-20: Ledger toolbar actions diverged across routes

- Area: sportsbook, free-bet, casino-offer and cash-adjustment ledger toolbars.
- Root cause: each ledger owned separate add/filter markup, allowing action wording, ordering and
  geometry to drift.
- Prevention: every current and future ledger uses `LedgerAddRowButton`, keeps search first, the
  add action second and the filter as the rightmost control.
- Test added: `tests/e2e/ledger-table-controls-parity.spec.ts` verifies icon rendering, add/filter
  order and matching target widths across all current ledgers.

## Entry template

## 2026-07-20: Cross-ledger controls and route state diverged

- Area: ledger headers, deep-linked filters, top-bar utilities and opportunity setup.
- Root cause: equivalent controls were changed locally without asserting shared visual order,
  route-state synchronisation, compact icon geometry or loading/date-field parity.
- Prevention: ledgers use `title -> loading -> stat cards -> search/add/filter toolbar`; add-row
  actions use the shared `LedgerAddRowButton`, the filter remains the rightmost toolbar control, URL issue
  filters must synchronise into the controlled filter modal; top-bar utility actions use the
  compact icon primitive; opportunity loading and date/time entry use shared platform components.
- Test added: cross-ledger toolbar geometry, issue-filter modal state, top-bar icon checks,
  route-preserving profile switching and opportunity loading/date/copy behaviour.

### YYYY-MM-DD: Short issue name

- Area:
- Root cause:
- Prevention:
- Test added:
