# Fixture Spec: Founder Profile Onboarding and Operational Migration

_Last updated: 2026-08-27_

## Contract covered

- `docs/workflows/founder-profile-onboarding-and-operational-migration-workflow-contract.md`

## Fixture safety

Use synthetic profile names, catalogue accounts, balances, workbook headings and row values only.
Never add an operational workbook, copied row, real identity, URL, account number or credential.

| ID | Scenario | Expected result |
|---|---|---|
| FOM-001 | Founder creates profile with required always-on modules | Sportsbook, Free Bets and Cash Adjustments enabled; audit entry created |
| FOM-002 | Founder disables Casino and Extra Place | Those new-entry routes are unavailable only for that profile |
| FOM-003 | Founder sets Extra Place weekly loss budget | Explicit budget persists only when Extra Place is enabled |
| FOM-004 | Founder links active catalogue bookmaker with opening balance | Account is profile-scoped and eligible for permitted ledgers |
| FOM-005 | Founder attempts to link blocked catalogue account | Review explains restriction; account cannot be selected for incompatible entry |
| FOM-006 | One profile changes a loadout override | Global template and another profile remain unchanged |
| FOM-007 | Import dry run without verified backup | Blocked with an actionable requirement |
| FOM-008 | Synthetic mapped workbook has unknown column | Column remains visible in review and is not silently discarded |
| FOM-009 | Source/destination row count mismatch | Reconciliation fails; no final import write |
| FOM-010 | Financial control total mismatch | Reconciliation fails with ledger-level variance |
| FOM-011 | Unauthenticated hosted request | Protected profile/import endpoint is denied |
| FOM-012 | Authenticated owner requests another owner's profile | Denied without leaking profile data |
