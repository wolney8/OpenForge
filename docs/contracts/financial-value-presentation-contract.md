# Contract: Financial Value Presentation and Motion

_Last updated: 2026-07-14_

## Status and scope

- Status: Draft, ready for human review
- Milestone: M15 Platform Experience: Financial Motion, Accessibility and Guided Entry
- Related issue: Define Currency and Animated Financial Value Contract
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
- Positive money: `+£ 10.00` when sign context is useful, or `£ 10.00` where a plus sign would add noise.
- Negative money: accounting style with narrow internal bracket spacing `( £ 1.29 )`; never `-£ 1.29`, `£-1.29`, `£ -1.29` or compact `(£ 1.29)`.
- Zero money: `£ 0.00` with positive/green semantics for resolved absolute zero.
- Inputs may omit a plus sign while editing; resolved read-only values follow the signed display rule.
- Use tabular numerals where changing values must remain aligned.
- Currency and sign are textual information, not decorative icons.

## Semantic colour

- Positive: approved accessible green plus explicit sign/value.
- Negative: approved accessible red plus accounting parentheses/value.
- Absolute zero: approved accessible green plus explicit value.
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
  - positive and absolute-zero values use a green background with dark green text.
  - negative values use a red background with dark red text.
  - bet ledger value badges use dedicated `--bet-ledger-value-*` contrast tokens rather than generic success/danger tokens.
  - unknown/unavailable values use a neutral badge.
- Stat cards and sentence fragments may use the standard text-only financial value primitive unless a later UI contract requires badges there too.
- Manual override displays an override indicator and retains access to calculated value and reason.
- Motion and colour must not obscure a transition from current to final state.

## Motion behaviour

- Digit rolling may occur only when a visible numeric value changes.
- Direction should correspond to numeric change; it must not imply profit/loss beyond the signed value.
- Default duration target: `180–320ms`, with no looping, shimmer or celebratory flashing.
- Large changes may group digit transitions; they must not animate every intermediate penny.
- `prefers-reduced-motion: reduce` disables rolling and uses an immediate value replacement or brief opacity change.
- A platform motion setting may disable non-essential animation independently.
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
- value increase/decrease motion direction
- reduced-motion replacement
- currency setting change without delayed theme/state mismatch
- mixed-currency aggregation blocked
- light/dark contrast checks

## Acceptance

- Formatted numeric result exactly represents the upstream decimal value.
- No presentation operation changes money arithmetic or rounding.
- Human visual/accessibility review is required in light, dark and reduced-motion modes.
