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

Real financial data remains prohibited until this OAuth gate and the later Neon persistence and
recovery gates are verified.
