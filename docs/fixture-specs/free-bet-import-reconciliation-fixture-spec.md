# Fixture Spec: Free Bet Import Reconciliation

_Last updated: 2026-07-17_

## Contract

- `docs/contracts/free-bet-import-reconciliation-contract.md`
- `docs/contracts/free-bet-current-value-contract.md`

## Fixture source

- `tests/fixtures/free-bet-import-reconciliation-fixtures.json`

| ID | Scenario | Expected |
|---|---|---|
| FBR-001 | Standard pending SNR row agrees using profile commission | `matched`, `7.57` |
| FBR-002 | Workbook resolved value disagrees | `mismatch`, difference `1.43` |
| FBR-003 | Laid row has no profile commission | `incomplete` |
| FBR-004 | No-lay row requires no commission | `matched`, `0.00` |
| FBR-005 | Workbook resolved output missing | `incomplete` |

All records are synthetic. Commission and factors are explicit fixture inputs so the pure
reconciliation boundary remains deterministic.
