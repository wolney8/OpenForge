# Contract: Import Row Accounting Reconciliation

_Last updated: 2026-09-26 12:20 BST_

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


## CP-050 validation parity

Full-workbook and per-ledger maps share established Restricted → Bonus Restricted, Dormant → Inactive and App Only → Mobile compatibility; exact unique punctuation/case provider normalisation is allowed, never fuzzy matching. Unknown access vocabulary stays an explicit review decision. Pending sign-up does not manufacture a zero balance from a blank.

Numeric XLSX cells may encode exact decimal values in scientific notation: expand those numeric cells using Decimal without rounding, with a bounded expansion. Text-cell/manual odds keep strict syntax validation. Original workbook checksum/raw file and source-cell identity retain provenance.

Sportsbook FinalNetPnL is comparison evidence, not an override; only explicit ManualOverrideValue requires its reason. Casino FinalNetPnL retains the existing explanatory UserNotes requirement in both routes. Every Account validation error must appear in review, even if its provider already resolves. These repairs do not weaken native settlement validation or approve source decisions.

The full workbook path intentionally retains non-executed opportunity records as source evidence with no financial transaction, and can route historical Extra Place records to their separate imported-historical destination. The generic Sportsbook confirmation writes ordinary Sportsbook rows only; it must not silently turn these into placed bets or flatten missing Extra Place terms. Its native-only restriction is distinct from an unresolved source decision.

A settled/placed positive actual Sportsbook lay without an Exchange is a shared import review error: its commission cannot be resolved from cached P&L. Casino review reasons are stored in existing UserNotes; no new reason column is introduced.

Account validation failures represented by review items enter REVIEW_REQUIRED, not a failed analysis job. Decisions can be saved without approving an import; Account validation still blocks approval/execution until explicitly resolved. Unrepresented validation failures remain failed.

Per-ledger confirmation retains its verified full LOCAL SQLite-backup prerequisite. On PostgreSQL it returns409 before backup or writes, with the governed Profile workbook-import workflow identified separately. Dry-run/review remain available; do not present a PostgreSQL per-ledger confirmation as tested/supported or bypass the backup gate.


## CP-051 scoped approval application and portable evidence

Owner decisions are approved for the selected checksum and exact source identities only. Apply scoped Account access overrides, defer unresolved providers without operational rows, retain reasoned owner-accepted terminal source results and explicitly classify the confirmed No Lay Mug Bet. Preserve raw source/decision timestamps separately from activity dates in existing review lineage; portable recovery must retain that evidence. No schema expansion, ordinary-placement validation relaxation or normal cutover is authorised. Validate effective Account state in readiness, preflight and writes; blank balances remain unknown. Historical Free Bet recovery may relax missing placement evidence only with matching immutable reviewed import provenance and a valid terminal override. Rehearsal totals are captured before disposable workflow simulations.


Account access overrides are canonical, reasoned and specific to a review item; deferred providers never create Profile Accounts. Multiple source rows resolving to one provider require an explicit operational-row decision before approval. No last-row-wins lifecycle or balance replacement is permitted. Full-import blank balances remain unknown.

Terminal historical Free Bet acceptance and portable recovery use an internal validation context tied to the saved review action, precise accepted value, destination and workbook lineage. Public new financial writes retain strict requirements. Notes-only updates compare against the stored record and retain its financial/parent state. Owner approval lives separately from freely editable Notes and original activity dates.

Full-workbook Free Bet parent links resolve only against existing same-Profile source identities or full-import write audit; missing/ambiguous parents remain explicit. Portable source identities and review destinations use remapped native IDs, including ambiguous parent candidate evidence. Non-executed opportunity provenance uses the existing reconciliation JSON; it never creates a financial activity. The existing backup format/storage is reused without schema additions.

Source Exchange commission settings remain an explicit verified Profile setup step before a final import. Personal 0%/0% fees do not supply Exchange commission. A rehearsal lacking those source-backed settings cannot label unavailable recalculated values as genuine zero.


## CP-052 destination identity preflight

Before writes, classify every planned source row against Profile + logical namespace + external ID, including deferred rows and non-executed opportunities. A: identical recorded source, reuse without overwriting later operational edits; B: same-Profile identity with changed/uncertain content or destination, block for explicit review; C: another Profile is independent (private cutover comparison only); D: multiple active source rows for one logical identity/provider destination, block together; E: native destination with no matching source identity, surface for review. Deferred rows have no operational destination. Recheck under the write transaction. Never use a content hash as identity, infer equivalence between raw and mapped hash formats, or silently merge financial activity. Existing same-run retries remain idempotent. Portable source identities retain their source meaning while native IDs remap. No schema expansion or normal data cutover.

The per-ledger native-ID fallback must ignore another Profile’s row, while same-Profile native matches retain their existing no-op/update review rules. Per-ledger review recognises full-workbook and restored provenance but does not equate raw workbook hashes with generic mapped hashes: it requires the original governed review context, preventing a cross-path duplicate. Generic changed-Account updates retain their separate individually approved contract. Profile portable recovery requires compatible shared references; a fresh storage rehearsal recreates the existing shared reference configuration through its API before restoring Profile data, without approving missing-reference removals.
