# Contract: Free Bet Import Reconciliation

_Last updated: 2026-07-17_

## Status and authority

- Status: Approved issue `#12` implementation tranche
- Calculation authority: `docs/contracts/free-bet-current-value-contract.md`
- Import authority: `docs/contracts/free-bet-import-field-map-contract.md`
- Profile settings authority: selected profile exchange commissions and free-bet strategy factors

## Purpose

Compare the workbook's resolved Free Bet value with Plum Duff's independently recomputed cash-first
`reporting_value` before any selected rows are confirmed.

## Source and recomputed values

- Source control value precedence:
  1. Plum Duff round-trip export `ReportingValue`;
  2. workbook `NetPnL`.
- `CalcNetPnL` is a helper/reference field and is never source authority.
- Plum Duff recomputes each compatible row through
  `calculate_free_bet_current_value` using the row's entered fields.
- Exchange commission resolves from the selected profile and named exchange.
- Underlay and overlay factors resolve from the selected profile's Tracker settings.
- Source values are comparison-only and never overwrite a recomputed value.

## States and tolerance

- `matched`: every row is comparable and the absolute total difference is at most `0.01`.
- `mismatch`: every row is comparable and the absolute total difference exceeds `0.01`.
- `incomplete`: a source value is absent/invalid, a row is blocked, or the engine cannot resolve it.
- `not_available`: another ledger mapping is selected.

Money is quantised to `0.01` using round-half-up before totals are compared.

## Commission and profile safety

- Commission is a profile-specific Exchange setting, not a workbook input and not a per-row default.
- A laid row whose exchange commission cannot be resolved is `incomplete`.
- A `No Lay` row does not require exchange commission.
- No generic commission, strategy factor, profile or source value may be silently substituted.

## Acceptance

- A standard pending SNR row with a configured `0.02` commission reconciles to `7.57`.
- A source `9.00` against recomputed `7.57` reports a `1.43` mismatch.
- A laid row without a configured commission reports `incomplete`.
- A pending no-lay row reconciles to `0.00` without commission.
- A row without `ReportingValue` or `NetPnL` reports `incomplete` even when Plum Duff can calculate it.
