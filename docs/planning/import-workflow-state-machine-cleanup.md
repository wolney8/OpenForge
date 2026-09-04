# Import Workflow State-Machine Cleanup

Date: 2026-09-04

Scope: correct deterministic historical-Void review generation and make the hosted Profile
workbook review/approval workspace render one persisted workflow state with action-owned progress.
Import execution and Profile data mutation are explicitly excluded from this tranche.

| ID | Area | Requested behaviour | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-205 | Historical Void analysis | A terminal Void with an explicit audited zero value never becomes an override-reason review | Imported-historical sportsbook rule and synthetic import fixtures | COMPLETE |
| PD-FIX-206 | Persisted workflow state | Persist analysis, review, approval, import and reconciliation states and derive the workspace from them | Existing ImportRun authority and resumable execution monitor | COMPLETE |
| PD-FIX-207 | Approval CTA | The clicked Approve dry run action owns its disabled spinner, error and READY_APPROVED transition | Canonical pending primary-action pattern | COMPLETE |
| PD-FIX-208 | Rerun CTA | Rerun dry run shows progress only for its own request and invalidates stale approval safely | Canonical secondary mutation action | COMPLETE |
| PD-FIX-209 | Import progress | Import and reconciliation expose persisted canonical progress and reconnect after navigation | Existing import execution monitor and progress bar | COMPLETE |
| PD-FIX-210 | Save and leave | Save and leave means return later and is unavailable during conflicting mutations | Existing navigation/persistence lock pattern | COMPLETE |
| PD-FIX-211 | Workflow stepper | Upload through reconciliation status is semantic, state-backed, keyboard/screen-reader legible and theme-safe | Material status chips, ordered navigation and shared tokens | COMPLETE |
| PD-FIX-212 | Regression coverage | Prove zero-review approval persistence without performing an import | Synthetic API and Playwright fixtures | COMPLETE |

## Constraints

- Preserve financial contracts, Account lifecycle/restriction mapping, historical Extra Place
  handling, attempt-scoped recovery, the Account Catalogue and all Profile-owned data.
- Do not execute an import against the hosted Profile.
- Do not retain or commit workbook bytes or workbook-derived operational values.
- A same-workbook upload after this correction receives a new mapping identity; the prior dry run
  remains historical evidence rather than being rewritten in place.

## Verification gate

- Focused importer and workflow-state API tests.
- TypeScript state/presentation tests.
- Playwright approval ownership, stepper, leave/return and reduced-width/light/dark assertions.
- Repository lint, typecheck and builds appropriate to the changed API/web surfaces.

## Persisted transitions

The canonical workspace path branches after `ANALYSED`: a workbook with exceptions moves through
`REVIEW_REQUIRED` → `REVIEW_COMPLETE`, while a workbook with no exceptions moves directly to
`DRY_RUN_READY`. Either review-complete state may claim `APPROVING` → `READY_APPROVED` →
`IMPORTING` → `RECONCILING` → `COMPLETE`. Rerunning a review-complete dry run persists
`DRY_RUN_READY`. Any server action may enter `FAILED`, retaining its persisted stage and safe
retry instruction.
The existing `ANALYSING` queue value remains a compatible internal precursor and is presented as
the analysis step; it cannot accept review, approval, delete or import mutations.

Mapping version `founder-snapshot-v7` recognises terminal Void evidence before review items are
created. Existing v6 review snapshots remain immutable; because workbook bytes are deliberately
not retained, a same-workbook upload is required to obtain a v7 analysis rather than rewriting
historical review evidence.
