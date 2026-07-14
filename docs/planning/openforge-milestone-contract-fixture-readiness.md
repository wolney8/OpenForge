# OpenForge Milestone Contract and Fixture Readiness

_Last verified against public GitHub milestones: 2026-07-14_

## Purpose

Map the live GitHub roadmap to durable local contracts and deterministic fixture evidence. `Drafted` does not mean approved or implemented. Money-impacting work still requires human contract approval and automated tests.

## Milestone overview

| Milestone | Purpose | GitHub state | Contract/fixture readiness |
|---|---|---|---|
| M0 Source Pack Audit | Freeze authoritative workbook inputs | Complete | Source-pack hierarchy documented |
| M1 Workbook Deconstruction | Extract sheets, fields, formulas and workflows | Complete | Workbook blueprint/map documents exist |
| M2 Profile-Scoped Architecture | Lock profile isolation and route/data boundaries | Complete | Phase 2 architecture/schema plans exist |
| M2A Profiles Foundation | Confirm essential profile/subscriber semantics | Complete | Profile foundation is the required baseline |
| M3 Calculation Contracts | Contract core cash-first row calculations | Complete for core row contracts | Sportsbook/free-bet and reporting contracts exist |
| M4 Fixtures and Calculation Engine | Make financial rules executable and regression-tested | Core issues complete | Core JSON fixtures exist; every later calculation still needs its own pack |
| M5 Login Profiles Tracker Shell | Local shell, database and authentication boundary | 3/5 closed; issues #62-#63 open | Existing shell complete; optional Google OIDC and encrypted cloud-backup contracts drafted |
| M6 Tracker MVP | Workbook-parity operational ledgers | Active: issue #10 | End-to-end smoke test remains the current completion gate |
| M7 Reporting and Import/Export | Per-profile/combined reports and audited workbook round trip | Open: issues #11-#12 | Reporting contracts exist; import/export contract and fixtures now drafted |
| M8 OddsForge | Later odds matching | Deferred: six open issues | Existing separate contracts/fixtures; remains out of Tracker roadmap |
| M9 Subscriber Access | Later managed read-only and self-service subscriber modes | Deferred: five open issues | Access and fee drafts/fixtures exist; production auth/invites remain unapproved |
| M10 Fee Visibility | Calculate, display and explicitly withdraw management/investment fees | Open: issue #23 | Draft contract/fixtures added; fee-base decisions remain gated |
| M11 Multi-Profile Entry | Sequentially reuse an offer across eligible profiles | Open: issue #24 | Draft workflow/fixtures added |
| M12 Target Decision Engine | Target progress and advisory offer decisions | Open: issues #25-#31 | Target maths/safety fixtures drafted; recommendation scoring remains unapproved |
| M13 Common Bet Combos | Settings-owned quick-entry templates | Open: issue #32 | Draft workflow/fixtures added |
| M14 Calculator Workspace | Standalone calculators and ledger bridge | Open: issues #35-#40 | Bridge and evidence governance drafted; advanced families are classified by readiness |
| M15 Platform Experience | Financial motion, accessibility, density and guided entry | Open: issues #58-#61 | Financial presentation, UX and guidance contracts/fixtures drafted |

## New M5 scope

### Optional Google sign-in

The local Login -> Profiles -> Tracker shell is already implemented. Google sign-in is a new optional authentication adapter, not a prerequisite for local testing and not a replacement for local recovery login.

Draft evidence:

- `docs/contracts/fund-manager-authentication-contract.md`
- `docs/fixture-specs/fund-manager-authentication-fixture-spec.md`
- `tests/fixtures/fund-manager-authentication-fixtures.json`

Recommended GitHub issue under M5:

- `#62 Add Optional Google OIDC for Existing Fund Manager Login`

### Local-first database with cloud backup

SQLite remains the local operational source in the first supported mode. Encrypted cloud snapshots provide disaster recovery. Managed PostgreSQL is a later deployment mode; bidirectional sync is not approved.

Draft evidence:

- `docs/contracts/local-database-cloud-backup-contract.md`
- `docs/fixture-specs/local-database-cloud-backup-fixture-spec.md`
- `tests/fixtures/local-database-cloud-backup-fixtures.json`

Recommended GitHub issue under M5:

- `#63 Implement Verified Local and Encrypted Cloud Database Backups`

## Requested milestone evidence

### M7 Reporting and Import/Export

Existing reporting contracts:

- `docs/contracts/dashboard-selected-range-pnl-contract.md`
- `docs/contracts/free-bet-weekly-reporting-contract.md`
- `docs/contracts/retained-profit-reporting-contract.md`
- `docs/contracts/cash-adjustment-aggregation-contract.md`

New round-trip evidence:

- `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`
- `docs/fixture-specs/spreadsheet-import-export-roundtrip-fixture-spec.md`
- `tests/fixtures/spreadsheet-import-export-roundtrip-fixtures.json`

Readiness: contract review required. Import implementation must follow a verified backup path and final field-map approval.

### M10 Fee Visibility

- `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md`
- `docs/fixture-specs/fund-manager-fee-calculation-and-withdrawal-fixture-spec.md`
- `tests/fixtures/fund-manager-fee-calculation-and-withdrawal-fixtures.json`

