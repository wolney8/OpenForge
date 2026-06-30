# Workflow Contract: Casino Offer Lifecycle

_Last updated: 2026-06-30_

## 1. Workflow name

- Name: Casino offer lifecycle

## 2. User goal

Allow the Fund Manager, inside a selected profile tracker, to record and manage casino offer rows that contribute to current activity, open/overdue monitoring, and reporting.

## 3. Current spreadsheet equivalent

- primary sheet: `Casino Offers`
- supporting read surfaces:
  - `Dashboard`
  - `Profit Tracker`
  - `Reports`

## 4. Route and input screens

- route(s):
  - `/profiles/:profileId/tracker/casino-offers`
- screen(s):
  - casino offer ledger grid
  - casino offer row entry/edit form
  - row detail / status view
- entry points:
  - add casino offer row
  - update casino offer progress
  - settle casino offer row
- profile context required:
  - yes, mandatory

## 5. Database tables

- `casino_offers`
- `calculation_audit`

## 6. Status transitions

| From status | Action | To status | Notes |
|---|---|---|---|
| blank/new | create offer row | `Prospecting` | not yet started |
| `Prospecting` | begin offer | `Started` | active/open |
| `Started` | offer in active progress | `In Progress` | active/open |
| `Started` / `In Progress` | settle/close offer | `Settled` | final result/value set |

## 7. Calculations touched

- current/final casino `NetPnL` resolution
- `docs/contracts/dashboard-selected-range-pnl-contract.md`

## 8. Reports touched

- selected profile dashboard
- selected profile profit/activity view
- weekly/monthly reports
- profile overview aggregates

## 9. Edge cases

- missing `DateSettling`
- expiry passed while still open
- `FinalNetPnL` override present
- different offer types such as wager/free-spins rows
- profile mismatch

## 10. Audit notes

Retain:

- original economic inputs
- status changes
- final override value and reason if used
- acting user and timestamp

## 11. Tests required

- casino current/final value resolution cases
- overdue/open helper cases
- dashboard/report aggregation cases that consume casino `NetPnL`
- profile isolation tests

## 12. Playwright path

Draft UI path:

1. log in
2. select profile
3. open casino offers
4. add or update casino offer
5. verify status/open/overdue indicators
6. settle offer
7. verify row and dashboard summaries update
