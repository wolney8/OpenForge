# Calculation Contract: Sportsbook Extra Places Cash-First Current Value

_Last updated: 2026-07-11_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: `docs/workflows/sportsbook-bet-workflow-contract.md`
- Related spreadsheet source: none in current workbook source-pack
- Related source-pack file: external expansion beyond current workbook source-pack
- Related issue/task: advanced sportsbook offer-family expansion for `Extra Places`

## 1. Product context

- Application: Plum Duff
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `sportsbook_bets`
- Required `profile_id` handling: every extra-places row, place-term configuration, audit row, preview, save, and report path must remain scoped to one selected profile
- Fund Manager visible? Indirectly through profile aggregates only
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation defines how OpenForge should value an `Extra Places`
sportsbook row as a cash-first tracker position.

It supports:

- sportsbook row value
- dashboard selected-range P&L
- open-position and liability review
- reporting-time realised P&L once settled

Extra Places is closely related to each-way betting, but the distinguishing
feature is that the promotional place terms extend beyond the ordinary market
place count and must therefore be modelled explicitly.

## 3. Workflow context

- encountered on sportsbook bet entry and review
- triggered after the operator enters each-way-style stake, odds, ordinary
  place terms, and promotional extra-place terms
- shown on sportsbook row review, dashboard summaries, and reports
- applies at:
  - open-state review
  - settlement-time resolution
  - reporting-time aggregation

## 4. Spreadsheet equivalent

- Sheet: no dedicated `Extra Places` workbook implementation exists in the
  current source-pack
- Current workbook equivalent: none
- Formula source type:
  - manually specified business rule for platform expansion
  - later to be cross-checked against approved extra-places calculator
    behaviour
- Current workbook sportsbook rows generally use conservative `MIN()` behaviour
  for open rows; OpenForge should preserve that principle here
- Known caveat:
  - because extra places is not present in the current workbook source-pack,
    branch wording, ordinary-vs-promotional place handling, and result
    vocabulary require human approval before implementation

## 5. Cash-first/current-value behaviour

- Question answered: what is this extra-places row worth to the bankroll right now?
- Applies before settlement: Yes
- Calculates multiple scenario outcomes: Yes
- Value shown for open/pending rows:
  - the conservative minimum across win, promo-place-only, and unplaced
    scenarios
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
| `offer_type` | enum | Yes | sportsbook row | entered | Yes | should be `Extra Places` once implemented |
| `bet_type` | enum | Yes | sportsbook row | entered | Yes | likely each-way-compatible horse-racing shape |
| `fixture_type` | enum | Yes | sportsbook row | entered | Yes | likely `Horse Racing`; exact allowed list To confirm |
| `bookmaker` | string | Yes | sportsbook row | entered | Yes | authority-owned later |
| `exchange` | string | No | sportsbook row | entered | Yes | win/place exchanges may later split if needed |
| `date_settled` | date | No | sportsbook row | entered | Yes | used for reporting and overdue |
| `each_way_stake_per_leg` | money | Yes | sportsbook row | entered | Yes | stake for one leg |
| `each_way_total_stake` | money | derived | sportsbook row | derived | Yes | usually `2 * each_way_stake_per_leg` |
| `back_odds_win` | decimal | Yes | sportsbook row | entered | Yes | bookmaker win odds |
| `ordinary_place_terms_numerator` | integer | Yes | sportsbook row | entered | Yes | e.g. `1` |
| `ordinary_place_terms_denominator` | integer | Yes | sportsbook row | entered | Yes | e.g. `4` or `5` |
| `ordinary_place_count` | integer | Yes | sportsbook row | entered | Yes | ordinary market place count |
| `promotional_place_count` | integer | Yes | sportsbook row | entered | Yes | extra place count; must exceed ordinary place count |
| `derived_place_back_odds` | decimal | Yes | derived | calculated | Yes | derived from approved place terms |
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
| `actual_win_lay_stake` | money | sportsbook row | resolved | derived from override or strategy | Yes |
| `actual_place_lay_stake` | money | sportsbook row | resolved | derived from override or strategy | Yes |
| `calculated_win_liability` | money | sportsbook row/dashboard | current/final support | derived | win-leg liability |
| `calculated_place_liability` | money | sportsbook row/dashboard | current/final support | derived | place-leg liability |
| `total_liability` | money | sportsbook row/dashboard | current/final support | derived | combined liability |
| `scenario_pnl_if_wins` | money | sportsbook row/audit | scenario | derived | win branch also includes place return |
| `scenario_pnl_if_hits_extra_place_only` | money | sportsbook row/audit | scenario | derived | misses win but lands only because of promotional extra place |
| `scenario_pnl_if_unplaced` | money | sportsbook row/audit | scenario | derived | both bookmaker legs lose, exchange wins |
| `projected_current_pnl` | money | sportsbook row/dashboard/reports | current/projected | derived | conservative minimum while open |
| `actual_net_pnl` | money | sportsbook row/reports | final/settled | derived | result-resolved value before override |
| `final_net_pnl` | money | sportsbook row/reports | final/settled | override or derived | resolved value |
| `reporting_value` | money | dashboard/reports/profile summaries | current or final | derived | resolved `final_net_pnl` |

