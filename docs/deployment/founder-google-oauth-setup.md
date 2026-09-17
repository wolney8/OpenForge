# Founder Google OAuth Setup

_PD-FR-004 setup values for the current Next.js + FastAPI same-origin deployment._

## Google Cloud OAuth Client

Create an OAuth client of type **Web application**.

Authorized JavaScript origins:

- `http://localhost:3010`
- `https://plum-duff.vercel.app`

Authorized redirect URIs:

- `http://localhost:3010/api/auth/google/callback`
- `https://plum-duff.vercel.app/api/auth/google/callback`

The implementation has no separate auth domain. `OPENFORGE_AUTH_PUBLIC_BASE_URL` is the exact app
origin and constructs the callback above. Do not add a trailing slash.

Configure the consent screen with app name **Plum Duff**, support/developer contact email and only
the `openid`, `email` and `profile` scopes. During Google Testing mode, add the exact Founder Google
account as a test user. Google Testing-mode authorizations expire after seven days. The same email
must be present in the Plum Duff owner allowlist.

## Local Environment

### Configurable local runtime contract

The normal local arrangement is web `http://localhost:3010`, API
`http://127.0.0.1:8010` and the repository-root
`data/private/db/openforge.sqlite3`. Start it with `pnpm dev:api`; that command now
uses the role-bound launcher. Candidate and test launchers must name their source,
role, endpoints and isolated database explicitly. Missing or owner-database settings
stop startup and direct database access before schema initialisation.

Configuration is resolved in this order: explicit process environment, the running
source checkout's repository-root `.env`, then code defaults. Before
CP-013, an explicit inherited `OPENFORGE_DATABASE_URL` could therefore override a
candidate's intended worktree database and reach the owner file; `.env` lookup also
depended on the process working directory. The `.env` location is now source-rooted and
runtime role/database ownership validation applies after configuration resolution, so
changing the working directory cannot change an accepted database target.

The non-secret configuration boundary is:

- `PORT` for the web listener;
- `NEXT_PUBLIC_OPENFORGE_API_BASE_URL` for browser API requests;
- `OPENFORGE_INTERNAL_API_BASE_URL` for server-side web/API requests;
- `OPENFORGE_DATABASE_MODE`, `OPENFORGE_DATABASE_URL` and
  `OPENFORGE_NEON_DATABASE_URL` for the selected persistence target;
- `OPENFORGE_RUNTIME_ROLE`, `OPENFORGE_RUNTIME_DATABASE_IDENTITY`,
  `OPENFORGE_RUNTIME_SOURCE_ROOT`, `OPENFORGE_RUNTIME_SOURCE_REVISION`,
  `OPENFORGE_RUNTIME_FRONTEND_ENDPOINT`, `OPENFORGE_RUNTIME_API_ENDPOINT`,
  `OPENFORGE_RUNTIME_ENVIRONMENT_SOURCE` and
  `OPENFORGE_RUNTIME_DATABASE_TARGET_EXPLICIT` for the non-secret ownership proof;
- `OPENFORGE_AUTH_REQUIRED` and `OPENFORGE_AUTH_PUBLIC_BASE_URL` for the
  authentication mode and exact public origin;
- `OPENFORGE_AUTH_OWNER_EMAILS`, `OPENFORGE_AUTH_SESSION_SECRET`,
  `OPENFORGE_GOOGLE_OAUTH_CLIENT_ID` and `OPENFORGE_GOOGLE_OAUTH_CLIENT_SECRET`
  for the established authentication boundary. Values remain outside Git.

Start the normal services with `pnpm dev:api` and `pnpm dev:web`. A candidate uses
`scripts/run-python.sh scripts/run-api-runtime.py --role candidate` plus all required
target arguments; it has no database fallback. `/healthz` reports the safe role,
source revision, database engine, non-secret database identity/fingerprint, schema
version and endpoints. It returns unavailable when the expected database cannot be
reached. A response from one service does not prove the browser is using the other.
SQLite is the normal local authority; PostgreSQL remains an explicitly isolated
test/runtime target until a separately approved cutover.

