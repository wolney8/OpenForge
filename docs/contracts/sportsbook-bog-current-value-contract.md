# Calculation Contract: Sportsbook BOG / Best Odds Guaranteed Cash-First Current Value

_Last updated: 2026-07-11_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: `docs/workflows/sportsbook-bet-workflow-contract.md`
- Related spreadsheet source: none in current workbook source-pack
- Related source-pack file: external expansion beyond current workbook source-pack
- Related issue/task: advanced sportsbook offer-family expansion for `BOG / Best Odds Guaranteed`

## 1. Product context

- Application: Plum Duff
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `sportsbook_bets`
- Required `profile_id` handling: every BOG row, settlement comparison, audit row, preview, save, and report path must remain scoped to one selected profile
- Fund Manager visible? Indirectly through profile aggregates only
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation defines how OpenForge should value a `BOG / Best Odds Guaranteed`
sportsbook row as a cash-first tracker position.

It supports:

- sportsbook row value
- dashboard selected-range P&L
- open-position and liability review
- reporting-time realised P&L once settled

The key rule is that OpenForge must not book speculative BOG uplift before the
starting price or final qualifying comparison is actually known.

## 3. Workflow context

- encountered on sportsbook bet entry and review
- triggered after the operator enters ordinary sportsbook qualifying inputs plus
  BOG offer flow selection
- shown on sportsbook row review, dashboard summaries, and reports
- applies at:
  - open-state review before starting price is known
  - settlement-time comparison of taken price vs starting price
  - reporting-time realised P&L

## 4. Spreadsheet equivalent

- Sheet: no dedicated `BOG` workbook implementation exists in the current
  source-pack
- Current workbook equivalent: none
- Formula source type:
  - manually specified business rule for platform expansion
  - later to be cross-checked against approved BOG calculator behaviour
- Current workbook sportsbook rows generally use conservative `MIN()` behaviour
  for open rows; OpenForge should preserve that principle here
- Known caveat:
  - BOG is a settlement-time uplift mechanic rather than an open-state pricing
    mechanic, so it should not alter conservative current value before
    settlement

## 5. Cash-first/current-value behaviour

- Question answered: what is this BOG row worth to the bankroll right now?
- Applies before settlement: Yes
- Calculates multiple scenario outcomes: Yes
- Value shown for open/pending rows:
  - ordinary sportsbook conservative current value only
- Conservative `MIN()` style outcome used: Yes
- Current/projected vs final/settled separation:
  - `projected_current_pnl` remains the ordinary sportsbook open-state value
  - `actual_net_pnl` becomes the result-resolved value using the higher of
    taken odds or approved starting-price odds when applicable
  - `final_net_pnl` is the resolved output after any approved override
- Reports before settlement:
  - do not include speculative BOG uplift
- Reports after settlement:
  - include uplift only if the BOG condition actually improved the winning back-leg payout

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | mandatory isolation key |
| `record_id` | string | Yes | row key | entered/system | Yes | sportsbook row identifier |
| `status` | enum | Yes | sportsbook row | entered | Yes | open and settled states |
| `result` | enum | Yes | sportsbook row | entered | Yes | final branch selection |
| `offer_type` | enum | Yes | sportsbook row | entered | Yes | should be `BOG / Best Odds Guaranteed` once implemented |
| `bet_type` | enum | Yes | sportsbook row | entered | Yes | likely `Single`; exact scope To confirm |
| `fixture_type` | enum | Yes | sportsbook row | entered | Yes | likely horse-racing focused first |
| `bookmaker` | string | Yes | sportsbook row | entered | Yes | authority-owned later |
| `exchange` | string | No | sportsbook row | entered | Yes | ordinary lay exchange |
| `date_settled` | date | No | sportsbook row | entered | Yes | used for reporting and overdue |
| `back_stake` | money | Yes | sportsbook row | entered | Yes | main stake |
| `back_odds` | decimal | Yes | sportsbook row | entered | Yes | taken price at placement |
| `starting_price_odds` | decimal | No | sportsbook row | entered/imported | Yes | only known later; required to prove uplift |
| `effective_back_odds_for_settlement` | decimal | derived | derived | calculated | Yes | max of taken odds and approved starting price when BOG applies |
| `match_strategy` | enum | Yes | sportsbook row | entered | Yes | same as ordinary sportsbook rows |
| `lay_odds_1` | decimal | No | sportsbook row | entered | Yes | required except `No Lay` |
| `lay_commission_1` | decimal | No | lookup | calculated | Yes | exchange commission |
| `lay_actual` | money | No | sportsbook row | entered/override | Yes | actual matched lay stake |
| `bog_eligible` | boolean | Yes | sportsbook row | entered/system | Yes | whether the row qualifies for BOG handling |
| `bog_uplift_applied` | boolean | No | derived | calculated/system | Yes | whether starting price exceeded taken odds and was used |
| `manual_override_value` | money | No | sportsbook row | entered/override | Yes | override of resolved final value |
| `manual_override_reason` | text | No | app audit | entered | Yes | required if override used |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `reference_lay_stake_standard` | money | sportsbook row/audit | reference | derived | ordinary suggested lay stake |
| `actual_lay_stake_1` | money | sportsbook row | resolved | derived from override or strategy | Yes |
| `calculated_liability_1` | money | sportsbook row/dashboard | current/final support | derived | ordinary liability |
| `scenario_pnl_if_back_wins_taken_price` | money | sportsbook row/audit | scenario | derived | winning branch using originally taken odds |
| `scenario_pnl_if_back_wins_bog_price` | money | sportsbook row/audit | scenario | derived | winning branch using improved starting price |
| `scenario_pnl_if_lay_wins` | money | sportsbook row/audit | scenario | derived | ordinary lay-win branch |
| `projected_current_pnl` | money | sportsbook row/dashboard/reports | current/projected | derived | ordinary conservative open-state value |
| `actual_net_pnl` | money | sportsbook row/reports | final/settled | derived | result-resolved value before override |
| `final_net_pnl` | money | sportsbook row/reports | final/settled | override or derived | resolved value |
| `reporting_value` | money | dashboard/reports/profile summaries | current or final | derived | resolved `final_net_pnl` |

