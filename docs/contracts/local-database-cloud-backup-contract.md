# Workflow Contract: Local Database and Cloud Backup

_Last updated: 2026-08-01_

## Status and scope

- Status: Approved for verified local backup export and guarded full-database import
- Milestone: M5 Login Profiles Tracker Shell
- Related planning: `docs/planning/openforge-phase-2-schema-plan.md`
- Schema or provider implementation approved by this contract: verified local snapshots, portable
  local export packages, isolated import validation and explicit full-database restore.
- Provider planning approved by this contract: Neon may be used from the Fund Manager's existing
  Neon management account as a later managed PostgreSQL target, but Plum Duff must use its own
  separate Neon project or database, its own role, and its own connection string. Sharing the AI
  Diary database, schema, role, or credentials is not allowed.
- Provider implementation still deferred: direct Neon runtime storage, encrypted cloud upload,
  cloud restore, and automated cloud failover require a later implementation tranche and tests.

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

The current Neon preparation tranche adds provider-status and migration-readiness reporting only.
It may verify that Neon is reachable, that the target database appears isolated for Plum Duff, that
critical SQLite tables exist, and that a recent verified local backup is available. It must not
write operational rows to Neon or switch the authoritative runtime database.

The PostgreSQL schema-plan generator may translate the current initialized SQLite schema into
reviewable PostgreSQL DDL for rehearsal preparation. The generator is read-only and must not create
tables or rows in Neon. Any future table or column added to the operational schema must be covered
by the schema plan and its tests before that feature can be treated as migration-ready.

The PostgreSQL data-load plan may derive a deterministic insert order from local SQLite foreign
keys. The plan is read-only and must not write rows to Neon. The eventual migration loader must
load parent tables before profile-owned or audit child tables, then verify table row counts and
financial control totals after loading.

The local migration control-total preview may calculate profile-scoped module totals from SQLite
using the same response builders as the application surfaces. It is read-only and must not write to
Neon. It must keep current/projected values separate from final/settled values, keep signed cash
adjustments separate from bet-ledger values, and count blank financial values as missing instead of
silently treating them as zero.

The migration package manifest preview may combine schema signature, deterministic insert order,
table row counts, latest verified backup metadata and local financial control totals into one
fingerprinted pre-flight summary. It is read-only, must not export row data, and must not write to
Neon. The fingerprint is evidence for review, not a cutover approval.

The remote Neon schema status check may read the configured Neon target's `information_schema` and
compare its public tables with the current Plum Duff PostgreSQL schema plan. It is read-only and
must not create tables, mutate data, or expose credentials. A reachable empty Neon database is a
clean staging target but remains blocked for data load until the schema has been explicitly created
and verified.

The guarded Neon schema creation endpoint may create PostgreSQL schema only after explicit Fund
Manager approval. It must require the exact confirmation phrase, current migration package
fingerprint, recent verified backup and an empty or already-compatible remote schema. It must not
load operational tracker rows, switch runtime mode, or treat schema creation as cutover approval.

The guarded Neon data-load rehearsal endpoint may load local SQLite rows into an already-created,
empty, compatible Neon schema only after explicit Fund Manager approval. It must require the exact
confirmation phrase, current migration package fingerprint, recent verified backup, matching remote
schema and empty target tables. It must verify row counts after loading and must not switch runtime
mode.

The read-only Neon data-load verification endpoint may compare local SQLite with the loaded Neon
target using row counts and normalized SHA-256 table-content fingerprints. It must not expose row
data, credentials, or raw connection strings. Cutover remains blocked unless this verification
passes.

The read-only Neon cutover-readiness endpoint may combine provider status, schema readiness and
data-load verification into one operator-facing gate. It may report that the staged Neon copy is
ready for review, but it must not report runtime cutover readiness until a PostgreSQL runtime
adapter and explicit Fund Manager cutover confirmation are implemented and tested.

SQLite runtime connection code must fail closed when `OPENFORGE_DATABASE_MODE` is set to a
PostgreSQL/Neon mode before the PostgreSQL runtime adapter exists. It must not silently write to the
local SQLite database under a Neon runtime label because that would create split-brain data.

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

### Mode D: optional Neon-managed PostgreSQL

- Deferred for implementation; approved only as a planning target.
- The Fund Manager may use the same Neon account or organisation used for another app, but Plum
  Duff must have one of:
  - a separate Neon project; or
  - a separate database and dedicated role inside an existing project if project separation is not
    available.
- Plum Duff must not share the AI Diary database, schema, role, password, connection string,
  migration history, backups, branch workflow, or service credentials.
- Credentials must live only in local environment variables or the operator's secret manager. They
  must never be committed to Git, pasted into docs, fixtures, screenshots, or issue bodies.
- Runtime modes must remain explicit:
  - `local`: SQLite is authoritative.
  - `neon`: Neon/PostgreSQL is authoritative after an approved cutover.
  - `recovery-local`: local snapshot has been intentionally restored because Neon is unavailable or
    unsafe.
- Silent split-brain fallback is not allowed. If Neon writes fail, Plum Duff must not quietly write
  new operational rows to SQLite unless the Fund Manager explicitly switches into a local recovery
  mode after a verified backup/restore decision.
