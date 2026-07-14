# OpenForge End-to-End Smoke Test

_Test window anchor: week beginning Monday 6 July 2026_

## Purpose

Use this checklist to run a broad workbook-parity smoke test across the current
OpenForge tracker shell.

This is not a final sign-off script.

It is a practical review pass to confirm:

- core routes load
- profile switching works
- ledger workflows feel coherent
- workbook-first lifecycle states are understandable
- current/final value wording stays sensible
- cross-ledger flows do not break

## Current expectation level

This smoke test is suitable for:

- MVP shell review
- workflow review
- workbook-parity gap capture
- UI/UX friction logging

This smoke test is not yet a final parity sign-off for:

- all advanced sportsbook offer families
- final reporting parity
- import/export parity
- final UX/UI polish

## Recommended local data set

Use local-only seeded data shaped around the week beginning `Monday 6 July 2026`.

Recommended row mix:

- sportsbook rows:
  - prospecting qualifying bet
  - placed standard qualifying bet
  - placed underlay
  - no-lay / mug bet
  - DDHH row
  - multi-lay row
  - cashback/refund row
  - settled sportsbook row
- free bets:
  - `Not Yet Awarded`
  - `Available`
  - `Placed`
  - `Settled`
  - one missing expiry
  - one expiry within 24 hours
  - one expiry within 3 days
- casino offers:
  - prospecting
  - placed/in-progress
  - settled
- cash adjustments:
  - top-up
  - withdrawal
  - deduction
  - correction

Keep this data local-only if it is workbook-derived or close to live examples.

## Test session details

- Date tested: 13 July 2026
- Tester: Will
- Branch: feature/47-taxonomy-and-selectors
- Local web URL: http://localhost:3010/
- Local API URL:
- Profile used first: ALPHA-001
- Additional profiles tested: BRAVO-002
- Notes:

## Pre-flight

- [x] App loads at `/login`
- [x] Login route is usable
- [x] Profiles route loads
- [x] At least 2 profiles are available for isolation checks
- [x] Tracker opens from a selected profile
- [x] No blocking runtime error appears on first load

## Route shell review

### Login -> Profiles -> Tracker

- [x] `/login` loads
- [x] `/profiles` loads
- [x] `/profiles/:profileId` loads
- [x] `/profiles/:profileId/tracker` loads
- [x] Tracker defaults to a sensible first module
- [x] Tracker top navigation remains usable while scrolling
- [x] Dark mode and light mode both render correctly

Notes: 
- Dark mode/light mode: 
1. 'issue pill' overlay named 'No Expiry' has incorrect contrast for light mode. Text needs to be darking in light mode.
2. Issue pills need a gentle blurring effect to the text behind them to fully pass WCAG. This must NOT blur the full row, only the length of row that the issue pills are occupying.

## Profile isolation review

Use at least two profiles.

- [x] Profile A sportsbook rows do not appear in Profile B
- [x] Profile A free bets do not appear in Profile B
- [x] Profile A cash adjustments do not appear in Profile B
- [x] Profile-specific settings differ safely where expected
- [x] Switching profiles preserves route shell stability

Notes:

## Settings and authority review

Review `/profiles/:profileId/tracker/settings`.

- [ ] Bookmakers list is visible
- [ ] Exchanges list is visible
- [ ] Campaign tag / offer-name authorities are visible
- [ ] Exchange commission can be reviewed
- [ ] Tracker date settings are visible
- [ ] Free-bet underlay/overlay defaults are visible
- [ ] Changes to settings-owned selectors propagate into ledgers where expected

