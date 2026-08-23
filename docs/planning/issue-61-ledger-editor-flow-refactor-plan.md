# Issue 61 Ledger Editor Flow Refactor Plan

Status: implementation, automated parity verification and Fund Manager smoke testing complete for
Sportsbook, Free Bets, Casino Offers and Cash Adjustments on 2026-08-23. The public GitHub issue
remains open pending an authenticated closure update.

## Post-Outage Recovery Focus (2026-08-20)

The outage handover and follow-on smoke testing narrowed the remaining `#61` work to a small set
of active tracks. The intention is to finish these before reopening broader platform UX or starting
new ledger families.

### Active completion tracks

1. Cross-ledger modal parity hardening
   - sportsbook remains the canonical reference implementation;
   - Free Bets must match sportsbook for:
     - guided access;
     - sticky header/footer alignment;
     - settlement quick-result chips;
     - step-level `EDIT` / `EDITING` semantics;
     - save/revert/cancel-edit behaviour;
     - Outplayed-style matching calculator parity where the free-bet formula family allows it.
   - Casino Offers must keep the same shell, stepper rail, footer semantics and guided-access model
     while preserving casino-specific wagering/reward/settlement logic.
   - Cash Adjustments must keep the same shell, sticky geometry, guided access and save-state rules.

2. Guided access completion
   - every ledger tab set must provide working next-step text, clickable routing to the next field,
     and correct state when a row is saved, settled, bridged or reopened;
   - guided access must never render a blank `NEXT REQUIRED` banner;
   - guided access remains profile-scoped and user-toggleable.

3. Sportsbook calculator parity
   - sportsbook single-lay matching now uses the approved Outplayed-inspired layout;
   - remaining parity work is behaviour polishing, not a fresh redesign;
   - Multi Lay stays separate but must remain visually aligned with the same calculator system;
   - Free Bets reuses the same interaction model where formula differences permit it.

4. Modal save and route-guard hardening
   - modal body scroll must never leak to the page;
   - closing a saved modal must release body scroll reliably;
   - no route guard may appear when the user has not changed ledger data;
   - save/edit/revert states must be globally consistent across all ledgers.

5. Notification boundary after `#61`
   - toasts inside ledger modals stay suppressed in favour of inline/save-state feedback;
   - durable reminders and follow-up tasks belong in the Fund Manager notification centre;
   - notification consistency remains the next issue after `#61`, not part of the final `#61`
     smoke tranche except where modal parity depends on avoiding duplicate feedback.

### Deferred until `#61` is closed

- Extra Places ledger/calculator shell
- multi-fixture / outright sportsbook setup expansion
- bookmaker quick-account popup and multi-settle popup
- decision-support/dashboard task automation
- source-ingestion and Discord offer intake
- subscriber-facing guided access and modal variants

## Scope

Refactor the ledger add/edit experience from stacked nested sections into a shared tabbed modal
editor shell.

Primary target:
- sportsbook bets first.

Then mirror the same shell into:
- free bets;
- casino offers;
- cash adjustments.

Follow-up requirement:
- Free Bets and Casino Offers must receive the same guided-access model, tabbed modal shell,
  validation banners, sticky footer/header alignment, close/save/revert semantics and field
  spacing rules now proven in Sportsbook.
- Cash Adjustments and any future ledgers must use the same shared modal/stepper primitives by
  default, not one-off expanding page sections.
- Guided access must be profile-scoped and user-controllable. The first implementation stores
  `On`/`Off` locally per profile and keeps the internal `Minimal` value tolerant for later
  subscriber-facing reduced guidance. Do not expose `Minimal` until it has distinct behaviour and
  tests.

Out of scope for this refactor:
- changing calculation contracts;
- changing workbook-derived money logic;
- changing database schema unless a later approved slice requires persisted UI preferences;
- replacing all table behaviour with inline creation;
- adding autonomous betting, scraping or OddsMatcher/Oddsmatcher behaviour.

## Source Rules

