# Plum Duff Known UI Pitfalls

Use this as a prevention register, not a changelog. Add every repeated issue with date, area, root
cause, prevention rule and regression test.

## 2026-09-04: Profile recovery actions depended on healthy Account hydration

- Area: `PD-FIX-RECOVERY-002` through `PD-FIX-RECOVERY-005`, emergency Profile lifecycle.
- Root cause: Profile Management loaded identity, all Profile Accounts and session state in one
  blocking request group. A malformed imported Account lifecycle value made the Accounts request
  return 500, preventing even identity-only Archive and Delete controls from mounting.
- Prevention: the dedicated Fund Manager import-recovery route owns an emergency Active → Archived
  → permanent-delete path. Its server operations read only Profile identity/lifecycle metadata and
  reuse the database-owned Profile cascade; they must never hydrate Account or reporting response
  models. Permanent deletion retains Archived-state and exact-name confirmation requirements.
- Regression tests: `apps/api/tests/test_profiles.py` persists a deliberately invalid synthetic
  Account lifecycle and proves recovery archive/delete still work while Account hydration returns
  500; `tests/e2e/import-recovery-route.spec.ts` proves no Profile Management, Account or reporting
  requests occur and verifies confirmation, pending, theme and reduced-viewport behaviour.

## 2026-09-03: Recovery evidence was nested inside a broken tracker route

- Area: `PD-FIX-RECOVERY-001`, Import/Export recovery diagnostics.
- Root cause: the read-only recovery component was reachable only through the Profile Settings
  tracker module, so a recovery workflow had no direct route independent of the failed tracker
  surfaces it was intended to diagnose.
- Prevention: rollback-safety evidence has a dedicated Fund Manager route under
  `/fund-manager/import-recovery/:profileId`. It may request only the recovery-metadata endpoint;
  it must not hydrate Accounts or call tracker-summary, Sportsbook, Dashboard, or Reports.
- Regression test: `tests/e2e/import-recovery-route.spec.ts` loads the direct route while mocked
  Account and tracker-summary failures remain unavailable, and asserts neither is requested.

## 2026-09-03: Re-analysis inherited a terminal import execution

- Area: Profile Import/Export history, Import Review and Delete review confirmation.
- Root cause: checksum-compatible analysis intentionally reused its ImportRun, but the workspace
  exposed the prior rolled-back execution as current state. Review deletion also removed the run
  before non-cascading execution/checkpoint/audit children, and its generic response parser labelled
  the resulting constraint error as an analysis failure.
- Prevention: persisted ImportRun status is authoritative; terminal executions attached to a newly
  ready/approved run are attempt history only. Confirmed deletion removes all non-active run metadata
  in one server transaction, uses action-specific errors, and import-start requests use navigation-safe
  delivery before resumable server execution takes over.
- Regression tests: API coverage verifies current/previous execution separation and dependent audit
  deletion; Playwright verifies restored `READY_APPROVED` actions and dedicated delete failure state.

## 2026-09-02: Secondary Profile reporting blocked an empty directory

- Area: Fund Manager Profiles directory and post-delete navigation.
- Root cause: the directory shared one blocking loading flag with full cross-Profile reporting;
  failed reads for a deleted Profile were retried every ten seconds and repeatedly restored the
  combined-reporting loader instead of settling an empty Archived filter.
- Prevention: Profile identity/status is the directory's only critical dataset. Financial
  summaries load locally, collection/entity caches are invalidated before deterministic
  post-delete navigation, and deleted-entity `404` failures are never retried.
- Regression test: `tests/e2e/profile-lifecycle-routing.spec.ts` verifies zero Archived results,
  immediate directory interaction, local reporting placeholders and no deleted-Profile retries.

## 2026-09-02: Route progress left the previous page interactive

- Area: authenticated application shell and all internal route transitions.
- Root cause: the shared progress line observed navigation but did not own an interaction lock, so
  old-page controls could issue repeated pushes while the destination was resolving.
- Prevention: route transition progress synchronously marks the previous shell `inert` and
  `aria-busy`, suppresses repeated navigation, and releases on destination resolution or failure.
  Critical destination data continues to use the established in-page loader.
- Regression test: `tests/e2e/profile-lifecycle-routing.spec.ts` verifies the shared route lock,
  progress state and release behavior.

## 2026-09-02: Browser focus was treated as authenticated activity

- Area: Fund Manager inactivity/session guard.
- Root cause: `focus` shared the meaningful-activity handler with keyboard/pointer input, allowing a
  resumed browser to attempt an activity extension instead of first reading server authority.
- Prevention: focus, pageshow and visibility resume validate the persisted session without touching
  it. Only visible keyboard, pointer and touch interaction call the throttled activity endpoint;
  polling never updates inactivity.
