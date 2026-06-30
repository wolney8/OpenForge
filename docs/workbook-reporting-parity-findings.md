# OpenForge Workbook Reporting Parity Findings

_Last updated: 2026-06-30_

## Purpose

This document records a direct workbook-analysis pass over reporting behaviour, with emphasis on:

- weekly report construction
- monthly rollups
- retained profit logic
- dashboard-controlled date-range dependencies
- differences between dashboard/profit-review totals and formal report totals

## Sources checked

- `_input/WO_MB_Tracker_May2026.xlsx`
- `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- `_input/TRACKER_FORMULA_APPENDIX_MAY2026.md`
- `_input/TRACKER_CURRENT_STATE_FROM_WO_MB_TRACKER_MAY2026.md`

## 1. Reporting is layered, not a separate source system

The workbook does not maintain an independent reporting ledger.

Instead:

- primary ledgers compute row-level `NetPnL`, `SignedAmount`, `DateRangeTag`, and `WeekLabel`
- `Dashboard` controls active start/end dates for selected-range views
- `Profit Tracker` reuses the dashboard range for recent-activity review
- `Reports` builds weekly rows from ledger outputs
- monthly rows are then rolled up from weekly rows

### Build implication

- OpenForge should keep reports downstream from the same ledger/calculation engine used by tracker views
- reporting parity should not be implemented as a disconnected summary subsystem with separate financial logic

## 2. Weekly report rows are generated from unioned ledger week labels

Direct workbook formulas show the weekly report:

- unions week labels from sportsbook, free bets, and casino offers
- converts `W/C dd/mm/yyyy` labels back into week-start dates
- sorts and deduplicates them into the weekly report spine

This means the weekly report is driven by ledger activity weeks, not by a fixed calendar table.

### Build implication

- report periods should be derived from ledger activity or generated deterministically from ledger dates
- parity does not require a pre-seeded calendar dimension for MVP

## 3. Weekly sportsbook reporting uses resolved row values

Weekly sportsbook P&L sums sportsbook row outputs grouped by week.

Workbook evidence shows sportsbook reporting prefers:

- `FinalNetPnL` when present
- otherwise calculated row value

This matches the contract rule already documented elsewhere:

- final override remains distinct from formula output
- report totals must consume the resolved displayed row value

### Build implication

- reporting must use the same override-resolution rule as the ledger UI
- reports should not bypass `FinalNetPnL`

## 4. Weekly free-bet reporting is status-filtered and not identical to dashboard sums

Free-bet weekly report logic applies a status filter:

- include only rows matching `Placed` or `Settled`

It also resolves:

- `FinalNetPnL` when present
- otherwise calculated `NetPnL`

This is important because the workbook's general dashboard/profit-review logic is more current-state aware, while weekly report logic is narrower for free bets.

### Build implication

- OpenForge must not assume every report uses the same inclusion rules as dashboard selected-range P&L
- weekly free-bet reporting needs an explicit parity contract because it is more restrictive than the generic cash-first current-value model

## 5. Weekly casino reporting groups by week label and uses row net value

Casino weekly P&L is grouped by derived week label and sums row `NetPnL`.

There is no evidence here of a special status filter analogous to the free-bet weekly filter.

### Build implication

- casino reporting is simpler than free-bet reporting, but still downstream of row-level override logic

## 6. Retained profit is a signed-value composition, not a separate formula family

Weekly retained profit is calculated as:

- total weekly P&L
- plus weekly withdrawals
- plus weekly costs/subscriptions

Because withdrawals, deductions, and subscriptions use negative `SignedAmount`, adding them reduces retained profit.

The costs/subscriptions logic recognises:

- `Subscription`
- `Deduction`
- `Costs`

### Build implication

- retained-profit reporting must preserve signed-value semantics
- OpenForge should not flip signs again at report time
- legacy or imported `Costs` values may need report support even if not exposed as a primary new-entry type

## 7. Monthly reporting rolls up weekly rows, not raw ledgers

Direct workbook formulas show monthly reporting:

- derives month start values from weekly rows
- sums weekly sportsbook/free-bet/casino/cash-adjustment values into month totals

So the reporting chain is:

1. row calculations in ledgers
2. weekly report rows
3. monthly rollups from weekly rows

### Build implication

- MVP can implement weekly parity first and derive monthly parity from the same weekly dataset
- monthly reporting should not be treated as a wholly separate calculation contract

## 8. Dashboard selected-range P&L and formal reports are related but not identical

The workbook contains two different summary modes:

- dashboard/profit-review selected-range views driven by `Dashboard!H6:H7`
- formal weekly/monthly report tables driven by `WeekLabel` and report rollups

These overlap, but they are not perfect equivalents because:

- selected-range views are current-state aware
- free-bet weekly reporting applies a narrower status filter
- report period boundaries are week/month based, not arbitrary range based

### Build implication

- OpenForge should preserve both:
  - flexible selected-range tracker summaries
  - formal reporting-period summaries
- one should not silently replace the other

## 9. Dashboard-controlled date range remains central outside the Reports sheet

Direct workbook formulas confirm:

- ledger `DateRangeTag` helpers compare row dates against `Dashboard!H6:H7`
- dashboard quick views use those resolved dates directly
- `Profit Tracker` inherits the same resolved range

This means dashboard date control is a cross-cutting workbook mechanism, not only a UI convenience.

### Build implication

- OpenForge needs a central date-range state model for tracker views
- report presets and tracker date controls should be deliberately related, not independently improvised

## 10. Parity rules to carry into later contracts

The workbook reporting pass confirms these rules should be made explicit later:

1. Reports are downstream of ledger values, not separate truth.
2. Weekly reports are activity-week driven.
3. Monthly reports roll up weekly rows.
4. Free-bet weekly inclusion rules differ from generic selected-range visibility.
5. Resolved row values must honour final overrides before reporting.
6. Retained profit depends on signed cash-adjustment semantics.
7. `Costs` may remain a report-tolerated legacy type.
8. Selected-range summaries and formal reports must both exist.

## Recommended next use

- update workbook workflow and blueprint docs with report-layer distinctions
- add a future reporting contract for weekly free-bet inclusion rules
- extend import/export notes so week labels are treated as derived fields, not imported authority
