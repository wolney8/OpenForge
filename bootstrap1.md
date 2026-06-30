**Bootstrap 1 — OpenForge Project Files Generator
Prompt**

You are Codex working inside a fresh local VS Code
workspace.

Your task is to create the project-control files for a
Codex-led build of OpenForge.

Do not build the application yet.
Do not implement source code yet.
Do not create a frontend yet.
Do not create a backend yet.
Do not create a database yet.
Do not modify the uploaded workbook.
Do not create the later OddsForge odds-matching module yet.

Your job is to create the documentation, guardrails,
templates, skills, and bootstrap files that will keep future Codex
sessions on track.

**Project name**

OpenForge

**Product direction**

OpenForge is a local-first web application and
database-backed reconstruction of the user’s current matched betting
spreadsheet/tracker.

The spreadsheet is the architectural blueprint.

The first goal is to mirror and improve the existing
tracker workflow, calculations, documentation and reporting.

The later odds-matching/opportunity-finding product
will be called OddsForge, but that is out of scope for this bootstrap.
Do not plan or build OddsForge yet except as a clearly deferred future
module.



**Platform direction — Fund Manager and Subscriber
Profiles**



OpenForge is a profile-based tracker platform.



The Fund Manager serves as the administrator for a
centralized dashboard that oversees all active betting entities,
referred to here as Subscribers or Profiles. When logged in, the manager
views a consolidated roster of these profiles, each representing a
distinct operational context with its own tracked bankroll, promotional
status, and profit/loss metrics derived from percentage-based revenue
sharing. To manage workflow, the administrator selects any individual
profile to launch a dedicated instance of the OddsForge Tracker
application; this instance replicates all standard tools—including
calculators, dashboards, and account lists—specifically configured with
that entity's unique bookmaker connections and bet history without
altering the master view. This architecture allows for seamless
switching between different betting ventures much like navigating
through separate subject modules in a learning management system,
ensuring financial isolation while maintaining a unified overview of
total earnings and deductions across all managed profiles.



The Fund Manager can:



- view all subscriber profiles

- see total profit per profile

- see total deductions per profile

- see net earnings per profile

- see current bankroll / cash snapshot per
profile

- see open positions per profile

- see overdue items per profile

- see expiring free bets per profile

- add a new subscriber profile

- archive or remove a subscriber profile

- select a subscriber profile

- open that profile’s dedicated Tracker
workspace



Each subscriber profile must have its own isolated
tracker data.



Selecting a profile opens that profile’s OpenForge
Tracker.



Each profile’s Tracker must behave like a separate
clone of the spreadsheet/tracker, including:



- profile-specific dashboard

- profile-specific accounts

- profile-specific bookmaker sign-up status

- profile-specific exchange accounts

- profile-specific sportsbook / qualifying bets

- profile-specific free bets

- profile-specific casino offers

- profile-specific mug bets

- profile-specific cash adjustments

- profile-specific deductions

- profile-specific top-ups

- profile-specific withdrawals

- profile-specific reports

- profile-specific profit tracker

- profile-specific account-health views

- profile-specific balance snapshots

- profile-specific audit notes



The tracker structure is shared, but the data is
profile-scoped.



This means every core tracker table must support
profile isolation, either by:



- including `profile_id` on every profile-owned
record, or

- using a database design that guarantees
profile-scoped data access.



Required initial route model:



- `/login`

- `/profiles`

- `/profiles/new`

- `/profiles/:profileId`

- `/profiles/:profileId/tracker`

- `/profiles/:profileId/tracker/dashboard`

- `/profiles/:profileId/tracker/accounts`

-
`/profiles/:profileId/tracker/sportsbook-bets`

- `/profiles/:profileId/tracker/free-bets`

- `/profiles/:profileId/tracker/casino-offers`

-
`/profiles/:profileId/tracker/cash-adjustments`

- `/profiles/:profileId/tracker/reports`

-
`/profiles/:profileId/tracker/profit-tracker`



MVP profile behaviour:



- The first implementation may use one local Fund
Manager account.