- Regression tests: API coverage holds a configured session inactive for twelve hours; Playwright
  confirms focus validates without posting activity and keyboard interaction does post activity.

## 2026-09-02: Profile lifecycle action was hidden behind implicit row behavior

- Area: Fund Manager Profiles directory.
- Root cause: the canonical archive action existed in the details drawer, but opening that drawer
  depended on clicking an otherwise action-dense table row with no explicit management label.
- Prevention: Profile rows expose one visible Manage action that opens the canonical details/lifecycle
  drawer. Archive remains a single confirmed action inside that drawer rather than being duplicated.
- Regression test: `tests/e2e/profile-lifecycle-routing.spec.ts` enters the lifecycle through the
  labelled Manage action and confirms archive behavior.

## 2026-09-01: Ledger provider chips bypassed the Profile Account relationship

- Area: Sportsbook, Free Bets, Casino, Extra Places and Profile reporting tables.
- Root cause: the shared ledger identity hook loaded the legacy bookmaker list and resolved only by
  visible text, while Accounts and Import Review used the master Account Catalogue relationship.
- Prevention: normal provider cells load master catalogue metadata and resolve the Profile
  Account's stable `catalogue_id` first; normalized names are legacy fallback only. Always render
  the full canonical brand name through `AccountProviderIdentity`, never the short display name.
- Regression tests: `apps/web/lib/bookmaker-catalogue.test.ts` locks stable-ID precedence and
  normalized fallback; `tests/e2e/profile-opportunity-queue.spec.ts` verifies full-name chip
  rendering and contained table geometry at desktop and reduced widths.

## 2026-08-28: Settings tabs followed content after gaining sticky positioning

- Area: Profile Settings and Fund Manager Settings tab rails.
- Root cause: the shared `profile-settings-tab-list` acquired `position: sticky` and a top-bar
  offset, changing a normal-flow navigation rail into a content-following control.
- Prevention: canonical page tabs remain static in document flow unless a separately approved
  workflow requires sticky navigation. Do not add route-specific position offsets to compensate.
- Test added: `tests/e2e/profile-settings-sections.spec.ts` checks computed static positioning and
  confirms the rail moves with its owning page content during document scroll.

## 2026-08-28: Profile Accounts copied or missed global provider presentation

- Area: Profile Accounts table and Add/Edit Account editor.
- Root cause: Profile-owned rows were rendered from stale account names and bookmaker-only display
  helpers instead of resolving their canonical `catalogue_id` through the Fund Manager Account
  Catalogue. Exchanges and banks therefore lost global brand colours and provider metadata.
- Prevention: Profile rows own operational state only. Resolve canonical name, type, brand colours,
  operator, group and platform from the master catalogue by stable ID, with normalized-name fallback
  only for legacy relationships. Use the shared provider identity component for all provider types.
- Test added: `apps/web/lib/bookmaker-catalogue.test.ts` verifies stable-ID precedence and legacy-name
  fallback; `tests/e2e/ledger-table-controls-parity.spec.ts` verifies catalogue-only selection and
  inherited provider colours after save.

## 2026-08-28: Profile Settings accumulated overlapping ownership tabs

- Area: Profile Settings navigation and profile/future identity controls.
- Root cause: commission, offer lists, Quick Actions and future access concepts were added as peer
  tabs without a durable ownership map.
- Prevention: Profile Settings uses General, Defaults, Preferences, Import/Export, Security and
  Subscriber. Security and Subscriber remain explicit read-only boundaries until authoritative
  authentication/subscriber data exists; do not fabricate state or duplicate Fund Manager authority.
- Test added: `tests/e2e/profile-settings-sections.spec.ts` verifies keyboard navigation, deep links,
  legacy hash mapping and future-boundary stubs.

## 2026-08-28: Settings primary actions drifted into secondary pills and page headers

- Area: Fund Manager Account Catalogue, Tracker Lists, Database, Quick Actions and equivalent
  Profile Settings actions.
- Root cause: semantically equivalent create/manage actions independently used `button-link`,
  `settings-card-action` or `modal-primary-button`, and some rendered in page headers rather than
  the signed-off authority toolbar action slot.
- Prevention: Settings create/manage actions use `modal-primary-button`. Authority-page primary
  actions render below stat cards in the right filter/action group, aligned with Search and filters,
  before pagination. Secondary export/preflight utilities remain secondary.
- Test: `tests/e2e/settings-modal-consistency.spec.ts` compares primary action class, parent slot,
  dimensions, radius and theme styling across all Fund Manager authority tabs; Profile Settings
  coverage checks equivalent Manage/Add controls.

## 2026-08-28: Peer Settings tabs used different panel and table structures

- Area: Fund Manager Account Catalogue, Tracker Lists, Database, Site Settings and Quick Actions.
- Root cause: peer tabs independently selected `content-panel` or `content-subpanel`, used
  route-specific toolbar grids, and placed one authority table inside a management dialog.
