# Plum Duff Next Issue Tracking Register

## PD-CALC-UI-PARITY-20260915 — shared calculator reference presentation

| ID | Requested outcome | Current state |
|---|---|---|
| PD-FIX-231 | Put Multi-Lay global controls before Back/Lay content and stack Back Stake/Odds | COMPLETE / PROVEN on desktop, half-width and narrow rendering |
| PD-FIX-232 | Give Multi-Lay the same compact reference-card language as Standard | COMPLETE / PROVEN; native three-leg save/reopen retained |
| PD-FIX-233 | Make Standard Calculator and Bet Type controls readable and properly spaced | COMPLETE / PROVEN without normal-width truncation |
| PD-FIX-234 | Use short headings, contextual help, shorter chevrons and no reference-card `Total` labels | COMPLETE / PROVEN in light/dark, enlarged text and keyboard use |
| PD-FIX-235 | Put direct Copy and the slider inside Custom Lay | COMPLETE / PROVEN; current valid value is copied and plan/actual separation remains |
| PD-FIX-236 | Reuse the rule in standalone, pop-out and Sportsbook/Free Bet calculators | COMPLETE / PROVEN on product `c7d923e`; no formula change |

The explicit `Use Underlay/Overlay plan` controls remain as the necessary saved-plan selector now
that there is no strategy dropdown. They do not copy or confirm an actual exchange fill. GitHub
synchronisation is pending because repository publication is forbidden for this tranche.

PD-FIX-234 and the paragraph above describe the rejected intermediate design; they are retained as
history and superseded by this visual contract:

| ID | Requested outcome | Current state |
|---|---|---|
| PD-FIX-237 | Advanced order is Underlay, Standard, Overlay, Custom/slider, Outcomes | COMPLETE / PROVEN standalone, pop-out and ledger editor |
| PD-FIX-238 | Replace reference chevrons with equal plain four-row summaries | COMPLETE / PROVEN; Outcomes alone retains chevrons/Total |
| PD-FIX-239 | Remove permanent guidance, reference suffixes and Standard-style Apply/Use-plan actions | COMPLETE / PROVEN; help is keyboard-accessible |
| PD-FIX-240 | Put editable Custom stake and direct Copy beside each other above the slider | COMPLETE / PROVEN with stale-copy protection retained |
| PD-FIX-241 | Reflow the shared calculator at half-width, narrow and 200% text | COMPLETE / PROVEN by zero internal overflow on six ledger-editor variants |
| PD-FIX-242 | Preserve Multi-Lay hierarchy without flattening its all-leg allocation semantics | COMPLETE for presentation; allocation actions remain necessary and explicit |

Current product is `8f5dc5876a2830947fbfb79a88a89b4da171858d`; GitHub #35/#92 comments
`5688496018`/`5688496182` record the local-only evidence. No repository publication occurred.

## PD-LOCAL-INTEGRATION-20260915 — one usable normal local application

| ID | Requested outcome | Current state |
|---|---|---|
| PD-LOCAL-001 | Retire synthetic 3040 as Will's application and serve the reviewed stack through normal 3010 sign-in | COMPLETE LOCALLY: 3010/8010 run the integration worktree; 3040/8039 stopped |
| PD-LOCAL-002 | Protect existing local records before additive planning migration | COMPLETE / PROVEN: verified backup, cloned migration twice, restored rollback copy, unchanged old-field fingerprints and null new metadata on historical rows |
| PD-LOCAL-003 | Reconcile the repair stack and assembled Multi-Lay work without flattening unsupported modes | COMPLETE for the reviewed stack; richer Multi-Lay placement/reward modes remain explicitly PARTIAL under PD-FIX-114 |
| PD-LOCAL-004 | Make worktree-served web code use the intended normal database rather than an empty worktree-relative database | COMPLETE at c73b0943 using an explicit local database path; default behaviour is unchanged |
| PD-LOCAL-005 | Integrate the accepted calculator visual contract and resolve the three Multi-Lay ledger route tests | COMPLETE LOCALLY at 2ba9993/eba20ec; Multi-Lay 3/3 PASS and 3010 serves the integrated frontend/API |
| PD-LOCAL-006 | Prevent an old Custom plan or queued autosave returning after Simple/Save | COMPLETE LOCALLY: plan/row strategy patch atomically, slider requires real interaction, manual Save clears older queued autosave |

Normal local application: `http://localhost:3010`, integration head
**eba20ec00e1f88c6bd068a9485a5a132ceb80beb** (product **2ba999326c0c9389185e49517ef9f274afc05bd9**). Main, Vercel, frozen manual data and protected source
branches remain unchanged. The verified pre-migration backup is retained under ignored
`data/private/backups/`; rollback is stop services, restore that backup, and restart the previous
local source. GitHub synchronisation remains pending because repository publication is forbidden in
this tranche.