This work must follow:
- `AGENTS.md`;
- `docs/codex/financial-safety-rules.md` when any visible money state is touched;
- `docs/agent-contracts/plum-duff-ui-accessibility-contract.md`;
- `docs/agent-contracts/plum-duff-ui-implementation-checklist.md`;
- `docs/agent-contracts/plum-duff-known-ui-pitfalls.md`;
- `docs/agent-contracts/plum-duff-ledger-modal-parity-contract.md`;
- `.skills/plum-duff-ui-review/SKILL.md`;
- `.skills/plum-duff-ui-consistency-enforcer/SKILL.md`.

The workbook remains the workflow blueprint. The refactor changes presentation and task guidance,
not row ownership, profile isolation, or cash-first financial semantics.

## Product Decision

Use a tabbed modal editor as the primary add/edit workflow for complex ledger rows.

Keep inline row editing as a later, limited quick-edit path for safe fields only.

Reasons:
- sportsbook rows can require calculator inputs, placement state, partial-lay legs, multi-lay
  outcomes, reminders, settlement and advanced workbook controls;
- free-bet rows can require award splitting, expiry, bridge defaults, retention mode and settlement;
- casino rows need a different qualification/reward/spin/result model;
- full inline row creation would compress complex workbook workflows into a table and increase
  calculation and validation risk;
- tabbed modal flow gives enough space for guided entry, while still reducing visual noise.

## User Workflow Goal

The user should always understand:
- what row is being edited or created;
- what tab they are in;
- what is complete;
- what blocks Save;
- what action is needed next;
- whether changes are saved, saving, failed or unchanged;
- how to close, revert or move to another tab without losing work.

## Modal Information Architecture

The shell must have exactly one visual modal surface:

1. Header:
   - eyebrow: ledger/action context, for example `Sportsbook Bet`;
   - title: row offer/event title or `Create Row`;
   - compact status chips only if actionable;
   - close action using shared red Material `close` icon treatment.

2. Tab rail:
   - visible directly below the header;
   - sticky with the header or fixed inside the modal shell;
   - real buttons with `aria-selected`;
   - keyboard arrow navigation where practical;
   - status indicators per tab.

3. Scrollable body:
   - only the active tab content scrolls;
   - no nested scroll unless a contained table/grid requires it;
   - validation banners sit at the top of the active tab.

4. Footer:
   - sticky/non-scrolling;
   - `Save`, `Revert`, `Close`;
   - Save shows spinner while saving;
   - Save disabled when no changes exist or hard validation fails;
   - disabled reason is available to the user.

## Shared Tab State Model

Every tab has:
- `id`;
- visible `label`;
- `status`: `complete`, `warning`, `invalid`, `locked` or `neutral`;
- `requiredIssueCount`;
- `warningIssueCount`;
- optional `summary`;
- `data-pd-id`;
- content region id for `aria-controls`.

Visual mapping:
- `invalid`: red outline/glow and count badge;
- `warning`: amber outline/count badge;
- `complete`: neutral/success subtle state;
- `locked`: disabled treatment with reason;
- `neutral`: default.

Rules:
- red text must not appear as loose paragraphs;
- required blockers appear in a rounded red validation banner plus field-level invalid state;
- warnings appear in rounded amber banners;
- banners are dismissible only when dismissing does not hide a hard blocker from assistive tech;
- dismissed banners must reappear when validation changes or the user attempts Save.

## Ledger Tab Sets

Sportsbook Bets:
- `Setup`: offer, bookmaker, bet type, offer type, fixture type, event, campaign/tag, status,
  expected settlement.
- `Matching`: back stake, back odds, exchange, lay odds, strategy, calculators, match rating,
  suggested lay.
- `Placement`: back placed, lay placed, partial lay legs, multi-lay placement rows, reminders.
- `Settlement`: result/outcome, settles, final value state, copy-to-free-bet bridge when relevant.
- `Advanced`: manual override, contract trace, calculation notes, audit notes.

