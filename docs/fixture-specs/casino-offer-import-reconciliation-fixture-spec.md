# Fixture Spec: Casino Offer Import Reconciliation

_Last updated: 2026-07-17_

## Contract

- `docs/contracts/casino-offer-import-reconciliation-contract.md`

## Fixture source

- `tests/fixtures/casino-offer-import-reconciliation-fixtures.json`

| ID | Scenario | Expected |
|---|---|---|
| COR-001 | Current/reference and final-override rows agree with source resolved values | `matched`, `2.50` |
| COR-002 | Source resolved value disagrees | `mismatch`, difference `101.50` |
| COR-003 | Source resolved output missing | `incomplete` |

Fixtures are synthetic and do not claim independent casino-offer formula coverage.

