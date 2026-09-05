# `workbook-template-export-v1` preservation investigation

Status: **PROTOTYPE COMPLETE — PRODUCTION IMPLEMENTATION NOT APPROVED**

Investigation ID: `TEMPLATE-INVESTIGATION-001`

Date: 2026-09-04

> Superseded for workbook/script structural authority by
> [`workbook-template-export-v1-compatibility.md`](./workbook-template-export-v1-compatibility.md),
> which validates the supplied September template and current helper script together. The May
> findings below remain historical approach evidence only.

## Scope and safety boundary

This investigation compares ways to create a fresh working workbook from an approved template.
It does not implement a production export, portable-profile restore, or workbook merge/update.

The locally available May workbook was inspected read-only as a structural reference. The
September workbook was not available in the repository and was not reconstructed. No workbook or
Profile values are copied into this document. All writable prototypes used synthetic values in
temporary files, and the temporary files were deleted after verification.

`profile-portable-export-v1` is a separate backup/restore contract and was not changed.

## Evidence levels

- **Empirically verified locally:** OOXML/XLSX structure and disposable synthetic template-copy
  behaviour.
- **Verified from current Google documentation:** Google container-copy, bound-script, trigger,
  authorization, Properties Service, and Sheets API semantics.
- **Still requires an authorized disposable Google test:** behaviour of the actual approved Google
  Sheets template, its particular bound script, triggers, properties, protections, and formula
  recalculation.

## Structural reference inventory

The current local workbook package contains 14 sheets (8 hidden), 22 tables, 19,188 formula cells,
82 data-validation rules, 79 conditional-formatting blocks, 36 defined names, and 74 package
parts. It contains no `vbaProject.bin`; bound Google Apps Script is not stored in an `.xlsx` file.

The recognised Profile input tables are Accounts, Cash Adjustments, Sportsbook Bets, Free Bets,
and Casino Offers. Dashboard, Reports, Profit Tracker, settings, KPI, and supporting sheets contain
template-owned formulas or support structures. The available May workbook has no modern Extra
Places output table, so an Extra Places write zone is not yet proven.

## Approach comparison

### A. Generate an XLSX from scratch

This can emit data, selected formulas, and newly authored styles, but it has no source from which to
preserve the existing workbook application. Every table, formula, named range, validation rule,
conditional format, hidden/supporting sheet, drawing, protection, and dashboard/report dependency
would have to be recreated and versioned. An XLSX cannot contain a Google Sheets bound Apps Script
project.

Result: unsuitable for the working-workbook fallback. It remains appropriate only for the separate
portable structured export.

### B. Copy and populate an approved XLSX template

A template copy starts with the workbook structure intact. A synthetic template prototype added one
row to each of five input tables and retained or extended formulas, styles, table references,
validation rules, named ranges, conditional formatting, dashboard/report formulas, and a hidden
support sheet. The file was re-opened successfully with formulas preserved. Recalculation was only
requested for the next spreadsheet engine; formula-result parity was not claimed.

A second probe surgically changed synthetic identities in five recognised input worksheets of a
disposable copy of the real package. Only those five worksheet XML parts changed; every other
package part remained byte-identical, including table definitions, styles, names, validations,
drawings, and hidden/supporting sheets.

A generic full load/save of the real workbook through `openpyxl 3.1.5` was **not** preservation-safe:

- package parts changed from 74 to 59;
- formula serialization changed from 19,188 to 19,198 formula elements;
- conditional-formatting blocks changed from 79 to 25;
- defined names changed from 36 to 33;
- multiple drawing parts were removed.

Result: viable fallback only with a narrowly scoped OOXML patcher or a proven native spreadsheet
engine. A generic workbook-library re-save is rejected. XLSX still cannot preserve bound Apps
Script.

### C. Duplicate an approved Google Sheets template

Google documents that a user who copies a container file owns the copy and can see and run a copy
of its bound script. Drive `files.copy` creates a new file, so the copied spreadsheet has a new file
ID and its bound script is a separate copied project. Formula, formatting, validation, named-range,
hidden-sheet, and protection preservation should come from copying the whole container rather than
reconstructing it.