Free Bets:
- `Setup`: bookmaker, offer, source sportsbook row when bridged, bet type, fixture type, event,
  retention mode.
- `Award and Expiry`: free-bet value, split awards, expiry, award timing, expiry watch state.
- `Matching`: stake/odds/exchange/lay strategy and free-bet calculator.
- `Settlement`: result/outcome, settles, final value state.
- `Advanced`: override, notes, trace.

Casino Offers:
- `Setup`: account/bookmaker, offer type, campaign, game, status, expected settlement.
- `Qualification`: cash stake, qualifying spend, spin count, spin value, wagering or trigger rules.
- `Reward and Spin Plan`: reward type, reward value, bonus/free-spins state, RTP/reference fields
  where available.
- `Settlement`: outcome, net result/cash returned, settles.
- `Advanced`: override, notes, trace.

Cash Adjustments:
- `Details`: date, direction, adjustment type, amount.
- `Posting`: investment/cash-account effect, linked account, reporting period.
- `Advanced`: description, audit note, source/trace.

## Field and Control Rules

All tabs must use the existing platform primitives first:
- `field-control` for input/select/textarea;
- `m3-picker-field` or the established date/time field treatment for date pickers;
- `EditorValidationBanner` for validation;
- `modal-close-button` or equivalent shared red close target;
- `modal-primary-button` or shared positive action for Save/create;
- shared destructive icon button for delete/remove;
- `table-scroll` for wide internal tables, such as multi-lay outcomes or free-bet split awards.

Controls must not:
- clip focus rings;
- place dropdown arrows against the field edge;
- use arbitrary local colours;
- use non-circular close/delete icon targets;
- stretch buttons to full width unless the workflow requires it;
- render Material Symbol names as text.

## Layout Rules

Modal shell:
- width: constrained by viewport;
- height: constrained by viewport;
- no page-level horizontal scroll;
- body scroll owned by the modal body, not the browser page;
- footer and close remain visible.

Tab content:
- one primary content surface per tab;
- avoid boxes inside boxes unless there is a functional grouping such as a calculator table;
- headings have consistent top/bottom padding;
- helper text must be short and actionable;
- dense controls use two-column layout on desktop and single-column on narrow widths;
- internal tables have local scroll, sticky header where useful, and aligned action columns.

## Validation and Guided Entry

Each ledger should expose a tab-level validation model derived from current form state.

Examples:
- Missing sportsbook back stake/back odds/lay odds blocks `Placement` and Save once status is
  `Placed` or `Settled`.
- Missing sportsbook settlement result blocks a settled row.
- Missing free-bet expiry is a warning/blocker only while unplaced/unsettled according to the expiry
  rules already agreed.
- Casino settlement requires a clear net result/cash returned outcome model once the casino process
  contract is finalised.
- Cash adjustments require direction/type combinations that make process sense.

The editor should guide the user:
- first invalid tab receives focus after failed Save;
- tab badges show where attention is needed;
- fields inside the active tab receive invalid styling and accessible error text;
- common selections can be shown as compact chips below fields without replacing controlled lists.

## Save and Dirty-State Rules

Save behaviour:
- button text is exactly `Save`;
- spinner appears inside the button while saving;
- Save disables while saving;
- Save disables after successful save until new changes are made;
- successful save closes the editor and returns to the ledger table unless the workflow is explicitly
  a multi-step bridge/continuation flow.

Dirty-state behaviour:
- no warning if no meaningful field changed;
- in-app confirmation dialog only, not browser confirm, except unavoidable `beforeunload`;
- route changes from dirty modal must preserve input if the user cancels.

## Inline Quick Edit Later

Inline quick edit is allowed later for:
- outcome/status action modal triggers;
- settlement date quick action;
- reminder quick action;
- delete/archive;
- copy-to-free-bet;
- small profile/account fields.

Inline quick edit is not the primary add-row workflow in this milestone.

## Implementation Slices

### Slice 1: Shared Shell Primitive

