# OpenForge — Delivery, Risks, Research & Implementation Plan

_Last updated: 2026-06-29_

## 0. Status of this document

OpenForge is the first application.

OddsForge is a deferred future module.

The first application must be:

```text
Fund Manager Login → Subscriber/Profile List → Selected Profile Tracker
```

The first deliverable is the profile-scoped tracker that mirrors the spreadsheet workflow.

## 1. Core risks

## 1.1 Profile isolation risk

Every profile must have isolated tracker data.

Risk:
- a bet, account, cash adjustment or report could appear under the wrong profile
- aggregate Fund Manager metrics could double-count profile data
- imports could attach records to the wrong profile

Mitigation:
- every profile-owned table must include `profile_id`
- every API route must enforce profile scoping
- every database query must filter by `profile_id`
- tests must prove profile A cannot see profile B data
- Playwright tests must cover profile switching

## 1.2 Financial calculation risk

Incorrect math means real losses.

Mitigation:
- calculation contracts before implementation
- deterministic fixtures before user-visible financial values
- tests for every calculation mode
- visible assumptions and rounding
- profile-scoped calculation audit records
- cash-first current-value rules preserved from the spreadsheet

## 1.3 Cash-first protocol risk

The web app must not flatten the tracker into generic matched-betting calculators.

Risk:
- Codex may implement Outplayed-style even-profit calculator outputs only
- pending rows may appear blank until settlement
- current bankroll value may be misleading

Mitigation:
- calculation contracts must include current-value behaviour
- open rows must show projected/current value
- scenario outcomes must be stored or reproducible
- final settled values must remain separate from current/projected values
- tests must include open/pending rows and settled rows

## 1.4 Sensitive data risk

Profiles can easily drift into unsafe operational context storage.

Do not store:

- bookmaker passwords
- exchange passwords
- bank login credentials
- full card numbers
- MFA secrets
- session cookies

Use synthetic examples only.

## 1.5 Scope risk

The old plan started with odds matching and scraping.

Current decision:
- Tracker first.
- OddsForge later.
- No live odds.
- No scraping.
- No bookmaker automation.
- No production SaaS auth before tracker logic works.

## 2. Codex workflow

This build uses VS Code + Codex, not the expensive full multi-agent workflow.

Codex must follow a slim sequential cadence:

1. Restate the objective.
2. Identify affected files.
3. Identify financial/data/profile risks.
4. Propose a short plan.
5. Wait for approval when changing architecture, calculations, data model, profile model, auth, import/export, or risk rules.
6. Implement only the approved scope.
7. Run relevant tests.
8. Report changed files.
9. Report test results.
10. Stop for review.

## 3. Project-control files

Bootstrap 1 should create:

- `AGENTS.md`
- `docs/codex/task-cadence.md`
- `docs/codex/financial-safety-rules.md`
- `docs/codex/data-safety-rules.md`
- `docs/codex/definition-of-done.md`
- `docs/codex/workbook-deconstruction-plan.md`
- `docs/codex/bootstrap-2-build-plan-prompt.md`
- `docs/templates/calculation-contract.md`
- `docs/templates/workflow-contract.md`
- `.skills/*`
- `.gitignore`
- `data/README.md`
- `tests/fixtures/README.md`

Bootstrap 2 should produce the build plan only.

## 4. Delivery milestones

## Milestone 0 — Project cage

Goal:
Create durable AI instructions and guardrails.

Deliverables:
- `AGENTS.md`
- Codex docs
- templates
- skills
- `.gitignore`
- source-pack expectations

Exit criteria:
- Codex knows OpenForge is tracker-first
- Codex knows OddsForge is deferred
- profile/subscriber layer is explicit
- cash-first calculation protocol is explicit

## Milestone 1 — Workbook deconstruction

Goal:
Extract current tracker architecture from source pack.

Deliverables:
- `docs/workbook-blueprint.md`
- `docs/workbook-field-map.md`
- `docs/workbook-formula-map.md`
- `docs/workbook-workflow-map.md`
- `docs/workbook-cash-first-calculation-map.md`

Exit criteria:
- sheets mapped to modules
- formulas mapped to logical calculations
- current-value/cash-first behaviour captured
- user-entered vs calculated fields identified
- sensitive data avoided

## Milestone 2 — Profile-scoped architecture

Goal:
Design profile isolation before building tracker tables.

Deliverables:
- database schema draft
- route map
- profile overview metrics
- data isolation rules
- API scoping rules

Required tables:
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

