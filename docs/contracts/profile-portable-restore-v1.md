# Profile portable restore v1

Last updated: 2026-09-05

## Status

Approved for restore of `profile-portable-export-v1` into a newly created Profile only.
Working-workbook generation, Google runtime validation, incremental workbook updates, and stale
workbook merge remain outside this contract.

## Safety boundary

- Analysis verifies the exact export format, sheet set, column order, null metadata, canonical
  values, per-sheet checksums, Sheet Manifest checksum, Manifest checksum, and aggregate checksum
  before a restore run is created.
- Restore never targets an existing Profile. A new runtime Profile ID is minted immediately before
  the first write, and the requested Profile code must still be unused.
- Profile-owned runtime primary keys are remapped transactionally. Portable/source identities are
  retained in the restore identity map and business-provenance sheets.
- Global catalogue, preset, and opportunity records are reference-only. Missing or fingerprint-
  incompatible references create explicit review items; restore cannot proceed while any item is
  unresolved, and no resolution may overwrite global authority.
- Each execution attempt owns a unique execution ID, attempt number, absent-target checkpoint,
  write-audit rows, reconciliation, and rollback state. A failed acceptance gate deletes the newly
  created target and marks only that attempt's checkpoint/audits restored.

## Financial reconciliation contract

Name: `portable-financial-state-parity-v1`.

The source and restored Profile are projected through the same canonical serializers for Profile
financial metadata, tracker/onboarding inputs, Accounts and balances, all supported ledgers, cash
adjustments, and fees. Runtime IDs are mapped back to portable IDs before comparison. Decimal text,
null versus empty, timestamps, JSON, booleans, row counts, and stable ordering must be identical
after approved global-reference resolutions are applied.

The result is `PASS` only when the source and restored canonical financial projections have the
same SHA-256 checksum. No rounding or tolerance is applied because the contract compares stored
authoritative inputs, not independently recomputed floating-point output.

## Logical parity contract

Name: `portable-logical-parity-v1`.

After restore, the service produces a new `profile-portable-export-v1` workbook and compares its
full supported payload against the reviewed source projection. Runtime primary keys are translated
back to portable IDs. `Profile.profile_code` is excluded because a fresh Profile in the same store
must use a unique runtime code. Restore machinery, attempts, checkpoints, write audits, and export
timestamps are not payload state and remain excluded by the export contract.

The target display name and every other supported authoritative field remain in parity scope.

## Operational acceptance

The restored Profile must pass the existing post-import operational-health service boundary,
including Profile settings, onboarding settings, Account lifecycle validation/hydration,
Sportsbook hydration, and tracker summary source hydration. A failed financial, operational, or
logical gate fails closed and removes the newly created Profile.

## Authorization

Analysis, reference decisions, status reads, and execution require an authenticated Fund Manager
session. Restore runs are owner-scoped. The uploaded workbook is retained only as normalized,
validated Profile payload in the application database; raw XLSX bytes and secrets are not stored.
