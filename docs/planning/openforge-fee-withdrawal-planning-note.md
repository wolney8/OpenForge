# OpenForge Fee Withdrawal Planning Note

_Last updated: 2026-07-14_

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

Confirmed direction:

- use the existing `Cash Adjustments` workflow with dedicated `Management Fee
  Withdrawal` and `Investment Fee Withdrawal` subtypes
- calculate management and investment fees independently from the same positive
  settled/final fee base, then combine them
- physical fee withdrawals reduce gross/current cash and the outstanding fee
  liability together
- do not reduce subscriber net entitlement a second time when the physical cash
  movement occurs
- snapshot fee-package id/version and percentages for each locked period so
  later package changes do not rewrite history
- show Monday-based weekly provisional fee breakdowns and crystallise once at
  the end of each calendar month
- carry monthly losses forward; later settled profit must recover those losses
  before a new fee is eligible
- block a fee package when management and investment percentages combine to
  more than `100%`
- reserve the current provisional fee estimate when calculating a subscriber's
  mid-period withdrawal availability

Still to confirm:

- amendment/reopening policy for a previously locked fee period

## Profile and reporting expectations

Later profile surfaces should show:

- fee percentages
- pre-fee profit
- fee amount for the selected period
- post-fee earnings

The Fund Manager may additionally see whether the fee has been physically
withdrawn and the linked Cash Adjustment. A later subscriber-facing view should
show the disclosed fee and post-fee entitlement, but does not need the Fund
Manager's operational withdrawal metadata.

The Fund Manager view should be able to compare these outputs across profiles
without losing profile isolation.

## Implementation guardrails

- no fee calculation without a calculation contract
- no fee reporting without deterministic fixtures
- no automatic fee withdrawal event
- no silent merging of fee-derived values with cash-adjustment rows
- no unlabeled net value that hides whether fees were only calculated or were
  also withdrawn
