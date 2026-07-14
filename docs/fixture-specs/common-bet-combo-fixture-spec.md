# Fixture Spec: Common Bet Combos

_Last updated: 2026-07-14_

## Contract covered

- `docs/workflows/common-bet-combo-workflow-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| COMBO-001 | Valid recurring sportsbook preset | Descriptive fields prefilled; no save/placement |
| COMBO-002 | Bookmaker unavailable on profile | Preset hidden or blocked |
| COMBO-003 | Every known bookmaker unavailable | Explicit profile warning |
| COMBO-004 | Stale controlled-list value | Mapping required before use |
| COMBO-005 | Preset edited later | Existing ledger row unchanged |
| COMBO-006 | Target profile has different exchange | Profile setting wins |

