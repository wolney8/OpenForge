# Plum Duff Pre-Pause Return Point

_Updated: 2026-08-24_

## Current Hosted State

Vercel is configured as a monorepo deployment with the Next.js frontend and same-origin FastAPI
wrapper under `/api`. Production build succeeds locally. Hosted end-to-end API persistence has not
been verified in this pass.

## Database State

SQLite remains the only live runtime adapter. Neon connection, schema and rehearsal tooling exist,
but application reads and writes intentionally refuse `database_mode=neon` to prevent split-brain.
Do not use Vercel filesystem SQLite for persistent data.

## Each Way / Extra Places State

Implemented and merged to `main`: dedicated profile-scoped table/API, calculation engine,
three-step calculator/editor and deterministic MBB plus EP Catcher regression fixtures. Selected-range
summaries, dashboards, formal reports, bookmaker breakdowns, cross-profile reporting and route-specific
top-bar values now include Each Way / Extra Place as a distinct module. Local synthetic rows are available
on `profile-demo-002` for verification only.

## Personal Profile State

The existing profile model can hold an owner-managed profile. There is no authenticated Fund Manager
identity or real-user provisioning flow yet.

## Security State

**HOSTED PREVIEW ONLY — DO NOT IMPORT REAL DATA.** Profile selection is not authentication and the
hosted runtime does not yet have a persistent PostgreSQL adapter or owner-only access control.

## Workbook Cut-Over State

Only the `EP Catcher` worksheet was examined for this feature. Its future importer path is:
detect legacy columns -> map to Each Way / Extra Place contract -> dry-run calculation comparison ->
selected-profile approval -> import -> reconciliation. This mapping is not implemented.

## First Action When Work Resumes

Implement and verify the PostgreSQL runtime adapter against an isolated Neon database, then add
owner authentication/session enforcement before importing any personal operational data. After that,
add the EP Catcher dry-run importer mapping and selected-profile reconciliation.