- Prevention: peer top-level Settings tabs use `content-panel stack`; authority tables render
  inline with the shared left-search/right-filter toolbar and top/bottom pagination. Modals are for
  add/edit/confirmation only. Nested cards may continue to use `content-subpanel stack`.
- Test: `tests/e2e/settings-modal-consistency.spec.ts` checks panel parity, toolbar geometry,
  inline Quick Actions pagination and bounded editor geometry in desktop and reduced dark views.

## 2026-08-28: Settings dialogs inherited fixed ledger-editor height

- Area: Profile Lists, Profile Quick Actions, Fund Manager Quick Actions and Database dialogs.
- Root cause: compact settings dialogs reused the fixed-height `workflow-editor-modal` shell without
  an adaptive settings-specific height rule; some nested dialogs also omitted the body portal.
- Prevention: viewport settings dialogs portal to `document.body`, use `settings-adaptive-modal`,
  and confine overflow to their body or table viewport. Do not alter signed-off ledger editor size.
- Test: Profile Settings and Fund Manager settings Playwright assert viewport containment, local
  scrolling and that compact dialog height follows its content rather than ledger editor height.

## 2026-08-25: Extra Place payout fraction was treated as a place-count boundary

- Area: Extra Place calculation and settlement editor.
- Root cause: the `1 / x` each-way payout fraction was incorrectly reused to decide paid places,
  making Extra Place settlement classifications implicit and wrong for offers such as "paying 6
  instead of 4".
- Prevention: keep payout fraction, bookmaker-paid places and exchange-paid places as distinct
  fields. Settlement classifications must use the explicit place-count gap only.
- Test: `apps/api/tests/test_each_way_extra_place_calculation.py` verifies fifth/sixth Extra Place
  and seventh Unplaced for a 6-vs-4 offer.

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
  geometry to drift; a later regression used a weak mixed success surface and did not explicitly
  centre the filter icon within its circular control.
- Prevention: every current and future ledger uses `LedgerAddRowButton`, keeps search first, the
  add action second and the filter as the rightmost control. The add action is a green `Add Row`
  pill with a context-specific accessible name; the filter is a smaller proportional icon control
  with its Material filter icon centred by explicit flex geometry.
- Test added: `tests/e2e/ledger-table-controls-parity.spec.ts` verifies icon rendering, add/filter
  order, visible `Add Row` wording, positive action colour, centred filter icon geometry and
  proportional target geometry across all current ledgers.

## 2026-07-26: Shared select padding clipped arrows and focus affordances

- Area: ledger editor and modal form fields.
- Root cause: shared select controls used the same right padding as text inputs, leaving native
  dropdown arrows crowded against text and focus rings on dense modal fields.
- Prevention: platform `field-control select` reserves extra inline-end padding; dense grids must
  opt into smaller tracks without overriding control internals.
- Test added: existing ledger and toolbar parity tests cover the shared field-control path; add a
  focused computed-style test if a future select-specific primitive is introduced.

## 2026-07-27: Dirty route guard and ledger delete used browser confirmation

- Area: ledger add/edit flows, top-bar profile switching and ledger row deletion.
- Root cause: dirty-state navigation relied on `window.confirm`, which escaped Plum Duff styling,
  could not meet the app's dialog/focus contract, and made route guards and destructive actions
  visually inconsistent with other Material-aligned confirmations.
- Prevention: dirty in-app navigation and destructive row deletion use the shared confirmation
  controller rendered by `AppChrome`; browser confirmation is allowed only for the unavoidable
  `beforeunload` path or as a fallback before the app-level controller mounts.
- Test added: `tests/e2e/platform-interaction-readiness.spec.ts` verifies unchanged navigation is
  silent, dirty navigation opens the bounded in-app prompt, Escape keeps editing, discard continues
  to the requested route, and row deletion opens an in-app destructive confirmation without a native
  browser dialog.

## 2026-08-06: Ledger editor tab and footer controls drifted

- Area: sportsbook tabbed add/edit modal.
- Root cause: the footer navigation used a different content gutter from the sticky header
  navigation, and helper-pill field rows did not reserve a consistent under-control row.
- Prevention: tabbed ledger editor headers, sticky tabs and footer navigation share explicit slots;
  controls with helper pills reserve helper-row space; collapsed advisory panels use compact
  indicators instead of leaking full chip rows.
- Test added: `tests/e2e/sportsbook-editor-modal.spec.ts` asserts top/bottom tab navigation
  alignment and sticky tab visibility after editor scroll.

## 2026-08-08: Ledger editor footer actions became dual-purpose

