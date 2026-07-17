# Calculation Contract: [Name]

_Last updated: 2026-06-29_

## 0. Contract status

- Status: Draft / Ready for review / Approved / Deprecated
- Owner:
- Human approval required before implementation: Yes / No
- Related workflow contract:
- Related spreadsheet source:
- Related source-pack file:
- Related issue/task:

## 1. Product context

- Application: Plum Duff
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes / No
- Profile-owned table(s):
- Required `profile_id` handling:
- Fund Manager visible? Yes / No
- Subscriber/profile tracker visible? Yes / No

## 2. Purpose

Describe what this calculation does and why it exists.

Include whether the calculation supports:

- dashboard value
- sportsbook/qualifying bet row
- free bet row
- casino row
- cash adjustment
- report summary
- balance/exposure
- cross-profile comparison

## 3. Spreadsheet equivalent

Document the current spreadsheet/tracker equivalent.

Include:

- sheet name
- column/header names
- representative formula if known
- whether formula is user-entered, calculated, copied, or dashboard-derived
- whether current workbook uses a `MIN()`/scenario-conservative value
- any known workbook caveats

## 4. Cash-first/current-value behaviour

Plum Duff must preserve the tracker’s cash-first protocol.

Answer:

- What is this row worth to the bankroll right now?
- Does this calculation apply before settlement?
- Does it calculate multiple scenario outcomes?
- Which value is shown for open/pending rows?
- Is a conservative `MIN()` style outcome used?
- How is current/projected value separated from final/settled value?
- What should reports include before settlement?
- What should reports include after settlement?

## 5. Inputs

List every input field.

For each input include:

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|

Required common fields to consider:

- `profile_id`
- `fund_manager_id`
- `record_id`
- `account_id`
- `bookmaker`
- `exchange`
- `date_placed`
- `fixture_date`
- `date_settled`
- `status`
- `result`
- `back_stake`
- `back_odds`
- `lay_odds`
- `lay_stake`
- `commission`
- `liability`
- `free_bet_value`
- `cash_adjustment_amount`
- `manual_override_value`
- `manual_override_reason`

## 6. Outputs

List every output field.

For each output include:

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|

Required value separation to consider:

- `reference_lay_stake`
- `actual_lay_stake`
- `calculated_liability`
- `actual_liability`
- `scenario_pnl_if_back_wins`
- `scenario_pnl_if_lay_wins`
- `projected_current_pnl`
- `actual_net_pnl`
- `final_net_pnl`
- `manual_override_value`
- `reporting_value`

## 7. Formula source

State where the formula comes from.

Allowed sources:

- current tracker workbook formula
- tracker formula appendix
- cash-first calculation spec
- matched betting calculator convention
- manually specified business rule
- derived from test fixture

If formula differs from common matched-betting calculators, explain why.

## 8. Formula

Define the calculation in field names, not spreadsheet column letters.

Include:

- base formula
- scenario formulas
- current-value formula
- final/settled formula
- manual override handling
- error/blank handling

## 9. Rounding rules

Define:

- stake rounding
- liability rounding
- P&L rounding
- displayed decimals
- stored precision
- currency formatting
- whether rounding affects stored values or display only

## 10. Commission rules

Define:

- commission field
- default commission
- per-exchange override
- when commission applies
- when commission does not apply
- how commission affects scenario outcomes

## 11. Liability/exposure rules

Define:

- liability formula
- total exposure formula
- profile-specific exposure
- cross-profile exposure aggregation
- open-position inclusion rule
- overdue inclusion rule

## 12. Scenario outcomes

List all scenarios.

For each scenario include:

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|

Examples:

- bookmaker wins
- exchange wins
- void
- partial void
- free bet expires
- refund awarded
- manual override
- casino settled
- withdrawal pending

## 13. Status and reporting inclusion

Define which statuses count for:

- open positions
- overdue positions
- current-value reports
- realised P&L reports
- selected date range
- weekly summary
- monthly summary
- profile overview
- cross-profile comparison

## 14. Known examples

Use synthetic examples only.

Do not include real workbook values unless anonymised.

Example format:

```json
{
  "profile_id": "PROFILE-001",
  "bookmaker": "Bookmaker A",
  "exchange": "Exchange A",
  "back_stake": 10,
  "back_odds": 2.0,
  "lay_odds": 2.1,
  "commission": 0.02
}
```

## 15. Acceptance tolerance

Define acceptable difference between expected and actual result.

- stake tolerance:
- liability tolerance:
- P&L tolerance:
- percentage tolerance:
- display tolerance:

## 16. Regression fixtures

List required fixtures.

Minimum:

- open/pending row
- settled bookmaker-win row
- settled exchange-win row
- manual override row
- different profile isolation row
- sensitive-data-free fixture

## 17. UI display requirements

Define how the UI must show the result.

Include:

- label text
- tooltip/help text
- warning text
- current vs final value distinction
- assumption display
- scenario drawer requirement
- profile context display
- currency formatting

## 18. API/database requirements

Define:

- tables touched
- columns touched
- stored vs derived fields
- profile scoping
- audit records
- migration notes
- import/export mapping

## 19. Failure states

Define expected behaviour for:

- missing required input
- invalid odds
- invalid stake
- invalid commission
- negative liability
- missing profile
- cross-profile access attempt
- stale imported formula
- manual override without reason
- unsupported calculation mode

## 20. Tests required

Include:

- unit tests
- fixture tests
- profile isolation tests
- API tests
- import/export tests if relevant
- Playwright tests if user-visible

## 21. Human approval

- Approval required before implementation: Yes / No
- Approval required before UI exposure: Yes / No
- Approval required before import/export mapping: Yes / No
- Approved by:
- Approval date:
