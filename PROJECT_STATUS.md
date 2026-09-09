# Project Status

_Last updated: 2026-09-09_

This is the short entry point for current state and acceptance. Use the
[milestone readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md) for full
sequencing and the [request register](docs/planning/plum-duff-next-issue-tracking-register.md) for
durable requirements.

## Current state

- Current feature: [#35 Standalone Calculator Workspace](https://github.com/wolney8/OpenForge/issues/35).
  The Fund Manager hub now contains the locally verified core catalogue: Standard, Multi-Lay,
  Extra Place / Each Way, Sequential Lay, Early Payout / 2UP, Multiples / Accumulator, Simple
  Dutching, Odds / Probability and Blackjack Strategy. Blackjack's Player right-column composition pass is
  code-verified locally and pending Will's recheck; its calculation matrices and session snapshot are unchanged. Copy/check glyphs use one geometrically
  centred 44px shared action. Optional Accumulator Each Way/Rule 4/fold/bonus rules and Advanced
  Dutching weighting remain blocked rather than inferred. User/hosted acceptance is pending.
- Current implementation base before this tranche: `5381571` on `main`.
- Interruptions: none within the selected #35 calculator tranche.
  Notification/session user acceptance and captured visual work remain tracked, but are not the
  active feature.
- Return point: the next roadmap tranche is the calculator-to-ledger bridge under
  [#36](https://github.com/wolney8/OpenForge/issues/36); unresolved optional family extensions
  remain visible under #35/#38.
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

- Current: #35 Fund Manager Calculator Workspace. Core standalone family coverage is locally
  implemented with deterministic contracts/fixtures and reference-only APIs; specialised
  Accumulator and Advanced Dutching extensions remain explicitly pending.
- Next queue: #36 calculator-to-Opportunity bridge; then #85 + #106 Account
  reconciliation/history/trends, and #86 Fund Manager task deck.
- Reporting roadmap: [#111](https://github.com/wolney8/OpenForge/issues/111) starts with an
  interactive point-aware Profile P&L time series, then one period-P&L Reports preset, followed by
  a reusable metric/granularity/filter model. Account balance charts remain dependent on the
  separate observation source in [#106](https://github.com/wolney8/OpenForge/issues/106).
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
- `FINANCIAL-MOTION-001` [#105](https://github.com/wolney8/OpenForge/issues/105) retains one shared
  odometer with static-equivalent geometry and canonical clipboard text. It now has persisted
  default-On Fund Manager control, reduced-motion override, neutral-zero replay and coordinated
  card/row replay across targeted active dashboard, ledger, report, Account, drawer and dialog
  paths. The current correction retains sign and width while digits roll from zero, leaves neutral
  `£ -` static, and adds persisted replay-pause, roll-duration and digit-cascade controls with
  1.5-second/520ms/80ms defaults. Future/new-surface adoption and user acceptance remain open.
  Nearest card/row entry replays contained values together, with early re-entry suppressed by the
  configured delay while every appropriate container click remains an immediate replay.
  `FINANCIAL-CHART-MOTION-001` [#110](https://github.com/wolney8/OpenForge/issues/110) now has its
  shared Dashboard slice on Target Progress, Module Mix and peer bars, Operational Focus ring and
  the selected-range line/area graph. Chart travel is slower than digit rolling; broader chart
  rollout and user/hosted acceptance remain open.
  Extra Places rails [#108](https://github.com/wolney8/OpenForge/issues/108) now use persisted activity,
  positive Account balances and deterministic ordering with maximum-three paging. Import access
  semantics [#109](https://github.com/wolney8/OpenForge/issues/109) remains untouched.
- `FINANCIAL-ANALYTICS-EXPLORER-001` [#111](https://github.com/wolney8/OpenForge/issues/111) is
  captured for a point-aware Dashboard time series and reusable Reports explorer. It remains
  planned only; [#106](https://github.com/wolney8/OpenForge/issues/106) separately owns persisted
  Account balance observations and freshness.
- Profit Boost and strict input: [#83](https://github.com/wolney8/OpenForge/issues/83) retains its
  full scope and is now assigned to M14; remaining cross-surface validation is [#91](https://github.com/wolney8/OpenForge/issues/91).
- Full current blockers and recent IDs are in the [canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md).

## What changed

- Blackjack now has explicit Simulation, Free Play and Live Play session modes. Simulation exposes no
  money and cannot convert; Free Play separates free credit from withdrawable value; Live Play
  records actual stakes/returns and derives the reviewed result from ending minus starting balance.
  Optional Digital/RNG or Live Dealer provenance does not affect strategy. `blackjack-session-v1`
  produces a deterministic immutable source snapshot for #36 without creating a business row.
  Casino mapping uses existing `Fixed Spins Or Free Play` and the new controlled `Manual Play / No
  Offer` type, so Live Play need not masquerade as a promotion. How to use is collapsed and the
  current recommendation, fallback and legal actions now share the Player region. The recommendation
  itself invokes the same existing action path as its matching action button. On desktop that single
  action panel uses the Player region's right column beside the cards; at the narrow/text-scale
  breakpoint it becomes a full-width strip above both Dealer and Player with aligned outer edges.
- Blackjack session mode now uses the compact canonical select. Touched money fields use the shared
  bounded financial-input surface with centred, unclipped currency adornment; optional routine help
  is anchored to each field instead of permanently occupying calculator space. Dealer and Player card
  labels share the canonical calculator label hierarchy.
- Blackjack now groups Deal Again/count at the left, its two M3 rule controls centrally and Reset
  Hand at the right, with logical narrow reflow. One responsive size/aspect token materially enlarges
  the 13-rank picker, dealer/player cards and empty/add-card backs; dark mode now uses a tokenised
  charcoal face and high-contrast rank/suit treatment rather than white-card glare. Stake/accounting
  remains removed; completed and split hands retain explicit
  session-only outcomes which do not grade strategy recommendations. The M3 rule switches retain
  their proven booleans, shared help is anchored to its trigger, and Deal Again has a prominent tonal
  action. Authoritative logout/expiry still clears session history. User/hosted acceptance remains
  pending under [#40](https://github.com/wolney8/OpenForge/issues/40).
- Calculator headers no longer repeat `Reference only`. Open in new tab now uses an authenticated
  minimal shell preserving the active family/state with only calculator-local controls and theme;
  full navigation, Profiles and notifications remain outside that shell.
- Odds / Probability now converts exact decimal, fractional, American and implied-probability
  sources without Profile or ledger writes, retains unrounded source precision through conversion,
  rejects malformed input and preserves current state when opened in a new tab.
- The canonical icon-only action now centres both copy and success glyphs within the same stable
  target; representative standalone and embedded calculator consumers share that primitive.
- #35 now presents **Fund Manager → Calculators → Standard**. Standard reuses the Sportsbook
  custom lay slider, resolves Smarkets/0% from the system exchange authority, calculates valid
  inputs automatically and exposes contract-backed Outcomes for Bonus Lock-In, Cashback and all
  four Profit Boost price sources. Each Way / Extra Place uses
  shared same-family ledger presentation sections and Multi-Lay uses the ledger planner/table
  composition; focused family-specific visual acceptance remains pending Will's recheck.
- Early Payout / 2UP now keeps Initial/LIVE Reference aligned as a peer of Outcomes while slider
  previews update in place. Extra Place / Each Way defaults to Extra Place, uses the shared
  segmented mode control and preserves full Place Terms quick-choice labels through bounded paging.
- #35 uses the Fund Manager calculator route. The old Profile URL redirects;
  calculator state can open in a separate tab without persistence. #112 adds fractional and
  unambiguous decimal-comma entry while keeping canonical server-validated decimal odds.
- [`630bde8`](https://github.com/wolney8/OpenForge/commit/630bde854a76ef8551a677690a060c3cf167a55a): separates peer fields from the action row so Search,
  Type and Status align while actions wrap independently; prior containment/focus coverage remains.
- Tracking now includes local runtime handoff [#101](https://github.com/wolney8/OpenForge/issues/101),
  request-coverage recovery [#102](https://github.com/wolney8/OpenForge/issues/102), and deferred
  rebranding decision [#103](https://github.com/wolney8/OpenForge/issues/103). The previously
  unlinked Founder import baseline is preserved in [#104](https://github.com/wolney8/OpenForge/issues/104).
- This page is the navigation summary; Git commits and linked contracts/registers retain detailed
  history.

## What Will should test

Environment: local `http://localhost:3010`; this slice's delivery revision is recorded in its
commit. Manual status: `NOT RUN`.

1. Open **Fund Manager → Calculators → Blackjack Strategy**, choose Live Play and confirm Session mode
   and £ fields are compact, prefixes are clear, and field help opens beside its label.
2. Enter dealer/player cards and confirm the action panel sits beside the Player cards on desktop.
   Narrow the viewport and confirm the same panel moves above the full Dealer/Player row without
   overlap, then click its recommendation to verify the normal Hit/Double/Split flow.

Record each manual result as `PASS`, `FAIL`, or `BLOCKED`; automated results never replace Will's
result.
