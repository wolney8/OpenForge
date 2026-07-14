# Fixture Spec: Spreadsheet Import and Export Round Trip

_Last updated: 2026-07-14_

## Contract covered

- `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`

## Fixture rules

Fixtures model parsed workbook rows as synthetic JSON. They do not contain the uploaded workbook or real operational data.

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

## Acceptance

- No fixture may write until dry-run is confirmed.
- All written rows use the selected `profile_id`.
- Recomputed money comparisons use the referenced contract tolerance.

