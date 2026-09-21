# Vercel and Neon Local-First Readiness

**Last updated:** 2026-09-21 15:24 BST

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

This checklist was authorised for one CP-028 protected Preview. Current state:

- [x] Will authorised one protected Preview and the intended source revision.
- [x] Preview has an isolated PostgreSQL/Neon database with a verified non-Production identity.
- [x] Preview role and all endpoints are explicit; missing/mismatched config fails closed.
- [x] Preview OAuth uses the stable callback below; Will completed the genuine Google interaction.
- [x] Only approved current migrations ran against the isolated Preview database.
- [x] A current-schema backup, database-unavailable response and recreate/restore/re-migrate recovery were exercised.
- [x] Health/readiness exposes safe revision, role, database and schema identity.
- [x] The deployment revision is visible and frontend/API diagnostics agree.
- [x] #115 remains zero known production advisories in the deployed production graph.
- [ ] #96 credential rotation remains a separate owner/provider operation and was not performed by CP-028.
- [x] Preview test data is synthetic, unmistakable and removable through governed teardown.
- [x] Runtime safety rejects Production/normal-owner identities and no Production or owner data was used.
- [ ] Authenticated core routes render after the CP-029 protected-SSR repair, but the Reports route
  emits React maximum-update-depth error 185 and blocks the complete browser gate.
- [ ] Teardown removes Preview resources without touching Production or normal-local data.

Codex configured the isolated runtime, migrations, identity/recovery and protected SSR within the
Preview approval. Will completed the fresh provider-owned sign-in. Engineering must now repair the
Reports render loop; #96 rotation and Production cutover remain separate decisions.

## CP-028 protected Preview identity

- Stable protected URL: `https://plum-duff-cp028-preview-homelab11.vercel.app`
- Deployment: `dpl_5BzzGWKe1Voi59Y7TdxaTcEFTrD3`
- Source: `e6a42064d49b55a41470acc25f906890ab1cde51`
- Runtime/database/schema: `preview` / `preview:plum_duff_preview_cp028` /
  `account-access-v1`
- OAuth callback requiring owner/provider confirmation:
  `https://plum-duff-cp028-preview-homelab11.vercel.app/api/auth/google/callback`
- Production aliases and data: unchanged

## CP-029 authenticated Preview state

- Stable protected URL: unchanged.
- Active deployment: `dpl_Gs9Rf6P5fPJSxWyD6j2MFNtSXcif` (`plum-duff-5a2pi903c-homelab11.vercel.app`).
- Application source: `d35eed7e4b17d7bfeefbcf17548b9b70b680a7d0`.
- Runtime/database/schema: unchanged `preview` / `preview:plum_duff_preview_cp028` /
  `account-access-v1`.
- Hosted Google authentication: PASS.
- Authenticated SSR: repaired by forwarding trusted request context and selecting the explicit
  stable Preview internal API base.
- Verification blocker: Profile Reports emits React error 185; a four-worker stress run also
  exposed a five-endpoint 300-second saturation boundary. Production remains untouched.

## Current State

- One protected Vercel Preview is live under CP-028 with explicit per-deployment configuration.
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

## Earlier local adapter baseline

Latest local check on 2026-08-20:

- active runtime mode: `local`
- Neon configured: yes
- Neon status: reachable
- Neon database: `plum-duff-app-db`
- Neon isolation: isolated
- remote schema: expected tables present, no missing or extra tables
- runtime adapter: verified against Neon with synthetic data
- hosted runtime activation at that checkpoint: not yet performed

Current boundary: the Vercel Preview revision, isolated PostgreSQL identity, migrations, backup,
bounded recovery and genuine hosted OAuth are proven. The authenticated browser journey set remains
engineering-blocked by the Reports render loop. Production is neither tested nor authorised.

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

Repair the bounded Reports render loop, repeat the serial authenticated journey checklist and then
offer the six-item owner Preview smoke. Production remains out of scope until Preview evidence is
accepted and a separate promotion decision is made.
