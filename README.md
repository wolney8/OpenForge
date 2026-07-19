# Plum Duff

Plum Duff is a local-first platform for managing matched-betting activity across
multiple subscriber profiles. It reconstructs the existing tracker workbook as
a database-backed web application while preserving the workbook's workflows,
reporting rules and cash-first financial calculations.

The application is currently a functional workbook-first MVP. It is not yet a
production SaaS product.

## How it works

The main journey is:

`Login -> Profiles -> Selected Profile Tracker`

One Fund Manager currently operates the platform. The Fund Manager can review
all profiles, compare their performance, open a profile's isolated tracker and
follow actionable reporting links directly to the affected ledger rows.

Each subscriber profile has separate:

- accounts and balances;
- sportsbook and qualifying bets;
- free bets;
- casino offers;
- cash adjustments;
- reports and profit metrics;
- fee calculations and withdrawals;
- tracker settings and audit information.

Profile data must never be mixed across operational ledgers.

## Current capabilities

The profile tracker currently provides:

- Sportsbook Bets;
- Free Bets;
- Casino Offers;
- Cash Adjustments;
- Accounts;
- dashboard and profit reporting;
- formal weekly, monthly and yearly reports;
- profile-specific settings;
- spreadsheet-shaped XLSX import and export.

Ledger tables support search, filtering, saved views, column visibility,
pagination, issue indicators, row actions, settlement actions and modal-based
row creation and editing.

The Fund Manager area provides:

- a profile directory and combined analytics;
- profile performance, exposure and formal reports;
- direct links to overdue, incomplete or expiring tracker rows;
- a universal catalogue of bookmakers, exchanges and banks;
- monthly management and investment fee review;
- fee withdrawal recording and correction audit history.

## Cash-first calculations

Plum Duff asks:

> What is this position worth to the bankroll right now?

It keeps calculator suggestions, actual stakes, conservative current value,
possible outcomes, settled final value and audited manual overrides separate.
It does not replace the workbook with a generic equal-profit matched-betting
calculator.

Sportsbook workflows currently include standard matching, underlay, overlay,
custom lay, partial lay, multi-lay and workbook-derived advanced offer branches.
Money-impacting behaviour is governed by calculation contracts, synthetic
fixtures and automated tests.

## Fund Manager fees

Weekly fee figures are indicative. Fees are formally calculated for completed
calendar months using settled/final sportsbook, free-bet and casino values.

- Management and investment fees are calculated independently.
- Previous losses are recovered before a positive fee base is available.
- Confirmed fees can be recorded as withdrawn through audited Cash Adjustments.
- A confirmed pre-withdrawal month can be reopened and recalculated with a
  retained revision history.
- A post-withdrawal error creates a future fee credit or debit rather than
  rewriting history.

See [the Fund Manager fee process](docs/fund-managers/plum-duff-fee-process.md)
for the operational workflow.

## Technology

- Next.js, React and TypeScript frontend;
- Python FastAPI backend;
- local SQLite database;
- Vitest unit tests;
- Pytest API and calculation tests;
- Playwright browser workflow tests.

## Run locally

Requirements:

- Node.js and `pnpm`;
- Python matching `.python-version`;
- project dependencies installed locally.

Start the API:

```bash
pnpm dev:api
```

Start the web application in a separate terminal:

```bash
pnpm dev:web
```

Open:

- Web application: `http://localhost:3010`
- API: `http://127.0.0.1:8010`

## Validate changes

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm playwright
```

## Safety boundaries

- The workbook is sensitive and must not be committed or copied into fixtures.
- Fixtures and examples must be synthetic or anonymised.
- Do not store bookmaker, exchange or bank credentials.
- Do not implement autonomous bet placement or auto-confirmation.
- Do not implement live bookmaker scraping.
- Do not change money logic without an approved calculation contract, fixtures
  and tests.

See [AGENTS.md](AGENTS.md) for the complete engineering and safety rules.

## Deferred work

The following are planned but are not complete production capabilities:

- hardened Fund Manager authentication and optional Google OIDC;
- verified encrypted cloud backups for the local database;
- multi-profile bet entry;
- subscriber read-only and self-service access;
- standalone calculator workspace and ledger bridge;
- target and decision-support tooling;
- final platform-wide accessibility and experience refinement.

OddsForge remains a separate deferred module. Live odds matching, bookmaker
scraping, autonomous betting, hosted multi-tenant SaaS and public sign-up are
outside the current Plum Duff MVP.