## PD-CALC-SCREEN-20260915 — exact Standard screen repair

| ID | Requested outcome | Current state |
|---|---|---|
| PD-FIX-115 | Remove the reachable `Actual selected strategy`/Part Lay selector and decimal-rate commission guidance | COMPLETE / PROVEN on current standalone, pop-out, native and converted Normal/SNR paths |
| PD-FIX-116 | Advanced immediately shows Underlay and Overlay, then full-width Custom with its slider, then Outcomes | COMPLETE / PROVEN by DOM order, real rendering and saved-row reopen checks |
| PD-FIX-117 | Match shared chevron endpoints, value/copy columns and full-width outer edges without narrow-screen clipping | COMPLETE / PROVEN at 1280/1440, 720/760 and 390 widths, light/dark and enlarged text |
| PD-FIX-118 | Enter commission as a percentage and preserve canonical ratio once through save/reopen | COMPLETE / PROVEN: visible 2% persists as canonical 0.02; 0%, 5% and 2.125% also pass |

Current product **a8d5c72167c454c9937f24cc58f630294c4cd71f** is local only. The original screenshot came
from an older reachable build; the current source also needed the Custom/slider composition and
standalone label correction. Exact-screen and full native/conversion/placement/settlement/report
browser runs now pass on 3040/8039. Bonus planning, richer Multi-Lay placement and Early Payout
persistence remain queued and were not changed.

## PD-CALC-20260914 — active owner corrections

Current assembled calculator slice adds PD-FIX-111–114 on the local-only
`repair/calculator-corrections-113` branch:

| ID | Requested outcome | Current state |
|---|---|---|
| PD-FIX-111 | Inventory the controls actually rendered by standalone, pop-out, native, converted and existing row paths | COMPLETE / CODE-VERIFIED; family matrix and precise destination gaps are in the current #114 report section |
| PD-FIX-112 | Reuse the richer Multi-Lay planner instead of serving the old restricted native Add Row path | COMPLETE / PROVEN for Normal no-boost/reward Standard/Underlay planning, percentage commissions and save/reopen |
| PD-FIX-113 | Keep Commission (%) semantics consistent across Multi-Lay and neighbouring calculator browser evidence | COMPLETE / PROVEN; old tests using 0.05 as 5% were corrected to enter 5 |
| PD-FIX-114 | Complete every family’s standalone-to-ledger meaning | PARTIAL: Bonus reward-aware plan, Multi-Lay actual per-leg placement/richer persistence and Early Payout full source-state parity remain named contract gaps |

This work does not turn utilities into ledger records, does not alter actual/historical stakes, and
does not change calculator formulae. GitHub #35/#36/#37/#38/#92/#113/#114 sync remains pending
because `gh` is unavailable. No push, main merge, operational migration or deployment is authorised.

Current useful bundle product **85eb33cf790e54b44414d009bbc9b5a836d6f2df**, browser evidence
**be5a013b2d7e6171f69dc412c9733a196cbfa663**,
PostgreSQL harness **4c07d319fb02f0326d2c538df21ddc0b154aa68e**, local only. The approved existing-row metadata
preserves all four Profit Boost sources and conditional Cashback eligibility/cap/confirmed cash or
linked Free Bet receipt across native entry, conversion, save/reopen and portable restore. Copy and
Custom-slider actions update planning only; explicit actual placement controls financial results.
Browser settlement/report evidence distinguishes source, planned, accepted and actual values;
pending credit never becomes cash. C07 and the bounded C08 storage/UI slice are PROVEN on synthetic
SQLite and actual disposable PostgreSQL. A single linked credit ID cannot represent a whole split
award group, and full change-history/import-browser recovery remain tracked.
C05 changed-odds, persisted unmatched-order and multi-fill accounting remain unsupported.
C01 simultaneous cross-window edits and C02 interrupted/pending-confirm variants remain.
Coverage stays46/87,8/24 exercised/passing,15/27 competitors,24/133 requirements.
No normal-app integration, push, operational migration or deployment.
Authenticated review-launch identity guard **e5e75f6552cd53d50817240bce22e5da1490ca08** checks the
separately running frontend and API against the product paths each service actually serves.
GitHub #35/#36/#83/#114 summary sync is pending because `gh` is unavailable locally; the current
audit section is the exact handoff source.

### PD-DELIVERY-20260915 — Profit Boost and conditional Cashback bundle

