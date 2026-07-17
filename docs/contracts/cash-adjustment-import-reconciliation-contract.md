# Contract: Cash Adjustment Import Reconciliation

_Last updated: 2026-07-17_

## Status and authority

- Status: Approved issue `#12` implementation tranche
- Calculation authority: `docs/contracts/cash-adjustment-aggregation-contract.md`
- Import authority: `docs/contracts/cash-adjustment-import-field-map-contract.md`
- Parent workflow: `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`

## Purpose

Compare the workbook's cash-adjustment `SignedAmount` control total with Plum Duff's independently
recomputed signed total during dry-run review. The workbook helper remains comparison-only and must
never overwrite direction or amount.

## Inputs

For every staged Cash Adjustments source row:

- source `SignedAmount`
- entered `Direction`
- entered unsigned `Amount`
- row compatibility state

## Calculation

Per row, use the approved calculation engine:

- `In`: `+amount`
- `Out`: `-amount`
- quantise each amount to `0.01` using `ROUND_HALF_UP`

Batch totals:

- `source_total = SUM(valid source SignedAmount)`
- `recomputed_total = SUM(contract-calculated signed amount)`
- `difference = ABS(source_total - recomputed_total)`

## States

- `matched`: every source row is compatible/comparable and difference is at most `0.01`
- `mismatch`: every source row is comparable and difference exceeds `0.01`
- `incomplete`: at least one source helper is blank/invalid or a row cannot be contract-calculated
- `not_available`: the selected import mapping is not Cash Adjustments

## Safety rules

- A mismatch is a visible warning, not an authority switch.
- Confirmation continues to use entered direction and amount after the existing explicit review,
  selection and verified-backup boundary.
- `SignedAmount` is never written as an entered field.
- An incomplete comparison must not display zero or claim a match.
- Other ledger mappings must report `not_available` until their calculation-specific import inputs
  and fixtures are approved.

## Acceptance

- `+50.00` and `-20.00` source helpers reconcile to `30.00`.
- A source helper of `999.00` for a recomputed `50.00` reports a `949.00` mismatch.
- A missing source helper reports `incomplete`, not `matched`.
- The review UI identifies source and Plum Duff totals separately and states that Plum Duff is
  authoritative.

