# Workflow Contract: Subscriber Access and Visibility

_Last updated: 2026-06-30_

## 1. Workflow name

- Name: Subscriber access and visibility

## 2. User goal

Allow a future subscriber-facing user to log in and view only the approved profile-scoped data for their role.

Supported future user goals:

- managed subscriber read-only access to linked profile metrics and reports
- self-service subscriber access to their own isolated tracker and reports

## 3. Current spreadsheet equivalent

- no direct workbook equivalent
- derived from the later platform wrapper around the workbook-parity tracker

## 4. Route and input screens

Deferred future route candidates:

- `/login`
- `/subscriber`
- `/subscriber/profiles/:profileId`
- `/subscriber/profiles/:profileId/reports`
- `/subscriber/profiles/:profileId/progress`

Entry points:

- subscriber login
- invite acceptance
- linked-profile landing

Profile context required:

- yes, mandatory

## 5. Database tables

- `fund_managers`
- `profiles`
- future subscriber identity/link tables `To confirm`
- `accounts`
- `sportsbook_bets`
- `free_bets`
- `casino_offers`
- `cash_adjustments`
- `profile_settings`
- report aggregates/read models

## 6. Status transitions

| From status | Action | To status | Notes |
|---|---|---|---|
| invited | accept secure invite | active | deferred future onboarding |
| active | log in | authenticated | role-specific access enforced |
| authenticated | open linked profile | viewing allowed profile | read-only or self-service depending on role |
| authenticated | open unlinked profile | denied | strict access boundary |
| managed subscriber | attempt edit action | denied | managed mode remains read-only |

## 7. Calculations touched

- `docs/contracts/retained-profit-reporting-contract.md`
- future subscriber fee-aware earnings contract
- dashboard/profit/report aggregates as approved for visibility

## 8. Reports touched

- subscriber profile summary
- subscriber progress view
- subscriber weekly/monthly reports
- fee-aware earnings view

Managed subscriber restriction:

- no combined cross-profile control surface outside explicitly linked scope
- current Fund Manager Dashboard, Reports, and combined `/profiles` analytics are tagged
  `internal_operational`
- subscriber routes must use explicit allowlisted report components rather than CSS-hiding or
  client-side filtering of Fund Manager data
- access-tier UI labels are descriptive metadata only; server-side authorization remains required

## 9. Edge cases

- subscriber linked to no active profiles
- subscriber linked to archived profile
- subscriber linked to multiple profiles
- managed subscriber attempts edit action
- profile mismatch
- stale or revoked invite
- fee outputs differ between Fund Manager and subscriber-facing views

## 10. Audit notes

Retain:

- login and access events
- linked profile access events
- denied access attempts
- role used for each session
- invite acceptance events when applicable

## 11. Tests required

- subscriber access-control fixture cases
- managed subscriber read-only enforcement
- self-service isolated tracker access
- profile-link mismatch denial
- fee-aware subscriber view parity cases

## 12. Playwright path

Deferred future UI path:

1. log in as subscriber user
2. land on subscriber home
3. open linked profile
4. verify only allowed metrics and reports appear
5. verify disallowed actions are hidden or blocked
6. if managed subscriber, verify edit attempt is denied
7. if self-service subscriber, verify allowed self-service workflow entry points appear