| Item | User outcome and affected surfaces | Result / evidence / remaining issue |
|---|---|---|
| PB-01 | All four Profit Boost source methods work in native Sportsbook entry and calculator conversion, then save/reopen with source, hedge and accepted odds distinct. | COMPLETE / PROVEN: browser bundle be5a013/product 85eb33c, 70 focused tests and PostgreSQL evidence on 4c07d31 |
| PB-02 | Simple/Advanced planned references, Custom slider and Copy cannot record a placement; real stake/odds/commission require explicit placement. | COMPLETE / PROVEN: representative desktop-light/half-width-dark rendering plus independent database assertions |
| CB-01 | Conditional cash refund keeps eligibility/cap separate from a dated, identified receipt and counts it once at settlement/report. | COMPLETE / PROVEN: £10 eligible, £8 cap/receipt, £6.82 final result |
| CB-02 | Free Bet refund remains linked promotional credit rather than cash, survives supported portable restore and uses award duplicate protection. | COMPLETE for one linked credit / PROVEN API and genuine award regression; split-group link remains UNSUPPORTED |
| UI-01 | Source switching, invalid receipt recovery, saved percentage commission and half-width layout retain state without clipped controls or old results. | COMPLETE / PROVEN scoped; screen-reader execution remains NOT TESTED |
| AUD-01 | Exercise one additional populated Casino task from creation through report. | PARTIAL: core £2.40→£2.10 flow passes; fees and complete change history remain NOT TESTED |
| UI-02 | Keep narrow and reduced-motion evidence truthful. | PARTIAL: 390 page containment and reduced-motion preference pass; internal bound coverage and an affected motion transition remain NOT TESTED |

The immediately following eb86c60 checkpoint is historical, not current reporting authority.

### Current visible core-parity slice — C04–C07 / core C09

UI0baffd2 and shared reflow37da721 consume lay-plan-v1 in native/versioned Normal Sportsbook
and SNR Free Bet editors, alongside accepted standalone/pop-out controls. Copy is clipboard-only;
Apply changes planning; actual placement requires explicit confirmation. Latest-edit plan revision
acknowledgement preserves newer drafts; percentage overrides participate in dirty state.
Corrected SNR Underlay6.25/Overlay10.20 conversions are enabled only through validated plan storage.
No historical automatic replan; eligible unplaced null-plan records have an explicit audited action.
Final frozen-source browser evidence/current limitations are maintained in the audit's C01–C09 table.
Current combined producteb86c6045e5b6f4db939c733d20e5e8e67b526d4:8 complete core native/conversion
journeys,4 hub/pop-out,6 editor geometry/keyboard and4 genuine award journeys pass. Reviewed plans
now show Not Laid until actual confirmation;23 plan +199 affected legacy/atomicity tests pass.
Historical unversioned/award editors retain their old action semantics unless explicitly replanned.
Owned3040/8039 only, retained disposable data, no normal/manual changes or publication. C08 Cashback,
broader C01/C02 and unsupported changed-odds/multi-fill remaining hedge stay visible. No owner campaign.

### Historical backend-only core-parity checkpoint

Current product3f2eaca9fe2b7e00a957202ce84e09246751fbca implements approved backend
lay-plan-v1 fields/validation/migrations/bridge/native portable consumers. Isolated
SNR four-strategy create/reopen/API conversion, source/retry, actual6.00 precedence,
commission overrides, portable ID remapping and SQLite old-schema upgrade pass.
Actual PostgreSQL18.6 fresh/repeat/empty-old-schema upgrade and response rollback pass
on that fixed source. Existing portable suite has12 pre-existing seed/readiness failures;
new valid plan round-trip passes. Broader PostgreSQL restart/portable/actuals remain.
C04/C06 backend scoped PASS; C05/C07 native/versioned embedded controls NOT IMPLEMENTED;
core C09 browser integration NOT TESTED. New plan API is available, not an automatic
native UI path yet. Do not hand this backend checkpoint to Will as end-to-end parity.
No operational migrations/backfill/publication. Existing3040/8039 remains prior API.
Next exact step: shared embedded planner, percentage/native paths, explicit placement,
copy-only semantics and revision acknowledgement, then isolated fixed-browser gate.
No further schema approval/bulk owner entry needed. C08/C01/C02 remain retained.

The earlier proposal/blocker text below is historical, not current authority.

2026-09-14 continuation: Will approved the two nullable versioned lay_plan_json fields,
typed API/editor/bridge/portable consumers and disposable-only additive migrations.
Prior BLOCKED schema proposal below is historical. C04–C07/core C09 now IN PROGRESS:
implement one validated planning contract, preserve existing actual-commission column
for confirmed versioned placements, and prove SQLite/PostgreSQL/UI round trips.
No operational migration, backfill, publication or acceptance authorised.

