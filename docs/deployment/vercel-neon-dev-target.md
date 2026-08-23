# Vercel, Neon, and Cloudflare R2 Development Target

Last updated: 2026-08-20

This is the preferred hosted-development direction for Plum Duff.

It does **not** mean Plum Duff already runs live against Neon in runtime. Today, Neon is reachable,
schema rehearsal exists, and staged verification tooling exists, but the live API runtime is still
SQLite-only until the PostgreSQL runtime adapter tranche is completed.

## Intended hosted shape

- Vercel hosts the Next.js web app from `apps/web`.
- Vercel can host the Python API from `api/index.py` in the same project once the runtime tranche
  is approved for live use.
- Neon is the intended managed PostgreSQL target for hosted data.
- Cloudflare R2 is the intended managed object-storage target for uploads, generated files, and
  later backup/archive copies.
- Local verified backups remain mandatory even after a future Neon cutover.

## Current truthful state

- Web build readiness: good.
- Neon connectivity/readiness tooling: good.
- Live Neon runtime writes: **not ready**.
- Current safe runtime mode: `local` SQLite.

Do not set `OPENFORGE_DATABASE_MODE=neon` in any live environment yet. The current API runtime
adapter intentionally fails closed for non-SQLite modes.

## Vercel web project settings

Use the repository root as the Vercel project root.

```text
Framework Preset: Next.js
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter @openforge/web build
Output Directory: apps/web/.next
Node.js Version: 22.x
```

Minimum web environment values:

```text
NEXT_PUBLIC_OPENFORGE_API_BASE_URL=/api
```

Recommended additional Vercel project settings:

```text
Production Branch: main
Root Directory: .
Install Command Override: pnpm install --frozen-lockfile
Ignored Build Step: none
```

The current repository now includes a single-project Vercel wrapper shape:

```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.py", "use": "@vercel/python" },
    { "src": "apps/web/package.json", "use": "@vercel/next" }
  ]
}
```

Supporting files:

- `api/index.py` mounts the FastAPI app at `/api`
- `api/requirements.txt` provides the Python runtime dependencies for Vercel
- `apps/web/lib/api.ts` now defaults to same-origin `/api` in the browser when no explicit API base
  URL is set

## API environment target

When hosted testing starts, the environment should still be prepared for Neon while runtime remains
local-first:

```text
OPENFORGE_DATABASE_MODE=local
OPENFORGE_DATABASE_URL=sqlite:///data/private/db/openforge.sqlite3
OPENFORGE_NEON_DATABASE_URL=postgresql://REDACTED
OPENFORGE_BACKUP_DIRECTORY=data/private/backups
OPENFORGE_CORS_ALLOW_ORIGINS=https://YOUR-VERCEL-APP.vercel.app
OPENFORGE_CORS_ALLOW_ORIGIN_REGEX=https://plum-duff-.*\.vercel\.app
```

Meaning:

- `OPENFORGE_DATABASE_MODE=local` keeps SQLite authoritative.
- `OPENFORGE_NEON_DATABASE_URL` allows provider-status, schema rehearsal, and cutover-readiness
  checks to validate the Neon target.
- Neon must stay non-authoritative until the runtime adapter and cutover gate are finished.

## Current verified Neon state

The current externally verified connectivity state is:

- Neon host is reachable.
- PostgreSQL login succeeds.
- Plum Duff API reports Neon as configured and reachable.
- Local runtime is still authoritative.

This means hosted preparation may continue, but live hosted PostgreSQL runtime must still wait for:

- PostgreSQL runtime adapter completion
- staged data load verification pass
- explicit Fund Manager cutover control

## Cloudflare R2 target

Cloudflare R2 is a future storage target, not a current runtime dependency.

Planned uses:

- subscriber registration uploads
- profile identity or documentation images
- generated exports or archive copies
- later off-device backup copies

Expected future environment shape:

```text
OPENFORGE_OBJECT_STORAGE_PROVIDER=cloudflare-r2
OPENFORGE_R2_BUCKET_NAME=plumduff-bucket
OPENFORGE_R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
OPENFORGE_R2_PUBLIC_BASE_URL=https://YOUR-PUBLIC-ASSET-DOMAIN
OPENFORGE_R2_ACCESS_KEY_ID=REDACTED
OPENFORGE_R2_SECRET_ACCESS_KEY=REDACTED
```

Do not wire R2 into runtime code until the object-storage contract and file-handling workflows are
approved. Today this remains deployment planning only.

## Required pre-hosting checks

Before using Vercel-hosted testing:

1. `pnpm --filter @openforge/web typecheck`
2. `pnpm --filter @openforge/web build`
3. `GET /healthz`
4. `GET /config-summary`
5. `GET /fund-manager/database/provider-status`
6. `GET /fund-manager/database/migration-readiness`
7. `GET /fund-manager/database/neon-cutover-readiness`
8. Create a fresh verified backup if any migration or database rehearsal is planned

## Expected current API status

Healthy current hosted-prep status should look like this:

- `/healthz` returns `{"status":"ok"}`
- `/config-summary` still shows SQLite/local as the runtime database
- `/config-summary` shows `runtime_adapter=sqlite-only`
- `/config-summary` shows `hosted_api_mount_prefix=/api`
- provider status shows Neon configured and reachable
- migration readiness may show rehearsal-ready after a fresh verified backup
- cutover readiness remains blocked until runtime adapter work is complete

## Current blockers to live Neon runtime

As of 2026-08-20, the remaining hard blockers are:

- PostgreSQL runtime adapter is not implemented in `apps/api/src/openforge_api/db.py`
- explicit Fund Manager runtime cutover confirmation is not implemented
- live runtime reads/writes are not routed through a PostgreSQL-safe data access layer
- staged Neon verification must pass against the currently loaded schema/data before cutover can be
  approved

## Deferred/fallback path

Render is no longer the preferred hosted path. If a temporary non-Vercel API host is ever needed,
that should be treated as an explicit fallback decision, not the default Plum Duff deployment
architecture.
