# Founder Readiness Execution Register

_Last updated: 2026-08-28_

This register tracks the bounded path from hosted preview to owner-only founder use. Real financial
data must not be uploaded until every safety gate in `PD-FR-010` is complete.

| ID | Area | Requirement | Reference | Status |
|---|---|---|---|---|
| PD-FR-001 | Notifications | Reconcile triggers, timing, templates, routes, lifecycle, preferences and security tags | Fund Manager notification centre contract | COMPLETE |
| PD-FR-002 | Account Catalogue | Fix structured import errors, validate rollback/conflicts and reconcile any partial attempt | Existing catalogue import/preflight workflow | NOT STARTED |
| PD-FR-003 | Founder Profile | Provide the minimum owner Profile onboarding using global providers plus Profile-owned state | Existing Profile and Accounts flows | NOT STARTED |
| PD-FR-004 | Authentication | Add Google OAuth, owner allowlist, server sessions, route/API/mutation protection and logout | Existing security metadata; no cosmetic login | NOT STARTED |
| PD-FR-005 | Persistence | Complete PostgreSQL runtime support and verified Vercel-to-Neon persistence | Existing Vercel wrapper and database contracts | NOT STARTED |
| PD-FR-006 | Workbook mapping | Map the live workbook, including embedded Sportsbook `EP` rows, without inventing data | Existing staging/import workflow | NOT STARTED |
| PD-FR-007 | Import dry run | Add anonymised real-schema fixtures, aliases, idempotency and a complete dry-run report | Spreadsheet import contracts | NOT STARTED |
| PD-FR-008 | Founder import | Import the real workbook transactionally only after all safety gates pass | Explicit confirmation required | BLOCKED |
| PD-FR-009 | Reconciliation | Reconcile Profile, account, ledger and report totals against the live workbook | Workbook remains reconciliation authority | BLOCKED |
| PD-FR-010 | Real-data gate | Classify hosted state and prevent real-data use until auth, Neon, recovery and import checks pass | Security and data-safety rules | IN PROGRESS |
| PD-FR-011 | Vercel readiness | Verify production env, OAuth callbacks, sessions, protected APIs, writes and error handling | Existing Vercel deployment | NOT STARTED |

## PD-FR-001 Notification Matrix

| Source | Recipient and security | Trigger/timing | Duplicate control | Destination | Read/clear | Preference | Status |
|---|---|---|---|---|---|---|---|
| Database backup | Fund Manager; `fund_manager_only` | No verified backup, 7 days stale, or 25 changed tracker rows | Stable latest-backup/no-backup identity | `/settings#database` | Stage-aware read; local clear; no source mutation | Database Backup Reminders | COMPLETE |
| Partial lay | Fund Manager; `fund_manager_only` | Active/reopened; due day, 4h and 2h re-alert stages | Profile + row + reminder-change identity | Profile Sportsbook row | Stage-aware read; local clear; audited resolve/dismiss | Partial Lay Reminders | COMPLETE |
| Free-bet follow-up | Fund Manager; `fund_manager_only` | Active/reopened; due day, 4h and 2h re-alert stages | Profile + row + reminder-change identity | Profile Free Bet row | Stage-aware read; local clear; audited resolve/dismiss | Free Bet Follow-Up Reminders | COMPLETE |

Current read, clear and preference state is intentionally local-first browser state. Durable hosted
persistence belongs to `PD-FR-005`. The API emits immutable Fund Manager audience/security tags,
and the client rejects malformed subscriber-scoped items as defence in depth. Authenticated
server-side owner enforcement is not complete until `PD-FR-004`; therefore the current hosted
classification remains **HOSTED PREVIEW ONLY - NO REAL FINANCIAL DATA**.

Focused verification on 2026-08-28 passed 15 notification/backup API tests, 223 web unit tests,
four notification-centre/preferences Playwright tests, six Free Bet/Settings Playwright tests,
web typecheck, web lint and `git diff --check`. Live public GitHub inspection found no dedicated
notification-centre issue; do not create a duplicate if authenticated issue reconciliation later
finds private or closed coverage.

## Safety Gate

`PD-FR-008` may move out of `BLOCKED` only after notification sign-off, catalogue import
reconciliation, Founder Profile creation, owner-only authentication, Vercel protection, Neon CRUD,
recovery verification, anonymised dry-run fixtures and an understandable reconciliation report all
pass.
