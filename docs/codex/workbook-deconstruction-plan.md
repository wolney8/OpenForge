# OpenForge Workbook Deconstruction Plan

## Goal

Extract the current spreadsheet architecture safely so OpenForge can mirror and improve the tracker without losing cash-first behaviour or profile-scoped intent.

## Inputs

Primary expected inputs:

- `_input/WO_MB_Tracker_May2026.xlsx`
- `_input/TRACKER_CURRENT_STATE_FROM_WO_MB_TRACKER_MAY2026.md`
- `_input/TRACKER_CALCULATION_SPEC_CASH_FIRST_MAY2026.md`
- `_input/FIRST_PASS_SCHEMA_REVISED_TRACKER_ONLY_MAY2026.md`
- `_input/TRACKER_FORMULA_APPENDIX_MAY2026.md`

Current planning references:

- `docs/planning/openforge-discovery-plan-part-1-profile-scoped.md`
- `docs/planning/openforge-delivery-risks-research-part-2-profile-scoped.md`

## Extraction sequence

1. Create a sheet inventory.
2. Capture each sheet's purpose and workflow role.
3. Extract headers and field groupings per sheet.
4. Distinguish user-entered fields from calculated fields.
5. Extract representative formulas and repeated formula patterns.
6. Extract named ranges, if any.
7. Extract validation lists and dropdown/status values.
8. Trace dashboard KPIs back to their source sheets and formulas.
9. Identify cross-sheet relationships and lookup dependencies.
10. Identify current-value and cash-first formula behaviour, especially conservative scenario logic.
11. Redact or avoid sensitive raw values in all outputs.

## What to capture

For each workbook sheet, document:

- sheet name
- role in workflow
- key headers
- input fields
- calculated fields
- lookup fields
- status fields
- date fields
- money fields
- related sheets
- notable formulas
- current-value behaviour

## Formula extraction focus

Prioritise formulas that affect:

- current bankroll or cash snapshot
- open position value
- overdue logic
- free-bet expiry logic
- liability and exposure
- dashboard KPIs
- weekly or monthly reports
- profit tracker totals
- management fee and investment fee reporting

## Calculated vs user-entered classification

For each significant field, identify whether it is:

- user-entered
- copied/imported
- formula-derived
- dashboard-derived
- manually overridden

## Validation and statuses

Capture:

- dropdown values
- status enumerations
- report period labels
- workflow status transitions implied by workbook usage

## Cross-sheet relationships

Trace:

- account-to-bet relationships
- bet-to-report relationships
- adjustment-to-bankroll relationships
- dashboard-to-source-sheet relationships
- any named-range or lookup-table dependencies

## Cash-first current-value behaviour

Explicitly document:

- where open rows still carry value before settlement
- whether formulas compare multiple outcomes
- whether conservative `MIN()` or equivalent logic is used
- how projected/current values differ from settled/final values
- where manual overrides change displayed or reported values

## Sensitive-data handling

- Do not commit raw workbook data unless explicitly approved.
- Use redacted or synthetic examples in outputs.
- Avoid copying live account identifiers, balances, emails, or other personal details.

## Planned output documents

Later workbook deconstruction should produce:

- `docs/workbook-blueprint.md`
- `docs/workbook-field-map.md`
- `docs/workbook-formula-map.md`
- `docs/workbook-workflow-map.md`
- `docs/workbook-cash-first-calculation-map.md`

## Completion check

The deconstruction pass is only complete when:

- sheets are inventoried
- major headers are mapped
- formulas are traced
- user-entered vs calculated fields are distinguished
- dashboard KPIs are explained
- cross-sheet dependencies are identified
- cash-first behaviour is documented
- sensitive data has not been leaked