Create shared primitives only:
- `LedgerEditorModalShell`;
- `LedgerEditorTabRail`;
- `LedgerEditorTabPanel`;
- `LedgerEditorFooter`;
- tab status helper types.

No ledger logic migration in this slice.

Acceptance:
- demo harness or one controlled route can render shell;
- Playwright verifies shell geometry, close action, footer visibility, no overflow, keyboard focus.

### Slice 2: Sportsbook Migration

Move Sportsbook editor into the shared tab shell.

Keep existing form state, APIs, calculations and contracts.

Acceptance:
- Add Row opens Setup tab;
- existing row opens with relevant tab summaries;
- Save/Revert/Close work;
- validation blockers move to tab badges and rounded banners;
- calculator/multi-lay/partial-lay areas remain functional;
- no clipped field highlights or dropdown arrows.

Status:
- completed and user smoke-tested for the sportsbook-first tranche.

### Slice 3: Sportsbook Guided Validation Polish

Improve sportsbook tab-level flow after the shell is stable:
- field-level required indicators;
- first-invalid-tab focus;
- quick-pick chips for common fixture types and strategy defaults;
- cleaner placement-state guidance.

Acceptance:
- Playwright covers invalid Save, first invalid tab, field focus and banner dismissal/restoration.

Status:
- completed for sportsbook-first guided access, including Free Bet bridge access inside the same
  editor modal.

### Slice 4: Free-Bet Migration

Move Free Bets into the same shell.

Acceptance:
- bridge modal/split award flow remains intact;
- expiry rules remain correct;
- no duplicated/noisy helper text;
- tab status reflects expiry/award/matching/settlement issues.

Status:
- first-pass migration completed. Remaining work is smoke-test polish and ensuring Free Bet
  award/expiry/matching/settlement guidance stays equivalent to Sportsbook without introducing
  duplicate helper text.

### Slice 5: Casino Migration

Move Casino Offers into the same shell.

Acceptance:
- casino-specific qualification/reward/settlement areas are separated;
- current/final value confusion is reduced to the agreed casino outcome terminology;
- no new money logic without approved casino contract updates.

Status:
- first-pass migration completed with offer-type-driven tabs and guided access. Remaining work is
  smoke-test polish plus casino calculation-contract completion for any new wagering/EV logic.

### Slice 6: Cash Adjustment Migration

Move Cash Adjustments into the same shell.

Acceptance:
- direction/type validation is clearer;
- invalid combinations are blocked with field-level errors and a banner;
- posting/audit fields are not visually mixed with primary amount entry.

Status:
- first-pass migration completed with compact summary chips, tab rail, guided access and sticky
  header/footer parity. Remaining work is smoke-test polish and future ledger template extraction.

### Slice 7: Cross-Ledger Regression Lock

Harden tests and docs:
- update `ledger-editor-modal-parity.spec.ts`;
- add visual geometry/style parity assertions for tab rail, close/delete icons, fields, banners and
  footer;
- update known pitfalls if any new repeated defect is found.

Status:
- implementation verified. Current parity spec verifies the four existing ledgers open in a shared dialog shell,
  sticky header/footer geometry aligns to modal edges, tab rails and top/bottom navigation regions
  are present across all current ledgers including Sportsbook as the MVP reference shell, Cash
  Adjustments guided entry focuses the next field, Casino settled-row edit unlock stays inside the
  editor, and guided access can be disabled per profile.
- latest focused evidence on 2026-08-23:
  - `pnpm --filter @openforge/web test -- guided-entry-focus ledger-editor-tabs`: 200 passing tests;
  - `pnpm exec playwright test tests/e2e/sportsbook-guided-entry.spec.ts --workers=1`: 3/3;
  - `pnpm exec playwright test tests/e2e/ledger-editor-modal-parity.spec.ts tests/e2e/profile-settings-sections.spec.ts --workers=1`: 9/9;
  - `pnpm exec playwright test tests/e2e/free-bet-calculator-parity.spec.ts tests/e2e/casino-offer-branching.spec.ts --workers=1`: 8/8.