Rollback after a schema migration is data-first: stop the upgraded process, verify the
pre-migration backup, restore that database atomically, start the last compatible source
through its approved normal-owner contract, then verify health, identity, counts and
representative totals. Do not point older code at an upgraded database: the schema
capability guards deliberately reject writes rather than silently dropping lineage or
history.

Put API values in the repository-root `.env`:

```dotenv
OPENFORGE_AUTH_REQUIRED=true
OPENFORGE_AUTH_PUBLIC_BASE_URL=http://localhost:3010
OPENFORGE_AUTH_SESSION_SECRET=<at-least-32-random-bytes>
OPENFORGE_AUTH_OWNER_EMAILS=<founder-google-email>
OPENFORGE_GOOGLE_OAUTH_CLIENT_ID=<google-web-client-id>
OPENFORGE_GOOGLE_OAUTH_CLIENT_SECRET=<google-web-client-secret>
```

Put the shared route-gate values in `apps/web/.env.local`:

```dotenv
OPENFORGE_AUTH_REQUIRED=true
OPENFORGE_AUTH_SESSION_SECRET=<the-same-session-secret>
OPENFORGE_AUTH_OWNER_EMAILS=<the-same-founder-google-email>
OPENFORGE_INTERNAL_API_BASE_URL=http://127.0.0.1:8010
```

Generate the session secret locally with `openssl rand -base64 48`. Never commit either env file.
Run the API on `127.0.0.1:8010` and the web app on `localhost:3010`. Use the `localhost` browser URL
so it exactly matches the registered callback.

## Vercel Environment

In Vercel **Settings > Build and Deployment**, set the Framework Preset to `Services` and keep the
project Root Directory at the repository root. `vercel.json` owns the `apps/web/` Next.js service,
the `api/` FastAPI service and the `/api/*` rewrite. A `Next.js` project preset builds only the web
service, so `/api/healthz` and `/api/auth/google/login` return the frontend 404 even when the Python
application and OAuth configuration are correct.

The Services build log must show both `frontend` and `backend`. If it only reports a Next.js build,
the project is still using the wrong preset regardless of whether the deployment itself succeeds.

Set these encrypted variables for Production in the single Plum Duff Vercel project, then redeploy:

```dotenv
OPENFORGE_AUTH_REQUIRED=true
OPENFORGE_AUTH_PUBLIC_BASE_URL=https://plum-duff.vercel.app
OPENFORGE_INTERNAL_API_BASE_URL=https://plum-duff.vercel.app/api
OPENFORGE_AUTH_SESSION_SECRET=<at-least-32-random-bytes>
OPENFORGE_AUTH_OWNER_EMAILS=<founder-google-email>
OPENFORGE_GOOGLE_OAUTH_CLIENT_ID=<google-web-client-id>
OPENFORGE_GOOGLE_OAUTH_CLIENT_SECRET=<google-web-client-secret>
```

`NEXT_PUBLIC_OPENFORGE_API_BASE_URL` should be absent or `/api`; same-origin is the secure default.
Use the production domain for OAuth testing. Arbitrary Vercel Preview URLs are not registered
callbacks; add a stable preview domain and a matching Google redirect only if Preview OAuth is
required later.

## Verification Gate

1. Visit a protected route while signed out and confirm redirect to `/login` with `next` retained.
2. Sign in with the allowlisted Google identity and confirm return to the requested route.
3. Try a different Google identity and confirm `not_authorized` without a session cookie.
4. Log out and confirm direct page access redirects and `/api/profiles` returns 401.
5. Repeat on `https://plum-duff.vercel.app` after redeployment.

Direct sign-in without a retained protected destination returns to the canonical Dashboard at
`/`. A valid `next` path captured by the protected-route redirect is
preserved instead.

Real financial data remains prohibited until this OAuth gate and the later Neon persistence and
recovery gates are verified.
