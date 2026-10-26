# Plum Duff UI Change Register

## Owner regression batch — 2026-10-12

| ID / issue | Surface and requested correction | Signed-off equivalent | Status |
| --- | --- | --- | --- |
| PD-FIX-304 / #105 | Profiles and Profile Operations: distinguish an empty betting range from malformed/unavailable P&L | Existing FinancialReadValue readiness and selected-range contract | COMPLETE |
| PD-FIX-305 / #116 | Account cash warning: optional pending values, governed cash membership, unique Profile/Account presentation and bounded correction links | Accounts contract, AccountMoneyStatus and shared pagination | COMPLETE |
| PD-FIX-306 / #76 | Summary Dashboard versus Profile Operations naming, page titles and accessible navigation | Existing shell/profile command menu | COMPLETE |
| PD-FIX-307 / #92 | Profile summary loading indicator must retain Material geometry and avoid the broken spinning line | Existing Material progress_activity treatment | COMPLETE |
| PD-FIX-308 / #76 | Profile/recent-Profile switching preserves the supported Profile sub-route without carrying record identity | Existing tracker route authority and navigation guard | COMPLETE |
| PD-FIX-309 / #111 | Selected Range Performance: remove synthetic future-expiry trend point, stabilise sizing and prevent hover replay flicker | Existing ReportPointChart and governed reporting dates | COMPLETE |
| PD-FIX-310 / #94 | Headless Last-month working-workbook check with exactly two owner-authorised synthetic Sportsbook seed rows | Existing protected synthetic Profile, Sportsbook authority and working-workbook export | COMPLETE |

This is one bounded batch. Reports redesign, workbook acceptance beyond the named export smoke, hosted work and unrelated features remain outside scope.

Verified 2026-10-12: the directory uses its visible Fund Manager range rather than each Profile's
saved all-time range; optional blank pending withdrawals and archived legacy Accounts no longer
create false cash warnings; four genuinely unknown Profile/Account balances remain as unique
correction links. Open Free Bet expiry
dates no longer become historical trend dates, and chart hover no longer replays the whole value
card. `BACKUP-0B3F7F2E` precedes the two authorised ALPHA-001 rows. The headless Last Month workbook
contains both as `IT1-QB-0009` and `IT1-QB-0010`; their retained PD identities are
`OWNER-SMOKE-SB-202609-A` and `OWNER-SMOKE-SB-202609-B`.

## CP-049 Daily tasks — 2026-09-25 16:55 BST

FUND-MANAGER-TASK-DECK-001 / #86: COMPLETE first current-evidence slice at09ef37e local/Preview. Reused Notification History cards/toolbar, Account editor and authenticated shell. Profile filtering, current-source routing/recheck, stale-response exclusion, durable clear/retry/History, compact/enlarged themes, keyboard/reduced motion and internal geometry pass. Seven actual workflows plus six fixture-backed notification checks per environment; no money animation/schema changes. Deferred route checks release the existing shell lock until valid navigation begins. Broader routines/dispositions/recurrence, normal-owner browser and VoiceOver remain explicit. [Evidence](../../docs/audits/platform-quality-audit.md#cp-049-private-import-rehearsal-and-daily-tasks--2026-09-25-1655-bst).

## CP-048 remaining reference forms — 2026-09-25 15:26 BST

| ID / issue | Actual screen and demonstrated repair | Existing equivalent / final state |
| --- | --- | --- |
| PD-FIX-302 / #92 | Account Catalogue Add/Edit Account: Tab escaped, edit field hid under footer at 200%, Back retained modal state | CP-046 shared focus/body-lock and native external form footer; COMPLETE local/Preview `a3afdfc` |
| PD-FIX-303 / #92 | Common Bet Combos Add/Edit Combo: rejected fetch stranded Saving; pending dialog could close | CP-046 draft/error/pending guard and existing focus lifecycle; COMPLETE local/Preview `a3afdfc` |

Two focused form journeys plus8 isolated/8 hosted combined workflows pass. Shared-reference browser writes intercepted;25 disposable API tests prove real persistence/validation. Create/edit, native validation,503/network retry, pending close,Save/Cancel/reopen, trigger focus,Tab, light/dark 1440/390/760 at 200%, internal clipping and reduced motion verified. No remaining implementation or engineering verification in this named batch. Broader owner acceptance, normal-owner browser and VoiceOver remain separate; #105 remains engineering-complete. [Evidence](../../docs/audits/platform-quality-audit.md#cp-048-personal-readiness-and-reference-forms--2026-09-25-1526-bst).

## CP-047 feature workflow containment — 2026-09-25 14:11 BST

| ID / issue | Actual screen and repair | Existing equivalent / final state |
| --- | --- | --- |
| PD-FIX-300 / #92 | Enlarged Multi-Lay/ledger editor: keep a whole focused field above the footer | Existing CP-046 modal scroll boundary and fallback; COMPLETE locally/Preview. Focused input/footer geometry, Notes/Reports and accepted calculator paths pass |
| PD-FIX-301 / #85 / #92 | Account review must not submit/close its parent bet or overflow its compact grid | Existing Account summary, FinancialValue and ModalBoundary; event containment and shared minmax column. COMPLETE locally/Preview: zero parent writes, retained draft, failure/retry, Copy, Discard/Escape/focus, light/dark/compact/200%/reduced motion |

No new form or animation system. Seven isolated/seven hosted affected workflows pass. Named #92 Catalogue/Combo verification remains queued; #105 coverage remains engineering-complete. [Evidence](docs/audits/platform-quality-audit.md#cp-047-operational-multi-lay-and-account-observations--2026-09-25-1411-bst).

## CP-046 forms and Profile Defaults — 2026-09-25 11:38 BST

| ID / issue | Actual screen and repair | Existing equivalent / final state |
| --- | --- | --- |
| PD-FIX-297 / #92 | Tracker Lists Add/Edit Value: readable selection, adaptive dialog and recoverable saves | Existing Settings shell/fields/inline table; COMPLETE locally/Preview`9e7cbd2`; three isolated/hosted workflows; global browser mutations intercepted |
| PD-FIX-298 / #92 | Profile Accounts Create/Edit account: complete footer and reachable focused fields | Existing simple header/modal scroll boundary/native form; COMPLETE locally/Preview; Create/validation/Save/Revert/Discard/reopen/ownership pass; retired Choose Accounts untouched |
| PD-FIX-299 / #92 | Profile Settings → Defaults: six title/help units, readable Default exchange and safe failed saves | Existing calculator heading geometry/ContextHelp/confirmation; COMPLETE locally/Preview; immediate/explicit save, scope/reload/HTTP/network/touch/keyboard pass |

No implementation or engineering verification remains in this named batch. Broader owner acceptance remains separate; #105 named engineering coverage is unchanged. [Evidence](docs/audits/platform-quality-audit.md#cp-046-settings-forms-and-account-editor--2026-09-25-1138-bst).

## CP-045 named financial coverage — 2026-09-25 09:51 BST

| ID / issue | Surface and bounded repair | Existing equivalent | State |
| --- | --- | --- | --- |
| PD-FIX-294 / #105 | Fee Position/Exposure nearest replay, truthful complete scope and required fee/liability outputs | CP-042 stat/replay groups, FinancialReadValue and required-money parser | COMPLETE — local/Preview`7dc975f`, isolated/hosted verified |
| PD-FIX-295 / #105 #92 | Profile header stale failure/clipping, directory/detail readiness, return to current Profiles tab | Existing summary event, header grid, Profile-owned FinancialReadValue and native tabs | COMPLETE — scope/Copy/replay/motion/geometry/keyboard verified |
| PD-FIX-296 / #105 #92 | Fee Review/Breakdown unknown/late states, stored-value independence, withdrawal replay and opener focus | Existing shared groups/parser and ModalBoundary close/focus semantics | COMPLETE —12 component and2 isolated/hosted browser checks |


## CP-044 Reports batch — 2026-09-24 19:46 BST

