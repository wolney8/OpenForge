# `workbook-template-export-v1` compatibility contract

Status: **LOCAL STRUCTURAL VALIDATION COMPLETE — CURRENT SCRIPT/TEMPLATE DRIFT BLOCKS SIGN-OFF**

Validation ID: `TEMPLATE-VALIDATION-002`

Date: 2026-09-05

## Scope and evidence boundary

This contract treats the authoritative September XLSX template and the supplied helper script as
one workbook application. It validates structure and a disposable, package-preserving XLSX
population path. It does not implement production export, change either source, execute Apps
Script, use Google Drive, change Profile data, or certify formula results.

The source workbook and script remain private, ignored inputs. Only structural findings,
fingerprints, and synthetic probe data are recorded here.

Source fingerprints:

- September workbook SHA-256:
  `7033776336f0216becee420a5cf5a6bd248c69fb5b121d3e3ddb111e803c6e1a`
- Helper script SHA-256:
  `9635a565f860e9927a2e01d4a8d5b4b5f796890b3612cb12ce8d8d5b38258122`

## Workbook identity

The authoritative workbook has 74 OOXML package parts, 14 sheets (7 visible and 7 hidden), 22
table parts, 20,056 formula cells, 82 data-validation rules, 79 conditional-formatting blocks,
36 defined names, 15 drawing package parts, no media parts, and 17 relationship parts.

The visible operational sheets are Accounts, Cash Adjustments, Sportsbook Bets, Free Bets, Casino
Offers, Reports, and Profit Tracker. Settings, Reload Templates, Dashboard, SignupUsers,
Profitability Audit, Central Dashboard - KPI, and Profit Tracker - KPI are hidden. `EP Catchers`
is not present.

## Script dependency manifest

The manifest is derived from the supplied script rather than from prompt examples.

### Sheet identities

- Configured ledgers: Accounts, Sportsbook Bets, Free Bets, Cash Adjustments, Casino Offers, and
  EP Catchers.
- Configured format-only sheet: Reload Templates.
- Fixed support sheets: Dashboard and Settings.
- Workflow-specific sheets: Reload Templates -> Sportsbook Bets and Sportsbook Bets -> Free Bets.

All are present with exact spelling except `EP Catchers`.

### Fixed cells, ranges, rows, and columns

- Iteration: `Dashboard!B7`.
- Settings lists: `AJ3:AJ1002`, `AO3:AO1002`, `AU3:AU1002`, `AW3:AW1002`, and
  `AH3:AH1002`.
- Stale configured range: `Y3:Y999`; the script names this `freeBetStatusRange`, but no function
  reads it.
- Header row: 1. First data row: 2. ID column for every configured ledger: A / column 1.
- Reload Templates is read positionally from A:O. Last-created-week is O / column 15.
- Football finish-time columns:
  - Sportsbook Bets: date B / 2, fixture J / 10, status K / 11, result L / 12.
  - Free Bets: date B / 2, fixture I / 9, status J / 10, result K / 11.

The fixed football coordinates match the current September headers exactly.

### Header dependencies

Required header lookups are:

- Accounts: `CurrentBalance`, `PendingWithdrawalAmount`, `LastBalanceUpdate`.
- Sportsbook defaults: `OfferType`, `BetType`, `OfferName`, `FixtureType`, `Status`, `Result`,
  `MatchStrategy`, `Exchange`.
- Reload target: `OfferGroupID`, `Offer`, `Bookmaker`, `OfferType`, `BetType`, `OfferName`,
  `FixtureType`, `Status`, `Result`, `BackStake`, `UserNotes`.
- Sportsbook copy source: `QualBetID`, optional aliases `SportsbookBetID`, `BetID`, `ID`, plus
  `OfferGroupID`, `Offer`, `Bookmaker`, `BetType`, `OfferName`, `FixtureType`, `BackStake`.
- Free Bet copy destination: `OfferGroupID`, `Offer`, `ExpiryDateTime`, `Bookmaker`, `BetType`,
  `OfferType`, `OfferName`, `FixtureType`, `FreeBetValue`, `Status`, `OriginQualBetID`,
  `UserNotes`, `Result`, and `FreeBetRetentionMode`.
- Football finish-time notes: `UserNotes` on both target ledgers.

`DateAwarded` has special date parsing in `submitCopyToFreeBets`, but the current dialog does not
submit that field and the current Free Bets table has no `DateAwarded` header. This is dormant,
not a failure in the current copy workflow.

### Settings ranges

The current named lists and their fixed ranges match:

- `FixtureTypeList` -> `AH3:AH1002` (15 populated values).
- `BetTypeList` -> `AJ3:AJ1002` (3 populated values).
- `OfferTypeList` -> `AO3:AO1002` (31 populated values).
- `OfferNameList` -> `AU3:AU1002` (8 populated values).
- `FreeBetStatusList` -> `AW3:AW1002` (9 populated values).

