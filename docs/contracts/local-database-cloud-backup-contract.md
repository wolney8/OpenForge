# Workflow Contract: Local Database and Cloud Backup

_Last updated: 2026-07-14_

## Status and scope

- Status: Draft, ready for human review
- Milestone: M5 Login Profiles Tracker Shell
- Related planning: `docs/planning/openforge-phase-2-schema-plan.md`
- Schema or provider implementation approved by this contract: No

## User goal

Keep OpenForge usable from a local database while producing periodic, verifiable backups that may be stored in an approved cloud object store. Preserve a credible later migration path to managed PostgreSQL without pretending that backup replication is application synchronisation.

## Supported storage modes

### Mode A: local operational database

- SQLite remains the authoritative operational database for local-first MVP.
- Backups must use SQLite's Online Backup API or an equivalently consistent SQLite snapshot mechanism; copying a live database file directly is not sufficient.
- Database and backups remain outside Git.

Reference: [SQLite Online Backup API](https://www.sqlite.org/backup.html).

### Mode B: local database with encrypted cloud backup

- Create a consistent local snapshot.
- Attach a manifest containing schema version, created time, source instance id, byte size and checksum.
- Encrypt before transfer with an operator-controlled secret/key source.
- Upload to an approved private object store using least-privilege credentials.
- Cloud backup is one-way disaster recovery, not a second live writer.

### Mode C: later managed relational database

- A later deployment may use managed PostgreSQL behind the same repository/service boundary.
- Migration must be rehearsed from an export and validated with profile-isolation, row-count and financial-total checks.
- PostgreSQL requires its own regular backup and restore policy; a provider's availability claim is not a substitute for tested recovery.

Reference: [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html).

## Backup lifecycle

1. Quiesce migration activity and identify schema version.
2. Produce a transactionally consistent snapshot.
3. Validate the snapshot can be opened and passes an integrity check.
4. Calculate checksum and write manifest.
5. Encrypt snapshot and manifest package.
6. Store locally and, if configured, upload to private cloud storage.
7. Record success/failure metadata without storing credentials.
8. Apply retention only after a newer backup has been verified.

## Restore lifecycle

- Restore is always explicit and requires Fund Manager confirmation.
- Preserve the current database before replacement.
- Verify checksum, decryption, schema compatibility and integrity before activation.
- Run profile row-count and financial control-total checks in an isolated restore location.
- Never merge restored and live rows automatically.
- Record restore source, actor, timestamp, validation result and resulting schema version.

## Safety boundaries

- No bidirectional offline/cloud synchronisation in this milestone.
- No silent cloud upload; cloud backup must be configured and visible.
- No database credentials, encryption keys or backup archives in Git.
- No backup is considered successful until integrity and restore checks pass.
- No automatic destructive restore.
- Profile isolation and audit records must survive backup, migration and restore.

## Required decisions before implementation

- `To confirm`: cloud object-storage provider and region.
- `To confirm`: backup encryption/key-management mechanism.
- `To confirm`: schedule, retention count, recovery point objective and recovery time objective.
- Resolved: a verified local backup is mandatory before every confirmed migration/import write.
- `To confirm`: criteria for moving from local SQLite to managed PostgreSQL.

## Tests required

- consistent snapshot while reads continue
- failed integrity check prevents upload
- checksum mismatch prevents restore
- wrong schema version prevents activation
- successful restore preserves profile isolation and financial control totals
- upload failure keeps verified local backup and reports failure
- retention never deletes the last verified backup
