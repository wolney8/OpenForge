# Contract: Financial Value Presentation and Motion

_Last updated: 2026-09-07_

## Status and scope

- Status: Amendment captured; implementation and rollout coverage pending verification
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
- Direction is determined by the destination value's sign, not by its delta: a positive/green
  destination rolls up and a negative/red destination rolls down. Therefore `20 → 10` rolls up and
  `-20 → -10` rolls down.
- Zero, unavailable and loading states remain neutral and static. Loading must never fabricate a
  temporary zero or random intermediate monetary value.
- Identical refetches, theme changes, ordinary rerenders and list reordering must not replay motion.
- Default duration target: `180–320ms`, with no looping, shimmer or celebratory flashing.
- Large changes may group digit transitions; they must not animate every intermediate penny.
- `prefers-reduced-motion: reduce` disables rolling and uses an immediate value replacement or brief opacity change.
- Any platform motion-off setting available to the surface must disable non-essential animation
  independently; current shared-component support for such a setting must be verified before rollout.
- Rapid updates must cancel stale motion and settle on the newest authoritative formatted value;
  hidden, unmounted and dense offscreen displays must not retain or perform unnecessary work.
- Lottie/Rive are not required for numeric motion and must not be added without dependency review.

Reference: [WCAG animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions).

## Assistive technology

- The complete formatted value remains available as one accessible text value during animation.
- Do not make each rolling digit separately focusable or announced.
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
- destination-sign direction independent of delta, including `20 → 10` up and `-20 → -10` down
- positive/negative sign transitions, equal refetch, neutral zero, unavailable/loading and rapid updates
- reduced-motion replacement
- currency setting change without delayed theme/state mismatch
- mixed-currency aggregation blocked
- light/dark contrast checks

## Rollout coverage

All items remain pending until implemented and verified in bounded batches. Extending the shared
component alone does not establish complete surface coverage.

- [ ] Shared `FinancialValue` digit-roll correction and deterministic component fixtures.
- [ ] Dashboards and summary cards.
- [ ] Read-only ledger values and financial badges.
- [ ] Calculator and calculation-preview results.
- [ ] Reports and Profit Tracker values.
- [ ] Account summaries.
- [ ] Relevant read-only dialog results.
- [ ] Future read-only signed-money displays adopt the shared component by default.

Editable money fields and file/print exports remain static. Adoption must preserve exact final
values, precision, copy behaviour, calculations, accounting punctuation, current/final indicators,
font metrics, baseline, padding and badge geometry.

## Acceptance

- Formatted numeric result exactly represents the upstream decimal value.
- No presentation operation changes money arithmetic or rounding.
- Human visual/accessibility review is required in light, dark and reduced-motion modes.