Notes:
- Stat Cards:
1. Change to stat cards for Active Preset, Mug Cadence, Expiry Alert, Bonus Retention %, Bookmaker and This-Month Mode.
- "Sportsbook and free-bet offer names": 
1. There are many similar named offer names, such as 'Bet 10 Get 5 In Play 1783849883944' and 'Bet 10 Get 5 In Play 1783889301460' we need this list to not repeat, and allow the Fund Manager to add to this list if he/she adds them to a Sportsbook row (and that row is not deleted). This is the same for "Casino offer names"
- Groups, Platforms and Bookmakers:
1. We need a single extensive table that has (like the workbook and similar to accounts) the Bookmaker, the linked platform and linked group and linked Riskteam (cannot mix and match, this needs to be set definitely here in Settings). You can provide me with a prompt to give to an internet-able LLM to generate this list and you can work from what is already available in the Workbook>Accounts, as this list is uptodate. But any missing values in Group,	Platform,	RiskTeam will need to be filled
2. Deferred bookmaker-authority design for approval: replace independent bookmaker, group, and platform lists with a shared bookmaker brand catalogue. A catalogue entry should link the brand name and short display name to its legal operator, operator group, platform, risk-team/risk-cluster knowledge, licence reference/status, canonical domain, display theme, and optional approved local logo asset. Profile-owned accounts must reference this catalogue while retaining profile-specific status, balance, channel, and account-health data.
3. Public regulatory data may seed legal operator, trading-name, domain, licence-reference, and licence-status fields. Platform and risk-team relationships are not authoritative regulatory fields and must be Fund Manager-maintained, carry a source/confidence/last-verified marker, and never be silently inferred.
4. Recommended first-release ledger identity is an accessible themed text badge, for example a short bookmaker name with a controlled foreground/background pair. This avoids scraping, hotlinking, and logo licensing risks while reducing table noise. Approved local logo assets can be added later with a text fallback and accessible name.
5. Add a Fund Manager display preference for bookmaker identity: `Name`, `Brand badge`, or `Logo` when an approved logo exists. The fallback order should be logo -> themed badge -> text. Whether this preference is Fund Manager-global or profile-overridable remains an explicit product decision before schema work.
- General UX/UI of this page:
1. needs refactoring and reorganising, long lists need to be collapsable and also need to be searchable. We will need a modal for editing items from any table much like how we intend to implement modals for editing in all other ledgers.
2. "Add value" can be a smaller action button and should open a modal that asks for relivant details.
3. It would be better for each section to contain buttons for 'Add value, search and view' and the rest is done/presented in a pop up modal that asks or shows information, then can be 'saved or closed'

## Sportsbook Bets

Route:

- `/profiles/:profileId/tracker/sportsbook-bets`

### Table review

- [x] Table loads first
- [x] Search works
- [x] Filter control opens
- [x] Hidden/visible column controls behave sensibly
- [x] Row action buttons do not accidentally open the editor
- [x] Clicking a row opens the editor
- [x] Double-clicking a row collapses the ledger and focuses the editor
- [x] Status, lay-bet, back-bet, value, and actions columns are easy to inspect

### Standard qualifying bet

- [x] Create a new prospecting sportsbook row
- [x] Offer setup fields feel coherent
- [x] Matching plan/calculator can be completed
- [x] Suggested lay is understandable
- [x] Save returns the user to the ledger
- [x] Row appears with coherent status and value

### Sportsbook advanced flows

- [x] Underlay row behaves sensibly
- [x] No-lay row behaves sensibly
- [x] DDHH row shows understandable result branches
- [x] Multi-lay row allows branch naming and branch placement clearly
- [ ] Cashback/refund row shows conservative current value and clear settlement behaviour

### Sportsbook -> Free Bets bridge

- [ ] `Copy to free bets` action opens modal
- [ ] Award timing can be set to settlement or placement
- [ ] Settlement-awarded path leaves sportsbook row unchanged
- [ ] Placement-awarded path promotes sportsbook row to `Free Bet Awarded`
- [ ] Free-bet editor opens with the expected prefill

