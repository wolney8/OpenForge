# Fixture Spec: Financial Value Presentation

_Last updated: 2026-07-14_

## Contract covered

- `docs/contracts/financial-value-presentation-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| FVP-001 | Positive GBP resolved value | `+£ 10.00`, positive semantic token |
| FVP-002 | Negative GBP resolved value | `-£ 1.29`, negative semantic token |
| FVP-003 | Zero value | `£ 0.00`, neutral token |
| FVP-004 | Open row | `Current value` label |
| FVP-005 | Settled row | `Final value` label |
| FVP-006 | Reduced motion | No rolling transform |
| FVP-007 | Value changes from negative to positive | One accessible final value, restrained transition |
| FVP-008 | Mixed currencies in aggregate | Aggregate blocked without exchange-rate contract |

