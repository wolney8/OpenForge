# Fixture Spec: Financial Value Presentation

_Last updated: 2026-07-14_

## Contract covered

- `docs/contracts/financial-value-presentation-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| FVP-001 | Positive GBP resolved value | `+£ 10.00`, positive semantic token |
| FVP-002 | Negative GBP resolved value | `( £ 1.29 )`, negative semantic token |
| FVP-003 | Zero value | `£ 0.00`, positive semantic token |
| FVP-004 | Open row in a ledger table | `hourglass_top` Material Symbol, accessible `Current value`, green/red/neutral rounded value badge, whole-cell tooltip explaining cash-first open value |
| FVP-005 | Settled row in a ledger table | `done_all` Material Symbol, accessible `Final value`, green/red/neutral rounded value badge, whole-cell tooltip explaining settled result value |
| FVP-006 | Reduced motion | No rolling transform |
| FVP-007 | Value changes from negative to positive | One accessible final value, restrained transition |
| FVP-008 | Mixed currencies in aggregate | Aggregate blocked without exchange-rate contract |