Notes:
- Filters:
1. setting a VIEW does not show a 'red notification' on the filter button like it should
2. Moving to and from different modules should not clear the filters. User should be able to set different filters per module. 
3. Changing filters from default should always set the filters button to having a red 'notification' depending on how many are changeed if more than 9, set the icon to "9+"
4. Allow for the user to create custom filters to set what they want and what they dont want. At present, its just a drop down so I can't set, for example, in free bets that I want to NOT see "Status=Settled,Void" but also see "Status=Prospecting,Placed". We need this filter to be more advanced, maybe making the drop down options each a toggle?
1. Saving an action (like marking a bet as settled) closes the action modal and immediately opens the Edit Sportsbook row on the saved settled row. This is incorrect, it should return the user to the able on their previous view, much like if they were to 'close' the modal and do nothing with it.
 - Post-saving a new sportsbook bet: "Save returns the user to the ledger" 
 1. I had to refresh the browser as it was showing 0 bets in range, whereas there was 1 bet in range after i refreshed. [EDIT] I think its because the previous bet ID gets copied into the Search? i found Bet ID SB-10B751CE in there, which was my last placed sportsbook row after i saved within the editor. It did not do it again for the same bet after i reopenned and saved again.
 - Stat Cards:
 1. Despite the range being set to "Mon 13th to Sun 19th" the stat cards show all that are open/overdue, placed/prospecting, underlays/nolay and settling date set and resolved value. These stat cards SHOULD RESPECT the date range as well as the Dashboard, which should respect the chosen range BUT ALSO be able to toggle through different ranges. REPORTS should be configurable to show weekly, monthly and yearly stats.
 - Lay types:
 1. If i'm doing a single Underlay, Overlay or Custom lay (or for Cashback offers), i should not see the 'partial lay legs' unless I choose 'Lay placed But partially matched'. in these examples, i'm clicking the suggested lay, then clicking Lay Fully Placed.
 2. Multilay/Multilay underlay, Outcome input field needs to let the user enter more text
 3. Instead of having an option for Multilay-underlay, can we just have the calculator have a toggle for 'Underlay' in Multilay which makes the same adjustments? Maybe a toggle under the Multilay Planner
 - Cashback:
 1. Disable Copy to free bets for Cashback offers (these are cash rewards, not free bets)
 2. Prevent multi-lay's "Partial lay" from showing automatically (like above) when user clicks Fully Laid for Cashback bets
 - Copy to free bets:
 1. Modal should not redirect user to Free Bets module and within the edit mode of the bet they copied. it should simply show a toast and keep them where they are and change the original SPortsbook bet status to "Free Bet Awarded".

## Free Bets

Route:

- `/profiles/:profileId/tracker/free-bets`

### Table review

- [x] Free-bet ledger loads with the same general interaction model as sportsbook
- [x] Expiry column is visible
- [x] Expiry Watch summary card values make sense
- [x] Missing expiry and upcoming expiry are understandable
- [x] Issue highlighting only applies where free-bet expiry is genuinely relevant

### Free-bet lifecycle review

- [ ] `Not Yet Awarded` row locks the conversion calculator appropriately
- [ ] `Available` row can be planned
- [ ] `Placed` row shows current value/final value sensibly
- [ ] `Settled` row is locked until explicit edit is enabled
- [ ] Saving a new or edited row returns to the ledger

### Free-bet calculator review

- [ ] Standard conversion looks coherent
- [ ] Underlay and overlay suggestions reflect profile defaults
- [ ] No-lay wording avoids lay-win terminology
- [ ] Outcome modal status/result interactions feel coherent

Notes:
- Stat cards: 
1. as mentioned above, same issues here. Stat cards are not respecting the date range set universally.

## Casino Offers

Route:

- `/profiles/:profileId/tracker/casino-offers`

- [ ] Ledger opens with the same broad shell behaviour as sportsbook/free bets
- [ ] Create/edit flow is coherent
- [ ] Status progression is understandable
- [ ] Outcome modal works where applicable
- [ ] Value wording is sensible for prospecting vs settled rows

Notes:

## Cash Adjustments

Route:

- `/profiles/:profileId/tracker/cash-adjustments`

