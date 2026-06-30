# Calculation Contract: Liability And Exposure Aggregation

_Last updated: 2026-06-30_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: To confirm
- Related spreadsheet source: `Sportsbook Bets`, `Free Bets`, `Dashboard`
- Related source-pack file: `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- Related issue/task: `Write calculation contract for liability/exposure calculation`

## 1. Product context

- Application: OpenForge
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `sportsbook_bets`, `free_bets`
- Required `profile_id` handling: all liability and exposure aggregation must be filtered by selected `profile_id`
- Fund Manager visible? Yes, but only as aggregated profile metrics
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation defines:

- per-row liability for lay-backed tracker rows
- profile-level current liability
- profile-level open exposure summary for dashboard/reporting use

It supports:

- sportsbook row detail
- free-bet row detail
- dashboard current liability summary
- open-position risk visibility
- profile overview risk indicators

## 3. Workflow context

- encountered during sportsbook/free-bet entry and review
- recalculated whenever lay stake, lay odds, status, or profile context changes
- shown on row detail and dashboard risk summaries
- used during open-state review rather than only settlement

## 4. Spreadsheet equivalent

- Sheets:
  - `Sportsbook Bets`
  - `Free Bets`
  - `Dashboard`
- Representative row formulas:
  - sportsbook `Liability1 = ROUND(LayStake1 * (LayOdds1 - 1), 2)`
  - free-bet `Liability1 = ROUND(LayStake1 * (LayOdds1 - 1), 2)`
- Dashboard aggregate formula behaviour:
  - `SUMIFS(SportsbookBets[Liability1], SportsbookBets[CountsAsOpen], TRUE)`
  - `+ SUMIFS(FreeBets[Liability1], FreeBets[CountsAsOpen], TRUE)`
- Current workbook focuses on first liability branch in dashboard aggregate logic
- Known workbook caveat:
  - dashboard current liability formula appears to aggregate open sportsbook `Liability1` and open free-bet `Liability1`; handling of multi-lay `Liability2` and `Liability3` for dashboard exposure needs explicit confirmation

## 5. Cash-first/current-value behaviour

- This contract does not compute P&L directly, but it supports the cash-first question by showing how much bankroll is currently at risk
- Applies before settlement: Yes
- Calculates multiple scenario outcomes: No, but consumes row-level liability branches
- Value shown for open/pending rows:
  - active liability from open rows
- Conservative `MIN()` style outcome used: No
- Current/projected vs final/settled separation:
  - liability is an open-state risk measure, not settled P&L
- Reports before settlement:
  - may include current liability and open exposure
- Reports after settlement:
  - settled rows should stop contributing if no longer open

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | required isolation key |
| `record_id` | string | Yes | row key | entered/system | Yes | per-row reference |
| `row_type` | enum | Yes | ledger type | derived | Yes | sportsbook or free_bet |
| `status` | enum | Yes | row | entered | Yes | open-state inclusion |
| `counts_as_open` | boolean | Yes | row helper | calculated | Yes | open-state inclusion flag |
| `lay_stake_1` | money | No | row | derived/entered | Yes | liability input |
| `lay_odds_1` | decimal | No | row | entered | Yes | liability input |
| `lay_stake_2` | money | No | row | derived/entered | Yes | multi-lay branch |
| `lay_odds_2` | decimal | No | row | entered | Yes | multi-lay branch |
| `lay_stake_3` | money | No | row | derived/entered | Yes | multi-lay branch |
| `lay_odds_3` | decimal | No | row | entered | Yes | multi-lay branch |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `calculated_liability_1` | money | row/dashboard | current/open | derived | first lay branch |
| `calculated_liability_2` | money | row/detail | current/open | derived | multi-lay branch |
| `calculated_liability_3` | money | row/detail | current/open | derived | multi-lay branch |
| `row_total_liability` | money | row/detail | current/open | derived | sum of active liabilities |
| `profile_current_liability` | money | dashboard/profile overview | current/open | derived | workbook-style aggregate baseline |
| `profile_open_position_count` | integer | dashboard/profile overview | current/open | derived | related risk count |
| `profile_overdue_count` | integer | dashboard/profile overview | current/open | derived | related risk count |

## 8. Formula source

- current tracker workbook formula
- cash-first calculation spec
- dashboard aggregate formulas

## 9. Formula

Per-row liability:

- `liability_i = round(lay_stake_i * (lay_odds_i - 1), 2)` where both values exist

Per-row total liability:

- `row_total_liability = sum(all active liability branches for the row)`

Dashboard/profile current liability baseline:

- workbook baseline:
  - `sum(open sportsbook liability_1) + sum(open free_bet liability_1)`

Open exposure inclusion:

- include only rows where `counts_as_open = true`

Error/blank handling:

- if lay stake or odds are missing, branch liability is blank or zero-equivalent for aggregate purposes

## 10. Assumptions

- row-level liability formulas apply equally to sportsbook and free-bet lay branches
- current dashboard aggregate uses first-liability branch only
- whether dashboard exposure should evolve to `row_total_liability` for multi-lay rows is `To confirm`

## 11. Rounding rules

- liability rounding: 2 decimal places
- displayed decimals: 2
- stored precision: To confirm
- rounding follows workbook row formula behaviour

## 12. Commission rules

- commission affects lay stake sizing and scenario values, but not the liability formula itself once lay stake is resolved

## 13. Liability/exposure rules

- profile-specific exposure must be isolated by `profile_id`
- cross-profile exposure is allowed only as a derived aggregate in fund-manager screens
- open-position inclusion rule:
  - sportsbook `Prospecting`, `Not Placed`, `Placed`
  - free-bet `Prospecting`, `Available`, `Placed`
- overdue inclusion follows each row's helper logic

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Open sportsbook liability | sportsbook row open | branch liability formula | Yes | No |
| Open free-bet liability | free-bet row open | branch liability formula | Yes | No |
| Settled row | row no longer open | excluded from exposure aggregate | No | No |

## 15. Status and reporting inclusion

- open positions:
  - include rows with `counts_as_open = true`
- overdue positions:
  - include rows with `is_overdue = true`
- current-value reports:
  - may include current liability
- realised P&L reports:
  - liability should not replace realised P&L
- profile overview:
  - may expose current liability/open exposure summary
- cross-profile comparison:
  - headline risk aggregates only

## 16. Fixtures required

- open sportsbook row with liability
- open free-bet row with liability
- open multi-lay sportsbook row
- settled row excluded from aggregate
- profile isolation case

## 17. Test cases

- `liability_single_branch_matches_row_formula`
- `liability_multi_branch_row_total_sums_active_branches`
- `profile_current_liability_includes_open_rows_only`
- `profile_current_liability_excludes_other_profiles`
- `overdue_and_open_counts_follow_helper_flags`

## 18. Acceptance tolerance

- liability tolerance: exact to 0.01
- aggregate tolerance: exact to 0.01

## 19. UI display requirements

- show current liability as open risk, not as profit or loss
- if profile overview exposes liability, label it clearly as open exposure/current liability
- multi-lay rows should allow branch inspection in row detail

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
  - confirm whether dashboard aggregate should remain workbook-parity `Liability1` only or evolve to full row-total liability for multi-lay rows
