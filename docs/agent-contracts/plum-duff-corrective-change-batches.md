# Plum Duff Corrective Change Batches

This register prevents a reported correction from disappearing between report and verification.
Working IDs are local delivery controls, not automatic GitHub issues.

## 2026-08-27 Extra Place Stat Card Simplification Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-062 | Extra Place resolved-value stat card | Remove redundant selected-range prose and replace Qual Loss / weekly budget labels with accessible Material indicators. Show qualifying-loss spend against weekly budget, turning the spend indicator danger only after the budget is exhausted. | Extra Place stat-card simplification | DONE |

## 2026-08-27 Financial Scope And Settings Recovery Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-054 (reopened) | Shared ledger issue overlays | Increase the transparent backdrop blur by 45%. | Follow-up to issue-chip blur request | DONE |
| PD-FIX-060 | Profile header and ledger stat cards | Keep the top bar profile-wide for the selected tracker range and label ledger cards with their module scope. | Profile total versus ledger value audit | DONE |
| PD-FIX-061 | Profile Settings / commission | Restore the typed exchange-commission list endpoint and prevent duplicate React keys. | `/tracker/settings#commission` failed fetch and `10Bet` warning | DONE |

## 2026-08-27 Unified Bet Ledger Pagination Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-057 | Shared bet-ledger pagination | Show pagination at the top and bottom of every bet ledger table, allowing the Fund Manager to choose the visible row count from a shared default. | Global pagination correction | DONE |

## 2026-08-27 Global Bet Ledger Table Controls Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-048 | Shared ledger tables | Anchor horizontal-scroll arrows to the centre of the table area currently visible in the viewport, not the full table height. | Long ledgers with 50+ rows | DONE |
| PD-FIX-049 | Shared ledger issue overlays | Use backdrop blur behind issue chips rather than a drop shadow. | Global issue-chip styling | DONE |
| PD-FIX-050 | Bet ledger pagination | Use the canonical pagination footer in all bet ledgers, including Extra Place. | Signed-off ledger pagination | DONE |

## 2026-08-26 Extra Place Final Table And Modal Parity Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-045 | Shared ledger table navigation | Give visible left/right table navigation controls an opaque blurred backing in both themes. | Recurring table navigation issue | DONE |
| PD-FIX-046 | Extra Place table | Render compact local date/time labels such as `Today at 14:10` and `Thu 27th 12:45`. | Date/time column | DONE |
| PD-FIX-047 | Extra Place table | Surface concrete missing-field/outcome issues in the established row issue-overlay. | Signed-off ledger issue chips | DONE |
| PD-FIX-048 | Extra Place Calculate & Place | Make Back, Place Terms, Win Lay and Place Lay headings/labels contrast-safe in dark Back/Lay mode. | Paint palette mode | DONE |
| PD-FIX-049 | Extra Place Calculate & Place | Make Place Terms heading and labels contrast-safe in dark EP mode. | EP theme mode | DONE |
| PD-FIX-050 | Extra Place rating | Use a neutral rating chip when a rating cannot be calculated. | Rating column | DONE |
| PD-FIX-051 | Extra Place parity audit | Review the changed table/modal equivalents for adjacent regressions without expanding scope. | User request for outstanding modal/table issues | DONE |

## 2026-08-26 Extra Place Operational Visibility Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-052 | Extra Place table issues | Show no more than four actionable issue chips; show a count chip for the remainder and make four-or-more issue rows danger/red, otherwise warning/yellow. | First-row hover with ten issue chips | DONE |
| PD-FIX-053 | Extra Place editor themes | Recheck heading and helper-copy contrast for both light/dark modes and both EP/Back-Lay themes. | Back Bet, Place Terms, Lay sections | DONE |
| PD-FIX-054 | Extra Place settlement visibility | Define and implement a non-intrusive race-ready indicator shortly after the scheduled race time. | Race approaching finish/results timing | DONE |
| PD-FIX-055 | Extra Place racing details | Parse pasted Smarkets and MBB runner/race text into Runner, Race, and parser-owned date/time suggestions without overwriting manual fields. | Smarkets/MBB paste examples | DONE |
| PD-FIX-056 | Extra Place resolved-value card | Clarify selected-range qualifying loss, realised Extra Place outcome, and a weekly loss-budget control without changing existing resolved-value calculation. | Resolved Value £25.89 discrepancy and £15 weekly loss factor | DONE |

