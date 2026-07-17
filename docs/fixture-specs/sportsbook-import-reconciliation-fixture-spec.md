# Fixture Spec: Sportsbook Import Reconciliation

_Last updated: 2026-07-17_

## Contract

- `docs/contracts/sportsbook-import-reconciliation-contract.md`
- `docs/contracts/sportsbook-current-value-contract.md`

## Fixture source

- `tests/fixtures/sportsbook-import-reconciliation-fixtures.json`

| ID | Scenario | Expected |
|---|---|---|
| SBR-001 | Standard pending row agrees | `matched`, `-0.58` |
| SBR-002 | Source total disagrees | `mismatch`, difference `1.58` |
| SBR-003 | Laid row lacks profile commission | `incomplete` |
| SBR-004 | Settled void no-lay row | `matched`, `0.00` |
| SBR-005 | Source resolved output missing | `incomplete` |
| SBR-006 | Branch-preserving two-outcome multi-lay | `matched`, `7.39` |

All fixture data is synthetic.
