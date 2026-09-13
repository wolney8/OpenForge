# Platform quality audit — PLATFORM-QUALITY-AUDIT-001 / #114

## Current Sportsbook safety repair — 2026-09-13 / LOCAL ONLY

Branch `repair/sportsbook-safe-91`; verified base81af076cf67b5d0951aef9f1a8bca6fdafb841bc,
inherited application6d2276e00d0a1a540f48f7ecc253e864ad30d5e3,
harness92a170c7e839693b9f7451a909d4f192b6f3fcad, prior reporte1a461e028730bb046cb665c939a2d8343474ab3.
Repair product/tests **cb0f29068d5d4a24a61ec3e2a66afa91c3265a71**.
Main/normal app remains UNFIXED until reviewed integration. No push/merge/deployment,
migration, formula change, historical correction or manual calculator sign-off.

| Measure | Current | % | Change this repair |
|---|---|---|---|
| Assessments |46/87|53%|0 items / 0 points|
| Journeys exercised |8/24|33%|0 / 0|
| Journeys passing |8/24|33%|+1 / +4 points|
| Competitor cells |14/27|52%|0 / 0;12 documentary,2 hands-on|
| Requirements |24/133|18%|0 / 0|

PD-QA-020 fixed on branch; PD-QA-003 Sportsbook missing-Profile subcase repaired.
PQA-J07 native gates now pass on this candidate; original failing evidence below is
historical and retained. Other modules are not certified by sharing a helper.
PD-QA-017/018/019, wider workbook/ledger/recovery/accessibility/request review,
#115/#96 and publication prerequisites remain OPEN. Calculator manual comparison
remains deferred by Will with no date.

### Root cause, field policy and boundaries

Seven initial failing regressions reproduced malformed/non-finite creation500,
missing-Profile500, post-write preparation fault retaining a row/audit, and bad-row
unreadability before production edits. DB create/update committed before calculation/
response validation. Effective records now receive complete-string exact-decimal
validation; calculation, model validation and JSON prepare within the mutation
transaction. Unexpected faults remain honest500 with rollback; bad input is field-specific
4xx. Missing/archived/foreign Profile/Account denial leaves no business write.
Supported conversion shares the same create boundary; identity/idempotency remain unchanged.

[Existing Sportsbook field-policy contract](../contracts/sportsbook-current-value-contract.md):
new money precision is pennies; stakes/rewards non-negative, signed manual overrides
retained. Explicit zero valid, omitted update retained, null rejected, blank unknown
where lifecycle permits. Placed/Settled requires backing stake/existing odds prerequisites,
not a fully matched lay. Odds/commission/retention/boost preserve separate ranges/precision;
nested placed/matched stakes, odds and commission validated. No partial parsing or silent
rounding. Historical valid precision remains readable.

Legacy invalid fixtures retain raw identity/value; diagnostic review-required response
has null financial calculations. Relevant Sportsbook/exposure/current/combined summaries
are unavailable, never a silently complete subtotal; unrelated cash is not invalidated.
Migration totals also retain missing counts and unavailable totals. Native/portable export
rejects invalid data with record diagnostics. Explicit correction restores completeness;
no historical repair/deletion.

### Evidence and exact limits

- Sportsbook isolated SQLite safety matrix71 passed; inherited Account/Free Bet/current-value
  suites rerun. Blackjack source suite19 passed. Web focused money/summary/decimal42 passed;
  targeted lint/typecheck passed.
- Actual PostgreSQL18.6 targeted17 checks: synthetic private-loopback cluster, independent
  SQL snapshots, invalid create/update, calculation/model/JSON failure rollback,9.65reference,
  actual9.00/liability37.80, Back Won2.20, Lay Won−1.18, reopen and missing-Profile zero-write.
  No reinstall or unchanged recovery-suite repeat.
- Actual authenticated browser1440/light,760/dark,1440/dark,760/light:
  malformed text stays editable with associated error; keyboard correction/pointer Save;
  copied9.65, persistedactual9.00/liability37.80, settlement2.20/correction−1.18;
  reopen/report/reload; no page overflow/console errors. Separate legacy browser preserved
  not-money, showed record-ID incomplete notice and explicitly corrected to2.20.
- Browser artifacts: /tmp/openforge-sportsbook-safe-91-20260913/
  browser-four-variants-evidence.json and legacy-evidence.json. Redacted observations
  are durable here; no private DB/token/screenshots committed.
- Existing demo-seed-dependent tests are harness-blocked: conversion/workflow27 failures
  before applicable flows/1 pass; odds input41 pass/1 missing-demo-Profile fixture failure.
  Not reported as product mathematical failures or passing journeys.
- Unsynchronised Exchange autosave can erase newer odds; positive path synchronises on
  actual save response. PD-QA-019 remains OPEN, not fixed by successful slow tests.
- Import confirmation preparation is inside the transaction (CODE-VERIFIED);
  staged-import injected-fault runtime probe NOT TESTED. PostgreSQL legacy-list/export,
  wider nested-configuration and network-loss coverage are not inferred from17 native checks.

### Bounded related-path review

| Ledger | Write/validation entry | Transaction/response | Legacy-invalid handling | Evidence / next missing test |
|---|---|---|---|---|
| Accounts | Native create/update/pending withdrawal canonical policy | Inherited pre-success validation/preparation | Raw diagnostics, incomplete cash, controlled export | Inherited SQLite/UI/prior PG; alternate paths remain reviewed scope |
| Sportsbook | Native create/update/placement/settlement/shared conversion, import confirmation | Effective record + same-transaction calculation/model/JSON | Review-required rows/unavailable totals/export denial | SQLite, actual PG17, browser4 variants; import injected fault NOT TESTED |
| Free Bets | Native/update/placement/shared conversion/award | Inherited atomic preparation | Diagnostic/incomplete results | Inherited regressions; PD019 autosave and PD017 award-group integrity OPEN |
| Casino | Native and completed-session bridge | Inherited global source claim/atomic completed activity | General native legacy handling not fully assessed | Blackjack inherited source tests; native malformed/update/fault next |
| Extra Places | Native Each Way/Extra Place and bridge | Separate destination boundary, not certified here | Not fully assessed | Dedicated invalid-write/response rollback/legacy probe next |
| Cash Adjustments | Native create/update | Existing route constructs response after mutation | Not fully assessed | Injected preparation failure/legacy export probe next |

Next PD-QA-017: intended£10 split award must not become£15 on failure/retry;
concurrent/repeated attempts cannot duplicate; source deletion cannot orphan protected
children or erase financial history; legitimate unplaced removal follows#80.
PD018 imported-parent resolution and PD019 stale autosave remain separate.
Protected main/frozen f7/development/review3034/databases/_input unchanged.
No action needed from Will. Earlier current headings below are historical.

Final execution: focused SQLite211 passed plus Blackjack19 passed. Actual PostgreSQL18.6
runtime /private/tmp/openforge-pqa-pg-114-15yesosk,port54155, app cb0f29068d5d4a24a61ec3e2a66afa91c3265a71:
17 passed, cluster stopped. Evidence SHA2568131528cb8c55166d3742c1a493d95e73a8210221f80e8a524251e5ef4bcff8a;
browser-four-variants SHA256136cd2661eaefaa4149a4865b09486a0e241060043610faa5e873aac7a988902;
legacy SHA256b1aa847dee14e6e8dacc26c44febd22a85c0190e29999028399e757791488064.
Review8034 and owned8038 health200. Protected runtimes untouched.



## Populated Sportsbook, awards and native XLSX checkpoint — 2026-09-13

CURRENT / LOCAL ONLY. Application source remains `6d2276e00d0a1a540f48f7ecc253e864ad30d5e3`;
verified incoming combined candidate `c460f2a3074ede07bf7db9e30cec8c7e137ed6fa` and report
`b476b18ddb4eccadba0aff24b136bb27eb33effd`. This tranche changes audit harnesses/documentation
only; current harness commit `92a170c7e839693b9f7451a909d4f192b6f3fcad` is not a new application revision.
Outgoing full harness/candidate/report SHAs are in #114 living comment5652511529 and the
receipt; an unpublished report has no live GitHub blob link. Main/manual remain
`f7a3b35073ecc87cdf8f8f881129f221ec44d395`; Multi-Lay development remains
`215193b7fcb5b11a28e23a4531d2a45434545dc1`. Product ancestry and clean intended diffs verified.
No push, PR, merge, deployment, migration, policy/formula change or historical repair.

| Coverage measure | Current / planned | Whole % | Change from incoming / initial baseline |
|---|---|---|---|
| Evidence-complete assessments |46/87|53%|+4 / +15 percentage points|
| Complete journeys exercised |8/24|33%|+1 / +12 points|
| Journeys passing required checks |7/24|29%|0 / +8 points|
| Competitor cells |14/27|52%|0 / +26 points;12 documentary,2 hands-on|
| Requests reconciled |24/133|18%|+6 / +15 points|

New assessment IDs **PQA-F14/F17/D08/R04**: a reproduced defect completes an assessment,
not a successful journey. Areas: functional14/24, UX7/12, security6/12, data8/12,
sustainability5/12, requirements4/6, competitor2/9. Denominators unchanged.
**PQA-J07** is fully exercised but FAIL overall: positive numerical/control path passes;
malformed business write and missing-Profile denial fail. **J11/J18 remain PARTIAL**, not new
complete journeys. J11 cannot finish approved safe removal; J18 covers actual single-ledger XLSX
uploads, not the entire multi-sheet Profile migration/recovery path. Twenty retained findings:
15 open,5 fixed on candidate branches,0 full combined-candidate gates,0 integrated locally,
0 hosted verified,0 owner accepted. Deferred #113 comparison/sign-off is not counted.

### Reproducible setup, exact expectations and observed boundaries

New owned dataset/API `/tmp/openforge-populated-audit-114-20260913/acceptance.sqlite3`,
API8036 and web3036 in detached `.worktrees/populated-audit-114` at c460f2a; existing real
synthetic owner-session launcher reused, authentication required, no bypass. No private/demo
operational data, hosted target or inherited database. Original3034/8034 review/browser/data,
other protected runtimes, intentionally invalid earlier evidence and _input observations unchanged.
Initial setup failures (pnpm symlink check, Turbopack symlink root, missing web-side synthetic
session verifier configuration) are HARNESS failures, not product findings. Existing webpack dev
command and matching test-only verifier fixed setup; no packages/configuration changed.
Several old e2e labels target superseded controls; source inspection and visible active-tab
locators corrected the harness. No forced clicks. The wrong guessed report-summary API was
discarded: actual reports consume existing ledger sources.

| Stable case / method | Independently expected | Actually observed / result |
|---|---|---|
|J07-NATIVE-001 actual browser new→canonical Single/Bet & Get/Football→matching→copy→explicit actual9→save/reopen|10×5/(5.20−0.02)=9.652509…→reference9.65; liability9.65×4.20=40.53; reference branches40−40.53=−0.53,9.65×0.98−10=−0.543→−0.54|Reference/copy9.65; copy explicitly marks placement, not clipboard-only; manual actual9.00 takes precedence. Actual liability37.80; Back Won2.20. PASS / PROVEN finite fixture|
|J07-CORRECTION-001 browser settled reopen→visible shared EDIT→Lay Won→persist|9×0.98−10=−1.18|Native persisted result Lay Won/actual9.00/P&L−1.18. Reports/reload verified below. PASS / PROVEN|
|J11-SINGLE-001 real Sportsbook Free Bet tab/footer award|One10.00 SNR child with real source/group identity; no seeded parent IDs|One child created with parent native Sportsbook ID, split1/1, Available; visible source context. PASS / PROVEN scoped|
|J11-SPLIT-FAIL-001 real UI5 SNR+5 SR, second POST503 then retry|Failure/retry must not create duplicate award value|Before2 children (including imported child); failed attempt3; retry5. First5 child retained in incomplete group1/2; fresh retry group adds5+5:15 credit created for intended10. FAIL / PROVEN|
|J11-CHILD-SNR-5 browser matching/copy→actual3.50→save/reopen→Back Won|5×(5−1)/(5.20−0.02)=3.861003…→3.86 reference;5×4−3.50×4.20=5.30 final|Copied3.86; final5.30; source/group unchanged. PASS / PROVEN|
|J11-CHILD-SR-5 same actual UI, half-width/dark|5×5/(5.20−0.02)=4.826254…→4.83;5×5−3.50×4.20=10.30|Copied4.83; final10.30; source/group unchanged. PASS / PROVEN|
|J07/J11/IMPORT-REPORT-001 actual weekly/monthly report/reload|Imported2.20−native1.18+SNR5.30+SR10.30=16.62; remaining unplanned Available children have governed0 current value|Rendered16.62 (17 formatted matches), reload unchanged. PASS / PROVEN scoped, not calculator sign-off|
|J11-REMOVE-001 real linked child controls|Settled descendants protected; unplaced/unsettled child removal as #80 permits|Settled controls disabled correctly. Available child ALSO disabled: “Remove sportsbook back and lay placement first.” No forced click. FAIL / PROVEN requirement mismatch; J11 PARTIAL|
|J11-SOURCE-DELETE-001 authorised disposable API/independent persisted child state→actual report|Source deletion must not orphan placed/settled descendants|DELETE204, source absent, four children retain dangling source; reported16.62 becomes17.80 because−1.18 source removed. FAIL / PROVEN. No repair/recreation of synthetic rows|
|J18-UPLOAD-001 actual file chooser→review→acknowledgement→verified backup/confirm|Approved native one-ledger XLSX headers/tables;2 Accounts (12.34 and explicit0),1 settled Sportsbook2.20,1 linked Available SNR; original source identities retained|Three real generated XLSX files imported through browser. Confirmed batches, UI artifacts and independent Account/ledger reads retained. No dump/direct fixture substituted for upload. PASS scoped; full Profile workbook migration NOT TESTED|
|J18-INVALID-001 separate malformed Account workbook|Dry run controlled, no Account/ledger writes|Blocking finite-decimal field error; independent before/after business lists identical. PASS / PROVEN|
|J18-RETRY-001 repeat same files|No duplicate source rows|All valid repeated rows no_op; original confirmed reviews retained. PASS / PROVEN|
|J18-LINK-001 imported child/source identities|Imported QualBetID must remain provenance AND resolve its intended native parent/consumer|Child origin=PQA-IMP-QB-001; native parent ID=SB-DD13C2DD. No native identity match. FAIL / PROVEN stored-identity mismatch; full consumer reconciliation remains required|
|J18-EXPORT-001 real Accounts selector→Export XLSX→browser download|Valid12.34 and explicit0 remain exportable|Downloaded plum-duff-profile-…-accounts.xlsx without failure; valid original identities/values preserved in read/export source. PASS / PROVEN scoped|
|J07-INVALID-001 direct malformed Placed write, independent SQL then individual/list/export|Controlled field4xx; no committed row/dependants|500; one not-money back_stake row committed. Subsequent individual/list/export all500. FAIL / PROVEN; intentionally malformed synthetic row retained|
|J07-DENIAL-001 missing Profile with same payload, independent SQL|Controlled denial; no write|500, no row added. FAIL / PROVEN under existing PD-QA-003|

Numerical expectations above use signed contracts and explicit branch equations, not production
functions as their own oracle. Existing production penny placement is not changed.
Actual copy also preserved matched stake9.65 while the explicit actual9.00 won calculation
precedence; these reference/placed fields are not represented as identical observations.

### Findings and exact next tests

|ID / area|Expected vs actual / reproducible evidence|Severity / exposure / impact|Recommendation / acceptance / existing issue|
|---|---|---|---|
|PD-QA-017 Award transaction/lineage safety, main and candidate|J11-SPLIT-FAIL-001 retained first child/new retry group; UI safe unplaced removal blocked; J11-SOURCE-DELETE-001 source204/orphans, source audit removal boundary CODE-VERIFIED|High integrity; authorised award/retry/delete; inflated credit and financial history loss, not observed operational corruption|Bounded server-owned award attempt/group + transaction/idempotency; server child/source deletion guards aligned with #80, retained audit. Test child503 retry exactly2 children/10, concurrent retry, source/settled-child deny unchanged totals; safe Available removal. #49/#80/#91/#114. Extends previously recorded dangling-source failure rather than erasing it|
|PD-QA-018 Imported parent identity/consumer gap, candidate|J18-LINK-001 source ID retained without native parent resolution|Medium–high lineage; linked imported rows; broken source context/safe removal assumptions|Explicit source→native parent resolution under existing import architecture; no rewriting historic source IDs. Test approved linked workbook save/reopen→parent/child consumer and export unchanged source identity. #12/#80; preserve separate #109 access/provenance blocker|
|PD-QA-019 Free Bet autosave stale draft overwrite, candidate|Fast Back odds5→Exchange selection→Lay odds5.20: earlier Exchange PUT200 returns lay odds blank, subsequent preview200 has no plan; copy never appears. Source handler resets form from response. Later synchronised run waits for committed Exchange change before next input and passes; this does NOT repair race|Medium–high reliability; fast matching entry; erased draft, blank guidance “Complete calculator inputs: .”, copy unavailable|Latest-edit/response guard at existing shared state boundary, no second financial engine. Deterministic deferred PUT test must preserve5.20/newer input and latest copy. #91/#92/#114. Original race trace DOCUMENTED observable run + CODE-VERIFIED response reset; broader stale-request variants NOT TESTED|
|PD-QA-020 Sportsbook monetary pre-commit/legacy reads, main and candidate|J07-INVALID-001500 after INSERT; same bad row poisons individual/list/export500|High financial integrity; authenticated native creation; persistent corruption blocks unrelated readable rows/export|First small repair: field-specific complete-decimal validation/effective record, calculation/response preparation inside existing transaction, useful legacy-invalid diagnostics. Reuse Account/Free Bet patterns, no formulas/migration. Regression invalid create/update/injected prepare fault zero writes, valid actual9 final2.20/−1.18 unchanged, readable incomplete report. #91/#114; missing-Profile500 extends PD-QA-003|

No destructive correction of historical/operational data. New unsafe-source deletion and malformed
writes were deliberately executed only against this tranche's disposable synthetic records.
No product fixes in this audit. Safe unplaced removal, protected reversal, actual child-delete
server denial, concurrent award requests and network-loss award recovery remain NOT TESTED/BLOCKED
or FAIL as specified, not inferred from the creation/copy pass.

### Requirement reconciliation — original scope and later clarifications

Six newly reconciled request IDs; #109 already counted and not counted again. Review disposition is
DOCUMENTED, not implementation PASS. Original issue bodies and all available comments read this
tranche; no historical thread outside this coherent package reread.

|Request / intended outcome|Authority, current implementation/plans/evidence|Remaining functionality/UX/dependency|
|---|---|---|
|#49 generated Free Bets from a qualifying row, defaults/editability/typed lineage/status timing/duplicate safety|Original +5561926348 editor-entry verification recurrence. Existing real typed Free Bet tab/footer reached; genuine single/split SNR/SR issuance exercised|Partial child failure leaves incomplete group; retry duplicate and source status becomes Free Bet Awarded. Preserve closed implementation history, outstanding #80/PD-QA-017 verification; no claim old editor presence proves whole workflow|
|#80 safe removal/source-group/placed-descendant protection|Original has no comments; linked source panel/removal guards and actual API tested|Unplaced child blocked by source placements; API source deletion orphans descendants; audit retention guard required. Planned repair, not silently narrowing allowed child removal|
|#12 controlled Profile import/export/staging/mapping/validation/lineage|Original has no comments; approved roundtrip/map contracts; actual single-ledger upload/review/backup/confirm/reopen/report/export|Full multi-sheet Profile workbook, cross-Profile source collisions and invalid multi-ledger atomic batch remain NOT TESTED; imported parent alias unresolved; #109 mapping/access gap retained|
|#94 workbook runtime/hosted delivery/Profile eligibility|Original three preserved IDs WORKBOOK-RUNTIME-001/WORKBOOK-HOSTED-001/PROFILE-EXPORT-ELIGIBILITY-001; no comments; existing portability gates reviewed|DEFERRED provider/template/explicit Profile authorisation; local XLSX structure is not Google bound-script edits/recalc/disposable-row delete or hosted parity. Do not use private Founder inputs|
|#95 three-way source snapshot/current/incoming conflict review|Original WORKBOOK-MERGE-DESIGN-001 has no comments; snapshot/identity/source-authority design contract reviewed|DESIGN ONLY, no merge writes authorised/implemented. Manual conflict decisions, stable IDs/formulas-as-reference, no deletion or guessed financial truth|
|#104 preserve accepted Founder September financial AND operational readiness baseline|Original FOUNDER-IMPORT-BASELINE-001, no comments; retained onboarding/import/source evidence and synthetic isolation|ONGOING SAFETY BASELINE; no reimport of operational records, no assertion new minimal fixture verifies all Founder cases; keep #109 and explicit import/recovery checks|

### Durable redacted evidence and reproducibility

Harnesses: scripts/verify_populated_sportsbook_award_import_114.mjs (native/award and --import,
--inspect/--removal resumable probes), scripts/verify_genuine_award_child_114.mjs,
scripts/build_populated_import_audit_114.py, scripts/verify_sportsbook_write_denial_audit_114.mjs
(--reads avoids repeating malformed write). Source-linked children come ONLY from genuine browser
award generation. Existing synthetic XLSX exporter builds files, never expected money answers.
Initial observations file was overwritten by a concurrent diagnostic harness run; confirmed batch
audit and original browser confirmed screenshots recover that evidence. Separate outputs and
runs.jsonl now retain audit runs; this harness failure is not a product pass/fail.
The report itself retains redacted observations, equations, failure state and checksums below;
temporary screenshots/DB artifacts are supplementary, not the sole durable evidence.
Session tokens, environment values, private observations and database dumps are not committed.

|Retained artifact identity (owned synthetic runtime only)|SHA-256 at evidence checkpoint|
|---|---|
|populated-evidence.json|8165b6bb5119be9da01101edf80d816c7b9378af02972338e32dd46595d8f576|
|import-evidence.json|0880ad73abc0164cf4594c59bbb2cddb99dd83e2d919a5be908b1be57db2b26b|
|inspect-evidence.json|06c293a112f86a4c49b58d595fb8dad47edd81374e600c9ad55ba6bf2eeffae5|
|genuine-child-evidence.json|ca9aca8bda0a53574a9664709c5b82ccc45f56373aa75695d1203bacad7fdd0f|
|browser-accounts-export.xlsx|a1ff3127a56b49061a01b69f7fd01de9b16e5f3591588be346a44ab990037a51|
|sportsbook-write-denial-evidence.json (including downstream reads)|062b371ba6054d9d3079ec3d3ee19c36eedc44f0cbc419999096ba23df97cfa2|

Actual authenticated browser: native/issued/imported editors, pointer Save/copy, Escape and focus;
reopened Sportsbook/Free Bet/Accounts at1440 light and760 dark, no page overflow, focus in dialogs;
screenshots privately inspected. Report data readiness explicitly awaited; initial empty shell
screenshots were NOT counted. UI/artifact evidence is finite, not full accessibility certification.
No unrelated modal/reflow suites or unchanged PostgreSQL suite rerun.
PG18.6 transaction/backup/restore evidence from preceding checkpoint remains scoped PASS.
Screen-reader, larger/imported datasets, award concurrency/recovery, full multi-sheet workbook
migration/export/import, external Google workbook runtime and remaining109 request reconciliations
are not implied PASS. Remaining request count is109 (133−24); orphaned source requirements remain.

