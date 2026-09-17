# Project Status — Plum Duff / OpenForge — Doc ID: PS-CODEX-001

**Last updated:** 2026-09-17 15:59 BST · **Status:** 🟡 At risk

## Right now

- **Working on:** Continue the remaining onboarding, Profile-lifecycle, notification-history and large-data complete journeys.
- **Next:** Advance #111 record drilldown, stale-response recovery and wider #114 evidence.
- **Blocked on:** none for independent local work; #109 access vocabulary, provider-only checks and hosted changes remain separate owner/external decisions

## Delivery state

| Area | Evidence state |
| --- | --- |
| Local integrated build | CP-017 closes fresh award lineage, Cash reconciliation and Casino fee journeys and repairs restored linked-award display |
| Normal `localhost:3010` | Healthy on `import-history-v1`, normal authentication and the migrated normal local database; final source pairing is verified below |
| Main / origin | Not updated by the local integration work |
| Vercel | Not deployed or hosted-verified |
| Owner smoke test | Optional short local check is available; not run and not a work blocker |

## Progress at a glance

These figures measure **#114 audit coverage**, not the percentage of the product finished.

| Review area | Current coverage |
| --- | ---: |
| Assessments reviewed | 63 / 87 (72%) |
| Complete tasks exercised and passing | 15 / 24 (63%) |
| Competitor comparisons | 18 / 27 (67%) |
| Requirements reconciled | 64 / 133 (48%) |

## Next 3 steps

1. Exercise guided onboarding and disposable Profile recover/delete journeys.
2. Continue #111 record drilldown and durable notification-event design/work.
3. Exercise larger-data delayed/stale-response recovery and remaining accessibility boundaries.

## Checkpoint log

