# Calculation Contract: Sportsbook 2UP / Early Payout Cash-First Current Value

_Last updated: 2026-07-11_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: `docs/workflows/sportsbook-bet-workflow-contract.md`
- Related spreadsheet source: none in current workbook source-pack
- Related source-pack file: external expansion beyond current workbook source-pack
- Related issue/task: advanced sportsbook offer-family expansion for `2UP / Early Payout`

## 1. Product context

- Application: OpenForge
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `sportsbook_bets`
- Required `profile_id` handling: every early-payout row, trigger-state change, audit row, preview, save, and report path must remain scoped to one selected profile
- Fund Manager visible? Indirectly through profile aggregates only
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation defines how OpenForge should value a `2UP / Early Payout`
sportsbook row as a cash-first tracker position.

It supports:

- sportsbook row value
- dashboard selected-range P&L
- open-position and liability review
- reporting-time realised P&L once settled

The key rule is that OpenForge must not book speculative early-payout value
before the early-payout trigger is actually hit.

## 3. Workflow context

- encountered on sportsbook bet entry and review
- triggered after the operator enters normal sportsbook qualifying inputs plus
  early-payout offer flow selection
- may later require a trigger-state action when the early-payout condition is
  hit before the underlying event fully settles
- shown on sportsbook row review, dashboard summaries, and reports
- applies at:
  - open-state review before trigger
  - trigger-hit review while the underlying event may still continue
  - final settlement and reporting

## 4. Spreadsheet equivalent

- Sheet: no dedicated `2UP / Early Payout` workbook implementation exists in
  the current source-pack
- Current workbook equivalent: none
- Formula source type:
  - manually specified business rule for platform expansion
  - later to be cross-checked against approved early-payout calculator
    behaviour
- Current workbook sportsbook rows generally use conservative `MIN()` behaviour
  for open rows; OpenForge should preserve that principle here
- Known caveat:
  - early payout creates a mid-lifecycle trigger state that does not exist in
    the current workbook source-pack and therefore needs explicit review before
    implementation

## 5. Cash-first/current-value behaviour

- Question answered: what is this early-payout row worth to the bankroll right now?
- Applies before settlement: Yes
- Calculates multiple scenario outcomes: Yes
- Value shown for open/pending rows before trigger:
  - conservative minimum of ordinary sportsbook qualifying scenarios
- Value shown after early-payout trigger is hit but before full event
  settlement:
  - conservative minimum across the remaining live bankroll outcomes after the
    bookmaker side has already been treated as paid out
- Conservative `MIN()` style outcome used: Yes
- Current/projected vs final/settled separation:
  - `projected_current_pnl` is the open-state or triggered-state conservative value
  - `actual_net_pnl` is the fully resolved formula output
  - `final_net_pnl` is the resolved output after any approved override
- Reports before trigger:
  - ordinary current-value behaviour only
- Reports after trigger but before final event settlement:
  - may include the triggered conservative value if current-value reporting
    includes open rows