## 8. Formula source

- manually specified business rule
- later aligned against approved extra-places calculator conventions
- OpenForge cash-first tracker rule

OpenForge should treat the promotional extra-place branch as a real settlement
branch only once it is actually hit, not as guaranteed extra value while the
row is still open.

## 9. Formula

Base derived values:

- `each_way_total_stake = round(each_way_stake_per_leg * 2, 2)`
- `derived_place_back_odds = round(1 + ((back_odds_win - 1) * ordinary_place_terms_numerator / ordinary_place_terms_denominator), 4)`

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
- hits extra place only:
  - lose bookmaker win-leg stake
  - win bookmaker place-leg profit because the promotional place count was hit
  - gain win-lay exchange return after commission
  - minus place-leg liability
- unplaced:
  - lose both bookmaker stakes
  - gain win-lay exchange return after commission
  - gain place-lay exchange return after commission

Current-value formula:

- if row is open/pending:
  - `projected_current_pnl = min(scenario_pnl_if_wins, scenario_pnl_if_hits_extra_place_only, scenario_pnl_if_unplaced)`

Final/settled formula:

- if settled:
  - `Win` / `Back Won` / `Won and Placed` style branch -> `scenario_pnl_if_wins`
  - future `Extra Place Hit` branch -> `scenario_pnl_if_hits_extra_place_only`
  - `Lose` / `Unplaced` style branch -> `scenario_pnl_if_unplaced`
  - `Void` / `Non Runner` -> `0` unless later business rule requires returned stake-specific handling

Manual override handling:

- if `manual_override_value` exists, resolved output becomes that value
- app must require override reason

Error/blank handling:

- missing numeric inputs must produce unresolved outputs rather than guessed values
- invalid promotional place counts must produce unresolved outputs

## 10. Assumptions

- extra-places rows are modelled as one sportsbook row with two internal legs
  - why: cleaner tracker parity and reporting than splitting into multiple rows
  - source: later interpretation
  - human confirmation required: Yes
- extra places should initially target horse racing first
  - why: most common operator use case
  - source: later interpretation
  - human confirmation required: Yes
- `result` will need a dedicated branch such as `Extra Place Hit`
  - why: current sportsbook result vocabulary does not fully cover promotional place-only settlement
  - source: later interpretation
  - human confirmation required: Yes
- ordinary place versus promotional place counts must both be stored explicitly
  - why: otherwise the app cannot explain why a place-only branch paid
  - source: later interpretation
  - human confirmation required: Yes

## 11. Rounding rules

- lay stake rounding: 2 decimal places
- liability rounding: 2 decimal places
- P&L rounding: 2 decimal places
- derived place odds precision: 4 decimal places before later money rounding
- displayed decimals: 2 for money
- stored precision: To confirm, but sufficient to preserve extra-place trace
- currency formatting: display-only

## 12. Commission rules

- commission source: exchange lookup from profile authority/settings
- default commission: settings-owned exchange commission, not hard-coded
- per-exchange override: Yes
- commission applies to exchange lay returns
- commission does not apply to bookmaker back-leg winnings

## 13. Liability/exposure rules

- win-leg liability formula: `actual_win_lay_stake * (win_lay_odds - 1)`
- place-leg liability formula: `actual_place_lay_stake * (place_lay_odds - 1)`
- total exposure formula: sum of both active liabilities
- profile-specific exposure: derived only within the selected profile
- cross-profile exposure aggregation: derived overview only
- open-position inclusion rule: open extra-places rows count until settled/voided
- overdue inclusion rule: open rows with past `date_settled` count as overdue

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Wins and places | `Win` / future explicit win branch | `scenario_pnl_if_wins` | Yes | Yes |
| Hits extra place only | future `Extra Place Hit` branch | `scenario_pnl_if_hits_extra_place_only` | Yes | Yes |
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
  - settled-only extra-places rows
- selected date range:
  - by profile tracker settings
- weekly summary:
  - aggregated by settled date unless a current-value report intentionally includes open rows
- monthly summary:
  - aggregated from settled/open report rules above

## 16. Fixtures required

- minimum valid open extra-places case
- settled win case
- settled extra-place-only case
- settled unplaced case
- void/non-runner case
- manual override case
- profile isolation pair

## 17. Test cases

- parser/validation accepts valid ordinary/promotional place inputs
- invalid promotional place counts are rejected or unresolved
- open rows use conservative minimum across three scenarios
- settled win path resolves correctly
- settled extra-place-only path resolves correctly
- settled unplaced path resolves correctly
- override replaces formula output
- profile isolation remains intact