Next highest-value implementation proposal: PD-QA-020 Sportsbook pre-commit and controlled
missing-Profile/legacy reads first, then PD-QA-017 server award integrity in a separate tranche.
Next independent audit package: full synthetic Profile workbook migration/recovery + cross-Profile
source-ID/parent resolution, remaining Casino/Extra Places/Cash movements and large-data/accessibility.
No manual testing assignment. #113 manual comparison deferred by Will, no date; resume only on
supplied results/explicit request. Vercel publication metadata/branch exclusions, #115 dependency
exposure/remediation and #96 owner/provider rotation remain separate BLOCKED prerequisites.


Historical preceding checkpoint: [2026-09-13 actual PostgreSQL checkpoint](#actual-isolated-postgresql-execution--2026-09-13).
Reporting branch audit/platform-quality-114; repair branch repair/modal-boundary-114.
Main remains unfixed and owner calculator comparison remains deferred indefinitely.

## Actual isolated PostgreSQL execution — 2026-09-13

HISTORICAL CHECKPOINT / LOCAL ONLY. Will explicitly approved a local server installation solely for isolated audit
tests, with no service activation, existing database changes or hosted access. Product source remains
`6d2276e00d0a1a540f48f7ecc253e864ad30d5e3`; incoming combined checkpoint
`2d3bb086923b3baaeca72e0736fdc81f4d9940df`, report parent
`6c025c03d66a93a196e1f273d74b6fe6095cba07`. Outgoing exact combined/report commits are maintained
in #114 living comment5652511529 and the receipt. Changes are test-harness/documentation only.
Main/frozen f7, development215193b, normal/manual/review services/databases and observations remain
protected. No push, PR, merge, deployment, formula change or calculator sign-off.

| Measure | Current / planned | Whole % | Change this checkpoint |
|---|---|---|---|
| Evidence-complete assessments |42/87|48%|+2 assessments / +2 points|
| Complete journeys exercised |7/24|29%|+1 journey / +4 points|
| Journeys passing required checks |7/24|29%|+1 journey / +4 points|
| Competitor cells |14/27|52%|0;12 documentary/2 hands-on|
| Requests reconciled |18/133|14%|0|

New complete IDs **PQA-D06/D07 and PQA-J21**, with actual backend runtime recovery evidence below.
J21 is the explicitly backend writes/concurrency→backup/restore→read/rollback journey, not a
browser import/restore or deployment disaster-recovery certification. Denominators remain87/24/27/133.
Area assessment: functional12/24, UX7/12, security6/12, data7/12, sustainability5/12,
requirements3/6, competitor packages2/9. Initial baseline33/5/7/4 changes are+10/+8/+26/+11
percentage points. Finding stages unchanged:16 retained,11 unfixed,5 candidate-branch repairs,
0 full combined-candidate verification gates,0 integrated locally/hosted verified/owner accepted.

### Installation and isolated target safety

PostgreSQL **18.6 (Homebrew), x86_64 macOS** actually executed; `SELECT version()` retained.
The initial ordinary Homebrew install stopped on an API/formula error and proposed unrelated
dependency upgrades. No such upgrade occurred. The official bottle was fetched with SHA-256
`3d6375c9f23f3904465f26e99eed103f13568abf6aa42b5f4fc703b5b183c99e`.
A private extraction showed unrelocated install paths; the final server was installed in its own
`/usr/local/Cellar/postgresql@18/18.6` keg with dependencies skipped and post-install skipped.
Homebrew reported symlink conflicts with existing libpq; **no unlink/overwrite/forced link** was used.
Only previously absent server-specific share/library links were supplied; existing libpq18.4 and
seven runtime library versions remain unchanged. No default `/usr/local/var/postgresql@18` cluster
was created. No `brew services start`, launch agent or persistent background service enabled.

Final isolated runtime: `/private/tmp/openforge-pqa-pg-114-9lt0fep4`, port**60936**, loopback only,
private socket, synthetic role `pqa114_owner`, databases `pqa114_primary` and `pqa114_restored`.
The harness rejects port5432/non-test targets and checks database/role/port/unique marker identity
before application use. Inherited PG/application configuration is removed from tool commands;
application configuration explicitly selects the disposable DSN. Only synthetic factories used.
Current application schema initialized through the existing PostgreSQL adapter/migration boundary.
Actual API handlers run through authenticated TestClient against real psycopg connections; SQL
snapshots are independent of HTTP responses. Concurrency uses two spawned processes, not mocks.

Reproduce without touching protected data:
`scripts/run-python.sh scripts/verify_platform_postgres_114.py --pg-bin /usr/local/Cellar/postgresql@18/18.6/bin`.
Each invocation creates a new directory/port/database pair; it does not reuse the old test cluster.
Final artifacts: `evidence.json`, `postgres.log`, `synthetic-backup.dump` in the isolated runtime,
retained locally and not committed. The server was stopped in finally; `pg_ctl status` is checked
independently. Server installation alone is not hosted approval or a persistent service request.
Executed harness checkpoint `df1cb0ade86c222d3d57f0668c8a5e61b8f7cb46`; harness SHA-256
`73317a82e5756618e567177f5b2ad92911c582e61167391d033c640a4af67531`.

### Actual results — PASS / PROVEN for these finite boundaries

| Boundary | Execution and independent evidence | Result |
|---|---|---|
| A Account create/update | Balance and pending-withdrawal not-money/NaN/±Infinity/unsupported precision/null return422. Independent SQL snapshots of records/dependants/audits unchanged; valid prior balance retained. | PASS |
| B Free Bet atomic save | Malformed value and invalid actual-lay update422; injected calculation/response JSON faults create/patch500, unchanged native SQL records/audits. Legitimate500 not disguised as422. | PASS |
| C Completed Blackjack | Fault after successful-claim SQL produces500 with no Casino/audit/notification or successful claim. Retry succeeds once; sequential retry returns same ID. Other Profile/Account409 without business mutation. Separate-process same-target and cross-target races each200/409; retry returns successful row. Three distinct snapshots yield3 rows, total45.00,3 notifications with exact Profile/record links. | PASS |
| D Valid saved/reopened values | £10 at5.00/5.20,2% commission, actual lay7.00: SNR reference7.72/final10.60; SR9.65/20.60. Native persisted inputs rechecked; independently derived back-win cash minus actual lay liability confirms31.20 combined. Derived Free Bet P&L is not a stored column. | PASS |
| E Backup/restore/restart/rollback | pg_dump custom-format → SECOND database pg_restore; server restarted with explicit logfile. Exact selected business/audit/source row snapshots equal. Restored counts:2 Profiles,9 Accounts/9 Account audits,2 Free Bets/4 audits,3 Casino/3 audits,3 conversion claims. Values reopen unchanged; injected post-restore response failure rolls back; same-source retry returns original ID, other target409. | PASS |

Final backup SHA-256: `7b083b56fc0f00dd7c055eae60e22641ec90c34d8b4006936c64f0a2cf32006f`.
Prepared-harness assumptions were corrected without changing application logic: explicit server
tool/share/library paths, canonical /tmp marker identity, Path/string normalization, and SQL source
checks instead of an imaginary stored Free Bet final_net_pnl column. An added restart initially
inherited a captured stdout pipe; only that disposable server was stopped, logfile routing corrected,
and the full final run passed. These earlier setup/control failures are harness failures, not product
financial defects. Prior failed artifact/log directories remain as historical evidence; none is PASS.

### Remaining checks and next work

This does not verify all field/configuration combinations on PostgreSQL, account legacy-incomplete
aggregation variants, browser hosted recovery, cloud/deployment rollback, workbook/award imports,
backup privacy/custody/retention, provider auth/network-loss or large datasets. Those named checks
stay OPEN/PARTIAL, not inferred PASS. PQA-J06 still lacks the full change-history consumer (PD-QA-016);
visible source Notes and £24.80 financial slice remain evidenced separately. Other populated ledgers,
genuine award linkage/removal and imported lineage are the next independent audit package.
Preview/publication remains BLOCKED by prior Vercel deployment disposition/approved Git-trigger
guard, isolated authenticated deployment configuration, #115 exposure disposition and #96 owner/provider
rotation. Actual local PostgreSQL is no longer that prerequisite's blocker. Normal app remains unfixed
until reviewed integration and post-integration smoke; no automatic integration. No engineering
regression assignment for Will. Manual calculator comparison remains DEFERRED/no date.

## Historical lineage, PostgreSQL and task/intelligence checkpoint

CURRENT / LOCAL ONLY, 2026-09-13. Verified incoming combined candidate
`f7c6bb3e7bdc6425272d943e697dcc8de9481693`, report parent
`73d71aae101e36f75f1db604ba1ad14880f3a19f`; both descend from the previously reported checkpoints.
Product source remains `6d2276e00d0a1a540f48f7ecc253e864ad30d5e3`: this tranche adds audit harnesses
and documentation, not application changes. Exact outgoing combined/report SHAs are maintained in
#114 living comment5652511529 and the delivery receipt. No push, PR, merge or deployment.
Main/frozen manual candidate `f7a3b35073ecc87cdf8f8f881129f221ec44d395`, development
`215193b7fcb5b11a28e23a4531d2a45434545dc1`, protected databases, review3034/8034 and original
comparison observations are unchanged. Manual comparison deferred by Will; no scheduled date;
resume on supplied results or explicit request. Optional local review does not block engineering.

### Current measured coverage

| Measure | Evidence-complete / planned | Whole coverage | Change this tranche | Change from initial baseline |
|---|---|---|---|---|
| Assessments |40/87|46%|+2; +2 points|+7; +8 points|
| Journeys fully exercised |6/24|25%|0|+1; +4 points|
| Journeys passing required checks |6/24|25%|0|+1; +4 points|
| Competitor cells |14/27|52%|+1; +4 points|+7; +26 points|
| Requests reconciled |18/133|14%|+9; +7 points|+14; +11 points|

The incoming baseline was38/87,6/24,13/27,9/133. Denominators remain87/24/27/133;
no exclusions or scope additions. Area assessment: functional12/24, UX7/12, security6/12,
data5/12, sustainability5/12, requirements3/6, competitor packages2/9. Newly assessed IDs
**PQA-R03, PQA-C03** are documentary reviews, not implementation/runtime PASS. Competitor cells:
12 documentation-only,2 hands-on,3 blocked,10 unresolved/unexamined. No new hands-on competitor
cell or complete journey is claimed. PQA-J06 remains PARTIAL; PQA-J21 remains BLOCKED.
Finding stages:16 retained findings (new PD-QA-016),11 unfixed,5 repaired on candidate branches,
0 full combined-candidate gate completions,0 integrated locally,0 hosted verified,0 owner accepted.
Stages measure different evidence; they are not additive readiness scores.

### PQA-J06: source consumer reached; full change history missing

Result PARTIAL. The existing financial slice (£7.40 SNR + £17.40 SR = £24.80) was not replayed.
Source-driven rendered checks exercise the actual native editor path:
**Settlement → Advanced controls → Notes**. Keyboard activation opens/closes that disclosure;
the read-only Notes textbox exposes the persisted calculator source ID/SHA-256 in its accessible
name/value tree. The structured immutable envelope remains in `calculator_conversion_targets`.
Both SNR/SR records were checked at1440/760px in both themes:8 observations, no page overflow,
Escape close, source note matching API and business rows/audits unchanged. No reader execution.
Artifact: `/tmp/openforge-modal-114-repair/free-bet-lineage-surfaces.json`; runner:
`scripts/verify_free_bet_lineage_surfaces_114.mjs`. An initial getByLabel locator included nested
textarea text; inspection of the actual accessibility tree resolved this harness error with the
existing named textbox. It was not evidence of absent Notes or a new application label defect.

These calculator-converted records legitimately have no qualifying-bet award parent. A calculator
source is not a sportsbook-issued award; no synthetic parent should be invented. Separate native
award-group/source removal coverage remains open. SQL confirms each converted record has one
created and three updated audit entries. The editor exposes no full chronological record-change
consumer, and the available reminder-audit endpoint is not that consumer.

| ID / branch | Expected versus actual | Result / evidence | Impact / priority | Recommendation / acceptance | Issue |
|---|---|---|---|---|---|
| PD-QA-016 / combined candidate | Authorised row change history reachable; four business audit entries per row exist but no full editor/history consumer connects them. Calculator Notes source is reachable. | FAIL; CODE-VERIFIED absent connection and PROVEN bounded rendered surface | Medium; correction/lineage review lacks visible audit context; no new financial misstatement established | Proposal only: reuse governed read-only detail/history pattern. Created/updated/placed/settled history chronological, Profile isolated and reloadable; source identity shown; award parent only for genuine award; no recalculation. | #36/#114, existing lineage scope |

### Real PostgreSQL attempt: missing server, not a transaction PASS

Result BLOCKED / PROVEN environment prerequisite. `initdb`, `pg_ctl`, `psql`, `pg_dump` and
`pg_restore` are client toolkit18.4. Actual initdb failed before cluster creation:
`program "postgres" is needed by initdb but was not found in the same directory as
"/usr/local/Cellar/libpq/18.4/bin/initdb"`. The matching `postgres` binary is absent; scoped searches
of installed package/application locations found no alternative server distribution. Earlier tool
availability was insufficient evidence of an executable local server. PostgreSQL **server version
UNVERIFIED**. No operational/inherited DSN, port5432, hosted access or real data was used.

`scripts/verify_platform_postgres_114.py` is a prepared, NOT EXECUTED transaction harness. It uses
a uniquely created /tmp directory, private socket, unused loopback port, synthetic role/two databases,
explicit identity/comment checks, independent SQL snapshots, separate-process race connections and
finally cleanup limited to its own cluster. The current guard exits2/BLOCKED before startup when
the matching server is absent. Artifact `/tmp/openforge-pqa-pg-114-a08gh_xx/evidence.json` records
client18.4, incoming app checkpointf7c6bb3, port50432 and the missing-server path. Syntax compilation
passes; that is not PostgreSQL evidence. Only this tranche's empty runtime/artifact directories
were created; no server was started or protected service/database changed.

| Required PostgreSQL boundary | Actual execution | Next test / prerequisite |
|---|---|---|
| A Account rejection / unchanged values and audits | NOT TESTED | Matching existing local server path, or approval to install a server distribution; then explicit test-only cluster |
| B Free Bet preflight and injected-failure rollback | NOT TESTED | Same prerequisite; persisted SQL snapshots independently of HTTP |
| C Blackjack retry / cross-target / separate-process race | NOT TESTED | Same prerequisite; separate real PostgreSQL connections |
| D Saved/reopened £10.60 SNR and £20.60 SR | NOT TESTED | Same prerequisite; independent totals and SQL reads |
| E Dump → second database restore / identities / duplicate protection | NOT TESTED | Same prerequisite; pg_dump/pg_restore, exact counts/source claims and post-restore retries |

PQA-D06/D07 and J21 cannot advance from this attempt. No adapter mock, SQLite result or prepared
harness is substituted for real PostgreSQL. After execution J21 still needs every required recovery
step, not merely transaction tests. No package installation was authorised or performed.

### PQA-R03: retained task/intelligence requirements

All nine original issues were read; #86 clarification5569417310 was read (the other eight had no
comments). Existing draft target/decision-support contracts and fixture specs were inspected,
including `target-progress-calculation-contract.md`, `offer-decision-support-workflow-contract.md`
and `target-progress-and-decision-support-fixture-spec.md`. A draft fixture plan is not executable
financial authority. Current Dashboard has basic weekly/monthly/annual target progress; this is
not the requested biweekly/versioned target lifecycle or offer-aware decision engine. Common Bet
Combos, reminders and Notifications are partial building blocks, not proof of the whole package.

| Request | Original user benefit and retained clarification | Current implementation / plan | Missing capability / dependency / disposition |
|---|---|---|---|
| #25 | Explainable target-driven offer decisions, weekly/biweekly/monthly, Profile/combined risk and cash-first scenarios | M12 draft decision workflow; basic target cards | Offer-aware advice, cadence/risk/downside thresholds and approvals; depends #26–30/account eligibility; planned, not implemented |
| #26 | Target scope/status/history, safe/stretch amounts, rollover/archive and explicit current versus settled basis | Basic settings/progress; draft target contract | Biweekly/custom lifecycle, versioned target entity and history; approve tolerance/report basis/carry policy |
| #27 | Standard/underlay/overlay/no-lay and explicitly approved casino recycle choices with target/risk explanations | Calculator strategies exist; decision workflow draft | No verified target-aware ranking/reason trail; casino advice needs #29 and governed scenarios; strategy availability is not advice evidence |
| #28 | Historical cadence/seasonality with confidence, visible evidence and weak-data fallback | Future planning only | Historical/time-window/source-confidence model; no hidden weights or scoring before approval |
| #29 | Withdraw/partial/full/fixed winnings or own-cash recycling with safe/downside/upside and explicit extra-risk consent | Draft workflow, not an advice consumer | Scenario/financial contract, own-cash permission, audit/report trail; no automated wagering |
| #30 | Six governed recommendation/target contracts plus ahead/on/behind and risk fixtures | Target/decision fixture draft exists | Full six-contract set, thresholds/weights and independently approved fixtures; preserve uncovered scenarios |
| #31 | Optional DDHH fixture/player/racing AI context, baseline/delta/source/confidence/human confirmation and offline fallback | Deferred advisory plan | Provider/cache/privacy/search/structured outputs approval; no credentials, autonomous action or AI financial oracle |
| #72 | Daily/weekly/free-to-play opportunity catalogue with source freshness, per-Profile eligibility and reviewed ledger draft/reminder creation | Common Combo presets/reminders/opportunity workflow partially exist | Full fresh-source filters, stale reverify/archive, account warnings/blocks and review linkage; depends #70/#82/#85/#106; profitability not inferred |
| #86 | Explainable tasks plus compact Kanban Complete/Ignore/Skip/No-Low-Value, reasons/value/RTP, cadence/preferences/history; optional later AI | Reminders/dashboard actions exist; task deck draft | Unified task engine and governed dispositions, preferences/history and source-account/balance freshness; clarification5569417310 retained, no hidden auto-priority |

Requests are reviewed as plans/partial building blocks, not runtime PASS. Separate future Bonus SR,
Accumulator/reference gaps, #113 deferral and unlocated historical source requests remain visible.

### PQA-C03: recording and recovery comparison, with limits

