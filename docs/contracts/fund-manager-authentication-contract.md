# Workflow Contract: Fund Manager Authentication

_Last updated: 2026-07-14_

## Status and scope

- Status: Draft, ready for human review
- Milestone: M5 Login Profiles Tracker Shell
- Profile scoped: No; authentication establishes the Fund Manager context that owns profiles
- Application code or production authentication approved by this contract: No

## User goal

Allow the Fund Manager to open OpenForge securely while preserving a usable local-first login path. Google sign-in may be offered when online, but it must not become the only route into locally held tracker data.

## Authentication modes

| Mode | Purpose | Network required | MVP rule |
|---|---|---:|---|
| Local credential | Primary local-first and recovery login | No | Password must be hashed; no plaintext storage |
| Google OpenID Connect | Optional convenience login for an existing Fund Manager | Yes | Explicitly configured and linked; no public sign-up |

Google authentication must use Google Identity Services/OpenID Connect through a maintained server-side library. The backend must validate the ID token issuer, audience, expiry, signature, nonce/state and verified email. Request only `openid`, `email`, and `profile` unless a later contract approves additional scopes.

References:

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OAuth for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)

## Identity linking rules

- A Google identity is linked by stable provider issuer and subject, not by display name.
- An email match alone must not silently create or link an account.
- The first Google link requires a previously authenticated local Fund Manager or an explicit one-time administrator bootstrap.
- A Google identity that is valid but not linked is denied without revealing account details.
- Public sign-up and subscriber sign-in remain outside M5.

## Routes and states

- `/login`: local login plus an optional `Continue with Google` action when configured.
- Google callback: server-handled callback that creates the local application session and redirects to `/profiles`.
- States: `signed_out`, `authenticating`, `signed_in`, `expired`, `locked`, `provider_unavailable`.
- When Google is unavailable, the local login option remains visible and usable.

## Session and secret handling

- Keep the application session local to OpenForge; do not use Google tokens as the application session.
- Use secure, HTTP-only, same-site cookies in an online deployment. Local development may relax `Secure` only for localhost.
- Store client secrets, cookie secrets and provider credentials outside Git in environment/private configuration.
- Do not log tokens, authorisation codes, passwords, cookies or full provider responses.
- Logout invalidates the OpenForge session. Provider token revocation is required only if later scopes require retained provider access.

## Audit requirements

Record synthetic-safe metadata only: Fund Manager id, authentication mode, success/failure category, timestamp, session revocation and identity-link changes. Never record credentials or tokens.

## Tests required

- successful local login and logout
- invalid local credential without account enumeration
- linked Google identity success
- unlinked Google identity denial
- invalid issuer/audience/nonce/expired token denial
- provider unavailable while local login remains available
- route guard redirects unauthenticated users to `/login`
- authenticated Fund Manager reaches `/profiles`

## Playwright path

Use a stubbed identity provider in automated tests. Do not call live Google endpoints. Verify `/login` -> local or stubbed Google login -> `/profiles` -> logout -> `/login`.

## Approval gates

- Select the authentication library and session store before implementation.
- Approve Google Cloud project configuration and redirect URIs.
- Approve the administrator bootstrap/linking process.
- Production authentication security review is required before any hosted use.

