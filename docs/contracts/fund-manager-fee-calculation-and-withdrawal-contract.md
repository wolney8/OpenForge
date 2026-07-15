# Calculation Contract: Fund Manager Fee Calculation and Withdrawal

_Last updated: 2026-07-14_

## Contract status

- Status: Ready for human contract review; core business rules confirmed
- Milestone: M10 Fund Manager Management and Investment Fee Visibility
- Related planning: `docs/planning/openforge-fee-withdrawal-planning-note.md`
- Spreadsheet equivalent: no complete workbook formula; OpenForge reporting extension
- Profile scoped: Yes; every input and output requires `profile_id`

## Purpose and value separation

Show management and investment fee amounts for an approved reporting period without confusing a calculated entitlement with money actually removed from a profile bankroll.

Keep these values separate:

- `eligible_period_profit`: supplied by an approved reporting calculation
- `weekly_estimated_fee`: informational estimate, not yet crystallised
- `management_fee_amount`: calculated, not withdrawn
- `investment_fee_amount`: calculated, not withdrawn
- `total_fee_due`: calculated entitlement
- `fee_withdrawn_amount`: actual audited cash movement
- `fee_outstanding_amount`: calculated due less linked withdrawals
- `subscriber_net_entitlement`: gross profile value less crystallised outstanding fees
- `opening_loss_carryforward` / `closing_loss_carryforward`: unrecovered settled losses carried between months
- `provisional_fee_reserve`: current-month fee estimate reserved from a subscriber withdrawal request

## Inputs

| Field | Type | Required | Source |
|---|---|---:|---|
| `profile_id` | id | Yes | selected profile |
| `period_start` / `period_end` | date | Yes | approved reporting period |
| `reporting_basis` | enum | Yes | settled/final or explicitly approved current-value view |
| `eligible_period_profit` | money | Yes | reporting contract output |
| `opening_loss_carryforward` | money | Yes | prior locked monthly period; non-negative |
| `management_fee_percent` | decimal | Yes | profile settings; percentage points |
| `investment_fee_percent` | decimal | Yes | profile settings; percentage points |
| `fee_package_id` / `fee_package_version` | id/version | No | future package assignment; snapshotted at period lock |
| `withdrawal_eligible_cash_before_fee_reserve` | money | Withdrawal only | upstream cash/exposure workflow |
| linked fee withdrawals | money rows | No | Cash Adjustments/audit ledger |

Current profile fee percentages may be edited by the Fund Manager through the approved profile
metadata workflow. Each update must be audited. Changing the current setting must not rewrite a
locked period's snapshotted percentages or historical fee calculations.

## Formula

Package validation:

- each fee percentage must be between `0` and `100`, inclusive
- `management_fee_percent + investment_fee_percent` must not exceed `100`
- a combined value of exactly `100` is valid; a value above `100` blocks calculation and package activation

For a supplied, approved monthly `eligible_period_profit`:

- `profit_after_loss_recovery = eligible_period_profit - opening_loss_carryforward`
- `fee_base = MAX(profit_after_loss_recovery, 0)`
- `closing_loss_carryforward = MAX(opening_loss_carryforward - eligible_period_profit, 0)`
- `management_fee_amount = ROUND(fee_base * management_fee_percent / 100, 2)`
- `investment_fee_amount = ROUND(fee_base * investment_fee_percent / 100, 2)`
- `total_fee_due = management_fee_amount + investment_fee_amount`
- `fee_withdrawn_amount = SUM(linked, received fee-withdrawal cash adjustments)`
- `fee_outstanding_amount = MAX(total_fee_due - fee_withdrawn_amount, 0)`

Percentages are percentage-point decimals: `40.00` means `40%`.

Management and investment fees are calculated independently from the same positive settled/final fee base and then combined. Neither fee is calculated from the amount remaining after the other fee.

## Period and crystallisation rules

- Weekly provisional breakdowns follow the workbook's Monday-based `WeekLabel` convention.
- Weekly values are informational slices of the current calendar month's settled/final result. They do not crystallise a fee independently.
- Formal fee crystallisation occurs once at the end of each calendar month in the profile's resolved timezone.
- The monthly fee base uses the month's net settled/final profit after recovering `opening_loss_carryforward`; it must not sum only profitable weeks.
- A negative month increases the loss carry-forward. A positive month first reduces that carry-forward, and only excess recovered profit is fee eligible.
- The locked period snapshots fee percentages and package version.

## Cash-first and reporting rules

