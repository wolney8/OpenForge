# Plum Duff Next Issue Tracking Register

_Last updated: 2026-09-10_

## Purpose

This is the canonical durable request register. The short current-state entry point is
[`PROJECT_STATUS.md`](../../PROJECT_STATUS.md); this document retains the full request scope and
contract/fixture references.

Live GitHub issue state was reconciled through an authenticated integration on 2026-09-06. A local
entry without a verified issue link must remain explicitly `SYNC PENDING`.

## Active request capture and acceptance

Implementation, automated verification, hosted verification, and Will's acceptance are separate
states. Partial delivery does not remove the remaining scope.

| ID | Intended outcome / type | Current status and remaining scope | Source / GitHub |
|---|---|---|---|
| `CALCULATOR-VERIFICATION-001` | Audit / independently verify every exposed standalone calculator family and significant mode | `AUDITED — REVIEW PENDING`: 26 modes independently match their governing signed-off contracts; Standard Overlay fails exact output presentation because the API returns `-0.00`; Bonus Lock-In loses/wins and the Money Back compatibility API remain blocked on approved financial authority. Current external source artifacts, equations, rounding, inputs, expected/actual values, validation and 10 unverified external comparisons are recorded without changing formulas. Live #113/#105/#37 comment sync is pending because no authenticated GitHub integration or `gh` is available. | [Issue #113 audit](../audits/issue-113-independent-calculator-verification-2026-09-10.md); independent fixture `calculator-independent-verification-v1`; [#113](https://github.com/wolney8/OpenForge/issues/113), [#105](https://github.com/wolney8/OpenForge/issues/105), [#37](https://github.com/wolney8/OpenForge/issues/37) |
| `CALCULATOR-BRIDGE-001` | Feature / immutable calculator or completed-session source into reviewed Profile ledger activity | `MANUAL ACCEPTANCE FIX — WILL RECHECK PENDING`: the single product-neutral bridge converts Standard and Multi-Lay → one/multiple Profile Sportsbook Prospecting rows, Extra Place / Each Way → native Profile Prospecting rows, and completed Blackjack Free/Live → exactly one reviewed Casino activity. The #36 review now composes Profile name/code through the shared stacked selectable row and carries stable `account_id` through Account selection, so legitimate duplicate-brand Accounts remain distinct without React key warnings. Converted Casino VALUE cells preserve natural positive/accounting-negative `FinancialValue` typography, selection and motion in compact tables. Destination recalculation, Account blocks/warnings, per-target retry/idempotency, source checksum, linked notification and source-state retention remain covered. `CONVERTIBLE NOW`: Standard, Multi-Lay, Extra Place / Each Way, Blackjack Free/Live. `NOT CONVERTIBLE — UTILITY`: Odds / Probability. `BLOCKED — DESTINATION CONTRACT MISSING`: Sequential Lay (ordered conditional legs), Early Payout / 2UP (trigger/part-back/live-position state), Multiples (selection/state structure), Dutching (multiple back positions). | Calculator bridge workflow; [#36](https://github.com/wolney8/OpenForge/issues/36), reused multi-Profile workflow [#77](https://github.com/wolney8/OpenForge/issues/77), Blackjack [#40](https://github.com/wolney8/OpenForge/issues/40), Sequential Lay [#39](https://github.com/wolney8/OpenForge/issues/39), advanced families [#38](https://github.com/wolney8/OpenForge/issues/38) |
| `CALCULATOR-WORKSPACE-001` | Feature / Fund Manager standalone calculator workspace | `CODE-VERIFIED — USER RECHECK PENDING`: core family coverage remains locally proven. Blackjack now exposes a deterministic `blackjack-session-v1` source adapter for the later #36 bridge; no Casino row is created in calculator mode. Optional specialised extensions remain explicit below; #36 stays next. | Calculator workspace workflow/fixtures; [#35](https://github.com/wolney8/OpenForge/issues/35), contracts/fixtures [#37](https://github.com/wolney8/OpenForge/issues/37), advanced catalogue [#38](https://github.com/wolney8/OpenForge/issues/38), Sequential Lay [#39](https://github.com/wolney8/OpenForge/issues/39), later bridge [#36](https://github.com/wolney8/OpenForge/issues/36) |
| `CALCULATOR-ODDS-NORMALIZATION-001` | Input / shared calculator odds normalisation with canonical decimal output | `IMPLEMENTED and focused checks PASS locally`: exact fractions and simple decimal comma normalise visibly; ambiguous/malformed forms remain rejected; ledger API adoption is deliberately separate | `calculator-odds-normalization-v1`; [#112](https://github.com/wolney8/OpenForge/issues/112) |
| `CALCULATOR-MULTIPLES-001` | Feature / standalone Multiples and Accumulator reference calculator | `PROVEN locally — CORE`; all-to-win dynamic selections, Winner/Loser/Void settlement, totals, strict odds, auto-calc, Reset and zero writes passed deterministic API/browser checks. `BLOCKED OPTIONAL EXTENSION`: Each Way, Rule 4, fold permutations and bookmaker/all-winner bonuses. | `standalone-calculator-families-v1`; [#38](https://github.com/wolney8/OpenForge/issues/38) |
| `CALCULATOR-DUTCHING-001` | Feature / standalone 2-way/3-way Normal and SNR Free Bet Dutching | `PROVEN locally — SIMPLE`; fixed first stake, per-selection commission, penny/£1/£5/£10 rounding, copied stakes, Outcomes, Reset and zero writes passed deterministic API/browser checks. `BLOCKED OPTIONAL EXTENSION`: Advanced breakeven weighting lacks a distinguishable allocation/rounding rule. | `standalone-calculator-families-v1`; [#35](https://github.com/wolney8/OpenForge/issues/35), [#38](https://github.com/wolney8/OpenForge/issues/38) |
| `CALCULATOR-ODDS-PROBABILITY-001` | Utility / exact odds and implied-probability conversion | `PROVEN locally`: exact decimal/fractional/American/probability conversion, strict validation, auto-update, Reset, pop-out state, Fund Manager authorization and zero business writes passed focused API/unit/browser checks. Fractional odds is now the default and Reset source format; explicit saved/pop-out state remains authoritative. User/hosted acceptance remains pending. | `m14-odds-converter-reference-contract`; [#35](https://github.com/wolney8/OpenForge/issues/35), [#37](https://github.com/wolney8/OpenForge/issues/37) |
| `CALCULATOR-BLACKJACK-001` | Decision support / Simulation, Free Play and Live Play Blackjack sessions | `RENDERED FIX — WILL ACCEPTANCE PENDING`: the A–I contract remains covered and the latest manual #40 regressions now have targeted geometry/motion evidence across desktop, half-width, narrow and both themes. Strategy behaviour is unchanged. Live/Free outcome settlement preserves the completed hand in place while updating actual committed stake (including Double/Split), calculated-or-entered return provenance, history and running result; only an explicit Rebet/Double deal action starts the next hand. Natural Blackjack payout defaults explicitly to 1:1 and supports 3:2, 6:5, 2:1 or validated Custom; ordinary Win remains 1:1. `blackjack-session-v1` retains additive payout/cash-or-credit provenance for the existing single-Profile #36 bridge. #40 remains open. | `blackjack-session-v1`, `standalone-calculator-families-v1`; [#40](https://github.com/wolney8/OpenForge/issues/40), bridge [#36](https://github.com/wolney8/OpenForge/issues/36), Casino semantics [#78](https://github.com/wolney8/OpenForge/issues/78), consistency [#92](https://github.com/wolney8/OpenForge/issues/92) |
| `PD-FIX-BLACKJACK-COMPOSITION-001` | UI correction / compact Blackjack live-use composition | `RENDERED FIX — WILL RECHECK PENDING`: compact history reports final class/total → full chosen action sequence → terminal outcome; Bust cannot enter the recommendation sequence, while expanded Recommended/Chosen/Outcome remain separate. The recommendation surface uses one measured persistent 540ms height/opacity/translate window with a tested intermediate frame and stable result-state geometry. Live/Free money modes retain plain Deal Again without a valid previous stake and expose Rebet/Double only for a positive canonical prior stake. Running values fill responsive equal 4/2/1-column tracks. Redundant conversion pills and Session History prose are removed. Desktop, half-width, narrow, light and dark rendered checks pass; Will acceptance remains pending. | [#40](https://github.com/wolney8/OpenForge/issues/40), bridge [#36](https://github.com/wolney8/OpenForge/issues/36), consistency [#92](https://github.com/wolney8/OpenForge/issues/92), workspace [#35](https://github.com/wolney8/OpenForge/issues/35) |
| `CASINO-ACTIVITY-TYPE-001` | Contract / distinguish promotional Casino activity, real free play and manual/no-offer play | `CODE-VERIFIED — BRIDGE PENDING`: existing string-backed Casino type authority now includes controlled `Manual Play / No Offer`; Free Play continues to map to `Fixed Spins Or Free Play`. No database migration or fake promotion is required. #36 must still perform reviewed Profile/Account mapping and record creation. | Casino lifecycle contract; [#78](https://github.com/wolney8/OpenForge/issues/78), bridge [#36](https://github.com/wolney8/OpenForge/issues/36) |
| `LOGIN-RELIABILITY-001` | Fix / Google sign-in must visibly initiate from the canonical local origin | `NEEDS VERIFICATION`: real initiation reaches Google after the stopped web service was restored; callback/session and Will acceptance remain not run | Current recovery request; [#62](https://github.com/wolney8/OpenForge/issues/62) |
| `PD-FIX-229`, `PD-FIX-230` | Fix / durable local sessions and stale-session race protection | `COMPLETE locally`; prior automated evidence retained at `f65eb689`; local sign-in initiation is restored, while callback/session and Will acceptance remain `NOT RUN` | [Correction register](hosted-approval-session-consistency-correction.md); [#62](https://github.com/wolney8/OpenForge/issues/62) |
| `NOTIFICATION-FIX-001` | Fix / clear remains cleared across persistence, refetch, navigation, and session changes | `COMPLETE locally`; prior automated evidence retained at `f65eb689`; Will acceptance is `BLOCKED` because no actionable notification exists and the isolated real-persistence runner is self-cleaning rather than a persistent manual environment; hosted/normal-use acceptance remains pending | Notification contract; [#99](https://github.com/wolney8/OpenForge/issues/99); [#90](https://github.com/wolney8/OpenForge/issues/90) records the separate history boundary |
| `NOTIFICATION-HISTORY-001` | Feature / retain cleared, read, and completed events after their source disappears | `NOT STARTED`; requires an approved durable event-store/migration boundary | Current recovery request; [#90](https://github.com/wolney8/OpenForge/issues/90) |
| `NOTIFICATION-LAYOUT-001` | Visual fix / keep Notification History Search, Type, Status, and actions contained, with Search/Type/Status aligned independently of the action row | `NEEDS VERIFICATION` at `630bde8`; focused alignment/containment/theme evidence passed and Will reports the correction “looks better”; #100 remains open and no session/notification acceptance is inferred | Supplied screenshots and acceptance criteria; [#100](https://github.com/wolney8/OpenForge/issues/100), related bounded review [#92](https://github.com/wolney8/OpenForge/issues/92) |
| `LOCAL-RUNTIME-HANDOFF-001` | Operational fix / leave canonical local web/API services available independently of disposable test sessions | `NEEDS VERIFICATION`; stop cause remains unknown; normal named web/API sessions, commands, and final observed health are documented, but future process lifetime requires the next handoff check | Current correction request; [#101](https://github.com/wolney8/OpenForge/issues/101) |
| `PD-FUTURE-019` | Feature / payout-derived reference odds inside Profit Boost | `COMPLETE locally` at `b92728b9`; the Fund Manager Standard calculator now also consumes temporary total-return and profit-only derivations without persisted provenance. User/hosted acceptance remains pending | Profit Boost contracts; [#83](https://github.com/wolney8/OpenForge/issues/83) |
| `PAYOUT-HELPER-TEST-001` | Defect triage / explain the empty-input browser-test failure | `NOT STARTED`; do not infer a product defect until reproduced | Current tracking request; [#83](https://github.com/wolney8/OpenForge/issues/83) |
| `PD-FUTURE-020` | Feature / strict complete-string validation for Sportsbook odds | `COMPLETE locally` at `352caf4`; scope is Sportsbook only | Sportsbook contracts/fixtures; [#83](https://github.com/wolney8/OpenForge/issues/83) |
| `PD-FUTURE-021` | Feature / field-specific money/rate validation | `NOT STARTED` | Current functional-batch decision; [#91](https://github.com/wolney8/OpenForge/issues/91) |
| `PD-FUTURE-022` | Feature / strict numerical input across calculator/form surfaces | `PARTIAL`: Sportsbook slice only; every other approved surface remains pending | Current functional-batch decision; [#91](https://github.com/wolney8/OpenForge/issues/91) |
| `PD-FUTURE-001`–`PD-FUTURE-018`, `REQUEST-COVERAGE-001` | Coverage recovery / preserve original future requests | `COVERAGE GAP`: no original requirement text was found in tracked files or Git history; do not reconstruct it from numbering | Original source unavailable; recovery tracked in [#102](https://github.com/wolney8/OpenForge/issues/102) |
| `FOUNDER-IMPORT-BASELINE-001` | Regression baseline / preserve the accepted Founder workbook import and both reconciliation gates | `ONGOING SAFETY BASELINE`; no import or feature expansion is authorized by the tracking entry | Founder onboarding/import contracts and synthetic September controls; [#104](https://github.com/wolney8/OpenForge/issues/104) |
| `ACCOUNT-AUDIT-001` | Feature / server-authored balance-change timestamps with audit-safe correction | `NOT STARTED` | Workbook lessons audit; [#85](https://github.com/wolney8/OpenForge/issues/85) |
| `SPORTSBOOK-FREEBET-VERIFICATION-001` | Defect / editor-entry smoke must reach the existing typed bridge | `NEEDS VERIFICATION`: later browser smoke failed before the bridge opened; closed implementation history is retained | Workbook lessons audit; [#49](https://github.com/wolney8/OpenForge/issues/49) |
| `UI-COPY-001`, `UI-CONSISTENCY-001` | Visual / remove redundant “Tracker platform” subtitle and verify composed layout across existing/future surfaces in bounded batches | `PARTIAL`: Notification History, Early Payout hierarchy and current calculator dense-row/copyable-stake patterns are checked. The shared icon-only primitive now centres copy and check glyphs within one stable 44px target. Remaining search/filter/action toolbars and repeated form/header layouts stay unchecked; no app-wide compliance claim. | [UI audit backlog](../agent-contracts/plum-duff-ui-audit-backlog.md); [#92](https://github.com/wolney8/OpenForge/issues/92) |
| `FINANCIAL-MOTION-001` | Presentation / true shared digit odometer for read-only signed money | `IN PROGRESS`: shared `FinancialValue` preserves static geometry and canonical clipboard text. Compact ledger cells now isolate its canonical/punctuation/digit typography from broad table descendant rules and use natural inline width, with rendered positive and accounting-negative Casino coverage. The nearest semantic card/row group coordinates all contained values; pointer entry and re-entry obey the persisted delay, while every explicit click replays immediately and restarts that delay. Nested groups remain isolated. Sign/width-stable zero-digit origins, neutral static `£ -`, persisted On/Off and 1.5-second/520ms/80ms timing defaults remain. User/hosted acceptance and prospective new-surface adoption remain open. | [Presentation contract](../contracts/financial-value-presentation-contract.md); [fixture spec](../fixture-specs/financial-value-presentation-fixture-spec.md); [#105](https://github.com/wolney8/OpenForge/issues/105) |
| `FINANCIAL-CHART-MOTION-001` | Presentation / pie, donut, progress and graph sweep/reveal under the shared motion preference | `IN PROGRESS`: Dashboard Target Progress, grouped Module Mix bars, Operational Focus ring, peer bars and selected-range line/area graph use shared primitives. Chart travel is deliberately slower than digit rolling, coordinates with card FinancialValues, settles without idle effects, and obeys persisted motion Off/reduced motion. All Dashboard financial/chart cards now own a nearest replay group; local rendered browser automation passed and user/hosted acceptance remains open | [Presentation contract](../contracts/financial-value-presentation-contract.md); [fixture spec](../fixture-specs/financial-value-presentation-fixture-spec.md); [#110](https://github.com/wolney8/OpenForge/issues/110) |
| `ACCOUNT-FIXTURE-ISOLATION-001` | Defect / remove timestamped synthetic Account fixtures from normal local Profile selectors and keep E2E writes isolated | `COMPLETE locally`: exact E2E name provenance identified; 315 fixture Accounts, 162 unreferenced fixture catalogue rows and test-only dependants removed transactionally after a private backup; normal Account authority remains persisted Profile Accounts with catalogue resolution; isolated browser/API execution proved the normal database checksum unchanged | [#107](https://github.com/wolney8/OpenForge/issues/107) |
| `ACCOUNT-OPTION-RAIL-001` | UI / bounded quick-select rails with full authoritative access retained | `PARTIAL locally`: Extra Places bookmaker/win/place exchange rails rank the saved selection, latest same-workflow use, latest other persisted activity, positive balances and then canonical ties. All Extra Places quick-select groups show at most three choices with keyboard paging only when needed; authoritative selects retain every eligible Account. Standalone Place Terms now uses content-aware, wrapping labels and arrow paging without changing non-Account canonical ordering. Other Account-backed consumers remain rollout scope | [#108](https://github.com/wolney8/OpenForge/issues/108) |
| `ACCOUNTS-IMPORT-ACCESS-001` | Import gap / preserve lifecycle, stake access and promo access as distinct semantics | `NOT STARTED`: September `Stake Access` and `Promo Access` columns are present but absent from `ACCOUNT_SOURCE_MAP`; target is restriction/access metadata without changing lifecycle. Exact vocabulary/provenance and historical `LastPromoUsed` fallback need a focused decision because current ledgers may not reconstruct pre-platform history | [Accounts field map](../contracts/accounts-import-field-map-contract.md); [#109](https://github.com/wolney8/OpenForge/issues/109) |
| `ACCOUNT-CAPABILITY-INTELLIGENCE-001` | Feature / restricted-account profitability and explicit capability evidence | `DEFERRED`; the #88 adapter does not implement the broader evidence engine | [#82](https://github.com/wolney8/OpenForge/issues/82) |
| `ACCOUNT-BALANCE-HISTORY-001` | Feature / Account reconciliation, balance history, freshness and trends | `QUEUED after calculator work`; no implementation in this correction | [#106](https://github.com/wolney8/OpenForge/issues/106), related [#85](https://github.com/wolney8/OpenForge/issues/85) |
| `FINANCIAL-ANALYTICS-EXPLORER-001` | Feature / interactive Profile and authorised combined financial time-series and reusable Reports chart explorer | `PLANNED`; first slice is a point-aware Selected Range Performance P&L chart, followed by one period-P&L Reports preset and then a contract-backed metric/granularity/filter model. Realised P&L, cash movements, retained profit, bankroll/investment and Account balance observations remain distinct; #106 supplies Account balance history only after its observation source exists. User-created preset persistence needs a later decision against current loadout/filter storage. No implementation in this capture tranche | [#111](https://github.com/wolney8/OpenForge/issues/111); separate data-source work [#106](https://github.com/wolney8/OpenForge/issues/106) |
| `FUND-MANAGER-TASK-DECK-001` | Feature / daily and weekly decision-support deck | `QUEUED`: Complete, Ignore/Skip and No/Low Value dispositions; routine, reload, free-to-play and Account-review tasks; structured reasons/due cadence; later ranking from explicit Profile history/feedback; never autonomous bet placement | [#86](https://github.com/wolney8/OpenForge/issues/86) |
| `REPOSITORY-MAINTENANCE-001` | Maintenance / route canonical instructions/evidence and inspect the literal `-` folder before cleanup | `NOT STARTED`; no bulk deletion or speculative consolidation | Current tracking request; [#93](https://github.com/wolney8/OpenForge/issues/93) |
| `REBRANDING-DECISION-001` | Product decision / defer any further rename until a name is selected | `DEFERRED`; preserve compatibility identifiers | Current tracking request; decision [#103](https://github.com/wolney8/OpenForge/issues/103); historical implementation [#65](https://github.com/wolney8/OpenForge/issues/65) |
| `WORKBOOK-RUNTIME-001`, `WORKBOOK-HOSTED-001`, `PROFILE-EXPORT-ELIGIBILITY-001` | Verification / Google smoke, hosted template delivery, and specific current-Profile eligibility | `DEFERRED`; local structural evidence does not prove these environments | Portability acceptance; [#94](https://github.com/wolney8/OpenForge/issues/94) |
| `WORKBOOK-MERGE-DESIGN-001` | Design / three-way workbook/Profile comparison without merge writes | `DESIGN ONLY` | Portability decision; [#95](https://github.com/wolney8/OpenForge/issues/95) |
| `WORKBOOK-PRODUCT-DECISIONS-001` | Product decision / classify useful workbook KPI and formula workflows | `NOT STARTED` | Workbook lessons audit; [#97](https://github.com/wolney8/OpenForge/issues/97) |
| `SECURITY-CREDENTIAL-ROTATION-001` | Security / rotate the exposed OAuth secret separately without publishing either value | `NOT STARTED`; does not block local login restoration | Current tracking request; [#96](https://github.com/wolney8/OpenForge/issues/96) |
| `PROJECT-STATUS-001` | Delivery / keep one discoverable current-state, plan, issue, and smoke entry point | `COMPLETE locally`; routine end-of-batch updates remain part of delivery | Current tracking request; [#98](https://github.com/wolney8/OpenForge/issues/98) |

## Coverage matrix

| Area | Recommended milestone | Local contract evidence | Fixture evidence | GitHub state |
|---|---|---|---|---|
| Ledger modal parity and guided access | M15 Platform Experience | `docs/agent-contracts/plum-duff-ledger-modal-parity-contract.md`, `docs/workflows/guided-entry-focus-workflow-contract.md` | `tests/fixtures/guided-entry-focus-fixtures.json`, modal Playwright specs | #61 implementation, automated checks and Fund Manager smoke test passed 2026-08-23; public issue remains open pending authenticated closure |
| Notification consistency | M15 Platform Experience | `docs/workflows/fund-manager-notification-centre-workflow-contract.md` | `tests/fixtures/fund-manager-notification-centre-fixtures.json` | `NOTIFICATION-FIX-001` COMPLETE locally 2026-09-06: durable clear tombstones are monotonic and user-scoped; current source history distinguishes cleared items; failed/stale writes cannot present a false clear. Focused API 16/16, notification client 17/17, browser 8/8 and isolated authenticated browser/API 1/1 passed. Hosted/user acceptance is [#99](https://github.com/wolney8/OpenForge/issues/99); complete durable history after a source lifecycle cutoff is [#90](https://github.com/wolney8/OpenForge/issues/90). |
| Repository and agent-context cleanup | Maintenance | `AGENTS.md` and existing routed contracts/working notes | Focused reference/build/test checks required per approved candidate | [#93](https://github.com/wolney8/OpenForge/issues/93): deferred bounded audit; inspect the literal `-` folder before any later removal. No bulk cleanup. |
| Product rebranding | Future product decision | Existing compatibility identifiers remain authoritative | Migration fixtures required after a name is selected | [#103](https://github.com/wolney8/OpenForge/issues/103): deferred until the name is selected. No mass renaming of paths, schemas, storage keys, selectors, APIs, contracts or export identifiers. |
| Full financial report review | M7 Reporting and Import/Export, M10 Fee Visibility | `docs/contracts/cross-profile-reporting-contract.md`, `docs/contracts/dashboard-selected-range-pnl-contract.md`, `docs/contracts/retained-profit-reporting-contract.md`, `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md` | reporting and fee fixture packs under `tests/fixtures/` | Historical scope is [#11](https://github.com/wolney8/OpenForge/issues/11) (closed); any demonstrated remaining defect requires its own open follow-up. |
| Standalone calculator workspace | M14 Calculator Workspace | `docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md`, sportsbook/free-bet/casino calculation contracts | `tests/fixtures/calculator-workspace-ledger-bridge-fixtures.json`, calculator fixture packs | Open scope is [#35](https://github.com/wolney8/OpenForge/issues/35), [#36](https://github.com/wolney8/OpenForge/issues/36), and [#37](https://github.com/wolney8/OpenForge/issues/37). |
| Subscriber registration and funding review | M9 Subscriber Access | `docs/contracts/subscriber-registration-and-funding-review-contract.md` | `tests/fixtures/subscriber-registration-and-funding-review-fixtures.json` | [#74](https://github.com/wolney8/OpenForge/issues/74) |
| Subscriber account self-management | M9 Subscriber Access | `docs/workflows/subscriber-access-and-visibility-workflow-contract.md`, `docs/contracts/subscriber-fee-aware-earnings-contract.md` | `docs/fixture-specs/subscriber-access-control-fixture-spec.md`, `docs/fixture-specs/subscriber-fee-aware-earnings-fixture-spec.md` | Open planning/fixture scope is [#14](https://github.com/wolney8/OpenForge/issues/14)–[#18](https://github.com/wolney8/OpenForge/issues/18); related preferences are [#73](https://github.com/wolney8/OpenForge/issues/73). |
| Platform billing and Fund Manager finance | M10 Fee Visibility or later Billing milestone | `docs/contracts/fund-manager-platform-finance-contract.md` | `tests/fixtures/fund-manager-platform-finance-fixtures.json` | Historical fee-withdrawal scope is [#23](https://github.com/wolney8/OpenForge/issues/23) (closed); no new unresolved defect is asserted by this matrix row. |
| Fund Manager OAuth and account self-management | M5 Login Profiles Tracker Shell | `docs/contracts/fund-manager-authentication-contract.md` | `tests/fixtures/fund-manager-authentication-fixtures.json` | [#62](https://github.com/wolney8/OpenForge/issues/62) |
| Neon cutover and local-first backup hardening | M5 Login Profiles Tracker Shell or deployment milestone | `docs/contracts/local-database-cloud-backup-contract.md`, `docs/fund-managers/neon-local-first-cutover-and-recovery.md`, `docs/deployment/vercel-neon-dev-target.md`, `docs/deployment/neon-runtime-tranche-01.md` | `tests/fixtures/local-database-cloud-backup-fixtures.json` | [#75](https://github.com/wolney8/OpenForge/issues/75) |
| Founder profile onboarding and operational workbook migration | M17 Database Runtime, Neon Cutover and Recovery Hardening | `docs/workflows/founder-profile-onboarding-and-operational-migration-workflow-contract.md`, `docs/planning/founder-operational-migration-readiness.md` | `docs/fixture-specs/founder-profile-onboarding-and-operational-migration-fixture-spec.md` | Accepted implementation baseline and ongoing regression protection are mapped to [#104](https://github.com/wolney8/OpenForge/issues/104). |
| Public offer source ingestion | Future sourcing/intelligence milestone | `docs/contracts/public-offer-source-ingestion-contract.md` | `docs/fixture-specs/public-offer-source-ingestion-fixture-spec.md` | Contract [#67](https://github.com/wolney8/OpenForge/issues/67); implementations [#79](https://github.com/wolney8/OpenForge/issues/79) and [#87](https://github.com/wolney8/OpenForge/issues/87). |
| Profit Boost workflow parity | M14 Calculator Workspace or sportsbook enhancement milestone | `docs/contracts/sportsbook-profit-boost-contract.md`, `docs/calculation-contracts/sportsbook-profit-boost-calculation-contract.md` | `docs/fixture-specs/sportsbook-profit-boost-fixture-spec.md` | [#83](https://github.com/wolney8/OpenForge/issues/83), assigned to M14; original full scope remains open |
| Strict numerical entry and payout odds helper | M14 Calculator Workspace or sportsbook enhancement milestone | `sportsbook-odds-input-v1` in the Sportsbook lifecycle contract; `sportsbook-payout-odds-helper-v1` in the Profit Boost calculation contract | `tests/fixtures/sportsbook-odds-input-fixtures.json`; `tests/fixtures/sportsbook-payout-odds-helper-fixtures.json` | `PD-FUTURE-019`, `PD-FUTURE-020`, and the Sportsbook slice of `PD-FUTURE-022` implemented locally. `PD-FUTURE-021` and other form surfaces remain pending in [#91](https://github.com/wolney8/OpenForge/issues/91). |
| Multi-fixture, outright and long-duration sportsbook workflow | M14 Calculator Workspace or later sportsbook expansion | `docs/workflows/sportsbook-multi-fixture-and-outright-workflow-contract.md` | `docs/fixture-specs/sportsbook-multi-fixture-and-outright-fixture-spec.md` | [#84](https://github.com/wolney8/OpenForge/issues/84) |
| Account quick popup and bookmaker hygiene | M6 Account Intelligence or future account-management milestone | `docs/workflows/account-quick-popup-workflow-contract.md`, `docs/contracts/account-health-intelligence-contract.md` | `docs/fixture-specs/account-quick-popup-fixture-spec.md` | [#85](https://github.com/wolney8/OpenForge/issues/85) |
| In-app route guards and unsaved-state handling | M15 Platform Experience | `docs/workflows/in-app-route-guard-and-unsaved-state-workflow-contract.md` | `docs/fixture-specs/in-app-route-guard-and-unsaved-state-fixture-spec.md` | [#81](https://github.com/wolney8/OpenForge/issues/81) |
| Template-driven ledger Quick Add | M13 Common Bet Combos, M15 Platform Experience | `docs/workflows/ledger-quick-add-workflow-contract.md`, `docs/workflows/casino-offer-workflow-contract.md` | `docs/fixture-specs/ledger-quick-add-fixture-spec.md` | Historical Common Bet Combos are [#32](https://github.com/wolney8/OpenForge/issues/32) (closed); open multi-Profile Quick Add scope is [#77](https://github.com/wolney8/OpenForge/issues/77). |

## Recommended issue bodies

### Founder profile onboarding and operational workbook migration

Title:

`Onboard Founder Profile and Safely Migrate the Operational Workbook`

Milestone:

`M17 Database Runtime, Neon Cutover and Recovery Hardening`

Body:

```md
## Objective

Allow the Fund Manager to create their own operational profile, configure its account/module
authority, then dry-run and reconcile the current workbook before a controlled import and shadow
operation.

## Scope

- Founder-only profile onboarding using the existing profile model.
- Module enablement: Sportsbook, Free Bets and Cash Adjustments always on; Casino and Extra Place
  profile-toggleable.
- Profile-account authority, opening values, restrictions and Quick Add Loadout overrides.
- Per-ledger importer mapping, staged review, verified pre-import backup, explicit approval and
  reconciliation.
- Two-week workbook/Plum Duff shadow-run acceptance gate.

## Gates

- Hosted writes require the approved Neon runtime cutover (`#75`), with no SQLite fallback.
- Hosted profile/import endpoints require owner authentication (`#62`).
- Real workbook data is not committed; fixture coverage remains synthetic.

## Contract and fixtures

- `docs/workflows/founder-profile-onboarding-and-operational-migration-workflow-contract.md`
- `docs/fixture-specs/founder-profile-onboarding-and-operational-migration-fixture-spec.md`
- existing ledger import map/reconciliation contracts

## Acceptance criteria

- Founder can configure a profile without bypassing global account authority.
- Dry run retains unknown columns and detects row-count/control-total variances.
- Import requires verified backup and explicit approval.
- Cross-profile access is denied server-side.
- Real-data migration is blocked until Neon persistence and owner authentication are verified.
```

### Template-driven ledger Quick Add

Title:

`Add Template-Driven Ledger Quick Add Starting With Casino Free Spins`

Milestone:

`M13 Common Bet Combos` with `M15 Platform Experience` UX dependency

Body:

```md
## Objective

Add a compact, template-driven quick-add path beside ledger Add Row actions, starting with a
no-deposit Casino Free Spins record.

## Scope

- Add a Quick Add entry beside Casino Offers Add Row.
- Free Spins template: profile-valid bookmaker, optional offer/game, spin count, spin stake and
  confirmed converted win amount.
- Persist the confirmed converted win as the explicit Casino final net result for this zero-own-
  cash template.
- Provide a no-return `£ 0.00` shortcut and a More details path into the normal editor.
- Reuse Common Bet Combos as the Fund Manager-owned template authority; do not add a second
  template store.
- Define later candidate templates without implementing uncontracted casino EV/wager logic.

## Exclusions

- No wagering, RTP, EV, cashback, refund or deposit-bonus calculation changes.
- No bookmaker automation or account creation.

## Contract and fixtures

- `docs/workflows/ledger-quick-add-workflow-contract.md`
- `docs/fixture-specs/ledger-quick-add-fixture-spec.md`
- `docs/contracts/casino-offer-resolved-value-contract.md`

## Acceptance criteria

- Quick Add uses profile account authorities and preserves normal ledger persistence.
- Converted win is visibly confirmed before save and produces the expected resolved value.
- More details pre-fills but does not save.
- Save/loading/error/keyboard/dialog geometry follow the ledger modal parity contract.
- Focused unit and Playwright tests cover valid, zero and invalid paths.
```

### Notification consistency and preferences

Title:

`Standardise Fund Manager Notifications, Preferences and Action Routing`

Milestone:

`M15 Platform Experience`

Body:

```md
## Objective

Make Fund Manager notifications behave like a consistent web-app notification system across all
routes.

## Scope

- Review all current notification triggers.
- Confirm timings for reminder stages: created, due day, 4 hours before, 2 hours before.
- Ensure notifications use consistent card templates, context copy, unread dots, done/new states and
  profile-scoped links.
- Add Fund Manager settings for enabling/disabling individual notification sources.
- Ensure task notifications route to the correct profile, ledger, row and filtered context.
- Ensure notification read/done/clear behaviour matches the contract.

## Contract and fixtures

- `docs/workflows/fund-manager-notification-centre-workflow-contract.md`
- `docs/fixture-specs/fund-manager-notification-centre-fixture-spec.md`
- `tests/fixtures/fund-manager-notification-centre-fixtures.json`

## Acceptance criteria

- Notifications are available from the top bar on all Fund Manager routes.
- Reminder threshold behaviour does not duplicate notification cards.
- Read notifications keep the active bell without a red badge.
- Done tasks remain in Done until their related lifecycle cutoff.
- Preferences hide disabled notification sources without mutating source ledger data.
- Playwright coverage confirms routing, unread badge, Done/New toggle, preferences and viewport fit.
```

### Role-scoped notification security and subscriber delivery

Title:

`Deliver Role-Scoped Notifications to Subscriber Profiles`

Milestone:

`M9 Subscriber Access`

Body:

```md
## Objective

Add subscriber-safe notifications without exposing Fund Manager operational work or another
profile's records.

## Scope

- Add authenticated subscriber notification delivery scoped to the signed-in profile only.
- Enforce `audience` and `security_tag` server-side for every notification source.
- Permit a subscriber item only when it is `subscriber_allowed` and belongs to that profile.
- Add subscriber notification preferences separate from Fund Manager preferences.
- Define subscriber-safe source copy and links; Fund Manager-only tasks such as backup and
  partial-lay management remain excluded.

## Contract and fixtures

- `docs/workflows/fund-manager-notification-centre-workflow-contract.md`
- `docs/fixture-specs/fund-manager-notification-centre-fixture-spec.md`
- `tests/fixtures/fund-manager-notification-centre-fixtures.json`

## Acceptance criteria

- Cross-profile and Fund Manager-only notifications cannot be returned by any subscriber endpoint.
- Server-side authorization is tested; client filtering is not the authorization mechanism.
- Subscriber preferences do not affect Fund Manager notifications or source ledger data.
- Notification templates disclose only subscriber-approved fields.
```

### Full financial reports review

Title:

`Audit Financial Reporting Values Across Dashboards, Reports and Profile Summaries`

Milestone:

`M7 Reporting and Import/Export`

Body:

```md
## Objective

Perform a full financial review so dashboard, ledger stat cards, top-bar summaries, formal reports
and profile summaries use the same date-range and cash-first source logic.

## Scope

- Verify selected-range P&L, resolved value, current value, final value, liability, account cash,
  retained profit and fee fields.
- Confirm when date ranges affect displayed rows versus all-date issue views.
- Ensure profile summary values match the same ledger summary engine.
- Reconcile weekly, monthly and yearly reports with the same row inclusion rules.
- Document any intentional difference between tracker dashboard values and formal reports.

## Contract and fixtures

- `docs/contracts/cross-profile-reporting-contract.md`
- `docs/contracts/dashboard-selected-range-pnl-contract.md`
- `docs/contracts/retained-profit-reporting-contract.md`
- `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md`
- relevant reporting fixtures in `tests/fixtures/`

## Acceptance criteria

- Changing tracker range updates ledger stat cards, profile dashboard, top bar and reports consistently.
- Report totals reconcile to deterministic fixtures.
- Issue-filter views clearly show when they are all-date operational views.
- No user-visible financial value exists without a contract-backed source and test.
```

### Standalone calculator workspace

Title:

`Build Standalone Calculator Workspace From Ledger Calculator Components`

Milestone:

`M14 Calculator Workspace`

Body:

```md
## Objective

Expose Plum Duff calculators outside ledger edit modals while reusing the same contract-backed
calculator components.

## Scope

- Add standalone calculators for Standard, Underlay, Overlay, Custom Lay and Multi Lay.
- Add Profit Boost modes for percentage boost and displayed boosted odds.
- Reuse ledger calculator formula helpers and financial formatting.
- Add bridge actions that can create draft sportsbook/free-bet rows only after required profile and
  account context is supplied.
- Keep specialist calculators such as Extra Places, Each Way, 2UP, Sequential Lay and Accumulator
  behind their own contract gates.

## Contract and fixtures

- `docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md`
- `docs/fixture-specs/calculator-workspace-ledger-bridge-fixture-spec.md`
- `tests/fixtures/calculator-workspace-ledger-bridge-fixtures.json`
- `docs/calculation-contracts/sportsbook-profit-boost-calculation-contract.md`
- sportsbook/free-bet current-value fixture packs

## Acceptance criteria

- Standalone outputs match ledger calculator outputs for the same inputs.
- Calculator workspace cannot silently place bets.
- Bridge creates drafts only and preserves profile/account validation.
- All financial outputs use Plum Duff accounting formatting and colour rules.
```

### Subscriber registration and funding review

Title:

`Implement Subscriber Registration, Document Review and Funding Request Workflow`

Milestone:

`M9 Subscriber Access`

Body:

```md
## Objective

Allow prospective subscribers to submit registration information for Fund Manager review without
creating active profiles automatically.

## Scope

- Add registration form and Fund Manager review queue.
- Capture demographics, contact details, safe document metadata and self-funding amount.
- Support optional Fund-Manager-provided float request as a checkbox and requested amount.
- Keep funding approval, recovery policy and profile activation Fund Manager-controlled.
- Keep uploaded document storage private and out of public assets.

## Contract and fixtures

- `docs/contracts/subscriber-registration-and-funding-review-contract.md`
- `docs/fixture-specs/subscriber-registration-and-funding-review-fixture-spec.md`
- `tests/fixtures/subscriber-registration-and-funding-review-fixtures.json`

## Acceptance criteria

- Subscriber cannot self-activate a profile.
- Fund Manager can approve, decline or request more information.
- Funding model is explicit and auditable.
- Document fixtures contain metadata only, never raw files.
```

### Subscriber account self-management

Title:

`Add Subscriber Account Self-Management and Visibility Controls`

Milestone:

`M9 Subscriber Access`

Body:

```md
## Objective

Prepare subscriber-facing account areas without exposing Fund Manager-only analytics, fees,
platform finance or cross-profile data.

## Scope

- Define subscriber account settings, profile visibility and self-service boundaries.
- Allow subscriber-safe updates only where contract-approved.
- Add visibility controls for reports, fees, notifications and profile details.
- Keep Fund Manager-only fields default hidden.

## Contract and fixtures

- `docs/workflows/subscriber-access-and-visibility-workflow-contract.md`
- `docs/contracts/subscriber-fee-aware-earnings-contract.md`
- `docs/fixture-specs/subscriber-access-control-fixture-spec.md`
- `docs/fixture-specs/subscriber-fee-aware-earnings-fixture-spec.md`

## Acceptance criteria

- Subscriber routes are profile-scoped and default-deny cross-profile data.
- Subscriber-visible earnings are fee-aware where applicable.
- Fund Manager-only notes, platform finance and internal controls remain hidden.
```

### Platform billing and Fund Manager finance

Title:

`Implement Fund Manager Platform Finance and Billing Records`

Milestone:

`M10 Fee Visibility` or new `Platform Billing`

Body:

```md
## Objective

Track platform-level billing and finance without changing profile tracker P&L.

## Scope

- Add Fund Manager-only platform finance records.
- Support subscription payments, discounts, refunds, chargebacks, processor fees, owner drawings,
  owner contributions, expenses and reconciliation states.
- Keep platform finance separate from profile cash-first tracker values.
- Defer live payment-provider integration until provider and security policy are approved.

## Contract and fixtures

- `docs/contracts/fund-manager-platform-finance-contract.md`
- `docs/fixture-specs/fund-manager-platform-finance-fixture-spec.md`
- `tests/fixtures/fund-manager-platform-finance-fixtures.json`

## Acceptance criteria

- Platform finance entries do not alter sportsbook, free-bet, casino or cash-adjustment P&L.
- Subscriber cannot access platform finance.
- Refunds, chargebacks and corrections are audited.
- Annual subscriptions support deferred recognition.
```

### Fund Manager OAuth and self-management

Title:

`Add Optional Fund Manager Google OAuth and Account Self-Management`

Milestone:

`M5 Login Profiles Tracker Shell`

Body:

```md
## Objective

Add optional Google OIDC login and basic Fund Manager account self-management while preserving
local-first recovery login.

## Scope

- Add optional Google OIDC sign-in for linked Fund Manager identities.
- Keep local login available as the recovery path.
- Add account self-management for name, email display, linked identity status and logout.
- Do not add public sign-up in this issue.

## Contract and fixtures

- `docs/contracts/fund-manager-authentication-contract.md`
- `docs/fixture-specs/fund-manager-authentication-fixture-spec.md`
- `tests/fixtures/fund-manager-authentication-fixtures.json`

## Acceptance criteria

- Unlinked Google identity is denied.
- Local login remains usable when Google is unavailable.
- Logout clears the Plum Duff session.
- Tests use a stub OIDC provider, not live Google.
```

## Additional draft issues from the 2026-08-20 outage handover

These are intentionally deferred unless another task explicitly reprioritises them.

### Extra Places ledger and calculator

Title:

`Implement Each Way / Extra Places Ledger, Calculator and Settlement Workflow`

Milestone:

`M14 Calculator Workspace` or future advanced sportsbook milestone

Body:

```md
## Objective

Add a dedicated Each Way / Extra Places ledger flow, calculator and settlement vocabulary.

## Scope

- Implemented: profile-scoped API/persistence, two-step row editor, cash-first calculation engine,
  deterministic MBB/EP Catcher fixtures, historical import handling, selected-range reporting,
  dashboards, formal reports, bookmaker breakdowns and cross-profile reporting.
- Implemented locally: account-authority bookmaker/exchange choices, configured preferred-exchange
  defaulting, and a bounded account-health adapter. New use blocks hard access states, keeps Pending
  Sign Up planning-only, warns without blocking Soft Limited, allows Bonus Restricted, and retains
  explicit Extra Places capability as `NotChecked`. Existing imported historical rows remain
  accessible; focused automated evidence is recorded under GitHub #88.
- Remaining: the full capability/evidence engine remains [#82](https://github.com/wolney8/OpenForge/issues/82). Rule 4, dead heat and changed-terms
  settlement branches remain explicitly deferred. Standalone calculator work remains separately
  queued under #35-#38 and is not folded into #88.

## Contract and fixtures

- `docs/contracts/each-way-extra-place-ledger-contract.md`
- `tests/fixtures/each-way-extra-place-fixtures.json`

## Acceptance criteria

- The ledger/editor follows the established modal system and requires a later parity smoke test.
- Current value and settlement branches match deterministic fixtures.
- Each Way and Extra Place use one cash-first calculation engine.
```

### Sportsbook multi-fixture, outright and long-duration offers

Title:

`Support Multi-Fixture, Outright and Long-Duration Sportsbook Offers`

Milestone:

`M14 Calculator Workspace` or future sportsbook expansion milestone

Body:

```md
## Objective

Track sportsbook offers that span multiple fixtures, outright markets or uncertain end dates
without forcing them into single-fixture assumptions.

## Scope

- Add setup support for multi-fixture, outright and tournament-long offers.
- Support start date plus estimated finish where a single settle datetime is not yet known.
- Preserve overdue/unsettled operational visibility when a bookmaker delays settlement.
- Support free-bet urgency for same-day festival chains where a returned or voided free bet must be
  reused quickly.

## Contract requirement

Contract and fixtures now exist:

- `docs/workflows/sportsbook-multi-fixture-and-outright-workflow-contract.md`
- `docs/fixture-specs/sportsbook-multi-fixture-and-outright-fixture-spec.md`

Follow-up implementation still needs:

- row setup shape wired into the editor
- current-value rules while long-duration exposure remains open
- settlement and void/returned branches
- overdue and reminder behaviour
```

### Profile account quick-management popup

Title:

`Add Profile Account Quick-Management Popup and Bookmaker Reconciliation Workflow`

Milestone:

`M6 Account Intelligence` or future account-management milestone

Body:

```md
## Objective

Let the Fund Manager inspect and update a profile-specific bookmaker/exchange account from the
ledger context without leaving the workflow.

## Scope

- Open an account quick panel from bookmaker references in ledgers and row modals.
- Show current balance, promo status, support/live-chat status, bet counts and offer counts for the
  selected range.
- Allow fast balance confirmation/update and account-status edits.
- Add a related quick-settle path for multiple overdue rows from the same bookmaker.

## Contract requirement

Contract and fixture coverage now exists:

- `docs/workflows/account-quick-popup-workflow-contract.md`
- `docs/fixture-specs/account-quick-popup-fixture-spec.md`

Implementation still needs:

- safe editable fields wired into the popup
- balance adjustment rules
- profile isolation checks
- quick-settle action boundaries
```

### Fund Manager decision-support task deck

Title:

`Add Fund Manager Decision-Support Task Deck for Recurring Operational Work`

Milestone:

`M12 Target Decision Engine`

Body:

```md
## Objective

Surface recurring matched-betting operational tasks for the Fund Manager based on profile history,
seasonality and current ledger state.

## Scope

- Suggest daily and weekly operational tasks such as balance confirmation, expiry checks, reload
  review and account-health follow-up.
- Keep all suggestions advisory only.
- Integrate with reminders and notification routing where contract-approved.

## Contract requirement

No implementation until an explicit decision-support contract defines:
- allowed signals
- recommendation boundaries
- no-autonomy guarantees
- notification and task presentation rules
```

### Public offer ingestion and Discord sources

Title:

`Expand Public Offer Source Ingestion for Reload Sites and Discord Feeds`

Milestone:

`Future sourcing/intelligence milestone`

Body:

```md
## Objective

Expand the approved source-ingestion system so Plum Duff can safely catalogue public reload/welcome
offers and optional community feed inputs.

## Scope

- Extend approved source ingestion beyond the initial public-offer contract.
- Consider Oddschecker reload/welcome pages and Discord feed intake only after source, legal and
  operational approval.
- Tag related risk-team/group relationships for bookmaker families without exposing unsafe scraping.

## Contract and fixtures

- `docs/contracts/public-offer-source-ingestion-contract.md`
- `docs/fixture-specs/public-offer-source-ingestion-fixture-spec.md`
- `docs/workflows/public-offer-source-ingestion-addendum.md`
- `docs/fixture-specs/public-offer-source-ingestion-addendum-fixture-spec.md`

## Acceptance criteria

- No live source is consumed without an approved ingestion contract.
- Source records retain provenance, freshness and manual-review state.
- Discord or community feed intake remains advisory and non-autonomous.
```
