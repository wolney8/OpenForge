# Neon, Local-First Storage, and Recovery

_Last updated: 2026-08-01_

## Short answer

Yes, the Fund Manager can use an existing Neon management account for Plum Duff, but Plum Duff must
not share the AI Diary database.

Allowed:

- same Neon login/account/organisation for management;
- separate Plum Duff Neon project; or
- separate Plum Duff database and dedicated role if a separate project is not practical.

Not allowed:

- reusing the AI Diary database;
- reusing the AI Diary schema;
- reusing the AI Diary database role or password;
- committing Neon connection strings or credentials;
- silently falling back to local writes if Neon becomes unavailable.

## Current position

Plum Duff currently runs local-first with SQLite:

- operational database: `data/private/db/openforge.sqlite3`
- backup directory: `data/private/backups`
- environment setting: `OPENFORGE_DATABASE_URL`

The local backup workflow is still the recovery authority. Neon is a future managed PostgreSQL
target, not a replacement for local verified backups.

## Recommended Neon setup

Use this structure when Neon implementation is later approved:

- Neon account: existing Fund Manager Neon account is acceptable.
- Neon project: `plum-duff`.
- Database: `plum_duff`.
- Role: `plum_duff_app`.
- Branches:
  - `main` or `production` for the live Plum Duff target.
  - a staging branch/database for rehearsed imports and cutovers.

Keep all secrets in local environment variables or a secret manager. Do not paste them into docs,
GitHub issues, screenshots, or committed files.

## Initial connectivity check

The first external `psql` check should prove only that the Neon account and connection string work:

```bash
psql "$OPENFORGE_NEON_DATABASE_URL" -c "select current_database(), current_user, now();"
```

If the result shows the default Neon identity, for example:

```text
current_database = neondb
current_user = neondb_owner
```

then connectivity is proven, but the target is not yet ready for Plum Duff cutover. Before cutover,
create a dedicated Plum Duff database and role so the check returns names like:

```text
current_database = plum_duff
current_user = plum_duff_app
```

The API provider-status endpoint deliberately flags generic `neondb` / `neondb_owner` as
`needs_dedicated_database_or_role`.

## Local API status check

Create a root `.env` file locally. This file is ignored by Git and must not be committed:

```bash
OPENFORGE_DATABASE_MODE=local
OPENFORGE_DATABASE_URL=sqlite:///data/private/db/openforge.sqlite3
OPENFORGE_NEON_DATABASE_URL=postgresql://REDACTED
```

After setting environment variables and starting the API, check:

```bash
curl http://127.0.0.1:8010/fund-manager/database/provider-status
```

This endpoint must not return raw connection strings or passwords. It reports:

- active database mode;
- whether local SQLite is configured;
- whether Neon is configured and reachable;
- redacted database, role and host hints;
- whether the Neon target appears isolated enough for a future cutover;
- whether writes are allowed in the current mode; and
- whether local recovery appears available.

Use the cutover-readiness endpoint before any migration rehearsal:

```bash
curl http://127.0.0.1:8010/fund-manager/database/migration-readiness
```

This reports:

- current source mode;
- Neon provider status;
- local schema signature;
- local table count and row counts;
- latest verified backup id and creation time;
- whether critical tracker tables are present;
- whether a migration rehearsal is currently allowed; and
- why live cutover remains blocked.

The readiness endpoint is intentionally conservative. It will not mark rehearsal as ready unless
Neon is reachable, the target appears isolated for Plum Duff, critical local tables exist and a
verified local backup was created within the last 24 hours. It will not mark live cutover as ready
until the PostgreSQL runtime adapter, migration loader and financial control-total comparison are
implemented and tested.

Use the PostgreSQL schema-plan endpoint before implementing the data loader:

```bash
curl http://127.0.0.1:8010/fund-manager/database/postgres-schema-plan
```

This generates PostgreSQL DDL from the current initialized SQLite schema. It is a preview only:

- it creates no Neon tables;
- it writes no tracker rows;
- it reports table names, statement counts and a schema signature; and
- it returns generated `CREATE TABLE`, foreign-key and unique-index statements for review.

Every future database table or column added to Plum Duff must appear in this schema plan before the
feature is considered migration-ready. If the SQLite schema changes but the generated PostgreSQL
plan or tests do not change, the feature is incomplete.

Use the data-load plan endpoint before any staged migration:

```bash
curl http://127.0.0.1:8010/fund-manager/database/postgres-data-load-plan
```

This reports the deterministic table insert order derived from SQLite foreign keys. It is also a
preview only:

- it writes no rows to Neon;
- it shows parent tables before dependent tables;
- it reports verification order and row counts; and
- it gives the future loader the order it must follow when moving data from SQLite to PostgreSQL.

Future migration work must use this plan or prove why a different order is safer.

Use the migration control-total endpoint before and after any staged migration:

```bash
curl http://127.0.0.1:8010/fund-manager/database/migration-control-totals
```

This reports local SQLite control totals using the same calculation response builders as the
application surfaces. It is preview-only:

- it writes no rows to Neon;
- it reports profile-scoped totals for sportsbook bets, free bets, casino offers and cash
  adjustments;
- it separates current/projected totals, final/settled totals and signed cash-adjustment totals;
- it counts blank financial values as missing instead of silently treating them as zero; and
- it provides the values a future Neon rehearsal must match before cutover can be approved.

If the future Neon-loaded values do not match these local control totals, stop the cutover and
investigate mapping, rounding, missing-row or calculation-version differences.

Use the migration package preview endpoint when the above checks need to be reviewed together:

```bash
curl http://127.0.0.1:8010/fund-manager/database/migration-package-preview
```

This returns a no-write manifest preview containing:

- schema signature;
- deterministic insert order;
- table and row counts;
- latest verified local backup id and creation time;
- local financial control totals; and
- a package fingerprint for this exact preview state.

The package preview is not a data export. It is the pre-flight summary that should be captured
before a staged Neon load is approved. If the local database changes, the fingerprint may change;
create a fresh backup and rerun the preview before any rehearsal.

Use the remote Neon schema status endpoint to inspect the configured Neon target without writing:

```bash
curl http://127.0.0.1:8010/fund-manager/database/neon-schema-status
```

This reads Neon `information_schema` and compares the public schema against the current Plum Duff
PostgreSQL schema plan. It reports:

- expected Plum Duff table count;
- remote table count;
- present, missing and extra tables;
- whether the remote schema is ready for a later staged data load; and
- blockers and warnings without exposing credentials.

An empty Neon database should show as reachable with all expected tables missing. That is a clean
starting point, but it is not ready for data load until schema creation has been explicitly approved
and performed.

The guarded schema creation endpoint exists for the first approved Neon write boundary:

```bash
curl -X POST http://127.0.0.1:8010/fund-manager/database/neon-schema-apply \
  -H "Content-Type: application/json" \
  -d '{
    "confirm_phrase": "CREATE PLUM DUFF SCHEMA",
    "package_fingerprint": "PASTE_CURRENT_PACKAGE_FINGERPRINT",
    "actor_id": "fund-manager-local"
  }'
```

Do not run this until the Fund Manager has approved staging schema creation. The endpoint is
guarded:

- it requires the exact confirmation phrase;
- it requires the current migration package fingerprint;
- it requires a recent verified local backup;
- it blocks partial/non-empty remote schemas that do not already match Plum Duff;
- it creates schema only, not operational tracker rows; and
- it returns safe status data without exposing credentials.

After schema creation, rerun `neon-schema-status` and `migration-package-preview` before any data
load rehearsal.

The guarded data-load rehearsal endpoint exists for the second approved Neon write boundary:

```bash
curl -X POST http://127.0.0.1:8010/fund-manager/database/neon-data-load-rehearsal \
  -H "Content-Type: application/json" \
  -d '{
    "confirm_phrase": "LOAD PLUM DUFF DATA",
    "package_fingerprint": "PASTE_CURRENT_PACKAGE_FINGERPRINT",
    "actor_id": "fund-manager-local"
  }'
```

Do not run this against a production runtime target until the Fund Manager has approved staged
loading. The endpoint is guarded:

- it requires the exact confirmation phrase;
- it requires the current migration package fingerprint;
- it requires a recent verified local backup;
- it requires the remote schema to match the current Plum Duff table plan;
- it blocks if any target table already contains rows; and
- it keeps `local` runtime mode active after loading.

The read-only Neon data verification endpoint checks the loaded staging database without returning
row data:

```bash
curl http://127.0.0.1:8010/fund-manager/database/neon-data-load-verification
```

This endpoint compares:

- local and remote row counts for every planned table; and
- local and remote SHA-256 content fingerprints built from normalized table contents.

If `verified` is not `true`, do not cut over. A mismatch means the staged Neon copy is not an exact
copy of the current local SQLite source and must be discarded or manually investigated.

The final read-only staging gate is the cutover-readiness endpoint:

```bash
curl http://127.0.0.1:8010/fund-manager/database/neon-cutover-readiness
```

This endpoint exists to prevent a false cutover. It can report that the staged Neon schema and data
are ready, but it must keep `runtime_cutover_ready` false until Plum Duff has both:

