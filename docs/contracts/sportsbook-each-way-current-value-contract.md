# Calculation Contract: Sportsbook Each-Way Cash-First Current Value

_Last updated: 2026-07-11_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: `docs/workflows/sportsbook-bet-workflow-contract.md`
- Related spreadsheet source: none in current workbook source-pack
- Related source-pack file: external expansion beyond current workbook source-pack
- Related issue/task: advanced sportsbook offer-family expansion for `Each Way`

## 1. Product context

- Application: Plum Duff
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `sportsbook_bets`
- Required `profile_id` handling: every each-way row, audit row, preview, save, and report path must remain scoped to one selected profile
- Fund Manager visible? Indirectly through profile aggregates only
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation defines how OpenForge should value an `Each Way` sportsbook
row as a cash-first tracker position.

It supports:

- sportsbook row value
- dashboard selected-range P&L
- open-position and liability review
- reporting-time realised P&L once settled

It must not flatten each-way bets into a generic single-bet calculator.

Each-way rows have two linked sub-positions:

- win leg
- place leg

Both legs must be visible in calculation trace and settlement logic.

## 3. Workflow context

- encountered on sportsbook bet entry and review
- triggered after the operator enters each-way stake, odds, place terms, and
  lay prices
- shown on sportsbook row review, dashboard summaries, and reports
- applies at:
  - open-state review
  - settlement-time resolution
  - reporting-time aggregation

## 4. Spreadsheet equivalent

- Sheet: no dedicated each-way workbook implementation exists in the current
  source-pack
- Current workbook equivalent: none
- Formula source type:
  - manually specified business rule for platform expansion
  - later to be cross-checked against approved matched-betting calculator
    behaviour
- Current workbook uses `MIN()`/scenario-conservative value for sportsbook open
  rows generally; OpenForge should preserve the same cash-first principle for
  each-way rows
- Known caveat:
  - because each-way is not present in the current workbook source-pack, all
    branch wording, place-term modelling, and result vocabulary require human
    approval before implementation

## 5. Cash-first/current-value behaviour

- Question answered: what is this each-way row worth to the bankroll right now?
- Applies before settlement: Yes
- Calculates multiple scenario outcomes: Yes
- Value shown for open/pending rows:
  - the conservative minimum across active each-way scenarios
- Conservative `MIN()` style outcome used: Yes
- Current/projected vs final/settled separation:
  - `projected_current_pnl` is the open-state conservative value
  - `actual_net_pnl` is the result-resolved formula output
  - `final_net_pnl` is the resolved output after any approved override
- Reports before settlement:
  - may include the conservative current value if open rows are intentionally
    included in that report surface
