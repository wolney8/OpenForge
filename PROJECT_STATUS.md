# Project Status

_Last updated: 2026-09-07 07:34 BST_

This is the short entry point for current state and acceptance. Use the
[milestone readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md) for full
sequencing and the [request register](docs/planning/plum-duff-next-issue-tracking-register.md) for
durable requirements.

## Current state

- Tested code revision: `f2db33a85cb06ba93419fd871da0262e0094b43e` on `main`.
- Current blocker: Notification History overlap [#100](https://github.com/wolney8/OpenForge/issues/100)
  is fixed with focused local automated and rendered synthetic evidence; Will's visual acceptance
  and the prior normal-use session/notification checks remain `NOT RUN`.
- Login initiation is restored: **PROVEN locally**, the real control reaches Google's authorization
  flow. The Google callback/session and Will's renewed acceptance remain **UNVERIFIED**.
- Local runtime: web `http://localhost:3010`; API `http://127.0.0.1:8010`; local SQLite; required
  Google/session configuration present without exposing its values. At handoff both services are
  running in named detached terminal sessions; their prior unexplained stop cause remains unknown.
- Start/recover from the repository in two separate persistent Terminal tabs with `pnpm dev:api`
  and `pnpm dev:web`; stop only the applicable process with `Ctrl-C`. Check with `curl -f
  http://127.0.0.1:8010/healthz` and `curl -f http://localhost:3010/login`. Do not let disposable
  test teardown own or stop these normal sessions. See [#101](https://github.com/wolney8/OpenForge/issues/101).
- Hosted state: not deployed or tested in this batch. User acceptance remains pending below.

## Project plan

- Current: Notification History filter containment is complete locally; local service handoff and
  manual acceptance remain open.
- Next selected work: Will runs the two checks below; any failure is reproduced before further work.
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
- Notification filter overlap: `NOTIFICATION-LAYOUT-001` is locally complete at `f2db33a`; [#100](https://github.com/wolney8/OpenForge/issues/100)
  stays open pending Will's approval and is related, not folded into, [#92](https://github.com/wolney8/OpenForge/issues/92).
- Profit Boost and strict input: [#83](https://github.com/wolney8/OpenForge/issues/83) retains its
  full scope and is now assigned to M14; remaining cross-surface validation is [#91](https://github.com/wolney8/OpenForge/issues/91).
- Full current blockers and recent IDs are in the [canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md).

## What changed

- [`f2db33a`](https://github.com/wolney8/OpenForge/commit/f2db33a85cb06ba93419fd871da0262e0094b43e): contains Notification History controls using the
  signed-off settings toolbar and adds sibling/focus/reflow regression coverage.
- Tracking now includes local runtime handoff [#101](https://github.com/wolney8/OpenForge/issues/101),
  request-coverage recovery [#102](https://github.com/wolney8/OpenForge/issues/102), and deferred
  rebranding decision [#103](https://github.com/wolney8/OpenForge/issues/103).
- This page is the navigation summary; Git commits and linked contracts/registers retain detailed
  history.

## What Will should test

Environment/revision: local `http://localhost:3010`, `f2db33a`. Manual status: `NOT RUN`.

1. Open `http://localhost:3010/notifications`. Tab through **Type** and **Status**; resize and switch
   themes. Expect separated fields and unobscured focus indicators.
2. Repeat the Auto Logout **OFF** check after more than five minutes, then clear one non-critical
   notification and verify it stays absent after navigation/reload while appearing as **Cleared** in
   `/notifications`. Sign out/in and recheck the same instance. Keep these results separate from the
   visual fix; source-independent history remains deferred in [#90](https://github.com/wolney8/OpenForge/issues/90).

Record each manual result as `PASS`, `FAIL`, or `BLOCKED`; automated results never replace Will's
result.