- [ ] Ledger opens with the same broad shell behaviour as other ledgers
- [ ] Create/edit flow is coherent
- [ ] Adjustment direction and type combinations make sense
- [ ] Saved rows return to the ledger
- [ ] Values look sensible in the ledger

Notes:

## Accounts

Route:

- `/profiles/:profileId/tracker/accounts`

- [ ] Accounts route loads
- [ ] Account data is profile-scoped
- [ ] Account authorities and statuses feel coherent
- [ ] No unsafe credential fields are present

Notes:

## Dashboard / Profit view

Routes:

- `/profiles/:profileId/tracker/dashboard`
- `/profiles/:profileId/tracker/profit-tracker`

- [ ] Dashboard loads
- [ ] Profit-related summaries feel profile-scoped
- [ ] Date-range-driven values look coherent
- [ ] Current-state and settled/reporting language is not misleading

Notes:

## Reports

Route:

- `/profiles/:profileId/tracker/reports`

- [ ] Reports route loads
- [ ] Date-range controls are understandable
- [ ] Weekly/monthly/range summaries appear stable
- [ ] No clearly wrong profile aggregation appears

Notes:

## Cross-module behaviour

- [ ] Unsaved changes guard only appears when there are actual edits
- [ ] Toast messages are useful and not noisy
- [ ] Editor close/reset behaviour is predictable
- [ ] Navigation between ledgers is stable
- [ ] Floating nav remains usable while scrolling

Notes:

## Visual and accessibility review

- [ ] Keyboard focus remains visible
- [ ] Controls are usable in dark mode
- [ ] Controls are usable in light mode
- [ ] Text contrast is acceptable
- [ ] Table content remains readable at normal testing width
- [ ] Date/time formatting is understandable in UK format

Notes:

## Known areas to watch closely

- sportsbook `Offer Type` / `Bet Type` / `Offer Name` semantics
- advanced sportsbook flows still under refinement
- multi-lay placement clarity
- reporting parity beyond shell level
- import/export still not ready for final parity review

## Defect capture template

- Area:
- Route:
- Row type:
- Steps:
- Actual:
- Expected:
- Severity:
- Workbook parity impact:

## End-of-pass summary

- Total areas reviewed:
- Core pass/fail:
- Top blockers:
1.
2.
3.

## Recommended next action after this smoke pass

- [ ] Fix workflow blockers before deeper UI polish
- [ ] Refresh sample-week data
- [ ] Expand sportsbook parity for advanced offer families
- [ ] Tighten reporting parity
- [ ] Open/update GitHub issues from findings

## Codex follow-up tranche 2026-07-13

Completed in this tranche:

- sportsbook quick-view stat cards now respect the resolved tracker date range rather than the full ledger
- free-bet quick-view stat cards and expiry-watch card now respect the resolved tracker date range
- sportsbook row-action outcome saves now return to the ledger table instead of reopening the editor
- free-bet and casino outcome-modal saves now also return to the ledger table for consistency
- sportsbook, free bets, casino offers, and cash adjustments now persist table `View` and filter selections per profile/module
- non-default `View` now counts as an active table control in sportsbook
- active table-control badge now caps at `9+`
- light-mode issue-pill contrast was strengthened for warning/expiry/info tones

Validation evidence:

- `pnpm --filter @openforge/web lint`
- `pnpm --filter @openforge/web typecheck`
- `pnpm --filter @openforge/web test`
- `pnpm playwright tests/e2e/sportsbook-outcome-modal-lifecycle.spec.ts tests/e2e/free-bet-outcome-modal-lifecycle.spec.ts tests/e2e/casino-outcome-modal-lifecycle.spec.ts tests/e2e/ledger-table-state-persistence.spec.ts`

New or updated regression coverage:

- `tests/e2e/ledger-table-state-persistence.spec.ts`
- `tests/e2e/sportsbook-outcome-modal-lifecycle.spec.ts`
- `tests/e2e/free-bet-outcome-modal-lifecycle.spec.ts`
- `tests/e2e/casino-outcome-modal-lifecycle.spec.ts`

