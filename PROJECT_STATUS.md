# Project Status — Plum Duff / OpenForge — Doc ID: PS-CODEX-001

**Last updated:** 2026-09-25 14:11 BST · **Status:** 🟢 CP-047 two bounded feature slices delivered

## Right now

- **Completed:** Normal Multi-Lay plan → actual fills → settlement → History/Reports/restore; Sportsbook/Account review → explicit balance confirmation → observation history → unchanged bet draft. [Evidence](docs/audits/platform-quality-audit.md#cp-047-operational-multi-lay-and-account-observations--2026-09-25-1411-bst).
- **Running:** local3010 frontend and protected Preview `e2d70e0`; nine HTTP-served modules/styles verified. Changed API8010 `e2d70e0…+dirty`; only retained generated TypeScript files are dirty. Records: CP-047; prior records `f81f929`; final records SHA is in the verified backup receipt.
- **Remaining:** neither delivered core slice has an implementation/engineering gap. Other Multi-Lay reward/backing/market configurations, Free Bets/Casino review entry points and wider Account settlement/freshness/trends remain named scope. #105 engineering completion and #117 scoped acceptance retained.
- **Blocked / acceptance:** Git push withheld for unverified automatic-deployment isolation; #96 separate. Fresh normal-owner browser and VoiceOver unexecuted; broader owner acceptance remains separate. No owner migration or test writes.

## Delivery state

| Area | Actual state |
| --- | --- |
| Application/tests | `2ef119f` Multi-Lay + `e2d70e0` Accounts;107 API/89 web;7 isolated/7 hosted workflows; types, targeted lint and hosted build pass |
| Local3010 / API8010 | Actual served source and normal-owner identity verified;19 data/audit projections unchanged; legacy calculation compatibility passes; no schema change |
| Protected Preview | `e2d70e0`; protection, role, database and authenticated screens verified; provider bindings reused remotely; synthetic Profiles archived/session revoked |
| Storage/recovery | Existing versioned planning JSON and observation/audit tables reused; disposable SQLite/PostgreSQL retry, rollback, concurrency and portable restore pass |
| Records/publication/backup | CP-047; #36/#38/#85/#106/#92/#114 concise comments published once; source/evidence and prior backup hashes verified; no push/main/Production |

## Progress at a glance

These figures measure **#114 audit coverage**, not product completion. The wider Multi-Lay task remains partial.

| Review area | Current coverage |
| --- | ---: |
| Assessments reviewed | 87 / 87 (100%) |
| Complete tasks exercised and passing | 23 / 24 (96%) |
| Competitor comparisons | 27 / 27 (100%) |
| Requirements reconciled | 133 / 133 (100%) |

## Next two executable actions

1. #85: reuse the delivered Account review panel from Free Bets and Casino Account/bookmaker entry points, preserving each ledger draft and canonical Profile/Account identity.
2. #92: finish the queued Account Catalogue Add/Edit Account and Quick Actions Common Bet Combos Add/Edit Combo checks with intercepted shared-reference writes; fix demonstrated defects only.

[Resume here](docs/planning/plum-duff-next-issue-tracking-register.md#resume-here--cp-047-complete) retains exact files, commands and unsupported configurations. [#105 coverage](docs/contracts/financial-value-presentation-contract.md#rollout-coverage) remains engineering-complete.

## Checkpoint log

| ID | Timestamp | What changed | Issue | Document |
| --- | --- | --- | --- | --- |
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
| CP-043 | 2026-09-24 16:00 BST | Completed Extra Places summary readiness/replay and Dashboard period/failure handling; six isolated/six hosted workflows pass, local served modules verified, owner data unchanged | [#105](https://github.com/wolney8/OpenForge/issues/105), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Evidence](docs/audits/platform-quality-audit.md#cp-043-extra-places-summaries-and-profile-dashboard-cards--2026-09-24-1600-bst) |
| CP-044 | 2026-09-24 19:46 BST | Completed Reports card replay and truthful selected-range/required-output readiness; verified local/Preview app0189434, passing focused regressions and unchanged owner data | [#105](https://github.com/wolney8/OpenForge/issues/105), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Evidence](docs/audits/platform-quality-audit.md#cp-044-reports-financial-display--2026-09-24-1946-bst) |
| CP-045 | 2026-09-25 09:51 BST | Finished named Fee Position/Exposure, Profile and fee-dialog financial coverage;13 isolated/hosted workflows pass, local/Preview app7dc975f and unchanged owner data | [#105](https://github.com/wolney8/OpenForge/issues/105), [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Evidence](docs/audits/platform-quality-audit.md#cp-045-named-financial-coverage--2026-09-25-0951-bst) |
| CP-046 | 2026-09-25 11:38 BST | Completed Tracker Lists, active Profile Account create/edit and Profile Defaults reflow/failure recovery;10 isolated/10 hosted workflows, local/Preview app9e7cbd2, owner data unchanged | [#92](https://github.com/wolney8/OpenForge/issues/92), [#114](https://github.com/wolney8/OpenForge/issues/114) | [Evidence](docs/audits/platform-quality-audit.md#cp-046-settings-forms-and-account-editor--2026-09-25-1138-bst) |
| CP-047 | 2026-09-25 14:11 BST | Delivered Normal Multi-Lay actual fills through settlement/History/Reports/restore and atomic Account balance review/history; local/Preview e2d70e0, 7 isolated/7 hosted workflows, unchanged owner data | [#36](https://github.com/wolney8/OpenForge/issues/36), [#38](https://github.com/wolney8/OpenForge/issues/38), [#85](https://github.com/wolney8/OpenForge/issues/85), [#106](https://github.com/wolney8/OpenForge/issues/106) | [Evidence](docs/audits/platform-quality-audit.md#cp-047-operational-multi-lay-and-account-observations--2026-09-25-1411-bst) |

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
