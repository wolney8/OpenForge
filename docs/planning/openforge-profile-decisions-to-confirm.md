# OpenForge Profile Decisions To Confirm

_Last updated: 2026-06-30_

## Purpose

This document lists profile-related decisions that must be reviewed with the user before they are treated as approved architecture.

This keeps Phase 2 aligned with:

- `M2 - Profile-Scoped Architecture`
- the GitHub milestone and issues already created
- the explicit instruction that profile-function decisions must be run by the user first

## Current understanding of the profiles function

Profiles (or 'Subscribers', 'Operational Entities') are intended to represent separate operational betting entities, representing a distinct logical container with its own isolated data silo, managed by a Fund Manager/operator.

Each profile must have:

- isolated tracker (OddsForge Tracker) data
- isolated balances
- isolated sportsbook/free-bet/casino/cash-adjustment history
- isolated reports and notes

The `/profiles` screen is a 'master roster' or control surface for reviewing metrics, modifying settings, selecting and comparing profiles. It is not a replacement for the selected profile's tracker. Selecting a profile dynamically loads a dedicated instance of the OddsForge Tracker that mirrors all standard features.

## Approval-gated decisions

### 1. Profile record shape

Approved for MVP:

- `display_name`
- `profile_code`
- `contact_email`
- `contact_phone`
- `contact address`
- `registered_accounts_email`
- `status`
- `tracking_start_date`
- `starting_bankroll`
- `notes`
- `management_fee`
- `investment_fee`

Not included in MVP:

- additional contact-person fields

### 2. Profile fee modelling

Approved for MVP:

- store `management_fee`
- store `investment_fee`
- treat both as percentage-point values
- use them in derived reporting planning

Working interpretation:

- `40.00` means `40%`
- not decimal-ratio storage
- not basis-point storage

### 3. Profile overview metrics

Approved minimum profile overview scope:

- gross profit
- total deductions
- total top-ups
- net earnings
- current cash snapshot
- current operational balances
- open position count
- overdue count
- expiring free-bet count
- last activity

Expanded MVP direction:

- `/profiles` for fund managers must support combined cross-profile analytics, not just a simple headline roster
- combined cross-profile views may include date-based, category-based, bookmaker-based, and profile-based aggregate drilldowns
- detailed row-level operational work still remains inside the selected profile tracker

### 4. Mug bets treatment

Approved default:

- keep mug bets inside `sportsbook_bets`
- expose mug bets as a filtered view in the UI if needed
- mug bets are known for 'account health' 

### 5. Cross-profile reporting

Approved direction:

- `/profiles` remains the aggregate control and combined-analytics surface
- MVP planning should include combined cross-profile reporting
- combined analytics may include full MVP aggregate drilldown coverage
- cross-profile views must not become mixed operational row-entry/edit surfaces
- The most important metric for `/profiles` will be the Fund Manager's view of management fee and investment fee earnings from each profile in local rounded currency

### 6. Archive vs delete behaviour

Approved default:

- support archive first
- avoid hard delete in normal UI flow

### 7. Profile settings scope

Current draft:

- per-profile date preset defaults
- free-bet expiry alert window
- main bank-account reference

To confirm:

- do you want profile-level tracker settings in MVP at all? [Yes]
- or should all defaults stay global until tracker parity is achieved?

## Safe defaults until confirmed

Until you approve otherwise, the planning assumption should remain:

1. one local operator
2. many profiles
3. archive rather than hard delete
4. mug bets remain inside sportsbook ledger
5. `/profiles` supports combined cross-profile analytics
6. fee fields are percentage-point values used in derived reporting planning
7. no postal address fields in MVP
8. no additional contact-person fields in MVP

## Next approval boundary

Before implementation or final schema locking, the following need your explicit sign-off:

- archive/delete semantics
- mug-bet treatment in the UI
- first-release profile-level settings scope
- exact non-action wording for account-health states beneath the mug-bet threshold
