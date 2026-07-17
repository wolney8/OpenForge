# Fixture Spec: Spreadsheet Import and Export Round Trip

_Last updated: 2026-07-17_

## Contract covered

- `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`

## Fixture rules

Fixtures model parsed workbook rows as synthetic JSON. They do not contain the uploaded workbook or real operational data.
Parser tests construct a minimal synthetic XLSX entirely in memory; no raw workbook is committed.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| IO-001 | Valid sportsbook row into selected profile | One staged insert; derived helpers marked for recompute |
| IO-002 | Same row imported twice | Second batch is idempotent/no-op |
| IO-003 | Source id belongs to another profile | Blocking profile-isolation error |
| IO-004 | Unknown status | Blocking validation error with source location |
| IO-005 | Manual override lacks reason | Override blocked; row not committed |
| IO-006 | Workbook current value differs outside tolerance | Visible reconciliation warning; no silent replacement |
| IO-007 | Export then re-import | Entered values, statuses, source ids and overrides round-trip |
| IO-008 | `SignupUsers` sheet supplied | Sheet ignored and reported as unsupported/excluded |
| IO-009 | Confirm sportsbook XLSX import | Verified backup precedes atomic write and lineage is recorded |
| IO-010 | Profile sportsbook export re-imported | Original identities retained; all unchanged rows are no-ops |
| IO-011 | Operator confirms one of two compatible rows | One imported; one retained as operator-skipped |
| IO-012 | Delete dry-run and confirmed batches | Dry-run removed; confirmed audit deletion blocked |
| FI-001 to FI-006 | Free Bets mapping, safety, profile isolation and round trip | Follow `free-bet-import-field-map-fixture-spec.md` |
| CI-001 to CI-006 | Casino Offers mapping, resolution boundary and round trip | Follow `casino-offer-import-field-map-fixture-spec.md` |
| CAI-001 to CAI-008 | Cash Adjustments mapping, helper exclusion, profile isolation and round trip | Follow `cash-adjustment-import-field-map-fixture-spec.md` |
| AI-001 to AI-012 | Accounts mapping, catalogue authority, exact balances and round trip | Follow `accounts-import-field-map-fixture-spec.md` |
| AIU-001 to AIU-006 | Individually approved changed Account rows | Follow `accounts-import-update-approval-fixture-spec.md` |
| IRA-001 to IRA-003 | Cross-ledger row accounting | Follow `import-row-accounting-reconciliation-fixture-spec.md` |
| CAR-001 to CAR-004 | Cash Adjustment source/control-total comparison | Follow `cash-adjustment-import-reconciliation-fixture-spec.md` |
| COR-001 to COR-003 | Casino Offer resolved-total comparison | Follow `casino-offer-import-reconciliation-fixture-spec.md` |
| FBR-001 to FBR-005 | Free Bet cash-first source/control-total comparison | Follow `free-bet-import-reconciliation-fixture-spec.md` |
| SBR-001 to SBR-006 | Sportsbook cash-first source/control-total comparison | Follow `sportsbook-import-reconciliation-fixture-spec.md` |

## Acceptance

- No fixture may write until dry-run is confirmed.
- All written rows use the selected `profile_id`.
- Recomputed money comparisons use the referenced contract tolerance.