- Reports after final settlement:
  - include the fully resolved result

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | mandatory isolation key |
| `record_id` | string | Yes | row key | entered/system | Yes | sportsbook row identifier |
| `status` | enum | Yes | sportsbook row | entered | Yes | open and settled states |
| `result` | enum | Yes | sportsbook row | entered | Yes | final branch selection |
| `offer_type` | enum | Yes | sportsbook row | entered | Yes | should be `2UP / Early Payout` once implemented |
| `bet_type` | enum | Yes | sportsbook row | entered | Yes | likely `Single`; exact scope To confirm |
| `bookmaker` | string | Yes | sportsbook row | entered | Yes | authority-owned later |
| `exchange` | string | No | sportsbook row | entered | Yes | ordinary lay exchange |
| `date_settled` | date | No | sportsbook row | entered | Yes | used for reporting and overdue |
| `back_stake` | money | Yes | sportsbook row | entered | Yes | main stake |
| `back_odds` | decimal | Yes | sportsbook row | entered | Yes | back odds at placement |
| `match_strategy` | enum | Yes | sportsbook row | entered | Yes | initial expected scope: `Standard`, `Underlay`, `Overlay`, `Custom`, `No Lay`; wider scope To confirm |
| `lay_odds_1` | decimal | No | sportsbook row | entered | Yes | required except `No Lay` |
| `lay_commission_1` | decimal | No | lookup | calculated | Yes | exchange commission |
| `lay_actual` | money | No | sportsbook row | entered/override | Yes | actual matched lay stake |
| `early_payout_trigger_hit` | boolean | Yes | sportsbook row | entered/system | Yes | whether the qualifying 2UP trigger has occurred |
| `early_payout_triggered_at` | datetime | No | sportsbook row/audit | entered/system | Yes | audit trail for trigger |
| `early_payout_branch_state` | enum | No | sportsbook row | entered/system | Yes | draft values: `Not Triggered`, `Triggered Awaiting Match Result`, `Triggered Confirmed`, `Triggered Reversed`; exact vocabulary To confirm |
| `manual_override_value` | money | No | sportsbook row | entered/override | Yes | override of resolved final value |
| `manual_override_reason` | text | No | app audit | entered | Yes | required if override used |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `reference_lay_stake_standard` | money | sportsbook row/audit | reference | derived | ordinary suggested lay stake |
| `actual_lay_stake_1` | money | sportsbook row | resolved | derived from override or strategy | Yes |
| `calculated_liability_1` | money | sportsbook row/dashboard | current/final support | derived | ordinary liability |
| `scenario_pnl_if_back_wins_ordinary` | money | sportsbook row/audit | scenario | derived | ordinary back-win branch |
| `scenario_pnl_if_lay_wins_ordinary` | money | sportsbook row/audit | scenario | derived | ordinary lay-win branch |
| `scenario_pnl_if_early_payout_holds` | money | sportsbook row/audit | scenario | derived | early payout triggered and final result does not claw back value |
| `scenario_pnl_if_early_payout_reverses` | money | sportsbook row/audit | scenario | derived | early payout paid by bookmaker but lay side later wins because the match turns around |
| `projected_current_pnl` | money | sportsbook row/dashboard/reports | current/projected | derived | conservative value for current row state |
| `actual_net_pnl` | money | sportsbook row/reports | final/settled | derived | result-resolved value before override |
| `final_net_pnl` | money | sportsbook row/reports | final/settled | override or derived | resolved value |
| `reporting_value` | money | dashboard/reports/profile summaries | current or final | derived | resolved `final_net_pnl` |

## 8. Formula source

- manually specified business rule
- later aligned against approved early-payout calculator conventions
- OpenForge cash-first tracker rule

If public calculators show optimistic upside before the trigger occurs,
OpenForge should not import that optimism into `projected_current_pnl`.

## 9. Formula

Ordinary sportsbook reference formulas follow the approved sportsbook contract:

- standard reference lay stake
- liability
- ordinary back-win scenario
- ordinary lay-win scenario

Trigger-state rules:

- if `early_payout_trigger_hit = false`
  - use ordinary sportsbook current-value behaviour only
- if `early_payout_trigger_hit = true`
  - bookmaker side should be treated as already paid on the early-payout offer
  - exchange side may still remain live depending on the event outcome

Scenario formulas:

- `scenario_pnl_if_back_wins_ordinary`
  - ordinary sportsbook back-win formula
- `scenario_pnl_if_lay_wins_ordinary`
  - ordinary sportsbook lay-win formula
- `scenario_pnl_if_early_payout_holds`
  - equivalent to or derived from the bookmaker-early-payout-paid branch with
    any remaining exchange resolution approved in later implementation
- `scenario_pnl_if_early_payout_reverses`
  - bookmaker early payout has already been credited, but the exchange lay side
    later wins because the original team/player does not go on to win

Current-value formula:

