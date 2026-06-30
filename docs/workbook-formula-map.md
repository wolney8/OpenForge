# OpenForge Workbook Formula Map

_Last updated: 2026-06-30_

## Purpose

This document maps the major formula families that OpenForge must reproduce or explicitly replace with equivalent application logic.

It does not copy the workbook exhaustively. It records the formula intent and modelling boundaries.

## Formula hierarchy to preserve

Across the main ledgers, the workbook repeatedly uses:

`scenario calculations -> CalcNetPnL -> NetPnL`

Override pattern:

`NetPnL = FinalNetPnL if present else CalcNetPnL`

This pattern exists in:

- `Sportsbook Bets`
- `Free Bets`
- `Casino Offers`

## Date-range controller formulas

Primary sheet:

- `Dashboard`

Important logic:

- date preset to base start date
- date preset to base end date
- resolved start = base start minus back days
- resolved end = base end plus forward days

Presets confirmed in the source pack:

- `Today`
- `Yesterday`
- `This Week`
- `Week (Mon-Sun)`
- `Last Week`
- `Past 7 Days`
- `Past 8 Days`
- `Fortnight`
- `This Month`
- `Last Month`
- `Custom`

OpenForge implication:

- these should become deterministic application date-range resolvers
- reports and dashboard must share one date-range contract

## Accounts formulas

Primary sheet:

- `Accounts`

Main derived behaviour:

- `LastPromoUsed` is a cross-ledger latest-activity style formula

Dashboard account metrics derive from `Accounts`:

- bookie balance
- exchange balance
- bank balance
- pending withdrawals
- cash snapshot

Key inclusion rule:

- `Counts In Cash Total = TRUE` controls whether account values contribute to cash totals

## Cash adjustments formulas

Primary sheet:

- `Cash Adjustments`

Key formulas:

- `SignedAmount = IF(Direction="In", Amount, -Amount)`
- `Date Range Tag` based on dashboard resolved range
- `WeekLabel` based on week commencing from `AdjustmentDate`

OpenForge implication:

- entered amount and signed reporting amount must remain separate
- sign must not be inferred from typed minus values alone

## Sportsbook formulas

Primary sheet:

- `Sportsbook Bets`

### Strategy and reference formulas

- match rating
- exchange commission lookup
- standard lay stake
- underlay reference lay stake
- overlay reference lay stake
- selected lay stake
- multi-lay stake allocation

Strategy variants confirmed:

- `Standard`
- `Underlay`
- `Overlay`
- `Custom`
- `No Lay`
- `Partial Lay`
- `Multilay`
- `Multilay-Underlay`

### Scenario formulas

Scenario families:

- bookie/outcome 1 wins
- no selection / lay wins
- outcome 2 wins for multi-lay
- outcome 3 wins for multi-lay
- void

### Current-value formula

When open/pending:

- single-lay style rows use `MIN(win_scenario, lose_scenario)`
- multi-lay style rows use `MIN(all_active_scenarios)`

This is the core cash-first rule.

### Final-value formula

When settled:

- choose scenario by `Result`
- allow manual `FinalNetPnL` override

### Status helper formulas

- `LayStatus`
- `CountsAsOpen`
- `IsOverdue`
- `Date Range Tag`
- `WeekLabel`

## Free-bet formulas

Primary sheet:

- `Free Bets`

### Retention mode formulas

Two distinct modes:

- `SNR`
- `SR`

These change both scenario value and lay stake logic.

### Strategy formulas

Supported modes:

- `Standard`
- `Underlay`
- `Overlay`
- `Custom`
- `No Lay`
- `Partial Lay`

Underlay and overlay use configurable factors from `Settings`.

### Scenario formulas

- bookie/back wins
- lay/no-selection wins
- void

### Current-value formula

For open or pending rows:

- use conservative minimum of active scenario values

### Final-value formula

For settled rows:

- use result-matched scenario
- allow `FinalNetPnL` override

### Status helper formulas

- `LayStatus`
- `CountsAsOpen`
- `IsOverdue`
- `DateRangeTag`
- `WeekLabel`

## Casino formulas

Primary sheet:

- `Casino Offers`

Key patterns:

- `NetPnL = FinalNetPnL if present else CalcNetPnL`
- `CountsAsOpen` from active statuses
- `IsOverdue` from open state plus expiry
- `DateRangeTag` from dashboard resolved dates
- `WeekLabel` from start date

OpenForge implication:

- casino logic is simpler than sportsbook/free bets but still uses the same current/final and helper-flag patterns

## Dashboard formulas

Primary sheet:

- `Dashboard`

Important derived metric families:

- account balances
- cash snapshot
- selected-range sportsbook P&L
- selected-range free-bet P&L
- selected-range casino P&L
- total P&L
- open bet count
- overdue count
- part-laid count
- current liability
- selected-range cash adjustments

Important modelling rule:

- dashboard totals can include unsettled row value because they sum ledger `NetPnL`

## Reports formulas

Primary sheet:

- `Reports`

Important rollups:

- weekly P&L
- monthly P&L
- yearly P&L
- withdrawals
- costs and subscriptions
- retained profit

Key report dependencies:

- sportsbook `NetPnL`
- free-bet `NetPnL`
- casino `NetPnL`
- cash adjustment `SignedAmount`
- `WeekLabel`

Important modelling rule:

- reports aggregate from ledgers and derived labels, not from copied week sheets

## Formula translation priorities

Priority 1:

- sportsbook current-value engine
- free-bet current-value engine
- liability/exposure logic
- cash adjustment signed amount logic

Priority 2:

- dashboard selected-range aggregates
- weekly/monthly/yearly report aggregates
- account cash snapshot logic

Priority 3:

- reload templates support
- optional operational list builders

## Known formula caveats

- some workbook dynamic-list formulas come through `.xlsx` export as `_xlfn` or dummy wrappers
- the intended business meaning is still recoverable from the source-pack docs
- legacy KPI sheets are not reliable sources
- mug-bet no-lay winning behaviour needs explicit review before being treated as pure profit logic
