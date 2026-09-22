# Project Status — Plum Duff / OpenForge — Doc ID: PS-CODEX-001

**Last updated:** 2026-09-22 16:33 BST · **Status:** 🟢 Hosted performance gate passed; tested shared fixes integrated into normal localhost

## Right now

- **Working on:** CP-032 completed the bounded hosted performance repair and reconciled the tested shared source into normal `localhost:3010`.
- **Next:** retain the verified Preview for a short owner loading/Account/saved-record check or authorise teardown; Production remains a separate decision.
- **Blocked on:** no engineering blocker inside the supported Preview scope; VoiceOver spoken output remains separate manual evidence.

## Delivery state

| Area | Evidence state |
| --- | --- |
| Local integrated build | Shared CP-029–CP-032 application repairs now run locally on application revision `712d174`; the CP-027 baseline remains the rollback reference |
| Normal `localhost:3010` | Healthy as `normal-owner` on canonical SQLite and `account-access-v1`; all owner row projections and counts match the pre-update backup |
| Main / origin | Not updated by the local integration work |
| Vercel | Protected Preview is verified within the supported scope at `plum-duff-cp028-preview-homelab11.vercel.app` on revision `712d174`; Production alias/data remain untouched |
| Owner smoke test | Hosted Google PASS is recorded; optional Preview visual acceptance and VoiceOver spoken output remain separate |

## Progress at a glance

These figures measure **#114 audit coverage**, not the percentage of the product finished.

| Review area | Current coverage |
| --- | ---: |
| Assessments reviewed | 87 / 87 (100%) |
| Complete tasks exercised and passing | 23 / 24 (96%) |
| Competitor comparisons | 27 / 27 (100%) |
| Requirements reconciled | 133 / 133 (100%) |

## Next 3 steps

1. Preserve the CP-027 rollback reference and the new CP-032 verified local baseline.
2. Offer one short Preview check covering loading, Account selection and a saved synthetic record.
3. Accept or tear down the Preview before any separately authorised Production decision.

## Checkpoint log