| ID | Timestamp | What changed | Issue | Document |
| --- | --- | --- | --- | --- |
| CP-001 | 2026-09-16 10:18 BST | Consolidated project status and checkpoint workflow | [#114](https://github.com/wolney8/OpenForge/issues/114) | [Rule](AGENTS.md#project-status-checkpoint-rule) |
| CP-002 | 2026-09-16 10:34 BST | Added the concise owner status, audit register, roadmap and history archive | [#114](https://github.com/wolney8/OpenForge/issues/114) | [Changelog](CHANGELOG.md) |
| CP-003 | 2026-09-16 11:07 BST | Closed the local integration gate and completed browser portable-Profile recovery evidence | [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-local-integration-milestone--2026-09-16) |
| CP-004 | 2026-09-16 12:19 BST | Exercised full Profile import/recovery and populated ledgers; repaired import, Cash validation and shared dialog defects | [#12](https://github.com/wolney8/OpenForge/issues/12), [#91](https://github.com/wolney8/OpenForge/issues/91), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-004-import-populated-ledger-and-accessibility-package--2026-09-16) |
| CP-005 | 2026-09-16 12:52 BST | Reconciled Profile/combined reports, measured 200 records, repaired report header semantics and bounded lineage decisions | [#109](https://github.com/wolney8/OpenForge/issues/109), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-005-reporting-larger-data-and-evidence-boundary-package--2026-09-16) |
| CP-006 | 2026-09-16 14:02 BST | Proved report and notification-history boundaries, refreshed dependency exposure and restored worktree mypy execution | [#90](https://github.com/wolney8/OpenForge/issues/90), [#111](https://github.com/wolney8/OpenForge/issues/111), [#115](https://github.com/wolney8/OpenForge/issues/115) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-006-reporting-notification-and-securityreliability-package--2026-09-16) |
| CP-007 | 2026-09-16 14:10 BST | Added London date-and-time metadata rules for owner-facing documents | — | [Rule](AGENTS.md#project-document-timestamp-rule) |
| CP-008 | 2026-09-16 14:27 BST | Extended precise London timestamps to project logs and backfilled verified recent events | — | [Rule](AGENTS.md#project-document-timestamp-rule) |
| CP-009 | 2026-09-16 14:54 BST | Assessed settings/session recovery, reduced integrated-path mypy debt and completed two schema decisions without migrating data | [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-009-accessibility-persistence-and-recovery-package--2026-09-16) |
| CP-010 | 2026-09-16 15:22 BST | Cleared bounded typing/web debt, repaired local database-health recovery and finalised two unimplemented schema decisions | [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-010-engineering-debt-recovery-and-schema-decision-package--2026-09-16) |
| CP-011 | 2026-09-16 15:37 BST | Made two schema decisions owner-readable and proved remaining ledger-history/reporting boundaries | [#12](https://github.com/wolney8/OpenForge/issues/12), [#80](https://github.com/wolney8/OpenForge/issues/80), [#111](https://github.com/wolney8/OpenForge/issues/111), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Decision record](docs/planning/openforge-profile-decisions-to-confirm.md#cp-011-owner-schema-decisions) |
| CP-012 | 2026-09-16 21:04 BST | Implemented and tested Profile-scoped import identity and append-only financial history on an isolated candidate | [#12](https://github.com/wolney8/OpenForge/issues/12), [#80](https://github.com/wolney8/OpenForge/issues/80), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-012-isolated-identity-and-financial-history-implementation--2026-09-16) |
| CP-013 | 2026-09-17 08:15 BST | Added fail-closed runtime/database ownership, removed four private-seed fixture gaps and re-proved the isolated migration candidate | [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-013-runtime-isolation-safety-gate--2026-09-17) |
| CP-014 | 2026-09-17 12:20 BST | Migrated the normal local database and cut 3010 over to Profile-scoped identity and append-only financial history | [#12](https://github.com/wolney8/OpenForge/issues/12), [#80](https://github.com/wolney8/OpenForge/issues/80), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-014-normal-local-migration-and-cutover--2026-09-17) |
| CP-015 | 2026-09-17 13:33 BST | Added readable ledger History, imported-parent review, chart-point inspection and supported security patches | [#36](https://github.com/wolney8/OpenForge/issues/36), [#111](https://github.com/wolney8/OpenForge/issues/111), [#115](https://github.com/wolney8/OpenForge/issues/115) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-015-user-usable-history-lineage-and-reporting-slice--2026-09-17) |
| CP-016 | 2026-09-17 14:46 BST | Closed two complete journeys, corrected Void history and separated active from archived reporting defaults | [#88](https://github.com/wolney8/OpenForge/issues/88), [#111](https://github.com/wolney8/OpenForge/issues/111), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-016-complete-journey-and-archive-reporting-package--2026-09-17) |
| CP-017 | 2026-09-17 15:59 BST | Closed fresh award lineage, Cash reconciliation and Casino fee journeys and repaired four bounded safety/portability defects | [#49](https://github.com/wolney8/OpenForge/issues/49), [#80](https://github.com/wolney8/OpenForge/issues/80), [#91](https://github.com/wolney8/OpenForge/issues/91), [#109](https://github.com/wolney8/OpenForge/issues/109), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-017-award-cash-reconciliation-and-casino-fee-package--2026-09-17-1559-bst) |

## Reference index

- [Changelog](CHANGELOG.md)
- [Audit register](AUDIT_REGISTER.md)
- [Project roadmap](PROJECT_ROADMAP.md)
- [Engineering learning](ENGINEERING_LEARNING.md)
- [Historical status archive](docs/history/project-status-history.md)
- [Detailed platform audit](docs/audits/platform-quality-audit.md)
- [Canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md)
- [Milestone and readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md)
- [Architecture](docs/planning/openforge-phase-2-profile-scoped-architecture-draft.md) · [workflow contracts](docs/workflows/) · [calculation contracts](docs/calculation-contracts/)
- [Fixture specifications](docs/fixture-specs/README.md) · [executable fixtures](tests/fixtures/README.md)
- [Application walkthrough](README.md#how-it-works)
- [GitHub Issues](https://github.com/wolney8/OpenForge/issues) · [GitHub Milestones](https://github.com/wolney8/OpenForge/milestones)
