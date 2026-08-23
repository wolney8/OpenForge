# Neon Runtime Tranche 01

Last updated: 2026-08-20

## Goal

Prepare Plum Duff for a safe future cutover from local SQLite runtime to Neon/PostgreSQL runtime
without introducing split-brain writes or weakening the local-first recovery model.

## What is already done

- Neon connectivity is configured and reachable.
- Provider status endpoint reports isolation/readiness details safely.
- Migration readiness endpoint exists.
- PostgreSQL schema-plan preview exists.
- PostgreSQL insert-order/data-load preview exists.
- Guarded schema creation exists.
- Guarded data-load rehearsal exists.
- Read-only data verification exists.
- Read-only cutover-readiness gate exists.
- Fresh verified local backups can be created before rehearsal.

## What is still missing

### 1. Live runtime adapter

`apps/api/src/openforge_api/db.py` currently supports SQLite runtime modes only.

That means:

- `OPENFORGE_DATABASE_MODE=neon` is intentionally blocked
- all operational reads/writes still assume SQLite connections/cursors
- there is no approved Postgres transaction/runtime path yet

### 2. Explicit cutover control

There is no final operator workflow that:

- confirms a specific verified backup
- confirms a specific Neon verification package/fingerprint
- flips the active runtime intentionally
- records that cutover as an auditable event

### 3. Runtime parity verification

Staged schema/data verification exists, but there is not yet an approved runtime smoke path proving:

- the hosted API behaves correctly under PostgreSQL runtime
- ledger entry/edit/save flows remain stable
- financial outputs match the SQLite source-of-truth totals

## Safe implementation order

1. Introduce a database adapter seam for runtime connections.
2. Move read/write helpers away from SQLite-only assumptions.
3. Implement PostgreSQL runtime connection support behind the adapter.
4. Add runtime-specific tests for the adapter and critical repository operations.
5. Add explicit Fund Manager cutover control and rollback protocol.
6. Rehearse runtime smoke tests against Neon before any live switch.

## Definition of done for this tranche

This tranche is complete only when:

- API runtime can intentionally run against PostgreSQL
- runtime mode is still fail-closed if verification/cutover requirements are not met
- no silent fallback from Neon writes to SQLite writes exists
- critical financial and profile-isolation tests pass under the PostgreSQL runtime path

## Not part of this tranche

- subscriber-facing cloud upload UX
- Cloudflare object storage integration
- automatic hosted production rollout
- replacing local verified backups as the recovery authority
