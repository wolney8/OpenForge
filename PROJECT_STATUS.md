# Project Status — Plum Duff / OpenForge — Doc ID: PS-CODEX-001

**Last updated:** 2026-09-24 10:00 BST · **Status:** 🟢 CP-037 selected fixes verified in protected Preview and normal localhost

## Right now

- **Working on:** completed #117's missing hosted settled-editor check and #111 hover/betting-P&L scope fixes; issue-led delivery rules are persistent.
- **Next:** deliver #111's already-approved bounded period-P&L preset, then verify its selected-Profile/combined totals and saved return context.
- **Blocked on:** no engineering blocker for the selected batch. Final editor visual acceptance and VoiceOver spoken output remain separate owner evidence; Production readiness is paused.

## Delivery state

| Area | Evidence state |
| --- | --- |
| Local integrated build | Application `86ee412`; records-only checkpoint follows it. Generated Next/TypeScript files excluded |
| Normal `localhost:3010` | Healthy `normal-owner`, canonical SQLite, `account-access-v1`; all eight owner record/history hashes and counts unchanged against the fresh verified backup |
| Main / origin | No merge or push; Production untouched |
| Vercel | Existing protected Preview serves `86ee412`, `preview:plum_duff_preview_cp028`; final affected authenticated browser checks 2/2 |
| Owner acceptance | Explicit Save/Discard remains owner-confirmed. CP-037 proves engineering behaviour; it does not infer fresh owner visual or Google acceptance |

## Progress at a glance

These figures measure **#114 audit coverage**, not the percentage of the product finished.

| Review area | Current coverage |
| --- | ---: |
| Assessments reviewed | 87 / 87 (100%) |
| Complete tasks exercised and passing | 23 / 24 (96%) |
| Competitor comparisons | 27 / 27 (100%) |
| Requirements reconciled | 133 / 133 (100%) |

## Next 3 steps

1. Implement only #111's approved period-P&L preset through the existing report/filter flow.
2. Prove that preset against synthetic selected-Profile/combined records and return navigation.
3. Keep remaining owner/VoiceOver evidence and any Production decision separate; no bulk smoke campaign.

## Checkpoint log

| ID | Timestamp | What changed | Issue | Document |
| --- | --- | --- | --- | --- |
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
| CP-033 | 2026-09-23 15:13 BST | Repaired action-scoped Notes editing for existing ledger rows, retained historical Account/financial meaning and removed cold-request schema-lock contention on Preview | [#117](https://github.com/wolney8/OpenForge/issues/117), [#91](https://github.com/wolney8/OpenForge/issues/91), [#36](https://github.com/wolney8/OpenForge/issues/36), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#cp-033-owner-blocking-ledger-edit-repair--2026-09-23-1513-bst) |
| CP-034 | 2026-09-23 17:56 BST | Completed browser Notes add/amend/clear across five ledgers, corrected Cash note-history semantics and reconciled the verified shared repair into normal localhost without changing owner financial data | [#117](https://github.com/wolney8/OpenForge/issues/117), [#91](https://github.com/wolney8/OpenForge/issues/91), [#36](https://github.com/wolney8/OpenForge/issues/36), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#cp-034-five-ledger-note-editing-and-local-reconciliation--2026-09-23-1756-bst) |
| CP-035 | 2026-09-23 20:06 BST | Replaced ordinary ledger autosave with one explicit draft, Save, Revert and three-way close contract across five editors | [#117](https://github.com/wolney8/OpenForge/issues/117), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#cp-035-explicit-ledger-save-and-discard--2026-09-23-2006-bst) |
| CP-036 | 2026-09-24 08:35 BST | Separated Notes drafts from calculation-preview identity and added one shared, editor-owned disclosure reveal behaviour | [#117](https://github.com/wolney8/OpenForge/issues/117), [#92](https://github.com/wolney8/OpenForge/issues/92) | [Audit evidence](docs/audits/platform-quality-audit.md#cp-036-settled-editor-stability-and-disclosure-visibility--2026-09-24-0835-bst) |
| CP-037 | 2026-09-24 10:00 BST | Closed the authenticated settled-editor gap, repaired chart hover and betting-P&L scope, and enforced concise issue-led delivery with unchanged owner data | [#117](https://github.com/wolney8/OpenForge/issues/117), [#111](https://github.com/wolney8/OpenForge/issues/111), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#cp-037-issue-led-settled-editor-and-chart-verification--2026-09-24-1000-bst) |

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