Superseded by the follow-up tranche below:

- modal-based editor direction
- sportsbook/free-bet/casino/cash ledger date-range cards
- in-place sportsbook-to-free-bet creation
- cross-theme ledger-pill contrast

Still open after this tranche:

- settings UX refactor and authority-table consolidation
- multi-select/custom saved filter composition beyond the current persisted view/filter controls
- user smoke confirmation of free-bet, casino-offer, and cash-adjustment lifecycle flows
- deeper report-period presentation controls; formal reporting remains deliberately separate from the dashboard range

## Codex follow-up tranche 2026-07-14

Completed in this tranche:

- all four principal ledger editors now open in a shared wide modal shell:
  - sportsbook bets
  - free bets
  - casino offers
  - cash adjustments
- sportsbook `Copy to free bets` now creates the free-bet row in place and keeps the operator on sportsbook
- settlement-awarded sportsbook rows remain unchanged; placement-awarded rows promote to `Free Bet Awarded`
- casino-offer and cash-adjustment quick-view cards now use the same resolved tracker range as sportsbook and free bets
- dashboard open-position, overdue, part-laid, and liability metrics now use the resolved dashboard range
- dashboard/report open and overdue watchlists now use the resolved dashboard range
- account cash snapshot remains a current-state metric rather than being incorrectly date-filtered
- formal weekly/monthly/yearly reports remain period-based and independent of the dashboard range, matching the approved reporting boundary
- dashboard expiry alerts now exclude placed and settled free bets and only include pending pre-placement states
- issue-pill blur is limited to the occupied issue-pill strip rather than the full row
- all ledger issue, lifecycle, and strategy pills now use explicit light/dark colour pairs with automated WCAG AA text-contrast checks

Validation evidence:

- `pnpm --filter @openforge/web lint`
- `pnpm --filter @openforge/web typecheck`
- `pnpm --filter @openforge/web test` (`63 passed`)
- `pnpm playwright tests/e2e/ledger-theme-contrast.spec.ts --workers=1` (`1 passed`)
- focused serial Playwright tranche covering all four editor modals, ledger summaries, persisted table state, outcome lifecycles, and sportsbook/free-bet bridge (`13 passed`)

New or expanded regression coverage:

- `apps/web/lib/tracker-summary.test.ts`
- `tests/e2e/ledger-editor-modal-parity.spec.ts`
- `tests/e2e/ledger-theme-contrast.spec.ts`
- `tests/e2e/ledger-table-state-persistence.spec.ts`
- `tests/e2e/sportsbook-free-bet-bridge.spec.ts`

Issue 47 closure evidence:

- sportsbook Match Rating is sourced from the approved `back_odds / lay_odds_1` contract output
- the deterministic standard qualifying fixture asserts `0.9524` for back odds `2.00` and lay odds `2.10`
- the calculator pill presents the ratio as a percentage with an explicit interpretation: `Poor`, `Review`, `Good`, or `ARP risk`
- the pill updates as calculator odds change and disappears when required lay-odds input becomes incomplete
- focused browser coverage verifies live update, accessible interpretation, and incomplete-input behaviour
- all Match Rating colour tiers are included in the light/dark WCAG AA contrast test

Recommended user smoke continuation:

1. Resume at `Free-bet lifecycle review`.
2. Check each ledger editor opens at a useful width and closes back to the unchanged table view.
3. Change the tracker range and compare ledger cards with Dashboard open positions, overdue count, and liability.
4. Check warning/info pills in both themes, especially `No Expiry`, `Not Laid`, `Part Laid`, and lifecycle states.
5. Re-test sportsbook `Copy to free bets` for both settlement and placement award timing.

## Codex regression close-out tranche 2026-07-14

Completed in this tranche:

