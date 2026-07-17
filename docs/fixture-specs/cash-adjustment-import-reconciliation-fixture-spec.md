# Fixture Spec: Cash Adjustment Import Reconciliation

_Last updated: 2026-07-17_

## Contract

- `docs/contracts/cash-adjustment-import-reconciliation-contract.md`

## Fixture source

- `tests/fixtures/cash-adjustment-import-reconciliation-fixtures.json`

## Cases

| ID | Scenario | Expected |
|---|---|---|
| CAR-001 | Incoming `50.00` plus outgoing `20.00`; helpers agree | `matched`, total `30.00` |
| CAR-002 | Workbook helper `999.00`; recomputed value `50.00` | `mismatch`, difference `949.00` |
| CAR-003 | One source helper is missing | `incomplete`; no false source total |
| CAR-004 | Non-cash mapping | `not_available` |

Fixtures are synthetic and contain no workbook or personal data.

