# OpenForge Sportsbook Smoke Review Notes

_Last updated: 2026-07-06_

## Purpose

Use this worksheet while running a focused smoke test for the Sportsbook Bets workflow.

Primary path:

- `/login`
- `/profiles`
- open target profile
- `/profiles/:profileId/tracker/sportsbook-bets`

Scope for this pass:

- table visibility and interaction
- create/edit qualifying bets
- standard lay flow
- advanced bet and advanced lay combinations (for example DDHH and multi-lay/price-boost style rows)
- workbook-parity and cash-first behaviour observations

## Test Session Metadata

- Date: 6 july 2026
- Tester: will
- Profile used: alpha
- Build/commit reference:
- Browser: internal vscode
- Environment notes:

## Pre-Flight Checks

- [x] App loads from `/login`
- [x] Profile list is visible and selectable
- [x] Sportsbook Bets route opens without errors
- [x] Existing rows render in table
- [x] No blocking console/runtime errors observed

Notes:

## Scenario 1: Basic qualifying bet with standard lay

Intent:

- confirm core qualifying-bet path works end to end
- verify expected row values are visible after save

Steps run:

1. Open Sportsbook Bets module.
2. Click add row button.
3. Enter basic qualifying bet with standard lay details.
4. Save row.
5. Reopen row in edit mode.

Expected checks:

- [ ] Row saves successfully
- [ ] Row appears in table immediately
- [ ] Edit mode opens reliably from table click
- [ ] Core values (stake, odds, lay stake, liability, status) look coherent
- [ ] Cash-first/current value field is present and understandable

Observed behaviour:

- Notes: In-bet setup, change offer alias to offer. This is where the name of the offer will go and it could be various. And also make this field not required. Bet setup offer name. This list can be condensed likely. Discover what types of offers are usually provided by bookmakers and condense or expand the list to make more sense at the moment. One off other special offer don't really make sense and having none in the list also doesn't make sense. Let's set up. Market is not required. We can remove this field.Let's set up "settle's date". If fixture type is football, add in a small button next to "settle's" where if clicked it updates the time of the settled bet to be plus 90 minutes as football games will settle after 90 minutes after the kickoff time. Ensure that this can only be clicked once. Add a tag in the background for this sportsbook row to ensure it can't be clicked again. Otherwise, enable it to be reset and clicked again- this function is in the workbook parity so please check. In odds and matching set the exchange by default to Smarkets. Hide no exchange unless the bet type is mug bet. In suggested lay and projected outcomes, explain what the pill described as "resolved" is and what it means. Also, change suggested lay's standard overlay and underlay to the clickable buttons that add their lay values to the actual and change the strategy to their values, once this is done, you can remove the 'Use suggested lay' pill button as the action will be covered by the implementation of the above. Can projected outcomes instead of having a row with possible outcome backwind, possible outcome laywinds, possible outcome x, possible outcome y, just list the column header as possible outcome. And then each row will be the possible outcomes that are available for this combination. Do not list possible outcomes if they have not been set in this combination. For example, in a bet and get standard lay, there are only two possible outcomes, but in projected outcomes, I can see outcome two wins and outcome three wins. Also, if we did have a Double Delight or other bet combos with more than two outcomes, the wording for outcome two wins and outcome three wins should match the user set outcome names. After clicking Save Sportsbook Row, the Edit Sportsbook Row section should be collapsed and the user should return to the table view where their bet that they just added is highlighted and/or the table is filtered to allow that bet to be shown.When the user is using the odds and matching section, the likelihood is that they are about to place their back bet at those odds and about to place their lay bet at those odds. When the user clicks on the suggested lay and it copies the clipboard, there should be a button available to the user just beneath the calculator panel that lets the user click to tick that this bet has been placed. And thus, settlement should change to pending and status should change to placed. Status should be set to prospecting for all new sportsbook rows.


## Scenario 2: Advanced bet with advanced lay combinations

Intent:

- confirm complex sportsbook rows can be entered and reviewed
- capture UX friction in multi-lay and price-boost style workflows

Suggested advanced examples to try:

- [ ] DDHH-style row
- [ ] Multi-lay row with more than one lay branch
- [ ] Price boost row
- [ ] Partial lay or no-lay variant where relevant

Expected checks:

- [ ] Advanced inputs are discoverable in UI
- [ ] Validation feedback is clear when required fields are missing
- [ ] Multi-lay branches are readable in table and editor
- [ ] Liability and current value fields stay understandable
- [ ] Save/edit loop remains stable

Observed behaviour:

- Notes: There is a mismatch of understanding between bet type and offer type so we need to be consistent in this. Bet type should be accumulator, bet builder or single. For all bet types, especially for and specifically for qualifying bets, we need a percentage indicator describing the qualifying loss. I believe this is compared to the backstake and we need this for a qualifying loss and what's known as in Outplayed.com's calculators as a match rating percentage. This would be useful to see in the calculator panel in a clear pill, potentially on the top right of the matching plan or calculator panel, and shown once lay actual is filled in. When we are filling in offer type, that's an ACCA. We need to have multiple events, depending on how many ACCAs we're doing, and multiple football saddle dates and times. And then we need a way to implement sequential lay in the odds and matching section, potentially later on. But initially we need to know of all of the events that we are including in the various stages of the ACCA and then those back odds for each of them and lay odds for each of them.The pill for known special offer bookmakers doesn't seem to show any content. I just need you to check when that shows, what logic it is using to show, and if we need to store some special offer bookmaker logic and combos. I was able to save an Acre Sportsbook row while the Odds and Matching section had incomplete exchange and layouts. It might be possible to do this in the platform but we need to be very distinct in the table of highlighting rows where there is incomplete data or as we implement the buttons to suggest if a bet has been placed. Specifically, if a single back bet and a single lay bet have both been placed then all of these fields need to be completed. But if we have only placed the back bet and we were unable to place the lay bet due to insufficient liability then we need to make that clear and need to make sure the fund manager is aware of this so they can deal with it later. Maybe having notification systems to say check this bet before it starts, before the event starts or return to this bet because liability should have been returned to that specific exchange by now. And I think in the event that there is insufficient liability in an exchange it would be good to be able to document that on the Sportsbook row so that specific exchange that was being chosen when other bets have settled and their liabilities have returned then that user can be informed before their unlaid Sportsbook bet starts or the back bet starts that they can now place the lay for that bet. We also need to include the likelihood that a bet may have been laid partially and this would not normally be a choice. This would often be in a situation where the exchange did not have enough so only part of the bet has been laid. We need a workflow where the user can click a button to say only partially laid. I'm imagining when the user or when we implement the functionality to tell the platform that the user has placed the back bet when they go to place the lay bet and it partially matches the user can come back here and instead of clicking the button that says laid in full or fully laid they can click partially laid and then enter the amount that has been laid and that will change the bet to being partially laid and then we can inform the user later to check it again to make sure ultimately that it is fully laid. I'm not sure of situations when I have ever needed to specifically partially lay a bet but it's possible that we can keep the strategy option of partially laid there in case that happens in the future.

When the user chooses the strategy in matching plan of custom, we need to add a slider which has a min and max that gives instant feedback on the lay stake, the liability, the 'if bookmaker bet wins', and the 'if exchange lay wins' values. Usually there is a preset min and max value, if we are to go by outplayed.com's advanced calculator, the min value is set at one less than the back stake and the max value is set at one more than the back stake. And the slider is sensitive to up to two decimal places. There should be an ability to change the min and max, and like previous, the user should be able to copy to clipboard and similtantiously the value gets added to the lay actual. I noticed if choosing custom after the strategy was on standard underlay or overlay or clicking multilay and returning to custom lay, a new section appears underneath the odds and matching section called placement with lay match take one within it. I'm not sure this is correct as with custom we only need one lay.

Multi-lay planner needs a little bit of work. What I would like to see is a sort of column system where we have column one as the outcome, column two as the lay odds, and in the first row we have just the number one indicating the first lay and then a text box which shows the word outcome one and then that can be modified up to 10 characters and then next to that is another field which is the layout for that outcome and then under that another row which is for the second lay and in the same format having an outcome which can be modified. Maybe we can add suggestions in here such as one dash one or one dash two as these are normally the football score outcomes. Maybe those can be set up as suggestion pills which can be selected and then again next to that the lay odds and then under this we can can keep the add outcome button to add another row. While testing this I could also see the placement section underneath this with "they match stake 1". I'm not sure if this is needed in this particular calculation or not. Please check If this is a correct section and if so for standard single bets should this not go into the same section as the odds and matching rather than on its own. And if it's a multi-lay then there will be various lays, various lay outcomes and various lay odds and therefore various lay stakes.

