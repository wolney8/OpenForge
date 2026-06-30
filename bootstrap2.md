**Bootstrap 2 — OpenForge Tracker Build Plan
Prompt**

You are Codex working inside the local OpenForge
workspace.

Your first task is not to code.

Your task is to create a comprehensive build plan for
OpenForge based on the current project files and uploaded spreadsheet
blueprint.

Do not modify files.
Do not write source code.
Do not create the app scaffold yet.
Do not build the later OddsForge odds-matching module.

Read first:

- `AGENTS.md`
- `docs/codex/task-cadence.md`
- `docs/codex/financial-safety-rules.md`
- `docs/codex/data-safety-rules.md`
- `docs/codex/definition-of-done.md`
- `docs/codex/workbook-deconstruction-plan.md`
- `docs/templates/calculation-contract.md`
- `docs/templates/calculation-contract-profile-scoped-cash-first.md`
- `docs/templates/workflow-contract.md`
- `docs/planning/openforge-discovery-plan-part-1-profile-scoped.md`
- `docs/planning/openforge-delivery-risks-research-part-2-profile-scoped.md`
- any uploaded workbook or workbook-derived schema files available locally

Required current source pack:

Tracker/workbook files:

- `_input/WO_MB_Tracker_May2026.xlsx`
- `_input/TRACKER_CURRENT_STATE_FROM_WO_MB_TRACKER_MAY2026.md`
- `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- `_input/FIRST_PASS_SCHEMA_REVISED_TRACKER_ONLY_MAY2026.md`
- `_input/TRACKER_FORMULA_APPENDIX_MAY2026.md`

Profile-scoped planning files:

- `docs/planning/openforge-discovery-plan-part-1-profile-scoped.md`
- `docs/planning/openforge-delivery-risks-research-part-2-profile-scoped.md`

Profile-scoped template files:

- `docs/templates/calculation-contract-profile-scoped-cash-first.md`

If these files are missing, report them as missing.

If older reference files exist, treat them as archive material only unless explicitly instructed otherwise.

If older references conflict with the current profile-scoped OpenForge source pack, the current profile-scoped OpenForge source pack wins.

**Project direction**

OpenForge is a local-first web application and
database-backed reconstruction of the existing matched betting
spreadsheet/tracker.

The spreadsheet is the architectural blueprint.

The first product route is:

Login → Profiles → Tracker

The first real product surface is Tracker.

Profiles can be a placeholder/local profile area for
later.

The Tracker must preserve and improve:

- dashboard workflow
- accounts
- manual balances
- sportsbook / qualifying bets
- free bets
- casino offers
- mug bets
- cash adjustments
- deductions
- top-ups
- withdrawals
- free bet expiry tracking
- open bet tracking
- overdue bet tracking
- exchange liability / exposure
- profit tracker
- reports
- weekly reporting
- monthly reporting
- date-range reporting
- audit notes
- import/export from spreadsheet-shaped data



The later odds-matching/opportunity scanner product
will be called OddsForge.

Do not plan or build OddsForge yet except as a clearly
deferred later module.

Do not start with live odds.
Do not start with scraping.
Do not start with bookmaker integrations.
Do not start with hosted SaaS.
Do not overbuild production authentication before the Tracker is
understood.



Profile-scoped platform architecture



Include:



- Fund Manager login flow

- profile list flow

- add profile flow

- remove/archive profile flow

- select profile flow

- profile-scoped tracker routing

- profile-scoped database model

- aggregate profile metrics

- cross-profile comparison dashboard

- data isolation rules

- sensitive-data restrictions



Database Principle



One app.

One Fund Manager login.

Many subscriber profiles.

Each profile has its own tracker data.

Shared schema.

Strict profile_id scoping.

Comparable dashboards and reports.



**Cash-first tracker principle**

OpenForge must mirror the current spreadsheet’s
cash-first protocol.

This means the tracker is not merely copying
Outplayed-style calculator outputs.

The tracker values each row based on:

“What is this bet worth to my bankroll right
now?”

For placed/pending rows, the workbook often calculates
all relevant scenario outcomes and uses the conservative current value,
commonly through a MIN()<span class="s2"> style outcome
valuation.

This principle must be preserved in:

- calculation contracts
- database fields
- UI wording
- tests
- reports
- import/export logic



Codex must separate:

- calculator/reference values
- actual user-entered values
- projected/current value
- settled/final value
- manual override value
- notes explaining divergence



**Financial safety rules**

- no calculation without contract
- no calculation without fixture
- no user-visible financial value without tests
- no hidden assumptions
- no silent rounding
- separate projected/current values from actual
  settled/final values
- no auto-confirmation
- no sensitive data in fixtures or examples



**First response must be a plan only**

Produce:

**1. Readiness report**

Include:

- which project files exist
- which key files are missing
- whether AGENTS.md<span class="s2"> is
  adequate
- whether the workbook can be inspected
- whether the tracker-only source pack is
  present
- whether any sensitive-data risks are present



**2. Workbook deconstruction plan**

Include:

- how to inspect the spreadsheet
- how to extract sheets, headers, formulas, dropdowns,
  statuses and relationships
- how to identify user-entered fields vs calculated
  fields
- how to map cash-first formulas
- what output docs should be generated
- how to avoid leaking sensitive data



**3. Spreadsheet-to-web module map**

Map:

- Login
- Profiles/Subsribers
- Dashboard
- Accounts
- Sportsbook Bets / Qualifying Bets
- Free Bets
- Casino Offers
- Mug Bets
- Cash Adjustments
- Profit Tracker
- Reports
- Settings



**4. Proposed local-first architecture**

Include:

- frontend
- backend
- database
- profiles/subscribers
- calculation engine
- import/export
- tests
- Playwright
- future OddsForge boundary



**5. Proposed database schema**

Include tables or equivalent models for:

- users/operator login
- profiles
- accounts
- sportsbook_bets
- free_bets
- casino_offers
- mug_bets
- cash_adjustments
- settings
- balance_snapshots
- reports/report views
- calculation_audit
- import_batches



**6. Proposed calculation engine structure**

Include:

- sportsbook current-value calculation
- qualifying bet calculations
- free bet calculations
- SNR/SR distinction
- underlay
- overlay
- custom lay
- partial lay
- no-lay / mug bet mode
- casino P&L
- dashboard/report calculations
- liability/exposure calculations
- cash-first current-value scenario calculations
- later/deferred advanced modes if needed



**7. Tracker workflows**

Include:

- login
- profile/subscriber dashboard
- review general platform settings
- choose profile
- daily dashboard review
- entering a sportsbook bet
- qualifying-to-free-bet transition
- entering a free bet
- settling a bet
- updating account balances
- requesting withdrawal
- marking withdrawal received
- entering casino offer
- entering cash adjustment
- reviewing reports
- reviewing profit tracker





**8. Reporting model**

Include:

- per-profile reports
- overall/combined reports
- settled-date default
- current-value/open-position reporting
- date presets
- weekly summaries
- monthly summaries
- selected range summaries
- category P&L
- bookmaker P&L
- exposure
- overdue counts
- expiring free bets
- cash adjustments
- balance snapshots



**9. Testing strategy**

Include:

- unit tests
- calculation fixtures
- cash-first current-value fixtures
- import/export tests
- API tests
- Playwright tests
- regression tests against synthetic spreadsheet
  examples



**10. Implementation phases**

Include:

- Phase 0: project file readiness and source-pack
  audit
- Phase 1: workbook deconstruction
- Phase 2: schema and calculation contracts
- Phase 3: calculation fixtures and pure calculation
  engine
- Phase 4: app scaffold with Login → Profiles → Tracker
  shell
- Phase 5: Tracker MVP
- Phase 6: reporting parity
- Phase 7: import/export
- Phase 8: deferred OddsForge boundary only



**11. First five safe coding tasks**

These must be small, local and reviewable.

Prefer tasks such as:

- create workbook blueprint docs
- create database schema draft
- create calculation contract for sportsbook
  current-value calculation
- create synthetic fixtures
- implement first pure calculation with tests



**12. Contradictions and dangerous assumptions**

Identify anything in the original prompt or source
files that is unsafe, ambiguous, over-scoped or inconsistent with the
tracker-first direction.

Stop after the plan.
Wait for human approval before implementation.