- Reports after settlement:
  - include the result-resolved value or approved override

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | mandatory isolation key |
| `record_id` | string | Yes | row key | entered/system | Yes | sportsbook row identifier |
| `status` | enum | Yes | sportsbook row | entered | Yes | open and settled states |
| `result` | enum | Yes | sportsbook row | entered | Yes | selects final branch |
| `offer_type` | enum | Yes | sportsbook row | entered | Yes | should be `Each Way` once implemented |
| `bet_type` | enum | Yes | sportsbook row | entered | Yes | commonly horse-racing or golf shape |
| `fixture_type` | enum | Yes | sportsbook row | entered | Yes | likely `Horse Racing` or `Golf`; exact allowed list To confirm |
| `bookmaker` | string | Yes | sportsbook row | entered | Yes | authority-owned later |
| `exchange` | string | No | sportsbook row | entered | Yes | win/place exchanges may later split if needed |
| `date_settled` | date | No | sportsbook row | entered | Yes | used for reporting and overdue |
| `each_way_stake_per_leg` | money | Yes | sportsbook row | entered | Yes | stake for one leg |
| `each_way_total_stake` | money | derived | sportsbook row | derived | Yes | usually `2 * each_way_stake_per_leg` |
| `back_odds_win` | decimal | Yes | sportsbook row | entered | Yes | bookmaker win odds |
| `place_terms_numerator` | integer | Yes | sportsbook row | entered | Yes | e.g. `1` |
| `place_terms_denominator` | integer | Yes | sportsbook row | entered | Yes | e.g. `4` or `5` |
| `place_places` | integer | Yes | sportsbook row | entered | Yes | e.g. `3`, `4`, `5` |
| `derived_place_back_odds` | decimal | Yes | derived | calculated | Yes | `1 + ((back_odds_win - 1) * numerator / denominator)` |
| `match_strategy` | enum | Yes | sportsbook row | entered | Yes | initial recommended scope: `Standard`, `Underlay`, `Custom`, `No Lay`; wider support To confirm |
| `win_lay_odds` | decimal | No | sportsbook row | entered | Yes | required unless `No Lay` |
| `place_lay_odds` | decimal | No | sportsbook row | entered | Yes | required unless `No Lay` |
| `win_lay_commission` | decimal | No | lookup | calculated | Yes | exchange commission for win leg |
| `place_lay_commission` | decimal | No | lookup | calculated | Yes | exchange commission for place leg |
| `win_lay_actual` | money | No | sportsbook row | entered/override | Yes | actual matched stake for win leg |
| `place_lay_actual` | money | No | sportsbook row | entered/override | Yes | actual matched stake for place leg |
| `manual_override_value` | money | No | sportsbook row | entered/override | Yes | override of resolved final value |
| `manual_override_reason` | text | No | app audit | entered | Yes | required if override used |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `reference_win_lay_stake_standard` | money | sportsbook row/audit | reference | derived | suggested win-leg lay stake |
| `reference_place_lay_stake_standard` | money | sportsbook row/audit | reference | derived | suggested place-leg lay stake |
| `reference_win_lay_stake_underlay` | money | sportsbook row/audit | reference | derived | optional later strategy branch |
| `reference_place_lay_stake_underlay` | money | sportsbook row/audit | reference | derived | optional later strategy branch |
| `actual_win_lay_stake` | money | sportsbook row | resolved | derived from override or strategy | Yes |
| `actual_place_lay_stake` | money | sportsbook row | resolved | derived from override or strategy | Yes |
| `calculated_win_liability` | money | sportsbook row/dashboard | current/final support | derived | win-leg liability |
| `calculated_place_liability` | money | sportsbook row/dashboard | current/final support | derived | place-leg liability |
| `total_liability` | money | sportsbook row/dashboard | current/final support | derived | combined liability |
| `scenario_pnl_if_wins` | money | sportsbook row/audit | scenario | derived | horse/player wins and therefore places |
| `scenario_pnl_if_places_only` | money | sportsbook row/audit | scenario | derived | place leg wins, win leg loses |
| `scenario_pnl_if_unplaced` | money | sportsbook row/audit | scenario | derived | both bookmaker legs lose, exchange wins |
| `projected_current_pnl` | money | sportsbook row/dashboard/reports | current/projected | derived | conservative minimum while open |
| `actual_net_pnl` | money | sportsbook row/reports | final/settled | derived | result-resolved value before override |
| `final_net_pnl` | money | sportsbook row/reports | final/settled | override or derived | resolved value |
| `reporting_value` | money | dashboard/reports/profile summaries | current or final | derived | resolved `final_net_pnl` |
| `lay_status` | enum | sportsbook row/dashboard | operational | derived | later may need `win/place` split statuses |

## 8. Formula source

- manually specified business rule
- later aligned against approved each-way calculator conventions
- OpenForge cash-first tracker rule

If later approved calculator conventions differ from OpenForge reporting needs,
OpenForge should keep:

- calculator/reference values separate from entered values
- conservative current value separate from settled/final value

## 9. Formula

Base derived values:

- `each_way_total_stake = round(each_way_stake_per_leg * 2, 2)`
- `derived_place_back_odds = round(1 + ((back_odds_win - 1) * place_terms_numerator / place_terms_denominator), 4)`

Reference standard lay stakes:

- `reference_win_lay_stake_standard = round((each_way_stake_per_leg * back_odds_win) / (win_lay_odds - win_lay_commission), 2)`
- `reference_place_lay_stake_standard = round((each_way_stake_per_leg * derived_place_back_odds) / (place_lay_odds - place_lay_commission), 2)`

Selected actual lay stakes:

- `0` for `No Lay`
- actual entered stake if supplied
- otherwise strategy reference stake

Liabilities:

- `calculated_win_liability = round(actual_win_lay_stake * (win_lay_odds - 1), 2)`
- `calculated_place_liability = round(actual_place_lay_stake * (place_lay_odds - 1), 2)`
- `total_liability = round(calculated_win_liability + calculated_place_liability, 2)`

Scenario formulas:

- wins:
  - bookmaker win leg profit
  - bookmaker place leg profit
  - minus win-leg liability
  - minus place-leg liability
- places only:
  - lose bookmaker win-leg stake
  - win bookmaker place-leg profit
  - gain win-lay exchange return after commission
  - minus place-leg liability
- unplaced:
  - lose both bookmaker stakes
  - gain win-lay exchange return after commission
  - gain place-lay exchange return after commission

First-pass field-name form:

