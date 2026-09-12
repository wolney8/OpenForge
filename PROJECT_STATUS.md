# Project Status

_Last updated: 2026-09-12_

This is the short entry point for current state and acceptance. Use the
[milestone readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md) for full
sequencing and the [request register](docs/planning/plum-duff-next-issue-tracking-register.md) for
durable requirements.

## Current state

- **Current: #114 whole-platform audit**, on `audit/platform-quality-114` in
  `.worktrees/platform-quality-audit`, based on main
  `f7a3b35073ecc87cdf8f8f881129f221ec44d395`. See the resumable
  [platform quality audit](docs/audits/platform-quality-audit.md) for request traceability,
  route/API coverage, executed evidence, explicit untested journeys and priorities. No product
  implementation or merge is part of this tranche. Affected dependencies are tracked in #115;
  credential rotation stays separate #96. Normal services and private inputs remain untouched.
- **#114 batch 2 financial-flow checkpoint:** native SNR/SR preview/copy/Save/reopen and actual
  settlement/report agree with independent fixtures; converted SNR provenance/settlement/retry
  also checked. Persisted invalid Account money yields incomplete cash totals without warning;
  invalid Free Bet POST commits before500 and breaks reads; the same completed Blackjack snapshot
  saves Casino activity in two Profiles. Desktop conversion receipts/focus work, half-width pointer
  Save is intercepted by navigation chrome (keyboard recovery succeeds). See the same audit report,
  PD-QA-002/004/007/014/015. First proposed repair is bounded Account monetary validation and
  incomplete aggregation, not a cosmetic or general-harness tranche. Local image optimizer is
  reachable on affected dependencies; attacker AVIF/deployed exposure remains UNVERIFIED. No
  product fixes. UI money/combined summary, imported award lineage, real Blackjack UI conversion,
  PostgreSQL, large data, screen-reader and remaining request clarification checks stay explicit.
- **Manual comparison deferred by Will; no scheduled date; resume on supplied results or explicit
  request.** Final calculator sign-off remains pending. Historical Monday references are not a
  current commitment. Preserve the frozen `manual/calculator-candidate-2026-09-12` full f7 SHA,
  authenticated 3020/8020 runtime/data and original `_input` HTML/XLSX/guide/observations.
  The existing development launcher and worksheet parent case IDs remain unchanged.
- Development `calculator/multi-lay-normal-parity` is separately pushed at
  `215193b7fcb5b11a28e23a4531d2a45434545dc1`, five commits ahead of main. Its native Normal v2
  per-leg-commission planning Add Row/save/reopen slice is **unmerged**, not main functionality.
  Its 3013/8013 synthetic DB is separate from the audit's 3024/8024 synthetic DB. Remaining richer
  v2 placement/settlement and other reference gaps remain visible; no acceptance borrowed from f7.

The entries below retain previous-tranche evidence and historical current-state wording. They do
not supersede the audit/deferral block above or imply fresh whole-workflow verification.