- The first implementation may use local/demo
authentication.

- The first implementation must still model profile
isolation properly.

- Profiles can initially be simple records with full
name, email address, status, start date, notes, management/platform fee,
investment fee and aggregate metrics.

- Do not build full SaaS billing, multi-tenant hosting,
production auth, or public sign-up yet.



Profile safety rules:



- Do not store full card numbers.

- Do not store bank login credentials.

- Do not store bookmaker passwords.

- Do not store exchange passwords.

- Do not store session cookies.

- Do not store MFA secrets.

- Use synthetic placeholder data in fixtures and
examples.



Recommended profile table fields for planning:



- `profile_id`

- `fund_manager_id`

- `display_name`

- `profile_code`

- `status`

- `tracking_start_date`

- `starting_bankroll`

- `carry_over_bankroll`

- `notes`

- `management_fee`

- `investment_fee`

- `created_at`

- `updated_at`

- derived: `gross_profit`

- derived: `total_deductions`

- derived: `net_earnings`

- derived: `current_cash_snapshot`

- derived: `open_position_count`

- derived: `overdue_count`

- derived: `expiring_free_bet_count`



Fund Manager overview must not be a replacement for
profile trackers.

It is an aggregate control screen.

The detailed operational work happens inside the
selected profile’s Tracker.



**First application route**

The first application shell should eventually follow
this route:

Login → Profiles → Tracker

MVP interpretation:

1.  Login
    - Local-first login route.
    - Suitable for one Fund Manager/operator.
    - Authentication can be simple in the first
      implementation.
    - Do not build hosted SaaS authentication
      yet.
    - Do not store real passwords in plaintext.
    - Do not implement production auth until explicitly
      approved.
2.  Profiles
    - Second level route for profile management and
      selection before continuing to a profile-specific tracker and
      data.
    - <span class="s2">Profiles contain Profile-specific tracker
      data<span class="s3">, Profile-specific
      reports<span class="s3"> and Cross-profile comparison
      reports.
    - For MVP, this may simply show one local
      demo/operator profile and a disabled “more profiles later”
      state.
3.  Tracker
    - This is the first real product surface.
    - Tracker must replicate and improve the
      spreadsheet workflow first.
    - Tracker contains dashboard, accounts, sportsbook
      bets, free bets, casino offers, cash adjustments, reports and
      profit tracker.

## Source pack

The key source files should be expected in `_input/`, `docs/planning/`, and `docs/templates/`.

Required current tracker/workbook files:

- `_input/WO_MB_Tracker_May2026.xlsx`
- `_input/TRACKER_CURRENT_STATE_FROM_WO_MB_TRACKER_MAY2026.md`
- `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- `_input/FIRST_PASS_SCHEMA_REVISED_TRACKER_ONLY_MAY2026.md`
- `_input/TRACKER_FORMULA_APPENDIX_MAY2026.md`

Required current planning files:

- `docs/planning/openforge-discovery-plan-part-1-profile-scoped.md`
- `docs/planning/openforge-delivery-risks-research-part-2-profile-scoped.md`

Required current template files:

- `docs/templates/calculation-contract-profile-scoped-cash-first.md`

These files define the current OpenForge direction.

Older files may exist in `_input/archive/`, but they must not override the current OpenForge source pack.

If older references conflict with the current profile-scoped OpenForge documents, the profile-scoped OpenForge documents win.

**OpenForge Tracker scope**

The Tracker must preserve and improve the user’s
current day-to-day matched betting workflow, including:

- login shell
- profiles placeholder
- dashboard
- accounts
- manual balances
- sportsbook / qualifying bets
- free bets
- casino offers
- cash adjustments
- deductions
- top-ups
- withdrawals
- expiry alerts
- open bet tracking
- overdue bet tracking
- exchange liability / exposure
- profit tracker
- reports
- weekly and monthly reporting
- date-range reporting
- audit notes
- spreadsheet import/export
- cash-first current-value calculations



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
commonly through a <span class="s4">MIN()
style outcome valuation.

Codex must preserve this principle.

Codex must separate:

- calculator/reference values
- actual user-entered values
- projected/current value
- settled/final value
- manual override value
- notes explaining divergence

**Safety and legality rules**

OpenForge is financially sensitive software.

Incorrect stake, liability, P&L, balance, exposure or
bankroll calculations can cause real monetary loss.

Codex must create project files that enforce:

- no calculation without a calculation contract
- no calculation without deterministic fixtures
- no user-visible financial value without tests
- no hidden assumptions
- no silent rounding
- no autonomous bookmaker bet placement
- no auto-confirming bets
- no live bookmaker scraping
- no odds-matching module yet
- no storage of real passwords
- no storage of full card numbers
- no session cookies or tokens in fixtures
- no cloud sync unless explicitly approved
- no commits without human approval

**Sensitive data rule**

The uploaded spreadsheet may contain personal,
operational or account data.

Treat it as sensitive.

Do not copy real personal data into docs, fixtures,
examples, tests or commits.

Use synthetic examples only.

Use placeholders such as:

- USER-001
- demo@example.invalid
- Bookmaker A
- Exchange A
- Demo Offer
- DEMO-CODE-001

**Project-control files to create**

Create the following files and folders.

**1.**

**AGENTS.md**

This is the main durable instruction file for
Codex.

It must include:

- project purpose
- OpenForge Tracker-first direction
- OddsForge later/deferred direction
- Login → Profiles → Tracker route priority
- local-first rule
- spreadsheet-as-blueprint rule
- cash-first tracker calculation rule
- financial safety rules
- sensitive-data rules
- no-bet-automation rule
- no-live-scraping rule
- calculation contract rule
- fixture rule
- testing rule
- Playwright rule
- small-task cadence
- approval gates
- definition of done
- file/folder conventions
- expected build/test/lint command placeholders
- instruction that Codex must stop after planning
  unless explicitly approved to code

**2.**

**docs/codex/bootstrap-2-build-plan-prompt.md**

Create the second bootstrap prompt that will be used
after these project files exist.

This second prompt must instruct Codex to:

- <span class="s5">read AGENTS.md
- inspect the project docs
- inspect the uploaded workbook if available
- read the current tracker-only source pack
- create a comprehensive build plan
- map workbook sheets to web-app modules
- propose database schema
- propose calculation engine structure
- propose Tracker MVP
- identify risks and contradictions
- produce first five safe coding tasks
- make no code changes

**3.**

**docs/codex/task-cadence.md**

Create a concise workflow cadence:

- restate objective
- identify files
- identify risks
- propose plan
- wait for approval when needed
- implement only approved scope
- run tests
- report changed files
- report test results
- stop for review

**4.**

**docs/codex/financial-safety-rules.md**

Create detailed OpenForge safety rules covering:

- calculations
- money values
- rounding
- liability
- P&L
- exposure
- bankroll
- projected/current values
- actual/final values
- cash-first current-value calculations
- no betting automation
- no hidden assumptions
- no unsafe scraping
- no sensitive data leakage

**5.**

**docs/codex/data-safety-rules.md**

Create rules for handling uploaded spreadsheets and
extracted data:

- workbook is sensitive
- examples must be synthetic
- fixtures must be anonymised
- no credentials
- no real personal data
- no full card/bank details
- no bookmaker login secrets
- no screenshots with sensitive data
- no committing raw exports unless approved

**6.**

**docs/codex/definition-of-done.md**

Create a clear definition of done for:

- documentation tasks
- schema tasks
- calculation tasks
- UI tasks
- data import tasks
- reporting tasks
- testing tasks

For financial/calculation tasks, done must
require:

- calculation contract
- fixtures
- tests
- visible assumptions
- result tolerance
- human review

**7.**

**docs/codex/workbook-deconstruction-plan.md**

Create a plan for extracting the spreadsheet
architecture.

It must cover:

- sheet inventory
- header extraction
- formula extraction
- named ranges if any
- validation/dropdown extraction
- status value extraction
- calculated vs user-entered fields
- dashboard KPI extraction
- cross-sheet relationships
- current-value/cash-first formula behaviour
- sensitive data handling
- output docs to create later:
  - docs/workbook-blueprint.md
  - docs/workbook-field-map.md
  - docs/workbook-formula-map.md
  - docs/workbook-workflow-map.md
  - docs/workbook-cash-first-calculation-map.md

**8.**

**docs/templates/calculation-contract.md**

Create a reusable template for financial calculation
contracts.

If `docs/templates/calculation-contract-profile-scoped-cash-first.md` already exists, use it as the source of truth when creating or updating `docs/templates/calculation-contract.md`.

The generated `calculation-contract.md` must preserve:
- profile scoping
- `profile_id` requirements
- cash-first current-value behaviour
- spreadsheet equivalent
- projected/current vs settled/final value separation
- manual override handling
- audit trail requirements
- profile isolation tests

It must include:

- calculation name
- purpose
- workflow context
- spreadsheet equivalent
- cash-first/current-value behaviour
- inputs
- outputs
- formula
- source/reference
- assumptions
- rounding
- commission handling
- liability handling
- projected/current value
- actual/final value
- scenario outcomes
- fixtures required
- test cases
- acceptance tolerance
- UI display requirements
- human approval

**9.**

**docs/templates/workflow-contract.md**

Create a reusable template for tracker
workflows.

It must include:

- workflow name
- user goal
- current spreadsheet equivalent
- input screens
- database tables
- status transitions
- calculations touched
- reports touched
- edge cases
- audit notes
- tests required
- Playwright path if UI-facing

**10.**

**.skills/calculation-contract-review/SKILL.md**

Create a Codex skill for reviewing calculation
contracts.

**11.**

**.skills/fixture-regression/SKILL.md**

Create a Codex skill for creating deterministic fixture
tests.

**12.**

**.skills/workbook-deconstruction/SKILL.md**

Create a Codex skill for analysing the uploaded
workbook and the tracker-only source pack.

**13.**

**.skills/tracker-workflow-review/SKILL.md**

Create a Codex skill for checking whether a web
workflow preserves the spreadsheet workflow.

**14.**

**.skills/financial-risk-review/SKILL.md**

Create a Codex skill for reviewing money-impacting
features.

**15.**

**.skills/playwright-user-flow/SKILL.md**

Create a Codex skill for UI workflow test
expectations.

**16.**

**.skills/cash-first-calculation-review/SKILL.md**

Create a Codex skill specifically for checking whether
OpenForge preserves the tracker’s cash-first current-value calculations
rather than replacing them with generic calculator behaviour.

**17.**

**docs/planning/README.md**

Create a planning README explaining which planning docs
should live here.

**18.**

**docs/reference/README.md**

Create a reference README explaining that uploaded
source docs and workbook summaries may be referenced here, but sensitive
raw data must not be committed unless explicitly approved.

**19.**

**tests/fixtures/README.md**

Create a fixtures README explaining that all fixtures
must be synthetic or anonymised.

**20.**

**data/README.md**

Create a data README explaining expected local-only
data handling.

**21.**

**.gitignore**

Create or update
<span class="s4">.gitignore to
exclude:

- .env
- .env.*
- raw spreadsheet exports
- sensitive data dumps
- local databases
- browser traces unless approved
- Playwright videos/screenshots unless approved
- OS junk files

Suggested exclusions:

.env
.env.*
*.sqlite
*.sqlite3
*.db
data/raw/
data/private/
data/exports/
_input/
*.xlsx
*.xls
*.csv
.DS_Store
playwright-report/
test-results/
*.trace.zip

Do not delete any current files.

**Output requirements**

After creating files, report:

1.  files created
2.  files modified
3.  files intentionally not created
4.  any assumptions made
5.  any risks or missing inputs
6.  the next exact prompt to run, which should be
    <span class="s4">docs/codex/bootstrap-2-build-plan-prompt.md

Do not start the build plan yet.
Do not implement app source code yet.
