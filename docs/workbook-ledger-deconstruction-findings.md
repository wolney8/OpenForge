# OpenForge Workbook Ledger Deconstruction Findings

_Last updated: 2026-06-30_

## Purpose

This document records a focused workbook-analysis pass over the day-to-day core ledgers:

- `Sportsbook Bets`
- `Free Bets`
- `Casino Offers`

The goal is to capture the strategy-dependent and outcome-dependent branches that make these sheets the most critical source-of-truth surfaces for OpenForge Tracker.

## Sources checked

- `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- `_input/TRACKER_FORMULA_APPENDIX_MAY2026.md`
- `_input/TRACKER_CURRENT_STATE_FROM_WO_MB_TRACKER_MAY2026.md`
- `_input/WO_MB_Tracker_May2026.xlsx`

## 1. Sportsbook Bets

## 1.1 Why this sheet is critical

`Sportsbook Bets` is the most complex workbook ledger.

It covers:

- standard qualifying bets
- no-lay rows
- mug bets
- cashback/refund-style rows
- custom and partial lay handling
- multi-lay rows
- outcome-specific scenarios
- current-value versus settled-value logic

## 1.2 Strategy branches confirmed

Confirmed workbook strategy modes:

- `Standard`
- `Underlay`
- `Overlay`
- `Custom`
- `No Lay`
- `Partial Lay`
- `Multilay`
- `Multilay-Underlay`

Confirmed behaviour:

- `Standard` uses classic lay-stake formula
- `Underlay` uses a distinct formula based on back profit over lay liability odds
- `Overlay` uses a distinct formula favouring lay-side outcome shape
- `Custom` and `Partial Lay` leave formula lay stake blank unless actual/manual values are supplied
- `No Lay` forces lay stake to `0`
- `Multilay` adds second and third lay branches
- `Multilay-Underlay` uses a shared-allocation formula across multiple lay outcomes

## 1.3 Scenario branches confirmed

Sportsbook scenario fields include:

- outcome 1 / bookie wins
- lay/no-selection wins
- outcome 2 wins
- outcome 3 wins

Result branches confirmed in workbook formula:

- `Back Won`
- `Win`
- `Outcome 1 Won`
- `Lay Won + Cashback`
- `Lay Won`
- `Lose`
- `No Selection Won`
- `Outcome 2 Won`
- `Outcome 3 Won`
- `Void`
- `Mixed`

Current workbook handling:

- `Back Won`, `Win`, `Outcome 1 Won` -> outcome 1 scenario
- `Lay Won + Cashback` -> `LayStake1 * (1 - Commission1)`
- `Lay Won`, `Lose`, `No Selection Won` -> lay-win scenario
- `Outcome 2 Won` -> second scenario branch
- `Outcome 3 Won` -> third scenario branch
- `Void` -> zero
- `Mixed` -> blank/unresolved

## 1.4 Special sportsbook offer branches confirmed

### No-lay mug bet / no-offer branch

Confirmed workbook behaviour:

- if `OfferType` is `None` or `Mug Bet` and strategy is `No Lay`
- bookie-win branch uses:
  - `BackStake * BackOdds`
- lay/lose branch uses:
  - `-BackStake`

This is workbook-confirmed and not generic matched-betting behaviour.

### Double Delight / Hat-trick Heaven branch

Confirmed workbook behaviour:

- extra scenario fields `AU` and `AV` are used
- these change scenario values when `OfferType = "Double Delight / Hat-trick Heaven"`

This means OpenForge must not treat sportsbook rows as simple two-scenario bets only.

## 1.5 Current-value behaviour confirmed

Open sportsbook rows use conservative current value:

- standard/single-lay style rows:
  - `MIN(outcome_1, lay_win)`
- multi-lay style rows:
  - `MIN(outcome_1, lay_win, outcome_2, outcome_3 where present)`

This confirms sportsbook current value is deeply strategy and outcome dependent.

## 1.6 Operational helper behaviour confirmed

Confirmed sportsbook helper logic:

- `LayStatus`:
  - `Not Laid`
  - `Part Laid`
  - `Fully Laid`
- `CountsAsOpen`:
  - true for `Prospecting`, `Not Placed`, `Placed`
- `IsOverdue`:
  - true when open and settling date is in the past

## 2. Free Bets

## 2.1 Why this sheet is critical

`Free Bets` is not just a simplified sportsbook ledger.

It changes value logic based on:

- retention mode
- match strategy
- expiry
- current-state vs settled-state handling

## 2.2 Retention modes confirmed

Confirmed free-bet retention modes:

- `SNR`
- `SR`

These change both:

- lay-stake calculation
- scenario P&L outcomes

Confirmed workbook formulas:

- `SNR` base lay stake:
  - `(FreeBetValue * (BackOdds - 1)) / (LayOdds1 - Commission)`
- `SR` base lay stake:
  - `(FreeBetValue * BackOdds) / (LayOdds1 - Commission)`

## 2.3 Strategy branches confirmed

Confirmed workbook strategy modes:

- `Standard`
- `Underlay`
- `Overlay`
- `Custom`
- `No Lay`
- `Partial Lay`

Confirmed behaviour:

- `Underlay` multiplies base free-bet lay stake by workbook setting factor
- `Overlay` multiplies base free-bet lay stake by workbook setting factor
- settings defaults confirmed in source pack:
  - underlay factor `0.928`
  - overlay factor `1.300`
- `No Lay` sets lay stake to `0`
- `Custom` and `Partial Lay` remain unresolved unless enough actual/manual values are supplied

## 2.4 Scenario branches confirmed

Free-bet scenario logic confirmed:

- bookie/back wins branch
- lay wins / lose branch
- void branch

No-lay behaviour confirmed:

- no-lay lose branch resolves to `0`
- no-lay back-win branch differs by retention mode:
  - `SNR` -> `FreeBetValue * (BackOdds - 1)`
  - `SR` -> `FreeBetValue * BackOdds`

Laid behaviour confirmed:

- `SNR` back-win scenario subtracts liability
- `SR` back-win scenario subtracts liability
- lay-win branch uses lay return after commission

## 2.5 Current-value behaviour confirmed

Open free-bet rows use:

- `MIN(bookie_win_scenario, lay_win_scenario)`

This confirms the cash-first rule is active here too, not just in sportsbook rows.

## 2.6 Operational helper behaviour confirmed

Confirmed free-bet helper logic:

- `LayStatus`:
  - `Not Laid`
  - `Part Laid`
  - `Fully Laid`
- `CountsAsOpen`:
  - true for `Prospecting`, `Available`, `Placed`
- `IsOverdue`:
  - true when open and expiry datetime has passed

## 3. Casino Offers

## 3.1 Why this sheet is critical

`Casino Offers` is structurally simpler than sportsbook and free bets, but it is still a day-to-day operational ledger and contributes directly to:

- selected-range P&L
- weekly/monthly reporting
- open/overdue monitoring

## 3.2 Casino value pattern confirmed

Confirmed workbook pattern:

- `NetPnL = IF(FinalNetPnL<>"", FinalNetPnL, CalcNetPnL)`

This means casino rows still follow the same:

- calculated value
- optional override
- resolved output

pattern used elsewhere.

## 3.3 Operational helper behaviour confirmed

Confirmed casino helper logic:

- `CountsAsOpen` true for:
  - `Prospecting`
  - `Started`
  - `In Progress`
- `IsOverdue` true when open and expiry has passed
- `DateRangeTag` derived from dashboard resolved date range
- `WeekLabel` derived from start date

## 3.4 Current workbook observation

In the inspected workbook rows, casino examples often use `FinalNetPnL` directly, with `CalcNetPnL` blank or secondary.

Build implication:

- OpenForge still needs to preserve the override pattern
- casino logic may need more workbook deconstruction later if we want a deeper formula inventory for all casino offer types

## 4. Cross-ledger findings

## 4.1 Shared cash-first pattern

All three ledgers use or support:

- current value before final settlement
- final override values
- open/overdue helper flags
- derived week/date-range helpers

## 4.2 Shared build implication

OpenForge must not reduce these sheets into:

- one generic “bet” form
- one generic even-profit calculator
- a settled-only ledger

The implementation needs ledger-specific and strategy-specific behaviour.

## 4.3 Current deconstruction status

What is now well established:

- sportsbook strategy branches
- sportsbook result branches
- sportsbook multi-scenario current-value logic
- free-bet `SNR/SR` split
- free-bet underlay/overlay settings dependency
- casino helper-state behaviour

What still deserves deeper deconstruction later:

- full casino formula coverage by offer subtype
- more exhaustive workbook examples for `Double Delight / Hat-trick Heaven`
- exact user-entry versus formula-entry expectations for custom/partial-lay flows in live UI

## 5. Recommended next use of these findings

Use these findings to:

- strengthen workflow contracts
- draft import/export mapping for these ledgers
- design row-detail UI that can explain scenario values
- create later automated regression fixtures and live-UI test paths