| ID / issue | Named group and requested outcome | Existing equivalent / exact scope | State |
| --- | --- | --- | --- |
| PD-FIX-292 / #105 | Reports header, module mix, Cash and formal period cards: shared nearest-card replay and legible accounting values | Existing FinancialValueReplayGroup/stat cards; 15 active money cards in TrackerSummaryShell, including its active Cash module/boundary cards. Do not enable the unreachable legacy Cash block | COMPLETE — app`0189434`; isolated/hosted rendered, readiness and replay checks pass |
| PD-FIX-293 / #105 | Truthful selected Profile/period and per-measure readiness, preserving known subtotals and independent costs/funding | CP-043 request ownership, existing summary contracts/FinancialReadValue; reproduce missing inputs and scope changes before the smallest display-boundary repair | COMPLETE — app`0189434`; isolated/hosted rendered, readiness and replay checks pass |


## CP-043 verified batch — 2026-09-24 16:00 BST

| ID / issue | Surface / request | Existing equivalent and exact scope | State |
| --- | --- | --- | --- |
| PD-FIX-290 / #105 #92 | Extra Places P&L, qualifying loss and weekly budget read-only summary | Existing FinancialReadValue/replay; preserve placed-at range, independent weekly budget, row meanings and table filters. Reproduce missing/failed values and large-value geometry | COMPLETE — app `3a7f0a3`; isolated/hosted readiness, values, replay and retained workflows pass |
| PD-FIX-291 / #105 | Single-Profile Dashboard financial cards and response ownership | PortfolioDashboardView already groups cards: verify unchanged replay. Reproduce missing/failed source, rapid Profile/date changes and partial-money handling in TrackerSummaryShell | COMPLETE — app `3a7f0a3`; isolated/hosted readiness, values, replay and retained workflows pass |


## CP-042 verified Preview/local batch — 2026-09-24 15:00 BST

| ID / issue | Surface and request | Reproduction target | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-288 / #92 | Extra Places toolbar and filter dialog: contained clear action, readable compact controls and keyboard focus | `.extra-place-toolbar-actions`, `[data-pd-id="extra-place.filter.dialog"]`: active-filter geometry and focus lifecycle | Accounts/Cash `.table-filter-button-wrap`; existing `useDialogFocusLifecycle` and modal actions | COMPLETE — app `cb4c1c4`; isolated and protected Preview geometry/focus/motion/readiness checks pass |
| PD-FIX-289 / #105 | All-profile headline cards: nearest-card replay and truthful Active-Profile readiness through archived-directory reads | `All-profile headline totals`: label replay, failed active source, unchanged archived refresh | CP-041 `FinancialReadValue`, existing `FinancialValueReplayGroup`; retain existing request scope | COMPLETE — app `cb4c1c4`; isolated and protected Preview geometry/focus/motion/readiness checks pass |


CP-041 PD-FIX-284–287 hosted gap closed: four actual Preview checks pass at `7763284`; retained local source/tests were not repeated.

## CP-041 verified local batch — 2026-09-24 13:52 BST

| ID / issue | Surface and supplied outcome | Observed defect / reference | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-284 / #92 | Profile directory controls: readable selected values, peer alignment, wrapping and keyboard access without changing active/archived scope | `.fund-manager-control-bar.is-directory`: 86px page overflow at 860px; 451px at 1440px/200%; explicit grid slots collapse Search at 390px | Existing M3 picker controls and container-aware calculator reflow; retain desktop layout | COMPLETE locally — app `7763284`, focused/combined browser PASS; Preview blocked |
| PD-FIX-285 / #105 | Account balances: truthful loading/error/zero, full accounting values and nearest-card replay; preserve observed balance meaning and explicit Notes Save/Discard | Held Account GET fabricated four zero values; no card replay groups; fixed-width cells clipped large text and 7.5rem outer badges | CP-039 readiness handling, existing FinancialValue/MotionReplayGroup/stat cards | COMPLETE locally — app `7763284`, focused/combined browser PASS; Preview blocked |
| PD-FIX-286 / #105 | Cash summaries: truthful selected-range readiness, signed governed values, replay and explicit correction/Notes workflow | Cash quick view shows three false-zero FinancialValues during held GET; no card replay groups; both rows and range settings own readiness | Same shared financial presentation plus current Cash type/range contracts | COMPLETE locally — app `7763284`, focused/combined browser PASS; Preview blocked |
| PD-FIX-287 / #92 | Account Catalogue search/filter/action peer alignment | At 1000px Search aligns 56px below selects when Add wraps; at 200% difference grows. Settled rendering confirms 56px offset at 1000px and 267px at 200% text | Existing Settings controls and accepted Notification History independent action-row composition | COMPLETE locally — app `7763284`, focused/combined browser PASS; Preview blocked |

Initial scope is three consumers: Profile directory, Profile Accounts and Cash Adjustments.
Catalogue was completed as the next bounded already-approved item after the initial slice. No equations, membership,
persistence, balances or eligibility change. The existing isolated runtime verified the source before local integration; owner sessions untouched.
Reproduction artifacts are private `cp041-before.*`; the first probe cleanup race is harness-only.


Final combined browser **12/12**, web **457/457**, types/build pass; both themes, 390–1440px, 200% text, keyboard, exact copy, motion intermediates/reduced/off, Account unknown and explicit Notes Save/Discard/reopen covered. Additional Catalogue fix completed after the initial three consumers. Shared Lists/Database/Quick Actions peer geometry also passes. Normal source is `7763284`; Preview remains `113d810` after automatic approval review rejected credential transmission. Broader issue/owner acceptance remains open.

## CP-039 active batch — 2026-09-24 11:35 BST

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-281 / #92 | Shared Sportsbook, Free Bet and Casino ledger toolbars | Keep search/filter/add controls compact and usable when the shared toolbar changes axis | Existing desktop ledger toolbar and CP-038 responsive Reports reflow | COMPLETE — shared compact basis reset; real 480px/960px defect repaired; keyboard, filters, action geometry and rendered themes/text sizes pass |
| PD-FIX-282 / #105 | The same three ledger P&L cards | Never present loading/failed data as zero; replay from the nearest semantic card using approved motion rules | Existing FinancialValue, MotionReplayGroup and stat-card geometry | COMPLETE — shared readiness/replay card; unchanged refresh retains node/cycle; text-relative grid contains large amounts at 200%. Eight unit cases and real isolated/Preview populated/empty/failure/motion/copy checks |
| PD-FIX-283 / #117 | Casino Advanced tab / first Notes edit | An existing supported Casino row must allow its first Notes edit without requiring pre-existing Notes or a calculation override | Existing Casino capability-defined Advanced tab and explicit Save/Discard | COMPLETE — settled Free Spins with blank Notes, no advanced calculation and valid final result now exposes the existing capability-defined Advanced tab; explicit Notes save preserves financial meaning |

No formula, report membership, persistence, authentication or calculator redesign is authorised by
this batch. CP-038 isolated/Preview browser and local health/data evidence remain valid; fresh
authenticated normal-owner browser interaction remains unexecuted and is not a delivery blocker.

