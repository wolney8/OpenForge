# Project Status — Plum Duff / OpenForge — Doc ID: PS-CODEX-001

**Last updated:** 2026-09-24 15:00 BST · **Status:** 🟢 CP-042 delivered locally and to protected Preview

## Right now

- **Completed:** CP-041 deployed and its four missing hosted checks passed; PD-FIX-288–289 repaired Extra Places filter/focus/footer behaviour and all-profile financial-card replay/readiness. App `cb4c1c4`; four isolated and four final hosted workflows, 32 focused units, types/build pass. [Evidence](docs/audits/platform-quality-audit.md#cp-042-protected-preview-delivery-and-bounded-ui-repairs--2026-09-24-1500-bst).
- **Running:** same protected Preview and local frontend source `cb4c1c4`; existing services healthy; owner data unchanged. Credentials reused through provider bindings, with no secret transfer. Standing Preview permission is recorded.
- **Remaining:** Git push withheld while automatic-deployment isolation is unverified; #96 credential rotation remains separate. Fresh authenticated normal-owner browser and VoiceOver are unexecuted. #117 owner-confirmed Save/Discard stays accepted.

## Delivery state

| Area | Evidence state |
| --- | --- |
| Local integrated source | `cb4c1c4`; 306 tracked frontend files match isolated/staging; generated Next/TypeScript changes preserved and excluded |
| Normal `localhost:3010` / API `8010` | Existing services healthy without restart; frontend source updated. API unchanged launch label `113d810…+dirty`; normal-owner SQLite `account-access-v1`; all eight owner-data projections unchanged. Authenticated owner browser not run |
| Main / origin | Local commits only; no push/merge, Production untouched |
| Protected Preview | Stable alias serves `cb4c1c4`; protection, role, dedicated database and four affected browser workflows pass. Earlier CP-041 hosted checks 4/4 at `7763284`. Synthetic session revoked 200 → 204 → 401 |
| Configuration | Existing Vercel-managed bindings reused. Preview database remains Preview-only; shared session/OAuth binding scopes and open #96 flag unchanged; no secret export/retransmission |
| Owner acceptance | Existing scoped #117 acceptance retained; no new owner-browser/Google/VoiceOver or blanket #92/#105 closure claim |

## Progress at a glance

These figures measure **#114 audit coverage**, not the percentage of the product finished.

| Review area | Current coverage |
| --- | ---: |
| Assessments reviewed | 87 / 87 (100%) |
| Complete tasks exercised and passing | 23 / 24 (96%) |
| Competitor comparisons | 27 / 27 (100%) |
| Requirements reconciled | 133 / 133 (100%) |

## Next two executable actions

1. Reproduce and complete #105 Extra Places P&L/qualifying-loss/budget card readiness and nearest-card replay with synthetic range/loading checks.
2. Extend #105 coverage to the existing single-Profile Dashboard headline cards, preserving current/final and incomplete-Account meanings; fix only reproduced presentation gaps.

## Checkpoint log

| ID | Timestamp | What changed | Issue | Document |
| --- | --- | --- | --- | --- |
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
| CP-038 | 2026-09-24 11:08 BST | Delivered reconciled period-P&L with retained scope/point context, fixed compact Report/help geometry and reconciled the tested application locally without changing owner data | [#111](https://github.com/wolney8/OpenForge/issues/111), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Audit evidence](docs/audits/platform-quality-audit.md#cp-038-period-pnl-preset-and-shared-report-geometry--2026-09-24-1108-bst) |
| CP-039 | 2026-09-24 12:11 BST | Repaired compact ledger toolbars, truthful P&L card readiness/replay and first Casino Notes entry; preserved period-P&L and integrated tested source with unchanged owner data | [#92](https://github.com/wolney8/OpenForge/issues/92), [#105](https://github.com/wolney8/OpenForge/issues/105), [#117](https://github.com/wolney8/OpenForge/issues/117), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Evidence](docs/audits/platform-quality-audit.md#cp-039-ledger-toolbars-and-financial-display--2026-09-24-1211-bst) |
| CP-040 | 2026-09-24 12:59 BST | Recovered already completed CP-039 source, reran six isolated workflows plus focused unit/types/build checks, and reverified Preview/local identity with unchanged owner data | [#92](https://github.com/wolney8/OpenForge/issues/92), [#105](https://github.com/wolney8/OpenForge/issues/105), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Evidence](docs/audits/platform-quality-audit.md#cp-040-recovered-delivery-verification--2026-09-24-1259-bst) |
| CP-041 | 2026-09-24 13:52 BST | Completed Account/Profile controls and Account/Cash financial displays; 12 isolated workflows pass; local source updated without owner changes, Preview deployment blocked by automatic approval review | [#92](https://github.com/wolney8/OpenForge/issues/92), [#105](https://github.com/wolney8/OpenForge/issues/105), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Evidence](docs/audits/platform-quality-audit.md#cp-041-accountprofile-controls-and-accountcash-displays--2026-09-24-1352-bst) |
| CP-042 | 2026-09-24 15:00 BST | Deployed CP-041 and verified its missing hosted workflows; repaired Extra Places filter controls and Active-Profile financial-card replay/readiness; local/Preview verified with unchanged owner data | [#92](https://github.com/wolney8/OpenForge/issues/92), [#105](https://github.com/wolney8/OpenForge/issues/105), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Evidence](docs/audits/platform-quality-audit.md#cp-042-protected-preview-delivery-and-bounded-ui-repairs--2026-09-24-1500-bst) |

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
