# Calculation Contract: Sportsbook Cash-First Current Value

_Last updated: 2026-06-30_

## 0. Contract status

- Status: Approved implementation baseline through prior contract review and workbook-parity sign-off
- Owner: Plum Duff calculation contracts
- Human approval required before formula changes: Yes
- Related workflow contract: To confirm
- Related spreadsheet source: `Sportsbook Bets`
- Related source-pack file: `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- Related issue/task: `Write calculation contract for sportsbook cash-first current value`

## 1. Product context

- Application: Plum Duff
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `sportsbook_bets`
- Required `profile_id` handling: every sportsbook row, audit row, and query path must remain scoped to one selected profile
- Fund Manager visible? Indirectly through profile aggregates only
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation determines the current or final money value of a sportsbook row.

It supports:

- sportsbook/qualifying bet row value
- mug-bet/no-lay row value
- dashboard selected-range P&L
- dashboard open-position and liability views
- weekly/monthly reporting
- profile overview derived profit metrics

## 3. Workflow context

- encountered on sportsbook bet entry and review
- recalculated at open-state, settlement-state, and reporting-time
- shown in sportsbook rows, dashboard summaries, reports, and profit tracker
- used after stake/odds/strategy input and again after result entry

## 4. Spreadsheet equivalent

- Sheet: `Sportsbook Bets`
- Key columns:
  - `M BackStake`
  - `N BackOdds`
  - `O MatchStrategy`
  - `P LayOdds1`
  - `R Exchange`
  - `S Lay (Actual)`
  - `U LayStake1`
  - `W Liability1`
  - `X PnL If Bookie Wins / Outcome 1 Wins`
  - `Y PnL If Bookie Loses / No Selection Wins`
  - `Z CalcNetPnL`
  - `AA NetPnL`
  - `AD FinalNetPnL`
  - `AM/AN/AO/AP` and `AQ/AR/AS/AT` for multi-lay branches
- Formula is calculated, with optional manual override via `FinalNetPnL`
- Current workbook uses conservative `MIN()` behaviour for open/pending rows
- Known workbook caveat:
  - `OfferType` equal to `None` or `Mug Bet` with `No Lay` may currently act like cash return rather than pure profit on the win branch and requires explicit review before implementation

## 5. Cash-first/current-value behaviour

- Question answered: what is this sportsbook row worth to the bankroll right now?
- Applies before settlement: Yes
- Calculates multiple scenario outcomes: Yes
- Value shown for open/pending rows:
  - single-lay style rows use the conservative minimum of primary scenario outcomes
  - multi-lay style rows use the conservative minimum across all active scenario outcomes
- Conservative `MIN()` style outcome used: Yes
- Current/projected vs final/settled separation:
  - `CalcNetPnL` is current or result-based formula value
  - `FinalNetPnL` is manual override
  - displayed/stored resolved value is `NetPnL`
- Reports before settlement:
  - can include current conservative `NetPnL` if row falls in the selected date range
- Reports after settlement:
  - include result-resolved `NetPnL`, unless manually overridden

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived from selected profile | Yes | mandatory isolation key |
| `record_id` | string | Yes | row key | entered/system | Yes | workbook/app row identifier |
| `date_settled` | date | No | sportsbook row | entered | Yes | used for reporting and overdue |
| `status` | enum | Yes | sportsbook row | entered | Yes | includes open-state statuses |
| `result` | enum | Yes | sportsbook row | entered | Yes | selects settled scenario |
| `offer_type` | enum | No | sportsbook row | entered | Yes | affects no-lay/mug-bet branch |
| `bet_type` | enum | No | sportsbook row | entered | Yes | informational for this contract |
| `back_stake` | money | Yes | sportsbook row | entered | Yes | main stake |
| `back_odds` | decimal | Yes | sportsbook row | entered | Yes | main price |
| `match_strategy` | enum | Yes | sportsbook row | entered | Yes | `Standard`, `Underlay`, `Overlay`, `Custom`, `No Lay`, `Partial Lay`, `Multilay`, `Multilay-Underlay` |
| `lay_odds_1` | decimal | No | sportsbook row | entered | Yes | required except some no-lay/custom cases |
| `exchange` | string | No | sportsbook row | entered | Yes | used for commission lookup |
| `lay_actual` | money | No | sportsbook row | entered/override | Yes | takes precedence when supplied |
| `lay_matched_stake_1` | money | No | sportsbook row | entered | Yes | part-laid tracking |
| `lay_odds_2` | decimal | No | sportsbook row | entered | Yes | multi-lay only |
| `lay_odds_3` | decimal | No | sportsbook row | entered | Yes | multi-lay only |
| `lay_commission_1` | decimal | No | lookup | calculated | Yes | exchange commission |
| `lay_commission_2` | decimal | No | lookup | calculated | Yes | multi-lay only |
| `lay_commission_3` | decimal | No | lookup | calculated | Yes | multi-lay only |
| `manual_override_value` | money | No | sportsbook row | entered/override | Yes | workbook `FinalNetPnL` equivalent |
| `manual_override_reason` | text | No | app audit | entered | Yes | required in app if override used |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `match_rating` | decimal | sportsbook row | reference | derived | back-vs-lay quality indicator |
| `reference_lay_stake_standard` | money | sportsbook row/audit | reference | derived | standard strategy |
| `reference_lay_stake_underlay` | money | sportsbook row/audit | reference | derived | underlay strategy |
| `reference_lay_stake_overlay` | money | sportsbook row/audit | reference | derived | overlay strategy |
| `actual_lay_stake_1` | money | sportsbook row | entered/resolved | derived from override or strategy | Yes |
| `calculated_liability_1` | money | sportsbook row/dashboard | current/final support | derived | lay liability |
| `scenario_pnl_if_back_wins` | money | sportsbook row/audit | scenario | derived | outcome 1 |
| `scenario_pnl_if_lay_wins` | money | sportsbook row/audit | scenario | derived | no-selection/lay side |
| `scenario_pnl_if_lay2_wins` | money | sportsbook row/audit | scenario | derived | multi-lay only |
| `scenario_pnl_if_lay3_wins` | money | sportsbook row/audit | scenario | derived | multi-lay only |
| `projected_current_pnl` | money | sportsbook row/dashboard/reports | current/projected | derived | workbook `CalcNetPnL` for open rows |
| `actual_net_pnl` | money | sportsbook row/reports | final/settled | derived | result-based formula before override |
| `final_net_pnl` | money | sportsbook row/reports | final/settled | override or derived | resolved `NetPnL` |
| `reporting_value` | money | dashboard/reports/profile summaries | current or final | derived | resolved `NetPnL` |
| `lay_status` | enum | sportsbook row/dashboard | operational | derived | `Not Laid`, `Part Laid`, `Fully Laid` |
| `counts_as_open` | boolean | dashboard | operational | derived | open-state helper |
| `is_overdue` | boolean | dashboard | operational | derived | overdue helper |

## 8. Formula source

- current tracker workbook formula
- tracker formula appendix
- cash-first calculation spec

If formula differs from common matched-betting calculators, the workbook wins because OpenForge is preserving tracker behaviour rather than generic equal-profit output.

## 9. Formula

Base reference formulas:

- `match_rating = round(back_odds / lay_odds_1, 4)` when odds exist and strategy is not `No Lay`
- `standard_ref_lay_stake = round((back_stake * back_odds) / (lay_odds_1 - commission_1), 2)`
- `underlay_ref_lay_stake = round((back_stake * (back_odds - 1)) / (lay_odds_1 - 1), 2)`
- `overlay_ref_lay_stake = round(back_stake / (1 - commission_1), 2)`
- `selected_lay_stake`
  - `0` for `No Lay`
  - `lay_actual` if provided
  - strategy reference stake for `Standard`, `Underlay`, `Overlay`
  - blank unless manually supplied for `Custom` and `Partial Lay`
  - workbook uses underlay-style selected reference for `Multilay` and `Multilay-Underlay`, but actual multi-lay branch stakes remain separate

Liability:

- `liability_i = round(lay_stake_i * (lay_odds_i - 1), 2)`

Scenario formulas:

- single-lay bookie wins:
  - `round((back_stake * (back_odds - 1)) - liability_1 - liability_2 - liability_3, 2)`
- single-lay lay wins:
  - `round((-back_stake) + lay_returns_after_commission - lay_stake_2 - lay_stake_3, 2)` using workbook branch logic
- no-lay:
  - bookie-win and lose branches follow workbook rules, including the known mug-bet caveat
- multi-lay:
  - calculate scenario values for each active lay branch using workbook formulas

Current-value formula:

- if row is open/pending:
  - single-lay style: `min(scenario_pnl_if_back_wins, scenario_pnl_if_lay_wins)`
  - multi-lay style: `min(all_active_scenario_values)`

Final/settled formula:

- if settled:
  - select scenario output by `result`
  - `Void` resolves to `0`
  - `Mixed` remains unresolved/blank until explicitly handled

Manual override handling:

- if `manual_override_value` exists, resolved output becomes that value
- app must require override reason

Error/blank handling:

- missing required numeric inputs produce blank/unresolved formula outputs rather than guessed values

## 10. Assumptions

- commission values are decimal ratios such as `0.02`, following workbook behaviour
- `date_settled` is the reporting date used by dashboard and reports
- `Partial Lay` and `Custom` remain unresolved unless enough actual lay information exists
- `Mixed` result remains `To confirm` for application behaviour beyond workbook blank handling
- the no-lay mug-bet win-path caveat must be reviewed before approval

## 11. Rounding rules

- lay stake rounding: 2 decimal places
- liability rounding: 2 decimal places
- P&L rounding: 2 decimal places
- displayed decimals: 2 for money, 4 for match rating
- stored precision: To confirm, but should preserve at least workbook precision expectations
- currency formatting: display-only
- rounding should follow workbook business logic, not just UI formatting

## 12. Commission rules

- commission source: exchange lookup from `CommissionDefaults`
- default commission: from workbook settings/lookup, not hard-coded generic assumption
- per-exchange override: Yes
- commission applies to lay-side returns
- commission does not apply when there is no lay branch
- commission affects scenario outcomes and lay-stake formulas

## 13. Liability/exposure rules

- `liability_i = lay_stake_i * (lay_odds_i - 1)`
- profile-specific exposure is derived from open sportsbook and free-bet liabilities
- cross-profile exposure aggregation is allowed only in derived overview screens
- open-position inclusion rule: rows with open-state statuses count
- overdue inclusion rule: open rows with past settling date count as overdue

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Bookie wins | `Back Won`, `Win`, `Outcome 1 Won` | workbook bookie-win formula | Yes | Yes |
| Lay wins | `Lay Won`, `Lose`, `No Selection Won` | workbook lay-win formula | Yes | Yes |
| Lay wins + cashback | `Lay Won + Cashback` | workbook cashback branch | No | Yes |
| Outcome 2 wins | `Outcome 2 Won` | multi-lay scenario formula | Yes for multi-lay | Yes |
| Outcome 3 wins | `Outcome 3 Won` | multi-lay scenario formula | Yes for multi-lay | Yes |
| Void | `Void` | `0` | No | Yes |
| Manual override | override entered | override replaces resolved value | N/A | Yes |

## 15. Status and reporting inclusion

- open positions:
  - `Prospecting`
  - `Not Placed`
  - `Placed`
- overdue positions:
  - `counts_as_open = true` and `date_settled < today`
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
  - may consume resolved sportsbook `NetPnL`
- cross-profile comparison:
  - headline aggregates only, no row mixing

## 16. Fixtures required

- minimum valid standard lay case
- open/pending standard lay case
- settled bookie-win case
- settled lay-win case
- void case
- manual override case
- no-lay mug-bet case
- multilay case
- partial/custom lay unresolved case
- profile isolation case

## 17. Test cases

- `sportsbook_current_value_standard_open_uses_minimum_scenario`
- `sportsbook_final_value_back_win_matches_outcome_one`
- `sportsbook_final_value_lay_win_matches_lay_scenario`
- `sportsbook_void_resolves_zero`
- `sportsbook_manual_override_replaces_formula_value`
- `sportsbook_multilay_open_uses_minimum_active_scenario`
- `sportsbook_profile_scope_prevents_cross_profile_reads`

## 18. Acceptance tolerance

- stake tolerance: exact to 0.01
- liability tolerance: exact to 0.01
- P&L tolerance: exact to 0.01
- percentage tolerance: exact to 0.0001 for match rating where applicable
- display tolerance: none beyond formatting

## 19. UI display requirements

- users must see that open rows can have current value before settlement
- projected/current and final/settled values must not be silently conflated
- overrides must be visibly marked
- lay status, liability, and current value should be inspectable in row detail
- sportsbook strategy selection exposes one `Multi Lay` option; an explicit planner switch
  selects the persisted `Multilay` or `Multilay-Underlay` calculation state
- switching multi-lay underlay on or off must not alter the underlying formulas, commission
  source, branch placement data, or cash-first minimum-scenario selection
- existing rows persisted as `Multilay-Underlay` must reopen as `Multi Lay` with the underlay
  switch selected

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
  - confirm no-lay mug-bet treatment
  - confirm `Mixed` result handling
