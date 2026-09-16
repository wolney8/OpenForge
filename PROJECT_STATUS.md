# Project Status — Plum Duff / OpenForge — Doc ID: PS-CODEX-001

**Last updated:** 2026-09-16 21:04 BST · **Status:** 🟡 At risk

## Right now

- **Working on:** Hold the tested CP-012 import-identity and financial-history candidate outside the normal database while continuing independent #114 evidence.
- **Next:** Repair remaining synthetic ledger fixtures, then rerun the complete browser import/history gate if normal-local migration is separately approved.
- **Blocked on:** only normal-local schema migration requires separate owner approval; independent audit work is not blocked

## Delivery state

| Area | Evidence state |
| --- | --- |
| Local integrated build | CP-012 candidate implements scoped import identity and append-only history; SQLite, PostgreSQL and cloned-normal migration pass |
| Normal `localhost:3010` | Healthy on the prior CP-011 API with normal sign-in and unchanged normal data; CP-012 schema is not applied |
| Main / origin | Not updated by the local integration work |
| Vercel | Not deployed or hosted-verified |
| Owner smoke test | Available when convenient; not run and not a work blocker |

## Progress at a glance

These figures measure **#114 audit coverage**, not the percentage of the product finished.

| Review area | Current coverage |
| --- | ---: |
| Assessments reviewed | 59 / 87 (68%) |
| Complete tasks exercised and passing | 10 / 24 (42%) |
| Competitor comparisons | 15 / 27 (56%) |
| Requirements reconciled | 45 / 133 (34%) |

## Next 3 steps

1. Remove the remaining private-seed assumptions from selected ledger regression fixtures.
2. Continue reporting, recovery, accessibility and requirement evidence on the verified normal build.
3. If separately approved, back up and migrate the normal local database, then run the browser integration gate.

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