| ID | Timestamp | What changed | Issue | Document |
| --- | --- | --- | --- | --- |
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
| CP-018 | 2026-09-18 09:15 BST | Added durable notification history, deterministic API fixtures and complete Profile lifecycle evidence; reduced broad API failures from 143 to 21 | [#90](https://github.com/wolney8/OpenForge/issues/90), [#99](https://github.com/wolney8/OpenForge/issues/99), [#109](https://github.com/wolney8/OpenForge/issues/109), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-018-reproducibility-profile-lifecycle-and-notification-history--2026-09-18-0915-bst) |
| CP-019 | 2026-09-18 11:20 BST | Integrated #109 Account access, cleared broad API failures and closed onboarding, report-drilldown and stale-response journeys | [#109](https://github.com/wolney8/OpenForge/issues/109), [#111](https://github.com/wolney8/OpenForge/issues/111), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-019-account-access-test-hermeticity-and-journey-closure--2026-09-18-1120-bst) |
| CP-020 | 2026-09-18 12:56 BST | Closed combined Account/award and Search/Quick Action journeys and bounded Google/VoiceOver evidence truthfully | [#62](https://github.com/wolney8/OpenForge/issues/62), [#76](https://github.com/wolney8/OpenForge/issues/76), [#77](https://github.com/wolney8/OpenForge/issues/77), [#109](https://github.com/wolney8/OpenForge/issues/109), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-020-combined-accessaward-search-and-external-boundary-closure--2026-09-18-1256-bst) |
| CP-021 | 2026-09-18 13:10 BST | Closed all local audit, competitor and requirement review coverage and defined the protected hosted Preview gate | [#111](https://github.com/wolney8/OpenForge/issues/111), [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-021-local-audit-closure-and-pre-hosted-readiness--2026-09-18-1310-bst) |
| CP-022 | 2026-09-18 14:48 BST | Restored practical owner performance, corrected cash-warning severity and governed synthetic Profile residue | [#116](https://github.com/wolney8/OpenForge/issues/116), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-022-owner-stability-and-data-health-gate--2026-09-18-1448-bst) |
| CP-023 | 2026-09-18 15:48 BST | Repaired the session shell and duplicate UI identity, then simplified Multi-Lay without changing its calculation engine | [#116](https://github.com/wolney8/OpenForge/issues/116), [#35](https://github.com/wolney8/OpenForge/issues/35), [#92](https://github.com/wolney8/OpenForge/issues/92) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-023-owner-smoke-session-identity-and-multi-lay-corrections--2026-09-18-1548-bst) |
| CP-024 | 2026-09-19 06:48 BST | Unified Multi-Lay table shells, corrected effective-odds presentation and applied canonical financial meaning to compact results | [#35](https://github.com/wolney8/OpenForge/issues/35), [#92](https://github.com/wolney8/OpenForge/issues/92) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-024-multi-lay-visual-consistency-correction--2026-09-19-0648-bst) |
| CP-025 | 2026-09-19 07:57 BST | Repaired normal-owner OAuth environment selection, added fail-closed auth readiness and returned failures to the branded login shell | [#62](https://github.com/wolney8/OpenForge/issues/62), [#116](https://github.com/wolney8/OpenForge/issues/116) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-025-owner-blocking-local-google-sign-in--2026-09-19-0757-bst) |
| CP-026 | 2026-09-19 12:41 BST | Enforced inline calculator help, one Multi-Lay outer grid and paired semantic Back/Lay surfaces across standalone and embedded consumers | [#35](https://github.com/wolney8/OpenForge/issues/35), [#92](https://github.com/wolney8/OpenForge/issues/92) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-026-calculator-visual-contract-enforcement--2026-09-19-1241-bst) |
| CP-027 | 2026-09-21 10:44 BST | Recorded owner calculator and Google acceptance, promoted provider re-authentication to PASS and froze the verified local baseline | [#35](https://github.com/wolney8/OpenForge/issues/35), [#62](https://github.com/wolney8/OpenForge/issues/62), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-027-owner-acceptance-and-frozen-local-baseline--2026-09-21-1044-bst) |
| CP-028 | 2026-09-21 13:02 BST | Created an isolated protected Preview, proved hosted runtime/database readiness and recovery, and stopped truthfully at the owner-controlled Google interaction | [#62](https://github.com/wolney8/OpenForge/issues/62), [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-028-protected-hosted-preview-verification--2026-09-21-1302-bst) |
| CP-029 | 2026-09-21 15:24 BST | Recorded hosted Google PASS, repaired protected authenticated SSR context and stopped the Preview gate on a real Reports render loop | [#62](https://github.com/wolney8/OpenForge/issues/62), [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) | [Audit evidence](docs/audits/platform-quality-audit.md#current-cp-029-authenticated-protected-preview-verification--2026-09-21-1524-bst) |
| CP-029-R | 2026-09-22 08:02 BST | Recovered retained execution evidence: deployed source and screenshots exist, the hosted Playwright gate failed, and financial/recovery claims were inherited from CP-028 rather than rerun | [#62](https://github.com/wolney8/OpenForge/issues/62), [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) | [Recovery evidence](docs/audits/platform-quality-audit.md#cp-029-evidence-recovery-correction--2026-09-22-0802-bst) |
| CP-030 | 2026-09-22 11:57 BST | Repaired the Reports reduced-motion update loop and proved a hosted £6→£5 Cash Adjustment through History, Reports, reload and idempotent retry | [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#cp-030-reports-repair-and-hosted-cash-correction-proof--2026-09-22-1157-bst) |
| CP-031 | 2026-09-22 14:22 BST | Completed the supported authenticated Preview workflows and repaired archived-Profile amplification in lineage and Account eligibility reads | [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) | [Audit evidence](docs/audits/platform-quality-audit.md#cp-031-authenticated-protected-preview-completion--2026-09-22-1422-bst) |
| CP-032 | 2026-09-22 16:33 BST | Removed the remaining hosted connection/region latency and integrated all tested shared Preview repairs into healthy normal localhost without changing owner data | [#114](https://github.com/wolney8/OpenForge/issues/114), [#115](https://github.com/wolney8/OpenForge/issues/115) | [Audit evidence](docs/audits/platform-quality-audit.md#cp-032-hosted-performance-and-local-reconciliation--2026-09-22-1633-bst) |

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
