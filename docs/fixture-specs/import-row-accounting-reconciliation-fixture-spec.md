# Fixture Spec: Import Row Accounting Reconciliation

_Last updated: 2026-07-17_

## Contract

- `docs/contracts/import-row-accounting-reconciliation-contract.md`

## Fixture source

- `tests/fixtures/import-row-accounting-reconciliation-fixtures.json`

## Cases

| ID | Scenario | Expected |
|---|---|---|
| IRA-001 | Ready batch with inserts, no-ops and blocked rows totalling source rows | `complete` |
| IRA-002 | Persisted action summary omits one source row | `mismatch`; confirmation blocked |
| IRA-003 | Confirmed batch contains imported and operator-skipped rows totalling source rows | `complete` |

All values are synthetic and contain no workbook or personal data.

