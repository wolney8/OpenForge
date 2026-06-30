# Workflow Contract: Free Bet Lifecycle

_Last updated: 2026-06-30_

## 1. Workflow name

- Name: Free bet lifecycle

## 2. User goal

Allow the Fund Manager, inside a selected profile tracker, to record, review, and settle free-bet rows with correct handling for:

- `SNR`
- `SR`
- expiry
- no-lay
- underlay/overlay
- manual lay overrides
- current-value before settlement

## 3. Current spreadsheet equivalent

- primary sheet: `Free Bets`
- supporting read surfaces:
  - `Dashboard`
  - `Profit Tracker`
  - `Reports`

## 4. Route and input screens

- route(s):
  - `/profiles/:profileId/tracker/free-bets`
- screen(s):
  - free-bet ledger grid
  - free-bet row entry/edit form
  - row detail / scenario view
- entry points:
  - add free-bet row
  - claim or record available free bet
  - place free bet
  - settle free bet
- profile context required:
  - yes, mandatory

## 5. Database tables

- `free_bets`
- `accounts`
- `calculation_audit`
- optionally linked `sportsbook_bets` through `origin_qual_bet_id`

## 6. Status transitions

| From status | Action | To status | Notes |
|---|---|---|---|
| blank/new | create prospect row | `Prospecting` | free bet identified but not yet available |
| `Prospecting` | free bet awarded/available | `Available` | open-state row |
| `Available` | place free bet | `Placed` | open-state row |
| `Placed` | settle back-win path | `Settled` + result `Back Won` / `Win` | retention mode matters |
| `Placed` | settle lay-win path | `Settled` + result `Lay Won` / `Lose` | lay branch settles |
| `Placed` | void | `Settled` + result `Void` | resolves to zero |

## 7. Calculations touched

- `docs/contracts/free-bet-current-value-contract.md`
- `docs/contracts/liability-exposure-contract.md`
- `docs/contracts/dashboard-selected-range-pnl-contract.md`

## 8. Reports touched

- selected profile dashboard
- selected profile profit/activity view
- weekly/monthly reports
- profile overview aggregates

## 9. Edge cases

- `SNR` vs `SR`
- expired but unsettled free bet
- no-lay row
- underlay row
- overlay row
- custom or partial lay row
- actual lay override supplied
- manual final override
- profile mismatch

## 10. Audit notes

Retain:

- retention mode
- original entered values
- scenario outputs
- expiry state changes
- override reason if used
- origin qualifying-bet reference
- acting user and timestamp

## 11. Tests required

- free-bet current-value fixture cases
- `SNR`/`SR` differentiation cases
- expiry/overdue cases
- no-lay cases
- override cases
- profile isolation tests

## 12. Playwright path

Draft UI path:

1. log in
2. select profile
3. open free bets
4. add or edit free-bet row
5. select `SNR` or `SR`
6. verify current value/liability appears
7. settle row
8. verify row and dashboard summaries update