- This contract does not change row-level sportsbook/free-bet/casino current values.
- Fee displays must label whether the base is settled/final or current/projected.
- Formal fee crystallisation uses positive settled/final period profit before management and investment fees.
- Ordinary top-ups and withdrawals are not profit. Profit-affecting deductions follow the approved reporting contract and must be disclosed in the fee-base breakdown.
- Weekly values are shown as provisional estimates; the eventual crystallisation period is monthly.
- A fee calculation never creates a withdrawal automatically.
- A withdrawal is a separately confirmed, profile-scoped Cash Adjustment with subtype `Management Fee Withdrawal` or `Investment Fee Withdrawal`, period, amount and account/cash impact.
- Calculated fees must not be deducted twice from both post-fee reporting and cash snapshot views.

## Fund Manager and subscriber visibility

Fund Manager views may show:

- fee-base breakdown and percentages
- provisional, crystallised, withdrawn and outstanding amounts
- linked Cash Adjustment ids and withdrawal dates
- gross cash snapshot and subscriber net entitlement

Later subscriber/profile-owner views should show:

- gross settled performance for the disclosed period
- management and investment fee percentages and amounts
- total fee charged
- post-fee/net entitlement

Subscriber views do not need to expose whether or when the Fund Manager physically transferred an already disclosed fee. A later subscriber withdrawal-request workflow remains separate.

## Mid-period subscriber withdrawal reserve

When a subscriber requests a withdrawal before month-end:

- calculate month-to-date settled/final profit using the same loss carry-forward rule
- calculate provisional management and investment fee components using the active snapshotted package
- `provisional_fee_reserve = provisional_management_fee + provisional_investment_fee`
- `subscriber_withdrawal_available = MAX(withdrawal_eligible_cash_before_fee_reserve - crystallised_fee_outstanding - provisional_fee_reserve, 0)`
- disclose the reserved estimate and that the final monthly charge may change with later settled results
- do not create or crystallise a fee Cash Adjustment solely because a withdrawal estimate was requested

Open liability/exposure and operational bankroll restrictions remain inputs from their existing contracts; this contract does not silently infer them.

## Cash snapshot accounting

- Crystallising a fee creates an outstanding fee liability and reduces subscriber net entitlement, but does not by itself move cash.
- Physically withdrawing the fee reduces the gross/current cash snapshot and reduces the outstanding fee liability by the same amount.
- The physical withdrawal must not reduce subscriber net entitlement a second time.
- Example: gross cash `1100.00`, crystallised outstanding fees `50.00`, subscriber net entitlement `1050.00`. After withdrawing `50.00`, gross cash is `1050.00`, outstanding fees are `0.00`, and subscriber net entitlement remains `1050.00`.

## Rounding and tolerance

- Round each fee component half-up to two decimal places.
- Sum the rounded components for `total_fee_due`.
- Acceptance tolerance: exact to `0.01`.

## Audit requirements

Record profile, period, reporting basis, fee-base source/version, percentages, component amounts, package id/version, approval state and linked withdrawal ids. Percentage or package changes must not silently rewrite a previously approved/locked period.

## Confirmed decisions and remaining gate

- Confirmed: management and investment fees use the same positive settled/final base, are calculated independently, and are then combined.
- Confirmed: physical withdrawals use distinct management/investment fee Cash Adjustment subtypes and reduce gross cash.
- Confirmed: subscriber net entitlement must not be reduced twice when an accrued fee is physically withdrawn.
- Confirmed: weekly provisional breakdowns with calendar-month crystallisation.
- Confirmed: monthly losses carry forward and must be recovered before later profit is fee eligible.
- Confirmed: combined management and investment fee percentages above `100` are blocked.
- Confirmed: mid-period subscriber withdrawal availability reserves the provisional fee estimate.
- `To confirm`: amendment/reopening policy for a locked fee period.

## Tests required

- positive, zero and negative base
- percentage-point semantics and component rounding
- calculated but not withdrawn
- partial and complete linked withdrawal
- duplicate withdrawal link blocked
- profile isolation
- changed percentage does not rewrite locked period
- withdrawal reduces gross cash and fee liability without a second net-entitlement reduction
- subscriber view excludes operational withdrawal metadata
- package/version change does not rewrite a locked period
- weekly breakdown does not independently crystallise a fee
- monthly positive profit first recovers loss carry-forward
- negative monthly profit increases loss carry-forward
- combined fee percentage above `100` is blocked; exactly `100` is accepted
- mid-period withdrawal availability reserves provisional fee components
