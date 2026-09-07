# Project Status

_Last updated: 2026-09-07 11:20 BST_

This is the short entry point for current state and acceptance. Use the
[milestone readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md) for full
sequencing and the [request register](docs/planning/plum-duff-next-issue-tracking-register.md) for
durable requirements.

## Current state

- Current feature: [#88 Extra Places](https://github.com/wolney8/OpenForge/issues/88). The selected
  tranche applies known Profile Account lifecycle/restriction health to new Extra Places activity
  without claiming unobserved Extra Places capability.
- Tested implementation base: `f62b31eb3014db72282403393ae0c9f9c8624817` on `main`; this
  tranche's delivery checkpoint and evidence are recorded in its commit and issue comment.
- Interruptions: no open defect currently blocks #88. Notification/session user acceptance and
  captured visual work remain tracked, but are not the active feature.
- Return point: #88 remains selected until its approved tranche is complete; incidental fixes return
  here unless they block normal use or #88 itself.
- Notification History alignment [#100](https://github.com/wolney8/OpenForge/issues/100) is corrected
  with focused local automated and rendered synthetic evidence; Will reports it “looks better”,
  while #100 remains open and no session/notification acceptance is inferred.
- Notification clearing acceptance [#99](https://github.com/wolney8/OpenForge/issues/99) is `BLOCKED`:
  no actionable notification exists. The established isolated persistence runner is self-cleaning
  and cannot leave a manual fixture alongside the canonical Next development server without a
  separate runtime/build handoff, which is outside this bounded correction.
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

- Current: complete and verify the bounded Extra Places account-health slice of #88 without
  implementing the broader #82 capability engine or changing signed calculations.
- Next queue: #88 remaining approved scope; then #35-#38 standalone calculators, #83 Profit Boost
  parity, #85 + #106 Account reconciliation/history/trends, and #86 Fund Manager task deck.
- Deferred: durable notification history [#90](https://github.com/wolney8/OpenForge/issues/90),
  remaining numerical validation [#91](https://github.com/wolney8/OpenForge/issues/91), Google and
  hosted workbook acceptance [#94](https://github.com/wolney8/OpenForge/issues/94), stale-workbook
  merge design [#95](https://github.com/wolney8/OpenForge/issues/95), and secret rotation
  [#96](https://github.com/wolney8/OpenForge/issues/96).

## Features and issues

- Login/session: [#62](https://github.com/wolney8/OpenForge/issues/62) — implementation evidence is
  separate from the pending manual result.
- Notification clearing: `NOTIFICATION-FIX-001` retains prior local automated evidence, but manual
  acceptance is `BLOCKED` by the missing actionable fixture in [#99](https://github.com/wolney8/OpenForge/issues/99);
  source-independent history remains [#90](https://github.com/wolney8/OpenForge/issues/90).
- Notification filter layout: `NOTIFICATION-LAYOUT-001` is locally corrected at `630bde8`; [#100](https://github.com/wolney8/OpenForge/issues/100)
  stays open pending Will's recheck and remains related, not folded into, [#92](https://github.com/wolney8/OpenForge/issues/92).
- Retrospective composed-layout work remains partial under `UI-CONSISTENCY-001`; the visible
  unchecked surface list is in the [UI audit backlog](docs/agent-contracts/plum-duff-ui-audit-backlog.md).
- `FINANCIAL-MOTION-001` is captured in [#105](https://github.com/wolney8/OpenForge/issues/105):
  implementation and rollout coverage remain pending verification.
- Profit Boost and strict input: [#83](https://github.com/wolney8/OpenForge/issues/83) retains its
  full scope and is now assigned to M14; remaining cross-surface validation is [#91](https://github.com/wolney8/OpenForge/issues/91).
- Full current blockers and recent IDs are in the [canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md).

## What changed

- [`630bde8`](https://github.com/wolney8/OpenForge/commit/630bde854a76ef8551a677690a060c3cf167a55a): separates peer fields from the action row so Search,
  Type and Status align while actions wrap independently; prior containment/focus coverage remains.
- Tracking now includes local runtime handoff [#101](https://github.com/wolney8/OpenForge/issues/101),
  request-coverage recovery [#102](https://github.com/wolney8/OpenForge/issues/102), and deferred
  rebranding decision [#103](https://github.com/wolney8/OpenForge/issues/103). The previously
  unlinked Founder import baseline is preserved in [#104](https://github.com/wolney8/OpenForge/issues/104).
- This page is the navigation summary; Git commits and linked contracts/registers retain detailed
  history.

## What Will should test

Environment: local `http://localhost:3010`; #88 delivery revision is recorded in the current
checkpoint. Manual status: `NOT RUN`.

1. Open a test Profile's **Tracker → Extra Place**, then select **Add Extra Place row**.
2. Choose an Active, Bonus Restricted, Soft Limited, Pending Sign Up and hard-blocked bookmaker in
   turn. Expect `Not checked` information, Bonus Restricted availability, a Soft Limited warning,
   planning-only Pending Sign Up, and disabled new use with the hard-block reason.
3. Reopen an imported historical Extra Place row and confirm it remains accessible.

Record each manual result as `PASS`, `FAIL`, or `BLOCKED`; automated results never replace Will's
result.