After the copy, Profile values can be written only to declared input ranges with
`spreadsheets.values.batchUpdate`. Structural changes such as adding rows, copying formula/format
templates, or updating tables must use `spreadsheets.batchUpdate` with explicit field masks. API
writes do not fire edit/change triggers, so post-copy initialization cannot depend on such a trigger
being activated by data population.

Result: preferred when bound Apps Script is required, subject to the disposable authorized gate
defined below.

Primary references:

- [Container-bound scripts](https://developers.google.com/apps-script/guides/bound)
- [Drive `files.copy`](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/copy)
- [Installable triggers](https://developers.google.com/apps-script/guides/triggers/installable)
- [Apps Script authorization](https://developers.google.com/apps-script/guides/services/authorization)
- [Properties Service](https://developers.google.com/apps-script/guides/properties)
- [Sheets batch updates](https://developers.google.com/workspace/sheets/api/guides/batchupdate)
- [Sheets values batch update](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate)

## Apps Script findings

- A normal Google container copy includes a copy of the bound script. Simple functions such as
  `onOpen` remain code in the copied project and can run under the documented simple-trigger rules.
- The destination spreadsheet ID changes. The copied bound script is a distinct project and must be
  recorded using its destination script ID; source spreadsheet or script IDs must not be reused as
  destination identity.
- Installable triggers are creator-owned, authorization-bearing resources rather than portable
  workbook data. They must be inventoried and explicitly recreated for the destination by an
  idempotent setup action. The copied file must not be declared ready until the required trigger set
  is verified.
- A newly copied project/user may need to authorize its scopes. Authorization and any linked Google
  Cloud project configuration are an explicit post-copy gate.
- Named ranges copied with the spreadsheet remain usable by name only if the post-copy verifier
  confirms that their names and target ranges match the approved template manifest.
- Protection objects and their destination editor configuration must be verified separately. A file
  copy must not be assumed to reproduce source sharing permissions or the intended protected-range
  editors in the destination security context.
- Script, user, and document properties are separate stores. Google states that properties are never
  shared between scripts. Treat all required non-secret configuration as missing until verified and
  initialize only an approved allowlist. Never copy credentials or secret property values.
- Hard-coded external file, folder, deployment, form, or spreadsheet IDs in script source or
  properties would still refer to the old resource. The approved template must declare each such
  dependency and either prove that it is intentionally global or rebind it to the destination.
- Sheets/Drive API mutations do not trigger normal edit/change automation. Required recalculation or
  setup must be called explicitly or verified when the copied workbook is opened.

## Authoritative write zones

The production contract must identify zones by stable named range, table ID, or developer metadata,
then verify the sheet name, headers, and template fingerprint before writing. Sheet names alone are
not a sufficient authority boundary.

The May structural reference yields these candidate zones:

### Accounts

- Input: `A:K` and `M:Q` — identity, provider/account, type, cash inclusion, channel, lifecycle and
  restriction inputs, balances, balance update, grouping/platform/risk, signup date, and notes.
- Template-owned: `L` (`LastPromoUsed`).
- Growth: copy the approved template row's formats and validation; extend the table body; preserve
  the formula in `L`.

### Cash Adjustments

- Input: `A:I` — identity, date, direction, amount, type, inclusion flags, account link, description.
- Template-owned: `J:L` — signed amount and reporting helpers.
- Growth: extend table and validation ranges, then fill `J:L` from the formula template row.

### Sportsbook Bets

- Input: `A:P`, `R:T`, `AD`, `AM`, `AQ`, `BA:BC`.
- Template-owned: `Q`, `U:AC`, `AE:AL`, `AN:AP`, `AR:AZ`.
- Growth: insert/allocate rows, copy formula/helper regions and their formatting/validation, resize the
  input table, then write only declared input columns.

### Free Bets

- Input: `A:Q`, `S:U`, `AC`, `AJ:AL`.
- Template-owned: `R`, `V:AB`, `AD:AI`.
- Growth: same guarded table-resize and formula/validation inheritance as Sportsbook.

### Casino Offers

- Input: `A:C`, `E:N`, `P:V`, `AB`.
- Template-owned: `D`, `O`, `W:AA`.
- Growth: extend the table, copy template formulas/format/validation, then populate inputs.

### Not writable as ordinary data

Dashboard, Reports, Profit Tracker, settings/formula areas, KPI sheets, named-range definitions,
hidden/supporting sheets, formula/helper columns, protections, conditional formatting, drawings,
and Apps Script are template-owned. They are verified after population but never bulk-replaced.

The approved Google template must add equivalent declared zones for Extra Places and any other
input ledger not present in the May structural reference before production export can cover them.

## Proposed contract

`workbook-template-export-v1` should contain:

- template family, template version, immutable template fingerprint, and delivery kind;
- destination file/spreadsheet identity and newly discovered script-project identity;
- write-zone IDs with table/named-range/developer-metadata locators;
- exact header fingerprints, input columns, formula/helper columns, and protected regions;
- row capacity/growth policy, table-resize policy, validation/format inheritance policy;
- permitted input value types and null/blank handling;
- post-copy initialization requirements, required trigger descriptors, and non-secret property
  allowlist;
- pre-write, post-write, structural, formula, and reconciliation verification results.

The exporter must fail closed on an unknown template fingerprint, missing/renamed zone, formula in
an input column, absent formula template, protection mismatch, or unexpected structural drift.

## Prototype result

The disposable synthetic XLSX prototype passed:

- five input tables populated with five added synthetic rows;
- formulas retained and translated into added rows;
- table references expanded;
- styles and data validation extended;
- two named ranges retained;
- conditional formatting retained;
- dashboard/report formulas retained;
- hidden support sheet retained;
- source template checksum unchanged;
- output re-opened successfully;
- all disposable files removed.

The real-package surgical-copy probe passed byte-preservation checks for all untouched package
parts. Arbitrary real-template row growth and formula-result recalculation were not tested.

No Google file was created. Bound-script visibility, destination script ID, trigger recreation,
authorization, property initialization, protections, and formula results therefore remain an
authorized disposable acceptance gate, not an empirical claim.

## Ranked recommendation

1. **Preferred: Google Sheets template copy plus zone-scoped Sheets API writes.** This is the only
   path that can preserve a bound Apps Script application. Use Drive `files.copy`, verify the copy,
   grow/copy template rows with narrowly scoped batch requests, write input values only, explicitly
   initialize authorized script dependencies, and run structural and reporting checks.
2. **Fallback: approved XLSX template copy plus surgical OOXML/native-engine writes.** This preserves
   workbook structure for offline Excel-compatible use but cannot carry bound Apps Script. Do not
   use a generic full-library re-save of the source workbook.
3. **Rejected for working-workbook recovery: generate XLSX from scratch.** It is a data export, not a
   preserved workbook application.

## Limitations

- The September workbook and the real Google Sheets container were not locally available.
- The local `.xlsx` proves workbook structure but contains no bound Apps Script project to inspect.
- No authenticated Google copy was made, so the actual destination project ID, trigger set, scopes,
  properties, protections, and external-resource bindings are not yet observed.
- No spreadsheet calculation engine was available locally. Formulas were preserved and marked for
  recalculation, but formula-result or dashboard parity was not asserted.
- The real workbook's arbitrary row-growth path was not exercised. The synthetic prototype proved
  row growth; the real-package probe proved only targeted writes with byte-identical preservation of
  untouched parts.
- Extra Places has no proven write zone in the available May structural reference.

## Required gate before production implementation

Using a sanitized, disposable copy of the approved Google Sheets template in a test-owned Drive
folder:

1. Copy through Drive and record new spreadsheet and script IDs.
2. Compare sheet IDs/names, formulas, validation, conditional formatting, named ranges, hidden
   sheets, tables, protections, and configured dependencies against a signed manifest.
3. Populate synthetic data only in declared zones; exercise real row growth; verify formula and
   formatting inheritance and target-engine recalculation.
4. Open the destination and verify bound-script visibility, menu/custom-function behaviour, required
   authorization, required trigger recreation, and non-secret property initialization.
5. Confirm no source template, live workbook, Profile, or script changed; delete the disposable copy.

Only after this gate passes should the production `workbook-template-export-v1` implementation be
approved.

## Smallest safe next tranche

After approval, run a disposable Google validation spike only: copy an approved sanitized template
into a test-owned Drive folder, build its signed structural/write-zone manifest, populate synthetic
rows, verify the bound script and explicit setup requirements, record recalculated outputs, and
delete the copy. Return that evidence for approval before adding production endpoints, UI, Profile
reads, or export persistence.
