# Vercel and Neon Local-First Readiness

This note records the current deployment boundary for Plum Duff while the runtime database remains
local-first.

## Current State

- Vercel can be used for web/API deployment testing only after environment variables are configured
  deliberately for the target environment.
- The current preferred hosted-development target is documented in
  `docs/deployment/vercel-neon-dev-target.md`: Vercel-first hosting with Neon as the intended
  managed database target, while local SQLite remains the live runtime until Neon runtime cutover
  is implemented.
- Local SQLite remains the authoritative runtime database until Issue `#75` implements and validates
  the PostgreSQL runtime adapter and explicit Fund Manager cutover workflow.
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
- runtime cutover: blocked

Current blockers:

- PostgreSQL runtime adapter is not implemented;
- explicit Fund Manager runtime cutover confirmation is not implemented;
- staged Neon data verification must pass for the current rehearsal state before runtime cutover can
  be approved.

## Runtime Rules

- Do not set production/Vercel runtime to Neon as authoritative until Issue `#75` is complete.
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
