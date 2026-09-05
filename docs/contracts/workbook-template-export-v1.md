# Workbook template export v1

Last updated: 2026-09-05

## Status

Approved local/template implementation. Google container copy, bound Apps Script, trigger runtime,
Google recalculation, and helper-menu execution remain a separate smoke gate.

Output classification is exactly:

`STRUCTURALLY VALID WORKING-WORKBOOK EXPORT — GOOGLE RUNTIME VALIDATION PENDING`

## Purpose and separation

`workbook-template-export-v1` projects the current authoritative state of one Profile into a fresh
copy of the signed September workbook template. It is not `profile-portable-export-v1`, does not
restore a Profile, does not update a stale independently edited workbook, and is not a canonical
backup for platform-only state.

## Authorities

- `workbook-template-export-v1-ledger-structure.json` is the single structural authority for
  tables, headers, input/system/formula ownership, protected columns, IDs, and growth names.
- `workbook-template-export-v1-field-coverage.json` classifies every projected field, allowed
  control cell, sanitization boundary, deliberate platform-only domain, and fail-closed blocker.
- The template, supplied helper, structural manifest, and field map must all match their recorded
  SHA-256 fingerprints before any output is delivered.

## Snapshot and isolation

The server requires a Fund Manager session and selects one Profile inside one read-only,
repeatable-read transaction. Export creates no run, checkpoint, audit, balance, or workflow row.
Runtime IDs are never copied across Profiles. Compatible source workbook IDs, including valid
historical-iteration IDs, are preserved; platform-native rows receive collision-free IDs after the
highest sequence for the validated current Profile iteration.

## Sanitization boundary

The copy is not allowed to retain the template owner's operational data. The package writer:

- replaces every row in the five declared Profile ledger tables;
- clears unused former table-body rows and their cached values;
- clears the body of Reload Templates, SignupUsers, and Profitability Audit while preserving their
  signed structures;
- clears formula caches workbook-wide without replacing formulas;
- clears cached chart-series values while retaining chart formula references and relationships;
- scrubs unreferenced shared-string payloads after the writes;
- rejects non-empty person metadata rather than carrying or rewriting an unknown identity graph;
- rejects any source package containing comments/threaded comments instead of silently carrying or
  destructively rewriting an unknown comment graph.

These changes are an explicit privacy boundary. Formula, style, validation, conditional-format,
table, name, drawing, relationship, dashboard, report, and support structures otherwise remain
template-owned.

## Fail-closed boundary

Unknown fingerprints, missing Profile bootstrap rows, bad iteration or IDs, normalized-header
collisions, unexpected table/name drift, formula syntax outside the supported translator, capacity
overflow, comments, cross-Profile source identities, and state classified as `blocked_profile_state`
all prevent a downloadable workbook.

Extra Places are explicit: the signed workbook has no `EP Catchers` or other authoritative modern
Extra Places input zone. A complete `imported_historical` row may return to its original Sportsbook
ledger shape using current Profile-owned fields and its audited imported P&L. Platform-native or
incomplete Extra Places block export. They are never relabelled as Cash Adjustments or flattened
into notes. Fees and richer platform calculation branches follow the same no-invention rule
described by the field coverage map.

## Values and calculations

Text is stored as inline string cells; booleans use workbook booleans; canonical finite decimal text
is written as numeric cell data without rounding; dates/timestamps are converted to Excel serials
after UTC/date validation. Empty remains an empty cell. Formula/helper columns are copied and
translated from a structurally complete template row; platform-calculated values never replace
template formulas. Cached formula results are removed and recalculation is requested on next open.

Structural/source-input parity is not spreadsheet-engine or Google recalculation evidence.

## Local structural validation

A representative synthetic current-Profile export retains the signed package's 74-part inventory.
The approved sanitization/population boundary changes all 14 worksheet XML parts (input/control
writes and removal of formula caches), the five declared ledger table definitions, workbook XML
(defined-name extents and recalculation flags), and shared strings. The other 53 parts remain
byte-identical, including drawings, relationships, styles, theme, and the signed empty person part.

This is local package and source-input evidence only. No spreadsheet calculation engine or Google
Apps Script runtime is executed by this contract.
