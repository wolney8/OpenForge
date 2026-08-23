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
  - copy qualifying award into one or more linked free-bet rows
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
- `docs/contracts/sportsbook-free-bet-award-bridge-contract.md`

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

## 10. Strategy and lay-mode presentation

Persisted `match_strategy` values remain contract-compatible with the workbook and existing
reporting fixtures:

- `Standard`
- `Underlay`
- `Overlay`
- `Custom`
- `No Lay`
- `Partial Lay`
- `Multilay`
- `Multilay-Underlay`

The editor must not present all of those values as equivalent user-facing workflow choices.
`Underlay`, `Overlay`, and `Custom` are calculator result paths inside the advanced matching
calculator, not top-level strategy modes. The visible sportsbook editor control is `Lay mode`:

- `No Lay`: no exchange placement is required.
- `Standard`: standard single-lay calculator path only.
- `Advanced`: shows Underlay, Standard, Overlay, and Custom result cards; copying a card persists
  the matching result path as the stored strategy.
- `Multi Lay`: enables the multi-lay planner. Legacy `Multilay-Underlay` rows load as `Multi Lay`
  with the underlay planner toggle enabled.

`Partial Lay` is not a visible top-level lay mode. It is a placement state available inside every
lay-capable mode. Legacy or workbook-imported `Partial Lay` rows must remain readable by loading as a
standard single-lay calculator with partial matched stake enabled or inferred from actual matched
stake fields.

Common bet combos may still store a default strategy such as `Underlay` or `Overlay`; those rows
must open in `Advanced` lay mode and preserve the stored strategy until the user copies a result
card or changes lay mode.

## 11. Audit notes

Retain:

- original entered values
- resolved strategy
- scenario outputs
- override reason if used
- result change history
- linked free-bet reference
- linked free-bet award group and split count where applicable
- acting user and timestamp

## 12. Tests required

- sportsbook current-value fixture cases
- sportsbook settlement outcome cases
- multi-lay cases
- no-lay mug-bet parity case
- profile isolation tests
- dashboard/report aggregation cases that consume sportsbook `NetPnL`

## 13. Playwright path

Draft UI path:

1. log in
2. select profile
3. open sportsbook bets
4. add or edit sportsbook row
5. enter strategy-specific inputs
6. verify current value/liability appears
7. settle row with selected result
8. verify row and dashboard summaries update