- Free Bet calculator parity coverage now creates and removes its own synthetic row instead of depending on whichever shared ledger row happens to sort first
- calculator assertions now verify the contract-backed Standard, Underlay, and Overlay suggestions without coupling the UI test to unrelated profile commission configuration
- Free Bet, Casino Offer, and Cash Adjustment shell tests now reflect the approved modal editor contract rather than the retired inline/double-click-collapse workflow
- create and edit modal tests verify that closing returns to the visible ledger and that opening an existing row without editing it does not mutate its displayed data
- the sportsbook editor's nested `Create Free Bet` bridge now renders above the editor modal and remains fully interactive
- filter and taxonomy browser tests now isolate persisted controls and close modal workflows explicitly, preventing execution-order failures

Validation evidence:

- focused Free Bet, Casino Offer, Cash Adjustment, and sportsbook-to-free-bet lifecycle group (`9 passed`)
- settings propagation, tracker defaults, summary-card parity, and ledger modal-shell group (`11 passed`)
- ledger modal create/edit transition regression (`6 passed`)
- complete serial Playwright suite (`56 passed`, `1 intentionally skipped`)
- `pnpm --filter @openforge/web lint` (passed)
- `pnpm --filter @openforge/web typecheck` (passed; non-blocking stale browser-mapping metadata warning)
- `pnpm --filter @openforge/web test` (`63 passed`)

Handover status:

- no financial formula or application behaviour changed in this close-out tranche
- issue #10 product blockers identified in the July smoke notes have automated regression coverage where deterministic browser validation is practical
- user confirmation is still required for the unchecked Free Bet, Casino Offer, Cash Adjustment, Accounts, Dashboard, Reports, and cross-module checklist items
- the Settings authority-table and page-organisation refactor remains a separate, larger product tranche and should not be hidden inside issue #10 test maintenance
- the only skipped Playwright path is the original scaffold-only login/profile placeholder test; current login and profile routes remain part of the manual checklist until that placeholder is replaced with a real route-flow test

### Visual smoke correction: issue strips and editor sections

- issue pills now use an unconstrained row overlay rather than inheriting the first column width
- the overlay itself has no visible tint or shadow; a near-transparent backdrop layer applies blur only behind the combined pill width
- issue pills remain side by side and highest-severity issues sort first
- the row accent continues to use the highest issue severity while lower-severity pills remain visible in the same strip
- Sportsbook, Free Bet, Casino Offer, and Cash Adjustment editor sections now use the same accessible collapsible section component
- required sections gain a red heading, red outline, and gentle pulse after validation identifies missing or invalid required data
- the validation pulse is disabled when the operating system requests reduced motion
- section titles remain left aligned while the requested Material `collapse_content` / `expand_content` control remains right aligned
- the editor loads the official Material Symbols Outlined font and applies its ligature/font-feature CSS explicitly, preventing the icon names from rendering as visible control text
- section content remains mounted during the open/close transition so both directions animate smoothly rather than snapping shut
- Sportsbook `Odds and matching` now remains visibly invalid while collapsed whenever Bet setup has unlocked the calculator but required calculator inputs are still missing

Focused validation:

- issue-priority unit regression (`1 passed`)
- editor section collapse and invalid-state coverage across all four ledgers (`4 passed`)
- right-aligned Material icon, smooth-transition, and collapsed sportsbook calculator validation coverage (`5 passed` total in the shared editor-section specification)
- editor modal and close-action regression (`8 passed`)
- sportsbook issue overlay geometry and lifecycle-chip regression (`1 passed`)
- complete serial Playwright regression after the shared editor refactor (`60 passed`, `1 intentionally skipped`)

Visual confirmation requested:

1. Hover a row with two or more issues and confirm every pill is fully visible across later columns.
2. Confirm the strip has no dark panel/drop shadow and only the text directly beneath the pill strip is blurred.
3. Trigger a save with required fields missing, collapse the red section, and confirm its header and outline remain clearly actionable in both themes.

### Toast notification consistency

