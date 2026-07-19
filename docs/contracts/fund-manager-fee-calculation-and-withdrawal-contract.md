# Calculation Contract: Fund Manager Fee Calculation and Withdrawal

_Last updated: 2026-07-17_

## Contract status

- Status: Approved for implementation; core business and correction rules confirmed
- Milestone: M10 Fund Manager Management and Investment Fee Visibility
- Related planning: `docs/planning/openforge-fee-withdrawal-planning-note.md`
- Spreadsheet equivalent: no complete workbook formula; OpenForge reporting extension
- Profile scoped: Yes; every input and output requires `profile_id`

## Purpose and value separation

Show management and investment fee amounts for an approved reporting period without confusing a calculated entitlement with money actually removed from a profile bankroll.

Keep these values separate:

- `eligible_period_profit`: derived server-side by the approved monthly settled/final fee-base report; never accepted as a client-entered money value
- `weekly_estimated_fee`: informational estimate, not yet crystallised
- `weekly_indicative_fee_impact`: signed informational contribution of one
  Monday-to-Sunday reporting week; it is not independently earned or withdrawable
- `management_fee_amount`: calculated, not withdrawn
- `investment_fee_amount`: calculated, not withdrawn
- `total_fee_due`: calculated entitlement
- `fee_withdrawn_amount`: actual audited cash movement
- `fee_outstanding_amount`: calculated due less linked withdrawals
- `subscriber_net_entitlement`: gross profile value less crystallised outstanding fees
- `opening_loss_carryforward` / `closing_loss_carryforward`: unrecovered settled losses carried between months
- `provisional_fee_reserve`: current-month fee estimate reserved from a subscriber withdrawal request

## Required product terminology

Fund Manager interfaces must use these labels consistently:

- **Estimated Fees**: the current open-month provisional estimate. This is forecast information and is not withdrawable.
- **Indicative Fee Impact**: the signed effect a reporting week has on the
  projected month-end fee before monthly netting and loss recovery. It is not
  independently earned or withdrawable.
- **Fees Earned**: the total fee crystallised from closed monthly periods in the selected reporting range.
- **Available to Withdraw**: crystallised fees still outstanding after linked received fee withdrawals. This is the only fee amount the Fund Manager may action as a fee withdrawal.
- **Fees Withdrawn**: audited physical fee-withdrawal Cash Adjustments already received for the relevant crystallised periods.

Fund Manager summary views should present **Available to Withdraw** as the primary actionable value and keep **Estimated Fees**, **Fees Earned**, and **Fees Withdrawn** available in supporting detail. An arbitrary selected date range must not relabel an open-period estimate as earned or crystallised.

Later subscriber interfaces must use **Fees Charged** for crystallised fees that reduce subscriber entitlement, with separate management and investment fee components. Subscriber interfaces must not describe the Fund Manager's physical cash transfer as a second charge and do not need to expose operational withdrawal timing or linked Cash Adjustment ids.

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
- Weekly indicative component impact is calculated from the week's signed settled/final P&L:
  - `weekly_management_impact = ROUND(weekly_settled_profit * management_fee_percent / 100, 2)`
  - `weekly_investment_impact = ROUND(weekly_settled_profit * investment_fee_percent / 100, 2)`
  - `weekly_indicative_fee_impact = weekly_management_impact + weekly_investment_impact`
- Weekly indicative impact may be negative. A negative value explains why the
  projected month-end fee has fallen; it is not a fee credit or cash movement.
- Weekly impacts must not be summed and relabelled as **Fees Earned**. The
  authoritative month-end calculation nets the complete calendar month and then
  applies opening loss carry-forward.
- Formal fee crystallisation occurs once at the end of each calendar month in the profile's resolved timezone.
- The monthly fee base uses the month's net settled/final profit after recovering `opening_loss_carryforward`; it must not sum only profitable weeks.
- A negative month increases the loss carry-forward. A positive month first reduces that carry-forward, and only excess recovered profit is fee eligible.
- The locked period snapshots fee percentages and package version.
- Month-end calculation first enters `ready_to_crystallise`; it does not become
  `crystallised` or **Fees Earned** until the Fund Manager confirms it.
- The monthly report includes only profile-scoped rows with `status = Settled`
  and a settlement date inside the complete calendar month.
- The fee base is the sum of contract-backed final sportsbook, free-bet and
  casino P&L. Open/current values and Cash Adjustments are excluded.
- Any in-period settled row without a resolvable final value blocks readiness.
  Any settled row without a usable settlement date is also surfaced as a blocker.
- `opening_loss_carryforward` is derived from the immediately preceding
  crystallised monthly period. After the first period, a missing or unconfirmed
  preceding month blocks the next period.
- Preview, creation and pre-withdrawal reopening recompute the same backend
  report. Neither eligible profit nor opening loss may be supplied by the UI.

## Locked-period corrections and amendments

- A crystallised period with no linked received fee withdrawal may be reopened
  by the Fund Manager only.
- Reopening requires a non-empty reason, timestamp, actor id and retained copy
  of the original calculation and inputs.
- Recalculation creates a new audited revision. It must not overwrite or delete
  the original revision.
- Reopening is blocked once a later monthly fee period exists. A future
  cascade-recalculation workflow is required before an older revision may alter
  loss carry-forward already consumed by later periods.
- Once any fee from the period has been physically withdrawn, the period cannot
  be reopened.
- A correction discovered after withdrawal creates a separate next-open-period
  adjustment:
  - an overcharge creates a fee credit that reduces future fee entitlement;
  - an undercharge creates a fee debit that increases the next open period's
    fee entitlement;
  - neither adjustment rewrites the historical period or its linked withdrawal.
