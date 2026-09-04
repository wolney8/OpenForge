# Emergency Profile Recovery Batch

Date: 2026-09-04

This bounded batch restores lifecycle control for a Profile whose normal management route cannot
mount because one Profile Account contains malformed imported lifecycle data. It does not repair,
archive, delete, roll back, or reimport the Production Profile during implementation.

| ID | Area | Requested behaviour | Canonical equivalent | Status |
|---|---|---|---|---|
| PD-FIX-RECOVERY-002 | Profile Management diagnosis | Identify the exact request and server hydration failure behind the management 500. | `GET /profiles/:profileId/accounts` and `build_account_response` | COMPLETE |
| PD-FIX-RECOVERY-003 | Emergency archive | Archive from the independent Fund Manager recovery route using identity/lifecycle metadata only. | Profile Management Archive confirmation and `update_profile_metadata` | COMPLETE |
| PD-FIX-RECOVERY-004 | Emergency permanent delete | Require Archived state and exact Profile-name confirmation, then run the existing transactional Profile cascade. | Profile Management permanent-delete confirmation and `delete_archived_profile` | COMPLETE |
| PD-FIX-RECOVERY-005 | Isolation and stale state | Avoid Account/report hydration, invalidate Profile directory caches, and navigate away after deletion. | Recovery diagnostics route and normal post-delete directory handling | COMPLETE |

## Safety boundary

- Recovery reads are limited to Profile identity/lifecycle and import attempt metadata.
- Recovery mutations require an authenticated Fund Manager session and use dedicated server routes.
- Archive changes only the Profile lifecycle row and writes its existing Profile audit entry.
- Permanent deletion continues to require Archived state and exact display-name confirmation.
- The existing database-owned cascade deletes Profile-scoped rows only; the deletion audit remains.
- Account Catalogue data, aliases, Fund Manager settings, and unrelated Profiles remain outside the
  Profile cascade.

## Verification evidence

- API regression: malformed synthetic `lifecycle_status = 'Bonus Restricted'` reproduces the
  Account response validation exception and HTTP 500 while both recovery actions remain usable.
- Delete regression: Archived state, exact-name confirmation, Profile-owned cascade, retained
  deletion audit, unrelated Profile survival, unchanged global catalogue source/settings, and
  same-name recreation are asserted.
- Playwright: the recovery route performs no Profile Management, Account or tracker-summary request;
  Archive and Delete use the shared confirmation dialog, prevent duplicate actions while pending,
  and remain contained in light/dark and reduced-width states.
- Production build: the dynamic `/fund-manager/import-recovery/[profileId]` route is present.