### Slice 8: Future Ledger and Subscriber Guidance Readiness

Before adding Extra Places, Calculator Workspace bridge rows or subscriber-entered ledgers:
- start from the shared modal/stepper shell;
- expose guided access only through the profile/user preference model;
- add subscriber-facing guidance copy only after subscriber visibility and permissions contracts
  define what the subscriber may see and edit;
- keep Fund Manager-only calculations, fees, account intelligence and audit notes hidden by
  default from subscriber routes.

Acceptance:
- new ledger scaffold has modal geometry parity tests before smoke test;
- guided access can be disabled for that profile/user context;
- subscriber route tests prove Fund Manager-only guidance and values are not visible.

## Required Tests

Unit:
- tab validation state mapping;
- first invalid tab selection;
- dirty-state detection;
- save button state;
- date/range-independent row opening where relevant.

Playwright:
- sportsbook add/edit modal tab flow;
- sportsbook calculator remains functional inside tab;
- sportsbook partial-lay and multi-lay controls remain bounded;
- free-bet split awards remain bounded;
- casino and cash tabs open and validate;
- cross-ledger modal geometry;
- close/delete icon dimensions and centre alignment;
- dropdown arrow and focus-ring spacing;
- no page-level horizontal scroll;
- dark mode and light mode;
- reduced viewport;
- keyboard tab order and Escape close/focus return.

Validation commands:
- `pnpm --filter @openforge/web lint`;
- `pnpm --filter @openforge/web typecheck`;
- targeted unit tests;
- targeted Playwright specs;
- `git diff --check`.

## Rollback Plan

Each ledger migration must keep the existing form state and API boundary intact.

Rollback options:
- feature flag or internal component switch per ledger while migrating;
- revert only the migrated ledger component if a tab-shell slice fails;
- shared shell primitive remains safe if unused.

Do not migrate all ledgers in one commit.

## Smoke Test For Current Cross-Ledger Slice

Smoke test only after the automated modal geometry, guided access, lint, typecheck and focused
Playwright checks pass.

Minimal user smoke test:
- Sportsbook: create a prospecting row, complete Bet Setup, enter standard matching values, use the
  suggested lay, mark back and lay placed, settle the row, save, reopen and confirm persisted value,
  status and Free Bet bridge availability where relevant.
- Free Bets: create a free-bet row, confirm guided access moves from Bet Setup to Matching, enter
  value/expiry/matching details, settle the row and confirm the settlement value banner and footer
  actions behave like Sportsbook.
- Casino Offers: create a Free Spins row and a Deposit/Bonus Wagering row, confirm offer type
  changes expose the correct steps, Reward completion ticks only after required reward fields are
  filled, Settlement uses the net result, and settled-row Edit keeps the modal open.
- Cash Adjustments: create an adjustment, confirm guided access moves from Details to Scope, save,
  reopen and confirm signed amount, posting scope and footer actions remain consistent.
- All ledgers: toggle guided access off for the profile and confirm no guided banner or restore pill
  appears; toggle it back on before continuing normal testing.
- All ledgers: resize/scroll the editor, confirm sticky header/footer stay flush with the modal,
  buttons remain aligned, close/delete icons are centred, and no page-level horizontal scroll appears.

No smoke test should be requested until automated geometry and interaction checks pass.

## Tranche Note: Sportsbook Multi-Lay Planner Inline Placement

Date: 2026-08-16

Change:
- Sportsbook multi-lay rows now keep branch exchange, effective lay stake and matched stake together
  in the multi-lay outcome table instead of splitting branch placement into a separate Placement tab.
- Multi-lay result table headings use the same visual style as calculator result-card headings, and
  liability/current summary values sit in the result-table footer.
- Multi-lay lay stake and liability values use neutral financial styling; result/profit outcomes keep
  positive/negative colour semantics.
