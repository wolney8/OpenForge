# Audit Register — Plum Duff / OpenForge — Doc ID: AR-CODEX-001

## CP-110 current checkpoint — 2026-11-01

- `PD-PR-110-01`: Fund Manager journey and isolated Design Lab direction are documented, not implemented or owner accepted. Original Design Lab brief and exact DJList reference have not been located; provenance and reference-dependent claims remain unverified.
- `PD-FIX-504`: owner-observed `ECONNREFUSED 127.0.0.1:8010` occurred during the CP-109 web/API startup gap after an exact-revision API gate rejected `04f591d…+dirty`. Both canonical services are healthy now; recurrence outside that logged event is unverified. No service was restarted for CP-110.
- CP-109 broad API run (1,200 passed / 125 failed / 20 skipped) and broad Ruff lint (264 findings) are **reported baseline**, not a clean gate or proof that every failure is harmless. Focused CP-109 checks and owner acceptance remain distinct. [Detail](docs/audits/platform-quality-audit.md#cp-110-design-lab-discovery-and-ux-direction--2026-11-01).

**Last updated:** 2026-11-01 for the CP-110 checkpoint; historical tables below retain their checkpoint-time status.

This is the owner-facing index for audit evidence. The
[platform quality audit](docs/audits/platform-quality-audit.md) remains the detailed authority.

## Audit progress

These are coverage measures, not percentages of the product finished.

| Area | Covered | Method note |
| --- | ---: | --- |
| Assessments reviewed | 87 / 87 (100%) | Reviewed includes explicit partial, blocked, unverified and deferred states; it does not mean PASS |
| Complete tasks exercised | 23 / 24 (96%) | All required steps must be exercised |
| Complete tasks passing | 23 / 24 (96%) | Blocked or partial tasks are excluded |
| Competitor comparisons | 27 / 27 (100%) | 14 documentation, 3 hands-on and 10 reviewed-inaccessible cells; reviewed is not confirmed |
| Requirements reconciled | 133 / 133 (100%) | Implementation, hosted and owner-acceptance states remain separate |

## Finite remediation classification — CP-055

Whole-platform audit discovery/reconciliation is complete for the recorded scope; remaining entries are acceptance, operational gates or separately tracked feature work.

| Classification | Exact remaining scope |
| --- | --- |
| Open Critical/High engineering defect | None demonstrated in supported product scope; not a fresh dependency scan |
| Open Medium/Low engineering maintenance | Two recorded groups:200 Ruff style/test findings; 600-row payload/pagination capacity |
| Fixed and verified |17/22 original PD-QA findings:002–008, 011, 014–022. New CP-055 Profile/import repairs verified locally; Preview promotion pending |
| Accepted risk | PD-QA-001 production paths repaired; five development-only dependency advisories at retained measurement |
| Manual acceptance only | VoiceOver spoken output, broader owner acceptance; accepted Google/#117 behaviour retained |
| External/operational gate | PD-QA-013/#96 rotation; Preview fresh DB recovery/session; hosted per-ledger backup capability; Git isolation, off-device custody, personal cutover approval |
| Feature/source requirement | PD-QA-009 broader Account intelligence; 010 unsupported Multi-Lay; 012/#102 source-unresolved requests retained without invented wording |

No issue closure or new audit. Local #107 selector criteria hold: no disposable test Account labels; archived fixture history deliberately retained. Preview hygiene remains unverified.

## Current high-priority findings

| ID | Plain-English problem | State | Repair / integration state | Issue |
| --- | --- | --- | --- | --- |
| CP-055 / PD-FIX-309–312 | Profile relationship, Explorer V1, Account authority/portability and review reachability | Implemented/verified locally; Preview blocked | `534a5f4`; 129 API, 55 Reports units, scoped browsers/PostgreSQL/types/build. Prior owner data preserved by verified migration. [Evidence](docs/audits/platform-quality-audit.md#cp-055-personal-foundation-reports-explorer-and-account-authority) | [#111](https://github.com/wolney8/OpenForge/issues/111), [#109](https://github.com/wolney8/OpenForge/issues/109), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-054 / PD-FIX-308 / PERSONAL-READINESS-001 | Operational consolidation/model handover | Local/Preview application running; hosted authenticated importer gap explicit |`b6437e8`; source/schema/data/auth/protection/assets verified; provider config reused. No private cutover or repeated campaign. [Evidence](docs/audits/platform-quality-audit.md#cp-054-operational-consolidation-and-model-handover--2026-09-26-2115-bst) | [#101](https://github.com/wolney8/OpenForge/issues/101), [#104](https://github.com/wolney8/OpenForge/issues/104), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-053 / PERSONAL-READINESS-001 | Read-only legacy comparison / personal cutover | Comparison COMPLETE; purpose decision BLOCKED |Exact remaining real/test set and all classifications retained privately; parent gaps non-blocking; no code/data change or repeated rehearsal. [Evidence](docs/audits/platform-quality-audit.md#cp-053-read-only-personal-cutover-preparation--2026-09-26-1855-bst) | [#104](https://github.com/wolney8/OpenForge/issues/104), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-052 / PERSONAL-READINESS-001 / PD-FIX-308 | Complete private source acceptance and destination identities | FULL PRIVATE REHEARSAL PASS; tested local repair |`b6437e8`;262 API,4 PostgreSQL,8 private browser steps and fresh recovery pass. Normal/Preview`7da4d44`; target/merge decision separate. [Evidence](docs/audits/platform-quality-audit.md#cp-052-complete-private-rehearsal-and-import-identities--2026-09-26-1225-bst) | [#104](https://github.com/wolney8/OpenForge/issues/104), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-051 / PERSONAL-READINESS-001 / PD-FIX-305 | Applied source approvals; duplicate-provider overwrite, historical Notes/recovery and parent identity gaps | TESTED LOCAL REPAIR; final private acceptance BLOCKED on one new source choice |`76fcb51` local commit only;257 API,8 private browser steps, API types/changed-line lint. Fresh full validation blocks before writes; normal/Preview remain`7da4d44`. [Evidence](docs/audits/platform-quality-audit.md#cp-051-approved-import-decisions-and-full-private-rehearsal--2026-09-26-1111-bst) | [#12/#104/#109](https://github.com/wolney8/OpenForge/issues/104), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-050 / PD-FIX-305–307 / PERSONAL-READINESS-001 | Complete source accounting and import-gate correctness | ENGINEERING REPAIRS DELIVERED; full personal import awaits decisions |7da4d44 local/Preview;175 API, scoped browsers/types/builds pass. Hosted per-ledger confirmation explicitly409/zero writes; no full private import or normal cutover claim. [Evidence](docs/audits/platform-quality-audit.md#cp-050-full-source-accounting-and-import-repairs--2026-09-25-2138-bst) | [#12/#104/#109](https://github.com/wolney8/OpenForge/issues/104), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-049 / FUND-MANAGER-TASK-DECK-001 / PD-FIX-304 | Useful Daily tasks and private import recovery | CURRENT TASK SLICE COMPLETE; full personal cutover blocked on named source decisions |09ef37e local/Preview;46 API/70 web,7 actual+6 fixture-backed checks each; private8-step subset chain/restore PASS, full import422/zero writes; unchanged owner data. [Evidence](docs/audits/platform-quality-audit.md#cp-049-private-import-rehearsal-and-daily-tasks--2026-09-25-1655-bst) | [#86](https://github.com/wolney8/OpenForge/issues/86), [#94](https://github.com/wolney8/OpenForge/issues/94), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-048 / PD-FIX-302–303 / PERSONAL-READINESS-001 | Catalogue/Combo forms; personal workflow readiness | FORMS COMPLETE; private import awaits source choice | App`a3afdfc` local/Preview;52 API/74 web,8 isolated/8 hosted, types/lint/build.117 issues mapped in [FEATURE_STATUS](FEATURE_STATUS.md); no new owner-blocking security/report defect demonstrated. Private workbook totals/rehearsal unexecuted. [Evidence](docs/audits/platform-quality-audit.md#cp-048-personal-readiness-and-reference-forms--2026-09-25-1526-bst) | [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-047 / PD-FIX-114 / ACCOUNT-AUDIT-001 / ACCOUNT-BALANCE-HISTORY-001 | Operational Normal Multi-Lay and core Account review/observation history | BOUNDED SLICES COMPLETE locally/Preview | App `e2d70e0`;107 API/89 web,7 isolated/7 hosted, PostgreSQL retry/restore, types/build/lint; no schema or owner-data changes. Wider configurations/entry points/trends remain. [Evidence](docs/audits/platform-quality-audit.md#cp-047-operational-multi-lay-and-account-observations--2026-09-25-1411-bst) | [#36/#38](https://github.com/wolney8/OpenForge/issues/38), [#85/#106](https://github.com/wolney8/OpenForge/issues/106) |
| PD-FIX-297–299 / CP-046 | Tracker Lists save recovery, Account form/footer focus and Profile Defaults heading/help | IMPLEMENTED AND VERIFIED locally/Preview | App`9e7cbd2`;10 isolated/10 hosted,35 web+1 API/types/build/lint pass; unchanged owner data. [Evidence](docs/audits/platform-quality-audit.md#cp-046-settings-forms-and-account-editor--2026-09-25-1138-bst) | [#92](https://github.com/wolney8/OpenForge/issues/92) |
| PD-FIX-294–296 / CP-045 | Named Fee Position/Exposure, Profile and fee-dialog coverage | IMPLEMENTED AND VERIFIED locally/Preview | App`7dc975f`;104 focused tests,13 isolated/13 hosted, types/builds pass; unchanged owner data; #114 publication resolved. [Evidence](docs/audits/platform-quality-audit.md#cp-045-named-financial-coverage--2026-09-25-0951-bst) | [#105](https://github.com/wolney8/OpenForge/issues/105), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| PD-FIX-292–293 / CP-044 | Reports missed card replay, displayed stale period money and converted missing Cash costs into a complete retained total | COMPLETE locally and protected Preview | App`0189434`; Reports3/3 hosted, eight relevant workflows pass after bounded rechecks,48 web tests/types/build; unchanged owner data. #105 synced; additional #114 comment rejected by automatic approval review. [Evidence](docs/audits/platform-quality-audit.md#cp-044-reports-financial-display--2026-09-24-1946-bst) | [#105](https://github.com/wolney8/OpenForge/issues/105) |
| PD-FIX-290–291 / CP-043 | Extra Places premature/partial zero and missing card replay; Dashboard delayed-period overwrite and failed-cache display | COMPLETE locally and protected Preview | App `3a7f0a3`; isolated6/6, hosted6/6, restored2/2, web46/calculation5, types/lint/build; actual local served source and unchanged owner data. [Evidence](docs/audits/platform-quality-audit.md#cp-043-extra-places-summaries-and-profile-dashboard-cards--2026-09-24-1600-bst) | [#105](https://github.com/wolney8/OpenForge/issues/105), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| PD-FIX-288–289 / CP-042 | Extra Places detached clear action/focus failures; all-profile cards lacked replay and hid/partially displayed Active totals | COMPLETE locally and protected Preview | App `cb4c1c4`; 4 isolated/4 hosted workflows, 32 focused units/types/build; unchanged owner data. CP-041 hosted gap also closed4/4. [Evidence](docs/audits/platform-quality-audit.md#cp-042-protected-preview-delivery-and-bounded-ui-repairs--2026-09-24-1500-bst) | [#92](https://github.com/wolney8/OpenForge/issues/92), [#105](https://github.com/wolney8/OpenForge/issues/105) |
| PD-FIX-284–287 / CP-041 | Profile controls collapsed/overflowed; wrapped Catalogue actions displaced Search; Account/Cash cards showed premature zero and financial cells clipped | Implemented / local and protected Preview proven | App `7763284`; 12/12 browser workflows, 457 units, types/build pass; owner data unchanged. CP-042 closes the earlier publication block with remote configuration reuse and 4/4 hosted checks at `7763284`; final Preview includes these repairs in `cb4c1c4`. [Evidence](docs/audits/platform-quality-audit.md#cp-041-accountprofile-controls-and-accountcash-displays--2026-09-24-1352-bst) | [#92](https://github.com/wolney8/OpenForge/issues/92), [#105](https://github.com/wolney8/OpenForge/issues/105) |
| PD-FIX-281–283 / CP-039 | Compact ledger search stretched vertically; financial cards confused unavailable/zero and missed replay/large-text rules; blank Casino Notes could hide their own entry tab | Implemented / Preview proven / locally integrated | App `113d810`; 453 web tests, affected isolated/Preview browser 6/6 each, types/build pass. Three shared ledger consumers; period-P&L retained; owner data unchanged. CP-040 reverified existing source: fresh 19 focused units, 6 isolated browser workflows, types/build and health/data checks pass. [Recovery verification](docs/audits/platform-quality-audit.md#cp-040-recovered-delivery-verification--2026-09-24-1259-bst). Fresh authenticated normal-owner browser check remains unexecuted. [Evidence](docs/audits/platform-quality-audit.md#cp-039-ledger-toolbars-and-financial-display--2026-09-24-1211-bst) | [#92](https://github.com/wolney8/OpenForge/issues/92), [#105](https://github.com/wolney8/OpenForge/issues/105), [#117](https://github.com/wolney8/OpenForge/issues/117) |
| PD-FIX-278–280 / CP-038 | Reports lacked the approved period-P&L view; compact Report/help geometry and header copy drifted | Implemented / Preview proven / locally integrated | Weekly points, records and totals share formal-report semantics; scope/period/point survive return. Web 445/445 and affected browser 3/3 in both isolated SQLite and protected Preview. Local health/data/login checks pass; direct authenticated normal-owner browser recheck was not authorised. [Evidence](docs/audits/platform-quality-audit.md#cp-038-period-pnl-preset-and-shared-report-geometry--2026-09-24-1108-bst) | [#111](https://github.com/wolney8/OpenForge/issues/111), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| PD-FIX-276–277 / CP-037 | Chart hover did not inspect a point; cash funding leaked into betting-P&L chart/drilldown | Repaired / Preview and local verified | Shared pointer inspection and existing headline scope now agree; £2/£3 betting gives £2 then £5 irrespective of separate cash top-ups. Web 437/437, types, build and final affected hosted checks 2/2 pass on `86ee412`. [Evidence](docs/audits/platform-quality-audit.md#cp-037-issue-led-settled-editor-and-chart-verification--2026-09-24-1000-bst) | [#111](https://github.com/wolney8/OpenForge/issues/111) |
| PD-FIX-274–275 / CP-036–037 | Notes typing invalidated settled previews, while Advanced Controls opened below the useful editor viewport | Repaired / authenticated Preview recheck complete | Renewed the existing synthetic session normally; final hosted type/pause, zero automatic writes/recalculations, reveal, Discard and explicit Save/reopen pass on `86ee412`. Normal runtime is healthy and owner hashes unchanged. Owner Save/Discard acceptance remains separate from this visual engineering proof | [#117](https://github.com/wolney8/OpenForge/issues/117), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| PD-FIX-271–272 / CP-034 | Existing Notes edits revalidated historical Accounts/new-entry completeness; Cash note clearing was also misclassified as a financial correction; cold Preview functions could rerun schema setup | Repaired / Preview and localhost verified | Five ledger editors pass browser add/amend/clear with stable identity and unchanged money; Cash description-only events are `edited` while monetary changes remain `corrected`; current PostgreSQL schemas retain the read-only migration-marker check. Preview and normal 3010 serve `a52ee88`; owner ledger hashes/counts are unchanged | [#117](https://github.com/wolney8/OpenForge/issues/117), [#91](https://github.com/wolney8/OpenForge/issues/91), [#36](https://github.com/wolney8/OpenForge/issues/36), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-FIX-269–270 / CP-032 | Small hosted reads repeatedly opened PostgreSQL connections and Preview functions ran across the Atlantic from their database | Repaired / Preview and localhost verified | Request-scoped connection reuse plus `lhr1` Preview functions reduced warm medians to 0.67s summary, 0.42s eligibility and 0.40s for 600 Sportsbook rows. Shared fixes through `712d174` now run on normal 3010; every owner row projection is unchanged | [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) |
| PD-FIX-267–268 / CP-031 | Hosted Free Bet lineage and Account eligibility performed repeated work across archived Profiles/rows | Repaired / verified on protected Preview | Batched Profile-scoped lineage reads reduced the populated summary from 70.78s to 5.81s; active-owner eligibility now reads 3 active Profiles rather than 83 total and returns in 11.88s. Supported hosted journeys, responsive/access/recovery and diagnostics pass on `659d0ea`; richer Multi-Lay placement/reward modes and the 600-row payload remain named future boundaries | [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) |
| PD-FIX-266 / CP-030 | Populated Reports could hit React error 185 when reduced-motion preference changed | Repaired / verified on protected Preview | One shared motion subscription replaces hundreds of per-value listeners. Revision `b9e58e7` passed the direct hosted Reports and £6→£5 proof; CP-031 retained that result on final Preview source | [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-029-R evidence recovery | The CP-029 delivery did not make the retained run/failure boundary sufficiently explicit | Historical CP-029 state; repaired CP-030/031 | HEAD `5d190cb`; deployed app `d35eed7`; one hosted Playwright result is retained as failed, with three rendered screenshots. The 22 hosted mutation journeys, fresh financial mutation proof and fresh DB-outage recovery were not completed in CP-029 | [#62](https://github.com/wolney8/OpenForge/issues/62), [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) |
| CP-029 hosted gate | Hosted authentication passed, but authenticated SSR initially lost its protected request context and Reports now exposes a client render loop | Historical CP-029 failure; repaired CP-030/031 | Revision `d35eed7` forwards trusted cookie/protection context and uses the explicit stable Preview API base. Core authenticated routes now render, but Reports emits React error 185; a four-worker stress run also produced five 300-second 504s although the serial journey remained practical | [#62](https://github.com/wolney8/OpenForge/issues/62), [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) |
| #35 / PD-FIX-263–265 | Calculator help could fall below its title and same-level Back/Lay sections used different outer containers | Repaired locally / owner accepted | `CalculatorSectionHeading` governs reference/table/embedded headings; one content grid aligns Multi-Lay sections, semantic tokens pair bookmaker/back with exchange/lay surfaces, and Will visually accepted the result on 2026-09-21 | [#35](https://github.com/wolney8/OpenForge/issues/35), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| #62 / PD-FIX-261–262 | Fresh normal-owner Google sign-in returned raw `Unable to continue` before leaving Plum Duff | Repaired locally / owner accepted | The role-bound launcher selects the canonical owner environment, auth fails closed when incomplete, deterministic state/callback/session evidence passes, and Will completed a genuine Google return to Plum Duff | [#62](https://github.com/wolney8/OpenForge/issues/62), [#116](https://github.com/wolney8/OpenForge/issues/116) |
| #35 / PD-FIX-258–260 | Multi-Lay input/results used visibly different shells, repeated unchanged effective odds and under-signalled financial meaning | Repaired locally / owner accepted | One shared calculator table shell governs both sections; limit/explanation text uses accessible help, changed effective odds use canonical display, and compact Results distinguish neutral instructions/liability from P&L | [#35](https://github.com/wolney8/OpenForge/issues/35), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| #116 / PD-FIX-255–256 | Initial session checking was an empty blocking screen and same-label Accounts produced duplicate React keys | Repaired locally / owner smoke ready | Brief checks no longer flash a full-screen fallback; noticeable checks use the branded shared loader, and Account health/summary rows use canonical Account IDs with same-label regression coverage | [#116](https://github.com/wolney8/OpenForge/issues/116), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| #35 / PD-FIX-257 | Multi-Lay exposed Mode plus large allocation cards before its core lay instructions | Repaired locally / owner accepted | Primary Bet Types are Normal, Normal Underlay and Free Bet SNR; result stakes/liability/positions precede detailed Outcomes, while reward modifiers and validated allocation modes remain in collapsed secondary disclosures | [#35](https://github.com/wolney8/OpenForge/issues/35), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| #116 | Archived synthetic residue made normal owner pages scan 66 Profiles and flood the screen with cash warnings | Repaired locally / owner smoke ready | Default reporting now queries 3 active Profiles, optional reporting has a local loading boundary, unknown cash is a grouped warning, and 24 proven empty synthetic Profiles were removed after clone/backup evidence | [#116](https://github.com/wolney8/OpenForge/issues/116), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-022 | A disposable candidate could be pointed at the normal owner database | Repaired on isolated candidate | Source-rooted configuration, explicit runtime roles and connection-level ownership checks now fail closed; the CP-012 near-miss left no lasting data change | [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-006 | Broad tests depended on hidden fixture/contract state | Repaired locally | 1,085 pass, zero fail/error and 12 documented private-source acceptance skips; all 1,097 outcomes are classified without owner data |
| PD-QA-016 | Users could not see governed chronological row-change history | Integrated locally / browser-proven slice | One shared plain-English History panel is wired into five financial ledger editors; full notification history remains separate | [#36](https://github.com/wolney8/OpenForge/issues/36), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-018 | Imported child records did not always resolve their native parent | Integrated locally / engineering gate passed | Normal 3010 uses Profile + logical namespace + external ID; retry, collision, explicit re-resolution and portable remapping pass | [#12](https://github.com/wolney8/OpenForge/issues/12), [#80](https://github.com/wolney8/OpenForge/issues/80) |
| PD-QA-021 | Deleting some ledger rows also removed their audit history | Integrated locally / engineering gate passed | Normal 3010 records append-only evidence across five ledgers; reports ignore evidence rows and protected financial deletion is denied; full history UI remains PD-QA-016 | [#80](https://github.com/wolney8/OpenForge/issues/80), [#90](https://github.com/wolney8/OpenForge/issues/90), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-011 | Notification History lost an earlier event when its live source changed | Integrated locally / focused lifecycle passed | A bounded Profile/user-scoped immutable event store retains readable history; current alert and dismissal state remain separate | [#90](https://github.com/wolney8/OpenForge/issues/90), [#99](https://github.com/wolney8/OpenForge/issues/99) |
| #111 | Explorer and temporal scope | Explorer V1 delivered locally in CP-055 | Today/week/month/custom, realised P&L/Activities/costs/withdrawals and canonical grouping/drilldown; actual historical placement dates unavailable, saved presets remain | [#111](https://github.com/wolney8/OpenForge/issues/111) |
| C05 | Changed-odds and multiple-fill coverage beyond supported Normal Multi-Lay | PARTIAL; supported Normal slice complete CP-047 | Actual different-odds fills, one-market commission, remaining exposure/settlement/correction/restore are implemented and regressed CP-048. Unsupported backing/reward/multiple-market configurations remain explicit | [#35](https://github.com/wolney8/OpenForge/issues/35), [#38](https://github.com/wolney8/OpenForge/issues/38) |
| PD-QA-001 | Dependency advisories affected reachable or development paths | Production remediated locally; five development-only findings accepted pending upstream | Next 16.3.3, sharp 0.35.4 and Vitest 4.1.11 leave zero production advisories; remaining brace-expansion/js-yaml paths are confined to ESLint tooling and forced overrides are not justified | [#115](https://github.com/wolney8/OpenForge/issues/115) |
| #96 | Provider credentials still require owner/provider rotation | Owner action pending | No secret values are recorded in the audit | [#96](https://github.com/wolney8/OpenForge/issues/96) |
| PQA-U08 | Actual screen-reader behaviour has not been verified | Engineering evidence complete / owner-manual output required | VoiceOver exists locally, but spoken output cannot be captured reliably; this boundary will not be repeatedly represented by automation | [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PQA-M07 | Static analysis and ordinary focused suites must remain clean | Passing tests/types; bounded Ruff debt classified | Mypy and TypeScript pass; Ruff retains 200 non-runtime findings (168 line length, 20 import order, 12 test fixture-shadow) after eight bounded fixes | [#114](https://github.com/wolney8/OpenForge/issues/114) |

## Complete workflow status

| Workflow | State | Main gap |
| --- | --- | --- |
| Account correction to truthful cash total | Passed locally | Main/origin and hosted builds are unchanged |
| Native and converted Normal/SNR planning to settlement/report | Passed locally | Main/origin and hosted builds are unchanged |
| Native Sportsbook save, placement, correction and report | Passed locally | Shared History is present; full correction UI breadth is still ledger-specific |
| Generated Free Bet awards | Passed locally | Fresh split award, lost/concurrent/changed retry, child settlement, History, protected removal and portable native-ID remapping pass |
| Profit Boost and conditional Cashback | Passed on the integrated local application | Split award-group receipt linkage remains limited |
| Multi-Lay create, save and reopen | Partial overall; Normal slice passes locally/Preview | CP-047 completes Normal actual changed-odds fills, settlement, correction, History/Reports/restore. Other backing/reward/multiple-market configurations remain unsupported |
| Blackjack session to one Casino activity | Passed locally | Hosted and owner acceptance are not claimed |
| Portable Profile restore, report, re-export and cleanup | Passed locally | Hosted recovery is not inferred |
| Full Profile workbook import and recovery | Passed locally | Authenticated six-sheet #109 import, award lineage/retry, £7.18 settlement/report, export and portable restore/native-ID remap pass |
| Extra Place actual placement and correction | Passed locally | Native actual lays, settlement, Void, readable immutable History, report and reload pass; hosted/owner acceptance is not inferred |
| Cash Adjustment correction and reporting | Passed locally | Linked Account remains an observation while +25→+20 and −7 cash movements report net +13 once; retry/History/validation pass |
| Native Casino activity | Passed locally | £7 gross less current governed costs reports £6 then corrected £5 once; History and malformed-money rejection pass |
| Converted Free Bet SNR and retained legacy SR | Passed locally | Conversion, copied reference, distinct actual placement, settlement, readable History, report and reload pass |
| Profile and combined financial reporting | Passed for canonical journey | Active-only defaults, deliberate archived inclusion, arithmetic/range/breakdowns, point inspection and reconciled-record drilldown pass; CP-055 adds local canonical module/metric/group filters; actual historical placement-date counts and saved presets remain |
| Notification clear and history | Passed locally | Current alert, dismissal and durable historical event remain distinct; retry and viewer isolation pass |
| Profile lifecycle and recovery | Passed locally | Create, archive, active-navigation exclusion, historical-report retention, recover and empty-Profile deletion boundaries pass |
| Settings and session recovery | Passed locally | CP-025 re-proves initiation, state, callback, failure and session persistence; CP-027 records Will's successful genuine Google return. VoiceOver remains a separate journey |
| Realistic 200-record Profile | Passed locally | Navigation, pagination, filter/search, chart and delayed-response recovery pass; hosted capacity remains separate |
| SQLite backup restore and reopen | Passed for the isolated local copy | Operational/hosted disaster recovery remains separate |
| Local PostgreSQL transaction, backup and restore | Passed for the isolated test scope | This is not hosted disaster-recovery proof |
| Runtime/database isolation | Passed locally | Normal 3010 now reports the approved source, `normal-owner` database identity and `profile-relationship-v1` schema |
| Guided onboarding | Passed locally | Validation, save/landing/reopen, discard navigation, narrow layout and 200% text pass; hosted/owner acceptance is not inferred |
| Large-data stale-response recovery | Passed locally | A delayed older 200-record response cannot repaint the newer report; 503/focus recovery and reload pass |
| Account access import/export | Passed locally | Canonical #109 fields, structured evidence, eligibility, award lineage and portable restore pass together in the authenticated browser |
| Global Search and Quick Actions | Passed locally | Search excludes archived Profiles, retains the newest response and supports keyboard/narrow use; restricted Profile actions preserve context and normal validation |

## Competitor review

| Provider | Evidence state | Limit |
| --- | --- | --- |
| Outplayed | Public calculator hands-on plus public documentation; all matrix cells reviewed | Member recording, recovery and full keyboard workflows remain inaccessible/unverified |
| MBB | Public calculator hands-on plus public documentation | Different penny placement and endpoints are recorded, not forced into parity |
| OddsMonkey | Authoritative public documentation; all matrix cells reviewed | Authenticated tracker/cash-correction interaction remains unavailable |

## Owner/manual acceptance

- VoiceOver spoken output — engineering semantics pass; actual speech observation pending.
- Hosted Google interaction — PASS: Will completed the genuine provider-owned flow and returned to
  Plum Duff. One short optional Preview loading/Account/saved-record check is now available.

## Remaining boundaries after local closure

- The CP-027 normal-owner baseline remains the rollback reference; CP-032 integrated the tested
  shared Preview fixes locally after clone/backup evidence without changing owner rows.
- Protected Vercel deployment, isolated Preview PostgreSQL, DB-aware readiness, bounded recovery,
  genuine hosted OAuth and supported hosted journeys are proven. The 1.30 MB/600-row payload remains
  explicit pagination/capacity debt rather than a current acceptance blocker.
- #96 credential rotation is owner/provider controlled.
- Remaining #111 historical placement-date/preset scope, Google bound-script runtime and other planned features are not local audit PASS
  claims and are not treated as hidden defects.
- Competitor member capabilities remain reviewed-but-unverified where public access is unavailable.

## CP-035 explicit ledger editing — 2026-09-23 20:06 BST

Protected Preview revision `75042e5` passes browser evidence for no write before Save, Keep editing,
Discard, explicit Save/reopen, Save and close, add/amend/clear and unchanged money/identity across
Sportsbook, Free Bet, Extra Place, Casino and Cash Adjustment. Focused API ownership, atomic invalid-
change and lifecycle regressions pass 141/141. Normal 3010 subsequently started as `normal-owner`
on source `093f18b+dirty`; its 42/175/538/291/90/58/123/305 owner counts, ledger hashes, integrity
and foreign keys match the verified pre-cutover backup. #117 remains open for owner acceptance;
Production is unchanged.

## CP-036 settled-editor stability — 2026-09-24 08:35 BST

The pre-fix regression observed seven preview requests from one short Notes edit. Revision `1435c5b`
removes Notes from Sportsbook and Free Bet calculation identity, keeps confirmed settled values
mounted and replaces the Sportsbook-only disclosure with shared editor-owned reveal behaviour. The
focused intermediate-state browser check, five-ledger Save/Discard matrix (desktop/light and
compact/dark), web 435/435, TypeScript, mypy and production build pass. The protected Preview and
normal 3010 both report `1435c5b`, their required roles and `account-access-v1`; normal owner counts
and complete ledger/history hashes match the verified pre-update backup. The retained authenticated
Preview test sessions have expired, so #117 remains open for that one post-deployment browser recheck.

## Detailed evidence

- [Platform quality audit](docs/audits/platform-quality-audit.md)
- [Calculator comparison evidence](docs/audits/issue-113-independent-calculator-verification-2026-09-10.md)
- [Canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md)
- [UI change register](docs/agent-contracts/plum-duff-ui-change-register.md)
- [Milestone and readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md)
- [GitHub #114](https://github.com/wolney8/OpenForge/issues/114)