- A verified local backup package remains mandatory before:
  - first Neon cutover;
  - import writes while running against Neon;
  - restore into either SQLite or Neon;
  - any fallback from Neon to local recovery mode.
- Neon point-in-time restore or branch history may be used as an additional provider capability,
  but it is not a substitute for Plum Duff's local verified backup package.

References:

- [Neon connect from any application](https://neon.tech/docs/connect/connect-from-any-app/)
- [Neon backups](https://neon.tech/docs/manage/backups)
- [Neon database access](https://neon.tech/docs/manage/database-access)
- [Neon roles](https://neon.tech/docs/manage/roles)
- [Neon connection errors](https://neon.tech/docs/connect/connection-errors)

## Backup lifecycle

1. Quiesce migration activity and identify schema version.
2. Produce a transactionally consistent snapshot.
3. Validate the snapshot can be opened and passes an integrity check.
4. Calculate checksum and write manifest.
5. Store the verified snapshot and manifest locally.
6. If cloud backup is approved later, encrypt the package before any upload.
7. Record success/failure metadata without storing credentials.
8. Apply retention only after a newer backup has been verified.

## Neon cutover lifecycle

1. Confirm Plum Duff has a separate Neon project/database and dedicated role.
2. Confirm no AI Diary database, schema, role, password or connection string is reused.
3. Create and verify a local Plum Duff backup package created within the last 24 hours.
4. Export the current local SQLite data using an approved migration/export path.
5. Load into a staged Neon database or branch.
6. Run schema, profile-isolation, row-count, content-fingerprint and financial-control-total checks
   against the staged Neon target.
7. Run representative login, profiles, ledgers, reports, import/export and backup smoke tests
   against the staged Neon target.
8. Record the tested connection mode, database identity, schema version and backup id.
9. Switch runtime mode only after explicit Fund Manager approval.
10. Keep local backup reminders active after cutover.

## Neon failure and local recovery lifecycle

Plum Duff must classify connection and provider failures before any recovery action:

- authentication or password failure;
- database, branch, role or host not found;
- TLS or SSL negotiation failure;
- DNS/network outage;
- timeout or suspended compute wake-up delay;
- connection pool exhaustion;
- read-only branch or permission failure;
- migration/schema mismatch;
- transaction failure or serialization conflict;
- provider restore or backup failure.

Required behaviour:

- Show a user-facing provider status that is actionable and does not leak credentials.
- Keep technical error details in local logs only.
- Block money-impacting writes when the authoritative database cannot be reached.
- Offer local recovery only as an explicit Fund Manager action.
- Before local recovery, require a verified local backup or a staged restored package.
- After local recovery, clearly label the app as `recovery-local` until a later reconciled cutover
  is approved.
- Never merge divergent Neon and local rows automatically.

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

- Resolved for planning: Neon may be used through the Fund Manager's existing Neon management
  account only if Plum Duff has a separate project/database and dedicated role.
- Deferred: Neon credential entry UX, database adapter, migration tooling, cloud upload, Neon
  restore, encryption-key custody and cloud failover implementation.
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
- Resolved for rehearsal: the first staged Neon load may proceed only through the guarded
  schema/data-load endpoints and must be followed by row-count and content-fingerprint
  verification.
- `To confirm`: final criteria and branch/role naming for switching runtime mode from local SQLite
  to managed PostgreSQL/Neon.

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
- Neon authentication failure is parsed without leaking credentials and blocks writes
- Neon network or timeout failure keeps the latest local verified backup available and offers an
  explicit recovery-local path
- Neon schema mismatch blocks cutover before live traffic
- using the AI Diary database, schema, role, or connection string is rejected by configuration
  validation
- migration-readiness reports no rehearsal approval when the latest verified backup is older than
  24 hours
- migration-readiness never reports live cutover approval before the PostgreSQL runtime adapter,
  staged data loader and financial control-total comparison are implemented and tested
- Neon cutover-readiness may report staged schema/data readiness but must keep runtime cutover
  blocked until the PostgreSQL runtime adapter and explicit Fund Manager confirmation exist
- setting Neon as the active runtime mode before a PostgreSQL runtime adapter exists fails closed
  before any SQLite write can occur
- PostgreSQL schema-plan generation includes current tracker tables, primary keys, foreign keys and
  unique constraints without leaking SQLite internal table or autoindex names
- PostgreSQL data-load planning orders parent tables before dependent tracker and audit tables
- local migration control-total preview reports profile-scoped sportsbook, free-bet, casino and
  cash-adjustment totals without writing to Neon
- migration package manifest preview reports a deterministic fingerprint from schema, row-count,
  backup and control-total inputs without exporting row data
- remote Neon schema status reports present, missing and extra tables without creating schema or
  writing data
- guarded Neon schema creation blocks stale fingerprints, missing backups and partial remote
  schemas before creating any PostgreSQL tables
- guarded Neon data-load rehearsal blocks stale fingerprints, missing backups, incompatible schema
  and non-empty target tables
- Neon data-load verification compares local and remote row counts and content fingerprints without
  exposing row data
