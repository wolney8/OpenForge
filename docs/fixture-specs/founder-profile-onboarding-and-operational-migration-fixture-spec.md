# Fixture Spec: Profile Onboarding and Founder Operational Migration

_Last updated: 2026-08-28_

## Contract covered

- `docs/workflows/founder-profile-onboarding-and-operational-migration-workflow-contract.md`

## Fixture safety

Use synthetic profile names, catalogue accounts, balances, workbook headings and row values only.
Never add an operational workbook, copied row, real identity, URL, account number or credential.

| ID | Scenario | Expected result |
|---|---|---|
| FOM-001 | Fund Manager creates a Profile with required always-on modules | Sportsbook, Free Bets and Cash Adjustments enabled; audit entry created |
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
| FOM-013 | Founder selects an unknown or inactive global Quick Action | Creation is rejected and no partial Profile is written |
| FOM-014 | Founder selects an optional Quick Action for a disabled module | Review rejects the action; required actions remain inherited only for eligible modules |
| FOM-015 | Founder creates a Profile with a selected main bank and opening balances | Catalogue identities and Profile-owned values persist atomically; cash snapshot equals included opening balances |
| FOM-016 | Fund Manager repeats onboarding for a second Profile | A separate Profile is created with isolated settings/accounts; no first-Profile state is reused |
| FOM-017 | Workbook account name resolves to a catalogue alias | Profile account state is staged against the stable catalogue ID; no global provider is created |
| FOM-018 | Workbook includes active/restricted account state plus ledger rows | Dry run reports Profile account state and per-ledger row counts before any write |
