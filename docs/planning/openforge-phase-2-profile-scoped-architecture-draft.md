# OpenForge Phase 2 — Profile-Scoped Architecture Draft

_Last updated: 2026-06-30_

## Status

Phase:

- `M2 - Profile-Scoped Architecture`

Related GitHub issue intent:

- draft profile-scoped schema and route architecture
- keep profile isolation explicit before app implementation

Approval status:

- planning draft only
- profile-function decisions approved so far are reflected here
- any new profile-function change beyond this approved baseline still requires review first

## Purpose

This document turns the approved OpenForge direction into a draft architecture for:

- local-first login
- profile list and selection
- selected-profile tracker routing
- profile-scoped data isolation
- aggregate profile metrics
- schema boundaries for tracker data

This is not implementation and not final approval for profile semantics.

It also assumes that workbook sheets do not need to map one-to-one to web pages, as long as workbook behaviour remains preserved.

## Explicit profile understanding

The `profiles` function in OpenForge is not a cosmetic foldering feature.

The current intended meaning is:

- one Fund Manager/operator uses the application
- the operator manages many subscriber profiles
- each profile is a separate operational tracker context
- each profile has isolated accounts, bets, balances, reports, and notes
- the profile list is an aggregate control screen
- the real operational work happens inside the selected profile's tracker

This means a profile is closer to a locally scoped business ledger container than to a UI tag or filter.

It must not be implemented as:

- a loose label on reports only
- a partial filter that still shares rows under the hood
- a cosmetic dashboard grouping
- a late-added access rule after tracker tables already exist

## Approved architectural baseline

Already approved or already stated in project docs:

- first route shape is `Login -> Profiles -> Tracker`
- one local operator account is acceptable for MVP
- profile isolation must still be real in MVP
- each profile-owned table needs `profile_id`
- tracker-first scope remains mandatory
- `SignupUsers` is excluded

## Route model draft

Required route set remains:

- `/login`
- `/profiles`
- `/profiles/new`
- `/profiles/:profileId`
- `/profiles/:profileId/tracker`
- `/profiles/:profileId/tracker/dashboard`
- `/profiles/:profileId/tracker/accounts`
- `/profiles/:profileId/tracker/sportsbook-bets`
- `/profiles/:profileId/tracker/free-bets`
- `/profiles/:profileId/tracker/casino-offers`
- `/profiles/:profileId/tracker/cash-adjustments`
- `/profiles/:profileId/tracker/reports`
- `/profiles/:profileId/tracker/profit-tracker`

Route responsibilities:

| Route | Purpose | Notes |
|---|---|---|
| `/login` | local operator login | no hosted SaaS auth in MVP |
| `/profiles` | profile overview, selection, and combined analytics | aggregate and drilldown reporting only, no mixed operational editing |
| `/profiles/new` | add profile | safe metadata only |
| `/profiles/:profileId` | profile summary landing | optional summary before tracker |
| `/profiles/:profileId/tracker/*` | profile-scoped tracker workspace | primary operational surface |

Note:

- route names can stay stable even if workbook `Dashboard` and `Profit Tracker` concepts merge into a single richer dashboard/tooling surface in the web UI

## Platform model draft

### Operator / Fund Manager

MVP baseline:

- single local operator login
- no public sign-up
- no multi-user permission matrix yet

Responsibilities:

- create profiles
- archive profiles
- select a profile
- view aggregate metrics across profiles

### Profile

A profile is a separately tracked betting entity with:

- distinct starting bankroll context
- distinct account set
- distinct sportsbook/free-bet/casino/cash-adjustment history
- distinct reports and balances
- distinct notes and audit trail

Profile-scoped data must not leak into other profiles.

Within each selected profile, the future web UI should likely expose:

- profit and operational metrics
- tooling and controls
- tracker settings context

rather than blindly reproducing workbook page splits.

## Data isolation rules

Mandatory rules:

1. Every profile-owned row stores `profile_id`.
2. Every tracker query filters by `profile_id`.
3. Every write path must derive target scope from the selected route/profile context.
4. Aggregate profile metrics must be derived from profile-scoped records, not hand-entered totals.
5. Cross-profile views may aggregate metrics, but must not merge operational rows into a shared tracker table view without explicit profile context.
6. Import jobs must require a target profile.
7. Audit rows for tracker calculations should also carry `profile_id`.

## Profile overview metrics draft

The `/profiles` screen should remain an aggregate control screen.

Draft headline metrics per profile:

- `display_name`
- `status`
- `tracking_start_date`
- `gross_profit`
- `total_deductions`
- `total_top_ups`
- `net_earnings`
- `current_cash_snapshot`
- `current_operational_balances`
- `open_position_count`
- `overdue_count`
- `expiring_free_bet_count`
- `last_activity_at`
- `management_fee`
- `investment_fee`

These are draft derived metrics, not necessarily persisted columns.

Approved MVP combined analytics direction for `/profiles`:

- headline metrics per profile
- combined weekly, monthly, and selected-range summaries
- profile breakdowns
- category/module breakdowns
- bookmaker breakdowns where workbook-derived source rows support safe aggregation
- open positions, overdue items, expiring free bets, and exposure/liability summaries

Restriction:

- combined cross-profile views must remain aggregate/drilldown reporting surfaces
- they must not become mixed profile row-entry or row-editing screens

## Schema draft

### Platform tables

#### `fund_managers`

Purpose:

- local operator identity

Draft fields:

- `fund_manager_id`
- `email`
- `password_hash`
- `display_name`
- `status`
- `created_at`
- `updated_at`

#### `profiles`

Purpose:

- top-level profile/subscriber container

Draft fields:

- `profile_id`
- `fund_manager_id`
- `display_name`
- `profile_code`
- `email`
- `phone`
- `status`
- `tracking_start_date`
- `starting_bankroll`
- `carry_over_bankroll`
- `notes`
- `management_fee_percent`
- `investment_fee_percent`
- `created_at`
- `updated_at`
- `archived_at`

Derived-only at first, not stored unless needed:

- `gross_profit`
- `total_deductions`
- `net_earnings`
- `current_cash_snapshot`
- `open_position_count`
- `overdue_count`
- `expiring_free_bet_count`

### Profile-owned tracker tables

All of the following must include `profile_id`.

#### `accounts`

Source mapping:

- workbook `Accounts`

Draft fields:

- app row id
- `profile_id`
- workbook/source legacy id if needed
- account name
- account type
- counts-in-cash flag
- channel
- status
- current balance
- pending withdrawal amount
- last balance update
- last promo/activity reference
- group
- platform
- risk team
- sign-up date
- notes
- created_at
- updated_at

#### `sportsbook_bets`

Source mapping:

- workbook `Sportsbook Bets`

Design rule:

- keep mug-bet and no-lay behaviour inside this table for parity
- do not split a separate `mug_bets` table unless later approved after workflow review

Draft fields:

- app row id
- `profile_id`
- source/workbook id
- settling date
- event name
- market
- offer text
- bookmaker
- offer type
- bet type
- offer name
- fixture type
- status
- result
- back stake
- back odds
- match strategy
- exchange
- lay actual
- lay matched stake 1
- lay odds / stakes / commission / liabilities for lay branches
- match rating
- scenario pnl fields
- calc net pnl
- final net pnl override
- resolved net pnl
- lay status
- counts-as-open
- is-overdue
- date-range tag
- week label
- related free-bet id
- offer group id
- user notes
- created_at
- updated_at

#### `free_bets`

Source mapping:

- workbook `Free Bets`

Draft fields:

- app row id
- `profile_id`
- source/workbook id
- settling date
- expiry date/time
- event name
- offer text
- bookmaker
- offer type
- bet type
- offer name
- fixture type
- status
- result
- retention mode
- free-bet value
- back odds
- match strategy
- exchange
- lay actual
- lay matched stake
- lay stake
- liability
- scenario pnl fields
- calc net pnl
- final net pnl override
- resolved net pnl
- lay status
- counts-as-open
- is-overdue
- date-range tag
- week label
- origin qual bet id
- offer group id
- user notes
- created_at
- updated_at

#### `casino_offers`

Source mapping:

- workbook `Casino Offers`

Draft fields:

- app row id
- `profile_id`
- source/workbook id
- offer group id
- date started
- date settling
- expiry date/time
- bookmaker
- offer type
- offer name
- game
- cash stake
- credit amount
- bonus amount
- wager multiplier
- wager target
- required spins
- spin stake
- free spins awarded
- free spins value
- status
- result
- calc net pnl
- final net pnl override
- resolved net pnl
- counts-as-open
- is-overdue
- date-range tag
- week label
- user notes
- created_at
- updated_at

#### `cash_adjustments`

Source mapping:

- workbook `Cash Adjustments`

Draft fields:

- app row id
- `profile_id`
- source/workbook id
- adjustment date
- direction
- amount
- adjustment type
- affects investment
- affects cash snapshot
- linked account
- description
- signed amount
- date-range tag
- week label
- created_at
- updated_at

#### `balance_snapshots`

Purpose:

- later audit/reporting support for profile-level balance state

Draft fields:

- `balance_snapshot_id`
- `profile_id`
- snapshot date/time
- snapshot type
- account id nullable
- balance amount
- notes
- created_at

### Support and audit tables

#### `profile_settings`

Purpose:

- per-profile tracker defaults and alert settings

Draft fields:

- `profile_settings_id`
- `profile_id`
- default date preset
- free-bet expiry alert window days
- main bank account label or reference
- created_at
- updated_at

Planning note:

- workbook `Settings` is a global source sheet, but OpenForge may need both:
  - controlled global list/config definitions
  - profile-level settings/tooling preferences

Those should not be confused with each other.

#### `system_settings`

Purpose:

- app-level list/config definitions derived from workbook `Settings` and later approved application settings

Draft fields:

- `system_settings_id`
- config key
- config value
- config type
- created_at
- updated_at

Planning note:

- this is not final schema approval
- it exists here to reflect the importance of workbook `Settings` as a cross-cutting source of truth

#### `calculation_audit`

Purpose:

- record formula context for important money logic

Draft fields:

- `calculation_audit_id`
- `profile_id`
- entity type
- entity id
- calculation name
- contract version
- input snapshot json
- output snapshot json
- manual override value
- manual override reason
- created_at
- created_by

#### `import_batches`

Purpose:

- profile-scoped import tracking

Draft fields:

- `import_batch_id`
- `profile_id`
- source filename
- source type
- mapping version
- status
- row count
- error count
- started_at
- completed_at

## API scoping rules draft

Every future application route or repository method that touches tracker data should follow:

- load selected profile context
- verify profile belongs to current operator
- apply `profile_id` filter
- reject writes that omit or mismatch selected profile

Draft endpoint families:

- auth/session endpoints
- profile list and profile CRUD endpoints
- profile metrics endpoints
- profile tracker module endpoints
- profile import/export endpoints

## Testing plan for profile isolation

Required future tests:

- profile A cannot read profile B accounts
- profile A cannot read profile B sportsbook rows
- profile A cannot read profile B free bets
- profile A cannot read profile B casino rows
- profile A cannot read profile B cash adjustments
- aggregate profile list metrics match scoped ledger sums
- profile switching in UI does not retain stale rows

## Decisions intentionally deferred for approval

The following are not being silently decided here:

1. Whether profile-level settings should include financial defaults beyond workbook-style date/alert settings
2. Exact non-action wording and UI treatment for account-health states beneath the mug-bet threshold
3. Whether workbook `Dashboard` and `Profit Tracker` should remain separate web routes or merge into a combined dashboard/tooling experience

These remain `To confirm`.
