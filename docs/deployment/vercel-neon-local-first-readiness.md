# Vercel and Neon Local-First Readiness

This note records the Vercel-to-Neon activation boundary.

## Current State

- Vercel can be used for web/API deployment testing only after environment variables are configured
  deliberately for the target environment.
- Local development remains SQLite by default.
- Vercel Production becomes Neon authoritative only when `OPENFORGE_DATABASE_MODE=neon` is set.
- The PostgreSQL runtime adapter and transactional migrations are implemented.
- Neon is approved as a future managed PostgreSQL target only when Plum Duff uses an isolated
  database/project and a dedicated connection string.
- A reachable Neon schema does not mean runtime cutover is approved.

## Required Pre-Deployment Checks

Before deploying a test build to Vercel:

- Confirm no secrets or local database files are committed.
- Confirm public UI copy uses Plum Duff, not OpenForge, except for internal package/env names.
- Run lint, typecheck, unit tests and focused Playwright route/navigation checks.
- Check `/fund-manager/database/provider-status`.
- Check `/fund-manager/database/migration-readiness`.
- Check `/fund-manager/database/neon-cutover-readiness`.
- Create a fresh verified local backup if any database migration/rehearsal is planned.

## Current Verified Database Status

Latest local check on 2026-08-20:

- active runtime mode: `local`
- Neon configured: yes
- Neon status: reachable
- Neon database: `plum-duff-app-db`
- Neon isolation: isolated
- remote schema: expected tables present, no missing or extra tables
- runtime adapter: verified against Neon with synthetic data
- hosted runtime activation: awaiting Vercel environment switch and authenticated smoke

Current blocker: the deployed Production environment must run the current commit with
`OPENFORGE_DATABASE_MODE=neon`, followed by the authenticated persistence smoke.

## Runtime Rules

- Do not import real workbook data until the hosted persistence and recovery smoke passes.
- Do not silently fall back from Neon writes to local writes after cutover; that would create
  split-brain data.
- Do not use the AI Diary database/schema/role for Plum Duff runtime data.
- Keep verified local backup workflows available even after a future Neon cutover.

## Route and Navigation Boundary

Day-to-day navigation should start at `/profiles`, the Fund Manager Dashboard. The login route is
still a development/local-first shell until Issue `#62` adds optional Google OIDC for the existing
Fund Manager.

Production-facing navigation should not expose scaffold/stub shortcuts. The global drawer owns:

- Fund Manager Dashboard;
- profile dashboard shortcuts;
- Fund Manager Settings.

Profile-specific ledgers and reports belong in the profile summary menu once inside a profile.

## Next implementation slice

The next safe database slice is documented in `docs/deployment/neon-runtime-tranche-01.md`.