Verified starting checkout9ffaad7e726a8c0482ac22ba1da0cf18063622aa;
tested prior UI66fc5ddb34900e6c11f3d87c71c4370eee24cbf4 and API72a924e6e2ea8f769136575f8192726a785974c4.
C04/C06/C09 destination parity BLOCKED: isolated native create/reopen reproduces
Underlay6.66 rather than6.25, Overlay9.33 rather than10.20, and submitted5% becomes
Profile2%. Existing Free Bet schema has no separate versioned planned stake;
row commission is deliberately cleared. Original conversion-envelope provenance
cannot substitute for a mutable authoritative destination planning contract.
Do not remove the conversion guard, relabel the strategy, or populate actual stake.
C07 shared controls scoped PASS / PROVEN on tested24385bf72a5161a6e14e22175f40def2fcb808db: reuse CalculatorOutcomes for full-width reference
rows, keep result shells mounted during drafts, pending-disable copy/apply actions,
and support copying the actual negative outcome separately from the positive stake.
Nearest equivalent: shared CalculatorOutcomes / CopyableFinancialValue; no local CSS.
Four hub/pop-out1440/760px light/dark variants pass exact reference edges, current
stake/outcome clipboard, Custom/mode changes, invalid drafts and percentage requests.
One held real response is superseded without replacing the newer result. Full live
pointer-drag/enlarged-text/reset/saved-state and embedded parity remain unverified.
22 focused API,15 money/percentage unit cases, typecheck/targeted lint/build pass.
Required minimal schema approval is documented in the existing calculation contract:
one nullable versioned lay_plan_json column per existing core ledger, not another
engine. No migration, historical backfill, PostgreSQL NEW-plan execution or guard
bypass. Core save/reopen/actual-placement parity remains BLOCKED, not complete.

Latest #113/35/114 clarifications5662334267/5662339238/5662344208 govern.
Verified stack base3a5fddc27ea898aad01f7a186cc06c62c5e66aec, application8276e2a,
report0b0540d; no PD019 repair exists there. Separate repair/calculator-corrections-113.
C01 PD019 latest-edit/autosave COMPLETE for the scoped response-gate cases37a495e;
C02 geometry/Escape/focus-entry COMPLETE for18 native variants including Casino52a87af;
dirty/pending/nested confirmation/focus return/text scaling remain NEEDS VERIFICATION.
C03 IN PROGRESS: read-only normal/refund/same-odds remaining formulas traced; workbook SR branch
discrepancy and receipt/cap source semantics remain explicit. Original hashes unchanged.
C04 numerical COMPLETE for independent preset fixtures811ef5c; Standard7.18, Under6.25, Over10.20,
Custom9.00. Normal/SNR accessible loss(2.64) and actual negative clipboard−2.64 now PASS;
embedded preset acceptance BLOCKED by NEW-plan contract. No fresh external parity claim.
C05/C06 IN PROGRESS: standalone Normal/SNR choices and percentage primitive66fc5dd; embedded
scope/percentage inputs, actual-match/different-odds remaining hedge and saved-unit variants remain.
C07 PARTIAL: simultaneous full-width shared Under/Overlay/Custom plus following slider,
canonical Outcomes geometry and bounded stale-copy proof pass. Full live-pointer-drag and
corresponding embedded parity remain required.
C08 IN PROGRESS: three independent cash/credit conditional reference cases72a924e; actual
receipt/cap source semantics and UI/embedded mode-leakage proof remain.
C09 NEEDS VERIFICATION: frozen product66fc5ddb34900e6c11f3d87c71c4370eee24cbf4 passes build,
typecheck/lint,113 focused API tests,12 percentage tests and bounded real half-width controls.
Full corrected calculator→copy→review/save/reopen→settlement/report gate remains.
Corrected SNR Underlay/Overlay conversion BLOCKED pending versioned destination planning
contract; Free Bet cashback credit cannot become cash cashback. Server guards prove zero writes.
Nearest equivalents: existing Free Bet editor/persistence guards, shared modal shell,
FinancialValue/Outcomes/slider and onboarding percentage boundary. No new visual system.
Original results95112328fe4e9b61ad5dfe0c90b45ff70b35beaefca5d082692a9de76dffa6ac
remain private/unchanged; observed3010 revision UNKNOWN until supported evidence.
Partial user observations received; no further bulk owner entry required;
engineering reference verification and fixes active; final acceptance pending.
No push/merge/deploy; inherited repairs, frozen candidate/dev/data remain protected.
Current tested source24385bf72a5161a6e14e22175f40def2fcb808db inherits37a495ee656c6850c6c670539bb5ec1ce6716330 and
da196a97216fb9eb48e18bf2cf53bb74c29d492d. Prior66fc5dd frozen award4-variant evidence is
reconciled against J11 assertions in the current audit; no new full24385bf award claim.
Coverage unchanged46/87,8/24 exercised/passing,14/27,24/133; no J11 promotion from a
development-state award run. Engineering owns remainingC03–C09; only the minimal NEW-plan
schema/policy approval is needed from Will, not manual comparison or regression work.
Earlier deferred/bulk-entry/current status below is historical where this scope supersedes it.

