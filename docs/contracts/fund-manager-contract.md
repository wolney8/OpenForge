# Product Contract: Fund Manager and Platform Finance

_Last updated: 2026-08-03_

## Status

- Status: Draft
- Human approval required before implementation: Yes
- Module: Fund Manager, platform finance and administration
- Related profile-fee contract: `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md`

## Purpose

This contract separates three money domains that must not be merged:

- profile bankroll and tracker P&L;
- profile management/investment fees owed to the Fund Manager;
- platform business finance such as subscriptions, processor fees, refunds, chargebacks, owner contributions, owner drawings and operating expenses.

## Roles

| Role | Intended access |
|---|---|
| Platform Owner | all platform finance and system settings |
| Fund Manager | profile management, profile fees, ledgers and reports |
| Finance Admin | platform finance records and reconciliation only |
| Support Admin | operational support without platform money visibility |
| Read Only Auditor | read-only audit/report access |
| Subscriber | later limited profile-facing view only |

## Profile fee boundary

Profile management and investment fees remain governed by `fund-manager-fee-calculation-and-withdrawal-contract.md`.

- Fees Earned are crystallised monthly.
- Available to Withdraw is the only actionable fee value.
- Mark as Withdrawn creates audited fee-withdrawal Cash Adjustments.
- Subscriber net entitlement must not be reduced twice.

## Platform finance boundary

Platform finance records are not profile P&L and must not alter sportsbook, free-bet, casino or cash-adjustment reporting unless explicitly linked as operational metadata.

Included platform finance events:

- monthly subscription payment;
- annual subscription with deferred recognition;
- discount;
- refund;
- chargeback;
- payment processor fee;
- failed payment;
- owner contribution;
- owner drawing;
- recurring software or service expense;
- unreconciled settlement;
- correction or reversal.

## Required platform finance fields

| Field | Required | Notes |
|---|---:|---|
| `entry_date` | Yes | date money event occurred |
| `entry_type` | Yes | subscription, refund, expense, owner drawing, etc. |
| `direction` | Yes | in, out, neutral |
| `amount` | Yes | platform business amount |
| `currency` | Yes | display and reconciliation |
| `counterparty` | No | subscriber, processor, software vendor |
| `linked_profile_id` | No | link only, not profile P&L |
| `state` | Yes | pending, settled, failed, reversed, reconciled |
| `processor_fee_amount` | No | separate from gross revenue |
| `notes` | No | audit-safe explanation |

## Recognition rules

- Monthly subscription revenue is recognised in the covered month when paid/settled.
- Annual subscription payments require deferred recognition across the service period.
- Processor fees reduce platform net revenue, not profile bankroll.
- Refunds and chargebacks reverse platform revenue and may create support tasks.
- Owner contributions/drawings are equity-style business movements, not revenue or expenses.

## Subscriber visibility

Subscribers may later see plan, subscription status and profile-facing fee disclosures. They must not see platform owner drawings, processor settlement details, support notes, internal account intelligence or other profiles.

## UI requirements

- Platform finance should live in a Fund Manager/Platform settings or finance route, not inside profile ledgers.
- Finance summaries must label gross, fee, net, reconciled and unreconciled states explicitly.
- Any action that changes money state requires disabled/loading/success/error states and an audit row.

## Tests required

- subscription payment;
- annual deferred recognition;
- discount;
- refund;
- chargeback;
- processor fee;
- failed payment;
- owner contribution;
- owner drawing;
- recurring expense;
- unreconciled settlement;
- correction/reversal;
- subscriber access denied to platform finance;
- profile P&L unchanged by platform finance entry.