## 2026-08-27 Shared Ledger Micro-Polish Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-058 | Shared ledger issue chips | Use a transparent backdrop blur rather than a drop-shadow treatment. | Issue-chip hover overlay | DONE |
| PD-FIX-059 | Shared ledger pagination | Keep the rows-per-page selector arrow inset from the pill edge. | Rows per page control | DONE |

## 2026-08-26 Extra Place Flow Consolidation Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-042 | Extra Place table | Keep incomplete saved rows visible as Needs action when blank-dated or outside tracker range, without changing range-scoped totals. | Extra Place flow consolidation | DONE |
| PD-FIX-043 | Extra Place calculate step | Parse a trailing race time into parser-owned today/tomorrow date choices without replacing a manual date. | `Sandtown 14:10` | DONE |
| PD-FIX-044 | Extra Place editor | Consolidate Calculate and Placement into Calculate & Place, retaining Settlement as the second step. | Extra Place flow consolidation | DONE |

## 2026-08-25 Explicit Extra Place Terms And Outcome Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-034 | Extra Place outcome matrix | Give `extra-place-outcome-row extra-place-outcome-unplaced` a contrast-safe, two-tone red outcome treatment. | "Doesn't Place" matrix row | DONE |
| PD-FIX-035 | Extra Place rating | Rating values over the high-rating threshold must use the gold Match Rating treatment; green remains reserved for good ratings. | `151.20%` rating chip | DONE |
| PD-FIX-036 | Extra Place calculate step | Calculate-step bookmaker chips must use the exact same profile catalogue foreground/background pair as the ledger badge, including Betfred red/white. | Bookmaker dropdown and ledger badge | DONE |
| PD-FIX-037 | Extra Place calculate step | Keep `p.extra-place-stake-explainer` directly below E/W Stake and above its quick chips. | `p.extra-place-stake-explainer` | DONE |
| PD-FIX-038 | Extra Place calculation | Add explicit Bookmaker Pays / Exchange Pays inputs and standard paid-place presets. | "Paying X instead of Y" presets | DONE |
| PD-FIX-039 | Extra Place settlement | Derive result and quick position availability from explicit paid-place counts. | "6 instead of 4": 6th Extra Place, 7th Unplaced | DONE |
| PD-FIX-040 | Shared ledger tables | Make visible horizontal table-scroll arrows sufficiently opaque and blurred that underlying table text is not legible through them. | Table navigation arrows | DONE |
| PD-FIX-041 | Extra Place parity | Update contract and deterministic calculation fixtures for the explicit paid-place rule. | Each Way / Extra Place contract | DONE |

## 2026-08-24 Extra Place Parity Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-001 | Extra Place ledger presentation control | Render a Material horse icon for the EP side of the EP/Back-Lay theme switch and align it above the table with loadouts. | EP/Back-Lay theme toggle | DONE |
| PD-FIX-002 | Extra Place ledger table | Restore supplied EP dark swatches for themed headers, while generic headers use dark-grey surfaces with white text. | Themed table headers | DONE |
| PD-FIX-003 | Extra Place calculate step | Ensure the `1 /` each-way-term prefix is visible in dark mode. | Each-way term input | DONE |
| PD-FIX-004 | Extra Place editor footer | Match signed-off ledger Save and Delete button colour and treatment. | Editor footer actions | DONE |
| PD-FIX-005 | Extra Place calculate step | Replace unclear Each Way / Extra Place pills with a visibly stateful toggle matching platform segmented-control curvature. | Bet-type controls above Back Bet | DONE |
| PD-FIX-006 | Extra Place ledger loadouts | Put `button.review-chip` loadouts directly above the table and prevent focus/selection shadows clipping. | `button.review-chip` | DONE |
| PD-FIX-007 | Extra Place filter dialog | Match Sportsbook table controls: views, relevant dropdowns, and allowed visible-column controls. | Sportsbook filter popup screenshot | DONE |
| PD-FIX-008 | Extra Place calculation and context | Calculate Rating % and Implied Odds and surface them in the table and editor context chips. | Extra Place table and modal | DONE |
| PD-FIX-009 | Extra Place calculate step | Add a Bookmaker field to the Back Bet calculator segment. | `section.calculator-segment.calculator-segm...` | DONE |
| PD-FIX-010 | Extra Place settlement | Keep status, result and finishing-position fields and quick chips synchronised, including ordinal input formatting. | Settlement controls and position chips | DONE |

