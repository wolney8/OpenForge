# Calculation Contract: Free-Bet Weekly Reporting

_Last updated: 2026-06-30_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: `docs/workflows/free-bet-workflow-contract.md`
- Related spreadsheet source: `Free Bets`, `Reports`, `Dashboard`
- Related source-pack file: `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- Related issue/task: `Write calculation contract for free-bet weekly reporting`

## 1. Product context

- Application: OpenForge
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `free_bets`
- Required `profile_id` handling: weekly report rows must only include free-bet rows for the selected profile unless explicitly producing approved cross-profile headline summaries
- Fund Manager visible? Yes, through aggregated profile metrics only
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation defines workbook-parity weekly free-bet P&L reporting.

It supports:

- weekly report summary
- monthly rollup source data
- selected profile reporting
- reconciliation between free-bet ledger rows and formal reports

It does not define the row-level free-bet current-value calculation itself.

## 3. Workflow context

- encountered during report review
- recalculated when free-bet row values, statuses, dates, or overrides change
- shown in the `Reports` surface and any future per-profile weekly report view
- reporting-time logic, not row-entry-time logic

## 4. Spreadsheet equivalent

- Primary sheets:
  - `Free Bets`
  - `Reports`
- Representative workbook behaviour:
  - weekly free-bet P&L filters rows where:
    - `DateSettling >= WeekStart`
    - `DateSettling < WeekStart + 7`
    - `Status` matches `Placed` or `Settled`
  - reporting value resolves:
    - `FinalNetPnL` when present
    - otherwise `NetPnL`
- Known workbook caveat:
  - weekly free-bet reporting is narrower than general dashboard/profit-review selected-range visibility

## 5. Cash-first/current-value behaviour

- Question answered: what free-bet value belongs in this formal reporting week for this profile?
- Applies before settlement: Sometimes, because workbook reporting can include `Placed` rows
- Calculates multiple scenario outcomes: Indirectly, by consuming row-level `NetPnL`
- Value shown for open/pending rows:
  - only if row status is included by the weekly reporting filter
- Conservative `MIN()` style outcome used:
  - indirectly through row-level free-bet `NetPnL`
- Current/projected vs final/settled separation:
  - reporting uses `FinalNetPnL` when present
  - otherwise it uses the calculated row `NetPnL`
- What reports include before settlement:
  - workbook-parity weekly free-bet report may include `Placed` rows
- What reports include after settlement:
  - settled rows remain included through the same status filter

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | required isolation key |
| `week_start_date` | date | Yes | report context | derived | Yes | start of reporting week |
| `free_bet_id` | string | Yes | ledger row | entered/system | Yes | row identity |
| `date_settled` | date | Yes | ledger row | entered | Yes | reporting boundary date |
| `status` | enum | Yes | ledger row | entered | Yes | free-bet workflow status |
| `net_pnl` | money | Yes | ledger row | derived | Yes | row current/final calculated value |
| `final_net_pnl` | money | No | ledger row | override | Yes | row override value |
| `week_label` | string | No | ledger helper | derived | Yes | helper only; not required if date logic is recomputed |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `weekly_free_bet_reporting_value` | money | reports | resolved reporting aggregate | derived | weekly profile total |
| `included_row_count` | integer | testing/audit | helper | derived | optional audit helper |
| `excluded_row_count` | integer | testing/audit | helper | derived | optional audit helper |

## 8. Formula source

- current tracker workbook formula
- cash-first calculation spec
- workbook reporting parity findings

## 9. Formula

Included row rule:

- include row when:
  - `profile_id` matches selected profile
  - `date_settled >= week_start_date`
  - `date_settled < week_start_date + 7 days`
  - `status` matches `Placed` or `Settled`

Row reporting value:

- `row_reporting_value = final_net_pnl` when `final_net_pnl` is not blank
- otherwise `row_reporting_value = net_pnl`

Weekly total:

- `weekly_free_bet_reporting_value = sum(row_reporting_value for all included rows)`

Blank/error handling:

- blank `date_settled` excludes the row
- unsupported status excludes the row

## 10. Assumptions

- workbook weekly free-bet reporting intentionally includes `Placed` rows
- weekly reporting status rules are distinct from generic tracker visibility rules
- `Converted` and `Available` are not part of the confirmed weekly inclusion rule from the current workbook
- monthly reporting will consume this weekly value rather than re-derive a different rule directly from raw rows

## 11. Rounding rules

- row values follow row-level rounding already applied in the free-bet ledger
- weekly aggregate display rounds to 2 decimal places
- no hidden extra rounding step should be introduced between row resolution and aggregation

## 12. Commission rules

- no direct commission formula in this contract
- commission effects are inherited through row-level `NetPnL`

## 13. Liability/exposure rules

- not a liability calculation directly
- rows included here may still represent current-value positions rather than settled-only outcomes
- profile isolation remains mandatory

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Placed row in week | `status = Placed` and week match | resolved row reporting value | Yes | N/A |
| Settled row in week | `status = Settled` and week match | resolved row reporting value | N/A | Yes |
| Available/prospecting row | status outside weekly filter | excluded | No | No |
| Override row | `final_net_pnl` present | use `final_net_pnl` | Yes | Yes |

## 15. Status and reporting inclusion

- open positions:
  - not defined by this contract directly
- overdue positions:
  - not defined by this contract directly
- current-value reports:
  - possible through included `Placed` rows
- realised P&L reports:
  - mixed with current-value logic in workbook parity mode
- selected date range:
  - separate from this formal weekly rule
- weekly summary:
  - this contract is the source rule
- monthly summary:
  - should roll up this weekly result
- profile overview:
  - may consume headline weekly totals
- cross-profile comparison:
  - headline aggregates only, never mixed row access

## 16. Fixtures required

- placed row in reporting week
- settled row in reporting week
- available/prospecting row excluded case
- override value case
- out-of-week exclusion case
- profile isolation case

## 17. Test cases

- `free_bet_weekly_report_includes_placed_rows`
- `free_bet_weekly_report_includes_settled_rows`
- `free_bet_weekly_report_excludes_non_reporting_statuses`
- `free_bet_weekly_report_prefers_final_net_pnl_override`
- `free_bet_weekly_report_excludes_out_of_week_rows`
- `free_bet_weekly_report_is_profile_scoped`

## 18. Acceptance tolerance

- money aggregate tolerance: exact to 0.01
- row inclusion tolerance: exact

## 19. UI display requirements

- do not label this value as settled-only unless the logic is deliberately changed later
- reporting UI should make clear that workbook-parity weekly free-bet P&L may include `Placed` rows
- if a future realised-only report mode is added, it must be explicitly separate

## 20. Audit trail requirements

- selected `profile_id`
- week start date
- included row identifiers
- excluded row identifiers when debugging/audit mode is enabled
- contract version
- timestamp

## 21. Human approval

- reviewer: To confirm
- review date: To confirm
- approval outcome: Pending
- follow-up required before implementation:
  - confirm whether a later non-parity realised-only free-bet weekly report should exist alongside this workbook-parity mode
