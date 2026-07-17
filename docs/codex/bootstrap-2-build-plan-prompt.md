# Bootstrap 2 Build Plan Prompt

Use this prompt for the next Codex session after Bootstrap 1 is complete.

---

You are Codex working inside the Plum Duff repository workspace.

Your task is to produce a comprehensive build plan only.

Do not implement application code.
Do not create frontend source files.
Do not create backend source files.
Do not create database migrations.
Do not modify the workbook.
Do not start OddsForge planning beyond clearly deferred notes.

## Required first steps

1. Read `AGENTS.md`.
2. Read the current docs in `docs/codex/`, `docs/planning/`, and `docs/templates/`.
3. Inspect the current tracker-only source pack in `_input/`.
4. Inspect the uploaded workbook if it is available locally, but treat it as sensitive and do not copy raw data into outputs.
5. Prefer the current profile-scoped Plum Duff source pack over older archived material if there is any conflict.

## Build-plan output requirements

Produce a planning-only document set or response that:

- maps workbook sheets to proposed web-app modules
- maps workbook workflows to route flows
- proposes the Tracker MVP scope
- proposes profile-scoped database schema
- proposes calculation engine structure
- identifies current-value and cash-first calculation boundaries
- identifies profile-isolation requirements
- identifies contradictions, missing definitions, and risks
- identifies required calculation contracts
- identifies fixture strategy
- identifies test strategy, including Playwright paths for UI workflows
- proposes the first five safe coding tasks in dependency order

## Mandatory planning topics

Cover at least:

- login -> profiles -> tracker route structure
- fund manager overview vs profile-specific tracker responsibilities
- profile table and profile-owned record scoping
- workbook sheet inventory
- workbook formula hotspots
- dashboard and reporting KPI mapping
- open/pending vs settled/final value separation
- manual override handling
- import/deconstruction workflow
- audit trail expectations
- assumptions that need human confirmation

## Constraints

- Plum Duff is tracker-first.
- OddsForge is deferred.
- Local-first MVP only.
- Preserve spreadsheet-as-blueprint behaviour.
- Preserve cash-first current-value calculations.
- No hidden assumptions.
- No live scraping.
- No bet automation.
- No sensitive data leakage.

## Final output format

Include:

1. scope summary
2. source files reviewed
3. workbook-to-module mapping
4. proposed schema outline
5. proposed calculation engine outline
6. key risks and contradictions
7. first five safe coding tasks
8. explicit list of unanswered questions

Make no code changes.