- before trigger:
  - `projected_current_pnl = min(scenario_pnl_if_back_wins_ordinary, scenario_pnl_if_lay_wins_ordinary)`
- after trigger but before final settlement:
  - `projected_current_pnl = min(scenario_pnl_if_early_payout_holds, scenario_pnl_if_early_payout_reverses)`

Final/settled formula:

- ordinary settled `Back Won` / `Win` branch before trigger -> ordinary back-win scenario
- ordinary settled `Lay Won` / `Lose` / `No Selection Won` before trigger -> ordinary lay-win scenario
- triggered early payout that ultimately holds -> `scenario_pnl_if_early_payout_holds`
- triggered early payout where match reverses -> `scenario_pnl_if_early_payout_reverses`
- `Void` -> `0` unless later approved house-rule handling differs

Manual override handling:

- if `manual_override_value` exists, resolved output becomes that value
- app must require override reason

Error/blank handling:

- missing required numeric inputs produce unresolved outputs rather than guessed values
- missing trigger-state details after a trigger hit produce unresolved outputs

## 10. Assumptions

- early payout is modelled as one sportsbook row with an additional trigger state
  - why: cleaner audit and reporting than splitting one wager into multiple rows
  - source: later interpretation
  - human confirmation required: Yes
- trigger-hit state should be explicit rather than inferred from final result
  - why: current value after trigger is materially different from pre-trigger current value
  - source: later interpretation
  - human confirmation required: Yes
- 2UP should not add any speculative value before trigger
  - why: cash-first rule values what is actually worth money now, not what might trigger later
  - source: OpenForge cash-first interpretation
  - human confirmation required: Yes
- result vocabulary will likely need explicit early-payout branches
  - why: current sportsbook result set does not fully distinguish triggered vs ordinary outcomes
  - source: later interpretation
  - human confirmation required: Yes

## 11. Rounding rules

- lay stake rounding: 2 decimal places
- liability rounding: 2 decimal places
- P&L rounding: 2 decimal places
- displayed decimals: 2 for money
- stored precision: To confirm, but sufficient to preserve trigger-state trace
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
  - rows remain open until final match resolution even if early payout has triggered
- overdue inclusion rule:
  - open rows with past `date_settled` count as overdue

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Ordinary back win | `Back Won` / `Win` without trigger | ordinary back-win formula | Yes | Yes |
| Ordinary lay win | `Lay Won` / `Lose` / `No Selection Won` without trigger | ordinary lay-win formula | Yes | Yes |
| Early payout holds | future explicit trigger-confirmed branch | `scenario_pnl_if_early_payout_holds` | Yes after trigger | Yes |
| Early payout reverses | future explicit trigger-reversed branch | `scenario_pnl_if_early_payout_reverses` | Yes after trigger | Yes |
| Void | `Void` | `0` or approved void rule | No | Yes |
| Manual override | override entered | override replaces resolved value | N/A | Yes |

## 15. Status and reporting inclusion

- open positions:
  - `Prospecting`
  - `Not Placed`
  - `Placed`
  - triggered-but-not-final rows still count as open
- overdue positions:
  - open rows with past `date_settled`
- current-value reports:
  - use pre-trigger or post-trigger conservative value depending on trigger state
- realised P&L reports:
  - settled-only rows
- selected date range:
  - by profile tracker settings
- weekly summary:
  - by settled date unless current-value reporting mode explicitly includes open rows
- monthly summary:
  - aggregated from settled/open report rules above

## 16. Fixtures required

- open row before trigger
- open row after trigger but before final settlement
- settled row where early payout holds
- settled row where early payout reverses
- void case
- manual override case
- profile isolation pair

## 17. Test cases

- pre-trigger rows use ordinary sportsbook current-value minimum
- post-trigger rows use triggered-state conservative value
- triggered-holds settlement resolves correctly
- triggered-reverses settlement resolves correctly
- override replaces formula output
- profile isolation remains intact
