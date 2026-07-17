# Contract: Sportsbook Import Reconciliation

_Last updated: 2026-07-17_

## Status and authority

- Status: Approved issue `#12` implementation tranche
- Calculation authority: `docs/contracts/sportsbook-current-value-contract.md`
- Import authority: `docs/contracts/sportsbook-import-field-map-contract.md`

## Purpose

Compare the workbook's resolved Sportsbook value with Plum Duff's independently recomputed
cash-first `reporting_value` before confirmation.

## Source and recomputed values

- Source control precedence is Plum Duff `ReportingValue`, then workbook `NetPnL`.
- `CalcNetPnL` and scenario/helper columns are never source authority.
- Recalculation uses all imported entered fields supported by the approved engine, including refund,
  cashback, DDHH and branch-preserving multi-lay extensions.
- Advanced rows that cannot resolve safely remain `incomplete`; they are not flattened.
- Exchange commission resolves from the selected profile and named exchange.

## States and tolerance

- `matched`: all rows compare and total difference is at most `0.01`.
- `mismatch`: all rows compare and total difference exceeds `0.01`.
- `incomplete`: source output, profile commission, entered inputs or calculation branches are not
  sufficient for every row.
- `not_available`: another mapping is selected.

Money uses round-half-up at `0.01`. Source values are comparison-only and never overwrite Plum
Duff values.

## Safety and acceptance

- No laid row receives a silent commission default.
- `No Lay` does not require commission.
- A standard pending row reconciles to `-0.58`.
- Source `1.00` against recomputed `-0.58` reports a `1.58` mismatch.
- Missing commission reports `incomplete`.
- A settled void no-lay row reconciles to `0.00`.
- A complete two-outcome multi-lay row reconciles to `7.39` without losing branch structure.
