# Calculation Contract: Dashboard Selected-Range P&L

_Last updated: 2026-06-30_

## 0. Contract status

- Status: Draft
- Owner: Codex planning draft
- Human approval required before implementation: Yes
- Related workflow contract: To confirm
- Related spreadsheet source: `Dashboard`, `Sportsbook Bets`, `Free Bets`, `Casino Offers`, `Cash Adjustments`, `Accounts`
- Related source-pack file: `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- Related issue/task: `Write calculation contract for dashboard selected-range P&L`

## 1. Product context

- Application: OpenForge
- Module: Tracker
- Future/deferred module: OddsForge
- Profile scoped: Yes
- Profile-owned table(s): `sportsbook_bets`, `free_bets`, `casino_offers`, `cash_adjustments`, `accounts`
- Required `profile_id` handling: all dashboard metrics must be filtered to the selected profile
- Fund Manager visible? Yes, only through aggregated profile metrics
- Subscriber/profile tracker visible? Yes

## 2. Purpose

This calculation defines the selected-range dashboard summary for:

- sportsbook P&L
- free-bet P&L
- casino P&L
- total P&L
- open counts
- overdue counts
- part-laid counts
- current liability
- selected cash adjustments
- account balance blocks and cash snapshot

## 3. Workflow context

- encountered during daily dashboard review
- recalculated when date preset, custom dates, offsets, or underlying row values change
- shown on the selected profile dashboard as the main operational summary

## 4. Spreadsheet equivalent

- Primary sheet: `Dashboard`
- Supporting sheets:
  - `Accounts`
  - `Sportsbook Bets`
  - `Free Bets`
  - `Casino Offers`
  - `Cash Adjustments`
- Representative formula behaviour:
  - `SportsbookPnL = SUMIFS(SportsbookBets[NetPnL], DateSettling in resolved range)`
  - `FreeBetPnL = SUMIFS(FreeBets[NetPnL], DateSettling in resolved range)`
  - `CasinoPnL = SUMIFS(CasinoOffers[NetPnL], DateSettling in resolved range)`
  - open bets from `CountsAsOpen`
  - overdue bets from `IsOverdue`
  - part-laid counts from `LayStatus` plus date-range tag
  - current liability from open sportsbook and free-bet liabilities
  - cash snapshot from accounts quick-view logic
- Known workbook rule:
  - selected-range P&L can include unsettled current values because ledger `NetPnL` may already be current conservative value

## 5. Cash-first/current-value behaviour

- Question answered: what is the selected profile worth across the chosen date range and current operational state right now?
- Applies before settlement: Yes
- Calculates multiple scenario outcomes: Indirectly, by consuming ledger `NetPnL`
- Value shown for open/pending rows:
  - dashboard can include unresolved/open row value because ledger rows may carry current conservative `NetPnL`
- Conservative `MIN()` style outcome used: Indirectly through underlying ledger calculations
- Current/projected vs final/settled separation:
  - dashboard totals are resolved aggregates of underlying row `NetPnL`
  - therefore dashboard can reflect current/projected value as well as settled values
- Reports before settlement:
  - dashboard selected-range summary is current-state aware
- Reports after settlement:
  - totals resolve naturally as row results settle or override

## 6. Inputs

| Field | Type | Required? | Source | User-entered or calculated? | Profile-scoped? | Notes |
|---|---|---:|---|---|---:|---|
| `profile_id` | id | Yes | app context | derived | Yes | required isolation key |
| `date_preset` | enum | Yes | dashboard config | entered | Yes | selected date preset |
| `range_back_days` | integer | No | dashboard config | entered | Yes | date range offset |
| `range_forward_days` | integer | No | dashboard config | entered | Yes | date range offset |
| `custom_start_date` | date | No | dashboard config | entered | Yes | custom preset support |
| `custom_end_date` | date | No | dashboard config | entered | Yes | custom preset support |
| `sportsbook_net_pnl_rows` | row set | No | sportsbook ledger | derived | Yes | filtered by profile/date |
| `free_bet_net_pnl_rows` | row set | No | free-bet ledger | derived | Yes | filtered by profile/date |
| `casino_net_pnl_rows` | row set | No | casino ledger | derived | Yes | filtered by profile/date |
| `cash_adjustment_rows` | row set | No | adjustment ledger | derived | Yes | filtered by profile/date/type |
| `account_rows` | row set | No | accounts ledger | derived | Yes | filtered by profile |

## 7. Outputs

| Field | Type | Used where? | Current/projected or final? | Stored or derived? | Notes |
|---|---|---|---|---|---|
| `resolved_start_date` | date | dashboard | helper | derived | date controller |
| `resolved_end_date` | date | dashboard | helper | derived | date controller |
| `bookie_balance` | money | dashboard | current | derived | filtered accounts |
| `exchange_balance` | money | dashboard | current | derived | filtered accounts |
| `bank_balance` | money | dashboard | current | derived | filtered accounts |
| `pending_withdrawals` | money | dashboard | current | derived | filtered accounts |
| `cash_snapshot` | money | dashboard/profile summary | current | derived | quick-view sum |
| `sportsbook_pnl` | money | dashboard | current/final aggregate | derived | selected range |
| `free_bet_pnl` | money | dashboard | current/final aggregate | derived | selected range |
| `casino_pnl` | money | dashboard | current/final aggregate | derived | selected range |
| `total_pnl` | money | dashboard | current/final aggregate | derived | sum of module pnl |
| `open_bet_count` | integer | dashboard/profile summary | current | derived | helper count |
| `overdue_bet_count` | integer | dashboard/profile summary | current | derived | helper count |
| `part_laid_count` | integer | dashboard | current | derived | in-range lay status count |
| `current_liability` | money | dashboard/profile summary | current | derived | open liability aggregate |
| `selected_cash_adjustments` | money | dashboard | current | derived | selected types only |

## 8. Formula source

- current tracker workbook formula
- cash-first calculation spec
- workbook current-state document

## 9. Formula

Date-range resolver:

- resolve base start/end from preset
- apply back and forward day offsets

Account balances:

- `bookie_balance = sum(accounts.current_balance where type = Bookie and counts_in_cash_total = true)`
- `exchange_balance = sum(accounts.current_balance where type = Exchange and counts_in_cash_total = true)`
- `bank_balance = sum(accounts.current_balance where type = Bank and counts_in_cash_total = true)`
- `pending_withdrawals = sum(accounts.pending_withdrawal_amount where counts_in_cash_total = true)`
- `cash_snapshot = sum(account quick-view balances)`

Selected-range P&L:

- `sportsbook_pnl = sum(sportsbook_bets.net_pnl where date_settled in resolved range)`
- `free_bet_pnl = sum(free_bets.net_pnl where date_settled in resolved range)`
- `casino_pnl = sum(casino_offers.net_pnl where date_settled in resolved range)`
- `total_pnl = sportsbook_pnl + free_bet_pnl + casino_pnl`

Open and overdue counts:

- `open_bet_count = count(sportsbook counts_as_open true) + count(free_bet counts_as_open true) + count(casino counts_as_open true)`
- `overdue_bet_count = count(sportsbook is_overdue true) + count(free_bet is_overdue true) + count(casino is_overdue true)`

Part-laid count:

- count sportsbook and free-bet rows where:
  - `lay_status = Part Laid`
  - `date_range_tag = In Date Range`

Current liability:

- workbook baseline:
  - `sum(open sportsbook liability_1) + sum(open free_bet liability_1)`

Selected cash adjustments:

- sum selected-range signed cash adjustments for:
  - `Deduction`
  - `Withdrawal`
  - `Subscription`
  - `TopUp`

## 10. Assumptions

- dashboard selected-range P&L intentionally uses ledger `NetPnL`, even when ledger `NetPnL` reflects open current value
- cash snapshot remains account-driven rather than bet-driven
- current liability follows workbook baseline rather than expanded full multi-lay exposure unless later approved
- selected cash-adjustment types remain limited to the workbook logic above

## 11. Rounding rules

- all money aggregates follow underlying row rounding
- dashboard display rounds to 2 decimal places
- no extra hidden aggregate rounding should be added

## 12. Commission rules

- no direct commission formula here
- dashboard inherits commission effects only through underlying row `NetPnL` and liability fields

## 13. Liability/exposure rules

- dashboard `current_liability` is an open-state exposure summary
- exposure must remain filtered by `profile_id`
- cross-profile overviews may aggregate headline exposure but must not mix row detail without explicit profile context

## 14. Scenario outcomes

| Scenario | Trigger/result | Formula | Included before settlement? | Included after settlement? |
|---|---|---|---:|---:|
| Open current-value row | ledger row unresolved but in range | underlying `NetPnL` | Yes | N/A |
| Settled row | ledger row settled and in range | underlying `NetPnL` | N/A | Yes |
| Open liability | open sportsbook/free-bet rows | liability aggregate | Yes | No |

## 15. Status and reporting inclusion

- open positions:
  - from row helper flags, not inferred only from result
- overdue positions:
  - from row helper flags
- current-value reports:
  - dashboard is explicitly current-state aware
- realised P&L reports:
  - separate report mode may be needed later; `To confirm`
- selected date range:
  - controlled by shared date resolver
- weekly/monthly summary:
  - out of this contract directly, but dashboard numbers should remain consistent with report contracts where scope overlaps
- profile overview:
  - may consume dashboard-derived metrics
- cross-profile comparison:
  - headline aggregates only

## 16. Fixtures required

- selected-range open sportsbook case
- selected-range open free-bet case
- settled mixed-module range case
- out-of-range exclusion case
- account balance inclusion/exclusion case
- profile isolation case

## 17. Test cases

- `dashboard_date_resolver_matches_preset_and_offsets`
- `dashboard_selected_range_pnl_sums_net_pnl_across_modules`
- `dashboard_open_and_overdue_counts_follow_helper_flags`
- `dashboard_part_laid_count_uses_status_and_date_range_tag`
- `dashboard_current_liability_uses_open_liability_baseline`
- `dashboard_cash_snapshot_uses_accounts_counts_in_cash_total`
- `dashboard_profile_scope_prevents_cross_profile_aggregation_leak`

## 18. Acceptance tolerance

- money aggregate tolerance: exact to 0.01
- count tolerance: exact integer equality

## 19. UI display requirements

- make clear that selected-range P&L may include current open-position value
- do not label dashboard totals as settled-only unless a separate settled-only mode exists
- cash snapshot, current liability, and selected-range P&L must be clearly distinct concepts

## 20. Audit trail requirements

- applied date preset and resolved range
- contract version
- timestamp
- acting user
- affected `profile_id`

## 21. Human approval

- reviewer: To confirm
- review date: To confirm
- approval outcome: Pending
- follow-up required before implementation:
  - confirm whether MVP needs a settled-only dashboard/report toggle distinct from current-state dashboard totals