So having the ability to copy the lay is excellent. That should go in our lay match date and I think that might be what placement lay match date one is. But remember for multi-lays we have to enter the lay for those different outcomes. But returning to my feature idea, for all better types to have the ability to click copy lay, that adds that lay stake to the section that captures the placement of what's been laid. And then going to the exchange to place that stake and submit the lay bet and obviously in the event that that's only partially laid it would be good to be able to come back to this screen and either indicate that the bet has been fully laid or the bet has been partially laid and then what that partially is we'd assume that if it's been fully laid it has been laid with what has been placed or added to the lay match date. If the and we should have the same thing for back bet by the same thing I mean we should simply be able to click and tick that this has been placed. There may also be situations where that particular bet has had to be cashed out and then we may have a negative value up to 10-20p loss. So if that's the case then there needs to be a way for the user to indicate that something's been cashed out and potentially on the same lines with the exchange a way to indicate that it's been traded out and at what loss. I'm not sure how that is calculated but that would be useful.


## Table and Workflow UX Review

Evaluate while adding and editing rows:

- [ ] Table remains visible when expected
- [ ] Editor panel state changes are predictable
- [ ] Field labels match workbook intent
- [ ] Bet lifecycle statuses feel clear
- [ ] Error messaging is actionable
- [ ] Keyboard/tab flow is usable
- [ ] Mobile/responsive behaviour acceptable

UX friction log:

There should be a filter that shows bets that are placed pending within the defined date range.
The user should be able to click any of the column headings to sort by those such as clicking by bookmaker arranges out basically or clicking settles date arranges it by date either ascending or descending.
We need to consider advanced table display features such as highlighting rows that are partially laid, highlight rows that are prospecting and highlight rows that are statillating soon, highlight rows that have the status of glazed but maybe not having a settled date and so forth.
There is no current functionality that enables the ability to copy a settled or placed bet to free bets. In the event that we have a bet and get, some free bets are released when the bet is placed and we need the way that the workbook is configured is to change the status to free bet awarded. So ideally we would be able to click a button that has a bet and get or any one of those offer types which allow for the user to earn a free bet or something else such as deposit and get or deposit bet and get, bet and get, insurance, in play, bet and get, bet clubs, bonus lock-in or rather refund if, reloads, stake refund and sign up welcome offers envisioning a button that they can click to copy certain fields over to free bet or enable a modal that enables them to customize that as the user would like the want to change various things such as the free bet expiry, if they know it by default that should be three days, the value of the free bet, the bet type such as is the free bet single, an hacker or a bet builder and what fixtures they're allowed to place the bet on and so forth and in doing so that if the original sportsbook bet has not settled yet the original sportsbook bet should be changed to the status of free bet awarded and that's in the event that the sportsbook qualifying bet and is or the free bet of that particular qualifying bet is awarded on placement so maybe if we are creating a bet and get we could also put in fields that capture whether the free bet is awarded on placement or it's awarded after settle or if it's awarded in other scenarios and then we could use that logic for other things hopefully that makes sense we can plan this out a little bit better if necessary

## Workbook-Parity Observations (Sportsbook)

Use this section to record parity-specific findings against workbook intent.

- [ ] Qualifying-bet workflow aligns with workbook structure
- [ ] Standard lay calculations appear consistent
- [ ] Advanced lay branch handling appears consistent
- [ ] Open/current value vs settled/final value distinction is clear
- [ ] Manual override behaviour (if used) is explicit and auditable

Parity findings:

- Confirmed parity points:
- Potential parity gaps:
- Unclear areas needing contract/fixture follow-up:

## Bugs and Change Requests

### Bug report template

- ID:
- Severity: High / Medium / Low
- Area:
- Steps to reproduce:
- Actual result:
- Expected result:
- Suggested fix:

### UI/UX change request template

- ID:
- Area:
- Current experience:
- Proposed change:
- Why this helps:

## End-of-Session Summary

- Total scenarios run:
- Passed:
- Partial:
- Failed:
- Top 3 issues:
1. 
2. 
3. 

Recommended next action:

- [ ] Add/adjust automated Playwright smoke coverage
- [ ] Add/adjust deterministic fixtures for uncovered sportsbook cases
- [ ] Open/Update issue(s) with findings
- [ ] Defer items pending workbook parity clarification

## Handoff Notes For Next Agent

What was completed:

What remains:

Exact next step:

## Agent Triage Snapshot (2026-07-06)

### Implemented now for re-smoke

- Sportsbook multi-lay and multi-lay-underlay now use a dedicated branch planner grid instead of the generic partial-lay action flow.
- Multi-lay planner now renders outcome rows in a true calculator table with:
	- outcome label
	- lay odds
	- commission
	- standard lay stake
	- underlay stake when applicable
	- liability
	- per-branch `Copy lay`
- Multi-lay results now render as a named-outcome table instead of prose summary lines.
- `Copy lay` on a multi-lay branch now:
	- copies the effective stake to clipboard
	- creates or updates that branch placement row
	- autosaves the sportsbook row immediately
	- promotes lay status through `Not Laid` -> `Part Laid` -> `Fully Laid`
- Multi-lay placement now uses branch rows (`Outcome`, `Exchange`, `Lay Odds`, `Matched Stake`, `State`) and no longer reuses the generic partial-lay controls.
- Branch placement persistence is now stored tolerantly inside `multi_lay_outcomes_json`, while legacy rows still load without migration.
- API calculation/status path now treats enriched branch placement completeness as the source of truth for multi-lay lay status.
- Tracker settings now normalise bonus retention into workbook percent terms at the UI boundary (`70`, not legacy `0.7` ratio style).
- New sportsbook drafts and refund/cashback flows now consume the profile-scoped default bonus retention percent instead of hardcoding `70`.
- Legacy sportsbook rows carrying ratio-style retention values now load into the editor in percent form for parity-safe editing.
- Free-bet preview/list/detail calculations now consume the profile-scoped underlay and overlay factors from tracker settings instead of the global hardcoded defaults.
- Free-bet calculator panel now surfaces the active profile underlay/overlay defaults so the suggested lay values are traceable during smoke review.
- Shared workbook selector helpers now enforce offer-family-safe bet-type defaults:
	- incompatible bet types are reset on offer-type change
	- sportsbook and free-bet bet-type dropdowns now narrow to approved offer-family mappings instead of always showing the full mixed list
- Campaign-tag (`offer_name`) selectors now apply offer-family keyword filtering with safe full-list fallback, keeping workbook `OfferNameList` usage but reducing noise in sportsbook/free-bet flows.
- Sportsbook -> Free Bets bridge now supports explicit award timing:
	- `Award after settlement` keeps the sportsbook row unchanged and pre-fills the free bet as `Not Yet Awarded`
	- `Award on placement` promotes the sportsbook row to `Free Bet Awarded` and pre-fills the free bet as `Available`
- The editor-side `Create Free Bet` action now reuses the same bridge modal as the table action, so both entry points follow the same award-timing workflow.
- Free-bet regression coverage now also locks:
	- sportsbook editor `Create Free Bet` path reusing the bridge modal
	- free-bet settled-row lock until explicit edit enablement
	- create/save returning the user from the free-bet editor to the ledger table

- Offer field relabelled from "Offer alias" to "Offer".
- Offer and Offer name are now optional in sportsbook bet setup validation.
- Market relabelled as optional.
- New sportsbook draft defaults exchange to `Smarkets`.

### Validation evidence for this tranche

- `pnpm --filter @openforge/web lint`
- `pnpm --filter @openforge/web typecheck`
- `pnpm --filter @openforge/web test`
- `pnpm playwright tests/e2e/sportsbook-free-bet-bridge.spec.ts`
- `pnpm playwright tests/e2e/free-bet-award-gating.spec.ts`
- `pnpm playwright tests/e2e/free-bet-editor-bridge.spec.ts`
- `pnpm playwright tests/e2e/free-bet-settled-lock.spec.ts`
- `pnpm playwright tests/e2e/free-bet-save-return.spec.ts`
- Exchange option `No exchange` is hidden unless offer type is `Mug Bet`.
- Suggested lay panel now supports direct strategy actions:
	- click Standard/Underlay/Overlay value to set `lay_actual`
	- selected action also sets `match_strategy`
	- chosen value is copied to clipboard
- Removed separate "Use suggested lay" action.
- Added clear explanation text for `Resolved` state chips.
- Projected outcomes now hide outcome rows that are not available for the active branch.
- On create-and-save, workflow returns to table and filters to the newly created sportsbook row ID for quick confirmation.

