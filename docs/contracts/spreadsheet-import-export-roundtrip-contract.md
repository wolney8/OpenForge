# Workflow Contract: Spreadsheet Import and Export Round Trip

_Last updated: 2026-07-17_

## Status and sources

- Status: Approved baseline; sportsbook-v1, free-bets-v1, casino-offers-v1,
  cash-adjustments-v1 and accounts-v1 implemented
- Milestone: M7 Reporting and Import/Export
- Workbook sources: `Sportsbook Bets`, `Free Bets`, `Casino Offers`, `Cash Adjustments`, `Accounts`, `Settings`, `Reports`
- Excluded source: `SignupUsers`
- Related planning: `docs/planning/openforge-phase-2-import-export-addendum.md`

## User goal

Import workbook-shaped tracker records into one explicitly selected profile and export profile-scoped data without losing workbook identity, entered values, current/final separation, overrides or auditability.

## Import workflow

1. Fund Manager selects a target `profile_id` before choosing a file.
2. Plum Duff reads the selected supported sheet into a staging batch; it does not write ledger rows yet.
3. Headers, types, named-list values, source ids, statuses and dates are validated.
4. A dry-run shows insert, update, duplicate, skipped and error counts by sheet.
5. The Fund Manager searches/reviews staged rows and explicitly selects compatible new rows.
6. Unchanged duplicates are labelled as already imported and skipped; they are not selectable.
7. The Fund Manager resolves blocking errors and explicitly confirms the selected rows.
8. The batch writes atomically per approved policy and records source lineage.
9. Plum Duff confirms every source row is represented by one staged/final action.
10. Plum Duff recomputes derived fields and compares workbook-derived financial control totals only
    where the relevant per-ledger calculation contract and fixtures define that comparison.

## Field authority

| Field class | Import behaviour |
|---|---|
| Workbook/source identity | Preserve in a dedicated source-id field |
| User-entered values | Import as entered after validation |
| Calculator/reference values | Import for comparison/audit where mapped; recompute for application authority |
| Current/projected values | Recompute from contracts; compare to source within contract tolerance |
| Settled/final values | Preserve source settlement inputs and recompute resolved value |
| Manual override | Import only with override reason; otherwise block the override |
| `WeekLabel` / date-range helpers | Recompute; never treat as source authority |

The current source pack and calculation contracts outrank an older workbook export. A difference outside tolerance must be visible; it must not be silently normalised.

## Duplicate and update rules

- Identity key: target `profile_id` + source sheet + source record id.
- Re-importing the same unchanged source row is idempotent.
- A changed source row requires an explicit update decision and an audit diff.
- A source id already attached to another profile is a blocking isolation error.
- No fuzzy matching may update financial rows automatically.
- A row deselected during confirmation is retained as `skipped_by_operator` in batch audit.
- Only an unconfirmed dry-run review may be deleted. Confirmed import audit cannot be deleted.
- Raw uploaded workbook bytes are processed in memory and are not retained as batch storage.

## Export workflow

- Export always identifies its profile scope and selected date/report mode.
- Per-profile export may include ledgers, accounts, settings and report views.
- Combined export contains aggregate/read-only report outputs, not mixed editable operational rows.
- Export labels must distinguish current/projected, settled/final and manual-override values.
- Export must not include credentials, secrets or raw authentication/session data.

## Reporting reconciliation

- Cross-ledger row accounting follows
  `docs/contracts/import-row-accounting-reconciliation-contract.md` and is distinct from financial
  reconciliation.
- Weekly/monthly/yearly reporting is rebuilt from ledger rows using the reporting contracts.
- Sportsbook, free-bet, casino and cash-adjustment control totals are compared separately.
- Cash Adjustment signed totals, Casino Offer resolved totals, Free Bet cash-first values and
  Sportsbook cash-first values are implemented through their calculation-specific
  import-reconciliation contracts.
- Selected-range current-value views must not be compared as if they were settled-only formal reports.
- Money tolerance follows the upstream calculation contract, normally exact to `0.01` after stated rounding.

## Failure and rollback

- Blocking validation errors prevent commit.
- A failed committed batch rolls back its writes or records an explicit partial-failure state if the database cannot guarantee full atomicity.
- Imported rows retain `import_batch_id` and source identity.
- Deleting an import batch must not silently delete later-edited operational rows.

## Tests and Playwright path

- valid profile-targeted import
- unknown header/status and invalid date dry-run errors
- idempotent re-import
- cross-profile source-id collision
- manual override without reason blocked
- derived helper fields recomputed
- export/import round trip preserves entered and settlement fields
- report control totals reconcile
- source-row count equals the sum of staged/final action counts before confirmation
- UI path: select profile -> import -> dry-run -> confirm -> review batch -> export profile

## Approval gates

- XLSX is the first user-facing file type; synthetic JSON is internal/test transport only.
- Changed financial-ledger rows remain blocked until their per-ledger update path is approved;
  unchanged rows are no-ops. Accounts `accounts-v1` now supports individually selected changes with
  before/after diff, verified backup, atomic update, account audit and lineage replacement.
- Source calculator/reference columns are retained in staged audit, while Plum Duff recomputation is
  authoritative.
- A verified local SQLite backup is mandatory immediately before every confirmed write.
- Every implemented ledger confirmation rejects a batch whose persisted action counts do not account
  for every parsed source row.
- Exact per-ledger header maps remain contract-gated; sportsbook `sportsbook-v1` is defined in
  `docs/contracts/sportsbook-import-field-map-contract.md`.
- The current user-facing implementation reads the selected `Sportsbook Bets` or `Free Bets` XLSX
  table. It does not open or stage `SignupUsers`.
- Populated sportsbook-shaped rows immediately outside a stale table range are staged with an
  explicit warning rather than being silently omitted.
- Confirmed sportsbook imports create and verify a local backup before one atomic write transaction.
- Profile sportsbook export preserves entered fields and labels current/projected, settled/final,
  reporting and manual-override values separately.
- Free Bets `free-bets-v1` mapping is defined in
  `docs/contracts/free-bet-import-field-map-contract.md`.
- Confirmed Free Bets imports preserve expiry, SNR/SR mode, entered lay values, source links and
  manual override reasons; commission and money outputs are recomputed from profile settings and
  the approved free-bet calculation contract.
- Profile Free Bets export preserves source identity and labels current/projected, settled/final
  and reporting values separately. Unchanged export re-imports are no-ops.
- Casino Offers `casino-offers-v1` mapping is defined in
  `docs/contracts/casino-offer-import-field-map-contract.md`.
- Casino import/export preserves operational wager/spin inputs and the confirmed
  `FinalNetPnL`-over-`CalcNetPnL` resolution boundary without claiming deferred offer-specific
  calculation coverage.
- Cash Adjustments `cash-adjustments-v1` mapping is defined in
  `docs/contracts/cash-adjustment-import-field-map-contract.md`; entered direction and unsigned
  amount are preserved while signed amount and week label are recomputed.
- Accounts `accounts-v1` is defined in `docs/contracts/accounts-import-field-map-contract.md`.
  Sign-up date and notes round-trip; `LastPromoUsed` remains derived and Risk Team remains universal
  catalogue comparison metadata rather than profile-owned authority.
- Changed Accounts rows follow
  `docs/contracts/accounts-import-update-approval-contract.md`; they are never preselected and
  require individual approval after field-level diff review.
- Settings import remains gated behind the Fund Manager authority restructure. Global catalogue and
  offer-name authorities must not be silently written into profile-scoped settings.
