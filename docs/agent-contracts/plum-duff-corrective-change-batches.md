# Plum Duff Corrective Change Batches

This register prevents a reported correction from disappearing between report and verification.
Working IDs are local delivery controls, not automatic GitHub issues.

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