Exit criteria:
- every profile-owned table includes `profile_id`
- profile list metrics are derived from profile-scoped data
- tests planned for profile isolation
- each profile is representing a distinct operational context with its own tracked bankroll, promotional status, and profit/loss metrics derived from percentage-based revenue sharing
- profiles launch a dedicated instance of the OddsForge Tracker application
- each profile view is specifically configured with that profile's unique account connections and bet history without altering the master view or other profiles

## Milestone 3 — Calculation contracts and fixtures

Goal:
Define calculations before code.

First contracts:
- sportsbook current-value calculation
- free-bet current-value calculation
- liability/exposure calculation
- cash adjustment aggregation
- dashboard selected-range P&L

Fixture rules:
- synthetic only
- no real bookmaker account data
- include open/pending examples
- include settled examples
- include manual override examples

Exit criteria:
- contracts approved
- fixtures created
- tests planned

## Milestone 4 — App shell

Goal:
Build the first route shell.

Routes:
- `/login`
- `/profiles`
- `/profiles/new`
- `/profiles/:profileId/tracker/dashboard`

Exit criteria:
- local login works
- profile list works
- add profile works
- select profile works
- tracker dashboard shell loads for selected profile
- profile ID context is visible and enforced

## Milestone 5 — Tracker MVP

Goal:
Rebuild the spreadsheet workflow in web/database form.

Modules:
- Dashboard
- Accounts
- Sportsbook Bets
- Free Bets
- Casino Offers
- Cash Adjustments
- Reports
- Profit Tracker

Exit criteria:
- profile-specific data entry works
- dashboard metrics update
- deductions/top-ups flow into reporting
- expiring free bets visible
- open/overdue positions visible
- account balances manual-first
- profit tracker produces selected range, weekly and monthly summaries

## Milestone 6 — Import/export

Goal:
Support spreadsheet-shaped import/export.

Deliverables:
- import batch model
- field mapping
- validation report
- export format
- anonymised fixture import

Exit criteria:
- imports are profile-scoped
- sensitive data not logged
- import errors are reviewable

## Milestone 7 — Deferred OddsForge boundary

Goal:
Leave an architectural seam for later odds matching.

No odds matcher implementation yet.

Deliverables:
- module boundary note
- future route placeholder only if useful
- no scraping
- no live odds

## 5. Local-first architecture

Recommended initial stack:

- Frontend: React/Next.js or Vite React + TypeScript
- Backend: FastAPI/Python or equivalent local API
- Database: SQLite first
- Tests: Python/JS unit tests depending on chosen stack
- UI tests: Playwright
- Import/export: CSV/JSON/XLSX reader used carefully
- Auth: local-only MVP auth, not production SaaS auth

## 6. Profile-scoped route model

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
/profiles/:profileId/tracker/mug-bets
/profiles/:profileId/tracker/cash-adjustments
/profiles/:profileId/tracker/reports
/profiles/:profileId/tracker/profit-tracker
/profiles/:profileId/tracker/settings
```

## 7. Fund Manager overview

The profile list must show:

- profile full name
- profile address
- profile contact number 
- profile email
- status
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
- profile management fee
- profile investment fee

## 8. Tracker reports per profile

Per profile:

- selected range P&L
- weekly P&L
- monthly P&L
- bookmaker P&L
- category P&L
- deductions/top-ups
- current exposure
- overdue positions
- expiring free bets
- current balances
- pending withdrawals
- fee deductions

Cross-profile:

- gross profit comparison
- deductions comparison
- net earnings comparison
- bankroll/cash snapshot comparison
- open risk comparison

## 9. Calculation and reporting rules

Default reporting axis:
- settled date for realised P&L

Open/current-value reporting:
- open rows use cash-first current value
- current value must not be mislabeled as settled profit

Value separation:
- reference/calculated value
- actual/user-entered value
- current/projected value
- final/settled value
- manual override reason

## 10. What is explicitly deferred

Deferred until after tracker MVP:

- odds matcher table
- live odds
- bookmaker scraping
- exchange API automation
- odds source adapters
- opportunity scanner
- AI assistant actions
- production auth
- hosted SaaS
- automated sign-up
- automated betting

## 11. First five safe coding tasks

1. Create workbook blueprint docs from source pack.
2. Create profile-scoped database schema draft.
3. Create calculation contract for sportsbook current-value.
4. Create synthetic fixtures for profile-scoped sportsbook/current-value examples.
5. Implement the first pure calculation with tests.

## 12. Stop conditions

Codex must stop and ask before:

- changing profile model
- changing auth model
- implementing financial calculations without a contract
- adding live odds
- adding scraping
- handling real sensitive data
- changing import/export safety
- committing changes
