# OpenForge — Profile-Scoped Tracker Discovery & Build Plan

_Last updated: 2026-06-29_


## 0. Status of this document

This document is **tracker-first** and **OpenForge-first**.

- **OpenForge** = the profile-scoped matched betting tracker web application.
- **OddsForge** = the later odds-matching/opportunity-scanning module.
- OddsForge is deliberately deferred.
- The spreadsheet/tracker is the architectural blueprint for OpenForge.

The first build target is:

```text
Fund Manager Login → Subscriber/Profile List → Selected Profile Tracker
```

## 1. High-level product model

OpenForge is a local-first web application for a Fund Manager/operator who manages multiple subscriber/profile trackers.

The Fund Manager logs into a Centralized Master Dashboard that serves as a parent interface for all betting operations. Within this master view, the manager oversees multiple Operational Entities, referred to in documentation as 'Subscribers' or 'Profiles.' Each Entity represents a distinct logical container with its own isolated data silo, including specific bookmaker connections, active free bets, and dedicated profit/loss calculations. When the Manager selects an individual Entity from the master roster, the system dynamically loads a dedicated instance of the OddsForge Tracker that mirrors all standard features—such as calculators, dashboards, and account lists—but populates them exclusively with data for that specific Entity without cross-contamination. This architecture functions similarly to a Learning Management System where one user navigates between different subject modules; while the interface layout remains consistent, each selected module maintains its own unique progress state and financial context, allowing seamless switching between managed portfolios.

Each profile behaves like a separate clone of the existing spreadsheet/tracker, representing a distinct operational context with its own metrics derived from percentage-based revenue sharing:

- separate accounts
- separate bookmaker sign-up state
- separate exchange account state
- separate sportsbook / qualifying bets
- separate free bets
- separate casino offers
- separate mug bets
- separate cash adjustments
- separate deductions/top-ups/withdrawals
- separate dashboard
- separate profit tracker
- separate reports
- separate audit notes
- separate balance snapshots

The structure is shared, but the data is profile-scoped.

## 2. Product route and navigation

Required initial application route model:

```text
/login
/profiles
/profiles/new
/profiles/:profileId
/profiles/:profileId/tracker
/profiles/:profileId/tracker/dashboard
/profiles/:profileId/tracker/accounts
/profiles/:profileId/tracker/sportsbook-bets
/profiles/:profileId/tracker/free-bets
/profiles/:profileId/tracker/casino-offers
/profiles/:profileId/tracker/cash-adjustments
/profiles/:profileId/tracker/reports
/profiles/:profileId/tracker/profit-tracker
```

MVP route priority:

1. `/login`
2. `/profiles`
3. `/profiles/:profileId/tracker/dashboard`

## 3. User personas

## 3.1 Fund Manager / Operator

The Fund Manager is the primary user of the system.

The Fund Manager can:

- log in locally
- view subscriber/profile list
- add a profile
- edit profile metadata
- archive/remove a profile
- select a profile
- open the profile-specific tracker
- compare profiles by total profit, deductions, net earnings and active risk indicators

The Fund Manager does **not** need production SaaS auth in the first build.

## 3.2 Subscriber / Profile

A profile represents the person/account holder whose tracker data is being managed.

For MVP, this should be a safe local profile record.

A profile can have:

- display name
- display email
- contact address
- contact telephone number
- profile code
- status
- tracking start date
- starting bankroll
- carry-over bankroll
- notes
- derived profit metrics
- derived active-position metrics
- management fee percentage
- investment fee percentage

A profile must **not** store:

- biometric data
- full card numbers
- bank login credentials
- bookmaker passwords
- exchange passwords
- MFA secrets
- session cookies

## 4. Profile overview dashboard

The `/profiles` screen must show comparable headline metrics per profile:

- profile display name
- profile status
- profile display email
- profile contact address
- profile contact telephone number
- tracking start date
- gross profit
- total deductions
- total top-ups
- net earnings
- current cash snapshot
- current operational balances
- open position count
- overdue count
- expiring free-bet count
- last activity date
- management fee percentage
- investment fee percentage

The profile overview is an aggregate control screen. It must not replace the profile-specific tracker.

## 5. Tracker scope per profile

Each profile's tracker must mirror and improve the current spreadsheet/tracker.

Core modules:

1. Dashboard
2. Accounts
3. Sportsbook Bets / Qualifying Bets
4. Free Bets
5. Casino Offers
6. Mug Bets
7. Cash Adjustments
8. Reports
9. Profit Tracker
10. Settings

Each profile-owned record must be scoped by `profile_id`.

## 6. Spreadsheet-as-blueprint rule

The uploaded/current tracker workbook is the architectural blueprint.

OpenForge must preserve:

- current sheet roles
- current workflow order
- current status logic
- current formulas and calculated fields
- current manual-first balance behaviour
- current cash-first calculation protocol
- current reporting concepts
- current dashboard concepts
- current date-range and week-label reporting
- current audit/note practices where useful

The web application may improve UX and structure, but it must not replace the tracker with a generic CRUD app.

## 7. Cash-first calculation principle

The tracker is not simply copying Outplayed-style calculator results.

The tracker asks:

```text
What is this row worth to the bankroll right now?
```

This means OpenForge must preserve the cash-first/current-value model:

