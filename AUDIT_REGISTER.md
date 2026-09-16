# Audit Register — Plum Duff / OpenForge — Doc ID: AR-CODEX-001

This is the owner-facing index for audit evidence. The
[platform quality audit](docs/audits/platform-quality-audit.md) remains the detailed authority.

## Audit progress

These are coverage measures, not percentages of the product finished.

| Area | Covered | Method note |
| --- | ---: | --- |
| Assessments reviewed | 46 / 87 (53%) | A documented defect can complete an assessment |
| Complete tasks exercised | 8 / 24 (33%) | All required steps must be exercised |
| Complete tasks passing | 8 / 24 (33%) | Blocked or partial tasks are excluded |
| Competitor comparisons | 15 / 27 (56%) | 12 documented, 3 hands-on |
| Requirements reconciled | 24 / 133 (18%) | Original scope and clarifications both required |

## Current high-priority findings

| ID | Plain-English problem | State | Repair / integration state | Issue |
| --- | --- | --- | --- | --- |
| PD-QA-006 | Some broad browser tests still depend on missing synthetic Accounts | Open | Two fixture gaps remain in the local engineering gate | [#113](https://github.com/wolney8/OpenForge/issues/113), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-016 | Users cannot see a complete chronological row-change history | Open | Source notes exist; the full history view is not implemented | [#36](https://github.com/wolney8/OpenForge/issues/36), [#114](https://github.com/wolney8/OpenForge/issues/114) |
| PD-QA-018 | Imported child records do not always resolve their native parent | Open | Identity is retained; safe parent resolution remains missing | [#12](https://github.com/wolney8/OpenForge/issues/12), [#80](https://github.com/wolney8/OpenForge/issues/80) |
| C05 | Changed-odds and multiple-fill remaining hedges are not fully represented | Open | Same-odds core handling is integrated; richer operational handling is pending | [#35](https://github.com/wolney8/OpenForge/issues/35) |
| PD-QA-001 | Dependency advisory exposure is not fully dispositioned | Open / exposure unverified | Keep separate from feature work; no hosted clearance inferred | [#115](https://github.com/wolney8/OpenForge/issues/115) |
| #96 | Provider credentials still require owner/provider rotation | Owner action pending | No secret values are recorded in the audit | [#96](https://github.com/wolney8/OpenForge/issues/96) |

## Complete workflow status

| Workflow | State | Main gap |
| --- | --- | --- |
| Account correction to truthful cash total | Passed locally | Main/origin and hosted builds are unchanged |
| Native Normal/SNR planning to settlement/report | Passed locally | Fresh authenticated conversion tail still needs rerunning |
| Native Sportsbook save, placement, correction and report | Passed locally | Full row-change history remains absent |
| Generated Free Bet awards | Partial | Transaction integrity is repaired; complete visible lineage/history remains open |
| Profit Boost and conditional Cashback | Passed for the approved local scope | Split award-group receipt linkage remains limited |
| Multi-Lay create, save and reopen | Partial | Richer reward modes and per-leg actual placement are not complete |
| Blackjack session to one Casino activity | Passed locally | Hosted and owner acceptance are not claimed |
| Workbook import and portable restore | Partial | Full multi-ledger browser recovery and imported-parent resolution remain |
| Local PostgreSQL transaction, backup and restore | Passed for the isolated test scope | This is not hosted disaster-recovery proof |

## Competitor review

| Provider | Evidence state | Limit |
| --- | --- | --- |
| Outplayed | Public calculator hands-on plus public documentation | Member recording and recovery remain inaccessible/unverified |
| MBB | Public calculator hands-on plus public documentation | Different penny placement and endpoints are recorded, not forced into parity |
| OddsMonkey | Public documentation only | Authenticated tracker interaction remains unavailable |

## Outstanding audit areas

- Remaining populated ledgers, reports and cross-Profile recovery.
- Full workbook import, source relationships and browser restore.
- Screen-reader testing, larger datasets, 200% text combinations and performance.
- Security exposure, credential rotation and Vercel publication prerequisites.
- Competitor member workflows and the unreconciled request backlog.

## Detailed evidence

- [Platform quality audit](docs/audits/platform-quality-audit.md)
- [Calculator comparison evidence](docs/audits/issue-113-independent-calculator-verification-2026-09-10.md)
- [Canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md)
- [UI change register](docs/agent-contracts/plum-duff-ui-change-register.md)
- [Milestone and readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md)
- [GitHub #114](https://github.com/wolney8/OpenForge/issues/114)
