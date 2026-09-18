# Vercel and Neon Local-First Readiness

**Last updated:** 2026-09-18 13:10 BST

This note records the Vercel-to-Neon activation boundary.

No hosted deployment, migration or secret change is authorised by this document.

## Hosted runtime identity contract

Hosted environments must use explicit roles; a missing or conflicting role/database target fails
startup rather than falling back:

| Runtime | Source/config identity | Data owner | Required isolation |
|---|---|---|---|
| Vercel Preview web/API | Exact Preview revision, `preview` role, Preview base/API URLs and Preview environment source | Dedicated disposable/Preview PostgreSQL branch or database | Must reject Production, normal-owner, clone and test database identities |
| Hosted Production web/API | Exact approved release revision, `production` role, Production base/API URLs and Production environment source | Dedicated Production PostgreSQL/Neon database | Must reject Preview, normal-owner, clone and test identities |
| Local normal owner | Exact local revision and `normal-owner` role | Canonical normal local SQLite database | Existing fail-closed local contract remains authoritative |
| Candidate/test | Exact candidate revision and candidate/test role | Explicit clone or disposable SQLite/PostgreSQL | Must never inherit normal-owner, Preview or Production storage |

Every hosted health/readiness response must safely identify, without credentials:

- source revision;
- runtime role;
- frontend and API/base endpoint classification;
- database engine and non-secret identity/fingerprint;
- schema version;
- OAuth callback/base URL classification;
- environment/config source classification;
- process health separately from expected-database/schema readiness.

Preview and Production must use different database identities and separately scoped credentials.
Port numbers, working directories and Vercel branch names are not database-ownership controls.
Preview must never fall back to Production storage when configuration is missing or unreachable.

## Protected Preview approval gate

This checklist is decision-ready but **not executed or authorised**:

- [ ] Will authorises one protected Preview and the intended source revision.
- [ ] Preview has an isolated PostgreSQL/Neon database with a verified non-Production identity.
- [ ] Preview role and all endpoints are explicit; missing config fails closed.
- [ ] Preview OAuth uses a stable approved callback/base URL and separately governed credentials.
- [ ] Only approved additive migrations run against the isolated Preview database.
- [ ] A pre-migration backup/restore point and exact rollback/teardown procedure are verified.
- [ ] Health/readiness exposes safe revision, role, database and schema identity.
- [ ] The deployment revision is visible and matches frontend/API assets.
- [ ] #115 remains zero known production advisories; accepted dev-only transitives do not ship.
- [ ] #96 credential rotation is dispositioned by Will/provider before any affected credential is used.
- [ ] Preview test data is synthetic, unmistakable and removable through governed teardown.
- [ ] Preview cannot reach Production aliases, storage, secrets or data.
- [ ] Authenticated import, core financial journeys, report-once and recovery smoke passes.
- [ ] Teardown removes Preview resources without touching Production or normal-local data.

Codex can later prepare/configure the isolated runtime, run migrations/tests, verify identity and
recovery, and produce the evidence bundle after explicit approval and access. Will/provider action
is required for hosted account permissions, stable OAuth redirect registration, #96 secret rotation
and the fresh provider-owned sign-in observation. Production cutover remains a separate decision.

## Current State

- Vercel can be used for web/API deployment testing only after the protected Preview gate above is
  explicitly authorised and environment variables are configured deliberately for that target.
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

Current boundary: local adapters and isolated PostgreSQL recovery are proven, but no current Vercel
Preview/Production revision, hosted database identity, OAuth callback or rollback has been accepted.
The next hosted step is a protected Preview, not a Production environment switch.

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

After explicit owner approval, create one protected Preview against an isolated database and execute
the checklist above. Production remains out of scope until Preview evidence is accepted.
