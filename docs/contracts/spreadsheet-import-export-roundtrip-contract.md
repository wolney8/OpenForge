# Workflow Contract: Spreadsheet Import and Export Round Trip

_Last updated: 2026-07-14_

## Status and sources

- Status: Draft, ready for human review
- Milestone: M7 Reporting and Import/Export
- Workbook sources: `Sportsbook Bets`, `Free Bets`, `Casino Offers`, `Cash Adjustments`, `Accounts`, `Settings`, `Reports`
- Excluded source: `SignupUsers`
- Related planning: `docs/planning/openforge-phase-2-import-export-addendum.md`

## User goal

Import workbook-shaped tracker records into one explicitly selected profile and export profile-scoped data without losing workbook identity, entered values, current/final separation, overrides or auditability.

## Import workflow

1. Fund Manager selects a target `profile_id` before choosing a file.
2. OpenForge reads supported sheets into a staging batch; it does not write ledger rows yet.
3. Headers, types, named-list values, source ids, statuses and dates are validated.
4. A dry-run shows insert, update, duplicate, skipped and error counts by sheet.
5. The Fund Manager resolves blocking errors and explicitly confirms the batch.
6. The batch writes atomically per approved policy and records source lineage.
7. OpenForge recomputes derived fields and compares workbook-derived control totals.

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

## Export workflow

- Export always identifies its profile scope and selected date/report mode.
- Per-profile export may include ledgers, accounts, settings and report views.
- Combined export contains aggregate/read-only report outputs, not mixed editable operational rows.
- Export labels must distinguish current/projected, settled/final and manual-override values.
- Export must not include credentials, secrets or raw authentication/session data.

## Reporting reconciliation

- Weekly/monthly/yearly reporting is rebuilt from ledger rows using the reporting contracts.
- Sportsbook, free-bet, casino and cash-adjustment control totals are compared separately.
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
- UI path: select profile -> import -> dry-run -> confirm -> review batch -> export profile

## Approval gates

- Approve exact workbook header map and supported file types.
- Approve update/conflict policy and rollback semantics.
- Approve which calculator/reference columns are retained for audit.
- Import implementation requires a verified backup immediately before confirmed write unless explicitly waived later.

