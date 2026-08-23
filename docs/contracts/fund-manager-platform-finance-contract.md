# Contract: Fund Manager Platform Finance and Billing
_Last updated: 2026-08-17_

## 0. Status

- Status: Deferred draft
- Owner: Plum Duff planning
- Related milestone: M10 Fee Visibility and later platform billing/self-management
- Related fixture spec: `docs/fixture-specs/fund-manager-platform-finance-fixture-spec.md`
- Related fixtures: `tests/fixtures/fund-manager-platform-finance-fixtures.json`
- Approved for production billing implementation: No

## 1. Purpose

Define how Plum Duff records Fund Manager platform finance entries without contaminating profile
tracker P&L.

This contract covers platform-level revenue, costs, refunds, chargebacks, owner drawings, owner
contributions and reconciliation states. It is separate from profile ledger performance and separate
from management/investment fee calculations.

## 2. Scope

Included:

- subscription payment records
- discounts
- refunds
- chargebacks
- payment processor fees
- owner contributions and drawings
- recurring platform expenses
- processor settlement reconciliation
- correction/reversal audit records
- Fund Manager-only visibility

Excluded until separately approved:

- live Stripe or payment-provider integration
- automatic invoicing
- tax/VAT calculation
- regulated lending or credit products
- subscriber-facing billing portal
- automatic deduction from profile tracker bankrolls

## 3. Separation from profile tracker P&L

Platform finance must not alter:

- sportsbook P&L
- free-bet P&L
- casino P&L
- cash-adjustment tracker value
- selected-range tracker summaries
- formal profile reports

If an amount must affect a subscriber/profile bankroll, it belongs in an explicit profile-scoped
cash adjustment or fee-withdrawal workflow governed by the relevant fee/cash contract.

## 4. Entry types

Approved planning vocabulary:

- `subscription_payment`
- `discount`
- `refund`
- `chargeback`
- `processor_fee`
- `owner_contribution`
- `owner_drawing`
- `recurring_expense`
- `processor_settlement`
- `correction`

Entry states:

- `draft`
- `pending`
- `settled`
- `failed`
- `reversed`
- `unreconciled`

## 5. Recognition rules

- Monthly subscription revenue is recognised in the covered month once settled.
- Annual subscription revenue must be deferred across the service period unless a later accounting
  policy explicitly approves immediate recognition.
- Discounts reduce gross recognised subscription revenue.
- Refunds and chargebacks reverse recognised revenue.
- Processor fees reduce platform net revenue only.
- Owner contributions and drawings are equity-style movements, not revenue or expenses.
- Platform expenses reduce platform net income only.
- Unreconciled processor settlements create Fund Manager action required state.
- Corrections preserve the original entry and add a reversing/amending audit row.

## 6. Visibility

Fund Manager visible:

- all platform finance entries
- reconciliation states
- provider references safe for display
- revenue, expense, net revenue and owner movement summaries

Subscriber hidden:

- platform finance entries
- processor fees
- owner drawings/contributions
- cross-profile billing summaries

Subscriber-facing fee deductions are governed separately by:

- `docs/contracts/subscriber-fee-aware-earnings-contract.md`
- `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md`

## 7. Audit requirements

Every settled, reversed, failed or corrected platform finance entry must retain:

- entry id
- actor id and role
- timestamp
- amount and currency
- entry type
- prior state and new state
- reason for refund, chargeback, reversal or correction where applicable
- linked provider reference where safe
- contract version

## 8. Required fixture coverage

Fixture cases are defined in:

- `tests/fixtures/fund-manager-platform-finance-fixtures.json`

Required scenarios:

- monthly subscription payment
- annual subscription deferred recognition
- discount
- refund
- chargeback
- processor fee
- failed payment
- owner contribution
- owner drawing
- recurring expense
- unreconciled settlement
- correction reversal
- subscriber denied platform finance access
- profile P&L unchanged by platform finance

## 9. Implementation gates

Before implementation, approve:

- whether Stripe, manual entry, or another provider is the first billing source
- whether billing is Fund Manager-only at first
- invoice/receipt requirements
- refund and chargeback operational process
- whether tax/VAT is out of scope or requires a separate contract
- how platform finance appears in `/profiles` and global settings