Readiness: the shared settled/final base, independent component calculations, monthly crystallisation, weekly provisional breakdown, loss carry-forward, package cap, withdrawal reserve, Cash Adjustment subtypes and no-double-deduction treatment are confirmed. Locked-period amendment/reopening remains the only unresolved policy gate.

### M11 Multi-Profile Entry

- `docs/workflows/multi-profile-ledger-entry-workflow-contract.md`
- `docs/fixture-specs/multi-profile-ledger-entry-fixture-spec.md`
- `tests/fixtures/multi-profile-ledger-entry-fixtures.json`

Readiness: ready for workflow review. Initial implementation must remain Fund Manager-only, sequential and separately confirmed per profile.

### M12 Target Decision Engine

- `docs/contracts/target-progress-calculation-contract.md`
- `docs/workflows/offer-decision-support-workflow-contract.md`
- `docs/fixture-specs/target-progress-and-decision-support-fixture-spec.md`
- `tests/fixtures/target-progress-and-decision-support-fixtures.json`

Readiness: target progress can proceed after default-basis/tolerance approval. Strategy recommendation scoring is not ready and needs its own approved calculation contract. Optional AI remains evidence-only and cannot execute or replace deterministic maths.

### M13 Common Bet Combos

- `docs/workflows/common-bet-combo-workflow-contract.md`
- `docs/fixture-specs/common-bet-combo-fixture-spec.md`
- `tests/fixtures/common-bet-combo-fixtures.json`

Readiness: ready for workflow review after Settings authority ownership is confirmed. Presets create unsaved drafts only.

### M14 Calculator Workspace

- Existing row calculations: sportsbook/free-bet and advanced sportsbook contracts in `docs/contracts/`
- `docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md`
- `docs/fixture-specs/calculator-workspace-ledger-bridge-fixture-spec.md`
- `tests/fixtures/calculator-workspace-ledger-bridge-fixtures.json`
- `docs/codex/m14-external-calculator-research-handoff-prompt.md`
- `docs/codex/m14-external-calculator-staged-handoff-prompts.md`
- `docs/templates/m14-calculator-observation-packet.json`
- `docs/contracts/m14-external-calculator-reference-values-contract.md`
- `docs/contracts/m14-refund-bonus-lock-in-reference-contract.md`
- `docs/contracts/m14-odds-converter-reference-contract.md`
- `docs/fixture-specs/m14-external-calculator-reference-fixture-spec.md`
- `tests/fixtures/m14/m14-external-calculator-reference-fixtures.json`
- `docs/reference/m14-calculator-research/openforge-coverage-review.md`

Readiness: bridge workflow is ready for review. Standard sportsbook, free-bet
SNR, and odds conversion have accepted external reference cases, but still use
their owning OpenForge contracts. Refund/bonus lock-in has a reproducible draft
equation pending human approval. Each-way remains research-only. Extra-place,
sequential-lay, 2UP/dutch, accumulator, risk-free comparison, and partial-match
external captures remain blocked for M14 implementation until the targeted
gates in the coverage review are satisfied. Raw packet `pass` values are not
financial approval.

### M15 Platform Experience

- `docs/contracts/financial-value-presentation-contract.md`
- `docs/fixture-specs/financial-value-presentation-fixture-spec.md`
- `tests/fixtures/financial-value-presentation-fixtures.json`
- `docs/workflows/material-accessible-ledger-editor-workflow-contract.md`
- `docs/fixture-specs/material-accessible-ledger-editor-fixture-spec.md`
- `tests/fixtures/material-accessible-ledger-editor-fixtures.json`
- `docs/workflows/guided-entry-focus-workflow-contract.md`
- `docs/fixture-specs/guided-entry-focus-fixture-spec.md`
- `tests/fixtures/guided-entry-focus-fixtures.json`

Readiness: ready for contract review. Currency defaults to Fund Manager/application GBP; per-profile currency override is `To confirm`. Shared animated value implementation must wait for contract approval.

## Remaining smoke-test gate

Issue #47 is closed. Issue #10 remains the active Tracker MVP issue. The end-to-end smoke document still has uncompleted checks in:

- Settings authority visibility/propagation
- sportsbook cashback/refund settlement and copy-to-free-bet lifecycle
- free-bet lifecycle and calculator states
- casino and cash-adjustment workflows
- accounts, dashboard and reports
- unsaved-change/navigation behaviour
- keyboard, light/dark contrast, width and UK date formatting

Source: `docs/testing/openforge-end-to-end-smoke-test-2026-07-06-week.md`.

## Recommended development order

1. Finish issue #10 smoke-test blockers and close M6 Tracker MVP only after the workbook-parity paths pass.
2. Implement M7 reporting parity before import writes; then add verified backup and staged import/export.
3. Resolve M10 fee business decisions, then implement fee visibility and explicit withdrawal audit.
4. Implement M11 and M13 as Fund Manager workflow accelerators once core ledgers are stable.
5. Implement M14 calculator workspace by approved calculator family, starting with existing standard/free-bet contracts.
6. Apply M15 financial presentation and accessibility primitives across stable surfaces.
7. Build M12 target progress only after reporting history is reliable; defer recommendation scoring/AI until its decision model is approved.
8. Keep M9 subscriber access and M8 OddsForge deferred until explicitly activated.