## Agent Triage Snapshot (2026-07-11)

### Implemented now for re-smoke

- Selector taxonomy cleanup is now partially implemented without changing money logic.
- Base sportsbook `OfferType` options no longer advertise legacy wager-shape values:
  - removed from base selector list:
    - `Bet Builder`
    - `Acca`
  - legacy rows still remain tolerated through row-derived option fallback
- Sportsbook and free-bet `BetType` options now include workbook-compatible
  composite placement values:
  - `In Play + Single`
  - `In Play + Bet Builder`
- Sportsbook `BetType` no longer normalises workbook market-shape values down
  to `Single`.
  - `First Goalscorer` now remains `First Goalscorer`
  - `Correct Score` now remains `Correct Score`
  - only legacy accumulator variants normalise to `Accumulator / Multiple`
- Sportsbook `OfferType -> BetType` defaulting now follows the approved field model:
  - `Double Delight / Hat-trick Heaven` -> `First Goalscorer`
  - legacy `Bet Builder` offer-type rows -> `Bet Builder`
  - legacy `Acca` offer-type rows -> `Accumulator / Multiple`
  - otherwise empty rows fall back to `Single`
- Sportsbook `BetType` helper text now explains that it is for wager shape or
  placement context, not just slip structure.
- Free-bet workflow now mirrors the same `BetType` option model and
  normalisation rules.
- Free-bet `Campaign tag` is now optional in runtime validation, matching the
  approved ownership model rather than being treated as a required field.

### Verification completed

- `pnpm --filter @openforge/web lint` passed
- `pnpm --filter @openforge/web typecheck` passed
- `pnpm --filter @openforge/web test` passed
- Focused Playwright:
  - `pnpm exec playwright test tests/e2e/sportsbook-selector-taxonomy.spec.ts` passed
  - `pnpm exec playwright test tests/e2e/free-bet-award-gating.spec.ts` passed
  - `pnpm exec playwright test tests/e2e/settings-owned-selector-propagation.spec.ts` passed
  - `pnpm exec playwright test tests/e2e/sportsbook-actions-modal.spec.ts tests/e2e/sportsbook-outcome-option-branching.spec.ts tests/e2e/sportsbook-outcome-modal-lifecycle.spec.ts` passed
  - `pnpm exec playwright test tests/e2e/free-bet-actions-modal.spec.ts tests/e2e/free-bet-outcome-modal-lifecycle.spec.ts tests/e2e/free-bet-outcome-option-branching.spec.ts` passed
  - `pnpm exec playwright test tests/e2e/casino-actions-modal.spec.ts tests/e2e/casino-outcome-modal-lifecycle.spec.ts` passed

### Important validation note

- Two earlier Playwright commands were mis-invoked and accidentally launched
  the wider suite in parallel. Those outputs are not the evidence for this
  slice and should be ignored in favour of the focused reruns above.
- Partial-lay summary labels now use requested title casing style and Recommended Next Lay Stake includes a `Copy` pill.
- `Copy` on Recommended Next Lay Stake now copies to clipboard and applies that stake to the next lay leg matched-stake slot (or creates a next leg when missing).
- Lay-leg removal now uses an inline destructive bin-style action beside matched stake input, replacing the standalone remove pill.
- Lay-leg removal now includes confirmation warning text (`Are you sure? lay has been entered.`) and a one-click undo path.
- Added calculator-panel Match Rating pill when lay actual is present and rating is available.
- Added `Mark Bet Placed` action in lay placement controls to quickly set placement lifecycle state.
- Partial-lay leg rows now render as explicit 3-column layout: leg selector, lay odds, matched stake.
- Remove-lay control now uses a centered red SVG bin icon (not emoji), inline beside matched stake.
- Recommended Next Lay Stake now uses value-as-pill behavior; zero/non-positive values are disabled/non-copyable.
- Match Rating pill now uses no decimals and risk-tier color bands:
	- `<40` low (red)
	- `40-69` mid (amber)
	- `70-99` good (green)
	- `>=100` ARP-risk tier (focus color)
- Added durable icon guidance for future AI and contributors:
	- `docs/reference/ui-iconography-protocols.md`
- Added football settles assist in Bet setup:
	- `+90m Football` appears when Fixture type is `Football` and Settles has a value.
	- Helper is single-use locked after click and shows `Football +90m Applied` tag.
	- `Reset` restores original Settles value and re-enables helper.
- Settings-owned campaign tags are now surfaced as the authoritative selector source in sportsbook, free bets, and casino offers.
  - New profile lookup values no longer need to appear in existing rows before they become selectable.
  - Legacy row-derived fallback still remains when no Settings-owned authority values exist.
- Sportsbook outcome modal now follows the same lifecycle rules as the main editor.
  - selecting a settled outcome promotes status to `Settled`
  - selecting `Placed` / `Prospecting` / `Not Placed` resets outcome to `Pending`
  - selecting `Cancelled` / `Void` resets outcome to `Void`
- Free-bet table review action now uses a dedicated settlement modal instead of forcing the full editor open.
  - edit action still opens the editor
  - settlement action opens a quick modal and keeps the editor closed
  - modal lifecycle now matches the free-bet editor rules:
    - settled outcome promotes status to `Settled`
    - placeholder statuses reset outcome to `Pending`
    - `Void` keeps outcome `Void`
- Free-bet row-level save validation now resolves exchange commission from the row being persisted, not only from the currently open editor form.
- Free-bet quick outcome modal now mirrors editor wording for `No Lay` rows.
  - `Lose` is presented as `Back lost`
  - `Lay Won` is not shown for no-lay rows
- Casino-offer table review action now uses the same quick settlement modal pattern as sportsbook and free bets.
  - edit action still opens the editor
  - settlement action opens a modal and keeps the editor closed
  - modal lifecycle now matches the casino editor rules:
    - resolved outcomes promote status to `Settled`
    - returning to `Started` / `In Progress` resets outcome to `Pending`

Football settles assist smoke evidence (2026-07-06):

- Before: `2026-07-20T12:00`
- After `+90m Football`: `2026-07-20T13:30`
- Helper disabled after apply: `true`
- Applied tag visible: `true`
- After `Reset`: `2026-07-20T12:00`
- Helper enabled after reset: `true`

### Offer type vs bet type taxonomy clarity update (2026-07-06)

- Sportsbook bet type taxonomy is now normalized to `Single`, `Accumulator`, and `Bet Builder`.
- Legacy values (`Acca`, `Accumulator / Multiple`, `First Goalscorer`, `Correct Score`) are normalized in-form to avoid mixed taxonomy states during editing.
- Offer-driven defaults now map consistently:
	- `Acca` offer -> bet type `Accumulator`
	- `Double Delight / Hat-trick Heaven` offer -> bet type `Single`
- Bet setup labels now explicitly separate concepts:
	- `Bet type (slip structure)`
	- `Offer type (promotion mechanism)`
- Added inline helper copy under both fields to reduce taxonomy confusion during entry.

Offer/bet taxonomy smoke evidence (2026-07-06):

- Bet type options shown: `Accumulator`, `Bet Builder`, `Single`
- After selecting offer type `Acca`, bet type auto-set to `Accumulator`
- Updated helper copy visible under both controls

### Placement completeness surfacing update (2026-07-06)

- Added shared placement completeness helper for sportsbook rows (`getSportsbookPlacementMissingFields`).
- Table now surfaces placement-risk rows with:
	- `row-state-placement-incomplete` left-edge accent.
	- `Placement incomplete` warning chip stacked in the Status column.
- Editor now shows proactive warning copy as soon as status/result requires placed workflow and required fields are missing (not only after failed save).

Placement completeness smoke evidence (2026-07-06):

- New-row flow with status set to `Placed` immediately shows:

### Special-offer bookmaker surfacing update (2026-07-10)

- Sportsbook special-offer bookmaker guidance now resolves from either:
  - `offer_type`
  - workbook-style `offer_name`
  - entered `offer` text
- The panel now renders explicit bookmaker-state groups instead of looking empty when no active profile account matches:
  - `Available on this profile`
  - `Unavailable on this profile`
  - `Not yet linked on this profile`
- Available bookmaker pills remain actionable and set the bookmaker field directly.
- Unavailable and not-linked bookmaker states now remain visible as non-interactive pills, so the workflow does not rely on colour or hidden assumptions.
- The panel also shows the resolved special-offer knowledge key so the operator can see which special-offer rule set is being used.

Special-offer bookmaker smoke evidence (2026-07-10):