- a PostgreSQL runtime adapter; and
- an explicit Fund Manager cutover confirmation workflow.

If `staging_ready` is `true` and `runtime_cutover_ready` is `false`, the Neon copy is suitable for
staged review only. The app must continue using local SQLite.

## Current Neon rehearsal evidence

As of 2026-08-01, Plum Duff has completed a staged Neon rehearsal while keeping local SQLite as the
runtime authority:

- active runtime mode: `local`;
- Neon database: `plum-duff-app-db`;
- schema status: 35 of 35 expected tables present;
- package fingerprint: `2dd4b6ecdad498e138531ba024b2833d4b587f640b41645c169515dca471e5d7`;
- backup snapshot: `BACKUP-1CFE0A43`;
- rows loaded: 3,540;
- row-count parity: passed;
- content-fingerprint parity: passed;
- local and remote content fingerprint:
  `5c7918b50e93a0111cdc656f88bdc30786d0b21482dd97c212ca2343ab7f1b91`.

This is not a runtime cutover. It proves that the current SQLite data can be staged into Neon and
verified as an exact copy.

## Runtime modes

Plum Duff should expose explicit database mode status:

- `local`: SQLite is authoritative.
- `neon`: Neon/PostgreSQL is authoritative after a tested cutover.
- `recovery-local`: a verified local backup has been intentionally restored because Neon is
  unavailable or unsafe.

The app must not silently switch modes. The Fund Manager must confirm any move into
`recovery-local`.

## Cutover process

1. Create a verified local backup.
2. Confirm the backup is less than 24 hours old.
3. Confirm the cutover-readiness endpoint has no rehearsal blockers.
4. Create or select the separate Plum Duff Neon project/database/role.
5. Load a staged Neon target using an approved migration path.
6. Validate schema version, profile isolation, row counts, content fingerprints and financial
   control totals.
7. Run smoke tests against the staged Neon target.
8. Record the tested backup id, database identity, schema version, and connection mode.
9. Switch to Neon only after Fund Manager approval.
10. Keep local backup reminders active after cutover.

## If Neon access is lost

The app should parse and classify the failure:

- authentication/password failure;
- database, role, branch, or host not found;
- TLS/SSL failure;
- DNS/network outage;
- timeout or suspended compute wake-up delay;
- pool exhaustion;
- read-only branch or permission failure;
- schema mismatch;
- transaction failure.

Required behaviour:

- show a clear Fund Manager message;
- do not leak the connection string or password;
- block money-impacting writes while the authoritative database is unavailable;
- keep the latest verified local backup visible;
- offer explicit local recovery only when a verified local backup/package is available;
- label the app as `recovery-local` after fallback.

## Backup rule

Even if Neon is used later, Plum Duff still needs local verified backups.

Minimum rules:

- create a verified local backup before cutover;
- create a verified local backup before imports, restores, or provider-mode changes;
- keep at least the latest three verified local backups undeletable;
- create a pre-restore snapshot before any restore;
- never restore or merge rows without explicit Fund Manager confirmation.

## Why this matters

Neon can provide managed PostgreSQL, branch history, and provider restore features, but those
features do not remove Plum Duff's need for local, verified, operator-controlled recovery. The local
backup is the Fund Manager's cutover and failback safety net.

## Implementation status

- Documented: yes.
- Contract and fixture coverage: yes.
- API provider status: implemented.
- API migration-readiness report: implemented.
- PostgreSQL schema-plan generator: implemented.
- PostgreSQL data-load order plan: implemented.
- Guarded Neon schema creation: implemented and rehearsed against `plum-duff-app-db`.
- Guarded Neon data-load rehearsal: implemented and loaded 3,540 rows.
- Read-only Neon data verification: implemented and verified row-count/content parity.
- Read-only Neon cutover-readiness gate: implemented; staging can pass while runtime cutover remains
  intentionally blocked.
- SQLite runtime fail-closed guard for `OPENFORGE_DATABASE_MODE=neon`: implemented.
- PostgreSQL runtime adapter and explicit cutover toggle: still deferred and required before live
  writes may move to Neon.
- Local migration control-total preview: implemented.
- Migration package manifest preview: implemented.
- Remote Neon schema status: implemented.
- Guarded Neon schema creation endpoint: implemented and rehearsed.
- Runtime Neon adapter: deferred.
- SQLite-to-Neon data loader: implemented for guarded rehearsal only.
- Neon-side financial control-total comparison: deferred.
- In-app Neon credential setup: deferred.
- Cloud restore: deferred.
- Silent cloud/local sync: not allowed.
