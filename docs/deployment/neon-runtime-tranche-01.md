# Neon Runtime Tranche 01

Last updated: 2026-08-29

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

## Implemented runtime boundary

- `OPENFORGE_DATABASE_MODE=neon` selects PostgreSQL explicitly.
- psycopg provides a compatibility boundary for existing repository queries.
- PostgreSQL failures roll back and never fall back to SQLite.
- versioned schema migration runs transactionally under a PostgreSQL advisory lock.
- Profile, account, all five ledger, catalogue, notification and security-preference paths have
  passed synthetic Neon CRUD checks.

## Remaining hosted cutover gate

- Set `OPENFORGE_DATABASE_MODE=neon` in Vercel Production and redeploy the current commit.
- Complete the authenticated hosted persistence smoke in `neon-runtime-cutover.md`.
- Create a Neon pre-import snapshot immediately before the workbook dry run/import.

Workbook financial reconciliation remains a separate later gate; no real workbook data was loaded.

## Definition of done

This tranche is complete only when:

- API runtime intentionally runs against PostgreSQL
- runtime mode fails closed if PostgreSQL is unavailable
- no silent fallback from Neon writes to SQLite writes exists
- hosted OAuth/Profile/account/ledger persistence passes on Vercel

## Not part of this tranche

- subscriber-facing cloud upload UX
- Cloudflare object storage integration
- automatic hosted production rollout
- replacing local verified backups as the recovery authority
