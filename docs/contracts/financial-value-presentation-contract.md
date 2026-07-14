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
- Positive money: `+£10.00` when sign context is useful.
- Negative money: `-£1.29`; never `£-1.29`.
- Zero money: `£0.00` with neutral semantics.
- Inputs may omit a plus sign while editing; resolved read-only values follow the signed display rule.
- Use tabular numerals where changing values must remain aligned.
- Currency and sign are textual information, not decorative icons.

## Semantic colour

- Positive: approved accessible green plus explicit sign/value.
- Negative: approved accessible red plus explicit minus sign/value.
- Zero/unknown: neutral colour plus explicit state label where needed.
- Colour must never be the only way to convey direction or state.
- Text contrast must meet WCAG 2.2 AA: normally at least `4.5:1`; meaningful non-text boundaries at least `3:1`.

Reference: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Current, final and override labels

- Open/pending rows label their displayed money as `Current value` or `Projected value` according to the calculation contract.
- Settled rows label the resolved value as `Final value`.
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

