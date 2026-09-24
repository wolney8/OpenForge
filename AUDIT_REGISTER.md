# Audit Register — Plum Duff / OpenForge — Doc ID: AR-CODEX-001

**Last updated:** 2026-09-24 11:08 BST

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

## Current high-priority findings

| ID | Plain-English problem | State | Repair / integration state | Issue |
| --- | --- | --- | --- | --- |
| PD-FIX-278–280 / CP-038 | Reports lacked the approved period-P&L view; compact Report/help geometry and header copy drifted | Implemented / Preview proven / locally integrated | Weekly points, records and totals share formal-report semantics; scope/period/point survive return. Web 445/445 and affected browser 3/3 in both isolated SQLite and protected Preview. Local health/data/login checks pass; direct authenticated normal-owner browser recheck was not authorised. [Evidence](docs/audits/platform-quality-audit.md#cp-038-period-pnl-preset-and-shared-report-geometry--2026-09-24-1108-bst) | [#111](https://github.com/wolney8/OpenForge/issues/111), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| PD-FIX-276–277 / CP-037 | Chart hover did not inspect a point; cash funding leaked into betting-P&L chart/drilldown | Repaired / Preview and local verified | Shared pointer inspection and existing headline scope now agree; £2/£3 betting gives £2 then £5 irrespective of separate cash top-ups. Web 437/437, types, build and final affected hosted checks 2/2 pass on `86ee412`. [Evidence](docs/audits/platform-quality-audit.md#cp-037-issue-led-settled-editor-and-chart-verification--2026-09-24-1000-bst) | [#111](https://github.com/wolney8/OpenForge/issues/111) |
| PD-FIX-274–275 / CP-036–037 | Notes typing invalidated settled previews, while Advanced Controls opened below the useful editor viewport | Repaired / authenticated Preview recheck complete | Renewed the existing synthetic session normally; final hosted type/pause, zero automatic writes/recalculations, reveal, Discard and explicit Save/reopen pass on `86ee412`. Normal runtime is healthy and owner hashes unchanged. Owner Save/Discard acceptance remains separate from this visual engineering proof | [#117](https://github.com/wolney8/OpenForge/issues/117), [#92](https://github.com/wolney8/OpenForge/issues/92) |
| PD-FIX-271–272 / CP-034 | Existing Notes edits revalidated historical Accounts/new-entry completeness; Cash note clearing was also misclassified as a financial correction; cold Preview functions could rerun schema setup | Repaired / Preview and localhost verified | Five ledger editors pass browser add/amend/clear with stable identity and unchanged money; Cash description-only events are `edited` while monetary changes remain `corrected`; current PostgreSQL schemas retain the read-only migration-marker check. Preview and normal 3010 serve `a52ee88`; owner ledger hashes/counts are unchanged | [#117](https://github.com/wolney8/OpenForge/issues/117), [#91](https://github.com/wolney8/OpenForge/issues/91), [#36](https://github.com/wolney8/OpenForge/issues/36), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-FIX-269–270 / CP-032 | Small hosted reads repeatedly opened PostgreSQL connections and Preview functions ran across the Atlantic from their database | Repaired / Preview and localhost verified | Request-scoped connection reuse plus `lhr1` Preview functions reduced warm medians to 0.67s summary, 0.42s eligibility and 0.40s for 600 Sportsbook rows. Shared fixes through `712d174` now run on normal 3010; every owner row projection is unchanged | [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) |
| PD-FIX-267–268 / CP-031 | Hosted Free Bet lineage and Account eligibility performed repeated work across archived Profiles/rows | Repaired / verified on protected Preview | Batched Profile-scoped lineage reads reduced the populated summary from 70.78s to 5.81s; active-owner eligibility now reads 3 active Profiles rather than 83 total and returns in 11.88s. Supported hosted journeys, responsive/access/recovery and diagnostics pass on `659d0ea`; richer Multi-Lay placement/reward modes and the 600-row payload remain named future boundaries | [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) |
| PD-FIX-266 / CP-030 | Populated Reports could hit React error 185 when reduced-motion preference changed | Repaired / verified on protected Preview | One shared motion subscription replaces hundreds of per-value listeners. Revision `b9e58e7` passed the direct hosted Reports and £6→£5 proof; CP-031 retained that result on final Preview source | [#114](https://github.com/wolney8/OpenForge/issues/114) |
| CP-029-R evidence recovery | The CP-029 delivery did not make the retained run/failure boundary sufficiently explicit | Recovered / Preview still not ready | HEAD `5d190cb`; deployed app `d35eed7`; one hosted Playwright result is retained as failed, with three rendered screenshots. The 22 hosted mutation journeys, fresh financial mutation proof and fresh DB-outage recovery were not completed in CP-029 | [#62](https://github.com/wolney8/OpenForge/issues/62), [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) |
| CP-029 hosted gate | Hosted authentication passed, but authenticated SSR initially lost its protected request context and Reports now exposes a client render loop | Preview not ready | Revision `d35eed7` forwards trusted cookie/protection context and uses the explicit stable Preview API base. Core authenticated routes now render, but Reports emits React error 185; a four-worker stress run also produced five 300-second 504s although the serial journey remained practical | [#62](https://github.com/wolney8/OpenForge/issues/62), [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) |
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
| #111 | Report exploration still lacks later analytics controls | Bounded point, drilldown and weekly period-P&L slices delivered | CP-038 adds the reconciled period-P&L preset; general metric/granularity/explorer-preset semantics remain future design, not delivered by this slice | [#111](https://github.com/wolney8/OpenForge/issues/111) |
| C05 | Changed-odds and multiple-fill remaining hedges are not fully represented | Open | Same-odds core handling is integrated; richer operational handling is pending | [#35](https://github.com/wolney8/OpenForge/issues/35) |
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
| Multi-Lay create, save and reopen | Partial | Richer reward modes and per-leg actual placement are not complete |
| Blackjack session to one Casino activity | Passed locally | Hosted and owner acceptance are not claimed |
| Portable Profile restore, report, re-export and cleanup | Passed locally | Hosted recovery is not inferred |
| Full Profile workbook import and recovery | Passed locally | Authenticated six-sheet #109 import, award lineage/retry, £7.18 settlement/report, export and portable restore/native-ID remap pass |
| Extra Place actual placement and correction | Passed locally | Native actual lays, settlement, Void, readable immutable History, report and reload pass; hosted/owner acceptance is not inferred |
| Cash Adjustment correction and reporting | Passed locally | Linked Account remains an observation while +25→+20 and −7 cash movements report net +13 once; retry/History/validation pass |
| Native Casino activity | Passed locally | £7 gross less current governed costs reports £6 then corrected £5 once; History and malformed-money rejection pass |
| Converted Free Bet SNR and retained legacy SR | Passed locally | Conversion, copied reference, distinct actual placement, settlement, readable History, report and reload pass |
| Profile and combined financial reporting | Passed for canonical journey | Active-only defaults, deliberate archived inclusion, arithmetic/range/breakdowns, point inspection and reconciled-record drilldown pass; later module/metric controls are separate roadmap work |
| Notification clear and history | Passed locally | Current alert, dismissal and durable historical event remain distinct; retry and viewer isolation pass |
| Profile lifecycle and recovery | Passed locally | Create, archive, active-navigation exclusion, historical-report retention, recover and empty-Profile deletion boundaries pass |
| Settings and session recovery | Passed locally | CP-025 re-proves initiation, state, callback, failure and session persistence; CP-027 records Will's successful genuine Google return. VoiceOver remains a separate journey |
| Realistic 200-record Profile | Passed locally | Navigation, pagination, filter/search, chart and delayed-response recovery pass; hosted capacity remains separate |
| SQLite backup restore and reopen | Passed for the isolated local copy | Operational/hosted disaster recovery remains separate |
| Local PostgreSQL transaction, backup and restore | Passed for the isolated test scope | This is not hosted disaster-recovery proof |
| Runtime/database isolation | Passed locally | Normal 3010 now reports the approved source, `normal-owner` database identity and `import-history-v1` schema |
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
- Later #111 controls, Google bound-script runtime and other planned features are not local audit PASS
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
