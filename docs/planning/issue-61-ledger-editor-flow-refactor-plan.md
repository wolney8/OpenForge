# Issue 61 Ledger Editor Flow Refactor Plan

Status: sportsbook-first tranche signed off. Remaining ledger migrations must be completed as
separate, small, test-backed slices.

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
- next required migration slice. Must include guided access and reuse sportsbook modal primitives.

### Slice 5: Casino Migration

Move Casino Offers into the same shell.

Acceptance:
- casino-specific qualification/reward/settlement areas are separated;
- current/final value confusion is reduced to the agreed casino outcome terminology;
- no new money logic without approved casino contract updates.

Status:
- pending migration slice. Must include guided access and avoid new money logic without contract
  updates.

### Slice 6: Cash Adjustment Migration

Move Cash Adjustments into the same shell.

Acceptance:
- direction/type validation is clearer;
- invalid combinations are blocked with field-level errors and a banner;
- posting/audit fields are not visually mixed with primary amount entry.

Status:
- pending migration slice. The shared modal shell must become the default for future ledgers.

### Slice 7: Cross-Ledger Regression Lock

Harden tests and docs:
- update `ledger-editor-modal-parity.spec.ts`;
- add visual geometry/style parity assertions for tab rail, close/delete icons, fields, banners and
  footer;
- update known pitfalls if any new repeated defect is found.

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

## Smoke Test After Sportsbook Slice

Minimal user smoke test:
- create a sportsbook prospecting row;
- complete setup;
- enter standard matching values and use suggested lay;
- mark back and lay placed;
- settle the row;
- confirm Save closes the editor and the table reflects value/status;
- reopen and confirm data persisted;
- test one incomplete row to ensure invalid tab/banners are clear.

No smoke test should be requested until automated geometry and interaction checks pass.