- ledger notifications now render above standard and nested modal backdrops, so modal blur cannot obscure them
- the shared toast classifies messages as information, success, warning, or error and applies matching light/dark styling and announcement urgency
- every toast provides a keyboard-accessible dismiss action while retaining a five-second timed dismissal
- repeated create, open, update, delete, reset, and validation wording is standardised across Sportsbook Bets, Free Bets, Casino Offers, Cash Adjustments, Accounts, and the sportsbook fallback shell
- redundant editor-closed notifications were removed; workflow-specific calculator, placement, and bridge messages remain detailed where the operator needs confirmation

Focused validation:

- toast tone classifier (`8 passed`)
- toast modal-layer, dismiss-action, and validation-state browser regression (`1 passed`)
- toast light/dark WCAG AA contrast regression (`1 passed`)

### Platform route readiness evidence

- Accounts now protects a newly opened draft from the initial asynchronous row-load race, matching the first-click safeguard already used by the operational ledgers
- browser coverage verifies an existing Profile A account ID is visible only in Profile A and absent from Profile B
- the account editor is checked for prohibited password, card-number, bank-login, and MFA-secret fields
- Settings browser coverage verifies tracker date controls, bookmaker/exchange authorities, sportsbook/free-bet and casino offer-name authorities, exchange commission, and underlay/overlay defaults are present
- Dashboard coverage verifies the resolved-range P&L, open-current versus settled-final separation, and current cash snapshot
- Reports coverage verifies formal weekly, monthly, and yearly outputs remain visibly distinct from selected-range reporting
- automated evidence does not replace the unchecked visual/manual review boxes above

Focused validation:

- Accounts profile isolation and sensitive-field browser regression (`1 passed`)
- Settings authority readiness browser regression (`1 passed`)
- Dashboard and Reports boundary browser regression (`1 passed`)

### Remaining operational lifecycle evidence

- Free Bet award gating, calculator suggestions, outcome lifecycle, save-return behaviour, settled-row lock, and modal create/edit behaviour pass as one consolidated lifecycle gate
- Casino offer-type branching, settle-date mirroring, outcome lifecycle, and modal create/edit behaviour pass in the same gate
- Cash Adjustment direction/type selectors prevent incompatible combinations before save
- a synthetic `Out / Withdrawal / £10.00` browser transaction resolves to `-£10.00`, returns to the unchanged ledger view after save, and is deleted after verification
- no calculation formula changed in this tranche; the Cash Adjustment test exercises the existing contract-backed signed-value behaviour

Focused validation:

- consolidated Free Bet, Casino Offer, and shared ledger lifecycle group (`13 passed`)
- Cash Adjustment direction, signed-value, save-return, and cleanup regression (`1 passed`)
- complete serial browser regression after all issue #10 smoke corrections (`67 passed`, `1 intentionally skipped` scaffold login test)

### Final shell and interaction readiness tranche

- replaced the obsolete skipped scaffold test with a real keyboard-accessible
  `Login -> Profiles -> selected Profile Tracker` route test
- the shell test discovers the selected profile from the rendered roster, verifies the
  tracker redirect to Sportsbook Bets, and confirms browser-history return to Profiles
- added direct regression evidence that opening an existing ledger editor without making
  changes does not raise an unsaved-change warning during route navigation
- added the paired dirty-draft case: an actual edit raises the warning, cancellation keeps
  the operator on the sportsbook route, and the edited modal remains open
- added a computed focus-style check for the ledger filter control and an operable
  light/dark theme-toggle check
- sportsbook settlement cells now have browser assertions for human-readable weekday
  presentation and against raw ISO date leakage

Focused validation:

- Login -> Profiles -> Tracker shell (`1 passed`)
- unchanged-versus-dirty navigation guard and focus/theme readiness (`2 passed`)
- sportsbook UK date presentation and workflow columns (`1 passed`)
- complete serial Playwright regression (`70 passed`; no skipped tests)
- `pnpm --filter @openforge/web lint` (passed)
- `pnpm --filter @openforge/web typecheck` (passed; non-blocking stale browser-mapping metadata warning)
- `pnpm --filter @openforge/web test` (`72 passed`)
