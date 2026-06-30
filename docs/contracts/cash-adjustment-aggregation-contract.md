# Calculation Contract: Cash Adjustment Aggregation

_Last updated: 2026-06-30_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: To confirm
- Related spreadsheet source: `Cash Adjustments`, `Dashboard`, `Reports`
- Related source-pack file: `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- Related issue/task: `Write calculation contract for cash adjustment aggregation`

## 1. Product context

- Application: OpenForge
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `cash_adjustments`
- Required `profile_id` handling: all cash adjustments and aggregates must remain scoped to one selected profile unless explicitly producing cross-profile headline totals
- Fund Manager visible? Yes, through profile aggregates
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation defines:

- signed cash-adjustment value
- date-range inclusion
- weekly rollup grouping
- dashboard cash-adjustment aggregate logic
- report withdrawals/costs/subscriptions contribution

It supports:

- cash adjustment row value
- dashboard selected-range cash adjustment summary
- weekly/monthly/yearly reporting
- retained profit reporting
- profile overview derived deductions and top-ups

## 3. Workflow context

- encountered when the operator records non-bet cash movement
- recalculated when date, direction, amount, type, or selected date range changes
- shown in cash-adjustment rows, dashboard summaries, reports, and profit tracker

## 4. Spreadsheet equivalent

- Sheet: `Cash Adjustments`
- Key columns:
  - `B AdjustmentDate`
  - `C Direction`
  - `D Amount`
  - `E AdjustmentType`
  - `F AffectsInvestment`
  - `G AffectsCashSnapshot`
  - `J SignedAmount`
  - `K Date Range Tag`
  - `L WeekLabel`
- Representative formulas:
  - `SignedAmount = IF(Direction="In", Amount, -Amount)`
  - `Date Range Tag` derived from dashboard resolved start/end
  - `WeekLabel = "W/C " & TEXT(AdjustmentDate - WEEKDAY(AdjustmentDate,2) + 1, "dd/mm/yyyy")`
- Dashboard combines signed amounts for selected types
- Reports use signed amounts for withdrawals and costs/subscriptions

## 5. Cash-first/current-value behaviour

- This contract supports cash-first bankroll interpretation by recording real cash movement outside bet settlement
- Applies before settlement: Yes, because adjustments are direct cash events
- Calculates multiple scenario outcomes: No
- Value shown for rows:
  - signed adjustment value
- Conservative `MIN()` style outcome used: No
- Current/projected vs final/settled separation:
  - not scenario-based; row value is direct signed cash movement
- Reports before/after settlement:
  - adjustments are included directly by date/type rules

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | required isolation key |
| `record_id` | string | Yes | row key | entered/system | Yes | workbook/app row identifier |
| `adjustment_date` | date | Yes | adjustment row | entered | Yes | reporting date |
| `direction` | enum | Yes | adjustment row | entered | Yes | `In` or `Out` |
| `amount` | money | Yes | adjustment row | entered | Yes | unsigned user-entered value |
| `adjustment_type` | enum | Yes | adjustment row | entered | Yes | `Correction`, `Deduction`, `Deposit`, `Subscription`, `TopUp`, `Withdrawal` |
| `affects_investment` | boolean | No | adjustment row | entered | Yes | investment/roll-forward flag |
| `affects_cash_snapshot` | boolean | No | adjustment row | entered | Yes | cash snapshot flag |
| `linked_account` | string/id | No | adjustment row | entered | Yes | optional account link |
| `description` | text | No | adjustment row | entered | Yes | notes |
| `resolved_start_date` | date | No | dashboard context | derived | Yes | for date-range tag |
| `resolved_end_date` | date | No | dashboard context | derived | Yes | for date-range tag |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `signed_amount` | money | row/dashboard/reports | direct current value | derived | positive or negative cash movement |
| `date_range_tag` | enum | dashboard/filtering | helper | derived | `In Date Range` or `Out of Date Range` |
| `week_label` | string | reports | helper | derived | week commencing label |
| `dashboard_cash_adjustment_value` | money | dashboard | selected-range aggregate | derived | selected types only |
| `report_withdrawals_value` | money | reports | selected-range aggregate | derived | withdrawal rows only |
| `report_costs_subscriptions_value` | money | reports | selected-range aggregate | derived | subscription/deduction/costs rows |

## 8. Formula source

- current tracker workbook formula
- cash-first calculation spec
- dashboard/report formulas

## 9. Formula

Signed amount:

- `signed_amount = amount` when `direction = In`
- `signed_amount = -amount` when `direction = Out`

Date-range tag:

- if `adjustment_date` falls between dashboard resolved start and end dates:
  - `In Date Range`
- else:
  - `Out of Date Range`

Week label:

- `week_label = "W/C " + week_commencing(adjustment_date)`

Dashboard cash-adjustment aggregate:

- sum signed amounts for selected-range adjustments of types:
  - `Deduction`
  - `Withdrawal`
  - `Subscription`
  - `TopUp`

Report aggregates:

- withdrawals:
  - selected/grouped `signed_amount` where `adjustment_type = Withdrawal`
- costs and subscriptions:
  - selected/grouped `signed_amount` where type matches `Subscription`, `Deduction`, and optionally `Costs` if later introduced

## 10. Assumptions

- user-entered `amount` is unsigned and direction determines sign
- `Costs` appears in some report regex behaviour even though the current adjustment-type list emphasises `Correction`, `Deduction`, `Deposit`, `Subscription`, `TopUp`, `Withdrawal`; this should remain `To confirm`
- dashboard selected cash-adjustment view is intentionally not all adjustment types

## 11. Rounding rules

- signed amount rounding: 2 decimal places
- displayed decimals: 2
- stored precision: To confirm

## 12. Commission rules

- not applicable

## 13. Liability/exposure rules

- not applicable directly
- adjustments can affect cash snapshot and retained profit, but do not create lay liability

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Cash in | `direction = In` | `+amount` | Yes | Yes |
| Cash out | `direction = Out` | `-amount` | Yes | Yes |

## 15. Status and reporting inclusion

- open positions: not applicable
- overdue positions: not applicable
- current-value reports:
  - include signed cash movements by date range
- realised P&L reports:
  - do not confuse adjustment value with bet P&L
- selected date range:
  - governed by dashboard resolved date range
- weekly summary:
  - grouped by `week_label`
- monthly summary:
  - aggregated from weekly/date groupings
- profile overview:
  - contributes to deductions/top-ups/withdrawals style summaries
- cross-profile comparison:
  - headline aggregates only

## 16. Fixtures required

- incoming top-up case
- outgoing withdrawal case
- subscription/deduction case
- out-of-range case
- profile isolation case

## 17. Test cases

- `cash_adjustment_signed_amount_uses_direction`
- `cash_adjustment_date_range_tag_matches_dashboard_range`
- `cash_adjustment_week_label_matches_week_commencing`
- `dashboard_cash_adjustment_sum_uses_selected_types`
- `cash_adjustment_profile_scope_prevents_cross_profile_reads`

## 18. Acceptance tolerance

- signed amount tolerance: exact to 0.01
- aggregate tolerance: exact to 0.01

## 19. UI display requirements

- show direction and signed financial impact clearly
- top-ups and withdrawals should be distinguishable by type, not only sign
- dashboard summaries should label these as cash adjustments, not profit

## 20. Audit trail requirements

- input snapshot
- contract version
- timestamp
- acting user
- affected `profile_id`

## 21. Human approval

- reviewer: To confirm
- review date: To confirm
- approval outcome: Pending
- follow-up required before implementation:
  - confirm handling of `Costs` in adjustment/report taxonomy