## PD-QA-017 award repair — branch server PASS; browser journey PARTIAL / 2026-09-14

Verified base1295e2679db1856f67da0cb2cda82e4ad8cabdf9 includes Sportsbook
cb0f29068d5d4a24a61ec3e2a66afa91c3265a71; prior reporta3084de1e409710408499aba436ed3703370aadc.
Separate repair/award-integrity-91 application8276e2a1f9a3eb7fe018021c616e4c180d0216c9;
harness/contracteca15d6d022d240c5a22676c9a9232656f82a84e.
A atomic split/failure COMPLETE(server evidence); B durable hash-bound retry/concurrency
COMPLETE; C safe unused/protected removal and source/placement races COMPLETE(server evidence);
D legacy explicit review/immutable identifiers/no resurrection COMPLETE; E API/backend COMPLETE,
full browser NEEDS VERIFICATION / BLOCKED by existing PD019 autosave and desktop modal clipping
PD004/005; F audit/status/GitHub/local bundle handoff COMPLETE when outgoing checkpoints recorded.
No whole PD017/PQA-J11 UI acceptance inferred:227 API tests, actual SQLite/PG11 boundaries each,
four actual themed/width award-review subflows pass; current full child matching→settlement→report
browser attempt fails PD019. Independent children5.30/10.30 plus qualifying−1.18 =offer14.42.
UI reuse: existing award rows/footer, confirmation/source links, field-validation error inside active
editor; no new CSS/primitives. Main unchanged; no push/merge/deploy; comparisons deferred/no date.
Scope details/checksums/rollback/next checks in SAME audit. PD016 history, PD018 imported sources,
PD019 stale autosave, remaining workbook/ledgers/competitors/requirements and #115/#96 remain visible.

## Historical Sportsbook integrity repair —2026-09-13

PD-QA-020 fixed on branch cb0f29068d5d4a24a61ec3e2a66afa91c3265a71; PD-QA-003 Sportsbook subcase repaired. Main remains unfixed. Existing audit contains reproduction, field policy, SQLite/actual PostgreSQL/native browser evidence and related write-boundary table. J07 native required gates now pass;46/87 assessed,8/24 exercised,8/24 passing,14/27 competitors,24/133 requests. No new assessment/request count.
PD-QA-017 next:£10 split cannot become£15 on retry; concurrency/idempotency; protected children/history and legitimate#80 removal. PD018 imported-parent and PD019 stale autosave remain separate. No push/merge/deploy; protected builds/data unchanged; calculator comparison deferred without date.

## Historical preceding checkpoint

## Current populated audit checkpoint —2026-09-13

Stable scope87 assessments/24 journeys/27 competitor cells/133 requests:46 assessed (53%),
8 fully exercised (33%),7 passing (29%),14 competitor cells (52%),24 requests reconciled (18%).
Audit/report and stacked modal branches LOCAL ONLY; application6d2276e unchanged. No publication.
PD-QA-017 award partial-child/retry duplicate and source deletion orphan; safe child removal blocked.
PD-QA-018 imported parent source ID/native ID unresolved; full Profile workbook import NOT TESTED.
PD-QA-019 fast Free Bet Exchange autosave overwrites newer lay-odds draft; no repair in audit.
PD-QA-020 malformed Placed Sportsbook500 after commit; individual/list/export500. Existing PD-QA-003
extended by missing-Profile Sportsbook500/no write. All OPEN; synthetic evidence only.
Original #49/#80/#12/#94/#95/#104 + all available clarifications reconciled to code/plans/evidence/
dependencies. #109 already counted, gap preserved; #94 DEFERRED provider gates, #95 DESIGN ONLY,
#104 ongoing financial AND operational baseline, not broad importer acceptance.
PQA-F14/F17/D08/R04 assessments complete with scoped FAIL/review outcomes, not readiness PASS.
J07 fully exercised but FAIL overall; J11/J18 PARTIAL. Current report retains exact redacted evidence,
independent equations and checksums. Next: propose separately scoped Sportsbook pre-commit safety,
then award atomic/idempotent creation/deletion guards; independent workbook recovery/other ledgers.
Main/manualf7, development215193b, review3034 and all observations unchanged. PG scoped tests pass.
No Will engineering assignment; #113 deferred without a date; #115/#96/Vercel gates remain visible.

## Historical preceding audit checkpoint —2026-09-13