The copy workflow can obtain its expected Football, Single, Free Bet, None, and Prospecting values.
Moving these lookups to their existing named ranges would reduce coordinate fragility, but is not
part of this tranche.

### Services and external dependencies

The script uses `SpreadsheetApp`, `HtmlService`, `Utilities`, and `Session`. It does not reference
`DriveApp`, `ScriptApp`, `PropertiesService`, `FormApp`, `UrlFetchApp`, a URL, or a token shaped
like a hard-coded external resource ID. No property migration or external-ID rebinding requirement
is visible in this source. Google project configuration and installed triggers remain runtime
concerns because they are not represented in the `.gs` file.

## Current September drift

### Failures

1. **Missing `EP Catchers`.** The script config declares an EP ledger and `EP` ID prefix, but the
   authoritative workbook has no sheet or table with this name. General bulk actions skip the
   absent sheet rather than throwing, but EP row creation and ID continuity cannot be provided.
2. **Sportsbook `OfferGroupID` mismatch.** The current Sportsbook header is `Offer Group ID`.
   `normaliseHeader_()` lowercases and collapses whitespace; it does not remove whitespace.
   Consequently the script lookup for `OfferGroupID` does not match. Reload creation silently omits
   the group link, and Sportsbook -> Free Bets reads a blank group link.
3. **Protected-format manifest is incomplete.** `MB_PROTECTED_FORMAT` omits formula column AF
   (`MaximumBonus`) on Sportsbook Bets and formula column L (`LastPromoUsed`) on Accounts. Its
   Accounts K entry is valid as a script-owned balance timestamp, but it is not the formula column.
   The script does not create real Google protected ranges; this manifest only applies grey fill.

### Warnings

- Sportsbook formula columns AN and AR contain no formula at existing row 378 while the remaining
  formula rows are populated. This may be intentional row-level history, but it proves that an
  arbitrary preceding row is not a safe universal formula template.
- `applyRowTemplateFromAbove_()` copies formatting, validation, and row height only. It does not
  copy formulas or resize a table/filter. `onEdit()` also does not add formulas. Whether Google
  Sheets table behaviour fills formulas for the first manually added row requires the Google
  runtime gate.
- `freeBetStatusRange = Y3:Y999` points at an account-audit list rather than the Free Bet status
  list. It is currently unused; the active copy workflow correctly uses `AW3:AW1002`.

### Re-evaluation of May-era candidates

- Missing `EP Catchers`: **CURRENT DRIFT** — also absent in September.
- Accounts K/L discrepancy: **CURRENT DRIFT** — K is the timestamp/system cell; L is the formula
  and is omitted from the script's protected-format list.
- Sportsbook AF discrepancy: **CURRENT DRIFT** — AF is a formula column and remains omitted.
- Empty Settings ranges: **HISTORICAL-ONLY DIFFERENCE** — the five active September ranges are
  populated and have matching defined names.
- Football fixed columns: **CURRENT MATCH**.
- Reload Templates positional A:O layout and column O last-created-week: **CURRENT MATCH**.

## Authoritative write zones

The fallback writer may write only these input columns after verifying the table relationship,
table name, exact header fingerprint, and template fingerprint:

- Accounts: A:K and M:Q. L is template-owned formula output; A and K are system identities/state.
- Cash Adjustments: A:I. J:L are template-owned formulas.
- Sportsbook Bets: A:P, R:T, AD, AM, AQ, BA:BC. Q, U:AC, AE:AL, AN:AP, and AR:AZ are
  template-owned formulas/helpers.
- Free Bets: A:Q, S:U, AC, and AJ:AL. R, V:AB, and AD:AI are template-owned formulas/helpers.
- Casino Offers: A:C, E:N, P:V, and AB. D, O, and W:AA are template-owned formulas/helpers.

Dashboard, Reports, Profit Tracker, Settings, KPI/support sheets, formula/helper columns, defined
names, conditional formatting, drawings, relationships, and hidden structures are never bulk data
targets. `EP Catchers` has no current write zone.

## Disposable fallback prototype

The prototype copied the authoritative package to a temporary directory, resolved each write zone
through the workbook/table relationships, verified its header fingerprint, cloned the verified
last table row, cleared input cells, wrote only synthetic data and IDs, translated explicit
formulas, extended shared-formula ranges, and grew table/filter, validation, and conditional-format
ranges. It used `openpyxl` only for individual formula translation; it did not perform a generic
workbook load/save.

Three rows were added to each of Accounts, Cash Adjustments, Sportsbook Bets, Free Bets, and Casino
Offers:

- Accounts `A1:Q125` -> `A1:Q128`; 1 formula per new row; 12 validation columns and 3
  conditional-format columns retained.
- Cash Adjustments `A1:L25` -> `A1:L28`; 3 formulas per new row; 9 validation columns retained.
- Sportsbook Bets `A1:BC530` -> `A1:BC533`; 30 formulas per new row; 44 validation columns and 10
  conditional-format columns retained.
