# OpenForge Phase 2 — Closeout

_Last updated: 2026-06-30_

## Status

Phase:

- `Phase 2 - Profile-Scoped Architecture, Schema, and Reporting Boundaries`

Current state:

- planning and documentation only
- no application code started
- no scaffold started
- no branch required yet

## Purpose

This document closes out phase 2 and confirms that OpenForge now has a decision-complete planning baseline for:

- profile-scoped architecture
- schema boundaries
- calculation-engine boundaries
- reporting-model boundaries
- import/export boundaries
- deferred subscriber-platform expansion boundaries

## What Phase 2 covered

Phase 2 now documents:

- approved profile field set and profile-isolation rules
- profile-scoped schema planning
- fee-aware reporting boundaries
- combined cross-profile analytics boundaries
- calculation-engine layering
- reporting-model separation
- import/export architecture addendum
- local-first but migration-ready database/storage direction
- phase-2 architecture baseline aligned to approved profile behaviour
- deferred subscriber-access and self-service expansion notes

## Key outputs now in place

Phase-2 architecture and decisions:

- `docs/planning/openforge-phase-2-profile-scoped-architecture-draft.md`
- `docs/planning/openforge-profile-decisions-to-confirm.md`

Phase-2 implementation-planning baselines:

- `docs/planning/openforge-phase-2-schema-plan.md`
- `docs/planning/openforge-phase-2-calculation-engine-boundaries.md`
- `docs/planning/openforge-phase-2-reporting-model-plan.md`
- `docs/planning/openforge-phase-2-import-export-addendum.md`

Deferred later-platform expansion:

- `docs/planning/openforge-future-subscriber-access-model.md`
- `docs/workflows/subscriber-access-and-visibility-workflow-contract.md`
- `docs/contracts/subscriber-fee-aware-earnings-contract.md`
- `docs/fixture-specs/subscriber-access-control-fixture-spec.md`
- `docs/fixture-specs/subscriber-fee-aware-earnings-fixture-spec.md`

## Confirmed planning truths from Phase 2

The following are now locked strongly enough for implementation planning:

1. `profiles` is a first-class isolated operational container, not a label.
2. MVP profile metadata includes `phone`, but not postal address or extra contact-person fields.
3. Fee inputs are percentage-point values and belong in reporting/analytics, not row-level bet calculations.
4. `/profiles` is both the control surface and the combined cross-profile analytics surface.
5. Combined analytics remain aggregate/drilldown only and must not become mixed operational row-edit surfaces.
6. Every tracker-owned model must carry explicit `profile_id`.
7. Row calculations, selected-range aggregations, formal reporting, and cross-profile analytics are separate calculation layers.
8. Weekly reports and dashboard selected-range summaries must remain distinct.
9. Import/export must preserve enough detail to rebuild per-profile and combined reporting outputs.
10. Local tracker data will require a database plan that supports later migration to a managed online database.
11. Deferred subscriber-facing access is captured separately and does not alter current MVP scope.

## Remaining approved deferrals

These remain intentionally deferred and should not block code-prep planning:

- exact MVP UI decision on separate versus merged dashboard/profit-tracker surfaces
- exact non-action wording for account-health rows below mug-bet threshold
- future subscriber identity/link schema
- exact managed-subscriber versus self-service fee policy
- public sign-up, production SaaS auth, and billing

## Phase 2 risks now reduced

The following risks are materially reduced:

- implementing profile isolation as a late filter instead of a core model rule
- mixing fee logic into row-level calculations
- confusing selected-range dashboard outputs with formal weekly/monthly report outputs
- inventing combined cross-profile analytics without ownership boundaries
- under-specifying import/export round-trip needs for reporting parity
- future subscriber-access ideas leaking into current MVP scope accidentally

## Recommended GitHub update

The active phase-2 issues or milestone should now reflect:

- schema plan completed
- calculation-engine boundary plan completed
- reporting-model plan completed
- import/export addendum completed
- deferred subscriber-platform milestone `M9` linked as future scope, not current MVP scope

## Entry criteria for code-prep phase

The next phase can begin when:

1. Phase-2 planning docs are accepted as the architecture baseline.
2. The current open deferred items are accepted as non-blocking for code prep.
3. The next active GitHub issue set is ready for pre-code stack/scaffold planning and then first implementation slices.

## Branch note

Feature branches are still not required at phase-2 closeout.

They become mandatory at the first code or scaffold task.

At that point:

- reread `AGENTS.md`
- create a working branch
- tie the branch to the active GitHub issue and milestone slice
- do not start code on the default branch

## Closeout statement

Phase 2 is sufficiently documented to begin the final pre-code planning slice and then transition into implementation on a controlled branch-based workflow.
