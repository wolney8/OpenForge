# OpenForge Workbook Targeted Findings

_Last updated: 2026-06-30_

## Purpose

This document records the targeted workbook-deconstruction findings for the unresolved areas raised during contract and fixture-spec drafting.

Scope of this pass:

- sportsbook `Mixed` result handling
- sportsbook no-lay mug-bet win-path behaviour
- multi-lay liability exposure in dashboard aggregates
- `Costs` in cash-adjustment/report taxonomy
- current-state versus settled-only dashboard/reporting behaviour

## Sources checked

- `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- `_input/TRACKER_CURRENT_STATE_FROM_WO_MB_TRACKER_MAY2026.md`
- `_input/TRACKER_FORMULA_APPENDIX_MAY2026.md`
- `_input/FIRST_PASS_SCHEMA_REVISED_TRACKER_ONLY_MAY2026.md`
- `_input/WO_MB_Tracker_May2026.xlsx`

## 1. Sportsbook `Mixed` result handling

### Finding

The workbook does define `Mixed` as a possible result value in the result list, but the sportsbook `CalcNetPnL` formula does not resolve it to a number.

Workbook evidence:

- result list includes `Mixed`
- sportsbook `CalcNetPnL` branch:
  - `IF($L2="Mixed","", "")`

### Interpretation

- `Mixed` is a recognised status/result value in the workbook
- the current workbook behaviour for sportsbook `Mixed` is unresolved blank output, not a defined numeric value

### Build implication

- OpenForge should not invent numeric handling for `Mixed` without an explicit later rule
- current contract treatment of `Mixed` as unresolved/blank is faithful to the source of truth

## 2. Sportsbook no-lay mug-bet win-path behaviour

### Finding

The workbook explicitly treats no-lay mug-bet or no-offer rows differently in the sportsbook bookie-win scenario.

Workbook evidence from sportsbook bookie-win formula:

- if `OfferType` is `None` or `Mug Bet` and `MatchStrategy = No Lay`
- formula returns:
  - `ROUND(BackStake * BackOdds, 2)`

For generic no-lay without that offer-type branch, the workbook returns:

- `ROUND(BackStake * (BackOdds - 1), 2)`

For the no-lay mug-bet/no-offer lose branch, the workbook returns:

- `ROUND(-BackStake, 2)`

### Interpretation

- this is not pure profit parity with the usual qualifying-bet logic
- the workbook is treating the win branch like cash return rather than pure profit for that specific no-lay mug-bet/no-offer case
- this is confirmed workbook behaviour, not just a documentation guess

### Build implication

- the contract review warning was correct
- OpenForge can either:
  - preserve workbook parity exactly for MVP, or
  - deliberately normalise it later with a signed-off migration rule
- it should not be silently “fixed” during first implementation

## 3. Multi-lay liability exposure in dashboard aggregates

### Finding

The workbook row model supports `Liability2` and `Liability3` for sportsbook multi-lay rows, but the dashboard current-liability aggregate only sums `Liability1` for sportsbook rows and `Liability1` for free-bet rows.

Workbook evidence:

- sportsbook schema includes:
  - `Liability1`
  - `Liability2`
  - `Liability3`
- dashboard current liability formula:
  - `SUMIFS('Sportsbook Bets'!W:W,'Sportsbook Bets'!AW:AW,TRUE)+SUMIFS('Free Bets'!X:X,'Free Bets'!AF:AF,TRUE)`

That maps to:

- sportsbook `Liability1`
- free-bet `Liability1`

It does not aggregate sportsbook `Liability2` or `Liability3`.

### Interpretation

- workbook parity for dashboard current liability is first-branch only
- workbook row detail still retains full multi-lay branch liabilities
- the dashboard is therefore a simplified exposure summary, not a full row-total multi-lay exposure calculation

### Build implication

- the current liability/exposure contract is accurate:
  - row detail may expose full multi-branch liability
  - dashboard baseline should stay workbook-parity unless explicitly improved later

## 4. `Costs` in cash-adjustment and reporting taxonomy

### Finding

`Costs` appears in report aggregation logic, but it is not present in the current explicit cash-adjustment type lists documented from the workbook/source pack.

Workbook evidence:

- current adjustment type list documents:
  - `Correction`
  - `Deduction`
  - `Deposit`
  - `Subscription`
  - `TopUp`
  - `Withdrawal`
- dashboard selected-range cash adjustment formula includes:
  - `Deduction`
  - `Withdrawal`
  - `Subscription`
  - `TopUp`
- reports weekly costs/subscriptions formula matches:
  - `Subscription|Deduction|Costs`

### Interpretation

- `Costs` is present in report logic as a recognised category pattern
- but it is not confirmed as an active data-validation/entry type in the current documented adjustment-type lists
- this strongly suggests either:
  - legacy support for older rows/categories, or
  - a hidden/older taxonomy branch preserved in report formulas

### Build implication

- MVP data-entry types should not automatically include `Costs` unless confirmed
- report/import logic may still need to tolerate legacy `Costs` rows if encountered in imported workbook-shaped data
- current contract treatment of `Costs` as `To confirm` is correct

## 5. Current-state versus settled-only dashboard/reporting behaviour

### Finding

The workbook clearly supports current-state selected-range dashboard P&L, not just settled-only reporting.

Workbook evidence:

- source-pack statement:
  - dashboard does not only show settled-only historic profit
  - `NetPnL` can already be a current conservative value while rows are pending
- dashboard P&L formulas sum ledger `NetPnL` directly by date range:
  - sportsbook
  - free bets
  - casino
- sportsbook and free-bet `CalcNetPnL` formulas use open-state conservative `MIN(...)`
- weekly reports also aggregate row values from ledgers rather than a separate settled-only-only model

### Interpretation

- current-state awareness is a real workbook feature
- a settled-only-only dashboard would not match the source of truth
- the workbook may still need a future settled-only reporting mode, but that is an enhancement or deliberate reporting split, not the default current behaviour

### Build implication

- dashboard selected-range P&L should preserve current-state cash-first behaviour
- if OpenForge later offers a settled-only mode, it should be an explicit mode or separate report view
- current dashboard/report contract assumptions remain correct

## Summary of targeted outcomes

### Confirmed from source of truth

1. `Mixed` sportsbook result currently resolves to blank/unset, not a numeric value
2. no-lay mug-bet/no-offer sportsbook win branch uses `BackStake * BackOdds`
3. dashboard current liability aggregates only first-branch lay liabilities
4. `Costs` is referenced by reports but is not clearly a current primary adjustment entry type
5. dashboard selected-range P&L is explicitly current-state aware, not settled-only

### Recommended next use of these findings

- keep current contract wording for:
  - sportsbook `Mixed`
  - mug-bet review caveat
  - dashboard liability baseline
  - `Costs` as legacy/To confirm
  - dashboard current-state behaviour
- use these findings when drafting future import rules, UI wording, and regression tests
