# Audit Register — Plum Duff / OpenForge — Doc ID: AR-CODEX-001

**Last updated:** 2026-09-17 08:15 BST

This is the owner-facing index for audit evidence. The
[platform quality audit](docs/audits/platform-quality-audit.md) remains the detailed authority.

## Audit progress

These are coverage measures, not percentages of the product finished.

| Area | Covered | Method note |
| --- | ---: | --- |
| Assessments reviewed | 60 / 87 (69%) | A documented defect can complete an assessment |
| Complete tasks exercised | 10 / 24 (42%) | All required steps must be exercised |
| Complete tasks passing | 10 / 24 (42%) | Blocked or partial tasks are excluded |
| Competitor comparisons | 15 / 27 (56%) | 12 documented, 3 hands-on |
| Requirements reconciled | 45 / 133 (34%) | Original scope and clarifications both required |

## Current high-priority findings

| ID | Plain-English problem | State | Repair / integration state | Issue |
| --- | --- | --- | --- | --- |
| PD-QA-022 | A disposable candidate could be pointed at the normal owner database | Repaired on isolated candidate | Source-rooted configuration, explicit runtime roles and connection-level ownership checks now fail closed; the CP-012 near-miss left no lasting data change | [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-006 | Some older broad tests still depend on private seed names/data | Repaired for the CP-012/013 gate | The four remaining Account/catalogue setup failures now use committed synthetic factories; the 344-case financial regression selection passes |
| PD-QA-016 | Users cannot see a complete chronological row-change history | Open | Source notes exist; the full history view is not implemented | [#36](https://github.com/wolney8/OpenForge/issues/36), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-018 | Imported child records do not always resolve their native parent | Repaired on isolated candidate; normal migration pending | Stable logical identities, explicit resolution and portable remapping pass SQLite/PostgreSQL/clone tests; 3010 remains on CP-011 | [#12](https://github.com/wolney8/OpenForge/issues/12), [#80](https://github.com/wolney8/OpenForge/issues/80) |
| PD-QA-021 | Deleting some ledger rows also removes their audit history | Repaired on isolated candidate; normal migration pending | Append-only history covers five ledgers, reports ignore evidence rows and financial deletion is denied; full history UI remains PD-QA-016 | [#80](https://github.com/wolney8/OpenForge/issues/80), [#90](https://github.com/wolney8/OpenForge/issues/90), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-011 | Notification History loses the earlier event when its live source changes | Open; migration decision required | Clear/reload is reliable; durable event history is proposed, not implemented | [#90](https://github.com/wolney8/OpenForge/issues/90), [#99](https://github.com/wolney8/OpenForge/issues/99) |
| #111 | The financial chart cannot be inspected or drilled into | Open feature gap | Totals, ranges, breakdowns and text summary pass; point interaction/filter/drilldown remain planned | [#111](https://github.com/wolney8/OpenForge/issues/111) |
| C05 | Changed-odds and multiple-fill remaining hedges are not fully represented | Open | Same-odds core handling is integrated; richer operational handling is pending | [#35](https://github.com/wolney8/OpenForge/issues/35) |
| PD-QA-001 | Affected Next/sharp versions serve the local image optimiser | Open / local route reachable; hosted exposure unverified | Exact supported minima recorded; no upgrade or hosted clearance inferred | [#115](https://github.com/wolney8/OpenForge/issues/115) |
| #96 | Provider credentials still require owner/provider rotation | Owner action pending | No secret values are recorded in the audit | [#96](https://github.com/wolney8/OpenForge/issues/96) |
| PQA-U08 | Actual screen-reader behaviour has not been verified | Open / UNVERIFIED | VoiceOver exists locally, but spoken-output evidence could not be captured reliably; automation is not substituted | [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PQA-M07 | Static analysis and ordinary focused suites must remain clean | Passed for current scoped source | Mypy 0/78 files; relevant API 147/147 and web 420/420 | [#114](https://github.com/wolney8/OpenForge/issues/114) |

## Complete workflow status

| Workflow | State | Main gap |
| --- | --- | --- |
| Account correction to truthful cash total | Passed locally | Main/origin and hosted builds are unchanged |
| Native and converted Normal/SNR planning to settlement/report | Passed locally | Main/origin and hosted builds are unchanged |
| Native Sportsbook save, placement, correction and report | Passed locally | Full row-change history remains absent |
| Generated Free Bet awards | Partial | Transaction integrity is repaired; complete visible lineage/history remains open |
| Profit Boost and conditional Cashback | Passed on the integrated local application | Split award-group receipt linkage remains limited |
| Multi-Lay create, save and reopen | Partial | Richer reward modes and per-leg actual placement are not complete |
| Blackjack session to one Casino activity | Passed locally | Hosted and owner acceptance are not claimed |
| Portable Profile restore, report, re-export and cleanup | Passed locally | Hosted recovery is not inferred |
| Full Profile workbook import and recovery | Partial | Six-sheet browser import/recovery passes; isolated candidate repairs PD-QA-018, but normal integration/browser rerun and #109 access vocabulary remain |
| Extra Place actual placement and correction | Partial | Financial create/settle/Void/report and candidate history protection pass; normal integration remains |
| Cash Adjustment correction and reporting | Partial | Valid/invalid writes, correction/report and candidate append-only history pass; Account reconciliation remains |
| Native Casino activity | Partial | Actual/settle/correct/report and candidate history protection pass; fee allocation remains |
| Profile and combined financial reporting | Partial | Arithmetic/range/breakdowns pass; point inspection, drilldown and module filter remain absent |
| Notification clear and history | Partial | Clear/reload and safe source denial pass; prior event disappears when source state changes |
| Settings and session recovery | Partial | Ownership/defaults, mutation rollback, inactivity and stale-session paths pass; frontend/API restart and unavailable-database recovery now pass, while genuine VoiceOver remains unverified |
| Realistic 200-record Profile | Partial | Navigation, pagination, filter and search pass; chart/stale stress and hosted capacity remain |
| SQLite backup restore and reopen | Passed for the isolated local copy | Operational/hosted disaster recovery remains separate |
| Local PostgreSQL transaction, backup and restore | Passed for the isolated test scope | This is not hosted disaster-recovery proof |
| Runtime/database isolation | Passed on the CP-013 candidate | Normal 3010 remains deliberately on the prior unmigrated API until separately approved |

## Competitor review

| Provider | Evidence state | Limit |
| --- | --- | --- |
| Outplayed | Public calculator hands-on plus public documentation | Member recording and recovery remain inaccessible/unverified |
| MBB | Public calculator hands-on plus public documentation | Different penny placement and endpoints are recorded, not forced into parity |
| OddsMonkey | Public documentation only | Authenticated tracker interaction remains unavailable |

## Outstanding audit areas

- Normal integration and browser evidence for the isolated import-identity/history repair; complete
  change-history presentation remains PD-QA-016.
- Account reconciliation, interactive report drilldown, #109 access vocabulary and Google
  bound-script runtime.
- Actual screen-reader testing, larger-than-200 datasets, chart interaction and hosted performance.
- Central log retention/redaction policy, dependency exposure, credential rotation and Vercel
  publication prerequisites. Runtime diagnostics themselves now expose only safe identities/fingerprints.
- Competitor member workflows and the unreconciled request backlog.

## Detailed evidence

- [Platform quality audit](docs/audits/platform-quality-audit.md)
- [Calculator comparison evidence](docs/audits/issue-113-independent-calculator-verification-2026-09-10.md)
- [Canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md)
- [UI change register](docs/agent-contracts/plum-duff-ui-change-register.md)
- [Milestone and readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md)
- [GitHub #114](https://github.com/wolney8/OpenForge/issues/114)
