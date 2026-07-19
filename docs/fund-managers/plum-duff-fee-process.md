# Plum Duff Fund Manager Fee Process

_Last updated: 2026-07-18_

## Purpose

This guide explains how Plum Duff calculates, confirms, and records Fund Manager fees. It is an operational summary of the approved calculation contract in `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md`; the contract remains authoritative if wording conflicts.

The process is profile-scoped. Fees for one subscriber profile never use another profile's rows, percentages, losses, withdrawals, or corrections.

## Values and labels

| Label | Meaning | Withdrawable? |
|---|---|---:|
| **Indicative Fee Impact** | The signed effect of a Monday-to-Sunday week's settled P&L on the expected month-end fee | No |
| **Estimated Fees** | An open-month estimate based on currently settled rows | No |
| **Fees Earned** | Fees confirmed from a completed calendar month | Yes, if still outstanding |
| **Available to Withdraw** | Confirmed Fees Earned less fee withdrawals already recorded | Yes |
| **Fees Withdrawn** | Physical fee withdrawals already recorded in Cash Adjustments | Already withdrawn |
| **Fees Charged** | Subscriber-facing name for confirmed management and investment fees | Not an operational withdrawal status |

Weekly figures help the Fund Manager understand progress. They must not be added together and treated as earned, because a later loss in the same month can reduce or remove the month-end fee.

## Monthly calculation

Plum Duff uses one complete calendar month as the fee period. A month becomes available for review on the first day of the next month in the Fund Manager's resolved timezone. For example, June can be reviewed from 1 July.

Only profile-owned sportsbook bets, free bets, and casino offers which are:

- settled;
- dated inside the calendar month; and
- backed by a resolvable final value

are included. Open/current values and ordinary Cash Adjustments are excluded. A settled row with no usable settlement date or final value blocks the review until corrected.

The calculation is:

```text
profit after loss recovery = monthly settled profit - opening loss carry-forward
fee base                  = max(profit after loss recovery, 0)
management fee            = round(fee base x management fee %, 2)
investment fee            = round(fee base x investment fee %, 2)
total fee due              = management fee + investment fee
available to withdraw      = total fee due - linked fee withdrawals
```

Management and investment fees are calculated independently from the same positive fee base. One fee is not deducted before calculating the other.

## Loss carry-forward

A loss carry-forward prevents fees being charged on profit that only recovers an earlier loss.

Example:

1. April settles at `-£20.00`. No fee is earned and `£20.00` carries forward.
2. May settles at `+£15.00`. The profit reduces the carried loss to `£5.00`; no fee is earned.
3. June settles at `+£30.00`. The first `£5.00` clears the remaining loss, leaving a `£25.00` fee base.

A negative weekly Indicative Fee Impact is not a credit and does not move cash. It only explains why the expected month-end fee has fallen.

## Review and withdrawal cadence

1. During the month, review weekly **Indicative Fee Impact** and open-month **Estimated Fees**.
2. After month-end, open the Fund Manager **Fees** view.
3. Resolve any ledger rows marked **Action Required**.
4. Prepare the monthly review. Plum Duff snapshots the included rows, percentages, source version, and calculation.
5. Confirm the review. It becomes **Fees Earned** and contributes to **Available to Withdraw**.
6. After physically taking money from the profile bankroll, use **Mark as Withdrawn**.
7. Plum Duff records separate Management Fee Withdrawal and Investment Fee Withdrawal Cash Adjustments and reduces Available to Withdraw.

Partial withdrawals are allowed. Crystallising a fee does not itself move cash. Marking it as withdrawn means the transfer has already happened; there is no pending confirmation step.

## Interface hierarchy

Plum Duff deliberately separates the simple overview from the detailed financial workflow:

1. The Fund Manager **Fees** tab is the basic cross-profile view. It answers which profiles need review, confirmation, or withdrawal action for a closed month.
2. Selecting a profile opens a simple monthly breakdown showing sportsbook/qualifying-bet P&L, free-bet P&L, casino P&L, signed Cash Adjustments, settled profit, loss recovery, fee components, Fees Earned, Fees Withdrawn, and Available to Withdraw.
3. **Open Monthly Review** enters the detailed operational workflow for blockers, audit-backed calculation, confirmation, and recording a physical withdrawal.

Cash Adjustments appear in the simple breakdown to explain bankroll movement, but they remain explicitly excluded from the settled betting-profit fee base.

## Corrections and fee credits

Before any fee is withdrawn, the Fund Manager may reopen the latest confirmed period with a reason. Plum Duff retains the original revision and creates an audited recalculation rather than overwriting history.

Use reopening only after an underlying settled ledger value was corrected or arrived late. Correct the sportsbook, free-bet or casino row first, reopen the confirmed monthly review, compare the new revision with the original in **Revision Audit**, then confirm the recalculated fee review again. Reopening is not a manual fee editor.

After any withdrawal, the historical period cannot be reopened:

- an **overcharge** creates a fee credit which reduces a future fee entitlement;
- an **undercharge** creates a fee debit which increases a future fee entitlement;
- neither adjustment changes historical P&L or silently rewrites the withdrawn period.

If a profile closes before an overcharge credit can be used, the remaining credit is reported as a refund due to the subscriber. Credits and debits are fee corrections, not betting profit or Cash Adjustments.

## Subscriber visibility

The complete fee workflow is Fund Manager-only. Future subscriber access should show only the disclosure needed to understand the subscriber's position:

- gross settled performance for the disclosed period;
- management and investment fee percentages and amounts;
- total **Fees Charged**;
- fee credit/debit amount and a plain-language reason where applicable;
- post-fee net entitlement.

Subscriber views must hide:

- fee review queues and readiness blockers;
- included ledger-row audit identifiers;
- calculation revision history and internal source versions;
- Fund Manager confirmation controls;
- physical withdrawal dates, destination accounts, Cash Adjustment ids, and **Mark as Withdrawn** controls;
- operational notes that do not affect subscriber disclosure.

A subscriber should not be charged twice when a confirmed fee is physically withdrawn. The confirmed fee already reduces net entitlement; the later cash movement reduces gross cash and the outstanding fee liability by the same amount.

## Audit and safety

- Fee periods and withdrawals require `profile_id` isolation.
- Percentages are stored as percentage points: `40.00` means `40%`.
- Each component rounds half-up to two decimal places before totals are combined.
- Date-range controls are for viewing only and never resize or crystallise a fee period.
- No fee calculation creates a withdrawal automatically.
- Confirmed withdrawal Cash Adjustments are read-only outside the fee correction workflow.