- If a profile closes before an overcharge credit can be recovered, the
  remaining credit is reported as an outstanding refund due.
- Fee debit and credit adjustments are not profit and must remain separately
  labelled in reports and audit records.
- Later subscriber views show the original **Fees Charged**, correction amount,
  reason summary and revised net entitlement. They do not expose operational
  withdrawal account ids or transfer timing.

## Cash-first and reporting rules

- This contract does not change row-level sportsbook/free-bet/casino current values.
- Fee displays must label whether the base is settled/final or current/projected.
- Formal fee crystallisation uses positive settled/final period profit before management and investment fees.
- Ordinary top-ups and withdrawals are not profit. Profit-affecting deductions follow the approved reporting contract and must be disclosed in the fee-base breakdown.
- Weekly values are shown as provisional estimates; the eventual crystallisation period is monthly.
- Date presets and custom ranges are viewing controls only. They must never create,
  resize, split, confirm or crystallise a fee period.
- MVP does not permit weekly provisional fee draws. The Fund Manager may record a
  physical fee withdrawal only against a confirmed monthly **Fees Earned** balance.
- A fee calculation never creates a withdrawal automatically.
- A withdrawal is a separately confirmed, profile-scoped Cash Adjustment with subtype `Management Fee Withdrawal` or `Investment Fee Withdrawal`, period, amount and account/cash impact.
- The Fund Manager action is labelled **Mark as Withdrawn**. Submitting that action
  means cash has already physically left the profile bankroll; no second pending or
  received confirmation is required.
- One Mark as Withdrawn action may create separate management and investment Cash
  Adjustments atomically. Partial component withdrawals remain valid.
- Calculated fees must not be deducted twice from both post-fee reporting and cash snapshot views.

## Fund Manager and subscriber visibility

Fund Manager views may show:

- fee-base breakdown and percentages
- provisional, crystallised, withdrawn and outstanding amounts
- linked Cash Adjustment ids and withdrawal dates
- gross cash snapshot and subscriber net entitlement
- `Available to Withdraw` as the actionable crystallised outstanding amount

Later subscriber/profile-owner views should show:

- gross settled performance for the disclosed period
- management and investment fee percentages and amounts
- total fee charged
- post-fee/net entitlement
- `Fees Charged`, rather than Fund Manager withdrawal operations

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

Each immutable fee revision stores `fee_base_source_version` plus a deterministic
JSON breakdown containing the module totals and exact synthetic-safe ledger row
identifiers, settlement dates and final values used by that revision.

## Confirmed decisions

- Confirmed: management and investment fees use the same positive settled/final base, are calculated independently, and are then combined.
- Confirmed: physical withdrawals use distinct management/investment fee Cash Adjustment subtypes and reduce gross cash.
- Confirmed: subscriber net entitlement must not be reduced twice when an accrued fee is physically withdrawn.
- Confirmed: weekly provisional breakdowns with calendar-month crystallisation.
- Confirmed: weekly displays use **Indicative Fee Impact** and a running month-end
  estimate; no weekly amount is crystallised or withdrawable in MVP.
- Confirmed: date-range controls affect reporting views only and never fee periods.
- Confirmed: **Mark as Withdrawn** records an immediately completed cash movement
  against crystallised monthly fees, with no provisional weekly draw workflow.
- Confirmed: monthly losses carry forward and must be recovered before later profit is fee eligible.
- Confirmed: combined management and investment fee percentages above `100` are blocked.
- Confirmed: mid-period subscriber withdrawal availability reserves the provisional fee estimate.
- Confirmed: before any withdrawal, Fund Manager-only reopening is allowed with
  a mandatory reason and retained original revision.
- Confirmed: after any withdrawal, the historical period remains immutable and
  corrections become next-open-period fee credits or debits.
- Confirmed: unrecovered overcharge credit becomes an outstanding refund due if
  the profile closes.
- Confirmed: month-end calculation requires Fund Manager confirmation before it
  becomes crystallised **Fees Earned**.

## Tests required

- settled sportsbook, free-bet and casino final values form the monthly base
- open/current and out-of-period rows are excluded
- settled rows with missing dates or unresolved final values block readiness
- client-supplied eligible profit and loss carry-forward inputs are rejected
- fee-base source version and included row audit data are retained
- stale ready reviews cannot be crystallised after ledger values change
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
- positive and negative weekly indicative fee impact uses independently rounded
  management and investment components
- weekly impact is never reported as Fees Earned or Available to Withdraw
- changing a report date range does not alter fee-period boundaries or state
- Mark as Withdrawn cannot exceed crystallised component amounts and creates no
  pending withdrawal state
- cash adjustments created by Mark as Withdrawn cannot be edited or deleted
  directly; corrections must use the fee-period correction and audit workflow
- monthly positive profit first recovers loss carry-forward
- negative monthly profit increases loss carry-forward
- combined fee percentage above `100` is blocked; exactly `100` is accepted
- mid-period withdrawal availability reserves provisional fee components
- ready-to-crystallise is not reported as Fees Earned before confirmation
- pre-withdrawal reopen requires Fund Manager authority and a reason
- reopening retains the original revision and creates a new revision
- post-withdrawal reopen is blocked
- post-withdrawal overcharge creates a future fee credit
- post-withdrawal undercharge creates a future fee debit
- closing a profile with unused fee credit reports an outstanding refund due
- subscriber correction view excludes operational withdrawal metadata