- `pnpm --filter @openforge/web lint` passed
- `pnpm --filter @openforge/web typecheck` passed
- `pnpm --filter @openforge/web test` passed
  - 7 files / 47 tests
- `pnpm exec playwright test tests/e2e/sportsbook-special-offer-bookmaker-panel.spec.ts` passed
  - 1 test

### Table lifecycle chip update (2026-07-10)

- Sportsbook table `Status` cells now surface explicit lifecycle chips so workbook review does not depend on opening each row.
- Added scan-friendly labels for common states:
  - `Draft only`
  - `Back placed only`
  - `Lay partially matched`
  - `Lay fully matched`
  - `Free bet awarded`
- Placement risk remains separate as its own `Placement incomplete` chip, so lifecycle and missing-data state are not conflated.
- This improves sportsbook review for the real operator pass:
  - checking recent rows
  - spotting rows that still need exchange action
  - distinguishing partial-lay rows from fully matched rows

Lifecycle chip smoke evidence (2026-07-10):

- `pnpm --filter @openforge/web lint` passed
- `pnpm --filter @openforge/web typecheck` passed
- `pnpm --filter @openforge/web test` passed
  - 7 files / 48 tests
- `pnpm exec playwright test tests/e2e/sportsbook-lifecycle-table-chips.spec.ts` passed
  - 1 test

### Review filter and control-motion tidy (2026-07-10)

- Replaced sportsbook table review-mode pill filters with a single `Filter` select control.
- This is closer to the requested ledger-review pattern and reduces visual noise at the top of the sportsbook table.
- Removed the shimmer sweep from pill and button hover states.
- Hover controls still retain the existing lift/border/background feedback, but no longer imply loading behaviour.

Review filter and motion smoke evidence (2026-07-10):

- `pnpm --filter @openforge/web lint` passed
- `pnpm --filter @openforge/web typecheck` passed
- `pnpm --filter @openforge/web test` passed
  - 7 files / 48 tests
- `pnpm exec playwright test tests/e2e/sportsbook-lifecycle-table-chips.spec.ts tests/e2e/sportsbook-review-filter-select.spec.ts` passed
  - 2 tests

### Workflow-table column and action pass (2026-07-10)

- Reworked sportsbook table columns toward the operator’s daily review flow:
  - `Settles`
  - `Bookmaker`
  - `Event`
  - `Offer`
  - `Strategy`
  - `Lay status`
  - `Back bet status`
  - `Value`
  - `Outcome`
  - `Free bet`
  - `Status`
- `Lay status` now carries lay-only state and uses short labels:
  - `Not Laid`
  - `Part Laid`
  - `Fully Laid`
- Added separate `Back bet status` so back placement no longer has to be inferred from the generic status column.
- `Status` now shows short action-oriented issue chips instead of duplicating lay placement state, for example:
  - `Back Unplaced`
  - `No Settle Date`
  - `Outcome Needed`
  - `Placed`
  - `Settled`
- Added inline table actions:
  - row-level `Outcome` dropdown
  - row-level `Free bet` bridge dropdown for free-bet-awarding sportsbook offers

Workflow-table smoke evidence (2026-07-10):

- `pnpm --filter @openforge/web lint` passed
- `pnpm --filter @openforge/web typecheck` passed
- `pnpm --filter @openforge/web test` passed
  - 7 files / 50 tests
- `pnpm exec playwright test tests/e2e/sportsbook-lifecycle-table-chips.spec.ts tests/e2e/sportsbook-review-filter-select.spec.ts tests/e2e/sportsbook-table-workflow-columns.spec.ts` passed
  - 3 tests

### Corrected sportsbook table workflow pass (2026-07-10)

- Widened the tracker shell so ledger tables can use more of the available page width before horizontal scrolling is needed.
- Sportsbook table now follows the corrected daily workflow model:
  - `Settles`
  - `Bookmaker`
  - `Event`
  - `Offer`
  - `Strategy`
  - `Lay Bet`
  - `Back Bet`
  - `Value`
  - `Status`
  - `Actions`
- `Status` is back to the raw stored status only, with colour coordination retained.
- `Lay Bet` and `Back Bet` now carry their own independent placement states.
- Row issues moved out of the main table columns and into hoverable row-edge drawers:
  - warning rows
  - urgent rows
- `Actions` is now modal-driven and does not open the editor:
  - outcome/status/settles modal
  - free-bet bridge modal with editable defaults
- Free-bet bridge defaults now carry through to the free-bet workflow prefill, including:
  - offer name
  - free-bet value
  - expiry
  - retention mode

Corrected sportsbook table smoke evidence (2026-07-10):

- `pnpm --filter @openforge/web lint` passed
- `pnpm --filter @openforge/web typecheck` passed
- `pnpm --filter @openforge/web test` passed
  - 7 files / 51 tests
- `pnpm exec playwright test tests/e2e/sportsbook-review-filter-select.spec.ts tests/e2e/sportsbook-lifecycle-table-chips.spec.ts tests/e2e/sportsbook-table-workflow-columns.spec.ts tests/e2e/sportsbook-actions-modal.spec.ts` passed
  - 4 tests

### Ledger summary-card parity coverage (2026-07-10)

- Added Playwright coverage for consolidated editor summary cards in:
  - `Free Bets`
  - `Casino Offers`
- Coverage checks:
  - offer-based editor header title is used instead of raw row-ID fallback when useful content exists
  - first summary card still carries value semantics plus `Status:`
  - `Free Bets` keeps `Expiry`, `Lay and matching`, and `Offer path` card semantics
  - `Casino Offers` keeps `Settles`, `Expiry`, and `Offer path` card semantics
- Minor wording correction applied in `Casino Offers` summary fallback:
  - `Bookmaker and offer pending` -> `Bookmaker and game pending`

Parity coverage evidence (2026-07-10):

- New spec:
  - `tests/e2e/ledger-summary-card-parity.spec.ts`
- Validation target for this tranche:
  - `pnpm --filter @openforge/web lint`
  - `pnpm --filter @openforge/web typecheck`
  - `pnpm --filter @openforge/web test`
  - `pnpm exec playwright test tests/e2e/ledger-summary-card-parity.spec.ts`
- Result:
  - web lint passed
  - web typecheck passed
  - web vitest passed (`7 files / 46 tests`)
  - Playwright parity spec passed (`2 tests`)
	- `Placement currently incomplete: Back stake, Back odds, Lay odds 1, Settles. Save remains blocked until these are filled.`
- Deterministic tests extended for placement completeness helper and row-state classification.

### Multi-lay planner outcome-entry refinement (2026-07-06)

- Outcome-name inputs in multi-lay planner now enforce max length 10 characters (requested UX bound).
- Added scoreline suggestion chips (`1-0`, `1-1`, `1-2`, `2-1`) for quick outcome naming.
- Clicking a suggestion chip writes that value into the corresponding outcome-name field.

Validation:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (`44/44`).

### Placement state clarity polish (2026-07-06, closeout)

- Renamed secondary placement action in Odds and matching from `Mark Bet Placed` to `Back Bet Placed` for consistent wording with Bet setup.
- Added helper copy under lay placement actions clarifying sequencing:
	- back confirmation first
	- lay actions for matched execution state
- Added lay-status chip tone mapping in table:
	- `Not Laid` -> risk tone
	- `Partially Laid` -> warning tone
	- `Fully Laid` -> success tone

Smoke evidence:

- In editor, `Back Bet Placed` visible and legacy `Mark Bet Placed` no longer present.
- Placement helper text visible under lay placement actions.
- Table lay-status chip rendered with new tone class (example observed: `table-chip-lay-full`).

### Custom strategy slider (2026-07-07)

- When strategy is set to `Custom`, a **Custom lay slider** panel appears in the matching plan.
- Slider range defaults to `back_stake − 1` (min) and `back_stake + 1` (max).
- Min and Max fields are editable to any value; the slider updates its range immediately.
- Moving the slider updates `lay_actual` in real-time.
- Live feedback is calculated and displayed when back stake, back odds, and lay odds are filled:
	- Liability
	- If back wins P&L
	- If lay wins P&L
- A `Copy` button copies the current slider value to the clipboard.

Custom slider smoke evidence (2026-07-07):

- Slider visible: `true`
- Panel visible: `true`
- Liability at lay_actual `9.50`, lay_odds `3.1`: `19.95` (= 9.50 × 2.1 ✓)
- If back wins at back_stake `10`, back_odds `3.0`, liability `19.95`: `0.05` (= 20.00 − 19.95 ✓)

Validation:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (`44/44`).

