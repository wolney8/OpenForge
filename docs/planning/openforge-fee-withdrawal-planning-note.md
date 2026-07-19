# Plum Duff Fee Withdrawal Planning Note

_Last updated: 2026-07-18_

## Purpose

This note records the approved direction to consider management-fee and
investment-fee handling early without forcing fee logic into workbook-parity
tracker slices prematurely.

## Current implementation boundary

- The approved pure fee engine and profile-scoped monthly persistence model are
  implemented on the M10 feature branch.
- The calculation contract and deterministic fixtures remain authoritative.
- Profile records already carry management-fee and investment-fee percentage
  inputs.
- No scheduler creates month-end periods automatically yet.
- No fee calculation or confirmation creates a Cash Adjustment automatically.
- Closed-month fee preview, creation and reopening derive sportsbook, free-bet
  and casino settled/final P&L from profile-scoped ledger records. Caller-supplied
  monthly profit and loss carry-forward values are rejected.
- Cash Adjustments and projected/current row values do not enter this gross
  betting fee base.

## Required capability

Plum Duff supports or is being prepared to support all of the following for
each profile:

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

Confirmed correction policy:

- month-end calculations require Fund Manager confirmation before they become
  crystallised **Fees Earned**
- the Fund Manager may reopen a crystallised period before any fee withdrawal,
  but must provide a reason and retain the original audited revision
- after any fee withdrawal, the period stays immutable and corrections become
  next-open-period fee debit or credit adjustments
- unused overcharge credit becomes an outstanding refund due if the profile
  closes
- subscribers later see charged fees, correction and revised entitlement, but
  not operational withdrawal metadata

Confirmed cadence and reporting policy:

- calendar-month net settled/final P&L remains the only MVP crystallisation base;
- Monday-to-Sunday reports show signed **Indicative Fee Impact** and a running
  month-end estimate, not independently earned fees;
- report date presets and custom ranges are viewing controls only;
- weekly provisional fee draws and weekly crystallisation are deferred;
- **Mark as Withdrawn** records an immediate completed withdrawal from already
  crystallised Fees Earned and may create separate management and investment Cash
  Adjustments in one atomic workflow.

## Persisted lifecycle

The SQLite schema keeps four profile-scoped record families:

- `fee_periods`: one calendar-month lifecycle record per profile;
- `fee_period_revisions`: immutable calculation snapshots, including locked
  percentages and package version;
- `fee_withdrawal_links`: explicit links to matching fee-withdrawal Cash
  Adjustments;
- `fee_corrections`: future-period debit/credit records or closing refund-due
  records.

The API exposes profile-scoped list/detail, create-ready-period, confirm,
reopen, correction and withdrawal-link operations under
`/profiles/{profile_id}/fee-periods`. These operations require explicit Fund
Manager actor ids and never infer or move cash automatically.

The Fund Manager profile drawer now exposes a closed-month review dialog. It
previews backend-derived ledger totals, identifies blocking row ids, prepares a
`ready_to_crystallise` revision and requires a separate confirmation before the
amount appears as **Fees Earned**. Combined monthly and yearly formal reports
consume crystallised fee periods rather than inventing fee values from selected
range P&L.

### Fee-review resolution session

Blocking rows are resolved through a bounded Fund Manager workflow:

- blockers are grouped by Sportsbook Bets, Free Bets and Casino Offers;
- opening a group shows only the blocker record ids for the selected profile and
  closed month;
- a persistent banner identifies the fee-review context and returns to the same
  profile and month;
- unrelated route navigation requires explicit confirmation to end the review;
- settlement actions reject `Settled` with `Pending` and require a settlement
  date;
- casino settlement actions expose the existing explicit final-value override
  where no deterministic calculated final value exists;
- saved changes remain explicit ledger updates and are never silently inferred
  or autosaved by the fee calculation.

## Profile and reporting expectations

Profile surfaces show or should show:

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
