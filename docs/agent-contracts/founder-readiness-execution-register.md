# Founder Readiness Execution Register

_Last updated: 2026-08-28_

This register tracks the bounded path from hosted preview to owner-only founder use. Real financial
data must not be uploaded until every safety gate in `PD-FR-010` is complete.

| ID | Area | Requirement | Reference | Status |
|---|---|---|---|---|
| PD-FR-001 | Notifications | Reconcile triggers, timing, templates, routes, lifecycle, preferences and security tags | Fund Manager notification centre contract | COMPLETE |
| PD-FR-002 | Account Catalogue | Fix structured import errors, validate rollback/conflicts and reconcile any partial attempt | Existing catalogue import/preflight workflow | COMPLETE |
| PD-FR-002A | Catalogue evidence import | Accept evidence for contracted provider identity/theme fields and identify rejected values | Master Account Catalogue schema | COMPLETE |
| PD-FR-002B | Catalogue bulk management | Clear staged imports and bulk archive providers without breaking Profile references | Account Catalogue authority workflow | COMPLETE |
| PD-FR-002C | Catalogue feedback | Auto-dismiss transfer toasts and retain import/export success or failure in Notifications | Signed-off toast and notification patterns | COMPLETE |
| PD-FR-002D | New provider discovery | Persist provider introduction time and show a New tag during Profile account selection | Master Account Catalogue schema | COMPLETE |
| PD-FR-003 | Profile onboarding | Provide reusable Fund Manager-created Profile onboarding using global providers plus Profile-owned state | Existing Profile and Accounts flows | COMPLETE |
| PD-FR-003A | Reusable onboarding | Use one repeatable Profile flow for founder now and subscriber Profiles later | `/profiles/new` and Profile isolation contract | COMPLETE |
| PD-FR-003B | Provider authority | Make the Fund Manager Account Catalogue the only new Profile/account provider source | Global catalogue/Profile state contract | COMPLETE |
| PD-FR-003C | Guided onboarding | Use the signed-off stepper, guided access, dirty-route guard and explicit Cancel on the non-modal page | Ledger editor stepper and unsaved-change guard | COMPLETE |
| PD-FR-003D | Profile financial/jurisdiction inputs | Format bankroll/fees consistently and default operating jurisdiction to GB | Financial input and Account Catalogue availability rules | COMPLETE |
| PD-FR-003E | Onboarding Accounts table | Add eight-row pagination, sorting, resizing and consistent provider/status/balance controls | Signed-off ledger table controls | COMPLETE |
| PD-FR-003F | Subscriber provisioning boundary | Registration approval creates or claims the same Profile type; it does not introduce another Profile model | Subscriber registration contract | COMPLETE |
| PD-FR-003G | Exchange calculation authority | Require at least one selected Exchange and an explicit Profile commission during onboarding | Profile onboarding and financial-safety contracts | COMPLETE |
| PD-FR-003H | Existing Profile account authority | Let Fund Managers add, reactivate or archive catalogue-backed Profile accounts without mutating global providers | Global catalogue/Profile state contract | COMPLETE |
| PD-FR-004A | Fund Manager identity role | Attach full Fund Manager authority to an authenticated user identity, never to a client-side Profile toggle | Fund Manager authentication contract | BLOCKED |
| PD-FR-004 | Authentication | Add Google OAuth, owner allowlist, server sessions, route/API/mutation protection and logout | Existing security metadata; no cosmetic login | NOT STARTED |
| PD-FR-005 | Persistence | Complete PostgreSQL runtime support and verified Vercel-to-Neon persistence | Existing Vercel wrapper and database contracts | NOT STARTED |
| PD-FR-006 | Workbook mapping | Map the live workbook, including embedded Sportsbook `EP` rows, without inventing data | Existing staging/import workflow | NOT STARTED |
| PD-FR-006A | Workbook Profile extraction | Resolve providers, extract signup/restriction/balance state and map all ledger rows in dry run | Founder migration workflow | DEFERRED |
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
| Account Catalogue transfer | Fund Manager; `fund_manager_only` | Import/export succeeds or fails | One local result per completed transfer | `/settings#catalogue` | Standard read/clear; no provider mutation | Account Catalogue Transfers | COMPLETE |

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

## PD-FR-002 Account Catalogue Import Findings

The previous Import control performed preflight only and could not partially write provider data.
Its unhelpful `[object Object],[object Object]` message came from coercing FastAPI's structured
validation array into a JavaScript Error string. The corrected workflow formats field-specific
validation messages, requires an explicit reviewed Apply action, archives omitted providers,
blocks stable-id/name conflicts, validates the complete replacement and creates a local recovery
backup before atomic replacement. It never mutates Profile account rows or silently remaps their
provider relationships. Hosted durability remains blocked on `PD-FR-005` because this authority is
still file-backed.

Focused verification on 2026-08-28 passed the Account Catalogue and Profile onboarding API tests,
all 226 web unit tests, five focused Account Catalogue/Profile onboarding Playwright tests, web
typecheck, web lint and `git diff --check`.

## PD-FR-003 Reusable Profile Onboarding

The local onboarding flow can be repeated to create isolated Profiles with explicit module authority, catalogue-linked
Profile account state, opening balances, a main bank, Profile settings and optional Quick Action
favourites in one transaction. Sportsbook, Free Bets and Cash Adjustments remain mandatory;
Casino and Extra Places can be disabled without removing historical rows. Required global Quick
Actions remain inherited and cannot be disabled during onboarding.

Every created Profile must select at least one Exchange and store an explicit decimal commission
for each selected Exchange. Profile creation writes the selected accounts and commissions in the
same transaction, so a failed commission check cannot leave a partial Profile. Existing Profiles
manage the same catalogue-backed relationships from Profile Settings > Accounts. That surface can
add or reactivate Bookmakers, Exchanges and Banks, archive unused relationships, and edit
Profile-owned balances/statuses; it cannot change global provider identity or archive the last
active Exchange.

The implementation uses active GB global Account Catalogue identities and does not copy editable
global provider metadata into Profile settings. Invalid providers, duplicate codes and invalid
Quick Actions fail before any partial Profile is written. Focused automated coverage is complete;
Fund Manager synthetic-data smoke verification remains recommended before using the flow operationally.

Focused Exchange-authority verification on 2026-08-28 passed 22 Profile/account API tests, all
226 web unit tests, four focused onboarding/Settings Playwright checks, web typecheck, web lint,
targeted Ruff and `git diff --check`.

The founder is the first operational use of this shared flow, not a special one-off Profile type.
Later subscriber identity/invitation work will authorize access to an existing Profile rather than
creating another onboarding architecture. Workbook extraction remains `PD-FR-006A` and is blocked
from real-data execution until owner authentication and Neon persistence pass their safety gates.

The access model deliberately separates data ownership from identity authority. A Profile is the
isolated tracker/account container used for the founder and subscribers. A Fund Manager is an
authenticated user role that may administer Profiles. Subscriber registration will call the same
Profile provisioning service after approval; `PD-FR-004` must enforce the Fund Manager role on the
server before any UI may offer a full-security assignment.

## Safety Gate

`PD-FR-008` may move out of `BLOCKED` only after notification sign-off, catalogue import
reconciliation, reusable Profile onboarding, owner-only authentication, Vercel protection, Neon CRUD,
recovery verification, anonymised dry-run fixtures and an understandable reconciliation report all
pass.