## 2026-08-24 Extra Place Ledger Semantics And Table Navigation Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-011 | Extra Place theme switch | Uses icon-only `chess_knight` for EP and `palette` for Back/Lay. | EP theme switch | VERIFIED |
| PD-FIX-012 | Extra Place stat strip | Shows selected-range qualifying loss beside resolved value. | Resolved Value stat card | VERIFIED |
| PD-FIX-013 | Extra Place profit cell | Renamed to EP Profit; unsettled/missed values remain neutral and missed settled Extra Place profit is struck through. | EP Profit column | VERIFIED |
| PD-FIX-014 | Extra Place ledger table | Adds a Status column showing position and result; only Extra Place wording is gold. | Status column | VERIFIED |
| PD-FIX-015 | Extra Place ledger table | Provides user column-width realignment. | Table column parity | VERIFIED |
| PD-FIX-016 | Extra Place ledger actions | Portals the result flag list above the table instead of clipping in the scroll container. | Action flag dropdown | VERIFIED |
| PD-FIX-017 | Shared bet-ledger tables | Adds accessible faded left/right controls for horizontally scrollable tables. | Table-side arrow wireframe | VERIFIED |
| PD-FIX-018 | Extra Place ledger table | Shows selected/unselected exchange beneath both lay-odds values. | Win/Place Lay Odds columns | VERIFIED |
| PD-FIX-019 | Extra Place ledger table | Marks missing required bookmaker, exchange, odds or stake data as a visible needs-action issue. | Signed-off ledger issue state | VERIFIED |

## 2026-08-24 Extra Place Contrast And Control Refinement Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-020 | Shared ledger table navigation | Make floating table-scroll arrows more visible in both themes with rounded treatment. | `ledger-table-scroll` arrows | VERIFIED |
| PD-FIX-021 | Extra Place EP Profit | Use neutral contrast-safe financial pills for unsettled/missed EP Profit; strike missed value only. | EP Profit screenshot | VERIFIED |
| PD-FIX-022 | Extra Place Status | Normalize numeric finishing positions to ordinals. | Status column screenshot | VERIFIED |
| PD-FIX-023 | Extra Place ledger controls | Place loadouts and theme switch between search/actions and the table. | `div.extra-place-table-heading-controls` | VERIFIED |
| PD-FIX-024 | Extra Place calculate mode | Match platform toggle curvature on Each Way / Extra Place. | `button.extra-place-bet-type-toggle-option` | VERIFIED |
| PD-FIX-025 | Extra Place table contrast | Increase dark-mode separation between header and row surfaces. | dark-mode ledger screenshot | VERIFIED |

## 2026-08-24 Extra Place Header And Brand Parity Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-026 | Extra Place ledger table | Use a distinct dark-grey generic header surface, lighter than the `#1c2731` row surface, with readable white text. | Dark-mode headers | VERIFIED |
| PD-FIX-027 | Extra Place calculate step | Make `div.extra-place-bet-type-toggle` visibly fully rounded, including its clipped child surfaces. | `div.extra-place-bet-type-toggle` | VERIFIED |
| PD-FIX-028 | Extra Place ledger bookmaker cell | Reuse the shared account-catalogue brand badge, with its configured foreground/background palette. | Bet-ledger bookmaker styling | VERIFIED |
| PD-FIX-029 | Extra Place ledger EP Profit | Use the same full pill radius as adjacent financial-value pills for `span.extra-place-profit-neutral`. | `span.extra-place-profit-neutral` | VERIFIED |

## 2026-08-24 Extra Place Dark Palette Contrast Batch

| ID | Area | Requested change | Supplied reference | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-030 | Extra Place EP theme | Use dark-mode Back `#174583`, Win Lay `#7C1E2F`, and Place Lay `#7B281E` surfaces with contrast-safe foreground text. | EP dark theme swatches | VERIFIED |
| PD-FIX-031 | Extra Place Back/Lay theme | Brighten modal section headings, labels, calculated stakes, and helper copy for the Smarkets/Betfair palette in dark mode. | EP modal Back/Lay text | VERIFIED |
