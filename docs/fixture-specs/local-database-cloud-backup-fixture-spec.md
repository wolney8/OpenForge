# Fixture Spec: Local Database and Cloud Backup

_Last updated: 2026-08-01_

## Contract covered

- `docs/contracts/local-database-cloud-backup-contract.md`

## Synthetic control data

Use two profiles with synthetic row counts and financial control totals. Backup fixtures contain metadata and expected decisions only; they do not contain a database archive or cloud credential.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| BACKUP-001 | Valid consistent local snapshot | Verified local backup recorded |
| BACKUP-002 | Integrity check fails | Backup not marked verified |
| BACKUP-003 | Cloud upload fails | Verified local backup retained; visible failure recorded |
| BACKUP-004 | Imported package checksum mismatch | Restore blocked before database replacement |
| BACKUP-005 | Imported package schema unsupported | Restore blocked with compatibility error |
| BACKUP-006 | Valid confirmed local restore | Pre-restore backup created; profile row counts and control totals match manifest |
| BACKUP-007 | Retention proposes deleting final verified copy | Deletion blocked |
| BACKUP-008 | Valid package preview without confirmation | Candidate remains staged; live database unchanged |
| BACKUP-009 | Candidate has foreign-key violations | Preview rejected; live database unchanged |
| BACKUP-010 | Raw SQLite file supplied | Import rejected because package manifest is absent |
| BACKUP-011 | Backup reminder threshold reached | Fund Manager notification points to Database Backups |
| BACKUP-012 | Neon cutover configured with AI Diary database, schema, role, or connection string | Configuration rejected before connection test |
| BACKUP-013 | Neon authentication fails | User sees credential/access error; credentials are not logged or displayed; writes are blocked |
| BACKUP-014 | Neon network, DNS, timeout, or suspended-compute delay occurs | Provider state is unavailable; latest verified local backup remains visible; no silent SQLite write fallback |
| BACKUP-015 | Fund Manager explicitly enters local recovery mode | Verified local package is required; mode is labelled `recovery-local`; divergent row merge is blocked |
| BACKUP-016 | Neon schema or migration version differs from expected Plum Duff schema | Cutover blocked before live traffic; local database remains authoritative |
| BACKUP-017 | Guarded Neon data load targets a non-empty table | Data load blocked before any insert |
| BACKUP-018 | Guarded Neon data load completes with exact row-count parity | Rehearsal marked loaded; runtime remains local |
| BACKUP-019 | Neon content fingerprint differs after load | Verification fails; cutover remains blocked |
| BACKUP-020 | Neon staging verifies but runtime adapter is absent | Staging ready; runtime cutover blocked; local SQLite remains authoritative |

## Current implementation coverage

- `BACKUP-001` is covered by API service and route tests plus the Fund Manager Settings flow.
- `BACKUP-002` and `BACKUP-004` checksum/integrity boundaries are covered by service and route
  tests, including persistent failed status in backup history.
- Legacy local manifests are accepted only after core checksum, schema, size and integrity checks.
- `BACKUP-003` is deferred with all cloud-provider behaviour.
- `BACKUP-005`, `BACKUP-006`, `BACKUP-008`, `BACKUP-009` and `BACKUP-010` are required for the
  guarded local import/export tranche.
- `BACKUP-007` is covered by the guarded manual delete rule that protects the latest three verified
  local backups.
- `BACKUP-011` is covered by the Fund Manager notification feed when no verified backup exists,
  seven days pass, or twenty-five tracker rows are created since the latest verified backup.
- `BACKUP-012` through `BACKUP-020` cover Neon/PostgreSQL readiness, guarded schema creation,
  guarded data load and verification. Runtime cutover remains deferred.

## Acceptance

- Counts must match exactly.
- Money control totals must match exactly to `0.01` after restoration.
- No profile may gain rows owned by another profile.