- Free Bets `A1:AL171` -> `A1:AL174`; 14 formulas per new row; 29 validation columns and 8
  conditional-format columns retained.
- Casino Offers `A1:AB25` -> `A1:AB28`; 7 formulas per new row; 16 validation columns and 1
  conditional-format column retained.

All cloned cells retained their style IDs and row height metadata. Existing IDs remained unchanged.
The template rows used by the prototype contain the full expected formula set. Formula-result and
Dashboard/Reports/Profit Tracker recalculation were not claimed because no spreadsheet calculation
engine was run.

## ID continuity

`Dashboard!B7` contains numeric `1.0`; the script's first-digit extraction resolves iteration `1`.
All current IDs match their configured iteration/prefix, with no unmatched or duplicate values:

- Accounts: 124 IDs, max `IT1-AC-0126`, next `IT1-AC-0127`.
- Cash Adjustments: 24 IDs, max `IT1-CA-0025`, next `IT1-CA-0026`.
- Sportsbook Bets: 529 IDs, max `IT1-QB-0680`, next `IT1-QB-0681`.
- Free Bets: 170 IDs, max `IT1-FB-0191`, next `IT1-FB-0192`.
- Casino Offers: 24 IDs, max `IT1-CO-0029`, next `IT1-CO-0030`.

The maximum sequence is not always on the last physical row, so the exporter must reproduce the
script's full-column max scan. After the three-row probe, the statically reproduced first manual
IDs are AC-0130, CA-0029, QB-0684, FB-0195, and CO-0033 under iteration 1. EP continuity is blocked
by the missing sheet.

## Workflow compatibility result

- `onOpen`: **PASS — STRUCTURALLY COMPATIBLE**. The menu functions exist; actual menu execution is
  Google-runtime-only.
- `onEdit`: **WARNING — CURRENTLY WORKS BUT FRAGILE**. Present-sheet dispatch, IDs, timestamps, and
  defaults resolve, but protected-format drift and formula propagation remain.
- ID generation: **PASS — STRUCTURALLY COMPATIBLE** for the five present ledgers; **FAIL —
  WORKBOOK/SCRIPT DRIFT** for EP.
- Account timestamping: **PASS — STRUCTURALLY COMPATIBLE**. CurrentBalance I,
  PendingWithdrawalAmount J, and LastBalanceUpdate K match.
- Sportsbook defaults: **PASS — STRUCTURALLY COMPATIBLE**. All eight headers resolve.
- Reload creation: **FAIL — WORKBOOK/SCRIPT DRIFT**. Positional A:O source fields match, but the
  Sportsbook `OfferGroupID` target does not.
- Sportsbook -> Free Bets: **FAIL — WORKBOOK/SCRIPT DRIFT**. All destination headers and Settings
  lists resolve, but the Sportsbook group-link source does not.
- Football finish time: **PASS — STRUCTURALLY COMPATIBLE**. Both fixed-column layouts and
  `UserNotes` match.
- Protected-cell formatting: **FAIL — WORKBOOK/SCRIPT DRIFT**. Accounts L and Sportsbook AF are
  missing; no true protection is created.
- First manual row formula propagation: **GOOGLE_RUNTIME_REQUIRED**. Static ID generation is safe,
  but the helper itself does not copy formulas.
- Simple trigger execution and formula recalculation: **GOOGLE_RUNTIME_REQUIRED**.

## Package-preservation evidence

The source and output each contained 74 parts. Exactly 11 parts changed:

- worksheets 8, 9, 10, 11, and 12;
- table definitions 18, 19, 20, 21, and 22;
- `xl/workbook.xml` for the corresponding filter defined-name extents and recalculation flags.

The other 63 parts remained byte-identical. Formula cells increased from 20,056 to 20,221, exactly
55 formula columns times three rows. All 36 defined names remained. The counts of validation rules
and conditional-format blocks remained 82 and 79 while their applicable ranges were extended.
All 15 drawing package parts and all 17 relationship parts were byte-identical; the source contains
no media parts. No package relationship, supporting sheet, report sheet, dashboard sheet, style,
shared string, drawing, or content-type part changed.

The source checksum was verified before and after the probe. The temporary output and its temporary
directory were deleted automatically.

## Remaining Google-only gate

After the three current structural drifts are deliberately resolved, the remaining authorized,
disposable Google gate is limited to:

1. container copy and destination bound-script association/code presence;
2. simple-trigger execution and any installable-trigger recreation;
3. authorization/scopes and project configuration;
4. Script/User/Document Properties behaviour (none are referenced by this source);
5. confirmation that no environment-only external IDs need rebinding;
6. Google formula/table recalculation and first-manual-row formula behaviour;
7. representative menu, reload, copy-to-Free-Bets, timestamp/default, and football-time execution.

The copy must not be presented as usable if any validation fails.
