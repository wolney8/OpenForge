# Contract: Financial Value Presentation and Motion

_Last updated: 2026-09-24 16:00 BST_

## Status and scope

- Status: Shared odometer implemented; bounded local/Preview evidence below, wider replay/readiness coverage remains open
- Milestone: M15 Platform Experience: Financial Motion, Accessibility and Guided Entry
- Related issues: historical contract [#58](https://github.com/wolney8/OpenForge/issues/58),
  historical implementation [#59](https://github.com/wolney8/OpenForge/issues/59), and current
  requirement [#105](https://github.com/wolney8/OpenForge/issues/105)
- Changes financial calculations: No

## Purpose

Present existing contract-backed money values consistently and accessibly, with optional restrained digit motion when a value changes. Formatting must not alter stored precision, calculation results or current/final semantics.

## Currency ownership

- MVP baseline: Fund Manager/application currency setting, default `GBP`.
- Every displayed financial value receives an explicit ISO 4217 currency code from resolved settings.
- `To confirm`: whether profiles may override the Fund Manager default.
- Until that decision is approved, per-profile currency overrides must not be inferred or added to schema.
- Mixed-currency aggregation is prohibited unless a later exchange-rate contract exists.

## Formatting

- Use `Intl.NumberFormat` or equivalent locale-aware formatting.
- Default locale: Fund Manager setting, initially `en-GB`.
- Positive money: Google Sheets-style accounting format, for example `£ 10.00` or `£ 1,000.12`; do not add a plus sign.
- Negative money: Google Sheets-style accounting format, for example `£ (1.29)` or `£ (1,000.12)`; never `-£ 1.29`, `£-1.29`, `£ -1.29`, `(£ 1.29)` or `( £ 1.29 )`.
- Zero money: `£ -` with neutral semantics.
- Inputs may omit currency while editing; resolved read-only values follow the accounting display rule.
- Use tabular numerals where changing values must remain aligned.
- Currency and sign are textual information, not decorative icons.

## Semantic colour

- Positive: approved accessible green plus explicit value.
- Negative: approved accessible red plus accounting parentheses/value.
- Absolute zero: approved accessible neutral/light-grey plus explicit zero placeholder.
- Unknown/unavailable: neutral colour plus explicit state label where needed.
- Colour must never be the only way to convey direction or state.
- Text contrast must meet WCAG 2.2 AA: normally at least `4.5:1`; meaningful non-text boundaries at least `3:1`.

Reference: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Current, final and override indicators

- Open/pending rows label their displayed money as `Current value` or `Projected value` according to the calculation contract.
- Settled rows label the resolved value as `Final value`.
- Ledger tables must show this state with Material Symbols rather than visible repeated wording:
  - `hourglass_top` for current/projected value.
  - `done_all` for final/settled value.
- The icon floats slightly over the top-right of the rounded value badge at roughly 75% opacity and must not cover the displayed number.
- Current/projected icons use the warning/yellow token; final/settled icons use the success/green token.
- The accessible name must expose `Current value` or `Final value`; the mouse-over title must explain the state in plain language.
  - Current/projected tooltip meaning: cash-first value while the row is still open.
  - Final/settled tooltip meaning: settled result value for the row.
- Ledger table money values use a rounded square badge:
  - positive values use a green background with dark green text.
  - negative values use a red background with dark red text.
  - absolute-zero values use a neutral/light-grey treatment.
  - bet ledger value badges use dedicated `--bet-ledger-value-*` contrast tokens rather than generic success/danger tokens.
  - unknown/unavailable values use a neutral badge.
- Stat cards and sentence fragments may use the standard text-only financial value primitive unless a later UI contract requires badges there too.
- Manual override displays an override indicator and retains access to calculated value and reason.
- Motion and colour must not obscure a transition from current to final state.

## Motion behaviour

- Read-only signed-money values use a brief vertical digit roll on their first resolved display and
  when the authoritative displayed value changes.
- On first resolved display, direction follows the destination sign: positive rolls up and negative
  rolls down. On a later value change, direction follows the numeric change: increase rolls up and
  decrease rolls down. Identical values do not replay automatically.
- Each digit owns a fixed-height clipped viewport over a vertical `0`–`9` strip. Digit transforms
  are staggered by the persisted setting (80ms by default); currency, sign, grouping and decimal
  punctuation stay static.
- A rolling value retains its destination width, currency and sign punctuation throughout motion.
  Its digit windows begin on zero, so `£ 20.00` starts as `£ 00.00` and `£ (20.00)` starts as
  `£ (00.00)` rather than changing sign or width. The accessible and selectable text remains the
  exact destination throughout.
- Each digit viewport inherits the surrounding value's font family, size, weight, line height and
  baseline, and sizes itself from a tabular numeral glyph. Animation must not compress the value;
  currency spaces and punctuation retain their natural static width.
- Pointer-enter or click directly on an ungrouped shared read-only value replays it once. Its
  automatic/direct replay starts a configurable cooldown, defaulting to 1.5 seconds, so incidental
  repeated pointer movement cannot restart it during that window. A genuine authoritative value
  change may still replace it and settle on the newest value.
- Every active data-table row containing financial values uses the shared row replay group. Entering
  the row through a text, numeric, status or action cell replays that row's financial values only;
  non-financial cell content is not converted into or misrepresented as money. The same nearest-group
  rule applies to semantic cards and drawers: pointer entry replays once, then further entry is
  suppressed until the persisted replay delay has elapsed even if the pointer leaves and re-enters.
  Every appropriate container click restarts all registered values during or after that delay and
  starts the delay again, without a click limit. Nested groups do not replay an outer page or parent
  container.
- Zero remains neutral, static and displays exactly `£ -`; it does not temporarily become a
  monetary amount or participate in replay. Unavailable and loading states remain static.
  Loading must never fabricate a temporary zero or random intermediate monetary value.
- Identical refetches, theme changes, ordinary rerenders and list reordering must not replay motion.
- Each digit transition defaults to 520ms, with no looping, shimmer or celebratory flashing.
- Large changes may group digit transitions; they must not animate every intermediate penny.
- `prefers-reduced-motion: reduce` disables rolling and uses an immediate value replacement or brief opacity change.
- The persisted Fund Manager `Financial motion` setting defaults to On and disables all
  non-essential shared-value animation when Off. `prefers-reduced-motion: reduce` always overrides
  that setting and presents the exact value statically. The same Site Settings group persists the
  replay cooldown, roll duration and digit-cascade delay from bounded supported choices.
- Rapid updates must cancel stale motion and settle on the newest authoritative formatted value;
  hidden, unmounted and dense offscreen displays must not retain or perform unnecessary work.
- Lottie/Rive are not required for numeric motion and must not be added without dependency review.

Reference: [WCAG animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions).

## Assistive technology

- The complete formatted value remains available as one accessible text value during animation.
- Do not make each rolling digit separately focusable or announced.
- Visual digit strips are presentation-only and cannot enter text selection or clipboard output.
  One canonical text representation owns layout and selection, so copying a value or a surrounding
  sentence produces each formatted value exactly once.
- Routine calculation updates should not create an assertive live-region storm.
- Important save/error/result statuses use an appropriate programmatic status message without moving focus unnecessarily.

Reference: [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages).

## Fixtures and tests

- GBP positive, negative and zero
- current versus final labels
- ledger badge treatment for positive, negative and zero values
- ledger current/final Material Symbol indicator rendering
- manual override indicator
- first resolved positive/up and negative/down motion
- destination-sign direction on initial display; later numeric delta (`20 → 10` down and `-20 → -10` up)
- positive/negative sign transitions, equal refetch, static neutral zero, unavailable/loading and rapid updates
- pointer-enter, leave/re-enter and unlimited explicit click replay coordinated at the nearest card/row
- configurable replay cooldown with a 1.5-second default after automatic and explicit triggers
- sign- and width-stable zero-digit origins for positive and negative destinations
- row replay initiated from financial and non-financial cells
- persisted motion On/Off, replay pause, roll duration and digit-cascade preferences with reduced-motion override
- standalone and surrounding-sentence selection/clipboard output
- pill, badge, KPI and inline geometry parity with static formatted text
- reduced-motion replacement
- currency setting change without delayed theme/state mismatch
- mixed-currency aggregation blocked
- light/dark contrast checks

## Chart and progress motion

- The same nearest-container replay group coordinates financial values with registered progress
  bars and progress rings.
- Resolved progress bars reveal from zero to their exact bounded percentage with a restrained
  elastic settle. A short leading-edge highlight exists only while the bar is moving.
- Registered progress rings sweep from zero to the exact final arc and become fully static when
  settled. Their accessible labels always state the final value; animation does not alter data.
- Multiple bars in one card begin together with a short configured stagger. Rapid replay cancels
  prior presentation work and settles at the current target.
- Chart/progress travel uses the persisted roll duration plus a 500ms presentation allowance, so it
  remains adjustable with the shared setting without making longer-distance visual travel abrupt.
- Shared line/area graphs reveal from their origin to the exact final plot and use the same nearest
  card replay and motion-preference rules. The settled graph geometry and accessible summary remain
  unchanged.
- Financial motion Off and `prefers-reduced-motion: reduce` render exact final bar/ring states
  immediately, without a reveal, highlight or layout change.

## Rollout coverage

The checked adoption items below record shared-component use, not complete replay/readiness
acceptance. Bounded evidence and remaining named consumers follow; extending a primitive alone
does not establish full surface coverage.

- [x] Shared `FinancialValue` digit-roll correction and focused helper/rendered fixtures.
- [x] Dashboards and summary cards: Profile dashboard, portfolio point/command rails, Combined
  Analytics and Tracker summary paths use the shared component.
- [x] Read-only ledger values and financial badges across the active Sportsbook, Free Bets, Casino,
  Cash Adjustments, Accounts and Extra Places paths.
- [x] Calculator and calculation-preview results in those active ledger workflows.
- [x] Reports, Profit Tracker and Account summaries reached through the shared tracker/report paths.
- [x] Relevant existing read-only side-panel, drawer and fee-review values.
- [ ] Future read-only signed-money displays adopt the shared component by default.

Reports readiness uses authoritative outputs, not reconstructed inputs: Cash `signed_amount`,
Casino `resolved_net_pnl`, and Extra Places final/current values and required open liabilities.
Missing, blank or non-finite required outputs make only the affected measure unavailable. Existing
Cash type/date membership and retained-profit equations remain unchanged, including genuine
costs and legacy Costs. Funding incompleteness does not erase known betting P&L or retained
results; unavailable betting P&L does not erase known Cash costs. Authoritative zero remains zero.
Pending Extra Places have no settled-final contribution; historical known values remain usable.
During a saved-range request, selected-range cards/tables wait using FinancialReadValue; all-period
formal-history cards/tables retain their independent context. This is a display/readiness boundary,
not a change to calculations, persistence, reporting membership or financial history.

### Named consumer completion and remainder — CP-043, 2026-09-24 16:00 BST

| Surface | Implementation state | Verification state / next work |
| --- | --- | --- |
| Extra Places P&L / selected qualifying loss / current-week spend and budget | COMPLETE: shared readiness, per-metric completeness and nearest-card replay | CP-043 isolated/hosted: delayed/failed/unknown/zero, correction/Void, range/search, large values, Copy, themes/text/keyboard and motion; preserved Notes workflow |
| Single-Profile Dashboard headline/financial cards | COMPLETE: period refresh cancellation and failed-summary guard; existing groups retained | CP-043 isolated/hosted: selected Profile/period, rapid changes, distinct cash/P&L/fees, every populated card replay; no layout repair needed |
| Reports header P&L / retained / open-current-and-settled-final; selected-range module mix; Cash breakdown; latest/formal-period summary cards (`TrackerSummaryShell`) | UNIMPLEMENTED nearest-card replay (FinancialValue already adopted) | Reproduce nearest-card behaviour; bounded readiness, large-value geometry, Copy and motion verification still needed. Existing table-row replay/weekly-P&L evidence retained |
| Fund Manager Fee Position: Available to Withdraw / Fees Withdrawn; Exposure liability (`CrossProfileAnalytics`) | UNIMPLEMENTED nearest-card replay (FinancialValue already adopted) | Reproduce and verify these named cards. CP-042 headline-card/Active-scope evidence stays accepted |
| Profile command/header metric; directory financial rows; Profile detail balance/P&L/fees | Shared groups IMPLEMENTED | VERIFICATION ONLY: remaining bounded nearest-group/copy/unknown/read-failure matrix. Profile-detail fee fallback under failed reads is a candidate to reproduce, not a confirmed new defect |
| Fee Period Review dialog/revision values and Fee Centre Breakdown drawer | Shared groups IMPLEMENTED | VERIFICATION ONLY: scoped financial readiness/replay/Copy/compact/reduced-motion cases remain |

The nested `Tracker quick views` block inside `!isDashboardLike` is not an active Dashboard consumer;
its contradictory inner guard is not counted as unimplemented user-facing scope. `PeriodPnlReport`,
`ReportPointChart` captions/drilldowns and FinancialHistoryPanel have approved static read-only text;
they are not replay defects. Editable inputs/exports also remain static. No new inventory or completion
percentage is created, and wider issue closure/owner acceptance remains separate.

Remaining static exceptions are editable/read-only form controls, accessible narrative strings,
file/export output and legacy/non-active shells. New surfaces still require bounded adoption evidence.

Editable money fields and file/print exports remain static. Adoption must preserve exact final
values, precision, copy behaviour, calculations, accounting punctuation, current/final indicators,
font metrics, baseline, padding and badge geometry.

## Acceptance

- Formatted numeric result exactly represents the upstream decimal value.
- No presentation operation changes money arithmetic or rounding.
- Human visual/accessibility review is required in light, dark and reduced-motion modes.
