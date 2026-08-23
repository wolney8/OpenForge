# Fixture Spec: Template-Driven Ledger Quick Add

_Last updated: 2026-08-23_

## Scope

Synthetic fixtures for the first Casino Free Spins quick-add template. These fixtures prove field
mapping and workflow boundaries, not casino EV or RTP calculations.

| Fixture | Inputs | Expected persisted result |
|---|---|---|
| `CQA-001` | Bookmaker A, `10` spins, `0.10` stake, converted win `1.25` | Free Spins, Settled/Win, `free_spins_value=1.25`, `final_net_pnl=1.25`, own cash `0.00` |
| `CQA-002` | Bookmaker A, `5` spins, `0.10` stake, zero shortcut | Free Spins, Settled/Lose, `free_spins_value=0.00`, `final_net_pnl=0.00`, own cash `0.00` |
| `CQA-003` | blank bookmaker or malformed money | save disabled; no row is created |
| `CQA-004` | valid compact values then More details | normal editor opens with values; no row is created before normal save |

## Rules

- All fixtures are synthetic.
- Money uses exact two-decimal display and payload strings.
- Date is asserted as a non-empty current operating datetime, not against a wall-clock literal.
