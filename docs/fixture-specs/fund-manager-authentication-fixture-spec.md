# Fixture Spec: Fund Manager Authentication

_Last updated: 2026-07-14_

## Contract covered

- `docs/contracts/fund-manager-authentication-contract.md`

## Rules

- Use a stubbed OpenID Connect provider only.
- Use `.invalid` email addresses and non-secret synthetic identifiers.
- Never include passwords, bearer tokens, cookies, client secrets or real Google subjects.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| AUTH-001 | Valid local credential | Local session created; redirect to `/profiles` |
| AUTH-002 | Invalid local credential | Generic denial; no account enumeration |
| AUTH-003 | Valid linked OIDC identity | Local session created for `FUND-MANAGER-001` |
| AUTH-004 | Valid but unlinked OIDC identity | Denied; no account created |
| AUTH-005 | Wrong audience | Denied before session creation |
| AUTH-006 | Expired assertion | Denied before session creation |
| AUTH-007 | Provider unavailable | Google action reports unavailable; local mode remains enabled |
| AUTH-008 | Logout | Local session revoked; protected route redirects to `/login` |

## Isolation assertion

Authentication establishes one Fund Manager id. Access to a profile still requires the profile to belong to that Fund Manager; authentication must not bypass profile-scoping checks.

