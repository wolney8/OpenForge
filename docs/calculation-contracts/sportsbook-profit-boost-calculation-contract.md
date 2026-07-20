# Calculation Contract: Sportsbook Profit Boost

_Last updated: 2026-07-20_

## 0. Contract status

- Status: Approved for implementation
- Owner: Fund Manager
- Human approval required before implementation: Completed 2026-07-20
- Related workflow contract: `docs/workflows/common-bet-combo-workflow-contract.md`
- Related source pack: sportsbook current-value contract and cash-first calculation specification
- Related issue: GitHub issue `#32`

## 1. Product context

- Application: Plum Duff
- Module: Profile-scoped Sportsbook Tracker
- Profile-owned table: `sportsbook_bets`
- Required isolation: every row and calculation requires the row's `profile_id`
- Fund Manager visible: Yes
- Subscriber visible: Later, subject to subscriber visibility permissions

## 2. Purpose and workflow

Calculate a Profit Boost bet when either:

1. the bookmaker displays the final boosted decimal odds; or
2. the bookmaker displays base decimal odds and a percentage boost.

The calculation supplies calculator/reference values during entry, conservative cash-first value
while placed, and the selected final branch after settlement. It never places or confirms a bet.

## 3. Spreadsheet equivalent

The workbook supports boosted-price rows through ordinary sportsbook back odds and cash-first
scenario valuation, but it does not provide a separate percentage Profit Boost contract. This
contract is an approved Plum Duff extension. Existing sportsbook scenario, commission, liability,
manual override and reporting rules remain authoritative.

## 4. Inputs

| Field | Type | Required | Source | Notes |
|---|---|---:|---|---|
| `profile_id` | string | Yes | Row | Mandatory profile scope |
| `record_id` | string | Yes | Row | Audit identity |
| `profit_boost_mode` | enum | Yes | User | `displayed_odds` or `percentage` |
| `base_back_odds` | decimal | Percentage mode | User | Decimal odds before boost |
| `profit_boost_percent` | decimal | Percentage mode | User | Percentage points; `15` means 15% |
| `boosted_back_odds` | decimal | Displayed mode | User | Actual bookmaker-displayed odds |
| `actual_accepted_back_odds` | decimal | No | User | Overrides reference odds after placement |
| `maximum_boost_winnings` | money | No | User | Caps extra profit added by the boost |
| standard sportsbook inputs | mixed | Yes | Row/profile | Stake, lay odds, actual lay, commission, status and result |

## 5. Formula and outputs

Percentage boosts apply to the profit portion only, never the returned stake.

```text
base_profit_per_unit = base_back_odds - 1
uncapped_extra_profit_per_unit = base_profit_per_unit * (profit_boost_percent / 100)
uncapped_extra_profit = back_stake * uncapped_extra_profit_per_unit
extra_profit = min(uncapped_extra_profit, maximum_boost_winnings) when a cap exists
reference_boosted_profit = back_stake * base_profit_per_unit + extra_profit
reference_boosted_odds = 1 + (reference_boosted_profit / back_stake)
effective_back_odds = actual_accepted_back_odds ?? boosted_back_odds ?? reference_boosted_odds
```

`effective_back_odds` then enters the existing sportsbook lay-stake, liability, back-win, lay-win,
cash-first current-value and settlement formulas. Original odds, boost percentage, calculated odds
and accepted odds remain separate and auditable.

## 6. Cash-first and settlement behaviour

- An unplaced percentage-only row exposes calculated odds as a reference value, not an accepted price.
- A placed row uses actual accepted odds when supplied; otherwise its explicit displayed or calculated
  boosted odds drive the scenario values and the UI must identify the source.
- Open placed rows show the conservative minimum of all applicable scenario outcomes.
- Settled rows show only the selected final result branch.
- Manual override remains last in precedence and requires a reason.
- Void rows resolve to `0.00`, subject to the existing manual-override audit rule.

## 7. Rounding and precision

- Parse inputs as decimal values; do not use binary floating-point arithmetic.
- Store/reference effective odds to four decimal places using half-up rounding.
- Round stake, liability and P&L to two decimal places using half-up rounding.
- Display ordinary odds to at least two decimals while preserving meaningful extra precision.
- Never silently infer commission or a boost cap.

## 8. Required fixtures and tests

- displayed boosted odds, open and settled
- percentage-only boost without cap
- percentage-only boost where the cap applies
- actual accepted odds overriding calculated odds
- standard, underlay and overlay strategy paths
- void and manual override
- missing/invalid boost inputs
- profile isolation
- exact money equality at `0.01`; effective odds equality at `0.0001`

## 9. UI requirements

- Label the offer `Profit Boost` and distinguish `Bookmaker shows boosted odds` from
  `Bookmaker shows percentage only`.
- Show base odds, percentage, cap, calculated boosted odds and actual accepted odds only where
  relevant to the selected mode.
- Identify calculated odds as `Reference`; never present them as bookmaker-confirmed.
- Keep current/projected value separate from final/settled value.
- Use Plum Duff Material 3 field, status and financial-value primitives with WCAG 2.2 AA contrast.

