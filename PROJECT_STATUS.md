# Project Status

_Last updated: 2026-09-06 21:27 BST_

This is the short entry point for current state and acceptance. Use the
[milestone readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md) for full
sequencing and the [request register](docs/planning/plum-duff-next-issue-tracking-register.md) for
durable requirements.

## Current state

- Tested code revision: `f65eb689cb29b66980847a5e706dfc6ad6991450` on `main`.
- Current blocker: Will's previous session/notification acceptance is recorded as
  `BLOCKED — unable to sign in`. **PROVEN locally:** the configured web process was stopped; after
  `pnpm dev:web`, the real sign-in control reached Google's authorization page without a failed
  browser request. **UNVERIFIED:** the real Google callback/session and Will's renewed acceptance.
- Local runtime: web `http://localhost:3010`; API `http://127.0.0.1:8010`; local SQLite; required
  Google/session configuration present without exposing its values.
- Local automated state: prior focused session/notification evidence at `f65eb689` remains valid for
  unchanged code. This batch did not rerun those suites.
- Hosted state: not deployed or tested in this batch. User acceptance: blocked pending the checklist
  below.

## Project plan

- Current: local login initiation is restored and the request/GitHub reconciliation is complete;
  Will's acceptance remains outstanding.
- Next selected work: Will runs the login → session → notification acceptance below; any failure is
  reproduced before further implementation.
- Deferred: durable notification history [#90](https://github.com/wolney8/OpenForge/issues/90),
  remaining numerical validation [#91](https://github.com/wolney8/OpenForge/issues/91), Google and
  hosted workbook acceptance [#94](https://github.com/wolney8/OpenForge/issues/94), stale-workbook
  merge design [#95](https://github.com/wolney8/OpenForge/issues/95), and secret rotation
  [#96](https://github.com/wolney8/OpenForge/issues/96).

## Features and issues

- Login/session: [#62](https://github.com/wolney8/OpenForge/issues/62) — implementation evidence is
  separate from the pending manual result.
- Notification clearing: `NOTIFICATION-FIX-001` is locally verified with manual/hosted acceptance
  tracked in [#99](https://github.com/wolney8/OpenForge/issues/99); source-independent history is
  still outstanding as [#90](https://github.com/wolney8/OpenForge/issues/90).
- Profit Boost and strict input: [#83](https://github.com/wolney8/OpenForge/issues/83) retains its
  full scope and is now assigned to M14; remaining cross-surface validation is [#91](https://github.com/wolney8/OpenForge/issues/91).
- Full current blockers and recent IDs are in the [canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md).

## What changed

- [`f65eb689`](https://github.com/wolney8/OpenForge/commit/f65eb689cb29b66980847a5e706dfc6ad6991450): hardened local session persistence and notification clearing.
- Live GitHub was reconciled: progress comments were added to #49, #62, #83, and #85; #83 was
  assigned to M14; focused follow-up issues #90–#99 were created without closing prior scope.
- This page is the navigation summary; Git commits and linked contracts/registers retain detailed
  history.

## What Will should test

Environment/revision: local `http://localhost:3010`, `f65eb689`. Last Will result: `BLOCKED — unable
to sign in`. Post-restart checklist status: `NOT RUN`.

1. **Login — NOT RUN.** Open `http://localhost:3010/login`, click **Sign in with Google**, complete
   Google authentication, and expect an authenticated application page. Initiation to Google is
   already **PROVEN locally**; the callback and Will's session are not.
2. **Session — BLOCKED pending login.** Set Auto Logout **OFF**, note the legitimate displayed
   expiry, then use, navigate, and reload after more than five minutes but before that expiry.
   Expect no unexplained early logout. A prior isolated browser/API test proved persistence across
   an API restart at `f65eb689`; Will does not need to restart services.
3. **Notifications — BLOCKED pending login.** Clear one non-critical notification. Expect it absent
   from the bell and shown as **Cleared** at `/notifications`. Navigate/reload, then sign out/in and
   recheck that same notification instance. Preferences are at `/settings#notifications`. Current
   limitation: history is source-dependent until [#90](https://github.com/wolney8/OpenForge/issues/90)
   is implemented.

Record each manual result as `PASS`, `FAIL`, or `BLOCKED`; automated results never replace Will's
result.