- Area: sportsbook, free-bet and casino-offer add/edit modals.
- Root cause: settled-row footer buttons changed meaning between Edit, Save, Save Edits and Close,
  which made row locking unclear and caused edit actions to behave like close/save actions.
- Prevention: ledger modal footer buttons must stay single-purpose. Settled read-only rows show
  Close in the footer and expose Edit through a local section/header lock action. Editable rows
  show Save, Delete where applicable and Revert. Apply this pattern to every current and future
  bet-ledger modal when changing shared editor behaviour.
- Test added: `tests/e2e/sportsbook-editor-modal.spec.ts` verifies the sportsbook settled footer
  uses Edit -> Save Edits without the legacy header action, and
  `tests/e2e/ledger-editor-modal-parity.spec.ts` verifies the casino settled editor unlocks from
  the section Edit action without closing the modal.

## 2026-08-15: MVP modal shell excluded from shared parity checks

- Area: sportsbook, free-bet, casino-offer and cash-adjustment add/edit modals.
- Root cause: regression checks covered migrated ledger editors more tightly than Sportsbook, even
  though Sportsbook is the modal/stepper reference implementation. This could allow the baseline
  shell to drift while the migrated ledgers still passed parity checks.
- Prevention: shared modal/stepper tests must include the MVP reference ledger and every migrated
  ledger in the same scenario table. Do not branch tests around Sportsbook unless the difference is
  explicitly intentional and documented.
- Test added: `tests/e2e/ledger-editor-modal-parity.spec.ts` now asserts tab rail and top/bottom
  navigation regions across all current ledgers, including Sportsbook.

## 2026-08-15: Shared chip action targets drifted below minimum size

- Area: ledger editor footer buttons and other shared `review-chip` action pills.
- Root cause: the shared chip primitive used a `2.6rem` minimum height, which rendered below the
  44px touch-target floor in the current browser/font environment.
- Prevention: reusable pill/action primitives must meet the minimum target size themselves. Do not
  patch individual ledger footers when the shared primitive is the source of the geometry.
- Test added: `tests/e2e/ledger-editor-modal-parity.spec.ts` asserts footer action buttons are at
  least 44px high and remain vertically centre-aligned across all current ledger editors.

## 2026-07-20: Fund Manager settings modals diverged

- Area: Common Bet Combos and Tracker Lists in Fund Manager Settings.
- Root cause: each feature reused the oversized generic workflow editor and kept editor actions
  inside a nested body panel instead of sharing one constrained settings-dialog shell.