## 8. Formula source

- manually specified business rule
- later aligned against approved BOG calculator conventions
- OpenForge cash-first tracker rule

BOG uplift is a settlement-time enhancement, not an open-state current-value
uplift.

## 9. Formula

Ordinary sportsbook reference formulas follow the approved sportsbook contract:

- standard reference lay stake
- liability
- ordinary back-win scenario
- ordinary lay-win scenario

BOG uplift rules:

- if `bog_eligible = false`
  - row behaves like ordinary sportsbook
- if `bog_eligible = true` and `starting_price_odds <= back_odds`
  - no uplift applies
- if `bog_eligible = true` and `starting_price_odds > back_odds`
  - effective settlement back odds become `starting_price_odds`

Derived value:

- `effective_back_odds_for_settlement = max(back_odds, starting_price_odds)` when BOG eligible and starting price exists

Scenario formulas:

- `scenario_pnl_if_back_wins_taken_price`
  - ordinary sportsbook back-win formula using `back_odds`
- `scenario_pnl_if_back_wins_bog_price`
  - same formula using `effective_back_odds_for_settlement`
- `scenario_pnl_if_lay_wins`
  - ordinary sportsbook lay-win formula

Current-value formula:

- if row is open/pending:
  - `projected_current_pnl = min(scenario_pnl_if_back_wins_taken_price, scenario_pnl_if_lay_wins)`

Final/settled formula:

- settled winning back branch:
  - if BOG uplift applied -> `scenario_pnl_if_back_wins_bog_price`
  - otherwise -> `scenario_pnl_if_back_wins_taken_price`
- settled lay-win branch:
  - `scenario_pnl_if_lay_wins`
- `Void` / future `Non Runner` branch:
  - `0` unless approved settlement rules differ

Manual override handling:

- if `manual_override_value` exists, resolved output becomes that value
- app must require override reason

Error/blank handling:

- missing required numeric inputs produce unresolved outputs rather than guessed values
- missing `starting_price_odds` should not block open-state value, but does block proving an uplifted settled branch

## 10. Assumptions

- BOG is modelled as one sportsbook row with later settlement comparison against starting price
  - why: cleaner audit and reporting than separate uplift rows
  - source: later interpretation
  - human confirmation required: Yes
- BOG should never increase current value before settlement
  - why: cash-first rule values what is worth money now, not a possible later uplift
  - source: OpenForge cash-first interpretation
  - human confirmation required: Yes
- initial BOG scope should likely target horse-racing first
  - why: common operational use case
  - source: later interpretation
  - human confirmation required: Yes
- result vocabulary may need explicit non-runner handling
  - why: current sportsbook result set may not be enough for horse-racing cases
  - source: later interpretation
  - human confirmation required: Yes

## 11. Rounding rules

- lay stake rounding: 2 decimal places
- liability rounding: 2 decimal places
- P&L rounding: 2 decimal places
- displayed decimals: 2 for money
- stored precision: To confirm, but sufficient to preserve uplift comparison trace
- currency formatting: display-only

## 12. Commission rules

- commission source: exchange lookup from profile authority/settings
- default commission: settings-owned exchange commission, not hard-coded
- per-exchange override: Yes
- commission applies to lay-side returns
- commission does not apply to bookmaker payout directly

## 13. Liability/exposure rules

- liability formula follows ordinary sportsbook lay liability
- profile-specific exposure is derived only within the selected profile
- cross-profile exposure aggregation is derived overview only
- open-position inclusion rule:
  - rows remain open until final event settlement
- overdue inclusion rule:
  - open rows with past `date_settled` count as overdue

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Back wins at taken price | `Back Won` / `Win` without uplift | `scenario_pnl_if_back_wins_taken_price` | Yes | Yes |
| Back wins with BOG uplift | `Back Won` / `Win` with uplift applied | `scenario_pnl_if_back_wins_bog_price` | No | Yes |
| Lay wins | `Lay Won` / `Lose` / `No Selection Won` | `scenario_pnl_if_lay_wins` | Yes | Yes |
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
  - use ordinary conservative open-state value only
- realised P&L reports:
  - settled-only rows with uplift applied only when actually earned
- selected date range:
  - by profile tracker settings
- weekly summary:
  - by settled date unless current-value reporting mode explicitly includes open rows
- monthly summary:
  - aggregated from settled/open report rules above

## 16. Fixtures required

- open row before starting price is known
- settled back-win row without uplift
- settled back-win row with uplift
- settled lay-win row
- void/non-runner review case
- manual override case
- profile isolation pair

## 17. Test cases

- open rows exclude speculative BOG uplift
- settled winning rows use starting-price uplift only when eligible and higher
- settled winning rows stay on taken price when no uplift applies
- settled lay-win rows ignore BOG uplift path
- override replaces formula output
- profile isolation remains intact