### Sportsbook → Free Bets bridge (2026-07-07)

- For offer types that can award free bets (`Bet & Get`, `Sign up / Welcome`, `Reload`, `Refund`, `Cashback`), a `Create free bet from this row` button now appears in Bet setup when the sportsbook row is persisted.
- Clicking the button:
	1. Sets sportsbook row status to `Free Bet Awarded` and saves the row.
	2. Writes pre-fill data to `sessionStorage` (bookmaker, offer type, bet type, fixture type, event name, source bet ID).
	3. Navigates to the Free Bets module.
- The Free Bets module reads and clears the pre-fill on mount, then opens a new free-bet editor pre-populated from the sportsbook row.
- Default free-bet status after bridge: `Not Yet Awarded` (user adjusts as appropriate).
- If the sportsbook row has not been saved yet, a help text guides the user to save first.

Sportsbook → Free Bets bridge smoke evidence (2026-07-07):

- `Bet & Get` row: `Create free bet from this row` button visible: `true`.
- No console errors observed after page reload.

### Partial-lay edge rows entered (2026-07-06)

- `SB-E31D68D8` (`Demo Match A vs B`) summary confirmed: matched `28.40`, target `28.40`, remaining `0.00`, recommended `0.00`.
- `SB-99B50B8E` (`Demo Match C vs D`) summary confirmed: matched `30.20`, target `30.00`, remaining `-0.20`, recommended `0.00`.
- `SB-C6F457B3` (`Demo Match E vs F`) summary confirmed: matched `18.75`, target `18.75`, remaining `0.00`, recommended `0.00`.

### Re-smoke focus after patch

- Confirm basic qualifying bet create/save/edit flow with standard lay.
- Confirm Standard/Underlay/Overlay buttons correctly set strategy and lay actual.
- Confirm non-multi-lay rows no longer show extra outcome rows.
- Confirm `No exchange` is unavailable for non-mug-bet rows.
- Confirm newly created rows return user to table with the new row visible.

### Suggested GitHub issues to open

1. Sportsbook: Introduce pending-placed date-range filter mode and quick chip in table review bar
- Severity: Medium
- Why: Requested repeatedly in smoke notes, improves operational daily review.

2. Sportsbook: Add sortable column headers (bookmaker, settles, status, value)
- Severity: Medium
- Why: Needed for fast triage of upcoming settlements and exposure.

3. Sportsbook: Add visual row state highlighting (partially laid, prospecting, settling soon, inconsistent state)
- Severity: Medium
- Why: Reduces missed risk rows and aligns with workflow intent.

4. Sportsbook: Add placement workflow actions (Back placed, Lay fully placed, Lay partially placed)
- Severity: High
- Why: Core workflow gap for real-world incomplete/partial lay states.

5. Sportsbook: Add partial-lay follow-up reminder model and liability-recheck prompts
- Severity: High
- Why: Risk control requirement from smoke notes; prevents unlaid exposure.

6. Sportsbook: Clarify offer type vs bet type taxonomy and option set rationalization
- Severity: High
- Why: Current overlap is causing user confusion and inconsistent entry.

7. Sportsbook: Add match-rating (qualifying-loss %) pill and contract trace in calculator panel
- Severity: Medium
- Why: High-value decision signal for qualifying rows.

8. Sportsbook: Review and fix known special-offer bookmaker suggestion logic/content visibility
- Severity: Medium
- Why: Suggestion panel appears empty in observed cases.

9. Sportsbook -> Free Bets bridge: add conversion action for offer types that award free bets
- Severity: High
- Why: Important workbook workflow gap; should carry fields into free-bet row with defaults.

10. Sportsbook: Multi-lay planner UX redesign (outcome naming, lay odds entry, branch placement mapping)
- Severity: High
- Why: Current interaction does not fully support intended DDHH/advanced combos.

11. Sportsbook: Custom strategy slider (min/max editable, two-decimal sensitivity, live scenario updates)
- Severity: Medium
- Why: Strong UX requirement for controlled custom lay tuning.

### Re-smoke evidence (2026-07-06, focused parity-safe pass)

Execution route:

- `/profiles/profile-demo-001/tracker/sportsbook-bets`

Checks completed:

- [x] Ledger-level sportsbook quick-view strip is visible and populated.
- [x] Quick-view cards include: Open/overdue, Placed/prospecting, Underlays/no lay, Settling date set, Resolved value.
- [x] Placement action controls are present: Back placed, Lay fully placed, Lay partially placed.
- [x] Clicking Back placed updates status to `Placed` and keeps pending settlement path.
- [x] Clicking Lay partially placed updates strategy to `Partial Lay` and sets matched lay stake.
- [x] Special-offer panel now shows profile-context guidance when known bookmakers are missing/unavailable.
- [x] New row flow still defaults status to `Prospecting`.
- [x] New row flow still defaults exchange to `Smarkets` once bet setup unlocks odds/matching.

Observed messages captured:

- `Marked back leg as placed and kept settlement pending.`
- `Marked lay as partially placed (3.78 matched).`
- `No known bookmakers for this offer are linked on this profile yet.`

Residual risks / follow-up:

- Date-range pending/placed filter chip now implemented in sportsbook review modes; run focused UI smoke to capture screenshots/behaviour notes for this chip.
- Placement actions are currently UI-state driven; add deterministic workflow assertions around status/strategy/lay-matched transitions in tests.
- Reminder model and sportsbook-to-free-bet bridge remain deferred pending explicit contract + fixture alignment.

### Parity-safe tranche update (2026-07-06, table triage improvements)

Completed in this tranche:

- Added sortable table headers for Settles, Bookmaker, Status, and Value.
- Added row-state highlighting cues for partially laid, prospecting/not placed, settling scheduled/open, and inconsistent placed-or-settled rows missing lay status.

Validation:

- `pnpm lint:web` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm test:web` passed (25 tests).

### Parity-safe tranche update (2026-07-06, placed in range chip)

Completed in this tranche:

- Added sportsbook review mode chip: Placed in range.
- Chip uses profile tracker date settings (`active_date_preset`, custom range, back/forward offsets) via tracker settings API.
- Filter scope: rows with `status = Placed`, `result = Pending`, and settle date inside the resolved date window.

Validation:

- `pnpm lint:web` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm test:web` passed (25 tests).

### Deterministic coverage update (2026-07-06)

Added deterministic unit coverage for sportsbook workflow transitions and range filtering:

- New helper module: `apps/web/lib/sportsbook-table-workflow.ts`
	- `applyPlacementActionToState(...)`
	- `filterPlacedPendingRowsInDateRange(...)`
- New tests: `apps/web/lib/sportsbook-table-workflow.test.ts`
	- back placed transition
	- no-lay guard on lay placement actions
	- fully placed flow with inferred lay stake
	- partially placed flow with matched stake split and strategy switch
	- missing stake guidance path
	- settled read-only no-op path
	- placed+pending in-range filter/sort behaviour

Validation after coverage update:

- `pnpm lint:web` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm test:web` passed (32 tests).

### Deterministic coverage update (2026-07-06, sort/highlight tranche)

Extended helper-backed deterministic coverage for sportsbook table triage behavior:

- Shared helper module now includes:
	- sortable column guard
	- sort-state cycle logic (asc -> desc -> none)
	- sortable row ordering for settles/bookmaker/status/value
	- row-state class derivation (partial, prospecting, settling-soon, inconsistent)
- Component now consumes helper logic for both sorting and row-state highlight tags.

Validation after tranche:

- `pnpm lint:web` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm test:web` passed (36 tests).

### Workbook taxonomy alignment update (2026-07-06)

Closed the three immediate workbook taxonomy drift items identified in the parity gap register:

- sportsbook result options now include `Outcome 1 Won`
- cash-adjustment direction options now include `Correction`
- casino status options now include `Expired`, `Cancelled`, `Error`

Validation after alignment:

- `pnpm lint:web` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm test:web` passed (36 tests).

### Tracker settings parity expansion (2026-07-06)

Expanded profile tracker settings persistence and settings UI to include workbook-derived config keys:

- free-bet expiry alert window days
- global date-range toggle
- this-month mode
- default free-bet underlay factor
- default free-bet overlay factor
- default bonus retention percent

Validation after expansion:

- `pnpm lint:web && pnpm typecheck:web && pnpm test:web` passed.
- `pnpm lint:api && pnpm test:api` passed (58 API tests).

### Tracker settings consumption update (2026-07-06)

Implemented workbook-aligned use of `free_bet_expiry_alert_window_days` in summary logic:

- expiring free-bets list now uses settings-driven alert window cutoff
- deterministic tests added to verify default-window and custom-window behavior

Validation after consumption slice:

- `pnpm lint:web` passed.
- `pnpm typecheck:web` passed.
- `pnpm test:web` passed (37 tests).

### Sportsbook partial-lay workflow update (2026-07-06)

Implemented spreadsheet-style partial-lay workflow behavior in the sportsbook editor:

- renamed and retained setup action chip as `Back Bet Placed` with distinctive action color
- moved lay placement actions into Odds and matching / Matching plan
- added `Lay Fully Placed` and `Lay Placed but Partially Matched` controls
- added repeatable partial-lay legs with per-leg exchange, lay odds, and matched stake inputs
- matching plan now shows matched-total, target lay, and remaining-to-match guidance

Validation after tranche:

- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web test` passed (37 tests).

Live browser smoke (same route) verified:

- `Back Bet Placed` is present in Bet setup.
- `Lay Placed but Partially Matched` and `Lay Fully Placed` render in Matching plan.
- Adding a partial leg creates a leg row and updates matched/remaining summary values.
- Entering matched stake (example `2.50`) updates:
	- matched so far `2.50`
	- remaining `5.06`
	- recommended next lay stake `5.06`
- Clicking `Lay Fully Placed` adds a final leg prefilled with the remaining target stake.

Validation after leg-aware recommendation update:

- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web test` passed (40 tests).

Final-leg workflow hardening update (2026-07-06):

- `Lay Fully Placed` now prevents duplicate final-leg insertion.
- Final-leg exchange and lay-odds edits now sync back into the primary lay inputs.
- Added deterministic helper coverage for finalized-lay selection extraction.

Validation after final-leg hardening:

- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web test` passed (42 tests).

UI smoke note:

- Route navigation to tracker settings succeeds, but interactive browser smoke is currently constrained by existing local dev runtime issues (hydration mismatch + CORS errors when API endpoint is unavailable to the page origin in this session).

Runtime stability note (2026-07-06):

- Fixed Next.js recoverable hydration mismatch in `ProfileFlexibleNav` by gating overlay portal render until dock state is ready.
- Post-fix checks:
	- `pnpm --filter @openforge/web lint` passed.
	- `pnpm --filter @openforge/web typecheck` passed.
	- `pnpm --filter @openforge/web test` passed (42 tests).

### Workflow action clarity + close controls update (2026-07-07)

Implemented requested editor/action clarity updates across sportsbook, free-bets, casino-offers, and cash-adjustments:

- Sportsbook free-bet bridge action renamed to `Create Free Bet`.
- `Create Free Bet` remains clickable for settled rows (now rendered outside settled-lock fieldset).
- Added top-right `Close` action in all four editor panels:
	- sportsbook
	- free-bets
	- casino-offers
	- cash-adjustments
- Save/delete/revert action labels normalized to:
	- `Save`
	- `Delete`
	- `Revert`
- Save/delete/revert now use distinct visual chip styles from placement/bridge action chips.
- Removed duplicate `Back Bet Placed` from Odds and matching; action remains in Bet setup only.
- Added sportsbook row-highlight legend text in-page (left-edge colors + lay-status chip color meanings).

### High-value follow-up tranche (2026-07-07)

Continued with three high-value workflow items from smoke-note risk themes:

1. **Bridge explainability in-context**
	- Added explicit helper copy near `Create Free Bet` explaining copied fields and status update behavior.
2. **Row-state color clarity**
	- Added visible sportsbook legend for blue/green/amber/red edge semantics plus lay-status chip color mapping.
3. **Partial-lay risk reminder**
	- Added reminder messaging when lay exposure remains open (`remaining to match > 0`) and warning when matched lay exceeds target.

Validation after this tranche:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (44 tests).

Browser smoke evidence (2026-07-07):

- Sportsbook settled row selected:
	- `Edit settled row` visible.
	- `Create Free Bet` visible and enabled (`disabled = false`).
- Sportsbook action placement verified:
	- Bet setup actions: `Back Bet Placed` only.
	- Odds/matching actions: `Lay Placed but Partially Matched`, `Lay Fully Placed`.
- Editor action controls verified on all modules:
	- free-bets: `Close`, `Save`, `Delete`, `Revert`
	- casino-offers: `Close`, `Save`, `Delete`, `Revert`
	- cash-adjustments: `Close`, `Save`, `Delete`, `Revert`

### UX/accessibility refinement follow-up (2026-07-07)

Implemented targeted refinements from review feedback:

- Replaced pill-style legend row with a collapsed `Row Color Key` disclosure above the stat strip.
- Row color key now auto-collapses on scroll and click-away to reduce persistent visual clutter.
- Removed duplicate free-bet helper copy (status-like pill + repeated paragraph).
- Added tooltip-only helper for `Create Free Bet` with hover + keyboard focus behavior (`role="tooltip"`, `aria-describedby`, `title`).
- Corrected Match Rating display semantics to use percentage output from ratio source (`round(match_rating * 100)`) while preserving backend parity storage as ratio.
- Issue 47 closure hardening (2026-07-14):
  - deterministic sportsbook fixture now asserts the contract ratio (`0.9524` for `2.00 / 2.10`)
  - calculator pill now includes an explicit `Poor`, `Review`, `Good`, or `ARP risk` interpretation
  - incomplete live previews no longer fall back to a stale persisted Match Rating
  - focused Playwright covers live updates, incomplete-input hiding, accessible interpretation, and light/dark contrast

Validation after refinement:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (44 tests).

### Calculator surface parity + smoke follow-up (2026-07-07)

Implemented sportsbook calculator visual parity refinements:

- Unified general calculator surfaces so base calculator panel and suggested-lay/outcomes container share the same background treatment.
- Kept custom color treatment scoped only to the Back and Lay calculator segments.
- Increased Back/Lay segment differentiation so Lay no longer blends with base calculator background in light or dark mode.
- Updated palette menu close behavior to click-away + `Escape` only (removed scroll-close behavior).
- Removed lay-chip wording row from Row Color Key per UX request.

Smoke evidence (2026-07-07):

- Palette menu behavior:
	- open on button click: `true`
	- remains open after scroll: `true`
	- closes on `Escape`: `true`
	- closes on click-away: `true`
- Calculator layout behavior:
	- `Back bet` segment visible: `true`
	- `Lay / exchange` segment visible: `true`
	- Back action button present in Back segment: `Back Bet Placed`
	- Lay actions present in Lay segment: `Lay Placed but Partially Matched`, `Lay Fully Placed`
	- Lay action classes mapped to semantic actions: `review-chip-action-negative` / `review-chip-action-positive`

Validation after follow-up:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (46 tests).

### Editor action parity + affordance follow-up (2026-07-07)

Implemented additional UX/parity refinements requested during sportsbook smoke:

- Partial-lay legs panel now uses the Lay color-pair styling to keep exchange-side workflows visually grouped.
- Added stronger hover affordance for buttons (`review-chip`, `button-link`, `icon-button`) with:
	- clearer lift
	- stronger hover shadow
	- shimmer sweep animation
- Added bottom `Close` action to editor action rows (right-aligned) while retaining top `Close`, across:
	- sportsbook
	- free-bets
	- casino-offers
	- cash-adjustments

Parity/smoke coverage additions:

- Added Playwright coverage file:
	- `tests/e2e/editor-close-actions.spec.ts`
- Coverage verifies top and bottom close controls are visible while editing rows on all four tracker ledgers.

### Multi-lay + placement cleanup follow-up (2026-07-07)

Addressed additional sportsbook smoke follow-ups tied to multi-lay workflow clarity:

- Placement section (`Lay matched stake 1`) no longer appears for `Custom` strategy rows.
	- It now appears only when strategy is `Partial Lay` or multi-lay.
- Multi-lay `Outcome 1 name` now matches the same UX constraints as other outcomes:
	- max length 10 characters
	- input sanitization via shared label sanitizer
	- quick suggestion chips (`1-0`, `1-1`, `1-2`, `2-1`)

Validation after follow-up:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (46 tests).

### Cross-ledger stat-strip parity slice (2026-07-07)

Applied the next parity slice to bet-ledger editor overview cards so they follow the sportsbook semantic direction:

- Free Bets editor overview now uses consolidated cards:
	- Current value + status
	- Expiry + workflow guidance
	- Lay and matching (strategy + lay status)
	- Offer path (offer type + bookmaker/mode)
- Casino Offers summary now uses consolidated cards:
	- Value + status
	- Settles
	- Expiry + result/workflow guidance
	- Offer path (offer type + bookmaker/game)

