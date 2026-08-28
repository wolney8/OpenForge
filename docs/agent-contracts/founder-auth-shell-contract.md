# Founder Authentication And Application Shell Contract

_Approved scope: PD-FR-004, 2026-08-28_

## Boundary

The first hosted identity is a Google identity authorized as `fund_manager`. Google authentication
does not itself grant that role. The normalized verified email must also appear in
`OPENFORGE_AUTH_OWNER_EMAILS`.

The API owns the OAuth authorization-code flow, PKCE verifier, state validation and signed session.
It stores the session in the `pd_session` HttpOnly, SameSite=Lax cookie. The cookie contains no
OAuth access or refresh token and expires after `OPENFORGE_AUTH_SESSION_TTL_SECONDS`.

Next validates the same signed session before protected pages. FastAPI independently validates it
before every non-public API read or mutation. Removing an email from the allowlist revokes access
on the next request even if a signed cookie has not expired.

Public endpoints are limited to `/login`, the registration stub at `/register`, `/api/auth/*`,
`/healthz` and `/config-summary`.
Profile, notification, settings and Fund Manager pages are protected. All application API routes,
including global search, are protected by the API middleware.

The normal direct sign-in destination is the Fund Manager performance dashboard at
`/profiles?view=performance`. A safe protected `next` path captured by the route gate takes
precedence so a user can resume the requested task. Authenticated identity details are read-only
at `/account`; Google remains authoritative for name and email.

## Search

The first founder search covers stable Fund Manager destinations, Profiles and active global
Account Catalogue providers. Results are generated after API authorization and are capped at 20.
Ledger records, reports and future Subscriber records are deferred until their authorization and
indexing contracts exist.

The top bar uses the canonical Search field, grouped results, loading/empty/error states, keyboard
navigation and the tracker unsaved-change guard.

## Navigation

The drawer contains stable Fund Manager destinations: Home, Profiles, Registration Requests,
Account Catalogue, Notifications, Reports, Settings and Logout. It does not enumerate Profiles.
When already inside a Profile, a compact current-Profile context provides a direct Dashboard link.

## Security Matrix

| Surface | Unauthenticated | Founder / Fund Manager | Future Subscriber | Server/API status |
|---|---|---|---|---|
| Login and Google callback | Allowed | Allowed | Reusable later | Public auth endpoints only |
| Registration stub | Allowed | Allowed | Future entry point | No registration API yet |
| Fund Manager account | Redirect to login | Own identity details | Denied / deferred | Protected session API |
| Home / Fund Manager dashboard | Redirect to login | Allowed | Denied / deferred | Protected page and API |
| Profiles directory and creation | Redirect to login | Allowed | Denied / deferred | Protected page and API |
| Profile tracker routes | Redirect to login | Allowed | Own Profile only / deferred | Protected page and API |
| Registration Requests | Redirect to login | Allowed | Denied / deferred | Protected page and API |
| Account Catalogue | Redirect to login | Allowed | Denied / deferred | Protected page and API |
| Fund Manager Settings | Redirect to login | Allowed | Denied / deferred | Protected page and API |
| Notifications | Redirect to login | Allowed | Own authorized notifications / deferred | Protected page and API |
| Cross-profile Reports | Redirect to login | Allowed | Denied / deferred | Protected page and API |
| Global search | No results; API 401 | Authorized Fund Manager results | Own-scope results / deferred | Protected API |

## Deferred Boundary

Subscriber identity can reuse the signed-session foundation, but subscriber roles, Profile grants
and row-level authorization remain deferred. Hosted real-data use also remains blocked until the
PostgreSQL/Neon runtime and recovery gate passes.
