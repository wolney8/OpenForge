# Workflow Contract: Sportsbook Bet Lifecycle

_Last updated: 2026-06-30_

## 1. Workflow name

- Name: Sportsbook bet lifecycle

## 2. User goal

Allow the Fund Manager, inside a selected profile tracker, to record, review, and settle sportsbook rows that may represent:

- qualifying bets
- mug bets
- no-lay bets
- partial/custom lays
- multi-lay bets
- cashback/refund-style offer rows

## 3. Current spreadsheet equivalent

- primary sheet: `Sportsbook Bets`
- supporting read surfaces:
  - `Dashboard`
  - `Profit Tracker`
  - `Reports`

## 4. Route and input screens

- route(s):
  - `/profiles/:profileId/tracker/sportsbook-bets`
  - likely row-detail drawer/modal inside sportsbook screen
- screen(s):
  - sportsbook ledger grid
  - sportsbook row entry/edit form
  - row detail / scenario view
- entry points:
  - add sportsbook row
  - edit existing sportsbook row
  - settle sportsbook row
- profile context required:
  - yes, mandatory

## 5. Database tables

- `sportsbook_bets`
- `accounts` for bookmaker/exchange references
- `calculation_audit`
- optionally linked `free_bets` through origin/follow-on references

## 6. Status transitions

| From status | Action | To status | Notes |
|---|---|---|---|
| blank/new | create prospect row | `Prospecting` | offer identified but not placed |
| `Prospecting` | row prepared for placement | `Not Placed` or `Placed` | workbook supports both |
| `Not Placed` | place bet | `Placed` | open-state row |
| `Placed` | settle as winning back side | `Settled` + result `Back Won` / `Win` / `Outcome 1 Won` | result branch drives final value |
| `Placed` | settle as lay/no-selection win | `Settled` + result `Lay Won` / `Lose` / `No Selection Won` | result branch drives final value |
| `Placed` | settle as cashback outcome | `Settled` + result `Lay Won + Cashback` | special outcome branch |
| `Placed` | settle multi-outcome offer | `Settled` + result `Outcome 2 Won` or `Outcome 3 Won` | DDHH / multi-lay branch |
| `Placed` | void bet | `Settled` + result `Void` | resolves to zero |
| `Placed` | unresolved mixed case | `Settled` + result `Mixed` | current workbook leaves value blank |

## 7. Calculations touched

- `docs/contracts/sportsbook-current-value-contract.md`
- `docs/contracts/liability-exposure-contract.md`
- `docs/contracts/dashboard-selected-range-pnl-contract.md`

## 8. Reports touched

- selected profile dashboard
- selected profile profit/activity view
- weekly/monthly reports
- profile overview aggregates

## 9. Edge cases

- missing lay odds
- actual lay override supplied
- partial lay state
- custom lay state
- no-lay row
- mug-bet/no-offer row
- multi-lay row
- `Lay Won + Cashback`
- `Outcome 2 Won`
- `Outcome 3 Won`
- `Mixed`
- manual final override
- profile mismatch

## 10. Audit notes

Retain:

- original entered values
- resolved strategy
- scenario outputs
- override reason if used
- result change history
- linked free-bet reference
- acting user and timestamp

## 11. Tests required

- sportsbook current-value fixture cases
- sportsbook settlement outcome cases
- multi-lay cases
- no-lay mug-bet parity case
- profile isolation tests
- dashboard/report aggregation cases that consume sportsbook `NetPnL`

## 12. Playwright path

Draft UI path:

1. log in
2. select profile
3. open sportsbook bets
4. add or edit sportsbook row
5. enter strategy-specific inputs
6. verify current value/liability appears
7. settle row with selected result
8. verify row and dashboard summaries update
