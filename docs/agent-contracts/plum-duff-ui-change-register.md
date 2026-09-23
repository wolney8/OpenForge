# Plum Duff UI Change Register

## CP-033 owner-blocking ledger edit repair

| ID | Surface | Requested outcome | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-271 | Existing ledger record editing | Permit authorised Notes-only edits across supported lifecycle states without reselecting or revalidating unchanged financial/Account fields; retain drafts on failure and keep identity/financial meaning unchanged | Existing ledger editors, canonical Account identity and field-scoped mutation/history contracts | IN PROGRESS — owner Preview failure reproduced/investigation active under #117 |

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
