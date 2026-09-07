# Fixture Spec: Financial Value Presentation

_Last updated: 2026-09-07_

## Contract covered

- `docs/contracts/financial-value-presentation-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| FVP-001 | Positive GBP resolved value | `£ 10.00`, positive semantic token |
| FVP-002 | Negative GBP resolved value | `£ (1.29)`, negative semantic token |
| FVP-003 | Zero value | `£ -`, neutral semantic token |
| FVP-004 | Open row in a ledger table | `hourglass_top` Material Symbol, accessible `Current value`, green/red/neutral rounded value badge, whole-cell tooltip explaining cash-first open value |
| FVP-005 | Settled row in a ledger table | `done_all` Material Symbol, accessible `Final value`, green/red/neutral rounded value badge, whole-cell tooltip explaining settled result value |
| FVP-006 | Reduced motion, or a platform motion-off setting where available | Immediate static final value; no rolling transform |
| FVP-007 | First resolved positive value | Digits roll up once; one accessible final value |
| FVP-008 | Mixed currencies in aggregate | Aggregate blocked without exchange-rate contract |
| FVP-009 | First resolved negative value | Digits roll down once; one accessible final value |
| FVP-010 | Positive value changes `20 → 10` | Digits roll down because the value decreased |
| FVP-011 | Negative value changes `-20 → -10` | Digits roll up because the value increased |
| FVP-012 | Positive/negative sign transitions | After initial resolution, direction follows numeric increase/decrease |
| FVP-013 | Identical refetch, theme switch or ordinary rerender | No replay; exact final formatted value remains stable |
| FVP-014 | Zero, unavailable or loading | Neutral/static treatment; no fabricated zero or intermediate money |
| FVP-015 | Rapid successive updates | Stale motion is cancelled and the newest accessible final value wins |
| FVP-016 | User clicks an unchanged non-zero read-only value | Current digit roll replays once; punctuation remains static |
| FVP-017 | Animated and plain equivalents for `£ 61.12`, `£ (14.01)` and `£ 3,450.50` at table and KPI sizes | Same inherited typography, line height and baseline; width/height differ by no more than rendering tolerance; spaces and punctuation remain natural width |