Public evidence accessed2026-09-13. Outplayed describes MyBets expected value and actual outcomes
([official tools guide](https://outplayed.com/blog/outplayed-pro-tools-data), updated2026-08-20).
OddsMonkey describes recorded profit/time/tool filters
([official tracker](https://www.oddsmonkey.com/matched-betting/profit-tracker/)). These existing
documentation cells were deepened, not counted again; member interaction remains inaccessible.
Newly located [MBB homepage](https://matchedbettingblog.com/) documents offer-progress tracking.
**C03/MBB advances to DOCUMENTED limited progress capability**, not a financial ledger or proven
expected-versus-actual tracker. The latter remains unlocated/UNVERIFIED; no absent-equivalent claim.
No new hands-on recording/recovery interaction, login bypass or numerical parity is asserted.

OddsMonkey's [2023 reset guidance](https://help.oddsmonkey.com/hc/en-gb/articles/10263028145181-How-Do-I-Reset-My-Profit-Tracker)
describes a member Settings deletion path; its
[2026-01-28 guidance](https://oddsmonkey2.zendesk.com/hc/en-gb/articles/32997810911633-How-Do-I-Reset-My-Profit-Tracker)
directs users to support. Both warn recovery is unavailable. This is a documented version/app-generation
difference, not an observed current member workflow. Existing C06/OddsMonkey stays documentary;
no extra comparison numerator. Our implications: explicit reviewed activity state, distinct projected
versus actual cash performance, explainable task dispositions and correction/history recovery matter
more than copying vendor totals or irreversible reset. #86/#111 and source freshness dependencies
remain the relevant retained requirements; no autonomous wager recommendations.

### Next bounded audit work and publication gates

First unblock actual PostgreSQL with an existing matching server distribution/path or explicit
installation approval; no Will regression assignment. Continue independent populated Casino/Cash
Adjustment/Extra Place ledgers and genuine award-group/source removal/import/restore checks while
that prerequisite is unresolved. Retain network-loss recovery, full combined reports, large data,
screen-reader execution and orphaned historical requirements as named OPEN/BLOCKED rows below.
Do not repeat the already accepted modal/reflow gate absent a regression.
Normal app still lacks the repair stack. Preview remains BLOCKED: prior Vercel deployment disposition
and approved Git-trigger rule, isolated authenticated API/PostgreSQL, #115 exposure disposition and
#96 owner/provider credential rotation. Existing redacted deployment-metadata owner request remains
open; no secrets requested. Local review3034/8034 and its prepared records are preserved, optional.

## Historical checkpoint — deployment safety, reflow and populated journeys

CURRENT, local-only: reporting branch `audit/platform-quality-114`; candidate product revision
`6d2276e00d0a1a540f48f7ecc253e864ad30d5e3` on `repair/modal-boundary-114`. Exact full report/candidate commits are recorded in #114 living
comment5652511529 and the checkpoint receipt. No repository push, PR, merge or deployment is authorised.
Earlier b08962df0ad9658661ec75d7774189116c5aa414 /8b81bfccf0d277889c92ca12fac33eb74bdb20e3
are historical parents, not competing current checkpoints. Main/frozen candidate remain
f7a3b35073ecc87cdf8f8f881129f221ec44d395; development remains
215193b7fcb5b11a28e23a4531d2a45434545dc1. Protected runtime/data mapping below is unchanged.

### Current measured coverage (same denominators; no scope exclusions)

| Measure | Evidence-complete / planned | Whole coverage | Change from initial baseline |
|---|---|---|---|
| Assessment review |38/87|44%|+5 assessments; +6 percentage points|
| Journeys fully exercised |6/24|25%|+1 journey; +4 points|
| Journeys passing required sampled checks |6/24|25%|+1 journey; +4 points|
| Competitor cells |13/27|48%|+6 cells; +22 points|
| Original requests with applicable clarification review |9/133|7%|+5 requests; +4 points|

Area review: functional12/24 (50%), UX7/12 (58%), security6/12 (50%), data5/12 (42%),
sustainability5/12 (42%), requirements2/6 (33%), competitor packages1/9 (11%).
These are coverage, not readiness/time remaining. New complete assessment IDs: PQA-U05/U06/U07,
PQA-R02 and PQA-C02. New complete journey PQA-J12. PQA-J06 remains PARTIAL, not added to numerator.
Competitor breakdown11 documentation-only,2 hands-on,3 blocked,11 unresolved/unexamined.
Finding stages remain cumulative:15 original findings;5 repairs on branches,0 full combined-candidate
verification gate completions,0 integrated locally,0 hosted verified,0 owner accepted. Scoped rendered
checks do not certify the entire combined candidate. Initial scorecard v1 below is historical.

### Reflow/modal gate and evidence

Result PASS / PROVEN for the tested shared gate, not accessibility certification.
At1440px root font-size200% (NOT browser zoom), the identity trigger shrank while its label retained
intrinsic width: arrow right1496.5px exceeded button right1440.7px. Shared intrinsic trigger sizing
and wrapped action-group layout resolve the source, preserving controls/text. Separate320px reflow
passes. Combined320px+200% text independently exposed the shared Add Row min-width8.75rem;
bounded intrinsic minimum and wrapping resolve it without hidden overflow, smaller fonts or removed
actions. Correct attribution: **PD-QA-005 is reflow; PD-QA-003 is missing-Profile handling**.

Artifacts in `/tmp/openforge-modal-114-repair`, synthetic only, not committed:
`free-bet-browser.json` (1440/760/390 both themes), `free-bet-stress-browser.json`
(1440 root text200% and separate320), `free-bet-combined-stress-browser.json` (320+text200%,
document307px/client320px, actual pointer Save200, reopened actual6.00).
Associated invalid text stays editable; correction permits Save. Fixed-delay field assertions were
replaced with polling the same aria-invalid/error/save conditions, not weakened or forced clicks.
`modal-motion-browser.json` records six native Sportsbook/conversion theme-width cases, actual
Escape close/reopen and RAF geometry; observed opacity/transform frames distinguish animation
from settled states. `modal-stress-browser.json` asserts reduced-motion reveal animation:none,
opacity1/transform:none. `modal-interrupted-frame-browser.json` separately captures a controlled
60ms reveal frame and closes/reopens from that interrupted frame at760px both themes. Because
the natural reveal can finish before locator readiness, this dedicated probe restarts the existing
CSS animation before pausing it (opacity0.457636, translateY-5.42364), rather than substituting a
new animation. An earlier late-animation harness failure is retained; it was not a product failure.
Native Free Bet dirty nested Keep Editing/Tab recovery and conversion pending Escape/503 retry,
receipt/async focus return pass. Actual Blackjack UI→Casino receipt/source exclusion/report passes
on this synthetic candidate. Screen-reader execution, every modal variant and broader interrupted
financial animation remain NOT TESTED; these are separate retained checks, not inferred PASS.
Production build and focused TypeScript check pass; unchanged backend Account/Free Bet/completed-source
finite regressions are reused at their inherited revisions, not a new whole-platform test claim.

### Two populated journeys

**PQA-J06 PARTIAL / PROVEN financial/browser slice:** converted SNR/SR £10, back3.00, lay3.10,
commission2%; independent reference stakes6.49/9.74; actual lay6.00; Back Won finals7.40/17.40;
combined report24.80 after reload. Browser performs conversion, destination opening, required
Available state, matching/copy, explicit placement and settlement. Persistence is independently
read; immutable calculator source remains attached. Required history/lineage UI display has NOT
been evidenced: native editor exposes setup/matching/settlement, not an assumed History tab.
An earlier missing Notes locator was a harness assumption, not a discovered financial failure.
One SR settlement wait timed out in a concurrent probe run; cause UNVERIFIED. Unchanged sequential
rerun passes both financial flows. Neither that timeout nor missing history is silently erased.
Next: exercise actual existing lineage/history surface, or record its exact missing consumer under
the retained lineage issue; do not fabricate a new feature or promote the whole journey.

**PQA-J12 PASS / PROVEN:** actual half-width dark review selects two exact Account IDs; one Account
becomes closed after review, causing HTTP200 succeeded/failed targets. First Profile has1 row,
second0. Dialog remains editable; restore synthetic Account eligibility and retry submits only
unresolved target with same intent. Receipt closes/focus returns; counts1/1. Already-saved retry
returns same ID. A deliberate new exploratory intent creates another row: counts2/1. Three actual
notification links each open their corresponding native destination. Inputs retain10.00.
`conversion-partial-journey.json` records UI/API/persistence assertions. It does not substitute
exploratory retry semantics for completed-Blackjack single-session protection. Network-lost-after-
commit browser recovery and actual PostgreSQL concurrency remain separate untested gates.

### Earlier Vercel deployments — read-only disposition

| Source / branch | Confirmed evidence | Target/aliases/protection/auth/API/DB/test configuration |
|---|---|---|
| f57e71ad1b7d35070154b96d3e4f33b15f780d24 / repair/blackjack-source-91 | GitHub Vercel success; [dashboard93AK28L3bWtCK1GqKT61MvuFTs5u](https://vercel.com/homelab11/plum-duff/93AK28L3bWtCK1GqKT61MvuFTs5u) | UNVERIFIED; authorised owner metadata unavailable |
| 7d75b5a54db466b1a47c6d7786ddc633f3dc7122 / audit/platform-quality-114 | GitHub Vercel success; [dashboardGPNAjWmuNa7kGxjKupUngdEU5W3e](https://vercel.com/homelab11/plum-duff/GPNAjWmuNa7kGxjKupUngdEU5W3e) | UNVERIFIED; authorised owner metadata unavailable |

Private dashboard access was unavailable; no endpoint exploits, hosted test writes, live-data copy
or secret values were attempted. Success status alone proves neither production promotion/public
access/data isolation nor a security incident. Repo vercel.json has no branch exclusion. Hosted
source forces auth and requires PostgreSQL configuration, but deployment environment/actual running
auth remain unknown. Test launcher injects synthetic settings locally; no evidence establishes
whether Vercel project environment had test-only settings. Prior deployments need owner disposition,
not merely a future push embargo. One redacted metadata request covers both dashboards: target,
aliases, protection and API/database environment target names, never secrets.

Smallest proposed rule, NOT applied: `git.deploymentEnabled` with `audit/**:false` and
`repair/**:false` in the effective approved Vercel project configuration. Other deliberate release/
approved Preview branches remain governed normally. Verify effective root/overlapping true rules
before any push: Vercel documents minimatch branch rules and true taking precedence over false.
[Official Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration),
accessed2026-09-13. No integration disconnect/broad project change. Publication/Preview BLOCKED
pending owner disposition and approved branch safeguard, isolated API/Postgres/auth configuration,
actual isolated PG transactions, #115 dependency/exposure disposition and #96 provider rotation.
Neither unavailable access nor local optimizer consumers clear exposure.

Unpublished commit-only backup verified at root `.git/local-backups/audit-repairs-20260913.bundle`;
five repair/report refs and f7 prerequisite, no databases/environment/private input observations.
Final refreshed bundle is recorded in checkpoint receipt. Normal/frozen/development/audit records
remain untouched. No product merge is used to synchronise audit documentation.

### Competitor slice — source/date and method separation

Accessed2026-09-13. **C02** three new documentation comparisons:
[Outplayed feature guidance](https://outplayed.com/features) describes offer calendars/step guidance,
catcher filters and progress/expiry handoff; useful context, not observed member interaction or
profit guarantees. [MBB qualifying-bet guidance](https://matchedbettingblog.com/qualifying-bets/)
(updated2023-01-26) separates terms, event/stake/odds constraints and liability/qualifying loss;
historical examples are not current offers. [OddsMonkey Racing Matcher guide](https://help.oddsmonkey.com/hc/en-gb/articles/11145715428509-The-Racing-Matcher-Guide)
(updated2023-07-26) documents dependent offer/race filters, bounded stake, commission and advanced
review. Vendor wager integration does not authorise our autonomous wagering/scraping.
**C06 OddsMonkey** [reset guide](https://help.oddsmonkey.com/hc/en-gb/articles/10263028145181-How-Do-I-Reset-My-Profit-Tracker)
documents explicit Yes Delete confirmation; reset was not executed, restoration/undo remains unknown.
Outplayed/MBB recovery equivalents remain unlocated, not declared absent.
**C07/C08 MBB hands-on:** real Chromium1440/390 at
[public calculator](https://matchedbettingblog.com/matched-betting-calculator/), controls stake10,
back3, lay3.1, back commission0%, lay2%; Tab from stake reaches back odds; Space selects Free Bet
then Normal; inputs stay within viewport. `public-calculator-usability.json` records controls/bounds.
No observed numerical parity, screen-reader/contrast certification or authenticated tracker activity.
Comparison: our contained modal/review/copy/receipt path adds explicit destination identity; requested
#111 interactive actual-performance analytics and #85/#106 balance observations remain gaps.

### Requirement reconciliation — original scope retained

Five new traceability reviews, not five implemented features. Original bodies and every available
clarification read: #70(no comments), #82(comment5569414794), #85(5561926423), #106(5574966194),
#111(no comments). This raises reconciled requests4→9, not whole historical backlog completion.

| Request / intended outcome | Current code/plans and evidence | Retained gap/dependency |
|---|---|---|
|#70 account restriction/gub evidence|Lifecycle/restriction arrays and generic Account audits/eligibility exist; CODE-VERIFIED|Requested chronological previous/new status, reasons/evidence/date/affected families/related-brand warnings are not proven as the full event workflow. Preserve all statuses and IDs; #71/#77 consumers|
|#82 restrictions ≠ commercially dead|Draft Account health/ACPI fixture specs, Extra Place health adapter; DOCUMENTED plans, CODE-VERIFIED bounded NotChecked consumer|Numerical/odds-dependent stake observations, residual capabilities, confidence/profitability reasons and #86 task consumption missing. User-reported brand limits are not global facts|
|#85 quick Account reconciliation|Account editor/audit exists; last_balance_update is request-supplied optional text, CODE-VERIFIED|Ledger-context popup, linked review/quick settle, server-authored financial timestamps remain requested. Account validation repair does not implement observation authority|
|#106 balance observations/freshness|Mutable current balance+generic audit and separate snapshots are not an atomic observation workflow; draft/planned review|Same-value confirmation semantics, atomic append/current update, correction provenance, configured-age/activity freshness, account/Profile/combined trends and no-fake-P&L principle retained; #85/#86 coordination|
|#111 interactive Dashboard/Reports|DashboardChartSurface renders static role=img ReplayableGraph/last-five labels; reports exist, CODE-VERIFIED|Point focus/pin/drilldown, range/grain/metrics/canonical dimensions/presets/data fallback remain planned. Account series depends#106; no fabricated OHLC/difficulty or settled-vs-current conflation; #110 motion|

R02 completes the reviewed Account restriction/balance clarification package. R03 stays OPEN:
reviewing #111 does not complete unread task/AI original clarifications. Fixture specs are not runtime
passes. Source scope, request IDs and orphan requirements remain in the canonical register.

### Local review and exact next gates

Scoped local review READY for the sampled modal/financial UI, not platform/calculator sign-off.
URL http://localhost:3034; API8034; existing isolated synthetic data/token and prepared converted
Profile. Launch without reseed/reset/new auth:
`node /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/modal-boundary-repair/scripts/open_modal_repair_review.mjs`.
`--check` verifies existing authenticated access and prepared records. Optional5–10minute review,
at most three actions: (1) reopen prepared SNR/SR at half width; inspect matching/settlement values
and pointer access; (2) switch light/dark and open/close editor with Escape; (3) inspect prepared
report24.80 and local modal/Blackjack receipt recording. No real wager or full regression assignment.
Local troubleshooting recording lives under `/tmp/openforge-modal-114-repair/review-video`;
synthetic only, not committed/hosted. Earlier before-fix geometry is recorded above; no invented
before screenshot. Known limits: J06 history/lineage, full native pending variants, reader, larger
data, imported/award-group recovery and network-loss paths.

Actual PostgreSQL NOT TESTED. Local initdb/pg_ctl/psql are available; concrete prerequisite is a
new disposable cluster/directory, dedicated loopback port/private socket (e.g.55434), synthetic role/
database and explicit test-only DSN, plus rollback/concurrency/backup/restore fixtures. No5432,
hosted/operational database fallback. Do not claim adapter tests as PG transaction evidence.
Next bounded work: J06 actual history surface; award/import/recovery, PG isolated transaction setup,
remaining populated ledgers/large datasets/reader and historical request reviews. Independent
combined-candidate verification precedes a reviewed integration proposal/post-integration smoke.
No push/deploy/integration/manual acceptance; #115/#96 remain separate.

Audit date: 2026-09-12. Owner acceptance is not implied. Evidence level and test result are separate.

## Executive summary — resumable audit checkpoint

This audit starts from cumulative **main**, not unmerged calculator development. The product remains a
local-first, Profile-isolated reconstruction of the tracker workbook: cash-first current value,
explicit actual placement/settlement, auditable money and human decisions. Oddsmatcher, subscriber
expansion and advisory AI retain their separately approved/deferred boundaries.

Manual comparison deferred by Will; no scheduled date; resume on supplied results or explicit request.
Final calculator sign-off remains pending. Prior finite #113 fixtures do not establish every strategy
combination, all numeric inputs, external parity or owner acceptance.

Checkpoint achieved: repository/issue inventory, isolated native API and rendered route probes,
synthetic portable-restore/security tests, standards/vendor review and prioritisation. This is a
**partial execution checkpoint**, not whole-platform acceptance. Untested areas below must not be
read as passing. The immediate priorities are affected dependencies/credential remediation,
malformed persisted money, controlled API rejection and modal accessibility—not animation polish.

The current audit is executing in batches A–D. Untested areas below must not be read as passing.
Historical initial audit boundary (later bounded repairs are separately authorised above): no application implementation, financial revision, migration, real-record write, credential rotation,
hosted scan or issue closure is authorised by this report.

### Batch 2 executive addendum — populated financial flows

Audit parent `e5218bc1156e1d15ca115219cd4b912e436b8c21`; exercised application source remains
main `f7a3b35073ecc87cdf8f8f881129f221ec44d395`, not unmerged development. On 2026-09-12,
independent synthetic Account, SNR/SR Free Bet and conversion probes establish **financial integrity
failures**, not whole-platform readiness. Invalid Account values persist and incomplete cash totals
look complete; invalid Free Bet creation commits before its 500 response and subsequently breaks
reads/reports; the same completed Blackjack snapshot creates Casino activity in two Profiles.
Clean SNR/SR preview/copy/save/reopen and explicit actual-stake settlement agree with independent
fixtures. Standard conversion retry/new-intent and desktop receipt/focus work in sampled paths;
half-width pointer Save is intercepted by navigation chrome, while keyboard recovery succeeds.

The affected image optimizer is anonymously reachable locally, but attacker-controlled AVIF input
and actual deployed platform/exposure are **UNVERIFIED**. No exploit, upgrade, migration, production
scan, secret rotation or product fix was performed. First proposed implementation: bounded Account
monetary write validation and incomplete-aggregation safety; urgently clarify #115 deployment/input
exposure separately. Free Bet atomic validation and completed-session global duplicate protection
are subsequent independent high-priority repairs, not cosmetic work.

## Protected checkpoint and runtime ownership

| Layer | Full SHA / branch | Runtime and data | Protection |
|---|---|---|---|
| Main / origin/main | `f7a3b35073ecc87cdf8f8f881129f221ec44d395` | Normal 3010 / 8010; root `.env` configures `sqlite:///data/private/db/openforge.sqlite3`; process override not independently inspected | Unrelated dirty files preserved; no main merge |
| Frozen candidate | same full `f7a3b35073ecc87cdf8f8f881129f221ec44d395`; `manual/calculator-candidate-2026-09-12` | `.worktrees/manual-calculator-baseline`; 3020 / 8020; `/tmp/openforge-manual-f7a3b35.hUMolA/runtime/acceptance.sqlite3`; persistent authenticated browser | Unchanged; generated Next type declaration is not an application revision |
| Unmerged development | `215193b7fcb5b11a28e23a4531d2a45434545dc1`; `calculator/multi-lay-normal-parity`, five commits ahead | `.worktrees/multi-lay-normal-parity`; 3013 / 8013; `/tmp/openforge-multilay-parity-20260912.sqlite3` | No merge; dependency symlinks/generated Next declaration left alone |
| Audit | main SHA above; `audit/platform-quality-114` | `.worktrees/platform-quality-audit`; dedicated 3024 / 8024; `/tmp/openforge-platform-audit-20260912-runtime/acceptance.sqlite3` | Existing synthetic authenticated fixture; no shared operational/manual DB |

Original private comparison files remain in root `_input`: `calculator-comparison.html`,
`calculator-comparison.xlsx`, `calculator-manual-comparison-repaired.md`. They are neither duplicated
nor committed. Observations and stable parent case IDs must be retained. Development's launcher remains
`node /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/multi-lay-normal-parity/scripts/open-manual-calculator.mjs`.
It reuses the preserved authenticated runtime/browser without reseeding. Do not launch a different
revision against that database. Historical Monday references are historical only.

Original capture links (local only): [HTML](</Users/will_work/Scripts/Homelab/OpenForge/_input/calculator-comparison.html>),
[Excel](</Users/will_work/Scripts/Homelab/OpenForge/_input/calculator-comparison.xlsx>),
[supplied Markdown](</Users/will_work/Scripts/Homelab/OpenForge/_input/calculator-manual-comparison-repaired.md>).

## Coverage and execution ledger

| Batch | Coverage achieved | Result / evidence | Exact next work |
|---|---|---|---|
| A Goals / inventory / requests | #114 full brief, #113 current deferral, README/status/register/roadmap; protected branch/runtime checkpoint; original #1–114 identities; explicit Account/balance/analytics/task/import requests/clarifications | DOCUMENTED; detailed remaining historical clarification triage pending | Remaining issue-specific clarification triage, no invented missing requests |
| B Functional / rendered / accessibility | Actual isolated API/native rows/refresh and 17 route shells; geometry/themes, lean guard and modal focus/Escape; named auth/restore/backup/eligibility tests | PROVEN scoped PASS/FAIL; full workflows incomplete | Populated Free Bet SNR/SR complete lifecycle first, then other ledgers/bridge/recovery |
| C Architecture / operations / standards / competitors | API/router/Account/summary/SQLite/PG/migration sources, dependency registry/maintainer advisories, official WCAG/WAI/web.dev/ASVS and public vendor pages | CODE-VERIFIED / DOCUMENTED; actual PG/field performance/member journeys UNVERIFIED | True isolated PG recovery, larger-data production benchmark and assistive technology |
| B2 Financial flows / exposure | Eight Account money forms; pending withdrawals; native SNR/SR and converted SNR; populated Standard/Free Bet/Blackjack conversion, retry/partial failure/new intent; desktop/light and half-width/dark dialog | PROVEN scoped PASS/FAIL; blocked and unattempted branches below | Other populated ledgers; actual award-split lineage; stale/timeout/concurrent browser paths; PostgreSQL/large data/reader |
| D Priorities / next tranches | PD-QA-001–015, refined after financial-flow failures | DOCUMENTED recommendations, not implementation | Keep each repair bounded; unknown security exposure remains visible |
| B3 Stacked completed-source repair | PD-QA-015 global target exclusion, same-target retry, independent-process SQLite concurrency and atomic Casino/audit/success rollback; inherited Account/Free Bet regression suites | PROVEN scoped SQLite/API; main still FAIL/unintegrated. No new rendered or actual PostgreSQL execution | PD-QA-004, independent combined candidate, reviewed integration proposal and post-integration smoke; open-gate tests in PD-QA-015 addendum |

## Evidence convention

- PROVEN: current-revision focused observable execution; specify the tested scope.
- CODE-VERIFIED: source inspected, not a whole journey execution.
- DOCUMENTED: authoritative issue/contract/vendor statement, not observed runtime.
- INFERRED: reasoned risk, not established failure.
- UNVERIFIED: source, assistive technology or execution unavailable.

Results: PASS / FAIL / BLOCKED / NOT TESTED / NOT APPLICABLE. Planned scope is NOT TESTED, not PASS.
Screen-reader behaviour, hosted deployments, real PostgreSQL recovery and complete competitor
member journeys remain UNVERIFIED unless explicitly evidenced later.

## A. Goal and request traceability

Canonical feature authority remains the [request register](../planning/plum-duff-next-issue-tracking-register.md)
and [milestone map](../planning/openforge-milestone-contract-fixture-readiness.md), not this audit.
Issue identities #1–#114 were inventoried from both GitHub collection pages. Original issue scope
is retained by links in the appendix; detailed original bodies/current clarifications were inspected
for the explicit Account/balance/task/analytics/import requests and current audit authority. Other
issue-specific historical clarification reconciliation remains explicit next-pass work, not presumed.

| Original request → intended outcome | Current implementation/planned work | Evidence / result | Remaining gap/dependency / issue |
|---|---|---|---|
| Workbook tracker / isolated Profiles | Profile-owned ledgers, current vs settled value, onboarding and reporting | Native two same-name Profiles + 30-row API fixture: PROVEN for tested isolation; whole workflow NOT TESTED | Complete all placement/settlement/report journeys; #1–#13 |
| #70 restrictions / gub log → safe residual use | Lifecycle and restriction arrays/audit coexist; #77 eligibility and Extra Place adapter consume them | CODE-VERIFIED; pure eligibility fixtures PASS | Full chronological restriction-event fields, affected families and related-brand evidence NOT TESTED; #70/#71 |
| #82 capability/profitability → restricted does not mean dead | Draft observation/viability contract; Extra Place explicitly stays `NotChecked` | DOCUMENTED planned; NOT TESTED | Numerical stake evidence, confidence, commercial value and task integration missing; not global bookmaker limits; #82 |
| #85 quick Account reconciliation | Account CRUD and audit exist; timestamp accepted from request | CODE-VERIFIED partial; NOT TESTED complete popup | Ledger-context popup, multi-row review, server-authored balance-change timestamps; #85 |
| #106 observations/freshness → preserve unexplained balance changes | `balance-snapshots` API exists separately from mutable current Account balance | CODE-VERIFIED partial; NOT TESTED requested workflow | Atomic current-balance observation/confirmation, same-value freshness semantics, prompts/trends missing; #106, consumes #85/#86 |
| #111 interactive Dashboard/Reports explorer | Dashboard/report routes and current P&L chart exist | Rendered route shell PROVEN; explorer NOT TESTED/planned | Point keyboard interaction, metric/grain/filter/drilldown and saved presets; balance series depends on #106; #111/#110 |
| #86 tasks / #31 optional advisory AI | Notifications, quick actions and deterministic summary logic exist; draft target/intelligence contracts | DOCUMENTED planned; NOT TESTED full deck/AI | Complete/Ignore/Low Value dispositions, cadence and explainable evidence; AI provider/privacy/cost decision, baseline fallback; #25–#31/#72/#86 |
| #109 Accounts import access → no lost restrictions | `ACCOUNT_SOURCE_MAP` preserves Status, balance, dates; omits Stake Access/Promo Access | CODE-VERIFIED gap; BLOCKED mapping decision | Exact vocabulary + historical LastPromoUsed provenance; catalogue Group/Platform/RiskTeam must stay catalogue-owned; #109/#104 |
| #88 Extra Places recording/settlement | Dedicated ledger, calculator, branching and health adapter exist | Rendered empty ledger PROVEN; settlement NOT TESTED this pass | Rule 4/dead heat/changed terms deferred; capability engine #82; catching/discovery is separate, not delivered by this ledger |
| Catching/discovery / public offer sources | Approved public-source ingestion contracts; source-created offer/Discord work planned | DOCUMENTED; NOT TESTED | #67/#79/#87; OddsForge #52–#56/M8 remains explicitly deferred—vendor catchers do not authorise scraping |
| Calculator/ledger bridge | Existing source envelope, #77 review, destination adapters and idempotency | CODE-VERIFIED; one basic UI/request/copy probe executing | Main v1 versus unmerged v2 boundary below; destination-missing families remain blocked; #35–#40/#113 |
| Notification history | Source-derived events plus durable clear tombstones | CODE-VERIFIED partial; auth-protected endpoint PROVEN | Survive disappearance of source requires durable event boundary, distinct from clear fix; #90/#99/#100 |
| Strict numeric validation | Standard/Sportsbook full-string odds paths; Account money strings still unvalidated | PROVEN FAIL: Account persists malformed/non-finite money | Surface-specific money/rate contract/validation; #91/#112, PD-FUTURE-021/022 |
| Portability / import / restore | Audited XLSX, portable Profile restore, local verified backups and recovery routes | Synthetic portable restore/security tests PROVEN PASS for named cases | Google workbook runtime, hosted template/eligibility #94; three-way merge #95 is design-only; no cloud-sync claim |
| Repository maintenance / truthful status | Canonical status/register exist alongside stale README/roadmap summaries | CODE-VERIFIED FAIL documentation consistency | Routing/bloat review #93; unresolved workbook KPI/product choices #97; no deletion of literal `-` directory |
| Future subscriber/billing/AI | Registration/request surfaces plus deferred role/fee/funding contracts | DOCUMENTED planned; NOT TESTED subscriber operation | #14–#18/#73/#74, separate fee visibility #23 and platform finance contract; no multi-tenant readiness claim |
| Unlocated future requests | PD-FUTURE-001–018 preserved in canonical register | DOCUMENTED BLOCKED | Original text unavailable; #102 remains explicit; do not manufacture requirements |

Contradictions/stale claims: README still lists standalone calculators/bridge and multi-Profile entry
as deferred although code exists. The milestone overview still calls several now-closed issues open
and describes broad backup/auth work as drafted without reflecting later scoped implementation.
Historical statements remain evidence of their date, not current completion gates. #113 finite
family counts are superseded in scope by its configuration extension, not erased. #105/#59 overlap
financial presentation; #90/#99 are different requirements; #106 owns observation data and #111 owns
exploration; #82/#88 are not interchangeable. PD-FUTURE-001–018 remain orphaned-source requests.

## B. Whole-product coverage matrix

Source inventory: **23 page files**, including dynamic Profile tracker/import routes, plus dynamic
tracker modules Dashboard, Accounts, Sportsbook, Free Bets, Casino, Extra Places, Cash Adjustments,
Reports/Profit Tracker/Settings/calculators. Isolated OpenAPI inventory exposes **167 paths / 208
operations**. Enumeration is CODE-VERIFIED, not a test of every operation.

| Route/module or boundary | Current evidence | Result / outstanding execution |
|---|---|---|
| `/login`, session, logout, protected APIs | 12 auth tests plus security-policy test; anonymous Profiles/calculator exchanges/notifications/Accounts all 401 | PASS, PROVEN named checks; real Google callback/provider outage and browser expiry/re-entry NOT TESTED |
| `/register`, `/profiles/requests`, `/cookies` | Page files and registration planning inventoried | NOT TESTED; future subscriber identity/permissions not runtime PASS |
| `/`, `/profiles`, `/profiles/new`, detail/manage | Two same-name synthetic Profiles created with distinct codes via onboarding API; directory rendered | PASS, PROVEN creation/identity fixture; guided fresh Account selection/archive/delete browser journey NOT TESTED |
| Profile lifecycle / denied writes | Auth middleware and archived-Profile middleware inspected | CODE-VERIFIED; archived save/recovery/purge full flow NOT TESTED; unknown-Profile write FAIL below |
| Profile/owner data boundary | Profile-owned API routes; other same-name Profile has zero of 30 native Sportsbook rows | PASS, PROVEN tested isolation only; malicious cross-Account ID, future multi-owner PostgreSQL scope NOT TESTED |
| Catalogue / Accounts / restrictions | Current catalogue endpoint and Account create/update observed; restriction arrays/adapter inspected | FAIL, PROVEN malformed money; complete brand-duplicate selection, health warnings, Account lifecycle UI NOT TESTED |
| Search / navigation / Quick Actions / filters/loadouts | `/search` is protected by server middleware; canonical global search/header rendered at half width | CODE-VERIFIED authority; keyboard search, saved loadouts, stale results, deep-link routing NOT TESTED |
| Dashboard / `/performance` | Profile/combined routes rendered; first rapid probe saw unresolved shell, later probe settled on Dashboard | PASS, PROVEN settled shell; finance semantics/point interaction NOT TESTED; do not label intermediate load empty |
| Sportsbook / opportunity / placement / settlement / undo | 30 synthetic Prospecting rows created, isolated and retained through real browser refresh; native Add Row opened | PASS for persistence; FAIL modal focus/Escape; lifecycle/actual settlement/history/undo NOT TESTED end-to-end |
| Free Bets / lineage / SNR/SR / settlement | Batch2 native SNR/SR real UI preview/copy/Save/reopen; actual7.00 settlement/report31.20; converted SNR API settlement7.40; malformed retained rows break read | PASS scoped numerical/persistence; FAIL atomic malformed write and dangling source; imported/automatic split lineage, stale/concurrent UI NOT TESTED |
| Casino / activity / fees / manual override | Batch2 signed completed Blackjack snapshot saves reviewed10.00 activity and same-target retry; same snapshot other Profile creates duplicate | FAIL completed-session uniqueness; PASS scoped API mapping/provenance; actual played UI conversion and other fee/override journeys NOT TESTED |
| Extra Places / Each Way | Dedicated empty ledger rendered; `NotChecked` capability source inspected | NOT TESTED placement/void/dead-heat/manual override journey; unavailable branches stay tracked |
| Cash Adjustments / fees / cash movements | Ledger shell rendered; fixture-backed cash/Casino/eligibility suite 7 PASS | PASS, PROVEN selected pure fixtures only; complete fee crystallisation/withdrawal/reports workflow NOT TESTED |
| Current Account balances / pending withdrawals / snapshots | Batch2 eight balance forms traced persistence/read/Profile cash/export; four invalid withdrawal strings accepted | FAIL validation/incomplete cash aggregation; combined summary BLOCKED, Account UI input probe BLOCKED; #85/#106 atomic observation remains planned |
| Standalone calculator hub | Standard rendered at 1440/760/390; four widths × two themes measured; one literal independent stake fixture | PASS bounded integration; FAIL 320px/200% reflow; other families integration NOT TESTED; no #113 rerun |
| Embedded calculators / matching/copy | Native editor rendered, shared engines/primitives inventoried | NOT TESTED complete input→preview→copy→save→reopen for every ledger/family |
| Authenticated lean `/calculator` | Authenticated Standard shell rendered; anonymous client revalidation redirects to login | PASS, PROVEN sampled guard; server matcher omits `/calculator` but client auth guard denies it—no API bypass observed |
| Calculator conversion / #77 | Batch2 API partial/retry/new-intent/source/Account denial plus lean dialog saves at1440light/760dark | PASS scoped API and desktop receipt/focus; FAIL half-width pointer interception and Casino clone; keyboard recovery PASS; injected timeout/concurrent and hub/partial UI NOT TESTED |
| Blackjack / current/Last Hand/history/snapshot | Existing proven matrix and session snapshot code inventoried | NOT TESTED live/session financial UI this pass; strategy correctness remains bounded #113 evidence, not UX acceptance |
| `/reports`, Profile Reports/Profit Tracker | Report route shells rendered; approved settled-date/retained-profit sources identified | NOT TESTED all metric aggregates, date/grain/account filters, charts/table drilldown |
| Imports / founder review / checkpoint / recovery | Import/review/recovery pages and API inventory; Account map gap inspected | CODE-VERIFIED; native XLSX/import fallback/browser resume and larger imported dataset NOT TESTED |
| `/profiles/restore` / portable export/restore | Eight synthetic restore tests PASS: checksums, remapped IDs, financial/operational gates, missing authority, rollback/retry, active-attempt and role controls | PASS, PROVEN named tests; browser whole restore walkthrough and Google interoperability NOT TESTED |
| Backups / database restore | 7 backup tests + 2 PostgreSQL adapter tests PASS; 5 backup tests lack required seeded fixture or auth setup | Mixed harness result, not restored operational readiness; actual PostgreSQL restore NOT TESTED |
| Notifications / preferences/history | Route rendered; anonymous endpoint 401; source-generated history/clear distinction inspected | PASS guard/shell; clear race/source removal/retry/notification-link journey NOT TESTED |
| Settings / Account / administration | Profile Settings, Settings and My Account rendered | PASS route shells; persisted toggles, failure rollback, authority edits/provider administration NOT TESTED |
| Subscriber / billing / AI / odds sourcing | Planned contracts and distinct current scope mapped | NOT TESTED / NOT APPLICABLE runtime where deliberately deferred |

Dataset limitation: 30 native Sportsbook records is a modest paginated fixture, **not** a realistic
thousand-row performance benchmark. Imported records were exercised through synthetic portable
restore tests, not a complete imported browser ledger journey. Empty ledgers were explicitly separate.
Partial requests/repeated submissions/stale-response injection and every important API denial remain
next-pass execution work. No score/count certifies full accessibility or all business workflows.

Independent spot-check `PQA-STD-01` (not a whole #113 parity rerun): Normal/Simple/Standard,
stake10, back3, lay3.1, commission0.02 decimal. Exact independent lay30/3.08=9.740259…,
placed/reference penny stake9.74; liability9.74×2.1=20.454; cash branches20−20.454=−0.454 and
−10+9.74×0.98=−0.4548. Approved money quantisation gives liability20.45 and both displayed
branches−0.45. Actual API200 gives9.74/20.45/−0.45/−0.45; actual lean UI request uses
qualifying/Standard/commission0.02 and clipboard contains exactly`9.74`: **PASS / PROVEN** for
this finite integration case only. The earlier zero-commission UI probe independently gives
30/3.1→9.68, liability20.33 and branches−0.33/−0.32; no exact external comparison claimed.

### Calculator integration readiness (main versus unmerged development)

| Family/configuration | Main state | Unmerged development distinction / remaining authority |
|---|---|---|
| Standard Normal/SNR/SR, S/U/O/Custom/Part Lay | Standalone and governed destination paths exist; source mode/default and selected stake governed | Specific current control→API→copy sample only; all conversion retries not reproved here |
| Bonus Normal/SNR × loses/wins | Offer-aware references exist; deferred SR distinct; SNR destination basis remains missing | Old back-wins blocker statement is superseded by later calculator authority, not permission to convert unsupported destination basis |
| Cashback / Money Back / Profit Boost four sources | Governed alias/boost derivation and accepted odds/source provenance present | Exact external comparisons and strategy routing retain #113 evidence boundaries |
| Multi-Lay | v2 standalone richer than embedded/saveable legacy Normal, uniform commission Standard/Underlay | Dev 215193b adds native Normal/no boost/reward planning opt-in and per-leg commission JSON; placement/settlement/richer configurations stay blocked; not merged main functionality |
| Extra Place / Each Way | Native dedicated destination preserves place provenance | Rule 4/dead heat/changed terms remain tracked; broader capability intelligence not delivered |
| Sequential Lay | Standalone Standard/Lock In, planned legs/per-leg commission | Destination lacks complete sequential lifecycle representation; conversion BLOCKED |
| Early Payout / 2UP | Exchange Lay/Dutch trigger/reference modelling | Exploratory trigger cannot become real occurrence; lossless full destination state BLOCKED |
| Multiples / Accumulator | Deterministic core accumulator only | Full bet types/Each Way/Rule 4/bonuses/selection destination remain unresolved/blocked optional extensions |
| Dutching | Simple Normal/SNR 2/3-way with contracted rounding | Advanced allocation authority and full multi-back destination BLOCKED |
| Odds / Probability | Conversion utility, Fractional default | UTILITY ONLY, no ledger action |
| Blackjack | Simulation utility; sufficiently complete Free/Live source → one reviewed Casino activity | Single Profile/session duplicate protection; actual session financial fields, not simulated win estimates |

## C. Standards, external usefulness and sustainability

All web sources accessed **2026-09-12**. No authenticated competitor operation or live bookmaker
scraping was performed. Public page text is directly observed; described member features are
vendor-documented, not executed. External mathematical parity was not rerun by this whole-platform audit.

| Authority / version | Applicable benchmark | Evidence/result |
|---|---|---|
| [Material Design 3 foundations](https://m3.material.io/foundations/) | Existing semantic surfaces, hierarchy, tokens, targets and stateful controls | Official page required JavaScript in text access; foundations text UNVERIFIED. Repository M3 contract and rendered equivalent controls inspected; no M3 certification |
| [WCAG 2.2 Recommendation, 12 December 2024](https://www.w3.org/TR/WCAG22/) | Keyboard, reflow, contrast, focus visibility/order, error identification/prevention, target sizes, announcements | 320px/200% combined stress FAIL and native modal focus/Escape FAIL; contrast and screen-reader behaviour NOT TESTED comprehensively |
| [WAI APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Focus enters dialog, contained keyboard traversal, Escape and focus return | Native Add Row did not move actual focus in observed probe; no reader validation; not fixed during audit |
| [web.dev Core Web Vitals](https://web.dev/articles/vitals), current guidance | LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at 75th percentile | No field distribution or production build benchmark. Development compilation/reloads are not valid field performance PASS |
| [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/), released 30 May 2025 | Auth/session, authorisation, validation, configuration, data protection and safe operations | Named session tests PASS; input persistence FAIL; broad ASVS coverage NOT TESTED, not certified |
| [Outplayed public tools](https://outplayed.com/matched-betting-tools), [features](https://outplayed.com/features) | Advanced calculators, offer review, tracking and discovery are useful distinct tasks | Public descriptions DOCUMENTED. Member offer/record/recovery workflows unavailable. Our tracker-first/isolated cash authority matters more than catchers/feature counts |
| [MBB calculator](https://matchedbettingblog.com/matched-betting-calculator/) | Transparent stake/odds/commission, scenario reference and advanced controls | Public controls/guidance DOCUMENTED; bounded #113 exact comparisons retained separately; no tracking/member parity inferred |
| [OddsMonkey Profit Tracker](https://www.oddsmonkey.com/matched-betting/profit-tracker/) | Expected vs actual, manual/history entry and tools/sport drilldown | Vendor-documented usefulness; authenticated interaction, failure recovery and specific provenance unavailable |

Competitor recommendations: keep reference→review→record effort low, explicit expected/actual values
and usable drilldown; do not equate importing calculator estimates with recognised cash. Offer
discovery/catchers are separate gaps, not implicit #88 scope, and never justify autonomous wagering.

| Sustainability boundary | Inspected evidence | Risk / next check |
|---|---|---|
| Money single source of truth | Decimal engines/contracts, but `tracker-summary.ts:390` parses through Number and returns 0 for invalid values | CODE-VERIFIED aggregation/precision risk; malformed persisted Account value can be omitted as zero; independent reconciliation fixture needed |
| Schema/version/legacy | db.py 9,409 lines; Multi-Lay v1/v2 markers and actual/planning guards; checksum/advisory-lock PostgreSQL migration machinery | CODE-VERIFIED; no legacy migration run. Import/restore contracts must preserve marker/provenance; no historical recalculation |
| SQLite concurrency/read cost | Each ordinary connection opens SQLite, acquires process RLock and initialises schema/seed | CODE-VERIFIED; repeated read cost/scaling INFERRED, not measured. Benchmark before pooling/refactor; PG adapter tests do not prove PG transactional parity |
| PostgreSQL deployment/rollback | Adapter and migration signatures inspected; hosted persistence health fails closed in auth tests | Actual PostgreSQL data/restore/rollback NOT TESTED; separate synthetic PG environment required, never normal remote DB |
| Privacy/backups/retention | Local verified/checksummed backups and portable restore tests; ignored private inputs | PASS scoped restore safety; encryption/cloud custody, retention/deletion/access of backup files and disaster recovery NOT TESTED |
| Auth/role evolution | Owner allowlist/server session protects API independently; future subscriber contracts deferred | PASS sampled owner guard. Future multi-owner/subscriber row authority needs dedicated adversarial tests before exposure |
| Secrets / logging / observability | #96 unresolved credential issue; auth response hides failure details; no secret values read/output | Credential remediation DOCUMENTED unresolved. Log redaction, request IDs, retention and incident recovery NOT TESTED |
| Dependencies | Registry audit 3 critical/13 high/4 moderate entries; pinned Next 16.3.2/sharp 0.35.3/Vitest 4.0.4 | PROVEN affected lockfile; exploitability/exposure distinct, below |
| Test portability/isolation | Fresh worktree lacks private seed expected by numerous old tests; synthetic restore tests self-seed | PROVEN harness debt. Never solve by copying operational workbook exports; provide explicit safe factories/settings restoration |
| Typing/lint/flaky tests | Pinned toolchains and existing tests inventoried; Rosetta Next warning observed | Full typing/lint/flakiness census NOT TESTED; no unrelated broad reruns |
| Dense tables / charts / requests | 30-row browser fixture and containers sampled; initial fast shell queries can still be unsettled | No thousand-row/dense-chart/request-storm benchmark. Intermediate motion NOT TESTED comprehensively |
| Agent/docs sustainability | 269 tracked docs + AGENTS; globals.css 15,794 lines; stale overview assertions | Size is CODE-VERIFIED, maintenance severity INFERRED; routed authority index/safe dedup proposals only (#93), not bulk cleanup |
| External data / hosting / AI costs | Source ingestion/AI/platform-finance drafts and scope boundaries | Provider terms, caching/privacy/cost limits/outage fallback unresolved product decisions; no SaaS/AI scale assumption |

### Dependency exposure distinction

Registry advisory entries are not distinct exploited vulnerabilities. Three critical entries:

- Next 16.3.2: [maintainer AVIF image optimisation advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), patched 16.3.3. Existing next/image consumers use `unoptimized`; endpoint exposure still needs review. No exploit executed.
- Next 16.3.2: [Windows-hosted filesystem advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), patched 16.3.3. Local macOS is not the described Windows condition; other deployments UNVERIFIED.
- Vitest 4.0.4: [maintainer UI/API advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp), patched 4.1.0 for this advisory. Applies to exposed UI/API or Windows Browser/UI conditions; no such server observed. Other advisory minima must also be checked before choosing a version.

## Batch 2 — financial data flow, populated journeys and applicability

All following observations use disposable `AUDIT2-*` Profiles/Accounts in the dedicated 8024 DB.
No operational or manual-candidate records were read or changed. Intentionally invalid values
remain intact; clean lifecycle evidence uses a separate Profile, not repaired corruption.
Original checkpoint SHAs and private comparison files are preserved. Reusing a factory does not
prove native onboarding; UI/API expectations are assessed separately.

### #115 applicability — bounded read-only check

Official maintainer advisories accessed 2026-09-12; versions below are installed/locked evidence,
not a recommendation to bundle upgrades into financial work.

| Dependency / authority | Applicable conditions / local evidence | Reachability / deployment | Supported patch |
|---|---|---|---|
| Next 16.3.2; [AVIF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) | Affected; sharp HEIF loader enabled in image optimizer. Installed sharp 0.35.3 reports heif 1.23.1. No global `images.unoptimized` in Next config; remote patterns empty, local patterns unrestricted by explicit config | Anonymous benign `/_next/image?url=%2Fbrand%2Fplum-duff-wordmark-cropped-v2.png&w=640&q=75` →200 PNG, 28,073 bytes on 3024: PROVEN reachable. Attacker AVIF delivery/exploitability and hosted runtime UNVERIFIED | Next 16.3.3 / 15.5.24 per advisory |
| Next 16.3.2; [Windows advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) | Windows filesystem/runtime condition; local installed platform is Darwin, so that condition is NOT APPLICABLE locally | Deployment OS/config unknown; do not extrapolate local platform | Next 16.3.3 / 15.5.24 |
| sharp 0.35.3; [HEIF advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) | Affected version; Linux/glibc exploitation prerequisites not established by Darwin check | HEIF loader CODE-VERIFIED enabled; untrusted image route/input and deployed prerequisites UNVERIFIED | sharp >=0.35.4; libheif 1.23.2 |
| Vitest 4.0.4; [UI/API advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp) | Affected version; checked config uses jsdom and `vitest run`, no explicit API host/UI exposure | Applicable UI/API/browser configuration not observed in checked config; deployment/process exposure NOT exhaustively verified | 4.1.0 / 3.2.5 for this advisory; not an all-advisory clean-version claim |

Unoptimized consumers do **not** prove optimizer absence. Immediate risk notice was given during
the audit. No urgent exploitable RCE was established, and unknown exposure is not “safe.” Separate
bounded proposal: owner-authorised deployment OS/version/image-input inventory and patched-version
remediation with representative auth/image/financial regressions; no exploit or production scan.

#96 remains separately BLOCKED pending the owner/provider action: rotate/reset the exposed Google
OAuth client secret in Google Cloud Console, invalidate the old secret, securely update authorised
runtime configuration and verify sign-in/callback plus old-secret invalidation. This audit neither
reads out secret values nor performs rotation; provider permissions and completion remain unverified.

### Account money — PD-QA-002 and PD-QA-007

Independent expectation: a supplied balance must be contract-valid finite money or explicitly
supported absence. Malformed/non-finite money must fail before writes; an invalid constituent must
not produce an apparently complete cash total. This adds no rounding, coercion or null policy.

Each tested Profile has a valid £10 Bank A plus a separate tested Lloyds Bank Account. The null
POST fails; a separate valid £0 control is then used to test null PUT rejection, not to repair
invalid data. Read-only SQLite queries establish persistence after each actual API mutation.

| Supplied `current_balance` | POST / PUT | Persisted / Account read / summary sources | Profile cash UI / export | Result / evidence |
|---|---|---|---|---|
| `12.34` | 201 / 200 | exact string; GET200; sources200 | Bankroll and dashboard £22.34; XLSX200 | PASS / PROVEN |
| `0.00` | 201 / 200 | explicit zero preserved; GET200 | £10.00; XLSX200 | PASS / PROVEN |
| blank `""` | 201 / 200 | blank retained; GET200 | £10.00; XLSX200 | Supported write observed; absence/zero aggregate semantics require product clarification |
| null | 422 / 422 | null rejected; valid control unchanged | control £10.00; XLSX200 | PASS rejection / PROVEN; no claim null is supported |
| `not-money` | 201 / 200 | invalid string retained; GET200; sources200 | Individual cell “Unavailable”; Bankroll £10.00 and “2 accounts included”; dashboard cash £10.00; XLSX409 invalid decimal | FAIL / PROVEN |
| `NaN` | 201 / 200 | same invalid persistence/read | “Unavailable”; apparent complete £10.00; dashboard £10.00; XLSX409 non-finite | FAIL / PROVEN |
| `Infinity` | 201 / 200 | same invalid persistence/read | first Account capture still loading, not valid cell evidence; settled dashboard £10.00; XLSX409 non-finite | FAIL write/export/aggregation / PROVEN; individual rendered cell UNVERIFIED |
| `-Infinity` | 201 / 200 | same invalid persistence/read | “Unavailable”; Bankroll £10.00 / 2 included; initial settled dashboard £10.00; XLSX409 non-finite | FAIL / PROVEN |

`pending_withdrawal_amount` PUT also accepts all four malformed/non-finite strings (200), verified
persisted exactly. UI money entry attempt did **not** reach Save: audited page remained in loading
state before the Account edit button appeared. Thus UI enforcement is BLOCKED by probe/runtime
readiness, not inferred from API acceptance or source inspection. Profile Reports P&L zero is **not**
an Account cash balance; no assertion that it coerces cash to P&L. Combined Fund Manager summary was
attempted but not settled before subsequent malformed Free Bet rows caused source reads to fail:
combined aggregate numeric result remains BLOCKED, rather than claimed £0 or complete.

Impact: authenticated malformed balances/withdrawals survive successful writes, cash totals omit
them without an incomplete warning, and portable export later fails. Account writes do not crash;
export rejects later. Traceable individual “Unavailable” display does not fix aggregate truth.
Future regression: finite £12.34 + £10 = £22.34; explicit zero control; each invalid input rejects
atomically; previously invalid constituent makes cash summary explicitly incomplete; report/export
give controlled diagnostics. Null/blank policy must be explicit, not guessed.

### Populated Free Bets — independent fixtures and persistence

Inputs: £10 free stake, back5.00, lay5.20, commission **2% = 0.02**, Standard; actual stake remains
unset until Save/placement. Independent penny placement: SNR `10*(5-1)/(5.2-.02)` →7.72;
SR `10*5/(5.2-.02)` →9.65; liability placed stake *4.2 then monetary rounding.

| Journey / input distinction | Expected | Actual | Result / evidence |
|---|---|---|---|
| Native SNR preview | lay7.72; liability32.42; back-win7.58 / lay-win7.57 | exact API components; UI clipboard7.72 | PASS / PROVEN |
| Native SR preview | lay9.65; liability40.53; back-win9.47 / lay-win9.46 | exact API components; UI clipboard9.65 | PASS / PROVEN |
| Both: copy → Save → reread | actual draft not persisted before Save; saved actual equals copied stake | UI Save closes, API statusPlaced with7.72/9.65; subsequent reopen | PASS / PROVEN sampled path |
| Explicit actual7.00 → Back Won settlement | liability29.40; SNR40-29.40=10.60; SR50-29.40=20.60; lay branch6.86 | API/reopened Settlement display10.60/20.60; combined Profile Free Bet report31.20 | PASS / PROVEN; reference != actual != final |
| Repeated settlement / cross-Profile read / missing required identity | one row; denied foreign read; invalid identity no row | repeated PUT200 one ID; foreign GET404; missing event/strategy422 | PASS / PROVEN scoped |
| Converted SNR: stake10, back3, lay3.1, c.02 | reference20/3.08 →6.49, liability13.63; actual6.00 settledBackWon gives20-12.60=7.40 | preview/placement/settlement/retry200; provenance unchanged; one row7.40 | PASS / PROVEN API; converted-row full browser lifecycle NOT TESTED |
| Malformed native Placed valueNaN | controlled422, zero writes | POST500 **after persistence**; row/list/source-summary500; later UI/reports blocked | FAIL / PROVEN, PD-QA-014 |
| Separate malformed `not-money` / missing Profile | malformed422 zero writes; missing Profile controlled denial | malformed500 after persistence; missing Profile500 with zero row | FAIL / PROVEN; no partially-created missing-Profile record |
| Blank stake / foreign-only brand name | incomplete preview truthful; new placement authority needs review | blank Placed201, calculation incomplete/null; foreign-only bookmaker name201, commission missing/null calculation | CODE-VERIFIED contract gap / PROVEN response, not evidence of cross-Profile data disclosure |
| Archived Profile mutation | deny no write |409, zero row | PASS / PROVEN |
| Award source deletion / linkage | preserved auditable award lineage or governed safe-removal response | synthetic source DELETE204, two linked free rows survive pointing at removed source ID | FAIL audit linkage / PROVEN; actual award-split path/deletion policy BLOCKED pending dedicated authority |

Clean Profile C was introduced only after the original Profile A's invalid persisted Free Bets
broke reads. That blockage is a product failure, not private-seed setup failure. Original A remains
unchanged as evidence. Native source linkage used an explicit synthetic qualification source;
automatic award splitting, imported workbook lineage and transactional source removal were NOT
TESTED. Notifications endpoint was read, but a settlement-specific notification requirement was not
established; no claim of full settlement notification coverage. Stale-preview and concurrent-submit
browser assertions remain NOT TESTED. No actual casino/bookmaker wager is executed by these probes.
The native button's actual accessible name is **“Copy Standard free-bet lay stake and mark placed”**:
its handler applies the reference to actual-stake draft fields and sets draftPlaced; Save persists
that explicit combined action. This is not evidence of clipboard-only behaviour or a separately
confirmed placement step. Pure-copy versus combined apply/mark semantics need explicit workflow
review; later actual£7 placement in this audit was a separate directAPI entry, not a real wager.

### #36/#77 conversion — retries, identity, receipts and failure

| Probe | Actual / independent invariant | Result / evidence |
|---|---|---|
| Standard10/back3/lay3.1/c.02 | reference30/3.08 →9.74; destinationProspecting; canonical Profile/Account IDs and SHA-256 source retained | PASS / PROVEN API + browser sampled save |
| Two targets, second Bonus Restricted | HTTP200 contains succeeded A / failed B; B no row. Retry keeps A same record and B failure | PASS partial-result semantics / PROVEN API; partial-review browser recovery NOT TESTED |
| Deliberate new intent, identical fixed source/hash | second operation creates a distinct exploratory row; successful targets not recreated on same-operation retry | PASS / PROVEN API |
| Foreign Account ID / unsupported Bonus SR |422 before target/business rows | PASS / PROVEN |
| Native Free Bet destination | SNR source → Free Bet Prospecting with provenance; subsequent explicit actual placement and settlement above | PASS / PROVEN API |
| Completed Blackjack Live own_cash | signed synthetic one-hand snapshot, balances100→110: settled Casino Manual Play / No Offer, result10.00; checksum retained; same-target retry one record/event | PASS / PROVEN API; actual played Blackjack UI-to-save NOT TESTED |
| Same completed Blackjack snapshot, other Profile | **200 creates second Casino row**, same source/checksum and+10 result. Should409/already-saved globally, no duplicate real activity | FAIL / PROVEN, PD-QA-015 |
| Tampered Blackjack mode with original checksum |422 checksum guard | PASS tamper rejection only; correctly signed Simulation guard NOT TESTED by this probe |
| Desktop1440/light conversion | modalfocus inside; Save200 closes once; focus returns; inputs10/back3 intact; calculator receipt identifies Profile/Account/Sportsbook and Open row link | PASS / PROVEN sampled path |
| Half-width760/dark conversion | modal `[24,752]`, top16/bottom984; Save44px target atx522.6/y917.4; `elementFromPoint` finds `tracker-nav tracker-nav-right`; pointer click times out. KeyboardEnter saves/closes/returnsfocus with receipt | FAIL pointer access / PROVEN; keyboard recovery PASS; extends PD-QA-004/#92 |
| Notification / retry | one source-linked conversion notification for each created record; exact replay does not add another row/event; href retained | PASS scoped / PROVEN API/source evidence |

Blackjack failure root is CODE-VERIFIED: `save_blackjack` starts idempotency with target Profile and
Account identity; there is no completed-source global claim before that target-specific operation.
Single-Profile UI selection prevents cloning in one dialog but does not enforce single real activity
across API calls. No Casino P&L is silently repaired. Same visible brand in different Profiles is
tested with distinct canonical IDs; same-brand distinct Accounts **within** one Profile remain NOT
TESTED. Timeout/ambiguous network delivery and simultaneous double-submit were not injected:
replays occurred after confirmed commits. Normal hub bridge and actual Blackjack UI completion are
remaining browser paths; sampled rendered conversions were on authenticated lean `/calculator`.

### Probe execution / harness and reflow boundaries

Reusable observation runner: `scripts/audit_platform_quality_batch2.mjs` modes `money`, `boundaries`,
`lifecycle`, `lifecycle-clean`, `conversion`, `api-followup`, `ui`, `money-ui`, `money-ui-direct`,
`reflow`, `verify`. Runtime/fixed owner guards prevent fallback to operational8010. It does not
reset/repair data and emits diagnostic JSON only to the isolated runtime, not committed secrets.
`verify` rechecks captured synthetic outputs against fixed independent assertions, never production
calculation functions. 28 bounded assertions:19PASS/9FAIL (four invalid balances, four invalid
withdrawals, one cross-Profile completed-session duplicate). These are **not** whole-journey totals.

Fixture/probe failures separately recorded: early exact-label mismatch in canonical select locator,
initial unhandled response-wait error, reading plain500 as JSON, and later20s navigation/load or
8s/20s Account readiness timeouts (including a follow-up after login/health recovered). No
assertions were weakened to call pointer interception a PASS;
keyboard recovery was exercised and labelled separately. Switching navigation wait to DOM content
readiness avoids waiting on unrelated resource completion, but does not fix slow product requests.

Reflow observations on sampled Standard lean page:320px at100% document305px; desktop1440 at200%
document1425px: no page overflow observed in these two conditions. Combined320/200% was attempted
but navigation stalled before usable content: BLOCKED, not a WCAG failure/pass. Separate batch1
399px overflow remains historical sampled evidence; untested populated-modal combined stress,
all focus states, animation intermediate frames and screen-reader output remain UNVERIFIED.
Audit and protected web processes remained listening; later login health requests timed out during
local stalls. This is not proof that normal services stopped, and none were terminated/restarted.

## D. Prioritised findings and bounded next tranches

Every row applies to main f7 unless explicitly development/planned. Severity is impact potential;
exposure and evidence prevent assuming a critical advisory means current exploitation.

| ID / area | Expected versus actual / reproducible evidence | Result / evidence | Severity; likelihood/exposure; impact | Effort/dependencies / recommendation / acceptance test | Issue |
|---|---|---|---|---|---|
| PD-QA-001 Dependencies | `pnpm audit --json`: affected Next/sharp and dev packages, 3 critical/13 high/4 moderate entries | FAIL / PROVEN lockfile; DOCUMENTED advisory, UNVERIFIED exploitability | Critical potential; conditional exposure; security/data integrity | Small–medium: authorised patched upgrade + exposure review; scoped auth/finance/restore regressions and fresh audit | #115, parent #114 |
| PD-QA-002 Account money | Batch2 POST/PUT accept not-money/NaN/±Infinity, retained; withdrawalPUT accepts same; Account GET200, export409 later | FAIL / PROVEN isolated API/persistence/downstream; UI write BLOCKED readiness | High; authenticated malformed/import input plausible; misleading bankroll/export failure | Small per-surface contract; reject before write; incomplete summaries explicit; no coercion or historical rewrite | #91/#85 |
| PD-QA-003 Missing Profile write | Valid-shaped Sportsbook POST to AUDIT-MISSING-PROFILE →500/FK failure rather than 404/422 | FAIL / PROVEN API | Medium; stale URL/direct request plausible; reliability, no successful phantom write observed | Small: canonical parent existence validation/error boundary; verify all ledgers with missing/stale Profile zero-write fixture | #114 |
| PD-QA-004 Modal focus/Escape/pointer containment | Batch1 native editor focus/EscapeFAIL; batch2 lean conversion760dark Save hit belongs to tracker-nav-right; keyboardEnter recovers, closes and restoresfocus | FAIL / PROVEN DOM/hit geometry; recoveryPASS | High keyboard/native workflow; medium pointer conversion obstruction; half-width use | Medium shared shell; portal/stacking/viewport/focus/Escape regressions; don't force-click or hide navigation | #57/#61/#92/#36 |
| PD-QA-005 Text reflow | Standard at320px with root32px (200%) →document width399px in light/dark; 16px at390/760/1440 contained | FAIL / PROVEN geometry; exact offending track not yet isolated | Medium; narrow/enlarged use; unreadable/offscreen controls | Small–medium shared fields/rail; separate320px normal,200% desktop,combined stress, no page overflow/label clipping | #35/#92 |
| PD-QA-006 Synthetic test independence | Fresh audit worktree 74 selected tests →31pass/43fail; missing private seed makes demo Profile writes FK-fail. Independent auth/security/restore21pass; backups/PG9pass/5setupfail | FAIL harness / PROVEN | High assurance debt; new checkout/CI likely; hides product failures or sensitive-data dependency | Medium: explicit synthetic factories/catalogue/settings; fresh checkout with no private inputs passes focused suites; do not rewrite expectations | #113/#114/#93 |
| PD-QA-007 Financial aggregation authority | Batch2 invalid stored balance + valid£10 yields apparent complete£10 cash / two Accounts included; source API retains invalid string, export409 | FAIL / PROVEN Profile runtime; combined summary BLOCKED | High; malformed balance accepted; understated/unknown bankroll looks reviewed | Small bounded incomplete-aggregation handling alongside Account validation; independent known/unknown/null fixtures, no silent coercion | #91/#11/#114 |
| PD-QA-008 Account access import | ACCOUNT_SOURCE_MAP omits Stake/Promo Access and LastPromoUsed not recomputed | BLOCKED mapping / CODE-VERIFIED + DOCUMENTED | High workflow; imports; lost eligibility evidence | Small–medium contract vocabulary/provenance first; synthetic restricted/unknown labels review + roundtrip isolated | #109/#82 |
| PD-QA-009 Balance intelligence | Mutable latest Account balance plus separate snapshot API do not establish atomic observations/freshness UI | NOT TESTED requested scope / CODE-VERIFIED partial | High operational; all manual balances; stale cash / misleading trends | Medium #85/#106 contract; preserve unexplained changes, same-value confirmation and auditable timestamps; no fake ledger activity | #85/#106 |
| PD-QA-010 Ledger/planner version gap | Rich v2 Multi-Lay standalone not wholly saveable/settleable; dev Normal per-leg planning slice not main | BLOCKED remaining contract / CODE-VERIFIED | High money workflow; new configs; silent flattening risk if guards bypassed | Contract-gated slice/explicit UI eligibility; v1 actual/history untouched, unsupported configurations zero writes, create-preview-copy-save-reopen | #36/#38/#113 |
| PD-QA-011 Durable notifications | Source completion/removal can end source-derived history despite reliable clear tombstones | NOT TESTED full requirement / DOCUMENTED gap | Medium; lifecycle completion; lost task/event context | Approved smallest event boundary; completion/removal keeps viewer-authorised history without source mutation | #90/#99 |
| PD-QA-012 Request truth / stale docs | Overview says capabilities deferred/open contrary to current code/live issue states; 18 unlocated requests remain | FAIL docs / CODE-VERIFIED; BLOCKED missing original text | Medium; every handoff; scope lost/false assurance | Small routed status update proposal, preserve history/IDs; link authority/current evidence; user supplies original text for #102 | #93/#98/#102/#113 |
| PD-QA-013 Credential rotation | #96 still open/current register NOT STARTED; no verification of invalidation | BLOCKED authorised remediation / DOCUMENTED | High potential; previously exposed credential; provider/security | Small separate secret-provider operation; invalidate old credential and verify secure new config without publishing values | #96 |
| PD-QA-014 Free Bet atomic financial validation | PlacedNaN and not-money POST500 **after commit**; retained rows cause list/source/report500. Missing Profile500 no row. Clean SNR/SR fixtures pass separately | FAIL / PROVEN API + persistence + UI downstream; mainf7 | High; authorised malformed input; ledger/report availability and unknown financial state | Small dedicated Free Bet pre-write finite validation/calculation and transaction boundary; each invalid submission controlled4xx + zero writes; independent SNR/SR actual settlement/report regressions | #91/#114; Free Bet/bridge #36 |
| PD-QA-015 Completed Casino duplicate activity | Same Blackjack checksum+session saves+£10 Casino result into two Profiles; same-target retry dedup works | FAIL / PROVEN API/SQL; root CODE-VERIFIED target-only claim | High; authorised repeated/cross-target save; double recognised activity/P&L | Small independent bridge global completed-source claim; reject second target while preserving same-target retry and new exploratory intent | #36/#40/#114 |

No product fixes were made. Recurring UI findings reuse existing #92/#57/#61 rather than create a
new style/policy system. New dependency remediation #115 was deduplicated against existing issue titles.

### Three proposed implementation tranches (approval required)

Batch1's bundled recommendations are superseded in priority/scope, not erased as historical
evidence. Each recommendation below is a separate implementation approval; no upgrade/harness/modal
redesign bundled into money validation.

1. **Account monetary input and incomplete aggregation (#91, PD-QA-002/007):** first repair unless
   #115 review establishes urgent reachable exploit conditions. Finite complete-string validation
   on create/update/withdrawals; controlled unknown summaries for already-invalid sources. Gates:
   UI/directAPI invalid zero-write, explicit zero/blank/null policy, £22.34 independent control,
   export diagnostics, Profile isolation, no historical balance rewrite. No framework refactor.
2. **Free Bet atomic validation (#91/#36, PD-QA-014):** validate/calculation failure before commit,
   controlled missing Profile and invalid money response. Gates: NaN/Infinity/not-money zero writes;
   populated SNR/SR preview/copy/actual placement/finalreport; award lineage safely retained; no
   silent recalculation of historical rows. Separate from Account implementation.
3. **Completed-session global idempotency (#36, PD-QA-015):** one real Blackjack snapshot cannot
   create multiple Casino activities. Gates: same-target retry stable, second Profile/Account no
   write, concurrent claim test, exploratory new-intent remains legitimate, source checksum and
   Notifications unchanged. Modal pointer/focus fixes belong in another focused #92 tranche.

Conditional urgent security repair remains separate #115: maintainer patch + exposure evidence and
scoped regressions only. Credential rotation #96 is its own provider/owner operation. Subsequent
Account access/observations #109/#85/#106, analytics #111 and advisory tasks #82/#86 remain visible;
these audit priorities do not delete or silently deprioritise the original requests.

Product decisions still unresolved: Account access vocabulary/historical promo fallback; same-value
balance confirmations; capability evidence confidence/expiry; subscriber/fee-role exposure; saved
Reports presets; external source/AI terms, costs and retention; lossless richer calculator destination
representations; Accumulator specialised bets and Dutch Advanced allocation; original 18 requests.

## Reproduction, limits and exact next checkpoint

Existing isolated authenticated fixture was launched from this audit worktree:

```sh
./scripts/run-python.sh scripts/run_notification_persistence_acceptance_api.py --port 8024 --runtime-directory /tmp/openforge-platform-audit-20260912-runtime
```

That command creates/seeds **once** and refuses an existing directory. Do not rerun it to reset this
runtime or the protected candidate. Audit web uses canonical Next dev on3024 with
`OPENFORGE_INTERNAL_API_BASE_URL=http://127.0.0.1:8024` and the existing synthetic auth fixture config.
It must never fall back to8010. Fixture cookie remains a private0600 file, never an audit attachment.

`node scripts/audit_platform_quality.mjs` reuses the dedicated8024 runtime and records synthetic
observations to its local `audit-evidence.json`. It does not reset data; intentionally invalid
Account money is restricted to AUDIT-114-B. That file is diagnostic, not committed/private-cookie
evidence. Findings may be FAIL although the observation runner exits normally.

Focused commands/results:

- Auth/security/portable restore:21PASS (12auth +1policy +8restore), at current main source.
- Backup/PostgreSQL adapter:9PASS/5fixture-or-auth-setupFAIL; actual PostgreSQL NOT TESTED.
- Cash/Casino values/eligibility:7PASS, exact existing synthetic fixtures only.
- Initial combined selection:31PASS/43FAIL, retained as harness evidence rather than product assurance.
- Actual browser/API: two same-name distinct Profiles,30native rows, isolation/refresh,17route shells,
  Standard reflow widths/themes, lean auth and native editor focus/Escape. No console errors observed
  on these sampled paths; this does not clear all runtime warnings everywhere.

**Exact next audit area after batch2:** first complete the blocked Account UI finite-input and
combined-summary probes without repairing retained invalid synthetic rows; then native award-split/
imported Free Bet lineage and safe removal, correctly signed Simulation denial, actual Blackjack
UI-to-Casino save, normal-hub bridge and partial-review recovery. Test concurrent/ambiguous delivery,
stale previews and same-brand distinct Accounts within one Profile. Then populated Casino/Extra
Places/Cash-fee workflows, complete modalfocus/Escape/reflow/intermediate motion both themes,
true isolated PostgreSQL recovery, larger-data production performance, remaining historical request
clarifications and actual screen-reader testing (UNVERIFIED). These are not passed by indexing titles
or by the28 independent assertion checks above.

### #113 return instructions — no scheduled date

On supplied comparisons or Will's explicit resumption: launch the preserved f7 candidate using the
existing wrapper above; choose the original HTML/XLSX files from `_input`; retain original parent
case IDs, tested full commit/date and user observations. Compare any newer candidate separately
with its own DB. Retest affected development cases (Multi-Lay per-leg Normal save/reopen/native
Add Row) rather than borrowing f7 acceptance. Sequential2/4,2UPDutch/slider edges,DutchSNR/3-way,
ProfitBoost strategy/cap and full Blackjack rules remain explicit repeat coverage;79runs is not
exhaustive. BonusSR stays separately deferred. Review every unexplained mismatch before sign-off.

## GitHub sync / delivery boundary

Authenticated sync succeeded: [#114 checkpoint comment](https://github.com/wolney8/OpenForge/issues/114#issuecomment-5646238440),
[#91 money finding](https://github.com/wolney8/OpenForge/issues/91#issuecomment-5646238510),
[#92 rendered findings](https://github.com/wolney8/OpenForge/issues/92#issuecomment-5646238590),
[#113 evidence/deferral](https://github.com/wolney8/OpenForge/issues/113#issuecomment-5646238654);
deduplicated dependency remediation [#115](https://github.com/wolney8/OpenForge/issues/115).
No closure, hosted deployment or product implementation. Intended checkpoint files are this report,
PROJECT_STATUS, the existing canonical register and the isolated audit observation runner only.

Batch2 authenticated sync: [#114](https://github.com/wolney8/OpenForge/issues/114#issuecomment-5646667540),
[#91](https://github.com/wolney8/OpenForge/issues/91#issuecomment-5646667609),
[#36](https://github.com/wolney8/OpenForge/issues/36#issuecomment-5646667680),
[#92](https://github.com/wolney8/OpenForge/issues/92#issuecomment-5646667760),
[#115](https://github.com/wolney8/OpenForge/issues/115#issuecomment-5646667823),
[#96](https://github.com/wolney8/OpenForge/issues/96#issuecomment-5646667890).
No new competing issue/report, product implementation, merge, issue closure or hosted claim.
Final read-only health recheck: normal3010/8010, development3013/8013, manual3020/8020 and
audit3024/8024 all returned200 on `/login` (web) / `/healthz` (API), after earlier transient stalls.
No service was restarted or data reset; earlier probe blockers remain evidence of their attempt.

## Original issue scope index — identities preserved, not completion claims

This index retains every inventoried original issue and intended outcome by its original title/link.
Closed GitHub state does not establish a current workflow PASS. This is a coverage checklist, not
permission to implement deferred scope. Refer to A/B for examined requests and observable evidence;
remaining issue-specific clarification triage is explicitly pending. #115 is the new deduplicated
dependency finding, not a replacement for any original idea.

| Issue | Original requested outcome/title | Issue state on 2026-09-12 | Audit scope/evidence boundary |
|---|---|---|---|
+| [#1](https://github.com/wolney8/OpenForge/issues/1) | Audit current OpenForge source pack and freeze authoritative inputs | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#2](https://github.com/wolney8/OpenForge/issues/2) | Create workbook blueprint and sheet inventory for OpenForge Tracker | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#3](https://github.com/wolney8/OpenForge/issues/3) | Create workbook field map, formula map, workflow map, and cash-first map | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#4](https://github.com/wolney8/OpenForge/issues/4) | Draft profile-scoped OpenForge schema and route architecture | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#5](https://github.com/wolney8/OpenForge/issues/5) | Write calculation contract for sportsbook cash-first current value | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#6](https://github.com/wolney8/OpenForge/issues/6) | Write calculation contract for free bet cash-first current value | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#7](https://github.com/wolney8/OpenForge/issues/7) | Create synthetic fixture pack for sportsbook and free bet regression tests | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#8](https://github.com/wolney8/OpenForge/issues/8) | Implement first pure sportsbook calculation module with unit tests | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#9](https://github.com/wolney8/OpenForge/issues/9) | Build local-first Login -> Profiles -> Tracker application shell | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#10](https://github.com/wolney8/OpenForge/issues/10) | Build Tracker MVP modules with profile isolation | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#11](https://github.com/wolney8/OpenForge/issues/11) | Build reporting parity for per-profile and cross-profile summaries | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#12](https://github.com/wolney8/OpenForge/issues/12) | Add spreadsheet-shaped import/export with audit trail | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#13](https://github.com/wolney8/OpenForge/issues/13) | Lock confirmed profiles/subscribers foundation for OpenForge | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#14](https://github.com/wolney8/OpenForge/issues/14) | Deferred: Define Subscriber Role and Access Model | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#15](https://github.com/wolney8/OpenForge/issues/15) | Deferred: Define Subscriber Visibility Matrix and Read-Only Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#16](https://github.com/wolney8/OpenForge/issues/16) | Deferred: Define Self-Service Subscriber Fee Model | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#17](https://github.com/wolney8/OpenForge/issues/17) | Deferred: Plan Secure Invite and Subscriber Onboarding Boundary | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#18](https://github.com/wolney8/OpenForge/issues/18) | Deferred: Add Subscriber Access Control and Fee Regression Fixtures | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#19](https://github.com/wolney8/OpenForge/issues/19) | Build local-first Login -> Profiles -> Tracker shell with scaffold and local DB baseline | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#20](https://github.com/wolney8/OpenForge/issues/20) | Add local database and backup-ready storage baseline for OpenForge shell | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#21](https://github.com/wolney8/OpenForge/issues/21) | Implement first pure calculation with approved fixtures and tests | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#22](https://github.com/wolney8/OpenForge/issues/22) | Implement first profile-scoped tracker workflow slice | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#23](https://github.com/wolney8/OpenForge/issues/23) | Plan Fee Calculation Visibility and Explicit Fee Withdrawal Workflow | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#24](https://github.com/wolney8/OpenForge/issues/24) | Plan Multi-Profile Bet Entry Workflow With Account Eligibility Checks | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#25](https://github.com/wolney8/OpenForge/issues/25) | Define Target Engine scope, safety boundaries, and decision-support rules | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#26](https://github.com/wolney8/OpenForge/issues/26) | Design Fund Manager target-setting model for weekly, biweekly, and monthly periods | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#27](https://github.com/wolney8/OpenForge/issues/27) | Plan recommendation modes for standard, underlay, overlay, and upside-chasing decisions | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#28](https://github.com/wolney8/OpenForge/issues/28) | Plan historical cadence and seasonality inputs for target decision support | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#29](https://github.com/wolney8/OpenForge/issues/29) | Plan casino recycling and winnings-allocation decision logic | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#30](https://github.com/wolney8/OpenForge/issues/30) | Create contracts and fixtures plan for target engine decision support | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#31](https://github.com/wolney8/OpenForge/issues/31) | Plan optional AI-assisted context layer for target engine recommendations | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#32](https://github.com/wolney8/OpenForge/issues/32) | Add Common Bet Combo Buttons for Sportsbook Bets and Casino Offers | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#33](https://github.com/wolney8/OpenForge/issues/33) | UI polish: animated outcome cards and currency-first financial value formatting | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#34](https://github.com/wolney8/OpenForge/issues/34) | Sportsbook: Profile-aware special-offer bookmaker suggestions | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#35](https://github.com/wolney8/OpenForge/issues/35) | Calculator Workspace: Add profile-scoped standalone calculators surface | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#36](https://github.com/wolney8/OpenForge/issues/36) | Calculator Workspace: Create sportsbook draft row from calculator state | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#37](https://github.com/wolney8/OpenForge/issues/37) | Calculator Contracts and Fixtures: Standalone calculator families | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#38](https://github.com/wolney8/OpenForge/issues/38) | Advanced Calculator Backlog: Each-way, dutching, sequential lay, and later sportsbook expansions | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#39](https://github.com/wolney8/OpenForge/issues/39) | Sequential Lay Planning: acca timing, next-leg workflow, and notifications | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#40](https://github.com/wolney8/OpenForge/issues/40) | Casino Utility Backlog: blackjack strategy calculator and spin counter | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#41](https://github.com/wolney8/OpenForge/issues/41) | Sportsbook: Add pending placed date-range quick filter in table | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#42](https://github.com/wolney8/OpenForge/issues/42) | Sportsbook: Enable sortable column headers for operational triage | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#43](https://github.com/wolney8/OpenForge/issues/43) | Sportsbook: Add row highlighting for risk and workflow states | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#44](https://github.com/wolney8/OpenForge/issues/44) | Sportsbook: Add placement workflow actions for back and lay lifecycle | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#45](https://github.com/wolney8/OpenForge/issues/45) | Sportsbook: Add partial-lay follow-up reminder and liability recheck prompts | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#46](https://github.com/wolney8/OpenForge/issues/46) | Sportsbook: Clarify offer type vs bet type taxonomy and option sets | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#47](https://github.com/wolney8/OpenForge/issues/47) | Sportsbook: Add qualifying-loss match rating indicator in calculator panel | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#48](https://github.com/wolney8/OpenForge/issues/48) | Sportsbook: Fix special-offer bookmaker suggestion visibility and guidance | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#49](https://github.com/wolney8/OpenForge/issues/49) | Sportsbook to Free Bets: Add conversion action for free-bet-awarding offers | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#50](https://github.com/wolney8/OpenForge/issues/50) | Sportsbook: Redesign multi-lay planner for branch-first entry and mapping | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#51](https://github.com/wolney8/OpenForge/issues/51) | Sportsbook: Add custom lay slider with editable bounds and live feedback | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#52](https://github.com/wolney8/OpenForge/issues/52) | Approve Oddsmatcher shell, table, modal, and advanced-control contract | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#53](https://github.com/wolney8/OpenForge/issues/53) | Implement deterministic oddsmatcher fixtures for rating, modal maths, and advanced controls | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#54](https://github.com/wolney8/OpenForge/issues/54) | Build Oddsmatcher component architecture (shell, drawers, table, bet summary modal) | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#55](https://github.com/wolney8/OpenForge/issues/55) | Implement modal calculator math module with conservative headline total | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#56](https://github.com/wolney8/OpenForge/issues/56) | Implement advanced underlay/standard/overlay controls with bounded stake range | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#57](https://github.com/wolney8/OpenForge/issues/57) | Add E2E coverage for modal layering, close controls, and row-action flows | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#58](https://github.com/wolney8/OpenForge/issues/58) | Define Currency and Animated Financial Value Contract | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#59](https://github.com/wolney8/OpenForge/issues/59) | Build Shared Animated Financial Value Primitive | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#60](https://github.com/wolney8/OpenForge/issues/60) | Material 3/WCAG Ledger and Editor Density Review | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#61](https://github.com/wolney8/OpenForge/issues/61) | Deterministic Guided Entry Focus Engine | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#62](https://github.com/wolney8/OpenForge/issues/62) | Add Optional Google OIDC for Existing Fund Manager Login | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#63](https://github.com/wolney8/OpenForge/issues/63) | Implement Verified Local and Encrypted Cloud Database Backups | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#64](https://github.com/wolney8/OpenForge/issues/64) | Add Bookmaker Brand Catalogue and Compact Ledger Identity | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#65](https://github.com/wolney8/OpenForge/issues/65) | Rename OpenForge Platform to Plum Duff and Apply Supplied Branding | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#66](https://github.com/wolney8/OpenForge/issues/66) | Convert Global Burger Menu to a Material 3 Left Navigation Drawer | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#67](https://github.com/wolney8/OpenForge/issues/67) | Draft Public Offer Source-Ingestion Contract | closed (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#68](https://github.com/wolney8/OpenForge/issues/68) | Build Manual-First Offer Intelligence Catalogue | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#69](https://github.com/wolney8/OpenForge/issues/69) | Integrate Welcome Offers With Profile Sign-Up Opportunity Flow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#70](https://github.com/wolney8/OpenForge/issues/70) | Implement Profile Account Restriction and Gub Log | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#71](https://github.com/wolney8/OpenForge/issues/71) | Add Linked Risk-Team and Operator-Group Warnings to Offer Workflows | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#72](https://github.com/wolney8/OpenForge/issues/72) | Add Reload, Daily, and Free-to-Play Offer Review Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#73](https://github.com/wolney8/OpenForge/issues/73) | Subscriber Mug-Bet Preferences, Suggestions, and Activity Logging | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#74](https://github.com/wolney8/OpenForge/issues/74) | Subscriber Registration, Document Review, and Funding Request Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#75](https://github.com/wolney8/OpenForge/issues/75) | Implement Safe Neon Runtime Cutover and Database Maintenance Strategy | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#76](https://github.com/wolney8/OpenForge/issues/76) | Implement Profile Navigation Command Menu and Global Burger Cleanup | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#77](https://github.com/wolney8/OpenForge/issues/77) | Implement Multi-Profile Opportunity Quick Add V2 | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#78](https://github.com/wolney8/OpenForge/issues/78) | Implement Casino Wagering and EV Calculator From Approved Contract | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#79](https://github.com/wolney8/OpenForge/issues/79) | Implement Source-Created Offer Intelligence Ingestion | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#80](https://github.com/wolney8/OpenForge/issues/80) | Implement Free-Bet Award Lineage and Safe Removal | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#81](https://github.com/wolney8/OpenForge/issues/81) | Replace Browser Route Guards With In-App Confirmation Dialogs | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#82](https://github.com/wolney8/OpenForge/issues/82) | Implement Account Capability Profitability Audit | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#83](https://github.com/wolney8/OpenForge/issues/83) | Implement Profit Boost Offer Type and Calculator Flow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#84](https://github.com/wolney8/OpenForge/issues/84) | Implement Multi-Fixture and Outright Sportsbook Offer Support | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#85](https://github.com/wolney8/OpenForge/issues/85) | Add Quick Account Popup and Bookmaker Reconciliation Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#86](https://github.com/wolney8/OpenForge/issues/86) | Build Fund Manager Decision-Support Task Deck | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#87](https://github.com/wolney8/OpenForge/issues/87) | Implement Approved Offer Source Ingestion and Discord Intake Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#88](https://github.com/wolney8/OpenForge/issues/88) | Implement Extra Places Ledger, Calculator and Settlement Workflow | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#89](https://github.com/wolney8/OpenForge/issues/89) | Enable Subscriber Mug Bet Suggestion and Mug Activity Logging | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#90](https://github.com/wolney8/OpenForge/issues/90) | Retain Durable Notification History After Source Lifecycle Ends | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#91](https://github.com/wolney8/OpenForge/issues/91) | Apply Field-Specific Money and Rate Validation Beyond Sportsbook Odds | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#92](https://github.com/wolney8/OpenForge/issues/92) | Review Redundant Interface Copy and Repeated Component Drift in Bounded Batches | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#93](https://github.com/wolney8/OpenForge/issues/93) | Audit Repository and Agent-Document Routing Before Any Cleanup | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#94](https://github.com/wolney8/OpenForge/issues/94) | Complete Deferred Working-Workbook Google and Hosted Acceptance | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#95](https://github.com/wolney8/OpenForge/issues/95) | Design Three-Way Incremental Workbook Synchronization Without Merge Writes | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#96](https://github.com/wolney8/OpenForge/issues/96) | Rotate the Exposed OAuth Client Secret as a Separate Security Task | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#97](https://github.com/wolney8/OpenForge/issues/97) | Review Workbook KPI and Formula-Driven Workflows for Product Decisions | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#98](https://github.com/wolney8/OpenForge/issues/98) | Maintain One Discoverable Project Status and Acceptance Entry Point | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#99](https://github.com/wolney8/OpenForge/issues/99) | Verify Durable Notification Clearing Across Normal and Hosted Use | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#100](https://github.com/wolney8/OpenForge/issues/100) | Notification History: prevent Type and Status filter overlap | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#101](https://github.com/wolney8/OpenForge/issues/101) | Keep Canonical Local Development Services Available Across Handoffs | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#102](https://github.com/wolney8/OpenForge/issues/102) | Recover the original requirements for PD-FUTURE-001–018 | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#103](https://github.com/wolney8/OpenForge/issues/103) | Decide the future product name and compatibility-safe rebranding scope | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#104](https://github.com/wolney8/OpenForge/issues/104) | Preserve the Founder workbook import acceptance baseline | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#105](https://github.com/wolney8/OpenForge/issues/105) | Extend shared financial digit-roll animation to first load and all signed-money displays | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#106](https://github.com/wolney8/OpenForge/issues/106) | Add Account Balance History, Freshness Prompts and Coinbase-style Trend Reporting | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#107](https://github.com/wolney8/OpenForge/issues/107) | Prevent synthetic Account fixtures from leaking into daily-use Profile authorities | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#108](https://github.com/wolney8/OpenForge/issues/108) | Bound large Account option chip sets with a compact carousel / more control | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#109](https://github.com/wolney8/OpenForge/issues/109) | Preserve September Accounts access/restriction semantics through workbook import | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#110](https://github.com/wolney8/OpenForge/issues/110) | Add coordinated pie/donut/progress chart reveal and replay motion | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#111](https://github.com/wolney8/OpenForge/issues/111) | Build interactive financial time-series and Reports chart explorer | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#112](https://github.com/wolney8/OpenForge/issues/112) | Add canonical odds input normalizer with fractional-to-decimal conversion | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#113](https://github.com/wolney8/OpenForge/issues/113) | Calculator independent verification audit: formulas, fixtures and source parity | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |
| [#114](https://github.com/wolney8/OpenForge/issues/114) | Whole-platform audit: usability, functionality, accessibility, roadmap coverage and sustainability | open (GitHub, not audit acceptance) | DOCUMENTED scope; detailed execution/clarification pending unless evidenced above |

## #91 Account repair addendum — isolated implementation, not main acceptance

Implementation commit: `102848a1214730e5065e9db04a66047dce6cd82b` (pushed repair branch).
GitHub evidence sync: #91 comment5648267278, #114 comment5648268451, #92 comment5648268545.
Original audit findings are preserved; only this addendum records branch-specific repair results.

Date: 2026-09-12. Repair branch `repair/account-money-91` is based on application
`f7a3b35073ecc87cdf8f8f881129f221ec44d395`. Audit evidence checkpoints `c65169f` /
`7d75b5a54db466b1a47c6d7786ddc633f3dc7122` are documentation/probes, not a different tested
application. The audit above remains historical evidence; this authorised repair changes only its
Account findings on the separate branch. Main/normal services remain unfixed until integration.

### Repair scope and observable evidence

| Finding / scope | Before | Repair result / evidence |
|---|---|---|
| PD-QA-002 Account create/update | Focused regression reproduced POST201 for not-money before editing; original Batch2 observed all four malformed/non-finite values retained | PASS / PROVEN: 25 synthetic Account API tests reject malformed/non-finite, excess precision, commas, exponents and null with422; prior Account/audit/timestamps unchanged on rejection; catalogue/onboarding/direct persistence controls included |
| PD-QA-007 included cash | Independent pre-fix suite had9 failed assertions: invalid+£10 looked complete, or malformed syntax was partially interpreted | PASS / PROVEN: independent £12.34+£10=£22.34, zero+£10=£10, signed control; included invalid/unknown gives Unavailable and separately labelled Known subtotal; excluded invalid does not contaminate included cash |
| Authorised combined / ledger separation | Combined execution was blocked in original audit | PASS / PROVEN focused unit execution: incompleteness propagates through authorised combined inputs; unrelated ledger P&L remains0. Whole combined browser journey NOT TESTED this repair |
| Legacy source and export | Accepted invalid money later caused409 export | PASS / PROVEN: isolated SQL fixture retains rawNaN across reads/UI/summary; XLSX409 until explicit correction, then200; no automatic repair/drop/zero substitution |
| Real Account editor | Original audit readiness blocked input execution | PASS / PROVEN actual Playwright:1440/light and760/dark; pointer Edit/Save without force; invalid text preserved, associated inline error, Save disabled; pending Infinity independently blocked; .50 commits0.50; correction saves12.34 and Dashboard22.34 |
| Display geometry | Canonical FinancialTextInput / FinancialValue unchanged | PASS / PROVEN: £ prefix contained and centre delta0.0078125px; modal within viewport; document width1425/1440 and745/760; keyboard Tab exercised; no page errors; reduced-motion enabled |
| SQLite / PostgreSQL | Shared persistence connects through SQLite or PostgreSQL adapters | SQLite PASS / PROVEN. Shared pre-transaction validation/rollback paths CODE-VERIFIED. Two PostgreSQL row/placeholder adapter unit tests PASS, **actual PostgreSQL database execution NOT TESTED**: no available authorised isolated PostgreSQL environment used |
| Alternate writes | Catalogue/onboarding/import/shared create/update could bypass one route | Catalogue/onboarding/direct create/update PASS / PROVEN; complete selected Account-import preflight before business writes CODE-VERIFIED, end-to-end importer confirmation NOT TESTED; historical restore/seed intentionally remains lossless |

Focused commands in repair worktree:

```sh
./scripts/run-python.sh -m pytest apps/api/tests/test_account_money_safety.py apps/api/tests/test_postgres_runtime.py -q
cd apps/web
node node_modules/vitest/vitest.mjs run lib/account-money-safety.test.ts lib/tracker-summary.test.ts lib/cross-profile-reporting.test.ts lib/decimal-input.test.ts
node node_modules/typescript/bin/tsc --noEmit --project tsconfig.typecheck.json
```

Results:27 Python tests (25 Account +2 adapter-only),47 web tests (18 new Account tests +29 existing
summary/decimal regressions), TypeScript PASS, focused Ruff PASS, new monetary module strict mypy PASS.
These counts are bounded regressions, not whole-platform readiness or calculator acceptance.
Browser runner: `node scripts/verify_account_money_repair.mjs`; guard requires the dedicated
synthetic owner on8026 and fixture-only DB `/tmp/openforge-account-money-91-repair/acceptance.sqlite3`.
Diagnostic JSON stays in that temporary runtime. Web3026/API8026 are separate from3010/8010,
3020/8020,3013/8013 and3024/8024. It deliberately fixtures invalid legacy data **only** in the repair DB;
it never opens the audit's retained invalid DB or operational/manual data.

Harness corrections are separate from product fixes: initial factory omitted required module/source
fields; owner export guard needed the synthetic session; a pending-field locator incorrectly used
“amount”; a new test passed a string instead of the existing resolved-date-range object. A large-number
negative display fixture was corrected from a representable formatted amount to90071992547409.93,
which JavaScript would incorrectly display .94; the exact-cent display guard reports Unavailable.
No production assertion was weakened. Browser capture is headless actual Chromium; screen-reader,
all-platform keyboard/dialog behaviour and desktop text enlargement remain NOT TESTED here.

### Field policy, inclusion and integration

The existing Account catalogue/state contract contains the policy table: omitted money/timestamp
updates preserve values; zero is a valid observation; explicit blank is unknown; null rejects;
signed Account-editor balances/withdrawals retain existing allowance; onboarding retains non-negative
limits/defaults. Complete exact cents only, no partial parsing, unsupported-precision rounding or
new low cap. Existing40-character field representation limit remains. Leading decimals normalise
only on commit. Invalid text remains editable. Huge valid entries outside exact numeric presentation
are Unavailable, not fabricated numbers. Account-specific raw history remains explicitly correctable.
Accounts-page pending totals retain all-row scope; Profile/combined pending totals retain included
scope. No unrelated ledger P&L is marked incomplete.

Integration is deferred: review repair branch diff against the verifiedf7 main, then merge only with
Will's approval and restart normal application from reviewed main. No schema migration is required.
Rollback is a reviewed revert of repair commits; no data rewrite accompanies either direction.
This branch retains the exact existing7d75 audit report plus this addendum at the **same canonical path**;
reconcile that addendum rather than replacing history when integrating the separate audit branch.

Next independent repair: PD-QA-014 Free Bet pre-commit validation/controlled failure. PD-QA-015
completed Blackjack cross-Profile/Account uniqueness including concurrency, PD-QA-004 modal focus/
Escape/pointer obstruction, #115 exposure/dependency work and #96 owner/provider credential rotation
remain queued separately. Other populated ledgers, large data, PostgreSQL recovery, screen-reader
and request clarification audit coverage stays unexamined, not passed.

Manual comparison deferred by Will; no scheduled date; resume on supplied results or explicit request.
Original comparison files, launcher, parent IDs, frozenf7 candidate and observations remain untouched.

## PD-QA-014 repair addendum — Free Bet pre-commit validation / 2026-09-12

**Branch-specific evidence; main remains unfixed.** This extends the same audit, preserving Batch2's
failures and the Account addendum. Result and evidence are separate. No calculator formula, settled
record, schema, bridge architecture, operational database, secret or dependency change was made.

### Revision and protected environments

- Application main/frozen candidate: f7a3b35073ecc87cdf8f8f881129f221ec44d395, unchanged.
- New branch `repair/free-bet-atomic-91` begins exactly at Account checkpoint
  c4b9bb4412cb0e29c78df4919624c58db57633d6; `git merge-base --is-ancestor` proves inherited
  Account fix102848a1214730e5065e9db04a66047dce6cd82b. Account branch/commits unchanged.
- Added fix: b7e4a9c7e7abd6964ca2f9b95cf1681e68da5e7f. Worktree:
  `/Users/will_work/Scripts/Homelab/OpenForge/.worktrees/free-bet-atomic-repair`.
- Audit7d75b5a54db466b1a47c6d7786ddc633f3dc7122 / c65169f and intentionally invalid audit fixtures
  remain untouched. Multi-Lay215193b7fcb5b11a28e23a4531d2a45434545dc1 remains unmerged.
- Disposable repair runtime: API8030/web3030, database
  `/tmp/openforge-free-bet-atomic-91-repair/acceptance.sqlite3`. No shared mutable database with
  normal3010/8010, frozen3020/8020, development3013/8013, audit3024/8024 or Account3026/8026.
  All six API `/healthz` and web `/login` checks200 at the checkpoint. No protected service restarted.
- `_input` originals/observations, capture launcher and parent case IDs unchanged.
  Manual comparison deferred by Will; no scheduled date; resume only on supplied results or request.

### Reproduce-before-fix and root cause

The initial focused regression run had **8 failed tests before production editing**. NaN, Infinity,
-Infinity and not-money Placed creates returned500 **and each retained one Free Bet**; subsequent
individual/list/source-summary reads500. Missing Profile returned500 with zero Free Bets. Invalid
actual-lay update contaminated a valid record. Injected response-preparation RuntimeError returned500
after retaining the new row. These are independently asserted SQLite states, not inferred from HTTP.

Root: unconstrained financial strings entered persistence; create/update committed row+business audit
before engine/response construction. The response model inherited write validators, so corrupt or
legacy records could fail again during reads. Missing Profile fell through to persistence failure.

### Field and transaction policy

The existing [Free Bet contract](../contracts/free-bet-current-value-contract.md) has the compact policy.
Money is complete exact-cent decimal, non-negative except explicit reasoned final override.
Zero remains valid; blank is unknown/optional, not fabricated stake. Null/malformed/non-finite,
comma/exponent and unsupported money precision reject. Odds use the existing complete decimal
>=1.01 contract with arbitrary supported decimal precision; commissions retain precision as0..1 ratios
and still resolve from Profile Exchange settings. No two-decimal odds/commission truncation.

PATCH merges omitted fields with the stored record before validating the effective lifecycle and
financial dependencies. PUT retains required identity/lifecycle fields while preserving omitted
optional fields. Placed/Settled require value/back odds unless a reasoned override provides value;
positive actual lay requires odds/Exchange, **not a fully matched position**. Unlaid/partial workflows
remain possible. Date syntax is checked before saving. Profile/Account/source identity checks are
Profile-scoped; missing404, archived/ineligible controlled4xx, foreign Account cannot be substituted.

Shared native/create/update/placement and conversion/opportunity/award child writes now validate
before Free Bet mutation. Existing engine + response-model validation + JSON preparation run **inside
the same row/business-audit transaction**, returning the prepared native response after commit.
Conversion checks destination calculation readiness inside that callback rather than recalculating
after commit. Foreseeable input/domain errors are controlled4xx; injected unexpected internal faults
remain honest500 and roll back. No save-then-delete workaround or new financial equations.
Profile calculation settings/cache are prepared before opening the Free Bet transaction, avoiding
lazy default-setting writes inside a second SQLite connection.

New staged Free Bet import validates selected fields and prepares each response inside its existing
batch transaction. Two-row probes show second-row failure rolls back the earlier row, audit/source
records, staged changes and batch completion. It does not retrofit modern lifecycle/source policies
onto historical import or rewrite raw snapshots. Full importer/browser confirmation remains NOT TESTED.
Award UI still submits child Free Bets through the protected native endpoint, then updates its
Sportsbook source. **This is per-child save atomicity, not a claim of atomic multi-request award groups.**
Group splitting/retry and the separately recorded dangling-source deletion policy remain open.

Lost network delivery after a successful commit is a distinct ambiguous-delivery case. Existing
conversion intent/target identity is unchanged: retry retains one successful destination. No promise
that a lost response means nothing was saved; no new native/award idempotency architecture introduced.

### Independent numerical expectations and observable results

Expected values below are user/audit fixtures and desk equations, not production functions as oracle.
Approved penny placement/engine equations are unchanged.

| Case | Independent equation / expected | Actual | Result / evidence |
|---|---|---|---|
| Native SNR £10, back5, lay5.2, c.02 |40/5.18 →7.72 reference; actual7 liability7×4.2=29.40; Back Won40−29.40=10.60 |7.72 /10.60 after save/reopen/place/settle | PASS / PROVEN API + SQLite |
| Native SR same inputs |50/5.18 →9.65 reference; actual7 Back Won50−29.40=20.60 |9.65 /20.60 | PASS / PROVEN API + SQLite |
| Combined native settled report |10.60+20.60=31.20 |31.20 formal monthly fee-base result;31.20 formatted client aggregate | PASS / PROVEN focused API/unit |
| Converted SNR £10, back3, lay3.1, c.02, actual6 |20−6×2.1=7.40 |7.40; retry same ID/one row | PASS / PROVEN conversion API |
| Additional converted SR same inputs |30−6×2.1=17.40 |17.40; retry same ID/one row | PASS / PROVEN conversion API |
| Invalid create/update fields | Supplied invalid value →4xx, no new row or changed record/timestamp/audit/report | All supplied money/odds/commission malformed/non-finite tests422; previous report unchanged | PASS / PROVEN API + independent SQL |
| Unexpected calculation / response-JSON fault |500 with transaction rollback, not disguised422 | Create/update row+audit unchanged; failed conversion no destination or success notification fields | PASS / PROVEN injected boundary |
| Foreign actual Profile/Accounts | Existing money-b row inaccessible via money-a; foreign Account denied for money-a | GET/PATCH404; create422, zero own rows; foreign row unchanged | PASS / PROVEN API |
| Existing malformed financial row | Preserve raw identity/input; derived value unavailable; complete total cannot omit it | RawNaN unchanged; reads200/review_required; source values null, client P&L/liability unavailable; formal fee base blocked; export409 | PASS / PROVEN SQL/API/unit/browser |
| Explicit correction | Human correction10.00 restores governed total |31.20 again | PASS / PROVEN API |
| Historical finite precision | New writes10.000 reject; existing10.000 retains old governed engine/read behaviour without migration | Raw10.000 unchanged, final10.60 readable | PASS / PROVEN API |

### Actual native editor / shared UI gate

Nearest equivalents: existing Free Bet/Sportsbook guided ledger fields, associated errors, native
Save flow, shared FinancialValue/Outcomes; inherited Account incomplete-status pattern for diagnostics.
No new input styling, generic component system, button/copy semantics or global CSS.

| Rendered probe | Result / evidence |
|---|---|
|1440/light +1440/dark, populated native editor | PASS / PROVEN: normal pointer Matching; invalid NaN/Infinity/-Infinity/not-money/1.234 stays editable, field name stable, aria-invalid/associated visible error, Save disabled; correction and actual-lay edit Save200, reopen6.00 |
|760/light +760/dark | Associated validation and viewport containment PASS / PROVEN; **pointer Save BLOCKED under PD-QA-004**: no PUT after corrected200 preview, native form checkValidity true, no page error. No forced click/keyboard substitute used to claim pointer acceptance |
| Modal geometry | Desktop left92.5/right1332.5, half-width left24/right744; top50/bottom950 within1000 height; page widths1425/1440 and745/760. Focus/Tab exercised; shared control dimensions unchanged |
| Legacy-invalid ledger → Dashboard → Reports,760/dark | PASS / PROVEN actual Chromium: financial Unavailable + record-identity correction diagnostic; no page/console errors; rawNaN retained |
| Full keyboard focus trap / Escape / reader / all text scales | NOT TESTED; remain PD-QA-004/remaining audit gates. Tab was exercised, not certified keyboard/reader acceptance |
| Copy/apply/mark placed | Existing code semantics preserved / CODE-VERIFIED; no new complete clipboard/placement UI claim in this repair |

The editor's nested error originally altered its implicit accessible label. Explicit visible field
names plus described-by errors fix that without moving controls. The consistency enforcer and
known-pitfalls register retain this invariant. The browser runner deliberately exits nonzero when
half-width Save is blocked; those cases are not silently skipped or counted as PASS.

### Focused commands / evidence limits

```sh
./scripts/run-python.sh -m pytest apps/api/tests/test_free_bet_atomic_safety.py apps/api/tests/test_account_money_safety.py apps/api/tests/test_free_bet_current_value.py apps/api/tests/test_postgres_runtime.py -q
cd apps/web
node node_modules/vitest/vitest.mjs run lib/free-bet-input.test.ts lib/account-money-safety.test.ts lib/tracker-summary.test.ts lib/cross-profile-reporting.test.ts lib/decimal-input.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json
```

135 Python PASS =95 Free Bet +25 inherited Account +13 unchanged engine +2 adapter-only tests.
58 focused web PASS =11 Free Bet +18 Account +29 existing summary/decimal. Focused Ruff, ESLint,
TypeScript and money/Free Bet module mypy PASS. These are bounded regressions, not all numeric inputs,
all strategy configurations, whole-platform readiness or calculator manual sign-off.

SQLite transaction execution PROVEN. Shared PostgreSQL adapter/context path CODE-VERIFIED; two adapter
unit tests PASS, **actual isolated PostgreSQL execution NOT TESTED**. No operational/hosted database used.
Full native/imported award lifecycle, complete XLSX/import/restore confirmation, concurrent native
submissions/network-loss delivery and all other #114 journeys remain NOT TESTED.

Browser: `node scripts/verify_free_bet_atomic_repair.mjs`; `--legacy-only` isolates the legacy/report
probe. Fixture launcher is the existing notification acceptance API script on8030, own runtime above;
same-session restart uses uvicorn with that already-existing database, not reseeding. Diagnostic JSON
stays there, never committed. Web3030 uses existing authenticated environment/internalAPI8030 and
webpack with shared installed dependencies; no normal/manual runtime touched.

Harness issues were recorded separately: initial synthetic Account lacked mandatory lifecycle;
old test used wrong DTO reference key/omitted required PUT fields/persisted-state casing; Turbopack
rejected out-of-root dependency symlinks so existing webpack support was used. An intermediate repair
opened lazy Profile settings inside the SQL write and hit SQLite locking; preload/cache fixed it.
An isolated runtime also logged concurrent default-lookup seeding's UNIQUE failure; no lookup
implementation changed or whole-bootstrap assurance claimed. No numerical expectation was replaced
with production output, no broad harness rewrite, no private inputs copied.

### Integration / rollback / remaining repairs

No automatic merge. Review Account checkpoint first, then this stacked Free Bet delta
`c4b9bb4..b7e4a9c7e7abd6964ca2f9b95cf1681e68da5e7f`; integrate only with approval. Existing main/normal services remain vulnerable to
the original findings until integration. No schema migration or data cleanup accompanies it.
Rollback is a reviewed revert of the Free Bet fix (then Account only if separately necessary), not
source deletion, recalculation or balance rewriting. Preserve this canonical audit addendum when
later reconciling the separate audit branch; do not replace Batch2 history.

Next bounded implementation: PD-QA-015 completed Blackjack global source uniqueness across
Profiles/Accounts including concurrent attempts. PD-QA-004 remains open for modal/focus/Escape and
half-width Save; #115 exposure/dependencies and #96 owner/provider credential rotation stay separate.
Other populated ledgers, PostgreSQL recovery, large datasets, screen-reader and historical request
clarifications remain outstanding. GitHub evidence synced on 2026-09-12: #91 comment5648522825,
#114 comment5648522892, #36 comment5648522984, #92 comment5648523060. No automatic issue closure.

## PD-QA-015 repair addendum — completed Blackjack source uniqueness / 2026-09-12

### Revision, scope and root cause

Separately reviewable branch `repair/blackjack-source-91`, worktree
`/Users/will_work/Scripts/Homelab/OpenForge/.worktrees/blackjack-source-repair`.
Exact base **c84b9eda268b3cfae7b45d74d583a44ce46f11df**, verified descendant of Account fix
102848a1214730e5065e9db04a66047dce6cd82b and Free Bet fix
b7e4a9c7e7abd6964ca2f9b95cf1681e68da5e7f. Added fix
**c03470a338eeebf9ef89e2e3fcf0ed6d189ef5c6**. The Account and Free Bet branch tips remain
c4b9bb4412cb0e29c78df4919624c58db57633d6 and c84b9eda268b3cfae7b45d74d583a44ce46f11df.
Main/manual stay f7a3b35073ecc87cdf8f8f881129f221ec44d395; development stays
215193b7fcb5b11a28e23a4531d2a45434545dc1; audit branch stays
7d75b5a54db466b1a47c6d7786ddc633f3dc7122. No protected runtime/DB/input/observation was changed.
Only pytest-owned disposable SQLite fixtures were used; no new shared persistent runtime or DB.

The prior unique target tuple included Profile and Account, so one completed source reserved multiple
claims. Casino creation and successful claim/notification updates also committed independently.
Pre-fix API regressions reproduced a second Account save200 and simultaneous cross-Profile200/200;
the existing Batch2 independent SQL duplication evidence remains above. The initial test setup
failed404 because an older test helper assumed absent demo Profiles. That was a **harness blocker**,
not a product result; explicit synthetic factories and the inherited isolated Account fixture removed
that dependency before reproducing/fixing the product defect. A missing synthetic Exchange commission
also produced expected failed exploratory targets; the factory now explicitly supplies2%.

### Persistence invariant and evidence

No financial equations, Blackjack session schema/UI, destination model, table/index migration or
historical cleanup. Existing signed SHA-256 snapshot verification and Account/Profile permissions
run before claiming. New completed-source claims use the full checksum as a deterministic existing
table **primary key**, independent of target; actual Profile/Account IDs remain stored. Primary-key
conflict and conditional Failed→Pending retry enforce exclusion across connections/processes, not
just a browser flag or SQLite process lock. Legacy successful/pending claims are checked globally;
legacy orphaned Casino rows are refused read-only. No cross-Profile target details enter the409.
Historical duplicates are not deleted, recalculated or retrospectively corrected.

Casino row, Casino business audit, Succeeded claim, linked notification fields and prepared response
JSON now use the same connection/transaction. Injected internal failures, including ValueError at
response preparation, produce an honest500 and rollback; only the diagnostic Failed claim remains.
Same-target successful retry returns the existing record, other targets409, and a failed no-row
transaction may retry a reviewed target. Exploratory source/intent/per-target identity is unchanged.

| Probe | Independent expected behaviour | Actual | Result / evidence |
|---|---|---|---|
| Live completed source: second Account/other Profile/retry | One15.00 activity (115−100); other targets409; same retry same ID | One Casino row/Succeeded claim, preserved checksum; Profile report source15.00, other Profile empty | PASS / PROVEN API + SQL + report-source transport |
| Free Play equivalent | One4.00 withdrawable-result activity; no cash loss from10 credit | Second targets409; one4.00 row; separate source/monetary provenance retained | PASS / PROVEN finite fixture |
| Concurrent requests, same or different Profile, Live/Free | One activity/event; same-target in-flight409 or existing-ID200; other target409 | Four barrier-driven threaded HTTP cases pass | PASS / PROVEN SQLite/FastAPI |
| Separate process requests | Same exclusion without a shared in-process lock | Two spawn-interpreter HTTP cases, independent DB connections: one activity/Succeeded claim/notification | PASS / PROVEN SQLite, **not PostgreSQL evidence** |
| Failure after success-claim SQL / JSON / internal response ValueError | No row/audit/success/link; retry safely creates one row | Three injected failures500, Casino/audit0, claim Failed/destination NULL/notification empty; retry other Profile200 | PASS / PROVEN transaction rollback |
| Legacy random-ID Succeeded claim / orphaned activity | Reuse legacy success; no cross-target clone or silent orphan recreation | Same ID returned; cross-target409; orphan409; original synthetic legacy ID/row unchanged | PASS / PROVEN isolated fixture |
| Integrity, identities, denial | Tampered checksum/foreign Account/missing identity/auth/archival/Simulation: zero business writes | Signature and six denial cases precede claim; unauthenticated/nonapproved sessions401, archived409, foreign ID/Simulation422 | PASS / PROVEN tested boundaries; future subscriber authority is not certified |
| Retry notification/provenance | One linked event after repeated retry; canonical source retained | Three retries same ID, one source-completion notification/link, exact canonical monetary result/checksum retained | PASS / PROVEN API/SQL; no new rendered receipt evidence |
| Deliberate new exploratory opportunity | Retry one intent reuses row; new intent creates another | Standard results succeeded→already_succeeded→succeeded, two distinct rows | PASS / PROVEN finite API fixture; not a new Blackjack activity intent |

Focused command:

```sh
./scripts/run-python.sh -m pytest apps/api/tests/test_blackjack_source_safety.py apps/api/tests/test_free_bet_atomic_safety.py apps/api/tests/test_account_money_safety.py apps/api/tests/test_free_bet_current_value.py apps/api/tests/test_postgres_runtime.py -q
```

**154 PASS**:19 new completed-source cases +95 Free Bet +25 Account +13 unchanged Free Bet engine
+2 PostgreSQL mapping/placeholder adapter tests. Ruff changed Python paths PASS; mypy changed bridge
module with follow-imports=silent PASS. Counts describe only these fixtures, not all modes/inputs,
whole-platform readiness or calculator acceptance. No new UI code: browser/theme/focus/half-width
acceptance is **NOT TESTED on this repair**, inherited Free Bet half-width Save remains **BLOCKED
PD-QA-004**. Actual PostgreSQL transactions/concurrency are **NOT TESTED**.

### Original audit coverage retained — next tests / exact blockers

The original whole-product matrix and Batch2 failures remain authoritative for their recorded
revision. B3 adds repair-branch evidence, not main PASS. No title-index inventory is promoted to
full historical-requirement reconciliation. The following historical B3 checkpoint retained remaining
coverage at that revision; current stable checklist/status is above/below, including later modal and PostgreSQL evidence:

| Existing gap / issue | Current result | Exact next test or blocker |
|---|---|---|
| PD-QA-004 shared modals | FAIL / PROVEN previous desktop focus/Escape + half-width Save | Repair shared pointer/focus boundary, then populated Free Bet native invalid→correct→Save/reopen at desktop/half-width both themes; no forced clicks |
| Combined repair candidate / integration | NOT TESTED | Independently run Account/Free Bet/Blackjack API→browser→report paths on the stacked candidate after PD-QA-004; propose reviewed Account→Free Bet→Blackjack→modal integration; post-integration smoke before claiming main fixed |
| Other populated ledgers #1–13/#88 | NOT TESTED end-to-end | Native/imported Sportsbook, Casino promotion/manual/free-credit, Extra Place/Each Way, Cash Adjustment: preview/copy/save/reopen/place/settle/void/undo/report with independent values; unavailable special branches retain exact contract blockers |
| Award lineage / dangling source | NOT TESTED full group lifecycle; existing FAIL retained | Explicit SNR/SR award factories: source→split awards→partial failure/retry→placement→settlement→source removal; inspect child/business audit/notification state, preserve existing deletion policy until approved repair |
| Imports / restores #104/#109 | NOT TESTED full browser/import scope | Synthetic staged workbook mapping→confirm→reopen; whole portable restore retry/rollback/browser; missing Account access vocabulary/historical promo fallback is a product-contract blocker, not zero/default permission |
| Actual PostgreSQL / backup recovery — historical B3 | Then NOT TESTED / UNVERIFIED | Superseded for scoped local execution by current A–E PostgreSQL18.6 evidence. Full hosted/import/browser recovery remains separate, never operational substitutes |
| Concurrent/network-loss/recovery | PARTIAL: new SQLite request races PASS; other paths NOT TESTED | Kill disposable worker after Pending reservation; lose response after committed Casino save then retry; disconnect during exploratory partial multi-Profile save; confirm same intent, one destination/event and controlled Pending recovery. Automatic timeout takeover is deliberately not added |
| Combined reports / reconciliation #85/#106/#111 | NOT TESTED complete browser flow | Two Profiles with valid/invalid included balances, Free Bets and unique Casino activity: authorised combined cash/P&L completeness, filters/drilldown/export, refresh/correction, reviewed balance vs hand-result distinction; planned observation/explorer features are not runtime PASS |
| Large data / performance | NOT TESTED | Isolated1000+ native/imported synthetic rows across modules; measure first render, filtering/scroll/pagination/charts/request count, half-width responsiveness; existing30-row fixture is not a scale benchmark |
| Accessibility / themes / responsive / motion | PARTIAL old rendered probes; reader UNVERIFIED | PD-QA-004 first, then keyboard/focus/Escape/tooltips/targets/announcements, both themes, half-width,320px, desktop200% text and combined stress separately; inspect intermediate motion; actual reader required before claiming screen-reader verification |
| Auth / lifecycle / catalogue / search / settings | NOT TESTED complete journeys | Synthetic authorised/denied onboarding, duplicate brands, archive/recover, search stale results/loadouts, settings rollback; real Google callback/provider outage unavailable to synthetic-only execution, explicitly UNVERIFIED |
| Notifications / source-history #90/#99 | PARTIAL new completion idempotency PASS | Clear/remove-source/refresh/retry races, preference persistence and every destination link with viewer isolation; durable source-independent history remains separate requested scope |
| #115 dependency/deployment exposure | UNVERIFIED deployment/input exposure; existing applicability evidence retained | Separate bounded remediation: maintainer-supported patch and reachability/input/deployment evidence with authorisation; unavailable deployment access is not safe/clearance; no exploit or dependency change in this repair |
| #96 credentials | BLOCKED owner/provider operation | Owner/provider must revoke/rotate the separately identified credential and record completion; never read out, request or commit its value. Not bundled or cleared by this repair |
| Historical requests / plans | DOCUMENTED index, remaining bodies/clarifications NOT TESTED | Reconcile next bounded original issue-body/clarification set against canonical register, including18 orphaned-source ideas; retain contradictions/dependencies. Subscriber/billing/AI/Oddsmatcher deferred scope stays NOT APPLICABLE runtime, not delivered |
| Calculator integration / #113 | PARTIAL existing finite evidence; manual DEFERRED | Engineering combined hub/pop-out/embedded/conversion regressions separate from external/manual parity; preserve main-v1 vs unmerged-v2 planning/placement/settlement gaps. Resume manual comparison only on supplied results or explicit request; unchanged launcher/files/parent IDs, no date or assignment |

No automatic merge/deployment. Normal app still lacks all stacked repairs. Review Account first,
Free Bet second, Blackjack source third; modal fix/independent combined-candidate gate precede any
integration proposal. Rollback is a reviewed revert of the applicable source repair(s), not data
deletion, historical recalculation or source cleanup. All normal/protected services are left running.
Next work is PD-QA-004, not another calculator feature or manual-comparison request.

## Measured scorecard v1 — 2026-09-13 / #114 comment5652511529

Historical baseline only; current counts are at the top. This is the **first frozen denominator**, not an invented change from0%. Earlier checkpoints had
no comparable percentage. Methods and stable IDs below now cover the original audit mandate.
These are bounded assessment packages (one domain boundary/invariant family), not tests or route
shells. An evidenced failure completes an assessment; an interrupted fixture or unavailable
required execution does not. Review/plan evidence never means implementation PASS.
Never average these overlapping coverage measures or describe them as product readiness.

| Measure | Evidence-complete / planned | Whole coverage |
|---|---|---|
| Audit assessments |33/87 |38% |
| Complete journeys exercised |5/24 |21% |
| Complete journeys passing required recorded steps |5/24 |21% |
| Competitor capability×provider cells |7/27 |26% |
| Original request + applicable clarification reconciliation |4/133 |3% |

### Assessment area breakdown and required methods

| Area | Assessed/planned | Coverage |
|---|---|---|
| Functional | 12/24 | 50% |
| UX/accessibility | 4/12 | 33% |
| Security | 6/12 | 50% |
| Data/recovery | 5/12 | 42% |
| Sustainability | 5/12 | 42% |
| Requirements | 1/6 | 17% |
| Competitor assessment | 0/9 | 0% |

- F: API+SQL unless explicitly browser/lifecycle; plans use source/contract review.
- U: Actual browser pointer/keyboard/geometry; reader requires actual reader.
- S: Scoped source/config+authorised negative/local probes; hosted needs actual hosted evidence.
- D: Disposable persistence/restore/export/fault probes; PG requires real isolated PG.
- M: Source/contract/config review; cost/performance/flakiness need measured execution.
- R: Original issue+applicable clarifications→retained scope/plans/code/evidence/issues.
- C: All three provider cells for the capability; documented and interaction methods distinct.

Scope changelog: v1 freezes87assessment packages,24journeys and9capabilities×3providers.
Requirements denominator is original issue identities#1–114 +18retained unlocated
PD-FUTURE-001–018 +#115 security follow-up =133. Meta/umbrella issues remain review units, not
claims that every child feature is implemented. No requirement was removed. Future additions need
an explicit denominator/version entry. No N/A exclusions in these coverage denominators; deliberately
deferred subscriber/AI/odds-sourcing runtime is reviewed as a planning boundary, not a runtime PASS.
#113 owner numerical comparison is deferred indefinitely and is a **separate sign-off gate**, never
part of an automated numerator. Tests cover finite fixtures, not every possible numeric input.

### Versioned assessment checklist

Evidence references below resolve to the existing sections/addenda or the local probe artifacts
under /tmp/openforge-modal-114-repair. Original main failures remain recorded above. API/source
evidence is reused only for unchanged inherited code. Required browser checks are not completed
by API tests. Every OPEN entry retains its named next boundary; the exact blocker/next-test table
in the PD-QA-015 addendum still applies (PG, provider access, imported sources, reader, large data).

| ID | Scoped check | Assessment/result | Evidence or exact next check |
|---|---|---|---|
| PQA-F01 | Session/owner API guard | ASSESSED; PASS scoped | B auth/security named probes |
| PQA-F02 | Browser expiry/re-authentication recovery | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F03 | Onboarding duplicate-name identity | ASSESSED; PASS scoped | B onboarding two distinct IDs |
| PQA-F04 | Account monetary write atomicity | ASSESSED; PASS scoped | Account repair addendum +139-case candidate regression |
| PQA-F05 | Account cash completeness/correction UI | ASSESSED; PASS scoped | money-repair-browser.json;12.34+10=22.34 |
| PQA-F06 | Authorised combined cash browser | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F07 | Native SNR/SR numerical lifecycle | ASSESSED; PASS scoped | PD-QA-014 independent fixture table |
| PQA-F08 | Free Bet pre-commit rollback faults | ASSESSED; PASS scoped | PD-QA-014 injected faults |
| PQA-F09 | Legacy-invalid Free Bet read/report | ASSESSED; PASS scoped | free-bet-browser.json legacy three routes |
| PQA-F10 | Exploratory conversion retry/new intent | ASSESSED; PASS scoped | B2 conversion+PD-QA-015 exploratory intents |
| PQA-F11 | Governed Free Bet conversion API | ASSESSED; PASS scoped | PD-QA-014 converted SNR/SR cases |
| PQA-F12 | Completed Casino source global uniqueness | ASSESSED; PASS scoped | PD-QA-015 thread/process race+actual UI retry |
| PQA-F13 | Other Casino fees/override lifecycle | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F14 | Sportsbook actual placement/settlement | ASSESSED; FAIL overall / PROVEN | Populated checkpoint: native copy9.65/actual9, Win2.20/correction−1.18/report; malformed500 commits and poisons reads; missing Profile500 |
| PQA-F15 | Extra Places placement/settlement | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F16 | Cash movements and matching | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F17 | Award lineage/removal lifecycle | ASSESSED; FAIL / PROVEN scoped | Genuine single/split SNR/SR; child503/retry duplicate, removal UI blocker/API orphan; J11 remains PARTIAL |
| PQA-F18 | Combined report reconciliation | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F19 | Search/filter/loadout/Quick Actions | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F20 | Settings persistence/error recovery | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F21 | Notification clear/history lifecycle | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F22 | Synthetic portable restore validation | ASSESSED; PASS scoped | B portable-restore/security named fixtures |
| PQA-F23 | Actual SQLite backup recovery | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-F24 | Subscriber/billing/advisory-AI plan boundary | ASSESSED; PASS scoped | C future-scope contracts; plan only |
| PQA-U01 | Free Bet modal keyboard/dirty recovery | ASSESSED; PASS scoped | free-bet-browser.json six width/theme cases |
| PQA-U02 | Sportsbook/conversion modal focus/close | ASSESSED; PASS scoped | modal-conversion-browser.json six cases |
| PQA-U03 | Account financial field error/prefix geometry | ASSESSED; PASS scoped | money-repair-browser.json prefix delta0.0078125px |
| PQA-U04 | Half-width/narrow pointer containment | ASSESSED; PASS scoped | Free Bet+conversion geometry1440/760/390 |
| PQA-U05 | Desktop text enlargement and320px separately | ASSESSED; PASS / PROVEN scoped | Current addendum: separate root-text200%,320 and combined stress artifacts; PD-QA-005 |
| PQA-U06 | Nested confirmation/pending/error recovery | ASSESSED; PASS / PROVEN scoped | Current addendum: dirty nested Keep Editing, Tab, conversion pending/503 retry and focus return |
| PQA-U07 | Interrupted/intermediate modal motion | ASSESSED; PASS / PROVEN scoped | Current addendum: RAF frames, controlled60ms close/reopen and static reduced-motion assertion |
| PQA-U08 | Screen-reader announcements/navigation | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-U09 | Contrast/targets/charts audit | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-U10 | Drag alternatives and tooltip association | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-U11 | Chart keyboard/drilldown usability | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-U12 | All other ledger modal equivalence | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-S01 | Protected API anonymous denials | ASSESSED; PASS scoped | B protected401 probes |
| PQA-S02 | Owner role vs signed authentication | ASSESSED; PASS scoped | B security policy/owner guard |
| PQA-S03 | Cross-Profile/Account mutation denial | ASSESSED; PASS scoped | PD-QA-014/015 denial fixtures |
| PQA-S04 | Locked dependencies/benign image reachability | ASSESSED; RISK/BLOCKED | #115 applicability table; hosted unknown |
| PQA-S05 | Exposed credential remediation prerequisites | ASSESSED; RISK/BLOCKED | #96 exact owner/provider action, not rotated |
| PQA-S06 | ASVS broader request/session boundaries | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-S07 | Portable import malicious-container validation | ASSESSED; PASS scoped | B restore/security fixtures |
| PQA-S08 | CSRF/cross-site request boundaries | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-S09 | Logging/redaction/retention inspection | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-S10 | Actual hosted OS/input/exposure | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-S11 | Future subscriber isolation design | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-S12 | AI/billing/data-provider threat/cost boundary | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-D01 | Synthetic portable restore invariants | ASSESSED; PASS scoped | B portable-restore fixtures |
| PQA-D02 | Actual backup→restore→reopen | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-D03 | SQLite write/claim fault rollback | ASSESSED; PASS scoped | PD-QA-014/015 fault rollback |
| PQA-D04 | Legacy-invalid source preservation | ASSESSED; PASS scoped | Account/Free Bet legacy fixtures remain raw |
| PQA-D05 | Valid/invalid export diagnostics | ASSESSED; PASS scoped | Account browser export409/200 |
| PQA-D06 | Actual isolated PostgreSQL transactions | ASSESSED; PASS / PROVEN scoped | Real PostgreSQL18.6 Account/Free Bet preflight/rollback, independent persisted values and separate-process Blackjack retry/races; current A–D evidence |
| PQA-D07 | PostgreSQL disaster recovery | ASSESSED; PASS / PROVEN scoped local database recovery | Actual dump/second-database restore, exact counts/financial/source claims, restart, post-restore read/rollback/duplicate protection; cloud/deployment/import recovery separate |
| PQA-D08 | Populated workbook import/award reconciliation | ASSESSED; FAIL / PROVEN scoped | Real native XLSX upload/approval/backup/confirm/reopen/report/export; malformed zero writes/no-op retry; parent source alias unresolved and award retry credit duplicated; full Profile migration NOT TESTED |
| PQA-D09 | Google/workbook fallback roundtrip | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-D10 | Immutable conversion source checksum | ASSESSED; PASS scoped | PD-QA-015 immutable SHA/source table |
| PQA-D11 | Retention/deletion/privacy recovery | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-D12 | Crash/network-loss/concurrent browser recovery | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-M01 | Calculation/reference/actual single authority | ASSESSED; REVIEWED | C money authority source review |
| PQA-M02 | Schema/version/legacy compatibility boundary | ASSESSED; REVIEWED | C v1/v2 and migration inspection |
| PQA-M03 | SQLite connection/initialisation architecture | ASSESSED; REVIEWED | C RLock/schema-init inspection; measured cost unknown |
| PQA-M04 | PostgreSQL deployment/rollback assumptions | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-M05 | Backup custody/encryption/retention | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-M06 | Test fixture isolation/readiness | ASSESSED; REVIEWED | B harness blockers + explicit synthetic factories |
| PQA-M07 | Typing/lint/flakiness census | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-M08 | Large-table/chart performance | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-M09 | Request storms/stale-response census | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-M10 | Routed docs/instruction contradictions | ASSESSED; REVIEWED | A stale docs/orphan IDs; no bulk cleanup |
| PQA-M11 | Dependency/provider maintenance disposition | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-M12 | Subscriber/hosting/AI sustainability decision | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-R01 | Notification original+clarified scope | ASSESSED; REVIEWED | #90 original;#99 original+5567517442/5567729491 |
| PQA-R02 | Account restriction/balance clarification set | ASSESSED; DOCUMENTED review, not runtime PASS | Current addendum#70/#82/#85/#106 original+all available clarifications, source/contracts/gaps retained |
| PQA-R03 | Dashboard/reports/tasks/AI original scope | ASSESSED; DOCUMENTED planned/partial, not implementation PASS | #111 prior review plus #25–31/#72/#86 originals and #86 clarification5569417310; contracts/source/gaps/dependencies in current checkpoint |
| PQA-R04 | Import/recovery original scope | ASSESSED; DOCUMENTED review, not runtime PASS | Original #12/#94/#95/#104 plus award dependencies #49/#80 fully available issue/clarification sources→contracts/code/plans/current evidence/gaps; #109 not counted twice |
| PQA-R05 | Calculator/bridge coverage scope | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-R06 | Unlocated/future requests and source recovery | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-C01 | Public calculator configuration comparison | OPEN; PARTIAL | MBB/OddsMonkey public configuration documented; Outplayed exact configuration review remains UNVERIFIED |
| PQA-C02 | Public offer evaluation comparison | ASSESSED; DOCUMENTED | Current addendum: three vendor guidance cells, not member hands-on |
| PQA-C03 | Activity-recording comparison | ASSESSED; DOCUMENTED comparison, not hands-on | Outplayed/OddsMonkey tracker documentation versus MBB limited offer-progress documentation; financial equivalence/member interactions unverified |
| PQA-C04 | Expected vs actual performance comparison | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-C05 | Cash/balance workflow comparison | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-C06 | History/recovery comparison | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-C07 | Hands-on keyboard workflow | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-C08 | Hands-on mobile workflow | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |
| PQA-C09 | Hands-on evaluate→record→performance | OPEN; NOT TESTED / PARTIAL | Next: execute/review this named boundary; retained gap table below supplies blocker |

### Complete-journey denominator — v1

A completed journey includes the stated start, mutation/recovery, persistence/reopen and final
display/report steps. It must finish its required steps; incidental access failure is not completion.
Shared width/theme variants are recorded in the modal addendum, not inflated into separate journeys.

| ID | Required start→end journey | Current result / evidence |
|---|---|---|
|PQA-J01|Account legacy-invalid/invalid entry→correction→Save→complete cash+export/reopen|PASS / PROVEN; money-repair-browser.json1440light/760dark,22.34 |
|PQA-J02|Native SNR Available→matching/copy→actual placement7→settlement→Reports/reload|PASS / PROVEN; free-bet-complete-journey.json,7.72→10.60 |
|PQA-J03|Native SR Available→matching/copy→actual placement7→settlement→Reports/reload|PASS / PROVEN; same runner,9.65→20.60, combined31.20 |
|PQA-J04|Standard source→Profile/Account/review→pointer Save→receipt/focus→destination/reopen|PASS / PROVEN; modal-conversion-browser.json1440/760/390 both themes |
|PQA-J05|Actual Blackjack Live UI→hand outcome→Casino conversion→retry/second Account→history/report/reload|PASS / PROVEN; reviewed20→15=-5, one activity, retry same row, second Account409 |
|PQA-J06|Converted SNR/SR→actual placement→settlement→lineage/history/report UI|PARTIAL; financial slice24.80 retained; Settlement→Advanced controls→Notes source ID/hash passes8 width/theme/type checks with unchanged records/audits. Full row change-history consumer missing (PD-QA-016); award parent legitimately absent for calculator source |
|PQA-J07|Sportsbook native new→matching/copy→actual placement→settle/undo→report|FULLY EXERCISED; PASS on cb0f290 repair only: browser4 variants, invalid/correction/report/reload, SQLite atomicity/denial and real PG17. Main unfixed; historical failures preserved. |
|PQA-J08|Casino other activity→fees/override→settle/reopen→report|NOT TESTED; explicit fee/override factories next |
|PQA-J09|Extra Place/Each Way native→win/place actuals→settle→report|NOT TESTED; changed terms/unsupported variations remain blocked |
|PQA-J10|Cash movement→Account reconciliation→fees/matching→report|NOT TESTED; independent native movement fixture next |
|PQA-J11|Award group→SNR/SR issued descendants→settlement→safe removal/history|PARTIAL / FAIL: genuine single/split awards, second-child503→retry15 credit for10, SNR/SR settlement5.30/10.30 and report/reload verified. Safe Available removal blocked by source placements; separate API source deletion204 leaves four orphans and removes−1.18 from reports. No complete passing journey; PD-QA-017 |
|PQA-J12|Multi-Profile conversion partial failure→retry unresolved→new intent→notifications|FULLY EXERCISED; PASS / PROVEN browser/API/persistence counts2/1, three notification links; current addendum |
|PQA-J13|Onboarding→catalogue Accounts→permissions→first tracker action/reopen|PARTIAL; API identity creation, full guided UI next |
|PQA-J14|Profile archive/recover/delete→denied writes→directory/search isolation|PARTIAL; sampled security/restore tests; full browser lifecycle next |
|PQA-J15|Login→session expiry→denial→re-authenticate→state recovery|NOT TESTED; real callback/provider prerequisites unavailable |
|PQA-J16|Global search→filter/loadout→Quick Action→correct Profile record|NOT TESTED; actual keyboard/stale-response journey next |
|PQA-J17|Notification create→clear/reload/new context→source lifecycle/history|PARTIAL; durable clear tests not source-independent history;#90 retained |
|PQA-J18|Workbook import→mapping/approval→write→reopen/reconciliation/export|PARTIAL: actual native single-ledger XLSX files for2 Accounts/1 Sportsbook/1 linked Free Bet→review/approval/verified backup/import→real UI reopen/report→browser Accounts export; invalid zero writes, repeats no_op. Full multi-sheet Profile migration, cross-Profile source collisions and #109 access fields NOT TESTED; parent alias does not resolve native ID (PD-QA-018) |
|PQA-J19|Portable restore→reopen tracker→report/export→undo/recovery|PARTIAL; API restore invariants not full browser restore |
|PQA-J20|Backup→actual SQLite restore→read/reconcile→rollback|BLOCKED harness/fixture setup; existing named backup tests not whole recovery |
|PQA-J21|Isolated PostgreSQL writes/concurrency→backup/restore→read/rollback|FULLY EXERCISED; PASS / PROVEN scoped backend journey, real18.6 port60936, dump/SECOND DB restore/exact values/counts/source IDs, restart and injected post-restore rollback. No hosted/browser disaster-recovery certification |
|PQA-J22|Combined Profile reports→chart point/filter/drilldown→record/source|NOT TESTED;#111 interaction/requested analytics retained |
|PQA-J23|Settings/preferences→failed mutation recovery→refresh/session reopen|NOT TESTED; peer settings fixture and failure injection next |
|PQA-J24|Large realistic dataset→filter/page/chart→responsive input/stale recovery|NOT TESTED;30row fixture is not large-data/performance evidence |

### Competitor workflow slice — public evidence, accessed2026-09-13

Each C capability has one cell per Outplayed/MBB/OddsMonkey (27total).
D = completed documentation-only comparison; H = completed hands-on workflow;
B = required interaction inaccessible/blocked; U = unexamined or unresolved. D is not H.
Historical first baseline counts:7D,0H,3B,17U; current14/27 cells (12D/2H/3B/10U) are detailed at the top.
No private login, trial signup, wager or authentication bypass.
A public URL/access failure is evidence of inaccessibility, never proof that the feature is absent.

| Capability / method | Outplayed | MBB | OddsMonkey |
|---|---|---|---|
|C01 public configuration/guidance|U exact arrangement unresolved|D [public controls/guidance](https://matchedbettingblog.com/matched-betting-calculator/)|D [normal/SNR/SR/commission guidance](https://www.oddsmonkey.com/matched-betting/calculator/)|
|C02 offer-review workflow documentation|U|U|U|
|C03 activity recording documentation|D [Store in Profit Tracker / My Bets](https://outplayed.com/blog/matched-betting-spreadsheet)|D limited [offer progress](https://matchedbettingblog.com/); financial tracker equivalent remains unlocated, not declared absent|D [tool/manual/historical entry](https://help.oddsmonkey.com/hc/en-gb/articles/11151091597085-Keep-On-Track-With-Our-Profit-Tracker)|
|C04 expected versus actual documentation|D [My Bets EV/profit graphs](https://outplayed.com/blog/outplayed-pro-tools-data)|U|D [expected/actual +tool/sport drilldown](https://www.oddsmonkey.com/matched-betting/profit-tracker/)|
|C05 cash/balance documentation|D [separate Balance Sheet, cosmetic cash transfers](https://outplayed.com/blog/matched-betting-spreadsheet)|U|U|
|C06 recovery/history documentation|U|U|U|
|C07 actual keyboard interaction|U|U|U|
|C08 actual mobile interaction|U|U|U|
|C09 actual evaluate→record→performance interaction|B member tracker documented login; attempted public entry unavailable|B recording endpoint/equivalent unlocated; guessed spreadsheet URL failed, forum anecdotes not authority|B [Profit Tracker redirects to login](https://members.oddsmonkey.com/account/login?&returnurl=%2ftools%2fprofittracker)|

Useful pattern: contextual evaluate→record handoff and explicit expected/actual graph/report, with
separate balance accounting. Our source→review→ledger bridge reduces re-entry, but pending
#111 drilldown/analytics and#85/#106 balance observations need their own authority; forecast,
placed cash and settled result must not be collapsed. No competitor superiority/parity or autonomous
wagering recommendation. Next bounded comparison: public offer-review and recovery help, then
authorised member interactions only when legitimately available.

### Historical clarification reconciliation — bounded slice

Historical first baseline: four full review units qualified: #90,#99,#109 and#114 (original audit brief plus current
living scorecard5652511529). All other issue titles/index entries remain **unreconciled**, not completed.
This conservative baseline intentionally does not promote the indexed backlog into scope evidence.

| Original request→outcome | Applicable clarification | Implementation/plans/evidence→remaining issue |
|---|---|---|
|#90 NOTIFICATION-HISTORY-001→history survives source disappearance|Original issue has no comments; current body reviewed2026-09-13|Source-derived history/clear tombstones are not durable events; C notification boundary review; keep#90 open, event-store design required |
|#99 NOTIFICATION-FIX-001→clear-one/all stays cleared across refetch/reload/new context|5567517442 and5567729491 supersede login-only blocker with no reachable actionable fixture|Existing synthetic notification runtime now available separately; no owner recheck assigned. Automated clear evidence retained; normal/hosted/manual acceptance pending. Not merged into#90 |
|#109 ACCOUNTS-IMPORT-ACCESS-001→preserve access/restrictions after September import|5570274337: Stake/Promo Access omitted; LastPromoUsed not recomputed|Current importer mapping gap CODE-VERIFIED; reviewed mapping/provenance first, not generic lifecycle reuse. Preserve#104 baseline/#82 capability authority and unknown-label review; no importer repair here |
|#114 PLATFORM-QUALITY-AUDIT-001→whole product evidence/priority handoff|5652511529/current authorised task|Stable scorecard+retained gaps, scoped safety repair; scope beyond current checks remains open |

Next original+clarified source set: #70/#82 restriction intelligence, #85/#106 observation/freshness,
#111 analytics. PD-FUTURE-001–018 source gaps remain visible; nothing is merged/deleted/deprioritised.

### Current online handoff receipt — 2026-09-13

#114 living5652511529 updated; #91 comment5652681682, #36 comment5652681735,
#92 comment5652681789. Published handoff explicitly identifies local-only report745a382 and
candidate46149c3; no fabricated GitHub file link or push/deployment claim.
Protected API8010/8020/8013/8024/8026/8030 and candidate8034 health200; candidate3034 login200.
Latest complete modal probe JSON includes six width/theme conversion records and actual Blackjack
report/retry/refresh; half-dark injected503 preserved form and pending Escape, then retry succeeded.

### PD-QA-004 candidate evidence and review gates — 2026-09-13

Product repair commit a7a4e74fe633c410056889c500912e53dc01ba99 (local only; push withheld).
Repair base f57e71ad1b7d35070154b96d3e4f33b15f780d24; isolated3034/8034,
/tmp/openforge-modal-114-repair/acceptance.sqlite3. Main, frozen candidate and all protected
databases are unchanged. The same report is synchronised to audit/platform-quality-114 by
documentation-only changes; no product integration.

Root cause: ordinary overlay stacking allowed navigation to intercept Save; focus ran before
the active panel mounted. Async Blackjack snapshot preparation also lost the original opener.
Shared native top-layer ModalBoundary, mounted-panel focus lifecycle and explicit async opener
ref preserve existing surfaces and dirty/pending confirmation rules. Header fallback permits
bounded modal scrolling without obscuring actions. No formulas/schema/authentication changed.

| Probe | Result / evidence | Remaining boundary |
|---|---|---|
| Pre-fix760px native Free Bet, both themes | FAIL / PROVEN initial focus outside; real Save produced no PUT | Original baseline JSON retained in isolated runtime |
| Native Free Bet1440/760/390px, both themes | PASS / PROVEN pointer Save, invalid text/error/correction, nested dirty Escape, Tab, reopen | No forced clicks |
|320px reflow, both themes | PASS / PROVEN independent unscaled reflow | Combined320px/200% NOT TESTED |
| Desktop200% text — historical pre-next-checkpoint | FAIL / PROVEN document1497px vs1440px; modal Save hit target unobstructed | Attribution corrected to PD-QA-005 reflow; repaired candidate evidence in current addendum; PD-QA-003 remains missing Profile |
| Account1440light/760dark | PASS / PROVEN real correction/save, legacy invalid preserved until correction,22.34 complete cash total, export rejection/correction | All Account variants not a UI certification |
| Native SNR/SR full financial journey | PASS / PROVEN copied7.72/9.65; actual7; Back Won10.60/20.60; report31.20 after refresh | Award/removal/import lineage remains separate |
| Standard conversion six width/theme variants | PASS / PROVEN canonical Account identity, real Save/receipt/focus/row, state retained | Partial multi-Profile browser journey remains open |
| Actual Blackjack UI760dark | PASS / PROVEN Live20→15, one Casino activity-5, same-target retry same row, another Account409, history refresh/report | Other Profile concurrency has inherited SQLite tests, actual PG open |
| Backend repair regressions | PASS / PROVEN139 focused SQLite tests (Account25, Free Bet95, Blackjack19) | Not all workflows/inputs; no PostgreSQL execution |
| Typecheck and production build | PASS / PROVEN direct local TypeScript and Next build | No deployment |

Artifacts are local synthetic-only JSON and private temporary screenshots/video under the runtime
directory, not committed observations or operational records. Scripts are reproducible isolated
probes. One earlier invalid-input timing assertion failed during parallel build activity; unchanged
sequential six-case assertions pass, but the timing cause is UNVERIFIED, not an erased PASS.
Screen-reader behaviour remains UNVERIFIED; reduced-motion rendered contexts tested, broader
non-reduced-motion/interruption and accessibility checks remain open.

Finding stages (cumulative, not disjoint):15 original findings open;4 fixes on inherited repair
branches; modal004 partially verified fifth repair;0 findings fully combined-candidate verified
against every required gate;0 integrated locally;0 hosted verified;0 owner accepted. Scoped
SQLite/browser successes above do not erase original findings or imply integration.

Local engineering handoff remains BLOCKED by200% page reflow and remaining required UI checks.
Prepared candidate URL http://localhost:3034 uses the existing authenticated synthetic fixture;
no public authentication shortcut or reseeding of protected data. No Will regression assignment.

Preview BLOCKED. GitHub reports Vercel success deployments for previous f57e71a repair and7d75b5a
audit commits; repository has no branch-ignore rule. Pushes are withheld to avoid unapproved Preview.
Current deployment exposure/protection/environment remain UNVERIFIED, not safe by assumption.
Before any release push: confirm safe Git-trigger behaviour; reviewed combined build; isolated Preview
API/database with no production fallback; genuine authentication and deployment protection; actual
isolated PostgreSQL transaction tests;#115 dependency/exposure disposition;#96 owner/provider rotation;
rollback to prior approved revision and synthetic test cleanup plan; authorised targeted hosted smoke.
No secrets inspected, settings changed, merge, deployment or closure.

Next bounded tranches: (1) finish shared reflow/modal acceptance with unchanged financial regressions;
(2) isolated PostgreSQL/award/import/recovery journeys and combined reports, preserving legacy values;
(3) retained requirement clarifications#70/#82,#85/#106,#111 and offer/recovery competitor cells.
Return-to-development prioritisation requires every87 assessment to have evidence or explicit blocker,
visible journey/competitor limits, retained issue mapping and concrete security/financial dispositions.
The current first measured baseline has no comparable preceding percentage; it adds a denominator,
five fully exercised journeys, seven documented competitor cells and four fully reconciled requests.
#113 manual sign-off stays deferred by Will without a date.

GitHub evidence synced on2026-09-12: #91 comment5648926365, #114 comment5648926454,
#36 comment5648926501, #40 comment5648926573. Issues remain open. Read-only final health checks:
8010/8020/8013/8024/8026/8030 healthz200;3010/3020/3013/3024/3026/3030 login200.