Verified **2026-09-24 12:11 BST**, application `113d810`: web 453/453; combined affected browser
6/6 each in isolated SQLite and protected Preview; types/build pass. Same app integrated locally
after verified backup, with unchanged owner records. Wider issues/owner acceptance remain open.
[CP-039 evidence](../audits/platform-quality-audit.md#cp-039-ledger-toolbars-and-financial-display--2026-09-24-1211-bst).

## CP-038 active batch — 2026-09-24 10:23 BST

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-278 / #111 | Profile and combined Reports | Approved weekly period-P&L preset with exact formal-report record reconciliation and retained period/scope/point on return | Existing formal Reports period controls, shared Dashboard point inspection/drilldown and FinancialValue | COMPLETE — `516baf5`; independent weekly money/scope fixtures, full isolated/Preview workflow; integrated local source/health/data checks. Direct authenticated normal-owner browser recheck remains unexecuted |
| PD-FIX-279 / #92 | Shared formal Report headings/help at compact widths | Prevent desktop flex-basis becoming vertical whitespace; contain opened help within viewport | Existing shared formal-report heading, compact controls and ContextHelp | COMPLETE — actual 390px defects reproduced; shared reflow/containment repaired, geometry and rendered theme/text/keyboard/calculator regressions pass |
| PD-FIX-280 / #92 | Application brand subtitle | Remove the explicitly requested redundant “Tracker platform” subtitle without redesigning the header | Existing app-chrome wordmark/logo and responsive controls | COMPLETE — bounded copy removal; existing header controls/geometry verified in isolated and actual Preview browser |

Verified **2026-09-24 11:08 BST**: web 445/445, isolated affected browser 3/3, protected Preview 3/3,
types/lint/build pass. Same application integrated locally with owner records unchanged; direct
authenticated normal-owner browser check was not authorised and is not claimed. Broader #111/#92
remain open. [Evidence](../audits/platform-quality-audit.md#cp-038-period-pnl-preset-and-shared-report-geometry--2026-09-24-1108-bst).

## CP-037 verified batch — 2026-09-24 10:00 BST

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-276 / #111 | Dashboard point inspection | Hover exposes the same exact date/value and record details as keyboard/click without changing totals or requiring a click | Existing `DashboardChartSurface` selected-point detail, `FinancialValue` and drilldown | COMPLETE — failing deployed hover reproduction repaired by the shared pointer handler; final protected-Preview hover/keyboard/drilldown/return and unchanged persisted rows pass on `86ee412`, now also local |
| PD-FIX-277 / #111 | Betting P&L trend and drilldown scope | Cash funding must not appear as betting profit or an artificial later loss | Existing selected-range P&L contract §9.1 and four-ledger headline | COMPLETE — two before-failing deterministic fixtures and hosted cash-only/mixed workflows pass; only this chart/drilldown scope changed, separate Cash reports preserved |

PD-FIX-274–275: authenticated Preview interaction COMPLETE on `86ee412` using the existing synthetic
session function with normal expiry. Retain CP-036 isolated evidence and CP-035 owner Save/Discard
acceptance separately. Final affected hosted group 2/2; web 437/437, TypeScript and build pass.
Rendered geometry/focus/overflow/theme/motion evidence inspected; no new CSS variant. Details:
[CP-037](../audits/platform-quality-audit.md#cp-037-issue-led-settled-editor-and-chart-verification--2026-09-24-1000-bst).

## CP-036 settled-editor stability and disclosure visibility

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-274 | Settled ledger value presentation while editing Notes | Keep the confirmed settled Final Value mounted and unchanged throughout a Notes-only draft; no preview request or persistence occurs before explicit Save | Existing settled outcome panel, `FinancialValue`, and CP-035 explicit draft contract | COMPLETE — CP-037 closes the authenticated Preview gap: stable typing/pause value, zero automatic preview/write, Discard, explicit Save and independently persisted reopen pass |
| PD-FIX-275 | Shared editor disclosures inside bounded modal bodies | A deliberate expansion reveals the heading and first useful control by scrolling only the owning editor body; no repeat scroll during typing/render/restore | Shared `EditorSection`, canonical `.workflow-editor-body` scroll owner, and reduced-motion preference | COMPLETE — CP-037 authenticated pointer/keyboard, compact, enlarged-text, theme and reduced-motion checks pass; the background page and later manual scroll remain unchanged |

Issue coverage: GitHub #117 owns the settled-editor defects; #92 owns the shared disclosure rule.
CP-035 Save/Discard remains owner-confirmed and is not reopened.

## CP-035 explicit ledger Save / Discard contract

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-273 | Sportsbook, Free Bet, Extra Place, Casino and Cash Adjustment editors | Keep draft and confirmed saved state separate; no blur/wait/step/close persistence; shared Keep editing, Discard changes and Save and close decision; explicit Save/Revert only | Existing shared ledger modal shell, app confirmation controller and CP-034 action-scoped validation | COMPLETE IN PREVIEW AND LOCAL — owner reproduction and five-ledger browser matrix pass on `75042e5`; normal 3010 is healthy on `093f18b+dirty` with unchanged owner ledger projections |

Issue coverage: GitHub #117 remains open; #92 and #114 retain shared UI and acceptance evidence.

## CP-033 owner-blocking ledger edit repair

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-271 | Existing ledger record editing | Permit authorised Notes-only edits across supported lifecycle states without reselecting or revalidating unchanged financial/Account fields; retain drafts on failure and keep identity/financial meaning unchanged | Existing ledger editors, canonical Account identity and field-scoped mutation/history contracts | COMPLETE — Sportsbook, Free Bet, Extra Place, Casino and Cash Adjustment add/amend/clear pass on Preview at desktop/light and compact/dark; keyboard Save, reopen and persisted-value comparisons retain identity and money; normal 3010 now runs the same repair |
| PD-FIX-272 | Preview persistence startup | Prevent an ordinary cold request from competing with repeat table-changing schema setup after the approved migration marker exists | Fail-closed runtime/schema readiness and explicit migration boundary | COMPLETE — current schemas use a read-only marker check; 12 concurrent isolated-PostgreSQL connections and final hosted runs complete without deadlock |

Issue coverage: GitHub #117 owns the defect; #91, #36, #92 and #114 retain related ledger,
shared-UI and acceptance evidence. No duplicate issue created.

## CP-030 hosted Reports render correction

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-266 | Reports interaction lifecycle | Remove the React update-depth loop while preserving Profile/date filters, chart inspection, drilldown, financial totals and the accepted Reports presentation | Locally accepted #111 Reports interaction and financial-value contracts | COMPLETE — local 600-row regression passes; protected Preview direct Reports and £6→£5 History/Reports proof pass on `b9e58e7` |

Issue coverage: GitHub #114 existing hosted-verification scope; no duplicate issue created.

## CP-026 calculator visual-contract enforcement

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-263 | Calculator section headings | Keep every section help action inline with its visible heading through one shared heading primitive | Signed-off Standard reference-card heading geometry | COMPLETE — shared standalone/table/reference and embedded Sportsbook headings pass inline geometry and keyboard-help evidence |
| PD-FIX-264 | Multi-Lay section composition | Give Back Bet, Lay Outcomes, Result, disclosures and Outcomes one shared outer content grid | Signed-off calculator band/content geometry | COMPLETE — Back/Lay outer bounds match at desktop, half-width, narrow and 200% text without overflow |
| PD-FIX-265 | Calculator semantic surfaces | Apply the established bookmaker/back and exchange/lay accent tokens as a paired rule, with no one-off Multi-Lay border | Existing `calculator-segment-back` / `calculator-segment-lay` semantics | COMPLETE — paired semantic borders/backgrounds pass in light/dark; no formula or value changed |

Issue coverage: GitHub #35 and #92 (externally synced by ChatGPT). Google owner re-authentication
remains a separate #62 manual boundary; Hosted Preview remains paused.

## CP-025 local Google sign-in correction

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-261 | Normal-owner runtime / Google sign-in initiation | Resolve the explicit normal-owner environment source so the local API can initiate the configured Google flow without weakening candidate/test isolation | Role-bound runtime contract and founder Google OAuth setup | COMPLETE — normal-owner startup loads the classified owner environment and fails closed if authentication is incomplete; candidate/test inheritance regressions pass |
| PD-FIX-262 | Public authentication failure | Return every application-owned OAuth failure to the branded Plum Duff login shell with a safe retry action rather than raw API JSON | Existing public login error panel | COMPLETE — configuration, state, provider, exchange, identity and persistence failures redirect to branded safe messages; desktop/narrow and keyboard regression pass |

Issue coverage: GitHub #62 and #116 (externally synced by ChatGPT). Hosted Preview remains paused.

## CP-024 Multi-Lay visual consistency correction

| ID | Surface | Requested outcome | Signed-off equivalent | State |
| --- | --- | --- | --- | --- |
| PD-FIX-258 | Multi-Lay table sections | Give Lay outcomes and Outcomes one shared section geometry while retaining input/result tone | Shared calculator result-card heading and responsive Outcomes geometry | COMPLETE — both sections use `CalculatorTableSection`; rendered desktop/half/narrow and light/dark evidence passes |
| PD-FIX-259 | Multi-Lay odds guidance | Move the outcome limit to accessible help and show effective odds only when a modifier changes it, using canonical two-decimal display | `ContextHelp` and sportsbook decimal-odds formatting | COMPLETE — ordinary odds are not repeated; Profit Boost displays a semantic label/value at two decimals |
| PD-FIX-260 | Multi-Lay financial results | Present stake, liability and final position as aligned semantic values with canonical financial tones | `CopyableFinancialValue` and `FinancialValue` | COMPLETE — stake/liability remain neutral; final positions use positive/negative/zero semantics consistently with Outcomes |

No formula or calculator-state behaviour changed. Advanced allocation remains secondary and the
Standard calculator remains the shared regression reference, not a redesign target.

## CP-023 owner-smoke correction batch

| ID | Surface | Requested outcome | Signed-off equivalent | State |
| --- | --- | --- | --- | --- |
| PD-FIX-255 | Session bootstrap | Delay brief fallback and give noticeable session validation one branded, accessible shared status without weakening expiry/error handling | Public auth branding plus `LedgerLoadingIndicator` | COMPLETE — 4/4 session browser states and rendered desktop/narrow/theme/reduced-motion evidence pass |
| PD-FIX-256 | Account health/summary lists | Preserve two same-label records with canonical identity and correct selection/mutation targets | Account tables keyed by `account_id` | COMPLETE — deterministic duplicate-label browser evidence passes with no React key warning |
| PD-FIX-257 | Multi-Lay | Lead with three Bet Types, direct lay inputs and copyable result; retain validated reward/allocation capability secondarily | Multi-Lay v2 engine, shared copy/value primitives and detailed Outcomes | COMPLETE — Normal/Underlay/SNR, 2/3-leg, commission, disclosure, Custom, narrow/theme/motion and Standard regression evidence pass |

The CP-023 change reuses existing tokens and shared primitives. It introduces no calculation, schema,
auth or persistence policy. The permanent Multi-Lay Mode layer is removed; reward modifiers and
Underlay/Standard/Overlay/Custom allocation remain available behind collapsed disclosures. Rendered
comparison was against the supplied Outplayed information hierarchy, not its branding.

## CP-020 active batch

| ID | Surface | Requested outcome | Signed-off equivalent | State |
| --- | --- | --- | --- | --- |
| PD-FIX-248 | Account access + reward journey | Prove imported Status/Stake/Promo precedence through award, report, export and restore | Existing Account access, native award and portable Profile workflows | COMPLETE — authenticated six-sheet import, award retry/settlement and portable restore pass |
| PD-FIX-249 | Global Search / loadout / Quick Action | Prove the existing Profile-scoped keyboard journey without adding a new search product | Canonical global search field and existing Quick Add loadout/editor | COMPLETE — authenticated save/reopen/prefill plus keyboard, narrow and stale-response search pass |
| PD-FIX-250 | Promotional Quick Action eligibility | Promo Access None blocks, Restricted/Not Checked warns, and hard Status still wins | Shared Account eligibility and loadout availability resolver | COMPLETE — API regressions and rendered normal-3010 warning/blocked states pass across shared consumers |

## CP-019 active batch

| ID | Surface | Requested outcome | Signed-off equivalent | State |
| --- | --- | --- | --- | --- |
| PD-FIX-245 | Guided Profile onboarding | Confirmed drawer navigation leaves once, while saved Profiles land and reopen with persisted values | Shared unsaved-change guard and normal Profile dashboard | COMPLETE — full eight-check browser journey passes, including save/reopen, confirmed discard, narrow and 200% text |
| PD-FIX-246 | Dashboard report chart | A selected keyboard/pointer point reveals its reconciled underlying records and Profile-scoped ledger destinations | Existing point-detail and compact dashboard list surfaces | COMPLETE — keyboard and pointer selection expose reconciled records, destinations and retained back context |
| PD-FIX-247 | Populated async report/list state | Newer Profile/range/filter state survives a delayed older response and service recovery | Existing request-version and committed-range guards | COMPLETE — deterministic 200-record browser evidence covers delayed A/B reads, 503 recovery and reload |


## 2026-09-17 CP-017 restored award-lineage consumer repair

PD-FIX-244 is COMPLETE locally. The Sportsbook editor's existing Linked Free Bets panel now uses
the proven remapped native parent identity after portable restore, while retaining the direct-ID
fallback only for native `not_applicable` rows. It never treats missing, ambiguous or
legacy-unresolved external IDs as a relationship. The shared panel, editor structure, actions and
styles are unchanged. Unit coverage and an authenticated 3010 browser import/export/restore run
prove two split children remain visible after native IDs are remapped; the rendered panel was
inspected in the established modal in light mode. No new UI primitive or CSS was introduced.

## 2026-09-16 CP-004 ledger-dialog evidence

PD-FIX-243 is COMPLETE locally: Cash Adjustment and Extra Place use the shared native
`ModalBoundary`; the boundary wraps Shift-Tab correctly when the ledger dialog container initially
owns focus. Cash API errors remain inside the active dialog, are associated with Amount, and preserve
the entered text. Shared sortable table headers retain a 24px minimum target. Actual browser evidence
passes Cash/Extra Place/Casino focus entry, containment, pristine Escape and focus return at desktop,
half-width, narrow and 200% text in both themes. Dirty/pending variants outside these exercised paths
and an actual screen-reader pass remain explicitly unverified.

## 2026-09-16 local integration evidence

The accepted plain reference-card contract is now served by the normal local application at
`http://localhost:3010` from product `2ba9993`. The three Multi-Lay ledger checks pass with their own
synthetic routes. A reviewed Simple/Advanced plan must patch `match_strategy` and `lay_plan_json`
together; a range control may not select Custom until a real pointer or keyboard interaction occurs;
manual Save supersedes any older queued calculator autosave. Main and Vercel remain unchanged.

## PD-CALC-UI-PARITY-20260915 — compact shared calculator references

Acceptance correction: product `8f5dc5876a2830947fbfb79a88a89b4da171858d` supersedes the
shortened-chevron design below. Standard-style reference cards are now plain equal summaries in
Underlay/Standard/Overlay order; Custom/input/Copy/slider and then Outcomes follow. Reference cards
have no chevrons, Total, preamble or Apply/Use-plan action. Multi-Lay retains only necessary all-leg
allocation actions. The rule is proven on standalone, pop-out and Sportsbook/Free Bet editors,
including 200% text reflow.

PD-FIX-231–236 replace two drifting result presentations with one shared reference-card rule.
Standard, pop-out and the Sportsbook/Free Bet calculators use short Standard/Underlay/Overlay/
Custom Lay headings, contextual keyboard help, a compact fixed chevron-label track and independent
value/copy columns. Reference cards have no `Total` heading; the full Exchange/Bookmaker/Total grid
remains exclusive to Outcomes. Custom keeps its editable stake, direct Copy and slider together.

Multi-Lay now puts Bet Type, Mode and Exchange before its Back/Lay content, keeps Back Stake/Odds
as a stack, and uses the same reference rows. Product `c7d923e` passes 1280/720/390, light/dark,
enlarged-text, keyboard and reduced-motion checks plus native and converted save/reopen flows. No
calculator formula, actual placement, historical record or global Outcomes semantics changed.

## PD-CALC-20260914 — visible core planner C04–C07 / core C09

2026-09-15 useful-bundle addendum: the same Sportsbook editor now exposes all four Profit Boost
source modes and conditional Cashback eligibility/cap/receipt fields. Matching shows source inputs,
raw and effective odds, bookmaker return/profit and accepted-odds precedence. Settlement records
cash receipt identity/date/amount or links existing awarded credit without treating credit as cash.
Offer switching clears incompatible drafts; latest-edit protection, shared footer errors, percentage
commission, modal focus and copy-only planning remain unchanged. Real 1440 light and 760 dark
browser checks show no page overflow; native/conversion save/reopen and report/reload pass.
Existing fields, tabs, FinancialValue, Outcomes, selectors and footer actions were reused—no new
visual primitive or local positional workaround. Screen-reader execution remains NOT TESTED.

2026-09-14 engineering continuation: shared focus lifecycle/native ModalBoundary now retain focus
through disabled Save and nested keyboard cycling, return the original opener, and expose Matching
HTTP/network errors in canonical footer alerts. Selected-record footer actions use explicit shared
tracks and constrained-container stacking; six selected plus eighteen empty modal variants cover
pairwise collision, pointer Save, keyboard, both themes and enlarged text. No hidden overflow or
route-specific positional patches. Profit Boost uses existing request revision/abort/input-key rules;
offer changes reset incompatible Custom/reward drafts without altering explicit saved/pop-out input.
Outgoing fixed-source evidence is recorded in the existing audit, not inferred from these components.

Canonical equivalents: accepted CalculatorSegmentedControl, CalculatorSegmentEyebrow,
CalculatorReferenceSection/CalculatorOutcomes, CommissionInput, CopyableFinancialValue,
SingleLayCustomSlider and existing ledger modal/footer. No family-specific financial engine/CSS.
New native/versioned Normal Sportsbook and SNR Free Bet reuse these standalone/pop-out components.
All Advanced references visible; slider follows Custom; percentages have explicit ratio units;
copy-only/apply-plan/explicit actual-confirmation semantics consume lay-plan-v1. Historical null
plans require explicit eligible replan. C08 and broader C01/C02 remain tracked, not superseded.

Implementation checklist: instructions/equivalent search completed; shared tokens/Material icons/
stable input IDs/inline errors reused; typecheck and targeted lint pass. Four hub/pop-out and six
embedded geometry/theme/keyboard cases pass, including desktop200% text separately from narrow
390px and combined half-width200%. No page/editor overflow, full-width references, focus trap,
dirty Escape preservation and pointer Save assertions. Changed shared Standard/Multi-Lay/Sequential/
Early Payout presentation has eight representative no-overflow/eyebrow checks. Final native/conversion
and award evidence resides in the current audit; screen-reader behaviour remains UNVERIFIED.

Record approved, durable UI requirements here when they alter a shared workflow or a
first-class ledger. This prevents implementation from silently drifting between request,
code, tests and parity review.

## 2026-08-24: Extra Place presentation contract

- The Extra Place table defaults to an **EP theme**. Its page-local left/right switch uses a
  horse icon for EP and a palette icon for the global Back/Lay theme.
- EP swatches are exact: Back light `#D4E6FF` / dark `#7DAAE8`; Win Lay light `#FAB6C2` /
  dark `#E18494`; Place Lay light `#FDE4E1` / dark `#E18E84`.
- The EP/Back-Lay selector is a left/right segmented control, not independent pills. Its options
  use the Material horse and palette icons and EP is the default.
- Column visibility belongs in the Extra Place Filter modal. Date/time, Runner/Race, Bookmaker,
  E/W Stake, Qualifying Loss, Extra Place Profit and Actions are always shown.
- Back-group columns include read-only derived **Place Odds**. It is calculated from the selected
  each-way term, never manually entered: `1 + ((back odds - 1) / term denominator)` for the
  current `1 / n` term model. For example, back odds `6.00` at `1 / 5` produces Place Odds
  `2.00`. It is the bookmaker's decimal odds for the place part of an each-way bet.
- Outcome values are always colour-coded: positive green, negative red and zero neutral. Stakes
  and liabilities remain neutral.
- Extra Place must inherit canonical Plum Duff modal/footer/action geometry before applying this
  page-specific presentation.
- The outcome-card heading uses the shared `calculator-result-card` geometry without a local
  vertical offset. Negative matrix components and totals are red; positive values are green.

## 2026-08-24: Extra Place contrast and action parity correction

- Approved EP swatches always use the dark foreground `#142533` for table headers and calculator
  section labels in both light and dark application modes. Grey copy is not permitted on these
  coloured surfaces.
- Outcome matrix components are semantic: positive is the shared success token, negative is the
  shared destructive token, and zero/unavailable is neutral. The value element owns this colour so
  parent outcome-row styles cannot override it.
- Extra Place uses the shared modal Save and Delete styles without page-specific overrides. Save
  retains the canonical blue shared action and Delete retains the canonical red destructive action.
## CP-078 Reports usability completion — 2026-10-09 12:01 BST

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-313 / #111 | Fund Manager Reports tabs | One visible primary home for every existing Reports block; no primary accordion shells | Existing analytics tabs and `content-subpanel` hierarchy | COMPLETE |
| PD-FIX-314 / #111 | Trend And Activity Explorer | Fourteen exact ledger-record recipes, compact filters and truthful active state | Existing canonical reporting fields, filter chips and London date resolver | COMPLETE |
| PD-FIX-315 / #111 | Reports tables and record detail | Shared 16-row pagination for growing parent and nested lists | `LedgerPagination` top/bottom controls | COMPLETE |
| PD-FIX-316 / #111 | Local owner handoff | Serve the verified change through the established authenticated 3010/8010 application | Existing normal-owner launcher and local backup gate | COMPLETE |

Focused evidence covers 64-Profile reflow, light/dark and 390px containment, keyboard-labelled
controls, exact recipe matching, unavailable/undated money states, parent/nested pagination and the
absence of primary `details/summary` wrappers. Financial authorities and API/schema contracts are
unchanged.

Owner acceptance recorded 2026-10-09 12:29:49 BST: CP-078 Reports passes for now.
This freezes the bounded Reports presentation for the CP-075 local integration; it does
not reopen or extend Reports scope.

## CP-079 working-workbook owner acceptance corrections — 2026-10-09 21:04 BST

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-321 | Working Workbook export scope | Default to All History; expose governed month/90-day/custom ranges and exact pre-download ledger counts | Existing report date-range controls and Europe/London date resolver | COMPLETE |
| PD-FIX-322 | Legacy Profile export | Preserve legitimate ledger history when the older Profile has no onboarding row; fail with owner-facing recovery only for genuinely required data | Existing legacy import compatibility and actionable Settings empty/error states | COMPLETE |
| PD-FIX-323 | Import/Export hierarchy | Separate Working Workbook, Portable Backup and Ledger Data; remove internal dry-run/domain wording from the owner surface | Existing peer `content-subpanel` Settings cards and canonical field/action controls | COMPLETE |
| PD-FIX-324 | Export feedback and safety | Show plain-English failure, unchanged-data assurance and an exact action; prove counts match the generated package without cross-Profile leakage | Existing actionable error panels and read-only export boundary | COMPLETE |

Verified 2026-10-09 21:25 BST on the canonical authenticated localhost:3010 application. The
installed summary and downloaded XLSX agree for the owner-shaped Last Month case (four Sportsbook
rows); the financial control fingerprint is unchanged. All History retains explicit blocks for
unsupported native Extra Place or fee-history state rather than omitting or coercing it.

## Owner smoke correction batch — 2026-10-14

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-325 | Selected Range authority | One Fund Manager-level persisted range across Profiles and all supported range-aware surfaces | Existing governed date presets and Europe/London resolver | NEEDS VERIFICATION |
| PD-FIX-326 | Financial readiness | Loading, no activity, valid activity, invalid source and load failure remain distinct across summary consumers | Existing `FinancialValue` readiness contract | NEEDS VERIFICATION |
| PD-FIX-327 | Profile switcher | Full-width Profile Operations row and 197 × 50 peer destinations without losing route/current-state behaviour | Existing command-panel route cards | NEEDS VERIFICATION |
| PD-FIX-328 | Selected Range Performance | Stable chart, fixed hover detail and accessible anchored record popover | Existing `ReportPointChart` and Material overlay treatments | NEEDS VERIFICATION |
| PD-FIX-329 | Working Workbook action | Use `Export as New Workbook` for the working-workbook action only | Existing positive export action | NEEDS VERIFICATION |
| PD-FIX-330 | Working Workbook package | Export a self-contained XLSX with no unintended external-workbook dependency | Existing versioned template-package validation boundary | NEEDS VERIFICATION |
| PD-FIX-331 | Working Workbook identity | Keep Dashboard B4 as Profile name, show Profile ID nearby and retain the same ID in machine metadata | Existing dashboard identity block and manifest | NEEDS VERIFICATION |

The universal Selected Range migration is additive and was applied locally at 2026-10-14 14:21
BST after verified backup `BACKUP-5DE8D6D5`. Historical Profile range fields remain for
compatibility but are no longer the active authority for this feature. Automated gates passed;
canonical runtime smoke and owner acceptance remain pending.

## Core Profile/range stabilisation — 2026-10-14

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-332 | Profile summary state | Every Profile/range request reaches ready, empty, unavailable or error; stale/cancelled work cannot strand loading | Existing combined tracker-summary projection and selected-range authority | COMPLETE |
| PD-FIX-333 | Profile header loader | Stable contained Material progress with `Updating summary…`; no rotating glyph/wire | Existing Material linear progress primitive | COMPLETE |
| PD-FIX-334 | Selected Range Performance | Compact empty/unavailable state outside the plotting area; preserve the accepted valid-data chart | Existing compact financial-readiness treatment | COMPLETE |
| PD-FIX-335 | Current Account Cash | Show known subtotal and missing-account evidence without presenting partial cash as complete | Existing Account money completeness authority; tracked Account repair scope #116 | COMPLETE |

This batch is limited to the canonical Profile/range workflow. Workbook acceptance and feature
development remain paused. The UI checklist below is the explicit local verification link; no new
GitHub issue or hosted mutation is authorised by this batch.

Evidence: 566 web unit/component regressions; focused lint, typecheck and production build; one
authenticated isolated browser gate with 26 terminal transitions, delayed/stale responses,
failure/recovery, zero/invalid activity, route/Profile changes, refresh and re-authentication.
Canonical owner interaction remains `NEEDS VERIFICATION` after installation.

## Profile Operations composition refinement — 2026-10-14

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-336 / #116 | Current Account Cash | Present known total, incompleteness and one aligned row per cash category without changing money readiness | Existing Account money completeness authority and dashboard metric-card typography | COMPLETE |
| PD-FIX-337 / #111 | Selected Range Performance | Align the performance card to exactly the first two operational-card rows and give its existing chart the remaining card area | Existing dashboard card grid, range pills and `ReportPointChart` interaction | COMPLETE |
| PD-FIX-338 / #111 | Profile Operations stability evidence | Preserve terminal range/Profile state and accepted chart interaction while proving desktop and narrow geometry headlessly | Existing authenticated Profile-range stability gate and UI checklist | COMPLETE |

Workbook acceptance remains paused. This batch changes presentation only: no financial authority,
summary request lifecycle, schema, owner data or hosted surface is in scope.
Headless authenticated evidence passed 26 range/Profile/route transitions at 1440px and 760px;
canonical owner visual verification remains outstanding.

## CP-075 Sportsbook promotion local integration — 2026-10-09 12:29 BST

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-317 | Sportsbook Trigger editor | Concise relevant refund/wagering terms and truthful current/projected position | Existing Sportsbook editor sections and financial-value treatments | COMPLETE |
| PD-FIX-318 | Linked wagering entry | Add Wagering Bet carries Profile, bookmaker and group context without repeating promotion terms | Existing Sportsbook create workflow | COMPLETE |
| PD-FIX-319 | Promotion lifecycle | Turnover progress does not auto-confirm external release | Existing explicit settlement/confirmation semantics | COMPLETE |
| PD-FIX-320 | Local owner handoff | Install the additive-schema feature through canonical authenticated 3010/8010 only | Existing normal-owner backup and launcher process | COMPLETE |

## CP-082 owner smoke corrections and Oddsmatcher parity — 2026-10-24

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-339 / #111 | Selected Range Performance | Financial-chart composition with restrained points, compact summary, layout-neutral hover and anchored record popover | Existing `ReportPointChart`, `FinancialValue` and bounded Material popover patterns | COMPLETE |
| PD-FIX-340 / #111 | Application header | Deliberate desktop, intermediate and narrow top-bar states without squashed controls or page overflow | Existing authenticated app-shell regions, icon actions and global-search primitive | COMPLETE |
| PD-FIX-341 / #116 | Accounts readiness navigation | `View affected Accounts` opens Accounts with governed `Needs attention` filtering and direct correction actions | Existing Account readiness authority, ledger toolbar and editor/review surface | COMPLETE |
| PD-FIX-342 / #52 | Oddsmatcher route/context | One canonical `/oddsmatcher` tool with optional Profile context; Profile entry delegates to it | Existing Calculators top-level placement, Profile selector and server authority | COMPLETE |
| PD-FIX-343 / #54 | Oddsmatcher desktop IA | MBB-observed toolbar/filter/table hierarchy expressed with Plum Duff Material components | Existing table toolbar, filter-drawer, branded quote and pagination patterns | COMPLETE |
| PD-FIX-344 / #54 | Oddsmatcher responsive IA | Filters collapse to one counted control and opportunities become stacked cards on narrow widths | Existing responsive ledger cards, modal containment and app-shell breakpoints | COMPLETE |
| PD-FIX-345 / #57 | CP-082 evidence and local install | Geometry, themes, keyboard/focus, Profile isolation and preserved Alpha boundaries verified before 3010/8010 install | UI consistency fail-closed gate and canonical normal-owner backup/install procedure | COMPLETE |

This batch changes presentation, route composition and Account issue navigation only. It does not
change financial calculations, provider polling/quota rules, ledger settlement, database schema,
owner data or the recorded owner-acceptance statuses.

Installed locally after verified backup `BACKUP-78C9A966`. Canonical 3010/8010 health reports the
bounded revision, `normal-owner` fingerprint `7246998d43722066` and unchanged
`invited-subscribers-v1`; Profile/ledger row counts, SQLite integrity and foreign-key integrity are
unchanged. Owner visual and workflow acceptance remains pending.

## CP-083 visual architecture and Oddsmatcher parity correction — 2026-10-25

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-346 / #111 | Application top bar | Three intentional wide/intermediate/narrow compositions with one context-appropriate search affordance and no overlap | Existing app-shell regions, Material icon actions and global-search authority | COMPLETE |
| PD-FIX-347 / #111 | Global search | Leading icon in the visible field, short-debounce automatic search, and expandable/cancellable compact search | Existing protected global-search API and keyboard/focus treatment | COMPLETE |
| PD-FIX-348 / #111 | Selected Range Performance | Replace the presentation component while preserving reporting data; compact zero/unavailable states and layout-neutral point detail | Existing reporting projection, `FinancialValue` semantics and Material overlay primitives | COMPLETE |
| PD-FIX-349 / #111 | Profile Operations readiness | Trace every displayed unavailable state to exact source records and provide an actionable affected-record path without coercing unknown values | Existing betting-readiness and authorised record-inspection authority | COMPLETE |
| PD-FIX-350 / #54 | Oddsmatcher controls | Match the retained MBB-observed mode/search/filter/status hierarchy using Plum Duff components | Existing filter drawer, Settings dialog and provider-status projection | COMPLETE |
| PD-FIX-351 / #54 | Oddsmatcher table | Seven-column information model with themed two-level quote blocks, nested liquidity, rating pills and compact actions | Existing Account branding, Material icons and result-table primitives | COMPLETE |
| PD-FIX-352 / #54 | Oddsmatcher responsive results | Preserve readable seven-column density until the governed breakpoint, then transform to contained stacked opportunities | Existing responsive ledger-card and drawer patterns | COMPLETE |
| PD-FIX-353 / #57 | CP-083 evidence and local install | Fail-closed geometry/theme/accessibility evidence, exact private captures, verified backup and canonical 3010/8010 installation | UI consistency gate and normal-owner backup/install procedure | COMPLETE |

This batch is presentation, inspection and navigation work. It does not change financial formulas,
provider polling/quota rules, ledger mutation semantics, database schema, owner records or owner
acceptance statuses.

Installed locally after verified backup `BACKUP-534DEA71`. Canonical health identifies
`normal-owner` fingerprint `7246998d43722066` and schema `invited-subscribers-v1`; SQLite integrity,
foreign keys and all 29 financial controls match the pre-install snapshot. The only row-count change
is the recorded backup itself. Owner visual acceptance remains pending.

## CP-084 Oddsmatcher density, responsive-row and filter/settings parity — 2026-10-25

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-354 / #54 | Desktop quote blocks | Measured MBB-like density, full bookmaker names and compact inline link affordances | Retained CP-081A evidence plus Plum Duff Account branding | COMPLETE |
| PD-FIX-355 / #54 | Desktop result table | Intentional seven-column proportions with compact Material actions and no clipped Actions column | Retained CP-081A table hierarchy and shared data-table actions | COMPLETE |
| PD-FIX-356 / #54 | Narrow opportunity rows | Reference order with top actions and side-by-side quotes until genuinely too narrow | Retained CP-081A narrow hierarchy and responsive ledger cards | COMPLETE |
| PD-FIX-357 / #54 | Selection filter | Supported Sport, Competition, Event, Market, Selection and Exclude draws controls | Existing contained Oddsmatcher filter drawer | COMPLETE |
| PD-FIX-358 / #54 | Start-time filter | Captured presets and inclusive Europe/London custom range | Existing governed date semantics | COMPLETE |
| PD-FIX-359 / #54 | Back/Lay filters | Provider multi-select, odds bounds and truthful unknown-liquidity handling | Existing provider feed and filter authority | COMPLETE |
| PD-FIX-360 / #54 | Rating filter | Minimum/maximum rating, default arb hiding and reversible hidden-results state | Existing rating authority and status treatment | COMPLETE |
| PD-FIX-361 / #54 | Oddsmatcher Settings | Persisted Fund Manager defaults with Profile Account/commission precedence | Existing `fund_manager_settings` authority | COMPLETE |
| PD-FIX-362 / #54 | My Filters | Persist named transient-filter selections without silently embedding Profile context | Existing settings authority and modal patterns | COMPLETE |
| PD-FIX-363 / #54 | CP-084 evidence/install | Private measured comparison, responsive captures, regression gate, backup and canonical install | UI consistency gate and local-install procedure | COMPLETE |

Owner approved the additive, server-validated `oddsmatcher_preferences_json` v1 authority on
2026-10-25. It is limited to the approved defaults and named filters; Profile context and Account
truth remain outside it. Normalized private comparison and the fail-closed UI gate passed. The
bounded change was installed after verified backup `BACKUP-51838512`; SQLite integrity, foreign
keys, database fingerprint and all 29 financial controls are unchanged. Owner visual acceptance
remains pending.

## CP-085 Oddsmatcher interaction and containment correction — 2026-10-25

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-364 / #54 | Rating and Actions columns | Keep both columns contained and switch to cards before either clips | CP-084 measured table plus retained MBB responsive hierarchy | COMPLETE |
| PD-FIX-365 / #54 | Rating presentation | Percentage-only pill with governed red/green/lower bands | Existing Oddsmatcher rating authority and semantic status tokens | COMPLETE |
| PD-FIX-366 / #54 | Opportunity rows | Row activation opens Bet Summary while interactive descendants retain their own actions | Existing selectable-row keyboard pattern and Bet Summary authority | COMPLETE |
| PD-FIX-367 / #54 | Desktop filters | Inline count badges and anchored Selection, Start time, Back, Lay and Rating dropdowns | Retained CP-081A MBB interaction evidence and Plum Duff anchored menus | COMPLETE |
| PD-FIX-368 / #54 | Filter utilities | Clear transient filters only; Refresh is icon-only | Existing client-filter authority and shared icon-button treatment | COMPLETE |
| PD-FIX-369 / #54 | My Filters | Anchored preset menu with load, update, edit and delete | Existing server-owned Oddsmatcher preference authority | COMPLETE |
| PD-FIX-370 / #54 | Save as preset | Small Name and optional Description dialog | Existing compact confirmation/form dialog pattern | COMPLETE |
| PD-FIX-371 / #54 | Saved-filter contract | Backward-compatible optional descriptions in versioned preferences JSON without SQL migration | Existing `oddsmatcher_preferences_json` v1 validation boundary | COMPLETE |
| PD-FIX-372 / #54 | CP-085 evidence/install | Responsive threshold tests, private MBB comparison, backup and canonical local installation | UI consistency gate and normal-owner install procedure | COMPLETE |

This batch does not change provider fetching, calculations, Profile Operations, workbook behaviour,
Accounts, markets, liquidity authority, placement boundaries or ledger mutation semantics.

Private geometry and captures are stored under
`data/private/evidence/cp085-oddsmatcher-parity-20261025/`. Focused API, component, browser,
accessibility, responsive, typecheck and build gates pass. Focused changed-file lint passes; the
repository-wide lint command remains blocked by the unchanged Free Bet ref-during-render error.
Installed after verified backup `BACKUP-9E41D0F8`; `normal-owner` fingerprint
`7246998d43722066`, integrity, foreign keys and all 29 financial controls remain unchanged. Owner
visual acceptance remains pending.

## CP-086 Oddsmatcher filter interaction parity — 2026-10-26

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-373 / #54 | Shared filter panels | Anchored, focus-managed panels with no duplicate heading and family-specific Reset | CP-085 anchored surface plus retained MBB filter evidence | COMPLETE |
| PD-FIX-374 / #54 | Searchable selectors | One reusable tokenised searchable combobox with mouse, touch and keyboard operation | Existing Plum Duff field, chip, listbox and Material action primitives | COMPLETE |
| PD-FIX-375 / #54 | Back filter | Searchable bookmaker tokens, friendly names and paired odds bounds | Retained MBB Back-filter evidence and provider option authority | COMPLETE |
| PD-FIX-376 / #54 | Lay filter | Searchable exchange tokens, paired odds bounds and truthful minimum-liquidity handling | Retained MBB Lay-filter evidence and UNKNOWN-liquidity contract | COMPLETE |
| PD-FIX-377 / #54 | Selection filter | Two-column dependent Sport, Competition, Event, Market and Selection controls plus Exclude draws | Retained MBB Selection evidence and loaded canonical opportunity data | COMPLETE |
| PD-FIX-378 / #54 | Start time | Grouped single-select presets and existing Europe/London custom range | Retained MBB Start-time evidence and governed date semantics | COMPLETE |
| PD-FIX-379 / #54 | Badges, Clear and Reset | Logical family counts, family Reset and global transient Clear without provider refresh | Existing CP-085 filter-state authority | COMPLETE |
| PD-FIX-380 / #54 | Saved-filter and responsive reuse | Persist/restore canonical state and reuse the same controls in the narrow sheet | Existing versioned preference contract and shared filter dialog | COMPLETE |
| PD-FIX-381 / #54 | CP-086 evidence/install | Focused interaction, responsive, accessibility, no-credit, build and local-install gates | UI consistency fail-closed gate and normal-owner install procedure | COMPLETE |

This batch changes Oddsmatcher filter presentation and interaction only. It does not change provider,
calculation, Profile, ledger, placement, liquidity or database-schema authorities.

Private captures are stored under
`data/private/evidence/cp086-oddsmatcher-filter-parity-20261026/`. Focused changed-file lint,
component, browser, accessibility, typecheck and build gates pass. Repository-wide lint remains
blocked by the unchanged Free Bet ref-during-render error. Verified backup `BACKUP-5125B5F7`
preserves integrity, zero foreign-key failures and all 29 financial controls. Owner interaction and
visual acceptance remain pending.

## CP-087 application control interaction contract — 2026-10-26

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-382 / #92 | Canonical control taxonomy | Record searchable, multi-searchable, ordinary-select and parent-surface interaction rules application-wide | CP-087 owner contract plus Material/WCAG semantics | COMPLETE |
| PD-FIX-383 / #92 | Shared selector primitives | Reuse an explicit CLOSED / SEARCH_RESULTS / SHOW_ALL state machine with nested-first Escape | CP-086 token field visual treatment corrected to CP-087 interaction rules | COMPLETE |
| PD-FIX-384 / #54 | Oddsmatcher filter selectors | Parent opens child closed; type/search, explicit show-all and selection-close behaviour | Supplied owner sequence and retained MBB evidence | COMPLETE |
| PD-FIX-385 / #92 | Global search | Focus stays closed, typed query alone opens results and clearing query closes results | Existing authenticated global-search authority | COMPLETE |
| PD-FIX-386 / #92 | Extra Place result selector | Explicit open, selection close, outside/Escape close and trigger focus restoration | Existing anchored row-action/listbox pattern | COMPLETE |
| PD-FIX-387 / #92 | Retroactive application audit | Classify representative selectors and record compliant controls and bounded exceptions | UI consistency inventory contract | COMPLETE |
| PD-FIX-388 / #92 | Rules and Definition of Done | Persist opening, keyboard, containment and no-side-effect evidence requirements | Existing AGENTS/UI/checklist/Definition of Done files | COMPLETE |
| PD-FIX-389 / #92 | Cross-app verification | Shared component plus Oddsmatcher, ledger and Account/Settings regression evidence | UI consistency fail-closed handoff gate | COMPLETE |
| PD-FIX-390 / #92 | CP-087 evidence/install | Private state captures, full gates and canonical local installation | Normal-owner backup/install procedure | COMPLETE |

This batch changes selector interaction and shared presentation only. It does not change financial,
provider, Profile-isolation, ledger-lifecycle, workbook or database-schema authorities.

Private state captures are stored under
`data/private/evidence/cp087-control-interaction-contract-20261026/`. Shared component,
Oddsmatcher, global-search, Account and Extra Place browser evidence passes; typecheck and
production build pass. Focused changed-file lint passes. Repository-wide web lint remains blocked by
the unchanged Free Bet ref-during-render error; independent API lint retains 268 pre-existing
violations. Changed API files pass focused Ruff. Verified backup `BACKUP-416DDD3C` preserves all
29 financial controls, integrity and zero foreign-key violations; owner interaction acceptance
is recorded for the shared combobox open/close, selection and focus-return contract. Oddsmatcher
overall and the other CP-087 representative surfaces remain pending.

## CP-088 Oddsmatcher status cleanup and Bet Summary parity — 2026-10-26

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-391 / #54 | CP-087 selector interaction | Record owner acceptance for the shared combobox/open-close contract without accepting Oddsmatcher overall | CP-087 component contract and owner smoke | COMPLETE |
| PD-FIX-392 / #54 | Rating filter fields | Compact numeric inputs with contained visible focus | Back/Lay filter numeric inputs | COMPLETE |
| PD-FIX-393 / #54 | Manual refresh | Contained busy state, duplicate prevention, stable geometry and last-good results | Shared compact action spinner | COMPLETE |
| PD-FIX-394 / #54 | Liquidity/Profile/commission status | Compact visible state with keyboard/tap-accessible explanation and governed commission precedence | Contextual-help and status primitives | COMPLETE |
| PD-FIX-395 / #54 | Bet Summary shell | Large contained header/control row and responsive two-pane composition | Existing modal boundary and calculator shell | COMPLETE |
| PD-FIX-396 / #54 | Bet Summary calculator | Back/Lay cards, normal controls retained in Advanced, strategy controls and live governed preview | Current matched-betting preview authority | COMPLETE |
| PD-FIX-397 / #54 | Bet Summary results/action | Event summary, outcome tables, conservative Total Profit and Profile-gated Prospecting action | FinancialValue, semantic table and primary action primitives | COMPLETE |
| PD-FIX-398 / #54 | Responsive/accessibility | Contracted mobile order, local scroll, focus return, tooltips and no overflow | ModalBoundary and Material controls | COMPLETE |
| PD-FIX-399 / #92 | Shared async rule | Persist contained busy-state and duplicate-invocation rule | UI contract and Definition of Done | COMPLETE |
| PD-FIX-400 / #54 | Evidence/install | Private comparisons, focused tests, backup and canonical local installation | UI consistency gate and normal-owner process | COMPLETE |

This batch is presentation and interaction work. It preserves the provider, calculator, Profile,
ledger, liquidity and placement authorities. Oddsmatcher owner acceptance remains pending.

Installed locally after verified backup `BACKUP-C17AE882`; `normal-owner` fingerprint
`7246998d43722066`, schema `invited-subscribers-v1`, all 13 financial-table row/hash projections,
SQLite integrity and zero foreign-key violations match the pre-install state.

## CP-088 owner-smoke follow-up — 2026-10-26

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-401 / #54 | Rating and Refresh | Preserve compact Rating focus and contained coalesced Refresh state | CP-088 compact inputs and shared button spinner | COMPLETE |
| PD-FIX-402 / #54 | Quote liquidity | Move compact unavailable state below the Lay quote and portal its accessible explanation above clipping ancestors | Retained MBB quote hierarchy and anchored-surface top layer | COMPLETE |
| PD-FIX-403 / #54 | Commission resolution | Apply Profile commission, then persisted default, then explicit 0% without making Profile context a calculation prerequisite | Existing preferences and calculator validation authorities | COMPLETE |
| PD-FIX-404 / #54 | Bet Summary composition | Preserve genuine desktop two-column hierarchy, compact Profile state and responsive ordering | Retained private MBB Advanced evidence and current Material modal shell | COMPLETE |
| PD-FIX-405 / #54 | Shared modal ownership | Lock document scroll and interaction, preserve position, prevent chaining and restore focus/scroll on dismissal | `ModalBoundary`, ledger editor scroll ownership and native modal semantics | COMPLETE |
| PD-FIX-406 / #54 | Evidence/install | Focused financial/UI regression, private comparison, verified backup and canonical installation | UI consistency gate and normal-owner procedure | COMPLETE |

This follow-up changes commission fallback only within the approved Oddsmatcher opportunity and
Bet Summary workflow. It does not change the matched-betting formula, provider integration,
filter state, ledger settlement or owner-acceptance status.

Verified backup `BACKUP-B2266D9C` precedes installation. Focused API, component and browser tests,
full web tests, typecheck, production build and changed-file lint pass. Private evidence is under
`data/private/evidence/cp088-owner-smoke-followup-20261026/`; owner visual acceptance remains pending.

## CP-089 Bet Summary lay-placement stub, biased outcomes and odds formats — 2026-10-26

| ID | Surface | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-407 / #54 | Place Lay parity area | Show calculated Stake/Liability in an explicitly disabled, non-mutating placement stub | Retained MBB placement hierarchy plus Plum Duff disabled-action semantics | COMPLETE |
| PD-FIX-408 / #54 | Biased outcomes | Show Total Profit only for canonical Standard stake while retaining both outcome tables in every mode | Existing matched-betting preview and strategy-reference authority | COMPLETE |
| PD-FIX-409 / #54 | Bet Summary odds formats | Add modal-local Decimal/Fractional/Moneyline presentation and strict canonical-decimal parsing | Approved M14 odds-conversion contract and existing odds normaliser | COMPLETE |
| PD-FIX-410 / #54 | Calculator Settings | Open a compact, focus-managed format surface from the existing Bet Summary Settings action | Shared `ModalBoundary` and compact settings dialog pattern | COMPLETE |
| PD-FIX-411 / #54 | Responsive/accessibility | Preserve two-column/narrow hierarchy, scroll ownership, field validation and disabled explanation | CP-088 Bet Summary/modal contract | COMPLETE |
| PD-FIX-412 / #54 | Evidence/install | Deterministic conversion/strategy tests, private captures, backup and canonical local installation | UI consistency and normal-owner install gate | NEEDS VERIFICATION — verified backup `BACKUP-54F7D709`; canonical install pending |

This batch changes Bet Summary presentation and canonical-input conversion only. It does not alter
provider data, matched-betting formulas, ledger lifecycle, balances or placement capabilities.