#114 reporting remains audit/platform-quality-114, documentation only; shared modal candidate
repair/modal-boundary-114 stacks on f57e71ad1b7d35070154b96d3e4f33b15f780d24.
Current product6d2276e00d0a1a540f48f7ecc253e864ad30d5e3, LOCAL ONLY; publication withheld.
PD-QA-004.1–004.4 track mounted focus/top-layer Save, nested/pending Escape, return focus and
rendered combined journeys. Scoped native/conversion pointer, text200%,320 and combined stress checks pass;
reflow is PD-QA-005, not PD-QA-003 missing Profile. Main is not repaired. Push withheld: prior Git commits triggered Vercel.
Stable scope87 assessments/24 journeys/27 competitor cells/133 requests; current evidence42/7/14/18.
PQA-J12 browser partial-failure/retry/new-intent/notification journey passes. PQA-J06 browser financial
slice passes; source Notes visible in8 SNR/SR width/theme checks. Full change-history consumer missing:
PD-QA-016 / #36/#114, FAIL bounded surface evidence; proposal only, no new product implementation.
PQA-U05/U06/U07, R02 and C02 have scoped assessment
evidence; original #70/#82/#85/#106/#111 plus clarifications are reconciled, not implemented.
Prior deployment target/aliases/protection/auth/API/database isolation remain UNVERIFIED; owner
metadata and approved branch exclusions precede publication. #115/#96 remain separate gates.
Original scopes, orphan IDs, open PostgreSQL/import/award/large-data/reader/security checks remain.
This checkpoint adds PQA-R03 review of #25–31/#72/#86 originals and #86 clarification5569417310:
target lifecycle, risk/seasonality/casino decisions, six-contract fixtures, optional AI, fresh-source
offers and task Kanban/dispositions/cadence/preferences/history remain planned/partial; no request
is closed or narrowed. PQA-C03 documents tracker versus limited MBB offer-progress capabilities;
no new hands-on member evidence or numerical parity. Will approved local PostgreSQL server installation:
18.6 now executes in a disposable synthetic cluster/port60936, stopped afterward; no default cluster,
service activation or dependency/database upgrade. PQA-D06/D07 and backend J21 PASS / PROVEN A–E
actual Account/Free Bet rollback and separate-process Blackjack retry/exclusion, SECOND DB dump/restore,
exact counts/source IDs/financial values, restart and post-restore rollback. Not all PostgreSQL fields,
imports/cloud/browser recovery or hosted integration proven. Those gaps remain, as does PD-QA-016.
Manual comparison deferred by Will; no scheduled date; resume on supplied results or explicit request.
See the same platform-quality-audit.md for denominator definitions and retained prior failure evidence.

_Last updated: 2026-09-12_

## Purpose

This is the canonical durable request register. The short current-state entry point is
[`PROJECT_STATUS.md`](../../PROJECT_STATUS.md); this document retains the full request scope and
contract/fixture references.

Live GitHub issue state was reconciled through an authenticated integration on 2026-09-06. A local
entry without a verified issue link must remain explicitly `SYNC PENDING`.

## Active request capture and acceptance

### #91 / #114 / #36 / #40 PD-QA-015 completed-source repair — 2026-09-12

IMPLEMENTED ON STACKED BRANCH ONLY; evidence checkpoint/integration pending.
`repair/blackjack-source-91` starts exactly at
`c84b9eda268b3cfae7b45d74d583a44ce46f11df`, inheriting unchanged Account and Free Bet checkpoints.
Added fix `c03470a338eeebf9ef89e2e3fcf0ed6d189ef5c6`.19 new completed-source cases and135 inherited
focused backend cases PASS; SQLite threaded and separate-process HTTP races/rollback are proven
within these fixtures. Actual PostgreSQL/new rendered acceptance remain NOT TESTED.
Full validated snapshot SHA-256 now reserves one global claim in the existing target table;
Profile/Account identity remains canonical and stored. Casino row/audit/success/notification and
response JSON preparation share one transaction. Same-target retry returns the existing row;
other targets receive409. Failed transactions are retryable without an orphan or false success.
Legacy successful claims/orphans are guarded read-only, never deduplicated or financially repaired.
Exploratory operation identities remain independent and can deliberately create new opportunities.
See the [same audit / PD-QA-015 addendum](../audits/platform-quality-audit.md).

Remaining engineering sequence: PD-QA-004 shared modal/focus/half-width pointer Save repair;
independent combined repair-candidate verification; reviewed integration proposal; post-integration
smoke. Main remains f7 and unfixed. Actual PostgreSQL, crash-Pending/network-loss browser recovery,
other populated ledgers, award lineage/import/restore, combined reports, larger datasets, accessibility,
security exposure and issue-specific historical reconciliation remain explicit audit gates.
The addendum assigns each a next test or exact blocker, not a PASS. #115/#96 stay separate;
unavailable deployment/provider access is not clearance. #113 comparison deferred without a date.
GitHub #91/#114/#36/#40 evidence synced on2026-09-12; no automatic merge/deployment/issue closure
or user testing assignment. Final protected web/API health checks200; builds/data unchanged.
This replaces PD-QA-015 as the queued NEXT task below, not the preserved earlier failure evidence.

