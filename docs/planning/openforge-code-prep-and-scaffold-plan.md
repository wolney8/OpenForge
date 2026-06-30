# OpenForge Code-Prep and Scaffold Plan

_Last updated: 2026-06-30_

## Status

Phase:

- `Pre-Code Planning`

Purpose:

- define the final planning slice before code starts
- narrow the first implementation phase to safe scaffold and stack decisions

## Goal

Before any code is written, OpenForge should have a clear answer for:

- app stack
- scaffold shape
- repository structure
- first branch discipline
- first implementation slice order
- first validation commands

This document does not start code. It prepares the first code phase.

## Recommended initial stack

Grounded in earlier planning research, the recommended starting point is:

- frontend/app shell: React + TypeScript
- preferred delivery shape: Next.js App Router
- backend/API: FastAPI + Python
- database: SQLite for local-first MVP
- database plan: local-first SQLite with migration-ready schema and periodic local backup path
- UI workflow tests: Playwright
- unit/integration tests:
  - frontend: Vitest or framework-native equivalent
  - backend: Pytest
- import/export utilities:
  - careful CSV/JSON/XLSX parsing only when approved

## Why this stack fits current planning

- React + TypeScript fits the route-heavy tracker and dashboard/reporting surfaces
- Next.js gives a clean app-shell structure without forcing hosted SaaS behaviour
- FastAPI supports pure calculation and import/report APIs cleanly
- SQLite matches the approved local-first MVP direction
- a portable relational schema keeps later migration to a managed online database feasible
- Playwright matches the existing workflow-testing rule in `AGENTS.md`

## Database and storage preparation

The first code phase should treat database work as:

- local-first runtime storage
- migration-ready schema design
- backup-aware operational planning

Required planning assumptions to carry into scaffold:

- tracker data will live in a local relational database from the first code phase
- periodic local backups will be needed later
- schema and repository structure should not assume SQLite is the permanent final database

Recommended first database boundaries:

- one local application database file
- clearly separated app config for database path
- no committed database files
- room for later migration tooling and managed online database targets

Recommended later operational support:

- scheduled local backup path
- manual backup trigger path
- restore verification path
- documented backup file location outside version control

## First scaffold boundaries

The first scaffold phase should create only:

- frontend app shell
- backend app shell
- shared route skeleton aligned to approved route model
- test runner baselines
- lint/typecheck baselines
- local database wiring placeholder
- database configuration path that can later support backup scheduling and online-database migration

It should not yet implement:

- workbook import logic
- final calculations
- production auth
- subscriber-facing deferred platform access
- OddsForge
- managed online database migration
- automated backup engine beyond planning-safe placeholders

## Recommended repo structure once code starts

Preferred high-level layout:

- `apps/web/`
  - route shell and profile/tracker UI
- `apps/api/`
  - FastAPI service, calculation/report endpoints, auth/session endpoints
- `packages/` or equivalent shared folder if needed later
  - shared types/contracts only if justified
- `tests/`
  - deterministic fixtures and cross-surface tests

If a monorepo wrapper is added, it should exist to serve the split above, not as an end in itself.

## First implementation phases after scaffold

### Phase A: branch and scaffold

- reread `AGENTS.md`
- create feature branch tied to the active GitHub issue
- scaffold frontend, backend, testing, and local database baseline
- scaffold database configuration with migration-ready structure
- confirm actual build/test/lint/typecheck commands

### Phase B: profile-safe app shell

- local login shell
- `/profiles` shell
- `/profiles/:profileId/tracker` shell
- route guards and profile context plumbing
- no financial UI values yet without backed contracts/tests

### Phase C: first pure calculation slice

- implement one money-impacting calculation only after contract + fixtures + tests
- recommended first calculation remains a pure row calculation, not a large report surface

### Phase D: first tracker workflow slice

- connect one approved tracker workflow end-to-end
- preserve profile isolation and audit boundaries

## Branch discipline once code starts

Branching becomes mandatory at the first mutating scaffold or code task.

Required branch behaviour:

- one working branch tied to the active GitHub issue slice
- no code on the default branch
- no commit without human approval
- keep slices small and reviewable

Recommended branch naming shape:

- `feature/<issue-or-slice>-short-name`

Examples:

- `feature/profile-shell-foundation`
- `feature/first-calculation-engine-slice`

## First commands to lock once scaffold begins

Actual commands should be confirmed from the chosen scaffold, but the first code phase must end with real values for:

- build command
- test command
- lint command
- typecheck command
- Playwright command

These should then be written back into `AGENTS.md` placeholders once confirmed.

## First safe coding-task order

Recommended order after code starts:

1. scaffold web and API shells with tests/lint/typecheck
2. implement profile-safe route and context shell
3. implement local auth/session shell for one Fund Manager
4. implement first pure calculation with fixtures/tests
5. implement first profile-scoped tracker module shell backed by that calculation path

## GitHub update needed before code starts

The next active GitHub issue set should include:

- scaffold and stack baseline
- local database and backup-ready storage baseline
- profile-safe route shell
- local auth shell
- first pure calculation implementation
- first profile-scoped tracker workflow slice

If those issues do not exist yet, they should be created before code begins.

## Validation checklist

- stack choice does not conflict with local-first MVP
- repo structure supports separate app shell and calculation/report logic
- database choice supports local runtime now and managed migration later
- local backup path is accounted for in storage/config planning
- branch discipline is explicit before any code mutation
- first implementation slices are small, testable, and contract-backed
- no deferred subscriber-platform scope leaks into initial scaffold

## Handoff note

Once this pre-code plan is accepted, the next step is the first real implementation turn:

- reread `AGENTS.md`
- create a working branch
- implement the approved scaffold issue only