- Multi-lay rows hide the single-lay `Lay / Exchange` and `Matched Lay` panels, so the branch table
  is the only place to manage multi-lay branch exchange, odds, calculated stake and partial match.
- Multi-lay calculator surfaces use the lay theme, no visible white table wrapper border, a readable
  off-state switch, and bounded columns that keep Exchange, Odds and Underlay Stake readable without
  expanding the modal.
- Multi-lay underlay mode uses a single effective `Lay Stake` column; the duplicate `Underlay Stake`
  column was removed because it repeated the same operational value in this workflow.
- Multi-lay partial matching edits now happen inline inside the `Lay Stake` cell; ticking `Partial`
  replaces the calculated value with a prefilled matched-stake input instead of adding a second field
  beneath it.
- Multi-lay calculator rule chips are hidden from the calculator body; branch guidance belongs in
  guided access rather than as extra visual noise inside the table.
- Multi-lay result and settlement outcome cards now render every branch, including third and later
  outcomes, rather than stopping at outcome two.
- Price Boost sportsbook rows no longer show the Free Bet step unless the offer type is actually
  free-bet awardable.
- Partial Lay is no longer treated as a visible primary lay mode. It remains a workbook-compatible
  stored strategy for legacy/imported rows, but the editor should expose partial matching as a
  placement control inside every lay-capable calculator mode:
  - Standard and Advanced single-lay rows expose a partial-match control for actual matched stake;
  - Custom uses the same control after the custom stake is chosen;
  - Multi Lay exposes the same control per outcome branch;
  - resetting partial match clears the visible `Part Laid` chip and restores the calculated target;
  - legacy `Partial Lay` rows load as Standard plus inferred/enabled partial matched stake.

Why:
- Smoke testing showed the previous split between planner and placement rows made multi-lay status
  unclear and duplicated the single/partial lay workflow.
- Per-outcome exchange selection is required because branches can be matched on different exchanges
  with different commission settings.
- Free Bet bridge actions must be gated by offer mechanics; showing a Free Bet step on Price Boost
  rows created a false workflow path.
- Treating `Partial Lay` as both a lay mode and a placement state made Strategy/Lay Mode confusing.
  Calculator mode should describe the calculation shape; partial matching should describe what was
  actually matched in the market.

Evidence:
- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm exec playwright test tests/e2e/sportsbook-multilay-workflow.spec.ts` passed, 2 tests,
  including explicit checks for the lay-themed multi-lay surface and zero-width table wrapper border.
- `git diff --check` passed.

## Follow-Up: Notification Centre Audit

Date: 2026-08-17

This is related to ledger modal parity because durable task feedback now belongs in the notification
bell, not as overlapping toasts inside add/edit modals. It should be tracked as a separate issue so
issue 61 can close without widening into account-level preferences.

Required scope:
- inventory all notification-producing workflows, including reminders, partial-lay rechecks, free-bet
  follow-ups, expiry watch, fee-review blockers, backup reminders and import/review tasks;
- confirm trigger conditions and timing windows for each notification type, including day-of,
  four-hours-before, two-hours-before, overdue, done, dismissed and cleared states;
- standardise notification templates with profile, ledger, row/event identity, due time, severity,
  action link and done/clear behaviour;
- verify notification links route to the correct profile, ledger, filter and row/action context;
- add fund-manager notification preferences first, with later subscriber-specific preferences for
  subscriber login scope;
- allow individual notification types to be disabled without disabling critical system warnings;
- add fixtures and tests for timing, deduplication, read/done/clear state, preference filtering and
  route targets.

Acceptance criteria for the follow-up issue:
- every active notification has a documented trigger, timing rule, template and route target;
- the fund manager can turn individual notification types on/off in account/settings scope;
- read notifications keep the active bell state without a red unread badge;
- done task notifications move to Done and expire only when the related row's settled datetime has
  passed;
- disabled notification types do not create new non-critical notifications;
- tests cover reminder timing, no duplicate unread badges, task completion, clearing confirmation and
  preference filtering.