- placed/pending rows can show current value before final settlement
- scenario outcomes must be calculated
- conservative current value may use a `MIN()`-style outcome selection
- actual/final values must remain separate from projected/current values
- manual override values must be auditable
- settlement-date reporting remains the default for realised P&L

Required value separation:

- calculator/reference stake
- actual/user-entered stake
- calculated liability
- actual liability
- projected/current P&L
- final/settled P&L
- manual override reason
- audit notes

## 8. Tracker-first UI direction

First visible functional UI is not the Odds Matcher.

The first visible functional UI is:

```text
Profiles → Selected Profile Tracker Dashboard
```

Recommended tracker layout for a selected profile:

- Top bar: selected profile, current cash snapshot, open exposure, expiring free bets.
- Left navigation:
  - Dashboard
  - Accounts
  - Sportsbook Bets
  - Free Bets
  - Casino Offers
  - Mug Bets
  - Cash Adjustments
  - Reports
  - Profit Tracker
  - Settings
- Main workspace:
  - current tracker view
- Right/detail drawer:
  - row audit
  - scenario outcomes
  - calculation explanation
  - linked records

## 9. Core service separation for OpenForge

## 9.1 Profile Service

Responsibilities:

- fund manager login context
- profile list
- profile creation
- profile archive/removal
- profile metadata
- profile aggregate metrics
- profile-scoped data isolation

## 9.2 Tracker Service

Responsibilities:

- profile-specific dashboard data
- sportsbook bet workflows
- free bet workflows
- casino workflows
- mug bet workflows
- cash adjustments
- balance updates
- withdrawals
- reporting data

## 9.3 Calculation Engine

Pure deterministic package.

Must support tracker-first calculations before advanced OddsForge calculations:

- sportsbook current-value calculation
- qualifying bet calculations
- free bet SNR/SR calculations
- underlay/overlay/custom lay
- liability and exposure
- cash-first current-value scenario selection
- casino P&L
- report calculations

Later/deferred:

- multi-lay
- acca/sequential lay
- bet builder
- BOG
- refund/cashback
- odds matcher strategy calculations

## 9.4 Reporting Service

Responsibilities:

- selected date range
- settled-date reporting
- current-value open-position reporting
- profile-level summaries
- cross-profile comparison summaries
- category P&L
- bookmaker P&L
- deductions/top-ups
- open/overdue counts
- free-bet expiry reports
- exchange liability/exposure

## 9.5 Import/Export Service

Responsibilities:

- import spreadsheet-shaped CSV/JSON data
- export tracker data
- preserve synthetic/test fixtures
- protect sensitive data
- track import batches
- map workbook fields to database fields

## 10. Recommended database model

Minimum tables:

- `fund_managers`
- `profiles`
- `accounts`
- `sportsbook_bets`
- `free_bets`
- `casino_offers`
- `mug_bets`
- `cash_adjustments`
- `balance_snapshots`
- `settings`
- `calculation_audit`
- `import_batches`

Profile-owned tables must include `profile_id`, including:

- `accounts`
- `sportsbook_bets`
- `free_bets`
- `casino_offers`
- `mug_bets`
- `cash_adjustments`
- `balance_snapshots`
- `settings`
- `calculation_audit`
- `import_batches`
- `management_fee`
- `investment_fee`

## 11. Security and safety boundaries

OpenForge must not implement:

- bookmaker bet placement
- bookmaker auto-confirm
- automated bookmaker sign-up
- live scraping
- identity document storage
- biometric storage
- full bank/card storage
- password vault behaviour
- session cookie storage
- MFA secret storage
- public SaaS onboarding

All examples, fixtures and seed data must be synthetic.

## 12. Deferred OddsForge module

OddsForge is the later module for odds matching and opportunity discovery.

Deferred capabilities:

- odds matcher table
- sample odds first
- odds source adapters
- odds normalisation
- market matching
- multi-lay opportunity scanner
- automated opportunity ranking
- public/API data sources
- scraping only after explicit approval

OpenForge must leave a future boundary for this module, but not build it first.

## 13. Immediate recommended steps

1. Confirm source pack exists in `_input/`.
2. Generate/validate `AGENTS.md` and Codex guardrails.
3. Deconstruct workbook into:
   - `docs/workbook-blueprint.md`
   - `docs/workbook-field-map.md`
   - `docs/workbook-formula-map.md`
   - `docs/workbook-workflow-map.md`
   - `docs/workbook-cash-first-calculation-map.md`
4. Design profile-scoped database schema.
5. Create calculation contracts for sportsbook current-value and free-bet current-value.
6. Create synthetic fixtures.
7. Build minimal app shell:
   - login
   - profiles
   - selected profile tracker dashboard
8. Add tracker modules one at a time.

## 14. First MVP definition

The first MVP is successful when the Fund Manager can:

- log in locally
- see profile list
- add a profile
- select a profile
- open that profile's tracker dashboard
- create/edit profile-specific accounts
- enter profile-specific sportsbook bets
- enter profile-specific free bets
- enter profile-specific casino offers
- enter profile-specific cash adjustments
- see dashboard metrics update for that profile
- compare profile totals on the profile list
- verify calculations against synthetic spreadsheet-derived fixtures

## 15. Notes for Codex

Codex must work in small steps.

No coding should begin until the build plan has explicitly handled:

- profile isolation
- tracker-first priority
- cash-first calculations
- source-pack audit
- sensitive data rules
- calculation contracts
- fixture strategy
- test strategy
