# Contract: Import Row Accounting Reconciliation

_Last updated: 2026-07-17_

## Status and scope

- Status: Approved implementation tranche for issue `#12`
- Parent: `docs/contracts/spreadsheet-import-export-roundtrip-contract.md`
- Applies to: Sportsbook Bets, Free Bets, Casino Offers, Cash Adjustments and Accounts

This contract proves that every parsed workbook row is represented by exactly one staged or final
import action. It is a process-integrity control, not a financial control-total calculation.

## Inputs

- persisted import batch `row_count`
- persisted action summary counts
- batch status

Recognised action counts include `insert`, `update`, `no_op`, `blocked`, `imported` and
`skipped_by_operator`. Unknown action keys remain counted so a future action cannot silently remove
a row from reconciliation.

## Output

- `source_row_count`: parsed rows recorded on the batch
- `accounted_row_count`: sum of every non-negative integer action count
- `state`: `complete` when both counts match, otherwise `mismatch`
- `message`: concise human-readable explanation

## Rules

1. `accounted_row_count` must equal `source_row_count` in dry-run and confirmed states.
2. A mismatch is a blocking integrity failure and must be visible in the import-review UI.
3. Confirmation must reject a batch whose row accounting is not complete.
4. The UI must call this `Row accounting`, not financial reconciliation.
5. This result must not imply that workbook P&L, exposure, balances or report totals agree with
   Plum Duff calculations.
6. Per-ledger financial control totals remain separately contract-gated.

## Acceptance

- All five implemented ledger mappings expose the same row-accounting result.
- A five-row batch with action counts totalling five reports `complete`.
- A five-row batch with action counts totalling four reports `mismatch` and cannot confirm.
- Confirmed imported and operator-skipped counts still total the original source row count.

