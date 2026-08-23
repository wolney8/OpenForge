# Fixture Spec: Fund Manager Platform Finance

_Last updated: 2026-08-03_

## Contract covered

- `docs/contracts/fund-manager-platform-finance-contract.md`

## Purpose

Define deterministic synthetic platform finance fixtures that stay separate from profile tracker P&L.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| FMF-001 | Monthly subscription payment | recognised in covered month |
| FMF-002 | Annual subscription | deferred recognition across service period |
| FMF-003 | Discount | reduces recognised gross subscription amount |
| FMF-004 | Refund | reverses platform revenue |
| FMF-005 | Chargeback | reverses revenue and raises action required |
| FMF-006 | Processor fee | reduces platform net revenue only |
| FMF-007 | Failed payment | no recognised revenue and action required |
| FMF-008 | Owner contribution | equity-style inflow, not revenue |
| FMF-009 | Owner drawing | equity-style outflow, not expense |
| FMF-010 | Recurring expense | platform expense only |
| FMF-011 | Unreconciled settlement | review required |
| FMF-012 | Correction/reversal | audit row retained and totals updated |
| FMF-013 | Subscriber denied | subscriber cannot read platform finance |
| FMF-014 | Profile P&L unchanged | platform finance entry does not alter tracker P&L |