- Prevention: Fund Manager catalogue/list editors use `fund-manager-settings-modal`, with a fixed
  header/footer, a locally scrolling body, aligned platform fields and no nested editor surface.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` asserts Tracker Lists viewport
  containment, local table structure, fixed footer actions and computed List/Search field parity.

## Entry template

## 2026-08-16: Partial lay was modelled as both strategy and placement state

- Area: sportsbook and free-bet matching calculators.
- Root cause: workbook-compatible `Partial Lay` persisted as a strategy was also presented as a
  user-facing lay mode, while the new calculator UI already needed partial-match controls inside
  Standard, Advanced, Custom and Multi Lay modes.
- Prevention: visible lay modes describe calculator shape only. Partial matching is a placement
  state/control available inside every lay-capable mode. Legacy `Partial Lay` rows load safely as a
  standard single-lay calculator with partial matched stake inferred or enabled.
- Test added: `tests/e2e/sportsbook-editor-modal.spec.ts` asserts the current calculator mode
  branches, and `tests/e2e/ledger-editor-modal-parity.spec.ts` keeps the cross-ledger modal
  structure stable. Legacy partial-lay rows must continue loading through the standard calculator
  path with partial placement represented inside execution controls, not as a top-level lay mode.

## 2026-08-16: Calculator table styling drifted by lay mode

- Area: sportsbook Matching step calculator tables.
- Root cause: the Multi Lay calculator introduced local table header and wrapper styling that
  diverged from the Outplayed-style single-lay calculator surface.
- Prevention: all lay modes use the same calculator table/card surfaces. Mode-specific behaviour
  may change fields, columns and result cards, but not the base table surface, white borders,
  action geometry, financial formatting or header/body background rules.
- Test added: `tests/e2e/sportsbook-multilay-workflow.spec.ts` covers multi-lay table wrapper
  border removal and dark table surface parity; extend this whenever a new lay mode is added.

## 2026-07-21: Nested reminder dialog and duplicate sportsbook saves

- Area: sportsbook editor placement and partial-lay follow-up.
- Root cause: reminder controls opened a second dialog over the existing editor, while row saves had
  no in-flight request guard and legacy primary matched stakes were not hydrated into the visible
  execution-leg list.
- Prevention: editor-owned supporting controls stay inline in their owning section; one row save may
  be in flight at a time; legacy matched-stake columns must render as the first execution leg without
  changing the contract-backed target or financial outputs.
- Test added: `tests/e2e/sportsbook-partial-lay-reminder.spec.ts` asserts one visible dialog, inline
  reminder persistence, one PUT per Save action, legacy first-leg visibility and independent
  partial/full placement action states.

## 2026-07-21: Partial-lay controls overflowed and used a bespoke delete icon

- Area: sportsbook editor partial-lay execution legs.
- Root cause: the global field minimum width was allowed to override the leg grid tracks, while the
  remove action used a locally sized SVG instead of the shared Material destructive icon action.
- Prevention: compact grid descendants explicitly opt into `min-width: 0` and full track width;
  destructive row actions use the shared `table-action-button` geometry and Material `delete`
  symbol.
- Test added: `tests/e2e/sportsbook-partial-lay-reminder.spec.ts` asserts adjacent field geometry,
  canonical destructive target dimensions and the rendered Material symbol.

## 2026-07-20: Settings card actions stretched to panel width

- Area: Fund Manager Tracker Lists and Common Bet Combos settings cards.
- Root cause: generic buttons were direct children of a stacked layout and inherited the stack's
  cross-axis stretch instead of retaining content-width action geometry.
- Prevention: card-level actions use the shared `settings-card-action` class with content width and
  an explicit start alignment; full-width actions require a deliberate workflow reason.
- Test added: `tests/e2e/sportsbook-opportunity-first.spec.ts` compares each manage action width with
  its parent settings section.

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

## 2026-07-21: Ledger editor focus rings clipped by expanded sections

- Area: sportsbook, free-bet, casino-offer and cash-adjustment editor sections.
- Root cause: the collapsible section animation wrapper retained `overflow: hidden` after
  expansion, clipping the shared three-pixel focus outline at section boundaries.
- Prevention: animation wrappers clip only while collapsed; the shared expanded state restores
  visible overflow and is verified across every ledger editor.
- Test added: `tests/e2e/ledger-editor-modal-parity.spec.ts` asserts visible overflow on expanded
  section content for all current ledger editors.

## 2026-07-27: Editor validation banners and dismiss controls diverged

- Area: ledger editor modal sections and validation banners.
- Root cause: validation banners used local spacing and a generic pill-shaped `icon-button` for the
  dismiss action, producing sharp-looking nested edges, crowded headings and a non-circular
  misaligned close control.
- Prevention: editor validation states use the shared rounded banner treatment and destructive
  icon-button semantics; dismiss actions explicitly own square/circle geometry, zero padding,
  centred Material Symbols and enough spacing from neighbouring borders. Section headings retain
  a minimum hit area and content starts below the header with a consistent gutter. Sticky editor
  headers must start flush with the modal's top edge, use named slots for compact summary, title,
  navigation actions and tabs, and never let an independently sticky tab rail overlap the title,
  summary or Previous/Next controls.
- Test added: `tests/e2e/sportsbook-editor-modal.spec.ts` asserts sportsbook header/footer
  alignment and sticky tab behaviour; `tests/e2e/ledger-editor-modal-parity.spec.ts` asserts
  cross-ledger modal header/footer geometry, local scroll ownership and expanded-section overflow.

## 2026-08-11: Ledger edits left top-bar summary values stale

- Area: profile top-bar summary, ledger save/delete paths and bridge-created rows.
- Root cause: row mutations invalidated local ledger caches, but equivalent ledgers did not all
  dispatch the shared tracker-data update event. App Chrome could therefore keep showing a previous
  selected-range value until focus, interval refresh or full browser reload.
- Prevention: every profile-scoped ledger mutation must call `dispatchTrackerDataUpdated` after a
  successful write/delete. The shared dispatcher invalidates the changed profile ledger cache before
  emitting `TRACKER_DATA_UPDATED_EVENT`, so App Chrome and dashboard consumers reload from fresh row
  data.
- Test added: `apps/web/lib/tracker-data-events.test.ts` asserts ledger-specific and profile-wide
  cache invalidation before the update event is dispatched.

## 2026-08-12: Dashboard period selector stretched into an oversized capsule

- Area: profile and fund-manager dashboard visual cards.
- Root cause: the dashboard shortcut selector had insufficient local geometry constraints, so the
  active pill could stretch vertically and crowd the Portfolio P&L card instead of behaving like a
  bounded Material segmented control.
- Prevention: dashboard segmented controls must define explicit inline/block limits, hide their own
  overflow, centre active pills inside the rail and avoid inheriting stretch from parent chart cards.
  Any dashboard control embedded in a visual card needs a reduced-viewport geometry assertion before
  handoff.
- Test added: `tests/e2e/platform-route-readiness.spec.ts` asserts the dashboard period control
  stays bounded, hides vertical overflow, keeps the active pill centred and preserves page overflow
  safety.

## 2026-08-14: Repeated section action inspection IDs in tabbed editors

- Area: casino-offer tabbed editor settled-row unlock actions.
- Root cause: one reusable section-lock renderer emitted the same `data-pd-id` in every tab, so
  automated inspection and accessibility-focused tests could not target the active section
  deterministically.
- Prevention: repeated actions rendered in multiple editor sections must include the section/tab
  identifier in their stable inspection ID, even when the visible label and behavior are identical.
- Test added: `tests/e2e/ledger-editor-modal-parity.spec.ts` asserts the settlement-specific casino
  unlock action and confirms the locked footer does not expose a conflicting Edit action.

## 2026-08-17: Sticky ledger modal footer clipped action controls

- Area: Sportsbook, Free Bets, Casino Offers and Cash Adjustments add/edit modal footers.
- Root cause: the shared `.workflow-editor-footer` used a negative sticky offset and negative
  bottom margin to fill the modal gutter, which could pull action pills below the visible dialog
  shell when the modal body scrolled.
- Prevention: sticky modal footers must use `bottom: 0`, reserve safe-area/internal padding inside
  the footer, and remain inside the dialog bounds. Do not use negative sticky offsets to hide modal
  gutter seams. Footer controls must sit the same visual distance from the divider above as from
  the modal bottom below.
- Test added: `tests/e2e/ledger-editor-modal-parity.spec.ts` asserts footer/header alignment and
  that the footer bottom remains inside the dialog across current ledger modals, with balanced
  vertical spacing around the footer actions.

## 2026-08-17: Ledger save, revert and close race

- Area: Free Bets add/edit modal, with the same prevention applied to Casino Offers and Cash
  Adjustments.
- Root cause: save requests could remain in flight while Revert, Delete or Close stayed active,
  allowing stale form state to overwrite a just-saved server response and causing conflicting
  status/toast messages.
- Prevention: every ledger editor must use an explicit persistence lock separate from render
  transitions. While persistence is active, Save shows the shared spinner plus `Saving`,
  destructive/navigation actions are disabled, close/backdrop dismissal is blocked, and the saved
  server payload becomes the pristine form state before the modal closes. Equivalent modal write
  actions outside ledgers must use the same visible spinner feedback when a pending state already
  exists.
- Test added: `tests/e2e/ledger-editor-modal-parity.spec.ts` verifies current ledger modal
  structure and settled-row edit behaviour. Manual smoke should verify Free Bets cannot Revert,
  Delete or Close while Save is active and no duplicate modal-open save messages appear.

## 2026-08-23: Quick Add controls inherited conflicting generic field geometry

- Area: Casino Free Spins Quick Add modal.
- Root cause: shared icon-button minimum height made the modal close action oval, generic
  field-control styling reintroduced an inner bordered input inside the currency wrapper, and
  grid stretch made the Offer Name field taller than its adjacent Game field.
- Prevention: modal close controls explicitly reset width, height, minimum size and padding;
  composite financial inputs reset nested generic input geometry after field-control rules; grids
  with chip rows use `align-items: start`; branded bookmaker quick-select chips take the existing
  catalogue foreground/background pair.
- Test added: `tests/e2e/casino-free-spins-quick-add.spec.ts` covers decimal shorthand,
  positive value styling, branded quick selectors and preset selection. Geometry parity remains a
  mandatory computed-style check in the consistency-enforcer skill.

## 2026-08-24: New ledger diverged from signed-off tracker patterns

- Area: Extra Place ledger table, filter workflow and tabbed editor modal.
- Root cause: the new ledger initially introduced a separate table and modal shell instead of
  extending the signed-off ledger primitives, producing clipped footer controls, missing filter
  controls and inconsistent action/value presentation.
- Prevention: a first-class ledger must inherit the canonical modal backdrop, sticky footer,
  tracker-range card, filter-dialog and row-action patterns before feature-specific styling is
  added. Page-local themes may alter semantic back/lay surfaces only; they cannot change action,
  value or modal geometry conventions.
- Test added: `tests/e2e/extra-place-ledger-parity.spec.ts` covers modal viewport/footer bounds,
  tracker range, detail-column control, grouped headers and Extra Place filter dialog behaviour.

## 2026-08-26: Branded controls and floating scroll actions drifted from ledger parity

- Area: Extra Place calculator quick selectors and shared horizontally-scrollable ledger tables.
- Root cause: the calculator fetched a second account catalogue independently of the table, while
  translucent scroll actions exposed underlying cell text.
- Prevention: modal bookmaker controls receive the same profile-owned catalogue instance as the
  table badge; never add a second catalogue fetch for the same ledger. Scroll actions must use a
  near-opaque surface, surrounding surface halo and backdrop blur sufficient to obscure table data.
  Rating display always uses `getMatchRatingPillTone`: `100%+` uses the gold high-rating state and
  `70–99.99%` uses green.
- Test added: `tests/e2e/extra-place-ledger-parity.spec.ts` and
  `apps/web/lib/ledger-calculator.test.ts`.

## 2026-08-27: Ledger scroll arrows followed the table midpoint instead of the visible viewport

- Area: shared `LedgerTableScroll` used by every horizontally-scrollable bet ledger.
- Root cause: absolute arrow controls were positioned at `50%` of the full table wrapper, so a
  long table required vertical scrolling before the controls could be reached.
- Prevention: portal horizontal controls to `document.body` and anchor their vertical centre to
  the visible intersection of the table and browser viewport. Keep disabled edge controls visible
  at reduced opacity whenever horizontal overflow exists. Issue overlays use backdrop blur rather
  than drop shadows so dense data is obscured without changing row geometry.
- Test added: `tests/e2e/extra-place-ledger-parity.spec.ts` checks viewport anchoring and the
  standard pagination footer.

## 2026-08-27: Ledger rows repainted after the page theme changed

- Area: shared bet-ledger rows, particularly dark-mode result-due rows.
- Root cause: table-row transitions continued after the root theme token changed, while the
  dark purple result-due surface was too close to its hover colour.
- Prevention: `ThemeProvider` adds `theme-switching` for the token swap and removes it after two
  animation frames; this disables transitions only during the atomic change. Result-due rows own
  their purple base/hover surface even if incomplete-field chips are also present; the chips and
  left markers preserve data-issue severity. Dark-mode base and hover selectors must have the
  same specificity, otherwise a later dark base rule silently defeats hover. Dark result-due
  tokens must retain a measurable darker-base-to-lighter-hover luminance difference.
- Test added: `tests/e2e/extra-place-ledger-parity.spec.ts` verifies the purple cue, fast row
  feedback, dark hover contrast and zero transition duration during a theme swap.

## 2026-08-28: Page loading overlays escaped into Settings dialogs

- Area: Profile list and Quick Action dialogs; Fund Manager Quick Actions and Database dialogs.
- Root cause: the shared ledger loading indicator is an absolutely positioned page overlay. When
  reused inside a content-sized Settings dialog it anchored outside the intended body, making the
  dialog appear empty or viewport-height. Empty list tables also lacked an explicit compact state.
- Prevention: adaptive Settings dialogs must localise ledger loading indicators as static content,
  keep only their body/table viewport scrollable, and render an explicit compact empty row. Dialog
  geometry tests must cover populated, empty and loading states rather than only checking that a
  dialog is smaller than the browser viewport.
- Test added: `tests/e2e/profile-settings-sections.spec.ts` and
  `tests/e2e/settings-modal-consistency.spec.ts` cover empty-list sizing, CRUD, centred dialogs,
  summary cards and reduced dark-mode geometry.

### YYYY-MM-DD: Short issue name

- Area:
- Root cause:
- Prevention:
- Test added:

## 2026-08-29: Pending founder data appeared as empty or blank content

- Area: Fund Manager Dashboard, Profile Accounts, Founder onboarding and Profile Settings.
- Root cause: client-owned data started from empty arrays, identifiers or blank page shells without
  an explicit initial request state, so hosted latency exposed transient zero values and layout
  pop-in.
- Prevention: asynchronous data surfaces must distinguish loading, empty, error and populated
  states, reuse `LedgerLoadingIndicator` in a stable relative shell and expose `aria-busy`. Do not
  add artificial delays or show zero/empty copy before the request resolves.
- Test added: `tests/e2e/ledger-loading-parity.spec.ts` delays Dashboard and Profile Account data and
  verifies the shared loading state remains visible until resolution.

## 2026-08-29: Default-zero money fields and commission units increased entry errors

- Area: Profile onboarding money and Exchange commission fields.
- Root cause: money parsing and first-focus behaviour were duplicated, while Exchange commission
  exposed the persisted decimal fraction directly and required users to calculate percentages.
- Prevention: use the shared decimal parser and `FinancialTextInput`; select an untouched zero only
  on first focus, retain shorthand decimal entry and format money to two decimals on blur. Display
  commission as a percentage but convert it to the established decimal-fraction API value; blank
  remains absent and explicit zero remains valid.
- Test added: `apps/web/lib/decimal-input.test.ts` and
  `tests/e2e/founder-profile-onboarding.spec.ts` cover shorthand money, zero selection and
  percentage-to-decimal commission conversion.

## 2026-08-29: Shell drawers and native unload prompts competed with platform confirmations

- Area: Profile onboarding and authenticated shell navigation.
- Root cause: the document-level unsaved-change capture handler intercepted drawer links before
  their close handlers ran, then a confirmed full-page navigation reached the still-active native
  `beforeunload` guard.
- Prevention: opening any platform confirmation dispatches the shared shell-close event. A
  confirmed document navigation receives a one-use unload bypass while the platform guard remains
  authoritative; direct browser close/reload continues to use `beforeunload`.
- Test added: `tests/e2e/founder-profile-onboarding.spec.ts` verifies the drawer closes, one platform
  dialog appears and no native dialog follows Discard Changes.

## 2026-08-28: Shell search or navigation bypassed request/runtime constraints

- Area: authenticated application shell, global search and Fund Manager drawer.
- Root cause: server-rendered data calls, Next route protection and FastAPI authorization can run
  in different runtimes; treating one of them as the only gate creates either leaked data or
  authenticated pages that cannot load.
- Prevention: Next validates the signed owner session before protected pages, FastAPI independently
  validates every protected API read/mutation, and server fetches forward only the session cookie.
  Global search remains a server-authorized endpoint and the drawer lists stable global routes
  rather than loading an unbounded Profile submenu. Components using `useSearchParams` in the app
  shell must remain inside a Suspense boundary for production prerendering.
- Test added: `apps/web/proxy.test.ts`, `apps/api/tests/test_auth.py`,
  `tests/e2e/global-search.spec.ts` and `tests/e2e/app-navigation-drawer.spec.ts`.

## 2026-08-28: Public auth pages exposed authenticated shell controls

- Area: login/registration shell and Fund Manager identity access.
- Root cause: the application chrome only hid global search on `/login`, leaving navigation,
  notifications and tracker theme controls visible before authentication; it also had no
  canonical representation of the authenticated principal.
- Prevention: public auth routes render branding plus the global theme toggle only. Authenticated
  routes use one compact identity trigger composed from the canonical menu and semantic-chip
  patterns, with protected account details and logout inside it.
- Test added: `tests/e2e/login-profiles-shell.spec.ts`,
  `tests/e2e/fund-manager-identity-shell.spec.ts` and `apps/web/proxy.test.ts`.

## 2026-09-01: Partial cache hydration exposed stale controls and unavailable reporting

- Area: global Dashboard, Profiles directory and Profile reporting.
- Root cause: one cached Profile could end the critical loading state before all selected Profiles
  and tracker settings resolved. The shared overlay ignored pointer input, and the normal loading
  path retried every ten seconds, duplicating already-running Neon requests.
- Prevention: critical page loading requires complete critical data, keeps controls inert behind a
  pointer-intercepting canonical overlay and ends shell progress only when the critical request set
  settles. Retry polling starts only after a real failure; loading is never rendered as
  `Unavailable`.
- Test added: `tests/e2e/hosted-reliability.spec.ts` covers blocked controls, delayed Profile
  reporting and the restored Profile archive lifecycle.

## 2026-09-02: Persisted toggles and Profile administration gave delayed or conflicting feedback

- Area: My Account security preference, Profile directory actions and Profile summary drawer.
- Root cause: the persisted switch waited for the server response before moving, while Profile
  editing and destructive lifecycle controls accumulated inside a quick-summary drawer with no
  authoritative management destination.
- Prevention: use `PersistedToggle` for immediate optimistic position, busy state, duplicate-click
  prevention and failure rollback. Keep the Profile drawer read-only; route icon-only Manage
  actions to `/profiles/{profileId}/manage`, where Profile forms and Archive/Restore are owned.
  Personal account destinations remain in the authenticated identity menu rather than being
  duplicated as global operational navigation.
- Test added: `tests/e2e/session-security-preference.spec.ts`,
  `tests/e2e/fund-manager-identity-shell.spec.ts`, `tests/e2e/app-navigation-drawer.spec.ts` and
  `tests/e2e/profile-lifecycle-routing.spec.ts` cover the shared toggle, navigation ownership,
  summary drawer and management lifecycle.

## 2026-09-02: Utility layout classes overrode tabs and ineffective gaps joined actions

- Area: Fund Manager Profile Management and Fund Manager Settings.
- Root cause: Profile Management tab panels combined native `hidden` with the grid-based `stack`
  utility, whose authored `display` rule overrode browser hidden styling. The fee action container
  declared `gap` without flex/grid layout, while settings tabs with different document heights
  changed scrollbar geometry and shifted the centred shell.
- Prevention: the canonical tab-panel selector enforces `display: none` for hidden panels; shared
  settings actions establish wrapping flex layout with the action-group spacing token; canonical
  page shells reserve stable scrollbar space and use containing-block width.
- Test added: `tests/e2e/profile-lifecycle-routing.spec.ts` verifies single-panel tab behaviour,
  keyboard navigation and action separation; `tests/e2e/settings-modal-consistency.spec.ts`
  verifies sibling Settings tabs retain the same horizontal shell geometry.
