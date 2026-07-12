# OpenForge Fee Withdrawal Planning Note

_Last updated: 2026-07-01_

## Purpose

This note records the approved direction to consider management-fee and
investment-fee handling early without forcing fee logic into workbook-parity
tracker slices prematurely.

## Current boundary

- Workbook parity remains the immediate priority.
- No new fee calculation engine should be implemented without an explicit
  contract and deterministic fixtures.
- Profile records already carry management-fee and investment-fee percentage
  inputs.

## Future requirement

OpenForge should later support all of the following for each profile:

- visible management-fee percentage
- visible investment-fee percentage
- derived fee amounts for approved reporting periods
- clear period labels for those fee amounts, such as weekly or monthly
- an explicit record of when a fee is actually withdrawn from the bankroll

## Important distinction

The platform must keep these separate:

- derived fee amount
- selected fee period
- approval/decision to withdraw that fee
- the actual cash movement when the fee is withdrawn

The cash movement must not vanish into reporting maths. It needs an operational
record.

## Cash-adjustment interaction

Future fee withdrawals should remain auditable through the tracker rather than
being hidden in a derived summary.

Open questions for the later contract:

- whether fee withdrawals should use the existing `Cash Adjustments` workflow
  with structured metadata and description
- whether a dedicated fee-withdrawal classification is needed later
- whether fee withdrawals should affect both investment and cash snapshot by
  default or require explicit operator choice

## Profile and reporting expectations

Later profile surfaces should show:

- fee percentages
- pre-fee profit
- fee amount for the selected period
- post-fee earnings
- whether that fee has already been withdrawn as cash movement

The Fund Manager view should be able to compare these outputs across profiles
without losing profile isolation.

## Implementation guardrails

- no fee calculation without a calculation contract
- no fee reporting without deterministic fixtures
- no automatic fee withdrawal event
- no silent merging of fee-derived values with cash-adjustment rows
- no unlabeled net value that hides whether fees were only calculated or were
  also withdrawn