- Multi-Lay reference expansion PD-FIX-101–106 is locally implemented at the 2026-09-11 source
  snapshots. Versioned `multi-lay-v2` supports Normal, Free Bet SNR and Money Back, zero/non-zero
  Profit Boost, two to 20 named legs, per-leg commission and Standard/Underlay/Overlay/Custom
  allocation with editable multiplier bounds. It exposes component Outcomes, source-defined maximum
  exchange exposure, live copy/slider updates, Reset/help and pop-out state. Thirteen bounded v2
  configuration fixtures pass; the live MBB penny-boundary comparison is documented rather than
  called exact parity. Existing persisted Sportsbook rows remain on v1. Embedded/save/conversion is
  intentionally limited to the representable Normal Standard/Underlay uniform-commission subset;
  richer v2 configurations fail closed until the destination contract can retain them. The existing
  [#113 audit](docs/audits/issue-113-independent-calculator-verification-2026-09-10.md) and
  [manual worksheet](docs/audits/calculator-manual-comparison.md) carry the evidence and gaps.
- Standard control/parity tranche PD-FIX-093–100 is locally verified pending Will's comparison.
  Standard now separates Normal/Free Bet SNR/Free Bet SR `Bet Type` from Simple/Advanced
  presentation; Simple is explicitly equalised Standard, while Advanced exposes the shared
  Underlay/Overlay references, Custom slider and Part Lay path. Bonus Lock-In exposes Normal/SNR,
  Loses/Wins, 70% retention and canonical Smarkets 0% defaults, with one offer-aware strategy
  engine. The bounded #113 extension now passes 96 supported configuration fixtures and keeps 10 Bonus
  Free Bet SR cells blocked. Will's editable observation worksheet is
  [Calculator manual comparison](docs/audits/calculator-manual-comparison.md). GitHub #35/#37/#113,
  shared-containment evidence for #92, and the unchanged SNR conversion blocker for #36 are pending
  sync because `gh` and an authenticated token are unavailable in this environment; no hosted claim
  is made.
- Current corrective tranche PD-FIX-085–092 repairs the Bonus Lock-In routing defect, exposes the
  governed Profit Boost derivation, and tightens the existing #36 review/completion boundary. Normal
  Bonus Lock-In now uses one offer-aware engine for both triggers and Standard/Underlay/Overlay/
  Custom/Part Lay; the synthetic £5 @ 9.24/10.5, £5 reward, 70%, 0% fixture resolves to £4.07,
  £1.50 and £4.34. Free Bet SNR is calculator-supported across all five strategies but remains
  conversion-blocked because the Sportsbook destination has no backing-basis field; Free Bet SR
  Bonus remains explicitly unsupported. This supersedes earlier broad “29 modes”
  assurance: #113 proves representative fixtures, not every cross-product.
- Current #36 conversion reconciliation records one authoritative family/mode matrix in the
  existing bridge contract. The shared Standard adapter now creates native Free Bets Prospecting
  rows for governed SNR/SR modes; maps Cashback, back-loses Bonus Lock-In/Money Back and every
  Profit Boost derivation into their supported destination fields; preserves explicit Custom/Part
  Lay input; and embeds the audited reference result in the immutable SHA-256 source envelope.
  Source/envelope mode mismatches and unsupported Bonus backing bases fail before any write. Existing
  Multi-Lay, Each Way / Extra Place and completed Blackjack adapters retain their Profile rules,
  source identity, linked Notifications and retry idempotency. Sequential Lay, Early Payout / 2UP,
  Multiples and Dutching remain losslessly blocked; Odds / Probability and Blackjack Simulation
  remain utilities. Will's local/hosted acceptance is pending; #36 stays open.

- Calculator UI follow-up PD-FIX-081–084 is locally verified pending Will's recheck. The shared
  family carousel now contains the complete active/focus halo and selects adjacent calculators from
  fixed non-wrapping arrows; Standard and Early Payout use content-driven subgrid rows without tall
  trailing panel space; and Extra Place / Each Way restores its last presentation scheme through the
  existing ThemeProvider preference path without resetting mode or inputs. Calculations, validation,
  #113 audit results and #36 bridge behaviour remain unchanged.
- Current presentation correction: [#35 Calculator Workspace](https://github.com/wolney8/OpenForge/issues/35)
  and [#92 shared UI consistency](https://github.com/wolney8/OpenForge/issues/92). PD-FIX-076–080
  are locally verified pending Will's recheck: Standard/Early Payout share explicit aligned segment
  rows; Multi-Lay/Sequential Lay reuse the canonical BACK BET eyebrow; Extra Place reuses the
  embedded presentation selector without resetting state; Multiples/Dutching preserve exposed
  outer radii; and calculator families use bounded slide paging, fixed disabled boundary arrows and
  an anchored ellipsis menu. Its earlier back-wins hiding decision is superseded by the current
  Outplayed-backed Normal/SNR trigger contract. Other financial calculations remain unchanged.
  Evidence is synced to #35 and #92; Will's acceptance recheck remains pending.
- Current feature: [#113 independent calculator verification audit](https://github.com/wolney8/OpenForge/issues/113).
  The durable audit now combines 25 existing non-Standard independent cases with a 60-cell
  Standard backing/trigger/source/strategy matrix. The result is 85 supported configuration
  fixtures passing, with 10 required Bonus Free Bet SR configurations blocked rather than omitted.
  Shared money quantization still canonicalises rounded signed zero. Current Outplayed source plus
  independent branch equations now govern Normal and SNR backing for both reward triggers; the
  `money_back` compatibility alias remains governed. Eight external comparisons remain explicit in
  `docs/audits/issue-113-independent-calculator-verification-2026-09-10.md`. No unrelated formula changed.
  #36 manual acceptance remains on hold until this audit and worksheet are reviewed.
- Prior feature: [#40 Blackjack acceptance reconciliation](https://github.com/wolney8/OpenForge/issues/40),
  a bounded correction before returning to [#36](https://github.com/wolney8/OpenForge/issues/36).
  The Fund Manager hub now contains the locally verified core catalogue: Standard, Multi-Lay,
  Extra Place / Each Way, Sequential Lay, Early Payout / 2UP, Multiples / Accumulator, Simple
  Dutching, Odds / Probability and Blackjack Strategy. Blackjack Live/Free Play now reports
  contract-derived or explicitly overridden per-hand returns and running cash/credit totals. Natural
  Blackjack natural payout defaults explicitly to 1:1, with 3:2, 6:5, 2:1 and validated Custom
  presets in Session Setup; ordinary wins remain 1:1. Last Hand is a smoothly animated full-width
  shared disclosure that leaves Dealer/Player geometry unchanged. Session History exposes committed
  STAKED, RETURNED and NET P&L values in money modes, and UP-CARD/CARD N correction uses the existing
  undo path through one shared, label-neutral overlay control. Live/Free outcome settlement now keeps
  the completed cards and outcome visible while updating history and running totals; a new hand starts
  only from Player-header `Rebet & Deal Again` or `Double & Deal Again` (with the standalone Rebet path
  removed). Last Hand appears only after that explicit transition and never reserves a table column.
  Card correction now preserves the mandatory Card 1/Card 2 slot skeleton: clearing Card 1 or using
  banner Undo after the initial three-card entry cannot remove the Card 2 input.
  Current manual-acceptance correction keeps compact card/banner undo targets fixed on hover, groups
  Reset Session beside Reset Hand, and uses one measured persistent 540ms recommendation window so pending and
  current-hand states lift/collapse without replacing the outer panel. Session History now places its
  disclosure chevron inside HAND, gives OUTCOME the flexible desktop width, and expands details across
  the complete table width; constrained rows stack without page overflow. Compact history now reports
  final class/total, the complete chosen action sequence and the outcome independently; terminal Bust
  is no longer appended to recommendations. Money modes retain plain Deal Again when no valid previous
  stake exists, and only expose rebet/double shortcuts for a proven stake. Running summaries fill equal
  4/2/1-column tracks, redundant conversion/history copy is removed, and Odds / Probability defaults
  and resets to Fractional odds while explicit saved/pop-out state remains authoritative.
  React now receives `inert` as a boolean, eliminating the disclosure console warning. Strategy matrices remain unchanged;
  `blackjack-session-v1` is additively extended with payout/return provenance and totals. Copy/check glyphs use one geometrically
  centred 44px shared action. Optional Accumulator Each Way/Rule 4/fold/bonus rules and Advanced
  Dutching weighting remain blocked rather than inferred. User/hosted acceptance is pending.
- #36 manual-acceptance defects are locally corrected: compact Casino VALUE cells no longer let
  generic table typography shrink odometer digits or fixed badge minimums clip accounting-negative
  values; Profile choices deliberately stack name/code; Account choices retain stable `account_id`
  identity even when provider labels repeat. Bridge source snapshots, destination validation and
  idempotency are unchanged. Will's recheck remains required.
- Current implementation base before this tranche: `80816b4` on `main`.
- On hold: calculator redesign and audited financial maths. Notification/session user acceptance
  and captured visual work remain tracked, but are not the active feature.
- Return point: [#36](https://github.com/wolney8/OpenForge/issues/36) remains active for focused
  local acceptance, then targeted hosted acceptance. Unresolved destination capabilities remain
  visible under #36/#38/#39 rather than being flattened into Standard rows.
- Current Blackjack evidence is synced to [#40](https://github.com/wolney8/OpenForge/issues/40#issuecomment-5608374894)
  and [#36](https://github.com/wolney8/OpenForge/issues/36#issuecomment-5608375042). Earlier #77 evidence
  remains separate; neither issue is closed and Will's local acceptance is still required.
- Evidence-comment sync for the current Blackjack correction to #40/#92/#36 is pending: no authenticated GitHub integration
  is available in this session and `gh` is not installed. Local tracking retains the full tranche.
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

- Current: #36 calculator-to-ledger bridge. The same immutable source/review/idempotency path now
  converts Standard Sportsbook modes and Free Bet SNR/SR to their native Prospecting ledgers,
  Multi-Lay to Sportsbook, Extra Place / Each Way to their native Profile ledger, and completed
  Blackjack Free/Live to one Casino activity. Odds /
  Probability is utility-only. Sequential Lay, Early Payout / 2UP, Multiples and Dutching remain
  blocked on faithful destination contracts.
- Next queue: local then hosted #36 acceptance; then #85 + #106 Account
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

- The expanded #36 bridge retains one immutable conversion-source boundary and one guided modal
  based on the existing #77 Profile/Account selection pattern. Standard conversion requests missing
  destination identity, checks Account eligibility, creates Profile-isolated Prospecting rows and
  reruns the destination Sportsbook contract. Completed Blackjack Free/Live sessions choose exactly
  one Profile/Casino Account and retain the verified `blackjack-session-v1` checksum; Simulation is
  ineligible, promotions require identity, and own-cash sessions map to `Manual Play / No Offer`.
  Successful targets emit one durable Notification and retries reuse the created row. Calculator and
  session state remain intact. Multi-Lay now preserves all represented outcome legs in Sportsbook;
  Extra Place / Each Way preserve mode, stakes, terms, places, exchange/lay state and provenance in
  their native Prospecting ledger. Sequential Lay, Early Payout / 2UP, Multiples and Dutching have
  no faithful current destination representation and expose no conversion action; Odds /
  Probability remains a non-convertible utility.

- Blackjack now has explicit Simulation, Free Play and Live Play session modes. Simulation exposes no
  money and cannot convert; Free Play separates free credit from withdrawable value; Live Play
  records actual stakes/returns and derives the reviewed result from ending minus starting balance.
  Optional Digital/RNG or Live Dealer provenance does not affect strategy. `blackjack-session-v1`
  produces a deterministic immutable source snapshot for #36 without creating a business row.
  Casino mapping uses existing `Fixed Spins Or Free Play` and the new controlled `Manual Play / No
  Offer` type, so Live Play need not masquerade as a promotion. How to use is collapsed and the
  current recommendation, fallback and legal actions now share the Player region. The recommendation
  itself invokes the same existing action path as its matching action button. That single action panel
  is now a full-width strip above both Dealer and Player at every supported viewport, with the same
  outer edges as their combined row and no reserved Player-side column. In completed state, its status
  and outcome controls align compactly beside Current Hand. Recording an outcome archives exactly once,
  updates the hand count and opens a blank next hand immediately while preserving session-level choices.
  A shared snapshot-based, top-right icon Undo reverses the latest card/action/outcome transition; explicit
  status rows and picker emphasis identify the next required card without shifting the banner. The aligned,
  compact Last Hand recap uses the shared card artwork and fades after the next dealer/two player cards are
  entered. Session History is open by default, collapsible and retained across refresh in the same authenticated
  session. Bust is recognised, shown briefly with reduced-motion protection and archived automatically.
  Live Play additionally totals committed stakes from actual actions. Outcome-based gross returns now
  derive only from the explicit payout contract (default 1:1 plus 3:2/6:5/2:1/Custom natural-Blackjack rules),
  while a manually entered Actual Return remains authoritative. Free Play reports the same arithmetic as
  chip/credit value without implying withdrawable cash. Fixed stake cap and Use Winnings remain advisory;
  Rebet & Deal Again and Double & Deal Again prepare calculator state only. Last Hand is a full-width shared
  disclosure using the canonical height/opacity transition; it never changes Dealer/Player tracks, briefly opens, auto-collapses before interaction,
  and thereafter respects the user's manual state without a separate Keep open control. The top controls
  now use the requested four semantic grid rows with Session Mode and Reset Hand first.
  Card ranks alone use the requested Times serif face. Outcome controls use semantic M3 treatments, and
  `Blackjack Win` appears only for an original two-card natural; Push remains available for a dealer tie.
- Blackjack session mode now uses the compact canonical select. Touched money fields use the shared
  bounded financial-input surface with centred, unclipped currency adornment; optional routine help
  is anchored to each field instead of permanently occupying calculator space. Dealer and Player card
  labels share the canonical calculator label hierarchy.
- Blackjack keeps Session Mode and a compact Session Setup action above the card table. In Live Play,
  only Stake and Actual Return remain as high-frequency inputs; Activity Source, Table Type, starting/
  ending balances and play-limit settings use the shared settings-modal shell. Free Play credit/result
  setup follows the same density rule. Shared Blackjack cards retain their established motion.
- Blackjack money entry now uses the shared commit-time normaliser (`.50`/`.5`/`0.5` → `0.50`)
  while malformed text remains available for inline validation. Convertible sessions expose an
  explicit, unset-by-default activity source independent of table type; Digital/RNG versus Live
  Dealer has moved into a compact Session details disclosure. The blocked-mode error stays attached
  to Session Mode and offers the existing confirmed Reset Session flow.
- Blackjack top controls retain Session Mode/Reset Hand, hand count/Surrender and Soft 17 rows; Deal
  Again has moved to a collision-safe Player-header grid and reflows below the Player label at narrow
  container widths. The banner's
  icon-only Undo uses the canonical centred icon box and remains outside layout flow. One responsive size/aspect token materially enlarges
  the 13-rank picker, dealer/player cards and empty/add-card backs; dark mode now uses a tokenised
  charcoal face and high-contrast rank/suit treatment rather than white-card glare. Stake/accounting
  remains removed; completed and split hands retain explicit
  session-only outcomes which do not grade strategy recommendations. The M3 rule switches retain
  their proven booleans, shared help is anchored to its trigger, and Deal Again has a prominent tonal
  action. Authoritative logout/expiry still clears session history. User/hosted acceptance remains
  pending under [#40](https://github.com/wolney8/OpenForge/issues/40).
- Blackjack Session History reports summaries in classification/total → action → outcome order, adds
  committed STAKED, RETURNED and NET P&L only for Free/Live Play, and expands through bounded responsive detail cards.
  Dealer UP-CARD and Player CARD N clear icons use the overlaid shared centred control and existing undo
  reducer, clearing dependent state. The additive `blackjack-session-v1` envelope preserves payout preset,
  custom multiplier, last deal shortcut, return source, per-hand net and running cash/credit totals for #36.
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

1. Open **Fund Manager → Calculators → Blackjack Strategy**, record Hit/Double/Stand and use Undo; expect
   the prior cards, recommendation and highlighted waiting target to return.
2. Record an outcome. Expect one History row, a compact Last Hand recap and a blank new hand; enter its dealer
   and first two player cards and expect the recap to fade. Refresh and confirm Session History remains.

Record each manual result as `PASS`, `FAIL`, or `BLOCKED`; automated results never replace Will's
result.
