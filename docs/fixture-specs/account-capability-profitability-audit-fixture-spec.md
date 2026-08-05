# Fixture Spec: Account Capability Profitability Audit

_Last updated: 2026-08-03_

## Contract covered

- `docs/contracts/account-health-intelligence-contract.md`

## Purpose

Define deterministic synthetic fixtures for capability-level account intelligence, partial profitability audits, commercial classification, review scheduling and due-for-review queue behaviour.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| ACPI-001 | William Hill mixed capability | account summary `Restricted`, price boosts `WorkingWithLimits`, casino `Working`, Extra Places `InsufficientTooling`, commercial value `WorthChecking` |
| ACPI-002 | Bet365 partial audit | standard betting `Working`, promotions unavailable, unknown boosts/ARBs retained, commercial value `NeedsReview` |
| ACPI-003 | Standard betting works but ARBs rejected | ordinary sportsbook usable, ARB capability rejected/tiny, commercial value depends on remaining routes |
| ACPI-004 | Boost-only residual value | no general promotions, limited boosts remain low but repeatable value |
| ACPI-005 | Casino-only residual value | sportsbook heavily restricted but casino still creates realised value |
| ACPI-006 | Insufficient tooling | Extra Places visible but cannot be assessed; state is not unavailable |
| ACPI-007 | Stale evidence | previously profitable account moves into review queue with reduced confidence |
| ACPI-008 | Money held and withdrawal concern | elevated review priority above ordinary opportunity checks |
| ACPI-009 | Effectively dead | no balance/value routes and long review cadence or do-not-review |
| ACPI-010 | Conflicting evidence | derived state exposes uncertainty rather than silently choosing one observation |

## Fixture rules

- No real bookmaker login data, screenshots, payment details or KYC data.
- Bet-slip tests are observations only and do not create sportsbook bets.
- Actual placed rows, where linked later, remain canonical P&L source.
- `NotChecked`, `Unavailable` and `InsufficientTooling` are distinct and must not collapse into one state.
