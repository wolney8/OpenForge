# `workbook-template-export-v1` compatibility contract

Status: **LOCAL STRUCTURE HARDENED — READY FOR DISPOSABLE GOOGLE RUNTIME VALIDATION**

Validation ID: `TEMPLATE-VALIDATION-002`

Date: 2026-09-05

## Scope and evidence boundary

This contract treats the authoritative September XLSX template and the supplied helper script as
one workbook application. It validates structure and a disposable, package-preserving XLSX
population path. It does not implement production export, change either source, execute Apps
Script, use Google Drive, change Profile data, or certify formula results.

The source workbook and script remain private, ignored inputs. Only structural findings,
fingerprints, and synthetic probe data are recorded here.

The authoritative machine-readable ledger definition is
`docs/contracts/workbook-template-export-v1-ledger-structure.json`. The read-only validator, helper
builder, and disposable growth probe consume that same file. The supplied helper is never edited
in place; the builder produces an ignored private runtime candidate for the Google gate.

Source fingerprints:

- September workbook SHA-256:
  `7033776336f0216becee420a5cf5a6bd248c69fb5b121d3e3ddb111e803c6e1a`
- Helper script SHA-256:
  `9635a565f860e9927a2e01d4a8d5b4b5f796890b3612cb12ce8d8d5b38258122`
- Deterministically generated hardened helper SHA-256:
  `8d3b9757042f9857eaaf0ef95b15df140fd9aa117f09903b91ab59f25e2104c3`

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

## September drift resolution

### Corrections

1. **`EP Catchers` removed from the hardened helper configuration.** The September workbook stores
   historical Extra Places source rows in Sportsbook; it has no current EP Catchers table. No
   workflow-specific function uses the missing sheet. The old entry affected only generic ID and
   formatting iteration, so it was obsolete rather than evidence that a sheet should be invented.
2. **Header normalization strengthened and made fail-closed.** Unicode formatting, case, spaces,
   underscores, and harmless punctuation are removed before matching. All 205 current row-one
   headers were audited with zero normalized collisions. A collision now raises an explicit error
   instead of overwriting a prior header-map entry. `Offer Group ID`, `OfferGroupID`, and
   `offer_group-id` all resolve to `offergroupid`.
3. **Protected formatting now derives from the ledger structure manifest by header.** Accounts L
   (`LastPromoUsed`) and Sportsbook AF (`MaximumBonus`) are included. The former A1 range list is no
   longer a separate source of truth.
4. **Row formulas now use a complete-row strategy.** The helper searches outward for the nearest
   row containing every manifest formula, copies format/validation/height from that row, and applies
   missing formulas in R1C1 form. `onEdit` also fills missing formulas for newly entered rows.

### Protected-region reconciliation

The pre-hardening script was compared with every September formula column plus explicit ID/system
ownership:

| Ledger | MATCH | MISSING_FROM_SCRIPT | SCRIPT_ONLY / STALE | Hardened result |
| --- | --- | --- | --- | --- |
| Accounts | A (`AccountID`), K (`LastBalanceUpdate`) | L (`LastPromoUsed`) | none | A, K, L match |
| Cash Adjustments | A, J:L | none | none | match |
| Sportsbook Bets | A, Q, U:AC, AE, AG:AL, AN:AP, AR:AZ | AF (`MaximumBonus`) | none | A, Q, U:AC, AE:AL, AN:AP, AR:AZ match |
| Free Bets | A, R, V:AB, AD:AI | none | none | match |
| Casino Offers | A, D, O, W:AA | none | none | match |

The hardened helper no longer stores these as independent A1 ranges. It derives protected columns
from the same header manifest used by the structural validator and formula-template logic.

### Remaining local observations

- Sportsbook formula columns AN and AR contain no formula at existing row 378 while the remaining
  formula rows are populated. The hardened helper does not alter that historical row; it skips it
  as a template authority.
- Apps Script has no current table-object API for resizing imported tables. The helper no longer
  depends on table autofill for formulas, while actual Google table/filter expansion remains an
  explicit runtime assertion.
- The unused `freeBetStatusRange = Y3:Y999` entry was removed. The active
  `copyStatusRange = AW3:AW1002` remains unchanged.

### Re-evaluation of May-era candidates

- Missing `EP Catchers`: **RESOLVED AS STALE SCRIPT CONFIGURATION**.
- Accounts K/L discrepancy: **RESOLVED BY MANIFEST** — A, K, and L are protected.
- Sportsbook AF discrepancy: **RESOLVED BY MANIFEST** — AF is protected.
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
IDs are AC-0130, CA-0029, QB-0684, FB-0195, and CO-0033 under iteration 1. EP is intentionally not
an Apps Script workbook ledger in this template family.

## Workflow compatibility result

- `onOpen`: **PASS — STRUCTURALLY COMPATIBLE**. The menu functions exist; actual menu execution is
  Google-runtime-only.
- `onEdit`: **PASS — STRUCTURALLY COMPATIBLE**. Present-sheet dispatch, IDs, timestamps, defaults,
  normalized header lookup, protected formatting, and formula fallback resolve statically.
- ID generation: **PASS — STRUCTURALLY COMPATIBLE** for every workbook ledger in this template.
- Account timestamping: **PASS — STRUCTURALLY COMPATIBLE**. CurrentBalance I,
  PendingWithdrawalAmount J, and LastBalanceUpdate K match.
- Sportsbook defaults: **PASS — STRUCTURALLY COMPATIBLE**. All eight headers resolve.
- Reload creation: **PASS — STRUCTURALLY COMPATIBLE**. Positional A:O fields match and normalized
  `OfferGroupID` resolves the current `Offer Group ID` target.
- Sportsbook -> Free Bets: **PASS — STRUCTURALLY COMPATIBLE**. Source linkage, destination headers,
  and Settings lists resolve.
- Football finish time: **PASS — STRUCTURALLY COMPATIBLE**. Both fixed-column layouts and
  `UserNotes` match.
- Protected-cell formatting: **PASS — STRUCTURALLY COMPATIBLE**. It derives from the signed header
  manifest. This remains visual/system ownership marking rather than Google range protection.
- First manual row formula propagation: **PASS — STRUCTURALLY COMPATIBLE**. The helper explicitly
  restores missing formulas from the nearest complete R1C1 template row; runtime execution remains
  part of the Google smoke.
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

The remaining authorized, disposable Google gate is limited to:

1. container copy and destination bound-script association/code presence;
2. simple-trigger execution and any installable-trigger recreation;
3. authorization/scopes and project configuration;
4. Script/User/Document Properties behaviour (none are referenced by this source);
5. confirmation that no environment-only external IDs need rebinding;
6. Google formula/table recalculation and first-manual-row formula behaviour;
7. representative menu, reload, copy-to-Free-Bets, timestamp/default, and football-time execution.

The copy must not be presented as usable if any validation fails.
