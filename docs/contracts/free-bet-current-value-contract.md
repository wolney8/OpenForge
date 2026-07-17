# Calculation Contract: Free Bet Cash-First Current Value

_Last updated: 2026-06-30_

## 0. Contract status

- Status: Approved implementation baseline through prior contract review and workbook-parity sign-off
- Owner: Plum Duff calculation contracts
- Human approval required before formula changes: Yes
- Related workflow contract: To confirm
- Related spreadsheet source: `Free Bets`
- Related source-pack file: `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- Related issue/task: `Write calculation contract for free bet cash-first current value`

## 1. Product context

- Application: Plum Duff
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `free_bets`
- Required `profile_id` handling: every free-bet row, audit row, and query path must remain scoped to one selected profile
- Fund Manager visible? Indirectly through profile aggregates only
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation determines the current or final money value of a free-bet row.

It supports:

- free-bet row value
- expiry and overdue monitoring
- dashboard selected-range P&L
- dashboard open-position and liability views
- weekly/monthly reporting
- profile overview derived profit metrics

## 3. Workflow context

- encountered when a free bet becomes available, is placed, or is settled
- recalculated during open-state and settlement-state review
- shown in free-bet rows, dashboard summaries, reports, and profit tracker
- used after entry of retention mode, free-bet value, odds, strategy, and result

## 4. Spreadsheet equivalent

- Sheet: `Free Bets`
- Key columns:
  - `J Status`
  - `K Result`
  - `L ExpiryDateTime`
  - `M FreeBetRetentionMode`
  - `N FreeBetValue`
  - `O BackOdds`
  - `P MatchStrategy`
  - `Q LayOdds1`
  - `S Exchange`
  - `T Lay (Actual)`
  - `V LayStake1`
  - `W LayStatus`
  - `X Liability1`
  - `Y PnL If Bookie Wins / Outcome 1 Wins`
  - `Z PnL If Bookie Loses / No Selection Wins`
  - `AA CalcNetPnL`
  - `AB NetPnL`
  - `AC FinalNetPnL`
- Formula is calculated with optional manual override via `FinalNetPnL`
- Current workbook uses conservative `MIN()` behaviour for open/pending rows

## 5. Cash-first/current-value behaviour

- Question answered: what is this free-bet row worth to the bankroll right now?
- Applies before settlement: Yes
- Calculates multiple scenario outcomes: Yes
- Value shown for open/pending rows:
  - conservative minimum of bookie-win and lay-win scenario values
- Conservative `MIN()` style outcome used: Yes
- Current/projected vs final/settled separation:
  - `CalcNetPnL` is current or result-based formula value
  - `FinalNetPnL` is manual override
  - displayed/stored resolved value is `NetPnL`
- Reports before settlement:
  - can include current conservative `NetPnL` if row is inside selected date range
- Reports after settlement:
  - include result-resolved `NetPnL`, unless manually overridden

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived from selected profile | Yes | mandatory isolation key |
| `record_id` | string | Yes | row key | entered/system | Yes | workbook/app row identifier |
| `date_settled` | date | No | free-bet row | entered | Yes | reporting date |
| `expiry_datetime` | datetime | No | free-bet row | entered | Yes | overdue logic |
| `status` | enum | Yes | free-bet row | entered | Yes | includes `Prospecting`, `Available`, `Placed`, `Settled` style states |
| `result` | enum | Yes | free-bet row | entered | Yes | selects settled scenario |
| `retention_mode` | enum | Yes | free-bet row | entered | Yes | `SNR` or `SR` |
| `free_bet_value` | money | Yes | free-bet row | entered | Yes | main value input |
| `back_odds` | decimal | Yes | free-bet row | entered | Yes | main odds input |
| `match_strategy` | enum | Yes | free-bet row | entered | Yes | `Standard`, `Underlay`, `Overlay`, `Custom`, `No Lay`, `Partial Lay` |
| `lay_odds_1` | decimal | No | free-bet row | entered | Yes | required except some no-lay/custom cases |
| `exchange` | string | No | free-bet row | entered | Yes | commission lookup |
| `lay_actual` | money | No | free-bet row | entered/override | Yes | takes precedence when supplied |
| `lay_matched_stake_1` | money | No | free-bet row | entered | Yes | part-laid tracking |
| `lay_commission_1` | decimal | No | lookup | calculated | Yes | exchange commission |
| `underlay_factor` | decimal | No | settings | derived | Yes | workbook settings default |
| `overlay_factor` | decimal | No | settings | derived | Yes | workbook settings default |
| `manual_override_value` | money | No | free-bet row | entered/override | Yes | workbook `FinalNetPnL` equivalent |
| `manual_override_reason` | text | No | app audit | entered | Yes | required in app if override used |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `base_reference_lay_stake` | money | free-bet row/audit | reference | derived | depends on `SNR/SR` |
| `underlay_reference_lay_stake` | money | free-bet row/audit | reference | derived | settings-driven |
| `overlay_reference_lay_stake` | money | free-bet row/audit | reference | derived | settings-driven |
| `actual_lay_stake_1` | money | free-bet row | entered/resolved | derived from override or strategy | Yes |
| `calculated_liability_1` | money | free-bet row/dashboard | current/final support | derived | lay liability |
| `scenario_pnl_if_back_wins` | money | free-bet row/audit | scenario | derived | depends on `SNR/SR` |
| `scenario_pnl_if_lay_wins` | money | free-bet row/audit | scenario | derived | lay-side scenario |
| `projected_current_pnl` | money | free-bet row/dashboard/reports | current/projected | derived | workbook `CalcNetPnL` for open rows |
| `actual_net_pnl` | money | free-bet row/reports | final/settled | derived | result-based formula before override |
| `final_net_pnl` | money | free-bet row/reports | final/settled | override or derived | resolved `NetPnL` |
| `reporting_value` | money | dashboard/reports/profile summaries | current or final | derived | resolved `NetPnL` |
| `lay_status` | enum | free-bet row/dashboard | operational | derived | `Not Laid`, `Part Laid`, `Fully Laid` |
| `counts_as_open` | boolean | dashboard | operational | derived | open-state helper |
| `is_overdue` | boolean | dashboard | operational | derived | expiry helper |

## 8. Formula source

- current tracker workbook formula
- tracker formula appendix
- cash-first calculation spec

If formula differs from common matched-betting calculators, the workbook wins because OpenForge is preserving tracker behaviour rather than generic calculator output.

## 9. Formula

Base lay stake formulas:

- if `retention_mode = SNR`:
  - `base_reference_lay_stake = round((free_bet_value * (back_odds - 1)) / (lay_odds_1 - commission_1), 2)`
- if `retention_mode = SR`:
  - `base_reference_lay_stake = round((free_bet_value * back_odds) / (lay_odds_1 - commission_1), 2)`

Strategy formulas:

- `Standard` uses `base_reference_lay_stake`
- `Underlay` uses `round(base_reference_lay_stake * underlay_factor, 2)`
- `Overlay` uses `round(base_reference_lay_stake * overlay_factor, 2)`
- `No Lay` uses `0`
- `Custom` and `Partial Lay` remain unresolved unless enough actual/manual lay information exists
- actual lay value overrides formula output when supplied

Liability:

- `liability_1 = round(lay_stake_1 * (lay_odds_1 - 1), 2)`

Scenario formulas:

- no-lay `SNR` back wins:
  - `round(free_bet_value * (back_odds - 1), 2)`
- no-lay `SR` back wins:
  - `round(free_bet_value * back_odds, 2)`
- laid `SNR` back wins:
  - `round((free_bet_value * (back_odds - 1)) - liability_1, 2)`
- laid `SR` back wins:
  - `round((free_bet_value * back_odds) - liability_1, 2)`
- no-lay lose branch:
  - `0`
- laid lose branch:
  - `round(lay_stake_1 * (1 - commission_1), 2)` using workbook branch logic

Current-value formula:

- if row is open/pending:
  - `min(scenario_pnl_if_back_wins, scenario_pnl_if_lay_wins)`

Final/settled formula:

- if settled:
  - bookie/back win selects back-win scenario
  - lay/lose selects lay-win scenario
  - `Void` resolves to `0`

Manual override handling:

- if `manual_override_value` exists, resolved output becomes that value
- app must require override reason

Error/blank handling:

- missing required numeric inputs produce blank/unresolved formula outputs rather than guessed values

## 10. Assumptions

- commission values are decimal ratios such as `0.02`, following workbook behaviour
- `underlay_factor` and `overlay_factor` come from workbook settings defaults unless later overridden by approved app settings
- `Partial Lay` and `Custom` remain unresolved unless enough actual lay information exists
- no-lay free-bet lose branch remains `0`, following workbook behaviour

## 11. Rounding rules

- lay stake rounding: 2 decimal places
- liability rounding: 2 decimal places
- P&L rounding: 2 decimal places
- displayed decimals: 2 for money
- stored precision: To confirm, but should preserve at least workbook precision expectations
- currency formatting: display-only
- rounding should follow workbook business logic, not just UI formatting

## 12. Commission rules

- commission source: exchange lookup from `CommissionDefaults`
- default commission: from workbook settings/lookup, not hard-coded generic assumption
- per-exchange override: Yes
- commission applies to lay-side returns
- commission does not apply when there is no lay branch
- commission affects both lay-stake sizing and lay-win scenario outcomes

## 13. Liability/exposure rules

- `liability_1 = lay_stake_1 * (lay_odds_1 - 1)`
- profile-specific exposure is derived from open sportsbook and free-bet liabilities
- cross-profile exposure aggregation is allowed only in derived overview screens
- open-position inclusion rule: `Prospecting`, `Available`, and `Placed`
- overdue inclusion rule: `counts_as_open = true` and `expiry_datetime < now`

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Back wins SNR | `Back Won`, `Win` and `retention_mode = SNR` | workbook SNR back-win formula | Yes | Yes |
| Back wins SR | `Back Won`, `Win` and `retention_mode = SR` | workbook SR back-win formula | Yes | Yes |
| Lay wins / lose | `Lay Won`, `Lose` | workbook lay-win formula | Yes | Yes |
| Void | `Void` | `0` | No | Yes |
| Manual override | override entered | override replaces resolved value | N/A | Yes |

## 15. Status and reporting inclusion

- open positions:
  - `Prospecting`
  - `Available`
  - `Placed`
- overdue positions:
  - `counts_as_open = true` and `expiry_datetime < now`
- current-value reports:
  - include rows in date range whose resolved `NetPnL` is current conservative value
- realised P&L reports:
  - To confirm if a dedicated settled-only report mode is needed in MVP
- selected date range:
  - based on dashboard resolved range and row date
- weekly summary:
  - by derived `WeekLabel`
- monthly summary:
  - aggregated from weekly/date-based rollup
- profile overview:
  - may consume resolved free-bet `NetPnL`
- cross-profile comparison:
  - headline aggregates only, no row mixing

## 16. Fixtures required

- minimum valid `SNR` standard lay case
- minimum valid `SR` standard lay case
- open/pending `SNR` case
- open/pending `SR` case
- settled back-win case
- settled lay-win case
- void case
- manual override case
- no-lay case
- partial/custom lay unresolved case
- profile isolation case

## 17. Test cases

- `free_bet_current_value_snr_open_uses_minimum_scenario`
- `free_bet_current_value_sr_open_uses_minimum_scenario`
- `free_bet_final_value_back_win_matches_retention_mode`
- `free_bet_final_value_lay_win_matches_lay_scenario`
- `free_bet_void_resolves_zero`
- `free_bet_manual_override_replaces_formula_value`
- `free_bet_profile_scope_prevents_cross_profile_reads`

## 18. Acceptance tolerance

- lay stake tolerance: exact to 0.01
- liability tolerance: exact to 0.01
- P&L tolerance: exact to 0.01
- display tolerance: none beyond formatting

## 19. UI display requirements

- users must see that free bets can have current value before settlement
- `SNR` vs `SR` must be visible because it changes the value model
- projected/current and final/settled values must not be silently conflated
- overrides must be visibly marked
- expiry and overdue state should be visible

## 20. Audit trail requirements

- input snapshot
- contract version
- override reason
- timestamp
- acting user
- affected `profile_id`

## 21. Human approval

- reviewer: To confirm
- review date: To confirm
- approval outcome: Pending
- follow-up required before implementation:
  - confirm whether settled-only reporting mode is required in MVP
  - confirm storage precision expectations
