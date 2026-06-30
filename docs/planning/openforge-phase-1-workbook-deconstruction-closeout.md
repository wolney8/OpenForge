# OpenForge Phase 1 — Workbook Deconstruction Closeout

_Last updated: 2026-06-30_

## Status

Phase:

- `Phase 1 - Workbook Deconstruction`

Current state:

- planning and documentation only
- no application code started
- no scaffold started
- no profile-behaviour changes proposed beyond already approved understanding

## Purpose

This document closes out the workbook-deconstruction phase and defines the entry conditions for the next phase.

It exists to confirm that OpenForge now has a source-of-truth map detailed enough to begin schema and calculation-engine planning without improvising workbook behaviour later.

## What Phase 1 covered

Phase 1 now documents:

- workbook sheet inventory and source-of-truth scope
- exclusion of `SignupUsers`
- workbook field map
- workbook formula map
- workbook workflow map
- cash-first current-value behaviour
- sportsbook ledger complexity
- free-bet ledger complexity
- casino-offer ledger behaviour
- dashboard control behaviour
- profit-tracker drilldown behaviour
- settings and named-range dependencies
- report parity rules
- import/export preservation rules
- initial calculation contracts
- initial deterministic fixture specs

## Key source-of-truth outputs now in place

Core workbook deconstruction:

- `docs/workbook-blueprint.md`
- `docs/workbook-field-map.md`
- `docs/workbook-formula-map.md`
- `docs/workbook-workflow-map.md`
- `docs/workbook-cash-first-calculation-map.md`

Focused workbook findings:

- `docs/workbook-ledger-deconstruction-findings.md`
- `docs/workbook-targeted-findings-unresolved-areas.md`
- `docs/workbook-dashboard-settings-profit-tracker-findings.md`
- `docs/workbook-reporting-parity-findings.md`
- `docs/workbook-ledger-import-export-map.md`

Contracts:

- sportsbook current value
- free-bet current value
- liability/exposure
- cash-adjustment aggregation
- dashboard selected-range P&L
- free-bet weekly reporting
- retained-profit reporting
- account-health review

Fixture specs:

- sportsbook current value
- free-bet current value
- liability/exposure
- cash adjustments
- dashboard selected-range P&L
- free-bet weekly reporting
- retained-profit reporting
- account-health review

## Confirmed workbook truths from Phase 1

The workbook truths now documented strongly enough to guide implementation are:

1. The spreadsheet is operational, not archival.
2. OpenForge must preserve cash-first current-value behaviour.
3. `NetPnL` can represent current conservative value before settlement.
4. `FinalNetPnL` must remain separate from formula output.
5. `Dashboard` controls tracker date state and quick operational summaries.
6. `Profit Tracker` is the real activity and P&L drilldown surface.
7. `Settings` is cross-cutting infrastructure, not a minor helper sheet.
8. `Reports` is downstream from ledgers, not an independent truth source.
9. Weekly free-bet reporting uses narrower inclusion rules than generic selected-range summaries.
10. Retained profit depends on signed cash-adjustment semantics.
11. Multi-lay, DDHH, no-lay, mug-bet, `SNR`, and `SR` are first-class workbook behaviours.
12. Profile isolation must wrap all of this, not sit on top of it later.

## Open items that remain intentionally unresolved

These are not blockers to phase 2 planning, but they remain approval-sensitive:

- whether MVP needs any settled-only dashboard or reporting mode beside workbook-parity current-state views
- whether `Costs` should remain report-tolerated only or become an editable modern adjustment type
- exact non-action wording for account-health rows below the mug-bet threshold
- whether retained profit should surface only in reports first or also in dashboard-style summaries
- whether dashboard and profit-tracker routes remain separate in MVP UI while preserving shared behaviour

None of these change the already approved `profiles` function understanding.

## Phase 1 risks already reduced

The following risks are now materially reduced:

- rebuilding tracker logic from generic matched-betting assumptions
- losing workbook current-value semantics
- confusing dashboard selected-range totals with formal report totals
- flattening free-bet weekly reporting into the wrong inclusion model
- mishandling negative signed adjustments in retained profit
- missing account-health logic hidden in `Profit Tracker`
- accidentally using `SignupUsers` as development source data

## Recommended GitHub update

The relevant phase-1 GitHub issue or milestone should now be updated to reflect:

- workbook deconstruction completed to planning depth
- reporting/account-health contracts added
- fixture specs added for reporting parity and account-health behaviour
- phase 2 ready to start as schema and calculation-structure planning

## Entry criteria for Phase 2

Phase 2 can start when:

1. The workbook deconstruction outputs are accepted as the current planning baseline.
2. The current contract set is accepted as a planning baseline.
3. No new profile-behaviour decision is being introduced without user approval.

## Phase 2 scope recommendation

The next phase should focus on:

- profile-scoped schema refinement
- calculation engine module boundaries
- report-model boundaries
- import/export architecture boundaries
- app-shell planning readiness

Phase 2 should still avoid full application implementation until the planning outputs are judged sufficient.

## Feature branch note

Feature branches are not needed yet.

They become necessary immediately before the first code or scaffold change.

At that point:

- reread `AGENTS.md`
- create a working branch
- tie the branch to the active GitHub issue/milestone slice

## Closeout statement

Phase 1 is sufficiently documented to move into schema and calculation-structure planning without losing the workbook as source of truth.
