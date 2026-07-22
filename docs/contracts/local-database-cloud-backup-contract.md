# Workflow Contract: Local Database and Cloud Backup

_Last updated: 2026-07-22_

## Status and scope

- Status: Approved for verified local backup export and guarded full-database import
- Milestone: M5 Login Profiles Tracker Shell
- Related planning: `docs/planning/openforge-phase-2-schema-plan.md`
- Schema or provider implementation approved by this contract: verified local snapshots, portable
  local export packages, isolated import validation and explicit full-database restore; every cloud
  provider, encrypted upload and cloud restore remain deferred

## User goal

Keep Plum Duff usable from a local database while producing periodic, verifiable backups that may be stored in an approved cloud object store. Preserve a credible later migration path to managed PostgreSQL without pretending that backup replication is application synchronisation.

## Implemented boundary

The current M5 tranche provides:

- transactionally consistent SQLite snapshots using the Online Backup API;
- SQLite integrity checks, SHA-256 checksums and versioned JSON manifests;
- source-instance, schema, byte-size, reason and creation-time manifest metadata;
- private local storage outside Git;
- Fund Manager manual backup, history and re-verification controls;
- persistent failed re-verification status so damaged backups do not continue to appear verified;
- guarded manual deletion of old local backups while preserving the latest three verified restore points;
- Fund Manager backup reminders when no verified backup exists, the latest verified backup is stale,
  or enough tracker rows have changed since the latest verified backup;
- backward-compatible verification of earlier local manifests; and
- an explicit `Deferred` cloud state.

The current tranche does not yet activate automatic retention deletion, scheduling, encryption or
cloud upload. Local full-database restore is approved only through the guarded package workflow
defined below. No cloud provider is approved for implementation. Provider selection, credential
handling and encryption-key custody require a later contract review and explicit Fund Manager
approval. Credentials and encryption key material remain outside Plum Duff.

## Supported storage modes

### Mode A: local operational database

- SQLite remains the authoritative operational database for local-first MVP.
- Backups must use SQLite's Online Backup API or an equivalently consistent SQLite snapshot mechanism; copying a live database file directly is not sufficient.
- Database and backups remain outside Git.

Reference: [SQLite Online Backup API](https://www.sqlite.org/backup.html).

### Mode B: local database with encrypted cloud backup

- Deferred; this mode is not part of the current implementation scope.
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
5. Store the verified snapshot and manifest locally.
6. If cloud backup is approved later, encrypt the package before any upload.
7. Record success/failure metadata without storing credentials.
8. Apply retention only after a newer backup has been verified.

## Restore lifecycle

- Accept only a Plum Duff package containing one SQLite snapshot and one versioned manifest.
- Stage the package outside the live database path and never merge its rows into the live database.
- Preview source instance, creation time, profile count, table row counts and financial control
  totals before confirmation.
- Restore is always explicit and requires Fund Manager confirmation.
- Preserve the current database before replacement.
- Verify package shape, checksum, byte size, schema compatibility, SQLite integrity and foreign-key
  integrity before activation.
- Run profile row-count and financial control-total checks in an isolated restore location.
- Never merge restored and live rows automatically.
- Replace the live SQLite file atomically while database access is exclusively locked.
- Record restore source, actor, timestamp, validation result, pre-restore snapshot and resulting
  schema version in the restored database.

## Local export package

- Export is available only for a snapshot that currently passes checksum, manifest and SQLite
  integrity verification.
- The package contains no credentials and uses a `.plumduff-backup` filename.
- The package manifest records package version, schema version, source instance, snapshot checksum,
  byte size, table row counts and two-decimal financial control totals.
- The package is sensitive and must be stored only on a trusted encrypted drive or other explicitly
  approved private location.
- XLSX ledger export remains a separate interoperability feature and is not a full recovery copy.

## Safety boundaries

- No bidirectional offline/cloud synchronisation in this milestone.
- No cloud upload is active or approved in the current scope.
- No database credentials, encryption keys or backup archives in Git.
- No backup is considered successful until integrity and restore checks pass.
- No automatic destructive restore.
- No raw `.sqlite3` import; only a validated Plum Duff export package is accepted.
- No imported package may write to the live database before explicit confirmation.
- Profile isolation and audit records must survive backup, migration and restore.

## Required decisions before implementation

- Deferred: cloud provider selection, credentials, encryption-key custody, upload and cloud restore.
- Resolved for the current scope: Fund Manager-created verified local backups plus mandatory local
  backups before confirmed import or restore writes.
- Resolved: verified snapshots can be exported as portable local packages and imported through an
  isolated preview followed by explicit Fund Manager confirmation.
- Resolved for the current local scope: the Fund Manager may manually delete old local backups, but
  Plum Duff must keep the latest three verified backups undeletable.
- Deferred: automatic daily scheduling and automatic retention deletion. No local backup is deleted
  automatically in the current scope.
- Resolved: recovery point objective is 24 hours and recovery time objective is 2 hours.
- Resolved: a verified local backup is mandatory before every confirmed migration/import write.
- `To confirm`: criteria for moving from local SQLite to managed PostgreSQL.

## Tests required

- consistent snapshot while reads continue
- failed integrity check prevents upload
- checksum or package-size mismatch prevents restore
- wrong schema version prevents activation
- foreign-key violations prevent activation
- unconfirmed preview never replaces the live database
- confirmed restore first creates a verified pre-restore snapshot
- successful restore preserves profile isolation, row counts and financial control totals
- backup deletion is blocked for the latest three verified restore points
- backup reminder appears when no verified backup exists, after seven days without a fresh verified
  backup, or after twenty-five tracker rows are created since the latest verified backup
- future upload failure keeps verified local backup and reports failure
- retention never deletes the last verified backup
