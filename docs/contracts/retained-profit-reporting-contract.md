# Calculation Contract: Retained Profit Reporting

_Last updated: 2026-06-30_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: To confirm
- Related spreadsheet source: `Reports`, `Cash Adjustments`, `Sportsbook Bets`, `Free Bets`, `Casino Offers`
- Related source-pack file: `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- Related issue/task: `Write calculation contract for retained profit reporting`

## 1. Product context

- Application: OpenForge
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `sportsbook_bets`, `free_bets`, `casino_offers`, `cash_adjustments`
- Required `profile_id` handling: retained profit must be computed per selected profile unless explicitly aggregating approved cross-profile headline totals
- Fund Manager visible? Yes, through aggregate summaries
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation defines retained profit for reporting periods.

It supports:

- weekly report retained profit
- monthly retained profit rollups
- per-profile profitability review
- reconciliation between betting P&L and cash deductions/withdrawals

## 3. Workflow context

- encountered during weekly/monthly report review
- recalculated when weekly P&L totals or cash-adjustment report totals change
- shown in the `Reports` surface and any future profile reporting dashboard
- reporting-time logic

## 4. Spreadsheet equivalent

- Primary sheet: `Reports`
- Supporting sheets:
  - `Cash Adjustments`
  - `Sportsbook Bets`
  - `Free Bets`
  - `Casino Offers`
- Representative workbook behaviour:
  - `RetainedProfit = TotalWeekPnL + Withdrawals + CostsAndSubscriptions`
- Known workbook rule:
  - withdrawals and costs are already negative signed values
  - the formula adds them rather than subtracting them again

## 5. Cash-first/current-value behaviour

- Question answered: after betting P&L and explicit cash outflows, what value remains retained for the profile in this reporting period?
- Applies before settlement: Indirectly, because upstream weekly totals may include current-value rows
- Calculates multiple scenario outcomes: No
- Value shown for reporting periods:
  - resolved aggregate of betting P&L plus signed cash adjustments
- Conservative `MIN()` style outcome used:
  - indirectly through upstream row-level values
- Current/projected vs final/settled separation:
  - inherited from the upstream report inputs
- Reports before settlement:
  - may still reflect current-state workbook parity if upstream weekly totals do
- Reports after settlement:
  - naturally resolve as underlying rows settle or are overridden

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | required isolation key |
| `period_type` | enum | Yes | report context | derived | Yes | `weekly` or `monthly` for MVP |
| `period_start_date` | date | Yes | report context | derived | Yes | reporting boundary |
| `sportsbook_period_pnl` | money | Yes | reports/derived | derived | Yes | already resolved aggregate |
| `free_bet_period_pnl` | money | Yes | reports/derived | derived | Yes | already resolved aggregate |
| `casino_period_pnl` | money | Yes | reports/derived | derived | Yes | already resolved aggregate |
| `withdrawals_value` | money | Yes | reports/derived | derived | Yes | signed negative or zero |
| `costs_and_subscriptions_value` | money | Yes | reports/derived | derived | Yes | signed negative or zero |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `total_betting_pnl` | money | reports | resolved aggregate | derived | sum of sportsbook, free-bet, casino |
| `retained_profit` | money | reports/profile summary | resolved aggregate | derived | final output |

## 8. Formula source

- current tracker workbook formula
- cash-first calculation spec
- workbook reporting parity findings

## 9. Formula

Total betting P&L:

- `total_betting_pnl = sportsbook_period_pnl + free_bet_period_pnl + casino_period_pnl`

Retained profit:

- `retained_profit = total_betting_pnl + withdrawals_value + costs_and_subscriptions_value`

Blank/error handling:

- missing component values default to zero only if workbook-parity input generation has already done so explicitly
- no extra sign transformation is allowed here

## 10. Assumptions

- withdrawals and costs/subscriptions use signed values from cash-adjustment reporting logic
- retained profit is not the same concept as total betting P&L
- `Costs` remains a tolerated reporting category even if it is legacy or hidden in current entry workflows
- monthly retained profit should be derived from monthly rollup components, which themselves are sourced from weekly rows

## 11. Rounding rules

- component values use prior report-stage rounding
- retained profit display rounds to 2 decimal places
- no secondary sign-based transformation or hidden rounding should be added

## 12. Commission rules

- no direct commission formula in this contract
- commission effects enter only through upstream betting P&L totals

## 13. Liability/exposure rules

- not a liability calculation directly
- retained profit must not be mislabelled as current liability, bankroll, or cash snapshot

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Positive betting week, no deductions | no negative adjustment components | `total_betting_pnl` | Yes | Yes |
| Week with withdrawals | signed withdrawals included | `total_betting_pnl + withdrawals_value` | Yes | Yes |
| Week with costs/subscriptions | signed costs included | `total_betting_pnl + costs_and_subscriptions_value` | Yes | Yes |
| Week with both | both components included | `total_betting_pnl + withdrawals_value + costs_and_subscriptions_value` | Yes | Yes |

## 15. Status and reporting inclusion

- open positions:
  - inherited from upstream reporting contracts
- overdue positions:
  - not directly part of this contract
- current-value reports:
  - possible if upstream weekly totals use workbook-parity current-value logic
- realised P&L reports:
  - future separate mode `To confirm`
- selected date range:
  - not the main driver here; this is formal period reporting
- weekly summary:
  - direct contract scope
- monthly summary:
  - derived using the same signed-value semantics
- profile overview:
  - may consume retained profit as a headline metric
- cross-profile comparison:
  - headline totals only, still profile-isolated at source

## 16. Fixtures required

- positive betting week with no adjustments
- week with withdrawal only
- week with subscription/deduction only
- week with both withdrawal and costs
- legacy `Costs` report-support case
- profile isolation case

## 17. Test cases

- `retained_profit_equals_betting_pnl_when_no_adjustments_exist`
- `retained_profit_adds_signed_withdrawals_without_flipping_sign`
- `retained_profit_adds_signed_costs_without_flipping_sign`
- `retained_profit_supports_combined_negative_adjustments`
- `retained_profit_supports_legacy_costs_category_for_reports`
- `retained_profit_is_profile_scoped`

## 18. Acceptance tolerance

- money tolerance: exact to 0.01

## 19. UI display requirements

- present retained profit as distinct from total betting P&L
- do not relabel withdrawals or costs as profit components
- if negative cash-adjustment components reduce retained profit, that relationship should remain understandable in the UI

## 20. Audit trail requirements

- selected `profile_id`
- period type and period start
- component totals used
- contract version
- timestamp

## 21. Human approval

- reviewer: To confirm
- review date: To confirm
- approval outcome: Pending
- follow-up required before implementation:
  - confirm whether retained profit should later appear in both profile dashboards and formal reports, or remain report-first in MVP
