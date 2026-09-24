# Plum Duff UI Change Register

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