### #91 / #114 PD-QA-014 Free Bet repair — 2026-09-12

IMPLEMENTED ON STACKED BRANCH ONLY; browser handoff incomplete under PD-QA-004, integration pending.
Branch `repair/free-bet-atomic-91`, basec4b9bb4412cb0e29c78df4919624c58db57633d6,
inherits unchanged Account fix102848a1214730e5065e9db04a66047dce6cd82b. Added fix
b7e4a9c7e7abd6964ca2f9b95cf1681e68da5e7f. Strict field-specific input/effective PATCH validation, transaction-contained
calculation/response serialization, alternate staged-import protection and lossless legacy-invalid
read/report diagnostics reuse the existing engine. No formulas, actual financial history or bridge
architecture changed. See [canonical audit addendum](../audits/platform-quality-audit.md) and
[field policy](../contracts/free-bet-current-value-contract.md).

95 Free Bet,25 inherited Account,13 existing engine and2 adapter-only tests pass;58 focused web tests
pass. Actual desktop/light+dark correction/Save/reopen passes. Half-width/light+dark validation
passes, **pointer Save BLOCKED: no PUT**; keep PD-QA-004 open. Legacy ledger/Dashboard/Reports display
Unavailable with identity diagnostics, no runtime errors and no source rewrite. Actual PostgreSQL,
full import/restore/award-group and complete keyboard/Escape execution are NOT TESTED.
Main remains f7 and unfixed until Account then Free Bet are approved/integrated; no automatic merge.
PD-QA-015 completed-session global uniqueness/concurrency is next. #115/#96 and remaining audit/
feature work stay separate. Manual comparison deferred by Will; no scheduled date; resume only on
supplied observations/explicit request. #91/#114/#36/#92 evidence synced on 2026-09-12; no issue closure.
This supersedes PD-QA-014 as a queued next task in the historical Account receipt below, not its evidence.

### #91 / #114 isolated Account repair — 2026-09-12

PD-QA-002/007: IMPLEMENTED ON REPAIR BRANCH ONLY; integration and Will acceptance pending.
Base f7a3b35073ecc87cdf8f8f881129f221ec44d395, branch repair/account-money-91. Complete exact-cent
validation rejects malformed/non-finite/unsupported precision before business writes. Omissions,
explicit zero and blank unknown retain their documented meaning; included invalid sources give an
incomplete Account/Profile/authorised combined cash total, not a fabricated complete subtotal.
[Same audit addendum](../audits/platform-quality-audit.md) records scoped API/unit/browser evidence
on disposable8026/3026, not main. Actual PostgreSQL and complete import-confirmation execution remain
NOT TESTED; shared adapter/preflight source inspection is not runtime proof.

PD-QA-014 Free Bet pre-commit validation, PD-QA-015 completed Casino uniqueness across Profiles/
Accounts/concurrency, PD-QA-004 modal recovery, #115 exposure and #96 owner/provider rotation remain
separate queued repairs. No remaining #114 coverage or broader #91 field scope is closed.
Fix102848a1214730e5065e9db04a66047dce6cd82b pushed. GitHub synced #91 comment5648267278,
#114 comment5648268451 and #92 comment5648268545; issues remain open.
Manual comparison deferred by Will; no scheduled date; resume on supplied results or explicit
request. Launcher, parent case IDs, frozen candidate and original observations remain unchanged.
### PD-FIX-107–110 — protected manual baseline / Normal v2 planning persistence

