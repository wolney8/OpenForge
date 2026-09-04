# Import attempt lineage migration

Status: implemented pending hosted verification
Migration: `20260904_001_import_attempt_lineage`

## Corrective batch

- `PD-FIX-IMPORT-001` — immutable execution attempts: `COMPLETE`
- `PD-FIX-IMPORT-002` — execution-owned checkpoints: `COMPLETE`
- `PD-FIX-IMPORT-003` — execution-owned write audit: `COMPLETE`
- `PD-FIX-IMPORT-004` — row-level post-import drift manifest: `COMPLETE`
- `PD-FIX-IMPORT-005` — attempt history in Import History and Recovery Diagnostics: `COMPLETE`
- `PD-FIX-IMPORT-006` — failed/rollback/retry regression: `COMPLETE`

The Account lifecycle/restriction mapping, financial reconciliation and operational-health
reconciliation are compatibility requirements for this batch and are not redefined here.

## Final relationship model

`profile_import_runs` remains the stable workbook checksum, mapping, review-decision and write-plan
identity. `profile_import_attempts` stores one row for every execution attempt and has a unique
`execution_id` plus a run-scoped unique `attempt_number`.

Each attempt has exactly one row in `profile_import_attempt_checkpoints`, created from Profile state
immediately before that attempt can write. Imported mutations are stored in
`profile_import_attempt_write_audit`, keyed by `(execution_id, import_key)`. Reconciliation,
post-import checksum, row-fingerprint manifest and rollback state belong to the attempt.

The former run-unique execution, checkpoint and audit tables remain temporarily as a current-attempt
compatibility projection for existing endpoints. New rollback logic resolves the latest execution
and reads only its attempt checkpoint and attempt audit. Historical attempt rows are never updated
when a retry starts.

## Existing history migration

The migration is additive and does not alter financial or Profile-owned records. For every legacy
ImportRun with a mutable execution row, it copies that row, its checkpoint and its audit records to
attempt 1 with `legacy_ambiguous = true`. This preserves all available evidence while explicitly
stating that earlier attempt boundaries cannot be reconstructed. It does not fabricate historical
attempts from the legacy `attempt_count` value.

The migration is idempotent. SQLite performs the backfill during local schema initialization;
PostgreSQL performs the same copy under the existing schema-migration advisory lock.

## Drift evidence

Successful new attempts store a manifest of Profile-owned table names, row IDs, row fingerprints
and available `updated_at` values. Recovery diagnostics compare that manifest with current state and
report added, modified and removed rows. Where an existing domain audit table contains a later
matching event, its timestamp and source are attached. A person is attributed only if the audit
payload identifies an actor. Legacy attempts without manifests report `UNAVAILABLE_LEGACY`.

## Rollback invariants

- A retry always generates a new random execution ID and monotonically increasing attempt number.
- A new checkpoint is captured immediately before the attempt enters its first write stage.
- A restored checkpoint can never be selected for a later attempt.
- Rollback reads audit rows filtered by the selected execution ID.
- Completing or rolling back an attempt updates only that attempt's checkpoint and audit state.
- Financial and operational-health reconciliation must both pass before an attempt becomes
  `COMPLETE`.
