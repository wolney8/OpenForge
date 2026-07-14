# Workflow Contract: Deterministic Guided Entry Focus

_Last updated: 2026-07-14_

## Status and scope

- Status: Draft, approval required before implementation
- Milestone: M15 Platform Experience
- Related future boundary: M12 decision support may provide advice, but does not control required-field logic

## User goal

Understand the next incomplete field for the chosen ledger, offer type, bet type and strategy without losing freedom to review or change earlier values.

## Rule model

- Guidance is driven by a versioned deterministic dependency matrix.
- Inputs include ledger type, offer type, bet type, strategy, status and completed fields.
- Output is a set of required, optional, hidden, blocked and next-recommended fields.
- Workbook-required fields remain the baseline; approved UI-only rules must identify their source separately.
- Guidance does not calculate financial values or recommend gambling risk.

## Presentation

- Highlight at most one next-recommended field group by default.
- Use focus ring/tonal emphasis plus concise text such as `Next required`; glow alone is insufficient.
- Do not move keyboard focus automatically while the user is typing.
- On save, move focus to or summarise the first invalid required field using standard error semantics.
- Hidden fields must not remain required or retain an invisible blocking error.
- Guidance animation respects reduced motion and must not pulse indefinitely.

## Example dependency paths

- `No Lay`: exchange, lay odds and lay stake hidden/not required.
- `Multilay`: branch outcome names/odds and per-branch placement required; single `lay_odds_1` control hidden.
- `Refund If`: maximum bonus and retention required when the selected rule needs them.
- `Free Bet SNR`: free-bet value, back odds, lay odds and profile exchange required for calculator resolution.
- Settled record: result and settlement date required; locked fields require explicit `Edit settled bet`.

## Safety and audit

- A guidance rule cannot auto-save or auto-place.
- Authority-list options remain profile scoped.
- If offer/strategy rules conflict, show `Review required` and do not guess.
- Record rule version in validation diagnostics, not as a financial audit replacement.

## Tests and Playwright path

- next field changes deterministically after valid entry
- no-lay and multi-lay conditional field rules
- save focuses/summarises first invalid required field
- guidance never steals focus during entry
- reduced motion disables pulsing
- changed offer/strategy clears obsolete validation blockers
- profile-specific authority options remain isolated