User scope: preserve full candidate `f7a3b35073ecc87cdf8f8f881129f221ec44d395` for Monday;
continue isolated development; retain capture parent IDs/observations and all reference gaps;
close a coherent Normal per-leg commission creation/reopen slice, without migrating v1 cash rows.
Protected worktree/launch and affected retests are in the
[#113 audit](../audits/issue-113-independent-calculator-verification-2026-09-10.md#2026-09-12-manual-checkpoint-and-normal-planning-persistence).
Capture HTML/Excel/guide are pending local supply. Explicit repeat inputs have been added to
the existing worksheet without filling observation cells. Bonus SR remains separately deferred.
Versioned new plans share the v2 engine/presentation and preserve each commission. Actual
placement/settlement, SNR/refund/boost/Overlay/Custom persistence remain blocked with their full
requirements visible. No historical row/source/hash/idempotency migration. Development branch
`calculator/multi-lay-normal-parity` remains separate from main/manual build. Will acceptance is
pending comparisons and unexplained external differences, not inferred from test counts.
Relevant coverage: #35/#36/#38/#113; existing UI tokens for #92 reused. Live sync receipt follows
the branch checkpoint; do not assume these issues closed.

Implementation, automated verification, hosted verification, and Will's acceptance are separate
states. Partial delivery does not remove the remaining scope.

| ID | Intended outcome / type | Current status and remaining scope | Source / GitHub |
|---|---|---|---|
| `PD-FIX-081`–`PD-FIX-084` | UI correction / calculator active-chip containment, paired-panel density, Extra Place style persistence and adjacent-family arrow navigation | `COMPLETE LOCALLY — WILL RECHECK PENDING`: the shared carousel reserves the selected/focus halo and its arrows select adjacent ordered families with non-wrapping native-disabled endpoints; content-driven subgrid rows preserve Standard/Early Payout peer alignment without trailing panel space; Extra Place presentation restores through the established ThemeProvider/local UI preference boundary while explicit pop-out state retains precedence. Focused desktop/half-width/narrow, light/dark, refresh, keyboard, overflow and reduced-motion evidence passes. | [Corrective batch](../agent-contracts/plum-duff-corrective-change-batches.md); [#35](https://github.com/wolney8/OpenForge/issues/35), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| `PD-FIX-076`–`PD-FIX-080` | UI correction / shared calculator segment alignment, hierarchy, surfaces, family navigation and unsupported-mode presentation | `COMPLETE LOCALLY — WILL RECHECK PENDING`: Standard and Early Payout share explicit paired rows; Multi-Lay/Sequential Lay use the canonical BACK BET eyebrow; Extra Place reuses the embedded presentation selector without resetting mode/state; Multiples/Dutching expose all outer radii; family pages slide between fixed boundary arrows and use an anchored ellipsis menu. The historical reward-if-back-wins hiding decision is superseded by PD-FIX-093–100's current source-backed contract. Focused desktop/narrow, light/dark, text-scale, keyboard, overflow and reduced-motion browser evidence passes. | [Corrective batch](../agent-contracts/plum-duff-corrective-change-batches.md); [#35](https://github.com/wolney8/OpenForge/issues/35), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| `CALCULATOR-VERIFICATION-001` | Audit / independently verify every exposed standalone calculator family and significant mode | `EXTENDED AUDIT — REVIEW PENDING`: 96 supported configuration fixtures pass, including 13 bounded `multi-lay-v2` cells; this remains finite fixture evidence, not proof of every numeric input. Ten required Bonus Free Bet SR cells remain blocked and ten external matrix comparisons remain explicitly unverified. The live MBB Multi-Lay penny-boundary difference and blank user-observation cells are retained in the editable worksheet. | [Issue #113 audit](../audits/issue-113-independent-calculator-verification-2026-09-10.md); [manual comparison](../audits/calculator-manual-comparison.md); `multi-lay-v2` contract/tests; [#113](https://github.com/wolney8/OpenForge/issues/113), [#105](https://github.com/wolney8/OpenForge/issues/105), [#37](https://github.com/wolney8/OpenForge/issues/37) |
| `CALCULATOR-BRIDGE-001` | Feature / immutable calculator or completed-session source into reviewed Profile ledger activity | `CORRECTED LOCALLY — WILL ACCEPTANCE PENDING`: the bridge retains source state and canonical Account identity. New `multi-lay-v2` Normal Standard/Underlay plans preserve two-to-20 named legs and each leg's canonical commission ratio; conversion and idempotency are API-proven. The legacy v1 row continues to require one uniform commission. SNR, Money Back, boost, Overlay and Custom remain fail-closed because the Sportsbook destination cannot preserve those richer v2 meanings. Other family classifications remain unchanged. | [Authoritative bridge matrix](../workflows/calculator-workspace-ledger-bridge-workflow-contract.md#authoritative-conversion-matrix); [#36](https://github.com/wolney8/OpenForge/issues/36), reused multi-Profile workflow [#77](https://github.com/wolney8/OpenForge/issues/77) |
| `CALCULATOR-WORKSPACE-001` | Feature / Fund Manager standalone calculator workspace | `CODE-VERIFIED — USER RECHECK PENDING`: Standard retains its governed controls. Multi-Lay v2 exposes reference-backed Normal/SNR/Money Back, boost, two-to-20 per-commission legs and source allocation endpoints/custom multiplier in standalone and pop-out. Native Sportsbook Add Row now uses the shared v2 planner for the bounded Normal Standard/Underlay planning slice. Browser evidence covers a three-leg mixed-commission save/reopen; 20-leg persistence and conversion/idempotency are code/API verified, not browser-proven. Actual placement/settlement and richer configurations remain blocked. | Calculator contracts/fixtures; [manual comparison](../audits/calculator-manual-comparison.md); [#35](https://github.com/wolney8/OpenForge/issues/35), [#38](https://github.com/wolney8/OpenForge/issues/38), [#113](https://github.com/wolney8/OpenForge/issues/113), bridge [#36](https://github.com/wolney8/OpenForge/issues/36) |
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