- `scenario_pnl_if_wins = win_back_profit + place_back_profit - calculated_win_liability - calculated_place_liability`
- `scenario_pnl_if_places_only = (-each_way_stake_per_leg) + place_back_profit + win_lay_return_after_commission - calculated_place_liability`
- `scenario_pnl_if_unplaced = (-each_way_total_stake) + win_lay_return_after_commission + place_lay_return_after_commission`

Current-value formula:

- if row is open/pending:
  - `projected_current_pnl = min(scenario_pnl_if_wins, scenario_pnl_if_places_only, scenario_pnl_if_unplaced)`

Final/settled formula:

- if settled:
  - `Win` / `Back Won` / `Won and Placed` style branch -> `scenario_pnl_if_wins`
  - `Placed Only` style branch -> `scenario_pnl_if_places_only`
  - `Lose` / `Unplaced` style branch -> `scenario_pnl_if_unplaced`
  - `Void` / `Non Runner` -> `0` unless later business rule requires returned stake-specific handling

Manual override handling:

- if `manual_override_value` exists, resolved output becomes that value
- app must require override reason

Error/blank handling:

- missing numeric inputs must produce unresolved outputs rather than guessed values
- invalid place terms must produce unresolved outputs

## 10. Assumptions

- each-way rows are modelled as one sportsbook row with two internal legs
  - why: cleaner tracker parity and reporting than splitting into two rows
  - source: later interpretation
  - human confirmation required: Yes
- initial each-way scope should likely target horse racing first
  - why: most common operator use case
  - source: later interpretation
  - human confirmation required: Yes
- `result` will need new branch values such as `Placed Only`
  - why: current sportsbook result vocabulary does not fully cover each-way settlement
  - source: later interpretation
  - human confirmation required: Yes
- `Void` and `Non Runner` may need separate semantics
  - why: some each-way markets refund differently
  - source: later interpretation
  - human confirmation required: Yes
- underlay/overlay/custom/no-lay support may need to be phased
  - why: each-way already contains two linked lay branches
  - source: implementation-safety decision
  - human confirmation required: Yes

## 11. Rounding rules

- lay stake rounding: 2 decimal places
- liability rounding: 2 decimal places
- P&L rounding: 2 decimal places
- derived place odds precision: 4 decimal places before later money rounding
- displayed decimals: 2 for money
- stored precision: To confirm, but sufficient to preserve two-leg calculation trace
- currency formatting: display-only

## 12. Commission rules

- commission source: exchange lookup from profile authority/settings
- default commission: settings-owned exchange commission, not hard-coded
- per-exchange override: Yes
- commission applies to exchange lay returns
- commission does not apply to bookmaker back-leg winnings
- win and place legs may use different exchange commissions later if exchanges differ

## 13. Liability/exposure rules

- win-leg liability formula: `actual_win_lay_stake * (win_lay_odds - 1)`
- place-leg liability formula: `actual_place_lay_stake * (place_lay_odds - 1)`
- total exposure formula: sum of both active liabilities
- profile-specific exposure: derived only within the selected profile
- cross-profile exposure aggregation: derived overview only
- open-position inclusion rule: open each-way rows count until settled/voided
- overdue inclusion rule: open rows with past `date_settled` count as overdue

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Wins and places | `Win` / future explicit each-way win branch | `scenario_pnl_if_wins` | Yes | Yes |
| Places only | future `Placed Only` branch | `scenario_pnl_if_places_only` | Yes | Yes |
| Unplaced | `Lose` / `Unplaced` branch | `scenario_pnl_if_unplaced` | Yes | Yes |
| Void / non-runner | `Void` / future `Non Runner` branch | `0` or approved void rule | No | Yes |
| Manual override | override entered | override replaces resolved value | N/A | Yes |

## 15. Status and reporting inclusion

- open positions:
  - `Prospecting`
  - `Not Placed`
  - `Placed`
- overdue positions:
  - open rows with past `date_settled`
- current-value reports:
  - include conservative open-state value where that report intentionally includes open rows
- realised P&L reports:
  - settled-only each-way rows
- selected date range:
  - by profile tracker settings
- weekly summary:
  - aggregated by settled date unless a current-value report intentionally includes open rows
- monthly summary:
  - aggregated from settled/open report rules above
- profile overview:
  - may use current value or final value depending on overview mode

## 16. Fixtures required

- minimum valid open each-way case
- settled win case
- settled place-only case
- settled unplaced case
- void/non-runner case
- manual override case
- profile isolation pair

## 17. Test cases

- parser/validation accepts valid place-term inputs
- invalid place terms are rejected or unresolved
- open rows use conservative minimum across three scenarios
- settled win path resolves correctly
- settled place-only path resolves correctly
- settled unplaced path resolves correctly
- override replaces formula output
- profile isolation remains intact
