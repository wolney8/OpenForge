# Accounts Import Update Approval Contract

Last updated: 2026-07-17

## Status

- Status: Approved implementation baseline for issue #12
- Mapping version: `accounts-v1`
- Profile scoped: Yes
- Related field map: `docs/contracts/accounts-import-field-map-contract.md`

## Purpose

Allow a Fund Manager to update an existing profile Account from a changed workbook row without
silently replacing balances, status, dates, notes, or catalogue-derived metadata.

## Update Identity

- Match by target `profile_id`, source sheet `Accounts`, and stable `AccountID`.
- A source identity attached to another profile remains blocked.
- If no source-lineage row exists, an exact native `account_id` match may establish lineage only
  when that account belongs to the selected profile.
- Account names are still resolved against the universal Account Catalogue before diffing.

## Review and Approval

- An unchanged row remains `no_op`.
- A changed compatible row stages as `update` and exposes field-level before/after values.
- Update rows are never selected automatically and are excluded from `Select all new rows`.
- The Fund Manager must select each update row individually.
- Confirmation requires the same explicit target-profile acknowledgement and verified local backup
  as inserts.
- A batch containing blocking errors cannot be confirmed.

## Financial Safety

- Blank balances remain blank and are not converted to zero.
- Non-blank balance values must be finite decimals and are stored without rounding.
- No sign correction, currency conversion, or P&L inference occurs.
- `LastPromoUsed` remains derived and cannot be updated from the workbook.
- Group and Platform continue to use Account Catalogue authority; Risk Team remains comparison-only.

## Atomic Write and Audit

- Selected inserts and updates execute in one database transaction.
- An update writes an account audit entry containing the proposed record, import batch id, source
  identity, backup id, and prior record.
- Source lineage is inserted or replaced with the new canonical hash only after the account update
  succeeds.
- Unselected updates remain `skipped_by_operator` in immutable batch audit.
- A confirmed batch cannot be replayed.

## Acceptance

- changed row shows accurate before/after fields
- changed row is unselected by default
- unselected update changes no account data
- individually selected update applies only to the selected profile
- balance strings round-trip exactly
- backup, account audit, and source lineage all reference the confirmed update
- cross-profile identity and invalid catalogue/money values remain blocked