Validation after parity slice:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (46 tests).

### Calculator-state parity + sportsbook summary smoke (2026-07-07)

Continued parity work with two focused slices:

- Free Bets calculator state chip labeling now uses `Calculated` when state is resolved (aligning with sportsbook wording updates).
- Free Bets calculator chips now use semantic tones:
	- calculated -> success tone
	- incomplete/review-required -> warning tone

Added targeted Playwright smoke coverage:

- `tests/e2e/sportsbook-header-and-settles-summary.spec.ts`
	- verifies sportsbook editor header title does not fall back to `SB-...` when offer text is available
	- verifies Settles card subtitle includes status + relative countdown format

### Free-bet calculator presentation parity slice (2026-07-07)

Aligned Free Bets calculator panel behavior/copy with sportsbook parity direction:

- Suggested lay now uses explicit best-value wording:
	- heading copy: `Best-value lay suggestion (...)`
	- direct strategy actions now use clickable Standard / Underlay / Overlay value buttons
- `Calculated` chip now appears only on Suggested lay when calculator state is resolved.
- Removed duplicate calculator-state chip from Projected PnL panel.
- Filtered out stale pending-row explainer note in calculator notes rendering.
- Free Bets `Offer alias` label normalized to `Offer` for cross-ledger terminology parity.

Added focused Playwright coverage:

- `tests/e2e/free-bet-calculator-parity.spec.ts`
	- verifies Suggested lay uses best-value wording
	- verifies `Apply best-value lay` action is present
	- verifies only one `Calculated` chip is shown and it stays on Suggested lay

### Sportsbook layout/logic correction tranche + cross-ledger stability fix (2026-07-07)

Implemented requested sportsbook corrections:

- Placement action gating:
	- `Back Bet Placed` disabled until Back stake and Back odds are entered.
	- Lay actions disabled until strategy, exchange, and lay odds are entered.
- Calculator heading cleanup:
	- removed duplicate top `Calculator` eyebrow label in the panel heading area.
- Suggested/Projected card semantics:
	- `Resolved` chip replaced with green `Calculated` chip in Suggested lay when calculator state is resolved.
	- removed `Resolved` chip from Projected outcomes.
	- removed duplicate `Resolved means ...` explanatory paragraphs.
	- removed `Pending row uses projected current value until settlement.` display note from surfaced calculator notes.
	- primary suggestion copy now reads `Best-value lay suggestion (...)`.
- Editor summary cards now combine and simplify:
	- Current value + Status
	- Settles + path (friendly datetime + settlement status)
	- Lay and matching (strategy + lay status)
	- Offer path (offer type + bookmaker/fixture)
- Editor header identity:
	- sportsbook row header now prefers offer name when available.
	- long titles truncate with ` ...` to avoid collisions with header actions.

Cross-ledger stability update (universal workflow pattern):

- Applied async-load/new-draft race fix to:
	- sportsbook
	- free-bets
	- casino-offers
	- cash-adjustments
- This prevents first-click `Add row` drafts from being closed by an in-flight initial `loadRows()` completion.

Validation:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (46 tests).
- Playwright sanity: `tests/e2e/editor-close-actions.spec.ts` passed (4/4).

### Sportsbook table semantics + modal filters pass (2026-07-10)

Applied the approved sportsbook-only table reshaping pass without touching the other ledgers yet:

- Table columns now read:
	- `Settles`
	- `Bookmaker`
	- `Event`
	- `Offer Name`
	- `Offer Details`
	- `Strategy`
	- `Lay Bet`
	- `Back Bet`
	- `Value`
	- `Status`
	- `Actions`
- `Offer Details` is now a combined pill column for `Offer Type`, `Fixture Type`, and `Bet Type`.
- `Lay Bet` and `Back Bet` are now distinct shorthand state columns:
	- `Lay Bet`: `Not Laid`, `Part Laid`, `Fully Laid`
	- `Back Bet`: `Not Placed`, `Back Bet Placed`
- `Status` now stays raw/stored and is colour-coded separately:
	- `Prospecting`
	- `Placed`
	- `Settled`
	- `Free Bet Awarded`
- Removed the sportsbook row-colour legend and the old issue drawer.
- Issue rows now use a left-strong gradient highlight across the full row:
	- warning issues -> amber gradient
	- urgent issues -> red gradient
- Normal sportsbook rows now keep a mild surface highlight so the table is easier to scan in both themes.
- Added a sportsbook-only filter/column modal behind the new filter icon button:
	- review mode
	- bookmaker
	- offer type
	- fixture type
	- bet type
	- strategy
	- lay bet status
	- back bet status
	- status
	- issue type
	- value min/max
- Added sportsbook-only hide/show toggles for:
	- `Offer Name`
	- `Offer Details`
	- `Strategy`
- Hidden columns do not break free-text search in this slice.

Explicitly deferred from this pass:

- saved filter presets
- profile-settings persistence for views/filters
- drag-to-reorder rows or columns
- rollout to Free Bets / Casino Offers / Cash Adjustments until sportsbook sign-off

Validation:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (51 tests).
- `pnpm exec playwright test tests/e2e/sportsbook-review-filter-select.spec.ts tests/e2e/sportsbook-lifecycle-table-chips.spec.ts tests/e2e/sportsbook-table-workflow-columns.spec.ts tests/e2e/sportsbook-actions-modal.spec.ts` passed (4/4).

### Cross-ledger table consistency pass (2026-07-10)

Rolled the sportsbook table-control model into the other tracker ledgers so the table shell is no longer sportsbook-only:

- Free Bets:
	- sportsbook-style filter button + active badge + clear affordance
	- sportsbook-style sortable headers on the common review columns
	- `Lay Bet`, `Back Bet`, `Status`, and `Actions` columns added
	- strategy/status/lay/back pill colours aligned with sportsbook semantics
	- free-bet specific filter controls added for bookmaker, offer type, fixture type, bet type, retention mode, strategy, lay bet, back bet, status, issue type, and value range
	- row issue overlays added for `Back Unplaced`, `No Settle Date`, and `Outcome Needed`
- Casino Offers:
	- sportsbook-style filter button + active badge + clear affordance
	- sportsbook-style sortable headers on the common review columns
	- action column added
	- status pill tones aligned to the sportsbook palette
	- casino-specific filter controls added for bookmaker, offer type, status, result, issue type, and value range
	- row issue overlays added for `Offer Unplaced`, `No Settle Date`, and `Outcome Needed`
- Cash Adjustments:
	- sportsbook-style filter button + active badge + clear affordance
	- sportsbook-style sortable headers on the common review columns
	- action column added
	- cash-adjustment specific filter controls added for direction, type, scope flags, calc state, issue type, and signed-value range
	- row issue overlays added for `No Account` and `No Scope`

Validation:

- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web test` passed (51 tests).

### Free-bet expiry review + taller offer-detail rows (2026-07-11)

Completed a focused free-bet review-table pass:

- Free Bets now shows a dedicated `Expiry` column in the table.
- Free-bet issue logic now includes expiry pressure bands for open rows:
	- `Expiry This Week` -> orange
	- `Expiry < 3d` -> yellow
	- `Expiry < 24h` -> red
- `Expiry Watch` was added to the free-bet issue filter options.
- Shared table chip-stack layout was revised so offer-detail pills can wrap into a centred two-row block within the cell.
- Shared table row padding was increased slightly so the wrapped offer-detail stacks have room and the ledgers read less cramped.

Validation:

- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web lint` passed.
- `pnpm exec playwright test tests/e2e/ledger-table-controls-parity.spec.ts` passed (3/3).

### Free-bet expiry/watch workflow alignment + award-state gating (2026-07-11)

Tightened the Free Bets workflow toward workbook parity:

- `Expiring soon` review mode now follows the same rule as the free-bet issue/expiry watch logic:
	- only pending placeholder-style rows (`Prospecting`, `Available`, `Not Yet Awarded`)
	- missing expiry rows sort ahead of upcoming-expiry rows
- `Not Yet Awarded` now keeps the free-bet calculator path locked even when offer setup fields are complete.
- The calculator unlocks again when the row is moved to `Available`, matching the intended “issued vs not yet issued” distinction.
- Calculator empty-state copy now reflects the award state instead of always saying `Complete offer setup first.`

Validation:

- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web lint` passed.
- `pnpm exec playwright test tests/e2e/free-bet-award-gating.spec.ts tests/e2e/ledger-table-controls-parity.spec.ts` passed (4/4).

### Sportsbook hover-issue + table legibility refinement pass (2026-07-10)

Refined the sportsbook table interaction without changing workflow or money logic:

- Issue rows now return to the intended two-stage behaviour:
	- default state: left-side amber/red rail only
	- hover/focus state: issue gradient expands across the row and the issue pills appear above the row content
- The issue pill overlay now uses a translucent blurred backing so the row content sits behind it more quietly during hover review.
- Table text behaviour was tightened for narrower embedded-browser widths:
	- headers stay on one line
	- text cells truncate instead of breaking awkwardly
	- pills truncate rather than spilling into wrapped multi-line stacks
- Search/filter controls were simplified:
	- removed the extra `All rows` / active-filter text
	- filter button now carries an active-count badge
	- active filters can be cleared from the same button group with the top-right `×`
- Strategy pills now use sportsbook-specific colours:
	- Underlay
	- Overlay
	- Standard
	- Custom
	- No Lay
	- Partial Lay
	- Multilay
	- Multilay-Underlay
- `Fully Laid` and `Back Bet Placed` were both moved onto the same light-green healthy-state palette as `Placed`.
- Settles values in the sportsbook table now use the more human-readable tracker format:
	- shorter range -> `Tuesday 14th 4:30 PM`
	- wider/fuller range -> `Tuesday 14th July 2026 4:30 PM`
- Row spacing was evened out with slightly larger and more consistent cell padding.
- Modal actions were normalised for this sportsbook slice:
	- top-right close control is now a red close icon button
	- primary modal action uses one shared primary button style

Still deferred after this pass:

- profile-persisted saved filter presets/views
- drag-to-reorder rows/columns
- rollout of the sportsbook table system into Free Bets / Casino Offers / Cash Adjustments after sportsbook sign-off

Validation:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (51 tests).
- `pnpm exec playwright test tests/e2e/sportsbook-review-filter-select.spec.ts tests/e2e/sportsbook-lifecycle-table-chips.spec.ts tests/e2e/sportsbook-table-workflow-columns.spec.ts tests/e2e/sportsbook-actions-modal.spec.ts` passed (4/4).

### Sportsbook full-row issue overlay + column resizing pass (2026-07-10)

Completed the next sportsbook-only table interaction pass:

- Issue overlay now spans across the sportsbook row rather than staying confined to the `Settles` cell.
- The overlay backing itself is now transparent; only the pills carry their own backgrounds.
- Removed the row/title-based issue tooltip path so hover review now relies on the visible overlay rather than browser tooltips.
- Background row content now blurs slightly while the issue overlay is active.
- Added sportsbook column resizing:
	- drag the resize handle on a column divider
	- double-click the resize handle to autosize that column to the widest visible content/header
- Reduced sportsbook page size from 10 to 8 rows for a larger per-row presentation.
- Action column now keeps a fixed-width slot so rows without the free-bet bridge action remain visually aligned.
- Dark-mode `Standard` strategy pill text contrast was lifted.

Validation:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed (51 tests).
- `pnpm exec playwright test tests/e2e/sportsbook-review-filter-select.spec.ts tests/e2e/sportsbook-lifecycle-table-chips.spec.ts tests/e2e/sportsbook-table-workflow-columns.spec.ts tests/e2e/sportsbook-actions-modal.spec.ts` passed (4/4).

### Casino-offer offer-type branching parity pass (2026-07-11)

Tightened the `Casino Offers` workflow so the form reflects the workbook campaign paths more clearly instead of behaving like one generic ledger form:

- `Date settling` now mirrors `Date started` in the editor while the settles field is still blank, matching the workbook default rule instead of only applying the default on save.
- The summary `Settles` card now surfaces that default explicitly as `(... defaults from start)` until the operator overrides it.
- Offer-type section headings are now more specific:
	- `Free Spins` -> `Free-spin campaign`
	- `Risk Free` -> `Qualifying and refund path`
	- `Free Play` -> `Free-play campaign`
	- `Free Spins` reward section -> `Spin and conversion`
- Section lock chips now explain why the next block is unavailable:
	- `Choose offer type`
	- `Prospecting row`
	- `Activate campaign first`
	- `Complete campaign values`
- Added focused browser coverage proving that:
	- `Date settling` mirrors `Date started`
	- `Cashback` shows cashback-specific inputs and hides reward fields
	- `Free Spins` shows reward conversion inputs and hides cashback-only inputs

Validation:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm exec playwright test tests/e2e/casino-offer-branching.spec.ts tests/e2e/ledger-summary-card-parity.spec.ts` passed.

### Sportsbook placement-action browser coverage pass (2026-07-11)

Added focused browser coverage for the sportsbook placement flow that already exists in the editor but previously relied mostly on unit coverage:

- Seeds a controlled sportsbook draft row with enough matching data to enable the placement actions.
- Opens that row in the sportsbook editor.
- Confirms `Back Bet Placed` moves the row into a placed state in-editor.
- Confirms `Lay Fully Placed` opens the partial-lay execution panel and creates the first execution leg.

This keeps the parity work on the workbook-led sportsbook lifecycle without widening the UI or changing any calculation logic.

Validation:

- `pnpm exec playwright test tests/e2e/sportsbook-placement-actions.spec.ts` passed.

### Sportsbook outcome-modal option branching coverage (2026-07-11)

Added browser coverage for the workbook-driven sportsbook outcome action so impossible outcomes do not leak into the wrong offer types:

- Seeded a `Cashback` row with `bonus_trigger = Lay Wins` and confirmed the outcome modal shows:
	- `Lay Won + Cashback`
	- no `Back Won + Cashback`
	- no DD/HH outcome branches
- Seeded a `Double Delight / Hat-trick Heaven` row and confirmed the outcome modal shows:
	- `Outcome 1 Won`
	- `Outcome 2 Won`
	- `Outcome 3 Won`
	- no cashback-only branch

This gives browser-level proof that the row action modal respects offer-type-specific workflow semantics rather than falling back to one flat result list.

Validation:

- `pnpm exec playwright test tests/e2e/sportsbook-outcome-option-branching.spec.ts` passed.

### Sportsbook -> Free Bets bridge race fix + end-to-end coverage (2026-07-11)

Closed a real cross-route workflow bug in the sportsbook-to-free-bet handoff:

- The sportsbook bridge already wrote a prefill payload and navigated to `Free Bets`, but the free-bet route could lose that payload during initial page load because the prefill open path raced the normal ledger bootstrap.
- The free-bet route now loads its base data first and then deterministically consumes sportsbook prefill, instead of relying on a timer-driven mount effect.
- This removes the route-load race and makes the cross-module handoff robust in development and smoke testing.

Added browser coverage for the full bridge path:

- seed an awardable sportsbook row
- open the `Copy to free bets` action modal
- change modal defaults (`Offer name`, `Free-bet value`, `Retention mode`)
- continue into `Free Bets`
- confirm the free-bet editor opens automatically with the bridged values
- confirm the source sportsbook row is promoted to `Free Bet Awarded`

Validation:

- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed.
- `pnpm exec playwright test tests/e2e/sportsbook-free-bet-bridge.spec.ts tests/e2e/free-bet-award-gating.spec.ts` passed.

### Shared bookmaker catalogue and ledger identity (2026-07-15)

Implemented issue #64 as a Fund Manager-owned authority shared by isolated profile trackers:

- Added an archive-first bookmaker catalogue with brand, operator, group, platform, risk-team,
  licence, domain, accessible colour, optional local logo, source, confidence, and verification
  metadata.
- Added a Fund Manager display default plus an optional per-profile override for `Name`,
  `Brand badge`, or `Logo` presentation.
- Linked Bookie account rows to catalogue identities while leaving profile-owned balance, status,
  channel, and account-health fields isolated.
- Added tolerant backfill and case-insensitive historical text matching so existing tracker rows do
  not require destructive migration.
- Applied one shared identity renderer to Accounts, Sportsbook Bets, Free Bets, and Casino Offers.
- Kept missing-logo and unmatched historical-name fallbacks explicit and readable.

Validation:

- `scripts/run-python.sh -m pytest apps/api/tests/test_bookmaker_catalogue.py apps/api/tests/test_accounts_workflow.py -q` passed: 5 tests.
- `pnpm lint:api` passed.
- `pnpm --filter @openforge/web lint` passed.
- `pnpm --filter @openforge/web typecheck` passed.
- `pnpm --filter @openforge/web test` passed: 76 tests.
- `pnpm playwright tests/e2e/bookmaker-brand-catalogue.spec.ts --reporter=line` passed,
  including sportsbook Name/Brand badge switching and Logo-mode badge fallback.
