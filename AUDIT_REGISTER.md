# Audit Register — Plum Duff / OpenForge — Doc ID: AR-CODEX-001

**Last updated:** 2026-09-18 09:15 BST

This is the owner-facing index for audit evidence. The
[platform quality audit](docs/audits/platform-quality-audit.md) remains the detailed authority.

## Audit progress

These are coverage measures, not percentages of the product finished.

| Area | Covered | Method note |
| --- | ---: | --- |
| Assessments reviewed | 65 / 87 (75%) | A documented defect can complete an assessment |
| Complete tasks exercised | 17 / 24 (71%) | All required steps must be exercised |
| Complete tasks passing | 17 / 24 (71%) | Blocked or partial tasks are excluded |
| Competitor comparisons | 18 / 27 (67%) | Confirmed and reviewed-unverified states stay distinct |
| Requirements reconciled | 69 / 133 (52%) | Original scope and clarifications both required |

## Current high-priority findings

| ID | Plain-English problem | State | Repair / integration state | Issue |
| --- | --- | --- | --- | --- |
| PD-QA-022 | A disposable candidate could be pointed at the normal owner database | Repaired on isolated candidate | Source-rooted configuration, explicit runtime roles and connection-level ownership checks now fail closed; the CP-012 near-miss left no lasting data change | [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-006 | Some broad tests still carry stale fixture/contract assumptions | Improved substantially; 21 failures remain | Explicit committed catalogue/tracker seeds and fresh per-test databases removed 122 failures; 1,044 pass and all 1,077 outcomes are classified |
| PD-QA-016 | Users could not see governed chronological row-change history | Integrated locally / browser-proven slice | One shared plain-English History panel is wired into five financial ledger editors; full notification history remains separate | [#36](https://github.com/wolney8/OpenForge/issues/36), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-018 | Imported child records did not always resolve their native parent | Integrated locally / engineering gate passed | Normal 3010 uses Profile + logical namespace + external ID; retry, collision, explicit re-resolution and portable remapping pass | [#12](https://github.com/wolney8/OpenForge/issues/12), [#80](https://github.com/wolney8/OpenForge/issues/80) |
| PD-QA-021 | Deleting some ledger rows also removed their audit history | Integrated locally / engineering gate passed | Normal 3010 records append-only evidence across five ledgers; reports ignore evidence rows and protected financial deletion is denied; full history UI remains PD-QA-016 | [#80](https://github.com/wolney8/OpenForge/issues/80), [#90](https://github.com/wolney8/OpenForge/issues/90), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-011 | Notification History lost an earlier event when its live source changed | Integrated locally / focused lifecycle passed | A bounded Profile/user-scoped immutable event store retains readable history; current alert and dismissal state remain separate | [#90](https://github.com/wolney8/OpenForge/issues/90), [#99](https://github.com/wolney8/OpenForge/issues/99) |
| #111 | Report chart exploration is incomplete | Partial / first slice integrated and browser-proven | Selected-range points have visible keyboard focus, pointer/keyboard inspection, date/value accessible names and empty-state coverage; record drilldown, module filter and governed metric/granularity controls remain | [#111](https://github.com/wolney8/OpenForge/issues/111) |
| C05 | Changed-odds and multiple-fill remaining hedges are not fully represented | Open | Same-odds core handling is integrated; richer operational handling is pending | [#35](https://github.com/wolney8/OpenForge/issues/35) |
| PD-QA-001 | Dependency advisories affected reachable or development paths | Production remediated locally; five development-only findings accepted pending upstream | Next 16.3.3, sharp 0.35.4 and Vitest 4.1.11 leave zero production advisories; remaining brace-expansion/js-yaml paths are confined to ESLint tooling and forced overrides are not justified | [#115](https://github.com/wolney8/OpenForge/issues/115) |
| #96 | Provider credentials still require owner/provider rotation | Owner action pending | No secret values are recorded in the audit | [#96](https://github.com/wolney8/OpenForge/issues/96) |
| PQA-U08 | Actual screen-reader behaviour has not been verified | Open / UNVERIFIED | VoiceOver exists locally, but spoken-output evidence could not be captured reliably; automation is not substituted | [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PQA-M07 | Static analysis and ordinary focused suites must remain clean | Passed for current scoped source | Mypy 0/78 files; relevant API 147/147 and web 420/420 | [#114](https://github.com/wolney8/OpenForge/issues/114) |

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
| Full Profile workbook import and recovery | Partial | Identity states and explicit same-Profile review are visible; #109 access vocabulary and a fresh combined award journey remain |
| Extra Place actual placement and correction | Passed locally | Native actual lays, settlement, Void, readable immutable History, report and reload pass; hosted/owner acceptance is not inferred |
| Cash Adjustment correction and reporting | Passed locally | Linked Account remains an observation while +25→+20 and −7 cash movements report net +13 once; retry/History/validation pass |
| Native Casino activity | Passed locally | £7 gross less current governed costs reports £6 then corrected £5 once; History and malformed-money rejection pass |
| Converted Free Bet SNR and retained legacy SR | Passed locally | Conversion, copied reference, distinct actual placement, settlement, readable History, report and reload pass |
| Profile and combined financial reporting | Partial | Active-only defaults, deliberate archived inclusion, arithmetic/range/breakdowns and point inspection pass; record drilldown and module/metric controls remain absent |
| Notification clear and history | Passed locally | Current alert, dismissal and durable historical event remain distinct; retry and viewer isolation pass |
| Profile lifecycle and recovery | Passed locally | Create, archive, active-navigation exclusion, historical-report retention, recover and empty-Profile deletion boundaries pass |
| Settings and session recovery | Partial | Ownership/defaults, mutation rollback, inactivity and stale-session paths pass; frontend/API restart and unavailable-database recovery now pass, while genuine VoiceOver remains unverified |
| Realistic 200-record Profile | Partial | Navigation, pagination, filter and search pass; chart/stale stress and hosted capacity remain |
| SQLite backup restore and reopen | Passed for the isolated local copy | Operational/hosted disaster recovery remains separate |
| Local PostgreSQL transaction, backup and restore | Passed for the isolated test scope | This is not hosted disaster-recovery proof |
| Runtime/database isolation | Passed locally | Normal 3010 now reports the approved source, `normal-owner` database identity and `import-history-v1` schema |

## Competitor review

| Provider | Evidence state | Limit |
| --- | --- | --- |
| Outplayed | Public calculator hands-on plus public documentation | Member recording and recovery remain inaccessible/unverified |
| MBB | Public calculator hands-on plus public documentation | Different penny placement and endpoints are recorded, not forced into parity |
| OddsMonkey | Public documentation only | Authenticated tracker interaction remains unavailable |

## Outstanding audit areas

- Complete guided onboarding, import and large-data journeys; Profile lifecycle and durable
  notifications are now closed locally alongside award, Cash reconciliation and Casino fees.
- Interactive report drilldown, #109 access vocabulary and Google
  bound-script runtime.
- Actual screen-reader testing, larger-than-200 datasets, delayed/stale chart recovery and hosted performance.
- Central log retention/redaction policy, remaining development-only dependency advisories,
  credential rotation and Vercel publication prerequisites.
- Competitor member workflows and the unreconciled request backlog.

## Detailed evidence

- [Platform quality audit](docs/audits/platform-quality-audit.md)
- [Calculator comparison evidence](docs/audits/issue-113-independent-calculator-verification-2026-09-10.md)
- [Canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md)
- [UI change register](docs/agent-contracts/plum-duff-ui-change-register.md)
- [Milestone and readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md)
- [GitHub #114](https://github.com/wolney8/OpenForge/issues/114)
