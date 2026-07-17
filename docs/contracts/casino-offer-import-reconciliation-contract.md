# Contract: Casino Offer Import Reconciliation

_Last updated: 2026-07-17_

## Status and authority

- Status: Approved issue `#12` implementation tranche
- Calculation authority: `docs/contracts/casino-offer-resolved-value-contract.md`
- Import authority: `docs/contracts/casino-offer-import-field-map-contract.md`
- Deferred: independent wager, free-spin and game-specific calculator reconciliation

## Purpose

Compare the workbook's resolved casino total (`NetPnL`, or Plum Duff export `ResolvedNetPnL`) with
the value independently resolved from imported `CalcNetPnL` and `FinalNetPnL` inputs.

## Calculation

For each compatible row:

1. Use `FinalNetPnL` when present.
2. Otherwise use `CalcNetPnL`.
3. A prospecting row with both blank resolves to the approved `0.00` placeholder.
4. Quantise to `0.01` using round-half-up.

Batch totals sum the source resolved values and Plum Duff resolved values separately. Difference is
absolute and uses a `0.01` acceptance tolerance.

## States

- `matched`: every row is comparable and the total difference is at most `0.01`
- `mismatch`: every row is comparable and the difference exceeds `0.01`
- `incomplete`: source resolved output is missing/invalid or Plum Duff cannot resolve a row
- `not_available`: another ledger mapping is selected

## Safety rules

- Source `NetPnL`/`ResolvedNetPnL` remains comparison-only.
- `CalcNetPnL` remains a transitional current/reference input, not evidence of an independent casino
  offer calculator.
- A mismatch is visible but cannot overwrite entered or resolved Plum Duff values.
- Missing comparison data must not display zero or claim a match.

## Acceptance

- Current `-2.50` and final `5.00` rows reconcile to a combined `2.50`.
- Source `99.00` against recomputed `-2.50` reports a `101.50` mismatch.
- Missing source resolved output reports `incomplete`.

