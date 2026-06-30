# OpenForge Workbook Cash-First Calculation Map

_Last updated: 2026-06-30_

## Purpose

This document records how the workbook values positions before settlement and how that affects dashboard, reporting, and later application design.

This is the core behaviour OpenForge must preserve.

## Cash-first principle

The workbook asks:

`What is this row worth to the bankroll right now?`

This is different from a calculator-only workflow that only suggests a lay stake at placement time.

## Core output pattern

The workbook commonly uses:

`scenario outcomes -> CalcNetPnL -> NetPnL`

Override layer:

`NetPnL = FinalNetPnL if present else CalcNetPnL`

This means the workbook can carry both:

- a formula-derived current/final value
- a manually corrected final value

## Sportsbook current-value behaviour

### Open or pending rows

For sportsbook rows that are open:

- scenario outcomes are calculated first
- current row value uses the conservative/worst-case scenario
- for simple rows this is usually `MIN(bookie_win_value, lay_win_value)`
- for multi-lay rows this is the minimum across all active scenarios

This allows open positions to affect current dashboard and report values.

### Settled rows

For settled sportsbook rows:

- the workbook chooses the scenario output that matches `Result`
- `Void` can resolve to zero
- `FinalNetPnL` can override the formula result

### Required separation

OpenForge must keep separate:

- back stake and odds
- actual lay values
- reference lay values
- liability values
- scenario values
- projected/current value
- settled/final value
- manual override value

## Free-bet current-value behaviour

### Open or pending rows

Free bets also calculate scenario outcomes before settlement.

Current value uses a conservative minimum across active scenarios.

This is affected by:

- retention mode
  - `SNR`
  - `SR`
- strategy
  - `Standard`
  - `Underlay`
  - `Overlay`
  - `Custom`
  - `No Lay`
  - `Partial Lay`

### Settled rows

Settled free bets choose scenario output by result and still allow `FinalNetPnL` override.

### Expiry and open-state interaction

Free bets also use:

- `CountsAsOpen`
- `IsOverdue`
- expiry date/time

This means they contribute to both financial and operational risk surfaces before settlement.

## Casino current/final behaviour

Casino rows are simpler but still follow the same idea:

- active states contribute open monitoring
- `CalcNetPnL` and `FinalNetPnL` remain distinct
- `NetPnL` resolves to final override if present

## Dashboard implications

Dashboard totals are not strictly historic settled profit.

They can include current open-position value because the dashboard sums ledger `NetPnL`, and ledger `NetPnL` may already reflect:

- conservative sportsbook current value
- conservative free-bet current value
- casino current/final value

OpenForge must make this visible in UI wording.

## Reporting implications

The workbook reports by date range and week labels, but the values can still reflect current row value rather than only settled history.

OpenForge reports must clearly separate:

- current/open-position reporting
- settled/final reporting

The workbook defaults do not justify silently flattening all reports to settled-only.

## Cash-first fields that need explicit contracts

Priority contracts:

1. sportsbook current-value calculation
2. sportsbook final-value resolution
3. free-bet current-value calculation
4. free-bet final-value resolution
5. liability and exposure calculation
6. dashboard selected-range P&L aggregation
7. report settled/current inclusion rules

## UI implications

OpenForge must not label all money values as generic profit.

UI must distinguish:

- current value
- projected value
- settled value
- final value
- override value

Warnings or helper text should exist where values are:

- open
- scenario-based
- conservative
- manually overridden

## Import/export implications

When importing workbook-shaped data, OpenForge must preserve:

- entered values
- derived helper flags where needed or recomputable
- override values
- result and status values
- date fields used for reporting and overdue logic

It must not collapse imported rows into settled-only history.

## Testing implications

Cash-first testing requires:

- open sportsbook fixture with conservative minimum result
- multi-lay open sportsbook fixture
- settled sportsbook fixture
- open `SNR` free-bet fixture
- open `SR` free-bet fixture
- settled free-bet fixture
- no-lay/mug-bet fixture
- override fixture

Every future money-facing UI or report test should reference whether it expects:

- current/projected values
- settled/final values
- override-resolved values

## Known review point

The source pack notes that sportsbook no-lay mug-bet winning behaviour may currently act like cash return rather than pure profit in one branch.

This must be handled as a deliberate contract review item, not silently copied or silently corrected.
