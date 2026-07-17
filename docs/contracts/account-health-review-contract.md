# Calculation Contract: Account-Health Review

_Last updated: 2026-06-30_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: To confirm
- Related spreadsheet source: `Profit Tracker`, `Accounts`, `Sportsbook Bets`, `Settings`
- Related source-pack file: `_input/TRACKER_CURRENT_STATE_FROM_WO_MB_TRACKER_MAY2026.md`
- Related issue/task: `Write calculation contract for account-health review`

## 1. Product context

- Application: Plum Duff
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `accounts`, `sportsbook_bets`
- Required `profile_id` handling: account-health review must only read sportsbook and account rows for the selected profile
- Fund Manager visible? Yes, as profile-level health summaries only
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This contract defines the workbook-style account-health review shown in `Profit Tracker`.

It supports:

- bookmaker/account health activity review
- mug-bet cadence review
- last offer recency review
- profile-level operational follow-up prompts

It does not define account balances or sportsbook P&L directly.

## 3. Workflow context

- encountered during profit-review and operational maintenance
- recalculated when sportsbook history, account statuses, or settings cadence values change
- shown in the workbook `Profit Tracker` account-health block and any future web dashboard/tooling surface
- review-time operational logic

## 4. Spreadsheet equivalent

- Primary sheets:
  - `Profit Tracker`
  - `Accounts`
  - `Sportsbook Bets`
  - `Settings`
- Representative workbook behaviour:
  - account-health list starts from active/limited bookmaker accounts
  - derives:
    - last offer activity
    - last mug bet
    - days since mug bet
    - suggested action
    - last offer type
    - last offer name
    - last offer result
  - mug-bet cadence threshold is driven by workbook settings
- Known workbook caveat:
  - workbook output is operational guidance, not a financial total

## 5. Cash-first/current-value behaviour

- This contract is not a cash-first P&L calculation directly
- It still supports the cash-first workflow by helping the operator maintain bookmaker health and offer rotation
- Applies before settlement: Yes
- Calculates multiple scenario outcomes: No
- Value shown:
  - recency/activity guidance values rather than money values

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | required isolation key |
| `account_id` | id/string | Yes | accounts row | entered/system | Yes | account identity |
| `account_name` | string | Yes | accounts row | entered | Yes | bookmaker name |
| `account_status` | enum | Yes | accounts row | entered | Yes | workbook uses active/limited filtering |
| `default_mug_frequency_days` | integer | Yes | settings | derived/entered | Yes | cadence threshold |
| `sportsbook_rows` | row set | No | sportsbook ledger | derived | Yes | selected profile only |
| `offer_type` | enum | No | sportsbook row | entered | Yes | used for last offer type |
| `offer_name` | string | No | sportsbook row | entered | Yes | used for last offer name |
| `result` | enum | No | sportsbook row | entered | Yes | used for last offer result |
| `date_settled` | date | No | sportsbook row | entered | Yes | recency source |
| `bookmaker` | string | No | sportsbook row | entered | Yes | row-to-account matching key |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `last_offer_activity_at` | date/datetime | dashboard/profit review | current operational state | derived | last non-mug sportsbook activity |
| `last_mug_bet_at` | date/datetime | dashboard/profit review | current operational state | derived | last mug-bet activity |
| `days_since_mug_bet` | integer/string | dashboard/profit review | current operational state | derived | may be `Never` style in workbook |
| `suggested_action` | string | dashboard/profit review | current operational state | derived | workbook currently suggests mug-bet action |
| `last_offer_type` | string | dashboard/profit review | current operational state | derived | last non-mug offer type |
| `last_offer_name` | string | dashboard/profit review | current operational state | derived | last non-mug offer name |
| `last_offer_result` | string | dashboard/profit review | current operational state | derived | last non-mug offer result |

## 8. Formula source

- current tracker workbook formula
- workbook settings/dashboard/profit-tracker findings
- workbook current-state document

## 9. Formula

Included accounts:

- include accounts where:
  - `profile_id` matches selected profile
  - account type is bookmaker-compatible
  - `account_status` matches workbook operational statuses such as `Active` or `Limited`

Last offer activity:

- latest sportsbook row date for the bookmaker where offer type is not `Mug Bet`

Last mug bet:

- latest sportsbook row date for the bookmaker where offer type is `Mug Bet`

Days since mug bet:

- if last mug bet exists:
  - `today - last_mug_bet_at`
- otherwise:
  - workbook-style `Never`/empty guidance value

Suggested action:

- if days since mug bet is greater than or equal to `default_mug_frequency_days`:
  - `Place Mug Bet`
- otherwise:
  - `To confirm` for MVP exact workbook-parity wording on non-action rows

Last offer metadata:

- derive last non-mug sportsbook row by date
- read its offer type, offer name, and result

## 10. Assumptions

- workbook account-health review is bookmaker-centric rather than generic across all account types
- mug-bet cadence threshold is intended to be configurable from settings
- exact non-action wording for rows below the threshold may need a later workbook-UI parity check
- sportsbook row date is the operative recency source for this review

## 11. Rounding rules

- not applicable for core logic
- `days_since_mug_bet` should use whole-day logic

## 12. Commission rules

- not applicable

## 13. Liability/exposure rules

- not applicable directly
- this contract must not be used as a substitute for liability or P&L summaries

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Active account with no mug bet history | no mug rows | `days_since_mug_bet = Never` style output | Yes | Yes |
| Active account over cadence threshold | days since mug >= threshold | `suggested_action = Place Mug Bet` | Yes | Yes |
| Active account under cadence threshold | days since mug < threshold | non-action guidance | Yes | Yes |
| Inactive/unsupported account | status outside inclusion | excluded | Yes | Yes |

## 15. Status and reporting inclusion

- open positions:
  - not directly part of this contract
- overdue positions:
  - not directly part of this contract
- current-value reports:
  - not a monetary report
- realised P&L reports:
  - not applicable
- selected date range:
  - not primarily dashboard-range driven; recency logic is account-history driven
- weekly summary:
  - not a week-summary metric
- monthly summary:
  - not a month-summary metric
- profile overview:
  - can contribute operational health indicators
- cross-profile comparison:
  - headline health counts only if later approved

## 16. Fixtures required

- active account with recent non-mug offer and no mug history
- active account over mug-bet threshold
- active account under mug-bet threshold
- limited account included case
- inactive account excluded case
- profile isolation case

## 17. Test cases

- `account_health_includes_active_and_limited_accounts_only`
- `account_health_derives_last_non_mug_offer_activity`
- `account_health_derives_last_mug_bet_date`
- `account_health_flags_place_mug_bet_when_threshold_reached`
- `account_health_handles_never_mug_bet_case`
- `account_health_is_profile_scoped`

## 18. Acceptance tolerance

- day-difference tolerance: exact whole-day match
- account inclusion tolerance: exact

## 19. UI display requirements

- present this as operational account-health guidance, not as profit data
- keep bookmaker name and latest relevant activity visible together
- if dashboard and profit tracker merge later, account-health should remain discoverable rather than hidden behind settings

## 20. Audit trail requirements

- selected `profile_id`
- settings cadence value used
- included account identifiers
- source sportsbook row identifiers used for last-offer and last-mug derivation
- contract version
- timestamp

## 21. Human approval

- reviewer: To confirm
- review date: To confirm
- approval outcome: Pending
- follow-up required before implementation:
  - confirm exact MVP wording for non-action account-health states beneath the mug-bet threshold
